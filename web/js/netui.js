// Multiplayer panel (HTML, beside the canvas) and the guest's view: the host's streamed screen plus
// keyboard / touch controls that are sent to the host as dungeon commands.
import { G, input } from './core.js';
import { tr, onLang } from './i18n.js';
import { NET } from './net.js';
import { unlockAudio, stopBgm } from './audio.js';

const $ = (id) => document.getElementById(id);
const DIRK = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };

export function initNetUI() {
  const panel = $('mp'), btn = $('btn-mp');
  const open = () => { panel.hidden = false; G.paused = true; input.down.clear(); input.pressed.clear(); render(); };
  const close = () => { panel.hidden = true; if (NET.role !== 'guest') G.paused = false; };
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
  // guest controls: keys become commands for the Pokémon this player steers
  let held = new Set(), timer = null;
  addEventListener('keydown', (e) => {
    if (NET.role !== 'guest' || e.target === chat || e.target === $('mp-code')) return;
    const d = DIRK[e.code];
    if (d) {
      e.preventDefault(); held.add(e.code);
      clearTimeout(timer); // a short grace period lets two arrows combine into a diagonal
      timer = setTimeout(() => {
        let dx = 0, dy = 0;
        for (const k of held) { dx += DIRK[k][0]; dy += DIRK[k][1]; }
        if (dx || dy) NET.send({ t: 'cmd', kind: 'move', arg: [Math.sign(dx), Math.sign(dy)] });
      }, 60);
      return;
    }
    const k = { KeyZ: ['basic'], Enter: ['basic'], Space: ['basic'], KeyA: ['wait'], KeyQ: ['move-skill', 0], KeyW: ['move-skill', 1], KeyE: ['move-skill', 2], KeyR: ['move-skill', 3] }[e.code];
    if (k) { e.preventDefault(); NET.send({ t: 'cmd', kind: k[0], arg: k[1] }); }
  }, true);
  addEventListener('keyup', (e) => { held.delete(e.code); }, true);
  document.querySelectorAll('#touch [data-k]').forEach((b) => b.addEventListener('touchstart', (e) => {
    if (NET.role !== 'guest') return;
    e.stopImmediatePropagation();
    const k = b.dataset.k, dir = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[k];
    if (dir) NET.send({ t: 'cmd', kind: 'move', arg: dir });
    else if (k === 'ok') NET.send({ t: 'cmd', kind: 'basic' });
    else if (k === 'rest') NET.send({ t: 'cmd', kind: 'wait' });
    else if (/^m[1-4]$/.test(k)) NET.send({ t: 'cmd', kind: 'move-skill', arg: +k[1] - 1 });
  }, { capture: true }));
  const vid = $('mp-video');
  $('mp-play').addEventListener('click', () => { vid.muted = false; vid.play().catch(() => {}); $('mp-play').hidden = true; });
  // ?join=CODE opens the panel and connects straight away
  const q = new URLSearchParams(location.search).get('join');
  if (q) { open(); $('mp-code').value = q; NET.join(q); }
  render();
}

function shareUrl() {
  const u = new URL(location.href);
  u.search = ''; u.searchParams.set('join', NET.code);
  return u.toString();
}

let lastRole = null;
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
  $('mp-guestinfo').textContent = role === 'guest' ? tr(`방 ${NET.code} · P${NET.slot + 1} — 던전에서 방향키 이동, Z 공격, Q·W·E·R 기술, A 쉬기. 자기 차례에 화면 위에 표시가 떠요.`, `Room ${NET.code} · P${NET.slot + 1} — in dungeons: arrows move, Z attacks, Q/W/E/R moves, A rests. A banner shows when it's your turn.`) : '';
  $('mp-status').textContent = NET.status || '';
  $('btn-speed').disabled = role === 'guest'; // the host's speed is the one everybody watches
  // guest view: the host's screen replaces the local canvas
  const vid = $('mp-video');
  const watching = role === 'guest' && !!NET.remote;
  if (watching && vid.srcObject !== NET.remote) { vid.srcObject = NET.remote; vid.play().then(() => { $('mp-play').hidden = !vid.muted; }).catch(() => { $('mp-play').hidden = false; }); }
  vid.hidden = !watching; G.screen.style.visibility = watching ? 'hidden' : '';
  if (role === 'guest' && lastRole !== 'guest') { G.paused = true; stopBgm(0.3); }
  if (!role && lastRole === 'guest') { G.paused = !$('mp').hidden; vid.srcObject = null; $('mp-play').hidden = true; }
  if (!watching) $('mp-play').hidden = true;
  lastRole = role;
}
