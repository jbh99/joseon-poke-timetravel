// Boot and main loop.
import { G, VW, VH, APP, touchUI, initCanvas, initTouch, pollGamepads, input, ui, setScene, fade, fadeTo, updateFade, drawToasts, relangToasts, loadJSON, loadImages, toast, COL, prefs } from './core.js';
import { initAudio, unlockAudio, pauseAudio, playBgm, stopBgm, setMuted } from './audio.js';
import { initData, S, save, load, newGame } from './game.js';
import { ERAS, STARTERS, CELEBI, QITEMS, CELEBI_INTRO, TELE_TUT, EN_EXTRA, FACTIONS, FACTION_TALK, FACTION_PICK } from './content.js';
import { EN, LANG, tr, setLang, bindStory, initLang, onLang, swapText } from './i18n.js';
import { Town, setBuildings, townSets } from './town.js';
import { initPmd, tileSet, portraitImage } from './pmd.js';
import { Dungeon } from './dungeon.js';
import { Title, EraCard, WorldMap, Ending } from './scenes.js';
import { onDungeonClear } from './quests.js';
import { NET } from './net.js';
import { initNetUI } from './netui.js';

// coming back to town autosaves (after any quest progress the dungeon unlocked)
G.goTown = (kind) => {
  setScene(new Town(kind));
  const d = G.pendingClear;
  G.pendingClear = null;
  if (d) setTimeout(async () => { await onDungeonClear(d); save(); }, 450);
  else save();
};
G.goWorld = () => setScene(new WorldMap());
G.goDungeon = (d) => setScene(new Dungeon(d));
G.nextEra = () => fadeTo(() => {
  S.era++; S.step = 0; S.eraClear = false; S.night = false; S.lastNode = 'town'; S.townKind = 1;
  save();
  setScene(new EraCard());
}, '#fff', 1.2);
G.goEnding = () => fadeTo(() => setScene(new Ending()), '#fff', 0.8);
G.goTitle = () => fadeTo(() => { stopBgm(0.3); G.overlays.length = 0; setScene(new Title()); });
G.onFirstInput = () => unlockAudio();
G.kao = portraitImage;
window.__game = { G, S, newGame, setScene, EraCard, Dungeon, Town, ERAS, save, load, NET }; // handle for automated playtests

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

// Android app: the back button (MainActivity) closes the guide or the co-op panel, works as X everywhere else,
// and leaves the app from the bare title screen; music stops while the app is in the background (unless hosting co-op)
window.onAndroidBack = () => {
  const open = ['guide', 'mp'].map((id) => document.getElementById(id)).find((el) => !el.hidden);
  if (open) return open.querySelector('[data-close]').click();
  if (G.scene instanceof Title && !G.overlays.length && !G.paused) return window.AndroidHost?.exit();
  dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
  setTimeout(() => dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape' })), 60);
};
if (APP) document.addEventListener('visibilitychange', () => { if (NET.role !== 'host') pauseAudio(document.hidden); });

async function boot() {
  initCanvas();
  initTouch();
  initGuide();
  initSpeed();
  initSound();
  initNetUI();
  const status = document.getElementById('status');
  try {
    await Promise.all([
      document.fonts.load('11px Galmuri11'), document.fonts.load('11px Galmuri11B'), document.fonts.load('9px Galmuri9'),
      initData(), initAudio(), initPmd(), loadJSON('data/buildings.json').then(setBuildings),
      loadImages(['poke/front/251.png', ...STARTERS.flatMap((s) => [`poke/front/${s}s.png`, `poke/icon/${s}s.png`])]),
      loadJSON('data/content_en.json').then((t) => {
        const missing = new Set();
        bindStory({ ERAS, QITEMS, CELEBI_INTRO, TELE_TUT, FACTIONS, FACTION_TALK, FACTION_PICK }, { ...t, ...EN_EXTRA }, missing);
        if (missing.size) console.warn('untranslated story text', [...missing]);
      }),
    ]);
  } catch (e) { status.textContent = tr('불러오기 실패: ', 'Failed to load: ') + e.message; throw e; }
  initLang();
  const man = await loadJSON('data/manifest.json');
  await Promise.all([loadImages(['bld', 'prop'].flatMap((k) => man[k].map((n) => `${k}/${n}.png`))), ...townSets().map((id) => tileSet(id).ready)]);
  status.remove();
  setScene(new Title());
  let gamepads = false; // polled only once a controller has shown up
  addEventListener('gamepadconnected', () => { gamepads = true; });
  let last = performance.now();
  const params = new URLSearchParams(location.search);
  const dev = Math.min(8, +params.get('speed') || 0); // ?speed=4 fast-forwards automated playtests
  const frame = (now) => {
    const real = Math.min(0.05, (now - last) / 1000);
    const dt = real * (dev || BASE_SPEED * G.speed);
    last = now;
    G.time += dt; G.real += real; G.dt = dt;
    if (gamepads) pollGamepads();
    if (S.party.length) S.playtime += real;
    const top = G.overlays[G.overlays.length - 1];
    if (top) { top.update(dt); G.overlays = G.overlays.filter((o) => !o.done); }
    else if (fade.a < 0.5) G.scene?.update(dt);
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
    NET.frame();
    input.pressed.clear(); input.click = null; input.pan.x = input.pan.y = 0;
    schedule(frame);
  };
  // ?timer=1 keeps the loop running in hidden/background tabs (automated playtests)
  const schedule = params.has('timer') ? (f) => setTimeout(() => f(performance.now()), 16) : requestAnimationFrame.bind(window);
  schedule(frame);
}
boot();
