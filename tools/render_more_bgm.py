"""More music beside the Black soundtrack (1.38): Pokemon Pearl's towns, cities, routes and legend battles under dp_*
keys, and a few more pieces of Black's (the bridges, Opelucid and Lacunosa as the other version and season have them).
Adds its keys to web/assets/bgm/bgm.json and leaves every other key alone. One track at a time (no process pool: the
PC stays usable); a key whose file is already there is skipped unless named.

usage: python render_more_bgm.py [key ...]      (--merge: only put the entries rendered so far into bgm.json)
The ROMs are the user's own and never part of the repository (tools/romlib.py, tools/bw/render_bw_bgm.py).
"""
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'bw'))
ROOT = os.path.dirname(HERE)
OUT_DIR = os.path.join(ROOT, 'web', 'assets', 'bgm')
WAV_DIR = os.path.join(ROOT, 'work', 'wav')
META_DIR = os.path.join(ROOT, 'work', 'bgmmeta')
BW_SDAT = os.path.join(ROOT, 'work', 'bw', 'wb_sound_data.sdat')
TARGET_RMS = 0.12

PEARL = {
    **{f'dp_town{n:02d}': f'SEQ_TOWN{n:02d}_D' for n in range(1, 8)},
    **{f'dp_city{n:02d}': f'SEQ_CITY{n:02d}_D' for n in range(1, 12)},
    **{f'dp_road_{r}': f'SEQ_ROAD_{r.upper()}_D' for r in ('a', 'b', 'c', 'd', 'e', 'f', 'snow')},
    # battles with the legends: Dialga / Palkia, the lake guardians, the other legends, Arceus
    'dp_ba_dpoke1': 'SEQ_BA_DPOKE1', 'dp_ba_dpoke2': 'SEQ_BA_DPOKE2', 'dp_ba_secret1': 'SEQ_BA_SECRET1', 'dp_ba_secret2': 'SEQ_BA_SECRET2',
}
BLACK = {
    'town05_au': 'SEQ_BGM_T_05_AU', 'city08_w': 'SEQ_BGM_C_08_W', 'city10_w': 'SEQ_BGM_C_10_W',
    **{f'h_{n:02d}': f'SEQ_BGM_H_{n:02d}' for n in range(1, 6)},
}
# Pearl plays one piece in two places twice over (Celestic Town has Eterna City's, Pastoria City has Solaceon Town's):
# the second key shares the first one's file
SHARED = {'dp_town05': 'dp_city04', 'dp_city06': 'dp_town04'}
# a piece that never jumps back (Black's Driftveil Drawbridge repeats inside its own data, a short rest between) is
# cut to one round, in seconds, and loops over it
TRIM = {'h_02': 113.69}


def render(renderer, key, seq, src):
    import sseq_render as S
    audio, loop = renderer.render(seq)
    if key in TRIM:
        audio, loop = audio[:int(TRIM[key] * S.SR)], (0.0052, TRIM[key])
    rms = float(np.sqrt((audio ** 2).mean())) or 1
    peak = float(np.abs(audio).max()) or 1
    audio = audio * min(TARGET_RMS / rms, 0.95 / peak)
    wav = os.path.join(WAV_DIR, f'{key}.wav')
    sf.write(wav, audio.astype(np.float32), S.SR, subtype='PCM_16')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', '2', os.path.join(OUT_DIR, f'{key}.ogg')], check=True)
    os.remove(wav)
    meta = {'file': f'{key}.ogg', 'seq': seq, 'src': src, 'dur': round(len(audio) / S.SR, 3)}
    if loop:
        meta['loop'] = [round(loop[0], 4), round(loop[1], 4)]
    return meta


if __name__ == '__main__':
    import ndspy.soundArchive as sa
    import sseq_render as S
    os.makedirs(WAV_DIR, exist_ok=True)
    os.makedirs(META_DIR, exist_ok=True)
    only = set(sys.argv[1:]) - {'--merge'}
    meta_path = os.path.join(OUT_DIR, 'bgm.json')
    for src, tracks in (('pearl', PEARL), ('black', BLACK)):
        if '--merge' in sys.argv:
            break
        todo = [(k, v) for k, v in tracks.items() if k not in SHARED and ((k in only) or (not only and not os.path.exists(os.path.join(OUT_DIR, f'{k}.ogg'))))]
        if not todo:
            continue
        renderer = S.Renderer() if src == 'pearl' else S.Renderer(sa.SDAT(open(BW_SDAT, 'rb').read()))
        for key, seq in todo:
            m = render(renderer, key, seq, src)
            # each track's entry is kept in a file of its own, so two runs side by side (each with its own keys) cannot
            # write over one another's entries in bgm.json; the entries go in together below
            json.dump(m, open(os.path.join(META_DIR, f'{key}.json'), 'w', encoding='utf8'))
            print(key, m, flush=True)
    meta = json.load(open(meta_path, encoding='utf8'))
    for key in list(PEARL) + list(BLACK):
        one = os.path.join(META_DIR, f'{key}.json')
        if key not in SHARED and os.path.exists(one) and os.path.exists(os.path.join(OUT_DIR, f'{key}.ogg')):
            meta[key] = json.load(open(one, encoding='utf8'))
        elif key not in meta:
            print('not rendered yet:', key)
    for key, src in SHARED.items():
        if src in meta:
            meta[key] = {**meta[src], 'seq': PEARL[key]}
    json.dump(meta, open(meta_path, 'w', encoding='utf8'), indent=1)
    print('done', len(meta), 'keys')
