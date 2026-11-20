"""Repairs the forest chunk set the spring and coast towns are painted with (web/assets/pmd/tiles/63.png), 1.32.

As exported, its wall (forest) chunks carry two faults that show on a town's outer rim, most plainly beside the road
that leaves Salsu Ferry to the east: pure red marker pixels scattered over the trees, and the inside of the forest as
one flat pale green (whole chunks of it where a wall tile has forest on every side). Here the red pixels take the
colour around them and the flat pale areas are filled with the set's own dense trees, so the rim reads as forest.

    python tools/pmd/fix_tiles63.py [--preview out.png]

Reads the file as committed before 1.32 from git when run again (the repair is not applied twice).
"""
import io
import json
import subprocess
import sys
from collections import Counter, deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PNG = ROOT / 'web/assets/pmd/tiles/63.png'
META = json.loads((ROOT / 'web/assets/pmd/tiles/63.json').read_text(encoding='utf-8'))
BEFORE = 'b19f725'  # 1.31: the sheet as exported
RED, PALE = (255, 0, 0, 255), (223, 255, 199, 255)
TEX = 32  # a chunk that is trees from edge to edge
FLAT = 14  # a pale area of at least this many pixels is the flat inside, not a tree's highlight


def fix(im):
    im = im.convert('RGBA')
    px = im.load()
    cols = META['cols']
    walls = sorted({k for vs in META['wall'] for k in vs})
    tx, ty = (TEX % cols) * 24, (TEX // cols) * 24
    tex = [[px[tx + x, ty + y] for x in range(24)] for y in range(24)]
    whole = {k for k in META['wall'][255]}
    for k in walls:
        cx, cy = (k % cols) * 24, (k // cols) * 24
        if k == TEX:
            continue
        if k in whole:  # forest on every side: the dense trees themselves
            for y in range(24):
                for x in range(24):
                    px[cx + x, cy + y] = tex[y][x]
            continue
        bad = [[px[cx + x, cy + y] in (RED, PALE) for x in range(24)] for y in range(24)]
        seen = [[False] * 24 for _ in range(24)]
        for y0 in range(24):
            for x0 in range(24):
                if not bad[y0][x0] or seen[y0][x0]:
                    continue
                comp, q = [], deque([(x0, y0)])
                seen[y0][x0] = True
                while q:
                    x, y = q.popleft()
                    comp.append((x, y))
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        a, b = x + dx, y + dy
                        if 0 <= a < 24 and 0 <= b < 24 and bad[b][a] and not seen[b][a]:
                            seen[b][a] = True
                            q.append((a, b))
                edge = any(x in (0, 23) or y in (0, 23) for x, y in comp)
                if len(comp) >= FLAT or (edge and len(comp) >= 6):
                    for x, y in comp:
                        px[cx + x, cy + y] = tex[y][x]
    # what red is left stands alone among a tree's colours: it takes the commonest colour around it
    for _ in range(4):
        left = [(x, y) for k in walls for y in range((k // cols) * 24, (k // cols) * 24 + 24) for x in range((k % cols) * 24, (k % cols) * 24 + 24) if px[x, y] == RED]
        if not left:
            break
        for x, y in left:
            cx, cy = x // 24 * 24, y // 24 * 24
            near = Counter(px[a, b] for a in range(max(cx, x - 1), min(cx + 24, x + 2)) for b in range(max(cy, y - 1), min(cy + 24, y + 2)) if px[a, b] != RED)
            if near:
                px[x, y] = near.most_common(1)[0][0]
    return im


def preview(im, out):
    """a town's east rim as the game paints it (pmd.js paintTerrain): forest two tiles deep, a road through it"""
    W, H = 12, 12
    g = [[0 if (x >= W - 2 or y < 2 or x < 1) else 1 for x in range(W)] for y in range(H)]
    for x in range(W):
        g[6][x] = g[7][x] = 1
    at = lambda x, y: g[y][x] if 0 <= x < W and 0 <= y < H else None
    nb = [(0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1), (-1, 0), (-1, 1)]
    cols, s = META['cols'], 12345
    cv = Image.new('RGBA', (W * 24, H * 24))
    for y in range(H):
        for x in range(W):
            t = at(x, y)
            mask = sum(1 << b for b, (dx, dy) in enumerate(nb) if at(x + dx, y + dy) == t or (at(x + dx, y + dy) is None and t == 0))
            s = (s * 1664525 + 1013904223) & 0xffffffff
            v = s >> 24
            k = (META['floor'] if t else META['wall'])[mask][0 if v < 200 else 1 if v < 228 else 2]
            cv.paste(im.crop(((k % cols) * 24, (k // cols) * 24, (k % cols) * 24 + 24, (k // cols) * 24 + 24)), (x * 24, y * 24))
    cv.resize((W * 48, H * 48), Image.NEAREST).save(out)


if __name__ == '__main__':
    src = Image.open(io.BytesIO(subprocess.run(['git', 'show', f'{BEFORE}:web/assets/pmd/tiles/63.png'], cwd=ROOT, capture_output=True, check=True).stdout))
    done = fix(src)
    if '--preview' in sys.argv:
        out = Path(sys.argv[sys.argv.index('--preview') + 1])
        preview(src.convert('RGBA'), out.with_name(out.stem + '_before.png'))
        preview(done, out)
    else:
        cols = sorted(set(done.convert('RGB').getdata()))  # a palette picture again, as exported (a third of the size)
        assert len(cols) <= 256
        pal = Image.new('P', done.size)
        pal.putpalette([v for c in cols for v in c])
        at = {c: i for i, c in enumerate(cols)}
        pal.putdata([at[c] for c in done.convert('RGB').getdata()])
        pal.save(PNG, optimize=True)
        print('written', PNG, done.size)
