"""Nintendo DS NITRO 3D resources, read-only: BMD0 models (MDL0 + optional TEX0) and BTX0 texture sets, with
a software rasterizer that draws them from above for the town maps (render.py).

What is decoded: the resource dictionaries, model nodes (translation, rotation incl. pivot-compressed, scale),
the render-command stream (node matrices, matrix store/restore, material bind, shape draw, position scale),
materials (texture/palette names, repeat/flip, polygon alpha, diffuse colour), shapes (GX display lists: matrix
restore/scale/translate, colour, normal, texcoord, every vertex form, begin/end of triangles, quads and strips),
and textures in all seven formats (A3I5, 4/16/256-colour, 4x4 compressed, A5I3, direct colour).
Skinned (NODEMIX) and billboard nodes are drawn with their node's matrix only.
"""
import struct

import numpy as np


def fx(v, frac=12):
    return v / (1 << frac)


class Reader:
    def __init__(self, data, pos=0):
        self.d, self.p = data, pos

    def u8(self):
        v = self.d[self.p]; self.p += 1; return v

    def u16(self):
        v = struct.unpack_from('<H', self.d, self.p)[0]; self.p += 2; return v

    def s16(self):
        v = struct.unpack_from('<h', self.d, self.p)[0]; self.p += 2; return v

    def u32(self):
        v = struct.unpack_from('<I', self.d, self.p)[0]; self.p += 4; return v

    def s32(self):
        v = struct.unpack_from('<i', self.d, self.p)[0]; self.p += 4; return v


def dictionary(data, pos, read_entry):
    """A NITRO resource dictionary at pos: [(name, entry)], entries read by read_entry(Reader)."""
    count = data[pos + 1]
    # header (8 bytes), then the patricia tree: a 4-byte head and 4 bytes per entry
    p = pos + 8 + 4 + 4 * count
    entry_size, _data_size = struct.unpack_from('<HH', data, p)
    p += 4
    out = []
    for i in range(count):
        r = Reader(data, p + i * entry_size)
        entry = read_entry(r)
        name = data[p + count * entry_size + 16 * i: p + count * entry_size + 16 * (i + 1)].split(b'\0')[0].decode('latin-1')
        out.append((name, entry))
    return out


# ---------------------------------------------------------------------------------------------------- textures
class TexSet:
    """A TEX0 block: textures {name: (params, extra)} and palettes {name: byte offset}, decoded on demand."""

    def __init__(self, data, base):
        self.d, self.b = data, base
        h = Reader(data, base + 0x0C)
        h.u16(); tex_dict = h.u16(); h.u32(); self.tex_data = base + h.u32(); h.u32()
        h.u16(); h.u16(); h.u32(); self.comp_data = base + h.u32(); self.comp_info = base + h.u32(); h.u32()
        h.u32(); pal_dict = h.u32(); self.pal_data = base + h.u32()
        self.textures = dict(dictionary(data, base + tex_dict, lambda r: (r.u32(), r.u32())))
        self.palettes = dict(dictionary(data, base + pal_dict, lambda r: r.u16() * 8))
        self.cache = {}

    def colors(self, pal_off, n):
        # a palette may hold fewer colours than its texture format can index (or end with the file): pad with black
        start = self.pal_data + pal_off
        have = max(0, min(n, (len(self.d) - start) // 2))
        raw = np.zeros(n, np.uint32)
        raw[:have] = np.frombuffer(self.d, '<u2', count=have, offset=start)
        r, g, b = raw & 31, (raw >> 5) & 31, (raw >> 10) & 31
        return np.stack([r * 255 // 31, g * 255 // 31, b * 255 // 31], -1).astype(np.uint8)

    def decode(self, tex_name, pal_name):
        key = (tex_name, pal_name)
        if key in self.cache:
            return self.cache[key]
        params, _ = self.textures[tex_name]
        off = (params & 0xFFFF) << 3
        w, h = 8 << ((params >> 20) & 7), 8 << ((params >> 23) & 7)
        fmt, c0 = (params >> 26) & 7, (params >> 29) & 1
        pal = self.palettes.get(pal_name, 0) if pal_name is not None else 0
        n = w * h
        rgba = np.zeros((h, w, 4), np.uint8)
        if fmt in (2, 3, 4):
            bits = {2: 2, 3: 4, 4: 8}[fmt]
            raw = np.frombuffer(self.d, np.uint8, count=n * bits // 8, offset=self.tex_data + off)
            if bits == 8:
                idx = raw.astype(np.int64)
            else:
                per = 8 // bits
                idx = ((raw[:, None] >> (np.arange(per) * bits)) & ((1 << bits) - 1)).reshape(-1).astype(np.int64)
            cols = self.colors(pal, 1 << bits)
            rgba[..., :3] = cols[idx].reshape(h, w, 3)
            rgba[..., 3] = np.where((idx == 0) & bool(c0), 0, 255).reshape(h, w)
        elif fmt in (1, 6):
            raw = np.frombuffer(self.d, np.uint8, count=n, offset=self.tex_data + off).astype(np.int64)
            ib, ab = (5, 3) if fmt == 1 else (3, 5)
            idx, a = raw & ((1 << ib) - 1), raw >> ib
            alpha = (a * 4 + a // 2) * 255 // 31 if fmt == 1 else a * 255 // 31
            cols = self.colors(pal, 1 << ib)
            rgba[..., :3] = cols[idx].reshape(h, w, 3)
            rgba[..., 3] = alpha.reshape(h, w)
        elif fmt == 7:
            raw = np.frombuffer(self.d, '<u2', count=n, offset=self.tex_data + off).astype(np.uint32)
            rgba[..., 0] = ((raw & 31) * 255 // 31).reshape(h, w)
            rgba[..., 1] = (((raw >> 5) & 31) * 255 // 31).reshape(h, w)
            rgba[..., 2] = (((raw >> 10) & 31) * 255 // 31).reshape(h, w)
            rgba[..., 3] = np.where(raw >> 15, 255, 0).reshape(h, w)
        elif fmt == 5:
            blocks = (w // 4) * (h // 4)
            texel = np.frombuffer(self.d, '<u4', count=blocks, offset=self.comp_data + off)
            info = np.frombuffer(self.d, '<u2', count=blocks, offset=self.comp_info + off // 2)
            pal_raw = self.d
            for bi in range(blocks):
                t, inf = int(texel[bi]), int(info[bi])
                mode, poff = inf >> 14, (inf & 0x3FFF) * 4
                base = self.pal_data + pal + poff
                c = [struct.unpack_from('<H', pal_raw, base + 2 * k)[0] if base + 2 * k + 2 <= len(pal_raw) else 0 for k in range(4)]
                rgb = [np.array([x & 31, (x >> 5) & 31, (x >> 10) & 31], np.float32) * 255 / 31 for x in c]
                cols = [(rgb[0], 255), (rgb[1], 255)]
                if mode == 0:
                    cols += [(rgb[2], 255), (rgb[0] * 0, 0)]
                elif mode == 1:
                    cols += [((rgb[0] + rgb[1]) / 2, 255), (rgb[0] * 0, 0)]
                elif mode == 2:
                    cols += [(rgb[2], 255), (rgb[3], 255)]
                else:
                    cols += [((rgb[0] * 5 + rgb[1] * 3) / 8, 255), ((rgb[0] * 3 + rgb[1] * 5) / 8, 255)]
                by, bx = (bi // (w // 4)) * 4, (bi % (w // 4)) * 4
                for y in range(4):
                    for x in range(4):
                        k = (t >> (2 * (y * 4 + x))) & 3
                        rgba[by + y, bx + x, :3] = cols[k][0]
                        rgba[by + y, bx + x, 3] = cols[k][1]
        self.cache[key] = rgba
        return rgba


# ---------------------------------------------------------------------------------------------------- models
def pivot(select, neg, a, b):
    o = -1.0 if neg & 1 else 1.0
    c = -b if neg & 2 else b
    d = -a if neg & 4 else a
    rows = {
        0: [o, 0, 0, 0, a, b, 0, c, d], 1: [0, o, 0, a, 0, b, c, 0, d], 2: [0, 0, o, a, b, 0, c, d, 0],
        3: [0, a, b, o, 0, 0, 0, c, d], 4: [a, 0, b, 0, o, 0, c, 0, d], 5: [a, b, 0, 0, 0, o, c, d, 0],
        6: [0, a, b, 0, c, d, o, 0, 0], 7: [a, 0, b, c, 0, d, 0, o, 0], 8: [a, b, 0, c, d, 0, 0, 0, o],
    }
    return np.array(rows.get(select, [1, 0, 0, 0, 1, 0, 0, 0, 1]), np.float64).reshape(3, 3)


def node_matrix(r):
    """A model node's local transform as a 4x4 row-vector matrix (v' = v @ M)."""
    flags = r.u16()
    m0 = fx(r.s16())
    t = np.zeros(3)
    rot = np.eye(3)
    s = np.ones(3)
    if not flags & 1:
        t = np.array([fx(r.s32()) for _ in range(3)])
    if not flags & 2:
        if flags & 8:
            a, b = fx(r.s16()), fx(r.s16())
            rot = pivot((flags >> 4) & 15, (flags >> 8) & 15, a, b)
        else:
            rest = [fx(r.s16()) for _ in range(8)]
            rot = np.array([m0] + rest).reshape(3, 3)
    if not flags & 4:
        s = np.array([fx(r.s32()) for _ in range(3)])
    m = np.eye(4)
    m[:3, :3] = np.diag(s) @ rot
    m[3, :3] = t
    return m


class Material:
    def __init__(self, r, name):
        self.name = name
        r.u16(); r.u16()
        self.dif_amb, self.spe_emi, self.poly_attr = r.u32(), r.u32(), r.u32()
        r.u32()
        self.tex_params = r.u32()
        r.u32(); r.u16()
        self.flags = r.u16()
        self.w, self.h = r.u16(), r.u16()
        r.u32(); r.u32()
        self.tex_scale, self.tex_trans = (1.0, 1.0), (0.0, 0.0)
        if self.flags & 1:  # a texture matrix follows: scale, rotation and translation each unless flagged as identity
            if not self.flags & 2:
                self.tex_scale = (fx(r.s32()), fx(r.s32()))
            if not self.flags & 4:
                r.s16(); r.s16()
            if not self.flags & 8:
                self.tex_trans = (fx(r.s32()), fx(r.s32()))
        self.tex = self.pal = None
        self.alpha = ((self.poly_attr >> 16) & 31) / 31
        d = self.dif_amb & 0x7FFF
        self.diffuse = np.array([d & 31, (d >> 5) & 31, (d >> 10) & 31], np.float32) / 31
        self.vtx_color = bool(self.dif_amb & 0x8000)  # the diffuse colour is the vertex colour default


class Model:
    def __init__(self, data, base, name):
        self.name = name
        r = Reader(data, base)
        r.u32()
        sbc, mats, shps, _inv = r.u32(), r.u32(), r.u32(), r.u32()
        r.p += 3
        r.u8(); r.u8(); r.u8()
        r.p += 2
        self.up = fx(r.s32())
        r.s32()
        nodes_pos = base + 0x40
        self.nodes = [m for _, m in dictionary(data, nodes_pos, lambda rr: rr.u32())]
        self.nodes = [node_matrix(Reader(data, nodes_pos + off)) for off in self.nodes]
        # materials: the dictionary of materials, then texture -> materials and palette -> materials lists
        mbase = base + mats
        tex_list, pal_list = struct.unpack_from('<HH', data, mbase)
        mat_offs = dictionary(data, mbase + 4, lambda rr: rr.u32())
        self.materials = [Material(Reader(data, mbase + off), nm) for nm, off in mat_offs]
        for nm, (off, cnt) in dictionary(data, mbase + tex_list, lambda rr: (rr.u16(), rr.u8())):
            for k in range(cnt):
                self.materials[data[mbase + off + k]].tex = nm
        for nm, (off, cnt) in dictionary(data, mbase + pal_list, lambda rr: (rr.u16(), rr.u8())):
            for k in range(cnt):
                self.materials[data[mbase + off + k]].pal = nm
        sbase = base + shps
        self.shapes = []
        for nm, off in dictionary(data, sbase, lambda rr: rr.u32()):
            rr = Reader(data, sbase + off)
            rr.u16(); rr.u16(); rr.u32()
            dl_off, dl_size = rr.u32(), rr.u32()
            self.shapes.append(data[sbase + off + dl_off: sbase + off + dl_off + dl_size])
        self.sbc = data[base + sbc: base + mats]

    def draws(self):
        """(material index, shape index, 4x4 matrix) for every shape the render commands draw."""
        d, p = self.sbc, 0
        cur, stack, mat, out = np.eye(4), {}, 0, []
        while p < len(d):
            op = d[p]; c = op & 0x1F; p += 1
            if c == 0x00:
                continue
            if c == 0x01:
                break
            if c == 0x02:
                p += 2
            elif c == 0x03:
                cur = stack.get(d[p], np.eye(4)); p += 1
            elif c == 0x04:
                mat = d[p]; p += 1
            elif c == 0x05:
                out.append((mat, d[p], cur.copy())); p += 1
            elif c in (0x06, 0x07, 0x08):
                # NODEDESC (node, parent, flags) multiplies in the node's matrix; BB / BBY (node) turn the matrix
                # already built to face the camera, which for this view from the south is the model's own front
                node = d[p]; p += 3 if c == 0x06 else 1
                dst = src = None
                if op & 0x20:
                    dst = d[p]; p += 1
                if op & 0x40:
                    src = d[p]; p += 1
                if src is not None:
                    cur = stack.get(src, np.eye(4))
                if c == 0x06 and node < len(self.nodes):
                    cur = self.nodes[node] @ cur
                if dst is not None:
                    stack[dst] = cur.copy()
            elif c == 0x09:
                dst, cnt = d[p], d[p + 1]; p += 2
                p += 3 * cnt
                stack[dst] = cur.copy()
            elif c == 0x0A:
                p += 8
            elif c == 0x0B:
                pass
            elif c in (0x0C, 0x0D):
                p += 2
            else:
                break
        return out


class BMD:
    def __init__(self, data):
        assert data[:4] == b'BMD0', data[:4]
        n = struct.unpack_from('<H', data, 0x0E)[0]
        offs = struct.unpack_from('<%dI' % n, data, 0x10)
        self.models, self.tex = [], None
        for o in offs:
            if data[o:o + 4] == b'MDL0':
                self.models = [Model(data, o + off, nm) for nm, off in dictionary(data, o + 8, lambda r: r.u32())]
            elif data[o:o + 4] == b'TEX0':
                self.tex = TexSet(data, o)


def btx(data):
    assert data[:4] == b'BTX0', data[:4]
    off = struct.unpack_from('<I', data, 0x10)[0]
    return TexSet(data, off)


# ---------------------------------------------------------------------------------------------------- geometry
CMD_ARGS = {0x10: 1, 0x11: 0, 0x12: 1, 0x13: 1, 0x14: 1, 0x15: 0, 0x16: 16, 0x17: 12, 0x18: 16, 0x19: 12, 0x1A: 9,
            0x1B: 3, 0x1C: 3, 0x20: 1, 0x21: 1, 0x22: 1, 0x23: 2, 0x24: 1, 0x25: 1, 0x26: 1, 0x27: 1, 0x28: 1,
            0x29: 1, 0x2A: 1, 0x2B: 1, 0x30: 1, 0x31: 1, 0x32: 1, 0x33: 1, 0x34: 32, 0x40: 1, 0x41: 0, 0x50: 1,
            0x60: 1, 0x70: 3, 0x71: 2, 0x72: 1, 0x00: 0}


def s10(v):
    return v - 1024 if v & 512 else v


LIGHT = np.array([0.0, 0.92, 0.39])  # toward the light: from above and a little south, as the field camera sees


def rgb15(v):
    return np.array([v & 31, (v >> 5) & 31, (v >> 10) & 31]) / 31


def triangles(dl, matrix, stack=None, mat=None):
    """Run a GX display list: [(pos3 x3, uv x3, rgb x3)] in world units (matrix applied).
    With a material: the vertex colour starts as its diffuse when the material sets it so (DIF_AMB bit 15), and on
    a lit polygon every NORMAL recomputes it as emission + ambient + diffuse * max(0, N.L), as the DS does with one
    white light."""
    words = struct.unpack('<%dI' % (len(dl) // 4), dl[:len(dl) // 4 * 4])
    i, out = 0, []
    cur = matrix.copy()
    stack = stack or {}
    color = np.array([1.0, 1.0, 1.0])
    lit = False
    if mat is not None:
        dif, amb, emi = rgb15(mat.dif_amb), rgb15(mat.dif_amb >> 16), rgb15(mat.spe_emi >> 16)
        if mat.dif_amb & 0x8000:
            color = dif
        lit = bool(mat.poly_attr & 15)
    uv = (0.0, 0.0)
    pos = np.zeros(3)
    prim, verts = 0, []

    def emit(p):
        v = np.append(p, 1.0) @ cur
        verts.append((v[:3].copy(), uv, color.copy()))
        n = len(verts)
        if prim == 0 and n % 3 == 0:
            out.append(tuple(verts[-3:]))
        elif prim == 1 and n % 4 == 0:
            a, b, c, d = verts[-4:]
            out.append((a, b, c)); out.append((a, c, d))
        elif prim == 2 and n >= 3:
            a, b, c = verts[-3:]
            out.append((a, b, c) if n % 2 else (b, a, c))
        elif prim == 3 and n >= 4 and n % 2 == 0:
            a, b, c, d = verts[-4:]
            out.append((a, b, d)); out.append((a, d, c))

    while i < len(words):
        cmds = [(words[i] >> (8 * k)) & 0xFF for k in range(4)]
        i += 1
        for c in cmds:
            n = CMD_ARGS.get(c, 0)
            a = words[i:i + n]
            i += n
            if c == 0x14:
                cur = stack.get(a[0] & 31, matrix).copy()
            elif c == 0x1B:
                cur = np.diag([fx(struct.unpack('<i', struct.pack('<I', x))[0]) for x in a] + [1.0]) @ cur
            elif c == 0x1C:
                t = np.eye(4); t[3, :3] = [fx(struct.unpack('<i', struct.pack('<I', x))[0]) for x in a]
                cur = t @ cur
            elif c == 0x20:
                v = a[0]; color = np.array([v & 31, (v >> 5) & 31, (v >> 10) & 31]) / 31
            elif c == 0x21 and lit:
                v = a[0]
                n = np.array([s10(v & 1023), s10((v >> 10) & 1023), s10((v >> 20) & 1023)]) / 512.0
                n = n @ cur[:3, :3]
                ln = np.linalg.norm(n)
                d = max(0.0, float(n @ LIGHT) / ln) if ln > 1e-9 else 1.0
                color = np.clip(emi + amb + dif * d, 0, 1)
            elif c == 0x22:
                v = a[0]; uv = (fx(struct.unpack('<h', struct.pack('<H', v & 0xFFFF))[0], 4), fx(struct.unpack('<h', struct.pack('<H', v >> 16))[0], 4))
            elif c == 0x23:
                x = struct.unpack('<h', struct.pack('<H', a[0] & 0xFFFF))[0]
                y = struct.unpack('<h', struct.pack('<H', a[0] >> 16))[0]
                z = struct.unpack('<h', struct.pack('<H', a[1] & 0xFFFF))[0]
                pos = np.array([fx(x), fx(y), fx(z)]); emit(pos)
            elif c == 0x24:
                v = a[0]; pos = np.array([s10(v & 1023), s10((v >> 10) & 1023), s10((v >> 20) & 1023)]) / 64.0; emit(pos)
            elif c in (0x25, 0x26, 0x27):
                v = a[0]
                p1 = fx(struct.unpack('<h', struct.pack('<H', v & 0xFFFF))[0])
                p2 = fx(struct.unpack('<h', struct.pack('<H', v >> 16))[0])
                pos = pos.copy()
                if c == 0x25: pos[0], pos[1] = p1, p2
                elif c == 0x26: pos[0], pos[2] = p1, p2
                else: pos[1], pos[2] = p1, p2
                emit(pos)
            elif c == 0x28:
                v = a[0]
                pos = pos + np.array([s10(v & 1023), s10((v >> 10) & 1023), s10((v >> 20) & 1023)]) / 4096.0
                emit(pos)
            elif c == 0x40:
                prim, verts = a[0] & 3, []
            elif c == 0x41:
                verts = []
    return out
