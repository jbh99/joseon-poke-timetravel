// PMD Blue Rescue Team graphics (exported by tools/pmd/extract_pmd.py): 8-direction sprites, portraits, dungeon chunk sets.
import { G, img, ready, loadJSON } from './core.js';

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

const sprites = new Map();
function sprite(sp) {
  let s = sprites.get(sp);
  if (s) return s;
  s = { meta: null, im: img(`pmd/spr/${sp}.png`), shiny: null };
  sprites.set(sp, s);
  loadJSON(`pmd/spr/${sp}.json`).then((m) => { s.meta = m; }).catch(() => { s.failed = true; });
  return s;
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
export function pmdAnimLength(sp, anim, dir = 0) {
  const m = sprites.get(sp)?.meta;
  const seq = m?.anims[anim]?.[dir];
  return seq ? seq.reduce((a, f) => a + f[1], 0) / 60 : 0;
}

// portrait (40x40 per expression, 13 in a row)
export function portraitImage(sp) { return HAVE.kao.has(sp) ? img(`pmd/kao/${sp}.png`) : null; }

// ---------------------------------------------------------------- dungeon chunk sets
const sets = new Map();
export function tileSet(id) {
  let t = sets.get(id);
  if (t) return t;
  t = { im: img(`pmd/tiles/${id}.png`), meta: null };
  sets.set(id, t);
  t.ready = loadJSON(`pmd/tiles/${id}.json`).then((m) => { t.meta = m; return new Promise((res) => { if (ready(t.im)) res(); else { t.im.onload = res; t.im.onerror = res; } }); });
  return t;
}
// neighbour bits: S, SE, E, NE, N, NW, W, SW
const NB = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
// Paint a terrain grid (0 wall, 1 floor, 2 water) into ctx with 24px PMD chunks. same(x, y, t) decides connectivity.
export function paintTerrain(ctx, set, W, H, at, ox = 0, oy = 0, seed = 1) {
  const m = set.meta;
  if (!m) return;
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s >>> 24; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = at(x, y);
    let mask = 0;
    NB.forEach(([dx, dy], b) => { const n = at(x + dx, y + dy); if (n === t || (n == null && t === 0)) mask |= 1 << b; });
    const table = t === 2 ? m.water : t === 1 ? m.floor : m.wall;
    const v = rnd();
    const k = table[mask][v < 200 ? 0 : v < 228 ? 1 : 2];
    ctx.drawImage(set.im, (k % m.cols) * 24, Math.floor(k / m.cols) * 24, 24, 24, ox + x * 24, oy + y * 24, 24, 24);
  }
}

// Pearl box icons have no shiny palette; these were derived from the shiny battle sprites (tools/extract_sprites.py)
const SHINY_ICONS = new Set([387, 388, 389, 390, 391, 392, 393, 394, 395, 493]);
export const iconPath = (sp, shiny) => `poke/icon/${sp}${shiny && SHINY_ICONS.has(sp) ? 's' : ''}.png`;
