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

// ---------------------------------------------------------------- canvas
export function initCanvas() {
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
    const css = Math.min(innerWidth / VW, innerHeight / VH);
    const S = Math.max(0.5, css * dpr);
    G.S = S;
    screen.width = Math.round(VW * S); screen.height = Math.round(VH * S);
    screen.style.width = Math.floor(VW * css) + 'px';
    screen.style.height = Math.floor(VH * css) + 'px';
    G.sctx.imageSmoothingEnabled = false;
    // the HUD buttons go in the free strip beside or above the game; with no room (fullscreen, phones) they fade over it
    const hud = document.getElementById('hud');
    if (hud) hud.className = (innerWidth - VW * css) / 2 >= 124 ? 'side' : (innerHeight - VH * css) / 2 >= 36 ? '' : 'over';
  };
  addEventListener('resize', fit);
  fit();
  // mouse clicks and taps on the screen, in UI coordinates (VW x VH); read once per frame like a key press
  screen.addEventListener('click', (e) => {
    if (G.paused) return;
    const r = screen.getBoundingClientRect();
    input.click = { x: (e.clientX - r.left) / r.width * VW, y: (e.clientY - r.top) / r.height * VH };
    G.onFirstInput?.();
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
  down: new Set(), pressed: new Set(), repeatAt: {}, click: null,
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
  G.onFirstInput?.();
});
addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) input.down.delete(k); });
addEventListener('blur', () => input.down.clear());

// touch pad (shown on touch devices)
export function initTouch() {
  if (!('ontouchstart' in window)) return;
  const pad = document.getElementById('touch');
  pad.style.display = 'block';
  pad.querySelectorAll('[data-k]').forEach((b) => {
    const k = b.dataset.k;
    const on = (e) => { e.preventDefault(); if (!input.down.has(k)) input.pressed.add(k); input.down.add(k); G.onFirstInput?.(); };
    const off = (e) => { e.preventDefault(); input.down.delete(k); };
    b.addEventListener('touchstart', on); b.addEventListener('touchend', off); b.addEventListener('touchcancel', off);
  });
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

// toast messages (top centre)
const toasts = [];
export function toast(text, color = COL.ink) { toasts.push({ text, color, t: 2.4 }); }
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
