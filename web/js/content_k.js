// Shared bits for the story files. K(korean, english) keeps the Korean text in the content tree and
// registers its English line; main.js binds both tables so a language switch flips the text in place.
export const EN_EXTRA = {};
export const K = (ko, en) => { EN_EXTRA[ko] = en; return ko; };

export const CELEBI = 251;

// Legends' signature moves (dungeon.js sigStart). A boss's `sig` (and each revive's) lists the moves it takes turns
// with and `at`, the HP marks (share of the form's max HP) where one goes off: one list, or a few to pick from at random.
// dmg is a share of max HP, like a telegraphed blast's.
// the flames Ho-Oh's Sacred Fire leaves on the ground (dungeon.js leaveFlames): three turns, a share of max HP a turn
export const SACRED_LEAVE = { turns: 3, dmg: 0.04, hue: 'gold', wait: true };
export const SIG = {
  roar: { kind: 'roar', name: K('시간의 포효', 'Roar of Time'), type: 8, cut: 0.33, back: 10 }, // the team -33%; HP back to 10 s ago, plus what it just took from the team
  rend: { kind: 'rend', name: K('공간절단', 'Spacial Rend'), type: 11, dmg: 0.42 }, // the arena shrinks, long rifts erupt all over the floor
  shadow: { kind: 'shadow', name: K('섀도다이브', 'Shadow Force'), type: 7, dmg: 0.34 }, // gone into the dark, out of a shadow
  blades: { kind: 'blades', name: K('단애의 칼', 'Precipice Blades'), type: 4, dmg: 0.34 }, // stone blades along fissures
  pulse: { kind: 'pulse', name: K('근원의 파동', 'Origin Pulse'), type: 11, dmg: 0.34 }, // waves in all eight directions
  dragon: { kind: 'pulse', name: K('용의파동', 'Dragon Pulse'), type: 16, dmg: 0.32 }, // Giratina's, shaped like Origin Pulse
  dark: { kind: 'pulse', name: K('악의파동', 'Dark Pulse'), type: 17, dmg: 0.3 },
  void: { kind: 'void', name: K('다크홀', 'Dark Void'), type: 17, dmg: 0.12 }, // whoever it catches falls asleep
  beam: { kind: 'sweep', name: K('파괴광선', 'Hyper Beam'), type: 0, dmg: 0.3 }, // a beam turning a full circle, a step a turn, while its user's blasts go on
  // Rayquaza's (1.25). Dragon Ascent is no matter of turns: for secs seconds, every `every` seconds, a wall of wind shows
  // for `warn` seconds and then flies over the arena `tile` seconds a line of tiles (dungeon.js waveVolley)
  ascent: { kind: 'wave', name: K('화룡점정', 'Dragon Ascent'), type: 2, dmg: 0.18, secs: 6, every: 1.5, warn: 0.7, tile: 0.09, flash: '#9affc4' },
  meteor: { kind: 'storm', name: K('용성군', 'Draco Meteor'), type: 16, dmg: 0.3, turns: 3, spots: 12, flash: '#ffd0a0', what: K('유성', 'meteors') },
  gale: { kind: 'storm', name: K('폭풍', 'Hurricane'), type: 2, dmg: 0.28, turns: 3, spots: 12, flash: '#e0f0ff', what: K('돌풍', 'gusts') },
  // 1.36. Palkia's last form uses two at once (dungeon.js ultTurn): Spacial Rend's rifts three turns running, fewer and
  // weaker than the single tear's, beside water spouts, meteors or an Aura Sphere
  rend3: { kind: 'rend', name: K('공간절단', 'Spacial Rend'), type: 11, dmg: 0.3, turns: 3, rifts: 5 },
  spouts: { kind: 'storm', name: K('하이드로펌프', 'Hydro Pump'), type: 11, dmg: 0.28, turns: 3, spots: 6, flash: '#a0d8ff', what: K('물기둥', 'water spouts') },
  meteor3: { kind: 'storm', name: K('용성군', 'Draco Meteor'), type: 16, dmg: 0.28, turns: 3, spots: 6, flash: '#ffd0a0', what: K('유성', 'meteors') },
  aura: { kind: 'pulse', name: K('파동탄', 'Aura Sphere'), type: 1, dmg: 0.3 },
  // Ho-Oh's second form: Sacred Fire for three turns, burning on where it fell (few spots besides the team's own, and
  // these flames last two turns: three falls of three-turn flames covered more than a quarter of the arena)
  sacred: { kind: 'storm', name: K('성스러운불꽃', 'Sacred Fire'), type: 10, dmg: 0.26, turns: 3, status: 'brn', spots: 2, flash: '#ffd060', what: K('성스러운 불꽃', 'sacred fire'), leave: { ...SACRED_LEAVE, turns: 2 } },
  // the Primal Reversions of 1950 (content_war.js): Primal Groudon's second move, and Primal Kyogre's
  eruption: { kind: 'storm', name: K('분화', 'Eruption'), type: 10, dmg: 0.3, turns: 3, status: 'brn', spots: 10, flash: '#ff9050', what: K('용암', 'lava') },
  thunder: { kind: 'storm', name: K('번개', 'Thunder'), type: 13, dmg: 0.3, turns: 3, status: 'par', spots: 10, flash: '#fff3a0', what: K('벼락', 'thunderbolts'), bolts: true },
};
// a form's first signature move at 60% of its HP; the second form's two or three spread over its bar
export const SIG_AT1 = [0.6], SIG_AT2 = [[0.75, 0.4], [0.8, 0.55, 0.3]];
// A legend whose story fight names no signature move (boss.sig) uses its species' from Lv 30 on (1.38, the user's
// wish; dungeon.js spawnBoss): the move the main games give that Pokemon alone where there is one (Psystrike, Magma
// Storm, Crush Grip), else the great move it is known for. The others have theirs already: as their fight's sig (Dialga,
// Palkia, Giratina, Groudon's Precipice Blades, Genesect's Techno Blast and so on) or as the name of their telegraphed
// blast (Lugia's Aeroblast, Ho-Oh's Sacred Fire, Latias's Mist Ball, Latios's Luster Purge, Jirachi's Doom Desire,
// Deoxys's Psycho Boost, Arceus's Judgment).
// A legend's own battle music where the games have one (1.38), whatever its fight's dungeon names: Pearl's for
// Dialga and Palkia, the lake guardians, Sinnoh's other legends and Arceus; Black's for the legends met standing in
// their place (the Swords of Justice, Victini and the other mythicals) and for the roaming Forces of Nature. Reshiram,
// Zekrom and Kyurem have theirs already (their fights' own bgm), and the older legends have none in these two games.
export const SP_BGM = {
  483: 'dp_ba_dpoke1', 484: 'dp_ba_dpoke1',
  480: 'dp_ba_dpoke2', 481: 'dp_ba_dpoke2', 482: 'dp_ba_dpoke2',
  485: 'dp_ba_secret1', 486: 'dp_ba_secret1', 487: 'dp_ba_secret1', 488: 'dp_ba_secret1', 491: 'dp_ba_secret1', 492: 'dp_ba_secret1', 489: 'dp_ba_secret1', 490: 'dp_ba_secret1',
  493: 'dp_ba_secret2',
  638: 'ba_dpoke1', 639: 'ba_dpoke1', 640: 'ba_dpoke1', 647: 'ba_dpoke1', 494: 'ba_dpoke1', 648: 'ba_dpoke1', 649: 'ba_dpoke1',
  641: 'ba_dpoke2', 642: 'ba_dpoke2', 645: 'ba_dpoke2',
};
const storm = (ko, en, type, flash, whatKo, whatEn, o = {}) => ({ kind: 'storm', name: K(ko, en), type, dmg: 0.3, turns: 3, spots: 10, flash, what: K(whatKo, whatEn), ...o });
const SHEER = storm('절대영도', 'Sheer Cold', 15, '#d8f4ff', '냉기', 'freezing air', { status: 'frz', chance: 0.15 });
const ZAP = { kind: 'pulse', name: K('전자포', 'Zap Cannon'), type: 13, dmg: 0.32 };
const FUTURE = storm('미래예지', 'Future Sight', 14, '#f0b0ff', '염력', 'psychic force');
export const SP_SIG = {
  144: SHEER, // Articuno
  145: SIG.thunder, // Zapdos
  146: storm('열풍', 'Heat Wave', 10, '#ffb060', '뜨거운 바람', 'scorching wind', { status: 'brn' }), // Moltres (1.40: named '열풍' like the move, its English came out as the move's name twice)
  150: { kind: 'pulse', name: K('사이코브레이크', 'Psystrike'), type: 14, dmg: 0.34 }, // Mewtwo
  243: SIG.thunder, // Raikou
  244: storm('불대문자', 'Fire Blast', 10, '#ff9050', '불길', 'fire', { status: 'brn' }), // Entei
  245: storm('하이드로펌프', 'Hydro Pump', 11, '#a0d8ff', '물기둥', 'water spouts'), // Suicune
  377: ZAP, 378: ZAP, 379: ZAP, // Regirock, Regice, Registeel
  480: FUTURE, 481: FUTURE, 482: FUTURE, // Uxie, Mesprit, Azelf
  485: storm('마그마스톰', 'Magma Storm', 10, '#ff7a3a', '마그마', 'magma', { status: 'brn' }), // Heatran
  486: { kind: 'blades', name: K('묵사발', 'Crush Grip'), type: 0, dmg: 0.36, // Regigigas
    tell: (name) => [`${name}의 묵사발! 거대한 손이 땅을 움켜쥐며 금이 간다!`, `${name}'s Crush Grip! A giant hand grips the ground and it cracks!`] },
  488: { kind: 'blades', name: K('사이코커터', 'Psycho Cut'), type: 14, dmg: 0.32, // Cresselia
    tell: (name) => [`${name}의 사이코커터! 염력의 칼날이 바닥을 가르려 한다!`, `${name}'s Psycho Cut! Blades of psychic force are about to cut the floor!`] },
};

// dungeon chunk sets from PMD Blue Rescue Team (assets/pmd/tiles/<id>)
export const T = {
  forest: 41, mountain: 50, library: 3, hill: 63, sea: 0, strait: 49, deepsea: 54, cave: 8,
  snow: 19, fortsnow: 18, quarry: 25, autumn: 28, fort: 37, bastion: 7, flat: 29, plant: 42,
  street: 40, alley: 13, birch: 53, baekdu: 47, rift: 33, warehouse: 17, volcano: 48, plain: 10,
  field: 20, sand: 14, castle: 44, crystal: 16, temple: 46, moss: 51, cliff: 2,
};
