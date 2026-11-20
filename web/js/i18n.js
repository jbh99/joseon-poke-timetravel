// Language: ?lang=ko|en, then the saved choice, then the browser language.
// Switching is live: story text, Pokémon names and on-screen dialogue are swapped in place (no reload, no lost progress).
const KEY = 'joseon-lang';
function detect() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'ko' || q === 'en') { try { localStorage.setItem(KEY, q); } catch (e) { /* private mode */ } return q; }
  try { const s = localStorage.getItem(KEY); if (s === 'ko' || s === 'en') return s; } catch (e) { /* private mode */ }
  return (navigator.language || 'ko').toLowerCase().startsWith('ko') ? 'ko' : 'en';
}
export let LANG = detect();
export let EN = LANG === 'en';

// every tr() pair is remembered so text already on screen can be flipped to the other language
const KO2EN = new Map(), EN2KO = new Map();
function remember(ko, en) {
  if (ko === en || KO2EN.get(ko) === en) return;
  KO2EN.set(ko, en); EN2KO.set(en, ko);
  if (KO2EN.size > 6000) { const k = KO2EN.keys().next().value; EN2KO.delete(KO2EN.get(k)); KO2EN.delete(k); }
}
// A Korean particle written both ways ("을(를)", "이(가)", "은(는)", "과(와)", "(으)로") settles on the one the word before
// it takes (1.32; up to 1.31 the screen read "오랭열매을(를) 주웠다!"): by the last syllable's final consonant, a number by
// how it is read (3 삼, 10 십), a letter by its name (P2, L). Quotes and brackets before it are looked through; after
// anything else it stays as written.
const JOSA = { '을(를)': '을를', '이(가)': '이가', '은(는)': '은는', '과(와)': '과와', '와(과)': '과와' };
const JOSA_RE = /(을\(를\)|이\(가\)|은\(는\)|과\(와\)|와\(과\)|\(으\)로)/g;
function finalOf(s, i) { // 0 no final consonant, 1 one, 2 ㄹ; null: not a word this can read
  for (; i >= 0; i--) {
    const ch = s[i], c = ch.charCodeAt(0);
    if (c >= 0xac00 && c <= 0xd7a3) { const j = (c - 0xac00) % 28; return j === 0 ? 0 : j === 8 ? 2 : 1; }
    if (ch >= '0' && ch <= '9') return '178'.includes(ch) ? 2 : '036'.includes(ch) ? 1 : 0;
    if (/[a-z]/i.test(ch)) return /[lr]/i.test(ch) ? 2 : /[mn]/i.test(ch) ? 1 : 0;
    if (!/[\s"'”’」』)\]>]/.test(ch)) return null;
  }
  return null;
}
export const josa = (s) => (s.includes('(') ? s.replace(JOSA_RE, (m, _p, at) => {
  const f = finalOf(s, at - 1);
  return f == null ? m : m === '(으)로' ? (f === 1 ? '으로' : '로') : JOSA[m][f ? 0 : 1];
}) : s);

export const tr = (ko, en) => {
  if (typeof ko === 'string') ko = josa(ko);
  if (typeof ko === 'string' && typeof en === 'string') remember(ko, en);
  else if (Array.isArray(ko) && Array.isArray(en)) ko.forEach((k, i) => typeof k === 'string' && typeof en[i] === 'string' && remember(k, en[i]));
  return EN ? en : ko;
};

// Story text lives in content files in Korean; English comes from {korean: english} tables.
// bindStory records every translatable string slot once; applyStory writes the current language into them.
const slots = [];
let NAMES = []; // [[ko, en], ...] longest first, for names embedded in already-built sentences
export function bindStory(root, table, missing) {
  const walk = (o) => {
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === 'string' && Object.getOwnPropertyDescriptor(o, k).get) continue; // text built when read (tr) follows the language by itself
      if (typeof v === 'string') {
        if (/[가-힣]/.test(v)) { if (table[v]) { slots.push([o, k, v, table[v]]); remember(v, table[v]); } else missing?.add(v); }
      } else if (v && typeof v === 'object') walk(v);
    }
  };
  walk(root);
}
function applyStory() { for (const [o, k, ko, en] of slots) o[k] = EN ? en : ko; }
// a Korean word with its subject particle: 이 after a final consonant (불꽃이), 가 after a vowel (바위가)
export const iga = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return w + (c >= 0 && c < 11172 && !(c % 28) ? '가' : '이'); };
export function setNames(pairs) { NAMES = pairs.filter(([a, b]) => a && b && a !== b).sort((p, q) => q[0].length - p[0].length); }

// Flip one already-built string to the current language: exact pairs first, then names inside it.
export function swapText(s) {
  if (typeof s !== 'string' || !s) return s;
  const hit = (EN ? KO2EN : EN2KO).get(s);
  if (hit != null) s = hit;
  for (const [ko, en] of NAMES) {
    const from = EN ? ko : en, to = EN ? en : ko;
    if (s.includes(from)) s = EN ? s.split(from).join(to) : s.replace(new RegExp(`\\b${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), to);
  }
  return s;
}

const listeners = [];
export const onLang = (fn) => listeners.push(fn);
export function setLang(l) {
  if (l !== 'ko' && l !== 'en') return;
  try { localStorage.setItem(KEY, l); } catch (e) { /* private mode */ }
  const u = new URL(location.href);
  if (u.searchParams.has('lang')) { u.searchParams.set('lang', l); history.replaceState(null, '', u.toString()); }
  if (l === LANG) return;
  LANG = l; EN = l === 'en';
  applyStory();
  for (const fn of listeners) fn(l);
}
export const initLang = () => { applyStory(); for (const fn of listeners) fn(LANG); };
