// Hub town for the current era: generated tile map + Blender-rendered buildings + NPCs.
import { G, VW, VH, TILE, img, ready, input, ui, COL, say, openMenu, toast, fade, fadeTo, setScene, clamp, choice, prefs, touchUI } from './core.js';
import { playBgm, sfx, cry, jingle } from './audio.js';
import { S, DEX, save, ITEMS, SHOP, addItem, takeItem, countItem, itemDef } from './game.js';
import { ERAS, QITEMS, CELEBI } from './content.js';
import { tr } from './i18n.js';
import { hasPmdSprite, drawPmd, pmdDir, tileSet, paintTerrain, iconPath } from './pmd.js';
import { questMenu, partyMenu, rosterMenu, itemMenu, trackerText, onTalk, boardMenu, eraComplete, mainStep, settingsMenu, quitItem } from './quests.js';

export let BLD = {};
export function setBuildings(b) { BLD = b; }
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
  constructor(kind = S.townKind || 1) {
    this.era = ERAS[S.era];
    this.kind = kind === 2 && this.era.town2 ? 2 : 1;
    this.def = this.kind === 2 ? this.era.town2 : this.era.town;
    S.townKind = this.kind;
    this.W = this.kind === 1 ? 52 : 40; this.H = this.kind === 1 ? 32 : 28;
    this.OX = this.kind === 1 ? 6 : 0; // content coordinates were laid out for the 40-wide map
    this.build();
    const coast = this.def.biome === 'coast';
    [this.px, this.py] = coast ? [this.W - 3, 17] : [this.OX + 19, this.H - 3];
    this.face = coast ? 'left' : 'up';
    if (S.townPos) { [this.px, this.py] = S.townPos; S.townPos = null; }
    this.vx = this.px; this.vy = this.py; this.moving = false; this.moveT = 0;
    this.trail = [[this.px, this.py + 1]];
    const py = Math.min(this.H - 1, this.py + 1);
    this.partner = { x: this.px, y: py, fx: this.px, fy: py, vx: this.px, vy: py, face: 'up' };
    this.mate = null; // third follower (recruit), created on demand in update()
  }
  enter() {
    const t = this.def;
    playBgm(S.night ? t.bgmN : t.bgm);
    G.dialogSpeaker = (L) => { if (typeof L?.who === 'number' && L.who !== this._lastCry) { cry(L.who); this._lastCry = L.who; } };
  }
  exit() { G.dialogSpeaker = null; }
  relang() { for (const n of this.npcs) n.name = n.nameFn(); }

  build() {
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
    const key = (x, y) => y * MW + x;
    const free = (x, y, w, h) => {
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i < 2 || j < 2 || i >= MW - 2 || j >= MH - 1 || solid[j][i] || ground[j][i] === B.road || ground[j][i] === B.plaza) return false;
      return true;
    };
    const place = (name, tx, ty, kind = 'house') => {
      const m = BLD[name];
      if (m) {
        const fw = Math.ceil(m.fw), fd = Math.ceil(m.fd);
        for (let j = ty; j < ty + fd; j++) for (let i = tx; i < tx + fw; i++) if (j < MH && i < MW) solid[j][i] = true;
        const o = { kind, name, tx, ty, fw, fd, img: `bld/${name}.png`, x: tx * TILE - m.ax, y: (ty + m.fd) * TILE - m.ay, base: (ty + fd) * TILE };
        this.objs.push(o);
        if (kind !== 'deco') this.inter.set(key(tx + Math.floor(fw / 2), ty + fd), o);
        return o;
      }
      return this.placeProp(name, tx, ty, 2, 2, kind);
    };
    this.placeProp = (name, tx, ty, w = 1, h = 1, kind = 'deco') => {
      for (let j = ty; j < ty + h; j++) for (let i = tx; i < tx + w; i++) solid[j][i] = true;
      const o = { kind, name, tx, ty, fw: w, fd: h, img: `prop/${name}.png`, prop: true, base: (ty + h) * TILE };
      this.objs.push(o);
      if (kind !== 'deco') this.inter.set(key(tx + Math.floor(w / 2), ty + h), o);
      return o;
    };
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
    // names are functions of the current language so a live language switch can relabel them
    const addNpc = (n, nameFn) => {
      const [x, y] = this.nearestFree(n.x + OX, n.y);
      const npc = { ...n, x, y, vx: x, vy: y, hx: x, hy: y, face: 'left', t: Math.random() * 3, phase: Math.random() * 3 };
      npc.nameFn = nameFn || (() => (/\s/.test(n.name || '') ? n.name : DEX.species[n.sp].name));
      npc.name = npc.nameFn();
      this.npcs.push(npc);
    };
    (main ? era.npcs : t.npcs || []).forEach((n) => addNpc(n));
    const j = S.era - 6; // Joseon-era chapters keep their old innkeepers and merchants
    const inn = era.inn ?? (j < 4 ? 113 : j < 8 ? 440 : 242), shop = era.shop ?? (j < 3 ? 52 : j < 6 ? 431 : 53);
    addNpc({ id: 'innkeeper', sp: inn, x: 6, y: 13, role: 'inn' }, () => tr('주막 ', 'Innkeeper ') + DEX.species[inn].name);
    addNpc({ id: 'merchant', sp: shop, x: 15, y: 16, role: 'shop' }, () => tr('장사꾼 ', 'Merchant ') + DEX.species[shop].name);
    if (main) addNpc({ id: 'crier', sp: 441, x: 16, y: 11, role: 'board' }, () => tr('방꾼 페라페', 'Crier Chatot'));
    // a few villagers who wander and share travel tips
    const folk = TOWNFOLK[(era.id + this.kind) % TOWNFOLK.length];
    folk.slice(0, main ? 4 : 2).forEach((sp, k) => addNpc({ id: `folk${k}`, sp, x: [4, 31, 11, 28][k], y: [19, 20, 24, 8][k], wander: 3, folk: k }));
    this.prerender();
  }
  nearestFree(x, y) {
    const seen = new Set(); const q = [[x, y]];
    while (q.length) {
      const [cx, cy] = q.shift();
      const k = cy * this.W + cx;
      if (seen.has(k) || cx < 2 || cy < 2 || cx >= this.W - 2 || cy >= this.H - 1) continue;
      seen.add(k);
      if (!this.solid[cy][cx] && !this.npcs?.some((n) => n.x === cx && n.y === cy) && !this.onGate(cx, cy)) return [cx, cy];
      q.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    return [x, y];
  }
  onGate(x, y) { const g = this.gate; return !!g && x >= g.tx && x <= g.tx + 1 && y >= g.ty && y <= g.ty + 1; }
  prerender() {
    const B = this.B;
    const sets = [tileSet(B.set), tileSet(B.road0), tileSet(B.plaza0)];
    if (sets.some((t) => !t.meta || !ready(t.im))) return; // chunk sets still loading; draw() retries
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
        const exit = this.exitTiles.some(([ex, ey]) => ex === this.px && ey === this.py) && (ny >= this.H || nx >= this.W);
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
      if (npc.role === 'board') return boardMenu(npc);
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
  shopMenu(npc) {
    const buy = () => openMenu(SHOP.map((id) => ({ label: ITEMS[id].name, right: tr(`${ITEMS[id].price}냥`, `${ITEMS[id].price} ny`), desc: tr(`${ITEMS[id].desc} (보유 ${countItem(id)})`, `${ITEMS[id].desc} (have ${countItem(id)})`), fn: () => {
      if (S.money < ITEMS[id].price) { toast(tr('엽전이 모자라다.', 'Not enough coins.'), COL.red); sfx('cancel'); return; }
      S.money -= ITEMS[id].price; addItem(id); sfx('pick'); toast(tr(`${ITEMS[id].name}을(를) 샀다! (남은 돈 ${S.money}냥)`, `Bought ${ITEMS[id].name}! (${S.money} nyang left)`));
    } })), { title: tr(`장터 · ${S.money}냥`, `Market · ${S.money} nyang`), desc: true, keep: true, x: 150, y: 30, w: 200 });
    const sell = () => {
      const ids = Object.keys(S.items).filter((id) => ITEMS[id]);
      if (!ids.length) return toast(tr('팔 물건이 없다.', 'Nothing to sell.'));
      openMenu(ids.map((id) => ({ label: `${ITEMS[id].name} ×${countItem(id)}`, right: tr(`${Math.floor(ITEMS[id].price / 2)}냥`, `${Math.floor(ITEMS[id].price / 2)} ny`), fn: () => { takeItem(id); S.money += Math.floor(ITEMS[id].price / 2); sfx('pick'); toast(tr(`팔았다. (${S.money}냥)`, `Sold. (${S.money} nyang)`)); } })), { title: tr('팔기', 'Sell'), x: 150, y: 30, w: 200 });
    };
    say([{ who: npc.sp, name: npc.name, text: tr('골라 보시오, 골라 봐! 던전 가기 전엔 열매가 필수라오!', 'Take your pick! Never head into a dungeon without berries!'), choices: tr(['사기', '팔기', '그만두기'], ['Buy', 'Sell', 'Leave']), onChoice: (i) => { if (i === 0) buy(); else if (i === 1) sell(); } }]);
  }
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
    if (this.bg) c.drawImage(this.bg, 0, 0);
    // water shimmer
    if (this.def.biome === 'coast') {
      c.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 40; i++) { const x = (i * 97 + Math.floor(G.time * 12) * 3) % (this.W * TILE), y = (this.H - 6) * TILE + (i * 53) % (5 * TILE); c.fillRect(x, y, 6, 1); }
    }
    if (this.gate) this.drawGate(c);
    const list = [];
    for (const o of this.objs) list.push({ base: o.base, draw: () => {
      const im = img(o.img);
      if (!ready(im)) return;
      if (o.prop) c.drawImage(im, Math.round(o.tx * TILE + (o.fw * TILE - im.width) / 2), Math.round((o.ty + o.fd) * TILE - im.height + 2));
      else c.drawImage(im, o.x, o.y + (o.bob != null ? Math.round(Math.sin(G.time * 1.5 + o.bob) * 1.5) : 0));
    } });
    for (const n of this.npcs) list.push({ base: n.vy * TILE + TILE, draw: () => {
      drawMon(c, n.sp, false, n.vx * TILE + 12, n.vy * TILE + TILE, { facing: n.face, phase: n.phase });
      if (this.isQuestNpc(n)) this.drawMark(c, n.vx * TILE + 12, n.vy * TILE - 12, '!', COL.red);
    } });
    const [a, b, m3] = S.party;
    const Q = this.mate;
    if (Q && m3) list.push({ base: Q.vy * TILE + TILE - 2, draw: () => drawMon(c, m3.sp, m3.shiny, Q.vx * TILE + 12, Q.vy * TILE + TILE, { face: Q.dir, facing: Q.face === 'right' ? 'right' : 'left', moving: this.moving, phase: 2 }) });
    list.push({ base: this.partner.vy * TILE + TILE - 1, draw: () => drawMon(c, b.sp, b.shiny, this.partner.vx * TILE + 12, this.partner.vy * TILE + TILE, { face: this.partner.dir, facing: this.partner.face === 'right' ? 'right' : 'left', moving: this.moving, phase: 1 }) });
    list.push({ base: this.vy * TILE + TILE, draw: () => drawMon(c, a.sp, a.shiny, this.vx * TILE + 12, this.vy * TILE + TILE, { face: this.face, facing: this.face === 'right' ? 'right' : this.face === 'left' ? 'left' : this.lastH || 'left', moving: this.moving }) });
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
    return st && st.do === 'talk' && st.npc === n.id;
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
    if (prefs.hints) ui.text(touchUI ? tr('Z 조사 · X 메뉴 · J 퀘스트 · P 동료', 'Z talk · X menu · J quests · P team') : tr('Z 조사 · X 메뉴 · J 퀘스트 · P 동료 · 1/2/3 속도', 'Z talk · X menu · J quests · P team · 1/2/3 speed'), VW - 8, VH - 14, { size: 9, color: '#fff', shadow: true, align: 'right' });
  }
}
