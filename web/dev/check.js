// Content and map checks for every era (not loaded by the game). From the console:
//   const c = await import('/dev/check.js'); await c.checkAll()   → { problems: [...], stats }
// Covers: story/quest references, sprites and moves, town reachability (NPCs, gate, exit),
// world-map nodes, and every dungeon floor (stairs / boss reachable from the start).
const PATS = ['cross', 'x', 'star', 'near', 'ring', 'far', 'rows', 'cols', 'checker', 'quad', 'random', 'target'];
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

export async function checkAll(opts = {}) {
  const g = window.__game, { G, S } = g;
  const game = await import('/js/game.js'), pmd = await import('/js/pmd.js'), content = await import('/js/content.js');
  const { DEX, ITEMS } = game, { QITEMS } = content;
  const problems = [], stats = { towns: 0, floors: 0, eras: g.ERAS.length };
  const bad = (where, what) => problems.push(`${where}: ${what}`);
  const icons = new Map();
  const iconOk = async (sp) => {
    if (pmd.hasPmdSprite(sp)) return true;
    if (!icons.has(sp)) icons.set(sp, fetch(`/assets/poke/icon/${sp}.png`, { method: 'HEAD' }).then((r) => r.ok));
    return icons.get(sp);
  };
  const spOk = async (where, sp) => { if (!DEX.species[sp]) bad(where, `unknown species ${sp}`); else if (!(await iconOk(sp))) bad(where, `no sprite for ${sp}`); };
  const snap = JSON.stringify({ era: S.era, step: S.step, townKind: S.townKind, faction: S.faction, flags: S.flags, side: S.side });
  const party = S.party.slice(), roster = S.roster.slice();

  for (let i = 0; i < g.ERAS.length; i++) {
    const e = g.ERAS[i], tag = `${e.year}`;
    S.era = i; if (e.faction && !S.faction) S.faction = 'south';
    const towns = [e.npcs, e.town2?.npcs || []];
    const npcIds = new Set(towns.flat().map((n) => n.id));
    // story references
    for (const [k, st] of e.main.entries()) {
      if (['talk', 'battle', 'spy'].includes(st.do) && !npcIds.has(st.npc)) bad(tag, `main ${k} talks to missing npc ${st.npc}`);
      if (['dungeon', 'battle'].includes(st.do) && !e.dungeons[st.d]) bad(tag, `main ${k} uses missing dungeon ${st.d}`);
      for (const sp of st.gift || []) await spOk(`${tag} gift`, sp);
    }
    for (const q of e.side) {
      if (q.d && !e.dungeons[q.d]) bad(tag, `side ${q.id} uses missing dungeon ${q.d}`);
      if (q.item && !ITEMS[q.item] && !QITEMS[q.item]) bad(tag, `side ${q.id} item ${q.item} missing`);
      if (q.to && !npcIds.has(q.to)) bad(tag, `side ${q.id} delivers to missing npc ${q.to}`);
      if (q.sp) await spOk(`${tag} side ${q.id}`, q.sp);
      if (q.floor && q.d && e.dungeons[q.d] && q.floor > e.dungeons[q.d].floors) bad(tag, `side ${q.id} floor ${q.floor} > ${e.dungeons[q.d].floors}`);
    }
    for (const n of towns.flat()) await spOk(`${tag} npc ${n.id}`, n.sp);
    // world map
    const nodeD = new Set();
    for (const n of e.nodes) {
      if (n.d) { nodeD.add(n.d); if (!e.dungeons[n.d]) bad(tag, `node ${n.id} → missing dungeon ${n.d}`); }
      if (n.lon < 123.6 || n.lon > 131.9 || n.lat < 33.1 || n.lat > 42.9) bad(tag, `node ${n.id || n.name} off the map (${n.lon}, ${n.lat})`);
    }
    for (const [a, b] of e.nodes.flatMap((a, j) => e.nodes.slice(j + 1).map((b) => [a, b]))) {
      if (Math.hypot(a.lon - b.lon, a.lat - b.lat) < 0.18) bad(tag, `nodes ${a.id || a.name} and ${b.id || b.name} overlap`);
    }
    // dungeons
    for (const [id, d] of Object.entries(e.dungeons)) {
      if (!nodeD.has(id) && !d.fromTown) bad(tag, `dungeon ${id} has no map node`); // fromTown: entered from an NPC in town
      const set = pmd.tileSet(d.tiles); try { await set.ready; } catch (err) { /* reported below */ }
      if (!set.meta || !set.im.naturalWidth) bad(tag, `dungeon ${id} tileset ${d.tiles} failed to load`);
      for (const sp of d.mons) await spOk(`${tag} ${id}`, sp);
      if (d.quest && !QITEMS[d.quest.item]) bad(tag, `dungeon ${id} quest item ${d.quest.item} missing`);
      for (const b of [d.boss, d.mid].filter(Boolean)) {
        await spOk(`${tag} ${id} boss`, b.sp);
        for (const m of b.moves || []) if (!DEX.moves[m]) bad(tag, `${id} boss move ${m} missing`);
        const teles = [b.tele, ...(b.revive ? [b.revive.tele] : [])].flat().filter(Boolean);
        for (const t of teles) for (const p of t.pats) for (const part of p.split('|')) if (!PATS.includes(part)) bad(tag, `${id} pattern ${part}`);
      }
      if (d.mid && d.mid.floor >= d.floors) bad(tag, `${id} mid-boss floor ${d.mid.floor} not before the last floor ${d.floors}`);
      // one legend to a place, and Regigigas only in the Regi line after 1945
      const legs = [d.mid, d.boss].filter((b) => b && game.LEGENDS.has(b.sp));
      if (legs.length > 1) bad(tag, `${id} holds ${legs.length} legends (${legs.map((b) => b.sp).join(', ')})`);
      if (e.year < 1945 && legs.some((b) => b.sp === 486)) bad(tag, `${id}: Regigigas before 1945`);
    }
  }
  // towns: every NPC, the gate and the exit reachable from where the player stands
  for (let i = 0; i < g.ERAS.length; i++) {
    const e = g.ERAS[i];
    for (const kind of e.town2 ? [1, 2] : [1]) {
      S.era = i; S.townKind = kind; S.townPos = null; S.lastNode = 'town';
      let t;
      try { t = new g.Town(kind); } catch (err) { bad(`${e.year} town${kind}`, `failed: ${err.message}`); continue; }
      stats.towns++;
      const seen = new Set([t.py * t.W + t.px]), q = [[t.px, t.py]];
      const free = (x, y) => x >= 0 && y >= 0 && x < t.W && y < t.H && !t.solid[y][x] && !t.onGate(x, y) && !t.npcs.some((n) => n.x === x && n.y === y);
      while (q.length) {
        const [x, y] = q.shift();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy, k = ny * t.W + nx;
          if (!seen.has(k) && free(nx, ny)) { seen.add(k); q.push([nx, ny]); }
        }
      }
      const near = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((y + dy) * t.W + x + dx));
      for (const n of t.npcs) if (!near(n.x, n.y)) bad(`${e.year} town${kind}`, `npc ${n.id} (${n.name}) unreachable at ${n.x},${n.y}`);
      if (t.gate && ![0, 1].some((ox) => near(t.gate.tx + ox, t.gate.ty + 1) || near(t.gate.tx + ox, t.gate.ty))) bad(`${e.year} town${kind}`, 'time gate unreachable');
      if (!t.exitTiles.some(([x, y]) => seen.has(y * t.W + x))) bad(`${e.year} town${kind}`, 'exit unreachable');
    }
  }
  // dungeons: every floor generated a few times; stairs (or the boss) must be reachable
  const tries = opts.tries ?? 2;
  for (let i = 0; i < g.ERAS.length; i++) {
    const e = g.ERAS[i];
    S.era = i;
    for (const [id, d] of Object.entries(e.dungeons)) {
      const main = e.main.findIndex((st) => ['dungeon', 'battle'].includes(st.do) && st.d === id);
      S.step = main >= 0 ? main : 0; S.flags = {}; S.side = {};
      S.party = party.slice(); S.roster = roster.slice(); S.homeParty = null;
      let dg;
      try { dg = new g.Dungeon(id); } catch (err) { bad(`${e.year} ${id}`, `failed: ${err.message}`); continue; }
      for (let f = 1; f <= d.floors; f++) for (let k = 0; k < tries; k++) {
        try { dg.floor = f; dg.newFloor(); } catch (err) { bad(`${e.year} ${id} F${f}`, `newFloor failed: ${err.message}`); break; }
        stats.floors++;
        const p = dg.player, target = dg.boss || null;
        const goal = target ? (x, y) => Math.max(Math.abs(x - target.x), Math.abs(y - target.y)) <= 1 : dg.stairs ? (x, y) => x === dg.stairs[0] && y === dg.stairs[1] : null;
        if (!goal) { bad(`${e.year} ${id} F${f}`, 'no stairs and no boss'); continue; }
        const seen = new Set([p.y * 1000 + p.x]), q = [[p.x, p.y]];
        let ok = false;
        while (q.length && !ok) {
          const [x, y] = q.shift();
          if (goal(x, y)) ok = true;
          for (const [dx, dy] of DIRS8) {
            const nx = x + dx, ny = y + dy, key = ny * 1000 + nx;
            if (!seen.has(key) && dg.canStep(x, y, dx, dy)) { seen.add(key); q.push([nx, ny]); }
          }
        }
        if (!ok) bad(`${e.year} ${id} F${f}`, `${target ? 'boss' : 'stairs'} unreachable from the start`);
      }
      dg.restoreCrew?.();
    }
  }
  S.party = party; S.roster = roster; S.homeParty = null;
  Object.assign(S, JSON.parse(snap));
  G.overlays.length = 0;
  return { problems, stats };
}
