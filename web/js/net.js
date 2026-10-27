// Co-op multiplayer over WebRTC (PeerJS, loaded only when a room is opened or joined).
// The host's game stays the single source of truth: it streams its screen and sound to the guests,
// and each guest steers one of the host's party Pokémon in dungeons (P2 = partner, P3 = third member).
// Solo play never touches any of this; a solo game can open a room at any time and guests can leave freely.
import { G, toast, COL } from './core.js';
import { tr } from './i18n.js';
import { audioStream } from './audio.js';

const PEERJS = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const PREFIX = 'joseon-poke-v2-';
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TURN_WAIT = 12; // seconds a dungeon turn waits for a guest before its Pokémon falls back to the AI

// everything else plays offline (the Android app ships the whole game), but co-op needs the PeerJS servers
const OFFLINE = () => tr('멀티플레이는 인터넷 연결이 필요해요. Wi-Fi나 모바일 데이터를 켠 뒤 다시 눌러 주세요.', 'Co-op needs an internet connection. Turn on Wi-Fi or mobile data and try again.');
let loading = null;
function loadPeer() {
  if (window.Peer) return Promise.resolve(window.Peer);
  if (!loading) loading = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = PEERJS; s.async = true;
    s.onload = () => res(window.Peer); s.onerror = () => { loading = null; rej(new Error('peerjs')); };
    document.head.appendChild(s);
  });
  return loading;
}

export const NET = {
  role: null, // null (solo) | 'host' | 'guest'
  code: '', status: '', peer: null,
  guests: [], // host: [{ conn, slot, name, call }]
  cmds: {}, // host: latest dungeon command per party slot
  conn: null, // guest: connection to the host
  slot: 0, // guest: party slot this player steers
  onChange: null,
  get active() { return !!this.role; },
  // host side ---------------------------------------------------------------------------------
  guestFor(slot) { return this.role === 'host' && this.guests.some((g) => g.slot === slot); },
  guestName(slot) { return this.guests.find((g) => g.slot === slot)?.name || `P${slot + 1}`; },
  takeCmd(slot) { const c = this.cmds[slot]; delete this.cmds[slot]; return c; },
  turnWait: TURN_WAIT,
  async host() {
    if (this.role) return;
    if (navigator.onLine === false) return this.set(null, OFFLINE());
    this.set('host', tr('방을 여는 중…', 'Opening a room…'));
    try {
      const Peer = await loadPeer();
      this.code = Array.from({ length: 6 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
      const peer = this.peer = new Peer(PREFIX + this.code);
      peer.on('open', () => this.set('host', tr('친구를 기다리는 중', 'Waiting for friends')));
      peer.on('connection', (conn) => this.accept(conn));
      peer.on('error', (e) => this.fail(e));
      peer.on('disconnected', () => { if (this.role === 'host') peer.reconnect(); });
    } catch (e) { this.fail(e); }
  },
  accept(conn) {
    conn.on('open', () => {
      const used = new Set(this.guests.map((g) => g.slot));
      const slot = [1, 2].find((s) => !used.has(s));
      if (!slot) { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 300); return; }
      const g = { conn, slot, name: `P${slot + 1}` };
      this.guests.push(g);
      conn.send({ t: 'hello', slot });
      this.call(g);
      toast(tr(`${g.name}이(가) 들어왔다! (${slot === 1 ? '파트너' : '세 번째 동료'} 조종)`, `${g.name} joined! (steers the ${slot === 1 ? 'partner' : 'third member'})`), COL.blue);
      this.set('host', '');
    });
    conn.on('data', (m) => this.fromGuest(conn, m));
    conn.on('close', () => this.drop(conn));
    conn.on('error', () => this.drop(conn));
  },
  call(g) {
    const stream = this.stream();
    if (!stream) return;
    g.call = this.peer.call(g.conn.peer, stream);
  },
  drop(conn) {
    const g = this.guests.find((x) => x.conn === conn);
    if (!g) return;
    this.guests = this.guests.filter((x) => x !== g);
    delete this.cmds[g.slot];
    g.call?.close();
    toast(tr(`${g.name}이(가) 나갔다. 그 포켓몬은 다시 자동으로 움직인다.`, `${g.name} left. Their Pokémon is back on autopilot.`), COL.ink);
    this.set('host', '');
  },
  fromGuest(conn, m) {
    const g = this.guests.find((x) => x.conn === conn);
    if (!g || !m) return;
    if (m.t === 'cmd' && ['move', 'basic', 'move-skill', 'wait'].includes(m.kind)) this.cmds[g.slot] = { kind: m.kind, arg: m.arg };
    if (m.t === 'chat' && typeof m.text === 'string') toast(`${g.name}: ${m.text.slice(0, 40)}`, COL.blue);
  },
  // the screen everyone sees: a 960x540 copy of the canvas plus the game's audio
  stream() {
    if (this.media) return this.media;
    const cv = this.capture = document.createElement('canvas');
    cv.width = 960; cv.height = 540;
    this.cctx = cv.getContext('2d');
    const s = cv.captureStream(30);
    for (const t of audioStream()) s.addTrack(t);
    this.media = s;
    return s;
  },
  frame() { if (this.capture && this.guests.length) this.cctx.drawImage(G.screen, 0, 0, 960, 540); },
  // guest side --------------------------------------------------------------------------------
  async join(code) {
    if (this.role) return;
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) { this.set(null, tr('방 코드는 6글자예요.', 'Room codes have 6 characters.')); return; }
    if (navigator.onLine === false) return this.set(null, OFFLINE());
    this.set('guest', tr('연결하는 중…', 'Connecting…'));
    try {
      const Peer = await loadPeer();
      const peer = this.peer = new Peer();
      peer.on('open', () => {
        const conn = this.conn = peer.connect(PREFIX + code, { reliable: true });
        conn.on('data', (m) => {
          if (m?.t === 'hello') { this.slot = m.slot; this.code = code; this.set('guest', tr(`P${m.slot + 1}로 참가! 던전에서 ${m.slot === 1 ? '파트너' : '세 번째 동료'}를 조종해요.`, `Joined as P${m.slot + 1}! You steer the ${m.slot === 1 ? 'partner' : 'third member'} in dungeons.`)); }
          if (m?.t === 'full') this.fail(new Error(tr('방이 가득 찼어요 (최대 3명).', 'The room is full (3 players max).')));
        });
        conn.on('close', () => { if (this.role === 'guest') this.fail(new Error(tr('호스트와 연결이 끊겼어요.', 'Lost the connection to the host.'))); });
      });
      peer.on('call', (call) => {
        call.answer();
        call.on('stream', (s) => { this.remote = s; this.onChange?.(); });
      });
      peer.on('error', (e) => this.fail(e.type === 'peer-unavailable' ? new Error(tr('그 코드의 방을 찾지 못했어요.', 'No room with that code.')) : e));
    } catch (e) { this.fail(e); }
  },
  send(m) { if (this.role === 'guest' && this.conn?.open) this.conn.send(m); },
  // shared ------------------------------------------------------------------------------------
  leave() {
    const was = this.role;
    for (const g of this.guests) { g.call?.close(); g.conn.close(); }
    this.conn?.close(); this.peer?.destroy();
    Object.assign(this, { role: null, code: '', peer: null, guests: [], cmds: {}, conn: null, slot: 0, remote: null, media: null, capture: null });
    this.set(null, was ? tr('혼자 하기로 돌아왔어요.', 'Back to solo play.') : '');
  },
  fail(e) {
    const msg = e?.message === 'peerjs' ? tr('멀티플레이 모듈을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.', 'Could not load the multiplayer module. Check your internet connection.') : (e?.message || String(e));
    this.leave();
    this.set(null, msg);
  },
  set(role, status) { if (role !== undefined) this.role = role; this.status = status; this.onChange?.(); },
};
