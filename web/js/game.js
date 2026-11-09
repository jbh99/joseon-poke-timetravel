// Game rules: Pokémon instances (ROM base stats / learnsets / moves), damage, items, save state.
import { G, loadJSON, randInt, rand, clamp } from './core.js';
import { EN, tr, onLang, setNames } from './i18n.js';

export let DEX = null;
export async function initData() {
  DEX = await loadJSON('data/dex.json');
  // English names were merged into dex.json from PokeAPI (tools/add_english.py); Korean ones come from the ROM
  for (const s of DEX.species) if (s) s.ko = s.name;
  for (const m of DEX.moves) if (m) m.ko = m.name;
  DEX.types_ko = DEX.types;
  setNames([...DEX.species, ...DEX.moves].filter(Boolean).map((o) => [o.ko, o.en]).concat(DEX.types_ko.map((t, i) => [t, DEX.types_en[i]])));
  applyDexLang();
  onLang(applyDexLang);
}
function applyDexLang() {
  for (const s of DEX.species) if (s) s.name = EN && s.en ? s.en : s.ko;
  for (const m of DEX.moves) if (m) m.name = EN && m.en ? m.en : m.ko;
  DEX.types = EN ? DEX.types_en : DEX.types_ko;
}
// {key: [korean, english]} -> object whose values follow the current language
// item name/desc getters (object spread would freeze them, so they are defined on the item itself)
const withText = (name, desc, o) => Object.defineProperties(o, { name: { get: () => tr(...name), enumerable: true }, desc: { get: () => tr(...desc), enumerable: true } });
const bilingual = (o) => Object.defineProperties({}, Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { get: () => tr(v[0], v[1]), enumerable: true }])));

// Gen 4 type chart, attacker -> defender (indices as in the ROM; 9 = ???)
const CHART = {
  0: { 5: .5, 7: 0, 8: .5 }, 1: { 0: 2, 2: .5, 3: .5, 5: 2, 6: .5, 7: 0, 8: 2, 14: .5, 15: 2, 17: 2 },
  2: { 1: 2, 5: .5, 6: 2, 8: .5, 12: 2, 13: .5 }, 3: { 3: .5, 4: .5, 5: .5, 7: .5, 8: 0, 12: 2 },
  4: { 2: 0, 3: 2, 5: 2, 6: .5, 8: 2, 10: 2, 12: .5, 13: 2 }, 5: { 1: .5, 2: 2, 4: .5, 6: 2, 8: .5, 10: 2, 15: 2 },
  6: { 1: .5, 2: .5, 3: .5, 7: .5, 8: .5, 10: .5, 12: 2, 14: 2, 17: 2 }, 7: { 0: 0, 7: 2, 8: .5, 14: 2, 17: .5 },
  8: { 5: 2, 8: .5, 10: .5, 11: .5, 13: .5, 15: 2 }, 10: { 5: .5, 6: 2, 8: 2, 10: .5, 11: .5, 12: 2, 15: 2, 16: .5 },
  11: { 4: 2, 5: 2, 10: 2, 11: .5, 12: .5, 16: .5 }, 12: { 2: .5, 3: .5, 4: 2, 5: 2, 6: .5, 8: .5, 10: .5, 11: 2, 12: .5, 16: .5 },
  13: { 2: 2, 4: 0, 11: 2, 12: .5, 13: .5, 16: .5 }, 14: { 1: 2, 3: 2, 8: .5, 14: .5, 17: 0 },
  15: { 2: 2, 4: 2, 8: .5, 10: .5, 11: .5, 12: 2, 15: .5, 16: 2 }, 16: { 8: .5, 16: 2 }, 17: { 1: .5, 7: 2, 8: .5, 14: 2, 17: .5 },
};
export function typeMult(atk, defTypes) { return defTypes.reduce((m, t) => m * (CHART[atk]?.[t] ?? 1), 1); }
export const TYPE_COLORS = ['#a8a878', '#c03028', '#a890f0', '#a040a0', '#e0c068', '#b8a038', '#a8b820', '#705898', '#b8b8d0', '#68a090',
  '#f08030', '#6890f0', '#78c850', '#f8d030', '#f85888', '#98d8d8', '#7038f8', '#705848'];

// move effects implemented (canonical Gen 3/4 effect ids)
const STAT_EFFECT = {
  10: ['atk', 1, 'self'], 11: ['def', 1, 'self'], 12: ['spe', 1, 'self'], 13: ['spa', 1, 'self'], 14: ['spd', 1, 'self'],
  16: ['eva', 1, 'self'], 18: ['atk', -1, 'foe'], 19: ['def', -1, 'foe'], 20: ['spe', -1, 'foe'], 21: ['spa', -1, 'foe'],
  22: ['spd', -1, 'foe'], 23: ['acc', -1, 'foe'], 50: ['atk', 2, 'self'], 51: ['def', 2, 'self'], 52: ['spe', 2, 'self'],
  53: ['spa', 2, 'self'], 54: ['spd', 2, 'self'], 58: ['atk', -2, 'foe'], 59: ['def', -2, 'foe'], 60: ['spe', -2, 'foe'],
  62: ['spd', -2, 'foe'],
};
const HIT_STAT = { 68: ['atk', -1], 69: ['def', -1], 70: ['spe', -1], 71: ['spa', -1], 72: ['spd', -1], 73: ['acc', -1] };
const HIT_STATUS = { 2: 'psn', 4: 'brn', 5: 'frz', 6: 'par' };
const STATUS_MOVE = { 1: 'slp', 33: 'psn', 66: 'psn', 67: 'par' };
const HEAL_MOVE = { 32: 0.5, 37: 1 };
export const STATUS_NAME = bilingual({ psn: ['독', 'poisoned'], brn: ['화상', 'burned'], par: ['마비', 'paralyzed'], slp: ['잠듦', 'asleep'], frz: ['얼음', 'frozen'] });
export const STAT_NAME = bilingual({ atk: ['공격', 'Attack'], def: ['방어', 'Defense'], spa: ['특수공격', 'Sp. Atk'], spd: ['특수방어', 'Sp. Def'], spe: ['스피드', 'Speed'], acc: ['명중률', 'accuracy'], eva: ['회피율', 'evasiveness'] });

export function moveUsable(m) {
  const mv = DEX.moves[m];
  if (!mv) return false;
  if (mv.cat !== 2) return mv.power > 0 && ![38, 7, 26, 8].includes(mv.effect);
  return mv.effect in STAT_EFFECT || mv.effect in STATUS_MOVE || mv.effect in HEAL_MOVE;
}
// one line about a move for menus: type, category with its reach in the dungeons, power, and whether it hits all around
export function moveDesc(id) {
  const d = DEX.moves[id];
  const kind = d.cat === 2 ? tr('변화', 'Status') : (d.cat === 0 ? tr('물리(바로 앞)', 'Physical (front tile)') : tr('특수(직선 6칸)', 'Special (6-tile line)')) + tr(' 위력 ', ' power ') + d.power;
  return `${DEX.types[d.type]} · ${kind}${d.target === 4 || d.target === 8 ? tr(' · 주변 전체', ' · all around') : ''}`;
}

const STAGE = (s) => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));
export const PRIMAL_MUL = 1.3;
// the highest level a Pokémon reaches: the main games stop at 100, this journey goes on to 180 (Arceus follows to 180)
export const MAX_LV = 180;
// ordinary foes (every wild, summoned or soldier Pokémon that is not a boss) fight with 80% of their HP and every stat
export const FOE_MUL = 0.8;
// the team's Pokémon carry twice the games' PP for every move (1.9); bosses and ordinary foes keep the games' own
export const PP_MUL = 2;
export const teamPP = (id) => DEX.moves[id].pp * PP_MUL;
// Deoxys' Formes, changed at the red meteorite in town (town.js meteorTalk): base stats and PMD sprite (pmd/spr/386a.png...).
// Speed counts for nothing in these turn-based dungeons, so the Speed Forme dodges instead (eva: a lasting evasion stage).
export const FORMES = {
  386: {
    a: { name: ['어택폼', 'Attack Forme'], base: [50, 180, 20, 180, 20, 150], desc: ['공격과 특수공격이 크게 오르는 대신 방어가 아주 약해진다.', 'Attack and Sp. Atk soar, but its defenses become paper-thin.'] },
    d: { name: ['디펜스폼', 'Defense Forme'], base: [50, 70, 160, 70, 160, 90], desc: ['방어와 특수방어가 크게 오르는 대신 공격이 약해진다.', 'Defense and Sp. Def soar, but its attacks weaken.'] },
    s: { name: ['스피드폼', 'Speed Forme'], base: [50, 95, 90, 95, 90, 180], eva: 1, desc: ['몸이 가벼워져 상대의 공격을 잘 피한다. (회피 +1)', 'Its light body dodges attacks well. (evasion +1)'] },
  },
};
// A form only a boss takes, for the fight (dungeon.js reviveBoss forme; 1.25): no Forme to keep, so the meteorite in town does
// not offer it, a save cannot hold it and a recruit joins in its usual form (recruit)
const FIGHT_FORMES = { 555: { z: { name: ['달마폼', 'Zen Mode'], base: [105, 30, 105, 140, 105, 55] } } };
export const FORME_NORMAL = { name: ['노말폼', 'Normal Forme'], desc: ['공격과 특수공격이 높은 원래 모습.', 'Its original form, strong on offense.'] };

export class Mon {
  constructor(sp, lv, o = {}) {
    this.sp = sp; this.lv = lv; this.shiny = !!o.shiny;
    this.forme = o.forme || null; // a FORMES key (Deoxys); null for the usual form
    // the Forme and the boss multipliers must be set before hp, which reads maxhp (boss and foe also before the moves' PP)
    this.boss = !!o.boss; this.foe = !!o.foe; this.hpMul = o.hpMul || 1.3; this.atkMul = o.atkMul || 0.9;
    // a side's edge in a town battle (the Hanahoe's +15%) lifts every stat and HP; set before hp like the boss multipliers.
    // Ordinary foes (o.foe) take FOE_MUL on top; a recruit is a fresh Mon (recruit()), so it joins at full strength.
    this.buff = (o.buff || 1) * (o.foe ? FOE_MUL : 1);
    this.exp = o.exp ?? lv * lv * lv;
    // moves as saved keep the PP they have left; ones given without PP (a recruit's, a boss's set) start full
    this.moves = (o.moves || this.defaultMoves().map((id) => ({ id }))).map((mv) => (mv.pp == null ? { ...mv, pp: this.maxPP(mv.id) } : mv));
    this.hp = o.hp ?? this.maxhp;
    this.status = o.status || null;
    this.fleet = o.fleet || 0; // its place (1-3) in the naval formation the player fixed (quests.js formation), 0 for none
    this.stages = {};
    this.typeOverride = null; // Arceus plates
    this.slowT = 0; // Regigigas' Slow Start
  }
  get data() { return DEX.species[this.sp]; }
  get formeDef() { return FORMES[this.sp]?.[this.forme] || FIGHT_FORMES[this.sp]?.[this.forme] || null; }
  // form: a temporary prefix such as "원시 " (Primal Reversion); a Forme follows the species name
  get name() { const f = this.formeDef; return (this.form || '') + this.data.name + (f ? ` (${tr(...f.name)})` : ''); }
  get spr() { return this.formeDef ? `${this.sp}${this.forme}` : this.sp; } // sprite key: pmd/spr/386a.png is Attack Forme Deoxys
  get base() { return this.formeDef?.base || this.data.base; }
  get types() { return this.typeOverride || this.data.types; }
  baseStat(i) { return Math.floor((2 * this.base[i] + 15) * this.lv / 100) + 5; }
  get maxhp() { const v = Math.floor((2 * this.base[0] + 15) * this.lv / 100) + this.lv + 10; return Math.round((this.boss ? v * this.hpMul : v) * this.buff); }
  stat(k) {
    const i = { atk: 1, def: 2, spa: 3, spd: 4, spe: 5 }[k];
    let v = this.baseStat(i) * STAGE(this.stages[k] || 0);
    if (this.boss) v *= k === 'atk' || k === 'spa' ? this.atkMul : 1.1 * (k === 'def' || k === 'spd' ? this.defMul || 1 : 1); // defMul: a boss's last form
    if (this.slowT > 0 && (k === 'atk' || k === 'spe')) v *= 0.5;
    // field: a legend at home on this battlefield (Groudon on the Nakdong, Kyogre off Incheon); primal: Primal Reversion.
    // Both last one dungeon run (Dungeon.result clears them) and are never saved.
    return v * this.buff * (this.field || 1) * (this.primal ? PRIMAL_MUL : 1);
  }
  defaultMoves() {
    const learned = this.data.learn.filter(([l, m]) => l <= this.lv && moveUsable(m)).map(([, m]) => m);
    const uniq = [...new Set(learned.reverse())].reverse();
    let pick = uniq.slice(-4);
    if (!pick.some((m) => DEX.moves[m].cat !== 2)) pick = [33, ...pick].slice(0, 4);
    return pick;
  }
  expFor(lv) { return lv * lv * lv; }
  get expNext() { return this.expFor(this.lv + 1); }
  // returns event list: {t:'level'|'learn'|'want'|'evolve', ...}; 'want' is a new move that found all four slots taken
  // (gainExpFor asks which move to forget; a move let go stays learnable from the team screen, see learnable())
  gainExp(n) {
    const ev = [];
    if (this.lv >= MAX_LV) return ev;
    this.exp += n;
    while (this.lv < MAX_LV && this.exp >= this.expNext) {
      const oldMax = this.maxhp;
      this.lv++;
      this.hp += this.maxhp - oldMax;
      ev.push({ t: 'level', lv: this.lv });
      for (const [l, m] of this.data.learn) {
        if (l === this.lv && moveUsable(m) && !this.moves.some((x) => x.id === m)) {
          if (this.moves.length >= 4) { ev.push({ t: 'want', move: m }); continue; }
          this.moves.push({ id: m, pp: this.maxPP(m) });
          ev.push({ t: 'learn', move: m });
        }
      }
      const evo = this.data.evo;
      if (evo && this.lv >= evo[1]) ev.push({ t: 'evolve', to: evo[2] });
    }
    return ev;
  }
  evolve(to) { const r = this.hp / this.maxhp; this.sp = to; this.hp = Math.max(1, Math.round(this.maxhp * r)); }
  heal(full = true) { this.hp = this.maxhp; this.status = null; if (full) this.restorePP(); }
  // a move's full PP: PP_MUL times the games' number on the team, the games' own for bosses and ordinary foes
  maxPP(id) { return this.boss || this.foe ? DEX.moves[id].pp : teamPP(id); }
  restorePP() { this.moves.forEach((m) => { m.pp = this.maxPP(m.id); }); }
  // the moves this species learns by level (ROM learnset), each at its lowest level, that this one doesn't know now
  learnable() {
    const at = new Map();
    for (const [l, m] of this.data.learn) if (moveUsable(m) && !(at.has(m) && at.get(m) <= l)) at.set(m, l);
    for (const x of this.moves) at.delete(x.id);
    return [...at].map(([move, lv]) => ({ move, lv })).sort((a, b) => a.lv - b.lv);
  }
  // a new move takes a free slot, or the place of the move in `slot`
  learn(move, slot) {
    const mv = { id: move, pp: this.maxPP(move) };
    if (this.moves.length < 4) this.moves.push(mv); else this.moves[slot] = mv;
  }
  toJSON() { return { sp: this.sp, lv: this.lv, exp: this.exp, hp: this.hp, shiny: this.shiny, status: this.status, moves: this.moves, forme: this.forme || undefined, fleet: this.fleet || undefined }; }
  // a Pokémon as a save holds it (toJSON) and nothing else: a battle's own numbers (buff, hpMul...) must not reach it.
  // A species, level or moves this game does not have throw (parseSave); any other value out of place is named to `fix`
  // and left to its default. A member above Lv 180 comes down to 180 (up to 1.19 a foe joined at its own level, and the
  // foes of the journey's end stand above 180), its HP and PP within what it can have there.
  static from(o, fix = () => {}) {
    const id = (x, list) => Number.isInteger(x) && x > 0 && !!list[x];
    if (!id(o?.sp, DEX.species) || !Number.isInteger(o.lv) || o.lv < 1) throw new Error('not a save');
    const moves = Array.isArray(o.moves) ? o.moves.filter((mv) => id(mv?.id, DEX.moves)).slice(0, 4) : [];
    if (!moves.length) throw new Error('not a save');
    if (moves.length !== o.moves.length) fix('moves');
    const keep = (v, good, what) => (v == null ? undefined : good(v) ? v : (fix(what), undefined));
    const count = (v) => Number.isFinite(v) && v >= 0, one = (list) => (v) => list.includes(v);
    const m = new Mon(o.sp, Math.min(o.lv, MAX_LV), {
      exp: keep(o.exp, count, 'exp'), hp: keep(o.hp, count, 'hp'), shiny: keep(o.shiny, one([true, false]), 'shiny'),
      status: keep(o.status, one(Object.keys(STATUS_NAME)), 'status'), forme: keep(o.forme, one(Object.keys(FORMES[o.sp] || {})), 'forme'),
      fleet: keep(o.fleet, one([0, 1, 2, 3]), 'fleet'), moves: moves.map((mv) => ({ id: mv.id, pp: keep(mv.pp, count, 'pp') })),
    });
    m.exp = Math.min(m.exp, m.expFor(MAX_LV)); m.hp = Math.min(m.hp, m.maxhp);
    for (const mv of m.moves) mv.pp = Math.min(mv.pp, m.maxPP(mv.id));
    return m;
  }
}

// Resolve one move use. Returns {dmg, eff, crit, miss, text[], status, statChange, heal, drain}.
// sure: no accuracy roll (the team's moves on a foe within 3 tiles, Dungeon.useSkill)
export function useMove(att, def, moveId, sure = false) {
  const mv = moveId === 'basic' ? { name: tr('공격', 'Attack'), cat: 0, power: 30, type: -1, acc: 100, effect: 0, chance: 0 } : DEX.moves[moveId];
  const out = { mv, text: [] };
  if (mv.cat === 2) {
    if (mv.effect in HEAL_MOVE) {
      out.heal = Math.round(att.maxhp * HEAL_MOVE[mv.effect]);
      if (mv.effect === 37) out.selfStatus = 'slp';
      return out;
    }
    if (mv.effect in STAT_EFFECT) {
      const [k, d, who] = STAT_EFFECT[mv.effect];
      out.stat = { k, d, target: who };
      if (who === 'foe' && !sure && !hits(att, def, mv)) out.miss = true;
      return out;
    }
    if (mv.effect in STATUS_MOVE) {
      if (!def || def.status || !(sure || hits(att, def, mv))) { out.miss = true; return out; }
      out.status = STATUS_MOVE[mv.effect];
      return out;
    }
    return out;
  }
  if (!sure && !hits(att, def, mv)) { out.miss = true; return out; }
  const mtype = moveId === 449 && att.typeOverride ? att.typeOverride[0] : mv.type; // Judgment follows the held plate
  const eff = mtype < 0 ? 1 : typeMult(mtype, def.types);
  out.eff = eff;
  if (eff === 0) { out.dmg = 0; return out; }
  let dmg;
  if (mv.power <= 1) dmg = mv.effect === 40 ? Math.max(1, Math.floor(def.hp / 2)) : mv.effect === 41 ? 40 : att.lv;
  else {
    const phys = mv.cat === 0;
    let A = phys ? att.stat('atk') : att.stat('spa');
    const D = phys ? def.stat('def') : def.stat('spd');
    if (att.status === 'brn' && phys) A /= 2;
    const base = Math.floor(Math.floor(Math.floor(2 * att.lv / 5 + 2) * mv.power * A / D) / 50) + 2;
    const stab = mtype >= 0 && att.types.includes(mtype) ? 1.5 : 1;
    out.crit = Math.random() < (mv.effect === 43 ? 1 / 8 : 1 / 16);
    dmg = Math.max(1, Math.floor(base * stab * eff * (out.crit ? 1.5 : 1) * rand(0.85, 1)));
    if (mv.effect === 29) dmg *= randInt(2, 4);
    if (mv.effect === 44) dmg *= 2;
  }
  out.dmg = dmg;
  if (mv.effect === 3 || mv.effect === 8) out.drain = Math.max(1, Math.floor(dmg / 2));
  if (mv.effect === 48 || mv.effect === 198) out.recoil = Math.max(1, Math.floor(dmg / 4));
  const chance = mv.chance || 100;
  if (HIT_STATUS[mv.effect] && !def.status && Math.random() * 100 < chance) out.status = HIT_STATUS[mv.effect];
  if (HIT_STAT[mv.effect] && Math.random() * 100 < chance) { const [k, d] = HIT_STAT[mv.effect]; out.stat = { k, d, target: 'foe' }; }
  return out;
}
function hits(att, def, mv) {
  if (!mv.acc || mv.acc > 100) return true;
  const s = clamp((att.stages.acc || 0) - (def?.stages.eva || 0) - (def?.formeDef?.eva || 0), -6, 6);
  const m = s >= 0 ? (3 + s) / 3 : 3 / (3 - s);
  return Math.random() * 100 < mv.acc * m;
}
export function expGain(foe) { return Math.max(4, Math.floor(foe.data.exp * foe.lv / 7 * (foe.boss ? 3 : 1) * 1.6)); }

// ---------------------------------------------------------------- items
export const ITEMS = {
  oran: withText(['오랭열매', 'Oran Berry'], ['HP를 30 회복한다.', 'Restores 30 HP.'], { price: 30, heal: 30 }),
  sitrus: withText(['자뭉열매', 'Sitrus Berry'], ['HP를 최대치의 55%만큼 회복하고 상태 이상을 고친다.', 'Restores 55% of max HP and cures status problems.'], { price: 120, healPct: 0.55, cure: true }),
  rice: withText(['주먹밥', 'Rice Ball'], ['HP를 80 회복하고 상태 이상을 고친다.', 'Restores 80 HP and cures status problems.'], { price: 90, heal: 80, cure: true }),
  // (no item only cures status since 1.10: the Herb is gone, and 'herb' is a quest item now, content.js QITEMS)
  ginseng: withText(['인삼', 'Ginseng'], ['모든 기술의 PP를 회복한다.', 'Restores the PP of every move.'], { price: 220, pp: true }),
  // one a dungeon run, boss room included (Dungeon.revived); the boss room also stands the fallen up by itself
  revive: withText(['기력의 조각', 'Revive'], ['쓰러진 포켓몬을 HP 절반으로 되살린다. 던전 한 번(보스방 포함)에 하나만 쓸 수 있다.', 'Revives a fainted Pokémon with half its HP. One per dungeon run, boss room included.'], { price: 1000, revive: 0.5 }),
  escape: withText(['탈출 부적', 'Escape Charm'], ['던전에서 곧바로 마을로 돌아간다.', 'Takes you straight back to town from a dungeon.'], { price: 150, escape: true }),
  stone: withText(['돌팔매', 'Sling Stone'], ['앞쪽 일직선으로 던져 적에게 20 데미지를 준다.', 'Thrown straight ahead; deals 20 damage to a foe.'], { price: 12, throw: 20 }),
  // key items (never sold, never used up): in a dungeon they wake the Primal Reversion of the legend they belong to
  redorb: withText(['주홍구슬', 'Red Orb'], ['던전에서 쓰면 그란돈이 원시회귀한다. 그 던전이 끝날 때까지 능력이 크게 오르고 불꽃 타입이 더해진다.', 'Use it in a dungeon and Groudon undergoes Primal Reversion: much stronger, and part Fire type, until the dungeon ends.'], { price: 0, key: true, primal: 383, types: [4, 10] }),
  blueorb: withText(['쪽빛구슬', 'Blue Orb'], ['던전에서 쓰면 가이오가가 원시회귀한다. 그 던전이 끝날 때까지 능력이 크게 오른다.', 'Use it in a dungeon and Kyogre undergoes Primal Reversion: much stronger until the dungeon ends.'], { price: 0, key: true, primal: 382, types: [11] }),
  // the finale's: Palkia and Dialga's light, played at the Spear Pillar's altar (dungeon.js playFlute)
  azureflute: withText(['천계의 피리', 'Azure Flute'], ['펄기아와 디아루가가 남긴 빛으로 된 피리. 천관산 창기둥의 제단에서 불면 시작의 방으로 가는 계단이 나타난다.', 'A flute made of the light Palkia and Dialga left behind. Played at the altar of the Spear Pillar on Mt. Coronet, it brings down the stairs to the Hall of Origin.'], { price: 0, key: true, flute: true }),
};
export const SHOP = ['oran', 'sitrus', 'rice', 'stone', 'escape', 'ginseng', 'revive'];
// Gen 4 TM01-TM92 by move id. A villager in every town deals in them (town.js tmMenu), selling the ones the dungeons can
// use and teaching the move on the spot: strong attacks (power 80 and up) cost 15000 nyang, the rest 10000 (1.13; were
// 3000 and 1000).
export const TMS = [264, 337, 352, 347, 46, 92, 258, 339, 331, 237, 241, 269, 58, 59, 63, 113, 182, 240, 202, 219, 218, 76, 231,
  85, 87, 89, 216, 91, 94, 247, 280, 104, 115, 351, 53, 188, 201, 126, 317, 332, 259, 263, 290, 156, 213, 168, 211, 285, 289,
  315, 355, 411, 412, 206, 362, 374, 451, 203, 406, 409, 261, 318, 373, 153, 421, 371, 278, 416, 397, 148, 444, 419, 86, 360,
  14, 446, 244, 445, 399, 157, 404, 214, 363, 398, 138, 447, 207, 365, 369, 164, 430, 433];
export const tmPrice = (move) => (DEX.moves[move].cat !== 2 && DEX.moves[move].power >= 80 ? 15000 : 10000);
// who can use a TM: a move of its own types, of a type its level-up list already uses, or a Normal move. An
// approximation of the games' TM table, which sits in the ROM's personal data and is not extracted (extract_data.py).
export function tmFits(mon, move) {
  const t = DEX.moves[move].type;
  return t === 0 || mon.data.types.includes(t) || mon.data.learn.some(([, m]) => DEX.moves[m]?.type === t);
}
export function itemDef(id, questItems) { return ITEMS[id] || questItems?.[id]; }

// ---------------------------------------------------------------- state
// one save per journey, named for the difficulty it was started on (S.slot; Settings may change the strength later):
// a new journey replaces only the save of its own difficulty, so a finished story stays while another difficulty is
// played from the start. Normal keeps the key every version before 1.7 used.
export const SLOTS = ['easy', 'normal', 'hard', 'challenge'];
const SAVE_KEY = 'joseon-poke-save-v1', slotKey = (slot) => (slot === 'normal' ? SAVE_KEY : `${SAVE_KEY}-${slot}`);
// the journey a save belongs to; one from before 1.7 goes by its difficulty (a challenge lost on the way plays on at Normal)
export const slotOf = (o) => (SLOTS.includes(o?.slot) ? o.slot : o?.flags?.challengeLost ? 'challenge' : SLOTS.includes(o?.mode) ? o.mode : 'normal');
// v2 added six eras before 1392: older saves move forward by that many eras (levels are lifted on load, see quests.liftLevels);
// v3 added 1940 in front of 1945, so a save in 1945 or the Korean War moves one era on
const SAVE_V = 9, OLD_ERA_SHIFT = 6, ERA_1940 = 15;
// v4 put 1905 between 1887 and 1919 (index 13), and opened the Korean War (v3 index 17) with the battle for Seoul
const ERA_1905 = 13, WAR_V3 = 17, WAR_NEW_STEPS = 2;
function migrateV4(o) {
  if (o.era === WAR_V3 && o.step > 0) o.step += WAR_NEW_STEPS; // already past the war's first talk: the new opening is skipped
  if (o.era >= ERA_1905) o.era++;
  for (const k of Object.keys(o.flags || {})) { // per-era flags (a missed legend met in era N) follow their era
    const m = /^(wander_\d+_)(\d+)$/.exec(k);
    if (m && +m[2] >= ERA_1905) { o.flags[m[1] + (+m[2] + 1)] = o.flags[k]; delete o.flags[k]; }
  }
  o.wander = null; // the missed-legend plan is made again for the new list of eras
}
// v5 gave the lake trio and Darkrai places of their own (no map holds two legends) and put Suicune in the Ice Temple:
// a mid-boss already met counts for its new lair, the temple's old meeting (Regigigas) is dropped, and the
// missed-legend plan is made again, as its hosts now never hold a legend of their own
const MOVED_MIDS = { mid_uldol: 'legend_usuyeong', mid_quarry: 'legend_kyujanggak', mid_alley: 'legend_tapgol', mid_distortion: 'legend_newmoon' };
function migrateV5(o) {
  const f = o.flags || {};
  for (const [from, to] of Object.entries(MOVED_MIDS)) if (f[from]) { f[to] = true; delete f[from]; }
  delete f.legend_icetemple;
  o.wander = null;
}
// v6 took Darkrai out of 1940 (it appears from 1979 on): a missed-legend plan made earlier may still send it to an
// era before 1979, so the plan is made again
function migrateV6(o) { o.wander = null; }
// v7 doubled the team's PP (PP_MUL): every move keeps the share of its PP it had left
function migrateV7(mons) { for (const m of mons) for (const mv of m.moves) mv.pp = Math.min(m.maxPP(mv.id), mv.pp * PP_MUL); }
// v8 dropped the Herb, the one item that did nothing but cure status (Sitrus and Rice Balls still cure): the herbs in
// the bag are paid back at the shop's price ('herb' is now only a quest item). A journey in the middle of the 1392
// Bugak request keeps the herbs it gathered for it, up to the three asked for (up to 1.13 they were paid back too, and
// the request had to be gathered again)
const HERB_PRICE = 40, HERB_ASKED = { e1a: 3 };
function migrateV8(o) {
  const n = o.items?.herb || 0;
  if (!n) return;
  const keep = Math.min(n, Math.max(0, ...Object.entries(HERB_ASKED).map(([id, k]) => (o.side?.[id] === 'active' ? k : 0))));
  o.money = (o.money || 0) + (n - keep) * HERB_PRICE;
  if (keep) o.items.herb = keep; else delete o.items.herb;
}
// party: [leader, partner, optional recruit]; roster: recruits waiting in town. over: a challenge lost (quests.js
// endChallenge), its save kept only to mark the journey ended. dex: the Pokédex record (dexState). koreaAt/worldAt:
// where the line the team is not on was left (main.js toWorld/toKorea); homeParty: the team ashore during a naval
// battle, crewLv: the level its foes go by (Dungeon.boardCrew). A new journey or a loaded save starts from all of these,
// so nothing carries over from the journey before
// jid (1.20): which journey this is, given when it starts (journeys from before 1.20 have none), so a save of another
// journey taking a difficulty's place puts the one there aside instead of losing it (replaceSave, keepJourney)
const FRESH = () => ({ era: 0, step: 0, side: {}, items: {}, money: 0, flags: {}, night: false, playtime: 0, kills: {}, eraClear: false, roster: [], lastNode: 'town', townPos: null, townKind: 1, faction: null, wander: null, mode: 'normal', slot: 'normal', inRun: null, spy: null, over: false, dex: '', koreaAt: null, worldAt: null, homeParty: null, crewLv: null, jid: '' });
export const S = { ...FRESH(), party: [] };
export function newGame(starter, partner, mode = 'normal') {
  const jid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  Object.assign(S, FRESH(), { items: { oran: 4, stone: 6, escape: 1 }, money: 300, mode, slot: mode, jid });
  S.party = [new Mon(starter, 6, { shiny: true }), new Mon(partner, 6, { shiny: true })];
  syncDex();
}
export function save() {
  if (S.party.length < 2) return false;
  try {
    const party = (S.homeParty || S.party).filter((m) => !m.loan); // never save a naval crew or loaned Pokémon as the team
    syncDex();
    localStorage.setItem(slotKey(S.slot), JSON.stringify({ ...S, homeParty: undefined, crewLv: undefined, v: SAVE_V, party: party.map((m) => m.toJSON()), roster: S.roster.map((m) => m.toJSON()), savedAt: Date.now() }));
    G.onSaved?.(); // the cloud copy follows (cloud.js)
    return true;
  } catch (e) { return false; }
}
// a save from before 1.7 sits under the Normal key whatever its difficulty: it moves to its own journey's key, once
export function initSaves() {
  try {
    const text = localStorage.getItem(SAVE_KEY), slot = text && slotOf(JSON.parse(text));
    if (slot && slot !== 'normal' && !localStorage.getItem(slotKey(slot))) { localStorage.setItem(slotKey(slot), text); localStorage.removeItem(SAVE_KEY); }
  } catch (e) { /* private mode, or a broken save left where it is */ }
}
// a journey's save as stored, and a whole save from elsewhere (its cloud copy) taking its place: only one the game wrote
// itself, which parseSave reads with nothing to put right (a damaged copy, or one from a newer version, must not replace a
// good save here; up to 1.19 a few of its fields were looked at, and a copy that broke the town or the Pokédex got in)
export function saveText(slot) { try { return localStorage.getItem(slotKey(slot)); } catch (e) { return null; } }
export function replaceSave(text, slot, eras = Infinity) {
  let o;
  try { o = JSON.parse(text); } catch (e) { throw new Error('not a save'); }
  if (parseSave(o, eras).fixed.length) throw new Error('not a save');
  // another journey (started anew on another device) taking this one's place puts this one aside (Past journeys)
  const here = readSave(slot);
  if (here && !here.over && (here.jid || '') !== (o.jid || '') && !keepJourney(slot)) throw new Error('no room');
  // the save it replaces stays one step behind, in case the copy from elsewhere turns out to be the wrong one
  try { const was = localStorage.getItem(slotKey(slot)); if (was) localStorage.setItem(`${slotKey(slot)}-backup`, was); } catch (e) { /* no room for it: the swap still goes on */ }
  localStorage.setItem(slotKey(slot), text);
}
// what each field of a save may hold (FRESH names them all; null or missing takes the fresh value, as in a save from
// before the field was added)
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x), isInt = (x) => Number.isInteger(x) && x >= 0;
const isStr = (x) => typeof x === 'string', isBool = (x) => x === true || x === false, counts = (x) => isObj(x) && Object.values(x).every(isInt);
const isPlace = (x) => isObj(x) && isInt(x.era) && isInt(x.step) && isBool(x.eraClear) && (x.townKind == null || x.townKind === 1 || x.townKind === 2);
const isSp = (x) => Number.isInteger(x) && x >= 1 && x <= DEX_N; // a species the game has (a spy hunt's suspects)
// a spy hunt under way (no more than the six places the base has for its suspects); one that ended leaves only its era and year
const isHunt = (x) => isInt(x.type) && Number.isFinite(x.kg) && isSp(x.spy) && Array.isArray(x.suspects) && x.suspects.length > 0 && x.suspects.length <= 6 && x.suspects.every(isSp) && x.suspects.includes(x.spy);
const FIELDS = {
  era: isInt, step: isInt, side: isObj, items: counts, money: Number.isFinite, flags: isObj, night: isBool, playtime: (x) => Number.isFinite(x) && x >= 0,
  kills: counts, eraClear: isBool, lastNode: isStr, townPos: (x) => Array.isArray(x) && x.length === 2 && x.every(isInt), townKind: (x) => x === 1 || x === 2,
  faction: isStr, wander: (x) => isObj(x) && isInt(x.era) && isObj(x.at), mode: (x) => Object.keys(MODES).includes(x), inRun: isStr,
  spy: (x) => isObj(x) && isInt(x.era) && isInt(x.year) && (x.suspects == null || isHunt(x)), over: isBool,
  dex: (x) => isStr(x) && /^[0-2]*$/.test(x), koreaAt: isPlace, worldAt: isPlace, jid: isStr,
};
// A save (this device's, or a copy from elsewhere) as the state it plays: the versions' migrations on a copy of it, then
// its Pokémon (Mon.from) and each field as FIELDS allows, so a save that cannot be played leaves S as it was (load). No
// party of two, a newer version's save or an era past `eras` throw; any other value out of place takes its fresh value
// and is named in `fixed` (a save here still loads; a copy from elsewhere is refused, replaceSave).
export function parseSave(o, eras = Infinity) {
  if (!isObj(o)) throw new Error('not a save');
  const v = o.v ?? 1;
  if (!Number.isInteger(v) || v < 1 || v > SAVE_V) throw new Error('not a save');
  const fixed = [], fix = (what) => { if (!fixed.includes(what)) fixed.push(what); };
  const mons = (list, where) => (Array.isArray(list) ? list : []).flatMap((m, i) => { try { return [Mon.from(m, (k) => fix(`${where}${i}.${k}`))]; } catch (e) { fix(`${where}${i}`); return []; } });
  const party = mons(o.party, 'party'), roster = mons(o.roster, 'roster');
  if (party.length < 2) throw new Error('not a save');
  if (party.length > 3) { fix('party'); party.length = 3; }
  if (o.roster != null && !Array.isArray(o.roster)) fix('roster');
  const s = { ...o }; // (a fresh parse of its text, so its objects are its own)
  if (v < 2) { s.era = (s.era || 0) + OLD_ERA_SHIFT; s.migrated = true; }
  if (v < 3 && s.era >= ERA_1940) s.era++;
  if (v < 4) migrateV4(s);
  if (v < 5) migrateV5(s);
  if (v < 6) migrateV6(s);
  if (v < 7) migrateV7([...party, ...roster]);
  if (v < 8) migrateV8(s);
  // v9 (1.13): the ending waits for Kyurem too. 1.13 and 1.14 marked a journey that had opened it with Arceus alone
  // (flags.oldEnding) and let it keep that ending; since 1.15 every journey needs Kyurem (quests.js endingOpen)
  if (isObj(s.flags)) delete s.flags.oldEnding;
  const state = { party, roster, ...(s.migrated && { migrated: true }) };
  for (const [k, ok] of Object.entries(FIELDS)) if (s[k] != null) { if (ok(s[k])) state[k] = s[k]; else fix(k); }
  if ((state.era || 0) >= eras) throw new Error('not a save');
  // the place kept on the line the team is not on: an era that does not exist would stop the game when the team goes back
  for (const k of ['koreaAt', 'worldAt']) if (state[k]?.era >= eras) { delete state[k]; fix(k); }
  return { state, fixed };
}
export function readSave(slot) {
  try { const o = JSON.parse(localStorage.getItem(slotKey(slot))); return o && Array.isArray(o.party) && o.party.length >= 2 ? o : null; } catch (e) { return null; }
}
// a journey that can be continued. A lost challenge's save (over) stays only as a marker, which the cloud syncs like
// any save (cloud.js reads readSave), so neither this device nor another can bring that journey back.
export const journey = (slot) => { const o = readSave(slot); return o && !o.over ? o : null; };
// the journeys saved on this device, the one played last first
export const saves = () => SLOTS.map((slot) => ({ slot, o: journey(slot) })).filter((s) => s.o).sort((a, b) => (b.o.savedAt || 0) - (a.o.savedAt || 0));
// Past journeys (1.20): a journey a new one of the same difficulty takes the place of is put aside here instead of being
// lost (up to 1.19 a new journey replaced it), and the title brings it back to be played again (Title.pickKept). Each is
// kept under its own key, by difficulty and the time it was put aside; KEPT_MAX a difficulty, the oldest going first.
// A signed-in device shares them with the account's other devices (1.21, cloud.js syncKept).
const KEPT = 'joseon-poke-kept-', KEPT_MAX = 5, KEPT_KEY = /^joseon-poke-kept-([a-z]+)-(\d+)$/;
// another device's journey joining this device's list: only one the game wrote itself (replaceSave); throws otherwise. It
// takes no one's place: what leaves a list here also leaves the cloud, and nobody chose to give that one up, so the lists
// of several devices together can run past KEPT_MAX
export function putKept(key, text, eras = Infinity) {
  const m = KEPT_KEY.exec(key);
  if (!m || !SLOTS.includes(m[1])) throw new Error('not a save');
  let o;
  try { o = JSON.parse(text); } catch (e) { throw new Error('not a save'); }
  if (parseSave(o, eras).fixed.length) throw new Error('not a save');
  try { localStorage.setItem(key, text); } catch (e) { throw new Error('no room'); } // a good journey that can come down once there is room
}
// the same journey under another key (two devices each put the same save aside; cloud.js keeps the cloud's key). The old
// key goes first, as the room it frees is the room the new one needs. False: nothing changed
export function renameKept(from, to) {
  try {
    const text = localStorage.getItem(from);
    if (text == null) return false;
    localStorage.removeItem(from);
    try { localStorage.setItem(to, text); } catch (e) { localStorage.setItem(from, text); return false; }
    return true;
  } catch (e) { return false; }
}
export function dropKept(key) { try { localStorage.removeItem(key); } catch (e) { /* private mode */ } }
export function keptText(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
export function keptSaves() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i), m = KEPT_KEY.exec(key || '');
      if (!m || !SLOTS.includes(m[1])) continue;
      try { const o = JSON.parse(localStorage.getItem(key)); if (o && Array.isArray(o.party) && o.party.length >= 2) out.push({ key, slot: m[1], at: +m[2], o }); } catch (e) { /* a broken one is not listed */ }
    }
  } catch (e) { /* private mode */ }
  return out.sort((a, b) => b.at - a.at);
}
// put the journey of `slot` aside, its place left empty for the one coming: false when there was no room to keep it
// (it then stays where it is). Nothing is kept of a lost challenge (its save only marks the journey as ended), and the very
// same save is not kept twice (another device put it aside first); a later save of the same journey is no reason to skip
// this one, as both devices may have gone on from one save and this play be in no other copy.
// evict: the player started a new journey over this one, so a full list lets its oldest go, just the one, even if lists
// merged from several devices made it longer. Nothing else takes a journey off the list, as what leaves it here leaves the
// other devices too (cloud.js): up to 1.23 taking another device's new journey with a full list here dropped an unrelated one
export function keepJourney(slot, evict = false) {
  const text = saveText(slot);
  let o = null;
  try { o = JSON.parse(text); } catch (e) { /* none, or a broken one */ }
  if (!o || !Array.isArray(o.party) || o.over) return true;
  const list = keptSaves().filter((k) => k.slot === slot), at = o.savedAt || 0; // newest first
  if (!list.some((k) => (k.o.jid || '') === (o.jid || '') && (k.o.savedAt || 0) === at)) {
    try { localStorage.setItem(`${KEPT}${slot}-${Date.now()}`, text); } catch (e) { return false; }
    if (evict && list.length >= KEPT_MAX) localStorage.removeItem(list[list.length - 1].key);
  }
  localStorage.removeItem(slotKey(slot));
  return true;
}
// a journey put aside comes back to its difficulty's place, the one there (if any) going aside in its stead. It leaves
// the list first, so the one going aside cannot push it out of a full list; on any failure it goes back to the list.
export function restoreKept(k) {
  let text = null;
  try { text = localStorage.getItem(k.key); } catch (e) { /* private mode */ }
  if (!text) return false;
  localStorage.removeItem(k.key);
  const back = () => { try { localStorage.setItem(k.key, text); } catch (e) { /* the room it had was just freed */ } return false; };
  if (!keepJourney(k.slot)) return back();
  try { localStorage.setItem(slotKey(k.slot), text); } catch (e) { return back(); }
  return true;
}
export function load(slot = saves()[0]?.slot, eras = Infinity) {
  const o = slot && journey(slot);
  if (!o) return false;
  let got;
  try { got = parseSave(o, eras); } catch (e) { console.warn('save load failed', e); return false; }
  if (got.fixed.length) console.warn('save put right:', got.fixed.join(' '));
  Object.assign(S, FRESH(), got.state, { slot }); // the key it was read from names its journey
  syncDex(); // a save from before the Pokédex fills its record in
  return true;
}

export const LEGENDS = new Set([144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386,
  480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493,
  494, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649]); // the fifth generation's, from Pokémon Black
// the final forms of the 600-total lines: as bosses they fight a tier below the legends (see Dungeon bossTier)
export const PSEUDO = new Set([149, 248, 373, 376, 445, 635]);
// difficulty: a shift to every foe's level, boss HP, the damage foes deal and an edge (stat) on every foe's HP and
// stats. Normal, Hard and Challenge field the same levels (quests.js foeLevels); Hard's foes, bosses included, have 25%
// more HP and every stat, and their blasts (a share of the team's HP) hit 25% harder. Challenge plays at Normal
// strength, but a wipe before the ending ends the journey for good (quests.js atStake) and legendary Pokémon never
// join; it opens once any ending has been seen (prefs.ended). naval: how far a naval battle's foes stand above the crew
// that sets out (quests.js foeLevels): Normal 3, Hard 5 (1.18), Easy two below Normal as everywhere.
export const MODES = {
  easy: { lv: -2, hp: 0.8, dmg: 0.75, stat: 1, naval: 1 },
  normal: { lv: 0, hp: 1, dmg: 1, stat: 1, naval: 3 },
  hard: { lv: 0, hp: 1, dmg: 1, stat: 1.25, naval: 5 },
  challenge: { lv: 0, hp: 1, dmg: 1, stat: 1, naval: 3 },
};
export const mode = () => MODES[S.mode] || MODES.normal;
export const MODE_NAMES = () => tr({ easy: '쉬움', normal: '보통', hard: '어려움', challenge: '챌린지' }, { easy: 'Easy', normal: 'Normal', hard: 'Hard', challenge: 'Challenge' });
export const ROSTER_MAX = 500; // the 35% recruit rate fills a roster fast
// a defeated Pokémon joins: straight into the party if there is room, otherwise into the town roster
export function recruit(mon) {
  // keeps the moves it fought with (bosses have hand-picked sets) with full PP. A foe above Lv 180 (at the journey's end
  // they stand above the team, which stops at 180) joins at 180: up to 1.19 it joined at its own level, every foe after it
  // stood higher again (quests.js foeLevels goes by the team's best), and the cloud refused the save
  const m = new Mon(mon.sp, Math.min(mon.lv, MAX_LV), { shiny: mon.shiny, moves: mon.moves.map((mv) => ({ id: mv.id })) });
  dexMark(m.sp, 2);
  if (S.party.length < 3) { S.party.push(m); return { m, where: 'party' }; }
  if (S.roster.length >= ROSTER_MAX) return { m, where: 'full' };
  S.roster.push(m);
  return { m, where: 'roster' };
}
// The Pokédex record: a character a species, by national number (index 0 unused): 0 not met, 1 seen (fought), 2 caught
// (it joined the team). A mark only ever goes up.
export const DEX_N = 649;
const dexRec = () => (S.dex?.length > DEX_N ? S.dex : (S.dex || '').padEnd(DEX_N + 1, '0'));
export const dexState = (sp) => +dexRec()[sp] || 0;
export function dexMark(sp, v) {
  if (!(sp >= 1 && sp <= DEX_N) || dexState(sp) >= v) return;
  const r = dexRec();
  S.dex = r.slice(0, sp) + v + r.slice(sp + 1);
}
// every Pokémon on the team or waiting in the roster counts as caught (an evolution too), every one defeated as seen
export function syncDex() {
  for (const m of [...(S.homeParty || S.party), ...S.roster]) if (!m.loan) dexMark(m.sp, 2);
  for (const sp of Object.keys(S.kills || {})) dexMark(+sp, 1);
}
export function addItem(id, n = 1) { S.items[id] = (S.items[id] || 0) + n; }
export function takeItem(id, n = 1) { if ((S.items[id] || 0) < n) return false; S.items[id] -= n; if (!S.items[id]) delete S.items[id]; return true; }
export const countItem = (id) => S.items[id] || 0;
