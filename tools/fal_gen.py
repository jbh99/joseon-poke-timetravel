"""fal.ai image generation with a hard spend cap and a local ledger (work/fal_ledger.json)."""
import json
import os
import sys
import time
import threading
import requests

_LOCK = threading.Lock()

KEY = open(os.path.join(os.path.dirname(__file__), "..", ".fal_key")).read().strip()
LEDGER = os.path.join(os.path.dirname(__file__), "..", "work", "fal_ledger.json")
RAW_DIR = os.path.join(os.path.dirname(__file__), "..", "work", "fal_raw")
CAP_USD = 4.50
PRICE = {  # from https://api.fal.ai/v1/models/pricing (checked 2026-10-27)
    "fal-ai/flux/schnell": ("mp", 0.003),
    "fal-ai/flux/dev": ("mp", 0.025),
    "fal-ai/flux/dev/image-to-image": ("mp", 0.03),
    "fal-ai/recraft/v3/text-to-image": ("img", 0.04),
}


def ledger():
    if os.path.exists(LEDGER):
        return json.load(open(LEDGER))
    return {"total": 0.0, "items": []}


def cost_of(model, w, h):
    unit, p = PRICE[model]
    if unit == "img":
        return p
    # fal bills megapixel models rounded up to the next whole megapixel; estimate conservatively.
    return p * max(1, -(-(w * h) // 1_000_000))


def generate(name, model, prompt, w=1024, h=1024, extra=None, force=False):
    """Generate one image; returns local PNG path. Skips if already generated."""
    os.makedirs(RAW_DIR, exist_ok=True)
    path = os.path.join(RAW_DIR, f"{name}.png")
    if os.path.exists(path) and not force:
        return path
    est = cost_of(model, w, h)
    with _LOCK:
        led = ledger()
        reserved = led["total"] + led.get("pending", 0)
        if reserved + est > CAP_USD:
            raise RuntimeError(f"spend cap reached: {reserved:.3f} + {est:.3f} > {CAP_USD}")
        led["pending"] = round(led.get("pending", 0) + est, 5)
        json.dump(led, open(LEDGER, "w"), indent=1, ensure_ascii=False)
    body = {"prompt": prompt, "image_size": {"width": w, "height": h}, "num_images": 1}
    if model.startswith("fal-ai/flux"):
        body["enable_safety_checker"] = False
        body["output_format"] = "png"
    body.update(extra or {})
    for attempt in range(3):
        r = requests.post(f"https://fal.run/{model}", json=body,
                          headers={"Authorization": f"Key {KEY}"}, timeout=300)
        if r.status_code == 200:
            break
        print("fal error", r.status_code, r.text[:300], file=sys.stderr)
        time.sleep(3)
    r.raise_for_status()
    url = r.json()["images"][0]["url"]
    img = requests.get(url, timeout=120).content
    open(path, "wb").write(img)
    with _LOCK:
        led = ledger()
        led["pending"] = round(led.get("pending", 0) - est, 5)
        led["total"] = round(led["total"] + est, 5)
        led["items"].append({"name": name, "model": model, "w": w, "h": h, "usd": round(est, 5), "prompt": prompt})
        json.dump(led, open(LEDGER, "w"), indent=1, ensure_ascii=False)
    print(f"[fal] {name} {model} {w}x{h} ${est:.4f} (total ${led['total']:.3f})", flush=True)
    return path


def upload(path):
    """Inline a local image as a data URI for image-to-image endpoints."""
    import base64
    return "data:image/png;base64," + base64.b64encode(open(path, "rb").read()).decode()
