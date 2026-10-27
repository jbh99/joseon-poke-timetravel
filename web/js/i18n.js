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
export const tr = (ko, en) => {
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
      if (typeof v === 'string') {
        if (/[가-힣]/.test(v)) { if (table[v]) { slots.push([o, k, v, table[v]]); remember(v, table[v]); } else missing?.add(v); }
      } else if (v && typeof v === 'object') walk(v);
    }
  };
  walk(root);
}
function applyStory() { for (const [o, k, ko, en] of slots) o[k] = EN ? en : ko; }
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
