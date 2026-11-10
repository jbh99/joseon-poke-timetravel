"""The pictures of the items the game draws on a dungeon floor with the main games' own art, from Pokémon Black's bag
icons (a/0/2/5: a 32x32 picture of sixteen 8x8 tiles, 16 colours, colour 0 see-through, and after it its palette).

Out, in web/assets/item: <id>.png, cut to its pixels (dungeon.js drawItem centres it on the tile).

usage: python items.py
"""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import ndsfs  # noqa: E402
import nitro2d as D  # noqa: E402
from render import ROM, ROOT  # noqa: E402

OUT = os.path.join(ROOT, 'web', 'assets', 'item')
# the game's item id -> the icon's file in the archive (its palette is the next file): the berries follow the item list,
# Cheri (item 149) at file 164, so Oran (155) is 176 and Sitrus (158) 182
ICONS = {'oran': 176, 'sitrus': 182}


def icon(files, at):
    assert files[at][:4] == b'RGCN' and files[at + 1][:4] == b'RLCN', at
    _, _, _, px = D.ncgr(files[at])
    pal = D.nclr(files[at + 1])
    idx = np.zeros((32, 32), np.uint8)
    for k, tile in enumerate(px[:16 * 64].reshape(16, 8, 8)):
        j, i = divmod(k, 4)
        idx[j * 8:j * 8 + 8, i * 8:i * 8 + 8] = tile
    rgba = np.zeros((32, 32, 4), np.uint8)
    rgba[..., :3] = pal[np.minimum(idx.astype(np.int64), len(pal) - 1)]
    rgba[..., 3] = np.where(idx == 0, 0, 255)
    ys, xs = np.nonzero(idx)
    return Image.fromarray(rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1])


def main():
    files = ndsfs.narc(ndsfs.Rom(ROM).find('a/0/2/5'))
    os.makedirs(OUT, exist_ok=True)
    for name, at in ICONS.items():
        im = icon(files, at)
        im.save(os.path.join(OUT, f'{name}.png'), optimize=True)
        print(name, 'file', at, im.size)


if __name__ == '__main__':
    main()
