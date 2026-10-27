// Web Audio: looping BGM rendered from the DP sound archive, jingles, cries and synthesized UI SFX.
import { G, loadJSON, prefs, setPref } from './core.js';

let ctx = null, master = null, bgmBus = null, sfxBus = null;
let meta = {};
const buffers = new Map();
const cur = { id: null, src: null, gain: null };
let jingleActive = false;
export const settings = { bgm: 0.55, sfx: 0.6 };

// co-op: the host's mix as a MediaStream track for guests (empty until audio has been unlocked)
let netDest = null;
export function audioStream() {
  if (!ctx) return [];
  if (!netDest) { netDest = ctx.createMediaStreamDestination(); master.connect(netDest); }
  return netDest.stream.getAudioTracks();
}
export async function initAudio() {
  meta = await loadJSON('bgm/bgm.json');
}
export function unlockAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = prefs.muted ? 0 : 1; master.connect(ctx.destination);
  bgmBus = ctx.createGain(); bgmBus.gain.value = settings.bgm; bgmBus.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = settings.sfx; sfxBus.connect(master);
  if (pending) { const p = pending; pending = null; playBgm(p); }
}
let pending = null;
// sound on/off silences the master bus (music, cries and effects; co-op guests hear the same mix)
export function setMuted(on) { setPref('muted', on); if (master) master.gain.setValueAtTime(on ? 0 : 1, ctx.currentTime); }

async function buffer(url) {
  if (buffers.has(url)) return buffers.get(url);
  const p = fetch(url).then((r) => r.arrayBuffer()).then((a) => ctx.decodeAudioData(a));
  buffers.set(url, p);
  if (buffers.size > 14) buffers.delete(buffers.keys().next().value);
  return p;
}
export function preloadBgm(id) { if (ctx && meta[id]) buffer('assets/bgm/' + meta[id].file); }

export async function playBgm(id, fadeSec = 0.8) {
  if (!id || !meta[id]) return;
  if (!ctx) { pending = id; return; }
  if (cur.id === id && cur.src) return;
  cur.id = id;
  const buf = await buffer('assets/bgm/' + meta[id].file);
  if (cur.id !== id) return;
  stopBgm(fadeSec);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const m = meta[id];
  if (m.loop) { src.loop = true; src.loopStart = m.loop[0]; src.loopEnd = Math.min(m.loop[1], buf.duration); }
  else src.loop = !/^fanfa|^win|ending/.test(id);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, ctx.currentTime);
  g.gain.linearRampToValueAtTime(1, ctx.currentTime + Math.max(0.05, fadeSec * 0.6));
  src.connect(g); g.connect(bgmBus);
  src.start();
  cur.src = src; cur.gain = g;
}
export function stopBgm(fadeSec = 0.6) {
  if (!cur.src) return;
  const { src, gain } = cur;
  const t = ctx.currentTime;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setValueAtTime(gain.gain.value, t);
  gain.gain.linearRampToValueAtTime(0, t + fadeSec);
  src.stop(t + fadeSec + 0.05);
  cur.src = null;
}
export function currentBgm() { return cur.id; }

// short fanfare that ducks the BGM, then restores it
export async function jingle(id) {
  if (!ctx || !meta[id] || jingleActive) return;
  jingleActive = true;
  const buf = await buffer('assets/bgm/' + meta[id].file);
  const t = ctx.currentTime;
  bgmBus.gain.cancelScheduledValues(t);
  bgmBus.gain.setValueAtTime(bgmBus.gain.value, t);
  bgmBus.gain.linearRampToValueAtTime(0.0001, t + 0.15);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const g = ctx.createGain(); g.gain.value = 0.9;
  src.connect(g); g.connect(sfxBus); src.start(t + 0.1);
  const end = t + 0.1 + buf.duration;
  bgmBus.gain.setValueAtTime(0.0001, end);
  bgmBus.gain.linearRampToValueAtTime(settings.bgm, end + 0.8);
  setTimeout(() => { jingleActive = false; }, (buf.duration + 0.3) * 1000);
}

export async function cry(sp, rate = 1) {
  if (!ctx || !sp) return;
  try {
    const buf = await buffer(`assets/cry/${sp}.ogg`);
    const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
    const g = ctx.createGain(); g.gain.value = 0.5;
    src.connect(g); g.connect(sfxBus); src.start();
  } catch (e) { /* missing cry */ }
}

// synthesized UI / combat sounds (square & noise blips in a DS-like register)
const SFX = {
  cursor: [[880, 0.035, 'square', 0.12]],
  confirm: [[988, 0.05, 'square', 0.14], [1319, 0.07, 'square', 0.12]],
  cancel: [[660, 0.05, 'square', 0.12], [440, 0.07, 'square', 0.1]],
  hit: [['noise', 0.09, 0.3], [180, 0.08, 'square', 0.15]],
  super: [['noise', 0.12, 0.35], [140, 0.12, 'sawtooth', 0.2], [90, 0.1, 'square', 0.15]],
  weak: [['noise', 0.06, 0.18]],
  miss: [[520, 0.06, 'triangle', 0.16], [380, 0.08, 'triangle', 0.12]],
  faint: [[440, 0.1, 'square', 0.14], [330, 0.1, 'square', 0.14], [220, 0.22, 'square', 0.14]],
  stairs: [[392, 0.08, 'square', 0.12], [523, 0.08, 'square', 0.12], [659, 0.08, 'square', 0.12], [784, 0.16, 'square', 0.12]],
  pick: [[1047, 0.05, 'square', 0.12], [1568, 0.09, 'square', 0.1]],
  step: [['noise', 0.02, 0.05]],
  warp: [[200, 0.6, 'sine-up', 0.2]],
  buff: [[523, 0.06, 'triangle', 0.15], [784, 0.1, 'triangle', 0.15]],
  heal: [[659, 0.08, 'sine', 0.2], [880, 0.08, 'sine', 0.2], [1175, 0.14, 'sine', 0.18]],
  bump: [[110, 0.05, 'square', 0.1]],
};
let noiseBuf = null;
export function sfx(name) {
  if (!ctx || !SFX[name]) return;
  let t = ctx.currentTime;
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  for (const step of SFX[name]) {
    const g = ctx.createGain();
    g.connect(sfxBus);
    if (step[0] === 'noise') {
      const [, dur, vol] = step;
      const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.connect(g);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.start(t); s.stop(t + dur);
    } else {
      const [freq, dur, type, vol] = step;
      const o = ctx.createOscillator();
      o.type = type === 'sine-up' ? 'sine' : type;
      o.frequency.setValueAtTime(freq, t);
      if (type === 'sine-up') o.frequency.exponentialRampToValueAtTime(freq * 8, t + dur);
      o.connect(g);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.start(t); o.stop(t + dur + 0.02);
      t += dur * 0.85;
    }
  }
}
G.sfx = sfx;
