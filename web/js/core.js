// Core: canvas, input, assets, UI drawing, dialogue, scene stack.
export const VW = 480, VH = 270, TILE = 24;
export const G = { S: 2, time: 0, real: 0, dt: 0, speed: 1, scene: null, overlays: [] };

// player preferences kept per browser (sound, key hints); storage can be blocked, so every access is guarded
export const prefs = { muted: false, hints: true };
try { Object.assign(prefs, JSON.parse(localStorage.getItem('joseon-prefs') || '{}')); } catch (e) { /* private mode */ }
export function setPref(k, v) { prefs[k] = v; try { localStorage.setItem('joseon-prefs', JSON.stringify(prefs)); } catch (e) { /* private mode */ } }

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = randInt(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

// touch screens get the on-screen pad: the Android app always, phones and tablets by their coarse pointer, ?touch=1 for testing
export const APP = !!window.Capacitor?.isNativePlatform?.();
export const touchUI = APP || /[?&]touch=1/.test(location.search) || !!window.matchMedia?.('(pointer: coarse)').matches;

// ---------------------------------------------------------------- canvas
export function initCanvas() {
  if (touchUI) document.body.classList.add('touch');
  if (APP) document.body.classList.add('app');
  const screen = document.getElementById('screen');
  G.screen = screen;
  G.sctx = screen.getContext('2d');
  G.low = document.createElement('canvas');
  G.low.width = VW; G.low.height = VH;
  G.lctx = G.low.getContext('2d');
  G.lctx.imageSmoothingEnabled = false;
  // fill the browser window (letterboxed 16:9); the backing store matches device pixels so UI text stays sharp
  const fit = () => {
    const dpr = window.devicePixelRatio || 1;
    let w = innerWidth;
    if (touchUI) { // the pad columns take the sides (inside the safe-area insets body.touch pads itself by); the game fills the middle
      const b = getComputedStyle(document.body), inner = w - parseFloat(b.paddingLeft) - parseFloat(b.paddingRight);
      const pad = Math.round(clamp(inner * 0.16, 104, 170));
      document.documentElement.style.setProperty('--pad', pad + 'px');
      w = inner - 2 * pad;
    }
    const css = Math.min(w / VW, innerHeight / VH);
    const S = Math.max(0.5, css * dpr);
    G.S = S;
    screen.width = Math.round(VW * S); screen.height = Math.round(VH * S);
    screen.style.width = Math.floor(VW * css) + 'px';
    screen.style.height = Math.floor(VH * css) + 'px';
    G.sctx.imageSmoothingEnabled = false;
    // the HUD buttons go in the free strip beside or above the game (into the menu panel on touch screens); with no room they fade over it
    const hud = document.getElementById('hud');
    if (hud) hud.className = touchUI ? 'inmenu' : (innerWidth - VW * css) / 2 >= 124 ? 'side' : (innerHeight - VH * css) / 2 >= 36 ? '' : 'over';
  };
  addEventListener('resize', fit);
  fit();
  // mouse clicks and taps on the screen, in UI coordinates (VW x VH); read once per frame like a key press
  const toUI = (e) => { const r = screen.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * VW, y: (e.clientY - r.top) / r.height * VH }; };
  // a press dragged across the screen adds its movement to input.pan (the world map scrolls with it). It counts as a
  // drag once it has travelled a few CSS pixels (more for a finger, whose taps wobble); the click a drag ends in is dropped.
  let press = null, dragged = false;
  screen.addEventListener('pointerdown', (e) => {
    if (G.paused || e.button > 0) return;
    const p = toUI(e);
    press = { id: e.pointerId, x: p.x, y: p.y, cx: e.clientX, cy: e.clientY, far: e.pointerType === 'mouse' ? 5 : 12 }; dragged = false;
    capture(screen, e.pointerId);
  });
  screen.addEventListener('pointermove', (e) => {
    if (!press || e.pointerId !== press.id) return;
    if (!dragged && Math.hypot(e.clientX - press.cx, e.clientY - press.cy) > press.far) dragged = true;
    if (!dragged) return;
    const p = toUI(e);
    input.pan.x += p.x - press.x; input.pan.y += p.y - press.y;
    press.x = p.x; press.y = p.y;
  });
  const lift = (e) => { if (press?.id === e.pointerId) press = null; };
  screen.addEventListener('pointerup', lift); screen.addEventListener('pointercancel', lift);
  screen.addEventListener('wheel', (e) => { e.preventDefault(); input.pan.x -= e.deltaX * 0.5; input.pan.y -= e.deltaY * 0.5; }, { passive: false });
  screen.addEventListener('click', (e) => {
    if (G.paused) return;
    if (dragged) { dragged = false; return; }
    input.click = toUI(e);
  });
}

// ---------------------------------------------------------------- input
// arrows move and Q W E R fire moves 1-4, so the letters that used to share those keys moved
// (quests Q → J, menu E → C, rest R → A); Tab tags the next teammate in, P opens the companion roster outside dungeons;
// the number keys 1-3 set the game speed (main.js)
const KEYMAP = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  KeyZ: 'ok', Enter: 'ok', Space: 'ok', KeyX: 'cancel', Escape: 'cancel', Backspace: 'cancel',
  KeyQ: 'm1', KeyW: 'm2', KeyE: 'm3', KeyR: 'm4', ShiftLeft: 'shift', ShiftRight: 'shift',
  Tab: 'tag', KeyJ: 'quest', KeyP: 'party', KeyM: 'map', KeyC: 'menu', KeyA: 'rest',
};
export const input = {
  down: new Set(), pressed: new Set(), repeatAt: {}, click: null, pan: { x: 0, y: 0 },
  // the click if it landed inside the box (and consumes it)
  tap(x, y, w, h) { const c = this.click; if (c && c.x >= x && c.x < x + w && c.y >= y && c.y < y + h) { this.click = null; return c; } return null; },
  hit(k) { if (this.pressed.has(k)) { this.pressed.delete(k); return true; } return false; },
  isDown(k) { return this.down.has(k); },
  any() { return this.pressed.size > 0; },
  clear() { this.pressed.clear(); },
  // held direction with key-repeat for menus
  repeat(k, first = 0.32, rate = 0.09) {
    if (this.hit(k)) { this.repeatAt[k] = G.real + first; return true; } // real time: menus scroll at the same pace at any game speed
    if (this.isDown(k) && G.real >= (this.repeatAt[k] || 1e9)) { this.repeatAt[k] = G.real + rate; return true; }
    return false;
  },
  dir() { return { dx: (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0), dy: (this.isDown('down') ? 1 : 0) - (this.isDown('up') ? 1 : 0) }; },
};
addEventListener('keydown', (e) => {
  const k = KEYMAP[e.code];
  if (!k || G.paused) return; // G.paused: the HTML guide is open
  e.preventDefault();
  if (!input.down.has(k)) input.pressed.add(k);
  input.down.add(k);
});
// letting go ends the key's menu auto-repeat, so a held arrow (walking, say) never scrolls a menu that opens mid-hold
const release = (k) => { input.down.delete(k); delete input.repeatAt[k]; };
addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) release(k); });
addEventListener('blur', () => { input.down.clear(); input.repeatAt = {}; });

const press = (k) => { if (G.paused) return; if (!input.down.has(k)) input.pressed.add(k); input.down.add(k); }; // the guide or search box is open
// keeps a finger's pointer on the control it started on; capture can be refused (the pointer already ended), which is harmless
const capture = (el, id) => { try { el.setPointerCapture(id); } catch (e) { /* pointer gone */ } };

// touch pad: each button holds its action like the key with the same letter. Pointer events give every finger
// its own pointer, so the pad and a button work together (⇧ + direction). A co-op guest's G.onPadKey / G.onPadDir
// take the input instead (netui.js).
export function initTouch() {
  if (!touchUI) return;
  document.querySelectorAll('#touch button[data-k]').forEach((b) => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); capture(b, e.pointerId); b.classList.add('on');
      if (!G.onPadKey?.(k)) press(k);
    });
    const up = () => { b.classList.remove('on'); release(k); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  });
  initDpad();
  initMenu();
  document.getElementById('touch').addEventListener('contextmenu', (e) => e.preventDefault());
}
// The menu button (apart from the move diamond) opens a panel: the game's own menus, offered only where the screen
// answers to them (a scene's padKeys) and nothing is open over it, then the HUD buttons, moved into it. A game button
// closes the panel and acts as its key; sound, speed and language (data-stay) keep it open to show the change.
function initMenu() {
  const panel = document.getElementById('tmenu'), btn = document.getElementById('btn-tmenu');
  panel.querySelector('.slot').append(document.getElementById('hud'));
  const show = (on) => {
    panel.hidden = !on; btn.classList.toggle('on', on);
    const keys = G.overlays.length || fade.a > 0 ? [] : G.scene?.padKeys || [];
    if (on) panel.querySelectorAll('button[data-k]').forEach((b) => { b.disabled = !keys.includes(b.dataset.k); });
  };
  btn.addEventListener('click', () => show(panel.hidden));
  // capture: the panel closes before a button's own handler opens the guide, co-op or sign-in over it
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (e.target === panel || b?.hasAttribute('data-close')) return show(false);
    if (!b || b.hasAttribute('data-stay')) return;
    show(false);
    const k = b.dataset.k;
    if (k && !G.onPadKey?.(k)) { press(k); release(k); }
  }, true);
}
// 8-way pad: straight directions get 60° each and diagonals 30°, so a slightly crooked thumb still walks straight in town
const DIRS = [[30, ['right']], [60, ['down', 'right']], [120, ['down']], [150, ['down', 'left']], [210, ['left']], [240, ['up', 'left']], [300, ['up']], [330, ['up', 'right']], [361, ['right']]];
function initDpad() {
  const pad = document.getElementById('dpad'), knob = pad.querySelector('i');
  let held = [], id = null;
  const set = (keys) => {
    if (keys.join() === held.join()) return;
    for (const k of held) if (!keys.includes(k)) release(k);
    const dx = keys.includes('right') - keys.includes('left'), dy = keys.includes('down') - keys.includes('up');
    if (!G.onPadDir?.(dx, dy)) for (const k of keys) if (!held.includes(k)) press(k);
    held = keys;
  };
  const move = (e) => {
    const r = pad.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
    const d = Math.hypot(x, y), m = Math.min(d, r.width * 0.3);
    knob.style.transform = d ? `translate(${x / d * m}px, ${y / d * m}px)` : '';
    if (d < r.width * 0.12) return set([]); // the middle is a dead zone
    const a = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; // 0 = right, 90 = down
    set(DIRS.find(([lim]) => a < lim)[1]);
  };
  pad.addEventListener('pointerdown', (e) => {
    if (id !== null) return;
    e.preventDefault(); id = e.pointerId; capture(pad, id); pad.classList.add('on'); move(e);
  });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
  const end = (e) => { if (e.pointerId !== id) return; id = null; pad.classList.remove('on'); knob.style.transform = ''; set([]); };
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
}

// Bluetooth / USB gamepads (standard layout), read once per frame by main.js after one connects:
// A OK, B menu, X Y LB RB moves 1-4, LT face only, RT rest, Select quests, Start menu, L3 map, R3 tag, d-pad or left stick moves
const PAD_KEYS = ['ok', 'cancel', 'm1', 'm2', 'm3', 'm4', 'shift', 'rest', 'quest', 'menu', 'map', 'tag', 'up', 'down', 'left', 'right'];
let padHeld = new Set();
export function pollGamepads() {
  const now = new Set();
  for (const p of navigator.getGamepads?.() || []) {
    if (!p) continue;
    p.buttons.forEach((b, i) => { if (b.pressed && PAD_KEYS[i]) now.add(PAD_KEYS[i]); });
    const [ax = 0, ay = 0] = p.axes;
    if (ax < -0.5) now.add('left'); else if (ax > 0.5) now.add('right');
    if (ay < -0.5) now.add('up'); else if (ay > 0.5) now.add('down');
  }
  if (G.paused) now.clear();
  for (const k of padHeld) if (!now.has(k)) release(k);
  for (const k of now) if (!padHeld.has(k)) { press(k); G.onFirstInput?.(); }
  padHeld = now;
}

// ---------------------------------------------------------------- assets
const images = new Map();
const jsons = new Map();
export function img(path) {
  let im = images.get(path);
  if (!im) {
    im = new Image();
    im.src = 'assets/' + path;
    images.set(path, im);
  }
  return im;
}
export function loadImages(paths) {
  return Promise.all(paths.map((p) => new Promise((res) => {
    const im = img(p);
    if (im.complete && im.naturalWidth) return res(im);
    im.onload = () => res(im);
    im.onerror = () => { console.warn('missing', p); res(im); };
  })));
}
export async function loadJSON(path) {
  if (!jsons.has(path)) jsons.set(path, await (await fetch('assets/' + path)).json());
  return jsons.get(path);
}
export const ready = (im) => im && im.complete && im.naturalWidth > 0;
// the part of a big prerendered map (a town is up to ~2300x1900 px) inside the view at (vx, vy), drawn at its own place:
// the same pixels as drawing it whole, without the browser handling the off-screen rest every frame
export function drawSeen(c, im, vx, vy) {
  const x0 = Math.max(0, Math.floor(vx)), y0 = Math.max(0, Math.floor(vy));
  const x1 = Math.min(im.width, Math.ceil(vx + VW)), y1 = Math.min(im.height, Math.ceil(vy + VH));
  if (x1 > x0 && y1 > y0) c.drawImage(im, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
}

// ---------------------------------------------------------------- UI (drawn on the full-resolution screen)
export const COL = {
  paper: '#f3e8cf', paper2: '#e6d5ae', ink: '#2c2119', ink2: '#5b4632', red: '#b2352b', blue: '#2f5d8a',
  green: '#3f7a4f', gold: '#c99a2e', dim: 'rgba(20,14,10,0.62)', hp: '#58b84a', hpLow: '#d8a83a', hpCrit: '#d0453a',
};
export const ui = {
  get c() { return G.sctx; },
  begin() { const c = G.sctx; c.setTransform(G.S, 0, 0, G.S, 0, 0); c.imageSmoothingEnabled = false; c.textBaseline = 'top'; },
  rect(x, y, w, h, color) { this.c.fillStyle = color; this.c.fillRect(x, y, w, h); },
  panel(x, y, w, h, o = {}) {
    const c = this.c;
    c.fillStyle = o.shadow === false ? 'transparent' : 'rgba(0,0,0,0.35)';
    c.fillRect(x + 2, y + 2, w, h);
    c.fillStyle = COL.ink; c.fillRect(x, y, w, h);
    c.fillStyle = o.fill || COL.paper; c.fillRect(x + 1, y + 1, w - 2, h - 2);
    c.fillStyle = o.fill2 || COL.paper2; c.fillRect(x + 1, y + h - 3, w - 2, 2);
    if (o.accent !== false) { // dancheong stripe
      c.fillStyle = COL.red; c.fillRect(x + 1, y + 1, w - 2, 2);
      c.fillStyle = COL.green; c.fillRect(x + 1, y + 3, w - 2, 1);
      c.fillStyle = COL.blue; c.fillRect(x + 1, y + 4, w - 2, 1);
    }
  },
  font(size = 11, bold = false) { return `${size}px ${bold ? 'Galmuri11B' : size <= 9 ? 'Galmuri9' : 'Galmuri11'}`; },
  text(s, x, y, o = {}) {
    const c = this.c;
    c.font = this.font(o.size || 11, o.bold);
    c.textAlign = o.align || 'left';
    if (o.shadow) { c.fillStyle = o.shadow === true ? 'rgba(0,0,0,0.55)' : o.shadow; c.fillText(s, x + 1, y + 1); }
    c.fillStyle = o.color || COL.ink;
    c.fillText(s, x, y);
    return c.measureText(s).width;
  },
  measure(s, size = 11, bold = false) { this.c.font = this.font(size, bold); return this.c.measureText(s).width; },
  wrap(s, maxW, size = 11) {
    const out = [];
    for (const para of String(s).split('\n')) {
      let line = '';
      for (const ch of para) {
        if (this.measure(line + ch, size) > maxW && line) {
          // break at the last space when possible
          const sp = line.lastIndexOf(' ');
          if (sp > 0 && ch !== ' ') { out.push(line.slice(0, sp)); line = line.slice(sp + 1) + ch; } else { out.push(line); line = ch === ' ' ? '' : ch; }
        } else line += ch;
      }
      out.push(line);
    }
    return out;
  },
  image(im, sx, sy, sw, sh, dx, dy, dw, dh, flip = false) {
    if (!ready(im)) return;
    const c = this.c;
    if (flip) { c.save(); c.translate(dx + dw, dy); c.scale(-1, 1); c.drawImage(im, sx, sy, sw, sh, 0, 0, dw, dh); c.restore(); }
    else c.drawImage(im, sx, sy, sw, sh, dx, dy, dw, dh);
  },
  bar(x, y, w, h, v, max) {
    const f = clamp(v / max, 0, 1);
    this.rect(x, y, w, h, COL.ink);
    this.rect(x + 1, y + 1, w - 2, h - 2, '#4a3a2c');
    this.rect(x + 1, y + 1, Math.round((w - 2) * f), h - 2, f > 0.5 ? COL.hp : f > 0.2 ? COL.hpLow : COL.hpCrit);
  },
  // Pokémon portrait: the PMD face (expression `emo`) when one exists, else the Pearl front sprite cropped to its centre
  portrait(sp, shiny, x, y, size = 48, emo = 0) {
    this.panel(x, y, size + 4, size + 4, { accent: false, fill: '#fbf5e6' });
    const k = !shiny && G.kao?.(sp);
    if (k && ready(k)) { this.image(k, (emo < k.width / 40 ? emo : 0) * 40, 0, 40, 40, x + 2, y + 2, size, size); return; }
    const im = img(`poke/front/${sp}${shiny ? 's' : ''}.png`);
    this.image(im, 8, 6, 64, 64, x + 2, y + 2, size, size);
  },
};

// ---------------------------------------------------------------- dialogue
// lines: [{who, name, text, shiny, choices:[..], onChoice(i)}]; who = species id or 'narr'
export class Dialog {
  constructor(lines, onDone) {
    this.lines = lines.filter(Boolean);
    this.i = 0; this.chars = 0; this.onDone = onDone; this.sel = 0; this.done = false;
    G.dialogSpeaker?.(this.lines[0]);
  }
  get line() { return this.lines[this.i]; }
  relang(sw) { for (const L of this.lines) { L.text = sw(L.text); if (L.name) L.name = sw(L.name); if (L.choices) L.choices = L.choices.map(sw); } }
  update(dt) {
    const L = this.line;
    if (!L) return;
    const full = L.text.length;
    this.chars = Math.min(full, this.chars + dt * 48 * (input.isDown('ok') ? 3 : 1));
    if (L.choices && this.chars >= full) {
      if (input.repeat('up') || input.repeat('left')) { this.sel = (this.sel + L.choices.length - 1) % L.choices.length; G.sfx?.('cursor'); }
      if (input.repeat('down') || input.repeat('right')) { this.sel = (this.sel + 1) % L.choices.length; G.sfx?.('cursor'); }
    }
    if (input.click) {
      const b = this.choiceBox;
      if (L.choices && this.chars >= full && b) { // only a click on a choice picks it
        const k = Math.floor((input.click.y - b.y - 7) / 16);
        if (input.tap(b.x, b.y, b.w, b.h) && k >= 0 && k < L.choices.length) { this.sel = k; this.advance(); }
        input.click = null;
        return;
      }
      input.click = null;
      return this.advance();
    }
    if (input.hit('ok')) this.advance();
    else if (input.hit('cancel')) {
      // X on a question picks its last answer (no / not now / cancel); questions marked cancel:false must be answered with Z
      if (!L.choices || this.chars < full) this.advance();
      else if (L.cancel !== false) { this.sel = L.choices.length - 1; this.advance(); }
    }
  }
  advance() {
    const L = this.line;
    if (this.chars < L.text.length) { this.chars = L.text.length; return; }
    G.sfx?.('confirm');
    if (L.choices) { const s = this.sel; this.sel = 0; L.onChoice?.(s); }
    this.i++; this.chars = 0;
    if (this.i >= this.lines.length) { this.done = true; this.onDone?.(); }
    else G.dialogSpeaker?.(this.line);
  }
  drawUI() {
    const L = this.line;
    if (!L) return;
    const h = 62, y = VH - h - 6, x = 6, w = VW - 12;
    const hasP = typeof L.who === 'number';
    ui.panel(x, y, w, h);
    let tx = x + 10;
    if (hasP) { ui.portrait(L.who, L.shiny, x + 6, y - 30, 52, L.emo || 0); tx = x + 66; }
    if (L.name) {
      const nw = ui.measure(L.name, 11, true) + 14;
      ui.panel(tx - 4, y - 13, nw, 16, { accent: false, fill: COL.ink2 });
      ui.text(L.name, tx + 3, y - 10, { color: '#fff4dc', bold: true });
    }
    const shown = L.text.slice(0, Math.floor(this.chars));
    const lines = ui.wrap(shown, w - (tx - x) - 14);
    lines.slice(0, 3).forEach((ln, k) => ui.text(ln, tx, y + 11 + k * 15, { color: L.who === 'narr' ? COL.ink2 : COL.ink }));
    if (L.choices && this.chars >= L.text.length) {
      const cw = Math.max(...L.choices.map((c) => ui.measure(c))) + 30, ch = L.choices.length * 16 + 10;
      ui.panel(VW - cw - 10, y - ch - 6, cw, ch);
      this.choiceBox = { x: VW - cw - 10, y: y - ch - 6, w: cw, h: ch };
      L.choices.forEach((c, k) => ui.text((k === this.sel ? '▶ ' : '   ') + c, VW - cw, y - ch + 4 + k * 16));
    } else if (this.chars >= L.text.length && Math.floor(G.time * 3) % 2) ui.text('▼', x + w - 16, y + h - 15, { color: COL.red });
  }
}

export function say(lines, onDone) {
  return new Promise((res) => {
    const d = new Dialog(lines, () => { onDone?.(); res(); });
    G.overlays.push(d);
  });
}

// generic vertical menu overlay
export class Menu {
  constructor(items, o = {}) {
    this.items = items; this.sel = o.sel || 0; this.o = o; this.done = false;
  }
  relang(sw) { for (const it of this.items) { it.label = sw(it.label); it.right = sw(it.right); it.desc = sw(it.desc); } if (this.o.title) this.o.title = sw(this.o.title); }
  update() {
    const n = this.items.length;
    if (input.repeat('up')) { this.sel = (this.sel + n - 1) % n; G.sfx?.('cursor'); }
    if (input.repeat('down')) { this.sel = (this.sel + 1) % n; G.sfx?.('cursor'); }
    // ◀ ▶ jump a page in long lists (a roster holds up to 500)
    const page = this.box?.rows || n;
    if (n > page && input.repeat('left')) { this.sel = Math.max(0, this.sel - page); G.sfx?.('cursor'); }
    if (n > page && input.repeat('right')) { this.sel = Math.min(n - 1, this.sel + page); G.sfx?.('cursor'); }
    // a finger dragged over a long list scrolls it a row per 16 px (the click a drag ends in is dropped, see initCanvas)
    if (n > page && input.pan.y) {
      this.drag = (this.drag || 0) + input.pan.y;
      const k = Math.trunc(this.drag / 16);
      if (k) { this.drag -= k * 16; this.sel = clamp(this.sel - k, 0, n - 1); }
    }
    const b = this.box;
    if (input.click && b) {
      const j = Math.floor((input.click.y - b.y - 5) / 16);
      if (input.tap(b.x, b.y, b.w, b.h)) { if (j >= 0 && j < b.rows) { this.sel = b.top + j; this.pick(); } return; }
      input.click = null; G.sfx?.('cancel'); this.done = true; this.o.onCancel?.(); return;
    }
    if (input.hit('ok')) this.pick();
    else if (input.hit('cancel') || (this.o.toggle && input.hit(this.o.toggle))) { G.sfx?.('cancel'); this.done = true; this.o.onCancel?.(); } // toggle: the key that opened it closes it
  }
  pick() {
    const it = this.items[this.sel];
    if (it.disabled) { G.sfx?.('cancel'); return; }
    G.sfx?.('confirm'); this.done = !this.o.keep; it.fn?.(); this.o.onPick?.(it, this.sel);
  }
  drawUI() {
    const o = this.o, w = o.w || Math.max(90, ...this.items.map((i) => ui.measure(i.label) + 34));
    const x = o.x ?? VW - w - 8, y = o.y ?? (o.title ? 24 : 8); // a title tab sits above the list, so keep it on screen
    // long lists (roster, items) scroll so they never run off the screen
    const n = this.items.length, rows = Math.min(n, Math.max(3, Math.floor((VH - y - (o.desc ? 50 : 14) - 12) / 16)));
    const top = clamp(this.sel - Math.floor(rows / 2), 0, n - rows);
    const h = rows * 16 + 12;
    this.box = { x, y, w, h, rows, top };
    ui.panel(x, y, w, h);
    if (o.title) { ui.panel(x, y - 15, ui.measure(o.title, 11, true) + 14, 16, { accent: false, fill: COL.ink2 }); ui.text(o.title, x + 7, y - 12, { color: '#fff4dc', bold: true }); }
    this.items.slice(top, top + rows).forEach((it, j) => {
      const k = top + j;
      ui.text((k === this.sel ? '▶ ' : '   ') + it.label, x + 8, y + 8 + j * 16, { color: it.disabled ? '#9a8a76' : COL.ink });
      if (it.right) ui.text(it.right, x + w - 8, y + 8 + j * 16, { align: 'right', color: COL.ink2 });
    });
    if (top > 0) ui.text('▲', x + w - 12, y - 1, { size: 9, color: COL.red });
    if (top + rows < n) ui.text('▼', x + w - 12, y + h - 10, { size: 9, color: COL.red });
    if (o.desc) { const d = this.items[this.sel]?.desc; if (d) { ui.panel(8, VH - 40, VW - 16, 32); ui.wrap(d, VW - 36, 11).slice(0, 2).forEach((l, i) => ui.text(l, 16, VH - 33 + i * 13)); } }
  }
}
export function openMenu(items, o) { const m = new Menu(items, o); G.overlays.push(m); return m; }

// a one-line text box over the game (the roster search) for the keyboard or the phone's own keyboard; game keys pause
// while it is open (G.paused, as for the guide) and keys typed into it never reach the game's shortcuts.
// Resolves to the trimmed text, or null when cancelled.
export function askText(title, value = '', [okText, noText] = ['OK', 'Cancel']) {
  return new Promise((res) => {
    const box = document.createElement('form');
    box.id = 'ask';
    box.innerHTML = '<label></label><input type="search" enterkeyhint="search" autocomplete="off" spellcheck="false"><div><button type="submit"></button><button type="button" data-close></button></div>';
    const [label, field] = [box.querySelector('label'), box.querySelector('input')], [ok, no] = box.querySelectorAll('button');
    label.textContent = title; field.value = value;
    ok.textContent = okText; no.textContent = noText;
    const done = (v) => { box.remove(); G.paused = false; input.down.clear(); input.pressed.clear(); res(v); };
    box.addEventListener('submit', (e) => { e.preventDefault(); done(field.value.trim()); });
    no.addEventListener('click', () => done(null));
    field.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); done(null); } });
    G.paused = true;
    document.body.append(box);
    field.focus(); field.select();
  });
}

// toast messages (top centre)
const toasts = [];
export function toast(text, color = COL.ink, secs = 2.4) { toasts.push({ text, color, t: secs }); }
export function relangToasts(sw) { for (const t of toasts) t.text = sw(t.text); }
export function drawToasts(dt) {
  let y = 10;
  for (let i = toasts.length - 1; i >= 0; i--) {
    const t = toasts[i]; t.t -= dt;
    if (t.t <= 0) { toasts.splice(i, 1); continue; }
  }
  for (const t of toasts) {
    const w = ui.measure(t.text) + 20;
    ui.panel((VW - w) / 2, y, w, 18, { accent: false });
    ui.text(t.text, VW / 2, y + 4, { align: 'center', color: t.color });
    y += 21;
  }
}

// ---------------------------------------------------------------- scenes & transitions
export function setScene(s) {
  G.scene?.exit?.();
  G.scene = s;
  s.enter?.();
}
export const fade = { a: 0, target: 0, speed: 3, color: '#000', cb: null };
export function fadeTo(cb, color = '#000', speed = 3) {
  fade.target = 1; fade.color = color; fade.speed = speed;
  fade.cb = () => { cb?.(); fade.target = 0; };
}
export function updateFade(dt) {
  if (fade.a < fade.target) { fade.a = Math.min(1, fade.a + dt * fade.speed); if (fade.a >= 1 && fade.cb) { const cb = fade.cb; fade.cb = null; cb(); } }
  else if (fade.a > fade.target) fade.a = Math.max(0, fade.a - dt * fade.speed);
}
