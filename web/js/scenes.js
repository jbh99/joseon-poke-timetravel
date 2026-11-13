// Title, starter selection, era transition cards, world map and ending.
import { G, VW, VH, TILE, img, ready, input, ui, COL, say, openMenu, toast, fadeTo, setScene, clamp, loadJSON, prefs, setPref, touchUI, prepImages } from './core.js';
import { playBgm, sfx, cry, jingle, preloadBgm } from './audio.js';
import { S, DEX, newGame, journey, saves, load, save, TYPE_COLORS, MODE_NAMES, LEGENDS, mode, keptSaves, keepJourney, restoreKept } from './game.js';
import { ERAS, STARTERS, CELEBI, CELEBI_INTRO } from './content.js';
import { era, mainStep, activeSides, lines, eraComplete, liftLevels, chooseFaction, talkTown, questMenu, rosterMenu, settingsMenu, legendsAt, wanderAt, foeLevels, checkRun, lairDone, endingOpen, sortieMenu, formationMenu, yearOf, shownYear } from './quests.js';
import { drawMon, BLD, townPictures } from './town.js';
import { tileSet, paintTerrain, iconPath } from './pmd.js';
import { openPokedex } from './pokedex.js';
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
  if (!cv) { c.fillStyle = '#1a1620'; c.fillRect(0, 0, G.W, VH); return; }
  const z = Math.max(zoom, (G.W + 2 * Math.abs(ox) + 8) / cv.width); // (it covers a wide phone's field too)
  const w = cv.width * z, h = cv.height * z;
  c.drawImage(cv, Math.round((G.W - w) / 2 + ox), Math.round((VH - h) / 2 + oy), Math.round(w), Math.round(h));
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
      const list = saves();
      // one journey continues at once; several (one per difficulty) are picked from a list, the one played last on top
      // journeys put aside by a new one of their difficulty (1.20) can be played again
      const kept = keptSaves();
      if (kept.length) items.unshift({ label: tr('지난 여행', 'Past journeys'), right: tr(`${kept.length}개`, `${kept.length}`), fn: () => this.pickKept(kept) });
      if (list.length === 1) items.unshift({ label: tr('이어하기', 'Continue'), right: this.when(list[0].o), fn: () => this.resume(list[0].slot) });
      else if (list.length) items.unshift({ label: tr('이어하기', 'Continue'), right: tr(`기록 ${list.length}개`, `${list.length} saves`), fn: () => this.pickSave(list) });
      this.menu = openMenu(items, { x: VW / 2 - 85, y: 196, w: 170, onCancel: () => { this.started = false; } });
    }
  }
  // a save in a few words: the year and the time played, ★ once its ending is open (Arceus and Kyurem beaten)
  when(o) {
    const pt = Math.floor((o.playtime || 0) / 60), done = endingOpen(o);
    return `${yearOf(o) ?? '?'}${tr('년', '')} · ${Math.floor(pt / 60)}:${String(pt % 60).padStart(2, '0')}${done ? ' ★' : ''}`;
  }
  pickSave(list) {
    const N = MODE_NAMES();
    openMenu(list.map(({ slot, o }) => ({ label: slot === 'challenge' && o.flags?.challengeLost ? tr('챌린지(실패)', 'Challenge (lost)') : N[slot], right: this.when(o), fn: () => this.resume(slot) })),
      { title: tr('어느 기록으로 이어 할까?', 'Continue which journey?'), x: VW / 2 - 105, y: 150, w: 210, onCancel: () => { this.started = false; } });
  }
  // the journeys put aside, the one put aside last on top: picked, it takes its difficulty's place again (the journey
  // there, if any, going aside in its stead) and goes on at once
  pickKept(kept) {
    const N = MODE_NAMES();
    const back = (k) => {
      const now = journey(k.slot);
      const go = () => { if (restoreKept(k)) this.resume(k.slot); else { this.started = false; toast(tr('지난 여행을 불러오지 못했어요. 기록은 그대로예요.', 'Could not bring that journey back. Nothing was changed.'), COL.red); } };
      say([{ who: 'narr', text: now ? tr(`이 ${N[k.slot]} 여행으로 다시 이어 할까요? 지금 ${N[k.slot]} 여행(${this.when(now)})은 지난 여행으로 보관돼요.`, `Play this ${N[k.slot]} journey again? Your ${N[k.slot]} journey in play (${this.when(now)}) goes to Past journeys.`)
        : tr(`이 ${N[k.slot]} 여행으로 다시 이어 할까요?`, `Play this ${N[k.slot]} journey again?`), choices: tr(['이어 하기', '취소'], ['Play it', 'Cancel']), onChoice: (i) => { if (i === 0) go(); else this.started = false; } }]);
    };
    openMenu(kept.map((k) => ({ label: N[k.slot], right: this.when(k.o), fn: () => back(k) })),
      { title: tr('지난 여행 · 고르면 다시 이어 해요', 'Past journeys · play one again'), x: VW / 2 - 115, y: 132, w: 230, onCancel: () => { this.started = false; } });
  }
  resume(slot) {
    // the town plays a step left waiting (resumeSteps); a challenge left in the middle of a dungeon ends instead (checkRun)
    if (load(slot, ERAS.length)) fadeTo(() => { liftLevels(); if (!checkRun()) G.goTown(); });
    else { this.started = false; toast(tr('기록을 불러오지 못했다. 새로 시작해 주세요.', 'Could not load the save. Please start a new game.'), COL.red); }
  }
  // the language row shows the language in use; rebuild the menu so every label follows a switch
  relang() {
    if (!this.started) return;
    if (this.menu) G.overlays = G.overlays.filter((o) => o !== this.menu);
    this.reopen = true;
  }
  // journeys kept on another device came down (cloud.js) while the menu is up: it shows them at once
  keptChanged() { if (this.menu && G.overlays[G.overlays.length - 1] === this.menu) this.relang(); }
  newGame() {
    const N = MODE_NAMES(), desc = tr({
      easy: '적 레벨 −2, 적이 주는 피해 −25%, 보스 체력 −20%. 이야기를 편하게 즐기고 싶다면.',
      normal: '기본 난이도. 1200년부터 던전이 우리 팀의 성장에 맞춰 강해진다(가장 강한 포켓몬보다 5~7레벨 위). 해전의 적은 출전 파티보다 3레벨 위.',
      hard: '보통과 같은 레벨에, 보스를 포함한 모든 적 포켓몬의 체력과 능력치 +25%. 해전의 적은 출전 파티보다 5레벨 위.',
      challenge: prefs.ended ? '보통의 강함으로, 한 번도 전멸하지 않고 엔딩까지 가야 한다. 전멸하면 기록이 끝나고 처음부터 다시. 전설의 포켓몬은 동료가 되지 않는다.' : '어느 난이도로든 엔딩을 한 번 보면 열린다.',
    }, {
      easy: 'Foes −2 levels, foes deal 25% less damage, bosses have 20% less HP. For enjoying the story.',
      normal: 'The standard game. From 1200 on, dungeons grow with your team (5-7 levels above your strongest). Naval foes: 3 above your crew.',
      hard: 'Levels as in Normal, but every foe, bosses included, has 25% more HP and stats. Naval foes: 5 above your crew.',
      challenge: prefs.ended ? 'Normal strength, but reach the ending without a single wipe: a wipe ends the journey and you start over. Legendary Pokémon never join.' : 'Opens once you have seen an ending at any difficulty.',
    });
    // a new journey of a difficulty that has one puts that one aside (Past journeys on the title, 1.20; up to 1.19 it
    // was replaced), so a finished journey, or one half-way, can be started over and still be played again
    const pick = (m) => {
      const go = () => fadeTo(() => setScene(new Intro(m)));
      const fresh = () => { if (keepJourney(m, true)) go(); else { this.started = false; toast(tr('저장 공간이 부족해 지금 여행을 보관하지 못했어요. 새로 시작하지 않았어요.', 'Not enough storage to keep your journey aside. Nothing was started.'), COL.red); } };
      if (journey(m)) say([{ who: 'narr', text: tr(`새로 시작하면 지금 ${N[m]} 여행(${this.when(journey(m))})은 "지난 여행"으로 보관돼요. 타이틀의 지난 여행에서 언제든 다시 이어 할 수 있어요. 새로 시작할까요?`, `Starting over puts your ${N[m]} journey (${this.when(journey(m))}) aside under "Past journeys" on the title, to be played again any time. Start over?`), choices: tr(['새로 시작', '취소'], ['Start over', 'Cancel']), onChoice: (i) => { if (i === 0) fresh(); else this.started = false; } }]);
      else go();
    };
    openMenu(['easy', 'normal', 'hard', 'challenge'].map((m) => ({ label: N[m], desc: desc[m], right: m === 'challenge' && !prefs.ended ? tr('엔딩 후', 'After an ending') : journey(m) ? tr('기록 있음', 'Saved') : '',
      disabled: m === 'challenge' && !prefs.ended, fn: () => pick(m) })), { title: tr('난이도 · 기록은 난이도마다 따로', 'Difficulty · one save each'), desc: true, sel: 1, x: VW / 2 - 120, y: 130, w: 240, onCancel: () => { this.started = false; } });
  }
  draw(c) {
    drawBackdrop(c, 41, 3, 1.04 + Math.sin(this.t * 0.15) * 0.02);
    c.fillStyle = 'rgba(10,6,20,0.25)'; c.fillRect(0, 0, G.W, VH);
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
    ui.text(tr('612 → 1980 · 시간의 꽃과 아르세우스', '612 → 1980 · The Flower of Time and Arceus'), VW / 2, y + 32, { align: 'center', size: 9, color: '#fff', shadow: true });
    if (!this.started && Math.floor(this.t * 2) % 2) ui.text(touchUI ? tr('화면을 누르거나 Z를 누르세요', 'Tap the screen or press Z') : tr('Z 키 또는 Enter를 누르세요', 'Press Z or Enter'), VW / 2, 206, { align: 'center', color: '#fff', shadow: true });
    // the notice at the foot of the screen gives way to a menu's description or a question, which would half cover it
    if (!G.overlays.some((o) => o.lines || o.o?.desc)) ui.text(tr('팬메이드 비공식 게임 · 원작 © Nintendo / Creatures / GAME FREAK', 'Unofficial fan game · Pokémon © Nintendo / Creatures / GAME FREAK'), VW / 2, VH - 11, { align: 'center', size: 9, color: '#ddd', shadow: true });
  }
}

// ---------------------------------------------------------------- intro & starter choice
export class Intro {
  constructor(mode = 'normal') { this.mode = mode; }
  enter() {
    playBgm('legend');
    this.phase = 'talk'; this.sel = 0; this.t = 0; this.starter = null;
    G.dialogSpeaker = (L) => { if (L?.who === CELEBI && !this.cried) { cry(CELEBI); this.cried = true; } };
    say(CELEBI_INTRO, () => { this.phase = 'pick'; say([{ who: CELEBI, name: tr('세레비', 'Celebi'), text: tr('먼저 너는 어떤 포켓몬이었는지 떠올려 봐!', 'First, try to remember which Pokémon you were!') }]); });
  }
  exit() { G.dialogSpeaker = null; }
  get choices() { return this.phase === 'partner' ? STARTERS.filter((s) => s !== this.starter) : STARTERS; }
  card(i) { const w = 130; return { x: VW / 2 - (this.choices.length * (w + 10)) / 2 + i * (w + 10) + 5, y: 34, w, h: 150 }; }
  update(dt) {
    this.t += dt;
    if (G.overlays.length || (this.phase !== 'pick' && this.phase !== 'partner')) return;
    const n = this.choices.length;
    if (input.repeat('left')) { this.sel = (this.sel + n - 1) % n; sfx('cursor'); cry(this.choices[this.sel]); }
    if (input.repeat('right')) { this.sel = (this.sel + 1) % n; sfx('cursor'); cry(this.choices[this.sel]); }
    // a tap on a card picks it, like ← → and Z
    const tap = this.choices.findIndex((sp, i) => { const b = this.card(i); return input.tap(b.x, b.y, b.w, b.h); });
    if (tap >= 0 && tap !== this.sel) { this.sel = tap; cry(this.choices[tap]); }
    if (input.hit('ok') || tap >= 0) {
      const sp = this.choices[this.sel];
      say([{ who: sp, shiny: true, name: DEX.species[sp].name, text: this.phase === 'pick' ? tr(`반짝이는 ${DEX.species[sp].name}! 이 모습이 맞아?`, `A sparkling ${DEX.species[sp].name}! Is this you?`) : tr(`${DEX.species[sp].name}와(과) 함께 여행할까?`, `Travel together with ${DEX.species[sp].name}?`), choices: tr(['응!', '다시 고를래'], ['Yes!', 'Let me choose again']), onChoice: (i) => {
        if (i) return;
        if (this.phase === 'pick') {
          this.starter = sp; this.sel = 0; this.phase = 'partner';
          say([{ who: CELEBI, name: tr('세레비', 'Celebi'), text: tr('좋아! 그럼 함께 여행할 친구도 골라 볼까? 이 친구도 시간을 건너와서 몸 색이 달라졌어.', 'Great! Now pick a friend to travel with. Crossing time changed its colors too.') }]);
        } else {
          newGame(this.starter, sp, this.mode);
          this.phase = 'done';
          say([{ who: CELEBI, name: tr('세레비', 'Celebi'), text: tr(`준비됐지? 첫 번째 꽃잎이 있는 곳, ${ERAS[0].year}년으로 간다!`, `Ready? Off to ${ERAS[0].year}, where the first petal fell!`) }], () => { sfx('warp'); fadeTo(() => setScene(new EraCard()), '#fff', 1.5); });
        }
      } }]);
    }
  }
  draw(c) {
    const g = c.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#16304a'); g.addColorStop(1, '#3a6a5a');
    c.fillStyle = g; c.fillRect(0, 0, G.W, VH);
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
      const { x, y, w } = this.card(i);
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
// the era's Black towns' pictures start loading (and decoding) on its card and its world map, well before they are
// entered (main.js goTown waits for them, behind the dark screen, if they are not ready by then)
const preloadTowns = () => prepImages([...new Set([...townPictures(1), ...townPictures(2)])]);
export class EraCard {
  enter() {
    const e = era();
    this.e = e; this.t = 0;
    this.fromYear = G.cardFrom ?? (S.era > 0 ? yearOf({ era: S.era - 1, spy: S.spy }) : e.year - 30); // from where the last era ended (the 1920s spy hunt moves it on)
    G.cardFrom = null;
    tileSet(cardOf(e).set);
    preloadTowns();
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
    if (!this.talked && this.t > 0.6 && (input.hit('ok') || input.tap(0, 0, VW, VH))) this.t = 2.6;
  }
  draw(c) {
    const card = cardOf(this.e);
    drawBackdrop(c, card.set, this.e.id, 1.02 + this.t * 0.006, -this.t * 0.8, 0);
    card.mons.forEach((sp, i) => drawMon(c, sp, false, 70 + i * 92 - this.t * 4, 150 + (i % 2) * 22, { face: [i % 2 ? -1 : 1, 1], moving: true, phase: i }));
    const g = c.createLinearGradient(0, VH * 0.45, 0, VH); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
    c.fillStyle = g; c.fillRect(0, 0, G.W, VH);
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
    S.party.forEach((m, i) => drawMon(c, m.spr, m.shiny, 40 + i * 30 + Math.min(this.t, 3) * 20, VH - 86, { moving: true, facing: 'right', phase: i }));
    if (this.t < 0.6) { c.fillStyle = `rgba(255,255,255,${1 - this.t / 0.6})`; c.fillRect(0, 0, G.W, VH); }
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
const floorsEn = (n) => `${n} floor${n === 1 ? '' : 's'}`; // "1 floor", not "1 floors"
const lvBand = (lo, hi, to = '~') => (lo === hi ? `${lo}` : `${lo}${to}${hi}`); // a naval battle's foes are all of one level
const MZ = 2, MVW = 316, GAP = 12; // GAP: room kept between two places' markers and names
export class WorldMap {
  constructor() { this.sel = 0; }
  async enter() {
    this.e = era();
    preloadTowns();
    // a world era's map is its region's (data/maps.json, tools/geo/worldmaps.py); Korea's is the peninsula
    // (its data out of reach after core.js's retries: back to town, not a map with no way out)
    try { this.meta = this.e.map ? (await loadJSON('data/maps.json'))[this.e.map] : await loadJSON('data/worldmap.json'); }
    catch (e) { toast(tr('지도를 불러오지 못했다. 잠시 뒤에 다시 열어 보자.', 'Could not load the map. Try again in a moment.'), COL.red); return G.goTown(); }
    this.mapImg = this.e.map ? `img/map_${this.e.map}.png` : 'img/worldmap.png';
    playBgm(this.e.world);
    this.nodes = this.e.nodes.filter((n) => !n.when || n.when());
    this.sel = Math.max(0, this.nodes.findIndex((n) => n.id === (S.lastNode || 'town')));
    const n = this.nodes[this.sel];
    [this.cx, this.cy] = this.camFor(n);
    [this.tx, this.ty] = this.spot(n);
  }
  pos(n) { // map pixel coordinates at 1x
    const m = this.meta || { lon0: 123.5, lon1: 132, lat0: 33, lat1: 43, w: 300, h: 445 };
    return [(n.lon - m.lon0) / (m.lon1 - m.lon0) * m.w, (m.lat1 - n.lat) / (m.lat1 - m.lat0) * m.h];
  }
  // where a place's marker stands (map pixels at MZ): on its true spot, unless an era's places crowd one another there
  // (Gallipoli's town, strait and cove sat within 30 px, too close to pick by click, tap or arrow key); then markers
  // and names are pushed apart until none overlap, and a line leads from a moved marker to its true spot
  spot(n) {
    if (this.layLang !== LANG) { this.lay = this.layout(); this.layLang = LANG; }
    const p = this.lay.get(n);
    return [p.x, p.y];
  }
  layout() {
    const m = this.meta || { w: 300, h: 445 }, W = m.w * MZ, H = m.h * MZ;
    // each place's box: its marker (and legend badges above it) and its name below
    const P = this.nodes.map((n) => {
      const [x, y] = this.pos(n), legs = n.d ? legendsAt(n.d).length : 0;
      return { n, x0: x * MZ, y0: y * MZ, x: x * MZ, y: y * MZ, w: Math.max(30, ui.measure(n.name, 9) + 8, legs * 26 + 6), top: legs ? 42 : 14, bottom: 22 };
    });
    for (let it = 0, moved = true; moved && it < 300; it++) {
      moved = false;
      for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) { // two overlapping boxes part along the shorter way out
        const A = P[a], B = P[b], ya = A.y + (A.bottom - A.top) / 2, yb = B.y + (B.bottom - B.top) / 2;
        const ox = (A.w + B.w) / 2 + GAP - Math.abs(A.x - B.x), oy = (A.top + A.bottom + B.top + B.bottom) / 2 + GAP - Math.abs(ya - yb);
        if (ox <= 0 || oy <= 0) continue;
        moved = true;
        if (ox < oy) { const s = (Math.sign(A.x - B.x) || -1) * ox / 2; A.x += s; B.x -= s; } else { const s = (Math.sign(ya - yb) || -1) * oy / 2; A.y += s; B.y -= s; }
      }
      for (const p of P) { p.x = clamp(p.x, p.w / 2 + 2, W - p.w / 2 - 2); p.y = clamp(p.y, p.top + 2, H - p.bottom - 2); }
    }
    return new Map(P.map((p) => [p.n, p]));
  }
  scr(n) { const [x, y] = this.spot(n); return [x - this.cx, y - this.cy]; }
  camFor(n) { const [x, y] = this.spot(n); return this.clampCam(x - MVW / 2, y - VH / 2); }
  clampCam(cx, cy) { const m = this.meta || { w: 300, h: 445 }; return [clamp(cx, 0, m.w * MZ - MVW), clamp(cy, 0, m.h * MZ - VH)]; }
  get padKeys() { return ['menu', 'quest', 'party']; } // what the touch menu panel offers here (core.js initMenu)
  // the place an arrow from place i goes to (update), or -1
  toward(i, dir) {
    const [x0, y0] = this.spot(this.nodes[i]);
    for (const cone of [1, Math.sqrt(3)]) { // tan 45°, tan 60°
      let best = -1, bs = Infinity;
      this.nodes.forEach((m, j) => {
        const [x, y] = this.spot(m), ahead = (x - x0) * dir[0] + (y - y0) * dir[1], aside = Math.abs((x - x0) * dir[1] - (y - y0) * dir[0]);
        const s = ahead + aside * 2;
        if (j !== i && ahead > 0 && aside <= ahead * cone && s < bs) { bs = s; best = j; }
      });
      if (best >= 0) return best;
    }
    return -1;
  }
  tags(n) {
    const st = mainStep(), out = [];
    if (n.d && st?.do === 'dungeon' && st.d === n.d) out.push('main');
    if ((n.id === 'town' || n.town) && ((['talk', 'battle', 'spy'].includes(st?.do) && talkTown(st) === (n.town || 1)) || (eraComplete() && n.id === 'town'))) out.push('main');
    if (n.d && activeSides(n.d).length) out.push('side');
    return out;
  }
  update(dt) {
    if (!this.nodes || G.overlays.length) return;
    const sel0 = this.sel;
    // an arrow key goes to the nearest place that way: one within 45° of it (from Gallipoli's town ↓ is the strait
    // below, not the cove to the left), else one within 60°, sideways counting twice; with none that way the cursor
    // stays (up to 1.13 it then jumped to a place off to the side or far away)
    const dir = input.repeat('right') ? [1, 0] : input.repeat('left') ? [-1, 0] : input.repeat('down') ? [0, 1] : input.repeat('up') ? [0, -1] : null;
    if (dir) {
      const best = this.toward(this.sel, dir);
      if (best >= 0) { this.sel = best; sfx('cursor'); }
    }
    // a click or tap on a place (its marker, badge or name) picks it and goes there, like Z
    let go = false;
    const c = input.tap(0, 0, MVW, VH);
    if (c) {
      let best = -1, bd = 24;
      this.nodes.forEach((m, i) => {
        const p = this.lay.get(m), [x, y] = this.scr(m);
        const d = Math.abs(c.x - x) <= p.w / 2 && c.y >= y - p.top && c.y <= y + p.bottom ? 0 : Math.hypot(x - c.x, y + 5 - c.y);
        if (d < bd) { bd = d; best = i; }
      });
      if (best >= 0) { if (best !== this.sel) sfx('cursor'); this.sel = best; go = true; }
    }
    // dragging the map (or the mouse wheel) looks around freely; picking a place brings the camera back to it
    if (this.sel !== sel0) this.free = false;
    if (input.pan.x || input.pan.y) { this.free = true; [this.cx, this.cy] = this.clampCam(this.cx - input.pan.x, this.cy - input.pan.y); }
    const n = this.nodes[this.sel];
    const [x, y] = this.spot(n), [cx, cy] = this.camFor(n);
    this.tx += (x - this.tx) * Math.min(1, dt * 8); this.ty += (y - this.ty) * Math.min(1, dt * 8);
    if (!this.free) { this.cx += (cx - this.cx) * Math.min(1, dt * 6); this.cy += (cy - this.cy) * Math.min(1, dt * 6); }
    if (input.hit('ok') || go) {
      S.lastNode = n.id;
      if (n.mark) return say([{ who: 'narr', text: `【${n.name}】 ${n.text}` }]);
      if (n.id === 'town' || n.town) return fadeTo(() => G.goTown(n.town || 1));
      const d = this.e.dungeons[n.d];
      if (d.needs && !d.needs.every((sp) => S.party.some((m) => m.sp === sp))) return say([{ who: 'narr', text: d.needsText }]);
      // the Boss Tower: from its first floor, or from above the highest floor cleared on an earlier visit
      const top = d.tower ? S.flags.towerTop || 0 : 0;
      if (top) return say([{ who: 'narr', text: tr(`${d.name} (${d.floors}층)에 들어갈까? 지난번에 ${top}층까지 올랐다.`, `Enter the ${d.name}? (${floorsEn(d.floors)}) Last time you cleared floor ${top}.`),
        choices: tr(['1층부터', `${top + 1}층부터`, '그만두기'], ['From floor 1', `From floor ${top + 1}`, 'Not now']), onChoice: (i) => { if (i < 2) fadeTo(() => G.goDungeon(n.d, undefined, { floor: i ? top + 1 : 1 })); } }]);
      const what = (crew) => { const [lo, hi] = foeLevels(d, crew); return d.stages ? tr(`${d.floors}층 · 전설의 포켓몬`, `${floorsEn(d.floors)} · legendary Pokémon`) : tr(`${d.floors}층 · 적 레벨 ${lvBand(lo, hi)}`, `${floorsEn(d.floors)} · foes Lv ${lvBand(lo, hi, '-')}`); };
      // a naval battle: who goes aboard comes first (quests.js sortieMenu), and the run sets out with them
      if (d.water) return sortieMenu((crew) => `${d.name} (${what(crew)})`, (crew) => fadeTo(() => G.goDungeon(n.d, undefined, { crew })));
      say([{ who: 'narr', text: tr(`${d.name} (${what()})에 들어갈까?`, `Enter ${d.name}? (${what()})`), choices: tr(['출발!', '그만두기'], ['Set out!', 'Not now']), onChoice: (i) => { if (i === 0) fadeTo(() => G.goDungeon(n.d)); } }]);
    }
    if (input.hit('menu')) return openMenu([
      { label: tr('퀘스트', 'Quests'), fn: questMenu },
      { label: tr('동료 명부', 'Companions'), fn: rosterMenu },
      { label: tr('해전 대형', 'Naval formation'), fn: () => formationMenu() },
      { label: tr('도감', 'Pokédex'), fn: openPokedex },
      { label: tr('마을로 돌아가기', 'Back to town'), fn: () => fadeTo(() => G.goTown()) },
      { label: tr('설정', 'Settings'), fn: () => settingsMenu() },
      { label: tr('닫기', 'Close') },
    ], { title: tr(`${shownYear()}년 세계 지도`, `World map, ${shownYear()}`) });
    if (input.hit('quest')) return questMenu();
    if (input.hit('party')) return rosterMenu(); // companions can be swapped anywhere outside dungeons
    if (input.hit('cancel')) fadeTo(() => G.goTown());
  }
  draw(c) {
    c.fillStyle = '#3a5f78'; c.fillRect(0, 0, G.W, VH);
    if (!this.nodes) return;
    const im = img(this.mapImg || 'img/worldmap.png');
    if (ready(im)) c.drawImage(im, this.cx / MZ, this.cy / MZ, MVW / MZ, VH / MZ, 0, 0, MVW, VH);
    const [tx0, ty0] = this.scr(this.nodes.find((n) => n.id === 'town'));
    c.strokeStyle = 'rgba(90,40,20,0.8)'; c.setLineDash([3, 3]); c.lineWidth = 1;
    for (const n of this.nodes) if (n.d) { const [x, y] = this.scr(n); c.beginPath(); c.moveTo(tx0, ty0); c.lineTo(x, y); c.stroke(); }
    c.setLineDash([]);
    // a marker moved off its place (spot) keeps a line to a dot on its true spot
    for (const n of this.nodes) {
      const p = this.lay.get(n), [x, y] = this.scr(n), x0 = Math.round(p.x0 - this.cx), y0 = Math.round(p.y0 - this.cy);
      if (Math.hypot(p.x - p.x0, p.y - p.y0) < 4) continue;
      c.strokeStyle = 'rgba(40,24,12,0.9)'; c.beginPath(); c.moveTo(x0 + 0.5, y0 + 0.5); c.lineTo(x + 0.5, y + 0.5); c.stroke();
      c.fillStyle = '#2a1a10'; c.fillRect(x0 - 2, y0 - 2, 5, 5); c.fillStyle = '#f0d890'; c.fillRect(x0 - 1, y0 - 1, 3, 3);
    }
    // three passes: place markers, then legend badges above them, then names and quest tags on top so they stay readable
    const at = this.nodes.map((n) => this.scr(n).map(Math.round));
    this.nodes.forEach((n, i) => {
      const [x, y] = at[i], on = i === this.sel;
      if (n.mark) { c.fillStyle = '#3a2a1a'; c.fillRect(x - 5, y - 5, 10, 10); c.fillStyle = on ? '#fff1b0' : '#e7d6a8'; c.fillRect(x - 4, y - 4, 8, 8); c.fillStyle = COL.red; c.fillRect(x - 4, y - 4, 2, 8); }
      else if (n.id === 'town' || n.town) { c.fillStyle = '#2a1a10'; c.fillRect(x - 8, y - 7, 16, 14); c.fillStyle = '#f0e6d0'; c.fillRect(x - 6, y - 1, 12, 7); c.fillStyle = '#3c3c48'; c.fillRect(x - 9, y - 7, 18, 6); c.fillStyle = '#b2352b'; c.fillRect(x - 1, y + 1, 3, 5); }
      else { c.fillStyle = '#2a1a10'; c.beginPath(); c.moveTo(x - 9, y + 7); c.lineTo(x, y - 9); c.lineTo(x + 9, y + 7); c.fill(); c.fillStyle = '#8a6a48'; c.beginPath(); c.moveTo(x - 7, y + 6); c.lineTo(x, y - 7); c.lineTo(x + 7, y + 6); c.fill(); c.fillStyle = '#1a1010'; c.fillRect(x - 2, y + 1, 5, 5); }
      if (on) { c.strokeStyle = '#fff'; c.lineWidth = 1; c.strokeRect(x - 11.5, y - 11.5, 23, 23); }
    });
    // a place holding a legendary Pokémon shows it in a gold badge above the marker
    this.nodes.forEach((n, i) => {
      if (!n.d) return;
      const legs = legendsAt(n.d), [x, y] = at[i];
      legs.forEach((sp, k) => this.drawLegend(c, sp, x + Math.round((k - (legs.length - 1) / 2) * 26), y - 25, i + k));
    });
    this.nodes.forEach((n, i) => {
      const [x, y] = at[i], on = i === this.sel, nm = n.name;
      c.font = '9px Galmuri9'; c.textAlign = 'center'; c.textBaseline = 'top';
      c.fillStyle = 'rgba(30,20,10,0.75)'; const tw = c.measureText(nm).width; c.fillRect(x - tw / 2 - 2, y + 10, tw + 4, 11);
      c.fillStyle = on ? '#ffe9a8' : '#fff'; c.fillText(nm, x, y + 11);
      this.tags(n).forEach((t, k) => {
        const bx = x + 9 + k * 8, by = Math.round(y - 16 + Math.sin(G.time * 5 + i) * 1.5);
        c.fillStyle = '#1a1010'; c.fillRect(bx - 1, by - 1, 8, 10);
        c.fillStyle = t === 'main' ? '#d0352a' : '#2f6ad0'; c.fillRect(bx, by, 6, 8);
        c.fillStyle = '#fff';
        if (t === 'main') { c.fillRect(bx + 2, by + 1, 2, 4); c.fillRect(bx + 2, by + 6, 2, 1); }
        else { c.fillRect(bx + 1, by + 1, 4, 1); c.fillRect(bx + 4, by + 2, 1, 2); c.fillRect(bx + 2, by + 4, 2, 1); c.fillRect(bx + 2, by + 6, 2, 1); }
      });
    });
    const [a, b, m3] = S.party;
    const px = this.tx - this.cx, py = this.ty - this.cy;
    if (m3) drawMon(c, m3.spr, m3.shiny, px - 26, py, { moving: true, phase: 2 });
    drawMon(c, b.spr, b.shiny, px - 10, py + 2, { moving: true, phase: 1 });
    drawMon(c, a.spr, a.shiny, px + 8, py + 4, { moving: true });
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(MVW, 0, 2, VH);
  }
  drawLegend(c, sp, x, y, ph) {
    const glow = 0.35 + Math.sin(G.time * 4 + ph) * 0.2, bob = Math.round(Math.sin(G.time * 3 + ph) * 1.2);
    c.fillStyle = `rgba(255,216,74,${glow})`; c.beginPath(); c.arc(x, y, 15, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(40,24,8,0.72)'; c.beginPath(); c.arc(x, y, 12, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#ffd84a'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, 12.5, 0, Math.PI * 2); c.stroke();
    const im = img(iconPath(sp));
    if (ready(im)) c.drawImage(im, 0, Math.floor(G.time * 3 + ph) % 2 * 32, 32, 32, x - 16, y - 19 + bob, 32, 32);
    // a gold star on the rim marks it as legendary
    const sx = x + 10, sy = y - 9;
    c.fillStyle = '#3a2408'; c.fillRect(sx - 3, sy - 1, 7, 3); c.fillRect(sx - 1, sy - 3, 3, 7);
    c.fillStyle = '#ffe27a'; c.fillRect(sx - 2, sy, 5, 1); c.fillRect(sx, sy - 2, 1, 5);
  }
  drawUI() {
    if (!this.nodes) return;
    const x = 324, w = VW - x - 8;
    // panels grow with wrapped text (English titles run longer than Korean)
    const yearText = tr(`${shownYear()}년`, `${shownYear()}`), tx = x + 8 + ui.measure(yearText, 11, true) + 6;
    const titleL = ui.wrap(this.e.title, x + w - 8 - tx, 11), subL = ui.wrap(this.e.sub, w - 16, 9);
    const h1 = 26 + (titleL.length - 1) * 13 + 11 + subL.length * 11;
    ui.panel(x, 8, w, h1);
    ui.text(yearText, x + 8, 14, { bold: true, color: COL.red });
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
      const d = this.e.dungeons[n.d], w = wanderAt(n.d), fl = d.floors;
      const legs = legendsAt(n.d).filter((sp) => sp !== w).map((sp) => DEX.species[sp].name).join(' · ');
      const [lo, hi] = foeLevels(d);
      if (d.tower) {
        lines2.push(tr(`${fl}층 · 보스 모드`, `${floorsEn(fl)} · Boss Mode`), tr('층마다 전설의 포켓몬만 기다린다. 잡을 수는 없다.', 'Only legendary Pokémon wait, floor after floor. None can be caught.'));
        if (S.flags.towerTop) lines2.push(tr(`지난번에 ${S.flags.towerTop}층까지 올랐다`, `Last time: cleared floor ${S.flags.towerTop}`));
        if (S.flags.towerClears) lines2.push(tr(`꼭대기까지 ${S.flags.towerClears}번 올랐다`, `Reached the top ${S.flags.towerClears} time(s)`));
      } else lines2.push(d.stages ? tr(`${fl}층 · 전설의 포켓몬`, `${floorsEn(fl)} · legendary Pokémon`) : tr(`${fl}층 · 적 Lv ${lvBand(lo, hi)}`, `${floorsEn(fl)} · foes Lv ${lvBand(lo, hi, '-')}`));
      if (d.water) lines2.push(tr(`[해전] 물 타입만 출전 · 적은 출전 파티 최고 레벨 +${mode().naval}`, `[Naval] Water types only. Foes: the crew's best +${mode().naval}`));
      if (w) lines2.push(tr(`★ 지난 시대에 놓친 ${DEX.species[w].name}이(가) ${fl}층에서 기다린다! (Lv ${hi})`, `★ ${DEX.species[w].name}, missed in an earlier era, waits on floor ${fl}! (Lv ${hi})`));
      // a lair's keeper waits until met; one that is no legend (Tyranitar) is only something strong
      const keeper = d.legend && !lairDone(n.d), legendary = d.legend && LEGENDS.has(d.boss.sp);
      if (legs) lines2.push(tr(`★ 전설의 포켓몬 ${legs}의 기척이 있다!`, `★ A legendary presence: ${legs}!`));
      else if (keeper) lines2.push(tr('깊은 곳에 강한 기척이 있다…', 'Something strong lurks deep inside...'));
      else if (d.legend) lines2.push(legendary ? tr('전설의 포켓몬과 이미 만났다', 'Legend already met') : tr(`${DEX.species[d.boss.sp].name}과(와) 이미 만났다`, `Already met ${DEX.species[d.boss.sp].name}`));
      else if (!w && d.boss && mainStep()?.d === n.d) lines2.push(tr('깊은 곳에 강한 기척이 있다…', 'Something strong lurks deep inside...'));
      if (w || keeper) lines2.push(tr('이기면 동료가 될지도…', 'Win and it may join you...'));
    }
    const py = 14 + h1, nameL = ui.wrap(n.name, w - 16, 11), ny = py + 6 + nameL.length * 13 + 3;
    const wrapped2 = lines2.flatMap((l) => ui.wrap(l, w - 16, 9));
    ui.panel(x, py, w, ny - py + wrapped2.length * 12 + 4);
    nameL.forEach((l, i) => ui.text(l, x + 8, py + 6 + i * 13, { bold: true }));
    wrapped2.forEach((l, i) => ui.text(l, x + 8, ny + i * 12, { size: 9, color: COL.ink2 }));
    // quests
    const qs = [];
    const st = mainStep();
    const mainLog = eraComplete() ? tr('시간의 문이 열렸다!', 'The Time Gate is open!') : st?.log; // a scene step (1950's opening) has none
    if (mainLog) qs.push({ t: mainLog, c: COL.red });
    for (const q of activeSides()) qs.push({ t: `${q.title}${q.d ? ' — ' + (this.e.dungeons[q.d]?.name || '') : ''}`, c: COL.blue });
    const qlines = qs.flatMap((q) => ui.wrap('· ' + q.t, w - 16, 9).map((t) => ({ t, c: q.c })));
    const qy = ny + wrapped2.length * 12 + 10, room = Math.floor((VH - 22 - qy - 22) / 11);
    if (room > 0) { // under a long place's text (a returning legend at sea, in English) the quests stay in the quest list
      const shown = qlines.slice(0, room);
      ui.panel(x, qy, w, 22 + shown.length * 11);
      ui.text(st?.final && !eraComplete() ? tr('★ 최종 퀘스트', '★ Final Quest') : tr('이 시대의 퀘스트', 'Quests of this era'), x + 8, qy + 6, { size: 9, bold: true, color: st?.final && !eraComplete() ? COL.red : undefined });
      shown.forEach((q, i) => ui.text(q.t, x + 8, qy + 19 + i * 11, { size: 9, color: q.c }));
    }
    if (prefs.hints) ui.text(touchUI ? tr('장소를 누르면 이동 · 끌어서 지도 보기 · 메뉴: 퀘스트 · 동료 · X 마을로', 'Tap a place to go · drag to look · Menu: quests · team · X town') : tr('클릭·방향키 장소 · 드래그 지도 · Z 이동 · J 퀘스트 · P 동료 · X 마을로', 'Click/arrows place · drag map · Z go · J quests · P team · X town'), x + w, VH - 12, { size: 9, align: 'right', color: '#fff', shadow: true });
  }
}

// ---------------------------------------------------------------- ending
const hofX = (i) => VW / 2 + (i - (S.party.length - 1) / 2) * (S.party.length > 2 ? 140 : 160); // hall-of-fame column centres
export class Ending {
  enter() {
    setPref('ended', true);
    if (S.mode === 'challenge') setPref('challengeClear', true);
    playBgm('ending', 1.5);
    tileSet(41); tileSet(33);
    this.t = 0; this.phase = 0;
    this.credits = [
      ...tr(['— 포켓몬스터 조선 시간여행 —', '', '612 살수대첩 · 660 황산벌 · 668 평양성 · 676 기벌포 해전', '1019 귀주대첩 · 1232 처인성 · 1251 팔만대장경', '1380 진포 대첩 · 1388 위화도 회군',
        '1392 조선 건국 · 1446 훈민정음 반포', '1592 임진왜란 · 1598 노량 해전 · 1636 병자호란', '1796 수원 화성 완공 · 1866 병인양요 · 1871 신미양요',
        '1897 대한제국 선포 · 1905 을사늑약 · 1907 헤이그 특사', '1919 3·1 운동 · 1920 청산리 대첩 · 1940 한국광복군 창설', '1945년 8월 15일 광복', '1950 – 1953 한국 전쟁 · 정전', '1979 10·26 · 12·12 · 1980 서울의 봄', '',
        '— 세계 —', '1860 베이징 조약 · 1894 청일 전쟁 · 1904 러일 전쟁', '1914 – 1918 제1차 세계 대전 · 1919 파리 강화 회의', '1939 – 1945 제2차 세계 대전', '', '', '함께한 포켓몬'],
      ['— Pokémon Joseon Time Travel —', '', '612 Salsu · 660 Hwangsanbeol · 668 Pyongyang · 676 Gibeolpo', '1019 Gwiju · 1232 Cheoin Fortress · 1251 Tripitaka Koreana', '1380 Jinpo · 1388 Wihwado retreat',
        '1392 Joseon founded · 1446 Hunminjeongeum proclaimed', '1592 Imjin War · 1598 Noryang · 1636 Qing invasion', '1796 Hwaseong Fortress · 1866 French and 1871 U.S. expeditions',
        '1897 Korean Empire proclaimed · 1905 Eulsa Treaty · 1907 Hague envoys', '1919 March 1st Movement · 1920 Battle of Cheongsanri · 1940 Korean Liberation Army', 'Liberation, August 15, 1945', '1950 – 1953 Korean War · armistice', '1979 October 26 · December 12 · 1980 Seoul Spring', '',
        '— The world —', '1860 Convention of Peking · 1894 Sino-Japanese War · 1904 Russo-Japanese War', '1914 – 1918 First World War · 1919 Paris Peace Conference', '1939 – 1945 Second World War', '', '', 'Your team']),
      ...S.party.map((m) => `${m.name} Lv.${m.lv}${m.shiny ? ' ★' : ''}`), ...(S.roster.length ? [tr(`그리고 동료 ${S.roster.length}마리`, `and ${S.roster.length} more companions`)] : []), '', '',
      ...tr(['원작 그래픽 · 음악', '포켓몬스터 펄 (ROM에서 추출, 직접 렌더링)', '포켓몬 불가사의 던전 파랑구조대 (던전 · 스프라이트 · 초상화)', '포켓몬스터 블랙 (세계 모드의 마을 · 음악 · 5세대 포켓몬)', '© Nintendo · Creatures · GAME FREAK · Chunsoft', '',
        '건물 · 거북선 · 판옥선', 'Blender 5.2 절차적 모델링', '', '세계 지도', 'Natural Earth', '', '글꼴', 'Galmuri (OFL)', '', '',
        '역사를 잊은 민족에게 미래는 없다', '', '', '플레이해 주셔서 감사합니다!'],
      ['Original graphics · music', 'Pokémon Pearl (extracted from the ROM, rendered here)', 'Pokémon Mystery Dungeon: Blue Rescue Team (dungeons · sprites · portraits)', 'Pokémon Black (world-line towns · music · fifth-generation Pokémon)', '© Nintendo · Creatures · GAME FREAK · Chunsoft', '',
        'Buildings · turtle ship · panokseon', 'Blender 5.2 procedural models', '', 'World maps', 'Natural Earth', '', 'Font', 'Galmuri (OFL)', '', '',
        'A people that forgets its history has no future', '', '', 'Thank you for playing!']),
    ];
  }
  update(dt) {
    this.t += dt;
    const go = input.hit('ok') || !!input.tap(0, 0, VW, VH);
    if (this.phase === 0 && (this.t > this.credits.length * 2.2 + 8 || go)) { this.phase = 1; this.t = 0; playBgm('halloffame'); S.party.forEach((m) => cry(m.sp)); }
    else if (this.phase === 1 && this.t > 2 && go) fadeTo(() => setScene(new Title()));
  }
  draw(c) {
    drawBackdrop(c, this.phase === 0 ? 41 : 33, this.phase === 0 ? 5 : 9, 1.05 + this.t * 0.002);
    c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(0, 0, G.W, VH);
    if (this.phase === 1) S.party.forEach((m, i) => { const im = img(`poke/front/${m.sp}${m.shiny ? 's' : ''}.png`); if (ready(im)) c.drawImage(im, Math.floor(G.time * 2) % 2 * im.height, 0, im.height, im.height, hofX(i) - 48, 70, 96, 96); });
  }
  drawUI() {
    if (this.phase === 0) {
      const y0 = VH + 10 - this.t * 22;
      this.credits.forEach((l, i) => ui.text(l, VW / 2, y0 + i * 22, { align: 'center', bold: i === 0, color: i === 0 ? '#ffe9a8' : '#fff', shadow: '#000' }));
    } else {
      ui.text(tr('명예의 전당', 'Hall of Fame'), VW / 2, 24, { align: 'center', bold: true, color: '#ffe9a8', shadow: '#000' });
      ui.text(tr('612 → 1980, 세계 1860 → 1945 시간여행 완주!', 'Journey from 612 to 1980 and the world from 1860 to 1945 complete!'), VW / 2, 42, { align: 'center', color: '#fff', shadow: '#000' });
      ui.text(S.mode === 'challenge' ? tr('챌린지 달성! 한 번도 전멸하지 않고 완주했다', 'Challenge complete! Not a single wipe all the way') : tr(`난이도: ${MODE_NAMES()[S.mode] || MODE_NAMES().normal}`, `Difficulty: ${MODE_NAMES()[S.mode] || MODE_NAMES().normal}`), VW / 2, 56, { align: 'center', size: 9, color: S.mode === 'challenge' ? '#ffe27a' : '#ddd', shadow: '#000' });
      S.party.forEach((m, i) => { ui.text(`${m.name}  Lv.${m.lv}`, hofX(i), 176, { align: 'center', bold: true, color: '#fff', shadow: '#000' }); });
      const pt = Math.floor(S.playtime / 60);
      ui.text(tr(`플레이 시간 ${Math.floor(pt / 60)}시간 ${pt % 60}분`, `Play time ${Math.floor(pt / 60)}h ${pt % 60}m`), VW / 2, 210, { align: 'center', size: 9, color: '#fff', shadow: '#000' });
      ui.text(tr('Z 타이틀로', 'Z to title'), VW / 2, 240, { align: 'center', size: 9, color: '#ddd', shadow: '#000' });
    }
  }
}
