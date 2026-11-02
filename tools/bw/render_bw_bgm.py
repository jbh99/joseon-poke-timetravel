"""Render the game's music from Pokémon Black's sound archive (wb_sound_data.sdat) to looping OGG files and
web/assets/bgm/bgm.json, replacing the DP soundtrack: every key the game plays keeps its name, so the scenes need no
change, and the night variants share their day file. The world-mode keys (vs_kyurem ...) are new.

usage: python render_bw_bgm.py [key ...]   (the ROM: $BLACK_ROM or Downloads/claude skills/포켓몬스터 블랙(K).nds)
"""
import json
import os
import subprocess
import sys
from multiprocessing import Pool

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))
ROOT = os.path.dirname(os.path.dirname(HERE))
WORK = os.path.join(ROOT, 'work', 'bw')
SDAT = os.path.join(WORK, 'wb_sound_data.sdat')
WAV_DIR = os.path.join(WORK, 'wav')
OUT_DIR = os.path.join(ROOT, 'web', 'assets', 'bgm')
TARGET_RMS = 0.12
ROM = os.environ.get('BLACK_ROM') or os.path.join(os.path.expanduser('~'), 'Downloads', 'claude skills', '포켓몬스터 블랙(K).nds')

TRACKS = {
    'title': 'SEQ_BGM_TITLE', 'opening': 'SEQ_BGM_STARTING', 'ending': 'SEQ_BGM_ENDING', 'halloffame': 'SEQ_BGM_E_DENDOUIRI',
    'legend': 'SEQ_BGM_E_LEGEND_COME_B', 'pc': 'SEQ_BGM_POKECEN', 'naminori': 'SEQ_BGM_NAMINORI',
    'town01_d': 'SEQ_BGM_T_01', 'town02_d': 'SEQ_BGM_T_02', 'town03_d': 'SEQ_BGM_T_03',
    'city01_d': 'SEQ_BGM_C_01', 'city02_d': 'SEQ_BGM_C_02', 'city04_d': 'SEQ_BGM_C_03', 'city05_d': 'SEQ_BGM_C_05',
    'city07_d': 'SEQ_BGM_C_07', 'city08_d': 'SEQ_BGM_C_06', 'city09_d': 'SEQ_BGM_C_04', 'city10_d': 'SEQ_BGM_C_08_B',
    'city11_d': 'SEQ_BGM_T_04',
    'road_a': 'SEQ_BGM_R_A', 'road_b': 'SEQ_BGM_R_B_SP', 'road_c': 'SEQ_BGM_R_C_SU', 'road_d': 'SEQ_BGM_R_D_AU',
    'road_e': 'SEQ_BGM_R_E_SP', 'road_f': 'SEQ_BGM_R_F', 'road_snow': 'SEQ_BGM_R_B_WI', 'road_bza': 'SEQ_BGM_R_E_WI',
    'd_01': 'SEQ_BGM_D_01', 'd_02': 'SEQ_BGM_D_02', 'd_03': 'SEQ_BGM_D_03', 'd_04': 'SEQ_BGM_D_04', 'd_05': 'SEQ_BGM_D_05',
    'd_06': 'SEQ_BGM_D_06', 'd_mount2': 'SEQ_BGM_D_07', 'd_agito': 'SEQ_BGM_D_CHAMPROAD', 'd_ginlobby': 'SEQ_BGM_N_CASTLE',
    'd_lake': 'SEQ_BGM_PALACE', 'd_safari': 'SEQ_BGM_R_C_SP', 'd_ice': 'SEQ_BGM_R_D_WI',
    'ba_poke': 'SEQ_BGM_VS_NORAPOKE', 'ba_train': 'SEQ_BGM_VS_TRAINER', 'ba_gym': 'SEQ_BGM_VS_GYMLEADER',
    'ba_ginga': 'SEQ_BGM_VS_PLASMA', 'ba_akagi': 'SEQ_BGM_VS_G_CIS', 'ba_chanp': 'SEQ_BGM_VS_CHAMP',
    'ba_dpoke1': 'SEQ_BGM_VS_SETPOKE', 'ba_rival': 'SEQ_BGM_VS_RIVAL', 'ba_tenno': 'SEQ_BGM_VS_SHITENNO',
    'ba_secret1': 'SEQ_BGM_VS_N', 'ba_dpoke2': 'SEQ_BGM_VS_MOVEPOKE', 'ba_secret2': 'SEQ_BGM_VS_N_2',
    'win_poke': 'SEQ_BGM_WIN1', 'win_gym': 'SEQ_BGM_WIN3', 'win_champ': 'SEQ_BGM_WIN5',
    'fanfa1': 'SEQ_ME_LVUP', 'fanfa2': 'SEQ_ME_SHINKAOME', 'fanfa3': 'SEQ_ME_ASA', 'fanfa4': 'SEQ_ME_ITEM',
    'fanfa5': 'SEQ_ME_KEYITEM', 'fanfa6': 'SEQ_ME_BADGE',
    'event01': 'SEQ_BGM_E_TROUBLE', 'event02': 'SEQ_BGM_E_EMOTION', 'event03': 'SEQ_BGM_E_INISHIE',
    'event04': 'SEQ_BGM_E_PLASMA', 'event05': 'SEQ_BGM_E_SAGE',
    # world mode
    'vs_kyurem': 'SEQ_BGM_VS_MU', 'vs_reshiram': 'SEQ_BGM_VS_SHIN', 'vs_zekrom': 'SEQ_BGM_VS_RAI',
    'vs_strong': 'SEQ_BGM_VS_TSUYOPOKE', 'vs_cynthia': 'SEQ_BGM_VS_SHIRONA', 'e_last': 'SEQ_BGM_E_LAST',
    'e_legend_born': 'SEQ_BGM_E_LEGEND_BORN_B', 'e_n_castle': 'SEQ_BGM_E_N_CASTLE', 'n_bridge': 'SEQ_BGM_N_CASTLE_BRIDGE',
    'town04_d': 'SEQ_BGM_T_04', 'town05_su': 'SEQ_BGM_T_05_SU', 'town05_wi': 'SEQ_BGM_T_05_WI', 'city03_d': 'SEQ_BGM_C_03',
    'city10_b': 'SEQ_BGM_C_10_B', 'gym': 'SEQ_BGM_GYM', 'league': 'SEQ_BGM_POKEMON_LEAGUE', 'gate': 'SEQ_BGM_GATE',
    'e_champion': 'SEQ_BGM_E_CHAMPION', 'e_g_cis': 'SEQ_BGM_E_G_CIS',
}
# keys that play the same music as another key (the DP soundtrack had day and night versions; Black has none)
SHARED = {
    **{f'town{n:02d}_n': f'town{n:02d}_d' for n in (1, 2, 3)},
    **{f'city{n:02d}_n': f'city{n:02d}_d' for n in (1, 2, 4, 5, 7, 8, 9, 11)},
    'road_a_n': 'road_a',
}
ONE_SHOT = ('fanfa', 'win_', 'ending')


def job(item):
    key, seq = item
    import ndspy.soundArchive as sa
    import sseq_render as S
    r = S.Renderer(sa.SDAT(open(SDAT, 'rb').read()))
    audio, loop = r.render(seq, loops=not key.startswith(ONE_SHOT))
    rms = float(np.sqrt((audio ** 2).mean())) or 1
    peak = float(np.abs(audio).max()) or 1
    audio = audio * min(TARGET_RMS / rms, 0.95 / peak)
    wav = os.path.join(WAV_DIR, f'{key}.wav')
    sf.write(wav, audio.astype(np.float32), S.SR, subtype='PCM_16')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', '2',
                    os.path.join(OUT_DIR, f'{key}.ogg')], check=True)
    os.remove(wav)
    meta = {'file': f'{key}.ogg', 'seq': seq, 'src': 'black', 'dur': round(len(audio) / S.SR, 3)}
    if loop:
        meta['loop'] = [round(loop[0], 4), round(loop[1], 4)]
    print(key, meta, flush=True)
    return key, meta


if __name__ == '__main__':
    import ndsfs
    os.makedirs(WAV_DIR, exist_ok=True)
    if not os.path.exists(SDAT):
        open(SDAT, 'wb').write(ndsfs.Rom(ROM).find('wb_sound_data.sdat'))
    only = set(sys.argv[1:])
    items = [(k, v) for k, v in TRACKS.items() if not only or k in only]
    meta_path = os.path.join(OUT_DIR, 'bgm.json')
    old = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    meta = {k: v for k, v in old.items() if v.get('src') == 'black'} if only else {}
    with Pool(7) as pool:
        for k, m in pool.imap_unordered(job, items):
            meta[k] = m
            json.dump(meta, open(meta_path, 'w'), indent=1)
    for k, src in SHARED.items():
        if src in meta:
            meta[k] = {**meta[src]}
    json.dump(meta, open(meta_path, 'w'), indent=1)
    # the DP renders no key points at any more
    keep = {m['file'] for m in meta.values()}
    gone = [f for f in os.listdir(OUT_DIR) if f.endswith('.ogg') and f not in keep]
    for f in gone:
        os.remove(os.path.join(OUT_DIR, f))
    print('done', len(meta), 'keys,', len(keep), 'files; removed', len(gone), 'old files')
