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
  rend: { kind: 'rend', name: K('공간절단', 'Spacial Rend'), type: 11, dmg: 0.42 }, // the arena shrinks, long rifts erupt all over the floor
  shadow: { kind: 'shadow', name: K('섀도다이브', 'Shadow Force'), type: 7, dmg: 0.34 }, // gone into the dark, out of a shadow
  blades: { kind: 'blades', name: K('단애의 칼', 'Precipice Blades'), type: 4, dmg: 0.34 }, // stone blades along fissures
  pulse: { kind: 'pulse', name: K('근원의 파동', 'Origin Pulse'), type: 11, dmg: 0.34 }, // waves in all eight directions
  dragon: { kind: 'pulse', name: K('용의파동', 'Dragon Pulse'), type: 16, dmg: 0.32 }, // Giratina's, shaped like Origin Pulse
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
