// Google sign-in and a cloud copy of the save, for the web (PC, phone browsers) and the Android app. Each player's save
// goes to the hidden app-data folder of their own Google Drive (scope drive.appdata), so no server of ours holds anyone's
// data and every Google account keeps its own copy. Signed-in devices keep each other current: every save goes up, and
// a device that starts or comes back behind the cloud takes the newer save. The web gets its token from Google Identity
// Services; Google refuses its sign-in pages inside a WebView, so the app asks MainActivity (Play services) instead.
import { G, APP, touchUI, input, toast, COL, repause } from './core.js';
import { tr, onLang } from './i18n.js';
import { ERAS } from './content.js';
import { S, SLOTS, MODE_NAMES, slotOf, readSave, saves, saveText, replaceSave, keptSaves, keptText, putKept, renameKept, dropKept, keptPrint, droppedKept, setDropped } from './game.js';

// web OAuth client of the joseon-poke-timetravel Google Cloud project (origins: both sites and localhost:8790);
// the app is recognised by its package name and signing certificate instead
const CLIENT_ID = '238371388945-g8nh0a7h199q8rel4iiv3abku2crn2r5.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email';
const API = 'https://www.googleapis.com';
// every journey (game.js SLOTS, one per difficulty) has a copy of its own; Normal keeps the name the versions before
// 1.7 gave their only save, so they go on syncing it
const fileName = (slot) => (slot === 'normal' ? 'joseon-save.json' : `joseon-save-${slot}.json`);
// this device's link, { email, synced: { journey: savedAt }, mine, from, kept }: synced, the savedAt of the save this device
// last sent or took for each journey, which tells which side moved on since (a journey never synced here has none); mine,
// whether that save was this device's own upload; from, the newest save of another device this one's went on from (one
// it took, or one it replaced on purpose), which each upload carries in its copy (push); kept, the Past journeys this
// device has seen in the cloud (syncKept). Before 1.7 synced was one savedAt, that of the device's only save; before 1.20
// there was no mine or from; before 1.21 no kept.
const PREF = 'joseon-cloud', TOOK = 'joseon-cloud-took';
const $ = (id) => document.getElementById(id);
// files: the Drive copies by journey (undefined = not looked up yet); kept: the Drive copies of the Past journeys by their
// key; keptBad: those this run of the game could not take (damaged, or from a newer version); keptLate: the last sync of the
// Past journeys left some undone, to try again; choice: the player has to pick
// between this device's save of a journey and the cloud's (newer: only the cloud moved on, but taking it would drop the
// play in progress)
// session: counts the sign-outs; op: the session the work in hand (one at a time, busy) began in; cut: stops the requests
// of the session when it ends. Work still waiting on Google when the player signs out belongs to a session that is over:
// its requests are cut, and whatever answer still arrives changes nothing on this device (live). Up to 1.28 a save on its
// way down replaced this device's after the sign-out and wrote the link again.
const st = { token: null, exp: 0, email: null, files: undefined, kept: {}, keptBad: new Set(), keptLate: false, choice: null, pending: false, busy: false, again: false, tell: null, msg: '', session: 0, op: 0, cut: new AbortController() };
const stale = () => st.op !== st.session;
const live = (v) => { if (stale()) throw new Error('signed out'); return v; };

const linked = () => {
  try {
    const v = JSON.parse(localStorage.getItem(PREF));
    if (typeof v?.synced === 'string') v.synced = { [SLOTS.find((s) => String(readSave(s)?.savedAt) === v.synced) || 'normal']: v.synced };
    return v;
  } catch (e) { return null; }
};
const setLink = (v) => { try { if (v) localStorage.setItem(PREF, JSON.stringify(v)); else localStorage.removeItem(PREF); } catch (e) { /* private mode */ } };
// line: { mine, from } of the save just sent or taken (a save found equal on both sides keeps the ones it had)
const markSynced = (slot, savedAt, line) => {
  const l = linked() || {};
  setLink({ ...l, email: st.email, synced: { ...l.synced, [slot]: String(savedAt) }, ...(line && { mine: { ...l.mine, [slot]: line.mine }, from: { ...l.from, [slot]: line.from } }) });
};
// the save a copy went on from, as its uploader wrote it ("from savedAt"); null when not known: a copy from before 1.20,
// or one that a device before 1.20 wrote over (it leaves this field as it was, so its stamp no longer matches). A device
// whose own upload was replaced by such a copy cannot tell what it went on from, so it asks (sync)
const fromOf = (props) => { const [from, at] = String(props?.from || '').split(' '); return at && at === props.savedAt ? from : null; };
// the journey being played, whose save the cloud must not take away unasked (none on the title)
const playing = () => (G.scene && G.scene.constructor.name !== 'Title' ? S.slot : null);

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
  const r = live(APP ? await appToken(interactive) : await webToken());
  st.token = r.token; st.exp = Date.now() + (r.secs - 120) * 1000;
  return st.token;
}

// ---------------------------------------------------------------- Drive
// (every wait on Google is here or in getToken: an answer to a session that is over, its body too, stops at `live`)
async function api(path, opts = {}) {
  live();
  const r = live(await fetch(API + path, { ...opts, signal: st.cut.signal, headers: { Authorization: `Bearer ${st.token}`, ...opts.headers } }));
  if (r.status === 401) { st.token = null; throw new Error('needs-click'); }
  if (!r.ok) throw new Error(`Drive ${r.status}`);
  return { json: async () => live(await r.json()), text: async () => live(await r.text()) };
}
// the journeys' copies in the app folder; a copy from before 1.7 names no journey, so its own save is read for it. The
// Past journeys are files of their own, named after their keys (versions before 1.21 pass them by)
async function find() {
  const list = [];
  let page = '';
  do {
    const r = await (await api(`/drive/v3/files?spaces=appDataFolder&fields=nextPageToken,files(id,name,appProperties)&pageSize=100${page ? `&pageToken=${encodeURIComponent(page)}` : ''}`)).json();
    list.push(...(r.files || [])); page = r.nextPageToken || '';
  } while (page);
  const files = {}, kept = {};
  for (const f of list) {
    const k = /^(joseon-poke-kept-[a-z]+-\d+)\.json$/.exec(f.name || '');
    if (k) { kept[k[1]] = f; continue; }
    if (!/^joseon-save/.test(f.name || '')) continue;
    if (!f.appProperties?.slot) {
      try { f.appProperties = { ...f.appProperties, slot: slotOf(JSON.parse(await (await api(`/drive/v3/files/${f.id}?alt=media`)).text())) }; } catch (e) { continue; }
    }
    const slot = f.appProperties.slot, had = files[slot];
    if (SLOTS.includes(slot) && !(had && +had.appProperties.savedAt >= +f.appProperties.savedAt)) files[slot] = f;
  }
  st.files = files; st.kept = kept;
}
// what a save is, in a few words kept beside the file (Drive app properties are short strings)
// rev (1.31): the save's own mark (game.js save) with the time it belongs to, as `from` below: a device before 1.31 writing
// over the copy leaves this field as it was, and the time then tells that the mark is another save's (revOf: null, not known)
const meta = (o, slot) => ({ slot, era: String(o.era), playtime: String(Math.round(o.playtime || 0)), savedAt: String(o.savedAt || 0), ...(o.rev && { rev: `${o.rev} ${o.savedAt || 0}` }) });
const revOf = (props) => { const [rev, at] = String(props?.rev || '').split(' '); return rev && at === props.savedAt ? rev : null; };
// a save on this device and a copy in the cloud being one and the same save: by its time, and by its mark where both carry one
const sameSave = (local, props) => !!local && !!props && String(local.savedAt) === props.savedAt && (!local.rev || !revOf(props) || revOf(props) === local.rev);
// a file of the app folder written: over `file`, or new under `name`
async function writeFile(file, name, props, text) {
  const head = { appProperties: props, ...(file ? {} : { name, parents: ['appDataFolder'] }) };
  const b = `joseon${Date.now()}`;
  const body = `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(head)}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${text}\r\n--${b}--`;
  const path = `/upload/drive/v3/files${file ? `/${file.id}` : ''}?uploadType=multipart&fields=id,name,appProperties`;
  return (await api(path, { method: file ? 'PATCH' : 'POST', headers: { 'Content-Type': `multipart/related; boundary=${b}` }, body })).json();
}
// Drive has no write that fails when the file changed meanwhile, so two devices uploading the same journey at the same
// moment both go through, and the later wins the copy. What the copy then says it went on from (the save of another
// device this one took or replaced on purpose, as last looked up) shows the other device that its own upload was written
// over by a save that never had it: that device asks instead of taking the copy (sync), so its play is not lost.
async function push(slot) {
  const text = saveText(slot);
  if (!text) return;
  const m = meta(JSON.parse(text), slot), file = st.files[slot], l = linked() || {};
  const was = file?.appProperties.savedAt, own = !!was && !!l.mine?.[slot] && was === l.synced?.[slot];
  const from = was && !own ? was : l.from?.[slot] || '0';
  m.from = `${from} ${m.savedAt}`;
  st.files[slot] = await writeFile(file, fileName(slot), m, text);
  markSynced(slot, m.savedAt, { mine: true, from });
}
// a journey's cloud copy replaces its save on this device, unless this device saved that journey since `before` was read
// (the panel closed meanwhile): then nothing is replaced, and the next sync finds both sides moved on and asks (up to 1.19
// the copy replaced the newer save; a button's press reads `before` when pressed, as it waits on Google first)
// shown (a button's press, 1.40): the copy the look-up just found, the one the player was told of. A copy written over
// in the moment between that look-up and this read is another save, and is not taken unseen
async function pull(slot, before = saveText(slot), shown = null) {
  const text = await (await api(`/drive/v3/files/${st.files[slot].id}?alt=media`)).text();
  if (saveText(slot) !== before) throw new Error('saved meanwhile');
  if (shown) {
    let o = null;
    try { o = JSON.parse(text); } catch (e) { /* (not a save: replaceSave says so below) */ }
    if (o && !sameSave(o, shown)) throw new Error('changed meanwhile');
  }
  replaceSave(text, slot, ERAS.length); // a damaged copy, or one from a newer version, throws here and the save on this device stays
  const at = String(JSON.parse(text).savedAt);
  markSynced(slot, at, { mine: false, from: at });
  return meta(JSON.parse(text), slot);
}
// Past journeys go with the account (1.21; up to 1.20 they stayed on the device that kept them, so a PC could not play one
// kept on the phone): each is a file of its own beside the saves. A journey taken back, or dropped from a full list,
// leaves its file behind emptied and marked gone, so that the other devices drop it too. Only that mark takes a journey
// off a device: a file merely missing proves nothing (Drive's app data can be cleared), so what is here goes up again.
// link.kept tells what is in the cloud and not here: seen here before, this device took it back or dropped it (it is
// marked gone); never seen, it comes down. Two devices putting the same save aside (each on taking the other's new
// journey) keep one copy, under the key the cloud has (game.js keptPrint tells that two are the same journey). The marks
// last KEPT_MARK, long enough for the other devices.
// A journey the player deleted here (1.29, game.js deleteKept) is marked gone like one taken back; the note of what it was
// (droppedKept) also marks a copy of it this device never saw under that key, which would otherwise come down again.
// A deletion's mark says so (`del`, 1.31) and then holds for that save under every key: another device that had put the
// same save aside under a key of its own (while offline, say) no longer sends it up again, its copy goes like the others,
// and one an older version sent up meanwhile is marked too. A deletion that finds no file to mark leaves a mark of its
// own. Up to 1.30 the deleted journey came back to every device by that other key. Only that very save (keptPrint) goes:
// a later save of the journey, the journey in play and one merely taken back are left alone.
const KEPT_MARK = 90 * 86400000;
// up to n at once, all of them done before this ends (the first failure is thrown then): each one is a round trip to Google,
// and on a slow line a device with several journeys to fetch waited for them one after another
async function together(list, n, fn) {
  const q = [...list];
  let failed = null;
  await Promise.all(Array.from({ length: Math.min(n, q.length) }, async () => { while (q.length) { try { await fn(q.shift()); } catch (e) { failed ||= e; } } }));
  if (failed) throw failed;
}
// True when everything is in step. Whether a journey is on this device goes by the journey (keptPrint), not the file's key, so
// a renaming that failed cannot read as "taken back" (up to 1.23 that emptied a good file in the cloud). A file Drive refused
// leaves the others to go on and waits for the next sync; with no connection the sync ends here. What was learnt is kept either way.
async function syncKept() {
  const known = new Set(linked()?.kept), kept = st.kept, alive = new Map(), dropped = new Set(droppedKept());
  let changed = false, whole = true;
  const step = async (fn) => { try { await fn(); } catch (e) { whole = false; if (!/^Drive \d/.test(e.message)) throw e; } };
  const del = async (key) => { await api(`/drive/v3/files/${kept[key].id}`, { method: 'DELETE' }); delete kept[key]; };
  const printOf = (key) => keptPrint(kept[key].appProperties.slot, kept[key].appProperties);
  const deletions = () => new Set(Object.keys(kept).filter((key) => kept[key].appProperties.gone && kept[key].appProperties.del).map(printOf));
  const deleted = deletions();
  const mark = (key, gone) => step(async () => { kept[key] = await writeFile(kept[key], null, { gone: String(Date.now()), ...(gone && { del: '1' }) }, '{}'); known.delete(key); });
  try {
    for (const key of Object.keys(kept).sort()) {
      const p = kept[key].appProperties;
      if (p.gone) { if (Date.now() - +p.gone > KEPT_MARK) await step(() => del(key)); continue; }
      const at = keptPrint(p.slot, p), first = alive.get(at);
      if (deleted.has(at)) { await mark(key, true); continue; } // the save a player deleted, sent up again under another key
      if (first === undefined) { alive.set(at, key); continue; }
      if (known.has(key)) known.add(first); // what this device did with the copy going (taken back, say) holds for the one staying
      await step(async () => { await del(key); known.delete(key); });
    }
    for (const k of keptSaves()) {
      const f = kept[k.key], same = alive.get(keptPrint(k.slot, k.o));
      if (f?.appProperties.gone) { dropKept(k.key); known.delete(k.key); changed = true; }
      else if (f) known.add(k.key);
      else if (same) { known.add(same); if (renameKept(k.key, same)) changed = true; else whole = false; }
      else if (deleted.has(keptPrint(k.slot, k.o))) { dropKept(k.key); known.delete(k.key); changed = true; } // deleted on another device, under its key there
      else {
        const text = keptText(k.key);
        if (text == null) continue;
        await step(async () => {
          kept[k.key] = await writeFile(null, `${k.key}.json`, { slot: k.slot, savedAt: String(k.o.savedAt || 0), jid: k.o.jid || '' }, text);
          known.add(k.key);
        });
      }
    }
    const here = new Set(keptSaves().flatMap((k) => [k.key, keptPrint(k.slot, k.o)])), coming = [];
    for (const key of Object.keys(kept)) {
      const p = kept[key].appProperties;
      if (p.gone || here.has(key) || here.has(keptPrint(p.slot, p))) continue;
      if (known.has(key) || dropped.has(keptPrint(p.slot, p))) await mark(key, dropped.has(keptPrint(p.slot, p)));
      else if (!st.keptBad.has(key)) coming.push(key);
    }
    // a deletion no file carries yet (the journey never went up from here, or its file went meanwhile): a mark of its own
    const marked = deletions();
    let n = 0;
    for (const d of dropped) {
      const part = d.split(' '), slot = part[0], savedAt = part[part.length - 1], jid = part.slice(1, -1).join(' ');
      // (a file still holding that save is marked above, or will be at the next sync if Drive refused this time)
      if (marked.has(d) || !SLOTS.includes(slot) || Object.keys(kept).some((key) => !kept[key].appProperties.gone && printOf(key) === d)) continue;
      const key = `joseon-poke-kept-${slot}-${Date.now() + n++}`;
      await step(async () => { kept[key] = await writeFile(null, `${key}.json`, { slot, savedAt, jid, gone: String(Date.now()), del: '1' }, '{}'); });
    }
    await together(coming, 4, (key) => step(async () => {
      const text = await (await api(`/drive/v3/files/${kept[key].id}?alt=media`)).text();
      try { putKept(key, text, ERAS.length); known.add(key); changed = true; } catch (e) { if (e.message === 'no room') whole = false; else st.keptBad.add(key); }
    }));
  } finally {
    if (!stale()) setLink({ ...linked(), kept: [...known] }); // (signed out meanwhile: the next sync learns it again)
    if (changed) G.scene?.keptChanged?.();
  }
  return whole;
}
// (a Past journey that could not be shared this time waits for the next sync, and the panel says so; the saves' own sync goes on regardless)
const shareKept = () => syncKept().then((whole) => { st.keptLate = !whole; }, () => { live(); st.keptLate = true; });
// the notes of deleted journeys (game.js deleteKept) that still have work to do once the Past journeys are in step: only
// one whose save is still the cloud's copy of a journey with no save here, which sync must go on leaving there
const heldBack = (d, slot) => !readSave(slot) && !!st.files[slot] && d.startsWith(`${slot} `) && d.endsWith(` ${st.files[slot].appProperties.savedAt}`);
const keptNote = () => (st.keptLate ? tr(' 지난 여행은 아직 다 주고받지 못했어요. 다음 동기화 때 다시 시도해요.', ' Some Past journeys could not be shared yet; the next sync tries again.') : '');
// saves taken from the cloud: with the journey in play among them (or on the title) the game starts over from the title;
// another journey's save just waits there for its turn
function took(list) {
  const p = playing();
  if (p && !list.some((m) => m.slot === p)) return toast(tr(`클라우드 세이브를 받았어요 · ${list.map(describe).join(' / ')}`, `Took the cloud save · ${list.map(describe).join(' / ')}`), COL.blue, 5);
  try { sessionStorage.setItem(TOOK, JSON.stringify(list)); } catch (e) { /* private mode */ }
  location.reload();
}
// line each journey on this device up with its cloud copy: the side that moved on since this device last synced wins by
// itself; a device's first sync of a journey, or both sides having moved on, asks the player (one journey at a time).
// auto: not asked for, so the journey in play is never taken away
// held: the journey of a question still standing (autoSync, 1.40): the question stays as it is and that journey waits
// for the player's answer, while the other journeys go on
async function sync(auto, held = null) {
  await find();
  await shareKept(); // first: a save once taken must not wait on anything before the game restarts on it (took)
  const link = linked() || {}, was = link.synced || {}, p = playing(), got = [];
  let sent = 0;
  st.choice = held && st.choice?.slot === held ? st.choice : null;
  const waits = st.choice ? held : null;
  if (!st.keptLate) setDropped(droppedKept().filter((d) => SLOTS.some((slot) => heldBack(d, slot))));
  const dropped = droppedKept();
  try {
    for (const slot of SLOTS) {
      if (slot === waits) continue;
      const local = readSave(slot), cloud = st.files[slot]?.appProperties, w = was[slot];
      if (!cloud) { if (local) { await push(slot); sent++; } continue; }
      // the journey the player just put aside for a new one that has no save yet: its cloud copy is no news from another
      // device. Nor is it once the player has deleted that journey from the Past journeys (1.29): it would come back as
      // the save to continue
      if (!local && (keptSaves().some((k) => k.slot === slot && String(k.o.savedAt || 0) === cloud.savedAt) || dropped.some((d) => heldBack(d, slot)))) continue;
      if (local && String(local.savedAt) === cloud.savedAt) {
        // saved at the same instant on both sides and yet two saves, as their marks tell (meta rev; 1.31: up to 1.30 the
        // time alone made them one, "up to date", and the play of one side never went up): the player chooses
        const rev = revOf(cloud);
        if (local.rev && rev && rev !== local.rev) st.choice ||= { slot, local: meta(local, slot), cloud };
        else markSynced(slot, cloud.savedAt);
        continue;
      }
      if (local && w && cloud.savedAt === w) { await push(slot); sent++; continue; }
      if (!local || (w && String(local.savedAt) === w)) {
        // only the cloud moved on, by a copy that never had this device's own last upload (written over by another
        // device uploading at the same moment) or that cannot say (a device before 1.20 wrote it): the play here may
        // exist nowhere else, so the player chooses
        const lost = local && link.mine?.[slot] && fromOf(cloud) !== w;
        if (lost) st.choice ||= { slot, local: meta(local, slot), cloud };
        else if (auto && slot === p) st.choice ||= { slot, cloud, newer: true };
        else got.push(await pull(slot));
        continue;
      }
      st.choice ||= { slot, local: meta(local, slot), cloud };
    }
  } catch (e) { // a later journey failed: the saves already taken still count (the game in memory must not write over them)
    if (got.length) took(got);
    throw e;
  }
  st.pending = st.keptLate;
  if (!waits) say(st.choice ? '' : (sent ? tr('이 기기의 세이브를 클라우드에 올렸어요.', "This device's save is now in the cloud.")
    : SLOTS.some((s) => st.files[s]) ? tr('클라우드와 같은 최신 세이브예요.', 'Up to date with the cloud.') : tr('클라우드에 아직 세이브가 없어요.', 'There is no save in the cloud yet.')) + keptNote());
  if (got.length) took(got);
  return sent;
}

// ---------------------------------------------------------------- panel
// a journey's difficulty leads once there is more than one journey here or in the cloud (or it is not Normal)
const journeys = () => new Set([...saves().map((s) => s.slot), ...Object.keys(st.files || {})]).size;
function describe(m) {
  const t = +m.playtime || 0, d = new Date(+m.savedAt || 0), two = (n) => String(n).padStart(2, '0');
  const when = `${d.getMonth() + 1}/${d.getDate()} ${two(d.getHours())}:${two(d.getMinutes())}`, year = ERAS[+m.era]?.year ?? '?';
  const name = m.slot && (m.slot !== 'normal' || journeys() > 1) ? `${MODE_NAMES()[m.slot]} · ` : '';
  return name + tr(`${year}년 · ${Math.floor(t / 3600)}시간 ${Math.floor(t / 60) % 60}분 · ${when}`, `${year} · ${Math.floor(t / 3600)}h ${Math.floor(t / 60) % 60}m · ${when}`);
}
// the journey a button means: the one in question, else the one in play, else the one played last
const current = () => st.choice?.slot || playing() || saves()[0]?.slot || 'normal';
// the save that went further (era, then time played) is the one offered first
const ahead = (a, b) => +a.era - +b.era || +a.playtime - +b.playtime;
function say(msg) { st.msg = msg; }
function explain(e) {
  const m = String(e?.message || e);
  if (m === 'not a save') return tr('클라우드의 세이브가 손상됐거나 더 새로운 버전의 것이라 받지 않았어요. 이 기기의 세이브는 그대로예요.', "The cloud save is damaged or from a newer version, so it wasn't taken. The save on this device is untouched.");
  if (m === 'changed meanwhile') return tr('받는 사이에 클라우드의 세이브가 또 바뀌어서 받지 않았어요. 이 기기의 세이브는 그대로예요. 한 번 더 눌러 주세요.', 'The cloud save changed again while it came down, so it was not taken. The save on this device is untouched. Press once more.');
  if (m === 'saved meanwhile') return tr('받는 사이에 이 기기에서 저장해서 바꾸지 않았어요. 이 기기의 세이브는 그대로예요.', 'This device saved while the cloud save came down, so nothing was replaced. The save on this device is untouched.');
  // no room on this device for the cloud save, or for keeping aside the journey it would replace (game.js replaceSave,
  // which then leaves everything as it was)
  if (m === 'no room') return tr('이 기기의 저장 공간이 부족해 클라우드 세이브를 받지 못했어요. 이 기기의 세이브는 그대로예요. 타이틀의 지난 여행에서 안 쓰는 기록을 지우면 공간이 생겨요.', "This device has no room for the cloud save, so it wasn't taken. The save on this device is untouched. Deleting Past journeys you no longer need (on the title) frees room.");
  if (m === 'needs-click') return tr('구글 연결이 끊겼어요. 버튼을 한 번 더 눌러 주세요.', 'The Google connection expired. Press the button once more.');
  // the app's Play services status codes: 7 = no connection to Google, 16 = the player backed out
  const code = /^auth (\d+)/.exec(m)?.[1];
  if (code === '7' || /offline|fetch|network/i.test(m)) return tr('구글 서버에 연결하지 못했어요. 인터넷(VPN) 연결을 확인하고 다시 눌러 주세요.', "Couldn't reach Google. Check the internet (or VPN) connection and try again.");
  if (code === '16' || /cancel|denied|closed/i.test(m)) return tr('로그인이 취소됐어요.', 'Sign-in was cancelled.');
  if (code) return tr(`구글 로그인 오류 (코드 ${code})`, `Google sign-in error (code ${code})`);
  return tr('문제가 생겼어요: ', 'Something went wrong: ') + m;
}
// (work that the player's signing out cut short ends without a word: the panel already says "signed out")
async function run(fn) {
  if (st.busy) return;
  st.busy = true; st.op = st.session; st.msg = ''; render();
  try { await fn(); } catch (e) { if (!stale()) st.msg = explain(e); } finally { st.busy = false; render(); }
  syncAgain();
}
// a save made while the cloud was busy goes up once it is free (up to 1.18 it waited for the next save, or never went)
function syncAgain() { if (st.again) { st.again = false; setTimeout(autoSync, 500); } }
// a sync nobody asked for (start, coming back, after a save): quiet unless the player has to choose
async function autoSync() {
  if (!st.email) return;
  if (st.busy) { st.again = true; return; }
  st.busy = true; st.op = st.session; render(); // (an open panel shows it is at work: its save and load buttons wait)
  // (tell: a dungeon run just ended and its word went up at once, G.onSaved(true): the player hears how that went, since
  // another device continuing the journey before it is up would still find the run going on)
  // st.tell names that journey. Its word counts as told once the cloud holds this device's save of it, whichever sync
  // carried it there (1.40: a sync already on its way when the run ended sent it, the run's own sync then found nothing
  // left to send, and the player heard nothing: an outside report's five runs out of five).
  // A question still standing (asked) keeps its own journey waiting for the answer; the other journeys' saves go up all
  // the same (1.40: up to 1.39 nothing at all was sent meanwhile, and a save of another difficulty made then stayed on
  // this device until that difficulty was saved again).
  const told = st.tell, asked = st.choice?.slot || null;
  try {
    await getToken(false);
    await sync(true, asked);
    const t = st.tell;
    if (t && st.choice?.slot !== t && sameSave(readSave(t), st.files?.[t]?.appProperties)) {
      st.tell = null;
      toast(tr('던전 결과를 클라우드에 올렸어요', "The run's result is in the cloud"), COL.blue, 3);
    }
  } catch (e) {
    if (!stale()) { st.pending = true; if (told) toast(tr('던전 결과를 클라우드에 올리지 못했어요 · 연결을 확인해 주세요', "Couldn't send the run's result to the cloud · check the connection"), COL.red, 5); }
  } finally { st.busy = false; if (told) st.tell = null; render(); }
  syncAgain();
  if (st.choice && st.choice.slot !== asked) { openPanel(); toast(st.choice.newer ? tr('다른 기기에서 더 진행한 세이브가 있어요', 'Another device went further') : tr('이 기기와 클라우드의 세이브가 달라요', 'This device and the cloud differ'), COL.blue, 4); }
}
const signIn = () => run(async () => {
  await getToken(true);
  st.email = (await (await api('/oauth2/v3/userinfo')).json()).email;
  if (linked()?.email !== st.email) setLink({ email: st.email, kept: linked()?.kept }); // another account: this device has not synced with it
  await sync(false);
});
// The cloud's copy of a journey as the player knew it when pressing a button: the one the question named, else the one
// last looked up (before any look-up: the one this device last synced with, by its time alone); and whether the copy
// found now is another one
const shownCopy = (slot) => {
  const shown = st.choice?.slot === slot ? st.choice.cloud : st.files?.[slot]?.appProperties;
  return shown ? [shown.savedAt, shown.rev || ''] : [st.files ? '' : linked()?.synced?.[slot] || '', null];
};
const movedSince = (base, now) => !!now && (now.savedAt !== base[0] || (base[1] !== null && (now.rev || '') !== base[1]));
const upload = () => run(async () => {
  // the journey the button meant when pressed, as for a download below (1.31: read after the wait on Google, a journey
  // of another difficulty loaded meanwhile went up in its place, over that difficulty's copy)
  const slot = current();
  // The cloud's copy as the player knew it when pressing: the one the question named, else the one last looked up
  // (before any look-up: the one this device last synced with, by its time alone). Another device may have sent a
  // newer save since (the panel can stay open for hours), and the press would write this device's save over a copy the
  // player never saw, which that device then took back as "what the journey went on from" without a word (1.39: an
  // outside report's two devices lost the newer play both ways). So the copy is looked up again first, and one that
  // changed is shown with its own era and time for the player to choose again; nothing is written over it unseen.
  const base = shownCopy(slot);
  await getToken(true); await find();
  const now = st.files[slot]?.appProperties, local = readSave(slot);
  // (a journey with no save on this device yet has nothing to send; 1.40: up to 1.39 the panel said "saved" all the same)
  if (!local) return say(tr('이 기기에는 아직 저장된 여행이 없어요. 게임에서 한 번 기록한 뒤 다시 눌러 주세요.', 'There is no saved journey on this device yet. Save once in the game, then press again.'));
  if (movedSince(base, now) && !sameSave(local, now)) { // (the very save here needs no question)
    st.choice = { slot, local: meta(local, slot), cloud: now };
    return say(tr('그 사이 다른 기기가 클라우드에 다른 세이브를 올렸어요. 아무것도 덮어쓰지 않았어요. 바뀐 내용을 보고 다시 골라 주세요.', 'Another device sent a different save to the cloud meanwhile. Nothing was written over it. Look at what changed and choose again.'));
  }
  await push(slot);
  await shareKept();
  st.choice = null; st.pending = st.keptLate; say(tr('클라우드에 저장했어요.', 'Saved to the cloud.') + keptNote());
});
const download = () => run(async () => {
  // the journey and the save the player means to replace, as of the press: Google's window and the file list take a while,
  // and the panel can be closed and the journey played and saved meanwhile
  const slot = current(), before = saveText(slot), base = shownCopy(slot), newer = st.choice?.slot === slot && !!st.choice.newer;
  await getToken(true); await find();
  const now = st.files[slot]?.appProperties, local = readSave(slot);
  if (!now) { if (st.choice?.slot === slot) st.choice = null; return say(tr('클라우드에 아직 세이브가 없어요.', 'There is no save in the cloud yet.')); }
  // The copy is looked up again first, as for an upload: another device may have replaced it since the button was drawn
  // (1.40, an outside report: the button named 1019, a third device had put its 612 in the cloud meanwhile, and the
  // press took that one over this device's 660 without a word). A copy that changed is shown with its own era and time
  // for the player to choose again, and no save here is replaced by one the player never saw.
  if (movedSince(base, now) && (newer || (local && !sameSave(local, now)))) {
    st.choice = newer ? { slot, cloud: now, newer: true } : { slot, local: meta(local, slot), cloud: now };
    return say(tr('그 사이 클라우드의 세이브가 바뀌었어요. 아무것도 받지 않았고 이 기기의 세이브는 그대로예요. 바뀐 내용을 보고 다시 골라 주세요.', 'The save in the cloud changed meanwhile. Nothing was taken and the save on this device is untouched. Look at what changed and choose again.'));
  }
  await shareKept();
  const m = await pull(slot, before, now);
  st.choice = null; took([m]);
});
// (what this device has seen of the Past journeys stays, so that one taken back while signed out still leaves the other devices)
// Signing out is open while the cloud is at work too (a sync on a dead line would otherwise hold the player in): the
// session ends here, its requests are cut and its work stops at the next answer (live)
function signOut() {
  const kept = linked()?.kept;
  st.session++; st.cut.abort(); st.cut = new AbortController();
  Object.assign(st, { token: null, exp: 0, email: null, files: undefined, kept: {}, keptBad: new Set(), keptLate: false, choice: null, pending: false, again: false, tell: null, msg: tr('로그아웃했어요.', 'Signed out.') });
  setLink(kept?.length ? { kept } : null); render();
}
function render() {
  // the touch layout's HUD buttons are narrow, so it says less
  $('btn-cloud').textContent = st.email ? tr('클라우드', 'Cloud') + (st.pending || st.choice ? ' !' : '') : touchUI ? tr('로그인', 'Sign in') : tr('구글 로그인', 'Google login');
  if ($('cloud').hidden) return;
  $('cloud-title').textContent = tr('구글 계정 · 클라우드 저장', 'Google account · cloud save');
  $('cloud-intro').textContent = tr('구글로 로그인하면 세이브(난이도마다 하나씩)가 내 구글 드라이브의 앱 전용 숨김 폴더에 저장되고, 로그인한 PC와 폰이 서로 가장 최근 진행으로 이어져요.',
    'Sign in with Google to keep your saves (one per difficulty) in a hidden app folder of your own Google Drive; signed-in PCs and phones then carry on from the latest progress.');
  $('cloud-who').textContent = st.email ? tr(`${st.email} 로그인됨`, `Signed in as ${st.email}`) : '';
  const row = $('cloud-buttons');
  row.replaceChildren();
  const add = (label, fn, primary) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label; b.disabled = st.busy && fn !== signOut; b.className = primary ? 'primary' : ''; b.onclick = fn;
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
    const which = journeys() > 1 ? ` (${MODE_NAMES()[current()]})` : ''; // the buttons mean the journey in play or played last
    add(tr(`지금 클라우드에 저장${which}`, `Save to the cloud now${which}`), upload, true);
    add(tr(`클라우드에서 불러오기${which}`, `Load from the cloud${which}`), download);
    add(tr('로그아웃', 'Sign out'), signOut);
  }
  $('cloud-status').textContent = st.busy && !stale() ? tr('잠시만요…', 'One moment…') : st.msg; // (stale: signed out, the work only winding down)
}

// A save made while the player still has to choose (nothing goes up until then). "Another device went further" was
// found while this device's save stood as last synced, so only taking the cloud's was offered; once this device saves
// too, both sides have moved on and it is a choice between the two saves, as a sync started afresh would make it (1.38:
// up to 1.37 the panel went on offering only the cloud's save, and this device's play could not be sent up until the
// page was loaded again). The save shown for this device is the one just made.
function heldSave() {
  const c = st.choice, local = c.slot === S.slot && readSave(c.slot);
  if (!local) return;
  st.choice = { slot: c.slot, local: meta(local, c.slot), cloud: c.cloud };
  if (c.newer) toast(tr('이 기기에서도 진행했어요 · 클라우드 버튼에서 이어 갈 세이브를 골라 주세요', 'This device went on too · pick the save to keep under Cloud'), COL.blue, 5);
  render();
}
let openPanel = () => {};
export function initCloud() {
  const panel = $('cloud');
  openPanel = () => { panel.hidden = false; repause(); input.down.clear(); input.pressed.clear(); if (!APP) loadGis().catch(() => {}); render(); };
  const close = () => { panel.hidden = true; repause(); };
  $('btn-cloud').addEventListener('click', (e) => { e.currentTarget.blur(); if (panel.hidden) openPanel(); else close(); });
  panel.querySelector('[data-close]').addEventListener('click', close);
  onLang(render);
  // every save goes up a moment later, unless the player still has to choose or another device moved on meanwhile.
  // now: the end of a challenge's dungeon run (game.js clearRunMark, quests.js endChallenge) goes up at once and says so
  // (autoSync, tell): until it is up, another device continuing the journey finds the run still going on, which is its
  // wipe (1.39; in 1.38 it waited the same 2.5 s as any save, and a tab closed sooner never sent it). A save still
  // waiting when the page is put away (a tab left, the app sent to the background) goes up then, not when it comes back.
  let timer = null;
  const flush = () => { if (timer == null) return; clearTimeout(timer); timer = null; autoSync(); };
  G.onSaved = (now) => {
    if (!st.email) return;
    // (a question standing about the journey just saved: nothing of it goes up until the answer. A save of another
    // journey goes up as ever, the question staying: autoSync)
    if (st.choice?.slot === S.slot) return heldSave();
    clearTimeout(timer);
    if (now) st.tell = S.slot;
    timer = setTimeout(() => { timer = null; autoSync(); }, now ? 0 : 2500);
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  addEventListener('pagehide', flush);
  try {
    const list = [].concat(JSON.parse(sessionStorage.getItem(TOOK)) || []).map(describe).join(' / ');
    if (list) { sessionStorage.removeItem(TOOK); toast(tr(`클라우드 세이브를 불러왔어요 · ${list}`, `Loaded the cloud save · ${list}`), COL.blue, 5); }
  } catch (e) { /* private mode */ }
  // a link kept before 1.7 holds one savedAt: it is stored per journey now, while the saves are as it last saw them
  try { if (typeof JSON.parse(localStorage.getItem(PREF))?.synced === 'string') setLink(linked()); } catch (e) { /* private mode */ }
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
