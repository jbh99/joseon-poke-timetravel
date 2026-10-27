"""Draw the Korean peninsula from real coordinates, stylise it with fal img2img, re-impose the coastline."""
import json
import math
import requests
from PIL import Image, ImageDraw, ImageFilter
from fal_gen import generate, upload, KEY

LON0, LON1, LAT0, LAT1 = 123.5, 132.0, 33.0, 43.0
KX = math.cos(math.radians(37.5))
OUT_W = 300  # in-game map width (px); height follows the projection
OUT_H = round(OUT_W * (LAT1 - LAT0) / ((LON1 - LON0) * KX))
COAST = [  # continent edge, then Korean coast clockwise from the Yalu mouth (lon, lat)
    (123.5, 39.55), (124.0, 39.8), (124.35, 39.9), (124.6, 39.75), (124.75, 39.6), (125.1, 39.55), (125.5, 39.55),
    (125.3, 39.3), (125.1, 39.05), (125.2, 38.85), (125.35, 38.75), (125.0, 38.6), (124.8, 38.3), (124.75, 38.15),
    (124.85, 38.05), (125.2, 38.0), (125.4, 37.88), (125.7, 37.95), (126.0, 37.75), (126.2, 37.75), (126.4, 37.85),
    (126.45, 37.6), (126.6, 37.45), (126.75, 37.2), (126.85, 36.98), (126.55, 36.95), (126.35, 36.85),
    (126.15, 36.75), (126.35, 36.6), (126.5, 36.4), (126.55, 36.15), (126.7, 35.98), (126.55, 35.75),
    (126.45, 35.55), (126.4, 35.35), (126.3, 35.1), (126.35, 34.85), (126.25, 34.6), (126.5, 34.3),
    (126.75, 34.35), (126.95, 34.45), (127.25, 34.5), (127.45, 34.6), (127.75, 34.7), (128.0, 34.85),
    (128.3, 34.85), (128.45, 34.8), (128.65, 34.75), (128.75, 35.0), (128.95, 35.05), (129.1, 35.1),
    (129.3, 35.35), (129.45, 35.6), (129.5, 35.9), (129.57, 36.08), (129.4, 36.05), (129.42, 36.35),
    (129.42, 36.75), (129.3, 37.15), (129.15, 37.45), (128.9, 37.75), (128.6, 38.2), (128.35, 38.6),
    (128.0, 38.95), (127.6, 39.1), (127.45, 39.3), (127.55, 39.65), (127.65, 39.8), (128.1, 39.95),
    (128.5, 40.2), (128.85, 40.45), (129.25, 40.7), (129.7, 41.15), (129.8, 41.75), (130.1, 41.95),
    (130.4, 42.25), (130.7, 42.3), (130.9, 42.6), (131.2, 42.75), (131.6, 42.9), (132.0, 43.1), (132.0, 43.0),
    (123.5, 43.0),
]
ISLANDS = [(126.55, 33.38, 0.38, 0.17), (130.87, 37.5, 0.05, 0.04), (131.87, 37.24, 0.025, 0.02),
           (128.62, 34.88, 0.1, 0.1), (127.9, 34.8, 0.08, 0.06), (126.27, 34.45, 0.08, 0.06),
           (126.75, 34.32, 0.06, 0.04), (126.45, 37.7, 0.08, 0.09)]
BORDER = [(124.35, 39.9), (124.9, 40.4), (125.4, 40.65), (126.0, 40.9), (126.5, 41.35), (127.3, 41.45),
          (128.0, 41.5), (128.08, 42.0), (128.6, 42.0), (129.2, 42.2), (129.8, 42.6), (130.0, 42.95),
          (130.3, 42.6), (130.7, 42.3)]
RIDGE = [(128.08, 42.0), (127.8, 41.0), (127.3, 40.3), (127.2, 39.5), (127.9, 38.8), (128.1, 38.6),
         (128.45, 38.12), (128.6, 37.8), (128.9, 37.1), (128.45, 36.95), (127.85, 36.55), (127.75, 35.85),
         (127.73, 35.33)]
RIVERS = [[(126.4, 37.6), (126.98, 37.53), (127.3, 37.55), (127.7, 37.8)],  # Han
          [(126.7, 35.98), (127.1, 36.3), (127.45, 36.5)],  # Geum
          [(128.95, 35.1), (128.7, 35.5), (128.5, 36.0), (128.3, 36.5)],  # Nakdong
          [(125.35, 38.75), (125.75, 39.0), (126.2, 39.3)]]  # Taedong


def proj(lon, lat, w, h):
    return ((lon - LON0) / (LON1 - LON0) * w, (LAT1 - lat) / (LAT1 - LAT0) * h)


def draw_base(w, h, line=1):
    im = Image.new("RGB", (w, h), (92, 150, 182))
    d = ImageDraw.Draw(im)
    d.polygon([proj(*p, w, h) for p in COAST], fill=(150, 178, 112))
    for lon, lat, rx, ry in ISLANDS:
        x, y = proj(lon, lat, w, h)
        sx, sy = rx / (LON1 - LON0) * w, ry / (LAT1 - LAT0) * h
        d.ellipse((x - sx, y - sy, x + sx, y + sy), fill=(150, 178, 112))
    north = [proj(*p, w, h) for p in BORDER] + [proj(132.0, 43.0, w, h), proj(123.5, 43.0, w, h),
                                                proj(123.5, 39.55, w, h)]
    d.polygon(north, fill=(176, 170, 128))
    d.line([proj(*p, w, h) for p in RIDGE], fill=(88, 120, 70), width=max(2, w // 60), joint="curve")
    for r in RIVERS:
        d.line([proj(*p, w, h) for p in r], fill=(92, 150, 182), width=max(1, w // 200))
    d.line([proj(*p, w, h) for p in BORDER], fill=(92, 150, 182), width=max(1, w // 160))
    return im


def coast_mask(w, h):
    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)
    d.polygon([proj(*p, w, h) for p in COAST], fill=255)
    for lon, lat, rx, ry in ISLANDS:
        x, y = proj(lon, lat, w, h)
        sx, sy = max(1.2, rx / (LON1 - LON0) * w), max(1.2, ry / (LAT1 - LAT0) * h)
        d.ellipse((x - sx, y - sy, x + sx, y + sy), fill=255)
    return m


def main():
    bw, bh = OUT_W * 2, OUT_H * 2
    base = draw_base(bw, bh)
    base.save("../work/map_base.png")
    styled = generate("worldmap_styled", "fal-ai/flux/dev/image-to-image",
                      "antique hand painted Korean Joseon dynasty map on aged hanji paper, Daedongyeojido style, "
                      "ink brush outlines, green mountain ridges drawn as small peaks, blue-green sea with fine wave "
                      "line pattern, top-down map, no text, no letters, 16-bit pixel art game world map",
                      bw, bh, extra={"image_url": upload("../work/map_base.png"), "strength": 0.6,
                                     "num_inference_steps": 30})
    W, H = OUT_W, OUT_H
    mask = coast_mask(W, H)
    hanji = Image.open("../work/mat/hanji.png").convert("RGB").resize((96, 96), Image.BOX)
    paper = Image.new("RGB", (W, H))
    for y in range(0, H, 96):
        for x in range(0, W, 96):
            paper.paste(hanji, (x, y))
    styled_img = Image.open(styled).convert("RGB").resize((W, H), Image.BOX)
    land = Image.blend(draw_base(W, H), paper, 0.35)
    land = Image.blend(land, styled_img, 0.2)
    sea = Image.new("RGB", (W, H), (82, 136, 168))
    d = ImageDraw.Draw(sea)
    for j, y in enumerate(range(4, H, 9)):
        for x in range(-6 + (j % 2) * 7, W, 14):
            d.arc((x, y, x + 7, y + 5), 200, 340, fill=(124, 176, 200))
    out = Image.composite(land, sea, mask)
    d = ImageDraw.Draw(out)
    north = [proj(*p, W, H) for p in BORDER]
    d.line(north, fill=(70, 120, 160), width=2)

    def peak(x, y, s=4, snow=False):
        d.polygon([(x - s, y + s * 0.8), (x, y - s), (x + s, y + s * 0.8)], fill=(66, 98, 58), outline=(40, 52, 34))
        if snow:
            d.polygon([(x - s * 0.35, y - s * 0.3), (x, y - s), (x + s * 0.35, y - s * 0.3)], fill=(240, 240, 230))

    pts = [proj(*p, W, H) for p in RIDGE]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(1, int(math.hypot(x1 - x0, y1 - y0) / 9))
        for k in range(n):
            t = k / n
            peak(x0 + (x1 - x0) * t + (2 if k % 2 else -2), y0 + (y1 - y0) * t)
    for lon, lat, snow in ((128.08, 42.0, True), (128.06, 38.62, False), (128.46, 38.12, False),
                           (127.73, 35.33, False), (126.53, 33.36, True)):
        peak(*proj(lon, lat, W, H), s=6, snow=snow)
    edge = mask.filter(ImageFilter.FIND_EDGES).point(lambda v: 255 if v > 40 else 0)
    out.paste((48, 40, 34), mask=edge)
    out = out.quantize(48, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    out.save("../web/assets/img/worldmap.png", optimize=True)
    json.dump({"lon0": LON0, "lon1": LON1, "lat0": LAT0, "lat1": LAT1, "w": OUT_W, "h": OUT_H},
              open("../web/assets/data/worldmap.json", "w"))
    print("map", OUT_W, OUT_H)


if __name__ == "__main__":
    main()
