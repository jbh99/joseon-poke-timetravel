"""The Pokédex the game shows, from the user's own Korean Pearl (Gen 4) and Black (Gen 5) ROMs, read-only.

  Pearl  msgdata/msg.narc #604  Pokédex text, Pearl's (#603 is Diamond's)       (romlib.msg_entries, KS X 1001 codes)
         msgdata/msg.narc #609  category ("씨앗포켓몬")
         poketool/shinzukan.narc  the Sinnoh Pokédex: national numbers in its order (#0 a placeholder, then #1-151)
  Black  a/0/0/2 #236  Pokédex text, Black's (#235 is White's)                   (tools/bw/bwtext.py)
         a/0/0/2 #260  category, #245 height ("0.7 m")
         a/0/0/4  per species 20 files: #0 the 96x96 front picture, #18 its palette (tools/bw/sprites.py)
         the Unova Pokédex is #494-649 in national order (Victini #000)

Out: web/assets/data/pokedex.json
  {"src": where each part came from, "sinnoh": [national numbers, Sinnoh #1 first], "unova": [national numbers,
   Unova #000 first], "e": [null, [category4, text4, category5, text5, height_m], ...]} (category4 and text4 null past
   #493; weights are in dex.json); web/assets/poke/dex5/<sp>.png, Black's own front for #1-493 (96x96, one frame; the
   game's fronts for #494-649 are Black's already).

usage: python pokedex.py
"""
import json
import os
import re
import struct
import sys

import ndspy.narc
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'bw'))
import romlib  # noqa: E402
import ndsfs  # noqa: E402
import bwtext  # noqa: E402
import nitro2d as D  # noqa: E402
import sprites as BW  # noqa: E402

ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'web', 'assets', 'data', 'pokedex.json')
OUT_PIC = os.path.join(ROOT, 'web', 'assets', 'poke', 'dex5')
LAST4, LAST5 = 493, 649
PEARL_TEXT, PEARL_CAT = 604, 609
BLACK_TEXT, BLACK_CAT, BLACK_HEIGHT = 236, 260, 245

# Gen 4 Korean text: Hangul in KS X 1001 order from 0x401, digits, Latin letters and a few marks (as extract_data.py)
KS = [bytes([0xB0 + i // 94, 0xA1 + i % 94]).decode('euc-kr') for i in range(2350)]
MARKS = {0x1AB: '!', 0x1AC: '?', 0x1AD: ',', 0x1AE: '.', 0x1DE: ' ', 0x1E2: ' ', 0xE000: '\n', 0x1B1: "'", 0x1BE: '-',
         0x1C4: '~', 0x1AF: '…', 0x1B3: '(', 0x1B4: ')', 0x1C7: ':',
         0x1D2: '%'}  # % (Manaphy's "80% of its body is water", the "100% juice" of a berry stand)


def decode4(codes, unknown):
    """Gen 4 codes to text; codes it cannot read are counted in `unknown` (nothing is dropped unseen)."""
    out, i = [], 0
    while i < len(codes):
        c = codes[i]
        if c == 0xFFFF:
            break
        if c == 0xFFFE:  # a command: id, argument count, arguments
            i += 3 + codes[i + 2]
            continue
        if 0x401 <= c < 0x401 + 2350:
            out.append(KS[c - 0x401])
        elif 0x121 <= c <= 0x12A:
            out.append(chr(ord('0') + c - 0x121))
        elif 0x12B <= c <= 0x144:
            out.append(chr(ord('A') + c - 0x12B))
        elif 0x145 <= c <= 0x15E:
            out.append(chr(ord('a') + c - 0x145))
        elif c in MARKS:
            out.append(MARKS[c])
        else:
            unknown[c] = unknown.get(c, 0) + 1
        i += 1
    return ''.join(out)


def flat(text):
    """A Pokédex page's fixed line breaks become spaces (the game wraps the text to its own width)."""
    return re.sub(r'\s+', ' ', text.replace('\n', ' ')).strip()


def main():
    unknown = {}
    msg = romlib.narc('msgdata/msg.narc')
    text4 = [flat(decode4(e, unknown)) for e in romlib.msg_entries(msg[PEARL_TEXT])]
    cat4 = [decode4(e, unknown).strip() for e in romlib.msg_entries(msg[PEARL_CAT])]
    shin = ndspy.narc.NARC(romlib.rom().getFileByName('poketool/shinzukan.narc')).files[0]
    sinnoh = list(struct.unpack('<%dH' % (len(shin) // 2), shin))[1:]  # #0 is a placeholder
    if unknown:
        raise SystemExit(f'Pearl text has codes this reader does not know: {unknown}')

    rom = ndsfs.Rom(BW.ROM)
    banks = ndsfs.narc(rom.find('a/0/0/2'))
    text5 = [flat(t) for t in bwtext.strings(banks[BLACK_TEXT])]
    cat5 = [t.strip() for t in bwtext.strings(banks[BLACK_CAT])]
    height = [t.strip() for t in bwtext.strings(banks[BLACK_HEIGHT])]

    entries = [None]
    for sp in range(1, LAST5 + 1):
        m = re.fullmatch(r'([\d.]+)\s*m', height[sp])
        if not m:
            raise SystemExit(f'#{sp}: height {height[sp]!r} unreadable')
        g4 = sp <= LAST4
        entries.append([cat4[sp] if g4 else None, text4[sp] if g4 else None, cat5[sp], text5[sp], float(m.group(1))])
    data = {
        'src': {
            'g4': f'Pokémon Pearl (Korean) msgdata/msg.narc #{PEARL_TEXT} text, #{PEARL_CAT} category; poketool/shinzukan.narc Sinnoh order',
            'g5': f'Pokémon Black (Korean) a/0/0/2 #{BLACK_TEXT} text, #{BLACK_CAT} category, #{BLACK_HEIGHT} height; Unova = #494-649',
        },
        'sinnoh': sinnoh,
        'unova': list(range(494, LAST5 + 1)),
        'e': entries,
    }
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

    spr = ndsfs.narc(rom.find('a/0/0/4'))
    os.makedirs(OUT_PIC, exist_ok=True)
    for sp in range(1, LAST4 + 1):
        idx = BW.front_index(spr[sp * 20])
        pal = D.nclr(D.lz(spr[sp * 20 + 18]))[:16]
        Image.fromarray(BW.paint(idx, pal)).save(os.path.join(OUT_PIC, f'{sp}.png'), optimize=True)
    size = os.path.getsize(OUT) + sum(os.path.getsize(os.path.join(OUT_PIC, f)) for f in os.listdir(OUT_PIC))
    print(f'pokedex.json: {len(entries) - 1} entries, Sinnoh {len(sinnoh)}, Unova {len(data["unova"])}; '
          f'{LAST4} Black fronts; {size // 1024} KB in all')


if __name__ == '__main__':
    main()
