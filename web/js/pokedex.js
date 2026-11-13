// The Pokédex: every Pokémon to #649, in the national order or in the Sinnoh (Gen 4) or Unova (Gen 5) Pokédex's, each
// with both games' pages where it has them: Pokémon Pearl's picture, category and text for #1-493 and Pokémon Black's
// for all (data/pokedex.json and poke/dex5, tools/pokedex.py; Pearl's pictures are the game's own fronts). What a page
// shows follows the journey (game.js dexState): a Pokémon not met yet is a shadow, one seen shows its picture, name,
// category and types, one caught its whole page. "Show all" opens every page.
import { G, VW, VH, input, ui, COL, img, ready, loadJSON, clamp, prefs, setPref, touchUI } from './core.js';
import { tr, EN } from './i18n.js';
import { DEX, TYPE_COLORS, DEX_N, dexState, syncDex } from './game.js';
import { cry } from './audio.js';

const LAST4 = 493; // Pearl knows Pokémon up to Arceus
const TABS = [
  { name: () => tr('전국', 'National') },
  { name: () => tr('신오 · 4세대', 'Sinnoh · Gen 4'), list: 'sinnoh', first: 1 },
  { name: () => tr('하나 · 5세대', 'Unova · Gen 5'), list: 'unova', first: 0 }, // Victini is Unova's #000
];
const ROW = 13, LIST = { x: 8, y: 34, w: 172, h: 222 }, ROWS = Math.floor((LIST.h - 12) / ROW);
const STATS = () => tr(['HP', '공격', '방어', '특공', '특방', '스피드'], ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe']);
const at = { tab: 0, sel: [0, 0, 0] }; // where the Pokédex was left, for the next time it opens
const shadows = new Map(); // the dark shapes of pictures not met yet
const pad3 = (n) => String(n).padStart(3, '0');

// a page's picture: Pearl's front (80px frames) or Black's (96px; the game's own fronts from #494)
function picture(sp, gen) {
  if (gen === 4) return { im: img(`poke/front/${sp}.png`), f: 80 };
  return { im: img(sp <= LAST4 ? `poke/dex5/${sp}.png` : `poke/front/${sp}.png`), f: 96 };
}
function shadow(im, f) {
  let c = shadows.get(im.src);
  if (!c && ready(im)) {
    c = document.createElement('canvas');
    c.width = c.height = f;
    const x = c.getContext('2d');
    x.drawImage(im, 0, 0, f, f, 0, 0, f, f);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#3b3027';
    x.fillRect(0, 0, f, f);
    shadows.set(im.src, c);
  }
  return c;
}

export class Pokedex {
  constructor() {
    syncDex();
    this.done = false;
    this.gen = prefs.dexGen === 4 ? 4 : 5;
    loadJSON('data/pokedex.json').then((d) => { this.data = d; }, () => { this.failed = true; });
    this.lang();
    this.count();
  }
  count() {
    this.seen = 0; this.caught = 0;
    for (let sp = 1; sp <= DEX_N; sp++) { const v = dexState(sp); if (v) this.seen++; if (v === 2) this.caught++; }
  }
  // the English pages load the first time the Pokédex is open in English (here or after a language switch)
  lang() { if (EN && !this.en && !this.enLoading) { this.enLoading = true; loadJSON('data/pokedex_en.json').then((d) => { this.en = d; }, () => { this.enLoading = false; }); } }
  relang() { this.lang(); }
  list() { const L = TABS[at.tab].list; return L ? this.data[L] : null; }
  get n() { return this.list()?.length ?? DEX_N; }
  spAt(i) { return this.list()?.[i] ?? i + 1; }
  numAt(i) { return (TABS[at.tab].first ?? 1) + i; }
  get sel() { return at.sel[at.tab]; }
  set sel(v) { at.sel[at.tab] = clamp(v, 0, this.n - 1); }
  shown(sp) { return prefs.dexAll ? 2 : dexState(sp); } // 0 a shadow, 1 seen, 2 the whole page
  move(d) { const s = this.sel; this.sel = s + d; if (this.sel !== s) G.sfx?.('cursor'); }
  switchTab(k) { at.tab = (k + TABS.length) % TABS.length; G.sfx?.('cursor'); }
  switchGen(gen = this.gen === 4 ? 5 : 4) {
    if (gen === 4 && this.spAt(this.sel) > LAST4) return G.sfx?.('cancel'); // not in Pearl's Pokédex
    if (gen !== this.gen) { this.gen = gen; setPref('dexGen', gen); G.sfx?.('cursor'); }
  }
  toggleAll() { setPref('dexAll', !prefs.dexAll); G.sfx?.('confirm'); }
  cry() { const sp = this.spAt(this.sel); if (this.shown(sp)) cry(sp); } // its cry (Pearl's to #493, Black's after)
  close() { G.sfx?.('cancel'); this.done = true; }
  update() {
    if (!this.data) { if (input.hit('cancel') || this.failed) this.close(); return; }
    if (input.repeat('up')) this.move(-1);
    if (input.repeat('down')) this.move(1);
    if (input.repeat('left')) this.move(-10);
    if (input.repeat('right')) this.move(10);
    if (input.hit('tag')) this.switchTab(at.tab + 1);
    if (input.hit('ok')) this.switchGen();
    if (input.hit('rest')) this.toggleAll();
    if (input.hit('m1')) this.cry();
    if (input.hit('cancel')) return this.close();
    // a finger dragged over the list scrolls it a row per row height (the click a drag ends in is dropped)
    if (input.pan.y) {
      this.drag = (this.drag || 0) + input.pan.y;
      const k = Math.trunc(this.drag / ROW);
      if (k) { this.drag -= k * ROW; this.sel = this.sel - k; }
    }
    const c = input.click;
    if (!c) return;
    input.click = null;
    const hit = (b) => c.x >= b[0] && c.x < b[0] + b[2] && c.y >= b[1] && c.y < b[1] + b[3];
    const t = this.tabBoxes?.findIndex(hit);
    if (t >= 0) { if (t !== at.tab) this.switchTab(t); return; }
    if (this.genBoxes) for (const [gen, b] of this.genBoxes) if (hit(b)) return this.switchGen(gen);
    if (this.allBox && hit(this.allBox)) return this.toggleAll();
    if (this.closeBox && hit(this.closeBox)) return this.close();
    if (hit([194, 60, 100, 100])) return this.cry(); // the picture
    const j = Math.floor((c.y - LIST.y - 6) / ROW);
    if (c.x >= LIST.x && c.x < LIST.x + LIST.w && j >= 0 && j < ROWS && this.top + j < this.n) { const s = this.sel; this.sel = this.top + j; if (this.sel !== s) G.sfx?.('cursor'); }
  }
  drawUI() {
    ui.rect(0, 0, G.W, VH, COL.dim);
    if (!this.data) { ui.panel(VW / 2 - 70, VH / 2 - 14, 140, 28); ui.text(tr('도감을 펼치는 중…', 'Opening the Pokédex...'), VW / 2, VH / 2 - 6, { align: 'center' }); return; }
    this.drawHeader();
    this.drawList();
    this.drawPage(this.spAt(this.sel));
    this.drawFooter();
  }
  drawHeader() {
    ui.panel(8, 6, 464, 24);
    ui.text(tr('포켓몬 도감', 'Pokédex'), 16, 12, { bold: true, color: COL.red });
    this.tabBoxes = TABS.map((tb, k) => {
      const b = [96 + k * 80, 11, 76, 15];
      ui.rect(b[0], b[1], b[2], b[3], k === at.tab ? COL.ink2 : COL.paper2);
      ui.text(tb.name(), b[0] + b[2] / 2, b[1] + 3, { size: 9, align: 'center', color: k === at.tab ? '#fff4dc' : COL.ink });
      return b;
    });
    ui.text(tr(`발견 ${this.seen} · 포획 ${this.caught} / ${DEX_N}`, `Seen ${this.seen} · Caught ${this.caught} / ${DEX_N}`), 464, 14, { size: 9, align: 'right', color: COL.ink2 });
  }
  drawList() {
    const n = this.n, top = clamp(this.sel - Math.floor(ROWS / 2), 0, Math.max(0, n - ROWS));
    this.top = top;
    ui.panel(LIST.x, LIST.y, LIST.w, LIST.h, { accent: false });
    for (let j = 0; j < ROWS && top + j < n; j++) {
      const i = top + j, sp = this.spAt(i), y = LIST.y + 6 + j * ROW, v = dexState(sp), on = i === this.sel;
      if (on) ui.rect(LIST.x + 2, y - 1, LIST.w - 4, ROW, '#fff6dc');
      ui.text(`${on ? '▶' : ' '}${pad3(this.numAt(i))}`, LIST.x + 4, y + 1, { size: 9, color: on ? COL.red : COL.ink2 });
      ui.text(this.shown(sp) ? DEX.species[sp].name : '???', LIST.x + 40, y + 1, { size: 9, color: this.shown(sp) ? COL.ink : '#9a8a76' });
      if (v === 2) { ui.rect(LIST.x + LIST.w - 13, y + 2, 7, 7, COL.red); ui.rect(LIST.x + LIST.w - 13, y + 6, 7, 3, '#fff'); ui.rect(LIST.x + LIST.w - 13, y + 5, 7, 1, COL.ink); } // caught: a little ball
      else if (v === 1) ui.text('○', LIST.x + LIST.w - 9, y + 1, { size: 9, align: 'center', color: COL.ink2 });
    }
    if (top > 0) ui.text('▲', LIST.x + LIST.w - 10, LIST.y - 1, { size: 9, color: COL.red });
    if (top + ROWS < n) ui.text('▼', LIST.x + LIST.w - 10, LIST.y + LIST.h - 10, { size: 9, color: COL.red });
  }
  drawPage(sp) {
    const x = 186, y = 34, w = 286, e = this.data.e[sp], d = DEX.species[sp], show = this.shown(sp);
    // in English the pages read from the English translation of the ROM's Korean texts (pokedex_en.json), once loaded
    const t = (EN && this.en?.e[sp]) || e;
    const gen = this.gen === 4 && sp <= LAST4 ? 4 : 5, [cat, text] = gen === 4 ? [t[0], t[1]] : [t[2], t[3]];
    ui.panel(x, y, w, 222, { fill: '#fbf3dd' });
    // the two games' pages
    this.genBoxes = [[4, [x + 8, y + 7, 92, 14]], [5, [x + 104, y + 7, 100, 14]]];
    for (const [g, b] of this.genBoxes) {
      const off = g === 4 && sp > LAST4;
      ui.rect(b[0], b[1], b[2], b[3], g === gen ? COL.red : off ? '#d9ccb0' : COL.paper2);
      ui.text(g === 4 ? tr('4세대 · 펄', 'Gen 4 · Pearl') : tr('5세대 · 블랙', 'Gen 5 · Black'), b[0] + b[2] / 2, b[1] + 3, { size: 9, align: 'center', color: g === gen ? '#fff4dc' : off ? '#a89878' : COL.ink });
    }
    // picture: the shadow of one not met yet
    ui.panel(x + 8, y + 26, 100, 100, { accent: false, fill: '#fffaf0' });
    const { im, f } = picture(sp, gen), o = (100 - f) / 2;
    if (show) ui.image(im, 0, 0, f, f, x + 8 + o, y + 26 + o, f, f);
    else { const s = shadow(im, f); if (s) ui.c.drawImage(s, x + 8 + o, y + 26 + o); }
    const ix = x + 116;
    const tab = TABS[at.tab].list ? `${TABS[at.tab].name().split(' ')[0]} No.${pad3(this.numAt(this.sel))} · ` : '';
    ui.text(`${tab}${tr('전국', 'National')} No.${pad3(sp)}`, ix, y + 28, { size: 9, color: COL.ink2 });
    ui.text(show ? d.name : '???', ix, y + 42, { bold: true });
    ui.text(show ? cat : tr('???포켓몬', '??? Pokémon'), ix, y + 58, { size: 9, color: COL.ink2 });
    if (show) d.types.forEach((t, k) => { ui.rect(ix + k * 44, y + 72, 40, 12, TYPE_COLORS[t]); ui.text(DEX.types[t], ix + 20 + k * 44, y + 73, { size: 9, color: '#fff', align: 'center' }); });
    const full = show === 2;
    ui.text(tr(`키 ${full ? e[4].toFixed(1) : '???'} m`, `Height ${full ? e[4].toFixed(1) : '???'} m`), ix, y + 92, { size: 9 });
    ui.text(tr(`몸무게 ${full ? d.kg.toFixed(1) : '???'} kg`, `Weight ${full ? d.kg.toFixed(1) : '???'} kg`), ix, y + 106, { size: 9 });
    ui.text(gen === 4 ? tr('포켓몬스터 펄 도감', 'Pokémon Pearl Pokédex') : tr('포켓몬스터 블랙 도감', 'Pokémon Black Pokédex'), x + w - 8, y + 116, { size: 9, align: 'right', color: COL.gold });
    // the text, then the base stats
    const say = full ? text : show ? tr('잡으면 도감에 설명이 기록된다.', 'Catch it to record its entry.') : tr('아직 만나지 못한 포켓몬이다.', 'You have not met this Pokémon yet.');
    ui.wrap(say, w - 20, 9).slice(0, 3).forEach((l, k) => ui.text(l, x + 10, y + 132 + k * 12, { size: 9 }));
    if (!full) return;
    STATS().forEach((name, k) => {
      const v = d.base[k], sx = x + 10 + Math.floor(k / 3) * 138, sy = y + 184 + (k % 3) * 11; // HP, Atk, Def | SpA, SpD, Spe
      ui.text(name, sx, sy, { size: 9, color: COL.ink2 });
      ui.text(String(v), sx + 52, sy, { size: 9, align: 'right' });
      ui.rect(sx + 56, sy + 2, 72, 6, '#e0d2b0');
      ui.rect(sx + 56, sy + 2, Math.round(72 * Math.min(v, 180) / 180), 6, v >= 100 ? COL.green : v >= 60 ? COL.gold : COL.red);
    });
    ui.text(tr(`합계 ${d.base.reduce((a, b) => a + b, 0)}`, `Total ${d.base.reduce((a, b) => a + b, 0)}`), x + w - 8, y + 171, { size: 9, align: 'right', color: COL.ink2 });
  }
  drawFooter() {
    const y = VH - 12;
    ui.rect(0, VH - 15, VW, 15, 'rgba(20,14,10,0.92)'); // over the scene's own key hints
    this.allBox = [8, y - 1, 66, 12];
    ui.rect(...this.allBox, prefs.dexAll ? COL.red : COL.paper2);
    ui.text(tr(`전체 보기 ${prefs.dexAll ? '켬' : '끔'}`, `Show all ${prefs.dexAll ? 'on' : 'off'}`), 8 + 33, y + 1, { size: 9, align: 'center', color: prefs.dexAll ? '#fff4dc' : COL.ink });
    this.closeBox = [VW - 48, y - 1, 40, 12];
    ui.rect(...this.closeBox, COL.paper2);
    ui.text(tr('닫기', 'Close'), VW - 28, y + 1, { size: 9, align: 'center' });
    const hint = touchUI ? tr('끌어서 넘기기 · 탭으로 고르기 · 그림을 누르면 울음소리', 'Drag to scroll · tap to pick · tap the picture for its cry')
      : tr('↑↓ 고르기 · ←→ 10칸 · Z 4/5세대 · Tab 도감 · Q 울음소리 · A 전체 · X 닫기', '↑↓ pick · ←→ 10 · Z Gen 4/5 · Tab dex · Q cry · A all · X close');
    ui.text(hint, VW / 2 + 8, y + 1, { size: 9, align: 'center', color: '#fff', shadow: true });
  }
}
export function openPokedex() { G.overlays.push(new Pokedex()); }
