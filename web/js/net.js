// Co-op multiplayer over WebRTC (PeerJS, loaded only when a room is opened or joined).
// The host's game stays the single source of truth: it streams its screen and sound to the guests,
// and each guest steers one of the host's party Pokémon in dungeons (P2 = partner, P3 = third member).
// Solo play never touches any of this; a solo game can open a room at any time and guests can leave freely.
import { G, VW, toast, COL } from './core.js';
import { tr } from './i18n.js';
import { audioStream } from './audio.js';

const PEERJS = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const PREFIX = 'joseon-poke-v2-';
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TURN_WAIT = 12; // seconds a dungeon turn waits for a guest before its Pokémon falls back to the AI
// a guest's press waits for its turn that long too: one older than a turn would have waited for it is dropped (1.30; up to
// 1.29 a press made minutes before, in a town or before a window switch, was played on the guest's next turn)
const CMD_KEEP = TURN_WAIT * 1000;
const JOIN_WAIT = 25000; // ms a guest waits for the host's welcome before giving up (1.30; it said "Connecting" for ever)
// PeerJS errors that do not end a room once it is open, or a guest's stay once it is in: the players are connected to each
// other, and the PeerJS server is only where new guests find the room (1.30; up to 1.29 any error, such as a moment
// without that server, closed the room for everybody)
const PASSING = new Set(['network', 'socket-error', 'socket-closed', 'server-error', 'disconnected', 'peer-unavailable', 'webrtc', 'unavailable-id']);
const CHAT_GAP = 800; // ms between one guest's chat lines on the host's screen; more are dropped
// The host's picture reaches a guest over a link of its own, beside the one its commands go by. It may never come, or stop
// while the other holds: the guest then asks the host for it again (VIDEO_TRIES times, VIDEO_WAIT ms each), and failing
// that its stay ends with a word. Up to 1.30 it stayed in the room with no picture for ever, its presses still played.
const VIDEO_WAIT = 12000, VIDEO_TRIES = 3, CALL_GAP = 3000; // CALL_GAP: ms between two calls the host makes to one guest
// a move as a guest's button shows it (Dungeon.drawUI names them): only what the button has a place for gets through
const MOVE_SHOWN = (m) => ({ name: String(m?.name ?? '').slice(0, 24), pp: +m?.pp || 0, max: +m?.max || 0, color: /^#[0-9a-f]{3,8}$/i.test(m?.color) ? m.color : '', reach: String(m?.reach ?? '').slice(0, 12) });

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
  code: '', status: '', peer: null, attempt: 0, // attempt: which try at opening or joining is the live one (leave ends it)
  guests: [], // host: [{ conn, slot, name, call }]
  cmds: {}, // host: latest dungeon command per party slot
  conn: null, // guest: connection to the host
  slot: 0, // guest: party slot this player steers
  feed: null, moves: null, // guest: the host's picture as it comes in (its media link); the moves of the Pokémon it steers (null: not known)
  onChange: null,
  get active() { return !!this.role; },
  // host side ---------------------------------------------------------------------------------
  guestFor(slot) { return this.role === 'host' && this.guests.some((g) => g.slot === slot); },
  guestName(slot) { return this.guests.find((g) => g.slot === slot)?.name || `P${slot + 1}`; },
  takeCmd(slot) { const c = this.cmds[slot]; delete this.cmds[slot]; return c && performance.now() - c.at <= CMD_KEEP ? c : undefined; },
  turnWait: TURN_WAIT,
  async host() {
    if (this.role) return;
    if (navigator.onLine === false) return this.set(null, OFFLINE());
    this.set('host', tr('방을 여는 중…', 'Opening a room…'));
    const try_ = ++this.attempt;
    try {
      const Peer = await loadPeer();
      if (try_ !== this.attempt) return; // closed while the module loaded: that room must not open after all
      this.code = Array.from({ length: 6 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
      const peer = this.peer = new Peer(PREFIX + this.code);
      let opened = false, retry = null;
      peer.on('open', () => { if (this.peer !== peer) return; opened = true; this.set('host', this.guests.length ? '' : tr('친구를 기다리는 중', 'Waiting for friends')); });
      peer.on('connection', (conn) => { if (this.peer === peer) this.accept(conn); else conn.close(); });
      peer.on('error', (e) => {
        if (this.peer !== peer) return;
        if (opened && PASSING.has(e.type)) return this.set('host', tr('멀티플레이 서버와 연결이 끊겨 다시 잇는 중이에요. 이미 들어온 친구와는 계속 할 수 있어요.', 'Lost the co-op server; reconnecting. Friends already here can go on playing.'));
        this.fail(e);
      });
      // the line to the PeerJS server is tried again every few seconds for as long as the room stands
      peer.on('disconnected', () => {
        if (this.peer !== peer || this.role !== 'host') return;
        clearTimeout(retry);
        retry = setTimeout(() => { if (this.peer === peer && peer.disconnected && !peer.destroyed) peer.reconnect(); }, 3000);
      });
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
    g.call?.close();
    g.callAt = performance.now();
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
    if (m.t === 'cmd') this.command(g.slot, m);
    if (m.t === 'video' && performance.now() - (g.callAt || 0) >= CALL_GAP) this.call(g); // its picture did not come, or stopped: sent again
    if (m.t === 'chat' && typeof m.text === 'string' && performance.now() - (g.chatAt || -CHAT_GAP) >= CHAT_GAP) { g.chatAt = performance.now(); toast(`${g.name}: ${m.text.slice(0, 40)}`, COL.blue); }
  },
  // A guest's command for its Pokémon's next turn, checked here: an eight-way step, one of the four moves, an attack or a
  // rest. A press waits for its turn (CMD_KEEP). A direction held sends its step again and again, marked `rep` (netui.js):
  // those only steer a press still waiting, and letting go ('stop') takes a waiting repeat back, so the Pokémon stops where
  // the player stopped. Outside a dungeon nothing is kept: a key tried in town is not a move for the first turn of the next one.
  command(slot, m) {
    const had = this.cmds[slot];
    if (m.kind === 'stop') { if (had?.rep) delete this.cmds[slot]; return; }
    const ok = m.kind === 'move' ? Array.isArray(m.arg) && m.arg.length === 2 && m.arg.every((d) => d === -1 || d === 0 || d === 1) : m.kind === 'move-skill' ? [0, 1, 2, 3].includes(m.arg) : ['basic', 'wait'].includes(m.kind);
    // (nor once the run has ended, over its last words: Dungeon.enter starts every run with none waiting)
    if (!ok || typeof G.scene?.resumeTurn !== 'function' || G.scene.done) return;
    if (m.rep === true && had && !had.rep) { if (had.kind === 'move') had.arg = m.arg; return; }
    this.cmds[slot] = { kind: m.kind, arg: m.arg, rep: m.rep === true, at: performance.now() };
  },
  // each guest's own moves, by party slot, as the dungeon named them this frame (null anywhere else): told when they change
  moveLists(by) {
    if (this.role !== 'host') return;
    for (const g of this.guests) {
      const list = by?.[g.slot] || null, key = JSON.stringify(list);
      if (key === g.movesKey || !g.conn.open) continue;
      g.movesKey = key;
      g.conn.send({ t: 'moves', list });
    }
  },
  // the screen everyone sees: a 960x540 copy of the canvas plus the game's audio
  stream() {
    if (this.media) return this.media;
    const cv = this.capture = document.createElement('canvas');
    cv.width = 960; cv.height = 540;
    this.cctx = cv.getContext('2d');
    const s = cv.captureStream(30);
    // pixel art and text: on a slow link or a busy computer the picture loses frames rather than its sharpness
    for (const t of s.getVideoTracks()) t.contentHint = 'detail';
    for (const t of audioStream()) s.addTrack(t);
    this.media = s;
    return s;
  },
  // the guests' picture is the UI's 480 x 270 of the host's screen: a phone host's canvas is wider (1.28), and the whole
  // of it squeezed into 16:9 would be a quarter too narrow
  frame() { if (this.capture && this.guests.length) this.cctx.drawImage(G.screen, 0, 0, Math.round(G.screen.width * VW / G.W), G.screen.height, 0, 0, 960, 540); },
  // guest side --------------------------------------------------------------------------------
  async join(code) {
    if (this.role) return;
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) { this.set(null, tr('방 코드는 6글자예요.', 'Room codes have 6 characters.')); return; }
    if (navigator.onLine === false) return this.set(null, OFFLINE());
    this.set('guest', tr('연결하는 중…', 'Connecting…'));
    const try_ = ++this.attempt;
    // (the room's code is known once the host has answered: until then this try can still give up)
    setTimeout(() => { if (try_ === this.attempt && this.role === 'guest' && !this.code) this.fail(new Error(tr('방에 연결하지 못했어요. 방 코드와 인터넷 연결을 확인하고 다시 눌러 주세요.', 'Could not reach the room. Check the code and your connection, then try again.'))); }, JOIN_WAIT);
    try {
      const Peer = await loadPeer();
      if (try_ !== this.attempt) return; // left while the module loaded
      // every event below belongs to this try: once it is left (or another one started) a late one does nothing
      const peer = this.peer = new Peer();
      peer.on('open', () => {
        if (this.peer !== peer) return;
        const conn = this.conn = peer.connect(PREFIX + code, { reliable: true });
        conn.on('data', (m) => {
          if (this.conn !== conn) return;
          if (m?.t === 'hello') { this.slot = m.slot; this.code = code; this.videoTries = 0; this.set('guest', this.joined()); this.awaitVideo(); }
          if (m?.t === 'moves') { this.moves = Array.isArray(m.list) ? m.list.slice(0, 4).map(MOVE_SHOWN) : null; }
          if (m?.t === 'full') this.fail(new Error(tr('방이 가득 찼어요 (최대 3명).', 'The room is full (3 players max).')));
        });
        conn.on('close', () => { if (this.conn === conn && this.role === 'guest') this.fail(new Error(tr('호스트와 연결이 끊겼어요.', 'Lost the connection to the host.'))); });
      });
      // only the room's host shows its screen here (1.31: any caller that knew this player's id was answered, and its
      // picture took the host's place). A newer call takes an older one's place; what an older one still says is not heard.
      peer.on('call', (call) => {
        if (this.peer !== peer || call.peer !== PREFIX + code) { call.close(); return; }
        const old = this.feed;
        this.feed = call; old?.close();
        // (a moment later: when the whole room went, the link to the host says so first and the stay is over)
        const lost = () => setTimeout(() => {
          if (this.feed !== call || this.role !== 'guest' || !this.conn?.open) return;
          toast(tr('방장의 화면이 끊겨 다시 받는 중이에요…', "Lost the host's screen; getting it again…"), COL.red, 4);
          this.askVideo();
        }, 500);
        call.answer();
        call.on('stream', (s) => {
          if (this.feed !== call) return;
          clearTimeout(this.videoT); this.videoTries = 0;
          this.remote = s;
          for (const t of s.getVideoTracks()) t.addEventListener('ended', lost);
          this.set('guest', this.joined());
        });
        call.on('close', lost); call.on('error', lost);
      });
      peer.on('error', (e) => {
        if (this.peer !== peer) return;
        if (this.code && PASSING.has(e.type)) return; // already in the room: its link to the host is its own (conn 'close' tells when that ends)
        this.fail(e.type === 'peer-unavailable' ? new Error(tr('그 코드의 방을 찾지 못했어요.', 'No room with that code.')) : e);
      });
    } catch (e) { this.fail(e); }
  },
  joined() { return tr(`P${this.slot + 1}로 참가! 던전에서 ${this.slot === 1 ? '파트너' : '세 번째 동료'}를 조종해요.`, `Joined as P${this.slot + 1}! You steer the ${this.slot === 1 ? 'partner' : 'third member'} in dungeons.`); },
  // the picture is asked for (again) when none has come VIDEO_WAIT from now
  awaitVideo() {
    const a = this.attempt;
    clearTimeout(this.videoT);
    this.videoT = setTimeout(() => { if (a === this.attempt && this.role === 'guest' && !this.remote) this.askVideo(); }, VIDEO_WAIT);
  },
  askVideo() {
    if (this.role !== 'guest' || !this.code) return;
    const c = this.feed;
    this.feed = null; this.remote = null; c?.close(); // (what the call given up still says is no longer heard)
    if ((this.videoTries || 0) >= VIDEO_TRIES) return this.fail(new Error(tr('방장의 화면을 받지 못했어요. 인터넷 연결을 확인하고 다시 참가해 주세요.', "The host's screen did not come through. Check your connection and join again.")));
    this.videoTries = (this.videoTries || 0) + 1;
    this.set('guest', tr('방장의 화면을 받는 중…', "Getting the host's screen…"));
    this.send({ t: 'video' });
    this.awaitVideo();
  },
  // (a command goes only from a guest who sees the game: a press made blind is nobody's move)
  // (but a thumb lifted is told all the same: the step it was repeating must not be played once more)
  send(m) { if (this.role === 'guest' && this.conn?.open && (m.t !== 'cmd' || this.remote || m.kind === 'stop')) this.conn.send(m); },
  // shared ------------------------------------------------------------------------------------
  leave() {
    const was = this.role;
    this.attempt++;
    for (const g of this.guests) { g.call?.close(); g.conn.close(); }
    clearTimeout(this.videoT);
    this.feed?.close(); this.conn?.close(); this.peer?.destroy();
    // the screen's capture ends with the room; its sound track is the game's own mix (audio.js), kept for the next room
    for (const t of this.media?.getVideoTracks() || []) t.stop();
    Object.assign(this, { role: null, code: '', peer: null, guests: [], cmds: {}, conn: null, slot: 0, feed: null, moves: null, videoTries: 0, remote: null, media: null, capture: null });
    this.set(null, was ? tr('혼자 하기로 돌아왔어요.', 'Back to solo play.') : '');
  },
  fail(e) {
    const msg = e?.message === 'peerjs' ? tr('멀티플레이 모듈을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.', 'Could not load the multiplayer module. Check your internet connection.') : (e?.message || String(e));
    const was = this.role;
    this.leave();
    this.set(null, msg);
    this.onFail?.(msg, was);
  },
  set(role, status) { if (role !== undefined) this.role = role; this.status = status; this.onChange?.(); },
};
