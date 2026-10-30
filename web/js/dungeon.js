// Mystery-dungeon style floors: random rooms & corridors, turn-based 8-way movement and moves.
import { G, VW, VH, TILE, img, ready, drawSeen, input, ui, COL, say, openMenu, toast, fadeTo, clamp, randInt, choice, shuffle, prefs, touchUI } from './core.js';
import { playBgm, sfx, cry, jingle } from './audio.js';
import { S, DEX, Mon, useMove, expGain, typeMult, addItem, ITEMS, STATUS_NAME, STAT_NAME, TYPE_COLORS, recruit, ROSTER_MAX, LEGENDS, PSEUDO, mode, save, moveDesc } from './game.js';
import { QITEMS, TELE_TUT, ERAS } from './content.js';
import { era, mainStep, activeSides, lines, gainExpFor, shareExp, itemMenu, partyMenu, questMenu, settingsMenu, quitItem, wanderBoss, foeLevels, challenge, loseChallenge, lairDone, spyTick, midWaiting } from './quests.js';
import { drawMon, Town, PEARL, objInView } from './town.js';
import { tr } from './i18n.js';
import { tileSet, paintTerrain, hasPmdSprite, pmdHeadroom } from './pmd.js';
import { NET } from './net.js';

// the floor's size in tiles: 44x32, unless a Pearl floor needs more room (fixedFloor sets it per floor)
let W = 44, H = 32;
const DIRS8 = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
const faceName = (d) => (d[0] > 0 ? 'right' : d[0] < 0 ? 'left' : null);
const RECRUIT_RATE = 0.35; // wild Pokémon asking to join after fainting (shiny: 70%; legendaries: always)
// Boss tiers. Legends (birds, lake trio, Lugia, the Sinnoh legends...) are a tier above: +3 levels, 3.2x HP, harder hits,
// bigger telegraphed blasts, shorter openings and a second blast phase. The 600-total lines (Garchomp, Salamence, Metagross,
// Tyranitar, Dragonite) fight at 85% of the legend tier. From 1200 on, ordinary bosses carry 30% more HP.
// The final boss sets its own numbers.
const LEGEND_TIER = { up: 3, hp: 3.2, atk: 1.2, cap: 0.38, blast: 1.25, stagger: 1, phase2: true };
const PSEUDO_TIER = { up: 2, hp: 3.2 * 0.85, atk: 1.2 * 0.85, cap: 0.38 * 0.85, blast: 1.25 * 0.85, stagger: 1, phase2: true };
function bossTier(b) {
  if (b.final) return { up: 0, hp: 1, atk: 1, cap: 0.3, blast: 1, stagger: 2 };
  if (LEGENDS.has(b.sp)) return LEGEND_TIER;
  if (PSEUDO.has(b.sp)) return PSEUDO_TIER;
  return { up: 0, hp: era().year >= 1200 ? 1.3 : 1, atk: 1, cap: 0.3, blast: 1, stagger: 2 };
}
// difficulty along the journey: 0 in the first era, 1 in the last. Early floors are sparse and forgiving, late ones crowded and harsh.
export const curve = () => clamp(S.era / Math.max(1, ERAS.length - 1), 0, 1);

// The team's moves land on any foe within SURE_REACH tiles, whichever way their user faces (skillTargets); past that
// a special move flies LINE_REACH tiles in a line. Foes reach less far: an ordinary foe's line moves FOE_REACH tiles,
// a boss's BOSS_REACH tiles, its line moves and its telegraphed blasts alike.
const SURE_REACH = 3, LINE_REACH = 6, FOE_REACH = 4, BOSS_REACH = 4;
// a legend's signature moves cover its whole arena; in a town battle they reach this far from it
const SIG_REACH = 8;
const reachOf = (e) => (e.isBoss ? BOSS_REACH : e.team === 'foe' ? FOE_REACH : LINE_REACH);
// bosses shrug off sleep, freeze and poison, so they can't be locked down or worn away; a legendary boss shrugs off
// every status problem, paralysis and burns too (even Rest's own sleep)
const statusProof = (m, s) => m.boss && (LEGENDS.has(m.sp) || ['slp', 'frz', 'psn'].includes(s));
// teammates stay with the one in control: they fight what comes near the team instead of chasing foes across a room
const LEASH = 4;
// the leader's badge, a crowned shield, over its head and beside its name in the team panel (BADGE_S)
const BADGE_COL = { K: COL.ink, R: '#d0323c', D: '#8a1c26', G: '#ffce54', g: '#c88c28' };
const BADGE = ['KKKKKKKKKKK', 'KRRRRRRRRRK', 'KRGRRGRRGRK', 'KRGGRGRGGRK', 'KRGGGGGGGRK', 'KRgGgGgGgRK', 'KRRRRRRRRDK',
  '.KRRRRRRDK.', '..KRRRRDK..', '...KRRDK...', '....KDK....', '.....K.....'];
const BADGE_S = ['.KKKKKKK.', 'KRRRRRRRK', 'KGRRGRRGK', 'KGGRGRGGK', 'KGGGGGGGK', 'KRRRRRRDK', '.KRRRRDK.', '..KRRDK..', '...KDK...', '....K....'];
function drawBadge(c, x, y, rows = BADGE) {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length;) { // one rectangle per run of a colour
      let n = 1;
      while (row[i + n] === row[i]) n++;
      if (row[i] !== '.') { c.fillStyle = BADGE_COL[row[i]]; c.fillRect(x + i, y + j, n, 1); }
      i += n;
    }
  });
}
// Telegraphed boss attacks: tiles light up, and the blast lands after `delay` boss turns.
// Every pattern is checked so that each ally can reach a safe tile in time (Chebyshev steps in the open arena).
const PATTERNS = {
  cross: { delay: 1, hit: (dx, dy) => dx === 0 || dy === 0 },
  x: { delay: 1, hit: (dx, dy) => Math.abs(dx) === Math.abs(dy) },
  star: { delay: 1, hit: (dx, dy) => dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy) },
  near: { delay: 2, hit: (dx, dy, d) => d <= 2 },
  ring: { delay: 1, hit: (dx, dy, d) => d >= 3 && d <= 4 },
  far: { delay: 2, hit: (dx, dy, d) => d >= 5 },
  rows: { delay: 1, hit: (dx, dy, d, x, y, p) => (y + p) % 2 === 0 },
  cols: { delay: 1, hit: (dx, dy, d, x, y, p) => (x + p) % 2 === 0 },
  checker: { delay: 1, hit: (dx, dy, d, x, y, p) => (x + y + p) % 2 === 0 },
  quad: { delay: 2, hit: (dx, dy, d, x, y, p, q) => !(Math.sign(dx) === q[0] && Math.sign(dy) === q[1]) },
  random: { delay: 1, hit: () => Math.random() < 0.45 },
  target: { delay: 1, hit: () => false }, // plus-shapes on every ally, added below
  orbs: { delay: 1, hit: () => false }, // Judgment's orbs falling all over the arena, added below
};

export class Dungeon {
  // def: a fight that no era lists (Town.policeDef); o.floor: the floor to start on (the Boss Tower's checkpoint)
  constructor(dId, def = era().dungeons[dId], o = {}) {
    this.dId = dId;
    this.def = def;
    this.main = ['dungeon', 'battle'].includes(mainStep()?.do) && mainStep().d === dId; // a 'battle' step is a run started in town
    this.wander = wanderBoss(dId); // a legend missed in an earlier era, waiting one floor below the usual last one
    // a challenge run left unfinished counts as a wipe (quests.js checkRun); the Boss Tower comes after the ending
    if (challenge() && !def.tower) { S.inRun = dId; save(); }
    // a run of stages starts at the first one still to beat (the finale's guardians stay beaten)
    this.floor = this.startFloor = o.floor || 1 + Math.max(0, (def.stages || []).findIndex((st) => !(st.flag && S.flags[st.flag])));
    this.msgs = [];
    this.pops = [];
    this.queue = [];
    this.turnNo = 0;
    this.found = { money: 0, items: {} };
    this.showMap = true;
    if (this.def.water) this.boardCrew();
    this.newFloor();
  }
  // naval battles: only Water-type Pokémon go aboard (party first, then the roster); the navy lends a crew when short
  boardCrew() {
    S.homeParty = S.party;
    const crew = [...S.party, ...S.roster.slice().sort((a, b) => b.lv - a.lv)].filter((m) => m.types.includes(11)).slice(0, 3);
    const avg = Math.round(S.party.reduce((s, m) => s + m.lv, 0) / S.party.length);
    this.loaned = [];
    for (const sp of this.def.loan || [158, 258]) {
      if (crew.length >= 2) break;
      const m = new Mon(sp, avg); m.loan = true; crew.push(m); this.loaned.push(m);
    }
    S.party = crew;
  }
  restoreCrew() {
    if (!S.homeParty) return;
    const crew = S.party, home = S.homeParty;
    S.homeParty = null; S.party = home;
    for (const m of crew) { m.stages = {}; if (m.hp <= 0) m.hp = 1; }
    for (const m of crew) if (!m.loan && !home.includes(m) && !S.roster.includes(m)) (S.party.length < 3 ? S.party : S.roster).push(m); // recruited at sea
  }
  enter() {
    playBgm(this.stage?.bgm || this.def.bgm);
    G.dialogSpeaker = (L) => { if (typeof L?.who === 'number' && L.who !== this._lastCry) { cry(L.who); this._lastCry = L.who; } };
    if (!this.def.police) this.msg(tr(`${this.title}에 들어왔다!`, `Entered ${this.title}!`), COL.blue); // a fight in town is entered nowhere
    // a legend fighting on its own ground (Groudon on the Nakdong, Kyogre off Incheon) is stronger for this run
    for (const f of this.def.field || []) for (const m of S.party) if (m.sp === f.sp && !m.field) { m.field = f.mul; this.msg(f.msg(m.name), COL.green); }
    if (this.def.battle) this.msg(this.def.battle.msg?.() || tr('전투가 시작됐다! 적의 지휘관을 쓰러뜨리거나 적군을 모두 물리치자.', 'The battle begins! Defeat the enemy commander or drive off all their troops.'), COL.red);
    if (this.def.water) {
      this.msg(tr('해전! 물 타입 포켓몬만 배에 올랐다.', 'Naval battle! Only Water-type Pokémon came aboard.'), COL.blue);
      if (this.loaned.length) this.msg(tr(`물 포켓몬이 모자라 수군이 ${this.loaned.map((m) => m.name).join(', ')}을(를) 빌려주었다.`, `Short on Water types, the navy lent you ${this.loaned.map((m) => m.name).join(', ')}.`), COL.green);
    }
  }
  exit() { G.dialogSpeaker = null; }
  relang(sw) { for (const m of this.msgs) m.text = sw(m.text); }
  // the bosses waiting on this floor: a stage's own (one, or a pair in the Boss Tower; a guardian once beaten stays
  // beaten), a legend's lair, a returning legend, the story boss on the last floor of the story run, or a story
  // dungeon's mid-boss on a visit after that run (midWaiting): every run meets one boss
  get bossDefs() {
    const d = this.def, st = this.stage;
    if (st) return st.flag && S.flags[st.flag] ? [] : [].concat(st.bosses || st.boss || []);
    if (d.legend) return d.boss && this.floor === d.floors && !lairDone(this.dId) ? [d.boss] : [];
    if (this.wander && this.floor === this.floors) return [this.wander];
    if (!this.main) return d.mid && this.floor === d.mid.floor && midWaiting(this.dId) ? [d.mid] : [];
    return d.boss && this.floor === d.floors ? [d.boss] : [];
  }
  get bossDef() { return this.bossDefs[0] || null; }
  get bossFloor() { return !!this.bossDef; }
  get floors() { return this.def.floors + (this.wander ? 1 : 0); }
  // a dungeon made of fixed stages (the Arceus finale, the Boss Tower): what this floor is
  get stage() { return this.def.stages?.[this.floor - 1] || null; }
  get title() { return this.stage?.name ? `${this.def.name} · ${this.stage.name}` : this.def.name; }

  // ---------------------------------------------------------------- generation
  newFloor() {
    W = 44; H = 32;
    const lay = this.fixedFloor(); // a Pearl floor (a big one sets a bigger size) or a town turned battlefield; null for a generated floor
    const grid = Array.from({ length: H }, () => new Array(W).fill(0));
    const roomOf = Array.from({ length: H }, () => new Array(W).fill(-1));
    const rooms = [];
    this.arena = !lay && this.bossFloor; // single 20x11 room that fits one screen; the camera stays fixed on it
    if (lay) {
      for (const [x, y] of lay.open) { grid[y][x] = 1; roomOf[y][x] = 0; }
      rooms.push(lay.box);
    } else if (this.arena) {
      rooms.push({ x: 12, y: 9, w: 20, h: 11 });
    } else {
      for (let i = 0; i < 90 && rooms.length < 8; i++) {
        const w = randInt(5, 10), h = randInt(4, 7);
        const r = { x: randInt(2, W - w - 3), y: randInt(2, H - h - 3), w, h };
        if (rooms.some((o) => r.x < o.x + o.w + 2 && r.x + r.w + 2 > o.x && r.y < o.y + o.h + 2 && r.y + r.h + 2 > o.y)) continue;
        rooms.push(r);
      }
    }
    if (!lay) rooms.forEach((r, i) => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) { grid[y][x] = 1; roomOf[y][x] = i; } });
    const carve = (x0, y0, x1, y1) => {
      let x = x0, y = y0;
      const hFirst = Math.random() < 0.5;
      const stepX = () => { while (x !== x1) { x += Math.sign(x1 - x); grid[y][x] = 1; } };
      const stepY = () => { while (y !== y1) { y += Math.sign(y1 - y); grid[y][x] = 1; } };
      if (hFirst) { stepX(); stepY(); } else { stepY(); stepX(); }
    };
    const ctr = (r) => [randInt(r.x + 1, r.x + r.w - 2), randInt(r.y + 1, r.y + r.h - 2)];
    const order = rooms.map((r, i) => i).sort((a, b) => rooms[a].x - rooms[b].x);
    for (let i = 0; i + 1 < order.length; i++) carve(...ctr(rooms[order[i]]), ...ctr(rooms[order[i + 1]]));
    for (let k = 0; k < 2 && rooms.length > 3; k++) { const a = choice(rooms), b = choice(rooms); if (a !== b) carve(...ctr(a), ...ctr(b)); }
    this.grid = grid; this.roomOf = roomOf; this.rooms = rooms;
    // decorative ponds in the rock next to rooms (impassable like walls); PMD chunk sets draw the shorelines
    this.pond = new Set();
    if (!this.arena && !lay && !this.def.water) {
      for (let k = 0; k < randInt(1, 3); k++) {
        const r = choice(rooms), side = choice([[0, -1], [0, 1], [-1, 0], [1, 0]]);
        let x = side[0] ? (side[0] < 0 ? r.x - 2 : r.x + r.w + 1) : randInt(r.x, r.x + r.w - 1);
        let y = side[1] ? (side[1] < 0 ? r.y - 2 : r.y + r.h + 1) : randInt(r.y, r.y + r.h - 1);
        for (let n = randInt(3, 9); n > 0; n--) {
          if (x > 0 && y > 0 && x < W - 1 && y < H - 1 && grid[y][x] === 0) this.pond.add(y * W + x);
          x += randInt(-1, 1); y += randInt(-1, 1);
        }
      }
    }
    this.bg = null;
    this.seen = Array.from({ length: H }, () => new Array(W).fill(false));
    this.vis = Array.from({ length: H }, () => new Array(W).fill(false));
    this.ents = []; this.items = []; this.stairs = null; this.pendingStairs = false; this.boss = null; this.bosses = []; this.altar = null; this.lit = false; this.stageDone = false; this.rent = null;
    // allies
    const startRoom = this.bossFloor || lay ? rooms[0] : choice(rooms);
    const sx = lay ? lay.start[0] : this.bossFloor ? 22 : randInt(startRoom.x + 1, startRoom.x + startRoom.w - 2);
    const sy = lay ? lay.start[1] : this.bossFloor ? 17 : randInt(startRoom.y + 1, startRoom.y + startRoom.h - 2);
    // the boss room: whoever fell on the way gets back up with half its HP (apart from the once-a-run Revive)
    const rose = this.bossFloor ? S.party.filter((m) => m.hp <= 0) : [];
    for (const m of rose) { m.hp = Math.max(1, Math.floor(m.maxhp / 2)); m.status = null; m.stages = {}; }
    // a tagged-in leader keeps the lead; a fallen one hands it to the first teammate still standing
    const lead = S.party.includes(this.leadMon) && this.leadMon.hp > 0 ? this.leadMon : S.party.find((m) => m.hp > 0) || S.party[0];
    this.player = this.addEnt(lead, sx, sy, 'ally', true);
    this.mates = [];
    for (const m of S.party) {
      if (m === lead || m.hp <= 0) continue;
      const at = lay?.team?.[S.party.indexOf(m)]; // a fight in town: where it stood
      const [px, py] = at && this.walk(...at) && !this.entAt(...at) ? at : this.freeNear(sx, sy);
      this.mates.push(this.addEnt(m, px, py, 'ally', false));
    }
    if (rose.length) this.msg(tr(`쓰러졌던 ${rose.map((m) => m.name).join(', ')}이(가) 보스 앞에서 다시 일어났다!`, `${rose.map((m) => m.name).join(', ')} got back up to face the boss!`), COL.green);
    const others = rooms.filter((r) => r !== startRoom);
    const spot = (pool = others.length ? others : rooms) => {
      for (let t = 0; t < 200; t++) {
        const r = choice(pool), x = randInt(r.x, r.x + r.w - 1), y = randInt(r.y, r.y + r.h - 1);
        if (this.walk(x, y) && !this.entAt(x, y) && !this.itemAt(x, y) && !(this.stairs && this.stairs[0] === x && this.stairs[1] === y)) return [x, y];
      }
      return null;
    };
    if (this.bossFloor) {
      // one boss in the middle of the arena, a pair side by side; on a Pearl floor or in a town, at its own spot
      const defs = this.bossDefs, at = defs.length > 1 ? [[18, 12], [26, 12]] : [[22, 12]];
      this.bosses = defs.map((b, i) => this.spawnBoss(b, lay?.bossAt ? this.nearestOpen(...lay.bossAt) : at[i], i));
      this.boss = this.bosses[0];
      this.bossIntro = !this.stage?.wake; // one waiting in its hall speaks when the team comes near (foeAI)
      if (lay?.battle) this.deployArmies(lay);
    } else if (lay?.battle) this.deployArmies(lay);
    else if (this.stage) { // a stage with no boss (the Spear Pillar): no foes either, only the way on
      this.stairs = lay?.stairs || null;
      const fl = this.stage.flute;
      if (fl && lay) {
        this.altar = lay.at(fl.altar); this.lightAt = lay.at(fl.stairs);
        this.msg(tr('꼭대기의 제단에서 천계의 피리를 불자!', 'Play the Azure Flute at the altar on the summit!'), COL.blue);
      }
    } else {
      this.stairs = lay?.stairs || spot();
      const k = curve();
      const n = Math.min(9, Math.round(2 + k * 4 + (this.floor - 1) * (0.4 + k * 0.6)));
      for (let i = 0; i < n; i++) this.spawnFoe(spot());
      const ni = randInt(3, 5);
      for (let i = 0; i < ni; i++) { const p = spot(); if (p) this.items.push({ x: p[0], y: p[1], ...this.randomItem() }); }
      this.questSpawns(spot);
    }
    this.updateVis();
  }
  // A boss: its tier (bossTier) sets its level bonus and multipliers; from 1200 on it also stays ahead of the team's
  // growth (foeLevels). A boss with `revive` gets back up in a later form (see reviveBoss). A returning legend
  // (b.wander) fights at exactly its new dungeon's level. The second of a pair charges its first blast later.
  spawnBoss(b, [x, y], i = 0) {
    const avg = Math.round((S.party[0].lv + S.party[1].lv) / 2);
    const t = bossTier(b), [, top, scaled] = foeLevels(this.def), up = b.wander ? 0 : t.up;
    let lv = b.wander ? b.lv : clamp(avg + (b.lvUp ?? 2) + up, (b.lvMin ?? b.lv - 5) + up, b.lv + up) + mode().lv;
    if (scaled && !b.wander) lv = Math.max(lv, top + 2 + up);
    if (b.lvCap) lv = Math.min(lv, b.lvCap); // Arceus follows the team up to Lv 180
    const mon = new Mon(b.sp, lv, { boss: true, hpMul: (b.hp || 1.05 + curve() * 0.4) * t.hp * mode().hp, atkMul: (b.atk || 0.9) * t.atk, buff: this.def.battle?.foeBuff, moves: b.moves?.map((id) => ({ id, pp: DEX.moves[id].pp })) });
    mon.slowT = b.slow || 0;
    const e = this.addEnt(mon, x, y, 'foe');
    e.isBoss = true; e.def = b; e.bphase = 1; e.stagger = 0; e.tele = null;
    e.tier = t; e.cap = b.cap ?? t.cap;
    // a legend or 600-class boss with a single telegraph gains a second, faster and harder phase below half HP
    e.teleSet = t.phase2 && b.tele && !Array.isArray(b.tele)
      ? [b.tele, { ...b.tele, at: 0.5, every: Math.max(2, b.tele.every - 2), dmg: b.tele.dmg * 1.2, mix: b.tele.mix?.map((m) => ({ ...m, dmg: m.dmg * 1.2 })), stagger: 1,
        msg: t === LEGEND_TIER ? tr(`${mon.name}이(가) 전설의 힘을 끌어올렸다! 공격이 한층 거세진다!`, `${mon.name} unleashes its legendary power! Its attacks grow fiercer!`)
          : tr(`${mon.name}이(가) 온 힘을 끌어올렸다! 공격이 한층 거세진다!`, `${mon.name} draws on all its strength! Its attacks grow fiercer!`) }]
      : b.tele;
    e.teleCD = b.tele ? (this.teleConf(e).first ?? 3) + i * 2 : 0;
    e.sig = this.sigPlan(b.sig, b.pace);
    e.waiting = this.stage?.wake || 0;
    return e;
  }
  questSpawns(spot) {
    const last = this.floor === this.def.floors || (this.def.boss && this.main && this.floor === this.def.floors - 1);
    const q = this.def.quest;
    if (this.main && q && (q.perFloor || (q.lastFloor && last))) { const p = spot(); if (p) this.items.push({ x: p[0], y: p[1], id: q.item, quest: true }); }
    for (const sq of activeSides(this.dId)) {
      if (sq.kind === 'collect' && Math.random() < 0.85) { const p = spot(); if (p) this.items.push({ x: p[0], y: p[1], id: sq.item, quest: !!QITEMS[sq.item] }); }
      if (sq.kind === 'rescue' && sq.floor === this.floor && !S.flags['rescued_' + sq.id]) {
        const p = spot(); if (p) { const e = this.addEnt(new Mon(sq.sp, 5), p[0], p[1], 'npc'); e.rescue = sq; }
      }
    }
    const r = this.def.rescue;
    if (this.main && r && r.floor === this.floor && !S.flags['rescued_main_' + this.dId]) {
      const p = spot(); if (p) { const e = this.addEnt(new Mon(r.sp, 5), p[0], p[1], 'npc'); e.rescue = { id: 'main_' + this.dId, sp: r.sp }; }
    }
  }
  randomItem() {
    const r = Math.random();
    if (r < 0.32) return { id: 'oran' };
    if (r < 0.5) return { id: 'stone' };
    if (r < 0.8) return { id: 'money', n: Math.round(randInt(20, 40) * (1 + S.era * 0.8)) };
    if (r < 0.88) return { id: 'herb' };
    if (r < 0.95) return { id: 'sitrus' };
    return { id: 'rice' };
  }
  spawnFoe(p) {
    if (!p) return;
    const [a, b, scaled] = foeLevels(this.def); // deeper floors lean to the top of the band
    let lv = clamp(randInt(a, b - 1) + Math.floor((this.floor - 1) / 2), a, b);
    // the first eras never field foes above the team's average level (shifted by the difficulty)
    if (!scaled && curve() < 0.3) lv = Math.min(lv, Math.max(a, Math.round(S.party.reduce((s, m) => s + m.lv, 0) / S.party.length) + mode().lv));
    const mon = new Mon(choice(this.def.mons), lv, { foe: true });
    const e = this.addEnt(mon, p[0], p[1], 'foe');
    if (Math.random() < 1 / 48) { mon.shiny = true; e.shiny = true; }
    return e;
  }
  addEnt(mon, x, y, team, isPlayer = false) {
    const e = { mon, x, y, vx: x, vy: y, face: [0, 1], team, isPlayer, shiny: mon.shiny, phase: Math.random() * 3, sleepT: 0, alive: true, shown: true };
    mon.stages = {};
    this.ents.push(e);
    return e;
  }
  freeNear(x, y) {
    for (const [dx, dy] of shuffle(DIRS8.slice())) { const nx = x + dx, ny = y + dy; if (this.walk(nx, ny) && !this.entAt(nx, ny)) return [nx, ny]; }
    return [x, y];
  }
  walk(x, y) { return x >= 0 && y >= 0 && x < W && y < H && this.grid[y][x] === 1; }
  entAt(x, y) { return this.ents.find((e) => e.alive && !e.hidden && e.x === x && e.y === y); } // one gone into the dark (Shadow Force) stands nowhere
  itemAt(x, y) { return this.items.find((i) => i.x === x && i.y === y); }
  // Fixed floors. A Pearl floor (a stage's layout or def.layouts[floor - 1] → data/pearl.json: Snowpoint Temple,
  // Mt. Coronet's summit) keeps the room's real shape: entered at its gate or arrival stairs, left by its other stairs,
  // its boss on Pearl's own spot. Its walkable part is framed in the floor, which grows past 44x32 for a big map (the
  // Spear Pillar). A town battle (def.battle) fights in the town itself: the town as we build it, cropped to the 44x32
  // grid where it is most open. Both keep only the tiles reachable from the start.
  fixedFloor() {
    if (this.def.battle) return this.battleFloor();
    const L = PEARL.floors[this.stage?.layout || this.def.layouts?.[this.floor - 1]];
    if (!L) return null;
    const walkable = (ch) => '.,*i='.includes(ch);
    let x0 = L.w, y0 = L.h, x1 = 0, y1 = 0;
    L.rows.forEach((row, y) => { for (let x = 0; x < L.w; x++) if (walkable(row[x])) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } });
    W = Math.max(W, x1 - x0 + 3); H = Math.max(H, y1 - y0 + 3);
    const ox = Math.floor((W - (x1 - x0 + 1)) / 2) - x0, oy = Math.floor((H - (y1 - y0 + 1)) / 2) - y0;
    const at = (p) => p && [p[0] + ox, p[1] + oy]; // Pearl's coordinates on this floor
    const open = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1 && walkable(L.rows[y - oy]?.[x - ox] || '#');
    const gate = L.doors.find((q) => q[2] === 'gate'), stairs = L.doors.filter((q) => q[2] === 'stairs');
    const entry = gate || stairs[0], out = stairs.find((q) => q !== entry);
    const start = at(entry);
    const tiles = this.reach(start, open);
    return { open: tiles, box: this.boxOf(tiles), start, stairs: at(out), bossAt: at(L.npcs[0]), at };
  }
  // A fight in a town (def.battle): the town as built, cropped to the 44x32 grid. A battle of armies takes the window
  // with the most room to fight, our side at its bottom middle and the other side about twenty steps away; a fight
  // where you stand (B.at, town coordinates, the constables of Town.policeDef) takes the window around you, everyone
  // where they stood.
  battleFloor() {
    const B = this.def.battle;
    this.battleTown = this.battleTown || new Town(B.kind || 1, { def: B.town, battle: true });
    const T = this.battleTown, solid = (x, y) => T.solid[y]?.[x] !== false;
    let best = null; // the 44x32 window with the most room to fight
    if (B.at) best = { x0: clamp(B.at[0] - W / 2, 0, Math.max(0, T.W - W)), y0: clamp(B.at[1] - H / 2, 0, Math.max(0, T.H - H)) };
    else for (let y0 = 0; y0 <= Math.max(0, T.H - H); y0 += 2) for (let x0 = 0; x0 <= Math.max(0, T.W - W); x0 += 2) {
      let n = 0;
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (!solid(x0 + x, y0 + y)) n++;
      if (!best || n > best.n) best = { x0, y0, n };
    }
    this.crop = [best.x0, best.y0];
    const open = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1 && !solid(best.x0 + x, best.y0 + y);
    const local = (p) => p && [p[0] - best.x0, p[1] - best.y0];
    let start = null;
    if (B.at) { // the open tile nearest to where you stand
      const [ax, ay] = local(B.at);
      for (let r = 0; r < 8 && !start; r++) for (let dy = -r; dy <= r && !start; dy++) for (let dx = -r; dx <= r && !start; dx++) if (open(ax + dx, ay + dy)) start = [ax + dx, ay + dy];
    }
    // our side starts at the bottom middle; the other side holds the far end
    for (let y = H - 2; y > 0 && !start; y--) for (let d = 0; d < W / 2 && !start; d++) for (const x of [W / 2 - d, W / 2 + d]) if (!start && open(x, y)) start = [x, y];
    const tiles = this.reach(start, open);
    // the other side waits about twenty steps away (breadth-first order is distance order), so the armies meet soon
    const far = B.foesAt ? local(B.foesAt[0]) : tiles[this.stepsAway(start, open, 20)];
    return { open: tiles, box: this.boxOf(tiles), start, bossAt: far, enemyAt: far, foesAt: B.foesAt?.map(local), team: B.team?.map(local), battle: true };
  }
  reach(start, open) {
    const seen = new Set([start[1] * W + start[0]]), out = [start];
    for (let k = 0; k < out.length; k++) {
      const [x, y] = out[k];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy, key = b * W + a; if (!seen.has(key) && open(a, b)) { seen.add(key); out.push([a, b]); } }
    }
    return out;
  }
  // index (in reach order) of the first tile at least `n` steps from the start, or the farthest one
  stepsAway(start, open, n) {
    const dist = new Map([[start[1] * W + start[0], 0]]), q = [start];
    for (let k = 0; k < q.length; k++) {
      const [x, y] = q[k], d0 = dist.get(y * W + x);
      if (d0 >= n) return k;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy, key = b * W + a; if (!dist.has(key) && open(a, b)) { dist.set(key, d0 + 1); q.push([a, b]); } }
    }
    return q.length - 1;
  }
  boxOf(tiles) {
    const xs = tiles.map((t) => t[0]), ys = tiles.map((t) => t[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x + 1, h: Math.max(...ys) - y + 1 };
  }
  // the nearest walkable tile nobody stands on (troops fan out from their side's anchor)
  nearestOpen(x, y) {
    const seen = new Set(), q = [[x, y]];
    for (let k = 0; k < q.length && k < 2000; k++) {
      const [a, b] = q[k], key = b * W + a;
      if (seen.has(key)) continue;
      seen.add(key);
      if (this.walk(a, b) && !this.entAt(a, b)) return [a, b];
      for (const [dx, dy] of DIRS8) if (this.walk(a + dx, b + dy)) q.push([a + dx, b + dy]);
    }
    return [x, y];
  }
  // a town battle: our side's troops (and its legend) gather by the team, the other side's around their far end
  deployArmies(lay) {
    const B = this.def.battle, [lo, hi] = foeLevels(this.def);
    this.army = [];
    const join = (m, at) => { const [x, y] = this.nearestOpen(...at); const e = this.addEnt(m, x, y, 'ally'); e.army = true; this.army.push(e); return e; };
    if (B.join) join(new Mon(B.join.sp, hi + 2, { boss: true, hpMul: 2.2, atkMul: 1, buff: B.allyBuff }), lay.start);
    for (const sp of B.allies || []) join(new Mon(sp, randInt(lo, hi), { buff: B.allyBuff }), lay.start);
    (B.foes || []).forEach((sp, i) => {
      const [x, y] = this.nearestOpen(...(lay.foesAt?.[i] || lay.enemyAt));
      const e = this.addEnt(new Mon(sp, randInt(lo, hi), { buff: B.foeBuff, foe: true }), x, y, 'foe');
      // soldiers and constables don't offer to join; an army's soldiers also hit soft and drop no coins, while the
      // constables fight like the era's ordinary foes
      e.alert = true; e.noJoin = true; e.summoned = !this.def.police;
    });
  }
  // Primal Reversion (an orb used in a dungeon): stronger, typed as the orb says, until the run ends (result clears it)
  primal(m, orb) {
    m.primal = true; m.typeOverride = orb.types; m.form = tr('원시 ', 'Primal ');
    const e = this.ents.find((a) => a.mon === m);
    this.step(() => { this.shake = 0.6; sfx('super'); cry(m.sp); if (e) e.reviveT = 1; this.msg(tr(`${orb.name}이(가) 빛나며 ${m.data.name}이(가) 원시회귀했다!`, `The ${orb.name} shines, and ${m.data.name} undergoes Primal Reversion!`), COL.red); }, 0.6);
    this.afterItem();
  }
  canStep(x, y, dx, dy) {
    if (!this.walk(x + dx, y + dy)) return false;
    if (dx && dy && (!this.walk(x + dx, y) || !this.walk(x, y + dy))) return false;
    return true;
  }
  updateVis() {
    if (this.def.battle) { for (let y = 0; y < H; y++) { this.vis[y].fill(true); this.seen[y].fill(true); } return; }
    const p = this.player;
    for (let y = 0; y < H; y++) this.vis[y].fill(false);
    const r = this.roomOf[p.y][p.x];
    const show = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) { this.vis[y][x] = true; this.seen[y][x] = true; } };
    if (r >= 0) { const R = this.rooms[r]; for (let y = R.y - 1; y <= R.y + R.h; y++) for (let x = R.x - 1; x <= R.x + R.w; x++) show(x, y); }
    for (let y = p.y - 2; y <= p.y + 2; y++) for (let x = p.x - 2; x <= p.x + 2; x++) show(x, y);
  }

  // ---------------------------------------------------------------- messages & visuals
  msg(text, color = COL.ink) { this.msgs.push({ text, color, t: 6 }); if (this.msgs.length > 5) this.msgs.shift(); }
  step(fn, dur = 0.22) { this.queue.push({ fn, dur }); }
  pop(e, text, color) { this.pops.push({ x: e.x, y: e.y, text, color, t: 0.9 }); }
  get busy() { return this.queue.length > 0 || this.cur || this.pendingMates?.length > 0; }

  // ---------------------------------------------------------------- turn
  playerAct(kind, arg) {
    const p = this.player;
    if (kind === 'move') {
      const [dx, dy] = arg;
      p.face = [dx, dy];
      if (!this.canStep(p.x, p.y, dx, dy)) { sfx('bump'); return; }
      const o = this.entAt(p.x + dx, p.y + dy);
      if (o?.team === 'foe') return this.endTurn(() => this.attack(p, o, 'basic'));
      if (o?.team === 'npc') return this.talkNpc(o);
      if (o && o.team === 'ally') { o.x = p.x; o.y = p.y; }
      else if (o) { sfx('bump'); return; }
      p.x += dx; p.y += dy;
      this.endTurn(() => this.afterStep());
    } else if (kind === 'basic') {
      const t = this.entAt(p.x + p.face[0], p.y + p.face[1]);
      if (t?.team === 'npc') return this.talkNpc(t);
      this.endTurn(() => { if (t?.team === 'foe' && this.canStep(p.x, p.y, ...p.face)) this.attack(p, t, 'basic'); else { this.step(() => { this.msg(tr(`${p.mon.name}의 공격! 허공을 갈랐다.`, `${p.mon.name} attacked thin air.`)); sfx('miss'); }, 0.18); } });
    } else if (kind === 'move-skill') {
      const mv = p.mon.moves[arg];
      if (!mv) return;
      if (mv.pp <= 0) { this.msg(tr('PP가 없어 기술을 쓸 수 없다!', 'No PP left for that move!'), COL.red); sfx('cancel'); return; }
      this.endTurn(() => this.useSkill(p, arg));
    } else if (kind === 'wait') this.endTurn(() => {});
  }
  // Tab: control passes to the next living teammate in party order (no turn spent); a co-op guest's Pokémon is skipped.
  // When the one in control faints, the next one standing takes the lead (a guest's Pokémon too if no other is left);
  // the expedition fails only once the whole team is down.
  nextLeader(guests) {
    const all = [this.player, ...this.mates];
    const order = [...S.party.map((m) => all.find((a) => a.mon === m)).filter(Boolean), ...all.filter((a) => !S.party.includes(a.mon))];
    const i = order.indexOf(this.player);
    for (let k = 1; k < order.length; k++) {
      const e = order[(i + k) % order.length];
      if (e.alive && (guests || !NET.guestFor(S.party.indexOf(e.mon)))) return { e, order };
    }
    return { order };
  }
  lead(e, order) {
    this.player.isPlayer = false; e.isPlayer = true;
    this.player = e; this.leadMon = e.mon;
    this.mates = order.filter((a) => a !== e);
    this.dirSince = 0; this.nextMoveAt = 0; this.restT = 0;
    this.updateVis();
  }
  tag() {
    const { e, order } = this.nextLeader(false);
    if (!e) { sfx('cancel'); this.msg(tr('교대할 수 있는 동료가 없다.', 'No teammate can tag in.'), COL.red); return; }
    this.lead(e, order);
    sfx('cursor');
    this.msg(tr(`${e.mon.name}(으)로 교대했다!`, `Tagged in ${e.mon.name}!`), COL.blue);
  }
  takeOver() {
    if (this.player.alive || this.done) return;
    const n = this.nextLeader(false).e ? this.nextLeader(false) : this.nextLeader(true);
    if (!n.e) return this.failed();
    this.lead(n.e, n.order);
    this.msg(tr(`${n.e.mon.name}이(가) 앞장선다! 남은 동료와 함께 나아가자.`, `${n.e.mon.name} takes the lead! Press on with the rest of the team.`), COL.blue);
  }
  endTurn(playerFn) {
    if (this.player.mon.status === 'slp' || this.player.mon.status === 'frz' || (this.player.mon.status === 'par' && Math.random() < 0.25)) {
      this.statusSkip(this.player);
    } else playerFn();
    this.turnNo++;
    this.pendingMates = this.mates.concat(this.army || []).filter((m) => m.alive);
    this.resumeTurn();
  }
  // Allies act in order; a co-op guest's Pokémon waits for that player's command (or the AI after a timeout).
  resumeTurn() {
    while (this.pendingMates.length) {
      const m = this.pendingMates[0], slot = S.party.indexOf(m.mon);
      if (m.alive && NET.guestFor(slot)) {
        const cmd = NET.takeCmd(slot);
        if (!cmd) {
          if (!this.waitGuest) this.waitGuest = { m, slot, until: performance.now() + NET.turnWait * 1000 }; // real seconds, whatever the game speed
          if (performance.now() < this.waitGuest.until) return;
        }
        this.waitGuest = null;
        this.pendingMates.shift();
        if (cmd) this.mateAct(m, cmd); else this.allyAI(m);
        continue;
      }
      this.pendingMates.shift();
      if (m.alive) this.allyAI(m);
    }
    for (const e of this.ents.slice()) if (e.alive && e.team === 'foe') this.foeAI(e);
    this.turnEffects();
    this.updateVis();
  }
  // a guest-steered ally: the same actions the leader has (move / attack / move 1-4 / rest)
  mateAct(e, { kind, arg }) {
    const m = e.mon;
    if (m.status === 'slp' || m.status === 'frz' || (m.status === 'par' && Math.random() < 0.25)) return this.statusSkip(e);
    if (kind === 'move' && Array.isArray(arg)) {
      const dx = Math.sign(arg[0]), dy = Math.sign(arg[1]);
      if (!dx && !dy) return;
      e.face = [dx, dy];
      if (!this.canStep(e.x, e.y, dx, dy)) return;
      const o = this.entAt(e.x + dx, e.y + dy);
      if (o?.team === 'foe') return this.attack(e, o, 'basic');
      if (o && o.team !== 'ally') return;
      const fx = e.x, fy = e.y;
      if (o) { o.x = e.x; o.y = e.y; this.moveAnim(o, e.x + dx, e.y + dy); }
      e.x += dx; e.y += dy; this.moveAnim(e, fx, fy);
    } else if (kind === 'basic') {
      const t = this.entAt(e.x + e.face[0], e.y + e.face[1]);
      if (t?.team === 'foe' && this.canStep(e.x, e.y, ...e.face)) this.attack(e, t, 'basic');
      else this.step(() => { this.msg(tr(`${m.name}의 공격! 허공을 갈랐다.`, `${m.name} attacked thin air.`)); sfx('miss'); }, 0.18);
    } else if (kind === 'move-skill') {
      const mv = m.moves[arg];
      if (mv && mv.pp > 0) this.useSkill(e, arg);
      else this.allyAI(e);
    }
  }
  statusSkip(e) {
    const s = e.mon.status;
    if (s === 'slp') { e.sleepT--; if (e.sleepT <= 0) { e.mon.status = null; this.step(() => this.msg(tr(`${e.mon.name}은(는) 잠에서 깼다!`, `${e.mon.name} woke up!`)), 0.15); } else this.step(() => this.msg(tr(`${e.mon.name}은(는) 쿨쿨 자고 있다.`, `${e.mon.name} is fast asleep.`)), 0.15); }
    else if (s === 'frz') { if (Math.random() < 0.3) { e.mon.status = null; this.step(() => this.msg(tr(`${e.mon.name}의 얼음이 녹았다!`, `${e.mon.name} thawed out!`)), 0.15); } else this.step(() => this.msg(tr(`${e.mon.name}은(는) 얼어서 움직일 수 없다!`, `${e.mon.name} is frozen solid!`)), 0.15); }
    else this.step(() => this.msg(tr(`${e.mon.name}은(는) 몸이 저려 움직일 수 없다!`, `${e.mon.name} is paralyzed and can't move!`)), 0.15);
  }
  afterStep() {
    const p = this.player;
    const it = this.itemAt(p.x, p.y);
    if (it) {
      this.items.splice(this.items.indexOf(it), 1);
      if (it.id === 'money') { S.money += it.n; this.found.money += it.n; this.step(() => { this.msg(tr(`엽전 ${it.n}냥을 주웠다!`, `Picked up ${it.n} nyang!`), COL.gold); sfx('pick'); }, 0.12); }
      else {
        addItem(it.id); this.found.items[it.id] = (this.found.items[it.id] || 0) + 1;
        const d = ITEMS[it.id] || QITEMS[it.id];
        this.step(() => { this.msg(tr(`${d.name}을(를) 주웠다!`, `Picked up ${d.name}!`), it.quest ? COL.red : COL.green); sfx('pick'); if (it.quest) jingle('fanfa4'); }, 0.12);
      }
    }
    if (this.stairs && p.x === this.stairs[0] && p.y === this.stairs[1]) this.pendingStairs = true;
    if (this.altar && !this.lit && p.x === this.altar[0] && p.y === this.altar[1]) this.pendingFlute = true;
  }
  talkNpc(o) {
    const r = o.rescue;
    const name = DEX.species[o.mon.sp].name;
    say([{ who: o.mon.sp, name, text: tr('흑흑… 무서웠어… 구하러 와 준 거야?', '*sniff* I was so scared... Did you come to rescue me?') }, { who: S.party[1].sp, shiny: true, name: S.party[1].name, text: tr('이제 괜찮아! 마을까지 바래다줄게.', 'You\'re safe now! We\'ll get you back to town.') }], () => {
      S.flags['rescued_' + r.id] = true;
      o.alive = false; o.shown = false;
      sfx('warp'); toast(tr(`${name}을(를) 구출했다! 마을로 먼저 보냈다.`, `Rescued ${name}! Sent ahead to town.`), COL.blue);
    });
  }

  // choose a move's targets: the team's single-target moves turn to the nearest foe within SURE_REACH tiles in any
  // direction (useSkill makes those sure hits); otherwise a move goes where its user faces, a physical one to the front
  // tile and the rest along a line as far as their user reaches (reachOf)
  skillTargets(att, mvId) {
    const mv = DEX.moves[mvId];
    const foeTeam = att.team === 'foe' ? 'ally' : 'foe';
    if (mv.cat === 2 && [16, 1024].includes(mv.target)) return [att];
    if (mv.target === 4 || mv.target === 8) {
      return DIRS8.map(([dx, dy]) => this.entAt(att.x + dx, att.y + dy)).filter((e) => e && e.team === foeTeam && this.canStep(att.x, att.y, e.x - att.x, e.y - att.y));
    }
    const near = att.team === 'ally' && this.nearFoe(att);
    if (near) { att.face = [Math.sign(near.x - att.x), Math.sign(near.y - att.y)]; return [near]; }
    const [dx, dy] = att.face;
    if (mv.cat === 0) { const t = this.entAt(att.x + dx, att.y + dy); return t && t.team === foeTeam && this.canStep(att.x, att.y, dx, dy) ? [t] : []; }
    let x = att.x, y = att.y;
    for (let i = 0; i < reachOf(att); i++) {
      if (!this.canStep(x, y, dx, dy)) break;
      x += dx; y += dy;
      const t = this.entAt(x, y);
      if (t) return t.team === foeTeam ? [t] : [];
    }
    return [];
  }
  // the nearest foe within SURE_REACH tiles that a path of single steps reaches (walls in between hide it); ties go
  // to the one in front
  nearFoe(att) {
    let best = null, score = Infinity;
    for (const e of this.ents) {
      if (!e.alive || e.team !== 'foe' || e.hidden) continue;
      const dx = e.x - att.x, dy = e.y - att.y, d = Math.max(Math.abs(dx), Math.abs(dy));
      const s = d * 2 + (Math.sign(dx) === att.face[0] && Math.sign(dy) === att.face[1] ? 0 : 1);
      if (d <= SURE_REACH && s < score && this.pathTo(att, e)) { best = e; score = s; }
    }
    return best;
  }
  pathTo(a, b) {
    let x = a.x, y = a.y;
    while (x !== b.x || y !== b.y) {
      const dx = Math.sign(b.x - x), dy = Math.sign(b.y - y);
      if (!this.canStep(x, y, dx, dy)) return false;
      x += dx; y += dy;
    }
    return true;
  }
  useSkill(att, k) {
    const mvs = att.mon.moves[k];
    const mv = DEX.moves[mvs.id];
    mvs.pp--;
    const targets = this.skillTargets(att, mvs.id), t0 = targets[0];
    const dist = t0 && t0 !== att ? Math.max(Math.abs(t0.x - att.x), Math.abs(t0.y - att.y)) : 0;
    const ranged = (mv.cat !== 0 || dist > 1) && !(mv.target === 4 || mv.target === 8) && t0 !== att;
    // the beam flies to its target (a sure hit may stand off the eight lines), or its full reach when it finds no one
    const beam = dist ? { dir: [(t0.x - att.x) / dist, (t0.y - att.y) / dist], len: dist } : { dir: att.face, len: reachOf(att) };
    this.step(() => { att.atkT = G.time; this.msg(tr(`${att.mon.name}의 ${mv.name}!`, `${att.mon.name} used ${mv.name}!`), COL.blue); this.flash = { e: att, t: 0.2, color: TYPE_COLORS[mv.type] }; if (ranged) this.beam = { from: att, ...beam, t: 0.25, color: TYPE_COLORS[mv.type] }; sfx(mv.cat === 2 ? 'buff' : 'confirm'); }, 0.2);
    if (!targets.length) { this.step(() => this.msg(tr('그러나 아무도 맞지 않았다…', 'But it hit nobody...')), 0.12); return; }
    for (const t of targets) this.resolve(att, t, mvs.id, att.team === 'ally' && t !== att && Math.max(Math.abs(t.x - att.x), Math.abs(t.y - att.y)) <= SURE_REACH);
  }
  attack(att, def, mvId) {
    const name = mvId === 'basic' ? tr('공격', 'Attack') : DEX.moves[mvId].name;
    this.step(() => { att.lunge = 0.18; att.atkT = G.time; if (mvId === 'basic') this.msg(tr(`${att.mon.name}의 ${name}!`, `${att.mon.name} attacks!`)); }, 0.12);
    this.resolve(att, def, mvId);
  }
  resolve(att, def, mvId, sure) {
    const r = useMove(att.mon, def.mon, mvId, sure);
    const A = att.mon, D = def.mon;
    if (r.heal != null) {
      const h = Math.min(A.maxhp - A.hp, r.heal); A.hp += h;
      if (r.selfStatus && !statusProof(A, r.selfStatus)) { A.status = 'slp'; att.sleepT = 2; }
      this.step(() => { this.pop(att, `+${h}`, COL.green); this.msg(tr(`${A.name}의 HP가 ${h} 회복되었다!`, `${A.name} recovered ${h} HP!`), COL.green); sfx('heal'); }, 0.25);
      return;
    }
    if (r.miss) { this.step(() => { this.pop(def, tr('빗나감', 'Miss'), '#ddd'); this.msg(tr(`${D.name}에게는 맞지 않았다!`, `It missed ${D.name}!`)); sfx('miss'); }, 0.22); return; }
    if (r.stat && r.dmg == null) {
      const who = r.stat.target === 'self' ? att : def;
      const m = who.mon;
      const cur = m.stages[r.stat.k] || 0, nv = clamp(cur + r.stat.d, -6, 6);
      m.stages[r.stat.k] = nv;
      this.step(() => { this.msg(nv === cur ? tr(`${m.name}의 ${STAT_NAME[r.stat.k]}은(는) 더 이상 변하지 않는다!`, `${m.name}'s ${STAT_NAME[r.stat.k]} won't go any further!`) : tr(`${m.name}의 ${STAT_NAME[r.stat.k]}이(가) ${r.stat.d > 0 ? '올라갔다' : '떨어졌다'}!`, `${m.name}'s ${STAT_NAME[r.stat.k]} ${r.stat.d > 0 ? 'rose' : 'fell'}!`), r.stat.d > 0 ? COL.green : COL.red); sfx('buff'); }, 0.22);
      return;
    }
    if (r.status && statusProof(D, r.status)) {
      if (r.dmg == null) { this.step(() => this.msg(tr(`${D.name}에게는 통하지 않는다!`, `It doesn't affect ${D.name}!`)), 0.2); return; }
      r.status = null;
    }
    if (r.status && r.dmg == null) {
      D.status = r.status; if (r.status === 'slp') def.sleepT = randInt(2, 4);
      this.step(() => this.msg(tr(`${D.name}은(는) ${STATUS_NAME[r.status]} 상태가 되었다!`, `${D.name} is ${STATUS_NAME[r.status]}!`), COL.red), 0.22);
      return;
    }
    if (r.dmg == null) { this.step(() => this.msg(tr('그러나 아무 일도 일어나지 않았다.', 'But nothing happened.')), 0.15); return; }
    if (def.stagger > 0 && r.dmg > 0) { r.dmg = Math.round(r.dmg * 1.5); r.gap = true; }
    if (r.dmg > 0 && att.team === 'foe' && def.team === 'ally') r.dmg = Math.max(1, Math.round(r.dmg * mode().dmg)); // difficulty
    // a boss's ordinary hit is capped so the telegraphed blasts stay the real threat (dodging is the skill check)
    if (att.isBoss && def.team === 'ally') r.dmg = Math.min(r.dmg, Math.ceil(D.maxhp * (att.cap ?? att.def.cap ?? 0.3)));
    // phased bosses can't be burst past a phase: HP stops at the next threshold until the phase change happens
    const fl = this.phaseFloor(def);
    if (fl && D.hp - r.dmg < fl) { r.dmg = Math.max(0, D.hp - fl); r.shield = true; }
    if (r.shield && !r.dmg) { this.step(() => { this.pop(def, tr('막음', 'Block'), '#ffe9a8'); this.msg(tr(`빛의 장막이 ${D.name}을(를) 감싸 공격을 막았다!`, `A veil of light around ${D.name} blocked the attack!`), COL.blue); sfx('weak'); }, 0.2); return; }
    // wild foes hit softer early in the journey and harder at the end
    // (a boss's summoned minions stay soft so the telegraphed blasts remain the real test)
    // regular foes hit softer than their stats say: x0.45 in the first era up to x0.9 at the end (bosses keep their own numbers)
    if (att.team === 'foe' && !att.isBoss && r.dmg > 0) r.dmg = Math.max(1, Math.round(r.dmg * (att.summoned ? 0.45 : 0.45 + curve() * 0.45)));
    D.hp = Math.max(0, D.hp - r.dmg);
    const effTxt = r.eff === 0 ? tr('효과가 없는 것 같다…', 'It had no effect...') : r.eff >= 2 ? tr('효과가 굉장했다!', 'It\'s super effective!') : r.eff < 1 ? tr('효과가 별로인 듯하다…', 'It\'s not very effective...') : '';
    this.step(() => {
      def.hurt = 0.3; this.pop(def, String(r.dmg), r.eff >= 2 ? '#ffd23a' : '#fff');
      sfx(r.eff >= 2 ? 'super' : r.eff < 1 ? 'weak' : 'hit');
      this.msg(tr(`${D.name}에게 ${r.dmg} 데미지!${r.gap ? ' 빈틈을 찔렀다!' : ''}${r.crit ? ' 급소에 맞았다!' : ''}`, `${D.name} took ${r.dmg} damage!${r.gap ? ' Opening hit!' : ''}${r.crit ? ' A critical hit!' : ''}`), def.team === 'ally' ? COL.red : r.gap ? COL.green : COL.ink);
      if (effTxt) this.msg(effTxt);
    }, 0.26);
    if (r.drain && A.hp > 0) { const h = Math.min(A.maxhp - A.hp, r.drain); A.hp += h; this.step(() => this.pop(att, `+${h}`, COL.green), 0.1); }
    if (r.recoil) { A.hp = Math.max(0, A.hp - r.recoil); this.step(() => this.msg(tr(`${A.name}은(는) 반동을 받았다!`, `${A.name} is hit by recoil!`)), 0.1); }
    if (D.hp > 0 && r.status) { D.status = r.status; if (r.status === 'slp') def.sleepT = 3; this.step(() => this.msg(tr(`${D.name}은(는) ${STATUS_NAME[r.status]} 상태가 되었다!`, `${D.name} is ${STATUS_NAME[r.status]}!`), COL.red), 0.15); }
    if (D.hp > 0 && r.stat) { D.stages[r.stat.k] = clamp((D.stages[r.stat.k] || 0) + r.stat.d, -6, 6); this.step(() => this.msg(tr(`${D.name}의 ${STAT_NAME[r.stat.k]}이(가) 떨어졌다!`, `${D.name}'s ${STAT_NAME[r.stat.k]} fell!`)), 0.12); }
    if (D.hp <= 0) this.faint(def, att);
    if (A.hp <= 0) this.faint(att, def);
  }
  faint(e, by) {
    if (!e.alive) return;
    const revs = e.isBoss ? [].concat(e.def.revive || []) : [];
    if ((e.revives || 0) < revs.length) return this.reviveBoss(e, revs[e.revives || 0]);
    e.alive = false;
    this.step(() => { this.msg(tr(`${e.mon.name}은(는) 쓰러졌다!`, `${e.mon.name} fainted!`), e.team === 'ally' ? COL.red : COL.ink2); sfx('faint'); e.fade = 1; }, 0.35);
    if (e.team === 'foe') {
      S.kills[e.mon.sp] = (S.kills[e.mon.sp] || 0) + 1;
      // catch-up: a team far above the foe's level learns little from it, a team below learns more
      const avg = S.party.reduce((s, m) => s + m.lv, 0) / S.party.length;
      const xp = Math.max(1, Math.round(expGain(e.mon) * (e.shiny ? 2 : 1) * clamp(1 + (e.mon.lv - avg) * 0.1, 0.25, 1.3)));
      const allies = this.ents.filter((a) => a.team === 'ally' && a.alive && !a.army);
      // every foe drops coins: more for higher levels, shinies triple, bosses ten times; summoned minions drop none
      const coin = e.summoned ? 0 : Math.round((4 + e.mon.lv * 0.9) * (e.shiny ? 3 : 1) * (e.isBoss ? 10 : 1));
      S.money += coin; this.found.money += coin;
      this.step(() => { this.msg(coin ? tr(`경험치 ${xp} · 엽전 ${coin}냥을 얻었다.`, `Gained ${xp} Exp. Points and ${coin} nyang.`) : tr(`경험치 ${xp}을(를) 얻었다.`, `Gained ${xp} Exp. Points.`), COL.green); (async () => { for (const a of allies) await gainExpFor(a.mon, xp, (t, c) => this.msg(t, c)); })(); shareExp(xp); }, 0.15); // one ally at a time: a move question or an evolution ends before the next begins
      if (e.isBoss) this.step(() => this.bossDefeated(e), 0.4);
      else if (this.def.battle && !this.ents.some((f) => f.team === 'foe' && f.alive)) this.step(() => this.cleared(), 0.4);
      else if (!e.summoned && !e.noJoin && (LEGENDS.has(e.mon.sp) || Math.random() < (e.shiny ? 0.7 : RECRUIT_RATE))) this.step(() => this.offerRecruit(e.mon), 0.1);
    } else if (e.army) this.step(() => this.msg(tr(`아군 ${e.mon.name}이(가) 쓰러졌다…`, `Allied ${e.mon.name} is down...`), COL.red), 0.2);
    else if (!this.ents.some((a) => a.team === 'ally' && a.alive && !a.army)) this.step(() => this.failed(), 0.5); // the whole team is down
    else if (e.isPlayer) this.step(() => this.takeOver(), 0.3);
    else this.step(() => this.msg(tr(`${e.mon.name}이(가) 쓰러졌다… 남은 동료와 함께 나아가자.`, `${e.mon.name} is down... Press on with the rest of the team.`), COL.red), 0.2);
  }
  turnEffects() {
    for (const e of this.ents) {
      if (!e.alive) continue;
      const m = e.mon;
      if (m.status === 'psn' || m.status === 'brn') {
        const d = Math.max(1, Math.floor(m.maxhp / (m.status === 'psn' ? 64 : 16))); m.hp = Math.max(this.phaseFloor(e), m.hp - d); // poison bites a quarter as hard as a burn
        this.step(() => { this.pop(e, String(d), '#c07ad0'); }, 0.08);
        if (m.hp <= 0) this.faint(e);
      }
      // natural recovery: every turn early in the journey, every third turn at the end
      const every = 1 + Math.round(curve() * 2);
      if (e.team === 'ally' && this.turnNo % every === 0 && m.hp > 0 && m.hp < m.maxhp && !m.status) m.hp = Math.min(m.maxhp, m.hp + Math.max(1, Math.floor(m.maxhp / (26 + curve() * 14))));
    }
    if (!this.bossFloor && this.turnNo % Math.round(60 - curve() * 35) === 0 && this.ents.filter((e) => e.alive && e.team === 'foe').length < 3 + Math.round(curve() * 4)) {
      const far = this.rooms.filter((r) => this.roomOf[this.player.y][this.player.x] !== this.rooms.indexOf(r));
      if (far.length) { const r = choice(far); const x = randInt(r.x, r.x + r.w - 1), y = randInt(r.y, r.y + r.h - 1); if (!this.entAt(x, y)) this.spawnFoe([x, y]); }
    }
  }

  // ---------------------------------------------------------------- AI
  bfs(from, goalFn, maxD = 14) {
    const prev = new Map(); const k = (x, y) => y * W + x;
    const q = [[from.x, from.y]]; prev.set(k(from.x, from.y), null);
    while (q.length) {
      const [x, y] = q.shift();
      if (goalFn(x, y) && !(x === from.x && y === from.y)) {
        let cur = [x, y], p;
        while ((p = prev.get(k(...cur))) && !(p[0] === from.x && p[1] === from.y)) cur = p;
        return [cur[0] - from.x, cur[1] - from.y];
      }
      for (const [dx, dy] of DIRS8) {
        const nx = x + dx, ny = y + dy;
        if (prev.has(k(nx, ny)) || !this.canStep(x, y, dx, dy)) continue;
        if (Math.abs(nx - from.x) + Math.abs(ny - from.y) > maxD * 2) continue;
        const o = this.entAt(nx, ny);
        if (o && !goalFn(nx, ny)) continue;
        prev.set(k(nx, ny), [x, y]); q.push([nx, ny]);
      }
    }
    return null;
  }
  tryMove(e, dx, dy) {
    if (!this.canStep(e.x, e.y, dx, dy) || this.entAt(e.x + dx, e.y + dy)) return false;
    e.x += dx; e.y += dy; e.face = [dx, dy];
    return true;
  }
  pickSkill(e, target) {
    const opts = [];
    e.mon.moves.forEach((mv, k) => {
      if (mv.pp <= 0) return;
      const d = DEX.moves[mv.id];
      const saveFace = e.face;
      if (target) e.face = [Math.sign(target.x - e.x), Math.sign(target.y - e.y)];
      const ts = this.skillTargets(e, mv.id);
      e.face = saveFace;
      if (!ts.length) return;
      if (d.cat === 2) { if (ts[0] === e && (e.mon.stages[STATS_OF(d)] || 0) >= 2) return; opts.push({ k, score: 18 + Math.random() * 20 }); return; }
      const eff = typeMult(d.type, ts[0].mon.types) * (e.mon.types.includes(d.type) ? 1.5 : 1);
      opts.push({ k, score: d.power * eff * (0.75 + Math.random() * 0.5) });
    });
    opts.sort((a, b) => b.score - a.score);
    return opts[0];
  }
  inLine(e, t) {
    const dx = t.x - e.x, dy = t.y - e.y;
    if (!(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) return false;
    const n = Math.max(Math.abs(dx), Math.abs(dy));
    if (n > reachOf(e)) return false;
    const sx = Math.sign(dx), sy = Math.sign(dy);
    let x = e.x, y = e.y;
    for (let i = 0; i < n - 1; i++) { if (!this.canStep(x, y, sx, sy)) return false; x += sx; y += sy; if (this.entAt(x, y)) return false; }
    return this.canStep(x, y, sx, sy);
  }
  actWith(e, target) {
    const d = Math.max(Math.abs(target.x - e.x), Math.abs(target.y - e.y));
    const adj = d === 1 && this.canStep(e.x, e.y, target.x - e.x, target.y - e.y);
    const sure = e.team === 'ally' && d <= SURE_REACH && this.pathTo(e, target); // the team's moves turn to it (skillTargets)
    if (adj || sure || this.inLine(e, target)) {
      e.face = [Math.sign(target.x - e.x), Math.sign(target.y - e.y)];
      const s = Math.random() < 0.8 ? this.pickSkill(e, target) : null;
      if (s) { this.useSkill(e, s.k); return true; }
      if (adj) { this.attack(e, target, 'basic'); return true; }
    }
    return false;
  }
  foeAI(e) {
    const m = e.mon;
    if (e.waiting) { // a boss waiting in its hall (Arceus): it wakes, and speaks, once one of the team comes near
      if (this.ents.some((a) => a.alive && a.team === 'ally' && Math.max(Math.abs(a.x - e.x), Math.abs(a.y - e.y)) <= e.waiting)) { e.waiting = 0; this.bossIntro = true; }
      return;
    }
    if (e.isBoss && (this.bossTurn(e) || e.hidden)) return; // gone into the dark, it only comes out of a shadow
    if (m.status === 'slp' || m.status === 'frz' || (m.status === 'par' && Math.random() < 0.25)) return this.statusSkip(e);
    const allies = this.ents.filter((a) => a.alive && a.team === 'ally');
    const near = allies.map((a) => ({ a, d: Math.max(Math.abs(a.x - e.x), Math.abs(a.y - e.y)) })).sort((p, q) => p.d - q.d)[0];
    if (!near) return;
    const sameRoom = this.roomOf[e.y][e.x] >= 0 && this.roomOf[e.y][e.x] === this.roomOf[near.a.y][near.a.x];
    if (near.d <= 4 + Math.round(curve() * 4) || (sameRoom && (e.alert || Math.random() < 0.5 + curve() / 2)) || e.isBoss) {
      e.alert = true;
      if (this.actWith(e, near.a)) return;
      const step = this.bfs(e, (x, y) => allies.some((a) => Math.max(Math.abs(a.x - x), Math.abs(a.y - y)) <= 1 && !this.entAt(x, y)), 12);
      if (step) { const fx = e.x, fy = e.y; if (this.tryMove(e, ...step)) this.moveAnim(e, fx, fy); }
    } else if (Math.random() < 0.6) {
      const [dx, dy] = e.wdir && Math.random() < 0.8 ? e.wdir : choice(DIRS8);
      e.wdir = [dx, dy];
      const fx = e.x, fy = e.y;
      if (this.tryMove(e, dx, dy)) this.moveAnim(e, fx, fy); else e.wdir = null;
    }
  }
  danger(x, y) { return this.bosses.some((b) => b.alive && b.tele?.tiles.has(y * W + x)); }
  // Teammates: out of a telegraphed blast first; then they fight what is near the team (a foe beside them, in line or
  // within sure reach) and close in on a foe only while both stay within LEASH tiles of the one in control; otherwise
  // they follow it (follow). In a town battle everyone on our side fights on their own: teammates and troops alike go
  // after the nearest foe anywhere on the field and never trail the leader.
  allyAI(e) {
    const m = e.mon;
    if (m.status === 'slp' || m.status === 'frz' || (m.status === 'par' && Math.random() < 0.25)) return this.statusSkip(e);
    const go = (step) => { const fx = e.x, fy = e.y; if (step && this.tryMove(e, ...step)) { this.moveAnim(e, fx, fy); return true; } return false; };
    if (this.danger(e.x, e.y) && go(this.bfs(e, (x, y) => !this.danger(x, y) && !this.entAt(x, y), 6))) return;
    const p = this.player, near = (a, x, y) => Math.max(Math.abs(a.x - x), Math.abs(a.y - y)), free = !!this.def.battle;
    const foes = this.ents.filter((f) => f.alive && f.team === 'foe' && !f.hidden && this.vis[f.y][f.x]);
    const closest = foes.map((f) => ({ f, d: near(e, f.x, f.y) })).sort((a, b) => a.d - b.d)[0];
    if (closest && (free || closest.d <= LINE_REACH)) {
      if (this.actWith(e, closest.f)) return;
      const held = (x, y) => free || near(p, x, y) <= LEASH; // a teammate keeps to the leader
      if (held(e.x, e.y) && go(this.bfs(e, (x, y) => held(x, y) && foes.some((f) => held(f.x, f.y) && near(f, x, y) <= 1) && !this.entAt(x, y) && !this.danger(x, y), free ? 40 : 8))) return;
    }
    if (!free) this.follow(e);
  }
  // Following: to a free tile beside the leader or, where that can't be reached (a corridor), beside a teammate nearer
  // the leader than itself, so the team walks in a line; one already right behind such a teammate stays put. A
  // teammate left out of sight more than four tiles away for three turns running catches up beside the leader.
  follow(e) {
    const p = this.player, near = (a, x, y) => Math.max(Math.abs(a.x - x), Math.abs(a.y - y)), d = near(e, p.x, p.y);
    if (d <= 1) { e.lost = 0; return; }
    const ahead = this.mates.filter((a) => a !== e && a.alive && near(a, p.x, p.y) < d);
    if (!ahead.some((a) => near(a, e.x, e.y) <= 1 && near(a, p.x, p.y) <= 1)) {
      const to = [p, ...ahead], fx = e.x, fy = e.y;
      const step = this.bfs(e, (x, y) => !this.entAt(x, y) && !this.danger(x, y) && to.some((a) => near(a, x, y) <= 1), 24);
      if (step && this.tryMove(e, ...step)) this.moveAnim(e, fx, fy);
    }
    e.lost = !this.vis[e.y][e.x] && near(e, p.x, p.y) > 4 ? (e.lost || 0) + 1 : 0;
    if (e.lost >= 3) {
      const [x, y] = this.freeNear(p.x, p.y);
      if (!this.entAt(x, y)) { e.x = e.vx = x; e.y = e.vy = y; e.lost = 0; }
    }
  }

  // ---------------------------------------------------------------- boss patterns
  teleConf(e) { const t = e.teleSet; return Array.isArray(t) ? t[e.bphase - 1] : t; }
  // lowest HP a boss can drop to for now: a phased boss stops at its next phase's mark until that phase starts (so
  // bossPhase fires), and any boss at its next signature move's mark until the move has gone off (sigTurn)
  phaseFloor(e) {
    if (!e.isBoss) return 0;
    const next = Array.isArray(e.teleSet) && e.teleSet[e.bphase], sig = e.sig?.at[0];
    return Math.max(next ? Math.floor(e.mon.maxhp * next.at) : 0, sig ? Math.floor(e.mon.maxhp * sig) : 0);
  }
  // returns true when the boss spent its turn on its pattern logic
  bossTurn(e) {
    const m = e.mon;
    if (!e.teleSet) return false;
    (e.hpLog ||= []).push([G.time, m.hp]); // what Roar of Time turns back to
    while (e.hpLog.length > 2 && e.hpLog[1][0] < G.time - 30) e.hpLog.shift();
    if (this.bossPhase(e)) return true;
    if (e.sigRun) return this.sigStep(e); // a signature move under way takes the whole turn
    if (m.slowT > 0) { m.slowT--; if (!m.slowT) this.step(() => { this.msg(tr(`${m.name}이(가) 본래의 힘을 되찾았다!`, `${m.name} regained its true power!`), COL.red); this.shake = 0.3; }, 0.3); }
    if (e.tele) {
      e.tele.turns--;
      if (e.tele.turns <= 0) { this.unleash(e); return true; }
      const left = e.tele.turns; // read now: the blast may be gone by the time this line shows
      this.step(() => this.msg(tr(`${m.name}이(가) 힘을 모으고 있다… (${left}턴 뒤)`, `${m.name} is gathering power... (${left} turns)`), COL.red), 0.15);
      return !e.def.relentless; // relentless bosses keep fighting while the blast charges
    }
    // a pair takes turns with its big attacks: one blast or signature move on the field at a time
    const other = this.bosses.some((o) => o !== e && o.alive && (o.tele || o.sigRun || o.hidden));
    if (!other && this.sigTurn(e)) return true;
    if (e.stagger > 0) {
      e.stagger--;
      this.step(() => this.msg(tr(`${m.name}은(는) 지쳐서 숨을 고르고 있다!`, `${m.name} is worn out and catching its breath!`), COL.green), 0.15);
      return true;
    }
    if (--e.teleCD <= 0) {
      if (!other) { this.charge(e); return true; }
      e.teleCD = 1; // its partner's blast first
    }
    return false;
  }
  // Arceus-style phases: plate change, cadence change, minions
  bossPhase(e) {
    const tl = e.teleSet;
    if (!Array.isArray(tl)) return false;
    let ph = 1;
    tl.forEach((c, i) => { if (i && e.mon.hp / e.mon.maxhp <= c.at) ph = i + 1; });
    if (ph <= e.bphase) return false;
    e.bphase = ph;
    const c = tl[ph - 1];
    this.sigEnd(e);
    e.tele = null; e.stagger = 0; e.teleCD = 1;
    if (c.typeTo != null) e.mon.typeOverride = [c.typeTo];
    if (c.forme !== undefined) e.mon.forme = c.forme; // Deoxys changes Forme mid-fight (every Forme has the same HP)
    this.step(() => {
      this.shake = 0.6; sfx('super'); cry(e.mon.sp);
      this.msg(c.msg, COL.red);
      if (c.line) say(lines(c.line));
    }, 0.5);
    for (let i = 0; i < (c.summon || 0); i++) { // minions are weaker than the floor's regular foes
      const [x, y] = this.freeNear(e.x, e.y);
      if (this.entAt(x, y)) continue;
      const f = this.addEnt(new Mon(choice(c.summonSp || this.def.mons), Math.max(5, e.mon.lv - 22), { foe: true }), x, y, 'foe');
      f.summoned = true; f.alert = true;
      this.step(() => this.msg(tr(`${f.mon.name}이(가) 나타났다!`, `${f.mon.name} appeared!`), COL.red), 0.15);
    }
    return true;
  }
  patternTiles(name, e, allies) {
    const R = this.rooms[0], set = new Set();
    const p = (e.teleN || 0) % 2, q = [choice([-1, 1]), choice([-1, 1])];
    // a boss's blasts reach BOSS_REACH tiles; Judgment's orbs (orbs) fall anywhere in the arena
    const add = (x, y, any) => { if (x >= R.x && y >= R.y && x < R.x + R.w && y < R.y + R.h && !(x === e.x && y === e.y) && (any || Math.max(Math.abs(x - e.x), Math.abs(y - e.y)) <= BOSS_REACH)) set.add(y * W + x); };
    for (const part of name.split('|')) {
      const P = PATTERNS[part];
      for (let y = R.y; y < R.y + R.h; y++) for (let x = R.x; x < R.x + R.w; x++) {
        const dx = x - e.x, dy = y - e.y;
        if (P.hit(dx, dy, Math.max(Math.abs(dx), Math.abs(dy)), x, y, p, q)) add(x, y);
      }
      if (part === 'target') for (const a of allies) for (const [ox, oy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) add(a.x + ox, a.y + oy);
      if (part === 'orbs') { // round blasts of light raining on random spots of the field (its floor, not its walls)
        set.orbs = [];
        for (let k = 0, tries = 0; k < 6 + Math.floor(R.w * R.h / 80) && tries < 400; tries++) {
          const cx = randInt(R.x, R.x + R.w - 1), cy = randInt(R.y, R.y + R.h - 1);
          if (!this.walk(cx, cy)) continue;
          k++;
          set.orbs.push([cx, cy]);
          for (const [ox, oy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) add(cx + ox, cy + oy, true);
        }
      }
    }
    return set;
  }
  escapeSteps(a, tiles) {
    if (!tiles.has(a.y * W + a.x)) return 0;
    const R = this.rooms[0];
    let best = 99;
    for (let y = R.y; y < R.y + R.h; y++) for (let x = R.x; x < R.x + R.w; x++) {
      if (this.walk(x, y) && !tiles.has(y * W + x) && !this.bosses.some((b) => b.alive && b.x === x && b.y === y)) best = Math.min(best, Math.max(Math.abs(x - a.x), Math.abs(y - a.y)));
    }
    return best;
  }
  charge(e) {
    // a telegraph with a `mix` takes turns among several attacks (Giratina), each with its own name, type, shapes and power
    const P = this.teleConf(e), T = P.mix ? { ...P, ...P.mix[(e.mixN = (e.mixN ?? -1) + 1) % P.mix.length] } : P;
    const allies = this.ents.filter((a) => a.alive && a.team === 'ally');
    let pick = null;
    for (const name of shuffle(T.pats.slice())) {
      const tiles = this.patternTiles(name, e, allies);
      const delay = Math.max(...name.split('|').map((n) => PATTERNS[n].delay));
      if (tiles.size && allies.every((a) => this.escapeSteps(a, tiles) <= delay)) { pick = { tiles, delay, name }; break; }
    }
    if (!pick) pick = { tiles: this.patternTiles('target', e, allies), delay: 1, name: 'target' };
    const nm = T.orbName && pick.name.includes('orbs') ? T.orbName : T.name; // Judgment's orbs go by its own name
    e.teleN = (e.teleN || 0) + 1;
    e.teleCD += T.every / (e.def.pace || 1); // a paced boss (the finale's guardians) charges more often; a fraction carries over
    e.tele = { tiles: pick.tiles, turns: pick.delay, name: nm, dmg: T.dmg * e.tier.blast, color: TYPE_COLORS[T.type ?? e.mon.types[0]], orbs: pick.tiles.orbs };
    e.face = [0, 1];
    this.step(() => { this.msg(tr(`${e.mon.name}의 ${nm}! 붉은 칸에서 벗어나라!`, `${e.mon.name}'s ${nm}! Get off the red tiles!`), COL.red); sfx('buff'); this.shake = 0.15; }, 0.3);
  }
  unleash(e) {
    const t = e.tele;
    e.tele = null;
    if (t.fx === 'shadow') this.emerge(e, t.at);
    this.step(() => { this.blast = { tiles: t.tiles, t: 0.45, color: t.fx && t.color, orbs: t.orbs }; this.shake = 0.4; sfx('super'); this.msg(tr(`${t.name}이(가) 쏟아졌다!`, `${t.name} came crashing down!`), COL.red); }, 0.4);
    if (!this.strike(e, t).length) this.step(() => this.msg(tr('모두 피했다! 지금이 기회다!', 'Everyone dodged! Now\'s the chance!'), COL.green), 0.2);
    e.stagger = this.teleConf(e).stagger ?? e.tier.stagger;
    this.step(() => this.msg(tr(`${e.mon.name}에게 빈틈이 생겼다! 지금 공격하면 1.5배!`, `${e.mon.name} left an opening! Attacks deal 1.5x now!`), COL.green), 0.15);
  }
  // a blast lands: everyone of the team on its tiles loses its share of their max HP (Dark Void also puts them to sleep)
  strike(e, t) {
    const hits = this.ents.filter((a) => a.alive && a.team === 'ally' && t.tiles.has(a.y * W + a.x));
    for (const a of hits) {
      const d = Math.max(1, Math.round(a.mon.maxhp * t.dmg * mode().dmg));
      a.mon.hp = Math.max(0, a.mon.hp - d);
      const sleep = t.sleep && a.mon.hp > 0 && !a.mon.status;
      if (sleep) { a.mon.status = 'slp'; a.sleepT = 2; }
      this.step(() => {
        a.hurt = 0.4; this.pop(a, String(d), '#ff6a4a'); sfx('hit');
        this.msg(tr(`${a.mon.name}은(는) ${t.name}에 휘말렸다! ${d} 데미지!`, `${a.mon.name} was caught in ${t.name}! ${d} damage!`), COL.red);
        if (sleep) this.msg(tr(`${a.mon.name}은(는) 깊은 잠에 빠졌다!`, `${a.mon.name} fell into a deep sleep!`), COL.red);
      }, 0.2);
      if (a.mon.hp <= 0) this.faint(a, e);
    }
    return hits;
  }
  moveAnim(e, fx, fy) { e.ax = fx; e.ay = fy; }

  // ---------------------------------------------------------------- signature moves
  // A legend's own moves (content_k.js SIG): each form plans HP marks (sigPlan); when the boss's HP has passed the next
  // one, the move goes off on its turn (sigTurn), the boss's moves taking turns. Most are a blast of their own shape,
  // telegraphed for a turn and landing like any other (unleash); Roar of Time charges for a turn and Hyper Beam turns a
  // full circle (sigStep).
  // A paced boss (pace > 1, the finale's guardians) uses them more often: half as many marks again (at least one
  // more), spread evenly over the same stretch of its bar.
  sigPlan(s, pace = 1) {
    if (!s) return null;
    let at = (Array.isArray(s.at[0]) ? choice(s.at) : s.at).slice();
    if (pace > 1) {
      const n = at.length + Math.max(1, Math.floor(at.length * (pace - 1)));
      const hi = Math.min(0.9, at[0] + 0.1), lo = Math.max(0.15, at[at.length - 1] - 0.1);
      at = Array.from({ length: n }, (_, i) => hi - (hi - lo) * i / (n - 1));
    }
    return { use: s.use, k: 0, at };
  }
  sigTurn(e) {
    const s = e.sig;
    if (!s?.at.length || e.mon.hp > e.mon.maxhp * s.at[0]) return false;
    s.at.shift();
    this.sigStart(e, s.use[s.k++ % s.use.length]);
    return true;
  }
  sigStart(e, sg) {
    const m = e.mon, team = this.ents.filter((a) => a.alive && a.team === 'ally');
    const tell = (ko, en) => this.step(() => { this.msg(tr(ko, en), COL.red); sfx('buff'); cry(m.sp); this.shake = 0.3; }, 0.45);
    const blast = (tiles, o = {}) => { e.tele = { tiles, turns: 1, name: sg.name, dmg: (sg.dmg || 0.3) * e.tier.blast, color: TYPE_COLORS[sg.type], fx: sg.kind, ...o }; e.teleN = (e.teleN || 0) + 1; };
    e.face = [0, 1];
    if (sg.kind === 'roar') {
      e.sigRun = { sg };
      return tell(`${m.name}이(가) ${sg.name}를 준비한다! 주위의 시간이 일그러진다… (다음 턴)`, `${m.name} is building up ${sg.name}! Time warps all around... (next turn)`);
    }
    if (sg.kind === 'sweep') {
      const k = Math.floor(Math.random() * 8);
      e.sigRun = { sg, k, left: 8 };
      blast(this.beamTiles(e, k), { beam: k });
      return tell(`${m.name}이(가) ${sg.name}을(를) 360도로 휘두른다! 다가오는 붉은 줄기를 피해라!`, `${m.name} swings ${sg.name} round a full circle! Keep clear of the red line as it comes!`);
    }
    if (sg.kind === 'shadow') { // gone into the dark; next turn it bursts out of the shadow of one of the team
      const t = choice(team.filter((a) => !a.army).concat(team.filter((a) => a.isPlayer)));
      if (!t) return;
      e.hidden = true;
      blast(this.sigTiles(e, (add) => { for (const [ox, oy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) add(t.x + ox, t.y + oy); }), { at: [t.x, t.y] });
      return tell(`${m.name}의 ${sg.name}! 어둠 속으로 사라졌다… ${t.mon.name}의 그림자가 술렁인다!`, `${m.name}'s ${sg.name}! It vanished into the dark... ${t.mon.name}'s shadow stirs!`);
    }
    if (sg.kind === 'rend') { // space tears: the arena closes in a ring, and long rifts open all over the floor
      const closed = this.rendArena();
      blast(this.escapable(team, () => this.sigTiles(e, (add, R) => {
        for (let n = 0; n < 6 + (e.revives || 0) * 2; n++) {
          const cx = randInt(R.x + 1, R.x + R.w - 2), cy = randInt(R.y + 1, R.y + R.h - 2), [dx, dy] = choice(DIRS8);
          for (let i = -3; i <= 3; i++) add(cx + dx * i, cy + dy * i);
        }
      })));
      return closed ? tell(`${m.name}의 ${sg.name}! 공간이 찢어지며 싸움터가 좁아졌다! 바닥에 벌어진 틈에서 벗어나라!`, `${m.name}'s ${sg.name}! Space tears and the arena closes in! Get away from the rifts in the floor!`)
        : tell(`${m.name}의 ${sg.name}! 바닥에 공간의 틈이 벌어졌다!`, `${m.name}'s ${sg.name}! Rifts in space open in the floor!`);
    }
    if (sg.kind === 'blades') { // fissures run out from it in four directions, stone blades about to burst along them
      blast(this.escapable(team, () => this.sigTiles(e, (add) => {
        for (const [dx, dy] of shuffle(DIRS8.slice()).slice(0, 4)) {
          let x = e.x, y = e.y;
          for (let i = 0; i < 12; i++) {
            x += dx; y += dy;
            if (Math.random() < 0.3) { if (dx) y += choice([-1, 1]); else x += choice([-1, 1]); }
            add(x, y); add(x + (dy ? 1 : 0), y + (dx ? 1 : 0));
          }
        }
      })));
      return tell(`${m.name}의 ${sg.name}! 땅이 갈라지며 바위 칼날이 솟아오르려 한다!`, `${m.name}'s ${sg.name}! The ground splits as stone blades rise!`);
    }
    if (sg.kind === 'pulse') { // waves in all eight directions, from the ring around it outward
      blast(this.sigTiles(e, (add) => { for (const [dx, dy] of DIRS8) for (let i = 2; i < 16; i++) add(e.x + dx * i, e.y + dy * i); }));
      return tell(`${m.name}의 ${sg.name}! 여덟 방향으로 파동이 퍼져 나간다!`, `${m.name}'s ${sg.name}! Waves spread out in eight directions!`);
    }
    if (sg.kind === 'void') { // black holes open under the team and here and there; whoever stays falls asleep
      blast(this.escapable(team, () => this.sigTiles(e, (add, R) => {
        const at = team.filter((a) => !a.army).map((a) => [a.x, a.y]);
        for (let k = 0; k < 3; k++) at.push([randInt(R.x, R.x + R.w - 1), randInt(R.y, R.y + R.h - 1)]);
        for (const [x, y] of at) for (const [ox, oy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) add(x + ox, y + oy);
      })), { sleep: true });
      return tell(`${m.name}의 ${sg.name}! 발밑에 검은 구멍이 열린다! 빠지면 잠들어 버린다!`, `${m.name}'s ${sg.name}! Black holes open underfoot! Fall in and you fall asleep!`);
    }
  }
  // a signature move's tiles: inside the arena (a town battle: within SIG_REACH of the boss), never the boss's own
  sigTiles(e, fill) {
    const R = this.rooms[0], set = new Set(), reach = this.arena ? 99 : SIG_REACH;
    fill((x, y) => { if (x >= R.x && y >= R.y && x < R.x + R.w && y < R.y + R.h && this.walk(x, y) && !(x === e.x && y === e.y) && Math.max(Math.abs(x - e.x), Math.abs(y - e.y)) <= reach) set.add(y * W + x); }, R);
    return set;
  }
  // a shape drawn again until every one of the team can step off it in one turn (it keeps the last try otherwise)
  escapable(team, make) {
    let tiles;
    for (let k = 0; k < 24; k++) { tiles = make(); if (team.every((a) => this.escapeSteps(a, tiles) <= 1)) break; }
    return tiles;
  }
  // Hyper Beam's band in direction k (DIRS8, clockwise from north): every tile whose middle lies within a tile of the
  // ray from the boss (three tiles across, a solid staircase on the diagonals), out to the arena's edge
  beamTiles(e, k) {
    const [dx, dy] = DIRS8[k], n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n;
    return this.sigTiles(e, (add, R) => {
      for (let y = R.y; y < R.y + R.h; y++) for (let x = R.x; x < R.x + R.w; x++) {
        const px = x - e.x, py = y - e.y, along = px * ux + py * uy;
        if (along > 0.5 && Math.abs(px * uy - py * ux) <= 1.01) add(x, y);
      }
    });
  }
  // the turns after a signature move began: Roar of Time goes off, Hyper Beam fires and turns a step
  sigStep(e) {
    const run = e.sigRun, sg = run.sg, m = e.mon;
    if (sg.kind === 'roar') {
      e.sigRun = null;
      // the HP it had sg.back seconds ago (the oldest kept if the fight is younger), when that was more
      const log = e.hpLog || [], then = log.filter(([t]) => t <= G.time - sg.back).pop() || log[0] || [G.time, m.hp];
      const heal = Math.max(0, Math.min(m.maxhp, then[1]) - m.hp);
      m.hp += heal;
      this.step(() => {
        this.timeFx = { t: 1, x: e.x, y: e.y }; this.shake = 0.7; sfx('warp'); cry(m.sp);
        this.msg(tr(`${m.name}의 ${sg.name}! 시간이 거꾸로 흐른다!`, `${m.name}'s ${sg.name}! Time flows backwards!`), COL.red);
        if (heal) { this.pop(e, `+${heal}`, COL.green); this.msg(tr(`${m.name}의 상처가 ${sg.back}초 전으로 되돌아갔다! (+${heal})`, `${m.name}'s wounds went back to ${sg.back} seconds ago! (+${heal})`), COL.red); }
      }, 0.7);
      const pct = Math.round(sg.cut * 100);
      for (const a of this.ents.filter((x) => x.alive && x.team === 'ally')) {
        const d = Math.max(1, Math.round(a.mon.maxhp * sg.cut));
        a.mon.hp = Math.max(0, a.mon.hp - d);
        this.step(() => { a.hurt = 0.4; this.pop(a, String(d), '#8ab4ff'); sfx('hit'); }, 0.08);
        if (a.mon.hp <= 0) this.faint(a, e);
      }
      this.step(() => this.msg(tr(`모두 최대 HP의 ${pct}%를 잃었다!`, `Everyone lost ${pct}% of their max HP!`), COL.red), 0.2);
      e.stagger = 1; // like the real move, it has to recharge
      this.step(() => this.msg(tr(`${m.name}은(는) 반동으로 움직일 수 없다! 지금 공격하면 1.5배!`, `${m.name} must recharge! Attacks deal 1.5x now!`), COL.green), 0.15);
      return true;
    }
    if (sg.kind === 'sweep') { // fire where it was aimed, then aim a step further clockwise; after a full circle, recharge
      const t = e.tele, k = run.k;
      this.step(() => { this.beamFx = { x: e.x, y: e.y, k, t: 0.35 }; this.blast = { tiles: t.tiles, t: 0.3, color: '#fff2a8' }; this.shake = 0.3; sfx('super'); }, 0.3);
      this.strike(e, t);
      if (--run.left > 0) { run.k = (run.k + 1) % 8; e.tele = { ...t, tiles: this.beamTiles(e, run.k), beam: run.k, turns: 1 }; return true; }
      e.tele = null; e.sigRun = null; e.stagger = 2;
      this.step(() => this.msg(tr(`${m.name}은(는) ${sg.name}의 반동으로 움직일 수 없다! 지금 공격하면 1.5배!`, `${m.name} must recharge after ${sg.name}! Attacks deal 1.5x now!`), COL.green), 0.2);
      return true;
    }
    e.sigRun = null;
    return false;
  }
  // a phase change or a second form cuts a signature move short (Shadow Force comes back out where it went in)
  sigEnd(e) {
    if (e.hidden) { e.hidden = false; e.reviveT = 0.6; }
    if (e.sigRun) { e.sigRun = null; e.tele = null; }
  }
  // Shadow Force: out of the shadow it hid in, beside the one it came for if that one still stands there
  emerge(e, [x, y]) {
    const [nx, ny] = this.entAt(x, y) || !this.walk(x, y) ? this.nearestOpen(x, y) : [x, y];
    e.x = e.vx = nx; e.y = e.vy = ny; e.hidden = false; e.reviveT = 0.6;
    e.face = [0, 1];
  }
  // Spacial Rend tears away the arena's outer ring (twice at most); whoever stood there is thrown inward
  rendArena() {
    const R = this.rooms[0];
    if (!this.arena || (this.rent?.n || 0) >= 2) return false;
    this.rent ||= { n: 0, tiles: new Set() };
    this.rent.n++;
    for (let y = R.y; y < R.y + R.h; y++) for (let x = R.x; x < R.x + R.w; x++) {
      if (x > R.x && x < R.x + R.w - 1 && y > R.y && y < R.y + R.h - 1) continue;
      this.grid[y][x] = 0; this.rent.tiles.add(y * W + x);
    }
    Object.assign(R, { x: R.x + 1, y: R.y + 1, w: R.w - 2, h: R.h - 2 });
    for (const a of this.ents) if (a.alive && !this.walk(a.x, a.y)) [a.x, a.y] = this.nearestOpen(a.x, a.y);
    return true;
  }

  // "second page": the boss gets back up with a share of its HP (2/3 by default), hits harder and switches to its own,
  // harsher telegraph phases; shiny turns it golden (Arceus), form renames it (Origin Forme). def.revive can be a list:
  // Arceus and Darkrai rise twice, the third phase also tougher (def).
  reviveBoss(e, r) {
    const m = e.mon;
    e.revived = true; e.revives = (e.revives || 0) + 1; e.rev = r;
    this.sigEnd(e);
    if (r.forme !== undefined) m.forme = r.forme; // Deoxys rises again in another Forme
    m.hpMul *= r.hp ?? 2 / 3; m.atkMul *= r.atk ?? 1.3; m.hp = m.maxhp;
    if (r.def) m.defMul = (m.defMul || 1) * r.def;
    m.status = null; m.stages = {}; m.slowT = 0; m.typeOverride = r.typeTo != null ? [r.typeTo] : null;
    if (r.shiny) e.shiny = m.shiny = true;
    if (r.form) Object.defineProperty(m, 'name', { configurable: true, get: () => `${m.data.name} (${r.form})` });
    if (r.cap) e.cap = r.cap;
    e.teleSet = r.tele; e.bphase = 1; e.tele = null; e.stagger = 0; e.teleCD = this.teleConf(e).first ?? 2;
    e.sig = this.sigPlan(r.sig, e.def.pace); e.hpLog = [];
    this.step(() => { this.shake = 0.9; e.reviveT = 1.2; sfx('super'); cry(m.sp); this.msg(r.msg, COL.red); if (r.bgm) playBgm(r.bgm, 0.2); }, 0.9);
    if (r.line) this.step(() => say(lines(r.line)), 0.1);
  }

  // ---------------------------------------------------------------- outcomes
  async bossDefeated(e) {
    const b = e.def, mid = b === this.def.mid, st = this.stage;
    e.tele = null;
    const left = this.bosses.find((o) => o.alive);
    if (left) return this.msg(tr(`${e.mon.name}이(가) 쓰러졌다! 남은 ${left.mon.name}에게 집중하자!`, `${e.mon.name} is down! Now for ${left.mon.name}!`), COL.green); // the other of a pair fights on
    if (this.stageDone) return; // both of a pair fell in the same turn
    this.stageDone = true;
    playBgm(b.tele ? 'win_poke' : 'win_gym', 0.3);
    await say(lines(b.after || []));
    if (mid) S.flags['mid_' + this.dId] = true;
    if (this.def.legend) S.flags['legend_' + this.dId] = true;
    if (b.wander) S.flags[`wander_${b.sp}_${S.era}`] = true; // met in this era; if it stays behind again, it moves on to the next
    if (st?.flag) S.flags[st.flag] = true;
    await this.prize();
    if (!b.noJoin) await this.offerRecruit(e.mon, b.join);
    const J = this.def.battle?.join; // a town battle won: the side's own legend asks to come along, with its orb
    const ally = J && this.army?.find((a) => a.mon.sp === J.sp);
    if (ally) {
      if (J.item && !S.items[J.item]) { addItem(J.item); this.msg(tr(`${ITEMS[J.item].name}을(를) 받았다!`, `Received the ${ITEMS[J.item].name}!`), COL.green); }
      ally.mon.hp = ally.mon.maxhp;
      await this.offerRecruit(ally.mon, J.text);
    }
    if (this.def.tower) this.towerFloor();
    if (!mid && (!st || this.floor >= this.floors)) return this.cleared();
    // a mid-boss, or a stage's boss before the last stage, opens the way on
    this.boss = null; this.bosses = [];
    this.stairs = [e.x, e.y];
    playBgm(st?.bgm || this.def.bgm, 0.6);
    this.msg(st ? tr('다음 층으로 가는 계단이 나타났다!', 'Stairs to the next floor have appeared!') : tr('안쪽으로 이어지는 계단이 나타났다!', 'Stairs leading deeper have appeared!'), COL.blue);
  }
  // a dungeon's prize for a set of stages (the finale's guardians: the Azure Flute), handed over once
  async prize() {
    const P = this.def.prize;
    if (!P || S.items[P.item] || !P.flags.every((f) => S.flags[f])) return;
    addItem(P.item); jingle('fanfa4');
    this.msg(tr(`${ITEMS[P.item].name}을(를) 손에 넣었다!`, `Got the ${ITEMS[P.item].name}!`), COL.green);
    await say(lines(P.say || []));
  }
  // the Boss Tower remembers the highest floor cleared (a later visit may start above it); clearing the top starts it over
  towerFloor() {
    if (this.floor < this.floors) S.flags.towerTop = Math.max(S.flags.towerTop || 0, this.floor);
    else { S.flags.towerTop = 0; S.flags.towerClears = (S.flags.towerClears || 0) + 1; }
  }
  // between the Boss Tower's floors the team is restored: each floor is a fight of its own
  restoreTeam() {
    for (const m of S.party) { m.heal(true); m.stages = {}; }
    this.msg(tr('탑의 기운이 모두의 HP와 PP를 되돌렸다!', 'The tower\'s power restores everyone\'s HP and PP!'), COL.green);
  }
  // The Spear Pillar's altar: the Azure Flute played there brings down a stairway of light to the Hall of Origin.
  playFlute() {
    if (!S.items[this.stage.flute.item]) return say([{ who: 'narr', text: tr('오래된 제단이다. 이곳에서 불 피리가 있다면…', 'An ancient altar. If only you had a flute to play here...') }]);
    say([{ who: 'narr', text: tr('창기둥 꼭대기의 제단이다. 천계의 피리를 불까?', 'The altar at the top of the Spear Pillar. Play the Azure Flute?'), choices: tr(['피리를 분다', '그만둔다'], ['Play it', 'Not yet']), onChoice: (i) => {
      if (i) return;
      this.lit = true; this.stairs = this.lightAt;
      this.lightFx = { t: 1.6 }; this.shake = 0.5; sfx('warp'); jingle('fanfa5');
      this.msg(tr('맑은 피리 소리가 하늘로 울려 퍼진다… 빛의 계단이 나타났다!', 'A clear note rings up into the sky... A stairway of light appears!'), COL.gold);
      say(lines(this.stage.flute.say || []));
    } }]);
  }
  // a defeated Pokémon may ask to join (always for bosses; RECRUIT_RATE for wild ones)
  offerRecruit(mon, text) {
    if (S.party.length >= 3 && S.roster.length >= ROSTER_MAX) return Promise.resolve();
    const name = DEX.species[mon.sp].name;
    if (challenge() && LEGENDS.has(mon.sp)) return new Promise((res) => say([{ who: 'narr', text: tr(`챌린지에서는 전설의 포켓몬을 동료로 맞을 수 없다. ${name}은(는) 조용히 모습을 감췄다.`, `Legendary Pokémon can't join a challenge. ${name} quietly vanished.`) }], res));
    return new Promise((res) => say([{ who: mon.sp, shiny: mon.shiny, name, text: text || tr(`쓰러졌던 ${name}이(가) 일어나 동료가 되고 싶은 듯 이쪽을 바라보고 있다!`, `${name} got back up and is looking at you. It seems to want to join you!`), choices: tr(['동료로 맞이한다', '보내 준다'], ['Welcome it aboard', 'Let it go']), cancel: false, onChoice: (i) => { // X mashed through battle text must not wave a recruit away
      if (i) return;
      const { m, where } = recruit(mon);
      if (where === 'full') return toast(tr('동료 명부가 가득 찼다.', 'The companion roster is full.'), COL.red);
      if (LEGENDS.has(mon.sp)) S.flags['got_' + mon.sp] = true; // a legend that joined never comes back as a missed one
      jingle('fanfa4');
      if (where === 'party' && !this.done) { const [x, y] = this.freeNear(this.player.x, this.player.y); this.mates.push(this.addEnt(m, x, y, 'ally')); }
      toast(where === 'party' ? tr(`${name}이(가) 동료가 되어 함께 간다!`, `${name} joined and travels with you!`) : tr(`${name}이(가) 동료가 되었다! (마을의 동료 명부로)`, `${name} joined! (waiting in the town roster)`), COL.blue);
    } }], res));
  }
  cleared() {
    if (this.done) return;
    this.done = true;
    G.pendingClear = this.dId;
    if (this.def.police) return this.result(tr('순사들을 혼쭐내 쫓아 버렸다!', 'You sent the constables packing!'), true); // their coins are the reward
    const bonus = Math.round((this.def.battle ? 4 : this.def.floors) * (40 + S.era * 15) / 10) * 10; // clear reward grows with depth and era
    S.money += bonus;
    if (this.def.tower) return this.result(tr(`보스 탑 꼭대기까지 올랐다! 완주 보상 ${bonus}냥`, `You reached the top of the Boss Tower! Reward: ${bonus} nyang`), true);
    this.result(this.def.battle ? tr(`전투에서 이겼다! 보상 ${bonus}냥`, `Victory! Reward: ${bonus} nyang`) : tr(`던전 클리어! 클리어 보상 ${bonus}냥`, `Dungeon cleared! Clear reward: ${bonus} nyang`), true);
  }
  failed() {
    if (this.done) return;
    this.done = true;
    const lost = Math.floor(S.money * (0.1 + curve() * 0.2)); // early defeats cost little
    S.money -= lost;
    S.party.forEach((m) => { m.hp = Math.max(1, Math.floor(m.maxhp / 2)); m.status = null; });
    const lostCh = !this.def.tower && loseChallenge() ? [tr('챌린지 실패… 모두 쓰러지고 말았다. 이 여행은 이제 보통 난이도로 이어진다.', 'Challenge failed... the whole team went down. The journey now continues at Normal.')] : [];
    this.result(tr(`모두 쓰러지고 말았다… 엽전 ${lost}냥을 잃었다.`, `The whole team fainted... and lost ${lost} nyang.`), false, lostCh);
  }
  // walking back out the way you came: only from the first floor, at no cost
  leave() {
    if (this.done || this.floor !== this.startFloor) return;
    this.done = true;
    sfx('stairs');
    this.result(tr('왔던 길로 되돌아 던전을 나왔다.', 'You walked back out the way you came.'), false);
  }
  escape() {
    if (this.done) return;
    this.done = true;
    sfx('warp');
    this.result(tr('탈출 부적의 힘으로 마을로 돌아왔다.', 'The Escape Charm carried you back to town.'), false);
  }
  result(title, ok, extra = []) {
    S.inRun = null;
    for (const m of [...S.party, ...(S.homeParty || [])]) { m.field = 0; m.primal = false; m.form = ''; m.typeOverride = null; }
    // a cleared dungeon gets everyone who fell back on their feet (before restoreCrew, so a naval crew's fallen too)
    const fallen = ok ? S.party.filter((m) => m.hp <= 0) : [];
    this.def.battle?.end?.(ok); // a fight in town tells the town how it went (Town.policeDef)
    const town = this.def.police; // a fight in town is no trip: no year goes by for the spy hunt, nor a night
    const tick = !town && spyTick(); // the 1920 spy hunt: every trip lets a year go by
    if (tick) extra = [...extra, tick];
    if (fallen.length) { fallen.forEach((m) => { m.hp = m.maxhp; m.status = null; }); extra = [tr(`쓰러졌던 ${fallen.map((m) => m.name).join(', ')}도 기운을 되찾았다!`, `${fallen.map((m) => m.name).join(', ')} got back on their feet!`), ...extra]; }
    this.restoreCrew();
    const items = Object.entries(this.found.items).map(([id, n]) => `${(ITEMS[id] || QITEMS[id]).name}×${n}`).join(', ');
    S.party.forEach((m) => m.restorePP()); // leaving a dungeon, however it ends, refills every move's PP
    const pp = town ? tr('싸움이 끝나고 숨을 고르니 기술의 PP와 상태 이상이 모두 회복되었다.', 'Catching your breath after the fight, every move\'s PP is restored and status problems are cured.')
      : tr('던전을 나오니 기술의 PP와 상태 이상이 모두 회복되었다.', 'Back outside, every move\'s PP is restored and status problems are cured.');
    say([{ who: 'narr', text: `${title}\n${tr(`얻은 엽전 ${this.found.money}냥`, `Coins earned: ${this.found.money} nyang`)}${items ? ' · ' + items : ''}\n${pp}` }, ...extra.map((text) => ({ who: 'narr', text }))], () => {
      S.party.forEach((m) => { m.stages = {}; if (m.hp <= 0) m.hp = 1; });
      if (!town) S.night = !S.night;
      if (ok) jingle('fanfa4');
      fadeTo(() => G.goTown());
    });
  }
  throwStone(dmg) {
    const p = this.player;
    this.endTurn(() => {
      let x = p.x, y = p.y, hit = null;
      for (let i = 0; i < 8; i++) { if (!this.canStep(x, y, ...p.face)) break; x += p.face[0]; y += p.face[1]; const t = this.entAt(x, y); if (t) { hit = t; break; } }
      this.step(() => { this.msg(tr(`${p.mon.name}은(는) 돌팔매를 던졌다!`, `${p.mon.name} threw a Sling Stone!`)); this.beam = { from: p, dir: p.face, t: 0.25, color: '#999' }; }, 0.2);
      if (hit && hit.team === 'foe') {
        hit.mon.hp = Math.max(this.phaseFloor(hit), hit.mon.hp - dmg);
        this.step(() => { hit.hurt = 0.3; this.pop(hit, String(dmg), '#fff'); sfx('hit'); }, 0.2);
        if (hit.mon.hp <= 0) this.faint(hit, p);
      }
    });
  }
  afterItem() { this.endTurn(() => {}); }
  // a Revive (quests.js useItem): the fallen teammate gets back up beside the leader; one a run
  reviveMate(m, pct) {
    m.hp = Math.max(1, Math.floor(m.maxhp * pct)); m.status = null; m.stages = {};
    this.mates = this.mates.filter((a) => a.mon !== m);
    this.ents = this.ents.filter((a) => a.mon !== m);
    const [x, y] = this.freeNear(this.player.x, this.player.y);
    this.mates.push(this.addEnt(m, x, y, 'ally'));
    this.revived = true;
    this.msg(tr(`${m.name}이(가) 기운을 되찾고 일어났다!`, `${m.name} got back on its feet!`), COL.green);
    sfx('heal');
  }
  descend() {
    this.pendingStairs = false;
    if (this.floor >= this.floors) return this.cleared();
    sfx('stairs');
    fadeTo(() => {
      this.floor++;
      if (this.def.tower) this.restoreTeam();
      this.newFloor();
      this.msg(this.stage?.name ? tr(`${this.stage.name}에 도착했다.`, `Reached the ${this.stage.name}.`) : tr(`${this.floor}층에 도착했다.`, `Reached floor ${this.floor}.`), COL.blue);
      if (this.bossFloor && !this.stage?.wake) playBgm(this.bossDef.bgm || 'ba_gym', 0.4);
      else if (this.stage) playBgm(this.stage.bgm || this.def.bgm, 0.6);
    }, '#000', 4);
  }

  // ---------------------------------------------------------------- update / draw
  update(dt) {
    for (const e of this.ents) {
      if (e.ax != null) { e.vx = e.ax; e.vy = e.ay; e.ax = null; e.ay = null; }
      e.vx += (e.x - e.vx) * Math.min(1, dt * 14); e.vy += (e.y - e.vy) * Math.min(1, dt * 14);
      if (e.hurt) e.hurt = Math.max(0, e.hurt - dt);
      if (e.lunge) e.lunge = Math.max(0, e.lunge - dt);
      if (e.fade != null) { e.fade -= dt * 2.5; if (e.fade <= 0) { e.shown = false; e.fade = null; } }
    }
    for (const p of this.pops) p.t -= dt;
    this.pops = this.pops.filter((p) => p.t > 0);
    for (const m of this.msgs) m.t -= dt;
    if (this.flash) { this.flash.t -= dt; if (this.flash.t <= 0) this.flash = null; }
    if (this.beam) { this.beam.t -= dt; if (this.beam.t <= 0) this.beam = null; }
    if (this.blast) { this.blast.t -= dt; if (this.blast.t <= 0) this.blast = null; }
    if (this.beamFx) { this.beamFx.t -= dt; if (this.beamFx.t <= 0) this.beamFx = null; }
    if (this.timeFx) { this.timeFx.t -= dt; if (this.timeFx.t <= 0) this.timeFx = null; }
    if (this.lightFx) { this.lightFx.t -= dt; if (this.lightFx.t <= 0) this.lightFx = null; }
    if (this.shake) this.shake = Math.max(0, this.shake - dt);
    // X/C/M/J/Tab/P pressed while a turn plays out wait for it instead of being dropped
    for (const k of ['cancel', 'menu', 'map', 'quest', 'tag', 'party']) if (input.hit(k)) this.latch = k;
    if (this.cur) { this.cur.t -= dt; if (this.cur.t <= 0) this.cur = null; return; }
    if (this.queue.length) { const s = this.queue.shift(); s.fn(); this.cur = { t: s.dur }; return; }
    if (this.pendingMates?.length && !G.overlays.length) { this.resumeTurn(); return; }
    if (G.overlays.length || this.done) return;
    if (this.bossIntro) {
      this.bossIntro = false; this.latch = null;
      const b = this.boss.def;
      playBgm(b.bgm || 'ba_gym', 0.4); cry(b.sp);
      const L = lines(this.stage?.say || b.say || []); // a Boss Tower floor introduces its pair in its own words
      if (b.tele && !S.flags.teleTut) { S.flags.teleTut = true; L.push(...lines(TELE_TUT)); }
      say(L);
      return;
    }
    if (this.pendingFlute) { this.pendingFlute = false; this.latch = null; return this.playFlute(); }
    if (this.pendingStairs) {
      this.pendingStairs = false; this.latch = null;
      return say([{ who: 'narr', text: this.floor >= this.floors ? tr('출구로 이어지는 계단이다. 던전을 나갈까?', 'These stairs lead to the exit. Leave the dungeon?') : tr('다음 층으로 가는 계단이다. 내려갈까?', 'Stairs to the next floor. Go down?'), choices: tr(['간다', '그만둔다'], ['Go', 'Stay']), onChoice: (i) => { if (i === 0) this.descend(); } }]);
    }
    // input
    const key = this.latch; this.latch = null;
    if (key === 'cancel' || key === 'menu') return this.menu();
    if (key === 'map') { this.showMap = !this.showMap; return; }
    if (key === 'quest') return questMenu();
    if (key === 'tag') return this.tag();
    if (key === 'party') return this.msg(tr('던전에서는 동료를 바꿀 수 없다. 마을이나 세계 지도에서 P를 누르자.', 'You can\'t swap companions in a dungeon. Press P in town or on the world map.'), COL.red);
    const L = this.moveList(), t = input.tap(L.x - 6, L.y - 6, 154, L.n * 14 + 10); // a tap on the move list uses that move
    if (t && L.n) return this.playerAct('move-skill', clamp(Math.floor((t.y - L.y) / 14), 0, L.n - 1));
    for (let k = 0; k < 4; k++) if (input.hit('m' + (k + 1))) return this.playerAct('move-skill', k);
    if (input.hit('ok')) return this.playerAct('basic');
    if (input.isDown('rest')) { if (!this.restT || G.time > this.restT) { this.restT = G.time + 0.12; return this.playerAct('wait'); } return; }
    const { dx, dy } = input.dir();
    if (dx || dy) {
      if (!this.dirSince) this.dirSince = G.time;
      if (!(dx && dy) && G.time - this.dirSince < 0.045) return; // grace period for diagonals
      if (input.isDown('shift')) { this.player.face = [dx, dy]; return; }
      if (this.nextMoveAt && G.time < this.nextMoveAt) return;
      this.nextMoveAt = G.time + 0.13;
      this.playerAct('move', [dx, dy]);
    } else { this.dirSince = 0; this.nextMoveAt = 0; }
  }
  get padKeys() { return this.arena ? ['menu', 'quest'] : ['menu', 'quest', 'map']; } // the touch menu panel's game buttons
  // the move list in the bottom-right corner (drawUI), whose rows a tap uses like Q W E R
  moveList() { const n = this.player.mon.moves.length; return { n, x: VW - 152, y: VH - 12 - n * 14 }; }
  menu() {
    openMenu([
      { label: tr('기술', 'Moves'), fn: () => openMenu(this.player.mon.moves.map((mv, k) => { const d = DEX.moves[mv.id]; return { label: `${'QWER'[k]}. ${d.name}`, right: `PP ${mv.pp}/${d.pp}`, desc: moveDesc(mv.id), fn: () => this.playerAct('move-skill', k) }; }), { title: tr('기술', 'Moves'), desc: true, x: 140, y: 40, w: 220 }) },
      { label: tr('도구', 'Items'), fn: () => itemMenu(this) },
      { label: tr('포켓몬', 'Pokémon'), fn: () => partyMenu({ dungeon: true }) },
      { label: tr('퀘스트', 'Quests'), fn: questMenu },
      { label: tr('발밑 / 쉬기', 'Rest a turn'), fn: () => this.playerAct('wait') },
      { label: tr('던전에서 나가기', 'Leave the dungeon'), right: this.def.police ? tr('싸우는 중', 'Mid-fight') : this.floor === this.startFloor ? '' : tr('들어온 층에서만', 'First floor only'), disabled: this.floor !== this.startFloor || !!this.def.police, fn: () => say([{ who: 'narr', text: tr('아직 들어온 층이라 왔던 길로 되돌아 나갈 수 있다. 던전에서 나갈까?', 'Still on the floor you came in on, you can walk back out the way you came. Leave the dungeon?'), choices: tr(['나간다', '그만둔다'], ['Leave', 'Stay']), onChoice: (i) => { if (i === 0) this.leave(); } }]) },
      { label: tr('설정', 'Settings'), fn: () => settingsMenu() },
      quitItem(true, () => this.restoreCrew()),
      { label: tr('닫기', 'Close') },
    ], { title: this.stage?.name ? this.title : tr(`${this.def.name} ${this.floor}층`, `${this.def.name} F${this.floor}`) });
  }
  draw(c) {
    const p = this.player;
    const sh = this.shake ? Math.round((Math.random() - 0.5) * 6 * Math.min(1, this.shake * 4)) : 0;
    const R = this.arena && this.rooms[0];
    const camX = (R ? R.x * TILE + (R.w * TILE - VW) / 2 : Math.round(p.vx * TILE + 12 - VW / 2)) + sh;
    const camY = (R ? R.y * TILE + (R.h * TILE - VH) / 2 : Math.round(p.vy * TILE + 12 - VH / 2)) - sh;
    c.fillStyle = '#0b0a10'; c.fillRect(0, 0, VW, VH);
    const x0 = Math.max(0, Math.floor(camX / TILE)), y0 = Math.max(0, Math.floor(camY / TILE));
    const x1 = Math.min(W - 1, x0 + Math.ceil(VW / TILE) + 1), y1 = Math.min(H - 1, y0 + Math.ceil(VH / TILE) + 1);
    if (!this.bg) this.prerender();
    c.save(); c.translate(-camX, -camY);
    if (this.bg) drawSeen(c, this.bg, camX, camY);
    c.fillStyle = '#0b0a10';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!this.seen[y][x]) c.fillRect(x * TILE, y * TILE, TILE, TILE);
    if (this.stairs && this.seen[this.stairs[1]][this.stairs[0]]) this.drawStairs(c, this.stairs[0] * TILE, this.stairs[1] * TILE, this.lit);
    if (this.altar && !this.lit) this.drawAltar(c, this.altar[0] * TILE + 12, this.altar[1] * TILE + 12);
    // telegraphed danger tiles (brighter on the last turn) and the blast flash
    if (this.rent) for (const k of this.rent.tiles) this.drawRent(c, k % W, Math.floor(k / W));
    for (const boss of this.bosses) {
      const tele = boss.alive && boss.tele;
      if (!tele) continue;
      const a = (tele.turns <= 1 ? 0.42 : 0.24) + 0.14 * Math.sin(G.time * (tele.turns <= 1 ? 14 : 7));
      for (const k of tele.tiles) {
        const x = (k % W) * TILE, y = Math.floor(k / W) * TILE;
        c.fillStyle = `rgba(255,40,24,${a})`; c.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
        c.fillStyle = 'rgba(255,200,160,0.55)'; c.fillRect(x + 1, y + 1, TILE - 2, 1); c.fillRect(x + 1, y + TILE - 2, TILE - 2, 1);
        if (tele.fx === 'void') { c.fillStyle = 'rgba(16,4,28,0.75)'; c.beginPath(); c.ellipse(x + 12, y + 13, 7, 4, 0, 0, Math.PI * 2); c.fill(); } // black holes
      }
      for (const [ox, oy] of tele.orbs || []) { // Judgment's orbs: a ring of light where each will fall
        c.strokeStyle = `rgba(255,236,150,${0.5 + 0.4 * Math.sin(G.time * 10)})`; c.lineWidth = 2;
        c.beginPath(); c.arc(ox * TILE + 12, oy * TILE + 12, 26, 0, Math.PI * 2); c.stroke();
      }
      if (tele.fx === 'shadow' && boss.hidden) this.drawShadow(c, tele.at[0] * TILE + 12, tele.at[1] * TILE + 16);
    }
    if (this.blast) {
      const b = this.blast, f = 1 - b.t / 0.45;
      c.globalAlpha = Math.min(0.85, b.t * 2) * (b.orbs ? Math.min(1, f * 1.6) : 1);
      c.fillStyle = b.color || 'rgb(255,246,220)';
      for (const k of b.tiles) c.fillRect((k % W) * TILE, Math.floor(k / W) * TILE, TILE, TILE);
      c.globalAlpha = 1;
      for (const [ox, oy] of b.orbs || []) { // the orbs falling out of the sky onto their rings
        const x = ox * TILE + 12, y = oy * TILE + 12 - Math.max(0, 1 - f * 1.6) * 90;
        const g = c.createRadialGradient(x, y, 1, x, y, 9); g.addColorStop(0, '#fffbe8'); g.addColorStop(0.6, '#ffd84a'); g.addColorStop(1, 'rgba(255,200,60,0)');
        c.fillStyle = g; c.fillRect(x - 9, y - 9, 18, 18);
      }
    }
    if (this.beamFx) { // Hyper Beam: a thick bright line from the boss to the arena's edge
      const b = this.beamFx, [dx, dy] = DIRS8[b.k], x = b.x * TILE + 12, y = b.y * TILE + 8, a = Math.min(1, b.t * 4);
      c.lineCap = 'round';
      c.strokeStyle = `rgba(255,214,90,${0.6 * a})`; c.lineWidth = 22; c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx * 900, y + dy * 900); c.stroke();
      c.strokeStyle = `rgba(255,255,240,${a})`; c.lineWidth = 8; c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx * 900, y + dy * 900); c.stroke();
      c.lineCap = 'butt';
    }
    for (const it of this.items) if (this.vis[it.y][it.x]) this.drawItem(c, it);
    const ents = this.ents.filter((e) => e.shown && !e.hidden && (e.team === 'ally' || this.vis[e.y][e.x]));
    const list = ents.map((e) => ({ y: e.vy * TILE + TILE, fn: () => this.drawEnt(c, e) }));
    if (this.battleTown) for (const o of this.battleTown.objs) if (objInView(o, camX + this.crop[0] * TILE, camY + this.crop[1] * TILE)) list.push({ y: o.base - this.crop[1] * TILE, fn: () => this.drawObj(c, o) });
    for (const d of list.sort((a, b) => a.y - b.y)) d.fn();
    if (this.beam) {
      const b = this.beam, f = 1 - b.t / 0.25;
      c.fillStyle = b.color;
      const len = b.len ?? 6;
      for (let i = 1; i <= len; i++) { const k = i * f * 1.2; if (k > len) break; c.fillRect(Math.round((b.from.x + b.dir[0] * k) * TILE + 9), Math.round((b.from.y + b.dir[1] * k) * TILE + 9), 6, 6); }
    }
    if (this.flash) { const e = this.flash.e; c.strokeStyle = this.flash.color; c.lineWidth = 2; c.beginPath(); c.arc(e.vx * TILE + 12, e.vy * TILE + 10, 16 * (1 - this.flash.t / 0.2) + 4, 0, Math.PI * 2); c.stroke(); }
    c.restore();
    // fog (seen but not visible)
    c.fillStyle = 'rgba(5,4,10,0.55)';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (this.seen[y][x] && !this.vis[y][x]) c.fillRect(x * TILE - camX, y * TILE - camY, TILE, TILE);
    const tint = this.stage?.tint ?? this.def.tint;
    if (tint) { c.fillStyle = tint; c.fillRect(0, 0, VW, VH); }
    if (this.lightFx) { c.fillStyle = `rgba(255,238,170,${0.55 * Math.min(1, this.lightFx.t)})`; c.fillRect(0, 0, VW, VH); } // the flute's light
    if (this.timeFx) { // Roar of Time: the world tinted blue, clock rings spreading from Dialga
      const t = this.timeFx, x = t.x * TILE + 12 - camX, y = t.y * TILE + 8 - camY;
      c.fillStyle = `rgba(60,110,255,${0.32 * t.t})`; c.fillRect(0, 0, VW, VH);
      c.strokeStyle = `rgba(200,225,255,${t.t})`; c.lineWidth = 2;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x, y, (1 - t.t) * 260 + i * 26, 0, Math.PI * 2); c.stroke(); }
    }
    this.camX = camX; this.camY = camY;
  }
  // a battlefield's building or prop, at its place in the town (shifted by the battle window)
  drawObj(c, o) {
    const im = img(o.img);
    if (!ready(im)) return;
    const ox = -this.crop[0] * TILE, oy = -this.crop[1] * TILE;
    if (o.prop) c.drawImage(im, Math.round(ox + o.tx * TILE + (o.fw * TILE - im.width) / 2), Math.round(oy + (o.ty + o.fd) * TILE - im.height + 2));
    else c.drawImage(im, ox + o.x, oy + o.y);
  }
  drawEnt(c, e) {
    {
      const pmd = hasPmdSprite(e.mon.spr);
      let ox = 0, oy = 0;
      if (e.lunge && !pmd) { const f = Math.sin((e.lunge / 0.18) * Math.PI) * 6; ox = e.face[0] * f; oy = e.face[1] * f; }
      const x = e.vx * TILE + 12 + ox, y = e.vy * TILE + TILE + oy;
      // PMD animation: attack lunge, hurt recoil, sleeping, otherwise the walk cycle (faster while moving)
      let anim = 'walk', t;
      if (e.atkT != null && G.time - e.atkT < 0.45) { anim = 'attack'; t = G.time - e.atkT; }
      else if (e.hurt > 0) { anim = 'hurt'; t = 0.3 - e.hurt; }
      else if (e.mon.status === 'slp') anim = 'sleep';
      const moving = Math.abs(e.vx - e.x) + Math.abs(e.vy - e.y) > 0.04;
      if (e.mon.primal) { // Primal Reversion: Groudon's magma red, Kyogre's deep blue
        const gr = c.createRadialGradient(x, y - 18, 4, x, y - 18, 30);
        gr.addColorStop(0, e.mon.sp === 383 ? '#ff6a2a' : '#4a9aff'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        c.save(); c.globalAlpha = 0.35 + Math.sin(G.time * 5) * 0.12 + (e.reviveT > 0 ? e.reviveT * 0.5 : 0); c.fillStyle = gr; c.fillRect(x - 32, y - 50, 64, 64); c.restore();
        if (e.reviveT > 0) e.reviveT = Math.max(0, e.reviveT - G.dt);
      }
      if (e.revived || e.reviveT > 0) { // a later form: a pulsing aura in the form's colour (white flash while it rises again)
        const r = e.rev || {}, a = 0.28 + Math.sin(G.time * 4) * 0.1 + (e.reviveT > 0 ? e.reviveT * 0.5 : 0);
        const gr = c.createRadialGradient(x, y - 18, 4, x, y - 18, 34);
        const aura = r.aura === 'rainbow' ? `hsl(${Math.floor(G.time * 140) % 360},95%,68%)` : r.aura || '#ffd84a';
        gr.addColorStop(0, e.reviveT > 0 ? '#fff' : aura); gr.addColorStop(1, 'rgba(0,0,0,0)');
        c.save(); c.globalAlpha = Math.min(1, a); c.fillStyle = gr; c.fillRect(x - 36, y - 54, 72, 72); c.restore();
        if (e.reviveT > 0) e.reviveT = Math.max(0, e.reviveT - G.dt);
      }
      drawMon(c, e.mon.spr, e.shiny, x, y, { face: e.face, facing: faceName(e.face) || e.lastF || 'left', anim, t, moving, hurt: e.hurt > 0, alpha: e.fade ?? 1, phase: e.phase, scale: e.isBoss ? (pmd ? 1.3 : e.revived ? 1.9 : 1.6) : 1 });
      if (faceName(e.face)) e.lastF = faceName(e.face);
      if (e.isPlayer) drawBadge(c, Math.round(x) - 5, Math.round(y) - 18 - Math.min(48, (pmd && pmdHeadroom(e.mon.spr)) || 28)); // just above its head
      else if (e.team === 'ally' && !e.army) { c.fillStyle = '#7fd0ff'; c.fillRect(Math.round(x) - 2, Math.round(y) - 36, 4, 3); }
      const gslot = e.team === 'ally' && NET.role === 'host' ? S.party.indexOf(e.mon) : -1;
      if (gslot > 0 && NET.guestFor(gslot)) { // co-op: player tag, pulsing while that player is to move
        const my = Math.round(y) - 46 + (this.waitGuest?.m === e ? Math.sin(G.time * 8) * 2 : 0);
        c.fillStyle = this.waitGuest?.m === e ? '#ff8a3a' : '#2f5d8a'; c.fillRect(Math.round(x) - 8, my, 16, 9);
        c.fillStyle = '#fff'; c.font = '7px Galmuri9'; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText(`P${gslot + 1}`, Math.round(x), my + 1);
      }
      if (e.team === 'npc') { const by = Math.round(y) - 42 + Math.sin(G.time * 5) * 2; c.fillStyle = '#1a1010'; c.fillRect(Math.round(x) - 4, by - 1, 8, 10); c.fillStyle = COL.blue; c.fillRect(Math.round(x) - 3, by, 6, 8); c.fillStyle = '#fff'; c.fillRect(Math.round(x) - 1, by + 1, 2, 4); c.fillRect(Math.round(x) - 1, by + 6, 2, 1); }
      if (e.team === 'foe' && !e.isBoss && e.mon.hp < e.mon.maxhp) { c.fillStyle = '#000'; c.fillRect(Math.round(x) - 9, Math.round(y) + 1, 18, 3); c.fillStyle = COL.hpCrit; c.fillRect(Math.round(x) - 8, Math.round(y) + 2, Math.round(16 * e.mon.hp / e.mon.maxhp), 1); }
      if (e.mon.status) { c.fillStyle = { psn: '#a04ad0', brn: '#e0602a', par: '#e0c020', slp: '#8aa0c0', frz: '#7fd8f0' }[e.mon.status]; c.fillRect(Math.round(x) + 8, Math.round(y) - 30, 4, 4); }
      if (e.army) { c.fillStyle = '#3f7a4f'; c.fillRect(Math.round(x) - 2, Math.round(y) - 36, 4, 3); } // allied troops: a green tag
    }
  }
  // whole floor painted once with the dungeon's PMD chunk set (walls, floor, ponds; naval floors are open water)
  prerender() {
    const T = this.battleTown;
    if (T) { // the town as built (ground, roads, water), cropped to the battle window
      if (!T.bg) T.prerender();
      if (!T.bg) return;
      const cv = document.createElement('canvas');
      cv.width = W * TILE; cv.height = H * TILE;
      cv.getContext('2d').drawImage(T.bg, -this.crop[0] * TILE, -this.crop[1] * TILE);
      this.bg = cv;
      return;
    }
    const set = tileSet(this.stage?.tiles ?? this.def.tiles);
    if (!set.meta || !ready(set.im)) return;
    const cv = document.createElement('canvas');
    cv.width = W * TILE; cv.height = H * TILE;
    const ctx = cv.getContext('2d');
    const sea = !!this.def.water;
    paintTerrain(ctx, set, W, H, (x, y) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return null;
      if (this.grid[y][x]) return sea ? 2 : 1;
      return this.pond.has(y * W + x) ? 2 : 0;
    }, 0, 0, this.floor * 7919 + this.dId.length);
    this.bg = cv;
  }
  // a tile torn away by Spacial Rend: the void between spaces, pink rifts flickering in it
  drawRent(c, x, y) {
    const px = x * TILE, py = y * TILE, h = (x * 7 + y * 13) % 5, a = 0.45 + 0.3 * Math.sin(G.time * 4 + h);
    c.fillStyle = '#140a1e'; c.fillRect(px, py, TILE, TILE);
    c.fillStyle = `rgba(255,154,216,${a})`;
    c.fillRect(px + 3 + h * 2, py + 4, 1, 8); c.fillRect(px + 4 + h * 2, py + 11, 5, 1); c.fillRect(px + 15 - h, py + 15, 1, 6);
  }
  // where Shadow Force will burst out: a dark pool swirling under its mark
  drawShadow(c, x, y) {
    const r = 15 + Math.sin(G.time * 6) * 2;
    c.fillStyle = 'rgba(20,0,30,0.7)'; c.beginPath(); c.ellipse(x, y, r, r * 0.45, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(190,90,255,0.8)'; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y, r * 0.7, r * 0.3, G.time * 2, 0, Math.PI * 2); c.stroke();
  }
  // stairs; the stairway of light the Azure Flute brings down (light) glows gold
  drawStairs(c, x, y, light) {
    if (light) {
      const g = c.createRadialGradient(x + 12, y + 12, 2, x + 12, y + 12, 22);
      g.addColorStop(0, `rgba(255,246,200,${0.75 + 0.2 * Math.sin(G.time * 5)})`); g.addColorStop(1, 'rgba(255,214,90,0)');
      c.fillStyle = g; c.fillRect(x - 10, y - 10, 44, 44);
    }
    c.fillStyle = light ? '#8a6a20' : '#2a2420'; c.fillRect(x + 3, y + 3, 18, 18);
    for (let i = 0; i < 4; i++) { c.fillStyle = light ? (i % 2 ? '#ffe9a0' : '#fff8dc') : i % 2 ? '#8c7a64' : '#b29e82'; c.fillRect(x + 4 + i * 2, y + 5 + i * 4, 16 - i * 4, 3); }
    if (Math.floor(G.time * 2) % 2) { c.fillStyle = '#fff4c0'; c.fillRect(x + 11, y + 1, 2, 2); }
  }
  // the Spear Pillar's altar, where the Azure Flute is played: a stone pedestal with a light pulsing over it
  drawAltar(c, x, y) {
    const a = 0.6 + 0.3 * Math.sin(G.time * 3), oy = Math.sin(G.time * 2.5) * 2;
    const g = c.createRadialGradient(x, y - 12 + oy, 1, x, y - 12 + oy, 18);
    g.addColorStop(0, `rgba(230,245,255,${a})`); g.addColorStop(0.5, `rgba(120,180,255,${a * 0.5})`); g.addColorStop(1, 'rgba(120,180,255,0)');
    c.fillStyle = g; c.fillRect(x - 18, y - 30 + oy, 36, 36);
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(x, y + 8, 11, 4, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2c2a38'; c.fillRect(x - 9, y - 4, 18, 13); // the pedestal: outline, side and top
    c.fillStyle = '#8a8698'; c.fillRect(x - 8, y - 3, 16, 11);
    c.fillStyle = '#c4c0d2'; c.fillRect(x - 8, y - 3, 16, 4);
    c.fillStyle = `rgba(150,210,255,${a})`; c.fillRect(x - 2, y - 15 + oy, 4, 4); c.fillRect(x - 1, y - 17 + oy, 2, 8);
  }
  drawItem(c, it) {
    const x = it.x * TILE + 12, y = it.y * TILE + 14 + Math.sin(G.time * 3 + it.x) * 1;
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(x, it.y * TILE + 19, 6, 2, 0, 0, 7); c.fill();
    const k = it.id;
    if (k === 'money') { c.fillStyle = '#6b4c10'; c.fillRect(x - 6, y - 4, 12, 8); c.fillStyle = '#e2b63a'; c.fillRect(x - 5, y - 3, 5, 5); c.fillRect(x + 1, y - 2, 4, 4); c.fillStyle = '#6b4c10'; c.fillRect(x - 3, y - 1, 1, 1); }
    else if (k === 'oran' || k === 'sitrus') { c.fillStyle = '#1c1c30'; c.fillRect(x - 5, y - 5, 10, 10); c.fillStyle = k === 'oran' ? '#4a7ae0' : '#e0c030'; c.fillRect(x - 4, y - 4, 8, 8); c.fillStyle = '#3c8a30'; c.fillRect(x - 1, y - 7, 3, 3); }
    else if (k === 'stone') { c.fillStyle = '#333'; c.fillRect(x - 4, y - 3, 8, 7); c.fillStyle = '#a0a0a0'; c.fillRect(x - 3, y - 2, 6, 5); }
    else if (k === 'herb') { c.fillStyle = '#244a1c'; c.fillRect(x - 5, y - 4, 10, 8); c.fillStyle = '#62c04a'; c.fillRect(x - 4, y - 3, 3, 6); c.fillRect(x + 1, y - 3, 3, 6); }
    else if (k === 'rice') { c.fillStyle = '#333'; c.fillRect(x - 5, y - 4, 10, 9); c.fillStyle = '#f4f0e0'; c.fillRect(x - 4, y - 3, 8, 7); c.fillStyle = '#20302a'; c.fillRect(x - 4, y + 1, 8, 3); }
    else { // quest item: scroll with sparkle
      c.fillStyle = '#3a2210'; c.fillRect(x - 6, y - 5, 12, 10); c.fillStyle = '#f0e0b0'; c.fillRect(x - 5, y - 4, 10, 8); c.fillStyle = COL.red; c.fillRect(x - 5, y - 4, 2, 8); c.fillRect(x + 3, y - 4, 2, 8);
      if (Math.floor(G.time * 3) % 2) { c.fillStyle = '#fff'; c.fillRect(x + 5, y - 8, 1, 4); c.fillRect(x + 3, y - 6, 5, 1); }
    }
  }
  drawUI() {
    // party HUD
    const team = [this.player, ...this.mates], at = (e) => { const i = S.party.indexOf(e.mon); return i < 0 ? 99 : i; };
    const allies = team.slice().sort((a, b) => at(a) - at(b)); // party order; the one in control is marked
    ui.panel(6, 6, 176, 18 + allies.length * 22);
    const foesLeft = this.def.battle && this.ents.filter((e) => e.alive && e.team === 'foe').length;
    ui.text(this.def.battle ? tr(`${this.def.name}  남은 적 ${foesLeft}`, `${this.def.name}  Foes left ${foesLeft}`) : this.stage?.name ? this.title : tr(`${this.def.name}  ${this.floor}층`, `${this.def.name}  F${this.floor}`), 12, 12, { size: 9, color: COL.red, bold: true }); // below the dancheong stripe
    allies.forEach((e, i) => {
      const m = e.mon, y = 24 + i * 22;
      if (e.isPlayer) drawBadge(ui.c, 8, y - 1, BADGE_S);
      ui.text(`${m.name}`, 20, y, { size: 9, color: e.alive ? (e.isPlayer ? COL.red : COL.ink) : '#999' });
      ui.text(`Lv${m.lv}`, 88, y, { size: 9, color: COL.ink2 });
      ui.text(`${m.hp}/${m.maxhp}`, 176, y, { size: 9, align: 'right' });
      ui.bar(12, y + 11, 164, 5, m.hp, m.maxhp);
    });
    // boss bars: right of the party panel, a pair side by side
    const bars = this.bosses.filter((b) => b.alive), bw = bars.length > 1 ? 140 : 180;
    bars.forEach((b, i) => this.drawBossBar(b, VW / 2 - 52 + i * (bw + 4), bw, 32 + i * 18));
    // moves
    const mv = this.player.mon.moves, { x: bx, y: by } = this.moveList();
    ui.panel(bx - 6, by - 6, 154, mv.length * 14 + 10, { accent: false });
    mv.forEach((m, k) => {
      const d = DEX.moves[m.id];
      ui.rect(bx - 2, by + k * 14 + 1, 3, 10, TYPE_COLORS[d.type]);
      ui.text(`${'QWER'[k]} ${d.name}`, bx + 4, by + k * 14, { size: 9, color: m.pp ? COL.ink : '#a99' });
      ui.text(`${m.pp}/${d.pp}`, bx + 142, by + k * 14, { size: 9, align: 'right', color: COL.ink2 });
    });
    // messages
    const ms = this.msgs.filter((m) => m.t > 0).slice(-4);
    if (ms.length) {
      ui.panel(6, VH - 10 - ms.length * 13 - 6, 300, ms.length * 13 + 8, { accent: false, fill: 'rgba(243,232,207,0.92)' });
      ms.forEach((m, i) => ui.text(m.text, 12, VH - 10 - ms.length * 13 + i * 13, { size: 9, color: m.color }));
    }
    // minimap (not needed in the one-room boss arena)
    if (this.showMap && !this.arena) {
      const s = 2, mx = VW - W * s - 8, my = 36;
      const c = ui.c;
      c.fillStyle = 'rgba(10,10,20,0.45)'; c.fillRect(mx - 2, my - 2, W * s + 4, H * s + 4);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (this.seen[y][x] && this.grid[y][x]) { c.fillStyle = 'rgba(160,200,255,0.55)'; c.fillRect(mx + x * s, my + y * s, s, s); }
      if (this.stairs && this.seen[this.stairs[1]][this.stairs[0]]) { c.fillStyle = '#7fff7f'; c.fillRect(mx + this.stairs[0] * s - 1, my + this.stairs[1] * s - 1, 4, 4); }
      for (const it of this.items) if (this.seen[it.y][it.x]) { c.fillStyle = it.quest ? '#ff7f7f' : '#e0d070'; c.fillRect(mx + it.x * s, my + it.y * s, 2, 2); }
      for (const e of this.ents) if (e.alive && this.vis[e.y][e.x]) { c.fillStyle = e.team === 'ally' ? (e.isPlayer ? '#ffe04a' : '#7fd0ff') : e.team === 'npc' ? '#7fa0ff' : '#ff5a4a'; c.fillRect(mx + e.x * s - 1, my + e.y * s - 1, 3, 3); }
    }
    // damage popups
    for (const pp of this.pops) {
      const x = pp.x * TILE + 12 - this.camX, y = pp.y * TILE - 6 - this.camY - (0.9 - pp.t) * 18;
      ui.text(pp.text, x, y, { align: 'center', size: 11, bold: true, color: pp.color, shadow: '#000' });
    }
    if (this.waitGuest) {
      const w = this.waitGuest, left = Math.max(0, Math.ceil((w.until - performance.now()) / 1000));
      const txt = tr(`${NET.guestName(w.slot)} 차례! ${w.m.mon.name}을(를) 움직여 주세요 (${left})`, `${NET.guestName(w.slot)}'s turn! Move ${w.m.mon.name} (${left})`);
      const tw = ui.measure(txt, 11, true) + 20;
      ui.panel(VW / 2 - tw / 2, 52, tw, 18, { accent: false, fill: '#ffe9c8' });
      ui.text(txt, VW / 2, 56, { align: 'center', bold: true, color: COL.red });
    }
    if (!ms.length && prefs.hints) ui.text(touchUI ? tr('패드 이동 · Z 공격 · QWER 기술 · Tab 태그 · A 쉬기 · X 메뉴', 'Pad moves · Z attack · QWER moves · Tab tag · A rest · X menu') : tr('방향키 이동 · Z 공격 · QWER 기술 · Tab 태그 · A 쉬기 · X 메뉴 · J 퀘스트', 'Arrows move · Z attack · QWER moves · Tab tag · A rest · X menu · J quests'), 8, VH - 12, { size: 9, color: '#fff', shadow: true });
  }
  // a boss's bar: name and level (a star per later form), phase pips, HP, and below it what it is about to do
  drawBossBar(b, bx, w, ny) {
    const m = b.mon;
    ui.panel(bx, 6, w, 24, { accent: false, fill: ['#3a1c1c', '#4a3810', '#33204e'][Math.min(2, b.revives || 0)] });
    ui.text(`${'★'.repeat(b.revives || 0)}${b.revives ? ' ' : ''}${m.name}  Lv${m.lv}`, bx + 8, 9, { size: 9, color: b.revived ? '#ffe27a' : '#ffe0d0', bold: true });
    if (Array.isArray(b.teleSet)) for (let i = 0; i < b.teleSet.length; i++) ui.rect(bx + w - 12 - (b.teleSet.length - i) * 9, 10, 6, 6, i < b.bphase ? '#ff6a4a' : '#6a4a40');
    ui.bar(bx + 8, 21, w - 16, 5, m.hp, m.maxhp);
    const roar = b.sigRun?.sg.kind === 'roar' && b.sigRun.sg;
    const note = b.waiting ? [tr('가까이 다가가면 깨어난다', 'It wakes when you come near'), '#c8d8ff']
      : roar ? [tr(`[!] ${roar.name} — 다음 턴, 모두 HP ${Math.round(roar.cut * 100)}% 감소`, `[!] ${roar.name} — next turn, everyone loses ${Math.round(roar.cut * 100)}% HP`), '#8ab4ff']
        : b.tele ? [tr(`[!] ${b.tele.name} — 붉은 칸 밖으로! ${b.tele.turns}턴 뒤`, `[!] ${b.tele.name} — leave the red tiles! ${b.tele.turns} turn(s)`), b.tele.turns <= 1 ? '#ff5a3a' : '#ffb070']
          : b.stagger > 0 ? [tr(`빈틈! 받는 피해 1.5배 (${b.stagger}턴)`, `Opening! Takes 1.5x damage (${b.stagger})`), '#8ff0a0']
            : m.slowT > 0 ? [tr(`아직 제 힘을 내지 못한다 (${m.slowT}턴)`, `Not at full power yet (${m.slowT})`), '#c8d8ff'] : null;
    if (!note) return;
    const tw = ui.measure(note[0], 9) + 16, nx = clamp(bx + w / 2, 186 + tw / 2, VW - 6 - tw / 2); // clear of the party panel
    ui.panel(nx - tw / 2, ny, tw, 16, { accent: false, fill: '#2a1414' });
    ui.text(note[0], nx, ny + 3, { size: 9, align: 'center', color: note[1], bold: true });
  }
}
const STATS_OF = (d) => ({ 10: 'atk', 11: 'def', 12: 'spe', 13: 'spa', 14: 'spd', 50: 'atk', 51: 'def', 52: 'spe', 53: 'spa', 54: 'spd' })[d.effect] || 'atk';
