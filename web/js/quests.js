// Main / side quest state machine and shared menus (party, items, quest log, board, evolution).
import { G, VW, VH, ui, COL, say, openMenu, toast, input, img, clamp, prefs, setPref } from './core.js';
import { S, DEX, Mon, ITEMS, addItem, takeItem, countItem, itemDef, TYPE_COLORS, STATUS_NAME, ROSTER_MAX, recruit } from './game.js';
import { ERAS, QITEMS, FACTIONS, FACTION_TALK, FACTION_PICK, CELEBI } from './content.js';
import { jingle, sfx, cry, setMuted } from './audio.js';
import { tr } from './i18n.js';
import { iconPath } from './pmd.js';

export const era = () => ERAS[S.era];
export const mainStep = () => era().main[S.step];
export const eraComplete = () => S.step >= era().main.length;
// 'partner' / 'player' lines are spoken by the real team even while a naval battle fields a water-only crew
const home = () => S.homeParty || S.party;
const partnerLine = (L) => (L.who === 'partner' ? { ...L, who: home()[1].sp, shiny: home()[1].shiny, name: home()[1].name } : L.who === 'player' ? { ...L, who: home()[0].sp, shiny: home()[0].shiny, name: home()[0].name } : L);
export const lines = (arr) => arr.map(partnerLine);

export async function advanceMain() {
  S.step++;
  const st = mainStep();
  if (st?.do === 'scene') { await say(lines(st.say)); return advanceMain(); }
  if (!st) {
    await say(lines(era().outro));
    S.eraClear = true;
    jingle('fanfa5');
    await say([{ who: 251, name: tr('세레비', 'Celebi'), text: tr(`시간의 꽃잎이 빛나고 있어! ${era().year}년의 꽃잎을 되찾았어. 광장의 "시간의 문"이 열렸을 거야!`, `The petal is shining! We got back the petal of ${era().year}. The Time Gate in the square should be open now!`) }]);
    G.gainAll?.(Math.round(80 * (S.era + 1) ** 1.6), tr('꽃잎의 힘', 'Power of the petal'));
  } else toast(tr('새 목표: ', 'New goal: ') + st.log, COL.blue);
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
export const talkTown = (st) => (st?.do === 'talk' && era().town2?.npcs?.some((n) => n.id === st.npc) ? 2 : 1);

export function onDungeonClear(dId) {
  const st = mainStep();
  if (st?.do === 'dungeon' && st.d === dId) return advanceMain();
}

export async function onTalk(npc, town) {
  const st = mainStep();
  if (st?.do === 'talk' && st.npc === npc.id) { await say(lines(st.say)); if (st.gift) giveMons(st.gift); return advanceMain(); }
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
export function rosterMenu() {
  const items = [];
  const cur = S.party[2];
  if (cur) items.push({ label: `${cur.name} Lv.${cur.lv}${cur.shiny ? ' ★' : ''}`, right: tr('동행 중', 'With you'), desc: tr(`지금 함께 다니는 동료. ${cur.types.map((t) => DEX.types[t]).join('/')} · HP ${cur.hp}/${cur.maxhp}`, `Travelling with you. ${cur.types.map((t) => DEX.types[t]).join('/')} · HP ${cur.hp}/${cur.maxhp}`), fn: () => rosterPick(-1) });
  S.roster.forEach((m, i) => items.push({ label: `${m.name} Lv.${m.lv}${m.shiny ? ' ★' : ''}`, right: m.types.map((t) => DEX.types[t]).join('/'),
    desc: `HP ${m.hp}/${m.maxhp} · ${tr('기술', 'Moves')}: ${m.moves.map((mv) => DEX.moves[mv.id].name).join(', ')}`, fn: () => rosterPick(i) }));
  if (!items.length) return say([{ who: 'narr', text: tr('아직 동료가 없다. 보스나 전설의 포켓몬을 이기면, 또는 야생 포켓몬이 가끔 동료가 되고 싶어 한다.', 'No companions yet. Defeated bosses and legendary Pokémon want to join you, and sometimes wild Pokémon do too.') }]);
  openMenu(items, { title: tr(`동료 명부 (${S.roster.length}/${ROSTER_MAX}) · 골라서 세 번째 동료와 교체`, `Companions (${S.roster.length}/${ROSTER_MAX}) · pick one to swap into the third slot`), desc: true, x: 70, y: 30, w: 340, toggle: 'party' });
}
function rosterPick(i) {
  const m = i < 0 ? S.party[2] : S.roster[i];
  const opts = i < 0 ? tr(['명부로 돌려보낸다', '그만두기'], ['Send to the roster', 'Cancel']) : [S.party[2] ? tr(`${S.party[2].name}와(과) 교체`, `Swap with ${S.party[2].name}`) : tr('함께 간다', 'Bring along'), tr('놓아준다', 'Release'), tr('그만두기', 'Cancel')];
  say([{ who: m.sp, shiny: m.shiny, name: m.name, text: i < 0 ? tr('나는 지금 너희와 함께 다니고 있어. 잠깐 쉴까?', 'I\'m travelling with you right now. Should I take a break?') : tr('나도 데려가 줄 거야?', 'Will you take me along?'), choices: opts, onChoice: (k) => {
    if (i < 0) { if (k === 0) { S.roster.unshift(S.party.pop()); sfx('confirm'); toast(tr(`${m.name}은(는) 마을에서 쉬기로 했다.`, `${m.name} will rest in town.`)); } return; }
    if (k === 0) {
      S.roster.splice(i, 1);
      if (S.party[2]) S.roster.unshift(S.party.pop());
      S.party.push(m); cry(m.sp); toast(tr(`${m.name}이(가) 함께 간다!`, `${m.name} is coming along!`), COL.blue);
    } else if (k === 1) {
      say([{ who: 'narr', text: tr(`정말 ${m.name}을(를) 자연으로 돌려보낼까? 다시 데려올 수 없다.`, `Really release ${m.name}? You can't bring it back.`), choices: tr(['돌려보낸다', '그만두기'], ['Release', 'Cancel']), onChoice: (j) => {
        if (j === 0) { S.roster.splice(S.roster.indexOf(m), 1); toast(tr(`${m.name}은(는) 고향으로 돌아갔다. 고마웠어!`, `${m.name} went home. Thank you!`)); }
      } }]);
    }
  } }]);
}

// settings shared by the town and dungeon menus; each pick reopens the list on the same row
export function settingsMenu(sel = 0) {
  const again = (i) => () => { G.onPrefs?.(); settingsMenu(i); };
  openMenu([
    { label: tr('소리', 'Sound'), right: prefs.muted ? tr('끔', 'Off') : tr('켬', 'On'), fn: () => { setMuted(!prefs.muted); again(0)(); } },
    { label: tr('조작키 안내', 'Key hints'), right: prefs.hints ? tr('보임', 'Shown') : tr('숨김', 'Hidden'), fn: () => { setPref('hints', !prefs.hints); again(1)(); } },
    { label: tr('게임 속도', 'Game speed'), right: tr(`${G.speed}배`, `${G.speed}x`), fn: () => { G.setSpeed?.(G.speed % 3 + 1); again(2)(); } },
    { label: tr('닫기', 'Close') },
  ], { title: tr('설정', 'Settings'), sel, x: 150, y: 50, w: 190 });
}
// quit to the title screen: towns save first; a dungeon run is not saved (the game continues from the last town visit)
export function quitItem(inDungeon, before) {
  return { label: tr('게임 종료', 'Quit game'), fn: () => say([{ who: 'narr',
    text: inDungeon ? tr('게임을 끝내고 타이틀로 돌아갈까? 던전 안에서 한 일은 저장되지 않고, 마지막으로 마을에 들렀을 때부터 이어진다.', 'Quit to the title screen? What you did in this dungeon is not saved; you will continue from your last visit to town.')
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
