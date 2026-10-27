// Story playtest: plays an era's main quest like a player (talk to the quest NPC, clear the dungeon with dev/bot.js,
// rest at the inn between dungeons). Results accumulate in window.F so a long run can be polled.
import { bot, drain } from './bot.js';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function playEra(opts = {}) {
  const g = window.__game, { S, G } = g;
  const q = await import('/js/quests.js');
  const out = { era: S.era, year: g.ERAS[S.era].year, steps: [], start: S.party.map((m) => `${m.name}${m.lv}`).join(' ') };
  let tries = 0;
  for (let guard = 0; guard < 40 && !q.eraComplete(); guard++) {
    const st = q.mainStep();
    if (st.do === 'talk') {
      G.goTown(q.talkTown(st)); await sleep(300); await drain();
      const town = G.scene, npc = town.npcs.find((n) => n.id === st.npc);
      if (!npc) { out.err = `npc ${st.npc} missing`; break; }
      const p = q.onTalk(npc, town);
      await drain(); await p; await sleep(200); await drain();
      out.steps.push(`talk:${st.npc}`);
    } else if (st.do === 'dungeon') {
      [...S.party, ...S.roster].forEach((m) => m.heal(true));
      S.items.oran = Math.max(S.items.oran || 0, opts.oran ?? 4);
      // shop like a player would: spend coins on Sitrus Berries and Rice Balls before each dungeon
      const { ITEMS } = await import('/js/game.js');
      for (const [id, n] of [['sitrus', 4], ['rice', 2]]) while ((S.items[id] || 0) < n && S.money >= ITEMS[id].price) { S.money -= ITEMS[id].price; S.items[id] = (S.items[id] || 0) + 1; }
      const before = S.step;
      G.goDungeon(st.d); await sleep(400);
      const r = await bot(opts.turns || 2500, opts);
      for (let k = 0; k < 12 && S.step === before; k++) { await sleep(400); await drain(); }
      await sleep(600); await drain();
      const ok = S.step !== before;
      out.steps.push({ d: st.d, ok, t: r.t, floors: r.floors?.join(''), party: S.party.map((m) => `${m.name}${m.lv}:${m.hp}/${m.maxhp}`).join(' '), errs: r.errs?.length ? r.errs : undefined });
      if (!ok && ++tries > (opts.retries ?? 2)) { out.stuck = st.d; break; }
    } else break;
  }
  await drain();
  out.done = q.eraComplete();
  out.end = S.party.map((m) => `${m.name}${m.lv}`).join(' ');
  out.roster = S.roster.length;
  out.money = S.money; out.turns = out.steps.reduce((n, s) => n + (s.t || 0), 0);
  (window.F ||= []).push(out);
  return out;
}
// play from the current era to `last`, walking through each time gate
export async function playFrom(last, opts = {}) {
  const g = window.__game, { S, G } = g;
  while (S.era <= last) {
    if (g.ERAS[S.era].faction && !S.faction) S.faction = opts.faction || 'south';
    const r = await playEra(opts);
    if (!r.done || S.era === last) break;
    S.era++; S.step = 0; S.eraClear = false; S.townKind = 1; G.overlays.length = 0;
  }
  return window.F;
}
