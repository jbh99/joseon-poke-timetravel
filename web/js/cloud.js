// Google sign-in and a cloud copy of the save, for the web (PC, phone browsers) and the Android app. Each player's save
// goes to the hidden app-data folder of their own Google Drive (scope drive.appdata), so no server of ours holds anyone's
// data and every Google account keeps its own copy. Signed-in devices keep each other current: every save goes up, and
// a device that starts or comes back behind the cloud takes the newer save. The web gets its token from Google Identity
// Services; Google refuses its sign-in pages inside a WebView, so the app asks MainActivity (Play services) instead.
import { G, APP, touchUI, input, toast, COL } from './core.js';
import { tr, onLang } from './i18n.js';
import { ERAS } from './content.js';
import { readSave, saveText, replaceSave } from './game.js';

// web OAuth client of the joseon-poke-timetravel Google Cloud project (origins: both sites and localhost:8790);
// the app is recognised by its package name and signing certificate instead
const CLIENT_ID = '238371388945-g8nh0a7h199q8rel4iiv3abku2crn2r5.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email';
const FILE = 'joseon-save.json', API = 'https://www.googleapis.com';
// this device's link, { email, synced }: synced is the savedAt of the save this device last sent or took, which tells
// which side moved on since (a device that never synced has none)
const PREF = 'joseon-cloud', TOOK = 'joseon-cloud-took';
const $ = (id) => document.getElementById(id);
// file: the Drive copy (undefined = not looked up yet); choice: the player has to pick between this device's save and
// the cloud's (newer: only the cloud moved on, but taking it now would drop the play in progress)
const st = { token: null, exp: 0, email: null, file: undefined, choice: null, pending: false, busy: false, msg: '' };

const linked = () => { try { return JSON.parse(localStorage.getItem(PREF)); } catch (e) { return null; } };
const setLink = (v) => { try { if (v) localStorage.setItem(PREF, JSON.stringify(v)); else localStorage.removeItem(PREF); } catch (e) { /* private mode */ } };
const markSynced = (savedAt) => setLink({ email: st.email, synced: String(savedAt) });

// ---------------------------------------------------------------- tokens
let gis = null;
const loadGis = () => gis || (gis = new Promise((res, rej) => {
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
  s.onload = () => res(window.google.accounts.oauth2);
  s.onerror = () => { gis = null; rej(new Error('offline')); };
  document.head.appendChild(s);
}));
// the web token comes from Google's own window (closing by itself once the player has agreed)
async function webToken() {
  const oauth2 = await loadGis();
  return new Promise((res, rej) => {
    oauth2.initTokenClient({
      client_id: CLIENT_ID, scope: SCOPE,
      callback: (r) => (r.error ? rej(new Error(r.error)) : res({ token: r.access_token, secs: +r.expires_in || 3600 })),
      error_callback: (e) => rej(new Error(e?.type || 'cancelled')),
    }).requestAccessToken({ prompt: '', login_hint: st.email || '' });
  });
}
// the app's token: silent once the player has agreed, with Google's account and consent screens otherwise
function appToken(interactive) {
  return new Promise((res, rej) => {
    window.onGoogleAuth = (token, error) => (token ? res({ token, secs: 3000 }) : rej(new Error(error || 'cancelled')));
    window.AndroidHost.googleAuthorize(interactive);
  });
}
// a browser opens Google's window only right after a click or key press, so the web renews then (or not at all)
async function getToken(interactive) {
  if (st.token && Date.now() < st.exp) return st.token;
  if (!APP && !interactive && !navigator.userActivation?.isActive) throw new Error('needs-click');
  const r = APP ? await appToken(interactive) : await webToken();
  st.token = r.token; st.exp = Date.now() + (r.secs - 120) * 1000;
  return st.token;
}

// ---------------------------------------------------------------- Drive
async function api(path, opts = {}) {
  const r = await fetch(API + path, { ...opts, headers: { Authorization: `Bearer ${st.token}`, ...opts.headers } });
  if (r.status === 401) { st.token = null; throw new Error('needs-click'); }
  if (!r.ok) throw new Error(`Drive ${r.status}`);
  return r;
}
async function find() {
  const q = encodeURIComponent(`name='${FILE}'`);
  st.file = (await (await api(`/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,appProperties)`)).json()).files[0] || null;
}
// what a save is, in a few words kept beside the file (Drive app properties are short strings)
const meta = (o) => ({ era: String(o.era), playtime: String(Math.round(o.playtime || 0)), savedAt: String(o.savedAt || 0) });
async function push() {
  const text = saveText();
  if (!text) return;
  const m = meta(JSON.parse(text));
  const head = { appProperties: m, ...(st.file ? {} : { name: FILE, parents: ['appDataFolder'] }) };
  const b = `joseon${Date.now()}`;
  const body = `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(head)}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${text}\r\n--${b}--`;
  const path = `/upload/drive/v3/files${st.file ? `/${st.file.id}` : ''}?uploadType=multipart&fields=id,appProperties`;
  st.file = await (await api(path, { method: st.file ? 'PATCH' : 'POST', headers: { 'Content-Type': `multipart/related; boundary=${b}` }, body })).json();
  markSynced(m.savedAt);
  st.pending = false;
}
// the cloud copy replaces this device's save and the game starts over from the title with it
async function pull() {
  const text = await (await api(`/drive/v3/files/${st.file.id}?alt=media`)).text();
  replaceSave(text);
  markSynced(JSON.parse(text).savedAt);
  try { sessionStorage.setItem(TOOK, JSON.stringify(meta(JSON.parse(text)))); } catch (e) { /* private mode */ }
  location.reload();
}
// line this device up with the cloud: the side that moved on since this device last synced wins by itself; a device's
// first sync, or both sides having moved on, asks the player. auto: not asked for, so play in progress is not dropped
async function sync(auto) {
  await find();
  const local = readSave(), cloud = st.file?.appProperties, was = linked()?.synced;
  if (!cloud) {
    if (!local) return say(tr('클라우드에 아직 세이브가 없어요.', 'There is no save in the cloud yet.'));
    await push();
    return say(tr('이 기기의 세이브를 클라우드에 올렸어요.', "This device's save is now in the cloud."));
  }
  if (local && String(local.savedAt) === cloud.savedAt) { markSynced(cloud.savedAt); return say(tr('클라우드와 같은 최신 세이브예요.', 'Up to date with the cloud.')); }
  if (local && was && cloud.savedAt === was) { await push(); return say(tr('이 기기에서 더 진행한 세이브를 올렸어요.', 'Uploaded the further progress made here.')); }
  if (!local || (was && String(local.savedAt) === was)) {
    if (!auto || !G.scene || G.scene.constructor.name === 'Title') return pull(); // nothing in progress yet
    st.choice = { cloud, newer: true };
    return;
  }
  st.choice = { local: meta(local), cloud };
}

// ---------------------------------------------------------------- panel
function describe(m) {
  const t = +m.playtime || 0, d = new Date(+m.savedAt || 0), two = (n) => String(n).padStart(2, '0');
  const when = `${d.getMonth() + 1}/${d.getDate()} ${two(d.getHours())}:${two(d.getMinutes())}`, year = ERAS[+m.era]?.year ?? '?';
  return tr(`${year}년 · ${Math.floor(t / 3600)}시간 ${Math.floor(t / 60) % 60}분 · ${when}`, `${year} · ${Math.floor(t / 3600)}h ${Math.floor(t / 60) % 60}m · ${when}`);
}
// the save that went further (era, then time played) is the one offered first
const ahead = (a, b) => +a.era - +b.era || +a.playtime - +b.playtime;
function say(msg) { st.msg = msg; }
function explain(e) {
  const m = String(e?.message || e);
  if (m === 'needs-click') return tr('구글 연결이 끊겼어요. 버튼을 한 번 더 눌러 주세요.', 'The Google connection expired. Press the button once more.');
  // the app's Play services status codes: 7 = no connection to Google, 16 = the player backed out
  const code = /^auth (\d+)/.exec(m)?.[1];
  if (code === '7' || /offline|fetch|network/i.test(m)) return tr('구글 서버에 연결하지 못했어요. 인터넷(VPN) 연결을 확인하고 다시 눌러 주세요.', "Couldn't reach Google. Check the internet (or VPN) connection and try again.");
  if (code === '16' || /cancel|denied|closed/i.test(m)) return tr('로그인이 취소됐어요.', 'Sign-in was cancelled.');
  if (code) return tr(`구글 로그인 오류 (코드 ${code})`, `Google sign-in error (code ${code})`);
  return tr('문제가 생겼어요: ', 'Something went wrong: ') + m;
}
async function run(fn) {
  if (st.busy) return;
  st.busy = true; st.msg = ''; render();
  try { await fn(); } catch (e) { st.msg = explain(e); } finally { st.busy = false; render(); }
}
// a sync nobody asked for (start, coming back, after a save): quiet unless the player has to choose
async function autoSync() {
  if (st.busy || !st.email) return;
  st.busy = true;
  try {
    await getToken(false);
    if (st.choice) return;
    await sync(true);
  } catch (e) { st.pending = true; } finally { st.busy = false; render(); }
  if (st.choice) { openPanel(); toast(st.choice.newer ? tr('다른 기기에서 더 진행한 세이브가 있어요', 'Another device went further') : tr('이 기기와 클라우드의 세이브가 달라요', 'This device and the cloud differ'), COL.blue, 4); }
}
const signIn = () => run(async () => {
  await getToken(true);
  st.email = (await (await api('/oauth2/v3/userinfo')).json()).email;
  if (linked()?.email !== st.email) setLink({ email: st.email }); // another account: this device has not synced with it
  await sync(false);
});
const upload = () => run(async () => { await getToken(true); if (st.file === undefined) await find(); await push(); st.choice = null; say(tr('클라우드에 저장했어요.', 'Saved to the cloud.')); });
const download = () => run(async () => { await getToken(true); await find(); if (!st.file) return say(tr('클라우드에 아직 세이브가 없어요.', 'There is no save in the cloud yet.')); await pull(); });
function signOut() {
  Object.assign(st, { token: null, exp: 0, email: null, file: undefined, choice: null, pending: false, msg: tr('로그아웃했어요.', 'Signed out.') });
  setLink(null); render();
}
function render() {
  // the touch layout's HUD buttons are narrow, so it says less
  $('btn-cloud').textContent = st.email ? tr('클라우드', 'Cloud') + (st.pending || st.choice ? ' !' : '') : touchUI ? tr('로그인', 'Sign in') : tr('구글 로그인', 'Google login');
  if ($('cloud').hidden) return;
  $('cloud-title').textContent = tr('구글 계정 · 클라우드 저장', 'Google account · cloud save');
  $('cloud-intro').textContent = tr('구글로 로그인하면 세이브가 내 구글 드라이브의 앱 전용 숨김 폴더에 저장되고, 로그인한 PC와 폰이 서로 가장 최근 진행으로 이어져요.',
    'Sign in with Google to keep your save in a hidden app folder of your own Google Drive; signed-in PCs and phones then carry on from the latest progress.');
  $('cloud-who').textContent = st.email ? tr(`${st.email} 로그인됨`, `Signed in as ${st.email}`) : '';
  const row = $('cloud-buttons');
  row.replaceChildren();
  const add = (label, fn, primary) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label; b.disabled = st.busy; b.className = primary ? 'primary' : ''; b.onclick = fn;
    row.appendChild(b);
  };
  const c = st.choice;
  if (!st.email) add(tr('구글로 로그인', 'Sign in with Google'), signIn, true);
  else if (c?.newer) {
    $('cloud-who').textContent += tr(' · 다른 기기에서 더 진행했어요. 받으면 지금 하던 진행 대신 그 세이브로 이어 해요.', ' · Another device went further. Taking it replaces the play in progress here.');
    add(tr(`클라우드 세이브 받기 (${describe(c.cloud)})`, `Take the cloud save (${describe(c.cloud)})`), download, true);
  } else if (c) {
    $('cloud-who').textContent += tr(' · 이 기기와 클라우드의 세이브가 달라요. 어느 쪽으로 이어 할까요?', ' · This device and the cloud hold different saves. Which one goes on?');
    const take = () => add(tr(`클라우드 세이브 받기 (${describe(c.cloud)})`, `Take the cloud save (${describe(c.cloud)})`), download, ahead(c.cloud, c.local) >= 0);
    const give = () => add(tr(`이 기기 세이브 올리기 (${describe(c.local)})`, `Upload this device's save (${describe(c.local)})`), upload, ahead(c.cloud, c.local) < 0);
    if (ahead(c.cloud, c.local) >= 0) { take(); give(); } else { give(); take(); }
  } else {
    add(tr('지금 클라우드에 저장', 'Save to the cloud now'), upload, true);
    add(tr('클라우드에서 불러오기', 'Load from the cloud'), download);
    add(tr('로그아웃', 'Sign out'), signOut);
  }
  $('cloud-status').textContent = st.busy ? tr('잠시만요…', 'One moment…') : st.msg;
}

let openPanel = () => {};
export function initCloud() {
  const panel = $('cloud');
  openPanel = () => { panel.hidden = false; G.paused = true; input.down.clear(); input.pressed.clear(); if (!APP) loadGis().catch(() => {}); render(); };
  const close = () => { panel.hidden = true; G.paused = false; };
  $('btn-cloud').addEventListener('click', (e) => { e.currentTarget.blur(); if (panel.hidden) openPanel(); else close(); });
  panel.querySelector('[data-close]').addEventListener('click', close);
  onLang(render);
  // every save goes up a moment later, unless the player still has to choose or another device moved on meanwhile
  let timer = null;
  G.onSaved = () => {
    if (!st.email || st.choice) return;
    clearTimeout(timer);
    timer = setTimeout(autoSync, 2500);
  };
  try {
    const took = JSON.parse(sessionStorage.getItem(TOOK));
    if (took) { sessionStorage.removeItem(TOOK); toast(tr(`클라우드 세이브를 불러왔어요 · ${describe(took)}`, `Loaded the cloud save · ${describe(took)}`), COL.blue, 5); }
  } catch (e) { /* private mode */ }
  st.email = linked()?.email || null;
  if (st.email) {
    // the app reconnects silently at once and whenever it comes back; the web at the player's first click or key press
    // (Google's window needs one), and on coming back while its token lasts
    if (APP) autoSync();
    else {
      loadGis().catch(() => {});
      const first = () => { removeEventListener('keydown', first, true); removeEventListener('pointerup', first, true); if (!st.token) autoSync(); };
      addEventListener('keydown', first, true); addEventListener('pointerup', first, true);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden && (APP || st.token)) autoSync(); });
  }
  render();
}
