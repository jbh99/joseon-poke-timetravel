// Main / side quest state machine and shared menus (party, items, quest log, board, evolution).
import { G, VW, VH, ui, COL, say, openMenu, toast, input, img, clamp, prefs, setPref, askText, fadeTo, shuffle } from './core.js';
import { S, DEX, Mon, ITEMS, addItem, takeItem, countItem, itemDef, TYPE_COLORS, STATUS_NAME, ROSTER_MAX, recruit, LEGENDS, mode, save } from './game.js';
import { ERAS, QITEMS, FACTIONS, FACTION_TALK, FACTION_PICK, CELEBI } from './content.js';
import { jingle, sfx, cry, setMuted } from './audio.js';
import { tr } from './i18n.js';
import { iconPath } from './pmd.js';

export const era = () => ERAS[S.era];
export const mainStep = () => era().main[S.step];
export const eraComplete = () => S.step >= era().main.length;
// ---------------------------------------------------------------- foe levels and difficulty
// A dungeon's foe levels as [lowest, highest, scaled]. Before 1200, and while the team's best is at most Lv 20, the band
// is the designed one; from then on it follows the team's strongest Pokémon (its level to +2, then +3 to +5 past Lv 45),
// never below the design. The difficulty mode shifts both ends.
export function foeLevels(d) {
  const top = Math.max(...(S.homeParty || S.party).map((m) => m.lv));
  let lo = d.lv[0], hi = d.lv[1] + 1;
  const scaled = era().year >= 1200 && top > 20;
  if (scaled) { const [a, b] = top > 45 ? [3, 5] : [0, 2]; lo = Math.max(lo, top + a); hi = Math.max(hi, top + b); }
  const k = mode().lv;
  return [Math.max(2, lo + k), Math.max(2, hi + k), scaled];
}
export const MODE_NAMES = () => tr({ easy: '쉬움', normal: '보통', hard: '어려움', challenge: '챌린지' }, { easy: 'Easy', normal: 'Normal', hard: 'Hard', challenge: 'Challenge' });
export const challenge = () => S.mode === 'challenge';
// a challenge ends at the first wipe (or a run abandoned mid-dungeon): the journey goes on at Normal
export function loseChallenge() {
  if (!challenge()) return false;
  S.mode = 'normal'; S.flags.challengeLost = true;
  return true;
}
// continuing a challenge save that was left in the middle of a dungeon counts as that run's defeat
export function checkRun() {
  const left = S.inRun;
  S.inRun = null;
  if (left && loseChallenge()) { save(); say([{ who: 'narr', text: tr('챌린지 실패… 던전 도중에 여행을 멈췄다. 이 여행은 이제 보통 난이도로 이어진다.', 'Challenge failed... the journey stopped in the middle of a dungeon. It now continues at Normal.') }]); }
}
const RUN = ['dungeon', 'battle']; // steps that are a dungeon run (a 'battle' is started by talking to its NPC in town)
const ahead = (dId) => era().main.some((s, i) => i >= S.step && RUN.includes(s.do) && s.d === dId); // its story run is still to come
// a legend lair is done once its legend was met, or for the post-war Regi line (retry) once it joined
export function lairDone(dId) {
  const d = era().dungeons[dId], b = d?.boss;
  return !b || (b.retry ? !!S.flags['got_' + b.sp] : !!S.flags['legend_' + dId]);
}

// ---------------------------------------------------------------- missed legends
// A legendary boss (story or optional) from an era already left behind that never joined comes back in the next era,
// one floor below the last of one of that era's dungeons, at the dungeon's own level. Side dungeons host first, then
// naval ones, then story dungeons (outside their story run). The plan is fixed when the era is first entered, so a
// legend keeps its dungeon all era; one met but left behind again moves on to the era after.
const legendBosses = (d) => [d.mid, d.boss].filter((b) => b && LEGENDS.has(b.sp) && !b.final && !b.noWander);
const joined = (sp) => S.flags['got_' + sp] || [...S.party, ...(S.homeParty || []), ...S.roster].some((m) => m.sp === sp);
function wanderPlan() {
  if (challenge()) return {}; // legends never join a challenge, so none come back either
  if (S.wander?.era === S.era) return S.wander.at;
  const e = era(), missed = [], seen = new Set();
  for (let i = 0; i < S.era; i++) for (const d of Object.values(ERAS[i].dungeons)) for (const b of legendBosses(d)) {
    if (!seen.has(b.sp) && !joined(b.sp)) missed.push(b.sp);
    seen.add(b.sp);
  }
  const story = (id) => e.main.some((s) => s.do === 'dungeon' && s.d === id);
  const rank = (id) => (story(id) ? 2 : 0) + (e.dungeons[id].water ? 1 : 0);
  const hosts = e.nodes.filter((n) => n.d && !e.dungeons[n.d].legend).map((n) => n.d).sort((a, b) => rank(a) - rank(b));
  const at = {};
  hosts.forEach((id, k) => { if (missed[k]) at[id] = missed[k]; });
  S.wander = { era: S.era, at };
  return at;
}
// the missed legend waiting in this dungeon right now, if any (a story dungeon hosts one only outside its story run)
export function wanderAt(dId) {
  const sp = wanderPlan()[dId], st = mainStep();
  if (!sp || S.flags[`wander_${sp}_${S.era}`] || (st?.do === 'dungeon' && st.d === dId)) return null;
  return sp;
}
// its boss fight: the original moves, blasts and second form, at the host dungeon's top foe level (foeLevels)
export function wanderBoss(dId) {
  const sp = wanderAt(dId);
  if (!sp) return null;
  const b = ERAS.flatMap((e) => Object.values(e.dungeons).flatMap(legendBosses)).find((x) => x.sp === sp);
  const lv = foeLevels(era().dungeons[dId])[1], name = DEX.species[sp].name;
  return { ...b, lv, lvMin: lv, lvUp: 0, wander: true,
    say: [
      { who: 'narr', text: tr(`가장 깊은 곳에 전설의 기척이 가득하다… 지난 시대에 만나지 못했던 ${name}이(가) 시간을 건너 이곳에 나타났다!`, `A legendary presence fills the deepest floor... ${name}, the one you missed in an earlier era, has crossed time to appear here!`) },
      { who: sp, name, text: tr('…시간의 틈 너머에서 너희를 지켜보았다. 이번에는 너희의 마음을 보여 다오.', '...I watched you from beyond the rift in time. This time, show me your resolve.') },
      { who: 'partner', text: tr(`그때 놓쳤던 전설의 포켓몬, ${name}! 이번에는 꼭 함께 가자!`, `It's ${name}, the one we missed! This time it comes with us!`) }],
    after: [{ who: sp, name, text: tr('…시대를 건너서까지 다시 만났구나. 너희의 마음, 확실히 보았다.', '...So we meet again, even across the ages. I have seen your resolve.') }] };
}
// the legendary Pokémon a dungeon still holds, for the world map: a lair's legend, a returning one, story legends to come
export function legendsAt(dId) {
  const d = era().dungeons[dId], out = [];
  if (d.legend) { if (!lairDone(dId)) out.push(d.boss.sp); return out; }
  const w = wanderAt(dId);
  if (w) out.push(w);
  if (ahead(dId)) {
    if (d.mid && LEGENDS.has(d.mid.sp) && !S.flags['mid_' + dId]) out.push(d.mid.sp);
    if (d.boss && LEGENDS.has(d.boss.sp)) out.push(d.boss.sp);
  }
  return out;
}
// 'partner' / 'player' lines are spoken by the real team even while a naval battle fields a water-only crew
const home = () => S.homeParty || S.party;
const partnerLine = (L) => (L.who === 'partner' ? { ...L, who: home()[1].sp, shiny: home()[1].shiny, name: home()[1].name } : L.who === 'player' ? { ...L, who: home()[0].sp, shiny: home()[0].shiny, name: home()[0].name } : L);
export const lines = (arr) => arr.map(partnerLine);

export async function advanceMain() {
  S.step++;
  const st = mainStep();
  if (st?.do === 'scene') { await say(lines(st.say)); return advanceMain(); }
  if (st?.do === 'faction') { if (!S.faction) await chooseFaction(); return advanceMain(); }
  if (!st) {
    await say(lines(era().outro));
    S.eraClear = true;
    jingle('fanfa5');
    await say([{ who: 251, name: tr('세레비', 'Celebi'), text: tr(`시간의 꽃잎이 빛나고 있어! ${era().year}년의 꽃잎을 되찾았어. 광장의 "시간의 문"이 열렸을 거야!`, `The petal is shining! We got back the petal of ${era().year}. The Time Gate in the square should be open now!`) }]);
    G.gainAll?.(Math.round(80 * (S.era + 1) ** 1.6), tr('꽃잎의 힘', 'Power of the petal'));
  } else toast(tr('새 목표: ', 'New goal: ') + st.log, COL.blue);
}

// a save that stopped on a step which runs by itself (a scene or the choice of a side, e.g. one added later to an era
// it had finished) plays it on arrival in town
export async function resumeSteps() {
  const st = mainStep();
  if (st?.do === 'scene' || st?.do === 'faction') { S.step--; await advanceMain(); }
}
// an old save moved into a later era: bring the team up to that era's foes
export function liftLevels() {
  if (!S.migrated) return;
  delete S.migrated;
  const lo = Math.min(...Object.values(era().dungeons).map((d) => d.lv[0])) - 1;
  for (const m of [...S.party, ...S.roster]) if (m.lv < lo) { m.lv = lo; m.exp = m.expFor(lo); m.hp = m.maxhp; }
  toast(tr('시대가 늘어나 포켓몬들의 레벨이 맞춰졌다.', 'New eras were added, so your team was levelled up to match.'), COL.blue);
}

// story gifts (the water crew for the first naval battles, faction companions) join at the team's level
export function giveMons(list) {
  const home = S.homeParty || S.party;
  const lv = Math.max(5, Math.round(home.reduce((s, m) => s + m.lv, 0) / home.length));
  for (const sp of list) {
    const { m, where } = recruit(new Mon(sp, lv));
    if (where === 'full') continue;
    cry(sp); jingle('fanfa4');
    toast(where === 'party' ? tr(`${m.name}이(가) 동료가 되어 함께 간다!`, `${m.name} joined and travels with you!`) : tr(`${m.name}이(가) 동료가 되었다! (마을의 동료 명부로)`, `${m.name} joined! (waiting in the town roster)`), COL.blue);
  }
}
// the Korean War: pick whose side to stay beside, then a companion from that land
export async function chooseFaction() {
  await say(lines(FACTION_TALK));
  let f = 'south', pick = null;
  await say([{ who: 'narr', text: tr('어느 쪽 사람들 곁에 있을까?', 'Whose side will you stay beside?'), choices: [FACTIONS.south.name, FACTIONS.north.name], cancel: false, onChoice: (i) => { f = i ? 'north' : 'south'; } }]);
  S.faction = f;
  const mons = FACTIONS[f].mons;
  await say([{ who: CELEBI, name: tr('세레비', 'Celebi'), text: FACTION_PICK.text, choices: mons.map((sp) => DEX.species[sp].name), cancel: false, onChoice: (i) => { pick = mons[i]; } }]);
  giveMons([pick]);
}
// which town holds the NPC of a 'talk' step (1 main, 2 second town)
export const talkTown = (st) => (st?.npc && era().town2?.npcs?.some((n) => n.id === st.npc) ? 2 : 1);

export function onDungeonClear(dId) {
  const st = mainStep();
  if (RUN.includes(st?.do) && st.d === dId) return advanceMain();
}

// ---------------------------------------------------------------- the 1920 spy hunt
// A spy (Ditto) hides in the independence army's base disguised as one of its Pokémon. The informant knows the
// disguise's type and, from its footprints, roughly how heavy it is (within 8%); the suspects all share that type,
// each at least 30% heavier than the next, so the nearest weight is the spy. Suspects can be weighed (Pokédex
// weight) and one accused: a wrong accusation costs three years, every dungeon trip one. Reaching 1930 brings the
// police down on the base: the team is knocked out, coins are lost, and the hunt starts over with a new disguise.
export const SPY_END = 1930;
const SPY_POOLS = {
  10: [4, 37, 58, 77, 126, 219, 155, 228, 322, 324],
  11: [183, 60, 54, 418, 79, 55, 7, 116, 222, 120],
  0: [19, 52, 133, 216, 399, 20, 241, 217, 143, 161],
  12: [43, 69, 187, 152, 191, 315, 2, 114, 3, 460],
};
export const spyActive = () => mainStep()?.do === 'spy';
function spyState() {
  if (S.spy && S.spy.era === S.era) return S.spy;
  const types = Object.keys(SPY_POOLS), type = +types[Math.floor(Math.random() * types.length)];
  const pool = shuffle(SPY_POOLS[type].slice()).map((sp) => [sp, DEX.species[sp].kg]).sort((a, b) => a[1] - b[1]);
  const picks = [];
  for (const p of pool) if (!picks.length || p[1] >= picks[picks.length - 1][1] * 1.3) picks.push(p);
  const suspects = shuffle(picks).slice(0, 6);
  const spy = suspects[Math.floor(Math.random() * suspects.length)];
  S.spy = { era: S.era, year: 1921, type, kg: Math.round(spy[1] * (0.92 + Math.random() * 0.16) * 2) / 2, spy: spy[0], suspects: suspects.map((s) => s[0]) };
  return S.spy;
}
// the suspects standing around the base while the hunt is on
export function spySuspects() {
  if (!spyActive()) return [];
  return spyState().suspects.map((sp, k) => ({ id: `suspect${k}`, sp, role: 'suspect', x: [6, 13, 18, 26, 31, 35][k], y: [9, 20, 24, 9, 22, 25][k], wander: 2, say: [] }));
}
// a dungeon trip while the hunt is on lets a year go by
export function spyTick() {
  if (!spyActive()) return null;
  const s = spyState();
  s.year++;
  return tr(`그사이 1년이 흘렀다. 지금은 ${s.year}년. (${SPY_END}년이 되기 전에 밀정을 찾자!)`, `A year went by meanwhile. It is now ${s.year}. (Find the spy before ${SPY_END}!)`);
}
export const spyDue = () => spyActive() && spyState().year >= SPY_END;
async function spyInformant(npc) {
  const s = spyState(), tn = DEX.types[s.type];
  await say([
    { who: npc.sp, name: npc.name, text: tr('기지 안에 밀정이 숨어 있어! 다른 포켓몬으로 변신해서 우리 작전을 일본군에게 넘기고 있대.', 'There\'s a spy in the base! It transforms into other Pokémon and passes our plans to the Japanese army.') },
    { who: npc.sp, name: npc.name, text: tr(`내가 알아낸 건 두 가지야. 밀정은 ${tn} 타입 포켓몬으로 변신했어. 그리고 몰래 드나든 자리의 발자국을 보면 몸무게는 대략 ${s.kg}kg이야.`, `I found out two things. The spy is disguised as a ${tn}-type Pokémon. And from the footprints where it sneaks in and out, it weighs about ${s.kg} kg.`) },
    { who: npc.sp, name: npc.name, text: tr(`기지의 ${tn} 타입 포켓몬들을 저울에 달아 보고 밀정을 찾아 줘. 지금은 ${s.year}년, ${SPY_END}년이 되기 전에! 엉뚱한 포켓몬을 붙잡으면 그사이 시간이 흘러 버려.`, `Weigh the base's ${tn}-type Pokémon and find the spy. It's ${s.year} now: before ${SPY_END}! Grab the wrong one and time slips away.`) }]);
}
function spySuspect(npc, town) {
  const kg = DEX.species[npc.sp].kg;
  say([{ who: npc.sp, name: npc.name, text: tr('…무슨 일이오? (눈길을 슬쩍 피한다)', '...What is it? (It glances away)'),
    choices: tr(['저울에 달아 본다', '밀정으로 지목한다', '그만둔다'], ['Weigh it', 'Accuse it of spying', 'Leave it']), onChoice: (i) => {
      if (i === 0) return say([{ who: 'narr', text: tr(`${npc.name}의 몸무게: ${kg}kg`, `${npc.name} weighs ${kg} kg.`) }]);
      if (i === 1) spyAccuse(npc, town);
    } }]);
}
async function spyAccuse(npc, town) {
  const s = spyState();
  if (npc.sp === s.spy) {
    const was = npc.name;
    npc.sp = 132; npc.nameFn = () => tr('밀정 메타몽', 'Spy Ditto'); npc.name = npc.nameFn(); npc.wander = 0; npc.role = 'caught';
    jingle('fanfa4');
    await say([
      { who: 'narr', text: tr(`${was}의 모습이 흐물흐물 녹아내리더니… 메타몽이 나타났다! 밀정이다!`, `${was}'s shape melts away... and a Ditto appears! It's the spy!`) },
      { who: 132, name: npc.name, text: tr('…들켰군. 넘긴 정보는 이미 늦었다만, 더는 못 하겠어.', '...Caught. What I passed on is already gone, but I\'m finished now.') },
      { who: 'partner', text: tr('독립군에게 알리자! 이제 작전이 새어 나가지 않을 거야.', 'Let\'s tell the independence army! Our plans won\'t leak anymore.') }]);
    S.spy = null;
    return advanceMain();
  }
  s.year += 3;
  await say([
    { who: npc.sp, name: npc.name, text: tr('억울하오! 나는 밀정이 아니오!', 'This is unjust! I am no spy!') },
    { who: 'narr', text: tr(`헛소동이 벌어진 사이 진짜 밀정이 또 정보를 빼돌렸다… 어느새 ${s.year}년이 되었다.`, `While the commotion went on, the real spy slipped out more secrets... It is already ${s.year}.`) }]);
  if (s.year >= SPY_END) spyRaid(town);
}
// 1930: the police come for the base
export async function spyRaid(town) {
  if (spyRaid.busy) return;
  spyRaid.busy = true;
  sfx('super');
  await say([
    { who: 'narr', text: tr(`${SPY_END}년. 밀정이 넘긴 정보를 따라 일본 경찰이 기지를 덮쳤다!`, `${SPY_END}. Following the spy's secrets, the Japanese police storm the base!`) },
    { who: 262, name: tr('순사 그라에나', 'Constable Mightyena'), text: tr('독립군은 하나도 남김없이 잡아들여라!', 'Round up every last one of the independence army!') },
    { who: 'narr', text: tr('포켓몬들이 하나둘 쓰러졌다…', 'One by one, your Pokémon went down...') }]);
  const lost = Math.floor(S.money * 0.3);
  S.money -= lost;
  for (const m of [...S.party, ...S.roster]) { m.hp = 1; m.status = null; }
  const ch = loseChallenge();
  S.spy = null; // the hunt starts over: a new disguise, back to 1921
  await say([{ who: 'narr', text: tr(`…정신을 차려 보니 기지 구석이었다. 엽전 ${lost}냥을 잃었다. 밀정 찾기를 처음부터 다시 시작한다.`, `...You came to in a corner of the base, ${lost} nyang poorer. The spy hunt starts over from the beginning.`) },
    ...(ch ? [{ who: 'narr', text: tr('챌린지 실패… 모두 쓰러지고 말았다. 이 여행은 이제 보통 난이도로 이어진다.', 'Challenge failed... the whole team went down. The journey now continues at Normal.') }] : [])]);
  spyRaid.busy = false;
  save();
  fadeTo(() => G.goTown(1));
}

export async function onTalk(npc, town) {
  const st = mainStep();
  if (st?.do === 'talk' && st.npc === npc.id) { await say(lines(st.say)); if (st.gift) giveMons(st.gift); return advanceMain(); }
  if (st?.do === 'battle' && st.npc === npc.id) { // the town itself turns into the battlefield
    await say(lines(st.say));
    return say([{ who: 'narr', text: tr('전투에 나설까? (마을이 그대로 싸움터가 된다)', 'Join the battle? (The town itself becomes the battlefield.)'), choices: tr(['나선다', '아직'], ['Go', 'Not yet']), onChoice: (i) => { if (i === 0) fadeTo(() => G.goDungeon(st.d)); } }]);
  }
  if (st?.do === 'spy') {
    if (st.npc === npc.id) return spyInformant(npc);
    if (npc.role === 'suspect') return spySuspect(npc, town);
  }
  for (const q of era().side) {
    if (q.kind === 'deliver' && q.to === npc.id && S.side[q.id] === 'active' && countItem(q.item)) {
      takeItem(q.item); S.flags['delivered_' + q.id] = true; sfx('pick');
      return say([{ who: npc.sp, name: npc.name, text: tr(`오, ${itemDef(q.item, QITEMS).name}! 잘 받았소. 방(榜)에 가서 완료를 알리시오.`, `Oh, the ${itemDef(q.item, QITEMS).name}! Thank you. Report back at the notice board.`) }]);
    }
  }
  const base = eraComplete() && npc.after ? npc.after : npc.say;
  return say(base.map((l) => ({ who: npc.sp, name: npc.name, ...l })));
}

// ---------------------------------------------------------------- side quests
export function sideState(q) {
  const s = S.side[q.id];
  if (!s) return 'open';
  if (s === 'done') return 'done';
  if (sideReady(q)) return 'ready';
  return 'active';
}
export function sideProgress(q) {
  if (q.kind === 'collect') return `${Math.min(countItem(q.item), q.n)}/${q.n}`;
  if (q.kind === 'defeat') return `${Math.min((S.kills[q.sp] || 0) - (S.flags['k0_' + q.id] || 0), q.n)}/${q.n}`;
  if (q.kind === 'rescue') return S.flags['rescued_' + q.id] ? tr('구출 완료', 'Rescued') : tr(`${dungeonName(q.d)} ${q.floor}층`, `${dungeonName(q.d)} F${q.floor}`);
  if (q.kind === 'deliver') return S.flags['delivered_' + q.id] ? tr('전달 완료', 'Delivered') : tr('전달 전', 'Not delivered');
  return '';
}
function sideReady(q) {
  if (q.kind === 'collect') return countItem(q.item) >= q.n;
  if (q.kind === 'defeat') return (S.kills[q.sp] || 0) - (S.flags['k0_' + q.id] || 0) >= q.n;
  if (q.kind === 'rescue') return !!S.flags['rescued_' + q.id];
  if (q.kind === 'deliver') return !!S.flags['delivered_' + q.id];
  return false;
}
export const dungeonName = (d) => era().dungeons[d]?.name || d;
export function activeSides(dId) { return era().side.filter((q) => S.side[q.id] === 'active' && (!dId || q.d === dId)); }

const CRIER = () => tr('방꾼 페라페', 'Crier Chatot');
const pay = (q) => Math.round(q.reward.money * 1.5 / 10) * 10; // requests pay half again what the content lists
export function boardMenu() {
  const qs = era().side;
  const label = (q) => (tr({ open: '새 의뢰', active: '진행 중', ready: '완료!', done: '끝남' }, { open: 'New', active: 'Active', ready: 'Done!', done: 'Closed' }))[sideState(q)];
  openMenu(qs.map((q) => ({
    label: q.title, right: label(q), desc: tr(`${q.desc}  [보상 ${pay(q)}냥${q.reward.items ? ' + 도구' : ''}] ${sideState(q) === 'active' ? '진행: ' + sideProgress(q) : ''}`, `${q.desc}  [Reward ${pay(q)} nyang${q.reward.items ? ' + items' : ''}] ${sideState(q) === 'active' ? 'Progress: ' + sideProgress(q) : ''}`),
    fn: () => pickQuest(q),
  })), { title: tr(`방(榜) · ${era().year}년 의뢰`, `Notice board · ${era().year} requests`), desc: true, x: 110, y: 40, w: 260 });
}
async function pickQuest(q) {
  const st = sideState(q);
  if (st === 'open') {
    await say([{ who: 441, name: CRIER(), text: q.desc, choices: tr(['맡는다', '그만둔다'], ['Accept', 'Decline']), onChoice: (i) => {
      if (i) return;
      S.side[q.id] = 'active';
      if (q.kind === 'defeat') S.flags['k0_' + q.id] = S.kills[q.sp] || 0;
      if (q.kind === 'deliver') addItem(q.item);
      sfx('confirm'); toast(tr(`의뢰 "${q.title}"을(를) 맡았다!`, `Accepted "${q.title}"!`), COL.blue);
    } }]);
  } else if (st === 'ready') {
    if (q.kind === 'collect') takeItem(q.item, q.n);
    S.side[q.id] = 'done';
    S.money += pay(q);
    for (const [id, n] of Object.entries(q.reward.items || {})) addItem(id, n);
    jingle('fanfa4');
    await say([{ who: 441, name: CRIER(), text: tr(`의뢰 완료! 보상으로 ${pay(q)}냥${q.reward.items ? '과 도구' : ''}를 받았다.`, `Request complete! You received ${pay(q)} nyang${q.reward.items ? ' and items' : ''}.`) }]);
    G.gainAll?.(q.reward.exp || 0, tr('의뢰 보상', 'Request reward'));
  } else if (st === 'active') say([{ who: 441, name: CRIER(), text: tr(`진행 상황: ${sideProgress(q)}. ${q.d ? dungeonName(q.d) + '(으)로 가 보시오.' : ''}`, `Progress: ${sideProgress(q)}. ${q.d ? 'Head to ' + dungeonName(q.d) + '.' : ''}`) }]);
  else say([{ who: 441, name: CRIER(), text: tr('이미 끝난 의뢰라오. 고맙소!', 'That request is already done. Thank you!') }]);
}

export function trackerText() {
  if (eraComplete()) return S.era >= ERAS.length - 1 ? tr('여행 완료! 시간의 문에서 세레비와 이야기하자', 'Journey complete! Talk to Celebi at the Time Gate') : tr('시간의 문이 열렸다! 광장의 문으로 가자', 'The Time Gate is open! Head to the gate in the square');
  const st = mainStep();
  return st && talkTown(st) === 2 ? `${st.log} (${era().town2.name})` : st?.log;
}

// ---------------------------------------------------------------- experience, level-up & evolution
export async function gainExpFor(mon, n, log) {
  const ev = mon.gainExp(n);
  for (const e of ev) {
    if (e.t === 'level') { log?.(tr(`${mon.name}의 레벨이 ${e.lv}(으)로 올랐다!`, `${mon.name} grew to Lv. ${e.lv}!`), COL.blue); jingle('fanfa1'); }
    if (e.t === 'learn') log?.(tr(`${mon.name}은(는) ${DEX.moves[e.move].name}을(를) 배웠다!`, `${mon.name} learned ${DEX.moves[e.move].name}!`), COL.green);
  }
  const evo = ev.find((e) => e.t === 'evolve');
  if (evo) await evolveScene(mon, evo.to);
}
G.gainAll = async (n, why) => {
  if (!n) return;
  toast(tr(`${why}: 경험치 ${n}`, `${why}: ${n} Exp.`), COL.green);
  for (const m of S.party) await gainExpFor(m, n, toast);
  shareExp(n * 2);
};
// companions waiting in the town roster train too: half of what the team earns, evolving quietly
export function shareExp(n) {
  const out = new Set([...S.party, ...(S.homeParty || [])]);
  for (const m of S.roster) {
    if (out.has(m)) continue;
    const evo = m.gainExp(Math.floor(n / 2)).find((e) => e.t === 'evolve');
    if (evo) { const from = m.name; m.evolve(evo.to); toast(tr(`명부의 ${from}이(가) ${m.name}(으)로 진화했다!`, `${from} in the roster evolved into ${m.name}!`), COL.green); }
  }
}

class Evolution {
  constructor(mon, to, done) { this.mon = mon; this.from = mon.sp; this.to = to; this.t = 0; this.done = false; this.cb = done; this.stage = 0; cry(this.from); }
  update(dt) {
    this.t += dt;
    if (this.stage === 0 && this.t > 3.2) { this.stage = 1; this.mon.evolve(this.to); jingle('fanfa2'); cry(this.to); }
    if (this.stage === 1 && this.t > 4 && (input.hit('ok') || this.t > 8)) { this.done = true; this.cb(); }
  }
  drawUI() {
    ui.rect(0, 0, VW, VH, '#141020');
    const sp = this.stage === 0 && Math.floor(this.t * (1 + this.t * 2.5)) % 2 ? this.from : this.to;
    const im = img(`poke/front/${sp}${this.mon.shiny ? 's' : ''}.png`);
    const c = ui.c;
    c.save();
    if (this.stage === 0) c.filter = `brightness(${1 + Math.min(4, this.t)})`;
    ui.image(im, 0, 0, 80, 80, VW / 2 - 80, 50, 160, 160);
    c.restore();
    ui.panel(20, VH - 50, VW - 40, 38);
    ui.text(this.stage === 0 ? tr(`……어라? ${DEX.species[this.from].name}의 모습이…!`, `What? ${DEX.species[this.from].name} is evolving!`) : tr(`축하합니다! ${DEX.species[this.from].name}은(는) ${DEX.species[this.to].name}(으)로 진화했다!`, `Congratulations! ${DEX.species[this.from].name} evolved into ${DEX.species[this.to].name}!`), 32, VH - 37);
  }
}
function evolveScene(mon, to) { return new Promise((res) => G.overlays.push(new Evolution(mon, to, res))); }

// ---------------------------------------------------------------- menus
const ROLE = () => tr(['리더', '파트너', '동료'], ['Leader', 'Partner', 'Ally']);
// box icon (2-frame 32x32 sheet)
function drawIcon(m, x, y) {
  const im = img(iconPath(m.sp, m.shiny));
  ui.image(im, 0, Math.floor(G.time * 3) % 2 * 32, 32, 32, x, y, 32, 32);
}
// the team screen: Z on a member offers reordering its moves (anywhere) or the team (outside dungeons);
// reordering picks one entry with Z and swaps it with the next entry picked. Taps work like the cursor plus Z.
const MOVE_ROW = { x: 166, y: 151, w: 296, h: 24 };
class PartyView {
  constructor(o = {}) { this.done = false; this.sel = 0; this.mode = 'team'; this.held = -1; this.mv = 0; this.dungeon = !!o.dungeon; }
  update() {
    const team = this.mode === 'team', list = team ? S.party : S.party[this.sel].moves, n = list.length;
    let cur = team ? this.sel : this.mv, ok = false;
    if (input.repeat('up') || input.repeat('left')) { cur = (cur + n - 1) % n; sfx('cursor'); }
    if (input.repeat('down') || input.repeat('right')) { cur = (cur + 1) % n; sfx('cursor'); }
    const c = input.click;
    if (c) {
      input.click = null;
      const i = Math.floor((c.y - 32) / 56), j = Math.floor((c.y - MOVE_ROW.y) / MOVE_ROW.h);
      if (c.x >= 14 && c.x < 144 && i >= 0 && i < S.party.length && (team || this.held < 0)) { // a member
        if (!team) { this.mode = 'team'; this.held = -1; }
        if (i === this.sel && team) ok = true; else { this.sel = i; sfx('cursor'); }
        return;
      }
      if (c.x >= MOVE_ROW.x && c.x < MOVE_ROW.x + MOVE_ROW.w && j >= 0 && j < S.party[this.sel].moves.length && (!team || this.held < 0)) { // a move
        if (team) { this.mode = 'moves'; this.held = -1; this.mv = j; sfx('cursor'); return; }
        if (j === cur) ok = true; else { cur = j; sfx('cursor'); }
      }
    }
    if (team) this.sel = cur; else this.mv = cur;
    if (input.hit('cancel')) {
      sfx('cancel');
      if (this.held >= 0) this.held = -1;
      else if (!team) this.mode = 'team';
      else this.done = true;
      return;
    }
    if (!(input.hit('ok') || ok)) return;
    if (this.held >= 0) { // second pick: swap
      if (this.held !== cur) { [list[this.held], list[cur]] = [list[cur], list[this.held]]; sfx('confirm'); } else sfx('cancel');
      this.held = -1;
      return;
    }
    if (!team) { this.held = cur; sfx('confirm'); return; }
    const m = S.party[this.sel];
    openMenu([
      { label: tr('기술 순서 바꾸기', 'Reorder moves'), fn: () => { this.mode = 'moves'; this.mv = 0; } },
      ...(S.party.length > 1 ? [this.dungeon
        ? { label: tr('파티 순서 바꾸기', 'Reorder team'), right: tr('마을에서', 'in town'), disabled: true }
        : { label: tr('파티 순서 바꾸기', 'Reorder team'), fn: () => { this.held = this.sel; } }] : []),
      { label: tr('닫기', 'Close') },
    ], { title: m.name, x: 156, y: 60, w: 190 });
  }
  hint() {
    if (this.held >= 0) return tr('바꿀 자리 고르고 Z · X 취소', 'Pick the spot, Z swaps · X cancel');
    return this.mode === 'moves' ? tr('↑↓ 기술 · Z 골라서 바꾸기 · X 돌아가기', '↑↓ move · Z pick to swap · X back') : tr('↑↓ 선택 · Z 순서 바꾸기 · X 닫기', '↑↓ select · Z reorder · X close');
  }
  drawUI() {
    ui.rect(0, 0, VW, VH, COL.dim);
    // list
    ui.panel(8, 10, 142, 250);
    ui.text(tr('함께하는 포켓몬', 'Your team'), 16, 18, { bold: true, size: 9, color: COL.red });
    S.party.forEach((m, i) => {
      const y = 32 + i * 56;
      const held = this.mode === 'team' && this.held === i;
      ui.panel(14, y, 130, 50, { accent: false, fill: held ? '#f3d27a' : i === this.sel ? '#fff6dc' : COL.paper2 });
      drawIcon(m, 16, y + 6);
      ui.text(m.name, 50, y + 6, { bold: true, size: 9 });
      ui.text(ROLE()[i], 140, y + 6, { size: 9, align: 'right', color: i === 2 ? COL.blue : COL.ink2 });
      ui.text(`Lv.${m.lv}${m.shiny ? ' ★' : ''}`, 50, y + 19, { size: 9, color: m.shiny ? COL.gold : COL.ink2 });
      ui.bar(50, y + 33, 88, 5, m.hp, m.maxhp);
      ui.text(`${m.hp}/${m.maxhp}`, 138, y + 39, { size: 9, align: 'right', color: COL.ink2 });
    });
    ui.text(S.roster.length ? tr(`동료 명부: ${S.roster.length}마리`, `Roster: ${S.roster.length}`) : tr('동료 명부: 없음', 'Roster: empty'), 16, 214, { size: 9, color: COL.ink2 });
    ui.text(tr('마을 메뉴에서 교체', 'Swap in the town menu'), 16, 226, { size: 9, color: COL.ink2 });
    // detail
    const m = S.party[this.sel], x = 156, y = 10, w = 316;
    ui.panel(x, y, w, 250, { fill: '#fbf3dd' });
    ui.portrait(m.sp, m.shiny, x + 10, y + 12, 64);
    ui.text(m.name, x + 84, y + 14, { bold: true });
    ui.text(`Lv.${m.lv}${m.shiny ? tr('  ★이로치', '  ★Shiny') : ''}`, x + 84, y + 28, { size: 9, color: m.shiny ? COL.gold : COL.ink2 });
    m.types.forEach((t, k) => { ui.rect(x + 84 + k * 44, y + 42, 40, 12, TYPE_COLORS[t]); ui.text(DEX.types[t], x + 104 + k * 44, y + 43, { size: 9, color: '#fff', align: 'center' }); });
    ui.text(`HP ${m.hp}/${m.maxhp}`, x + 84, y + 60, { size: 9 });
    ui.bar(x + 84, y + 71, 140, 6, m.hp, m.maxhp);
    if (m.status) ui.text(STATUS_NAME[m.status], x + 230, y + 60, { size: 9, color: COL.red });
    const lo = m.expFor(m.lv), hi = m.expNext;
    ui.text(tr(`경험치 ${m.exp - lo}/${hi - lo}`, `Exp. ${m.exp - lo}/${hi - lo}`), x + 84, y + 82, { size: 9, color: COL.ink2 });
    ui.bar(x + 84, y + 93, 140, 4, m.exp - lo, hi - lo);
    const evo = m.data.evo;
    if (evo) ui.text(tr(`Lv.${evo[1]}에 ${DEX.species[evo[2]].name}(으)로 진화`, `Evolves into ${DEX.species[evo[2]].name} at Lv.${evo[1]}`), x + w - 10, y + 14, { size: 9, align: 'right', color: COL.green });
    const st = tr([['공격', 'atk'], ['방어', 'def'], ['특공', 'spa'], ['특방', 'spd'], ['스피드', 'spe']], [['Atk', 'atk'], ['Def', 'def'], ['SpA', 'spa'], ['SpD', 'spd'], ['Spe', 'spe']]);
    st.forEach(([n, k], j) => ui.text(`${n} ${Math.round(m.stat(k))}`, x + 12 + j * 60, y + 108, { size: 9 }));
    ui.text(tr('기술', 'Moves'), x + 12, y + 128, { bold: true, size: 9, color: COL.red });
    const picking = this.mode === 'moves';
    m.moves.forEach((mv, j) => {
      const d = DEX.moves[mv.id], ry = y + 141 + j * 24;
      ui.rect(x + 10, ry, w - 20, 21, picking && this.held === j ? '#f3d27a' : picking && this.mv === j ? '#fff6dc' : '#efe2c2');
      if (picking && this.mv === j) ui.text('▶', x + 2, ry + 5, { size: 9, color: COL.red });
      ui.rect(x + 10, ry, 4, 21, TYPE_COLORS[d.type]);
      ui.text(`${'QWER'[j]}. ${d.name}`, x + 18, ry + 5, { size: 11 });
      ui.text(`${DEX.types[d.type]} · ${d.cat === 2 ? tr('변화', 'Status') : (d.cat === 0 ? tr('물리 ', 'Phys ') : tr('특수 ', 'Spec ')) + d.power}  PP ${mv.pp}/${d.pp}`, x + w - 16, ry + 6, { size: 9, align: 'right', color: COL.ink2 });
    });
    ui.text(this.hint(), VW - 10, VH - 12, { size: 9, color: '#fff', align: 'right', shadow: true });
  }
}
export function partyMenu(o) { G.overlays.push(new PartyView(o)); }

// recruits: one may travel with the leader and partner; the rest wait in the town roster
// The companion roster (outside dungeons only: P in a dungeon is refused, so boxed companions never join a run).
// The team sits on top: pick a member to swap places or send it to the roster. Below, the roster can be searched
// (name, Korean initials such as ㄹㄱㅇ, type, dex number, or 이로치/shiny) and sorted; picking one swaps it into any slot.
// The search and sort stay while the game runs, and every pick reopens the list on the same row.
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const initials = (s) => [...s].map((ch) => { const c = ch.charCodeAt(0) - 0xac00; return c >= 0 && c < 11172 ? CHO[Math.floor(c / 588)] : ch; }).join('');
const SORTS = ['joined', 'level', 'dex', 'name'];
const view = { q: '', sort: 'joined' };
function matches(m, q) {
  const k = q.toLowerCase().replace(/\s+/g, '');
  if (!k) return true;
  if (m.name.toLowerCase().replace(/\s+/g, '').includes(k)) return true;
  if (/^[ㄱ-ㅎ]+$/.test(k) && initials(m.name).includes(k)) return true;
  if (/^\d+$/.test(k)) return m.sp === +k;
  if (['이로치', 'shiny', '★'].includes(k)) return m.shiny;
  return m.types.some((t) => DEX.types[t].toLowerCase() === k);
}
function rosterView() {
  const list = S.roster.filter((m) => matches(m, view.q));
  if (view.sort === 'level') list.sort((a, b) => b.lv - a.lv);
  else if (view.sort === 'dex') list.sort((a, b) => a.sp - b.sp);
  else if (view.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}
const monRow = (m) => ({ label: `${m.name} Lv.${m.lv}${m.shiny ? ' ★' : ''}`, right: m.types.map((t) => DEX.types[t]).join('/'),
  desc: `HP ${m.hp}/${m.maxhp} · ${tr('기술', 'Moves')}: ${m.moves.map((mv) => DEX.moves[mv.id].name).join(', ')}` });
export function rosterMenu(sel = 0) {
  const sortName = tr({ joined: '들어온 순', level: '레벨 높은 순', dex: '도감 번호 순', name: '이름 순' }, { joined: 'Joined', level: 'Level', dex: 'Dex no.', name: 'Name' });
  const list = rosterView();
  const items = [
    { label: tr('찾기', 'Search'), right: view.q ? `"${view.q}"` : tr('이름 · 타입 · 번호', 'name · type · no.'), desc: tr('이름 일부, 초성(ㄹㄱㅇ), 타입(드래곤), 도감 번호(445), 이로치로 찾을 수 있다.', 'Search by part of a name, a type (Dragon), a dex number (445) or "shiny".'),
      fn: async () => { const q = await askText(tr('찾을 동료 (이름 · 초성 · 타입 · 번호)', 'Find a companion (name · type · number)'), view.q, tr(['찾기', '취소'], ['Search', 'Cancel'])); if (q != null) view.q = q; rosterMenu(0); } },
    ...(view.q ? [{ label: tr('찾기 지우기', 'Clear search'), desc: tr('명부 전체를 다시 보여 준다.', 'Show the whole roster again.'), fn: () => { view.q = ''; rosterMenu(0); } }] : []),
    { label: tr('정렬', 'Sort'), right: sortName[view.sort], desc: tr('명부를 늘어놓는 순서를 바꾼다.', 'Change the order of the roster.'), fn: () => { view.sort = SORTS[(SORTS.indexOf(view.sort) + 1) % SORTS.length]; rosterMenu(view.q ? 2 : 1); } },
  ];
  const top = items.length;
  S.party.forEach((m, i) => items.push({ ...monRow(m), label: `[${ROLE()[i]}] ${m.name} Lv.${m.lv}${m.shiny ? ' ★' : ''}`, fn: () => teamPick(i, top + i) }));
  list.forEach((m, k) => items.push({ ...monRow(m), fn: () => rosterPick(m, top + S.party.length + k) }));
  if (!list.length) items.push({ label: S.roster.length ? tr('찾는 동료가 없다', 'No match') : tr('명부가 비어 있다', 'The roster is empty'), disabled: true,
    desc: S.roster.length ? tr('다른 말로 찾아보자.', 'Try another search.') : tr('보스나 전설의 포켓몬을 이기면, 또는 야생 포켓몬이 가끔 동료가 되고 싶어 한다.', 'Defeated bosses and legendary Pokémon want to join you, and sometimes wild Pokémon do too.') });
  const found = view.q ? tr(` · 찾음 ${list.length}`, ` · ${list.length} found`) : '';
  openMenu(items, { title: tr(`동료 명부 (${S.roster.length}/${ROSTER_MAX})${found}`, `Companions (${S.roster.length}/${ROSTER_MAX})${found}`), desc: true, x: 70, y: 30, w: 340, toggle: 'party', sel: Math.min(sel, items.length - 1) });
}
// a team member: swap places with another, or rest in the roster (the team keeps at least two)
function teamPick(i, row) {
  const m = S.party[i], others = S.party.map((o, j) => j).filter((j) => j !== i);
  const opts = [...others.map((j) => tr(`${ROLE()[j]} ${S.party[j].name}와(과) 자리 바꾸기`, `Swap places with ${S.party[j].name} (${ROLE()[j]})`)),
    ...(S.party.length > 2 ? [tr('명부로 보낸다', 'Send to the roster')] : []), tr('그만두기', 'Cancel')];
  say([{ who: m.sp, shiny: m.shiny, name: m.name, text: tr(`지금 ${ROLE()[i]}(으)로 함께하고 있어. 어떻게 할까?`, `I'm travelling with you as ${ROLE()[i]}. What should I do?`), choices: opts, onChoice: (k) => {
    if (k < others.length) { const j = others[k]; [S.party[i], S.party[j]] = [S.party[j], S.party[i]]; sfx('confirm'); toast(tr(`${m.name}이(가) ${ROLE()[j]} 자리로 옮겼다.`, `${m.name} moved to ${ROLE()[j]}.`), COL.blue); }
    else if (S.party.length > 2 && k === others.length) { S.party.splice(i, 1); S.roster.unshift(m); sfx('confirm'); toast(tr(`${m.name}은(는) 마을에서 쉬기로 했다.`, `${m.name} will rest in town.`)); }
    rosterMenu(row);
  } }]);
}
// a roster companion: swap it into any team slot (or fill the empty third), or release it
function rosterPick(m, row) {
  const slots = S.party.map((o, j) => tr(`${ROLE()[j]} ${o.name}와(과) 교체`, `Swap with ${o.name} (${ROLE()[j]})`));
  const free = S.party.length < 3 ? 1 : 0;
  const opts = [...slots, ...(free ? [tr('함께 간다', 'Bring along')] : []), tr('놓아준다', 'Release'), tr('그만두기', 'Cancel')];
  say([{ who: m.sp, shiny: m.shiny, name: m.name, text: tr('나도 데려가 줄 거야?', 'Will you take me along?'), choices: opts, onChoice: (k) => {
    const at = S.roster.indexOf(m);
    if (k < slots.length) { const out = S.party[k]; S.party[k] = m; S.roster.splice(at, 1, out); cry(m.sp); toast(tr(`${m.name}이(가) ${ROLE()[k]}(으)로 함께 간다!`, `${m.name} joins as ${ROLE()[k]}!`), COL.blue); }
    else if (free && k === slots.length) { S.roster.splice(at, 1); S.party.push(m); cry(m.sp); toast(tr(`${m.name}이(가) 함께 간다!`, `${m.name} is coming along!`), COL.blue); }
    else if (k === slots.length + free) {
      return say([{ who: 'narr', text: tr(`정말 ${m.name}을(를) 자연으로 돌려보낼까? 다시 데려올 수 없다.`, `Really release ${m.name}? You can't bring it back.`), choices: tr(['돌려보낸다', '그만두기'], ['Release', 'Cancel']), onChoice: (j) => {
        if (j === 0) { S.roster.splice(S.roster.indexOf(m), 1); toast(tr(`${m.name}은(는) 고향으로 돌아갔다. 고마웠어!`, `${m.name} went home. Thank you!`)); }
        rosterMenu(row);
      } }]);
    }
    rosterMenu(row);
  } }]);
}

// settings shared by the town and dungeon menus; each pick reopens the list on the same row
export function settingsMenu(sel = 0) {
  const again = (i) => () => { G.onPrefs?.(); settingsMenu(i); };
  openMenu([
    { label: tr('소리', 'Sound'), right: prefs.muted ? tr('끔', 'Off') : tr('켬', 'On'), fn: () => { setMuted(!prefs.muted); again(0)(); } },
    { label: tr('조작키 안내', 'Key hints'), right: prefs.hints ? tr('보임', 'Shown') : tr('숨김', 'Hidden'), fn: () => { setPref('hints', !prefs.hints); again(1)(); } },
    { label: tr('게임 속도', 'Game speed'), right: tr(`${G.speed}배`, `${G.speed}x`), fn: () => { G.setSpeed?.(G.speed % 3 + 1); again(2)(); } },
    // Easy / Normal / Hard can be switched any time; a challenge stays a challenge
    { label: tr('난이도', 'Difficulty'), right: MODE_NAMES()[S.mode] || MODE_NAMES().normal, fn: () => {
      if (challenge()) { toast(tr('챌린지는 난이도를 바꿀 수 없다.', 'A challenge can\'t change difficulty.'), COL.red); return again(3)(); }
      const order = ['easy', 'normal', 'hard'];
      S.mode = order[(order.indexOf(S.mode) + 1) % 3]; again(3)();
    } },
    { label: tr('닫기', 'Close') },
  ], { title: tr('설정', 'Settings'), sel, x: 150, y: 50, w: 190 });
}
// quit to the title screen: towns save first; a dungeon run is not saved (the game continues from the last town visit)
export function quitItem(inDungeon, before) {
  return { label: tr('게임 종료', 'Quit game'), fn: () => say([{ who: 'narr',
    text: inDungeon && challenge() ? tr('챌린지 도중에 던전에서 게임을 끝내면 전멸한 것으로 처리된다(1층이라면 "던전에서 나가기"를 쓰자). 그래도 끝낼까?', 'Quitting a challenge in the middle of a dungeon counts as a wipe (on floor 1, use "Leave the dungeon" instead). Quit anyway?')
      : inDungeon ? tr('게임을 끝내고 타이틀로 돌아갈까? 던전 안에서 한 일은 저장되지 않고, 마지막으로 마을에 들렀을 때부터 이어진다.', 'Quit to the title screen? What you did in this dungeon is not saved; you will continue from your last visit to town.')
      : tr('기록을 남기고 타이틀로 돌아갈까?', 'Save and return to the title screen?'),
    choices: tr(['끝낸다', '계속한다'], ['Quit', 'Keep playing']), onChoice: (i) => { if (i === 0) { before?.(); G.goTitle?.(); } } }]) };
}

export function itemMenu(dungeon) {
  const ids = Object.keys(S.items);
  if (!ids.length) return toast(tr('가진 도구가 없다.', 'You have no items.'));
  openMenu(ids.map((id) => {
    const d = itemDef(id, QITEMS);
    return { label: `${d.name} ×${countItem(id)}`, desc: d.desc, fn: () => useItem(id, dungeon) };
  }), { title: tr('도구', 'Items'), desc: true, x: 120, y: 30, w: 240 });
}
function useItem(id, dungeon) {
  const d = ITEMS[id];
  if (!d) return toast(tr('지금은 쓸 수 없다.', 'You can\'t use that now.'));
  if (d.escape) { if (!dungeon) return toast(tr('던전에서만 쓸 수 있다.', 'Only usable in dungeons.')); takeItem(id); return dungeon.escape(); }
  if (d.throw) { if (!dungeon) return toast(tr('던전에서만 쓸 수 있다.', 'Only usable in dungeons.')); takeItem(id); return dungeon.throwStone(d.throw); }
  if (d.primal) { // an orb is never used up: it wakes its legend's Primal Reversion for one dungeon run
    if (!dungeon) return toast(tr('던전에서 써야 구슬의 힘이 깨어난다.', 'The orb\'s power only wakes in a dungeon.'));
    const name = DEX.species[d.primal].name, m = S.party.find((p) => p.sp === d.primal && p.hp > 0);
    if (!m || !dungeon.ents.some((e) => e.mon === m && e.alive)) return toast(tr(`함께 싸우는 ${name}이(가) 있어야 쓸 수 있다.`, `${name} has to be fighting with you.`), COL.red);
    if (m.primal) return toast(tr(`${name}은(는) 이미 원시회귀했다.`, `${name} is already in its Primal form.`));
    return dungeon.primal(m, d);
  }
  const pick = (m) => {
    if (d.pp) m.restorePP();
    if (d.heal || d.healPct) m.hp = Math.min(m.maxhp, m.hp + (d.heal || Math.round(m.maxhp * d.healPct)));
    if (d.cure) m.status = null;
    takeItem(id); sfx('heal'); toast(tr(`${m.name}에게 ${d.name}을(를) 썼다.`, `Used ${d.name} on ${m.name}.`));
    dungeon?.afterItem();
  };
  openMenu(S.party.map((m) => ({ label: `${m.name}  HP ${m.hp}/${m.maxhp}`, fn: () => pick(m) })), { title: tr('누구에게?', 'On whom?'), x: 150, y: 80 });
}

export function questMenu() {
  const out = [];
  const st = mainStep();
  out.push({ label: tr(`[메인] ${eraComplete() ? '시대 완료 — 시간의 문으로!' : st?.log}`, `[Main] ${eraComplete() ? 'Era complete — to the Time Gate!' : st?.log}`) });
  for (const q of era().side) {
    const s = sideState(q);
    if (s === 'open') continue;
    out.push({ label: tr(`[의뢰] ${q.title}`, `[Request] ${q.title}`), right: s === 'done' ? tr('끝남', 'Closed') : s === 'ready' ? tr('보고하기', 'Report') : sideProgress(q), desc: q.desc });
  }
  if (out.length === 1) out.push({ label: tr('맡은 의뢰가 없다. 광장의 방(榜)을 확인하자.', 'No requests taken. Check the notice board in the square.') });
  openMenu(out, { title: tr(`${era().year}년 · ${era().title}`, `${era().year} · ${era().title}`), desc: true, x: 20, y: 30, w: 440, toggle: 'quest' });
}
