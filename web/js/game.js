// Game rules: Pokémon instances (ROM base stats / learnsets / moves), damage, items, save state.
import { loadJSON, randInt, rand, clamp } from './core.js';
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

const STAGE = (s) => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));

export class Mon {
  constructor(sp, lv, o = {}) {
    this.sp = sp; this.lv = lv; this.shiny = !!o.shiny;
    // boss multipliers must be set before hp, which reads maxhp
    this.boss = !!o.boss; this.hpMul = o.hpMul || 1.3; this.atkMul = o.atkMul || 0.9;
    this.exp = o.exp ?? lv * lv * lv;
    this.moves = o.moves || this.defaultMoves().map((id) => ({ id, pp: DEX.moves[id].pp }));
    this.hp = o.hp ?? this.maxhp;
    this.status = o.status || null;
    this.stages = {};
    this.typeOverride = null; // Arceus plates
    this.slowT = 0; // Regigigas' Slow Start
  }
  get data() { return DEX.species[this.sp]; }
  get name() { return this.data.name; }
  get types() { return this.typeOverride || this.data.types; }
  baseStat(i) { return Math.floor((2 * this.data.base[i] + 15) * this.lv / 100) + 5; }
  get maxhp() { const v = Math.floor((2 * this.data.base[0] + 15) * this.lv / 100) + this.lv + 10; return this.boss ? Math.round(v * this.hpMul) : v; }
  stat(k) {
    const i = { atk: 1, def: 2, spa: 3, spd: 4, spe: 5 }[k];
    let v = this.baseStat(i) * STAGE(this.stages[k] || 0);
    if (this.boss) v *= k === 'atk' || k === 'spa' ? this.atkMul : 1.1;
    if (this.slowT > 0 && (k === 'atk' || k === 'spe')) v *= 0.5;
    return v;
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
  // returns event list: {t:'level'|'learn'|'evolve', ...}
  gainExp(n) {
    const ev = [];
    if (this.lv >= 100) return ev;
    this.exp += n;
    while (this.lv < 100 && this.exp >= this.expNext) {
      const oldMax = this.maxhp;
      this.lv++;
      this.hp += this.maxhp - oldMax;
      ev.push({ t: 'level', lv: this.lv });
      for (const [l, m] of this.data.learn) {
        if (l === this.lv && moveUsable(m) && !this.moves.some((x) => x.id === m)) {
          if (this.moves.length >= 4) this.moves.shift();
          this.moves.push({ id: m, pp: DEX.moves[m].pp });
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
  restorePP() { this.moves.forEach((m) => { m.pp = DEX.moves[m.id].pp; }); }
  toJSON() { return { sp: this.sp, lv: this.lv, exp: this.exp, hp: this.hp, shiny: this.shiny, status: this.status, moves: this.moves }; }
  static from(o) { return new Mon(o.sp, o.lv, o); }
}

// Resolve one move use. Returns {dmg, eff, crit, miss, text[], status, statChange, heal, drain}
export function useMove(att, def, moveId) {
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
      if (who === 'foe' && !hits(att, def, mv)) out.miss = true;
      return out;
    }
    if (mv.effect in STATUS_MOVE) {
      if (!def || def.status || !hits(att, def, mv)) { out.miss = true; return out; }
      out.status = STATUS_MOVE[mv.effect];
      return out;
    }
    return out;
  }
  if (!hits(att, def, mv)) { out.miss = true; return out; }
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
  const s = clamp((att.stages.acc || 0) - (def?.stages.eva || 0), -6, 6);
  const m = s >= 0 ? (3 + s) / 3 : 3 / (3 - s);
  return Math.random() * 100 < mv.acc * m;
}
export function expGain(foe) { return Math.max(4, Math.floor(foe.data.exp * foe.lv / 7 * (foe.boss ? 3 : 1) * 1.6)); }

// ---------------------------------------------------------------- items
export const ITEMS = {
  oran: withText(['오랭열매', 'Oran Berry'], ['HP를 30 회복한다.', 'Restores 30 HP.'], { price: 30, heal: 30 }),
  sitrus: withText(['자뭉열매', 'Sitrus Berry'], ['HP를 최대치의 절반만큼 회복한다.', 'Restores half of max HP.'], { price: 120, healPct: 0.5 }),
  rice: withText(['주먹밥', 'Rice Ball'], ['HP를 80 회복하고 상태 이상을 고친다.', 'Restores 80 HP and cures status problems.'], { price: 90, heal: 80, cure: true }),
  herb: withText(['약초', 'Herb'], ['독·화상·마비 같은 상태 이상을 고친다.', 'Cures poison, burns, paralysis and other status problems.'], { price: 40, cure: true }),
  ginseng: withText(['인삼', 'Ginseng'], ['모든 기술의 PP를 회복한다.', 'Restores the PP of every move.'], { price: 220, pp: true }),
  escape: withText(['탈출 부적', 'Escape Charm'], ['던전에서 곧바로 마을로 돌아간다.', 'Takes you straight back to town from a dungeon.'], { price: 150, escape: true }),
  stone: withText(['돌팔매', 'Sling Stone'], ['앞쪽 일직선으로 던져 적에게 20 데미지를 준다.', 'Thrown straight ahead; deals 20 damage to a foe.'], { price: 12, throw: 20 }),
};
export const SHOP = ['oran', 'sitrus', 'rice', 'herb', 'stone', 'escape', 'ginseng'];
export function itemDef(id, questItems) { return ITEMS[id] || questItems?.[id]; }

// ---------------------------------------------------------------- state
const SAVE_KEY = 'joseon-poke-save-v1';
// v2 added six eras before 1392: older saves move forward by that many eras (levels are lifted on load, see quests.liftLevels);
// v3 added 1940 in front of 1945, so a save in 1945 or the Korean War moves one era on
const SAVE_V = 3, OLD_ERA_SHIFT = 6, ERA_1940 = 15;
// party: [leader, partner, optional recruit]; roster: recruits waiting in town
const FRESH = () => ({ era: 0, step: 0, side: {}, items: {}, money: 0, flags: {}, night: false, playtime: 0, kills: {}, eraClear: false, roster: [], lastNode: 'town', townPos: null, townKind: 1, faction: null, wander: null, mode: 'normal', inRun: null });
export const S = { ...FRESH(), party: [] };
export function newGame(starter, partner, mode = 'normal') {
  Object.assign(S, FRESH(), { items: { oran: 4, stone: 6, escape: 1 }, money: 300, mode });
  S.party = [new Mon(starter, 6, { shiny: true }), new Mon(partner, 6, { shiny: true })];
}
export function save() {
  if (S.party.length < 2) return false;
  try {
    const party = (S.homeParty || S.party).filter((m) => !m.loan); // never save a naval crew or loaned Pokémon as the team
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...S, homeParty: undefined, v: SAVE_V, party: party.map((m) => m.toJSON()), roster: S.roster.map((m) => m.toJSON()), savedAt: Date.now() }));
    return true;
  } catch (e) { return false; }
}
export function readSave() {
  try { const o = JSON.parse(localStorage.getItem(SAVE_KEY)); return o && Array.isArray(o.party) && o.party.length >= 2 ? o : null; } catch (e) { return null; }
}
export const hasSave = () => !!readSave();
export function load() {
  const o = readSave();
  if (!o) return false;
  try {
    const party = o.party.map(Mon.from), roster = (o.roster || []).map(Mon.from);
    const v = o.v || 1;
    if (v < 2) { o.era = (o.era || 0) + OLD_ERA_SHIFT; o.migrated = true; }
    if (v < 3 && o.era >= ERA_1940) o.era++;
    Object.assign(S, FRESH(), o, { party, roster });
    delete S.savedAt;
    return true;
  } catch (e) { console.warn('save load failed', e); return false; }
}

export const LEGENDS = new Set([144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386,
  480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493]);
// the final forms of the 600-total lines: as bosses they fight a tier below the legends (see Dungeon bossTier)
export const PSEUDO = new Set([149, 248, 373, 376, 445]);
// difficulty: a shift to every foe's level, boss HP and the damage foes deal. Challenge plays at Normal strength, but a
// wipe ends the challenge and legendary Pokémon never join; it opens once any ending has been seen (prefs.ended).
export const MODES = {
  easy: { lv: -2, hp: 0.8, dmg: 0.75 },
  normal: { lv: 0, hp: 1, dmg: 1 },
  hard: { lv: 2, hp: 1.25, dmg: 1.25 },
  challenge: { lv: 0, hp: 1, dmg: 1 },
};
export const mode = () => MODES[S.mode] || MODES.normal;
export const ROSTER_MAX = 500; // the 35% recruit rate fills a roster fast
// a defeated Pokémon joins: straight into the party if there is room, otherwise into the town roster
export function recruit(mon) {
  // keeps the moves it fought with (bosses have hand-picked sets) with full PP
  const m = new Mon(mon.sp, mon.lv, { shiny: mon.shiny, moves: mon.moves.map((mv) => ({ id: mv.id, pp: DEX.moves[mv.id].pp })) });
  if (S.party.length < 3) { S.party.push(m); return { m, where: 'party' }; }
  if (S.roster.length >= ROSTER_MAX) return { m, where: 'full' };
  S.roster.push(m);
  return { m, where: 'roster' };
}
export function addItem(id, n = 1) { S.items[id] = (S.items[id] || 0) + n; }
export function takeItem(id, n = 1) { if ((S.items[id] || 0) < n) return false; S.items[id] -= n; if (!S.items[id]) delete S.items[id]; return true; }
export const countItem = (id) => S.items[id] || 0;
