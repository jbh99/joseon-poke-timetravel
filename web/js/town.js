// Hub town for the current era: generated tile map + Blender-rendered buildings + NPCs.
import { G, VW, VH, TILE, img, ready, drawSeen, input, ui, COL, say, openMenu, toast, fade, fadeTo, setScene, clamp, choice, prefs, touchUI } from './core.js';
import { playBgm, sfx, cry, jingle } from './audio.js';
import { S, DEX, save, ITEMS, SHOP, addItem, takeItem, countItem, itemDef, FORMES, FORME_NORMAL, TMS, tmPrice, tmFits, moveUsable } from './game.js';
import { ERAS, QITEMS, CELEBI } from './content.js';
import { tr } from './i18n.js';
import { hasPmdSprite, drawPmd, pmdDir, tileSet, paintTerrain, iconPath } from './pmd.js';
import { questMenu, partyMenu, rosterMenu, itemMenu, trackerText, onTalk, boardMenu, eraComplete, mainStep, settingsMenu, quitItem, sideState, spySuspects, spyDue, spyRaid, giveMons, forgetMenu, moveInfo } from './quests.js';

export let BLD = {};
export function setBuildings(b) { BLD = b; }
// town and floor layouts rebuilt from Pearl's field data (tools/pearl_maps.py → data/pearl.json)
export let PEARL = { towns: {}, floors: {} };
export function setPearl(p) { PEARL = p; }
// wandering villagers per town (rotates by era) and the travel tips they share
const TOWNFOLK = [[16, 19, 133, 175], [52, 25, 39, 183], [104, 54, 133, 216], [300, 263, 175, 39], [177, 194, 25, 52]];
const FOLK_TIPS = () => tr([
  '던전에 갈 땐 오랭열매를 꼭 챙겨. 장사꾼이 팔고 있어!', '주막에서 쉬면 기록이 남고, 동료 명부도 볼 수 있어.',
  '물 위에서 싸우는 곳엔 물 타입 포켓몬만 배에 오를 수 있대. 명부에 물 타입 동료를 모아 둬!', '보스가 큰 기술을 쓴 직후가 기회래. 그때 때리면 1.5배!',
  '쓰러뜨린 야생 포켓몬이 동료가 되고 싶어 할 때가 꽤 많대.', '전설의 포켓몬은 이기면 꼭 동료가 되어 준대!',
  '명부에서 쉬는 동료들도 같이 훈련해서 경험치를 반씩 받는대.', '세계 지도에는 마을이 두 개인 시대도 있어. 다른 마을도 들러 봐!',
], [
  'Always pack Oran Berries before a dungeon. The merchant sells them!', 'Resting at the inn saves your journey, and the companion roster is there too.',
  'Where the fighting is on water, only Water-type Pokémon can board. Keep some Water types in your roster!', 'Right after a boss uses a big move is your chance. Hits deal 1.5x!',
  'Defeated wild Pokémon quite often want to join you.', 'Legendary Pokémon always join you once you win!',
  'Companions resting in the roster train too and get half the experience.', 'Some eras have two towns on the world map. Go visit the other one!',
]);

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const BG_CACHE = new Map(); // painted town grounds, most recently used last (Town.prerender)
// whether a building or prop can show in the view at (vx, vy) (pixels, town coordinates). Images reach at most about
// eight tiles beside and above their footprint (the palace is 199x185), so the rest is skipped instead of drawn off-screen.
export const objInView = (o, vx, vy) => (o.tx + o.fw + 9) * TILE >= vx && (o.tx - 9) * TILE <= vx + VW && (o.ty + o.fd + 1) * TILE >= vy && (o.ty + o.fd - 9) * TILE <= vy + VH;

export function drawMon(c, sp, shiny, x, y, o = {}) {
  // x, y = tile-centre bottom in pixels
  if (!o.noShadow) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(x, y - 5, 8 * (o.scale || 1), 3 * (o.scale || 1), 0, 0, Math.PI * 2); c.fill(); }
  // Gen 1-3: PMD Blue Rescue Team sprites (8 directions); Gen 4: the Pearl box icon
  if (hasPmdSprite(sp)) {
    const dir = o.dir ?? pmdDir(o.face || o.facing || 'down');
    const anim = o.anim || (o.hurt ? 'hurt' : 'walk');
    const t = o.t ?? G.time * (o.moving ? 1 : 0.55) + (o.phase || 0);
    drawPmd(c, sp, shiny, x, y - 5 + (o.hurt && anim !== 'hurt' ? Math.sin(G.time * 40) * 2 : 0), { dir, anim, t, alpha: o.alpha, scale: o.scale });
    if (shiny) sparkle(c, x, y, o);
    return;
  }
  const im = img(iconPath(sp, shiny));
  if (!ready(im)) return;
  if (o.scale && o.scale !== 1) { c.save(); c.translate(x, y); c.scale(o.scale, o.scale); drawMon(c, sp, shiny, 0, 0, { ...o, scale: 1, noShadow: true }); c.restore(); return; }
  const frame = Math.floor(G.time * (o.moving ? 8 : 2.5) + (o.phase || 0)) % 2;
  const flip = o.facing === 'right';
  const bob = o.hurt ? Math.sin(G.time * 40) * 2 : 0;
  c.save();
  if (o.alpha != null) c.globalAlpha = o.alpha;
  if (flip) { c.translate(Math.round(x + 16 + bob), Math.round(y - 30)); c.scale(-1, 1); c.drawImage(im, 0, frame * 32, 32, 32, 0, 0, 32, 32); }
  else c.drawImage(im, 0, frame * 32, 32, 32, Math.round(x - 16 + bob), Math.round(y - 30), 32, 32);
  c.restore();
  if (shiny) sparkle(c, x, y, o);
}
function sparkle(c, x, y, o) {
  if (Math.floor(G.time * 2 + (o.phase || 0)) % 3 !== 0) return;
  c.fillStyle = '#fff8c0';
  const sx = x + 8 * Math.sin(G.time * 3 + (o.phase || 0)), sy = y - 26 + 4 * Math.cos(G.time * 4);
  c.fillRect(Math.round(sx), Math.round(sy) - 2, 1, 5); c.fillRect(Math.round(sx) - 2, Math.round(sy), 5, 1);
}

// terrain classes; the art is PMD chunk sets: `set` paints ground / border (wall) / sea, road and plaza use other sets' floors
const BIOME = {
  spring: { set: 63, road: 7, plaza: 37, tint: null },
  autumn: { set: 28, road: 7, plaza: 37, tint: null },
  snow: { set: 19, road: 18, plaza: 18, tint: null },
  coast: { set: 63, road: 7, plaza: 37, tint: null },
  modern: { set: 40, road: 42, plaza: 7, tint: null },
  camp: { set: 51, road: 50, plaza: 50, tint: 'rgba(200,120,40,0.06)' },
  ancient: { set: 41, road: 50, plaza: 37, tint: null },
  war: { set: 29, road: 40, plaza: 42, tint: 'rgba(60,50,40,0.10)' },
};
for (const b of Object.values(BIOME)) Object.assign(b, { ground: 'ground', road0: b.road, road: 'road', plaza0: b.plaza, plaza: 'plaza', border: 'border' });
export const townSets = () => [...new Set(Object.values(BIOME).flatMap((b) => [b.set, b.road0, b.plaza0]))];

export class Town {
  // kind 1: the era's main town (time gate, notice board, a bigger map); kind 2: its second town, if any
  // o.def / o.battle: a town built as a battlefield for Dungeon (no people, no Time Gate, not the town you stand in)
  constructor(kind = S.townKind || 1, o = {}) {
    this.era = ERAS[S.era];
    this.kind = kind === 2 && this.era.town2 ? 2 : 1;
    this.def = o.def || (this.kind === 2 ? this.era.town2 : this.era.town);
    this.battle = !!o.battle;
    if (!this.battle) S.townKind = this.kind;
    this.layout = (this.def.pearl && PEARL.towns[this.def.pearl]) || null;
    if (this.layout) { this.W = this.layout.w; this.H = this.layout.h; this.OX = 0; }
    else {
      this.W = this.kind === 1 ? 52 : 40; this.H = this.kind === 1 ? 32 : 28;
      this.OX = this.kind === 1 ? 6 : 0; // content coordinates were laid out for the 40-wide map
    }
    this.build();
    const coast = this.def.biome === 'coast';
    if (this.layout) { [this.px, this.py] = this.start; this.face = this.startFace; }
    else { [this.px, this.py] = coast ? [this.W - 3, 17] : [this.OX + 19, this.H - 3]; this.face = coast ? 'left' : 'up'; }
    const restored = !!S.townPos;
    if (S.townPos) { [this.px, this.py] = S.townPos; S.townPos = null; }
    this.vx = this.px; this.vy = this.py; this.moving = false; this.moveT = 0;
    this.trail = [[this.px, this.py + 1]];
    const [qx, qy] = this.layout && !restored ? this.behind : [this.px, Math.min(this.H - 1, this.py + 1)];
    this.partner = { x: qx, y: qy, fx: qx, fy: qy, vx: qx, vy: qy, face: 'up' };
    this.mate = null; // third follower (recruit), created on demand in update()
    if (this.def.police && !this.battle) this.posting();
  }
  // Occupied towns (1910-1945): a constable walks up to you once each time you come in and takes 50 nyang
  // (whatever is left if you have less). It gives up chasing after a while and calls out from where it stands.
  posting() {
    const [x, y] = this.layout ? [Math.round((this.px + (this.gate?.tx ?? this.W / 2)) / 2), Math.round((this.py + (this.gate?.ty ?? this.H / 2)) / 2)] : [this.px, this.py - 6];
    const npc = this.addNpc({ id: 'police', sp: 262, role: 'police', x: 0, y: 0 }, () => tr('순사 그라에나', 'Constable Mightyena'), [x, y]);
    this.police = { npc, t: 1.2, steps: 0, done: false };
  }
  policeStep() {
    const P = this.police, n = P.npc;
    if (Math.abs(n.x - this.px) + Math.abs(n.y - this.py) <= 1 || ++P.steps > 30) return this.policeToll();
    // one tile along the shortest way to the player (around people and the followers)
    const busy = (x, y) => this.blocked(x, y) || (x === this.partner.x && y === this.partner.y) || (this.mate && x === this.mate.x && y === this.mate.y);
    const prev = new Map([[n.y * this.W + n.x, null]]), q = [[n.x, n.y]];
    let goal = null;
    for (let k = 0; k < q.length && k < 3000 && !goal; k++) {
      const [x, y] = q[k];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = x + dx, b = y + dy, key = b * this.W + a;
        if (prev.has(key)) continue;
        if (a === this.px && b === this.py) { goal = [x, y]; break; }
        if (busy(a, b)) continue;
        prev.set(key, [x, y]); q.push([a, b]);
      }
    }
    if (!goal || (goal[0] === n.x && goal[1] === n.y)) return;
    let s = goal;
    while (prev.get(s[1] * this.W + s[0]) && !(prev.get(s[1] * this.W + s[0])[0] === n.x && prev.get(s[1] * this.W + s[0])[1] === n.y)) s = prev.get(s[1] * this.W + s[0]);
    n.face = s[0] > n.x ? 'right' : s[0] < n.x ? 'left' : n.face;
    n.x = s[0]; n.y = s[1];
  }
  policeToll() {
    const P = this.police, n = P.npc;
    P.done = true;
    n.face = this.px > n.x ? 'right' : 'left';
    n.wander = 3; n.hx = n.x; n.hy = n.y;
    const take = Math.min(50, S.money);
    S.money -= take;
    sfx(take ? 'cancel' : 'bump');
    say([{ who: 262, name: n.name, text: take ? tr(`거기 서! 검문이다. …세금이 밀렸군. ${take}냥 내놔.`, `Halt! Inspection. ...Your taxes are overdue. Hand over ${take} nyang.`) : tr('거기 서! 검문이다. …빈털터리로군. 쳇, 가 봐.', 'Halt! Inspection. ...Flat broke, are you. Tch, get lost.') },
      ...(take ? [{ who: 'narr', text: tr(`순사가 엽전 ${take}냥을 빼앗아 갔다…`, `The constable took ${take} nyang...`) }] : [])]);
  }
  enter() {
    const t = this.def;
    playBgm(S.night ? t.bgmN : t.bgm);
    setTimeout(() => { if (G.scene === this && spyDue()) spyRaid(this); }, 600);
    G.dialogSpeaker = (L) => { if (typeof L?.who === 'number' && L.who !== this._lastCry) { cry(L.who); this._lastCry = L.who; } };
  }
  exit() { G.dialogSpeaker = null; }
  relang() { for (const n of this.npcs) n.name = n.nameFn(); }

  build() {
    if (this.layout) return this.buildPearl();
    const era = this.era, t = this.def, B = BIOME[t.biome] || BIOME.spring;
    const MW = this.W, MH = this.H, OX = this.OX, main = this.kind === 1;
    this.B = B;
    const R = rng(era.id * 7919 + this.kind * 131);
    const ground = [], solid = [];
    for (let y = 0; y < MH; y++) { ground.push(new Array(MW).fill(B.ground)); solid.push(new Array(MW).fill(false)); }
    const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < MW && y < MH) ground[y][x] = v; };
    const coast = t.biome === 'coast';
    const sea = MH - 7; // first sea row on the coast
    // border forest
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      if (x < 2 || x >= MW - 2 || y < 2 || y >= MH - 1) { ground[y][x] = B.border; solid[y][x] = true; }
    }
    // roads & plaza
    const cx = OX + 19; // vertical road (2 wide) through the plaza
    for (let y = 9; y <= 13; y++) for (let x = OX + 12; x <= OX + 27; x++) set(x, y, B.plaza);
    for (let y = 7; y < MH; y++) for (let x = cx; x <= cx + 1; x++) set(x, y, B.road);
    for (let x = 2; x < MW - 2; x++) { set(x, 17, B.road); set(x, 18, B.road); }
    this.exitTiles = [];
    if (coast) {
      for (let y = sea; y < MH; y++) for (let x = 0; x < MW; x++) { ground[y][x] = y === sea ? 'ground' : 'water'; solid[y][x] = y > sea; }
      for (let x = MW - 2; x < MW; x++) { set(x, 17, B.road); set(x, 18, B.road); solid[17][x] = solid[18][x] = false; }
      this.exitTiles = [[MW - 1, 17], [MW - 1, 18]];
    } else {
      for (let y = MH - 1; y < MH; y++) for (let x = cx; x <= cx + 1; x++) { set(x, y, B.road); solid[y][x] = false; }
      this.exitTiles = [[cx, MH - 1], [cx + 1, MH - 1]];
    }
    this.ground = ground; this.solid = solid;
    this.objs = []; this.inter = new Map();
    const free = (x, y, w, h) => {
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i < 2 || j < 2 || i >= MW - 2 || j >= MH - 1 || solid[j][i] || ground[j][i] === B.road || ground[j][i] === B.plaza) return false;
      return true;
    };
    const place = (name, tx, ty, kind = 'house') => this.place(name, tx, ty, kind);
    // landmark
    if (t.landmark && BLD[t.landmark]) {
      const m = BLD[t.landmark];
      const fw = Math.ceil(m.fw), fd = Math.ceil(m.fd);
      place(t.landmark, cx + 1 - Math.ceil(fw / 2), 8 - fd + 1, 'landmark');
    }
    if (t.walls) { // fortress wall line along the top edge
      for (let x = 2; x < MW - 2; x++) {
        if (x >= OX + 15 && x <= OX + 24) continue;
        const o = { kind: 'deco', name: 'wall', img: `bld/${t.biome === 'snow' ? 'wallseg_snow' : 'wallseg'}.png`, tx: x, ty: 2, fw: 1, fd: 1 };
        const m = BLD.wallseg; o.x = x * TILE - m.ax; o.y = 3 * TILE - m.ay; o.base = 3 * TILE;
        solid[2][x] = true; this.objs.push(o);
      }
    }
    // inn and market (fixed positions)
    this.inn = place(t.biome === 'camp' || t.biome === 'war' ? 'tent' : t.biome === 'snow' ? 'hanok_snow' : 'choga', 3, 10, 'inn');
    place('stall', OX + 13, 14, 'deco');
    place('stall', OX + 25, 14, 'deco');
    if (main) this.placeProp('board', OX + 17, 10, 1, 1, 'board');
    this.placeProp('lantern', OX + 8, 13, 1, 1, 'deco');
    // houses: the main town has a second ring of lots on its wider map
    const slots = (main
      ? [[3, 3], [9, 3], [33, 3], [39, 3], [45, 3], [38, 10], [44, 10], [3, 21], [9, 21], [15, 21], [31, 21], [37, 21], [43, 21], [9, 26], [37, 26], [43, 26]]
      : [[3, 3], [9, 3], [27, 3], [33, 3], [32, 10], [3, 21], [9, 21], [25, 21], [31, 21]]).filter(([, y]) => !(coast && y + 3 > sea));
    const houses = t.houses.concat(main ? t.houses : []);
    houses.forEach((h, i) => { const s = slots[i]; if (s && free(s[0], s[1], 5, 3)) place(h, s[0], s[1], 'house'); });
    // ships on the sea
    if (t.ships) {
      const spots = [[5, sea + 2], [OX + 24, sea + 2], [OX + 16, sea + 4]];
      t.ships.forEach((sname, i) => { const s = spots[i]; if (s && BLD[sname]) { const o = place(sname, s[0], s[1], 'ship'); o.bob = i; } });
    }
    // tram on the road (modern)
    if (t.props.includes('tram')) this.placeProp('tram', OX + 29, 17, 3, 1, 'deco');
    // scattered props
    const deco = t.props.filter((p) => p !== 'tram' && p !== 'board');
    let tries = 0, placed = 0;
    while (placed < (main ? 40 : 24) && tries++ < 1400) {
      const x = 2 + Math.floor(R() * (MW - 4)), y = 3 + Math.floor(R() * (MH - 5));
      if (!free(x, y, 1, 1)) continue;
      let near = false;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const g = ground[y + j]?.[x + i]; if (g === B.road || g === B.plaza || solid[y + j]?.[x + i]) near = true; }
      if (near && R() < 0.85) continue;
      this.placeProp(deco[placed % deco.length], x, y);
      placed++;
    }
    // time gate (2x2 at plaza east) only in the main town
    this.gate = main ? { tx: OX + 23, ty: 10 } : null;
    // NPCs (+ fixed role NPCs)
    this.npcs = [];
    (main ? era.npcs : t.npcs || []).forEach((n) => this.addNpc(n));
    if (main) spySuspects().forEach((n) => this.addNpc(n));
    const r = this.roles();
    this.addNpc(r.inn, r.innName);
    this.addNpc(r.shop, r.shopName);
    this.addNpc(r.tm, r.tmName);
    if (main) this.addNpc(r.crier, r.crierName);
    // a few villagers who wander and share travel tips
    r.folk.forEach((n) => this.addNpc(n));
    this.prerender();
  }
  // the innkeeper, merchant, notice-board crier and wandering villagers every town has (by era)
  roles() {
    const era = this.era, main = this.kind === 1;
    const j = S.era - 6; // Joseon-era chapters keep their old innkeepers and merchants
    const inn = era.inn ?? (j < 4 ? 113 : j < 8 ? 440 : 242), shop = era.shop ?? (j < 3 ? 52 : j < 6 ? 431 : 53);
    const folk = TOWNFOLK[(era.id + this.kind) % TOWNFOLK.length];
    return {
      inn: { id: 'innkeeper', sp: inn, x: 6, y: 13, role: 'inn' }, innName: () => tr('주막 ', 'Innkeeper ') + DEX.species[inn].name,
      shop: { id: 'merchant', sp: shop, x: 15, y: 16, role: 'shop' }, shopName: () => tr('장사꾼 ', 'Merchant ') + DEX.species[shop].name,
      crier: { id: 'crier', sp: 441, x: 16, y: 11, role: 'board' }, crierName: () => tr('방꾼 페라페', 'Crier Chatot'),
      // the first villager deals in TMs (tmMenu), standing by the merchant under a purple disc sign
      tm: { id: 'tmdealer', sp: folk[0], x: 18, y: 16, role: 'tm' }, tmName: () => tr('기술머신 상인 ', 'TM Dealer ') + DEX.species[folk[0]].name,
      folk: folk.slice(1, main ? 4 : 2).map((sp, j) => ({ id: `folk${j + 1}`, sp, x: [31, 11, 28][j], y: [20, 24, 8][j], wander: 3, folk: j + 1 })),
    };
  }
  // names are functions of the current language so a live language switch can relabel them; `at` overrides the
  // content position (Pearl towns stand their people where Pearl's own NPCs stood)
  addNpc(n, nameFn, at) {
    if (n.when && !n.when()) return null;
    const [x, y] = at ? this.nearestFree(...at) : this.nearestFree(n.x + this.OX, n.y);
    const npc = { ...n, x, y, vx: x, vy: y, hx: x, hy: y, face: 'left', t: Math.random() * 3, phase: Math.random() * 3 };
    npc.nameFn = nameFn || (() => (/\s/.test(n.name || '') ? n.name : DEX.species[n.sp].name));
    npc.name = npc.nameFn();
    this.npcs.push(npc);
    return npc;
  }
  // a Blender building: its footprint turns solid, and the tile in front of its middle is where it is talked to
  place(name, tx, ty, kind = 'house') {
    const m = BLD[name];
    if (!m) return this.placeProp(name, tx, ty, 2, 2, kind);
    const fw = Math.ceil(m.fw), fd = Math.ceil(m.fd);
    for (let j = ty; j < ty + fd; j++) for (let i = tx; i < tx + fw; i++) if (j >= 0 && i >= 0 && j < this.H && i < this.W) this.solid[j][i] = true;
    const o = { kind, name, tx, ty, fw, fd, img: `bld/${name}.png`, x: tx * TILE - m.ax, y: (ty + m.fd) * TILE - m.ay, base: (ty + fd) * TILE };
    this.objs.push(o);
    if (kind !== 'deco') this.inter.set((ty + fd) * this.W + tx + Math.floor(fw / 2), o);
    return o;
  }
  placeProp(name, tx, ty, w = 1, h = 1, kind = 'deco') {
    for (let j = ty; j < ty + h; j++) for (let i = tx; i < tx + w; i++) if (j >= 0 && i >= 0 && j < this.H && i < this.W) this.solid[j][i] = true;
    const o = { kind, name, tx, ty, fw: w, fd: h, img: `prop/${name}.png`, prop: true, base: (ty + h) * TILE };
    this.objs.push(o);
    if (kind !== 'deco') this.inter.set((ty + h) * this.W + tx + Math.floor(w / 2), o);
    return o;
  }

  // A town rebuilt from a Pearl map (data/pearl.json): its walkable shape, water and blocked masses come from the
  // ROM's movement grid. Our buildings stand on its building lots (Pokémon Center → inn, Mart → merchant's house,
  // Gym → landmark, the rest by size), its route-gate doors are the ways out, roads run from every door to the main
  // exit, a plaza rings the Time Gate, and the era's people stand where Pearl's own NPCs stood.
  buildPearl() {
    const L = this.layout, era = this.era, t = this.def, B = BIOME[t.biome] || BIOME.spring, main = this.kind === 1;
    const MW = this.W, MH = this.H, R = rng(era.id * 7919 + this.kind * 131);
    this.B = B;
    const WALK = '.,*i=';
    this.ground = L.rows.map((row) => [...row].map((ch) => (ch === '~' ? 'water' : ch === '=' ? B.road : WALK.includes(ch) ? B.ground : B.border)));
    this.solid = L.rows.map((row) => [...row].map((ch) => !WALK.includes(ch)));
    this.objs = []; this.inter = new Map(); this.npcs = [];
    const ground = this.ground, solid = this.solid;
    const walk = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH && !solid[y][x];
    const inBox = (x, y, b, m = 0) => x >= b[0] - m && x < b[0] + b[2] + m && y >= b[1] - m && y < b[1] + b[3] + m;
    const front = (x, y) => [[0, 1], [0, -1], [-1, 0], [1, 0]].map(([dx, dy]) => [x + dx, y + dy]).find(([a, b]) => walk(a, b)) || [x, y];
    // ways out: route-gate doors (or the tile in front of a blocked one); the southernmost is where you arrive
    const isGate = (d) => d[2] === 'gate' || L.blds.some((b) => b[4] === 'gate' && inBox(d[0], d[1], b, 1));
    this.exitTiles = L.doors.filter(isGate).map(([x, y]) => (walk(x, y) ? [x, y] : front(x, y)));
    if (!this.exitTiles.length) { // no gate: the walkable edge tiles
      for (let x = 0; x < MW; x++) for (const y of [0, MH - 1]) if (walk(x, y)) this.exitTiles.push([x, y]);
      for (let y = 0; y < MH; y++) for (const x of [0, MW - 1]) if (walk(x, y)) this.exitTiles.push([x, y]);
    }
    const isExit = (x, y) => this.exitTiles.some(([a, b]) => a === x && b === y);
    const mainExit = this.exitTiles.slice().sort((p, q) => q[1] - p[1] || p[0] - q[0])[0];
    const inside = (x, y) => [[0, -1], [-1, 0], [1, 0], [0, 1]].map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => walk(a, b) && !isExit(a, b));
    const [sx, sy] = inside(...mainExit)[0] || mainExit;
    this.start = [sx, sy];
    this.startFace = sy < mainExit[1] ? 'up' : sy > mainExit[1] ? 'down' : sx < mainExit[0] ? 'left' : 'right';
    this.behind = inside(sx, sy).find(([a, b]) => !(a === sx && b === sy)) || [sx, sy];
    // buildings: the biggest of ours that fits each lot, bottom-aligned on it; the rest of a lot stays a hedge
    const modern = ['modern', 'war', 'camp'].includes(t.biome);
    const houses = t.houses.length ? t.houses : ['hanok'];
    const innModel = t.biome === 'camp' || t.biome === 'war' ? 'tent' : t.biome === 'snow' ? 'hanok_snow' : 'choga';
    const fits = (names, w, d) => {
      const c = [...new Set(names)].filter((n) => BLD[n]).map((n) => [n, Math.ceil(BLD[n].fw), Math.ceil(BLD[n].fd)]);
      const ok = c.filter(([, fw, fd]) => fw <= w && fd <= d).sort((p, q) => q[1] * q[2] - p[1] * p[2]);
      return ok[0]?.[0] ?? c.sort((p, q) => p[1] * p[2] - q[1] * q[2])[0]?.[0];
    };
    const deco = t.props.filter((p) => p !== 'tram' && p !== 'board');
    let hk = 0, dk = 0;
    this.lots = {};
    for (const b of L.blds) {
      const [x, y, w, d, kind] = b;
      if (kind === 'object' || kind === 'sign') { // decorations: one prop in the middle, the rest of the box walkable again
        for (let j = y; j < y + d; j++) for (let i = x; i < x + w; i++) if (ground[j]?.[i] === B.border && L.rows[j][i] === 'B') { ground[j][i] = B.ground; solid[j][i] = false; }
        const px = x + Math.floor((w - 1) / 2), py = y + d - 1;
        if (walk(px, py) && deco.length && !isExit(px, py)) this.placeProp(deco[dk++ % deco.length], px, py);
        continue;
      }
      let name, role = 'house';
      if (kind === 'pc') { name = innModel; role = 'inn'; }
      else if (kind === 'gym') { name = fits([t.landmark, ...(modern ? ['western', 'hanok_hall'] : ['palace', 'hanok_hall', 'pavilion8'])].filter(Boolean), w, d); role = 'landmark'; }
      else if (kind === 'special' || kind === 'big') name = fits(modern ? ['western', 'hanok_hall', ...houses] : ['hanok_hall', 'palace', ...houses], w, d);
      else if (kind === 'gate') { name = fits(['gate', 'fortgate'], w, d); role = 'deco'; }
      else name = fits([houses[hk++ % houses.length], ...houses], w, d);
      if (!name) continue;
      const m = BLD[name], fw = m ? Math.ceil(m.fw) : 2, fd = m ? Math.ceil(m.fd) : 2;
      const tx = x + Math.floor((w - fw) / 2), ty = y + d - fd;
      for (let j = ty; j < ty + fd; j++) for (let i = tx; i < tx + fw; i++) if (ground[j]?.[i] === B.border) ground[j][i] = B.ground;
      const o = this.place(name, tx, ty, role);
      if (kind === 'pc') this.inn = o;
      this.lots[kind] = this.lots[kind] || b;
    }
    // doors: the tile in front of each one (where people stand and the roads end)
    const doorAt = (kind) => { const d = L.doors.find((q) => q[2] === kind); return d ? front(d[0], d[1]) : null; };
    const fronts = L.doors.filter((d) => !isGate(d)).map(([x, y]) => front(x, y)).filter(([x, y]) => walk(x, y));
    // roads: from every door back to the main exit, preferring to keep going straight (a distance field from the exit)
    const dist = Array.from({ length: MH }, () => new Array(MW).fill(1e9));
    const q = [[sx, sy]]; dist[sy][sx] = 0;
    for (let k = 0; k < q.length; k++) {
      const [x, y] = q[k];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy; if (walk(a, b) && dist[b][a] > dist[y][x] + 1) { dist[b][a] = dist[y][x] + 1; q.push([a, b]); } }
    }
    for (const [fx0, fy0] of fronts.concat(this.exitTiles.map(([x, y]) => front(x, y)))) {
      let x = fx0, y = fy0, dir = null;
      for (let n = 0; n < 400 && dist[y]?.[x] > 0 && dist[y][x] < 1e9; n++) {
        if (ground[y][x] === B.ground) ground[y][x] = B.road;
        const steps = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => (dist[y + dy]?.[x + dx] ?? 1e9) < dist[y][x]);
        const s = steps.find(([dx, dy]) => dir && dx === dir[0] && dy === dir[1]) || steps[0];
        if (!s) break;
        dir = s; x += s[0]; y += s[1];
      }
      if (ground[y]?.[x] === B.ground) ground[y][x] = B.road;
    }
    // everything people use must be reachable from the way in (Pearl maps have walkable pockets you can't get to)
    const reach = new Set([sy * MW + sx]), rq = [[sx, sy]];
    for (let k = 0; k < rq.length; k++) {
      const [x, y] = rq[k];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy; if (walk(a, b) && !reach.has(b * MW + a)) { reach.add(b * MW + a); rq.push([a, b]); } }
    }
    const reachable = (x, y) => reach.has(y * MW + x);
    // the Time Gate (main town): the open 2x2 spot nearest the middle of the town's doors, ringed by a plaza
    this.gate = null;
    const people = !this.battle;
    const mid = fronts.length ? fronts.reduce((a, [x, y]) => [a[0] + x / fronts.length, a[1] + y / fronts.length], [0, 0]) : [MW / 2, MH / 2];
    const open = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (!walk(i, j) || isExit(i, j) || ground[j][i] === B.road) return false; return true; };
    if (main && people) {
      let best = null, bd = 1e9;
      for (let y = 2; y < MH - 3; y++) for (let x = 2; x < MW - 3; x++) {
        if (!open(x - 1, y - 1, 4, 4) || !reachable(x, y)) continue;
        const dd = Math.hypot(x + 1 - mid[0], y + 1 - mid[1]);
        if (dd < bd) { bd = dd; best = [x, y]; }
      }
      if (best) {
        this.gate = { tx: best[0], ty: best[1] };
        for (let j = best[1] - 2; j <= best[1] + 3; j++) for (let i = best[0] - 3; i <= best[0] + 4; i++) if (walk(i, j) && ground[j][i] !== B.road) ground[j][i] = B.plaza;
        const bx = best[0] - 2, by = best[1];
        if (walk(bx, by) && !isExit(bx, by)) this.placeProp('board', bx, by, 1, 1, 'board');
      }
    }
    // ships on open water, a market stall beside the merchant, lanterns by the inn and scattered props
    if (t.ships) {
      let n = 0;
      for (const sname of t.ships) {
        const m = BLD[sname]; if (!m) continue;
        const fw = Math.ceil(m.fw), fd = Math.ceil(m.fd);
        const spots = [];
        for (let y = 1; y < MH - fd - 1; y += 2) for (let x = 1; x < MW - fw - 1; x += 2) {
          let ok = true;
          for (let j = y - 1; j <= y + fd && ok; j++) for (let i = x - 1; i <= x + fw && ok; i++) if (ground[j]?.[i] !== 'water' || this.objs.some((o) => inBox(i, j, [o.tx, o.ty, o.fw, o.fd]))) ok = false;
          if (ok) spots.push([x, y]);
        }
        const s = spots[Math.floor(R() * spots.length)];
        if (s) { const o = this.place(sname, s[0], s[1], 'ship'); o.bob = n++; }
      }
    }
    const shopAt = doorAt('mart') || fronts[1] || this.start;
    const innAt = doorAt('pc') || fronts[0] || this.start;
    for (const [x, y] of [[shopAt[0] + 2, shopAt[1]], [shopAt[0] - 3, shopAt[1]]]) if (open(x, y, 2, 2) && BLD.stall) { this.place('stall', x, y, 'deco'); break; }
    for (const [x, y] of [[innAt[0] - 2, innAt[1]], [innAt[0] + 2, innAt[1]]]) if (open(x, y, 1, 1)) { this.placeProp('lantern', x, y); break; }
    let tries = 0, placed = 0;
    while (deco.length && placed < (main ? 26 : 16) && tries++ < 2000) {
      const x = 2 + Math.floor(R() * (MW - 4)), y = 2 + Math.floor(R() * (MH - 4));
      if (!open(x - 1, y - 1, 3, 3) || fronts.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 3)) continue;
      this.placeProp(deco[placed % deco.length], x, y);
      placed++;
    }
    // people: the era's NPCs on Pearl's NPC spots nearest the plaza first, the innkeeper and merchant at their doors
    const center = this.gate ? [this.gate.tx + 1, this.gate.ty + 1] : mid;
    const spots = L.npcs.filter(([x, y]) => walk(x, y) && reachable(x, y) && !isExit(x, y)).sort((p, q2) => Math.hypot(p[0] - center[0], p[1] - center[1]) - Math.hypot(q2[0] - center[0], q2[1] - center[1]));
    let si = 0;
    const pool = [...reach].map((k) => [k % MW, Math.floor(k / MW)]).filter(([x, y]) => !isExit(x, y) && Math.hypot(x - center[0], y - center[1]) < 14);
    const nextSpot = () => spots[si++] || pool[Math.floor(R() * pool.length)] || center;
    if (people) {
      (main ? era.npcs : t.npcs || []).forEach((n) => this.addNpc(n, null, nextSpot()));
      if (main) spySuspects().forEach((n) => this.addNpc(n, null, nextSpot()));
      const r = this.roles();
      this.addNpc(r.inn, r.innName, innAt);
      this.addNpc(r.shop, r.shopName, shopAt);
      this.addNpc(r.tm, r.tmName, [shopAt[0] + 3, shopAt[1]]);
      if (main) this.addNpc(r.crier, r.crierName, this.gate ? [this.gate.tx - 2, this.gate.ty + 1] : nextSpot());
      r.folk.forEach((n) => this.addNpc(n, null, nextSpot()));
    }
    this.waterTiles = [];
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (ground[y][x] === 'water') this.waterTiles.push(y * MW + x);
    this.prerender();
  }
  nearestFree(x, y) {
    const seen = new Set(); const q = [[x, y]];
    while (q.length) {
      const [cx, cy] = q.shift();
      const k = cy * this.W + cx;
      if (seen.has(k) || cx < 2 || cy < 2 || cx >= this.W - 2 || cy >= this.H - 1) continue;
      seen.add(k);
      if (!this.solid[cy][cx] && !this.npcs?.some((n) => n.x === cx && n.y === cy) && !this.onGate(cx, cy) && !(this.layout && this.exitTiles.some(([a, b]) => a === cx && b === cy))) return [cx, cy];
      q.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    return [x, y];
  }
  onGate(x, y) { const g = this.gate; return !!g && x >= g.tx && x <= g.tx + 1 && y >= g.ty && y <= g.ty + 1; }
  prerender() {
    const B = this.B;
    const sets = [tileSet(B.set), tileSet(B.road0), tileSet(B.plaza0)];
    if (sets.some((t) => !t.meta || !ready(t.im))) return; // chunk sets still loading; draw() retries
    // a town is built the same on every visit: the painted ground of the last few towns is kept (BG_CACHE), so coming
    // back from a dungeon does not paint it again. The key covers everything the painting reads.
    const key = [B.set, B.road0, B.plaza0, this.era.id, this.W, this.H, this.ground.map((r) => r.join()).join('|')].join(';');
    const kept = BG_CACHE.get(key);
    if (kept) { BG_CACHE.delete(key); BG_CACHE.set(key, kept); this.bg = kept; return; }
    const cv = document.createElement('canvas');
    cv.width = this.W * TILE; cv.height = this.H * TILE;
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    const cls = (x, y) => (x < 0 || y < 0 || x >= this.W || y >= this.H ? null : this.ground[y][x]);
    paintTerrain(c, sets[0], this.W, this.H, (x, y) => { const g = cls(x, y); return g == null ? null : g === 'border' ? 0 : g === 'water' ? 2 : 1; }, 0, 0, this.era.id * 31);
    // roads and the plaza: full-floor chunks of their own sets
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      const g = this.ground[y][x];
      if (g !== 'road' && g !== 'plaza') continue;
      const t = g === 'road' ? sets[1] : sets[2];
      const k = t.meta.floor[255][(x * 7 + y * 13) % 5 === 0 ? 1 : 0];
      c.drawImage(t.im, (k % t.meta.cols) * 24, Math.floor(k / t.meta.cols) * 24, 24, 24, x * TILE, y * TILE, TILE, TILE);
    }
    // soft edges between road/plaza and ground, and the forest rim
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      const g = this.ground[y][x];
      const isPath = g === B.road || g === B.plaza;
      if (isPath) {
        c.fillStyle = 'rgba(40,30,20,0.25)';
        if (this.ground[y - 1]?.[x] === B.ground) c.fillRect(x * TILE, y * TILE, TILE, 2);
        if (this.ground[y + 1]?.[x] === B.ground) c.fillRect(x * TILE, y * TILE + TILE - 2, TILE, 2);
        if (this.ground[y][x - 1] === B.ground) c.fillRect(x * TILE, y * TILE, 2, TILE);
        if (this.ground[y][x + 1] === B.ground) c.fillRect(x * TILE + TILE - 2, y * TILE, 2, TILE);
      }
    }
    this.bg = cv;
    BG_CACHE.set(key, cv);
    if (BG_CACHE.size > 3) BG_CACHE.delete(BG_CACHE.keys().next().value); // up to ~9 MB each (a 64x64 Pearl town)
  }

  blocked(x, y, ignorePartner = true) {
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return true;
    if (this.solid[y][x]) return true;
    if (this.onGate(x, y)) return true;
    if (this.npcs.some((n) => n.x === x && n.y === y)) return true;
    return false;
  }
  update(dt) {
    if (G.overlays.length) return;
    const pol = this.police;
    if (pol && !pol.done && !fade.cb && (pol.t -= dt) <= 0) { pol.t = 0.3; this.policeStep(); }
    // NPC wandering
    for (const n of this.npcs) {
      n.vx += (n.x - n.vx) * Math.min(1, dt * 8); n.vy += (n.y - n.vy) * Math.min(1, dt * 8);
      if (!n.wander) continue;
      n.t -= dt;
      if (n.t <= 0) {
        n.t = 1.5 + Math.random() * 3;
        const [dx, dy] = choice([[1, 0], [-1, 0], [0, 1], [0, -1]]);
        const nx = n.x + dx, ny = n.y + dy;
        if (Math.abs(nx - n.hx) <= n.wander && Math.abs(ny - n.hy) <= n.wander && !this.blocked(nx, ny) && !(nx === this.px && ny === this.py) && !(nx === this.partner.x && ny === this.partner.y) && !(this.mate && nx === this.mate.x && ny === this.mate.y)) {
          n.x = nx; n.y = ny; n.face = dx > 0 ? 'right' : dx < 0 ? 'left' : n.face;
        }
      }
    }
    // player, then the followers: each walks the tile the one ahead just left, in step with the player
    const P = this.partner;
    if (S.party[2] && !this.mate) this.mate = this.spawnMate(P);
    if (!S.party[2]) this.mate = null;
    const Q = this.mate;
    if (this.moving) {
      this.moveT += dt / 0.15;
      if (this.moveT >= 1) { this.moving = false; this.vx = this.px; this.vy = this.py; this.onArrive(); }
      else { this.vx = this.fx + (this.px - this.fx) * this.moveT; this.vy = this.fy + (this.py - this.fy) * this.moveT; }
    }
    const t = this.moving ? this.moveT : 1;
    for (const f of Q ? [P, Q] : [P]) { f.vx = f.fx + (f.x - f.fx) * t; f.vy = f.fy + (f.y - f.fy) * t; }
    // Z/X/J/P/Tab pressed mid-step act when the step lands instead of being dropped
    for (const k of ['ok', 'cancel', 'menu', 'quest', 'party', 'tag']) if (input.hit(k)) this.queued = k;
    if (!this.moving && !fade.cb) {
      const k = this.queued; this.queued = null;
      if (k === 'ok') return this.interact();
      if (k === 'cancel' || k === 'menu') return this.openMain();
      if (k === 'quest') return questMenu();
      if (k === 'party') return rosterMenu();
      if (k === 'tag') toast(tr('태그(Tab)는 던전에서 조종할 포켓몬을 바꿀 때 써요.', 'Tag (Tab) switches the Pokémon you control in dungeons.'));
      let dx = 0, dy = 0;
      if (input.isDown('left')) { dx = -1; this.face = 'left'; } else if (input.isDown('right')) { dx = 1; this.face = 'right'; } else if (input.isDown('up')) { dy = -1; this.face = 'up'; } else if (input.isDown('down')) { dy = 1; this.face = 'down'; }
      if (dx || dy) {
        const nx = this.px + dx, ny = this.py + dy;
        const exit = this.layout ? this.exitTiles.some(([ex, ey]) => ex === nx && ey === ny) // a Pearl town: walking into a gate door
          : this.exitTiles.some(([ex, ey]) => ex === this.px && ey === this.py) && (ny >= this.H || nx >= this.W);
        if (exit) return this.leave();
        const swap = nx === P.x && ny === P.y; // walking into the partner swaps the two; the third member stays put
        if (!this.blocked(nx, ny) || swap) {
          for (const f of Q ? [P, Q] : [P]) { f.fx = f.x; f.fy = f.y; }
          if (Q && !swap) { Q.x = P.x; Q.y = P.y; Q.face = P.face; Q.dir = P.dir; }
          P.x = this.px; P.y = this.py;
          P.dir = this.face; // PMD sprites face every way; box icons keep their last left/right
          P.face = this.face === 'up' || this.face === 'down' ? P.face : this.face;
          this.fx = this.px; this.fy = this.py; this.px = nx; this.py = ny; this.moving = true; this.moveT = 0;
        } else if (input.pressed.size) sfx('bump');
      }
    }
  }
  // the third member appears on a free tile beside the partner rather than on top of it
  spawnMate(P) {
    const spot = [[0, 1], [-1, 0], [1, 0], [0, -1]].map(([dx, dy]) => [P.x + dx, P.y + dy])
      .find(([x, y]) => !this.blocked(x, y) && !(x === this.px && y === this.py)) || [P.x, P.y];
    return { x: spot[0], y: spot[1], fx: spot[0], fy: spot[1], vx: spot[0], vy: spot[1], face: P.face, dir: P.dir };
  }
  onArrive() {}
  facing() { const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[this.face]; return [this.px + d[0], this.py + d[1]]; }
  interact() {
    const [fx, fy] = this.facing();
    const npc = this.npcs.find((n) => n.x === fx && n.y === fy);
    if (npc) {
      npc.face = fx > this.px ? 'right' : 'left';
      npc.face = this.px > npc.x ? 'right' : 'left';
      if (npc.role === 'inn') return this.innMenu(npc);
      if (npc.role === 'shop') return this.shopMenu(npc);
      if (npc.role === 'tm') return this.tmMenu(npc);
      if (npc.role === 'board') return boardMenu(npc);
      if (npc.role === 'regi') return this.regiTalk(npc);
      if (npc.role === 'lati') return this.latiTalk();
      if (npc.role === 'meteor') return this.meteorTalk();
      if (npc.role === 'police') return say([{ who: npc.sp, name: npc.name, text: tr('…뭘 보나? 어서 지나가.', '...What are you looking at? Move along.') }]);
      if (npc.role === 'caught') return say([{ who: npc.sp, name: npc.name, text: tr('…밀정 노릇도 이제 끝이다.', '...My days as a spy are over.') }]);
      if (npc.folk != null) return say([{ who: npc.sp, name: npc.name, text: choice(FOLK_TIPS()) }]);
      return onTalk(npc, this);
    }
    if (this.onGate(fx, fy)) return this.gateTalk();
    const o = this.inter.get(fy * this.W + fx);
    if (o) {
      if (o.kind === 'board') return boardMenu();
      if (o.kind === 'inn') return this.innMenu();
      if (o.kind === 'landmark') return say([{ who: 'narr', text: tr(`${this.def.name}의 상징이 우뚝 서 있다.`, `The landmark of ${this.def.name} towers overhead.`) }]);
      if (o.kind === 'house') return say([{ who: 'narr', text: choice(tr(['문이 굳게 닫혀 있다. 안에서 밥 짓는 냄새가 난다.', '창호지 너머로 두런두런 이야기 소리가 들린다.', '"지금은 바쁘니 나중에 오시오!"', '문 앞에 짚신 두 켤레가 가지런히 놓여 있다.'], ['The door is shut tight. Rice is cooking inside.', 'Murmured voices drift through the paper window.', '"We\'re busy right now, come back later!"', 'Two pairs of straw sandals sit neatly by the door.'])) }]);
      if (o.kind === 'ship') return say([{ who: 'narr', text: o.name === 'geobukseon' ? tr('거북선이다. 등판의 쇠못이 번뜩인다.', 'A turtle ship. The iron spikes on its back glint.') : o.name === 'panokseon' ? tr('판옥선이다. 2층 갑판 위로 깃발이 나부낀다.', 'A panokseon. Flags flutter above its two decks.') : tr('작은 나룻배가 물결에 흔들린다.', 'A little ferry boat bobs on the waves.') }]);
    }
  }
  // the post-war Regi line starts here: Registeel stands asleep in town (data in content_modern.js)
  regiTalk(npc) {
    say([{ who: 'narr', text: tr('점자가 새겨진 강철 거인이 우뚝 서 있다. 몸속 깊은 곳에서 희미하게 삐빗거리는 소리가 들린다… 깨워 볼까?', 'A steel giant carved with braille stands tall. A faint beeping comes from deep inside it... Wake it up?'),
      choices: tr(['깨운다', '그만둔다'], ['Wake it', 'Leave it']), onChoice: (i) => { if (i === 0) fadeTo(() => G.goDungeon(npc.d)); } }]);
  }
  // Latias and Latios: only one of the pair comes along
  latiTalk() {
    const pair = [380, 381];
    say([{ who: 380, name: tr('라티아스 · 라티오스', 'Latias · Latios'), text: tr('라티아스와 라티오스가 나란히 너희를 바라본다. 둘 중 하나만 함께 갈 수 있을 것 같다…', 'Latias and Latios look at you side by side. It seems only one of them can come along...'),
      choices: [...pair.map((sp) => DEX.species[sp].name), tr('그만둔다', 'Not now')], onChoice: (i) => {
        if (i > 1) return;
        S.flags.lati = pair[i];
        giveMons([pair[i]]);
        this.npcs = this.npcs.filter((n) => n.role !== 'lati');
        setTimeout(() => say([{ who: 'narr', text: tr(`${DEX.species[pair[1 - i]].name}은(는) 하늘 높이 날아올라 사라졌다.`, `${DEX.species[pair[1 - i]].name} soared high into the sky and vanished.`) }]), 400);
      } }]);
  }
  // Deoxys changes Forme by touching the red meteorite, as at Veilstone (game.js FORMES); its share of HP is kept
  meteorTalk() {
    const m = S.party.find((p) => FORMES[p.sp]), F = m && FORMES[m.sp];
    if (!m) return say([{ who: 'narr', text: S.roster.some((p) => FORMES[p.sp])
      ? tr('붉은 운석이 희미하게 맥박친다. 동료 명부에서 테오키스를 데려오면 반응할 것 같다.', 'The red meteorite pulses faintly. It may react if you bring Deoxys from the roster.')
      : tr('붉은 운석이 희미하게 맥박친다. 우주에서 온 무언가와 공명하는 것 같다.', 'The red meteorite pulses faintly, as if resonating with something from space.') }]);
    const keys = [null, ...Object.keys(F)], def = (k) => (k ? F[k] : FORME_NORMAL), sp = DEX.species[m.sp].name;
    say([{ who: m.sp, name: m.name, text: tr(`${sp}이(가) 운석에 손을 대자 몸이 빛나기 시작했다! 어떤 모습으로 바꿀까?`, `${sp} touches the meteorite and begins to glow! Which Forme should it take?`) }], () => openMenu(keys.map((k) => ({
      label: tr(...def(k).name), right: k === m.forme ? tr('지금', 'now') : '', desc: tr(...def(k).desc),
      fn: () => {
        if (k === m.forme) return;
        const r = m.hp / m.maxhp;
        m.forme = k; m.hp = Math.max(1, Math.round(m.maxhp * r));
        sfx('super'); cry(m.sp);
        say([{ who: 'narr', text: tr(`${sp}의 몸이 빛에 휩싸이더니 ${tr(...def(k).name)}으로 모습을 바꿨다!`, `${sp} is wrapped in light and changes into its ${tr(...def(k).name)}!`) }]);
      },
    })), { title: tr(`${sp}의 폼`, `${sp}'s Forme`), desc: true, x: 150, y: 30, w: 200, sel: Math.max(0, keys.indexOf(m.forme)) }));
  }
  // the red meteorite (no sprite exists for it): a dark rock with cracks that glow in a slow pulse
  drawMeteor(c, x, y) {
    const glow = 0.55 + Math.sin(G.time * 2.5) * 0.3;
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(x, y - 4, 12, 4, 0, 0, Math.PI * 2); c.fill();
    const g = c.createRadialGradient(x, y - 11, 2, x, y - 11, 20);
    g.addColorStop(0, `rgba(255,110,70,${0.35 * glow})`); g.addColorStop(1, 'rgba(255,110,70,0)');
    c.fillStyle = g; c.fillRect(x - 20, y - 31, 40, 40);
    const rock = (pts, col) => { c.fillStyle = col; c.beginPath(); pts.forEach(([dx, dy], i) => c[i ? 'lineTo' : 'moveTo'](x + dx, y + dy)); c.closePath(); c.fill(); };
    rock([[-12, -4], [-10, -13], [-4, -19], [5, -18], [12, -11], [11, -3]], '#24161a');
    rock([[-10, -5], [-8, -12], [-3, -17], [4, -16], [10, -10], [9, -4]], '#5e3236');
    rock([[-7, -12], [-3, -16], [3, -15], [-1, -12]], '#8a4c48');
    c.strokeStyle = `rgba(255,150,100,${glow})`; c.lineWidth = 1; c.beginPath();
    c.moveTo(x - 6, y - 6); c.lineTo(x - 2, y - 10); c.lineTo(x + 3, y - 8); c.moveTo(x - 2, y - 10); c.lineTo(x - 1, y - 14); c.moveTo(x + 3, y - 8); c.lineTo(x + 7, y - 11);
    c.stroke();
  }
  gateTalk() {
    if (!eraComplete()) return say([{ who: 'narr', text: tr('희미하게 빛나는 시간의 문이다. 이 시대의 소원을 이루면 열릴 것 같다.', 'A faintly glowing Time Gate. It should open once this era\'s wish comes true.') }]);
    if (S.era >= ERAS.length - 1) return say([{ who: CELEBI, name: tr('세레비', 'Celebi'), text: tr('여기가 여행의 끝이야. 엔딩으로 갈까?', 'This is the end of our journey. Shall we go to the ending?'), choices: tr(['간다', '조금 더 있을래'], ['Let\'s go', 'Stay a bit longer']), onChoice: (i) => { if (i === 0) G.goEnding(); } }]);
    const next = ERAS[S.era + 1];
    say([{ who: CELEBI, name: tr('세레비', 'Celebi'), text: tr(`시간의 문이 열렸어! ${next.year}년 "${next.title}"의 시대로 갈까?`, `The Time Gate is open! Shall we go to ${next.year}, the era of "${next.title}"?`), choices: tr(['간다', '아직'], ['Go', 'Not yet']), onChoice: (i) => { if (i === 0) G.nextEra(); } }]);
  }
  innMenu(npc) {
    const name = npc?.name || tr('주막', 'Inn');
    say([{ who: npc?.sp || 113, name, text: tr('어서 오세요~ 따뜻한 국밥 한 그릇 하고 쉬어 가세요. 쉬면 기록도 남겨 드려요! 동료들도 여기서 쉬고 있답니다.', 'Welcome! Have a hot bowl of gukbap and rest. Resting also saves your journey, and your companions are staying here too.'), choices: tr(['쉬고 기록하기', '동료 명부', '그냥 둘러볼게요'], ['Rest and save', 'Companions', 'Just looking']), onChoice: (i) => {
      if (i === 1) return rosterMenu();
      if (i !== 0) return;
      [...S.party, ...S.roster].forEach((m) => m.heal(true));
      jingle('fanfa3');
      const ok = save();
      setTimeout(() => toast(ok ? tr('모두 기운을 되찾았다! 기록을 남겼다.', 'Everyone is refreshed! Game saved.') : tr('기운을 되찾았다! (기록 실패: 브라우저 저장소를 확인하세요)', 'Refreshed! (Save failed: check browser storage)'), ok ? COL.ink : COL.red), 300);
    } }]);
  }
  // the TM dealer: a TM is bought and taught on the spot to a team member who can use it (game.js tmFits); the money
  // goes only once the move is learned (a full set of four forgets one first, quests.js forgetMenu)
  tmMenu(npc) {
    const stock = TMS.map((move, i) => ({ move, no: `TM${String(i + 1).padStart(2, '0')}` }))
      .filter(({ move }) => moveUsable(move) && (DEX.moves[move].cat === 2 || DEX.moves[move].power > 1)); // no level-based damage
    const learns = (m, move) => tmFits(m, move) && !m.moves.some((x) => x.id === move);
    const teach = (move, no) => {
      const price = tmPrice(move), name = DEX.moves[move].name;
      if (S.money < price) { toast(tr('엽전이 모자라다.', 'Not enough coins.'), COL.red); sfx('cancel'); return; }
      openMenu(S.party.map((m) => {
        const knows = m.moves.some((x) => x.id === move);
        return { label: m.name, right: knows ? tr('이미 앎', 'Knows it') : learns(m, move) ? tr('배울 수 있다', 'Can learn') : tr('배울 수 없다', 'Can\'t learn'), disabled: !learns(m, move), fn: () => {
          const pay = () => { S.money -= price; jingle('fanfa1'); toast(tr(`${price}냥을 내고 ${m.name}에게 ${name}을(를) 가르쳤다! (남은 돈 ${S.money}냥)`, `Paid ${price} nyang: ${m.name} learned ${name}! (${S.money} nyang left)`), COL.green); };
          if (m.moves.length < 4) { m.learn(move); pay(); } else forgetMenu(m, move, toast, (ok) => ok && pay());
        } };
      }), { title: tr(`${no} ${name} · 누구에게?`, `${no} ${name} · Teach whom?`), x: 150, y: 70, w: 210 });
    };
    say([{ who: npc.sp, name: npc.name, text: tr('기술머신 보고 가세요! 사는 자리에서 바로 가르쳐 드려요. 센 기술은 3000냥, 나머지는 1000냥이에요.', 'TMs for sale! I teach the move right where you buy it. Strong moves are 3000 nyang, the rest 1000.') }], () => openMenu(stock.map(({ move, no }) => {
      const d = DEX.moves[move], can = S.party.filter((m) => learns(m, move)).map((m) => m.name);
      return { label: `${no} ${d.name}`, right: tr(`${tmPrice(move)}냥`, `${tmPrice(move)} ny`), fn: () => teach(move, no),
        desc: `${moveInfo(move)} · ${can.length ? tr(`배울 수 있다: ${can.join(', ')}`, `Can learn: ${can.join(', ')}`) : tr('파티에 배울 수 있는 포켓몬이 없다', 'No one in the team can learn it')}` };
    }), { title: tr(`기술머신 · ${S.money}냥`, `TMs · ${S.money} nyang`), desc: true, keep: true, x: 110, y: 30, w: 260 }));
  }
  shopMenu(npc) {
    const buy = () => openMenu(SHOP.map((id) => ({ label: ITEMS[id].name, right: tr(`${ITEMS[id].price}냥`, `${ITEMS[id].price} ny`), desc: tr(`${ITEMS[id].desc} (보유 ${countItem(id)})`, `${ITEMS[id].desc} (have ${countItem(id)})`), fn: () => {
      if (S.money < ITEMS[id].price) { toast(tr('엽전이 모자라다.', 'Not enough coins.'), COL.red); sfx('cancel'); return; }
      S.money -= ITEMS[id].price; addItem(id); sfx('pick'); toast(tr(`${ITEMS[id].name}을(를) 샀다! (남은 돈 ${S.money}냥)`, `Bought ${ITEMS[id].name}! (${S.money} nyang left)`));
    } })), { title: tr(`장터 · ${S.money}냥`, `Market · ${S.money} nyang`), desc: true, keep: true, x: 150, y: 30, w: 200 });
    const sell = () => {
      const ids = Object.keys(S.items).filter((id) => ITEMS[id] && !ITEMS[id].key); // key items (the orbs) are never sold
      if (!ids.length) return toast(tr('팔 물건이 없다.', 'Nothing to sell.'));
      openMenu(ids.map((id) => ({ label: `${ITEMS[id].name} ×${countItem(id)}`, right: tr(`${Math.floor(ITEMS[id].price / 2)}냥`, `${Math.floor(ITEMS[id].price / 2)} ny`), fn: () => { takeItem(id); S.money += Math.floor(ITEMS[id].price / 2); sfx('pick'); toast(tr(`팔았다. (${S.money}냥)`, `Sold. (${S.money} nyang)`)); } })), { title: tr('팔기', 'Sell'), x: 150, y: 30, w: 200 });
    };
    say([{ who: npc.sp, name: npc.name, text: tr('골라 보시오, 골라 봐! 던전 가기 전엔 열매가 필수라오!', 'Take your pick! Never head into a dungeon without berries!'), choices: tr(['사기', '팔기', '그만두기'], ['Buy', 'Sell', 'Leave']), onChoice: (i) => { if (i === 0) buy(); else if (i === 1) sell(); } }]);
  }
  get padKeys() { return ['menu', 'quest', 'party']; } // what the touch menu panel offers here (core.js initMenu)
  openMain() {
    openMenu([
      { label: tr('포켓몬', 'Pokémon'), fn: partyMenu }, { label: tr('동료 명부', 'Companions'), fn: rosterMenu }, { label: tr('도구', 'Items'), fn: () => itemMenu(null) }, { label: tr('퀘스트', 'Quests'), fn: questMenu },
      { label: tr('기록하기', 'Save'), fn: () => { S.townPos = [this.px, this.py]; const ok = save(); S.townPos = null; sfx(ok ? 'confirm' : 'cancel'); toast(ok ? tr('기록을 남겼다.', 'Game saved.') : tr('기록 실패: 브라우저 저장소를 확인하세요.', 'Save failed: check browser storage.'), ok ? COL.ink : COL.red); } },
      { label: tr('세계 지도로', 'World map'), fn: () => this.leave() },
      { label: tr('설정', 'Settings'), fn: () => settingsMenu() },
      quitItem(false, () => { S.townPos = [this.px, this.py]; save(); S.townPos = null; }),
      { label: tr('닫기', 'Close') },
    ], { title: tr(`${this.era.year}년`, `${this.era.year}`) });
  }
  leave() { fadeTo(() => G.goWorld()); }

  draw(c) {
    const camX = clamp(this.vx * TILE + 12 - VW / 2, 0, this.W * TILE - VW), camY = clamp(this.vy * TILE + 12 - VH / 2, 0, this.H * TILE - VH);
    this.cam = [camX, camY];
    if (!this.bg) this.prerender();
    c.fillStyle = '#20301c'; c.fillRect(0, 0, VW, VH);
    c.save(); c.translate(-Math.round(camX), -Math.round(camY));
    if (this.bg) drawSeen(c, this.bg, Math.round(camX), Math.round(camY));
    // water shimmer
    if (this.layout) {
      c.fillStyle = 'rgba(255,255,255,0.3)';
      const f = Math.floor(G.time * 2);
      for (const k of this.waterTiles) if ((k * 7 + f) % 11 === 0) { const x = (k % this.W) * TILE, y = Math.floor(k / this.W) * TILE; if (x > camX - TILE && x < camX + VW && y > camY - TILE && y < camY + VH) c.fillRect(x + ((k * 5 + f * 3) % 16), y + ((k * 3) % 18) + 3, 6, 1); }
    } else if (this.def.biome === 'coast') {
      c.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 40; i++) { const x = (i * 97 + Math.floor(G.time * 12) * 3) % (this.W * TILE), y = (this.H - 6) * TILE + (i * 53) % (5 * TILE); c.fillRect(x, y, 6, 1); }
    }
    if (this.gate) this.drawGate(c);
    const list = [];
    for (const o of this.objs) if (objInView(o, camX, camY)) list.push({ base: o.base, draw: () => {
      const im = img(o.img);
      if (!ready(im)) return;
      if (o.prop) c.drawImage(im, Math.round(o.tx * TILE + (o.fw * TILE - im.width) / 2), Math.round((o.ty + o.fd) * TILE - im.height + 2));
      else c.drawImage(im, o.x, o.y + (o.bob != null ? Math.round(Math.sin(G.time * 1.5 + o.bob) * 1.5) : 0));
    } });
    for (const n of this.npcs) list.push({ base: n.vy * TILE + TILE, draw: () => {
      if (n.role === 'meteor') this.drawMeteor(c, n.vx * TILE + 12, n.vy * TILE + TILE);
      else drawMon(c, n.sp, false, n.vx * TILE + 12, n.vy * TILE + TILE, { facing: n.face, phase: n.phase });
      const mark = this.markOf(n), mx = n.vx * TILE + 12, my = n.vy * TILE - 12;
      if (mark === 'main' || mark === 'side') this.drawMark(c, mx, my, '!', mark === 'main' ? COL.red : COL.blue);
      else if (mark) this.drawSign(c, mx, my, mark);
    } });
    const [a, b, m3] = S.party;
    const Q = this.mate;
    if (Q && m3) list.push({ base: Q.vy * TILE + TILE - 2, draw: () => drawMon(c, m3.spr, m3.shiny, Q.vx * TILE + 12, Q.vy * TILE + TILE, { face: Q.dir, facing: Q.face === 'right' ? 'right' : 'left', moving: this.moving, phase: 2 }) });
    list.push({ base: this.partner.vy * TILE + TILE - 1, draw: () => drawMon(c, b.spr, b.shiny, this.partner.vx * TILE + 12, this.partner.vy * TILE + TILE, { face: this.partner.dir, facing: this.partner.face === 'right' ? 'right' : 'left', moving: this.moving, phase: 1 }) });
    list.push({ base: this.vy * TILE + TILE, draw: () => drawMon(c, a.spr, a.shiny, this.vx * TILE + 12, this.vy * TILE + TILE, { face: this.face, facing: this.face === 'right' ? 'right' : this.face === 'left' ? 'left' : this.lastH || 'left', moving: this.moving }) });
    if (this.face === 'left' || this.face === 'right') this.lastH = this.face;
    list.sort((p, q) => p.base - q.base).forEach((d) => d.draw());
    c.restore();
    if (this.B.tint) { c.fillStyle = this.B.tint; c.fillRect(0, 0, VW, VH); }
    if (S.night) {
      c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = 'rgb(92,100,165)'; c.fillRect(0, 0, VW, VH); c.restore();
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const o of this.objs) if (o.name === 'lantern' || o.name === 'lamp' || o.name === 'campfire') {
        const x = o.tx * TILE + 12 - camX, y = o.ty * TILE - camY;
        const g = c.createRadialGradient(x, y, 2, x, y, 40); g.addColorStop(0, 'rgba(255,190,90,0.45)'); g.addColorStop(1, 'rgba(255,190,90,0)');
        c.fillStyle = g; c.fillRect(x - 40, y - 40, 80, 80);
      }
      c.restore();
    }
  }
  isQuestNpc(n) {
    const st = mainStep();
    return !!st && ['talk', 'battle', 'spy'].includes(st.do) && st.npc === n.id;
  }
  // what floats above an NPC: red ! for the main quest, blue ! for requests (the crier with a new or finished one,
  // a delivery's recipient while you carry it), a coin sign over the merchant, a bowl over the innkeeper and a purple disc over the TM dealer
  markOf(n) {
    if (this.isQuestNpc(n)) return 'main';
    const side = this.era.side || [];
    if (n.role === 'board' && side.some((q) => ['open', 'ready'].includes(sideState(q)))) return 'side';
    if (side.some((q) => q.kind === 'deliver' && q.to === n.id && S.side[q.id] === 'active' && countItem(q.item))) return 'side';
    if (n.role === 'shop') return 'shop';
    if (n.role === 'tm') return 'tm';
    if (n.role === 'inn') return 'inn';
    return null;
  }
  drawSign(c, x, y, kind) {
    const by = Math.round(y + Math.sin(G.time * 3 + x) * 1);
    if (kind === 'tm') { // a TM disc on a bigger purple plate, unlike the parchment signs
      c.fillStyle = COL.ink; c.fillRect(x - 9, by - 8, 18, 16);
      c.fillStyle = '#6a3aa8'; c.fillRect(x - 8, by - 7, 16, 14);
      c.fillStyle = '#efe8ff'; c.beginPath(); c.arc(x, by, 5.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#a77ef0'; c.beginPath(); c.arc(x, by, 4.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.fillRect(x - 3, by - 3, 2, 1); c.fillRect(x - 3, by - 2, 1, 1);
      c.fillStyle = '#6a3aa8'; c.beginPath(); c.arc(x, by, 1.5, 0, Math.PI * 2); c.fill();
      return;
    }
    c.fillStyle = COL.ink; c.fillRect(x - 7, by - 6, 14, 12);
    c.fillStyle = '#f3e6c4'; c.fillRect(x - 6, by - 5, 12, 10);
    if (kind === 'shop') { // a brass coin with its square hole (yeopjeon)
      c.fillStyle = '#7a5a10'; c.beginPath(); c.arc(x, by, 4.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#e8b83a'; c.beginPath(); c.arc(x, by, 3.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#7a5a10'; c.fillRect(x - 1, by - 1, 2, 2);
    } else { // a steaming bowl of gukbap
      c.fillStyle = '#b04030'; c.fillRect(x - 4, by + 1, 8, 2); c.fillRect(x - 3, by + 3, 6, 1);
      c.fillStyle = '#fff'; c.fillRect(x - 3, by, 6, 1);
      c.fillStyle = '#9aa0a8'; c.fillRect(x - 2, by - 4, 1, 3); c.fillRect(x + 1, by - 3, 1, 2);
    }
  }
  drawMark(c, x, y, ch, color) {
    const by = y + Math.sin(G.time * 5) * 2;
    c.fillStyle = COL.ink; c.fillRect(x - 5, by - 6, 10, 12);
    c.fillStyle = color; c.fillRect(x - 4, by - 5, 8, 10);
    c.fillStyle = '#fff'; c.fillRect(x - 1, by - 3, 2, 4); c.fillRect(x - 1, by + 2, 2, 2);
  }
  drawGate(c) {
    const x = this.gate.tx * TILE, y = this.gate.ty * TILE, open = eraComplete();
    const cx = x + TILE, cy = y + TILE;
    c.save();
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(cx, cy + 14, 22, 7, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#7d6a55'; c.fillRect(x + 2, y + 34, 44, 8); c.fillStyle = '#5b4c3d'; c.fillRect(x + 2, y + 40, 44, 2);
    const t = G.time;
    for (let k = 0; k < 3; k++) {
      c.strokeStyle = open ? `hsla(${(t * 80 + k * 50) % 360},80%,70%,0.9)` : 'rgba(170,200,190,0.5)';
      c.lineWidth = 2;
      c.beginPath(); c.ellipse(cx, cy, 16 - k * 4 + Math.sin(t * 3 + k) * 1.5, 20 - k * 5, 0, 0, Math.PI * 2); c.stroke();
    }
    if (open) {
      c.fillStyle = 'rgba(200,255,220,0.25)'; c.beginPath(); c.ellipse(cx, cy, 14, 18, 0, 0, Math.PI * 2); c.fill();
      for (let i = 0; i < 6; i++) { const a = t * 2 + i; c.fillStyle = '#fff9c8'; c.fillRect(Math.round(cx + Math.cos(a) * 18), Math.round(cy + Math.sin(a) * 22), 2, 2); }
    }
    c.restore();
    if (open) drawMon(c, CELEBI, false, cx + 22, cy + 14, { phase: 2 });
  }
  drawUI() {
    // header & tracker
    const era = this.era;
    ui.panel(6, 6, 150, 30);
    ui.text(tr(`${era.year}년 · ${era.title}`, `${era.year} · ${era.title}`), 14, 12, { bold: true });
    ui.text(this.def.name + (S.night ? tr(' (밤)', ' (night)') : ''), 14, 24, { size: 9, color: COL.ink2 });
    const goal = trackerText();
    if (goal) {
      const lines = ui.wrap(goal, 170, 9);
      ui.panel(VW - 186, 6, 180, 14 + lines.length * 11);
      ui.text(tr('▶ 목표', '▶ Goal'), VW - 180, 11, { size: 9, color: COL.red, bold: true });
      lines.forEach((l, i) => ui.text(l, VW - 180, 22 + i * 11, { size: 9 }));
    }
    ui.text(tr(`${S.money}냥`, `${S.money} nyang`), 14, VH - 16, { size: 9, color: '#fff', shadow: true });
    if (prefs.hints) ui.text(touchUI ? tr('Z 조사 · X 게임 메뉴 · 메뉴: 퀘스트 · 동료', 'Z talk · X game menu · Menu: quests · team') : tr('Z 조사 · X 메뉴 · J 퀘스트 · P 동료 · 1/2/3 속도', 'Z talk · X menu · J quests · P team · 1/2/3 speed'), VW - 8, VH - 14, { size: 9, color: '#fff', shadow: true, align: 'right' });
  }
}
