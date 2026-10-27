"""Draws the Android launcher icons and splash screens for mobile/android from the game's Galmuri pixel font.

usage: python tools/make_app_icons.py
"""
import io
from functools import lru_cache
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
RES = ROOT / 'mobile/android/app/src/main/res'
FONTS = ROOT / 'web/assets/fonts'
INK, PAPER, RED, GREEN, BLUE, BG = '#2c2119', '#f3e8cf', '#b2352b', '#3f7a4f', '#2f5d8a', '#0c0a0e'


@lru_cache(None)
def ttf(name):
    # PIL cannot read woff2; fontTools unpacks it into plain TrueType bytes (slow, so once per font)
    f = TTFont(FONTS / name)
    f.flavor = None
    buf = io.BytesIO()
    f.save(buf)
    return buf.getvalue()


def font(name, size):
    return ImageFont.truetype(io.BytesIO(ttf(name)), size)


def pixel_text(text, name, size, color, scale):
    """Text drawn at the font's native pixel size and blown up without smoothing."""
    f = font(name, size)
    x0, y0, x1, y1 = f.getbbox(text)
    im = Image.new('RGBA', (x1 - x0 + 2, y1 - y0 + 2), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((1 - x0, 1 - y0), text, font=f, fill=color)
    return im.resize((im.width * scale, im.height * scale), Image.NEAREST)


def stripe(d, x, y, w, unit):
    # the dancheong stripe that tops every panel in the game
    d.rectangle([x, y, x + w - 1, y + 2 * unit - 1], fill=RED)
    d.rectangle([x, y + 2 * unit, x + w - 1, y + 3 * unit - 1], fill=GREEN)
    d.rectangle([x, y + 3 * unit, x + w - 1, y + 4 * unit - 1], fill=BLUE)


def foreground(size):
    """Adaptive icon foreground (108dp canvas, art inside the 66dp safe zone)."""
    im = Image.new('RGBA', (432, 432), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    stripe(d, 96, 118, 240, 4)
    title = pixel_text('조선', 'Galmuri11-Bold.woff2', 12, INK, 9)
    im.alpha_composite(title, ((432 - title.width) // 2, 150))
    sub = pixel_text('시간여행', 'Galmuri11-Bold.woff2', 12, RED, 4)
    im.alpha_composite(sub, ((432 - sub.width) // 2, 268))
    return im.resize((size, size), Image.NEAREST if size % 108 == 0 else Image.LANCZOS)


def legacy(size, round_):
    """Pre-Android 8 icon: paper tile with the foreground art."""
    im = Image.new('RGBA', (432, 432), (0, 0, 0, 0))
    mask = Image.new('L', (432, 432), 0)
    md = ImageDraw.Draw(mask)
    if round_: md.ellipse([8, 8, 423, 423], fill=255)
    else: md.rounded_rectangle([24, 24, 407, 407], radius=64, fill=255)
    im.paste(Image.new('RGBA', (432, 432), PAPER), (0, 0), mask)
    art = foreground(432)
    im.alpha_composite(art)
    return im.resize((size, size), Image.LANCZOS)


def splash(w, h):
    im = Image.new('RGB', (w, h), BG)
    scale = max(2, round(min(w, h) / 160))
    title = pixel_text('포켓몬 조선 시간여행', 'Galmuri11-Bold.woff2', 12, PAPER, scale)
    x, y = (w - title.width) // 2, (h - title.height) // 2
    d = ImageDraw.Draw(im)
    stripe(d, x, y - 7 * scale, title.width, scale)
    im.paste(title, (x, y), title)
    return im


def main():
    sizes = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
    for dpi, px in sizes.items():
        d = RES / f'mipmap-{dpi}'
        legacy(px, False).save(d / 'ic_launcher.png')
        legacy(px, True).save(d / 'ic_launcher_round.png')
        foreground(px * 108 // 48).save(d / 'ic_launcher_foreground.png')
    (RES / 'values/ic_launcher_background.xml').write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#F3E8CF</color>\n</resources>\n', encoding='utf-8')
    for p in RES.glob('drawable*/splash.png'):
        w, h = Image.open(p).size
        splash(w, h).save(p)
    print('icons and splash screens written under', RES)


if __name__ == '__main__':
    main()
