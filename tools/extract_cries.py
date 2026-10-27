"""Decode DP cry waves (WAVE_ARC_PV###) to small mono OGG files."""
import re
import subprocess
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import soundfile as sf
import ndspy.soundArchive as sa
from romlib import rom
from sseq_render import decode_swav


def main():
    s = sa.SDAT(rom().getFileByName("data/sound/sound_data.sdat"))
    jobs = []
    # The archive's slot is the national dex number. Names only match it up to #386: Gen 4 species keep
    # development numbers (Turtwig sits in slot 387 as WAVE_ARC_PV432), so the name must not be used.
    for sp, (name, arc) in enumerate(s.waveArchives):
        if not re.fullmatch(r"WAVE_ARC_PV\d{3}", name or "") or not 1 <= sp <= 493 or not arc.waves:
            continue
        samples, _, rate = decode_swav(arc.waves[0])
        wav = f"../work/wav/cry{sp}.wav"
        sf.write(wav, (samples / max(1e-6, np.abs(samples).max()) * 0.8).astype(np.float32), rate, subtype="PCM_16")
        jobs.append((wav, f"../web/assets/cry/{sp}.ogg"))
    with ThreadPoolExecutor(6) as ex:
        list(ex.map(lambda j: subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", j[0], "-c:a", "libvorbis",
                                              "-q:a", "3", j[1]], check=True), jobs))
    print("cries", len(jobs))


if __name__ == "__main__":
    main()
