"""Procedural Joseon buildings & ships rendered in Blender (Workbench) for the game's 3/4 top-down view.

Run: blender --background --python blender_build.py -- <mat_dir> <out_dir> [names...]
World units are game tiles (1 unit = 24 px). x = east, y = north, z = up. Footprint starts at (0, 0).
"""
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

ARGS = sys.argv[sys.argv.index("--") + 1:]
MAT_DIR, OUT_DIR = ARGS[0], ARGS[1]
ONLY = set(ARGS[2:])
ELEV = math.radians(50)
PPU = 96  # render pixels per unit (4x supersampling of 24 px)

_mats = {}


def material(name, color=None, tex=None, scale=1.0):
    key = (name, tex, color)
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    node = nt.nodes.new("ShaderNodeTexImage")
    if tex:
        node.image = bpy.data.images.load(os.path.join(MAT_DIR, tex + ".png"), check_existing=True)
    else:
        img = bpy.data.images.new(name + "_c", 4, 4)
        img.pixels[:] = list(color) * 16
        node.image = img
    nt.links.new(node.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 1.0
    for k in ("Specular IOR Level", "Specular"):
        if k in bsdf.inputs:
            bsdf.inputs[k].default_value = 0.0
    nt.nodes.active = node
    m["uv_scale"] = scale
    _mats[key] = m
    return m


def rgb(h, k=1.0):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 * k for i in (0, 2, 4)) + (1.0,)


def link(bm, mat, name="part"):
    me = bpy.data.meshes.new(name)
    uv = bm.loops.layers.uv.verify()
    s = mat.get("uv_scale", 1.0)
    bm.normal_update()
    for f in bm.faces:
        n = f.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            c = lp.vert.co
            lp[uv].uv = ((c.x, c.y) if ax == 2 else (c.x, c.z) if ax == 1 else (c.y, c.z))
            lp[uv].uv = (lp[uv].uv[0] * s, lp[uv].uv[1] * s)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def box(x0, y0, z0, x1, y1, z1, mat):
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, z)) for z in (z0, z1) for y in (y0, y1) for x in (x0, x1)]
    for f in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
        bm.faces.new([vs[i] for i in f])
    return link(bm, mat, "box")


def cyl(x, y, z0, z1, r, mat, seg=10):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=z1 - z0)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(x, y, (z0 + z1) / 2))
    return link(bm, mat, "cyl")


def cone(x, y, z0, h, r, mat, seg=8):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=0.001, depth=h)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(x, y, z0 + h / 2))
    return link(bm, mat, "cone")


def hip_roof(x0, y0, x1, y1, z, h, mat, lift=0.25, ridge_frac=0.45, bulge=0.0, n=12):
    """Hip roof with upturned Korean eaves (lift) or a rounded thatch profile (bulge)."""
    bm = bmesh.new()
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    hw, hd = (x1 - x0) / 2, (y1 - y0) / 2
    rw = max(0.05, hw - hd * (1 - ridge_frac))

    def eave(t, side):  # t in [-1, 1] along the edge
        corner = abs(t) ** 2.5
        zz = z + lift * corner
        if side in "ns":
            return Vector((cx + t * hw, cy + (hd if side == "n" else -hd), zz))
        return Vector((cx + (hw if side == "e" else -hw), cy + t * hd, zz))

    rows = 4
    for side in "nsew":
        prev = None
        for i in range(n + 1):
            t = -1 + 2 * i / n
            e = eave(t, side)
            if side in "ns":
                r = Vector((cx + max(-rw, min(rw, t * hw)), cy, z + h))
            else:
                r = Vector((cx + (rw if side == "e" else -rw), cy, z + h))
            col = []
            for k in range(rows + 1):
                f = k / rows
                p = e.lerp(r, f)
                p.z += bulge * math.sin(math.pi * f) * h
                col.append(bm.verts.new(p))
            if prev:
                for k in range(rows):
                    q = [prev[k], col[k], col[k + 1], prev[k + 1]]
                    if side in "se":
                        q.reverse()
                    try:
                        bm.faces.new(q)
                    except ValueError:
                        pass
            prev = col
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    ob = link(bm, mat, "roof")
    return ob, (cx - rw, cx + rw, cy, z + h)


def ridge(xa, xb, y, z, mat, t=0.12, up=0.18):
    box(xa, y - t, z - t / 2, xb, y + t, z + t, mat)
    for x in (xa, xb):
        box(x - t, y - t, z, x + t, y + t, z + up + t, mat)


# ---------------------------------------------------------------- materials
def mats():
    return dict(
        sun=None,
        giwa=material("giwa", tex="giwa", scale=1.6), thatch=material("thatch", tex="thatch", scale=1.2),
        plaster=material("plaster", tex="plaster", scale=0.8), planks=material("planks", tex="planks", scale=0.8),
        granite=material("granite", tex="granite", scale=0.7), brick=material("brick", tex="brick", scale=0.9),
        dancheong=material("dancheong", tex="dancheong", scale=1.5), hanji=material("hanji", tex="hanji"),
        snow=material("snowroof", tex="snow", scale=0.5), slate=material("slate", tex="slate", scale=1.2),
        shell=material("shell", tex="hexshell", scale=1.4),
        red=material("red", rgb("#a3322a")), wood=material("wood", rgb("#6b4429")),
        dark=material("dark", rgb("#2b2522")), roofcap=material("roofcap", rgb("#3a3a40")),
        green=material("green", rgb("#3f7f5e")), window=material("window", rgb("#e9dcb6")),
        glass=material("glass", rgb("#36506a")), sail=material("sail", rgb("#c8b38a")),
        cloth=material("cloth", rgb("#d9cfb4")), gold=material("gold", rgb("#d4a537")),
        white=material("white", rgb("#ece8de")),
    )


# ---------------------------------------------------------------- models
def hanok(M, w=5, d=3, wall_h=1.45, roof="giwa", lift=0.3, big=False):
    base = 0.45 if big else 0.25
    box(0.1, 0.2, 0, w - 0.1, d - 0.2, base, M["granite"])
    box(0.5, 0.5, base, w - 0.5, d - 0.5, base + wall_h, M["plaster"])
    n = max(2, int(w - 1))
    for i in range(n + 1):
        x = 0.5 + (w - 1) * i / n
        cyl(x, 0.48, base, base + wall_h, 0.09, M["red" if big else "wood"])
    box(0.5, 0.47, base + wall_h - 0.15, w - 0.5, 0.5, base + wall_h, M["dancheong" if big else "wood"])
    for i in range(n):  # lattice doors
        x = 0.5 + (w - 1) * (i + 0.5) / n
        box(x - 0.28, 0.46, base + 0.08, x + 0.28, 0.49, base + wall_h - 0.25, M["window"])
    top = base + wall_h
    if roof == "thatch":
        hip_roof(0.25, 0.3, w - 0.25, d - 0.1, top - 0.05, 0.75, M["thatch"], lift=0.0, ridge_frac=0.6, bulge=0.35)
    else:
        rm = M["snow"] if roof == "snow" else M["giwa"]
        _, (ra, rb, ry, rz) = hip_roof(0.05, 0.2, w - 0.05, d + 0.05, top - 0.05, 0.95 if big else 0.7, rm,
                                       lift=lift)
        ridge(ra, rb, ry, rz, M["white" if roof == "snow" else "roofcap"])


def choga(M):
    hanok(M, w=4, d=3, wall_h=0.95, roof="thatch")


def palace(M, w=8, d=5):
    box(0, 0, 0, w, d, 0.35, M["granite"])
    box(0.4, 0.4, 0.35, w - 0.4, d - 0.4, 0.7, M["granite"])
    box(w / 2 - 0.8, -0.1, 0, w / 2 + 0.8, 0.45, 0.6, M["granite"])  # steps
    z = 0.7
    box(1.0, 1.0, z, w - 1.0, d - 1.0, z + 1.6, M["planks"])
    for i in range(7):
        x = 1.0 + (w - 2) * i / 6
        cyl(x, 0.95, z, z + 1.6, 0.11, M["red"])
    box(1.0, 0.92, z + 1.35, w - 1.0, 0.97, z + 1.6, M["dancheong"])
    for i in range(6):
        x = 1.0 + (w - 2) * (i + 0.5) / 6
        box(x - 0.35, 0.93, z + 0.1, x + 0.35, 0.96, z + 1.2, M["window"])
    hip_roof(0.3, 0.3, w - 0.3, d - 0.3, z + 1.55, 0.6, M["giwa"], lift=0.35, ridge_frac=0.2)
    box(1.4, 1.4, z + 2.0, w - 1.4, d - 1.4, z + 2.6, M["dancheong"])
    _, (ra, rb, ry, rz) = hip_roof(0.7, 0.8, w - 0.7, d - 0.8, z + 2.55, 1.2, M["giwa"], lift=0.35)
    ridge(ra, rb, ry, rz, M["roofcap"])


def gate(M, w=7, d=2.2, arches=3, tiers=2):
    box(0, 0, 0, w, d, 1.7, M["granite"])
    for i in range(arches):
        x = w * (i + 0.5) / arches
        aw = 0.55 if arches > 1 else 0.7
        box(x - aw, -0.02, 0, x + aw, 0.1, 1.05, M["dark"])
        cyl(x, 0.04, 1.05, 1.06, aw, M["dark"], seg=16)
        bpy.context.object  # noqa
    z = 1.7
    box(0.8, 0.5, z, w - 0.8, d - 0.5, z + 0.9, M["planks"])
    for i in range(6):
        cyl(0.8 + (w - 1.6) * i / 5, 0.45, z, z + 0.9, 0.08, M["red"])
    box(0.8, 0.42, z + 0.7, w - 0.8, 0.46, z + 0.9, M["dancheong"])
    if tiers == 2:
        hip_roof(0.2, -0.1, w - 0.2, d + 0.1, z + 0.85, 0.45, M["giwa"], lift=0.3, ridge_frac=0.25)
        box(1.3, 0.6, z + 1.2, w - 1.3, d - 0.6, z + 1.65, M["dancheong"])
        _, (ra, rb, ry, rz) = hip_roof(0.6, 0.2, w - 0.6, d - 0.2, z + 1.6, 0.9, M["giwa"], lift=0.3)
    else:
        _, (ra, rb, ry, rz) = hip_roof(0.3, -0.1, w - 0.3, d + 0.1, z + 0.85, 0.95, M["giwa"], lift=0.3)
    ridge(ra, rb, ry, rz, M["roofcap"])


def fortgate(M):
    gate(M, w=5, d=2.2, arches=1, tiers=1)


def wallseg(M, snow=False):
    box(0, 0.15, 0, 1, 0.85, 1.25, M["granite"])
    for i in range(2):
        box(0.05 + i * 0.5, 0.1, 1.25, 0.45 + i * 0.5, 0.35, 1.6, M["snow" if snow else "granite"])
    box(0, 0.35, 1.24, 1, 0.85, 1.27, M["snow" if snow else "planks"])


def western(M, w=5, d=3):
    box(0, 0, 0, w, d, 0.2, M["granite"])
    box(0.3, 0.3, 0.2, w - 0.3, d - 0.3, 2.3, M["brick"])
    for fl in (0, 1):
        for i in range(4):
            x = 0.3 + (w - 0.6) * (i + 0.5) / 4
            z = 0.45 + fl * 1.0
            box(x - 0.22, 0.27, z, x + 0.22, 0.31, z + 0.6, M["white"])
            box(x - 0.16, 0.26, z + 0.06, x + 0.16, 0.3, z + 0.54, M["glass"])
    box(0.3, 0.26, 1.25, w - 0.3, 0.32, 1.33, M["white"])
    box(w / 2 - 0.35, 0.22, 0.2, w / 2 + 0.35, 0.3, 1.05, M["wood"])
    hip_roof(0.1, 0.1, w - 0.1, d - 0.1, 2.3, 0.8, M["slate"], lift=0.0, ridge_frac=0.5)


def pavilion8(M):
    r = 1.3
    cx = cy = 1.5
    cyl(cx, cy, 0, 0.35, r + 0.1, M["granite"], seg=8)
    for i in range(8):
        a = math.tau * i / 8 + math.pi / 8
        cyl(cx + math.cos(a) * r * 0.85, cy + math.sin(a) * r * 0.85, 0.35, 1.5, 0.07, M["red"])
    cyl(cx, cy, 1.35, 1.55, r * 0.95, M["dancheong"], seg=8)
    cone(cx, cy, 1.5, 0.5, r + 0.45, M["giwa"], seg=8)
    cyl(cx, cy, 1.95, 2.0, r * 0.7, M["roofcap"], seg=8)
    cone(cx, cy, 1.95, 0.75, r * 0.85, M["giwa"], seg=8)
    cyl(cx, cy, 2.65, 2.9, 0.08, M["gold"])


def stall(M):
    for x in (0.2, 1.8):
        for y in (0.3, 1.5):
            cyl(x, y, 0, 1.1, 0.05, M["wood"])
    box(0.15, 0.25, 0.45, 1.85, 1.0, 0.55, M["planks"])
    hip_roof(-0.1, 0.1, 2.1, 1.7, 1.05, 0.45, M["cloth"], lift=0.08, ridge_frac=0.9)


def hull(bm_len, width, height, z0=0.0):
    """Flat-bottomed Korean hull: a box tapered at bow (east) and stern (west)."""
    bm = bmesh.new()
    sec = 10
    rings = []
    for i in range(sec + 1):
        t = i / sec
        x = t * bm_len
        taper = 1 - (abs(t - 0.5) * 2) ** 3 * 0.55
        hw = width / 2 * taper
        zb = z0 + 0.15 * (abs(t - 0.5) * 2) ** 2
        zt = z0 + height + 0.25 * (abs(t - 0.5) * 2) ** 2
        rings.append([bm.verts.new(v) for v in ((x, -hw * 0.75, zb), (x, hw * 0.75, zb), (x, hw, zt), (x, -hw, zt))])
    for a, b in zip(rings, rings[1:]):
        for k in range(4):
            bm.faces.new([a[k], b[k], b[(k + 1) % 4], a[(k + 1) % 4]])
    bm.faces.new(rings[0][::-1])
    bm.faces.new(rings[-1])
    return bm


def geobukseon(M):
    L, W = 6.0, 2.0
    link(hull(L, W, 0.6), M["planks"], "hull")
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=8, radius=1.0)
    for v in bm.verts:
        v.co.z = max(v.co.z, 0)
    bmesh.ops.scale(bm, vec=(L * 0.42, W * 0.48, 0.7), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(L / 2, 0, 0.6), verts=bm.verts)
    link(bm, M["shell"], "shell")
    for i in range(9):  # iron spikes along the shell
        for s in (-1, 1):
            x = L * 0.18 + i * L * 0.075
            cone(x, s * 0.45, 1.0, 0.18, 0.04, M["dark"], seg=4)
    box(L - 0.05, -0.28, 0.55, L + 0.6, 0.28, 1.15, M["red"])  # dragon head
    box(L + 0.35, -0.2, 1.0, L + 0.65, 0.2, 1.25, M["gold"])
    for i in range(8):
        x = L * 0.2 + i * L * 0.08
        box(x - 0.03, -W / 2 - 0.55, 0.35, x + 0.03, -W / 2 + 0.1, 0.42, M["wood"])
        box(x - 0.03, W / 2 - 0.1, 0.35, x + 0.03, W / 2 + 0.55, 0.42, M["wood"])


def panokseon(M):
    L, W = 7.0, 2.6
    link(hull(L, W, 0.7), M["planks"], "hull")
    box(L * 0.2, -W * 0.38, 0.7, L * 0.82, W * 0.38, 1.25, M["planks"])  # upper deck house
    box(L * 0.2, -W * 0.39, 1.15, L * 0.82, W * 0.39, 1.3, M["red"])
    box(L * 0.35, -0.5, 1.3, L * 0.6, 0.5, 1.75, M["planks"])  # command pavilion
    hip_roof(L * 0.33, -0.65, L * 0.62, 0.65, 1.75, 0.35, M["giwa"], lift=0.12)
    for mx in (L * 0.3, L * 0.68):
        cyl(mx, 0, 1.3, 3.6, 0.05, M["wood"])
        box(mx - 0.75, -0.05, 2.0, mx + 0.75, 0.05, 3.4, M["sail"])
        for k in range(5):
            box(mx - 0.77, -0.07, 2.05 + k * 0.33, mx + 0.77, -0.04, 2.09 + k * 0.33, M["wood"])
    for i in range(10):
        x = L * 0.15 + i * L * 0.07
        for s in (-1, 1):
            box(x - 0.03, min(s * (W / 2 + 0.6), s * W / 2), 0.45, x + 0.03, max(s * (W / 2 + 0.6), s * W / 2), 0.5,
                M["wood"])


def boat(M):
    link(hull(2.6, 1.0, 0.35), M["planks"], "hull")
    box(0.9, -0.3, 0.35, 1.7, 0.3, 0.38, M["wood"])


MODELS = {
    "hanok": (lambda M: hanok(M), (5, 3)),
    "hanok_snow": (lambda M: hanok(M, roof="snow"), (5, 3)),
    "hanok_hall": (lambda M: hanok(M, w=7, d=4, wall_h=1.4, big=True, lift=0.38), (7, 4)),
    "choga": (choga, (4, 3)),
    "palace": (palace, (8, 5)),
    "gate": (gate, (7, 2.2)),
    "fortgate": (fortgate, (5, 2.2)),
    "wallseg": (wallseg, (1, 1)),
    "wallseg_snow": (lambda M: wallseg(M, True), (1, 1)),
    "western": (western, (5, 3)),
    "pavilion8": (pavilion8, (3, 3)),
    "stall": (stall, (2, 2)),
    "geobukseon": (geobukseon, (7, 2)),
    "panokseon": (panokseon, (8, 3)),
    "boat": (boat, (3, 1)),
}


def setup_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sh = sc.display.shading
    sh.light = "STUDIO"
    sh.studio_light = os.environ.get("REA_STUDIO", "paint.sl")
    sh.use_world_space_lighting = True
    sh.studiolight_rotate_z = math.radians(float(os.environ.get("REA_ROT", "-30")))
    sh.color_type = "TEXTURE"
    sh.show_shadows = True
    sh.shadow_intensity = 0.3
    sh.show_cavity = True
    sh.cavity_type = "WORLD"
    sh.cavity_ridge_factor = 0.6
    sh.cavity_valley_factor = 0.8
    sh.show_object_outline = True
    sh.object_outline_color = (0.12, 0.09, 0.08)
    sc.display.light_direction = (-0.4, -0.5, 0.75)
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.resolution_percentage = 100
    sc.view_settings.view_transform = "Standard"
    return sc


def render(name, build, footprint):
    sc = setup_scene()
    _mats.clear()
    M = mats()
    build(M)
    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    cam = bpy.data.objects.new("cam", cam_data)
    sc.collection.objects.link(cam)
    sc.camera = cam
    cam.rotation_euler = (math.pi / 2 - ELEV, 0, 0)
    cam.location = (footprint[0] / 2, -20 * math.cos(ELEV), 20 * math.sin(ELEV))
    bpy.context.view_layer.update()
    inv = cam.matrix_world.inverted()
    pts = []
    for ob in sc.objects:
        if ob.type == "MESH":
            pts += [inv @ (ob.matrix_world @ v.co) for v in ob.data.vertices]
    pad = 0.15
    x0, x1 = min(p.x for p in pts) - pad, max(p.x for p in pts) + pad
    y0, y1 = min(p.y for p in pts) - pad, max(p.y for p in pts) + pad
    rx, ry = x1 - x0, y1 - y0
    cam_data.ortho_scale = max(rx, ry)
    cam.location = cam.matrix_world @ Vector(((x0 + x1) / 2, (y0 + y1) / 2, 0))
    sc.render.resolution_x = round(rx * PPU)
    sc.render.resolution_y = round(ry * PPU)
    bpy.context.view_layer.update()
    anchor = cam.matrix_world.inverted() @ Vector((0, 0, 0))
    ax = (anchor.x + rx / 2) / rx * sc.render.resolution_x
    ay = (ry / 2 - anchor.y) / ry * sc.render.resolution_y
    sc.render.filepath = os.path.join(OUT_DIR, name + ".png")
    bpy.ops.render.render(write_still=True)
    return {"anchor_px": [ax, ay], "res": [sc.render.resolution_x, sc.render.resolution_y],
            "footprint": list(footprint), "elev": math.degrees(ELEV)}


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    meta_path = os.path.join(OUT_DIR, "meta.json")
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    for name, (build, fp) in MODELS.items():
        if ONLY and name not in ONLY:
            continue
        meta[name] = render(name, build, fp)
        json.dump(meta, open(meta_path, "w"), indent=1)
        print("rendered", name, meta[name]["res"])


main()
