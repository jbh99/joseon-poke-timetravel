// Shared bits for the story files. K(korean, english) keeps the Korean text in the content tree and
// registers its English line; main.js binds both tables so a language switch flips the text in place.
export const EN_EXTRA = {};
export const K = (ko, en) => { EN_EXTRA[ko] = en; return ko; };

export const CELEBI = 251;

// Legends' signature moves (dungeon.js sigStart). A boss's `sig` (and each revive's) lists the moves it takes turns
// with and `at`, the HP marks (share of the form's max HP) where one goes off: one list, or a few to pick from at random.
// dmg is a share of max HP, like a telegraphed blast's.
export const SIG = {
  roar: { kind: 'roar', name: K('시간의 포효', 'Roar of Time'), type: 8, cut: 0.2, back: 10 }, // HP back to 10 s ago, the team -20%
  rend: { kind: 'rend', name: K('공간절단', 'Spacial Rend'), type: 11, dmg: 0.32 }, // the arena shrinks, rifts erupt from the floor
  shadow: { kind: 'shadow', name: K('섀도다이브', 'Shadow Force'), type: 7, dmg: 0.34 }, // gone into the dark, out of a shadow
  blades: { kind: 'blades', name: K('단애의 칼', 'Precipice Blades'), type: 4, dmg: 0.34 }, // stone blades along fissures
  pulse: { kind: 'pulse', name: K('근원의 파동', 'Origin Pulse'), type: 11, dmg: 0.34 }, // waves in all eight directions
  dark: { kind: 'pulse', name: K('악의파동', 'Dark Pulse'), type: 17, dmg: 0.3 },
  void: { kind: 'void', name: K('다크홀', 'Dark Void'), type: 17, dmg: 0.12 }, // whoever it catches falls asleep
  beam: { kind: 'sweep', name: K('파괴광선', 'Hyper Beam'), type: 0, dmg: 0.3 }, // a beam turning a full circle, a step a turn
};
// a form's first signature move at 60% of its HP; the second form's two or three spread over its bar
export const SIG_AT1 = [0.6], SIG_AT2 = [[0.75, 0.4], [0.8, 0.55, 0.3]];

// dungeon chunk sets from PMD Blue Rescue Team (assets/pmd/tiles/<id>)
export const T = {
  forest: 41, mountain: 50, library: 3, hill: 63, sea: 0, strait: 49, deepsea: 54, cave: 8,
  snow: 19, fortsnow: 18, quarry: 25, autumn: 28, fort: 37, bastion: 7, flat: 29, plant: 42,
  street: 40, alley: 13, birch: 53, baekdu: 47, rift: 33, warehouse: 17, volcano: 48, plain: 10,
  field: 20, sand: 14, castle: 44, crystal: 16, temple: 46, moss: 51, cliff: 2,
};

// Darkrai rises twice: the nightmare deepens (Dark Void and Shadow Force), then turns pitch black (all three moves,
// Attack +10% and Defense +20% like Arceus's last phase). Shared by Newmoon Island (1940) and the night of 12·12 (1979).
export const DARKRAI_SIG = { use: [SIG.void], at: SIG_AT1 };
export const DARKRAI_REVIVE = [
  { hp: 0.6, atk: 1.15, cap: 0.36, aura: '#7a3cff', form: K('악몽', 'Nightmare'),
    msg: K('다크라이가 쓰러지지 않는다! 악몽이 짙어지며 다시 일어섰다!', "Darkrai won't go down! The nightmare deepens as it rises again!"),
    tele: [
      { name: K('나이트메어', 'Bad Dreams'), every: 3, dmg: 0.4, stagger: 1, pats: ['ring', 'target', 'checker', 'x|near', 'quad'], type: 17, first: 2 },
      { at: 0.5, name: K('나이트메어', 'Bad Dreams'), every: 2, dmg: 0.46, stagger: 1, pats: ['ring|x', 'target|checker', 'quad|near', 'star', 'random|cross'], type: 17,
        msg: K('악몽이 걷잡을 수 없이 번진다! 공격이 더욱 거세진다!', 'The nightmare spreads out of control! Its attacks grow fiercer still!') },
    ],
    sig: { use: [SIG.void, SIG.shadow], at: SIG_AT2 } },
  { hp: 0.45, atk: 1.1, def: 1.2, cap: 0.38, aura: '#d02050', form: K('칠흑', 'Pitch Black'),
    msg: K('다크라이가 또다시 일어선다! 칠흑 같은 어둠이 모든 것을 삼킨다!', 'Darkrai rises yet again! A pitch-black darkness swallows everything!'),
    line: [{ who: 491, name: K('다크라이', 'Darkrai'), text: K('…깨어 있으려 할수록 악몽은 깊어진다. 끝까지 버틸 수 있겠느냐.', '...The harder you try to stay awake, the deeper the nightmare. Can you hold out to the end?') }],
    tele: [{ name: K('영원한 악몽', 'Endless Nightmare'), every: 2, dmg: 0.5, stagger: 1, pats: ['ring|target', 'checker|x', 'quad|near', 'star|far', 'random|cross', 'rows|cols'], type: 17, first: 2 }],
    sig: { use: [SIG.shadow, SIG.dark, SIG.void], at: [[0.75, 0.45, 0.2], [0.7, 0.35]] } },
];
