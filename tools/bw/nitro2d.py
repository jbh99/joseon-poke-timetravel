"""Nintendo DS 2D resources, read-only: LZ10/LZ11 decompression, NCLR palettes, NCGR character graphics and
NCER cells, enough to assemble Pokémon Black's icons and battle sprites (sprites.py).
"""
import struct

import numpy as np


def lz(data):
    """Decompress Nintendo LZ77 (type 0x10) or LZ11 (type 0x11) data; anything else comes back unchanged."""
    if not data or data[0] not in (0x10, 0x11):
        return data
    kind = data[0]
    size = data[1] | data[2] << 8 | data[3] << 16
    p = 4
    if size == 0:
        size = struct.unpack_from('<I', data, 4)[0]
        p = 8
    out = bytearray()
    while len(out) < size and p < len(data):
        flags = data[p]
        p += 1
        for bit in range(8):
            if len(out) >= size:
                break
            if not flags & (0x80 >> bit):
                out.append(data[p])
                p += 1
                continue
            if kind == 0x10:
                b0, b1 = data[p], data[p + 1]
                p += 2
                n = (b0 >> 4) + 3
                disp = ((b0 & 15) << 8 | b1) + 1
            else:
                b0 = data[p]
                ind = b0 >> 4
                if ind == 0:
                    b1, b2 = data[p + 1], data[p + 2]
                    p += 3
                    n = ((b0 & 15) << 4 | b1 >> 4) + 0x11
                    disp = ((b1 & 15) << 8 | b2) + 1
                elif ind == 1:
                    b1, b2, b3 = data[p + 1], data[p + 2], data[p + 3]
                    p += 4
                    n = ((b0 & 15) << 12 | b1 << 4 | b2 >> 4) + 0x111
                    disp = ((b2 & 15) << 8 | b3) + 1
                else:
                    b1 = data[p + 1]
                    p += 2
                    n = ind + 1
                    disp = ((b0 & 15) << 8 | b1) + 1
            for _ in range(n):
                out.append(out[-disp])
    return bytes(out[:size])


def section(data, magic):
    """The body of a NITRO file's section by its (reversed) magic, e.g. b'RAHC' for CHAR."""
    p = struct.unpack_from('<H', data, 0x0C)[0]
    while p + 8 <= len(data):
        mg, sz = data[p:p + 4], struct.unpack_from('<I', data, p + 4)[0]
        if mg == magic:
            return data[p:p + sz]
        if sz <= 0:
            break
        p += sz
    return None


def nclr(data):
    """Palette colours as an (n, 3) uint8 array (BGR555)."""
    s = section(data, b'TTLP')
    size, off = struct.unpack_from('<I', s, 0x10)[0], struct.unpack_from('<I', s, 0x14)[0]
    raw = np.frombuffer(s, '<u2', count=size // 2, offset=0x08 + off).astype(np.uint32)
    return np.stack([(raw & 31) * 255 // 31, ((raw >> 5) & 31) * 255 // 31, ((raw >> 10) & 31) * 255 // 31], -1).astype(np.uint8)


def ncgr(data):
    """(indices (h, w) in pixels, bpp, tiled) from a NCGR: 4 or 8 bits a pixel, 8x8 tiles or a linear bitmap."""
    s = section(data, b'RAHC')
    th, tw = struct.unpack_from('<hh', s, 0x08)
    depth = struct.unpack_from('<I', s, 0x0C)[0]
    flags = struct.unpack_from('<I', s, 0x14)[0]
    size, off = struct.unpack_from('<II', s, 0x18)
    raw = np.frombuffer(s, np.uint8, count=size, offset=0x08 + off)
    bpp = 4 if depth == 3 else 8
    if bpp == 4:
        px = np.stack([raw & 15, raw >> 4], -1).reshape(-1)
    else:
        px = raw.copy()
    tiled = not (flags & 1)
    if th < 0 or tw < 0:  # no size given: a strip of 8x8 tiles, 32 wide
        n = len(px) // 64
        tw, th = min(32, n), (n + 31) // 32
    if tiled:
        tiles = px[:th * tw * 64].reshape(th, tw, 8, 8)
        img = tiles.transpose(0, 2, 1, 3).reshape(th * 8, tw * 8)
    else:
        img = px[:th * tw * 64].reshape(th * 8, tw * 8)
    return img, bpp, tiled, px


def ncer(data):
    """Cells: for each cell a list of OAM objects (x, y, w, h, tile index, hflip, vflip, palette)."""
    s = section(data, b'KBEC')
    n = struct.unpack_from('<H', s, 0x08)[0]
    ext = struct.unpack_from('<H', s, 0x0A)[0]
    cell_off = struct.unpack_from('<I', s, 0x0C)[0]
    mapping = struct.unpack_from('<I', s, 0x10)[0]
    base = 0x08 + cell_off
    entry = 16 if ext else 8
    sizes = {(0, 0): (8, 8), (0, 1): (16, 16), (0, 2): (32, 32), (0, 3): (64, 64), (1, 0): (16, 8), (1, 1): (32, 8),
             (1, 2): (32, 16), (1, 3): (64, 32), (2, 0): (8, 16), (2, 1): (8, 32), (2, 2): (16, 32), (2, 3): (32, 64)}
    cells = []
    oam_base = base + n * entry
    for i in range(n):
        cnt, _attr, off = struct.unpack_from('<HHI', s, base + i * entry)
        objs = []
        for k in range(cnt):
            a0, a1, a2 = struct.unpack_from('<HHH', s, oam_base + off + 6 * k)
            y = a0 & 0xFF
            y = y - 256 if y >= 128 else y
            x = a1 & 0x1FF
            x = x - 512 if x >= 256 else x
            shape, sz = a0 >> 14, a1 >> 14
            w, h = sizes.get((shape, sz), (8, 8))
            objs.append((x, y, w, h, a2 & 0x3FF, bool(a1 & 0x1000), bool(a1 & 0x2000), a2 >> 12))
        cells.append(objs)
    return cells, mapping
