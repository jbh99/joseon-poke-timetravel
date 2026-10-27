// Shared bits for the story files. K(korean, english) keeps the Korean text in the content tree and
// registers its English line; main.js binds both tables so a language switch flips the text in place.
export const EN_EXTRA = {};
export const K = (ko, en) => { EN_EXTRA[ko] = en; return ko; };

export const CELEBI = 251;

// dungeon chunk sets from PMD Blue Rescue Team (assets/pmd/tiles/<id>)
export const T = {
  forest: 41, mountain: 50, library: 3, hill: 63, sea: 0, strait: 49, deepsea: 54, cave: 8,
  snow: 19, fortsnow: 18, quarry: 25, autumn: 28, fort: 37, bastion: 7, flat: 29, plant: 42,
  street: 40, alley: 13, birch: 53, baekdu: 47, rift: 33, warehouse: 17, volcano: 48, plain: 10,
  field: 20, sand: 14, castle: 44, crystal: 16, temple: 46, moss: 51, cliff: 2,
};
