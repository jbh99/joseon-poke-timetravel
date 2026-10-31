// Playtest helpers (not loaded by the game). Use from the console: const b = await import('/dev/bot.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function press(code, n = 1, gap = 120) {
  for (let i = 0; i < n; i++) {
    window.dispatchEvent(new KeyboardEvent('keydown', { code }));
    await sleep(50);
    window.dispatchEvent(new KeyboardEvent('keyup', { code }));
    await sleep(gap);
  }
}
export async function drain(max = 200) {
  const { G } = window.__game;
  let guard = 0;
  while (G.overlays.length && guard++ < max) {
    const o = G.overlays[G.overlays.length - 1];
    if (o.line) o.chars = 999;
    await press('Enter', 1, 60);
  }
}
// Fresh party dropped straight onto a dungeon floor, then auto-played. o: {party:[[sp,lv]], era, step, d, floor, items, opts}
export async function runBoss(o) {
  const g = window.__game, { S, G } = g, game = await import('/js/game.js');
  g.newGame(390, 393);
  S.party = o.party.map(([sp, lv, sh]) => new game.Mon(sp, lv, { shiny: sh !== false }));
  S.era = o.era; S.step = o.step ?? 0; S.items = o.items || { oran: 6, sitrus: 2 }; S.flags = o.flags || { teleTut: true };
  G.overlays.length = 0;
  G.goDungeon(o.d); await sleep(500);
  const d = G.scene; d.floor = o.floor; d.newFloor(); d.bossIntro = true;
  const log = [], om = d.msg.bind(d);
  d.msg = (t, c) => { log.push(t); om(t, c); };
  const boss = d.boss;
  const r = await bot(o.turns || 500, o.opts || {});
  return { r, won: boss && !boss.alive, bossHp: boss && [boss.mon.hp, boss.mon.maxhp, boss.bphase], log, flags: S.flags, roster: S.roster.map((m) => m.name) };
}
// Arceus balance probe; results accumulate in window.R so long fights can be polled
export async function arc(label, party, opts, items) {
  const { ERAS } = window.__game, era = ERAS.findIndex((e) => e.dungeons.origin), step = ERAS[era].main.findIndex((s) => s.d === 'origin');
  const res = await runBoss({ party, opts, era, step, d: 'origin', floor: 4, items: items || { oran: 4, sitrus: 5, rice: 3 }, turns: 1200 });
  const out = { label, t: res.r.t, won: res.won, bossHp: res.bossHp, teles: res.log.filter((t) => t.includes('벗어나라')).length,
    hit: res.log.filter((t) => t.includes('휘말렸다')).length, shield: res.log.filter((t) => t.includes('장막')).length, party: res.r.party };
  (window.R ||= []).push(out);
  return out;
}
// Auto-play the current dungeon: fight visible foes, heal with berries, then take the stairs.
export async function bot(turns = 200, opts = {}) {
  const g = window.__game, G = g.G, errs = [], floors = [], stats = { teles: 0, dodges: 0 };
  for (let t = 0; t < turns; t++) {
    await sleep(25);
    const d = G.scene;
    if (d.constructor.name !== 'Dungeon') return { left: true, scene: d.constructor.name, t, floors, step: g.S.step, stats, party: g.S.party.map((m) => [m.name, m.lv, m.hp, m.maxhp]), money: g.S.money };
    let guard = 0;
    while ((d.busy || G.overlays.length) && guard++ < 150) {
      if (G.overlays.length) { const o = G.overlays[G.overlays.length - 1]; if (o.line) o.chars = 999; await press('Enter', 1, 60); } else await sleep(40);
    }
    if (d.done) { await sleep(400); continue; }
    if (floors[floors.length - 1] !== d.floor) floors.push(d.floor);
    const p = d.player;
    const foes = d.ents.filter((e) => e.alive && e.team === 'foe' && (d.vis[e.y][e.x] || e.isBoss));
    const adj = foes.find((f) => Math.max(Math.abs(f.x - p.x), Math.abs(f.y - p.y)) === 1 && d.canStep(p.x, p.y, f.x - p.x, f.y - p.y));
    if (d.boss?.tele) stats.teles++;
    try {
      // dodge telegraphed tiles (opts.dodge=false measures how punishing the patterns are)
      if (opts.dodge !== false && d.danger(p.x, p.y)) {
        const s = d.bfs(p, (x, y) => !d.danger(x, y) && !d.entAt(x, y), 6);
        if (s) { stats.dodges++; d.playerAct('move', s); continue; }
      }
      const heal = (p.mon.maxhp > 90 ? ['sitrus', 'rice', 'oran'] : ['oran', 'sitrus', 'rice']).find((k) => g.S.items[k]); // big heals once Oran Berries stop keeping up
      if (p.mon.hp < p.mon.maxhp * 0.4 && heal) {
        g.S.items[heal]--; if (!g.S.items[heal]) delete g.S.items[heal];
        p.mon.hp = Math.min(p.mon.maxhp, p.mon.hp + (heal === 'sitrus' ? Math.round(p.mon.maxhp / 2) : heal === 'rice' ? 80 : 30));
        d.afterItem(); continue;
      }
      if (adj) {
        p.face = [Math.sign(adj.x - p.x), Math.sign(adj.y - p.y)];
        const s = d.pickSkill(p, adj); // the move a player would pick: power x type match, like the ally AI
        d.playerAct(s && Math.random() < 0.85 ? 'move-skill' : 'basic', s?.k); continue;
      }
      if (adj === undefined && d.boss?.tele && opts.dodge !== false) { d.playerAct('wait'); continue; } // safe spot: wait out the blast
      if (!foes.length && p.mon.hp < p.mon.maxhp * 0.6) { d.playerAct('wait'); continue; } // rest like a player would
      let step = foes.length ? d.bfs(p, (x, y) => foes.some((f) => Math.max(Math.abs(f.x - x), Math.abs(f.y - y)) <= 1) && !d.entAt(x, y) && (opts.dodge === false || !d.danger(x, y)), 40) : null;
      const it = d.items.find((i) => d.vis[i.y][i.x]);
      if (!step && it) step = d.bfs(p, (x, y) => x === it.x && y === it.y, 40);
      if (!step && d.stairs) step = d.bfs(p, (x, y) => x === d.stairs[0] && y === d.stairs[1], 80);
      if (!step && d.stairs) { p.x = d.stairs[0]; p.y = d.stairs[1]; d.pendingStairs = true; continue; }
      if (step) d.playerAct('move', step); else d.playerAct('wait');
    } catch (e) { errs.push(String(e.stack || e)); if (errs.length > 3) return { errs }; }
  }
  const d = G.scene;
  return { scene: d.constructor.name, floor: d.floor, floors, stats, boss: d.boss && [d.boss.mon.name, d.boss.mon.hp, d.boss.mon.maxhp, d.boss.bphase], party: g.S.party.map((m) => [m.name, m.lv, m.hp, m.maxhp]), money: g.S.money, items: g.S.items, errs, last: d.msgs?.slice(-3).map((m) => m.text) };
}
