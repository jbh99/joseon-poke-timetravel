"""Readers for PMD Blue Rescue Team (NDS) data: sbin archives, SIR0, AT4PX."""
import struct

def sbin_entries(buf):
    """Return {name: bytes} for a .sbin archive (16-byte name/offset/size table)."""
    out = {}
    first = struct.unpack_from('<I', buf, 8)[0]
    for i in range(0, first, 16):
        raw = buf[i:i + 8]
        if raw == b'\xff' * 8 or raw == b'\0' * 8:
            continue
        name = raw.split(b'\0')[0].decode('latin1')
        off, size = struct.unpack_from('<II', buf, i + 8)
        if size and off + size <= len(buf):
            out[name] = buf[off:off + size]
    return out

def sir0(buf):
    """Return (content_offset, pointer_offsets) of a SIR0 wrapper, or None."""
    if buf[:4] != b'SIR0':
        return None
    head, plist = struct.unpack_from('<II', buf, 4)
    ptrs, pos, acc = [], plist, 0
    while pos < len(buf):
        v = 0
        while True:
            b = buf[pos]; pos += 1
            v = (v << 7) | (b & 0x7f)
            if not b & 0x80:
                break
        if v == 0:
            break
        acc += v
        ptrs.append(acc)
    return head, ptrs

def px_decompress(buf, variant=0):
    """AT4PX / PKDPX decompression."""
    magic = buf[:5]
    if magic == b'AT4PX':
        flags = list(buf[7:16]); dlen = struct.unpack_from('<H', buf, 16)[0]; pos = 18
    elif magic == b'PKDPX':
        flags = list(buf[7:16]); dlen = struct.unpack_from('<I', buf, 16)[0]; pos = 20
    else:
        raise ValueError('not PX: %r' % magic)
    clen = struct.unpack_from('<H', buf, 5)[0]
    out = bytearray()
    while len(out) < dlen and pos < clen:
        cmd = buf[pos]; pos += 1
        for bit in range(7, -1, -1):
            if len(out) >= dlen or pos >= clen:
                break
            if cmd & (1 << bit):
                out.append(buf[pos]); pos += 1
                continue
            b = buf[pos]; pos += 1
            hi, lo = b >> 4, b & 0xf
            if hi in flags:
                idx = flags.index(hi)
                if idx == 0:
                    v = (lo << 4) | lo
                    out += bytes((v, v))
                else:
                    if variant == 0:
                        if idx <= 4:
                            ny = [(lo + 1) & 0xf] * 4; ny[idx - 1] = lo
                        else:
                            ny = [lo] * 4; ny[idx - 5] = (lo + 1) & 0xf
                    else:
                        if idx <= 4:
                            ny = [lo] * 4; ny[idx - 1] = (lo + 1) & 0xf
                        else:
                            ny = [lo] * 4; ny[idx - 5] = (lo - 1) & 0xf
                    out += bytes(((ny[0] << 4) | ny[1], (ny[2] << 4) | ny[3]))
            else:
                off = ((lo << 8) | buf[pos]) - 0x1000; pos += 1
                start = len(out) + off
                for k in range(hi + 3):
                    out.append(out[start + k])
    return bytes(out[:dlen])

def unwrap(buf):
    """Strip SIR0 and decompress PX if present; returns raw content bytes."""
    if buf[:4] == b'SIR0':
        head, _ = sir0(buf)
        inner = buf[16:]
        if inner[:5] in (b'AT4PX', b'PKDPX'):
            return px_decompress(inner)
        return buf
    if buf[:5] in (b'AT4PX', b'PKDPX'):
        return px_decompress(buf)
    return buf

def pal_rgba(buf, off=0, n=16):
    """PMD palettes are 4 bytes per colour (R, G, B, pad)."""
    return [(buf[off + i * 4], buf[off + i * 4 + 1], buf[off + i * 4 + 2]) for i in range(n)]

def tiles4(buf):
    """Decode 4bpp GBA tiles into a list of 64-entry index lists."""
    out = []
    for t in range(len(buf) // 32):
        px = []
        for b in buf[t * 32:(t + 1) * 32]:
            px += [b & 0xf, b >> 4]
        out.append(px)
    return out

def draw_tile(img, tiles, pals, entry, x, y, transparent0=False):
    t = entry & 0x3ff; hf = entry & 0x400; vf = entry & 0x800; p = entry >> 12
    if t >= len(tiles):
        return
    px = tiles[t]; pal = pals[p] if p < len(pals) else pals[0]
    for j in range(8):
        for i in range(8):
            c = px[(7 - j if vf else j) * 8 + (7 - i if hf else i)]
            if transparent0 and c == 0:
                continue
            img.putpixel((x + i, y + j), pal[c] + (255,))

OAM_SIZES = {  # (shape, size) -> (w, h)
    (0, 0): (8, 8), (0, 1): (16, 16), (0, 2): (32, 32), (0, 3): (64, 64),
    (1, 0): (16, 8), (1, 1): (32, 8), (1, 2): (32, 16), (1, 3): (64, 32),
    (2, 0): (8, 16), (2, 1): (8, 32), (2, 2): (16, 32), (2, 3): (32, 64),
}

class AxSprite:
    """PMD Blue 'ax' monster sprite: metaframes, animation groups, strip images."""
    def __init__(self, buf):
        self.b = b = buf
        head, _ = sir0(buf)
        mf_tab, grp_tab, ngrp, img_tab, offs = struct.unpack_from('<IIIII', b, head)
        self.ngrp = ngrp
        # metaframes
        n_mf = (offs - mf_tab) // 4 if offs > mf_tab else 0
        self.mf = []
        for i in range(n_mf):
            o = struct.unpack_from('<I', b, mf_tab + i * 4)[0]
            pieces = []
            while True:
                img, unk, a0, a1, a2 = struct.unpack_from('<hHHHH', b, o)
                if img == -1 and a0 == 0xffff:
                    break
                pieces.append((img, a0, a1, a2)); o += 10
                if len(pieces) > 16:
                    break
            self.mf.append(pieces)
        # images
        self.n_img = (head - img_tab) // 4
        self.imgs = []
        for i in range(self.n_img):
            o = struct.unpack_from('<I', b, img_tab + i * 4)[0]
            data = bytearray()
            while True:
                ptr, ln = struct.unpack_from('<II', b, o)
                if ln == 0:
                    break
                data += b[ptr:ptr + ln] if ptr else bytes(ln)
                o += 8
            self.imgs.append(bytes(data))
        # animation groups -> 8 directions -> frames
        self.groups = []
        for g in range(ngrp):
            dt = struct.unpack_from('<I', b, grp_tab + g * 4)[0]
            dirs = []
            if dt:
                for dname in range(8):
                    so = struct.unpack_from('<I', b, dt + dname * 4)[0]
                    frames = []
                    while so:
                        dur, flag, mfi, ox, oy, sx, sy = struct.unpack_from('<BBHhhhh', b, so)
                        if dur == 0:
                            break
                        frames.append(dict(dur=dur, flag=flag, mf=mfi, ox=ox, oy=oy, sx=sx, sy=sy))
                        so += 12
                    dirs.append(frames)
            self.groups.append(dirs)

    def piece_px(self, img, w, h):
        """Pixels of a piece: tiles are 8x8 4bpp, row-major across the piece."""
        data = self.imgs[img] if 0 <= img < len(self.imgs) else b''
        tw = w // 8
        px = [0] * (w * h)
        for t in range((w // 8) * (h // 8)):
            tx, ty = (t % tw) * 8, (t // tw) * 8
            base = t * 32
            for k in range(32):
                if base + k >= len(data):
                    break
                v = data[base + k]
                y, x = divmod(k * 2, 8)
                px[(ty + y) * w + tx + x] = v & 0xf
                px[(ty + y) * w + tx + x + 1] = v >> 4
        return px

def render_mf(ax, mfi, pal, size=64):
    """Render a metaframe centred in a size x size RGBA image (origin at centre)."""
    from PIL import Image
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    if mfi >= len(ax.mf):
        return img
    for imgi, a0, a1, a2 in reversed(ax.mf[mfi]):
        shape, sz = a0 >> 14, a1 >> 14
        w, h = OAM_SIZES.get((shape, sz), (8, 8))
        y = (a0 & 0x3ff) - 512
        x = (a1 & 0x1ff) - 256
        hf, vf = a1 & 0x1000, a1 & 0x2000
        px = ax.piece_px(imgi, w, h)
        for j in range(h):
            for i in range(w):
                c = px[j * w + i]
                if not c:
                    continue
                X = size // 2 + x + (w - 1 - i if hf else i)
                Y = size // 2 + y + (h - 1 - j if vf else j)
                if 0 <= X < size and 0 <= Y < size:
                    img.putpixel((X, Y), pal[c] + (255,))
    return img
