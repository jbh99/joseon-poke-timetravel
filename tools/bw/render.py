"""Render Pokémon Black towns from the ROM's own map data to the game's town pictures.

A town is a set of 32x32-tile chunks on the Unova overworld matrix (a/0/0/9 #0, with its zone layer). Each chunk
is a map container (a/0/0/8: model, walkable grid, building list); a walkable-grid tile is 8 bytes, four u16: the
fourth is its collision word (WALL: bit 0 a wall, bits 1 and 4 water and the sea's rim; sand, grass, puddles and
stairs carry other bits and are walked on). Cells of the town's box that belong to another zone (a route at a corner) are drawn too, so the
picture has no holes, and are never walked on; of the town's own walkable tiles only the largest connected region
is kept (a pocket behind a ledge cannot be reached on foot). Both are drawn dim, so the picture shows the town. A chunk's zone's area (a/0/1/3) picks the texture set
(a/0/1/4) and the building pack (a/2/2/9, area // 4: the four seasons of an area share one) with its texture set
(a/1/7/6, same index). The models are drawn with a software rasterizer at TILE pixels a tile, looked at from the
south and above (OBLIQUE: a unit of height lifts a point OBLIQUE units up the picture), so the fronts of houses show
as in the 2D games, and the highest surface wins each pixel.

Out, in web/assets/bw/towns: <town>.png (the picture), <town>_obj.png (an atlas of the occluders: every building on
its own and tall terrain row by row, each with the picture row its foot stands on, so people north of it walk behind
it; each kept as its opaque pieces, so the atlas holds none of the empty space a row of trees spans and stays small
enough for a phone's GPU to keep with the picture); work/bw/towns/<town>.json holds the walkable grid, the free grid
(team_grid: where the team may walk), each walkable tile's lift in picture pixels, the doors, exits and occluders, which bw_index.py merges into the index the game loads.

usage: python render.py [town ...]          (towns: see TOWNS)
"""
import json
import math
import os
import re
import struct
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import ndsfs  # noqa: E402
import nitro3d as N  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(HERE))
WALL = 0x13  # collision-word bits nobody walks on (see the docstring)
# the collision words of water, the one thing the team does not walk over in a town: the sea and its rim, ponds and their
# edges (bit 15 only marks a tile for the game's events, so it is masked off)
WATER = {0x10, 0x16, 0x56, 0x83, 0xC1, 0xC3}
# model units a tile's surface lies below all the town's walkable ground to be water, whatever its collision word: Nuvema's sea,
# most of Driftveil's and Nimbasa's pond carry the very word of a tree or a wall (water lies 6 to 27 below, a low kerb 2)
WATER_DROP = 4
# what the building list holds that is no building: street furniture, planters, rocks and the like stop nobody (team_grid)
FURNITURE = re.compile(r'^(sign0|out_dust|out_vender|plant_|o_chair|o_table|o_parasol|cart_|d5_container|searock|rock_|c01thicket|t01_kira|fountain_|c01fountain|c5_statue)')
TREE, CLIFF = re.compile(r'^(ki\d|mori)'), re.compile(r'gake|_ana$')  # terrain materials: trees; cliff faces (and the pit at Driftveil's warehouse)
JUMP = 24  # picture pixels between the ground on two sides of a wall from which on it stays a wall (a retaining wall, a bridge's side)
ROM = os.environ.get('BLACK_ROM') or os.path.join(os.path.expanduser('~'), 'Downloads', 'claude skills', '포켓몬스터 블랙(K).nds')
OUT = os.path.join(ROOT, 'web', 'assets', 'bw', 'towns')
META = os.path.join(ROOT, 'work', 'bw', 'towns')  # per-town data; bw_index.py merges it into OUT/index.json
TILE = 24                 # picture pixels a tile (the game's TILE)
UNIT = TILE / 16          # a tile is 16 model units
OBLIQUE = 0.6             # how far up the picture a unit of height goes
CHUNK = 512               # model units a chunk
BOTTOM = 128              # model units of picture below the southern edge, for ground below zero height (Undella's)
DIM, DIM_ADD = 0.45, np.array([14, 16, 26], np.float32)  # the colour of what lies outside the town: rgb * DIM + DIM_ADD
# floors the ROM walls off although they look like the town's own paving (tile boxes x, y, w, h): drawn dim like what
# lies outside the town, so the picture offers no way that is not there. Accumula's strip below the railing in its
# south-west was drawn bright and walked into nothing (1.14)
WALLED = {'accumula': [(0, 29, 20, 3)]}
# occluder pieces (split_sprite): opaque parts closer than GAP px stay one piece; a piece wider than STRIP px that is
# less than FILL opaque is cut into STRIP-px strips
GAP, STRIP, FILL = 6, 128, 0.5
ATLAS_W = 1024            # the atlas is this wide, or twice that when it would grow taller than that

# town -> zone id on the overworld matrix (from the zone headers, a/0/1/2)
TOWNS = {
    'nuvema': 389, 'accumula': 397, 'striaton': 6, 'nacrene': 16, 'nimbasa': 62, 'driftveil': 96,
    'mistralton': 107, 'icirrus': 113, 'opelucid': 120, 'lacunosa': 406, 'undella': 412,
}


class Data:
    def __init__(self):
        self.rom = ndsfs.Rom(ROM)
        self.maps = ndsfs.narc(self.rom.find('a/0/0/8'))
        self.tex = ndsfs.narc(self.rom.find('a/0/1/4'))
        self.packs = ndsfs.narc(self.rom.find('a/2/2/9'))
        self.pack_tex = ndsfs.narc(self.rom.find('a/1/7/6'))  # one texture set a building pack
        self.area = self.rom.find('a/0/1/3')
        zs = ndsfs.narc(self.rom.find('a/0/1/2'))[0]
        self.zones = [struct.unpack_from('<24H', zs, 48 * i) for i in range(len(zs) // 48)]
        m = ndsfs.narc(self.rom.find('a/0/0/9'))[0]
        _, _, self.mw, self.mh = struct.unpack_from('<HHHH', m, 0)
        n = self.mw * self.mh
        self.mtx_map = struct.unpack_from('<%dI' % n, m, 8)
        self.mtx_zone = struct.unpack_from('<%dI' % n, m, 8 + 4 * n)
        self.tex_cache, self.pack_cache = {}, {}

    def chunks(self, zone):
        return [(i % self.mw, i // self.mw, self.mtx_map[i]) for i in range(self.mw * self.mh)
                if self.mtx_zone[i] == zone and self.mtx_map[i] != 0xFFFFFFFF]

    def cells(self, x0, y0, cw, ch):
        """Every chunk of a box of the matrix: (cx, cy, map id, zone)."""
        return [(cx, cy, self.mtx_map[cy * self.mw + cx], self.mtx_zone[cy * self.mw + cx])
                for cy in range(y0, y0 + ch) for cx in range(x0, x0 + cw) if self.mtx_map[cy * self.mw + cx] != 0xFFFFFFFF]

    def texset(self, area):
        tid = struct.unpack_from('<H', self.area, 10 * area + 2)[0]
        if tid not in self.tex_cache:
            self.tex_cache[tid] = N.btx(self.tex[tid])
        return self.tex_cache[tid]

    def pack(self, area):
        k = area // 4
        if k not in self.pack_cache:
            p = self.packs[k]
            n = struct.unpack_from('<H', p, 2)[0]
            offs = struct.unpack_from('<%dI' % (n + 1), p, 4)
            half = n // 2
            ids = [struct.unpack_from('<H', p, offs[i])[0] for i in range(half)]
            models = {}
            for i, bid in enumerate(ids):
                blob = p[offs[half + i]:offs[half + i + 1]]
                if blob[:4] == b'BMD0':
                    models[bid] = N.BMD(blob)
            self.pack_cache[k] = (models, N.btx(self.pack_tex[k]))
        return self.pack_cache[k]


def container(blob):
    n = struct.unpack_from('<H', blob, 2)[0]
    offs = struct.unpack_from('<%dI' % (n + 1), blob, 4)
    secs = [blob[offs[i]:offs[i + 1]] for i in range(n)]
    kind = blob[:2]
    perms = [s for s in secs[1:-1]] if kind in (b'WB', b'GC') else []
    return secs[0], perms, secs[-1]


def buildings(sec):
    n = struct.unpack_from('<I', sec, 0)[0]
    out = []
    for i in range(n):
        x, y, z = struct.unpack_from('<iii', sec, 4 + 16 * i)
        rot = struct.unpack_from('<H', sec, 4 + 16 * i + 12)[0]
        bid = sec[4 + 16 * i + 14] << 8 | sec[4 + 16 * i + 15]
        out.append((x / 4096, y / 4096, z / 4096, rot * 2 * math.pi / 65536, bid))
    return out


class Canvas:
    """Colour, depth, owner (0 terrain, k building k) and world-position buffers.
    A world point (x, y, z) in units lands at picture (x * UNIT, (z + top - OBLIQUE * y) * UNIT)."""

    def __init__(self, w_units, h_units, top_units):
        self.top = top_units
        self.w = int(math.ceil(w_units * UNIT))
        self.h = int(math.ceil((h_units + top_units) * UNIT))
        self.rgb = np.zeros((self.h, self.w, 3), np.float32)
        self.rgb[:] = (24, 40, 24)
        self.depth = np.full((self.h, self.w), -1e9, np.float32)
        self.owner = np.full((self.h, self.w), -1, np.int16)
        self.wz = np.zeros((self.h, self.w), np.float32)
        self.wy = np.zeros((self.h, self.w), np.float32)
        self.later = []
        self.obj = 0

    def project(self, p):
        return p[0] * UNIT, (p[2] + self.top - OBLIQUE * p[1]) * UNIT

    def tri(self, verts, tex, mat, translucent_pass=False, obj=None):
        obj = self.obj if obj is None else obj
        (p0, uv0, c0), (p1, uv1, c1), (p2, uv2, c2) = verts
        x0, y0 = self.project(p0); x1, y1 = self.project(p1); x2, y2 = self.project(p2)
        minx, maxx = int(max(0, math.floor(min(x0, x1, x2)))), int(min(self.w - 1, math.ceil(max(x0, x1, x2))))
        miny, maxy = int(max(0, math.floor(min(y0, y1, y2)))), int(min(self.h - 1, math.ceil(max(y0, y1, y2))))
        if minx > maxx or miny > maxy:
            return
        area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)
        if abs(area) < 1e-9:
            return
        xs = np.arange(minx, maxx + 1, dtype=np.float32) + 0.5
        ys = np.arange(miny, maxy + 1, dtype=np.float32)[:, None] + 0.5
        w0 = ((x1 - xs) * (y2 - ys) - (x2 - xs) * (y1 - ys)) / area
        w1 = ((x2 - xs) * (y0 - ys) - (x0 - xs) * (y2 - ys)) / area
        w2 = 1 - w0 - w1
        inside = (w0 >= -1e-4) & (w1 >= -1e-4) & (w2 >= -1e-4)
        if not inside.any():
            return
        wy = w0 * p0[1] + w1 * p1[1] + w2 * p2[1]
        wz = w0 * p0[2] + w1 * p1[2] + w2 * p2[2]
        depth = wy + 0.001 * wz
        region = (slice(miny, maxy + 1), slice(minx, maxx + 1))
        ok = inside & (depth >= self.depth[region] - 0.01)
        if not ok.any():
            return
        col = (w0[..., None] * c0 + w1[..., None] * c1 + w2[..., None] * c2)
        if tex is not None:
            h, w = tex.shape[:2]
            u = (w0 * uv0[0] + w1 * uv1[0] + w2 * uv2[0]) * mat.tex_scale[0] + mat.tex_trans[0]
            v = (w0 * uv0[1] + w1 * uv1[1] + w2 * uv2[1]) * mat.tex_scale[1] + mat.tex_trans[1]
            ui = wrap(np.floor(u).astype(np.int64), w, mat.tex_params, 16)
            vi = wrap(np.floor(v).astype(np.int64), h, mat.tex_params, 17)
            texel = tex[vi, ui].astype(np.float32)
            rgb = texel[..., :3] * col
            alpha = texel[..., 3] / 255 * mat.alpha
        else:
            rgb = col * 255
            alpha = np.full(ok.shape, mat.alpha, np.float32)
        if not translucent_pass:
            solid = ok & (alpha >= 0.95)
            self.rgb[region][solid] = rgb[solid]
            self.depth[region][solid] = depth[solid]
            self.owner[region][solid] = obj
            self.wz[region][solid] = wz[solid]
            self.wy[region][solid] = wy[solid]
            if ((alpha > 0.02) & (alpha < 0.95) & ok).any():
                self.later.append((verts, tex, mat, obj))
        else:
            part = ok & (alpha > 0.02) & (alpha < 0.95)
            a = alpha[..., None]
            blend = self.rgb[region] * (1 - a) + rgb * a
            self.rgb[region][part] = blend[part]

    def flush(self):
        # under water and other see-through layers the game shows its own surface, not our backdrop: pixels with no
        # solid surface take the nearest solid one's colour first
        from scipy.ndimage import distance_transform_edt
        empty = self.owner < 0
        if empty.any() and (~empty).any():
            _, (iy, ix) = distance_transform_edt(empty, return_indices=True)
            self.rgb[empty] = self.rgb[iy[empty], ix[empty]]
        self.later.sort(key=lambda t: min(v[0][1] for v in t[0]))
        for verts, tex, mat, obj in self.later:
            self.tri(verts, tex, mat, translucent_pass=True, obj=obj)
        self.later = []


def wrap(i, size, params, bit):
    if params >> bit & 1:  # repeat
        if params >> (bit + 2) & 1:  # flip: mirrored repeat
            m = np.mod(i, 2 * size)
            return np.where(m >= size, 2 * size - 1 - m, m)
        return np.mod(i, size)
    return np.clip(i, 0, size - 1)


def model_tris(bmd, texset, world):
    """(triangle, texture, material) for every shape of a BMD placed with the 4x4 row-vector matrix `world`."""
    tex_src = bmd.tex or texset
    for m in bmd.models:
        scale = np.diag([m.up, m.up, m.up, 1.0])
        for mi, si, mx in m.draws():
            mat = m.materials[mi] if mi < len(m.materials) else None
            if mat is None or (mat.poly_attr >> 4) & 3 == 3:  # shadow-volume polygons only mark a stencil on the DS
                continue
            tex = tex_src.decode(mat.tex, mat.pal) if mat.tex and tex_src and mat.tex in tex_src.textures else None
            for t in N.triangles(m.shapes[si], mx @ scale @ world, mat=mat):
                yield t, tex, mat


def tiles_under(p0, p1, p2, W, H):
    """(tile z, tile x, height there) of every tile whose centre lies under a triangle seen from above."""
    xs, zs = (p0[0], p1[0], p2[0]), (p0[2], p1[2], p2[2])
    tx0, tx1 = max(0, int(math.floor(min(xs) / 16))), min(W - 1, int(math.floor(max(xs) / 16)))
    tz0, tz1 = max(0, int(math.floor(min(zs) / 16))), min(H - 1, int(math.floor(max(zs) / 16)))
    den = (p1[2] - p2[2]) * (p0[0] - p2[0]) + (p2[0] - p1[0]) * (p0[2] - p2[2])
    if abs(den) < 1e-9:
        return
    for tz in range(tz0, tz1 + 1):
        for tx in range(tx0, tx1 + 1):
            x, z = tx * 16 + 8, tz * 16 + 8
            a = ((p1[2] - p2[2]) * (x - p2[0]) + (p2[0] - p1[0]) * (z - p2[2])) / den
            b = ((p2[2] - p0[2]) * (x - p2[0]) + (p0[0] - p2[0]) * (z - p2[2])) / den
            c = 1 - a - b
            if a >= -1e-3 and b >= -1e-3 and c >= -1e-3:
                yield tz, tx, a * p0[1] + b * p1[1] + c * p2[1]


def ground_probe(heights, tris, W, H):
    """Each tile's walkable surface height: the highest upward-facing terrain triangle over its centre (trees,
    whose materials are named ki*, are left out by the caller: their canopies hang over walkable tiles)."""
    for (p0, _, _), (p1, _, _), (p2, _, _) in tris:
        n = np.cross(p1 - p0, p2 - p0)
        ln = np.linalg.norm(n)
        if ln < 1e-9 or abs(n[1]) / ln < 0.6:
            continue
        for tz, tx, y in tiles_under(p0, p1, p2, W, H):
            if y > heights[tz, tx]:
                heights[tz, tx] = y


def footprint(mask, tris, W, H, base=None):
    """Mark the tiles under a model seen from above and, given the height of its foot, those it hides in the picture: height
    lifts a point up the picture, so the ground behind a house lies under its roof (and the ROM walls that strip off too)."""
    for (p0, _, _), (p1, _, _), (p2, _, _) in tris:
        for tz, tx, _ in tiles_under(p0, p1, p2, W, H):
            mask[tz, tx] = True
        if base is not None:
            q0, q1, q2 = p0.copy(), p1.copy(), p2.copy()
            for q in (q0, q1, q2):
                q[2] -= OBLIQUE * (q[1] - base)
            for tz, tx, _ in tiles_under(q0, q1, q2, W, H):
                mask[tz, tx] = True


def pack_sprites(sprites, width):
    """Shelf-pack sprites (image first) into one atlas; returns the atlas and each sprite's (sx, sy)."""
    order = sorted(range(len(sprites)), key=lambda i: -sprites[i][0].shape[0])
    x = y = shelf = 0
    pos = [None] * len(sprites)
    for i in order:
        h, w = sprites[i][0].shape[:2]
        if x + w > width:
            x, y, shelf = 0, y + shelf + 1, 0
        pos[i] = (x, y)
        x += w + 1
        shelf = max(shelf, h)
    atlas = np.zeros((max(1, y + shelf + 1), width, 4), np.uint8)
    for i, (sx, sy) in enumerate(pos):
        im = sprites[i][0]
        atlas[sy:sy + im.shape[0], sx:sx + im.shape[1]] = im
    return atlas, pos


def split_sprite(sprite):
    """An occluder's pieces: its opaque parts (those within GAP px of each other together), a wide and mostly empty
    part cut into STRIP-px strips, each piece cut to its own pixels. Drawn at their places with the occluder's foot
    row they are the occluder pixel for pixel; a tile row of trees across a town is one occluder but many pieces."""
    im, x_a, y_a, foot, mname = sprite
    opaque = im[..., 3] > 0
    near = ndimage.binary_dilation(opaque, np.ones((2 * GAP + 1, 2 * GAP + 1), bool))
    lab, _ = ndimage.label(near, structure=np.ones((3, 3), bool))
    pieces = []
    for k, sl in enumerate(ndimage.find_objects(lab), 1):
        part = (lab[sl] == k) & opaque[sl]
        ys, xs = np.nonzero(part)
        if not len(ys):
            continue
        py, px = sl[0].start + ys.min(), sl[1].start + xs.min()
        part = part[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        step = STRIP if part.shape[1] > STRIP and part.mean() < FILL else part.shape[1]
        for sx in range(0, part.shape[1], step):
            cut = part[:, sx:sx + step]
            ys, xs = np.nonzero(cut)
            if not len(ys):
                continue
            cut = cut[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
            y, x = py + ys.min(), px + sx + xs.min()
            piece = np.where(cut[..., None], im[y:y + cut.shape[0], x:x + cut.shape[1]], 0).astype(np.uint8)
            pieces.append((piece, x_a + int(x), y_a + int(y), foot, mname))
    return pieces


def cutout(rgb, mask):
    ys, xs = np.nonzero(mask)
    y_a, y_b, x_a, x_b = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    im = np.zeros((y_b - y_a, x_b - x_a, 4), np.uint8)
    sub = mask[y_a:y_b, x_a:x_b]
    im[..., :3][sub] = rgb[y_a:y_b, x_a:x_b][sub]
    im[..., 3][sub] = 255
    return im, int(x_a), int(y_a)


def walk_grids(data, name, zone, x0, y0, cw, ch):
    """The tile grids of a town's box, from the ROM's walkable grids: blocked (nobody stands there: walls, water and the
    pockets out of reach), beyond (walkable tiles of the other zones' cells: ways out lead there), outside (not the town:
    the other zones' cells and its pockets, drawn dim) and the town's own ground, walls and all, but not water (water with
    a wall's word is taken out by render_town, which knows the surface heights; team_grid then says where the team walks)."""
    W, H = cw * 32, ch * 32
    blocked = np.ones((H, W), bool)
    beyond = np.zeros((H, W), bool)
    outside = np.zeros((H, W), bool)
    ground = np.zeros((H, W), bool)  # the town's own tiles that are not water
    for cx, cy, mid, czone in data.cells(x0, y0, cw, ch):
        own = czone == zone
        outside[(cy - y0) * 32:(cy - y0 + 1) * 32, (cx - x0) * 32:(cx - x0 + 1) * 32] = not own
        _, perms, _ = container(data.maps[mid])
        if perms:
            pw, ph = struct.unpack_from('<HH', perms[0], 0)
            for j in range(ph):
                for i in range(pw):
                    coll = struct.unpack_from('<H', perms[0], 4 + 8 * (j * pw + i) + 6)[0]
                    y, x = (cy - y0) * 32 + j, (cx - x0) * 32 + i
                    (blocked if own else beyond)[y, x] = bool(coll & WALL) if own else not coll & WALL
                    ground[y, x] = own and (coll & 0x7FFF) not in WATER
    # only the largest connected walkable region is the town (the others cannot be reached on foot)
    region = np.zeros((H, W), np.int32)
    sizes = [0]
    for j0, i0 in zip(*np.nonzero(~blocked)):
        if region[j0, i0]:
            continue
        sizes.append(0)
        q = [(j0, i0)]
        region[j0, i0] = len(sizes) - 1
        for y, x in q:
            sizes[-1] += 1
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < H and 0 <= nx < W and not blocked[ny, nx] and not region[ny, nx]:
                    region[ny, nx] = len(sizes) - 1
                    q.append((ny, nx))
    if len(sizes) > 1:
        pocket = ~blocked & (region != int(np.argmax(sizes)))
        blocked |= pocket
        outside |= pocket
    for x, y, w, h in WALLED.get(name, []):
        outside[y:y + h, x:x + w] |= blocked[y:y + h, x:x + w]
    return blocked, beyond, outside, ground & ~outside


def team_grid(ground, blocked, outside, built, furniture, nature, cliff, lifts):
    """Where the team walks in a town (1.22). The ROM's walkable tiles, and what only gets in their way: street furniture, lone
    trees, fences, hedges and stretches of blocked flat ground that stop you with nothing to show why. Buildings (with the
    strip hidden behind them), cliffs, water and the woods around the town stop it, and so does what runs out to the edge
    of the map: 1.21 opened everything but the water, and the team walked through houses and off the map.
      nature joined to the box's edge or to what lies outside (side by side, not corner to corner: a row of street trees
      touching the woods at a corner is no part of them) is the woods around the town.
      A thick stretch of what is left (tiles of 2x2 squares of it) is ground of the town unless it touches the edge or the
      outside.
      A thin line opens where the town's ground lies on two opposite sides of it, within three tiles: a fence or hedge across
      a way. One along the outer edge of the streets has nothing behind it and stays.
      Nothing opens between ground at different levels (JUMP): that is a retaining wall or a bridge's side, not an obstacle."""
    H, W = blocked.shape
    around = ((-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1))
    beside = ((-1, 0), (0, -1), (0, 1), (1, 0))

    def at_rim(y, x):
        return x in (0, W - 1) or y in (0, H - 1) or any(0 <= y + b < H and 0 <= x + a < W and outside[y + b, x + a] for b, a in around)

    def flood(start, through, steps=around):
        seen = np.zeros((H, W), bool)
        q = list(start)
        for p in q:
            seen[p] = True
        for y, x in q:
            for b, a in steps:
                ny, nx = y + b, x + a
                if 0 <= ny < H and 0 <= nx < W and through[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx))
        return seen

    walls = blocked & ground
    stops = walls & built
    wild = walls & nature & ~built
    woods = flood([(y, x) for y, x in zip(*np.nonzero(wild)) if at_rim(y, x)], wild, beside)
    stops |= walls & ~built & (woods | cliff)
    rest = walls & ~stops
    streets = ~blocked & ground

    def level(y, x):
        """whether the walkable ground around this tile (the nearest in each direction, past what may open) lies at one height"""
        near = []
        for b, a in beside:
            for k in range(1, 5):
                ny, nx = y + b * k, x + a * k
                if not (0 <= ny < H and 0 <= nx < W):
                    break
                if streets[ny, nx]:
                    near.append(lifts[ny, nx])
                    break
                if not rest[ny, nx]:
                    break
        return not near or max(near) - min(near) < JUMP

    furniture = furniture & walls & ~built
    furniture[[0, -1], :] = furniture[:, [0, -1]] = False  # (the map's outermost row stays shut)
    for y, x in zip(*np.nonzero(furniture)):
        furniture[y, x] = level(y, x)
    # the thick stretches, one by one
    body = np.zeros((H, W), bool)
    for y in range(H - 1):
        for x in range(W - 1):
            if rest[y:y + 2, x:x + 2].all():
                body[y:y + 2, x:x + 2] = True
    done = np.zeros((H, W), bool)
    open_body = np.zeros((H, W), bool)
    for y0, x0 in zip(*np.nonzero(body)):
        if done[y0, x0]:
            continue
        one = flood([(y0, x0)], body)
        done |= one
        tiles = list(zip(*np.nonzero(one)))
        if not any(at_rim(y, x) for y, x in tiles) and all(level(y, x) for y, x in tiles):
            open_body |= one
    inside = streets | open_body | furniture
    thin = rest & ~body

    def side(y, x, dy, dx):
        for k in range(1, 4):
            ny, nx = y + dy * k, x + dx * k
            if not (0 <= ny < H and 0 <= nx < W):
                return False
            if inside[ny, nx]:
                return True
            if not thin[ny, nx]:
                return False
        return False

    open_thin = np.zeros((H, W), bool)
    for y, x in zip(*np.nonzero(thin)):
        if 0 < x < W - 1 and 0 < y < H - 1 and level(y, x) and ((side(y, x, 0, 1) and side(y, x, 0, -1)) or (side(y, x, 1, 0) and side(y, x, -1, 0))):
            open_thin[y, x] = True
    return ground & ~(walls & ~(open_body | open_thin | furniture))


def render_town(data, name):
    zone = TOWNS[name]
    area = data.zones[zone][1]
    chunks = data.chunks(zone)
    cxs, cys = [c[0] for c in chunks], [c[1] for c in chunks]
    x0, y0 = min(cxs), min(cys)
    cw, ch = max(cxs) - x0 + 1, max(cys) - y0 + 1
    W, H = cw * 32, ch * 32
    top = 200  # room above the northern edge for tall things
    cv = Canvas(cw * CHUNK, ch * CHUNK + BOTTOM, top)
    blocked, beyond, outside, free = walk_grids(data, name, zone, x0, y0, cw, ch)
    heights = np.full((H, W), -1e9, np.float32)
    roof = np.full((H, W), -1e9, np.float32)  # the highest terrain over each tile, and whether it is a tree (1) or a cliff (2)
    top_kind = np.zeros((H, W), np.int8)
    under_tree = np.zeros((H, W), bool)
    built = np.zeros((H, W), bool)  # under a building of the town, or hidden behind one in the picture
    furniture = np.zeros((H, W), bool)
    blds = []  # (owner id, building id, model name, world x, world z, in the town's own zone)
    missing = set()
    for cx, cy, mid, czone in data.cells(x0, y0, cw, ch):
        own = czone == zone
        carea = data.zones[czone][1] if czone < len(data.zones) else area  # (the open sea has no zone)
        texset, (pack, pack_tex) = data.texset(carea), data.pack(carea)
        model, _, bsec = container(data.maps[mid])
        ox, oz = (cx - x0) * CHUNK + CHUNK / 2, (cy - y0) * CHUNK + CHUNK / 2
        world = np.eye(4)
        world[3, :3] = (ox, 0, oz)
        cv.obj = 0
        terrain = []
        for t, tex, mat in model_tris(N.BMD(model), texset, world):
            cv.tri(t, tex, mat)
            mname = mat.name or ''
            if not mname.startswith(('ki', 'slamp')):  # (a street lamp's top is no ground either: Opelucid's stood people 50 px up)
                terrain.append(t)
            kind = 1 if TREE.match(mname) else 2 if CLIFF.search(mname) else 0
            for tz, tx, y in tiles_under(t[0][0], t[1][0], t[2][0], W, H):
                under_tree[tz, tx] |= kind == 1
                if y > roof[tz, tx]:
                    roof[tz, tx], top_kind[tz, tx] = y, kind
        ground_probe(heights, terrain, W, H)
        for bx, by, bz, rot, bid in buildings(bsec):
            bmd = pack.get(bid)
            if bmd is None:
                if own:
                    missing.add(bid)
                continue
            r = np.eye(4)
            c, s = math.cos(rot), math.sin(rot)
            r[0, 0], r[0, 2], r[2, 0], r[2, 2] = c, -s, s, c
            r[3, :3] = (ox + bx, by, oz - bz)  # the building list counts z northward (it lines up with the walkable grid so)
            cv.obj = len(blds) + 1
            mname = bmd.models[0].name if bmd.models else '?'
            blds.append((cv.obj, bid, mname, ox + bx, oz - bz, own))
            tris = list(model_tris(bmd, pack_tex, r))
            for t, tex, mat in tris:
                cv.tri(t, tex, mat)
            if own and FURNITURE.match(mname):
                footprint(furniture, [t for t, _, _ in tris], W, H)
            elif own:
                footprint(built, [t for t, _, _ in tris], W, H, by)
    cv.flush()
    # what lies outside the town is drawn dim, the buildings and trees standing there too, so the picture itself shows
    # where people can go (Icirrus's corner of Route 8 looked like a meadow of the town)
    dim = (cv.owner >= 0) & outside[np.clip((cv.wz // 16).astype(np.int64), 0, H - 1), np.clip(np.arange(cv.w) // TILE, 0, W - 1)[None, :]]
    cv.rgb[dim] = cv.rgb[dim] * DIM + DIM_ADD
    # walk heights: probed for walkable tiles; the others take their nearest walkable neighbour's (for occluders)
    walk_h = np.where(heights > -1e8, heights, 0).astype(np.float32)
    base_h = walk_h.copy()
    seen = ~blocked
    frontier = list(zip(*np.nonzero(seen)))
    k = 0
    while k < len(frontier):
        y, x = frontier[k]
        k += 1
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and not seen[ny, nx]:
                seen[ny, nx] = True
                base_h[ny, nx] = base_h[y, x]
                frontier.append((ny, nx))
    # each walkable tile's lift (how far up the picture people stand on it) counts from the town's lowest walkable
    # ground, so none is below zero: Undella lies 80 units below the matrix's zero height, and counted from there its
    # people stood three tiles north of the beach drawn under them. oy is the picture row of tile row 0 on that ground;
    # the picture is cropped to what was drawn above and runs down to the town's last tile row on it
    lift_px = np.round(OBLIQUE * walk_h * UNIT).astype(np.int64)
    shift = int(lift_px[~blocked].min()) if (~blocked).any() else 0
    lift_px -= shift
    rows = np.nonzero((cv.owner >= 0).any(1))[0]
    crop = int(rows[0]) if len(rows) else 0
    oy = int(top * UNIT) - crop - shift
    end = crop + H * TILE + oy
    assert end <= cv.h, f'{name}: ground {-shift} px below zero height needs a bottom margin over {BOTTOM} units'
    rgb = np.clip(cv.rgb[crop:end], 0, 255).astype(np.uint8)
    owner, wz, wy = cv.owner[crop:end], cv.wz[crop:end], cv.wy[crop:end]
    # occluders: every building on its own, tall terrain (trees, cliff faces) row by row, each with the picture row
    # its foot stands on, so people north of it go behind it
    sprites = []
    tz = np.clip((wz // 16).astype(np.int64), 0, H - 1)
    tx = np.broadcast_to(np.clip((np.arange(rgb.shape[1]) // TILE).astype(np.int64), 0, W - 1)[None, :], owner.shape)
    lift = wy - base_h[tz, tx]
    for oid, bid, mname, bxw, bzw, own in blds:
        mask = owner == oid
        if not mask.any():
            continue
        foot = float(wz[mask].max())  # the southernmost point the building covers
        im, x_a, y_a = cutout(rgb, mask)
        sprites.append((im, x_a, y_a, int(round(foot * UNIT)), mname))
    tall = (owner == 0) & (lift > 10)
    for row in range(H):
        mask = tall & (tz == row)
        if mask.any():
            im, x_a, y_a = cutout(rgb, mask)
            sprites.append((im, x_a, y_a, (row + 1) * TILE, None))
    sprites = [p for s in sprites for p in split_sprite(s)]  # in order: pieces of one foot row keep their place
    width = max([ATLAS_W] + [s[0].shape[1] + 1 for s in sprites])
    atlas, pos = pack_sprites(sprites, width)
    if atlas.shape[0] > ATLAS_W * 2 and width < ATLAS_W * 2:
        atlas, pos = pack_sprites(sprites, ATLAS_W * 2)
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(rgb).save(os.path.join(OUT, f'{name}.png'), optimize=True)
    Image.fromarray(atlas).save(os.path.join(OUT, f'{name}_obj.png'), optimize=True)
    grid = [''.join('#' if blocked[j, i] else '.' for i in range(W)) for j in range(H)]
    free &= ~(blocked & (heights < heights[~blocked].min() - WATER_DROP))
    free = team_grid(free, blocked, outside, built, furniture, under_tree | (top_kind > 0), top_kind == 2, lift_px)
    free_rows = [''.join('.' if free[j, i] else '#' for i in range(W)) for j in range(H)]
    doors = []
    for oid, bid, mname, bxw, bzw, own in blds:  # the first walkable tile south of a building's middle is its door
        foot = owner == oid
        if not own or not foot.any():
            continue
        bx_t, zt = int(bxw // 16), int(wz[foot].max() // 16)
        for t in range(zt, min(H, zt + 4)):
            if 0 <= bx_t < W and not blocked[t, bx_t]:
                doors.append([bx_t, t, mname])
                break
    # ways out: walkable tiles on the box's edge or next to another zone's walkable tile (a route inside the box)
    def out_at(i, j):
        return i in (0, W - 1) or j in (0, H - 1) or any(0 <= j + b < H and 0 <= i + a < W and beyond[j + b, i + a]
                                                         for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)))
    exits = [[i, j] for j in range(H) for i in range(W) if not blocked[j, i] and out_at(i, j)]
    meta = {
        'name': name, 'zone': zone, 'area': area, 'w': W, 'h': H, 'oy': oy, 'img': [int(rgb.shape[1]), int(rgb.shape[0])],
        'rows': grid, 'free': free_rows, 'lift': np.where(blocked, 0, lift_px).tolist(), 'doors': doors, 'exits': exits,
        # occluders: atlas x, y, w, h, then picture x, y (tile space: picture y - oy) and the foot row's y
        'objs': [[sx, sy, s[0].shape[1], s[0].shape[0], s[1], round(s[2] - oy), s[3]] for s, (sx, sy) in zip(sprites, pos)],
        'missing_buildings': sorted(missing),
    }
    os.makedirs(META, exist_ok=True)
    json.dump(meta, open(os.path.join(META, f'{name}.json'), 'w'), separators=(',', ':'))
    return meta


if __name__ == '__main__':
    data = Data()
    for name in sys.argv[1:] or TOWNS:
        m = render_town(data, name)
        print(name, 'tiles', m['w'], 'x', m['h'], 'picture', m['img'], 'occluders', len(m['objs']), 'doors', len(m['doors']),
              'exits', len(m['exits']), 'missing', m['missing_buildings'], flush=True)
