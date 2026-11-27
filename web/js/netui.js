// Multiplayer panel (HTML, beside the canvas) and the guest's view: the host's streamed screen plus
// keyboard / touch controls that are sent to the host as dungeon commands.
import { G, APP, input, touchUI, prefs, repause, toast, COL } from './core.js';
import { tr, onLang } from './i18n.js';
import { NET } from './net.js';
import { unlockAudio, stopBgm, setMuted } from './audio.js';

const $ = (id) => document.getElementById(id);
const DIRK = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
const STEP_EVERY = 90; // ms between the steps a held direction sends (a turn at the fastest game speed is about that long)
// the ▶ button shows while a guest's picture is not playing, or plays without the sound the player wants
const syncPlay = () => { const v = $('mp-video'); $('mp-play').hidden = !(NET.role === 'guest' && NET.remote) || (!v.paused && (!v.muted || prefs.muted)); };
let letGo = () => {};

export function initNetUI() {
  const panel = $('mp'), btn = $('btn-mp');
  const open = () => { panel.hidden = false; repause(); input.down.clear(); input.pressed.clear(); render(); };
  const close = () => { panel.hidden = true; repause(); };
  btn.addEventListener('click', (e) => { e.currentTarget.blur(); panel.hidden ? open() : close(); });
  panel.querySelector('[data-close]').addEventListener('click', close);
  $('mp-host').addEventListener('click', () => { unlockAudio(); NET.host(); });
  $('mp-join').addEventListener('click', () => NET.join($('mp-code').value));
  $('mp-code').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') NET.join($('mp-code').value); });
  $('mp-leave').addEventListener('click', () => NET.leave());
  $('mp-copy').addEventListener('click', async () => {
    const url = shareUrl();
    try { await navigator.clipboard.writeText(url); $('mp-copy').textContent = tr('복사했어요!', 'Copied!'); } catch (e) { $('mp-copy').textContent = url; }
  });
  const chat = $('mp-chat');
  chat.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key !== 'Enter' || !chat.value.trim()) return;
    NET.send({ t: 'chat', text: chat.value.trim().slice(0, 40) }); chat.value = '';
  });
  NET.onChange = render;
  onLang(render);
  // guest controls: keys become commands for the Pokémon this player steers.
  // A direction pressed is one step; held, it walks on: the step goes again every STEP_EVERY ms, marked `rep`, and letting
  // go tells the host to drop a repeat still waiting (net.js command). Up to 1.29 a held arrow sent one step where the
  // keyboard repeats faster than the 60 ms below (Windows' usual 33 ms: each repeat put the send off again), and a held
  // pad one step ever, so the whole game stood waiting for the guest's next press.
  let held = new Set(), fresh = new Set(), timer = null, walk = null, walkDir = null;
  const dirOf = (keys) => { let dx = 0, dy = 0; for (const k of keys) { dx += DIRK[k][0]; dy += DIRK[k][1]; } return [Math.sign(dx), Math.sign(dy)]; };
  const step = (dx, dy) => { if (dx || dy) NET.send({ t: 'cmd', kind: 'move', arg: [dx, dy] }); };
  const hold = (dx, dy) => {
    if (!dx && !dy) { if (walk) { clearInterval(walk); walk = null; walkDir = null; NET.send({ t: 'cmd', kind: 'stop' }); } return; }
    walkDir = [dx, dy];
    walk ||= setInterval(() => NET.send({ t: 'cmd', kind: 'move', arg: walkDir, rep: true }), STEP_EVERY);
  };
  // everything held is let go: the window lost its keys (a key held through a window switch never says it was released:
  // up to 1.29 it stayed "held" and bent the next arrow into a diagonal), or the stay in the room ended
  letGo = () => { held.clear(); fresh.clear(); clearTimeout(timer); timer = null; hold(0, 0); };
  addEventListener('blur', letGo);
  document.addEventListener('visibilitychange', () => { if (document.hidden) letGo(); });
  addEventListener('keydown', (e) => {
    if (NET.role !== 'guest' || e.target === chat || e.target === $('mp-code')) return;
    const d = DIRK[e.code];
    if (d) {
      e.preventDefault();
      if (held.has(e.code)) return; // the keyboard's own repeats: the walk has its own pace
      held.add(e.code); fresh.add(e.code);
      clearTimeout(timer); // a short grace period lets two arrows combine into a diagonal (a tap shorter than it still counts)
      timer = setTimeout(() => { timer = null; step(...dirOf(new Set([...held, ...fresh]))); fresh.clear(); hold(...dirOf(held)); }, 60);
      return;
    }
    const k = { KeyZ: ['basic'], Enter: ['basic'], Space: ['basic'], KeyA: ['wait'], KeyQ: ['move-skill', 0], KeyW: ['move-skill', 1], KeyE: ['move-skill', 2], KeyR: ['move-skill', 3] }[e.code];
    if (k) { e.preventDefault(); NET.send({ t: 'cmd', kind: k[0], arg: k[1] }); }
  }, true);
  addEventListener('keyup', (e) => { if (held.delete(e.code) && !timer && NET.role === 'guest') hold(...dirOf(held)); }, true);
  // a guest's touch pad steers its Pokémon on the host (core.js initTouch asks these first): a step where it points, and
  // on for as long as it is held
  G.onPadDir = (dx, dy) => {
    if (NET.role !== 'guest') return false;
    step(dx, dy); hold(dx, dy);
    return true;
  };
  G.onPadKey = (k) => {
    if (NET.role !== 'guest') return false;
    if (k === 'ok') NET.send({ t: 'cmd', kind: 'basic' });
    else if (k === 'rest') NET.send({ t: 'cmd', kind: 'wait' });
    else if (/^m[1-4]$/.test(k)) NET.send({ t: 'cmd', kind: 'move-skill', arg: +k[1] - 1 });
    return true;
  };
  // a guest's gamepad steers its Pokémon like its keys and its touch pad (core.js pollGamepads; 1.31: up to 1.30 a
  // guest's pad did nothing): the stick or d-pad as the touch pad, A an attack, RT a rest, X Y LB RB the four moves
  let stick = '0,0';
  G.onGamepad = (now, was) => {
    if (NET.role !== 'guest') { stick = '0,0'; return false; }
    const dx = now.has('right') - now.has('left'), dy = now.has('down') - now.has('up');
    if (`${dx},${dy}` !== stick) { stick = `${dx},${dy}`; step(dx, dy); hold(dx, dy); }
    for (const k of now) if (!was.has(k)) G.onPadKey(k);
    return true;
  };
  const vid = $('mp-video');
  // the sound of the host's screen is the guest's own to turn on and off, with the sound button like the game's own sound
  // (1.30; up to 1.29 that button did nothing to it). ▶ asks for the picture with its sound, so it turns the sound on
  G.onMuted = (on) => { if (NET.role !== 'guest') return; vid.muted = on; if (!on) vid.play().catch(() => {}); syncPlay(); };
  // and as loud as the guest's own volume says (1.38; the gain audio.js gives its own sound)
  G.onVolume = (gain) => { try { vid.volume = gain; } catch (e) { /* a browser that keeps a video's volume to itself */ } };
  G.onVolume(((prefs.volume ?? 100) / 100) ** 2);
  $('mp-play').addEventListener('click', () => {
    if (prefs.muted) { setMuted(false); G.onPrefs?.(); }
    vid.muted = false; vid.play().then(syncPlay, syncPlay);
  });
  // ?join=CODE opens the panel and connects straight away
  const q = new URLSearchParams(location.search).get('join');
  if (q) { open(); $('mp-code').value = q; NET.join(q); }
  render();
}

// the app's own page lives at https://localhost, so its invites point friends at the web version
const WEB_URL = 'https://jbh99.github.io/joseon-poke-timetravel/';
function shareUrl() {
  const u = new URL(APP ? WEB_URL : location.href);
  u.search = ''; u.searchParams.set('join', NET.code);
  return u.toString();
}

let lastRole = null;
// a guest put out of the room with the panel closed (the host left, the line or its picture was lost) is told on the screen
// too: up to 1.30 the reason stood only in the panel, and the guest found itself back in its own game without a word
NET.onFail = (msg, was) => { if (was === 'guest' && $('mp').hidden) toast(msg, COL.red, 6); };
function render() {
  const role = NET.role;
  $('btn-mp').textContent = role === 'host' ? tr(`멀티 · ${NET.guests.length + 1}명`, `Co-op · ${NET.guests.length + 1}`) : role === 'guest' ? tr('멀티 · 참가 중', 'Co-op · joined') : tr('멀티', 'Co-op');
  $('mp-title').textContent = tr('함께 하기 (멀티플레이)', 'Play together (co-op)');
  $('mp-intro').textContent = tr('혼자 하던 게임에 친구를 불러 함께 이야기를 보고 던전을 깰 수 있어요. 방을 연 사람의 화면과 소리가 친구에게 보이고, 던전에서는 친구가 파트너(P2)와 세 번째 동료(P3)를 직접 움직여요. 친구가 나가면 그 포켓몬은 다시 자동으로 움직이고, 저장은 방을 연 사람의 게임에만 남아요.',
    'Invite friends into your solo game to watch the story and clear dungeons together. Friends see and hear the host\'s screen, and in dungeons they steer the partner (P2) and the third member (P3). When a friend leaves, that Pokémon goes back to autopilot, and saves stay in the host\'s game only.');
  $('mp-host').textContent = tr('방 만들기', 'Open a room');
  $('mp-join').textContent = tr('참가하기', 'Join');
  $('mp-code').placeholder = tr('방 코드 6자리', '6-letter room code');
  $('mp-leave').textContent = role === 'host' ? tr('방 닫고 혼자 하기', 'Close room, play solo') : tr('나가기', 'Leave');
  $('mp-copy').textContent = tr('초대 링크 복사', 'Copy invite link');
  $('mp-chat').placeholder = tr('채팅 (Enter로 보내기)', 'Chat (Enter to send)');
  $('mp-play').textContent = tr('▶ 화면 보기 (소리 켜기)', '▶ Watch (with sound)');
  $('mp-solo').hidden = !!role;
  $('mp-hosting').hidden = role !== 'host';
  $('mp-guest').hidden = role !== 'guest';
  $('mp-leave').hidden = !role;
  $('mp-roomcode').textContent = NET.code || '······';
  $('mp-players').innerHTML = '';
  const rows = role === 'host' ? [[tr('P1 (나)', 'P1 (you)'), tr('리더 · 메뉴와 이야기 진행', 'Leader · menus and story')], ...[1, 2].map((s) => [`P${s + 1}`, NET.guestFor(s) ? (s === 1 ? tr('파트너 조종', 'steers the partner') : tr('세 번째 동료 조종', 'steers the third member')) : tr('빈자리', 'open')])] : [];
  for (const [a, b] of rows) { const li = document.createElement('li'); li.textContent = `${a} — ${b}`; $('mp-players').appendChild(li); }
  // (a guest's place in the room is known once the host has answered: until then no "P1" is shown, which is the host's)
  $('mp-guestinfo').textContent = role === 'guest' && NET.code ? tr(`방 ${NET.code} · P${NET.slot + 1} — 던전에서 방향키 이동, Z 공격, Q·W·E·R 기술, ${touchUI ? '메뉴 버튼 → 한 턴 쉬기' : 'A 쉬기'}. 자기 차례에 화면 위에 표시가 떠요.`, `Room ${NET.code} · P${NET.slot + 1} — in dungeons: arrows move, Z attacks, Q/W/E/R moves, ${touchUI ? 'Menu → Rest a turn' : 'A rests'}. A banner shows when it's your turn.`) : '';
  $('mp-status').textContent = NET.status || '';
  $('btn-speed').disabled = role === 'guest'; // the host's speed is the one everybody watches
  // guest view: the host's screen replaces the local canvas
  const vid = $('mp-video');
  const watching = role === 'guest' && !!NET.remote;
  if (watching && vid.srcObject !== NET.remote) { vid.srcObject = NET.remote; vid.play().then(syncPlay, syncPlay); }
  vid.hidden = !watching; G.screen.style.visibility = watching ? 'hidden' : '';
  // a guest watches the host's game, its own standing still for as long as it stays (core.js repause)
  G.guest = role === 'guest'; repause();
  if (role === 'guest' && lastRole !== 'guest') stopBgm(0.3);
  if (!role && lastRole === 'guest') { vid.srcObject = null; $('mp-play').hidden = true; letGo(); }
  if (!watching) $('mp-play').hidden = true;
  lastRole = role;
}
