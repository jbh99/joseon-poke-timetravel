// Boot and main loop.
import { G, VW, VH, APP, touchUI, initCanvas, initTouch, pollGamepads, input, ui, setScene, fade, fadeTo, holdFade, prepImages, prepped, updateFade, drawToasts, relangToasts, loadJSON, loadImages, loadFonts, toast, COL, prefs } from './core.js';
import { initAudio, unlockAudio, pauseAudio, playBgm, stopBgm, setMuted, audioState } from './audio.js';
import { initData, initSaves, S, save, load, newGame, saves, Mon } from './game.js';
import { ERAS, STARTERS, CELEBI, QITEMS, CELEBI_INTRO, TELE_TUT, EN_EXTRA, FACTIONS, FACTION_TALK, FACTION_PICK, KOREA_LAST } from './content.js';
import { EN, LANG, tr, setLang, bindStory, initLang, onLang, swapText } from './i18n.js';
import { Town, setBuildings, setPearl, setBW, townSets, townPictures } from './town.js';
import { initPmd, tileSet, portraitImage, spriteReady } from './pmd.js';
import { Dungeon } from './dungeon.js';
import { Title, EraCard, WorldMap, Ending } from './scenes.js';
import { onDungeonClear, resumeSteps } from './quests.js';
import { NET } from './net.js';
import { initNetUI } from './netui.js';
import { initCloud } from './cloud.js';

// coming back to town autosaves (after any quest progress the dungeon unlocked) and cures every status problem; a
// story step that plays by itself and has not played yet (1950 opens with a scene, a save made just before one) plays
G.goTown = (kind) => {
  // the towns' own assets, still loading behind the title on a slow line (boot), come first
  if (G.townAssets) { holdFade(G.townAssets.then(() => G.goTown(kind))); return; }
  enterTown(kind);
};
const enterTown = (kind) => {
  const pics = townPictures(kind).filter((p) => !prepped.has(p));
  for (const m of [...S.party, ...S.roster]) m.status = null;
  const t = new Town(kind);
  setScene(t);
  // a Black town's picture and the people's and the team's sprites load and decode together while the screen stays dark
  // (holdFade), and the town is drawn once there: on a slow line it stood for seconds with no ground under it, and its first
  // frames on screen stalled a phone (0.1-0.4 s). Up to 1.23 the sprites were asked for only when the picture had come. What
  // the town plays on arrival waits for that too, so no question opens under the dark screen
  // (the arrival's autosave too, unless a cleared dungeon's news comes first and saves after it)
  const sheets = [...new Set([...t.npcs.map((n) => n.sp), ...S.party.map((m) => m.spr)])].map((sp) => spriteReady(sp));
  const d = G.pendingClear;
  G.pendingClear = null;
  holdFade(Promise.all([prepImages(pics), ...sheets]).then(() => { if (G.scene === t) t.draw(G.lctx); if (!d) save(); })).finally(() => {
    if (d) setTimeout(async () => { await onDungeonClear(d); save(); }, 450);
    else setTimeout(resumeSteps, 450);
  });
};
// what Continue will want starts coming behind the title: the town of the journey played last, and its team
function warmStart() {
  const o = saves()[0]?.o;
  if (!o || !ERAS[o.era] || navigator.connection?.saveData) return;
  prepImages(townPictures(o.townKind || 1, ERAS[o.era])).catch(() => {});
  for (const m of o.party) { try { spriteReady(Mon.from(m).spr).catch(() => {}); } catch (e) { /* a member the save cannot name: Continue says so */ } }
}
G.goWorld = () => setScene(new WorldMap());
G.goDungeon = (d, def, o) => setScene(new Dungeon(d, def, o)); // def: a fight no era lists (Town.policeDef); o.floor: where to start, o.crew: who boards for a naval battle
G.nextEra = () => fadeTo(() => {
  S.era++; S.step = 0; S.eraClear = false; S.night = false; S.lastNode = 'town'; S.townKind = 1;
  save();
  setScene(new EraCard());
}, '#fff', 1.2);
G.goEnding = () => fadeTo(() => setScene(new Ending()), '#fff', 0.8);
// The world line (content_world.js): from a Korean era from 1945 on, its quests done or not (1.26), out into the world
// where the team left it (its first era, 1860, the first time), and back from the world to the Korean era it came from.
// Each line keeps its place (S.koreaAt, S.worldAt) while the team is on the other. Only the first way out has the card
// and the era's opening words: after that the team is back in the town it left, as it is on the way back to Korea.
const place = () => ({ era: S.era, step: S.step, eraClear: S.eraClear, townKind: S.townKind });
G.toWorld = () => fadeTo(() => {
  const from = ERAS[S.era].year, been = S.worldAt;
  S.koreaAt = place();
  const w = been || { era: KOREA_LAST + 1, step: 0, eraClear: false };
  Object.assign(S, { era: w.era, step: w.step, eraClear: w.eraClear, night: false, lastNode: 'town', townKind: 1, townPos: null });
  if (been) return G.goTown();
  G.cardFrom = from;
  save();
  setScene(new EraCard());
}, '#fff', 1.2);
G.toKorea = () => fadeTo(() => {
  S.worldAt = place();
  const k = S.koreaAt || { era: ERAS.findIndex((e, i) => i <= KOREA_LAST && e.year >= 1945), step: 0, eraClear: false, townKind: 1 };
  S.koreaAt = null;
  Object.assign(S, { era: k.era, step: k.step, eraClear: k.eraClear, night: false, lastNode: 'town', townKind: k.townKind || 1, townPos: null });
  G.goTown();
}, '#fff', 1.2);
G.goTitle = () => fadeTo(() => { stopBgm(0.3); G.overlays.length = 0; G.policeBack = null; setScene(new Title()); }); // a fight in town left for the title has no town to go back to
G.onFirstInput = () => unlockAudio(); // a gamepad button is no page gesture, but it sets the sound up (audio.js)
G.kao = portraitImage;
window.__game = { G, S, newGame, setScene, EraCard, Dungeon, Town, ERAS, save, load, NET, audio: audioState }; // handle for automated playtests

// HTML guide overlay: pauses game input while open, opens by itself on the first visit
function htmlLang() {
  document.documentElement.lang = LANG;
  document.title = tr('포켓몬 조선 시간여행', 'Pokémon Joseon Time Travel');
  document.querySelectorAll('[data-lang]').forEach((el) => { el.hidden = el.dataset.lang !== LANG; });
  document.getElementById('btn-guide').textContent = tr('가이드', 'Guide') + keyHint(' (H)');
  document.getElementById('btn-full').textContent = tr('전체화면', 'Fullscreen');
  document.getElementById('btn-lang').textContent = EN ? '한국어' : 'English';
  if (G.speed) speedLabel();
  soundLabel();
  G.onHtmlLang?.();
}
// a live switch relabels whatever is on screen: dialogue, menus, toasts, the scene's own text
onLang(() => {
  htmlLang();
  for (const o of G.overlays) o.relang?.(swapText);
  G.scene?.relang?.(swapText);
  relangToasts(swapText);
});
// the HUD labels name their keyboard keys, which a touch screen has no use for
const keyHint = (s) => (touchUI ? '' : s);
// game speed: 1x runs a little slower than the old pace, 2x / 3x multiply it; kept per browser
const BASE_SPEED = 0.8, SPEEDS = [1, 2, 3];
function speedLabel() { document.getElementById('btn-speed').textContent = tr(`속도 ${G.speed}배`, `Speed ${G.speed}x`) + keyHint(' (1·2·3)'); }
function setSpeed(n, quiet) {
  G.speed = n;
  try { localStorage.setItem('joseon-speed', String(n)); } catch (e) { /* private mode */ }
  speedLabel();
  if (!quiet) toast(tr(`게임 속도 ${n}배`, `Game speed ${n}x`), COL.blue);
}
G.setSpeed = (n) => setSpeed(n);
// sound on/off from the HUD (the town and dungeon menus have the same switch under Settings)
function soundLabel() { document.getElementById('btn-sound').textContent = prefs.muted ? tr('소리 끔', 'Sound off') : tr('소리 켬', 'Sound on'); }
G.onPrefs = soundLabel;
function initSound() {
  document.getElementById('btn-sound').addEventListener('click', (e) => { setMuted(!prefs.muted); soundLabel(); e.currentTarget.blur(); });
}
function initSpeed() {
  let n = 1;
  try { n = +localStorage.getItem('joseon-speed') || 1; } catch (e) { /* private mode */ }
  setSpeed(SPEEDS.includes(n) ? n : 1, true);
  document.getElementById('btn-speed').addEventListener('click', (e) => { setSpeed(SPEEDS[(SPEEDS.indexOf(G.speed) + 1) % SPEEDS.length]); e.currentTarget.blur(); });
  addEventListener('keydown', (e) => {
    const n = { Digit1: 1, Digit2: 2, Digit3: 3, Numpad1: 1, Numpad2: 2, Numpad3: 3 }[e.code];
    if (!n || G.paused || NET.role === 'guest') return; // the host sets the pace for everyone
    e.preventDefault();
    if (n !== G.speed) setSpeed(n);
  });
}
function initGuide() {
  htmlLang();
  document.getElementById('btn-lang').addEventListener('click', (e) => { setLang(EN ? 'ko' : 'en'); e.currentTarget.blur(); });
  document.getElementById('status').textContent = tr('불러오는 중…', 'Loading…');
  const g = document.getElementById('guide');
  const open = () => { g.hidden = false; G.paused = true; input.down.clear(); input.pressed.clear(); };
  const close = () => { g.hidden = true; G.paused = false; try { localStorage.setItem('joseon-guide-seen', '1'); } catch (e) { /* private mode */ } };
  document.getElementById('btn-guide').addEventListener('click', open);
  g.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  document.getElementById('btn-full').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  });
  addEventListener('keydown', (e) => {
    if (e.code === 'KeyH' && g.hidden) open();
    else if (!g.hidden && (e.code === 'Escape' || e.code === 'KeyH')) { e.preventDefault(); close(); }
  });
  let seen = false;
  try { seen = !!localStorage.getItem('joseon-guide-seen'); } catch (e) { /* private mode */ }
  if (!seen) open();
}

// Android app: the back button (MainActivity) closes the menu panel, the guide or the co-op panel, works as X
// everywhere else, and leaves the app from the bare title screen; music stops while the app is in the background
// (unless hosting co-op)
window.onAndroidBack = () => {
  const ask = document.getElementById('ask'); // the search box closes first
  if (ask) return ask.querySelector('[data-close]').click();
  const open = ['tmenu', 'guide', 'mp', 'cloud'].map((id) => document.getElementById(id)).find((el) => !el.hidden);
  if (open) return open.querySelector('[data-close]').click();
  if (G.scene instanceof Title && !G.overlays.length && !G.paused) return window.AndroidHost?.exit();
  dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
  setTimeout(() => dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape' })), 60);
};
if (APP) document.addEventListener('visibilitychange', () => { if (NET.role !== 'host') pauseAudio(document.hidden); if (!document.hidden) checkVolume(); });
if (APP) for (const p of document.querySelectorAll('.get-app')) p.hidden = true; // the guide's download link, needless in the app
// the game's sound follows the phone's media volume, which is easily left at 0 or near it (a player who never hears the
// music has no reason to raise it): the app says so instead of staying silent, at launch already when it is low.
// MainActivity reports the volume in percent.
function checkVolume(launch) {
  const v = window.AndroidHost?.mediaVolume?.();
  if (prefs.muted || v == null || v > (launch ? 20 : 0)) return;
  toast(v ? tr(`휴대폰 미디어 볼륨이 낮아요 (${v}%) · 볼륨 키로 올려 주세요`, `The phone's media volume is low (${v}%) · turn it up with the volume keys`)
    : tr('휴대폰 미디어 볼륨이 0이에요 · 볼륨 키로 올려 주세요', "The phone's media volume is 0 · turn it up with the volume keys"), COL.red, 6);
}

async function boot() {
  initSaves();
  initCanvas();
  initTouch();
  initGuide();
  initSpeed();
  initSound();
  initNetUI();
  initCloud();
  const status = document.getElementById('status');
  try {
    await Promise.all([
      loadFonts(), initData(), initAudio(), initPmd(), loadJSON('data/buildings.json').then(setBuildings), loadJSON('data/pearl.json').then(setPearl), tileSet(41).ready,
      loadImages(['poke/front/251.png', ...STARTERS.flatMap((s) => [`poke/front/${s}s.png`, `poke/icon/${s}s.png`])]),
      loadJSON('data/content_en.json').then((t) => {
        const missing = new Set();
        bindStory({ ERAS, QITEMS, CELEBI_INTRO, TELE_TUT, FACTIONS, FACTION_TALK, FACTION_PICK }, { ...t, ...EN_EXTRA }, missing);
        if (missing.size) console.warn('untranslated story text', [...missing]);
      }),
    ]);
  } catch (e) { status.textContent = `${tr('불러오기 실패: ', 'Failed to load: ')}${e.message} ${tr('(새로고침해 주세요)', '(please reload the page)')}`; throw e; }
  initLang();
  // what only the towns need (their buildings, props and ground chunk sets, the Black towns' index: ~0.7 MB in 70
  // requests) loads behind the title instead of before it; G.goTown waits for it on a line too slow to have it by then
  G.townAssets = Promise.all([
    loadJSON('bw/towns/index.json').then(setBW).catch(() => {}),
    loadJSON('data/manifest.json').then((man) => Promise.all([loadImages(['bld', 'prop'].flatMap((k) => man[k].map((n) => `${k}/${n}.png`))), ...townSets().map((id) => tileSet(id).ready)])),
  ]).catch((e) => console.warn('town assets', e)).then(() => { G.townAssets = null; warmStart(); }); // a failure must not hold a town's way in forever
  status.remove();
  if (APP) unlockAudio(); // the app may start sound without a tap, so the title music plays at once
  setScene(new Title());
  if (APP) checkVolume(true);
  let gamepads = false; // polled only once a controller has shown up
  addEventListener('gamepadconnected', () => { gamepads = true; });
  let last = performance.now();
  const params = new URLSearchParams(location.search);
  const dev = Math.min(8, +params.get('speed') || 0); // ?speed=4 fast-forwards automated playtests
  // the next frame is booked whatever this one throws: an error in a scene must not freeze the game on its last picture
  const frame = (now) => {
    try { tick(now); } catch (e) { if (self.reportError) reportError(e); else console.error(e); }
    input.pressed.clear(); input.click = null; input.pan.x = input.pan.y = 0;
    schedule(frame);
  };
  const tick = (now) => {
    const real = Math.min(0.05, (now - last) / 1000);
    const dt = real * (dev || BASE_SPEED * G.speed);
    last = now;
    G.time += dt; G.real += real; G.dt = dt;
    G.rdt = dev ? dt : real; // what runs in real seconds (Dungeon.updateFire); a fast-forwarded playtest fast-forwards that too
    if (gamepads) pollGamepads();
    if (S.party.length) S.playtime += real;
    const top = G.overlays[G.overlays.length - 1];
    if (top) { top.update(dt); G.overlays = G.overlays.filter((o) => !o.done); }
    // a scene change asked for (fade.cb) stops the old scene at once: a second press of Z in the first moments of the fade
    // could open its menu again on top of the next scene, and from there start the same dungeon twice
    else if (fade.a < 0.5 && !fade.cb) G.scene?.update(dt);
    updateFade(dt);
    // world
    const c = G.lctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    G.scene?.draw?.(c);
    const s = G.sctx;
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.imageSmoothingEnabled = false;
    s.drawImage(G.low, 0, 0, VW * G.S, VH * G.S);
    ui.begin();
    G.scene?.drawUI?.();
    for (const o of G.overlays) o.drawUI();
    drawToasts(real);
    if (fade.a > 0) { s.globalAlpha = fade.a; ui.rect(0, 0, VW, VH, fade.color); s.globalAlpha = 1; }
    if (fade.hold && fade.a >= 1 && G.real - fade.since > 0.4) ui.text(tr('불러오는 중…', 'Loading…'), VW / 2, VH / 2 - 6, { align: 'center', color: fade.color === '#000' ? '#e8dcc0' : COL.ink });
    NET.frame();
    // on a phone the pad over the game's corner fades while a dialogue or menu is up (index.html body.dim)
    const dim = touchUI && G.overlays.length > 0;
    if (dim !== G.dimmed) { G.dimmed = dim; document.body.classList.toggle('dim', dim); }
  };
  // ?timer=1 keeps the loop running in hidden/background tabs (automated playtests)
  const schedule = params.has('timer') ? (f) => setTimeout(() => f(performance.now()), 16) : requestAnimationFrame.bind(window);
  schedule(frame);
}
boot();
