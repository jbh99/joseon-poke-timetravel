"""Post-process Blender renders, fal prop sheets and era art into game-ready sprites."""
import json
import math
import os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

BL = "../work/blender"
RAW = "../work/fal_raw"
WEB = "../web/assets"
TILE = 24
PROPS = {  # sheet: [(name, target height px) per quadrant] ; None = skip
    "prop_trees": [("maple", 52), ("persimmon", 52), ("cherry", 52), ("bamboo", 48)],
    "prop_village": [("jars", 30), ("lantern", 30), ("board", 34), ("logs", 26)],
    "prop_winter": [("snowpine", 54), None, ("pagoda", 58), ("baretree", 50)],
    "prop_modern": [("tram", 46), ("pole", 60), ("lamp", 50), ("rickshaw", 34)],
    "prop_camp": [("tent", 44), ("campfire", 30), ("crates", 30), ("tower", 66)],
}


def outline(img, color=(28, 22, 20, 255)):
    a = np.asarray(img)[..., 3] > 0
    grow = ndimage.binary_dilation(a, structure=[[0, 1, 0], [1, 1, 1], [0, 1, 0]]) & ~a
    out = np.asarray(img).copy()
    out[grow] = color
    return Image.fromarray(out)


def finish(img, colors=40, edge=True):
    """Hard alpha, limited palette, optional dark outline."""
    arr = np.asarray(img.convert("RGBA")).copy()
    alpha = arr[..., 3] >= 128
    rgb = Image.fromarray(arr[..., :3]).quantize(colors, method=Image.Quantize.MEDIANCUT,
                                                  dither=Image.Dither.NONE).convert("RGB")
    out = np.dstack([np.asarray(rgb), np.where(alpha, 255, 0).astype(np.uint8)])
    im = Image.fromarray(out.astype(np.uint8))
    return outline(im) if edge else im


def buildings():
    meta = json.load(open(f"{BL}/meta.json"))
    out = {}
    os.makedirs(f"{WEB}/bld", exist_ok=True)
    for name, m in meta.items():
        im = Image.open(f"{BL}/{name}.png").convert("RGBA")
        sy = 4 * math.sin(math.radians(m["elev"]))
        w, h = round(im.width / 4), round(im.height / sy)
        small = im.resize((w, h), Image.LANCZOS)
        finish(small, 48, edge=False).save(f"{WEB}/bld/{name}.png", optimize=True)
        ax, ay = m["anchor_px"]
        out[name] = {"w": w, "h": h, "ax": round(ax / 4), "ay": round(ay / sy), "fw": m["footprint"][0],
                     "fd": m["footprint"][1]}
    json.dump(out, open(f"{WEB}/data/buildings.json", "w"), indent=1)


def props():
    os.makedirs(f"{WEB}/prop", exist_ok=True)
    for sheet, items in PROPS.items():
        im = Image.open(f"{RAW}/{sheet}.png").convert("RGB")
        a = np.asarray(im).astype(int)
        fg = (np.abs(a - 255).sum(2) > 45)
        fg = ndimage.binary_opening(fg, iterations=2)
        H, W = fg.shape
        for q, item in enumerate(items):
            if not item:
                continue
            name, th = item
            qs = (slice((q // 2) * H // 2, (q // 2 + 1) * H // 2), slice((q % 2) * W // 2, (q % 2 + 1) * W // 2))
            lab, n = ndimage.label(fg[qs])
            sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
            keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > sizes.max() * 0.08])
            keep = ndimage.binary_fill_holes(keep)
            ys, xs = np.nonzero(keep)
            crop = np.asarray(im)[qs][ys.min():ys.max() + 1, xs.min():xs.max() + 1]
            mask = keep[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
            rgba = np.dstack([crop, (mask * 255).astype(np.uint8)])
            sprite = Image.fromarray(rgba)
            tw = max(1, round(sprite.width * th / sprite.height))
            finish(sprite.resize((tw, th), Image.LANCZOS), 24).save(f"{WEB}/prop/{name}.png", optimize=True)


def era_art():
    os.makedirs(f"{WEB}/img", exist_ok=True)
    for f in os.listdir(RAW):
        if not f.startswith("art_"):
            continue
        im = Image.open(f"{RAW}/{f}").convert("RGB")
        tw, th = 480, 270
        s = max(tw / im.width, th / im.height)
        im = im.resize((round(im.width * s), round(im.height * s)), Image.BOX)
        x0, y0 = (im.width - tw) // 2, (im.height - th) // 2
        im = im.crop((x0, y0, x0 + tw, y0 + th))
        im = im.quantize(48, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
        im.save(f"{WEB}/img/{f[4:]}", optimize=True)


if __name__ == "__main__":
    buildings()
    props()
    era_art()
    print("ok")
