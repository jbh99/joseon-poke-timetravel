"""Regional maps for the world line, drawn from Natural Earth 1:50m data (public domain; work/geo, not shipped):
land, country borders and rivers on a plain longitude/latitude grid (each map's height keeps the aspect at its
middle latitude), in the game's pixel style. Writes web/assets/img/map_<region>.png and data/maps.json
({region: {lon0, lon1, lat0, lat1, w, h}}), which the world map scene reads for an era with `map: <region>`.

usage: python worldmaps.py
"""
import json
import math
import os
import struct

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
GEO = os.path.join(ROOT, 'work', 'geo')
OUT_IMG = os.path.join(ROOT, 'web', 'assets', 'img')
OUT_META = os.path.join(ROOT, 'web', 'assets', 'data', 'maps.json')

# region: lon0, lon1, lat0, lat1, width in map pixels (the world-map scene shows them at 2x)
REGIONS = {
    'eastasia': (104, 146, 22, 52, 840),
    'europe': (-12, 48, 28, 62, 1120),
    'pacific': (112, 212, -2, 42, 1240),  # east of 180 counts on (Pearl Harbor 202)
}
OCEAN, OCEAN2, LAND, LAND2, COAST, BORDER, RIVER = (52, 98, 160), (64, 112, 176), (128, 178, 96), (116, 166, 86), (36, 52, 40), (84, 104, 70), (70, 120, 190)


def shapes(path):
    """Every part of every record of a shapefile: lists of (lon, lat) points (polygons and polylines alike)."""
    d = open(path, 'rb').read()
    p, out = 100, []
    while p + 8 <= len(d):
        _, length = struct.unpack_from('>ii', d, p)
        rec = p + 8
        p = rec + length * 2
        kind = struct.unpack_from('<i', d, rec)[0]
        if kind not in (3, 5, 13, 15, 23, 25):
            continue
        nparts, npts = struct.unpack_from('<ii', d, rec + 36)
        parts = list(struct.unpack_from('<%di' % nparts, d, rec + 44)) + [npts]
        pts = np.frombuffer(d, '<f8', count=npts * 2, offset=rec + 44 + 4 * nparts).reshape(-1, 2)
        for a, b in zip(parts, parts[1:]):
            out.append(pts[a:b])
    return out


def render(name, lon0, lon1, lat0, lat1, w):
    kx = math.cos(math.radians((lat0 + lat1) / 2))
    h = round(w * (lat1 - lat0) / ((lon1 - lon0) * kx))
    S = 3  # drawn at 3x, then reduced with a majority filter that keeps the hard pixel edges

    def xy(pts, shift):
        lon = pts[:, 0] + shift
        return [((x - lon0) / (lon1 - lon0) * w * S, (lat1 - y) / (lat1 - lat0) * h * S) for x, y in zip(lon, pts[:, 1])]

    shifts = (0, 360) if lon1 > 180 else (0,)
    land = Image.new('L', (w * S, h * S), 0)
    dl = ImageDraw.Draw(land)
    for part in shapes(os.path.join(GEO, 'land', 'ne_50m_land.shp')):
        for sh in shifts:
            dl.polygon(xy(part, sh), fill=255)
    land = np.asarray(land.resize((w, h), Image.BOX)) >= 128
    borders = Image.new('L', (w * S, h * S), 0)
    db = ImageDraw.Draw(borders)
    for part in shapes(os.path.join(GEO, 'countries', 'ne_50m_admin_0_countries.shp')):
        for sh in shifts:
            db.line(xy(part, sh), fill=255, width=2)
    borders = np.asarray(borders.resize((w, h), Image.BOX)) >= 64
    rivers = Image.new('L', (w * S, h * S), 0)
    dr = ImageDraw.Draw(rivers)
    for part in shapes(os.path.join(GEO, 'rivers', 'ne_50m_rivers_lake_centerlines.shp')):
        for sh in shifts:
            dr.line(xy(part, sh), fill=255, width=2)
    rivers = np.asarray(rivers.resize((w, h), Image.BOX)) >= 96
    rng = np.random.default_rng(7)
    img = np.zeros((h, w, 3), np.uint8)
    # ocean: two blues in soft diagonal swells; land: two greens dithered
    yy, xx = np.mgrid[0:h, 0:w]
    swell = ((xx + yy * 2) // 5 + (xx // 11)) % 7 == 0
    img[:] = OCEAN
    img[swell] = OCEAN2
    dither = rng.random((h, w)) < 0.22
    img[land] = LAND
    img[land & dither] = LAND2
    # coast: land pixels touching the sea, dark; the sea pixels touching land a lighter shallows blue
    pad = np.pad(land, 1)
    near_sea = land & ~(pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:])
    near_land = ~land & (pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:])
    img[near_land] = (96, 150, 200)
    img[land & borders & ~near_sea] = BORDER
    img[land & rivers & ~near_sea] = RIVER
    img[near_sea] = COAST
    os.makedirs(OUT_IMG, exist_ok=True)
    Image.fromarray(img).save(os.path.join(OUT_IMG, f'map_{name}.png'), optimize=True)
    return {'lon0': lon0, 'lon1': lon1, 'lat0': lat0, 'lat1': lat1, 'w': w, 'h': h}


if __name__ == '__main__':
    meta = {name: render(name, *r) for name, r in REGIONS.items()}
    json.dump(meta, open(OUT_META, 'w'), indent=1)
    print(json.dumps(meta))
