"""Pokémon Black's cries for the fifth generation (#494-649) as small mono OGG files, like tools/extract_cries.py does
for Pearl's #1-493.

wb_sound_data.sdat keeps one wave archive a species in national-number slots: #1-493 are named WAVE_ARC_PV###, the
fifth generation's WAVE_ARC_PMWB_### after development numbers (Victini sits in slot 494 as PMWB_657), so the slot,
not the name, says whose cry it is. Each archive's first wave is the cry (decoded by sseq_render.decode_swav).

usage: python cries.py      (needs ffmpeg on PATH)
"""
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

import ndspy.soundArchive as sa
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))
import ndsfs  # noqa: E402
from sseq_render import decode_swav  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(HERE))
ROM = os.environ.get('BLACK_ROM') or os.path.join(os.path.expanduser('~'), 'Downloads', 'claude skills', '포켓몬스터 블랙(K).nds')
WAV = os.path.join(ROOT, 'work', 'wav')
OUT = os.path.join(ROOT, 'web', 'assets', 'cry')
FIRST, LAST = 494, 649


def main():
    s = sa.SDAT(ndsfs.Rom(ROM).find('wb_sound_data.sdat'))
    os.makedirs(WAV, exist_ok=True)
    jobs, lengths = [], {}
    for sp in range(FIRST, LAST + 1):
        name, arc = s.waveArchives[sp]
        if not (name or '').startswith('WAVE_ARC_PMWB_') or not arc or not arc.waves:
            raise SystemExit(f'slot {sp}: {name!r} is not a fifth-generation cry')
        samples, _, rate = decode_swav(arc.waves[0])
        wav = os.path.join(WAV, f'cry{sp}.wav')
        sf.write(wav, (samples / max(1e-6, np.abs(samples).max()) * 0.8).astype(np.float32), rate, subtype='PCM_16')
        jobs.append((wav, os.path.join(OUT, f'{sp}.ogg')))
        lengths[sp] = len(samples) / rate
    with ThreadPoolExecutor(6) as ex:
        list(ex.map(lambda j: subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', j[0], '-ac', '1', '-c:a', 'libvorbis',
                                              '-q:a', '3', j[1]], check=True), jobs))
    size = sum(os.path.getsize(j[1]) for j in jobs)
    print(f'cries {len(jobs)} ({size // 1024} KB); seconds: Victini {lengths[494]:.2f}, Patrat {lengths[504]:.2f}, '
          f'Reshiram {lengths[643]:.2f}, Kyurem {lengths[646]:.2f}, Genesect {lengths[649]:.2f}')


if __name__ == '__main__':
    main()
