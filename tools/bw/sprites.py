"""Pokémon Black's own graphics for the fifth generation (#494-649), in the game's file layout:

  poke/front/<sp>.png, <sp>s.png  battle front, normal and shiny: two 96x96 frames side by side (the second a
                                   pixel lower, the bob the game alternates), from a/0/0/4: per species 20 files,
                                   #0 the 96x96 picture as four OAM blocks (64x64, 32x64, 64x32, 32x32 stored in
                                   turn), #18 / #19 its normal / shiny palette
  poke/icon/<sp>.png, <sp>s.png   box icon, 32x64 (two 32x32 frames), from a/0/0/7 (#0 three 16-colour palettes,
                                   then a male and a female picture a species from #7). Which of the three palettes
                                   a species uses is not stored beside it: the one whose colours sit closest to the
                                   species' battle palette is taken. The shiny icon swaps each colour for the shiny
                                   palette's colour at the nearest normal-palette entry. (The match runs both ways, each colour weighted by its
pixels: the icon's colours against the battle picture's and the battle picture's against the icon's.)

  poke/icon/555z.png, 555zs.png    a form a boss takes in battle (FORMS): the form's box icon, its colours chosen the same way

usage: python sprites.py          every species' fronts and icons
       python sprites.py forms    only the forms' icons
"""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import ndsfs  # noqa: E402
import nitro2d as D  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(HERE))
ROM = os.environ.get('BLACK_ROM') or os.path.join(os.path.expanduser('~'), 'Downloads', 'claude skills', '포켓몬스터 블랙(K).nds')
OUT = os.path.join(ROOT, 'web', 'assets', 'poke')
FIRST, LAST = 494, 649
BLOCKS = [(0, 0, 8, 8), (64, 0, 4, 8), (0, 64, 8, 4), (64, 64, 4, 4)]
# a form's key in the game (Mon.spr): its icon file in a/0/0/7, and the number of its files in a/0/0/4 after the species'
FORMS = {'555z': (1407, 50)}


def front_index(blob):
    _, _, _, px = D.ncgr(D.lz(blob))
    tiles = px[:144 * 64].reshape(144, 8, 8)
    img = np.zeros((96, 96), np.uint8)
    t = 0
    for bx, by, tw, th in BLOCKS:
        for j in range(th):
            for i in range(tw):
                img[by + j * 8:by + j * 8 + 8, bx + i * 8:bx + i * 8 + 8] = tiles[t]
                t += 1
    return img


def paint(idx, pal):
    rgba = np.zeros(idx.shape + (4,), np.uint8)
    rgba[..., :3] = pal[np.clip(idx, 0, len(pal) - 1)]
    rgba[..., 3] = np.where(idx == 0, 0, 255)
    return rgba


def sheet(rgba):
    out = np.zeros((96, 192, 4), np.uint8)
    out[:, :96] = rgba
    out[1:, 96:] = rgba[:-1]
    return Image.fromarray(out)


def icon_index(blob):
    _, _, _, px = D.ncgr(D.lz(blob))
    tiles = px[:32 * 64].reshape(32, 8, 8)
    img = np.zeros((64, 32), np.uint8)
    for f in range(2):
        for k in range(16):
            j, i = divmod(k, 4)
            img[f * 32 + j * 8:f * 32 + j * 8 + 8, i * 8:i * 8 + 8] = tiles[f * 16 + k]
    return img


def nearest(colors, palette):
    d = ((colors[:, None, :].astype(np.int32) - palette[None, :, :].astype(np.int32)) ** 2).sum(-1)
    return d.argmin(1), d.min(1)


def icons(ii, idx, normal, shiny, icon_pals):
    """an icon's normal and shiny pictures: the battle picture's palettes say which of the three icon palettes it uses"""
    used, counts = np.unique(ii[ii > 0], return_counts=True)
    fused, fcounts = np.unique(idx[idx > 0], return_counts=True)
    battle = normal[fused]

    def score(k):  # both ways: the icon's pixels against the battle colours, the battle pixels against the icon's
        cols = icon_pals[k][used]
        return (nearest(cols, battle)[1] * counts).sum() / counts.sum() + (nearest(battle, cols)[1] * fcounts).sum() / fcounts.sum()
    best = min(range(3), key=score) if len(used) else 0
    pal = icon_pals[best]
    k, _ = nearest(pal, normal)
    return Image.fromarray(paint(ii, pal)), Image.fromarray(paint(ii, shiny[k]))


def forms(rom):
    spr = ndsfs.narc(rom.find('a/0/0/4'))
    ic = ndsfs.narc(rom.find('a/0/0/7'))
    icon_pals = D.nclr(D.lz(ic[0])).reshape(3, 16, 3)
    for key, (icon, form) in FORMS.items():
        base = (650 + form) * 20
        normal, shiny = D.nclr(D.lz(spr[base + 18]))[:16], D.nclr(D.lz(spr[base + 19]))[:16]
        a, b = icons(icon_index(ic[icon]), front_index(spr[base]), normal, shiny, icon_pals)
        a.save(os.path.join(OUT, 'icon', f'{key}.png'), optimize=True)
        b.save(os.path.join(OUT, 'icon', f'{key}s.png'), optimize=True)
    print('forms', ', '.join(FORMS))


def main():
    rom = ndsfs.Rom(ROM)
    if sys.argv[1:] == ['forms']:
        return forms(rom)
    spr = ndsfs.narc(rom.find('a/0/0/4'))
    ic = ndsfs.narc(rom.find('a/0/0/7'))
    icon_pals = D.nclr(D.lz(ic[0])).reshape(3, 16, 3)
    os.makedirs(os.path.join(OUT, 'front'), exist_ok=True)
    os.makedirs(os.path.join(OUT, 'icon'), exist_ok=True)
    for sp in range(FIRST, LAST + 1):
        base = sp * 20
        idx = front_index(spr[base])
        normal, shiny = D.nclr(D.lz(spr[base + 18]))[:16], D.nclr(D.lz(spr[base + 19]))[:16]
        sheet(paint(idx, normal)).save(os.path.join(OUT, 'front', f'{sp}.png'), optimize=True)
        sheet(paint(idx, shiny)).save(os.path.join(OUT, 'front', f'{sp}s.png'), optimize=True)
        a, b = icons(icon_index(ic[7 + 2 * sp]), idx, normal, shiny, icon_pals)
        a.save(os.path.join(OUT, 'icon', f'{sp}.png'), optimize=True)
        b.save(os.path.join(OUT, 'icon', f'{sp}s.png'), optimize=True)
    print('fronts and icons', FIRST, '-', LAST)


if __name__ == '__main__':
    main()
