"""Rebuild the layouts of Pearl's towns and of Snowpoint Temple from the ROM's field data.

Reads (all from the Korean Pearl ROM, see romlib.ROM_PATH):
  arm9 map header table      matrix, event file and place name of every map
  fielddata/mapmatrix        which land chunks (32x32 tiles) make up a map, and which header owns each cell
  fielddata/land_data        per chunk: movement permissions (u16 per tile: bit 15 blocked, low byte behaviour)
                             and the building list (model id + position in tiles from the chunk centre)
  fielddata/build_model      building models (NSBMD): name and bounding box, giving each building its footprint
  fielddata/eventdata        warps (doors and stairs, in matrix tile coordinates), NPC and sign spots
  zukan_data                 Pokedex weights (0.1 kg) for the spy quest

Writes web/assets/data/pearl.json (and adds each species' Pokedex weight, "kg", to web/assets/data/dex.json):
  towns / floors: { code: { name, w, h, rows, blds: [[x, y, w, h, kind]], doors: [[x, y, kind]], npcs: [[x, y]] } }
  rows use one character per tile:
    .  walkable ground      ,  tall grass (walkable)   =  bridge (walkable)   *  snow (walkable)   i  ice (walkable)
    #  blocked (trees, cliffs, fences, walls)   ~  water   B  building footprint   T  tree
No ROM bytes, textures or models are copied: only layout facts (which tile is walkable, where buildings stand).
"""
import json
import re
import struct

import romlib
import extract_data as ed

OUT = "../web/assets/data/pearl.json"
DEX = "../web/assets/data/dex.json"
HEADER_TABLE = 0xEA408  # Korean Pearl arm9: 24-byte map headers, indexed like mapname.bin
TOWNS = ["C02", "C03", "C05", "C06", "C07", "C09"]   # 운하 무쇠 연고 들판 장막 선단
FLOORS = ["D20R0101", "D20R0106"]                    # 선단신전 1F and its deepest floor (Regigigas)

rom = romlib.rom()
arm9 = bytes(rom.arm9)
_mn = rom.getFileByName("fielddata/maptable/mapname.bin")
MAPNAMES = [_mn[i:i + 16].split(b"\0")[0].decode() for i in range(0, len(_mn), 16)]
PLACES = ed.text_file(376)
MATRICES = romlib.narc("fielddata/mapmatrix/map_matrix.narc")
LAND = romlib.narc("fielddata/land_data/land_data_release.narc")
MODELS = romlib.narc("fielddata/build_model/build_model.narc")
EVENTS = romlib.narc("fielddata/eventdata/zone_event_release.narc")


def header(i):
    o = HEADER_TABLE + i * 24
    area, _, matrix, _, _, _, _, _, _, events, loc = struct.unpack_from("<BBHHHHHHHHH", arm9, o)
    return {"matrix": matrix, "events": events, "place": PLACES[loc] if loc < len(PLACES) else "?"}


def matrix(i):
    d = bytes(MATRICES[i])
    w, h, has_hdr, has_alt, nlen = d[:5]
    o = 5 + nlen
    hdr = None
    if has_hdr:
        hdr = list(struct.unpack_from(f"<{w * h}H", d, o))
        o += 2 * w * h
    if has_alt:
        o += w * h
    land = list(struct.unpack_from(f"<{w * h}H", d, o))
    return w, h, hdr, land


_model_cache = {}


def model(i):
    """Building model name and its footprint box (x0, z0, width, depth) in tiles around the model origin."""
    if i in _model_cache:
        return _model_cache[i]
    d = bytes(MODELS[i])
    bo = struct.unpack_from("<I", d, 0x10)[0]
    dic = bo + 8
    count = d[dic + 1]
    data_off = dic + 8 + 4 * (count + 1)
    _, names_off = struct.unpack_from("<HH", d, data_off)
    mdl = bo + struct.unpack_from("<I", d, data_off + 4)[0]
    name = d[data_off + names_off:data_off + names_off + 16].split(b"\0")[0].decode("ascii", "replace")
    info = mdl + 20
    bx, by, bz, bw, bh, bd = struct.unpack_from("<6h", d, info + 24)
    s = struct.unpack_from("<i", d, info + 36)[0] / 4096 / 4096 / 16  # box units -> tiles (16 model units per tile)
    _model_cache[i] = (name, (bx * s, bz * s, bw * s, bd * s))
    return _model_cache[i]


def kind_of(name):
    if name.startswith("pc"):
        return "pc"
    if re.match(r"fs(_\d+)?$", name):
        return "mart"
    if re.match(r"gym\d", name):
        return "gym"
    if "door" in name or name.startswith("dmy"):
        return None
    if "kanban" in name:
        return "sign"
    if name.startswith("tree"):
        return "tree"
    if name.startswith("gate"):
        return "gate"
    m = re.match(r"c\d+_([hbso])", name)
    if m:
        return {"h": "house", "b": "big", "s": "special", "o": "object"}[m.group(1)]
    return "object"


def events(i):
    d = bytes(EVENTS[i])
    o = 0
    nbg = struct.unpack_from("<I", d, o)[0]
    o += 4
    bgs = [struct.unpack_from("<HHIIIHH", d, o + k * 20) for k in range(nbg)]
    o += nbg * 20
    nobj = struct.unpack_from("<I", d, o)[0]
    o += 4
    objs = [struct.unpack_from("<14HI", d, o + k * 32) for k in range(nobj)]
    o += nobj * 32
    nw = struct.unpack_from("<I", d, o)[0]
    o += 4
    warps = [struct.unpack_from("<HHHHI", d, o + k * 12) for k in range(nw)]
    return bgs, objs, warps


def door_kind(target):
    n = MAPNAMES[target] if target < len(MAPNAMES) else ""
    for key, kind in (("PC", "pc"), ("FS", "mart"), ("GYM", "gym")):
        if key in n[3:]:
            return kind
    if re.match(r"[CT]\d+R\d", n):
        return "house"
    if n.startswith("D"):
        return "stairs"
    return "gate"


def layout(code):
    hid = MAPNAMES.index(code)
    h = header(hid)
    mw, mh, owner, land = matrix(h["matrix"])
    cells = [(k % mw, k // mw) for k in range(mw * mh) if land[k] != 0xFFFF and (owner is None or owner[k] == hid)]
    cx0, cy0 = min(c[0] for c in cells), min(c[1] for c in cells)
    cx1, cy1 = max(c[0] for c in cells), max(c[1] for c in cells)
    W, H = (cx1 - cx0 + 1) * 32, (cy1 - cy0 + 1) * 32
    rows = [["#"] * W for _ in range(H)]
    blds = []
    for (mx, my) in cells:
        d = LAND[land[my * mw + mx]]
        ps, bs = struct.unpack_from("<II", d, 0)
        ox, oy = (mx - cx0) * 32, (my - cy0) * 32
        for k in range(1024):
            p = struct.unpack_from("<H", d, 16 + k * 2)[0]
            blocked, beh = p >> 15, p & 0xFF
            if beh in (0x15, 0x16):
                ch = "~"
            elif blocked:
                ch = "#"
            elif beh == 0x02:
                ch = ","
            elif beh == 0x71:
                ch = "="
            elif 0xA0 <= beh <= 0xAF:
                ch = "*"
            elif beh == 0x20:
                ch = "i"
            else:
                ch = "."
            rows[oy + k // 32][ox + k % 32] = ch
        for k in range(bs // 48):
            mid, x, _, z = struct.unpack_from("<iiii", d, 16 + ps + k * 48)
            name, (bx, bz, bw, bd) = model(mid)
            kind = kind_of(name)
            if not kind:
                continue
            x0, z0 = ox + 16 + x / 65536 + bx, oy + 16 + z / 65536 + bz
            tx0, ty0 = int(round(x0)), int(round(z0))
            tw, td = max(1, int(round(bw))), max(1, int(round(bd)))
            blds.append([tx0, ty0, tw, td, kind])
    # footprints: blocked tiles under a building box become B (T for trees); walkable tiles under eaves stay walkable
    for x, y, w, d, kind in blds:
        mark = "T" if kind == "tree" else "B"
        for j in range(y, y + d):
            for i in range(x, x + w):
                if 0 <= i < W and 0 <= j < H and rows[j][i] == "#":
                    rows[j][i] = mark
    bgs, objs, warps = events(h["events"])
    gx0, gy0 = cx0 * 32, cy0 * 32
    local = (lambda x, y: (x - gx0, y - gy0)) if owner is not None else (lambda x, y: (x, y))
    doors = []
    for x, y, target, _, _ in warps:
        lx, ly = local(x, y)
        if 0 <= lx < W and 0 <= ly < H:
            doors.append([lx, ly, door_kind(target)])
    npcs = []
    for ob in objs:
        lx, ly = local(ob[12], ob[13])
        if 0 <= lx < W and 0 <= ly < H:
            npcs.append([lx, ly])
    return {"name": h["place"], "w": W, "h": H, "rows": ["".join(r) for r in rows],
            "blds": [b for b in blds if b[4] not in ("tree",)], "doors": doors, "npcs": npcs}


def weights():
    z = romlib.narc("application/zukanlist/zkn_data/zukan_data.narc")
    v = struct.unpack_from(f"<{len(z[1]) // 4}I", z[1])
    assert v[25] == 60 and v[143] == 4600, "weight table moved"
    return list(v)


def main():
    out = {"towns": {c: layout(c) for c in TOWNS}, "floors": {c: layout(c) for c in FLOORS}}
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    # weights belong with the other species facts; dex.json keeps everything else (English names from add_english.py)
    with open(DEX, encoding="utf-8") as f:
        dex = json.load(f)
    w = weights()
    for s in dex["species"]:
        if s and s["id"] < len(w):
            s["kg"] = w[s["id"]] / 10
    with open(DEX, "w", encoding="utf-8") as f:
        json.dump(dex, f, ensure_ascii=False, separators=(",", ":"))
    for group in ("towns", "floors"):
        for c, t in out[group].items():
            print(c, t["name"], t["w"], "x", t["h"], "buildings", len(t["blds"]), "doors", len(t["doors"]), "npcs", len(t["npcs"]))


if __name__ == "__main__":
    main()
