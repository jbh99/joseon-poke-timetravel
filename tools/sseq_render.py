"""Offline renderer for Nintendo DS SSEQ music (Nitro sound system), used for the DP SDAT.

Implements the sequencer bytecode, SBNK instrument lookup, SWAV decoding (PCM8/PCM16/IMA-ADPCM),
the ADSR envelope / volume law of the Nitro player and LFO modulation, then mixes to stereo.
"""
import math
import random
import numpy as np
import ndspy.soundArchive as sa
from romlib import rom

SR = 32768
UPDATE_SEC = 64 * 2728 / 33513982  # one sound-driver frame (~5.21 ms)
AMPL_MIN = -92544  # -723 << 7
CNV_SUST = [-32768] + [max(-722, round(400 * math.log10(x / 127))) for x in range(1, 128)]
ATTACK_TABLE = [0x00, 0x01, 0x05, 0x0E, 0x1A, 0x26, 0x33, 0x3F, 0x49, 0x54, 0x5C, 0x64, 0x6D, 0x74, 0x7B,
                0x7F, 0x84, 0x89, 0x8F]
IMA_STEP = [7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66, 73,
            80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230, 253, 279, 307, 337, 371, 408, 449, 494,
            544, 598, 658, 724, 796, 876, 963, 1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499,
            2749, 3024, 3327, 3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487,
            12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767]
IMA_INDEX = [-1, -1, -1, -1, 2, 4, 6, 8]


def cnv_attack(a):
    return ATTACK_TABLE[0x7F - a] if a >= 0x6D else 0xFF - a


def cnv_fall(f):
    if f == 0x7F:
        return 0xFFFF
    if f == 0x7E:
        return 0x3C00
    if f < 0x32:
        return (f << 1) + 1
    return 0x1E00 // (0x7E - f)


def decode_swav(sw):
    t = int(sw.waveType)
    d = bytes(sw.data)
    if t == 0:
        s = np.frombuffer(d, np.int8).astype(np.float32) / 128
        loop = sw.loopOffset * 4
    elif t == 1:
        s = np.frombuffer(d[: len(d) // 2 * 2], "<i2").astype(np.float32) / 32768
        loop = sw.loopOffset * 2
    else:
        pred = int.from_bytes(d[0:2], "little", signed=True)
        idx = min(d[2], 88)
        out = np.empty((len(d) - 4) * 2, np.float32)
        k = 0
        for b in d[4:]:
            for nib in (b & 15, b >> 4):
                step = IMA_STEP[idx]
                diff = step >> 3
                if nib & 1: diff += step >> 2
                if nib & 2: diff += step >> 1
                if nib & 4: diff += step
                pred = pred - diff if nib & 8 else pred + diff
                pred = -32768 if pred < -32768 else 32767 if pred > 32767 else pred
                idx += IMA_INDEX[nib & 7]
                idx = 0 if idx < 0 else 88 if idx > 88 else idx
                out[k] = pred / 32768
                k += 1
        s = out
        loop = (sw.loopOffset - 1) * 8
    return s, (loop if sw.isLooped else None), sw.sampleRate


class Wave:
    def __init__(self, samples, loop, rate):
        self.s = np.concatenate([samples, samples[-1:]]) if loop is None else samples
        self.n = len(samples)
        self.loop = loop
        self.rate = rate


def make_psg(duty):
    hi = (duty + 1) if duty < 7 else 0
    cyc = np.array([1.0 if i < hi else -1.0 for i in range(8)], np.float32) * 0.5
    return Wave(np.tile(cyc, 64), 0, 440 * 8)


NOISE = Wave((np.random.default_rng(7).random(32768).astype(np.float32) * 2 - 1) * 0.5, 0, 440 * 8)


class Voice:
    __slots__ = ("wave", "pos", "key", "base_key", "vel", "track", "length", "ampl", "phase", "attack",
                 "decay", "sustain", "release", "pan", "sweep", "sweep_len", "sweep_cnt", "mod_delay_cnt",
                 "mod_counter", "gl", "gr", "done", "age")


class Track:
    def __init__(self, num, pc):
        self.num, self.pc = num, pc
        self.wait = 0
        self.ended = False
        self.calls, self.loops = [], []
        self.prg = 0
        self.vol, self.expr, self.pan = 127, 127, 64
        self.transpose, self.bend, self.bend_range = 0, 0, 2
        self.porta, self.porta_key, self.porta_time = False, 60, 0
        self.mod_depth, self.mod_speed, self.mod_type, self.mod_range, self.mod_delay = 0, 16, 0, 1, 0
        self.adsr = [0xFF, 0xFF, 0xFF, 0xFF]
        self.note_wait = True
        self.tie = False
        self.tie_voice = None
        self.sweep_pitch = 0
        self.cmp = True
        self.jumped_back = None  # (target_pc, tick) when first backward jump executes
        self.visits = {}


class Renderer:
    def __init__(self, sdat=None):
        self.sdat = sdat or sa.SDAT(rom().getFileByName("data/sound/sound_data.sdat"))
        self.names = [n for n, _ in self.sdat.sequences]
        self.wave_cache = {}

    # ---- instruments -------------------------------------------------------------------------
    def wave(self, bank, nd):
        warc_id = bank.waveArchiveIDs[nd.waveArchiveIDID]
        key = (warc_id, nd.waveID)
        if key not in self.wave_cache:
            sw = self.sdat.waveArchives[warc_id][1].waves[nd.waveID]
            self.wave_cache[key] = Wave(*decode_swav(sw))
        return self.wave_cache[key]

    def note_def(self, bank, prg, key):
        if prg >= len(bank.instruments):
            return None
        ins = bank.instruments[prg]
        if ins is None:
            return None
        name = type(ins).__name__
        if name == "SingleNoteInstrument":
            return ins.noteDefinition
        if name == "RangeInstrument":
            i = key - ins.firstPitch
            return ins.noteDefinitions[i] if 0 <= i < len(ins.noteDefinitions) else None
        for r in ins.regions:
            if key <= r.lastPitch:
                return r.noteDefinition
        return None

    # ---- render -----------------------------------------------------------------------------
    def render(self, name, max_sec=420, loops=True):
        seq = self.sdat.sequences[self.names.index(name)][1]
        data = bytes(seq.eventsData)
        bank = self.sdat.banks[seq.bankID][1]
        self.data, self.bank = data, bank
        self.seq_vol = seq.volume
        self.master_vol = 127
        self.tempo = 120
        self.tempo_acc = 0
        self.vars = [-1] * 32
        self.tracks = [Track(0, 0)]
        self.voices = []
        self.tick = 0
        self.rng = random.Random(1)
        out_l, out_r = [], []
        tick_samples = {}
        samp_acc, total = 0.0, 0
        loop_ticks = None
        end_tick = None
        frames = int(max_sec / UPDATE_SEC)
        for _ in range(frames):
            # sequencer
            self.tempo_acc += self.tempo
            while self.tempo_acc >= 240:
                self.tempo_acc -= 240
                tick_samples[self.tick] = total
                self.run_tick()
                self.tick += 1
                if loop_ticks is None:
                    loop_ticks = self.loop_info()
                    if loop_ticks:
                        ls, le = loop_ticks
                        end_tick = le + (le - ls)
            self.update_voices()
            samp_acc += UPDATE_SEC * SR
            n = int(samp_acc)
            samp_acc -= n
            l, r = self.mix(n)
            out_l.append(l)
            out_r.append(r)
            total += n
            if end_tick is not None and self.tick > end_tick:
                break
            if all(t.ended for t in self.tracks) and not self.voices:
                break
        L = np.concatenate(out_l)
        R = np.concatenate(out_r)
        st = np.stack([L, R], 1)
        if loops and loop_ticks:
            ls, le = loop_ticks
            s_ls, s_le, s_end = tick_samples[ls], tick_samples[le], tick_samples[end_tick]
            body = st[s_le:s_end]
            audio = np.concatenate([st[:s_ls], body])
            return audio, (s_ls / SR, (s_ls + len(body)) / SR)
        return st, None

    def loop_info(self):
        """Loop span in ticks, once every looping track has jumped back."""
        lt = [t for t in self.tracks if t.jumped_back or not t.ended]
        if not lt or any(t.jumped_back is None for t in lt):
            return None
        t0 = lt[0]
        target, le = t0.jumped_back
        ls = t0.visits[target]
        return ls, le

    # ---- sequencer --------------------------------------------------------------------------
    def u8(self, t):
        v = self.data[t.pc]
        t.pc += 1
        return v

    def s8(self, t):
        v = self.u8(t)
        return v - 256 if v > 127 else v

    def u16(self, t):
        v = self.data[t.pc] | self.data[t.pc + 1] << 8
        t.pc += 2
        return v

    def s16(self, t):
        v = self.u16(t)
        return v - 65536 if v > 32767 else v

    def u24(self, t):
        v = self.data[t.pc] | self.data[t.pc + 1] << 8 | self.data[t.pc + 2] << 16
        t.pc += 3
        return v

    def varlen(self, t):
        v = 0
        while True:
            b = self.u8(t)
            v = (v << 7) | (b & 0x7F)
            if not b & 0x80:
                return v

    def run_tick(self):
        for v in self.voices:
            if v.length > 0:
                v.length -= 1
                if v.length == 0 and v.phase < 3:
                    v.phase = 3
        for t in list(self.tracks):
            if t.ended:
                continue
            if t.wait > 0:
                t.wait -= 1
            guard = 0
            while t.wait == 0 and not t.ended and guard < 10000:
                self.step(t)
                guard += 1

    def arg(self, t, kind, mode):
        """Read the last argument of a command, honouring random/variable prefixes."""
        if mode == "rand":
            lo, hi = self.s16(t), self.s16(t)
            return self.rng.randint(min(lo, hi), max(lo, hi))
        if mode == "var":
            return self.vars[self.u8(t) & 31]
        return {"u8": self.u8, "s8": self.s8, "u16": self.u16, "s16": self.s16, "vl": self.varlen}[kind](t)

    def step(self, t, mode=None, cond=True):
        if t.pc >= len(self.data):
            t.ended = True
            return
        t.visits.setdefault(t.pc, self.tick)
        cmd = self.u8(t)
        if cmd < 0x80:
            vel = self.u8(t)
            dur = self.arg(t, "vl", mode)
            if cond:
                self.note_on(t, cmd + t.transpose, vel, dur)
                if t.note_wait:
                    t.wait = dur
            return
        if cmd == 0x80:
            d = self.arg(t, "vl", mode)
            if cond:
                t.wait = d
        elif cmd == 0x81:
            p = self.arg(t, "vl", mode)
            if cond:
                t.prg = p & 0xFFFF
        elif cmd == 0x93:
            num, addr = self.u8(t), self.u24(t)
            if cond:
                self.tracks.append(Track(num, addr))
        elif cmd == 0x94:
            addr = self.u24(t)
            if cond:
                if addr < t.pc and t.jumped_back is None:
                    t.jumped_back = (addr, self.tick)
                t.pc = addr
        elif cmd == 0x95:
            addr = self.u24(t)
            if cond and len(t.calls) < 3:
                t.calls.append(t.pc)
                t.pc = addr
        elif cmd == 0xA0:
            self.step(t, "rand", cond)
        elif cmd == 0xA1:
            self.step(t, "var", cond)
        elif cmd == 0xA2:
            self.step(t, mode, t.cmp)
        elif 0xB0 <= cmd <= 0xBD:
            var = self.u8(t) & 31
            val = self.arg(t, "s16", mode)
            if cond:
                self.var_op(t, cmd, var, val)
        elif 0xC0 <= cmd <= 0xD6:
            kind = "s8" if cmd in (0xC3, 0xC4) else "u8"
            v = self.arg(t, kind, mode)
            if cond:
                self.set_param(t, cmd, v)
        elif cmd in (0xE0, 0xE1, 0xE3):
            v = self.arg(t, "s16" if cmd == 0xE3 else "u16", mode)
            if cond:
                if cmd == 0xE0:
                    t.mod_delay = v
                elif cmd == 0xE1:
                    self.tempo = v
                else:
                    t.sweep_pitch = v
        elif cmd == 0xFC:
            if cond and t.loops:
                cnt, pc = t.loops[-1]
                if cnt == 0:
                    if t.jumped_back is None:
                        t.jumped_back = (pc, self.tick)
                    t.pc = pc
                elif cnt > 1:
                    t.loops[-1] = (cnt - 1, pc)
                    t.pc = pc
                else:
                    t.loops.pop()
        elif cmd == 0xFD:
            if cond and t.calls:
                t.pc = t.calls.pop()
        elif cmd == 0xFE:
            self.u16(t)
        elif cmd == 0xFF:
            if cond:
                t.ended = True
                if t.tie_voice:
                    t.tie_voice.phase = 3

    def var_op(self, t, cmd, var, val):
        v = self.vars
        if cmd == 0xB0: v[var] = val
        elif cmd == 0xB1: v[var] += val
        elif cmd == 0xB2: v[var] -= val
        elif cmd == 0xB3: v[var] *= val
        elif cmd == 0xB4: v[var] = int(v[var] / val) if val else v[var]
        elif cmd == 0xB5: v[var] = v[var] << val if val >= 0 else v[var] >> -val
        elif cmd == 0xB6: v[var] = self.rng.randint(0, val) if val >= 0 else -self.rng.randint(0, -val)
        elif cmd == 0xB8: t.cmp = v[var] == val
        elif cmd == 0xB9: t.cmp = v[var] >= val
        elif cmd == 0xBA: t.cmp = v[var] > val
        elif cmd == 0xBB: t.cmp = v[var] <= val
        elif cmd == 0xBC: t.cmp = v[var] < val
        elif cmd == 0xBD: t.cmp = v[var] != val

    def set_param(self, t, cmd, v):
        if cmd == 0xC0: t.pan = v
        elif cmd == 0xC1: t.vol = v
        elif cmd == 0xC2: self.master_vol = v
        elif cmd == 0xC3: t.transpose = v
        elif cmd == 0xC4: t.bend = v
        elif cmd == 0xC5: t.bend_range = v
        elif cmd == 0xC7: t.note_wait = v == 1
        elif cmd == 0xC8:
            t.tie = v != 0
            if t.tie_voice:
                t.tie_voice.phase = 3
                t.tie_voice = None
        elif cmd == 0xC9:
            t.porta_key = v + t.transpose
            t.porta = True
        elif cmd == 0xCA: t.mod_depth = v
        elif cmd == 0xCB: t.mod_speed = v
        elif cmd == 0xCC: t.mod_type = v
        elif cmd == 0xCD: t.mod_range = v
        elif cmd == 0xCE: t.porta = v != 0
        elif cmd == 0xCF: t.porta_time = v
        elif 0xD0 <= cmd <= 0xD3: t.adsr[cmd - 0xD0] = v
        elif cmd == 0xD4: t.loops.append((v, t.pc))
        elif cmd == 0xD5: t.expr = v

    # ---- voices -----------------------------------------------------------------------------
    def note_on(self, t, key, vel, dur):
        key = max(0, min(127, key))
        if t.tie and t.tie_voice and not t.tie_voice.done:
            v = t.tie_voice
            v.key, v.vel = key, vel
            return
        nd = self.note_def(self.bank, t.prg, key)
        if nd is None:
            return
        ntype = int(nd.type)
        if ntype == 1:
            wave = self.wave(self.bank, nd)
        elif ntype == 2:
            wave = make_psg(nd.waveID)
        elif ntype == 3:
            wave = NOISE
        else:
            return
        v = Voice()
        v.wave, v.pos, v.key, v.vel, v.track = wave, 0.0, key, vel, t
        v.base_key = nd.pitch if ntype == 1 else 69
        v.length = -1 if t.tie else dur
        a, d, s, r = (t.adsr[i] if t.adsr[i] != 0xFF else x
                      for i, x in enumerate((nd.attack, nd.decay, nd.sustain, nd.release)))
        v.attack, v.decay, v.sustain, v.release = cnv_attack(a), cnv_fall(d), CNV_SUST[s] << 7, cnv_fall(r)
        v.ampl, v.phase = AMPL_MIN, 0
        v.pan = nd.pan
        sweep = t.sweep_pitch
        if t.porta:
            sweep += (t.porta_key - key) * 64
        if sweep:
            if t.porta_time:
                v.sweep_len = max(1, (t.porta_time * t.porta_time * abs(sweep)) >> 11)
            else:
                v.sweep_len = max(1, int(dur * 240 / max(1, self.tempo)))
        else:
            v.sweep_len = 0
        v.sweep, v.sweep_cnt = sweep, 0
        t.porta_key = key
        v.mod_delay_cnt, v.mod_counter = 0, 0
        v.gl = v.gr = None
        v.done = False
        v.age = self.tick
        if t.tie:
            t.tie_voice = v
        self.voices.append(v)
        if len(self.voices) > 16:
            victim = min((x for x in self.voices if x is not v),
                         key=lambda x: (x.phase != 3, x.ampl))
            self.voices.remove(victim)

    def update_voices(self):
        alive = []
        for v in self.voices:
            if v.phase == 0:
                v.ampl = (v.attack * v.ampl) >> 8
                if v.ampl == 0 or v.attack == 0:
                    v.ampl, v.phase = 0, 1
            elif v.phase == 1:
                v.ampl -= v.decay
                if v.ampl <= v.sustain:
                    v.ampl, v.phase = v.sustain, 2
            elif v.phase == 3:
                v.ampl -= v.release
                if v.ampl <= AMPL_MIN:
                    v.done = True
            if not v.done:
                alive.append(v)
        self.voices = alive

    def mix(self, n):
        L = np.zeros(n, np.float32)
        R = np.zeros(n, np.float32)
        idx = np.arange(n, dtype=np.float64)
        keep = []
        for v in self.voices:
            t = v.track
            mod = 0
            if t.mod_depth:
                if v.mod_delay_cnt < t.mod_delay:
                    v.mod_delay_cnt += 1
                else:
                    v.mod_counter = (v.mod_counter + (t.mod_speed << 6)) & 0x7FFF
                    sine = round(127 * math.sin(2 * math.pi * (v.mod_counter >> 8) / 128))
                    mod = sine * t.mod_range * t.mod_depth
            vol = (v.ampl >> 7) + CNV_SUST[v.vel] + CNV_SUST[t.vol] + CNV_SUST[t.expr] \
                + CNV_SUST[self.master_vol] + CNV_SUST[self.seq_vol]
            pan = t.pan + v.pan - 64
            adj = (v.key - v.base_key) * 64 + ((t.bend * t.bend_range) >> 1)
            if v.sweep_len and v.sweep_cnt < v.sweep_len:
                adj += v.sweep * (v.sweep_len - v.sweep_cnt) // v.sweep_len
                v.sweep_cnt += 1
            if mod:
                if t.mod_type == 1:
                    vol += (mod * 60) >> 14
                elif t.mod_type == 2:
                    pan += mod >> 8
                else:
                    adj += mod >> 8
            vol = max(-723, vol)
            gain = 10 ** (vol / 200)
            pan = max(0, min(127, pan))
            gl, gr = gain * (127 - pan) / 127, gain * pan / 127
            if v.gl is None:
                v.gl, v.gr = gl, gr
            step = v.wave.rate / SR * 2 ** (adj / 768)
            w = v.wave
            p = v.pos + idx * step
            if w.loop is not None:
                over = p >= w.n
                if over.any():
                    ll = w.n - w.loop
                    p = np.where(over, w.loop + np.mod(p - w.loop, ll), p)
                v.pos = v.pos + n * step
                if v.pos >= w.n:
                    v.pos = w.loop + (v.pos - w.loop) % (w.n - w.loop)
            else:
                if v.pos >= w.n:
                    continue
                p = np.minimum(p, w.n - 1)
                v.pos += n * step
            i0 = p.astype(np.int64)
            fr = (p - i0).astype(np.float32)
            i1 = i0 + 1
            if w.loop is not None:
                i1 = np.where(i1 >= w.n, w.loop, i1)
            s = w.s[i0] * (1 - fr) + w.s[np.minimum(i1, len(w.s) - 1)] * fr
            ramp = np.linspace(0, 1, n, endpoint=False, dtype=np.float32)
            L += s * (v.gl + (gl - v.gl) * ramp)
            R += s * (v.gr + (gr - v.gr) * ramp)
            v.gl, v.gr = gl, gr
            keep.append(v)
        self.voices = keep
        return L, R
