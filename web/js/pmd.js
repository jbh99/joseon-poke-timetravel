// PMD Blue Rescue Team graphics (exported by tools/pmd/extract_pmd.py): 8-direction sprites, portraits, dungeon chunk sets.
import { G, img, ready, failed, loadJSON, loadImages } from './core.js';

let INDEX = { spr: [], kao: [], tiles: [] };
let HAVE = { spr: new Set(), kao: new Set(), tiles: new Set() };
export async function initPmd() {
  INDEX = await loadJSON('data/pmd.json');
  HAVE = { spr: new Set(INDEX.spr), kao: new Set(INDEX.kao), tiles: new Set(INDEX.tiles) };
}
export const hasPmdSprite = (sp) => HAVE.spr.has(sp);
export const hasPortrait = (sp) => HAVE.kao.has(sp);

// game facing [dx, dy] -> PMD direction (0 S, 1 SE, 2 E, 3 NE, 4 N, 5 NW, 6 W, 7 SW)
const DIR = { '0,1': 0, '1,1': 1, '1,0': 2, '1,-1': 3, '0,-1': 4, '-1,-1': 5, '-1,0': 6, '-1,1': 7 };
export const pmdDir = (f) => (Array.isArray(f) ? DIR[`${Math.sign(f[0])},${Math.sign(f[1])}`] ?? 0
  : { down: 0, right: 2, up: 4, left: 6 }[f] ?? 0);

// A sheet and its frame data, asked for again on every use while either is missing: core.js retries a failed file
// (1.16; a Pokémon whose sheet or frame data had failed once was not drawn for the rest of the session). failed: the
// last try for the frame data failed (pmdFailed: town.js drawMon draws the box icon meanwhile)
const sprites = new Map();
function sprite(sp) {
  let s = sprites.get(sp);
  if (!s) { s = { meta: null, im: null, shiny: null, png: `pmd/spr/${sp}.png`, json: `pmd/spr/${sp}.json` }; sprites.set(sp, s); }
  else if (s.meta && ready(s.im)) return s;
  s.im = img(s.png);
  if (!s.meta && !s.asking) {
    s.asking = true;
    loadJSON(s.json).then((m) => { s.meta = m; s.failed = false; }, () => { s.failed = true; }).finally(() => { s.asking = false; });
  }
  return s;
}
// a sheet that cannot be had for now (its picture's or frame data's round of retries is over): town.js drawMon draws
// the box icon meanwhile instead of nothing. Asking is a use, so the sheet comes back by itself once the line does
export const pmdFailed = (sp) => { const s = sprite(sp); return !!s.failed || failed(s.im); };
// a Pokémon's sheet loaded and decoded (and its frame data in), for a scene to have before it shows (main.js goTown):
// one first drawn the frame it arrives stalls a phone for a moment
export function spriteReady(sp) {
  if (!HAVE.spr.has(sp)) return loadImages([iconPath(sp)]); // a Gen 4 Pokémon is drawn from its box icon
  const s = sprite(sp);
  return Promise.all([loadJSON(s.json).then((m) => { s.meta = m; s.failed = false; }, () => { s.failed = true; }), loadImages([s.png]).then(([im]) => (im.naturalWidth && im.decode ? im.decode().catch(() => {}) : null))])
    .then(() => (pmdFailed(sp) ? loadImages([iconPath(sp), iconPath(sp, true)]) : null)).then(() => s); // a sheet that failed shows its icon meanwhile: have that
}
// shiny colours: the sheet recoloured once through the exported colour map
function shinySheet(s) {
  if (s.shiny) return s.shiny;
  const { im, meta } = s;
  const cv = document.createElement('canvas');
  cv.width = im.width; cv.height = im.height;
  const c = cv.getContext('2d');
  c.drawImage(im, 0, 0);
  if (meta.shiny?.length) {
    const d = c.getImageData(0, 0, cv.width, cv.height), px = d.data;
    const map = new Map(meta.shiny.map(([r, g, b, r2, g2, b2]) => [(r << 16) | (g << 8) | b, [r2, g2, b2]]));
    for (let i = 0; i < px.length; i += 4) {
      if (!px[i + 3]) continue;
      const to = map.get((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
      if (to) { px[i] = to[0]; px[i + 1] = to[1]; px[i + 2] = to[2]; }
    }
    c.putImageData(d, 0, 0);
  }
  s.shiny = cv;
  return cv;
}

// Draws the sprite with its origin (the feet) at x, y. Returns false when no PMD sprite exists (caller falls back).
// o: dir 0-7, anim 'walk'|'attack'|'hurt'|'sleep', t seconds into the animation, speed, alpha, scale
export function drawPmd(c, sp, shiny, x, y, o = {}) {
  if (!HAVE.spr.has(sp)) return false;
  const s = sprite(sp);
  if (!s.meta || !ready(s.im)) return !s.failed; // still loading: draw nothing this frame
  const m = s.meta;
  const seq = (m.anims[o.anim || 'walk'] || m.anims.walk)[o.dir ?? 0];
  if (!seq?.length) return false;
  const total = seq.reduce((a, f) => a + f[1], 0);
  const once = o.anim === 'attack' || o.anim === 'hurt';
  let tick = Math.floor((o.t ?? G.time) * 60 * (o.speed ?? 1));
  tick = once ? Math.min(tick, total - 1) : tick % total;
  let f = seq[0];
  for (const fr of seq) { if (tick < fr[1]) { f = fr; break; } tick -= fr[1]; f = fr; }
  const [cell, , ox, oy] = f;
  const sc = o.scale || 1;
  const sx = (cell % m.cols) * m.w, sy = Math.floor(cell / m.cols) * m.h;
  const src = shiny && m.shiny?.length ? shinySheet(s) : s.im;
  c.save();
  if (o.alpha != null) c.globalAlpha = o.alpha;
  const lunge = o.anim === 'attack' ? 0.45 : 1; // PMD lunges a whole tile; keep it inside our 24px grid
  c.drawImage(src, sx, sy, m.w, m.h, Math.round(x + (ox * lunge - m.ax) * sc), Math.round(y + (oy * lunge - m.ay) * sc), Math.round(m.w * sc), Math.round(m.h * sc));
  c.restore();
  return true;
}
// how far a sprite's frame reaches above its feet (pixels at scale 1); null until its sheet has loaded
export const pmdHeadroom = (sp) => sprites.get(sp)?.meta?.ay ?? null;
export function pmdAnimLength(sp, anim, dir = 0) {
  const m = sprites.get(sp)?.meta;
  const seq = m?.anims[anim]?.[dir];
  return seq ? seq.reduce((a, f) => a + f[1], 0) / 60 : 0;
}

// portrait (40x40 per expression, 13 in a row)
export function portraitImage(sp) { return HAVE.kao.has(sp) ? img(`pmd/kao/${sp}.png`) : null; }

// ---------------------------------------------------------------- dungeon chunk sets
// A chunk set: its picture and its tables, asked for again on every use while either is missing (core.js retries a
// failed file). `ready` settles once both have arrived or their round of retries is over, and never rejects: it used
// to wait for the picture only after the tables came, and a picture that had failed before that was never noticed, so
// the boot (set 41) or every town (G.townAssets) waited forever (1.16). Users check meta and ready(im) before painting.
const sets = new Map();
export function tileSet(id) {
  let t = sets.get(id);
  if (!t) { t = { im: null, meta: null, ready: null, png: `pmd/tiles/${id}.png`, json: `pmd/tiles/${id}.json` }; sets.set(id, t); }
  else if (t.meta && ready(t.im)) return t;
  t.im = img(t.png);
  if (!t.ready || (!t.meta && !t.asking)) {
    t.asking = true;
    t.ready = Promise.all([loadJSON(t.json).then((m) => { t.meta = m; }, () => {}), t.im.settled]).then(() => { t.asking = false; });
  }
  return t;
}
// neighbour bits: S, SE, E, NE, N, NW, W, SW
const NB = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
// a chunk set's pixels, read once, for paintTerrain's whole-canvas path
function chunkPixels(set) {
  if (!set.px) {
    const cv = document.createElement('canvas');
    cv.width = set.im.naturalWidth; cv.height = set.im.naturalHeight;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.drawImage(set.im, 0, 0);
    set.px = new Uint32Array(c.getImageData(0, 0, cv.width, cv.height).data.buffer);
  }
  return set.px;
}
// Paint a terrain grid (0 wall, 1 floor, 2 water) into ctx with 24px PMD chunks. same(x, y, t) decides connectivity.
// A canvas exactly the grid's size (every caller paints a fresh one) is composed in memory and put once instead of
// one drawImage per tile (a 64x64 Pearl town took 80-200 ms that way); the chunk sets are fully opaque, so the
// pixels are the same.
export function paintTerrain(ctx, set, W, H, at, ox = 0, oy = 0, seed = 1) {
  const m = set.meta;
  if (!m) return;
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s >>> 24; };
  const whole = !ox && !oy && ctx.canvas?.width === W * 24 && ctx.canvas.height === H * 24;
  const src = whole ? chunkPixels(set) : null, sw = set.im.naturalWidth, dw = W * 24;
  const out = whole ? ctx.createImageData(dw, H * 24) : null, dst = out && new Uint32Array(out.data.buffer);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = at(x, y);
    let mask = 0;
    for (let b = 0; b < 8; b++) { const n = at(x + NB[b][0], y + NB[b][1]); if (n === t || (n == null && t === 0)) mask |= 1 << b; }
    const table = t === 2 ? m.water : t === 1 ? m.floor : m.wall;
    const v = rnd();
    const k = table[mask][v < 200 ? 0 : v < 228 ? 1 : 2];
    const sx = (k % m.cols) * 24, sy = Math.floor(k / m.cols) * 24;
    if (!whole) { ctx.drawImage(set.im, sx, sy, 24, 24, ox + x * 24, oy + y * 24, 24, 24); continue; }
    for (let r = 0, i = sy * sw + sx, o = y * 24 * dw + x * 24; r < 24; r++, i += sw, o += dw) dst.set(src.subarray(i, i + 24), o);
  }
  if (whole) ctx.putImageData(out, 0, 0);
}

// Pearl box icons have no shiny palette; every species' shiny icon was derived from its shiny battle sprite (tools/extract_sprites.py)
// a box icon is per species: a Forme's sprite key ('386a') draws its species' icon
export const iconPath = (sp, shiny) => `poke/icon/${parseInt(sp, 10)}${shiny ? 's' : ''}.png`;
