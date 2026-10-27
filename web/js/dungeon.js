// Mystery-dungeon style floors: random rooms & corridors, turn-based 8-way movement and moves.
import { G, VW, VH, TILE, img, ready, input, ui, COL, say, openMenu, toast, fadeTo, clamp, randInt, choice, shuffle, prefs, touchUI } from './core.js';
import { playBgm, sfx, cry, jingle } from './audio.js';
import { S, DEX, Mon, useMove, expGain, typeMult, addItem, ITEMS, STATUS_NAME, STAT_NAME, TYPE_COLORS, recruit, ROSTER_MAX, LEGENDS } from './game.js';
import { QITEMS, TELE_TUT, ERAS } from './content.js';
import { era, mainStep, activeSides, lines, gainExpFor, shareExp, itemMenu, partyMenu, questMenu, settingsMenu, quitItem, wanderBoss } from './quests.js';
import { drawMon } from './town.js';
import { tr } from './i18n.js';
import { tileSet, paintTerrain, hasPmdSprite } from './pmd.js';
import { NET } from './net.js';

const W = 44, H = 32;
const DIRS8 = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
const faceName = (d) => (d[0] > 0 ? 'right' : d[0] < 0 ? 'left' : null);
const RECRUIT_RATE = 0.35; // wild Pokémon asking to join after fainting (shiny: 70%; legendaries: always)
// difficulty along the journey: 0 in the first era, 1 in the last. Early floors are sparse and forgiving, late ones crowded and harsh.
export const curve = () => clamp(S.era / Math.max(1, ERAS.length - 1), 0, 1);

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
};

export class Dungeon {
  constructor(dId) {
    this.dId = dId;
    this.def = era().dungeons[dId];
    this.main = mainStep()?.do === 'dungeon' && mainStep().d === dId;
    this.wander = wanderBoss(dId); // a legend missed in an earlier era, waiting one floor below the usual last one
    this.floor = 1;
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
    playBgm(this.def.bgm);
    G.dialogSpeaker = (L) => { if (typeof L?.who === 'number' && L.who !== this._lastCry) { cry(L.who); this._lastCry = L.who; } };
    this.msg(tr(`${this.def.name}에 들어왔다!`, `Entered ${this.def.name}!`), COL.blue);
    if (this.def.water) {
      this.msg(tr('해전! 물 타입 포켓몬만 배에 올랐다.', 'Naval battle! Only Water-type Pokémon came aboard.'), COL.blue);
      if (this.loaned.length) this.msg(tr(`물 포켓몬이 모자라 수군이 ${this.loaned.map((m) => m.name).join(', ')}을(를) 빌려주었다.`, `Short on Water types, the navy lent you ${this.loaned.map((m) => m.name).join(', ')}.`), COL.green);
    }
  }
  exit() { G.dialogSpeaker = null; }
  relang(sw) { for (const m of this.msgs) m.text = sw(m.text); }
  // the boss waiting on this floor: a legend's lair, a story mid-boss, or the story boss on the last floor
  get bossDef() {
    const d = this.def;
    if (d.legend) return d.boss && this.floor === d.floors && !S.flags['legend_' + this.dId] ? d.boss : null;
    if (this.wander && this.floor === this.floors) return this.wander;
    if (!this.main) return null;
    if (d.mid && this.floor === d.mid.floor && !S.flags['mid_' + this.dId]) return d.mid;
    if (d.boss && this.floor === d.floors) return d.boss;
    return null;
  }
  get bossFloor() { return !!this.bossDef; }
  get floors() { return this.def.floors + (this.wander ? 1 : 0); }

  // ---------------------------------------------------------------- generation
  newFloor() {
    const grid = Array.from({ length: H }, () => new Array(W).fill(0));
    const roomOf = Array.from({ length: H }, () => new Array(W).fill(-1));
    const rooms = [];
    this.arena = this.bossFloor; // single 20x11 room that fits one screen; the camera stays fixed on it
    if (this.arena) {
      rooms.push({ x: 12, y: 9, w: 20, h: 11 });
    } else {
      for (let i = 0; i < 90 && rooms.length < 8; i++) {
        const w = randInt(5, 10), h = randInt(4, 7);
        const r = { x: randInt(2, W - w - 3), y: randInt(2, H - h - 3), w, h };
        if (rooms.some((o) => r.x < o.x + o.w + 2 && r.x + r.w + 2 > o.x && r.y < o.y + o.h + 2 && r.y + r.h + 2 > o.y)) continue;
        rooms.push(r);
      }
    }
    rooms.forEach((r, i) => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) { grid[y][x] = 1; roomOf[y][x] = i; } });
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
    if (!this.arena && !this.def.water) {
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
    this.ents = []; this.items = []; this.stairs = null; this.pendingStairs = false; this.boss = null;
    // allies
    const startRoom = this.bossFloor ? rooms[0] : choice(rooms);
    const sx = this.bossFloor ? 22 : randInt(startRoom.x + 1, startRoom.x + startRoom.w - 2);
    const sy = this.bossFloor ? 17 : randInt(startRoom.y + 1, startRoom.y + startRoom.h - 2);
    const lead = S.party.includes(this.leadMon) && this.leadMon.hp > 0 ? this.leadMon : S.party[0]; // a tagged-in leader keeps the lead
    this.player = this.addEnt(lead, sx, sy, 'ally', true);
    this.mates = [];
    for (const m of S.party) if (m !== lead && m.hp > 0) { const [px, py] = this.freeNear(sx, sy); this.mates.push(this.addEnt(m, px, py, 'ally', false)); }
    const others = rooms.filter((r) => r !== startRoom);
    const spot = (pool = others.length ? others : rooms) => {
      for (let t = 0; t < 200; t++) {
        const r = choice(pool), x = randInt(r.x, r.x + r.w - 1), y = randInt(r.y, r.y + r.h - 1);
        if (!this.entAt(x, y) && !this.itemAt(x, y) && !(this.stairs && this.stairs[0] === x && this.stairs[1] === y)) return [x, y];
      }
      return null;
    };
    if (this.bossFloor) {
      const b = this.bossDef;
      const avg = Math.round((S.party[0].lv + S.party[1].lv) / 2);
      // legendary bosses (birds, lake trio, Lugia, the Sinnoh legends...) are a tier above: +3 levels, 3.2x HP,
      // harder hits, bigger telegraphed blasts and shorter openings. The final boss sets its own numbers.
      // A boss with `revive` gets back up once in a second form (see reviveBoss). A returning legend (b.wander) fights at its new dungeon's level.
      const legend = LEGENDS.has(b.sp) && !b.final, up = legend && !b.wander ? 3 : 0;
      const lv = clamp(avg + (b.lvUp ?? 2) + up, (b.lvMin ?? b.lv - 5) + up, b.lv + up);
      const mon = new Mon(b.sp, lv, { boss: true, hpMul: (b.hp || 1.05 + curve() * 0.4) * (legend ? 3.2 : 1), atkMul: (b.atk || 0.9) * (legend ? 1.2 : 1), moves: b.moves?.map((id) => ({ id, pp: DEX.moves[id].pp })) });
      mon.slowT = b.slow || 0;
      const e = this.boss = this.addEnt(mon, 22, 12, 'foe');
      e.isBoss = true; e.def = b; e.bphase = 1; e.stagger = 0; e.tele = null;
      e.legend = legend; e.cap = b.cap ?? (legend ? 0.38 : 0.3);
      // a legend with a single telegraph gains a second, faster and harder phase below half HP
      e.teleSet = legend && b.tele && !Array.isArray(b.tele)
        ? [b.tele, { ...b.tele, at: 0.5, every: Math.max(2, b.tele.every - 2), dmg: b.tele.dmg * 1.2, stagger: 1,
          msg: tr(`${mon.name}이(가) 전설의 힘을 끌어올렸다! 공격이 한층 거세진다!`, `${mon.name} unleashes its legendary power! Its attacks grow fiercer!`) }]
        : b.tele;
      e.teleCD = b.tele ? (this.teleConf(e).first ?? 3) : 0;
      this.bossIntro = true;
    } else {
      this.stairs = spot();
      const k = curve();
      const n = Math.min(9, Math.round(2 + k * 4 + (this.floor - 1) * (0.4 + k * 0.6)));
      for (let i = 0; i < n; i++) this.spawnFoe(spot());
      const ni = randInt(3, 5);
      for (let i = 0; i < ni; i++) { const p = spot(); if (p) this.items.push({ x: p[0], y: p[1], ...this.randomItem() }); }
      this.questSpawns(spot);
    }
    this.updateVis();
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
    const [a, b] = this.def.lv;
    let lv = clamp(randInt(a, b) + Math.floor((this.floor - 1) / 2), a, b + 1);
    // the first eras never field foes above the team's average level
    if (curve() < 0.3) lv = Math.min(lv, Math.max(a, Math.round(S.party.reduce((s, m) => s + m.lv, 0) / S.party.length)));
    const mon = new Mon(choice(this.def.mons), lv);
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
  entAt(x, y) { return this.ents.find((e) => e.alive && e.x === x && e.y === y); }
  itemAt(x, y) { return this.items.find((i) => i.x === x && i.y === y); }
  canStep(x, y, dx, dy) {
    if (!this.walk(x + dx, y + dy)) return false;
    if (dx && dy && (!this.walk(x + dx, y) || !this.walk(x, y + dy))) return false;
    return true;
  }
  updateVis() {
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
  // Whoever is in control is the leader: if the leader faints, the expedition fails.
  tag() {
    const all = [this.player, ...this.mates];
    const order = [...S.party.map((m) => all.find((a) => a.mon === m)).filter(Boolean), ...all.filter((a) => !S.party.includes(a.mon))];
    const i = order.indexOf(this.player);
    for (let k = 1; k < order.length; k++) {
      const e = order[(i + k) % order.length];
      if (!e.alive || NET.guestFor(S.party.indexOf(e.mon))) continue;
      this.player.isPlayer = false; e.isPlayer = true;
      this.player = e; this.leadMon = e.mon;
      this.mates = order.filter((a) => a !== e);
      this.dirSince = 0; this.nextMoveAt = 0; this.restT = 0;
      this.updateVis();
      sfx('cursor');
      this.msg(tr(`${e.mon.name}(으)로 교대했다!`, `Tagged in ${e.mon.name}!`), COL.blue);
      return;
    }
    sfx('cancel');
    this.msg(tr('교대할 수 있는 동료가 없다.', 'No teammate can tag in.'), COL.red);
  }
  endTurn(playerFn) {
    if (this.player.mon.status === 'slp' || this.player.mon.status === 'frz' || (this.player.mon.status === 'par' && Math.random() < 0.25)) {
      this.statusSkip(this.player);
    } else playerFn();
    this.turnNo++;
    this.pendingMates = this.mates.filter((m) => m.alive);
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

  // choose a move's targets for an attacker facing a direction
  skillTargets(att, mvId) {
    const mv = DEX.moves[mvId];
    const foeTeam = att.team === 'foe' ? 'ally' : 'foe';
    if (mv.cat === 2 && [16, 1024].includes(mv.target)) return [att];
    if (mv.target === 4 || mv.target === 8) {
      return DIRS8.map(([dx, dy]) => this.entAt(att.x + dx, att.y + dy)).filter((e) => e && e.team === foeTeam && this.canStep(att.x, att.y, e.x - att.x, e.y - att.y));
    }
    const [dx, dy] = att.face;
    if (mv.cat === 0) { const t = this.entAt(att.x + dx, att.y + dy); return t && t.team === foeTeam && this.canStep(att.x, att.y, dx, dy) ? [t] : []; }
    let x = att.x, y = att.y;
    for (let i = 0; i < 6; i++) {
      if (!this.canStep(x, y, dx, dy)) break;
      x += dx; y += dy;
      const t = this.entAt(x, y);
      if (t) return t.team === foeTeam ? [t] : [];
    }
    return [];
  }
  useSkill(att, k) {
    const mvs = att.mon.moves[k];
    const mv = DEX.moves[mvs.id];
    mvs.pp--;
    const targets = this.skillTargets(att, mvs.id);
    const ranged = mv.cat !== 0 && !(mv.target === 4 || mv.target === 8) && targets[0] !== att;
    this.step(() => { att.atkT = G.time; this.msg(tr(`${att.mon.name}의 ${mv.name}!`, `${att.mon.name} used ${mv.name}!`), COL.blue); this.flash = { e: att, t: 0.2, color: TYPE_COLORS[mv.type] }; if (ranged) this.beam = { from: att, dir: att.face, t: 0.25, color: TYPE_COLORS[mv.type] }; sfx(mv.cat === 2 ? 'buff' : 'confirm'); }, 0.2);
    if (!targets.length) { this.step(() => this.msg(tr('그러나 아무도 맞지 않았다…', 'But it hit nobody...')), 0.12); return; }
    for (const t of targets) this.resolve(att, t, mvs.id);
  }
  attack(att, def, mvId) {
    const name = mvId === 'basic' ? tr('공격', 'Attack') : DEX.moves[mvId].name;
    this.step(() => { att.lunge = 0.18; att.atkT = G.time; if (mvId === 'basic') this.msg(tr(`${att.mon.name}의 ${name}!`, `${att.mon.name} attacks!`)); }, 0.12);
    this.resolve(att, def, mvId);
  }
  resolve(att, def, mvId) {
    const r = useMove(att.mon, def.mon, mvId);
    const A = att.mon, D = def.mon;
    if (r.heal != null) {
      const h = Math.min(A.maxhp - A.hp, r.heal); A.hp += h;
      if (r.selfStatus) { A.status = 'slp'; att.sleepT = 2; }
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
    // bosses shrug off sleep and freeze, so they can't be locked down
    if (r.status && D.boss && (r.status === 'slp' || r.status === 'frz')) {
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
    if (e.isBoss && e.def.revive && !e.revived) return this.reviveBoss(e);
    e.alive = false;
    this.step(() => { this.msg(tr(`${e.mon.name}은(는) 쓰러졌다!`, `${e.mon.name} fainted!`), e.team === 'ally' ? COL.red : COL.ink2); sfx('faint'); e.fade = 1; }, 0.35);
    if (e.team === 'foe') {
      S.kills[e.mon.sp] = (S.kills[e.mon.sp] || 0) + 1;
      // catch-up: a team far above the foe's level learns little from it, a team below learns more
      const avg = S.party.reduce((s, m) => s + m.lv, 0) / S.party.length;
      const xp = Math.max(1, Math.round(expGain(e.mon) * (e.shiny ? 2 : 1) * clamp(1 + (e.mon.lv - avg) * 0.1, 0.25, 1.3)));
      const allies = this.ents.filter((a) => a.team === 'ally' && a.alive);
      // every foe drops coins: more for higher levels, shinies triple, bosses ten times; summoned minions drop none
      const coin = e.summoned ? 0 : Math.round((4 + e.mon.lv * 0.9) * (e.shiny ? 3 : 1) * (e.isBoss ? 10 : 1));
      S.money += coin; this.found.money += coin;
      this.step(() => { this.msg(coin ? tr(`경험치 ${xp} · 엽전 ${coin}냥을 얻었다.`, `Gained ${xp} Exp. Points and ${coin} nyang.`) : tr(`경험치 ${xp}을(를) 얻었다.`, `Gained ${xp} Exp. Points.`), COL.green); for (const a of allies) gainExpFor(a.mon, xp, (t, c) => this.msg(t, c)); shareExp(xp); }, 0.15);
      if (e.isBoss) this.step(() => this.bossDefeated(e), 0.4);
      else if (!e.summoned && (LEGENDS.has(e.mon.sp) || Math.random() < (e.shiny ? 0.7 : RECRUIT_RATE))) this.step(() => this.offerRecruit(e.mon), 0.1);
    } else if (e.isPlayer) this.step(() => this.failed(), 0.5);
    else this.step(() => this.msg(tr(`${e.mon.name}이(가) 쓰러졌다… 남은 동료와 함께 나아가자.`, `${e.mon.name} is down... Press on with the rest of the team.`), COL.red), 0.2);
  }
  turnEffects() {
    for (const e of this.ents) {
      if (!e.alive) continue;
      const m = e.mon;
      if (m.status === 'psn' || m.status === 'brn') {
        const d = Math.max(1, Math.floor(m.maxhp / 16)); m.hp = Math.max(this.phaseFloor(e), m.hp - d);
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
    if (n > 6) return false;
    const sx = Math.sign(dx), sy = Math.sign(dy);
    let x = e.x, y = e.y;
    for (let i = 0; i < n - 1; i++) { if (!this.canStep(x, y, sx, sy)) return false; x += sx; y += sy; if (this.entAt(x, y)) return false; }
    return this.canStep(x, y, sx, sy);
  }
  actWith(e, target) {
    const adj = Math.max(Math.abs(target.x - e.x), Math.abs(target.y - e.y)) === 1 && this.canStep(e.x, e.y, target.x - e.x, target.y - e.y);
    if (adj || this.inLine(e, target)) {
      e.face = [Math.sign(target.x - e.x), Math.sign(target.y - e.y)];
      const s = Math.random() < 0.8 ? this.pickSkill(e, target) : null;
      if (s) { this.useSkill(e, s.k); return true; }
      if (adj) { this.attack(e, target, 'basic'); return true; }
    }
    return false;
  }
  foeAI(e) {
    const m = e.mon;
    if (e.isBoss && this.bossTurn(e)) return;
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
  danger(x, y) { const t = this.boss?.alive && this.boss.tele; return !!t && t.tiles.has(y * W + x); }
  allyAI(e) {
    const m = e.mon;
    if (m.status === 'slp' || m.status === 'frz' || (m.status === 'par' && Math.random() < 0.25)) return this.statusSkip(e);
    const go = (step) => { const fx = e.x, fy = e.y; if (step && this.tryMove(e, ...step)) { this.moveAnim(e, fx, fy); return true; } return false; };
    // get out of a telegraphed blast first
    if (this.danger(e.x, e.y) && go(this.bfs(e, (x, y) => !this.danger(x, y) && !this.entAt(x, y), 6))) return;
    const foes = this.ents.filter((f) => f.alive && f.team === 'foe');
    const near = foes.map((f) => ({ f, d: Math.max(Math.abs(f.x - e.x), Math.abs(f.y - e.y)) })).filter((o) => this.vis[o.f.y][o.f.x]).sort((p, q) => p.d - q.d)[0];
    if (near && near.d <= 6) {
      if (this.actWith(e, near.f)) return;
      if (go(this.bfs(e, (x, y) => foes.some((f) => Math.max(Math.abs(f.x - x), Math.abs(f.y - y)) <= 1) && !this.entAt(x, y) && !this.danger(x, y), 8))) return;
    }
    const p = this.player;
    if (Math.max(Math.abs(p.x - e.x), Math.abs(p.y - e.y)) > 1) go(this.bfs(e, (x, y) => Math.max(Math.abs(p.x - x), Math.abs(p.y - y)) <= 1 && !this.entAt(x, y) && !this.danger(x, y), 20));
  }

  // ---------------------------------------------------------------- boss patterns
  teleConf(e) { const t = e.teleSet; return Array.isArray(t) ? t[e.bphase - 1] : t; }
  // lowest HP a phased boss can drop to before its next phase starts (floor keeps hp/maxhp <= at, so bossPhase fires)
  phaseFloor(e) { const next = e.isBoss && Array.isArray(e.teleSet) && e.teleSet[e.bphase]; return next ? Math.floor(e.mon.maxhp * next.at) : 0; }
  // returns true when the boss spent its turn on its pattern logic
  bossTurn(e) {
    const m = e.mon;
    if (!e.teleSet) return false;
    if (this.bossPhase(e)) return true;
    if (m.slowT > 0) { m.slowT--; if (!m.slowT) this.step(() => { this.msg(tr(`${m.name}이(가) 본래의 힘을 되찾았다!`, `${m.name} regained its true power!`), COL.red); this.shake = 0.3; }, 0.3); }
    if (e.tele) {
      e.tele.turns--;
      if (e.tele.turns <= 0) { this.unleash(e); return true; }
      this.step(() => this.msg(tr(`${m.name}이(가) 힘을 모으고 있다… (${e.tele.turns}턴 뒤)`, `${m.name} is gathering power... (${e.tele.turns} turns)`), COL.red), 0.15);
      return !e.def.relentless; // relentless bosses keep fighting while the blast charges
    }
    if (e.stagger > 0) {
      e.stagger--;
      this.step(() => this.msg(tr(`${m.name}은(는) 지쳐서 숨을 고르고 있다!`, `${m.name} is worn out and catching its breath!`), COL.green), 0.15);
      return true;
    }
    if (--e.teleCD <= 0) { this.charge(e); return true; }
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
    e.tele = null; e.stagger = 0; e.teleCD = 1;
    if (c.typeTo != null) e.mon.typeOverride = [c.typeTo];
    this.step(() => {
      this.shake = 0.6; sfx('super'); cry(e.mon.sp);
      this.msg(c.msg, COL.red);
      if (c.line) say(lines(c.line));
    }, 0.5);
    for (let i = 0; i < (c.summon || 0); i++) { // minions are weaker than the floor's regular foes
      const [x, y] = this.freeNear(e.x, e.y);
      if (this.entAt(x, y)) continue;
      const f = this.addEnt(new Mon(choice(c.summonSp || this.def.mons), Math.max(5, e.mon.lv - 22)), x, y, 'foe');
      f.summoned = true; f.alert = true;
      this.step(() => this.msg(tr(`${f.mon.name}이(가) 나타났다!`, `${f.mon.name} appeared!`), COL.red), 0.15);
    }
    return true;
  }
  patternTiles(name, e, allies) {
    const R = this.rooms[0], set = new Set();
    const p = (e.teleN || 0) % 2, q = [choice([-1, 1]), choice([-1, 1])];
    const add = (x, y) => { if (x >= R.x && y >= R.y && x < R.x + R.w && y < R.y + R.h && !(x === e.x && y === e.y)) set.add(y * W + x); };
    for (const part of name.split('|')) {
      const P = PATTERNS[part];
      for (let y = R.y; y < R.y + R.h; y++) for (let x = R.x; x < R.x + R.w; x++) {
        const dx = x - e.x, dy = y - e.y;
        if (P.hit(dx, dy, Math.max(Math.abs(dx), Math.abs(dy)), x, y, p, q)) add(x, y);
      }
      if (part === 'target') for (const a of allies) for (const [ox, oy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) add(a.x + ox, a.y + oy);
    }
    return set;
  }
  escapeSteps(a, tiles) {
    if (!tiles.has(a.y * W + a.x)) return 0;
    const R = this.rooms[0];
    let best = 99;
    for (let y = R.y; y < R.y + R.h; y++) for (let x = R.x; x < R.x + R.w; x++) {
      if (!tiles.has(y * W + x) && !(x === this.boss.x && y === this.boss.y)) best = Math.min(best, Math.max(Math.abs(x - a.x), Math.abs(y - a.y)));
    }
    return best;
  }
  charge(e) {
    const T = this.teleConf(e);
    const allies = this.ents.filter((a) => a.alive && a.team === 'ally');
    let pick = null;
    for (const name of shuffle(T.pats.slice())) {
      const tiles = this.patternTiles(name, e, allies);
      const delay = Math.max(...name.split('|').map((n) => PATTERNS[n].delay));
      if (tiles.size && allies.every((a) => this.escapeSteps(a, tiles) <= delay)) { pick = { tiles, delay }; break; }
    }
    if (!pick) pick = { tiles: this.patternTiles('target', e, allies), delay: 1 };
    e.teleN = (e.teleN || 0) + 1;
    e.teleCD = T.every;
    e.tele = { tiles: pick.tiles, turns: pick.delay, name: T.name, dmg: T.dmg * (e.legend ? 1.25 : 1), color: TYPE_COLORS[T.type ?? e.mon.types[0]] };
    e.face = [0, 1];
    this.step(() => { this.msg(tr(`${e.mon.name}의 ${T.name}! 붉은 칸에서 벗어나라!`, `${e.mon.name}'s ${T.name}! Get off the red tiles!`), COL.red); sfx('buff'); this.shake = 0.15; }, 0.3);
  }
  unleash(e) {
    const t = e.tele;
    e.tele = null;
    const hits = this.ents.filter((a) => a.alive && a.team === 'ally' && t.tiles.has(a.y * W + a.x));
    this.step(() => { this.blast = { tiles: t.tiles, t: 0.45 }; this.shake = 0.4; sfx('super'); this.msg(tr(`${t.name}이(가) 쏟아졌다!`, `${t.name} came crashing down!`), COL.red); }, 0.4);
    if (!hits.length) this.step(() => this.msg(tr('모두 피했다! 지금이 기회다!', 'Everyone dodged! Now\'s the chance!'), COL.green), 0.2);
    for (const a of hits) {
      const d = Math.max(1, Math.round(a.mon.maxhp * t.dmg));
      a.mon.hp = Math.max(0, a.mon.hp - d);
      this.step(() => { a.hurt = 0.4; this.pop(a, String(d), '#ff6a4a'); this.msg(tr(`${a.mon.name}은(는) ${t.name}에 휘말렸다! ${d} 데미지!`, `${a.mon.name} was caught in ${t.name}! ${d} damage!`), COL.red); sfx('hit'); }, 0.2);
      if (a.mon.hp <= 0) this.faint(a, e);
    }
    e.stagger = this.teleConf(e).stagger ?? (e.legend ? 1 : 2);
    this.step(() => this.msg(tr(`${e.mon.name}에게 빈틈이 생겼다! 지금 공격하면 1.5배!`, `${e.mon.name} left an opening! Attacks deal 1.5x now!`), COL.green), 0.15);
  }
  moveAnim(e, fx, fy) { e.ax = fx; e.ay = fy; }

  // "second page": the boss gets back up once with a share of its HP (2/3 by default), hits harder and
  // switches to its own, harsher telegraph phases; shiny turns it golden (Arceus), form renames it (Origin Forme)
  reviveBoss(e) {
    const r = e.def.revive, m = e.mon;
    e.revived = true;
    m.hpMul *= r.hp ?? 2 / 3; m.atkMul *= r.atk ?? 1.3; m.hp = m.maxhp;
    m.status = null; m.stages = {}; m.slowT = 0; m.typeOverride = r.typeTo != null ? [r.typeTo] : null;
    if (r.shiny) e.shiny = m.shiny = true;
    if (r.form) Object.defineProperty(m, 'name', { configurable: true, get: () => `${m.data.name} (${r.form})` });
    if (r.cap) e.cap = r.cap;
    e.teleSet = r.tele; e.bphase = 1; e.tele = null; e.stagger = 0; e.teleCD = this.teleConf(e).first ?? 2;
    this.step(() => { this.shake = 0.9; e.reviveT = 1.2; sfx('super'); cry(m.sp); this.msg(r.msg, COL.red); if (r.bgm) playBgm(r.bgm, 0.2); }, 0.9);
    if (r.line) this.step(() => say(lines(r.line)), 0.1);
  }

  // ---------------------------------------------------------------- outcomes
  async bossDefeated(e) {
    const b = e.def, mid = b === this.def.mid;
    e.tele = null;
    playBgm(b.tele ? 'win_poke' : 'win_gym', 0.3);
    await say(lines(b.after || []));
    if (mid) S.flags['mid_' + this.dId] = true;
    if (this.def.legend) S.flags['legend_' + this.dId] = true;
    if (b.wander) S.flags[`wander_${b.sp}_${S.era}`] = true; // met in this era; if it stays behind again, it moves on to the next
    await this.offerRecruit(e.mon, b.join);
    if (!mid) return this.cleared();
    // a mid-boss opens the way deeper into the dungeon
    this.boss = null;
    this.stairs = [e.x, e.y];
    playBgm(this.def.bgm, 0.6);
    this.msg(tr('안쪽으로 이어지는 계단이 나타났다!', 'Stairs leading deeper have appeared!'), COL.blue);
  }
  // a defeated Pokémon may ask to join (always for bosses; RECRUIT_RATE for wild ones)
  offerRecruit(mon, text) {
    if (S.party.length >= 3 && S.roster.length >= ROSTER_MAX) return Promise.resolve();
    const name = DEX.species[mon.sp].name;
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
    this.done = true;
    G.pendingClear = this.dId;
    const bonus = Math.round(this.def.floors * (40 + S.era * 15) / 10) * 10; // clear reward grows with depth and era
    S.money += bonus;
    this.result(tr(`던전 클리어! 클리어 보상 ${bonus}냥`, `Dungeon cleared! Clear reward: ${bonus} nyang`), true);
  }
  failed() {
    if (this.done) return;
    this.done = true;
    const lost = Math.floor(S.money * (0.1 + curve() * 0.2)); // early defeats cost little
    S.money -= lost;
    S.party.forEach((m) => { m.hp = Math.max(1, Math.floor(m.maxhp / 2)); m.status = null; });
    this.result(tr(`쓰러지고 말았다… 엽전 ${lost}냥을 잃었다.`, `You fainted... and lost ${lost} nyang.`), false);
  }
  escape() {
    if (this.done) return;
    this.done = true;
    sfx('warp');
    this.result(tr('탈출 부적의 힘으로 마을로 돌아왔다.', 'The Escape Charm carried you back to town.'), false);
  }
  result(title, ok) {
    this.restoreCrew();
    const items = Object.entries(this.found.items).map(([id, n]) => `${(ITEMS[id] || QITEMS[id]).name}×${n}`).join(', ');
    S.party.forEach((m) => m.restorePP()); // leaving a dungeon, however it ends, refills every move's PP
    const pp = tr('던전을 나오니 기술의 PP가 모두 회복되었다.', 'Back outside, every move\'s PP is restored.');
    say([{ who: 'narr', text: `${title}\n${tr(`얻은 엽전 ${this.found.money}냥`, `Coins earned: ${this.found.money} nyang`)}${items ? ' · ' + items : ''}\n${pp}` }], () => {
      S.party.forEach((m) => { m.stages = {}; if (m.hp <= 0) m.hp = 1; });
      S.night = !S.night;
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
  descend() {
    this.pendingStairs = false;
    if (this.floor >= this.floors) return this.cleared();
    sfx('stairs');
    fadeTo(() => {
      this.floor++;
      this.newFloor();
      this.msg(tr(`${this.floor}층에 도착했다.`, `Reached floor ${this.floor}.`), COL.blue);
      if (this.bossFloor) playBgm(this.bossDef.bgm || 'ba_gym', 0.4);
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
      const L = lines(b.say || []);
      if (b.tele && !S.flags.teleTut) { S.flags.teleTut = true; L.push(...lines(TELE_TUT)); }
      say(L);
      return;
    }
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
  menu() {
    openMenu([
      { label: tr('기술', 'Moves'), fn: () => openMenu(this.player.mon.moves.map((mv, k) => { const d = DEX.moves[mv.id]; return { label: `${'QWER'[k]}. ${d.name}`, right: `PP ${mv.pp}/${d.pp}`, desc: `${DEX.types[d.type]} · ${d.cat === 2 ? tr('변화', 'Status') : (d.cat === 0 ? tr('물리(바로 앞)', 'Physical (front tile)') : tr('특수(직선 6칸)', 'Special (6-tile line)')) + tr(' 위력 ', ' power ') + d.power}${d.target === 4 || d.target === 8 ? tr(' · 주변 전체', ' · all around') : ''}`, fn: () => this.playerAct('move-skill', k) }; }), { title: tr('기술', 'Moves'), desc: true, x: 140, y: 40, w: 220 }) },
      { label: tr('도구', 'Items'), fn: () => itemMenu(this) },
      { label: tr('포켓몬', 'Pokémon'), fn: () => partyMenu({ dungeon: true }) },
      { label: tr('퀘스트', 'Quests'), fn: questMenu },
      { label: tr('발밑 / 쉬기', 'Rest a turn'), fn: () => this.playerAct('wait') },
      { label: tr('설정', 'Settings'), fn: () => settingsMenu() },
      quitItem(true, () => this.restoreCrew()),
      { label: tr('닫기', 'Close') },
    ], { title: tr(`${this.def.name} ${this.floor}층`, `${this.def.name} F${this.floor}`) });
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
    if (this.bg) c.drawImage(this.bg, 0, 0);
    c.fillStyle = '#0b0a10';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!this.seen[y][x]) c.fillRect(x * TILE, y * TILE, TILE, TILE);
    if (this.stairs && this.seen[this.stairs[1]][this.stairs[0]]) this.drawStairs(c, this.stairs[0] * TILE, this.stairs[1] * TILE);
    // telegraphed danger tiles (brighter on the last turn) and the blast flash
    const tele = this.boss?.alive && this.boss.tele;
    if (tele) {
      const a = (tele.turns <= 1 ? 0.42 : 0.24) + 0.14 * Math.sin(G.time * (tele.turns <= 1 ? 14 : 7));
      for (const k of tele.tiles) {
        const x = (k % W) * TILE, y = Math.floor(k / W) * TILE;
        c.fillStyle = `rgba(255,40,24,${a})`; c.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
        c.fillStyle = 'rgba(255,200,160,0.55)'; c.fillRect(x + 1, y + 1, TILE - 2, 1); c.fillRect(x + 1, y + TILE - 2, TILE - 2, 1);
      }
    }
    if (this.blast) {
      c.fillStyle = `rgba(255,246,220,${Math.min(0.85, this.blast.t * 2)})`;
      for (const k of this.blast.tiles) c.fillRect((k % W) * TILE, Math.floor(k / W) * TILE, TILE, TILE);
    }
    for (const it of this.items) if (this.vis[it.y][it.x]) this.drawItem(c, it);
    const ents = this.ents.filter((e) => e.shown && (e.team === 'ally' || this.vis[e.y][e.x])).sort((a, b) => a.vy - b.vy);
    for (const e of ents) {
      const pmd = hasPmdSprite(e.mon.sp);
      let ox = 0, oy = 0;
      if (e.lunge && !pmd) { const f = Math.sin((e.lunge / 0.18) * Math.PI) * 6; ox = e.face[0] * f; oy = e.face[1] * f; }
      const x = e.vx * TILE + 12 + ox, y = e.vy * TILE + TILE + oy;
      // PMD animation: attack lunge, hurt recoil, sleeping, otherwise the walk cycle (faster while moving)
      let anim = 'walk', t;
      if (e.atkT != null && G.time - e.atkT < 0.45) { anim = 'attack'; t = G.time - e.atkT; }
      else if (e.hurt > 0) { anim = 'hurt'; t = 0.3 - e.hurt; }
      else if (e.mon.status === 'slp') anim = 'sleep';
      const moving = Math.abs(e.vx - e.x) + Math.abs(e.vy - e.y) > 0.04;
      if (e.revived) { // second form: a pulsing aura in the form's colour (white flash while it rises again)
        const r = e.def.revive, a = 0.28 + Math.sin(G.time * 4) * 0.1 + (e.reviveT > 0 ? e.reviveT * 0.5 : 0);
        const gr = c.createRadialGradient(x, y - 18, 4, x, y - 18, 34);
        gr.addColorStop(0, e.reviveT > 0 ? '#fff' : r.aura || '#ffd84a'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        c.save(); c.globalAlpha = Math.min(1, a); c.fillStyle = gr; c.fillRect(x - 36, y - 54, 72, 72); c.restore();
        if (e.reviveT > 0) e.reviveT = Math.max(0, e.reviveT - G.dt);
      }
      drawMon(c, e.mon.sp, e.shiny, x, y, { face: e.face, facing: faceName(e.face) || e.lastF || 'left', anim, t, moving, hurt: e.hurt > 0, alpha: e.fade ?? 1, phase: e.phase, scale: e.isBoss ? (pmd ? 1.3 : e.revived ? 1.9 : 1.6) : 1 });
      if (faceName(e.face)) e.lastF = faceName(e.face);
      if (e.team === 'ally') { c.fillStyle = e.isPlayer ? '#ffd84a' : '#7fd0ff'; c.fillRect(Math.round(x) - 2, Math.round(y) - 36, 4, 3); }
      const gslot = e.team === 'ally' && NET.role === 'host' ? S.party.indexOf(e.mon) : -1;
      if (gslot > 0 && NET.guestFor(gslot)) { // co-op: player tag, pulsing while that player is to move
        const my = Math.round(y) - 46 + (this.waitGuest?.m === e ? Math.sin(G.time * 8) * 2 : 0);
        c.fillStyle = this.waitGuest?.m === e ? '#ff8a3a' : '#2f5d8a'; c.fillRect(Math.round(x) - 8, my, 16, 9);
        c.fillStyle = '#fff'; c.font = '7px Galmuri9'; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText(`P${gslot + 1}`, Math.round(x), my + 1);
      }
      if (e.team === 'npc') { const by = Math.round(y) - 42 + Math.sin(G.time * 5) * 2; c.fillStyle = '#1a1010'; c.fillRect(Math.round(x) - 4, by - 1, 8, 10); c.fillStyle = COL.blue; c.fillRect(Math.round(x) - 3, by, 6, 8); c.fillStyle = '#fff'; c.fillRect(Math.round(x) - 1, by + 1, 2, 4); c.fillRect(Math.round(x) - 1, by + 6, 2, 1); }
      if (e.team === 'foe' && !e.isBoss && e.mon.hp < e.mon.maxhp) { c.fillStyle = '#000'; c.fillRect(Math.round(x) - 9, Math.round(y) + 1, 18, 3); c.fillStyle = COL.hpCrit; c.fillRect(Math.round(x) - 8, Math.round(y) + 2, Math.round(16 * e.mon.hp / e.mon.maxhp), 1); }
      if (e.mon.status) { c.fillStyle = { psn: '#a04ad0', brn: '#e0602a', par: '#e0c020', slp: '#8aa0c0', frz: '#7fd8f0' }[e.mon.status]; c.fillRect(Math.round(x) + 8, Math.round(y) - 30, 4, 4); }
    }
    if (this.beam) {
      const b = this.beam, f = 1 - b.t / 0.25;
      c.fillStyle = b.color;
      for (let i = 1; i <= 6; i++) { const k = i * f * 1.2; if (k > 6) break; c.fillRect(Math.round((b.from.x + b.dir[0] * k) * TILE + 9), Math.round((b.from.y + b.dir[1] * k) * TILE + 9), 6, 6); }
    }
    if (this.flash) { const e = this.flash.e; c.strokeStyle = this.flash.color; c.lineWidth = 2; c.beginPath(); c.arc(e.vx * TILE + 12, e.vy * TILE + 10, 16 * (1 - this.flash.t / 0.2) + 4, 0, Math.PI * 2); c.stroke(); }
    c.restore();
    // fog (seen but not visible)
    c.fillStyle = 'rgba(5,4,10,0.55)';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (this.seen[y][x] && !this.vis[y][x]) c.fillRect(x * TILE - camX, y * TILE - camY, TILE, TILE);
    if (this.def.tint) { c.fillStyle = this.def.tint; c.fillRect(0, 0, VW, VH); }
    this.camX = camX; this.camY = camY;
  }
  // whole floor painted once with the dungeon's PMD chunk set (walls, floor, ponds; naval floors are open water)
  prerender() {
    const set = tileSet(this.def.tiles);
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
  drawStairs(c, x, y) {
    c.fillStyle = '#2a2420'; c.fillRect(x + 3, y + 3, 18, 18);
    for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? '#8c7a64' : '#b29e82'; c.fillRect(x + 4 + i * 2, y + 5 + i * 4, 16 - i * 4, 3); }
    if (Math.floor(G.time * 2) % 2) { c.fillStyle = '#fff4c0'; c.fillRect(x + 11, y + 1, 2, 2); }
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
    ui.panel(6, 6, 168, 18 + allies.length * 22);
    ui.text(tr(`${this.def.name}  ${this.floor}층`, `${this.def.name}  F${this.floor}`), 12, 12, { size: 9, color: COL.red, bold: true }); // below the dancheong stripe
    allies.forEach((e, i) => {
      const m = e.mon, y = 24 + i * 22;
      if (e.isPlayer) ui.rect(8, y + 1, 3, 8, '#e0a020');
      ui.text(`${m.name}`, 12, y, { size: 9, color: e.alive ? (e.isPlayer ? COL.red : COL.ink) : '#999' });
      ui.text(`Lv${m.lv}`, 82, y, { size: 9, color: COL.ink2 });
      ui.text(`${m.hp}/${m.maxhp}`, 168, y, { size: 9, align: 'right' });
      ui.bar(12, y + 11, 156, 5, m.hp, m.maxhp);
    });
    // boss bar
    if (this.boss && this.boss.alive) {
      const b = this.boss, m = b.mon, bx = VW / 2 - 52; // right of the party panel
      ui.panel(bx, 6, 180, 24, { accent: false, fill: b.revived ? '#4a3810' : '#3a1c1c' });
      ui.text(`${b.revived ? '★ ' : ''}${m.name}  Lv${m.lv}`, bx + 8, 9, { size: 9, color: b.revived ? '#ffe27a' : '#ffe0d0', bold: true });
      if (Array.isArray(b.teleSet)) for (let i = 0; i < b.teleSet.length; i++) ui.rect(bx + 150 + i * 9 - b.teleSet.length * 9 + 18, 10, 6, 6, i < b.bphase ? '#ff6a4a' : '#6a4a40');
      ui.bar(bx + 8, 21, 164, 5, m.hp, m.maxhp);
      const note = b.tele ? [tr(`[!] ${b.tele.name} — 붉은 칸 밖으로! ${b.tele.turns}턴 뒤`, `[!] ${b.tele.name} — leave the red tiles! ${b.tele.turns} turn(s)`), b.tele.turns <= 1 ? '#ff5a3a' : '#ffb070']
        : b.stagger > 0 ? [tr(`빈틈! 받는 피해 1.5배 (${b.stagger}턴)`, `Opening! Takes 1.5x damage (${b.stagger})`), '#8ff0a0']
          : m.slowT > 0 ? [tr(`아직 제 힘을 내지 못한다 (${m.slowT}턴)`, `Not at full power yet (${m.slowT})`), '#c8d8ff'] : null;
      if (note) {
        const w = ui.measure(note[0], 9) + 16, nx = Math.min(bx + 90, VW - 6 - w / 2);
        ui.panel(nx - w / 2, 32, w, 16, { accent: false, fill: '#2a1414' });
        ui.text(note[0], nx, 35, { size: 9, align: 'center', color: note[1], bold: true });
      }
    }
    // moves
    const mv = this.player.mon.moves;
    const bx = VW - 152, by = VH - 12 - mv.length * 14;
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
}
const STATS_OF = (d) => ({ 10: 'atk', 11: 'def', 12: 'spe', 13: 'spa', 14: 'spd', 50: 'atk', 51: 'def', 52: 'spe', 53: 'spa', 54: 'spd' })[d.effect] || 'atk';
