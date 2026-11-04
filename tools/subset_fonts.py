"""Cut the Galmuri fonts down to the characters the game can show, for the web build.

The full fonts (tools/fonts/*.woff2, Galmuri by Lee Minseo, SIL OFL 1.1 with no Reserved Font Name, so a subset may
keep its name) hold every Hangul syllable: 1.08 MB, a third of what a first visit downloaded before the title (1.13,
17 s on a fast 3G line). The game's own text uses about 1,200 syllables. Kept: every character in the game's text
(web/js, web/assets/data, the guide and the privacy page), printable ASCII and Latin-1, the 2,350 Hangul syllables of
KS X 1001 and the compatibility jamo (what a player types into the roster search or the co-op chat almost always uses
them). A character the subset lacks falls back to the browser's own font.

usage: python subset_fonts.py           write web/assets/fonts/*.woff2 from tools/fonts/
       python subset_fonts.py --check   fail when the game's text uses a character the full font has and the web
                                        font lacks (new text since the last subset)
"""
import glob
import io
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(HERE, 'fonts')
OUT = os.path.join(ROOT, 'web', 'assets', 'fonts')
NAMES = ['Galmuri11', 'Galmuri11-Bold', 'Galmuri9']


def wanted():
    chars = set()
    files = (glob.glob(os.path.join(ROOT, 'web', 'js', '*.js')) + glob.glob(os.path.join(ROOT, 'web', 'assets', 'data', '*.json'))
             + [os.path.join(ROOT, 'web', 'index.html'), os.path.join(ROOT, 'web', 'privacy.html')])
    for f in files:
        chars |= set(io.open(f, encoding='utf-8').read())
    chars |= {chr(c) for c in range(0x20, 0x7f)} | {chr(c) for c in range(0xa0, 0x100)}
    chars |= {bytes([a, b]).decode('euc-kr') for a in range(0xb0, 0xc9) for b in range(0xa1, 0xff)}  # KS X 1001 Hangul
    chars |= {chr(c) for c in range(0x3131, 0x318f)}  # compatibility jamo (초성 search)
    return {c for c in chars if c.isprintable() or c == ' '}


def main():
    chars = wanted()
    stale = []
    for name in NAMES:
        full = TTFont(os.path.join(SRC, name + '.woff2'))
        have = {chr(u) for u in full.getBestCmap()} & chars
        dst = os.path.join(OUT, name + '.woff2')
        if '--check' in sys.argv:
            web = set(chr(u) for u in TTFont(dst).getBestCmap()) if os.path.exists(dst) else set()
            lack = sorted(have - web)
            if lack:
                stale.append(f'{name}: {len(lack)} characters, e.g. {"".join(lack[:20])!r}')
            continue
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = ['*']
        opts.name_IDs = ['*']
        opts.name_languages = ['*']
        opts.notdef_outline = True
        s = subset.Subsetter(opts)
        s.populate(unicodes=[ord(c) for c in have])
        s.subset(full)
        full.flavor = 'woff2'
        full.save(dst)
        print(f'{name}: {len(have)} characters, {os.path.getsize(os.path.join(SRC, name + ".woff2")) // 1024} KB -> {os.path.getsize(dst) // 1024} KB')
    if stale:
        raise SystemExit('web fonts lack characters the game uses; run python tools/subset_fonts.py\n' + '\n'.join(stale))


if __name__ == '__main__':
    main()
