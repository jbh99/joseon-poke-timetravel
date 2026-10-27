"""Render the selected DP sequences to looping OGG files + web/assets/bgm/bgm.json (loop points)."""
import json
import os
import subprocess
import sys
from multiprocessing import Pool
import numpy as np
import soundfile as sf

WAV_DIR = "../work/wav"
OUT_DIR = "../web/assets/bgm"
TRACKS = {
    "title": "SEQ_TITLE00", "opening": "SEQ_OPENING", "ending": "SEQ_BLD_ENDING", "halloffame": "SEQ_EV_DENDO1",
    "legend": "SEQ_EV_LEGEND", "pc": "SEQ_PC_01", "naminori": "SEQ_NAMINORI",
    **{f"town{n:02d}_{t}": f"SEQ_TOWN{n:02d}_{t.upper()}" for n in (1, 2, 3) for t in "dn"},
    **{f"city{n:02d}_{t}": f"SEQ_CITY{n:02d}_{t.upper()}" for n in (1, 2, 4, 5, 7, 8, 9, 11) for t in "dn"},
    "city10_d": "SEQ_CITY10_D",
    **{f"road_{r}": f"SEQ_ROAD_{r.upper()}_D" for r in ("a", "b", "c", "d", "e", "f", "snow", "bza")},
    "road_a_n": "SEQ_ROAD_A_N",
    **{f"d_{d}": f"SEQ_D_{d.upper()}" for d in ("01", "02", "03", "04", "05", "06", "mount2", "agito", "ginlobby",
                                               "lake", "safari", "ice")},
    **{f"ba_{b}": f"SEQ_BA_{b.upper()}" for b in ("poke", "train", "gym", "ginga", "akagi", "chanp", "dpoke1",
                                                 "rival", "tenno", "secret1", "dpoke2", "secret2")},
    "win_poke": "SEQ_WINPOKE", "win_gym": "SEQ_WINTGYM", "win_champ": "SEQ_WINCHAMP",
    **{f"fanfa{i}": f"SEQ_FANFA{i}" for i in range(1, 7)},
    **{f"event{i:02d}": f"SEQ_THE_EVENT0{i}" for i in range(1, 6)},
}
TARGET_RMS = 0.12


def job(item):
    key, seq = item
    import sseq_render as S
    r = S.Renderer()
    audio, loop = r.render(seq)
    rms = float(np.sqrt((audio ** 2).mean())) or 1
    peak = float(np.abs(audio).max()) or 1
    audio = audio * min(TARGET_RMS / rms, 0.95 / peak)
    wav = f"{WAV_DIR}/{key}.wav"
    sf.write(wav, audio.astype(np.float32), S.SR, subtype="PCM_16")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "libvorbis", "-q:a", "2",
                    f"{OUT_DIR}/{key}.ogg"], check=True)
    meta = {"file": f"{key}.ogg", "seq": seq, "dur": round(len(audio) / S.SR, 3)}
    if loop:
        meta["loop"] = [round(loop[0], 4), round(loop[1], 4)]
    print(key, meta, flush=True)
    return key, meta


if __name__ == "__main__":
    os.makedirs(WAV_DIR, exist_ok=True)
    only = set(sys.argv[1:])
    items = [(k, v) for k, v in TRACKS.items() if not only or k in only]
    meta_path = f"{OUT_DIR}/bgm.json"
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    with Pool(7) as pool:
        for k, m in pool.imap_unordered(job, items):
            meta[k] = m
            json.dump(meta, open(meta_path, "w"), indent=1)
    print("done", len(meta))
