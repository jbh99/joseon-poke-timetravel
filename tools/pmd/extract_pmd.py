"""Export PMD Blue Rescue Team graphics for the web game.

  python extract_pmd.py <rom.nds> <web/assets dir> [sprites|portraits|tiles|preview|all]

sprites   -> pmd/spr/<dex>.png + .json  (walk / attack / hurt / sleep, 8 directions, shiny colour map)
portraits -> pmd/kao/<dex>.png          (13 expressions, 40x40 each, in a row)
tiles     -> pmd/tiles/<id>.png + .json (24x24 chunks + 8-neighbour lookup for wall / water / floor)
"""
import json, os, struct, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from pmdlib import (sbin_entries, sir0, unwrap, px_decompress, tiles4, pal_rgba, draw_tile, AxSprite, render_mf)

ANIMS = {'walk': 0, 'attack': 1, 'hurt': 6, 'sleep': 5}


def load_fs(rom_path):
    import ndspy.rom
    rom = ndspy.rom.NintendoDSRom.fromFile(rom_path)
    return {n: sbin_entries(rom.getFileByName(n + '.sbin')) for n in ('monster', 'dungeon', 'system')}


def species_records(system):
    """record index -> (national dex, palette index) from monspara (72-byte records)."""
    b = system['monspara']
    head, _ = sir0(b)
    base = struct.unpack_from('<I', b, head)[0] if False else 0x15d4
    n = (head - base) // 72 if head > base else 424
    n = min(n, 424)
    out = {}
    for i in range(1, n):
        r = b[base + i * 72: base + i * 72 + 72]
        dex = struct.unpack_from('<H', r, 0x3c)[0]
        out[i] = (dex, r[8])
    return out


def shiny_map(front_dir, dex, pmd_cols):
    """Map each PMD colour to a shiny colour using the Pearl normal/shiny front sprites."""
    try:
        a = Image.open(os.path.join(front_dir, f'{dex}.png')).convert('RGBA')
        s = Image.open(os.path.join(front_dir, f'{dex}s.png')).convert('RGBA')
    except FileNotFoundError:
        return []
    pairs = {}
    pa, ps = a.load(), s.load()
    for y in range(a.height):
        for x in range(a.width):
            c, d = pa[x, y], ps[x, y]
            if c[3] < 128:
                continue
            pairs.setdefault(c[:3], {}).setdefault(d[:3], 0)
            pairs[c[:3]][d[:3]] += 1
    if not pairs:
        return []
    norm = {c: max(v.items(), key=lambda kv: kv[1])[0] for c, v in pairs.items()}
    out = []
    for col in pmd_cols:
        best = min(norm, key=lambda c: sum((c[i] - col[i]) ** 2 for i in range(3)))
        sh = norm[best]
        new = tuple(max(0, min(255, col[i] + sh[i] - best[i])) for i in range(3))
        if new != col:
            out.append(list(col) + list(new))
    return out


def export_sprites(fs, out_dir, front_dir):
    mon = fs['monster']
    recs = species_records(fs['system'])
    pals = [pal_rgba(mon['palet'], i * 64) for i in range(len(mon['palet']) // 64)]
    os.makedirs(os.path.join(out_dir, 'pmd', 'spr'), exist_ok=True)
    done = set()
    index = {}
    for ri, (dex, pi) in sorted(recs.items()):
        if not (1 <= dex <= 386) or dex in done:
            continue
        key = 'ax%03d' % ri
        if key not in mon:
            continue
        done.add(dex)
        ax = AxSprite(mon[key])
        pal = pals[pi] if pi < len(pals) else pals[0]
        used, anims = [], {}
        for name, g in ANIMS.items():
            dirs = ax.groups[g] if g < len(ax.groups) else []
            if not dirs:
                dirs = ax.groups[0]
            seqs = []
            for d in range(8):
                seq = []
                for f in dirs[d]:
                    if f['mf'] not in used:
                        used.append(f['mf'])
                    seq.append([used.index(f['mf']), f['dur'], f['ox'], f['oy']])
                seqs.append(seq)
            anims[name] = seqs
        big = 128
        frames = [render_mf(ax, mfi, pal, big) for mfi in used]
        boxes = [f.getbbox() for f in frames if f.getbbox()]
        if not boxes:
            continue
        x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
        x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
        w, h = x1 - x0, y1 - y0
        cols = min(len(frames), 12)
        rows = (len(frames) + cols - 1) // cols
        sheet = Image.new('RGBA', (cols * w, rows * h), (0, 0, 0, 0))
        for k, f in enumerate(frames):
            sheet.paste(f.crop((x0, y0, x1, y1)), ((k % cols) * w, (k // cols) * h))
        # palette PNG: transparent + the species palette
        q = Image.new('P', sheet.size, 0)
        flat = [0, 0, 0]
        for c in pal[1:]:
            flat += list(c)
        q.putpalette(flat + [0] * (768 - len(flat)))
        lut = {tuple(c): i + 1 for i, c in enumerate(pal[1:])}
        src, dst = sheet.load(), q.load()
        for y in range(sheet.height):
            for x in range(sheet.width):
                p = src[x, y]
                if p[3]:
                    dst[x, y] = lut.get(p[:3], 1)
        q.save(os.path.join(out_dir, 'pmd', 'spr', f'{dex}.png'), transparency=0, optimize=True)
        meta = {'w': w, 'h': h, 'ax': big // 2 - x0, 'ay': big // 2 - y0, 'cols': cols, 'anims': anims,
                'shiny': shiny_map(front_dir, dex, [tuple(c) for c in pal[1:]])}
        with open(os.path.join(out_dir, 'pmd', 'spr', f'{dex}.json'), 'w') as fp:
            json.dump(meta, fp, separators=(',', ':'))
        index[dex] = 1
    print('sprites', len(done))
    return sorted(done)


def export_portraits(fs, out_dir):
    mon = fs['monster']
    recs = species_records(fs['system'])
    os.makedirs(os.path.join(out_dir, 'pmd', 'kao'), exist_ok=True)
    have = []
    for name, b in mon.items():
        if not name.startswith('kao'):
            continue
        ri = int(name[3:])
        dex = recs.get(ri, (0, 0))[0]
        if not 1 <= dex <= 386 or dex in have:  # records past 386 are forms / dummies
            continue
        head, _ = sir0(b)
        faces = []
        for i in range(20):
            po, io = struct.unpack_from('<II', b, head + i * 8)
            if po >= len(b) or io >= len(b):
                break
            faces.append((po, io))
        img = Image.new('RGBA', (len(faces) * 40, 40), (0, 0, 0, 0))
        for k, (po, io) in enumerate(faces):
            if not po:
                continue
            pal = pal_rgba(b, po)
            tl = tiles4(px_decompress(b[io:]))
            for t in range(25):
                tx, ty = (t % 5) * 8, (t // 5) * 8
                for j in range(8):
                    for i in range(8):
                        img.putpixel((k * 40 + tx + i, ty + j), pal[tl[t][j * 8 + i]] + (255,))
        img.save(os.path.join(out_dir, 'pmd', 'kao', f'{dex}.png'), optimize=True)
        have.append(dex)
    print('portraits', len(have))
    return sorted(have)


def tileset(dun, tid):
    k = '%02d' % tid
    need = ['b%sfon' % k, 'b%scel' % k, 'b%spal' % k, 'b%scex' % k]
    if not all(n in dun for n in need):
        return None
    tiles = tiles4(unwrap(dun[need[0]]))
    cel = unwrap(dun[need[1]])
    pals = [pal_rgba(dun[need[2]], i * 64) for i in range(len(dun[need[2]]) // 64)]
    cex = unwrap(dun[need[3]])
    return tiles, cel, pals, cex


def chunk_img(tiles, cel, pals, c):
    img = Image.new('RGBA', (24, 24), (0, 0, 0, 255))
    for k in range(9):
        e = struct.unpack_from('<H', cel, c * 18 + k * 2)[0]
        draw_tile(img, tiles, pals, e, (k % 3) * 8, (k // 3) * 8)
    return img


def export_tiles(fs, out_dir):
    dun = fs['dungeon']
    os.makedirs(os.path.join(out_dir, 'pmd', 'tiles'), exist_ok=True)
    ids = []
    for tid in range(100):
        ts = tileset(dun, tid)
        if not ts:
            continue
        tiles, cel, pals, cex = ts
        n = len(cex) // 3
        used, look = [], []
        for i in range(n):
            row = []
            for v in range(3):
                c = cex[i * 3 + v]
                if c not in used:
                    used.append(c)
                row.append(used.index(c))
            look.append(row)
        cols = 16
        atlas = Image.new('RGBA', (cols * 24, ((len(used) + cols - 1) // cols) * 24), (0, 0, 0, 255))
        for k, c in enumerate(used):
            atlas.paste(chunk_img(tiles, cel, pals, c), ((k % cols) * 24, (k // cols) * 24))
        atlas = atlas.convert('RGB').quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
        atlas.save(os.path.join(out_dir, 'pmd', 'tiles', f'{tid}.png'), optimize=True)
        meta = {'cols': cols, 'wall': look[0:256], 'water': look[256:512], 'floor': look[512:768], 'extra': look[768:]}
        with open(os.path.join(out_dir, 'pmd', 'tiles', f'{tid}.json'), 'w') as fp:
            json.dump(meta, fp, separators=(',', ':'))
        ids.append(tid)
    print('tilesets', ids)
    return ids


# bit order of the neighbour mask: S, SE, E, NE, N, NW, W, SW
NB = [(0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1), (-1, 0), (-1, 1)]


def preview(fs, out_png):
    """Contact sheet: one small sample map per tileset, for picking themes."""
    dun = fs['dungeon']
    # 0 wall, 1 floor, 2 water
    M = ['000000000000', '011111100000', '011111111110', '011221100010', '011221111110', '011111100110', '000011100000', '000000000000']
    grid = [[int(ch) for ch in r] for r in M]
    H, W = len(grid), len(grid[0])
    cells = []
    for tid in range(100):
        ts = tileset(dun, tid)
        if not ts:
            continue
        tiles, cel, pals, cex = ts
        img = Image.new('RGBA', (W * 24, H * 24 + 12), (40, 40, 40, 255))
        for y in range(H):
            for x in range(W):
                t = grid[y][x]
                m = 0
                for bit, (dx, dy) in enumerate(NB):
                    nx, ny = x + dx, y + dy
                    same = grid[ny][nx] == t if 0 <= nx < W and 0 <= ny < H else t == 0
                    if same:
                        m |= 1 << bit
                base = {0: 0, 2: 256, 1: 512}[t]
                c = cex[(base + m) * 3]
                img.paste(chunk_img(tiles, cel, pals, c), (x * 24, y * 24 + 12))
        from PIL import ImageDraw
        ImageDraw.Draw(img).text((2, 0), str(tid), fill=(255, 255, 0, 255))
        cells.append(img)
    cw, ch = cells[0].size
    per = 6
    sheet = Image.new('RGBA', (per * cw // 2, ((len(cells) + per - 1) // per) * ch // 2))
    for k, im in enumerate(cells):
        sheet.paste(im.resize((cw // 2, ch // 2)), ((k % per) * cw // 2, (k // per) * ch // 2))
    sheet.save(out_png)


if __name__ == '__main__':
    rom, out = sys.argv[1], sys.argv[2]
    what = sys.argv[3] if len(sys.argv) > 3 else 'all'
    fs = load_fs(rom)
    front = os.path.join(out, 'poke', 'front')
    result = {}
    if what in ('sprites', 'all'):
        result['spr'] = export_sprites(fs, out, front)
    if what in ('portraits', 'all'):
        result['kao'] = export_portraits(fs, out)
    if what in ('tiles', 'all'):
        result['tiles'] = export_tiles(fs, out)
    if what == 'preview':
        preview(fs, sys.argv[4])
    if what == 'all':
        with open(os.path.join(out, 'data', 'pmd.json'), 'w') as fp:
            json.dump(result, fp, separators=(',', ':'))
