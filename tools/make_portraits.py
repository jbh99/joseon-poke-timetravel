"""Portraits for Pokémon that have no face in the PMD Blue ROM (the Regis), drawn the way that ROM draws them:
a 40x40 close-up over a backdrop of five 8-pixel colour bands.

  python make_portraits.py

The close-up is cut 1:1 from the first frame of the Pearl battle sprite (web/assets/poke/front/<dex>.png, 80x80
per frame, about the pixel scale of a PMD portrait). Writes web/assets/pmd/kao/<dex>.png (one expression) and lists
them in web/assets/data/pmd.json; extract_pmd.py keeps them listed when it rebuilds that index.
"""
import json, os
from PIL import Image

ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'web', 'assets')
# dex: top-left of the 40x40 window in the 80x80 frame (face dots a little above the middle), backdrop top / bottom colour
FACES = {
    377: ((20, 5), (222, 178, 128), (250, 238, 200)),   # Regirock: sandstone
    378: ((12, 11), (124, 178, 232), (224, 244, 255)),  # Regice: glacier
    379: ((12, 10), (150, 150, 184), (232, 232, 242)),  # Registeel: steel
    486: ((17, 6), (126, 182, 126), (234, 246, 214)),   # Regigigas: moss
}


def backdrop(top, bottom):
    band = [tuple(round(top[i] + (bottom[i] - top[i]) * k / 4) for i in range(3)) + (255,) for k in range(5)]
    im = Image.new('RGBA', (40, 40))
    px = im.load()
    for y in range(40):
        k = y // 8
        for x in range(40):
            # the last two rows of a band are checkered with the next one, as in the ROM's backdrops
            px[x, y] = band[k + 1] if k < 4 and y % 8 >= 6 and (x + y) % 2 == 0 else band[k]
    return im


def main():
    index_path = os.path.join(ASSETS, 'data', 'pmd.json')
    index = json.load(open(index_path))
    for dex, ((x, y), top, bottom) in FACES.items():
        frame = Image.open(os.path.join(ASSETS, 'poke', 'front', f'{dex}.png')).convert('RGBA').crop((0, 0, 80, 80))
        im = backdrop(top, bottom)
        im.alpha_composite(frame.crop((x, y, x + 40, y + 40)))
        im.save(os.path.join(ASSETS, 'pmd', 'kao', f'{dex}.png'), optimize=True)
        if dex not in index['kao']:
            index['kao'].append(dex)
    index['kao'].sort(key=lambda k: (int(str(k).rstrip('ads')), str(k)))
    with open(index_path, 'w') as fp:
        json.dump(index, fp, separators=(',', ':'))
    print('portraits', sorted(FACES))


if __name__ == '__main__':
    main()
