"""Merge the per-town files render.py writes (work/bw/towns/<town>.json) into the one index the game loads at boot
(web/assets/bw/towns/index.json), with each walkable tile's lift packed as one character a tile
(chr(48 + lift // 2): the lift in 2-pixel steps).

usage: python bw_index.py
"""
import glob
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SRC = os.path.join(ROOT, 'work', 'bw', 'towns')
DIR = os.path.join(ROOT, 'web', 'assets', 'bw', 'towns')

towns = {}
for path in sorted(glob.glob(os.path.join(SRC, '*.json'))):
    name = os.path.splitext(os.path.basename(path))[0]
    if name == 'index':
        continue
    t = json.load(open(path))
    lift = [''.join(chr(48 + max(0, min(150, v)) // 2) for v in row) for row in t['lift']]
    towns[name] = {
        'w': t['w'], 'h': t['h'], 'oy': t['oy'], 'img': t['img'], 'rows': t['rows'],
        'lift': lift if any(c != '0' for row in lift for c in row) else None,
        'doors': t['doors'], 'exits': t['exits'], 'objs': t['objs'],
    }
json.dump({'towns': towns}, open(os.path.join(DIR, 'index.json'), 'w'), separators=(',', ':'))
print('index', len(towns), 'towns', os.path.getsize(os.path.join(DIR, 'index.json')) // 1024, 'KB')
