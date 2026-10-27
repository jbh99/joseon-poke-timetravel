"""Cut fal 2x2 texture sheets into seamless materials: work/mat (for Blender) and web/assets/tiles (game)."""
import os
import numpy as np
from PIL import Image

RAW = "../work/fal_raw"
MAT = "../work/mat"
TILES = "../web/assets/tiles"
SHEETS = {
    "tex_ground_a": ["dirt", "grass", "flagstone", "water"],
    "tex_ground_b": ["snow", "sand", "leaves", "woodfloor"],
    "tex_mats_a": ["giwa", "thatch", "plaster", "planks"],
    "tex_mats_b": ["granite", "brick", "dancheong", "hanji"],
    "tex_dun_1": ["mtpath", "boulders", "forestpath", "pinecanopy"],
    "tex_dun_2": ["libfloor", "bookshelf", "shoal", "searocks"],
    "tex_dun_3": ["sea", "snowstone", "snowwall", "ice"],
    "tex_dun_4": ["quarry", "cutgranite", "fortground", "rampart"],
    "tex_dun_5": ["iron", "pipebrick", "cobble", "slate"],
    "tex_dun_6": ["birchfloor", "birchcanopy", "crystal", "void"],
}
# inner crop (fractions of the quadrant) where the generated quadrant is not uniform
CROP = {"mtpath": (0.38, 0.3, 0.62, 0.7), "forestpath": (0.38, 0.3, 0.62, 0.7), "libfloor": (0.3, 0.45, 0.7, 0.85),
        "bookshelf": (0.1, 0.02, 0.9, 0.22), "quarry": (0.3, 0.3, 0.7, 0.7), "fortground": (0.3, 0.35, 0.7, 0.75),
        "birchfloor": (0.3, 0.6, 0.7, 0.95), "crystal": (0.05, 0.75, 0.45, 0.98), "birchcanopy": (0.0, 0.0, 1.0, 0.35),
        "rampart": (0.05, 0.05, 0.95, 0.3), "void": (0.0, 0.0, 0.5, 0.4), "boulders": (0.1, 0.1, 0.9, 0.9)}
DEFAULT_CROP = (0.16, 0.16, 0.84, 0.84)


def seamless(a):
    h, w = a.shape[:2]
    b = np.roll(a, (h // 2, w // 2), (0, 1))
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.minimum(np.minimum(xx, w - 1 - xx) / (w / 2), np.minimum(yy, h - 1 - yy) / (h / 2))
    m = np.clip(d * 1.6, 0, 1)[..., None]
    return a * m + b * (1 - m)


def quantize(img, colors):
    return img.convert("RGB").quantize(colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")


def main():
    os.makedirs(MAT, exist_ok=True)
    os.makedirs(TILES, exist_ok=True)
    for sheet, names in SHEETS.items():
        im = Image.open(f"{RAW}/{sheet}.png").convert("RGB")
        W, H = im.size
        for q, name in enumerate(names):
            qx, qy = (q % 2) * W // 2, (q // 2) * H // 2
            x0, y0, x1, y1 = CROP.get(name, DEFAULT_CROP)
            box = (qx + int(x0 * W / 2), qy + int(y0 * H / 2), qx + int(x1 * W / 2), qy + int(y1 * H / 2))
            crop = im.crop(box)
            side = min(crop.size)
            crop = crop.resize((side, side), Image.LANCZOS)
            mat = seamless(np.asarray(crop.resize((256, 256), Image.LANCZOS), np.float32))
            Image.fromarray(mat.clip(0, 255).astype(np.uint8)).save(f"{MAT}/{name}.png")
            small = Image.fromarray(seamless(np.asarray(crop.resize((72, 72), Image.BOX), np.float32))
                                    .clip(0, 255).astype(np.uint8))
            quantize(small, 16).save(f"{TILES}/{name}.png", optimize=True)
    print("ok")


if __name__ == "__main__":
    main()
