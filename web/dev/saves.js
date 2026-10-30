// Save slots and cloud sync playtests (not loaded by the game). They replace this browser's saves and cloud link, so run
// them in a dev tab only. From the console:
//   const s = await import('/dev/saves.js'); await s.slots(); await s.cloud()   → { ok, log: [...] }
// cloud() talks to a fake Drive and a fake Google sign-in (fakeDrive), never to Google.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const KEY = 'joseon-poke-save-v1', key = (slot) => (slot === 'normal' ? KEY : `${KEY}-${slot}`);

// a save as an older version left it: no journey (slot) recorded
function oldSave(o = {}) {
  const mon = (sp, lv) => ({ sp, lv, exp: 0, hp: 40, shiny: true, status: null, moves: [{ id: 33, pp: 35 }] });
  return { era: 2, step: 1, side: {}, items: { oran: 3 }, money: 500, flags: {}, night: false, playtime: 3600, kills: {}, eraClear: false, roster: [],
    lastNode: 'town', townPos: null, townKind: 1, faction: null, wander: null, mode: 'normal', inRun: null, spy: null,
    party: [mon(387, 20), mon(390, 20)], v: 5, savedAt: 1000, ...o };
}
function clearSaves() { for (const s of ['easy', 'normal', 'hard', 'challenge']) localStorage.removeItem(key(s)); localStorage.removeItem('joseon-cloud'); }

// local slots: an older save moves to its journey's key, a new journey at another difficulty keeps the finished one
export async function slots() {
  const g = window.__game, { G, S } = g, game = await import('/js/game.js'), log = [];
  const check = (what, ok) => log.push(`${ok ? 'ok' : 'FAIL'} ${what}`);
  clearSaves();
  // a Hard save from 1.6 sits under the Normal key
  localStorage.setItem(KEY, JSON.stringify(oldSave({ mode: 'hard' })));
  game.initSaves();
  check('old Hard save moved to its own key', !localStorage.getItem(KEY) && JSON.parse(localStorage.getItem(key('hard'))).mode === 'hard');
  check('load() sets its journey', game.load('hard') && S.slot === 'hard');
  // a finished Normal story, then a new Easy journey: both stay
  clearSaves();
  const last = g.ERAS.length - 1;
  localStorage.setItem(KEY, JSON.stringify(oldSave({ era: last, step: g.ERAS[last].main.length, savedAt: 2000 })));
  game.initSaves();
  check('old Normal save stays under the Normal key', !!game.readSave('normal'));
  game.newGame(387, 390, 'easy');
  check('a new journey takes its difficulty as its journey', S.slot === 'easy' && S.mode === 'easy');
  game.save();
  check('saving the new journey keeps the finished one', game.readSave('normal')?.savedAt === 2000 && !!game.readSave('easy'));
  check('saves() lists both, the one played last first', game.saves().map((s) => s.slot).join() === 'easy,normal');
  S.mode = 'hard'; game.save(); // Settings changes the strength; the journey stays where it started
  check('a difficulty switch keeps the save in its journey', game.readSave('easy')?.mode === 'hard' && !game.readSave('hard'));
  check('load(normal) reads the finished story', game.load('normal') && S.slot === 'normal' && S.era === last);
  // the title: Continue lists the journeys; New journey warns only for the difficulty picked
  G.overlays.length = 0;
  const { Title } = await import('/js/scenes.js');
  g.setScene(new Title()); await sleep(200);
  const title = G.scene;
  title.reopen = true; await sleep(300); // builds the title menu as a key press would
  const menu = G.overlays[G.overlays.length - 1], first = menu?.items?.[0];
  check(`title Continue shows two saves (${first?.right})`, /2/.test(first?.right || ''));
  first.fn(); await sleep(200);
  const pick = G.overlays[G.overlays.length - 1];
  check(`the list names each journey (${pick?.items?.map((i) => `${i.label} ${i.right}`).join(' / ')})`, pick?.items?.length === 2 && pick.items.some((i) => /★/.test(i.right)));
  G.overlays.length = 0;
  title.newGame(); await sleep(200);
  const diff = G.overlays[G.overlays.length - 1];
  check(`difficulty list marks saved journeys (${diff?.items?.map((i) => `${i.label}:${i.right}`).join(' ')})`, diff?.items?.filter((i) => i.right === '기록 있음' || i.right === 'Saved').length === 2);
  G.overlays.length = 0;
  return { ok: log.every((l) => l.startsWith('ok')), log };
}

// a fake Drive app folder behind fetch, and Google's sign-in window answering at once
export function fakeDrive() {
  if (window.__drive) return window.__drive;
  const drive = window.__drive = { files: new Map(), n: 0, calls: [] };
  const real = window.fetch.bind(window);
  const json = (o) => new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } });
  window.fetch = async (url, opts = {}) => {
    const u = new URL(String(url), location.href), m = (opts.method || 'GET').toUpperCase();
    if (u.host !== 'www.googleapis.com') return real(url, opts);
    drive.calls.push(`${m} ${u.pathname}`);
    if (u.pathname === '/oauth2/v3/userinfo') return json({ email: 'tester@example.com' });
    if (u.pathname === '/drive/v3/files' && m === 'GET') return json({ files: [...drive.files.values()].map(({ id, name, appProperties }) => ({ id, name, appProperties })) });
    let r = /^\/drive\/v3\/files\/([^/]+)$/.exec(u.pathname);
    if (r && u.searchParams.get('alt') === 'media') return new Response(drive.files.get(r[1]).text);
    r = /^\/upload\/drive\/v3\/files(?:\/([^/]+))?$/.exec(u.pathname);
    if (r) {
      const b = /boundary=(.+)$/.exec(opts.headers['Content-Type'])[1];
      const [head, text] = opts.body.split(`--${b}`).slice(1, 3).map((p) => p.slice(p.indexOf('\r\n\r\n') + 4).replace(/\r\n$/, ''));
      const h = JSON.parse(head);
      if (m === 'POST') { const id = `f${++drive.n}`; drive.files.set(id, { id, name: h.name, appProperties: h.appProperties, text }); return json({ id, name: h.name, appProperties: h.appProperties }); }
      const f = drive.files.get(r[1]); f.appProperties = { ...f.appProperties, ...h.appProperties }; f.text = text;
      return json({ id: f.id, name: f.name, appProperties: f.appProperties });
    }
    return new Response('not faked', { status: 404 });
  };
  const fake = { initTokenClient: (cfg) => ({ requestAccessToken: () => setTimeout(() => cfg.callback({ access_token: 'fake', expires_in: 3600 })) }) };
  window.google = { accounts: { oauth2: fake } };
  const add = Node.prototype.appendChild; // the GIS script tag: answered at once, never loaded
  Node.prototype.appendChild = function (el) {
    if (el.tagName === 'SCRIPT' && /accounts\.google\.com\/gsi/.test(el.src)) { window.google = { accounts: { oauth2: fake } }; setTimeout(() => el.onload?.()); return el; }
    return add.call(this, el);
  };
  drive.put = (name, o, props = {}) => { const id = `f${++drive.n}`; drive.files.set(id, { id, name, appProperties: { era: String(o.era), playtime: String(o.playtime), savedAt: String(o.savedAt), ...props }, text: JSON.stringify(o) }); return id; };
  drive.edit = (id, o) => { const f = drive.files.get(id); f.text = JSON.stringify(o); Object.assign(f.appProperties, { era: String(o.era), playtime: String(o.playtime), savedAt: String(o.savedAt) }); };
  return drive;
}

// cloud sync of several journeys, against the fake Drive. Needs a page whose cloud panel is signed out at load.
export async function cloud() {
  const g = window.__game, { G, S } = g, game = await import('/js/game.js'), log = [];
  const check = (what, ok) => log.push(`${ok ? 'ok' : 'FAIL'} ${what}`);
  const drive = fakeDrive();
  clearSaves(); drive.files.clear();
  // 1.6 left one Normal save, synced: its Drive copy names no journey, the link holds one savedAt
  const normal = oldSave({ savedAt: 1000 });
  localStorage.setItem(KEY, JSON.stringify(normal));
  const legacy = drive.put('joseon-save.json', normal);
  localStorage.setItem('joseon-cloud', JSON.stringify({ email: 'tester@example.com', synced: '1000' }));
  const panel = document.getElementById('cloud'), btn = () => [...panel.querySelectorAll('#cloud-buttons button')];
  const status = () => document.getElementById('cloud-status').textContent + ' | ' + document.getElementById('cloud-who').textContent;
  document.getElementById('btn-cloud').click(); await sleep(200);
  btn()[0].click(); // 구글로 로그인 → sync(false)
  for (let i = 0; i < 40 && !/최신|Up to date|올렸|cloud/.test(status()); i++) await sleep(100);
  const link = JSON.parse(localStorage.getItem('joseon-cloud'));
  check(`sign-in with an old link: up to date (${status()})`, /최신|Up to date/.test(status()));
  check(`the old link became per journey (${JSON.stringify(link.synced)})`, link.synced?.normal === '1000');
  check('nothing uploaded for an equal save', !drive.calls.some((c) => c.startsWith('POST') || c.startsWith('PATCH')));
  // a Hard journey starts here: its save goes up as a file of its own
  game.newGame(387, 390, 'hard'); G.goTown(); await sleep(600); G.overlays.length = 0;
  game.save(); await sleep(3300);
  const hard = [...drive.files.values()].find((f) => f.appProperties.slot === 'hard');
  check(`a new journey's save went up as its own file (${hard?.name})`, hard?.name === 'joseon-save-hard.json' && JSON.parse(hard.text).slot === 'hard');
  check('the Normal copy is untouched', drive.files.get(legacy).appProperties.savedAt === '1000');
  // another device moves the Normal journey on while Hard is played here: Normal follows without a restart
  drive.edit(legacy, oldSave({ savedAt: 5000, era: 4 }));
  const before = location.href; let reloaded = false; addEventListener('beforeunload', () => { reloaded = true; }, { once: true });
  game.save(); await sleep(3300);
  check(`Normal taken from the cloud while Hard plays (era ${game.readSave('normal')?.era})`, game.readSave('normal')?.savedAt === 5000 && !reloaded && location.href === before);
  check('Hard still the journey in play', S.slot === 'hard' && game.readSave('hard')?.slot === 'hard');
  // another device moves the Hard journey on too: the play in progress here is not taken away, the player is asked
  const hid = hard.id, h = JSON.parse(drive.files.get(hid).text);
  drive.edit(hid, { ...h, savedAt: Date.now() + 60000, era: 3 });
  G.onSaved(); await sleep(3300); // the after-save sync, without a new save here
  check(`newer Hard copy asks instead of replacing (${status()})`, !panel.hidden && /어려움|Hard/.test(btn()[0]?.textContent || '') && game.readSave('hard')?.era !== 3);
  document.querySelector('#cloud [data-close]').click();
  return { ok: log.every((l) => l.startsWith('ok')), log, calls: drive.calls.length };
}
