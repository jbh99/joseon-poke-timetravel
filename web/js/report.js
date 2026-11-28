// Bug reports (written for 1.40, the user's wish; NOT SWITCHED ON yet: the web app that receives them is not deployed,
// ENDPOINT below is empty and the button stays away. Switching it on also takes the guide's line, the README's note
// and the privacy page's section, which were left out with it.) The HUD's button takes a picture of the game as it stands at that moment and
// opens a panel for a few words; Send posts both, with what the game knows of where the player is, to a small web app
// the developer runs on Google Apps Script (tools/bug_report.gs), which mails the report to its owner. No address is
// in this code, nothing leaves the device before the press, and the save itself is never sent.
import { G, APP, VERSION, touchUI, input, repause } from './core.js';
import { tr, onLang, LANG } from './i18n.js';
import { ERAS } from './content.js';
import { S } from './game.js';
import { NET } from './net.js';

// the web app's address (its deployment; the script itself is the developer's own). Empty: the button stays away.
const ENDPOINT = '';
const WIDEST = 1280, WAIT = 30000; // the picture's width at most; and how long before another report may follow
const $ = (id) => document.getElementById(id);
const st = { shot: '', busy: false, msg: '', bad: false, sentAt: 0 };
// what went wrong on the page lately, which a report carries along (the last few, short)
const errs = [];
const note = (s) => { errs.push(String(s).slice(0, 300)); if (errs.length > 6) errs.shift(); };
addEventListener('error', (e) => note(`${e.message} @${String(e.filename || '').split('/').pop()}:${e.lineno}`));
addEventListener('unhandledrejection', (e) => note(`rejected: ${e.reason?.stack || e.reason}`));

// the game's picture as it stands: the screen, or for a co-op guest the host's picture it is watching
function capture() {
  try {
    const vid = $('mp-video'), src = vid && !vid.hidden && vid.videoWidth ? vid : G.screen;
    const w = src.videoWidth || src.width, h = src.videoHeight || src.height;
    if (!w || !h) return '';
    const k = Math.min(1, WIDEST / w), c = document.createElement('canvas');
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.88);
  } catch (e) { return ''; }
}
// where the player is and on what: read when sent. Nothing of it names the player.
function info() {
  const sc = G.scene, name = sc?.constructor.name || '', inGame = !!name && name !== 'Title' && S.party?.length >= 2;
  const o = { version: VERSION, where: APP ? 'android app' : 'web', lang: LANG, touch: touchUI, scene: name };
  if (inGame) {
    Object.assign(o, {
      year: ERAS[S.era]?.year ?? null, step: S.step, mode: S.mode, faction: S.faction || undefined, place: S.lastNode,
      playtime: `${Math.floor((S.playtime || 0) / 3600)}h ${Math.floor((S.playtime || 0) / 60) % 60}m`,
      team: S.party.map((m) => `${m.name} Lv${m.lv} ${Math.max(0, Math.round(m.hp))}/${m.maxhp}`).join(', '),
    });
    if (sc.dId) Object.assign(o, { dungeon: sc.dId, floor: sc.floor, log: (sc.msgs || []).slice(-5).map((m) => String(m.text).slice(0, 120)) });
  }
  if (NET.role) o.coop = NET.role;
  if (errs.length) o.errors = errs.slice();
  return { ...o, screen: `${innerWidth}x${innerHeight} @${window.devicePixelRatio || 1}`, browser: navigator.userAgent };
}
const say = (msg, bad = false) => { st.msg = msg; st.bad = bad; };
function render() {
  $('btn-report').textContent = tr('버그 제보', 'Report a bug');
  if ($('report').hidden) return;
  $('report-title').textContent = tr('버그 제보', 'Report a bug');
  $('report-intro').textContent = tr('무엇이 이상했는지 적어 주세요. 이 창을 연 순간의 게임 화면이 함께 전송돼요.', 'Tell us what went wrong. The game screen as it was when this panel opened is sent along.');
  $('report-shot').hidden = !st.shot;
  if (st.shot && $('report-shot').src !== st.shot) $('report-shot').src = st.shot;
  $('report-with').disabled = !st.shot || st.busy;
  $('report-with-label').textContent = st.shot ? tr('화면 캡처 함께 보내기', 'Send the screen capture too') : tr('화면을 캡처하지 못했어요 (글만 보내요)', "Couldn't capture the screen (only the words go)");
  $('report-text').placeholder = tr('예: 1592년 한산도 해전 2층에서 계단을 밟아도 다음 층으로 넘어가지 않아요.', 'e.g. On floor 2 of the 1592 Hansan battle, stepping on the stairs does nothing.');
  $('report-reply').placeholder = tr('답장 받을 이메일 (선택)', 'Email for a reply (optional)');
  $('report-fine').textContent = tr(`함께 보내는 것: 게임 버전(${VERSION}) · 시대와 장소 · 난이도 · 팀 · 기기와 브라우저 종류. 세이브 파일은 보내지 않아요.`,
    `Sent along: the game's version (${VERSION}), era and place, difficulty, team, device and browser type. Your save file is not sent.`);
  $('report-send').textContent = st.busy ? tr('보내는 중…', 'Sending…') : tr('보내기', 'Send');
  $('report-send').disabled = st.busy;
  $('report-status').textContent = st.msg;
  $('report-status').classList.toggle('bad', st.bad);
}
async function send() {
  if (st.busy) return;
  const text = $('report-text').value.trim(), reply = $('report-reply').value.trim();
  if (text.length < 5) { say(tr('무슨 일이 있었는지 조금만 더 적어 주세요.', 'Please say what happened in a few more words.'), true); return render(); }
  if (reply && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reply)) { say(tr('답장 받을 이메일 주소를 확인해 주세요 (비워 두어도 돼요).', 'Check the reply address (it may be left empty).'), true); return render(); }
  if (Date.now() - st.sentAt < WAIT) { say(tr('방금 보냈어요. 잠시 뒤에 또 보낼 수 있어요.', 'Just sent. Another can follow in a moment.'), true); return render(); }
  st.busy = true; say(''); render();
  const cut = new AbortController(), timer = setTimeout(() => cut.abort(), 40000);
  try {
    // (a plain-text body: the browser sends it without asking the server first, which Apps Script could not answer)
    const r = await fetch(ENDPOINT, { method: 'POST', body: JSON.stringify({ app: 'joseon-poke', text, reply, shot: $('report-with').checked ? st.shot : '', info: info() }), signal: cut.signal });
    const j = await r.json();
    if (!j?.ok) throw new Error(j?.why || 'refused');
    st.sentAt = Date.now();
    $('report-text').value = '';
    say(tr('보냈어요. 알려 주셔서 고맙습니다!', 'Sent. Thank you for telling us!'));
  } catch (e) {
    say(e.message === 'busy' ? tr('지금은 제보가 너무 많이 몰렸어요. 조금 뒤에 다시 보내 주세요.', 'Too many reports just now. Please try again a little later.')
      : tr('보내지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.', "Couldn't send. Check the internet connection and press again."), true);
  } finally { clearTimeout(timer); st.busy = false; render(); }
}
export function initReport() {
  const panel = $('report'), btn = $('btn-report');
  if (!ENDPOINT) { btn.hidden = true; return; }
  const close = () => { panel.hidden = true; repause(); };
  const open = () => {
    if (!st.busy) { st.shot = capture(); $('report-with').checked = !!st.shot; say(''); } // (the picture first, before anything else is drawn)
    panel.hidden = false; repause(); input.down.clear(); input.pressed.clear(); render();
    if (!touchUI) $('report-text').focus(); // (a phone's keyboard would cover the panel before it is read)
  };
  btn.addEventListener('click', (e) => { e.currentTarget.blur(); if (panel.hidden) open(); else close(); });
  panel.querySelector('[data-close]').addEventListener('click', close);
  $('report-send').addEventListener('click', send);
  // what is typed here is the report's, not the game's (its keys, the guide's H, a co-op guest's moves)
  for (const t of ['keydown', 'keyup']) panel.addEventListener(t, (e) => { e.stopPropagation(); if (t === 'keydown' && e.key === 'Escape') { e.preventDefault(); close(); } });
  onLang(render);
  render();
}
