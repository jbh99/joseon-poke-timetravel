// Title, starter selection, era transition cards, world map and ending.
import { G, VW, VH, TILE, img, ready, input, ui, COL, say, openMenu, toast, fadeTo, setScene, clamp, loadJSON, prefs } from './core.js';
import { playBgm, sfx, cry, jingle, preloadBgm } from './audio.js';
import { S, DEX, newGame, hasSave, readSave, load, save, TYPE_COLORS } from './game.js';
import { ERAS, STARTERS, CELEBI, CELEBI_INTRO } from './content.js';
import { era, mainStep, activeSides, lines, eraComplete, liftLevels, chooseFaction, talkTown, questMenu, rosterMenu } from './quests.js';
import { drawMon, BLD } from './town.js';
import { tileSet, paintTerrain } from './pmd.js';
import { tr, EN, LANG, setLang } from './i18n.js';

// Backdrops are painted from PMD Blue Rescue Team chunk sets: a clearing ringed by the set's walls, a pond,
// and Pokémon of the era wandering across it.
const backdrops = new Map();
function backdrop(setId, seed = 1) {
  const key = `${setId}:${seed}`;
  if (backdrops.has(key)) return backdrops.get(key);
  const set = tileSet(setId);
  if (!set.meta || !ready(set.im)) return null;
  const W = 26, H = 14;
  let s = seed * 9301 + 49297;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const grid = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => {
    const edge = Math.min(x, W - 1 - x, y, H - 1 - y);
    return edge < 1 || (edge < 3 && rnd() < 0.45) ? 0 : 1;
  }));
  const px = 4 + Math.floor(rnd() * (W - 12)), py = 4 + Math.floor(rnd() * 3);
  for (let y = py; y < py + 3; y++) for (let x = px; x < px + 4 + Math.floor(rnd() * 3); x++) if (grid[y]?.[x]) grid[y][x] = 2;
  const cv = document.createElement('canvas');
  cv.width = W * 24; cv.height = H * 24;
  paintTerrain(cv.getContext('2d'), set, W, H, (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? null : grid[y][x]), 0, 0, seed);
  backdrops.set(key, cv);
  return cv;
}
function drawBackdrop(c, setId, seed, zoom = 1, ox = 0, oy = 0) {
  const cv = backdrop(setId, seed);
  if (!cv) { c.fillStyle = '#1a1620'; c.fillRect(0, 0, VW, VH); return; }
  const w = cv.width * zoom, h = cv.height * zoom;
  c.drawImage(cv, Math.round((VW - w) / 2 + ox), Math.round((VH - h) / 2 + oy), Math.round(w), Math.round(h));
}
// every era gets a backdrop: its own card, else its first dungeon's chunk set and its NPCs
const cardOf = (e) => e.card || { set: Object.values(e.dungeons)[0].tiles, mons: e.npcs.slice(0, 4).map((n) => n.sp) };
// ---------------------------------------------------------------- title
export class Title {
  enter() { playBgm('title'); this.t = 0; this.menu = null; this.started = false; tileSet(41); }
  update(dt) {
    this.t += dt;
    if (this.reopen || (!this.started && (input.hit('ok') || input.hit('cancel') || input.tap(0, 0, VW, VH)))) {
      if (!this.reopen) sfx('confirm');
      this.started = true; this.reopen = false;
      const items = [{ label: tr('새로운 여행', 'New journey'), fn: () => this.newGame() }, { label: 'Language / 언어', right: EN ? 'English' : '한국어', fn: () => setLang(EN ? 'ko' : 'en') }];
      const sv = readSave();
      if (sv) {
        const pt = Math.floor((sv.playtime || 0) / 60);
        items.unshift({ label: tr('이어하기', 'Continue'), right: `${ERAS[sv.era]?.year ?? '?'}${tr('년', '')} · ${Math.floor(pt / 60)}:${String(pt % 60).padStart(2, '0')}`, fn: () => {
          if (load()) fadeTo(() => { liftLevels(); G.goTown(); });
          else { this.started = false; toast(tr('기록을 불러오지 못했다. 새로 시작해 주세요.', 'Could not load the save. Please start a new game.'), COL.red); }
        } });
      }
      this.menu = openMenu(items, { x: VW / 2 - 85, y: 196, w: 170, onCancel: () => { this.started = false; } });
    }
  }
  // the language row shows the language in use; rebuild the menu so every label follows a switch
  relang() {
    if (!this.started) return;
    if (this.menu) G.overlays = G.overlays.filter((o) => o !== this.menu);
    this.reopen = true;
  }
  newGame() {
    const go = () => fadeTo(() => setScene(new Intro()));
    if (hasSave()) say([{ who: 'narr', text: tr('새로 시작하면 기존 기록을 덮어씁니다. 괜찮나요?', 'Starting over will overwrite your saved journey. Is that OK?'), choices: tr(['새로 시작', '취소'], ['Start over', 'Cancel']), onChoice: (i) => { if (i === 0) go(); else this.started = false; } }]);
    else go();
  }
  draw(c) {
    drawBackdrop(c, 41, 3, 1.04 + Math.sin(this.t * 0.15) * 0.02);
    c.fillStyle = 'rgba(10,6,20,0.25)'; c.fillRect(0, 0, VW, VH);
    // Celebi floating
    const im = img('poke/front/251.png');
    if (ready(im)) c.drawImage(im, Math.floor(this.t * 2) % 2 * 80, 0, 80, 80, 356, 62 + Math.sin(this.t * 2) * 4, 80, 80);
    STARTERS.forEach((sp, i) => drawMon(c, sp, true, 170 + i * 70, 250, { moving: true, facing: 'right', phase: i }));
  }
  drawUI() {
    const y = 40;
    ui.text(tr('포켓몬스터', 'Pokémon'), VW / 2, y - 18, { align: 'center', size: 11, bold: true, color: '#ffe9a8', shadow: '#2a1400' });
    ui.c.save(); ui.c.scale(2, 2);
    ui.text(tr('조선 시간여행', 'Joseon Time Travel'), VW / 4, y / 2, { align: 'center', size: 11, bold: true, color: '#fff7e6', shadow: '#3a1a10' });
    ui.c.restore();
    ui.text(tr('612 → 1953 · 시간의 꽃과 아르세우스', '612 → 1953 · The Flower of Time and Arceus'), VW / 2, y + 32, { align: 'center', size: 9, color: '#fff', shadow: true });
    if (!this.started && Math.floor(this.t * 2) % 2) ui.text(tr('Z 키 또는 Enter를 누르세요', 'Press Z or Enter'), VW / 2, 206, { align: 'center', color: '#fff', shadow: true });
    ui.text(tr('팬메이드 비공식 게임 · 원작 © Nintendo / Creatures / GAME FREAK', 'Unofficial fan game · Pokémon © Nintendo / Creatures / GAME FREAK'), VW / 2, VH - 11, { align: 'center', size: 9, color: '#ddd', shadow: true });
  }
}

// ---------------------------------------------------------------- intro & starter choice
export class Intro {
  enter() {
    playBgm('legend');
    this.phase = 'talk'; this.sel = 0; this.t = 0; this.starter = null;
    G.dialogSpeaker = (L) => { if (L?.who === CELEBI && !this.cried) { cry(CELEBI); this.cried = true; } };
    say(CELEBI_INTRO, () => { this.phase = 'pick'; say([{ who: CELEBI, name: tr('세레비', 'Celebi'), text: tr('먼저 너는 어떤 포켓몬이었는지 떠올려 봐!', 'First, try to remember which Pokémon you were!') }]); });
  }
  exit() { G.dialogSpeaker = null; }
  get choices() { return this.phase === 'partner' ? STARTERS.filter((s) => s !== this.starter) : STARTERS; }
  update(dt) {
    this.t += dt;
    if (G.overlays.length || (this.phase !== 'pick' && this.phase !== 'partner')) return;
    const n = this.choices.length;
    if (input.repeat('left')) { this.sel = (this.sel + n - 1) % n; sfx('cursor'); cry(this.choices[this.sel]); }
    if (input.repeat('right')) { this.sel = (this.sel + 1) % n; sfx('cursor'); cry(this.choices[this.sel]); }
    if (input.hit('ok')) {
      const sp = this.choices[this.sel];
      say([{ who: sp, shiny: true, name: DEX.species[sp].name, text: this.phase === 'pick' ? tr(`반짝이는 ${DEX.species[sp].name}! 이 모습이 맞아?`, `A sparkling ${DEX.species[sp].name}! Is this you?`) : tr(`${DEX.species[sp].name}와(과) 함께 여행할까?`, `Travel together with ${DEX.species[sp].name}?`), choices: tr(['응!', '다시 고를래'], ['Yes!', 'Let me choose again']), onChoice: (i) => {
        if (i) return;
        if (this.phase === 'pick') {
          this.starter = sp; this.sel = 0; this.phase = 'partner';
          say([{ who: CELEBI, name: tr('세레비', 'Celebi'), text: tr('좋아! 그럼 함께 여행할 친구도 골라 볼까? 이 친구도 시간을 건너와서 몸 색이 달라졌어.', 'Great! Now pick a friend to travel with. Crossing time changed its colors too.') }]);
        } else {
          newGame(this.starter, sp);
          this.phase = 'done';
          say([{ who: CELEBI, name: tr('세레비', 'Celebi'), text: tr('준비됐지? 첫 번째 꽃잎이 있는 곳, 1392년으로 간다!', 'Ready? Off to 1392, where the first petal fell!') }], () => { sfx('warp'); fadeTo(() => setScene(new EraCard()), '#fff', 1.5); });
        }
      } }]);
    }
  }
  draw(c) {
    const g = c.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#16304a'); g.addColorStop(1, '#3a6a5a');
    c.fillStyle = g; c.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,255,220,${0.3 + 0.3 * Math.sin(this.t * 2 + i)})`; c.fillRect((i * 83) % VW, (i * 47 + this.t * 6) % VH, 1, 1); }
    if (this.phase === 'talk') {
      const im = img('poke/front/251.png');
      if (ready(im)) c.drawImage(im, Math.floor(this.t * 2) % 2 * 80, 0, 80, 80, VW / 2 - 60, 40 + Math.sin(this.t * 2) * 4, 120, 120);
    }
  }
  drawUI() {
    if (this.phase !== 'pick' && this.phase !== 'partner') return;
    const ch = this.choices;
    ui.text(this.phase === 'pick' ? tr('나는 누구였을까?', 'Who were you?') : tr('함께 갈 친구는?', 'Who comes with you?'), VW / 2, 14, { align: 'center', bold: true, color: '#fff', shadow: true });
    ch.forEach((sp, i) => {
      const w = 130, x = VW / 2 - (ch.length * (w + 10)) / 2 + i * (w + 10) + 5, y = 34;
      ui.panel(x, y, w, 150, { fill: i === this.sel ? '#fff6dc' : COL.paper2 });
      const im = img(`poke/front/${sp}s.png`);
      ui.image(im, Math.floor(this.t * 3) % 2 && i === this.sel ? 80 : 0, 0, 80, 80, x + 25, y + 12, 80, 80);
      ui.text(DEX.species[sp].name, x + w / 2, y + 98, { align: 'center', bold: true });
      ui.text(tr('★ 이로치', '★ Shiny'), x + w / 2, y + 112, { align: 'center', size: 9, color: COL.gold });
      DEX.species[sp].types.forEach((t) => { ui.rect(x + w / 2 - 20, y + 126, 40, 13, TYPE_COLORS[t]); ui.text(DEX.types[t], x + w / 2, y + 127, { align: 'center', size: 9, color: '#fff' }); });
      if (i === this.sel) ui.text('▼', x + w / 2, y - 12, { align: 'center', color: '#ffe080', shadow: true });
    });
    ui.text(tr('← → 선택 · Z 결정', '← → choose · Z confirm'), VW - 10, 16, { align: 'right', size: 9, color: '#fff', shadow: true }); // above the cards: Celebi's dialogue covers the bottom
  }
}

// ---------------------------------------------------------------- era card
export class EraCard {
  enter() {
    const e = era();
    this.e = e; this.t = 0;
    this.fromYear = S.era > 0 ? ERAS[S.era - 1].year : e.year - 30;
    tileSet(cardOf(e).set);
    playBgm(e.town.bgm, 1.2);
    preloadBgm(e.world);
    this.talked = false;
  }
  update(dt) {
    this.t += dt;
    if (!this.talked && this.t > 2.6) {
      this.talked = true;
      say(this.e.intro.map((text) => ({ who: 'narr', text }))).then(async () => {
        if (this.e.faction && !S.faction) await chooseFaction();
        fadeTo(() => { save(); G.goTown(1); }, '#000', 2);
      });
    }
    if (!this.talked && this.t > 0.6 && input.hit('ok')) this.t = 2.6;
  }
  draw(c) {
    const card = cardOf(this.e);
    drawBackdrop(c, card.set, this.e.id, 1.02 + this.t * 0.006, -this.t * 0.8, 0);
    card.mons.forEach((sp, i) => drawMon(c, sp, false, 70 + i * 92 - this.t * 4, 150 + (i % 2) * 22, { face: [i % 2 ? -1 : 1, 1], moving: true, phase: i }));
    const g = c.createLinearGradient(0, VH * 0.45, 0, VH); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
    c.fillStyle = g; c.fillRect(0, 0, VW, VH);
    // landmark sprites from Blender in the foreground
    const props = this.e.artProps || [];
    let x = VW - 20;
    for (const p of props.slice().reverse()) {
      const im = img(`bld/${p}.png`); const m = BLD[p];
      if (!ready(im) || !m) continue;
      const s = p === 'wallseg' ? 1 : Math.min(1, 170 / im.width);
      x -= im.width * s;
      c.drawImage(im, Math.round(x), Math.round(VH - 92 - im.height * s), Math.round(im.width * s), Math.round(im.height * s));
      x -= 4;
    }
    S.party.forEach((m, i) => drawMon(c, m.sp, true, 40 + i * 30 + Math.min(this.t, 3) * 20, VH - 86, { moving: true, facing: 'right', phase: i }));
    if (this.t < 0.6) { c.fillStyle = `rgba(255,255,255,${1 - this.t / 0.6})`; c.fillRect(0, 0, VW, VH); }
  }
  drawUI() {
    const f = clamp((this.t - 0.4) / 1.6, 0, 1);
    const yr = Math.round(this.fromYear + (this.e.year - this.fromYear) * (1 - (1 - f) ** 3));
    const c = ui.c;
    c.save(); c.scale(3, 3);
    ui.text(`${yr}`, VW / 6, 16, { align: 'center', bold: true, color: '#fff8e6', shadow: '#2a1a10' });
    c.restore();
    if (f >= 1) {
      ui.text(tr(`제${this.e.id}장 · ${this.e.title}`, `Chapter ${this.e.id} · ${this.e.title}`), VW / 2, 90, { align: 'center', bold: true, color: '#ffe9a8', shadow: '#000' });
      ui.text(this.e.sub, VW / 2, 105, { align: 'center', size: 9, color: '#fff', shadow: '#000' });
    }
  }
}

// ---------------------------------------------------------------- world map
const MZ = 2, MVW = 316;
export class WorldMap {
  constructor() { this.sel = 0; }
  async enter() {
    this.e = era();
    this.meta = await loadJSON('data/worldmap.json');
    playBgm(this.e.world);
    this.nodes = this.e.nodes;
    this.sel = Math.max(0, this.nodes.findIndex((n) => n.id === (S.lastNode || 'town')));
    const n = this.nodes[this.sel];
    [this.cx, this.cy] = this.camFor(n);
    [this.tx, this.ty] = this.pos(n);
  }
  pos(n) { // map pixel coordinates at 1x
    const m = this.meta || { lon0: 123.5, lon1: 132, lat0: 33, lat1: 43, w: 300, h: 445 };
    return [(n.lon - m.lon0) / (m.lon1 - m.lon0) * m.w, (m.lat1 - n.lat) / (m.lat1 - m.lat0) * m.h];
  }
  scr(n) { const [x, y] = this.pos(n); return [x * MZ - this.cx, y * MZ - this.cy]; }
  camFor(n) {
    const [x, y] = this.pos(n), m = this.meta || { w: 300, h: 445 };
    return [clamp(x * MZ - MVW / 2, 0, m.w * MZ - MVW), clamp(y * MZ - VH / 2, 0, m.h * MZ - VH)];
  }
  tags(n) {
    const st = mainStep(), out = [];
    if (n.d && st?.do === 'dungeon' && st.d === n.d) out.push('main');
    if ((n.id === 'town' || n.town) && ((st?.do === 'talk' && talkTown(st) === (n.town || 1)) || (eraComplete() && n.id === 'town'))) out.push('main');
    if (n.d && activeSides(n.d).length) out.push('side');
    if (n.d && this.e.dungeons[n.d]?.legend && !S.flags['legend_' + n.d]) out.push('legend');
    return out;
  }
  update(dt) {
    if (!this.nodes || G.overlays.length) return;
    const k = this.nodes.length;
    if (input.repeat('down') || input.repeat('right')) { this.sel = (this.sel + 1) % k; sfx('cursor'); }
    if (input.repeat('up') || input.repeat('left')) { this.sel = (this.sel + k - 1) % k; sfx('cursor'); }
    // a click on a place (its icon or name) picks it and goes there, like Z
    let go = false;
    const c = input.tap(0, 0, MVW, VH);
    if (c) {
      let best = -1, bd = 18;
      this.nodes.forEach((m, i) => { const [x, y] = this.scr(m); const d = Math.hypot(x - c.x, y + 5 - c.y); if (d < bd) { bd = d; best = i; } });
      if (best >= 0) { if (best !== this.sel) sfx('cursor'); this.sel = best; go = true; }
    }
    const n = this.nodes[this.sel];
    const [x, y] = this.pos(n), [cx, cy] = this.camFor(n);
    this.tx += (x - this.tx) * Math.min(1, dt * 8); this.ty += (y - this.ty) * Math.min(1, dt * 8);
    this.cx += (cx - this.cx) * Math.min(1, dt * 6); this.cy += (cy - this.cy) * Math.min(1, dt * 6);
    if (input.hit('ok') || go) {
      S.lastNode = n.id;
      if (n.mark) return say([{ who: 'narr', text: `【${n.name}】 ${n.text}` }]);
      if (n.id === 'town' || n.town) return fadeTo(() => G.goTown(n.town || 1));
      const d = this.e.dungeons[n.d];
      say([{ who: 'narr', text: tr(`${d.name} (${d.floors}층 · 적 레벨 ${d.lv[0]}~${d.lv[1] + 1})에 들어갈까?`, `Enter ${d.name}? (${d.floors} floors · foes Lv ${d.lv[0]}-${d.lv[1] + 1})`), choices: tr(['출발!', '그만두기'], ['Set out!', 'Not now']), onChoice: (i) => { if (i === 0) fadeTo(() => G.goDungeon(n.d)); } }]);
    }
    if (input.hit('quest')) return questMenu();
    if (input.hit('party')) return rosterMenu(); // companions can be swapped anywhere outside dungeons
    if (input.hit('cancel')) fadeTo(() => G.goTown());
  }
  draw(c) {
    c.fillStyle = '#3a5f78'; c.fillRect(0, 0, VW, VH);
    if (!this.nodes) return;
    const im = img('img/worldmap.png');
    if (ready(im)) c.drawImage(im, this.cx / MZ, this.cy / MZ, MVW / MZ, VH / MZ, 0, 0, MVW, VH);
    const [tx0, ty0] = this.scr(this.nodes.find((n) => n.id === 'town'));
    c.strokeStyle = 'rgba(90,40,20,0.8)'; c.setLineDash([3, 3]); c.lineWidth = 1;
    for (const n of this.nodes) if (n.d) { const [x, y] = this.scr(n); c.beginPath(); c.moveTo(tx0, ty0); c.lineTo(x, y); c.stroke(); }
    c.setLineDash([]);
    this.nodes.forEach((n, i) => {
      let [x, y] = this.scr(n);
      x = Math.round(x); y = Math.round(y);
      const on = i === this.sel;
      if (n.mark) { c.fillStyle = '#3a2a1a'; c.fillRect(x - 5, y - 5, 10, 10); c.fillStyle = on ? '#fff1b0' : '#e7d6a8'; c.fillRect(x - 4, y - 4, 8, 8); c.fillStyle = COL.red; c.fillRect(x - 4, y - 4, 2, 8); }
      else if (n.id === 'town' || n.town) { c.fillStyle = '#2a1a10'; c.fillRect(x - 8, y - 7, 16, 14); c.fillStyle = '#f0e6d0'; c.fillRect(x - 6, y - 1, 12, 7); c.fillStyle = '#3c3c48'; c.fillRect(x - 9, y - 7, 18, 6); c.fillStyle = '#b2352b'; c.fillRect(x - 1, y + 1, 3, 5); }
      else { c.fillStyle = '#2a1a10'; c.beginPath(); c.moveTo(x - 9, y + 7); c.lineTo(x, y - 9); c.lineTo(x + 9, y + 7); c.fill(); c.fillStyle = '#8a6a48'; c.beginPath(); c.moveTo(x - 7, y + 6); c.lineTo(x, y - 7); c.lineTo(x + 7, y + 6); c.fill(); c.fillStyle = '#1a1010'; c.fillRect(x - 2, y + 1, 5, 5); }
      if (on) { c.strokeStyle = '#fff'; c.lineWidth = 1; c.strokeRect(x - 11.5, y - 11.5, 23, 23); }
      const nm = n.name;
      c.font = '9px Galmuri9'; c.textAlign = 'center'; c.textBaseline = 'top';
      c.fillStyle = 'rgba(30,20,10,0.75)'; const tw = c.measureText(nm).width; c.fillRect(x - tw / 2 - 2, y + 10, tw + 4, 11);
      c.fillStyle = on ? '#ffe9a8' : '#fff'; c.fillText(nm, x, y + 11);
      this.tags(n).forEach((t, k) => {
        const bx = x + 9 + k * 8, by = Math.round(y - 16 + Math.sin(G.time * 5 + i) * 1.5);
        c.fillStyle = '#1a1010'; c.fillRect(bx - 1, by - 1, 8, 10);
        c.fillStyle = t === 'main' ? '#d0352a' : t === 'legend' ? '#e0b030' : '#2f6ad0'; c.fillRect(bx, by, 6, 8);
        c.fillStyle = '#fff';
        if (t === 'main') { c.fillRect(bx + 2, by + 1, 2, 4); c.fillRect(bx + 2, by + 6, 2, 1); }
        else if (t === 'legend') { c.fillRect(bx + 2, by + 1, 2, 6); c.fillRect(bx + 1, by + 3, 4, 2); } // star-ish sparkle
        else { c.fillRect(bx + 1, by + 1, 4, 1); c.fillRect(bx + 4, by + 2, 1, 2); c.fillRect(bx + 2, by + 4, 2, 1); c.fillRect(bx + 2, by + 6, 2, 1); }
      });
    });
    const [a, b, m3] = S.party;
    const px = this.tx * MZ - this.cx, py = this.ty * MZ - this.cy;
    if (m3) drawMon(c, m3.sp, m3.shiny, px - 26, py, { moving: true, phase: 2 });
    drawMon(c, b.sp, true, px - 10, py + 2, { moving: true, phase: 1 });
    drawMon(c, a.sp, true, px + 8, py + 4, { moving: true });
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(MVW, 0, 2, VH);
  }
  drawUI() {
    if (!this.nodes) return;
    const x = 324, w = VW - x - 8;
    // panels grow with wrapped text (English titles run longer than Korean)
    const tx = x + 8 + ui.measure(tr(`${this.e.year}년`, `${this.e.year}`), 11, true) + 6;
    const titleL = ui.wrap(this.e.title, x + w - 8 - tx, 11), subL = ui.wrap(this.e.sub, w - 16, 9);
    const h1 = 26 + (titleL.length - 1) * 13 + 11 + subL.length * 11;
    ui.panel(x, 8, w, h1);
    ui.text(tr(`${this.e.year}년`, `${this.e.year}`), x + 8, 14, { bold: true, color: COL.red });
    titleL.forEach((l, i) => ui.text(l, tx, 14 + i * 13, { bold: true }));
    const yy = 30 + (titleL.length - 1) * 13;
    ui.text(this.e.years, x + 8, yy, { size: 9, color: COL.ink2 });
    subL.forEach((l, i) => ui.text(l, x + 8, yy + 11 + i * 11, { size: 9, color: COL.ink2 }));
    const n = this.nodes[this.sel];
    const lines2 = [];
    if (n.mark) lines2.push(...ui.wrap(n.text, w - 16, 9));
    else if (n.id === 'town') lines2.push(tr('마을: 주막 · 장터 · 방(榜)', 'Town: inn · market · board'), tr('시간의 문이 있는 곳', 'Home of the Time Gate'));
    else if (n.town) lines2.push(tr('마을: 주막 · 장터', 'Town: inn · market'), tr('이 시대의 또 다른 마을', 'Another town of this era'));
    else {
      const d = this.e.dungeons[n.d];
      lines2.push(tr(`${d.floors}층 · 적 Lv ${d.lv[0]}~${d.lv[1] + 1}`, `${d.floors} floors · foes Lv ${d.lv[0]}-${d.lv[1] + 1}`));
      if (d.water) lines2.push(tr('[해전] 물 타입 포켓몬만 출전한다', '[Naval] Only Water-type Pokémon can fight'));
      if (d.legend) lines2.push(S.flags['legend_' + n.d] ? tr('전설의 포켓몬과 이미 만났다', 'Legend already met') : tr('★ 전설의 포켓몬의 기척이 있다!', '★ A legendary presence!'), tr('이기면 동료가 될지도…', 'Win and it may join you...'));
      else if (d.boss && mainStep()?.d === n.d) lines2.push(tr('깊은 곳에 강한 기척이 있다…', 'Something strong lurks deep inside...'));
    }
    const py = 14 + h1, nameL = ui.wrap(n.name, w - 16, 11), ny = py + 6 + nameL.length * 13 + 3;
    const wrapped2 = lines2.flatMap((l) => ui.wrap(l, w - 16, 9));
    ui.panel(x, py, w, ny - py + wrapped2.length * 12 + 4);
    nameL.forEach((l, i) => ui.text(l, x + 8, py + 6 + i * 13, { bold: true }));
    wrapped2.forEach((l, i) => ui.text(l, x + 8, ny + i * 12, { size: 9, color: COL.ink2 }));
    // quests
    const qs = [];
    const st = mainStep();
    qs.push({ t: eraComplete() ? tr('시간의 문이 열렸다!', 'The Time Gate is open!') : st?.log, c: COL.red });
    for (const q of activeSides()) qs.push({ t: `${q.title}${q.d ? ' — ' + (this.e.dungeons[q.d]?.name || '') : ''}`, c: COL.blue });
    const qlines = qs.flatMap((q) => ui.wrap('· ' + q.t, w - 16, 9).map((t) => ({ t, c: q.c })));
    const qy = ny + wrapped2.length * 12 + 10, room = Math.max(1, Math.floor((VH - 22 - qy - 22) / 11));
    const shown = qlines.slice(0, room);
    ui.panel(x, qy, w, 22 + shown.length * 11);
    ui.text(tr('이 시대의 퀘스트', 'Quests of this era'), x + 8, qy + 6, { size: 9, bold: true });
    shown.forEach((q, i) => ui.text(q.t, x + 8, qy + 19 + i * 11, { size: 9, color: q.c }));
    if (prefs.hints) ui.text(tr('클릭·↑↓ 장소 · Z 이동 · J 퀘스트 · P 동료 · X 마을로', 'Click/↑↓ place · Z go · J quests · P team · X town'), x + w, VH - 12, { size: 9, align: 'right', color: '#fff', shadow: true });
  }
}

// ---------------------------------------------------------------- ending
const hofX = (i) => VW / 2 + (i - (S.party.length - 1) / 2) * (S.party.length > 2 ? 140 : 160); // hall-of-fame column centres
export class Ending {
  enter() {
    playBgm('ending', 1.5);
    tileSet(41); tileSet(33);
    this.t = 0; this.phase = 0;
    this.credits = [
      ...tr(['— 포켓몬스터 조선 시간여행 —', '', '612 살수대첩 · 660 황산벌 · 676 기벌포 해전', '1019 귀주대첩 · 1232 처인성 · 1251 팔만대장경', '1380 진포 대첩 · 1388 위화도 회군',
        '1392 조선 건국 · 1446 훈민정음 반포', '1592 임진왜란 · 1598 노량 해전 · 1636 병자호란', '1796 수원 화성 완공 · 1866 병인양요 · 1871 신미양요',
        '1897 대한제국 선포 · 1919 3·1 운동', '1920 청산리 대첩 · 1940 한국광복군 창설', '1945년 8월 15일 광복', '1950 – 1953 한국 전쟁 · 정전', '', '', '함께한 포켓몬'],
      ['— Pokémon Joseon Time Travel —', '', '612 Salsu · 660 Hwangsanbeol · 676 Gibeolpo', '1019 Gwiju · 1232 Cheoin Fortress · 1251 Tripitaka Koreana', '1380 Jinpo · 1388 Wihwado retreat',
        '1392 Joseon founded · 1446 Hunminjeongeum proclaimed', '1592 Imjin War · 1598 Noryang · 1636 Qing invasion', '1796 Hwaseong Fortress · 1866 French and 1871 U.S. expeditions',
        '1897 Korean Empire proclaimed · 1919 March 1st Movement', '1920 Battle of Cheongsanri · 1940 Korean Liberation Army', 'Liberation, August 15, 1945', '1950 – 1953 Korean War · armistice', '', '', 'Your team']),
      ...S.party.map((m) => `${m.name} Lv.${m.lv}${m.shiny ? ' ★' : ''}`), ...(S.roster.length ? [tr(`그리고 동료 ${S.roster.length}마리`, `and ${S.roster.length} more companions`)] : []), '', '',
      ...tr(['원작 그래픽 · 음악', '포켓몬스터 펄 (ROM에서 추출, 직접 렌더링)', '포켓몬 불가사의 던전 파랑구조대 (던전 · 스프라이트 · 초상화)', '© Nintendo · Creatures · GAME FREAK · Chunsoft', '',
        '건물 · 거북선 · 판옥선', 'Blender 5.2 절차적 모델링', '', '글꼴', 'Galmuri (OFL)', '', '',
        '역사를 잊은 민족에게 미래는 없다', '', '', '플레이해 주셔서 감사합니다!'],
      ['Original graphics · music', 'Pokémon Pearl (extracted from the ROM, rendered here)', 'Pokémon Mystery Dungeon: Blue Rescue Team (dungeons · sprites · portraits)', '© Nintendo · Creatures · GAME FREAK · Chunsoft', '',
        'Buildings · turtle ship · panokseon', 'Blender 5.2 procedural models', '', 'Font', 'Galmuri (OFL)', '', '',
        'A people that forgets its history has no future', '', '', 'Thank you for playing!']),
    ];
  }
  update(dt) {
    this.t += dt;
    if (this.phase === 0 && (this.t > this.credits.length * 2.2 + 8 || input.hit('ok'))) { this.phase = 1; this.t = 0; playBgm('halloffame'); S.party.forEach((m) => cry(m.sp)); }
    else if (this.phase === 1 && this.t > 2 && input.hit('ok')) fadeTo(() => setScene(new Title()));
  }
  draw(c) {
    drawBackdrop(c, this.phase === 0 ? 41 : 33, this.phase === 0 ? 5 : 9, 1.05 + this.t * 0.002);
    c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(0, 0, VW, VH);
    if (this.phase === 1) S.party.forEach((m, i) => { const im = img(`poke/front/${m.sp}${m.shiny ? 's' : ''}.png`); if (ready(im)) c.drawImage(im, Math.floor(G.time * 2) % 2 * 80, 0, 80, 80, hofX(i) - 48, 70, 96, 96); });
  }
  drawUI() {
    if (this.phase === 0) {
      const y0 = VH + 10 - this.t * 22;
      this.credits.forEach((l, i) => ui.text(l, VW / 2, y0 + i * 22, { align: 'center', bold: i === 0, color: i === 0 ? '#ffe9a8' : '#fff', shadow: '#000' }));
    } else {
      ui.text(tr('명예의 전당', 'Hall of Fame'), VW / 2, 24, { align: 'center', bold: true, color: '#ffe9a8', shadow: '#000' });
      ui.text(tr('612 → 1953 시간여행 완주!', 'Journey from 612 to 1953 complete!'), VW / 2, 42, { align: 'center', color: '#fff', shadow: '#000' });
      S.party.forEach((m, i) => { ui.text(`${m.name}  Lv.${m.lv}`, hofX(i), 176, { align: 'center', bold: true, color: '#fff', shadow: '#000' }); });
      const pt = Math.floor(S.playtime / 60);
      ui.text(tr(`플레이 시간 ${Math.floor(pt / 60)}시간 ${pt % 60}분`, `Play time ${Math.floor(pt / 60)}h ${pt % 60}m`), VW / 2, 210, { align: 'center', size: 9, color: '#fff', shadow: '#000' });
      ui.text(tr('Z 타이틀로', 'Z to title'), VW / 2, 240, { align: 'center', size: 9, color: '#ddd', shadow: '#000' });
    }
  }
}
