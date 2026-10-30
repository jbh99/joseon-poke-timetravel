"""Shared helpers for reading the Pokemon DP (Korean Pearl) ROM."""
import os
import struct
from pathlib import Path
import ndspy.rom
import ndspy.narc
from PIL import Image

# the user's own ROM, never part of the repository: $PEARL_ROM, else the first of these that exists
ROM_NAME = "포켓몬스터DP - 펄기아(K).nds"
ROM_PATHS = [Path.home() / "Downloads" / "claude skills" / ROM_NAME, Path.home() / "Downloads" / ROM_NAME]
ROM_PATH = os.environ.get("PEARL_ROM") or str(next((p for p in ROM_PATHS if p.exists()), ROM_PATHS[0]))
_rom = None


def rom():
    global _rom
    if _rom is None:
        _rom = ndspy.rom.NintendoDSRom.fromFile(ROM_PATH)
    return _rom


def narc(path):
    return ndspy.narc.NARC(rom().getFileByName(path)).files


def bgr555(c):
    r = (c & 31) << 3
    g = ((c >> 5) & 31) << 3
    b = ((c >> 10) & 31) << 3
    return (r | r >> 5, g | g >> 5, b | b >> 5)


def find_block(data, magic):
    """Return offset of a Nitro block (magic as stored, e.g. b'RAHC')."""
    i = data.find(magic, 0x10)
    if i < 0:
        raise ValueError(f"block {magic} missing")
    return i


def nclr_palettes(data):
    o = find_block(data, b"TTLP")
    size = struct.unpack_from("<I", data, o + 0x10)[0]
    poff = struct.unpack_from("<I", data, o + 0x14)[0]
    raw = data[o + 8 + poff: o + 8 + poff + size]
    cols = [bgr555(struct.unpack_from("<H", raw, i)[0]) for i in range(0, len(raw) - 1, 2)]
    return [cols[i:i + 16] for i in range(0, len(cols), 16)]


def ncgr_raw(data):
    o = find_block(data, b"RAHC")
    h_t, w_t, depth = struct.unpack_from("<HHI", data, o + 8)
    tiled_flag = struct.unpack_from("<I", data, o + 0x14)[0]
    size, doff = struct.unpack_from("<II", data, o + 0x18)
    raw = bytes(data[o + 8 + doff: o + 8 + doff + size])
    return raw, (w_t, h_t, depth, tiled_flag)


def decrypt_dp(raw):
    """DP pokegra: XOR stream seeded from the last u16, walking backwards."""
    words = list(struct.unpack(f"<{len(raw)//2}H", raw))
    key = words[-1]
    for i in range(len(words) - 1, -1, -1):
        words[i] ^= key
        key = (key * 0x4E6D + 0x6073) & 0xFFFF
    return struct.pack(f"<{len(words)}H", *words)


def nibbles_linear(raw, w, h):
    px = []
    for b in raw:
        px.append(b & 15)
        px.append(b >> 4)
    return [px[y * w:(y + 1) * w] for y in range(h)]


def nibbles_tiled(raw, w, h):
    tw = w // 8
    grid = [[0] * w for _ in range(h)]
    for t in range(len(raw) // 32):
        tx, ty = (t % tw) * 8, (t // tw) * 8
        if ty >= h:
            break
        for j in range(32):
            b = raw[t * 32 + j]
            y, x = ty + j // 4, tx + (j % 4) * 2
            grid[y][x] = b & 15
            grid[y][x + 1] = b >> 4
    return grid


def to_image(grid, pal, transparent0=True):
    h, w = len(grid), len(grid[0])
    img = Image.new("RGBA", (w, h))
    p = img.load()
    for y in range(h):
        for x in range(w):
            i = grid[y][x]
            r, g, b = pal[i]
            p[x, y] = (r, g, b, 0 if (i == 0 and transparent0) else 255)
    return img


def front_index(g, sp, back=False):
    """pokegra slot order per species: female back, male back, female front, male front, pal, shiny pal."""
    base = 6 * sp + (0 if back else 2)
    return base + 1 if len(g[base + 1]) > 0 else base


def msg_entries(data):
    """Gen 4 message file -> list of u16 code lists (decrypted)."""
    n, seed = struct.unpack_from("<HH", data, 0)
    key = (seed * 0x2FD) & 0xFFFF
    out = []
    for i in range(n):
        k2 = (key * (i + 1)) & 0xFFFF
        rk = k2 | (k2 << 16)
        off, size = struct.unpack_from("<II", data, 4 + i * 8)
        off ^= rk
        size ^= rk
        ck = (0x91BD3 * (i + 1)) & 0xFFFF
        codes = []
        for j in range(size):
            c = struct.unpack_from("<H", data, off + j * 2)[0] ^ ck
            ck = (ck + 0x493D) & 0xFFFF
            codes.append(c)
        out.append(codes)
    return out
