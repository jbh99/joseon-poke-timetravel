// The world line (content_world.js): helpers for its eras, its legends from Pokémon Black and its quest items.
// From 1945 on, a cleared Korean era's Time Gate can lead out into the world (town.js gateTalk): from the Convention
// of Peking to the end of the Second World War, each era hub one of Unova's real towns drawn from Pokémon Black
// (town bw:, tools/bw/render.py) standing in for a place of the time, its map one of the regional world maps
// (era map:, tools/geo/worldmaps.py). The rules are the story's (levels five to seven over the team's best, Hard's
// +25%, a challenge wipe), and nothing eases a newcomer in: every dungeon starts at a high level.
import { K, CELEBI, T, SIG, SIG_AT1, SIG_AT2 } from './content_k.js';

export { K, CELEBI, T };
export const N = (ko, en) => ({ who: 'narr', text: K(ko, en) });
export const PT = (ko, en) => ({ who: 'partner', text: K(ko, en) });
export const C = (ko, en) => ({ who: CELEBI, name: K('세레비', 'Celebi'), text: K(ko, en) });
// a person of the era: id, species, name; their first line greets you in town
export const person = (id, sp, name, line, o = {}) => ({ id, sp, name, x: 8 + (id.length * 5) % 24, y: 12 + (id.length * 3) % 8, say: [{ text: line }], ...o });
// what a person says in a story step
export const says = (p, ...lines) => lines.map((t) => ({ who: p.sp, name: p.name, text: t }));
export const talk = (p, log, ...lines) => ({ do: 'talk', npc: p.id, log, say: says(p, ...lines) });
export const go = (d, log) => ({ do: 'dungeon', d, log });
export const scene = (...say) => ({ do: 'scene', say });

// an ordinary dungeon boss (not a legend): its blast, its lines. Beaten, it asks to join like the Korean line's bosses
export const boss = (sp, lv, moves, tele, say, after, o = {}) => ({ sp, lv, lvMin: lv - 6, lvUp: 4, hp: 2.3, atk: 0.98, cap: 0.33, bgm: 'ba_gym', moves, tele, say, after, ...o });
export const blast = (name, type, pats, o = {}) => ({ name, every: 3, dmg: 0.36, pats, type, ...o });

// one era: the town (a Black town by bw), the map nodes from the dungeons' `at`, the town battle on its own town.
// Places inside one city (a fort by the harbour, a bridge in the old town) sit a little off their true spot, in their
// true direction, so the regional map's icons stay apart (dev/check.js)
export function era(o) {
  const town = { name: o.place, bgm: o.bgm, bgmN: o.bgmN || o.bgm, biome: o.biome || 'modern', landmark: null, bw: o.bw, houses: [], props: [], police: false };
  const e = {
    year: o.year, years: o.years, title: o.title, sub: o.sub, world: o.world, map: o.map, worldLine: true,
    card: { set: o.card[0], mons: o.card[1] }, artProps: [], inn: o.inn ?? 242, shop: o.shop ?? 52,
    town, intro: o.intro,
    nodes: [{ id: 'town', name: o.place, lon: o.at[0], lat: o.at[1] }, ...(o.marks || []).map((m) => ({ mark: true, ...m }))],
    dungeons: o.dungeons, npcs: o.npcs, main: o.main, outro: o.outro, side: o.side || [],
  };
  for (const [id, d] of Object.entries(o.dungeons)) {
    if (d.at) e.nodes.push({ id, name: d.name, lon: d.at[0], lat: d.at[1], d: id, ...(d.when ? { when: d.when } : {}) });
    if (d.battle) d.battle.town = town; // a town battle fights in this era's own town
  }
  return e;
}

// ---------------------------------------------------------------- Pokémon Black's legends
// Signature moves: lightning, fire and ice falling on marked tiles for several turns (dungeon.js 'storm': each
// turn marks the team's own tiles and spots around, the next turn they strike; nobody can stay put)
export const WSIG = {
  // Reshiram's and Zekrom's ultimates (1.19; Kyurem takes all four). Bolt Strike is lightning on the marked tiles, bolts drawn
  // falling. Blue Flare falls the same way and its flames stay on the tiles it struck (leave: turns, a share of max HP a
  // turn). Fusion Flare (rain, dungeon.js updateFire) is no matter of turns: for secs seconds fire falls every `every`
  // seconds on the one in control and the teammates near it, `fall` seconds after its mark shows, so whoever keeps moving
  // gets away. Fusion Bolt (hidden) marks nothing: each turn lightning strikes a share of the floor at random.
  bolt: { kind: 'storm', name: K('뇌격', 'Bolt Strike'), type: 13, dmg: 0.3, turns: 4, status: 'par', spots: 14, flash: '#fff3a0', what: K('번개', 'lightning'), bolts: true },
  flare: { kind: 'storm', name: K('푸른불꽃', 'Blue Flare'), type: 10, dmg: 0.3, turns: 3, status: 'brn', spots: 10, flash: '#8fd8ff', what: K('푸른 불꽃', 'blue fire'), leave: { turns: 5, dmg: 0.08 } },
  fusionBolt: { kind: 'hidden', name: K('크로스썬더', 'Fusion Bolt'), type: 13, dmg: 0.16, turns: 5, share: 0.25, status: 'par', chance: 0.2, what: K('번개', 'lightning') },
  fusionFlare: { kind: 'rain', name: K('크로스플레임', 'Fusion Flare'), type: 10, dmg: 0.06, secs: 5, every: 0.55, fall: 0.7, status: 'brn', chance: 0.1, what: K('불길', 'fire') },
  glaciate: { kind: 'storm', name: K('얼다세계', 'Glaciate'), type: 15, dmg: 0.28, turns: 3, status: 'frz', chance: 0.15, flash: '#d8f4ff', what: K('얼음', 'ice') },
  freezeShock: { kind: 'storm', name: K('프리즈볼트', 'Freeze Shock'), type: 15, dmg: 0.34, turns: 4, status: 'par', spots: 12, flash: '#c8e0ff', what: K('얼음 번개', 'frozen lightning') },
  iceBurn: { kind: 'storm', name: K('콜드플레어', 'Ice Burn'), type: 15, dmg: 0.34, turns: 4, status: 'brn', spots: 12, flash: '#ffe0f0', what: K('얼어붙은 불꽃', 'frozen fire') },
  vcreate: { kind: 'storm', name: K('V제너레이트', 'V-create'), type: 10, dmg: 0.34, turns: 3, status: 'brn', spots: 12, flash: '#ffc060', what: K('승리의 불꽃', 'victory fire') },
  searing: { kind: 'storm', name: K('화염탄', 'Searing Shot'), type: 10, dmg: 0.3, turns: 3, status: 'brn', flash: '#ffa050', what: K('불덩이', 'fireballs') },
  techno: { kind: 'sweep', name: K('테크노버스터', 'Techno Blast'), type: 8, dmg: 0.3 },
  relic: { kind: 'void', name: K('옛노래', 'Relic Song'), type: 14, dmg: 0.14 },
  // the Swords of Justice and Keldeo cut the ground along lines (like Precipice Blades); rock, leaves, water, wind,
  // lightning and the land itself fall as storms
  sacredSword: { kind: 'blades', name: K('성스러운칼', 'Sacred Sword'), type: 1, dmg: 0.34 },
  secretSword: { kind: 'blades', name: K('신비의칼', 'Secret Sword'), type: 1, dmg: 0.34 },
  metalBurst: { kind: 'storm', name: K('메탈버스트', 'Metal Burst'), type: 8, dmg: 0.3, turns: 3, spots: 12, flash: '#e0e8f0', what: K('강철 파편', 'steel shards') },
  stoneEdge: { kind: 'storm', name: K('스톤에지', 'Stone Edge'), type: 5, dmg: 0.3, turns: 3, spots: 12, flash: '#d8c8a0', what: K('바위', 'rocks') },
  leafStorm: { kind: 'storm', name: K('리프스톰', 'Leaf Storm'), type: 12, dmg: 0.3, turns: 3, spots: 12, flash: '#b0f0a0', what: K('나뭇잎', 'leaves') },
  waterSpouts: { kind: 'storm', name: K('하이드로펌프', 'Hydro Pump'), type: 11, dmg: 0.3, turns: 3, spots: 12, flash: '#a0d8ff', what: K('물기둥', 'water spouts') },
  hurricane: { kind: 'storm', name: K('폭풍', 'Hurricane'), type: 2, dmg: 0.3, turns: 4, flash: '#e0f0ff', what: K('돌풍', 'gusts') },
  thunder: { kind: 'storm', name: K('번개', 'Thunder'), type: 13, dmg: 0.3, turns: 4, status: 'par', flash: '#fff3a0', what: K('번개', 'lightning') },
  earthPower: { kind: 'storm', name: K('대지의힘', 'Earth Power'), type: 4, dmg: 0.3, turns: 3, flash: '#e8c070', what: K('땅의 분출', 'eruptions') },
  dragon: SIG.dragon,
  // the quests' legends (content_wboss.js)
  sacredFire: { kind: 'storm', name: K('성스러운불꽃', 'Sacred Fire'), type: 10, dmg: 0.3, turns: 3, status: 'brn', spots: 10, flash: '#ffd060', what: K('성스러운 불꽃', 'sacred fire') },
  surf: { kind: 'storm', name: K('파도타기', 'Surf'), type: 11, dmg: 0.28, turns: 3, spots: 10, flash: '#a0d8ff', what: K('파도', 'waves') },
  aeroblast: { kind: 'sweep', name: K('에어로블라스트', 'Aeroblast'), type: 2, dmg: 0.28 },
  emotion: { kind: 'pulse', name: K('마음의 파동', 'Wave of Emotion'), type: 14, dmg: 0.3 },
  will: { kind: 'pulse', name: K('의지의 파동', 'Wave of Will'), type: 14, dmg: 0.3 },
  eruption: { kind: 'storm', name: K('분화', 'Eruption'), type: 10, dmg: 0.3, turns: 3, status: 'brn', spots: 10, flash: '#ff9050', what: K('용암', 'lava') },
  doom: { kind: 'storm', name: K('파멸의소원', 'Doom Desire'), type: 8, dmg: 0.3, turns: 3, spots: 10, flash: '#fff0b0', what: K('별빛', 'starlight') },
  memory: { kind: 'storm', name: K('기억의 파편', 'Shards of Memory'), type: 14, dmg: 0.28, turns: 3, spots: 10, flash: '#e0c8ff', what: K('기억의 파편', 'shards of memory') },
  northWind: { kind: 'storm', name: K('북풍', 'North Wind'), type: 15, dmg: 0.28, turns: 3, spots: 10, flash: '#d8f4ff', what: K('북풍', 'the north wind') },
  seedFlare: { kind: 'storm', name: K('시드플레어', 'Seed Flare'), type: 12, dmg: 0.3, turns: 3, spots: 10, flash: '#c8f0a0', what: K('꽃씨', 'seeds') },
  mirror: { kind: 'pulse', name: K('거울의 빛', 'Mirror Light'), type: 14, dmg: 0.3 },
  moonlight: { kind: 'storm', name: K('달빛', 'Moonlight'), type: 14, dmg: 0.28, turns: 3, spots: 10, flash: '#f0e8ff', what: K('달빛', 'moonlight') },
  luster: { kind: 'pulse', name: K('라스트버지', 'Luster Purge'), type: 14, dmg: 0.3 },
  mist: { kind: 'pulse', name: K('미스트볼', 'Mist Ball'), type: 14, dmg: 0.3 },
  blizzard: { kind: 'storm', name: K('눈보라', 'Blizzard'), type: 15, dmg: 0.28, turns: 3, status: 'frz', chance: 0.15, spots: 10, flash: '#d8f4ff', what: K('눈보라', 'the blizzard') },
  heatWave: { kind: 'storm', name: K('열풍', 'Heat Wave'), type: 10, dmg: 0.3, turns: 3, status: 'brn', spots: 10, flash: '#ffb070', what: K('불바람', 'a wind of fire') },
  skyBeam: { kind: 'sweep', name: K('화룡점정', 'Dragon Ascent'), type: 2, dmg: 0.3 },
  iceStorm: { kind: 'storm', name: K('얼음 폭풍', 'Ice Storm'), type: 15, dmg: 0.28, turns: 3, status: 'frz', chance: 0.15, spots: 10, flash: '#d8f4ff', what: K('얼음 폭풍', 'an ice storm') },
  magma: { kind: 'storm', name: K('마그마스톰', 'Magma Storm'), type: 10, dmg: 0.3, turns: 3, status: 'brn', spots: 10, flash: '#ff8040', what: K('용암', 'lava') },
  psystrike: { kind: 'pulse', name: K('사이코브레이크', 'Psystrike'), type: 14, dmg: 0.32 },
  auraSphere: { kind: 'pulse', name: K('파동탄', 'Aura Sphere'), type: 1, dmg: 0.3 }, // Mew in the Argonne Forest (1.20)
};

// a legend's second form: harder hits, a fiercer blast in two steps, its signature moves more often
function rise(o) {
  const { aura, msg, form, rename, name, type, pats, use, shiny } = o;
  return { hp: o.hp ?? 0.72, atk: o.atk ?? 1.3, cap: o.cap ?? 0.4, aura, msg, form, rename, shiny, bgm: o.bgm, line: o.line, sig: use && { use, at: SIG_AT2 },
    tele: [
      { name, every: 3, dmg: 0.42, stagger: 1, pats, type, first: 2 },
      { at: 0.5, name, every: 2, dmg: 0.48, stagger: 1, pats: [...pats, 'quad|target', 'random|cross'], type, summon: o.summon ?? 0,
        msg: K('힘이 폭주한다! 공격이 더욱 거세진다!', 'Its power runs wild! The attacks grow fiercer still!') },
    ] };
}
// The Forces of Nature's second phase (1.20): the Therian Forme, every stat and its HP 20% over the Incarnate Forme it
// rose from (THERIAN on top of the first form's numbers: rise's longer, harder hits stay, its HP share and attack step
// give way). Pokémon Black has no picture of it, so the same body takes the Forme's name and aura.
export const THERIAN = 1.2;
const therian = (o) => ({ ...rise({ ...o, hp: 1, atk: 1 }), buff: THERIAN });
// a legend of the world line: two forms; lairs keep it on their third floor (floors 3), a town battle in town
export const legend = (o) => ({ lvMin: o.lv - 8, lvUp: 4, hp: 3.2, atk: 1.02, cap: 0.34, buff: 1.1, retry: true, noWander: true, ...o });

// Reshiram and Zekrom (1.19): the numbers of Palkia on Mt. Coronet, the stronger of the finale's two guardians
// (content_modern.js guardian: its HP and attack x1.3, half as quick again, at the team's level up to Lv 180, every stat
// +20%), and on top of those TOP (+10%) on HP, every stat, the caps on its hits and its blasts. Three phases: in the first
// only their ordinary moves and an ordinary blast; in the second those and their two ultimates (at HP marks); in the last
// nothing but the ultimates, one after the other. Joining, they bring the ultimates along (joinMoves).
const TOP = 1.1;
const GREAT = { lv: 180, lvMin: 70, lvUp: 2, lvCap: 180, hp: 2.86 * 1.3, atk: 0.98 * 1.3, cap: 0.38 * TOP, buff: 1.2 * TOP, sigUp: TOP, pace: 1.5, retry: true, noWander: true };
const FIERCER = K('힘이 폭주한다! 공격이 더욱 거세진다!', 'Its power runs wild! The attacks grow fiercer still!');
const firstBlast = (name, type, pats) => [{ name, every: 4, dmg: 0.36 * TOP, stagger: 1, pats, type }];
const phase2 = (o) => ({ hp: 2 / 3, atk: 1.3, cap: 0.42 * TOP, aura: o.aura, form: o.form, msg: o.msg, line: o.line, sig: { use: o.ults, at: [0.85, 0.6, 0.35] },
  tele: [
    { name: o.name, every: 3, dmg: 0.42 * TOP, stagger: 1, pats: o.pats, type: o.type, first: 2 },
    { at: 0.5, name: o.name, every: 2, dmg: 0.5 * TOP, stagger: 1, pats: [...o.pats, 'quad|target', 'random|cross'], type: o.type, msg: FIERCER },
  ] });
const phase3 = (o) => ({ hp: 0.75, atk: 1.1, def: 1.2, cap: 0.44 * TOP, aura: o.aura, form: o.form, msg: o.msg, line: o.line, ult: { use: o.ults } });

export const RESHIRAM = { sp: 643, ...GREAT, bgm: 'vs_reshiram', moves: [406, 53, 225, 126], joinMoves: [551, 558, 406, 53],
  tele: firstBlast(K('용의파동', 'Dragon Pulse'), 16, ['ring', 'cross', 'x', 'near', 'rows']),
  revive: [
    phase2({ aura: '#8fd8ff', form: K('진실의 불꽃', 'Flame of Truth'), name: K('화염방사', 'Flamethrower'), type: 10, pats: ['far', 'checker', 'star', 'ring|x'], ults: [WSIG.fusionFlare, WSIG.flare],
      msg: K('레시라무의 꼬리가 하얗게 타오른다! 2페이즈, 크로스플레임과 푸른불꽃이 시작된다!', "Reshiram's tail blazes white! Phase two: Fusion Flare and Blue Flare begin!"),
      line: [{ who: 643, name: K('레시라무', 'Reshiram'), text: K('…거짓은 모두 태워 주마. 하늘에서 쏟아지는 불길을 피할 수 있겠느냐!', '...I will burn away every lie. Can you dodge the fire pouring from the sky?') }] }),
    phase3({ aura: '#e8f6ff', form: K('백색 불꽃', 'White Flame'), ults: [WSIG.fusionFlare, WSIG.flare],
      msg: K('레시라무가 다시 일어선다! 3페이즈, 이제 궁극기만 쏟아진다!', 'Reshiram rises again! Phase three: nothing but its ultimates now!'),
      line: [{ who: 643, name: K('레시라무', 'Reshiram'), text: K('…이 불꽃이 다할 때까지 진실을 묻겠다!', '...I will ask for the truth until this flame burns out!') }] }),
  ],
  say: [
    N('불타는 런던의 밤하늘에서, 하얀 용이 내려왔다. 폭격의 불길이 그 꼬리의 불꽃과 하나가 되어 거리를 삼킨다.', 'Out of the burning night sky over London, a white dragon came down. The fire of the bombing joins the flame of its tail and swallows the streets.'),
    { who: 643, name: K('레시라무', 'Reshiram'), text: K('…진실은 어디에 있는가. 불길 속에서 서로를 미워하는 너희에게, 지킬 진실이 남아 있는가!', '...Where is the truth? You who hate each other in the flames: is there any truth left for you to protect?') },
    PT('세 번 일어설 거야! 크로스플레임이 오면 위에서 불이 5초 동안 우리를 쫓아와. 멈추지 말고 움직여! 푸른불꽃이 떨어진 자리에는 불꽃이 남으니까 밟지 말고!', 'It will rise three times! When Fusion Flare comes, fire chases us from above for five seconds, so keep moving! And Blue Flare leaves flames where it falls: don\'t step on them!')],
  after: [{ who: 643, name: K('레시라무', 'Reshiram'), text: K('…무너진 집에서 서로를 꺼내 주던 사람들이 보였다. 그것이 너희의 진실이었구나.', '...I saw people pulling one another out of fallen houses. That was your truth.') }],
  join: K('레시라무가 하얀 날개를 접었다. 진실을 끝까지 지켜보고 싶어 한다!', 'Reshiram folds its white wings. It wants to see the truth through to the end!') };

export const ZEKROM = { sp: 644, ...GREAT, bgm: 'vs_zekrom', moves: [337, 85, 406, 87], joinMoves: [550, 559, 337, 85],
  tele: firstBlast(K('용의파동', 'Dragon Pulse'), 16, ['cross', 'rows', 'x', 'cols', 'near']),
  revive: [
    phase2({ aura: '#ffe24a', form: K('이상의 번개', 'Thunder of Ideals'), name: K('10만볼트', 'Thunderbolt'), type: 13, pats: ['checker', 'far', 'quad', 'star|near'], ults: [WSIG.bolt, WSIG.fusionBolt],
      msg: K('제크로무의 꼬리가 발전기처럼 돌아간다! 2페이즈, 뇌격과 크로스썬더가 시작된다!', "Zekrom's tail spins like a generator! Phase two: Bolt Strike and Fusion Bolt begin!"),
      line: [{ who: 644, name: K('제크로무', 'Zekrom'), text: K('…이 폭풍에 맞설 각오가 있느냐. 어디에 떨어질지 모르는 번개까지 견뎌 보아라!', '...Have you the resolve to face this storm? Then endure even the lightning no one can foresee!') }] }),
    phase3({ aura: '#3a3a5a', form: K('칠흑의 번개', 'Pitch-Black Thunder'), ults: [WSIG.bolt, WSIG.fusionBolt],
      msg: K('제크로무가 다시 일어선다! 3페이즈, 이제 궁극기만 쏟아진다!', 'Zekrom rises again! Phase three: nothing but its ultimates now!'),
      line: [{ who: 644, name: K('제크로무', 'Zekrom'), text: K('…이상이 꺾이지 않는다면, 이 번개도 끝까지 받아 내라!', '...If your ideal will not bend, then take this lightning to the very end!') }] }),
  ],
  say: [
    N('해협 위에 검은 폭풍이 멈춰 서 있다. 구름 한가운데서 검은 용이 번개를 두르고 깨어났다.', 'A black storm stands still over the strait. In the heart of the clouds, a black dragon wakes wrapped in lightning.'),
    { who: 644, name: K('제크로무', 'Zekrom'), text: K('…이상을 품은 자여. 이 폭풍을 넘어 바다를 건너려 하는가. 그 각오를 보여라!', '...You who hold an ideal. Would you cross the sea through this storm? Show me your resolve!') },
    PT('세 번 일어설 거야! 뇌격은 붉은 칸에 떨어지니까 피할 수 있어. 하지만 크로스썬더는 표시도 없이 아무 데나 떨어져! HP를 넉넉히 채워 두자!', 'It will rise three times! Bolt Strike falls on the red tiles, so it can be dodged. But Fusion Bolt strikes anywhere with no mark at all! Keep your HP topped up!')],
  after: [{ who: 644, name: K('제크로무', 'Zekrom'), text: K('…폭풍이 걷힌다. 내일 아침, 바다는 너희를 건너게 해 줄 것이다.', '...The storm is lifting. Tomorrow morning, the sea will let you cross.') }],
  join: K('제크로무가 번개를 거두었다. 너희의 이상을 함께 보고 싶어 한다!', 'Zekrom draws its lightning in. It wants to see your ideal with you!') };

export const VICTINI = legend({ sp: 494, lv: 70, hp: 2.9, bgm: 'vs_strong', moves: [557, 545, 94, 7],
  tele: blast(K('화염탄', 'Searing Shot'), 10, ['ring', 'near', 'x', 'target']),
  sig: { use: [WSIG.searing], at: SIG_AT1 },
  revive: rise({ aura: '#ff9a3a', form: K('승리의 V', 'Victory V'), name: K('V제너레이트', 'V-create'), type: 10, pats: ['x', 'star', 'checker', 'far|ring'], use: [WSIG.vcreate, WSIG.searing],
    msg: K('비크티니의 귀가 V자로 타오른다! 승리의 불꽃이 사막을 덮는다!', "Victini's ears blaze in a V! Victory fire covers the desert!") }),
  say: [
    N('모래바람 너머, 작은 포켓몬이 불꽃을 튀기며 웃고 있다. 이긴 쪽에 승리를 가져다준다는 비크티니다.', 'Beyond the sandstorm, a small Pokémon laughs as it throws off sparks. It is Victini, said to bring victory to whoever it sides with.'),
    { who: 494, name: K('비크티니', 'Victini'), text: K('티니! (승리는 쉽게 주지 않겠다는 듯 두 손을 V자로 들어 올렸다!)', "Tini! (It raises both hands in a V, as if victory won't come easy!)") },
    PT('작아도 엄청 강해! 불덩이가 몇 턴 동안 쏟아질 거야!', "Small but incredibly strong! Fireballs will rain down for several turns!")],
  after: [{ who: 494, name: K('비크티니', 'Victini'), text: K('티니…! (승리는 끝이 아니라 시작이라는 듯, 동쪽 하늘을 가리킨다.)', 'Tini...! (It points at the eastern sky, as if a victory is a beginning, not an end.)') }],
  join: K('비크티니가 어깨 위로 뛰어올랐다. 함께 가고 싶어 한다!', 'Victini hops onto your shoulder. It wants to come along!') });

export const GENESECT = legend({ sp: 649, lv: 74, hp: 3.0, atk: 1.06, bgm: 'vs_strong', moves: [546, 400, 430, 85],
  tele: blast(K('러스터캐논', 'Flash Cannon'), 8, ['rows', 'cols', 'cross', 'far']),
  sig: { use: [WSIG.techno], at: SIG_AT1 },
  revive: rise({ aura: '#c060ff', form: K('하이퍼 드라이브', 'Hyper Drive'), name: K('테크노버스터', 'Techno Blast'), type: 13, pats: ['rows|cols', 'quad', 'checker', 'far|cross'], use: [WSIG.techno, WSIG.bolt],
    msg: K('게노세크트의 등 대포가 번개 카세트를 삼켰다! 포신이 하얗게 달아오른다!', "Genesect's back cannon swallows the Shock Drive! The barrel glows white-hot!") }),
  say: [
    N('불타는 전차들 사이로, 등에 대포를 단 보라색 포켓몬이 걸어 나왔다. 3억 년 전의 몸이 전쟁의 쇳덩이로 다시 만들어졌다.', 'Out from between burning tanks walks a purple Pokémon with a cannon on its back. A body three hundred million years old, remade into a lump of war iron.'),
    { who: 649, name: K('게노세크트', 'Genesect'), text: K('…목표 확인. 모든 움직이는 것을 파괴한다.', '...Targets confirmed. Destroy everything that moves.') },
    PT('저 대포는 빛줄기로 한 바퀴를 돌아! 줄기가 지나가는 칸을 피하자!', 'That cannon turns its beam a full circle! Keep off the tiles it sweeps!')],
  after: [{ who: 649, name: K('게노세크트', 'Genesect'), text: K('…명령이 사라졌다. 이 몸은… 원래 무엇이었나.', '...The orders are gone. What... was this body, at first?') }],
  join: K('게노세크트가 대포를 내렸다. 자기 길을 찾을 때까지 함께 가고 싶어 한다!', 'Genesect lowers its cannon. It wants to come along until it finds its own way!') });

export const MELOETTA = legend({ sp: 648, lv: 72, hp: 2.9, bgm: 'vs_strong', moves: [547, 94, 304, 215],
  tele: blast(K('하이퍼보이스', 'Hyper Voice'), 0, ['ring', 'near', 'far', 'x']),
  sig: { use: [WSIG.relic], at: SIG_AT1 },
  revive: rise({ aura: '#7affc8', form: K('스텝폼', 'Pirouette Forme'), name: K('옛노래', 'Relic Song'), type: 1, pats: ['star', 'ring|cross', 'checker', 'far'], use: [WSIG.relic, WSIG.relic],
    msg: K('메로엣타가 옛노래를 부르며 춤추듯 모습을 바꿨다! 스텝폼이다!', 'Singing the Relic Song, Meloetta changes its form as if dancing! The Pirouette Forme!') }),
  say: [
    N('포위된 도시의 얼어붙은 공연장. 아무도 없는 무대에서 맑은 노랫소리가 들려온다.', 'A frozen concert hall in the besieged city. A clear voice sings on the empty stage.'),
    { who: 648, name: K('메로엣타', 'Meloetta'), text: K('♪…굶주림과 포성 속에서도 노래할 수 있을까요? 들려주세요, 당신들의 노래를!', '♪...Can you still sing in hunger and gunfire? Let me hear your song!') },
    PT('노랫소리에 걸리면 잠들어 버려! 발밑의 붉은 칸을 피하자!', "Get caught by the song and you'll fall asleep! Keep off the red tiles!")],
  after: [{ who: 648, name: K('메로엣타', 'Meloetta'), text: K('♪…들렸어요. 포위된 도시가 끝까지 부른 교향곡이.', '♪...I heard it. The symphony the besieged city sang to the end.') }],
  join: K('메로엣타가 마지막 음을 길게 끌며 다가왔다. 함께 노래하고 싶어 한다!', 'Meloetta holds its last note long as it comes over. It wants to sing with you!') });

// The Swords of Justice (who, the legend goes, fought people to protect Pokémon caught in their wars), Keldeo who learns
// from them, and the Forces of Nature: up to 1.19 each kept an optional lair; since 1.20 each is the boss of a quest of
// the era that held its lair, in this full two-form design, and of one more quest in another era (content_wboss.js).
// Pokémon Black has no picture of Keldeo's Resolute Form or the Therian Formes (Black 2 and White 2 brought them), so
// the second form rises in the same body with its aura and its name.
export const COBALION = legend({ sp: 638, lv: 69, hp: 3.0, bgm: 'vs_strong', moves: [533, 442, 370, 232],
  tele: blast(K('아이언헤드', 'Iron Head'), 8, ['cross', 'rows', 'near', 'x']),
  sig: { use: [WSIG.sacredSword], at: SIG_AT1 },
  revive: rise({ aura: '#bfe8ff', form: K('강철의 의지', 'Will of Steel'), name: K('메탈버스트', 'Metal Burst'), type: 8, pats: ['rows|cols', 'checker', 'far', 'star'], use: [WSIG.sacredSword, WSIG.metalBurst],
    msg: K('코바르온의 뿔이 칼처럼 빛난다! 강철 파편이 요새 위로 쏟아진다!', "Cobalion's horn shines like a blade! Steel shards rain down on the fort!") }),
  say: [
    N('포탄 구덩이 사이로 강철빛 사슴이 걸어 나왔다. 사람의 전쟁에서 포켓몬을 지켜 왔다는 코바르온이다.', 'Out from between the shell craters walks a steel-coloured stag. It is Cobalion, said to have protected Pokémon from the wars of people.'),
    { who: 638, name: K('코바르온', 'Cobalion'), text: K('…인간들이여, 이 땅에서 몇 번이나 서로를 쓰러뜨릴 셈인가. 포켓몬을 지키는 칼로 너희를 시험하겠다!', '...People, how many more times will you strike one another down on this ground? I will test you with the sword that protects Pokémon!') },
    PT('성스러운칼이 네 방향으로 땅을 가르며 뻗어 나가! 갈라진 줄을 피하자!', 'Its Sacred Sword splits the ground in four directions! Stay off the lines it cuts!')],
  after: [{ who: 638, name: K('코바르온', 'Cobalion'), text: K('…너희는 쓰러진 자를 끝까지 업고 나왔다. 그 마음이라면 믿어 보겠다.', '...You carried the fallen out to the very end. With a heart like that, I will trust you.') }],
  join: K('코바르온이 뿔을 낮추었다. 너희 곁에서 끝까지 지켜보겠다고 한다!', 'Cobalion lowers its horn. It will watch over you to the end!') });

export const TERRAKION = legend({ sp: 639, lv: 64, hp: 3.0, bgm: 'vs_strong', moves: [533, 444, 370, 157],
  tele: blast(K('스톤샤워', 'Rock Slide'), 5, ['near', 'ring', 'x', 'cross']),
  sig: { use: [WSIG.stoneEdge], at: SIG_AT1 },
  revive: rise({ aura: '#e8c890', form: K('바위의 의지', 'Will of Stone'), name: K('스톤에지', 'Stone Edge'), type: 5, pats: ['quad', 'far', 'checker', 'ring|x'], use: [WSIG.stoneEdge, WSIG.sacredSword],
    msg: K('테라키온이 성벽을 들이받았다! 무너진 바위가 사방으로 쏟아진다!', 'Terrakion rams the fortress wall! Fallen rock pours down everywhere!') }),
  say: [
    N('포탄에 깎인 203고지의 암벽이 무너지고, 바위 같은 몸의 포켓몬이 돌진해 나왔다. 성벽을 부수고 갇힌 포켓몬을 구했다는 테라키온이다.', 'The rock face of 203 Meter Hill, gouged by shells, gives way and a Pokémon with a body like a boulder charges out. It is Terrakion, said to have broken a castle wall to free the Pokémon trapped inside.'),
    { who: 639, name: K('테라키온', 'Terrakion'), text: K('…이 요새의 돌마다 갇힌 포켓몬들의 울음이 들린다. 길을 막는다면 바위째 부수고 지나가겠다!', '...From every stone of this fortress I hear the cries of trapped Pokémon. If you stand in the way, I will smash through you, rock and all!') },
    PT('바위가 몇 턴 동안 붉은 칸에 쏟아져! 성스러운칼은 갈라지는 줄을 따라 와!', 'Rocks will fall on the red tiles for several turns! And the Sacred Sword comes along the cracks!')],
  after: [{ who: 639, name: K('테라키온', 'Terrakion'), text: K('…너희는 무너진 돌 밑의 작은 생명부터 꺼냈다. 그것으로 충분하다.', '...You pulled the small lives out from under the fallen stones first. That is enough.') }],
  join: K('테라키온이 바위 같은 어깨를 들이밀었다. 함께 가고 싶어 한다!', 'Terrakion pushes in with its boulder shoulders. It wants to come along!') });

export const VIRIZION = legend({ sp: 640, lv: 71, hp: 2.9, bgm: 'vs_strong', moves: [533, 348, 370, 202],
  tele: blast(K('리프블레이드', 'Leaf Blade'), 12, ['x', 'far', 'cross', 'near']),
  sig: { use: [WSIG.sacredSword], at: SIG_AT1 },
  revive: rise({ aura: '#9cff9c', form: K('풀의 의지', 'Will of Leaves'), name: K('리프스톰', 'Leaf Storm'), type: 12, pats: ['star', 'checker', 'ring|cross', 'far'], use: [WSIG.leafStorm, WSIG.sacredSword],
    msg: K('비리디온의 뿔에서 잎사귀가 휘몰아친다! 숲 전체가 칼날이 된다!', "Leaves whirl from Virizion's horns! The whole forest becomes a blade!") }),
  say: [
    N('포탄에 꺾인 나무들 사이에서, 풀빛 사슴이 바람처럼 나타났다. 숲을 지키는 비리디온이다.', 'Among trees broken by the shelling, a grass-green stag appears like the wind. It is Virizion, the guardian of forests.'),
    { who: 640, name: K('비리디온', 'Virizion'), text: K('…불탄 숲에도 새싹은 돋는다. 하지만 너희가 또 불을 지른다면, 이 칼로 막겠다!', '...Even a burned forest puts out new shoots. But if you set it on fire again, this sword will stop you!') },
    PT('나뭇잎 폭풍이 몇 턴이나 이어져! 발밑을 보면서 피하자!', 'The storm of leaves lasts for turns! Watch your feet and dodge!')],
  after: [{ who: 640, name: K('비리디온', 'Virizion'), text: K('…너희는 숲을 다치게 하지 않고 싸웠구나. 이 숲도 언젠가 다시 푸르러질 것이다.', '...You fought without hurting the forest. One day this forest will be green again.') }],
  join: K('비리디온이 풀잎 같은 뿔을 흔들었다. 함께 가고 싶어 한다!', 'Virizion shakes its leaf-like horns. It wants to come along!') });

export const KELDEO = legend({ sp: 647, lv: 72, hp: 2.9, bgm: 'vs_strong', moves: [548, 56, 453, 370],
  tele: blast(K('하이드로펌프', 'Hydro Pump'), 11, ['rows', 'cross', 'near', 'cols']),
  sig: { use: [WSIG.secretSword], at: SIG_AT1 },
  revive: rise({ aura: '#7fd4ff', form: K('각오의 모습', 'Resolute Form'), name: K('신비의칼', 'Secret Sword'), type: 1, pats: ['x', 'rows|cols', 'quad', 'far'], use: [WSIG.secretSword, WSIG.waterSpouts],
    msg: K('케르디오의 뿔이 각오로 빛난다! 물기둥이 해협 위로 솟는다!', "Keldeo's horn shines with resolve! Water spouts rise over the Channel!") }),
  say: [
    N('해협의 물결 위를 달리는 작은 망아지 같은 포켓몬. 세 영웅에게 배우며 자란다는 케르디오다.', 'A Pokémon like a small colt runs over the waves of the Channel. It is Keldeo, who grows up learning from the three heroes.'),
    { who: 647, name: K('케르디오', 'Keldeo'), text: K('…나도 지키고 싶어! 바다를 건너 집으로 돌아가려는 사람들을! 내 각오를 보여 줄게!', '...I want to protect them too! The people trying to cross the sea and get home! I will show you my resolve!') },
    PT('신비의 칼이 줄을 따라 와! 물기둥도 몇 턴 동안 떨어질 거야!', 'The Secret Sword comes along lines! Water spouts will fall for several turns too!')],
  after: [{ who: 647, name: K('케르디오', 'Keldeo'), text: K('…졌어. 그래도 이제 알겠어. 지킨다는 건 끝까지 포기하지 않는 거야.', '...I lost. But now I know. Protecting means never giving up, right to the end.') }],
  join: K('케르디오가 각오를 다진 얼굴로 다가왔다. 함께 가고 싶어 한다!', 'Keldeo comes over with a resolute face. It wants to come along!') });

export const TORNADUS = legend({ sp: 641, lv: 70, hp: 2.9, bgm: 'vs_strong', moves: [542, 403, 242, 369],
  tele: blast(K('에어슬래시', 'Air Slash'), 2, ['ring', 'far', 'x', 'near']),
  sig: { use: [WSIG.hurricane], at: SIG_AT1 },
  revive: therian({ aura: '#cfe9ff', form: K('영물폼', 'Therian Forme'), name: K('폭풍', 'Hurricane'), type: 2, pats: ['far', 'star', 'checker', 'quad|ring'], use: [WSIG.hurricane, WSIG.hurricane],
    msg: K('토네로스가 영물의 모습으로 변했다! 모든 능력이 오르고, 돌풍이 바다를 뒤집는다!', 'Tornadus takes its Therian Forme! Every stat rises, and gusts turn the sea upside down!') }),
  say: [
    N('짙은 안개가 돌풍에 찢겨 나간다. 북해 위에서 구름을 탄 포켓몬이 웃고 있다. 바람을 일으켜 바다를 뒤집는 토네로스다.', 'Gusts tear the thick fog apart. Above the North Sea, a Pokémon riding a cloud is laughing. It is Tornadus, who raises winds that turn the sea over.'),
    { who: 641, name: K('토네로스', 'Tornadus'), text: K('…쇠로 된 배들이 서로를 쏘아 대는구나. 이 바다를 통째로 뒤집어 주마!', '...Ships of iron firing at each other. I will turn this whole sea upside down!') },
    PT('돌풍이 몇 턴 동안 붉은 칸을 휩쓸어! 계속 움직이자!', 'Gusts will sweep the red tiles for several turns! Keep moving!')],
  after: [{ who: 641, name: K('토네로스', 'Tornadus'), text: K('…바다 밑에 가라앉은 자들을 위해, 바람을 거두마.', '...For those who sank beneath the sea, I will calm the wind.') }],
  join: K('토네로스가 구름에서 내려왔다. 함께 바람을 타고 가고 싶어 한다!', 'Tornadus comes down from its cloud. It wants to ride the wind with you!') });

export const THUNDURUS = legend({ sp: 642, lv: 81, hp: 2.9, bgm: 'vs_strong', moves: [87, 435, 399, 359],
  tele: blast(K('방전', 'Discharge'), 13, ['near', 'ring', 'cross', 'x']),
  sig: { use: [WSIG.thunder], at: SIG_AT1 },
  revive: therian({ aura: '#fff07a', form: K('영물폼', 'Therian Forme'), name: K('번개', 'Thunder'), type: 13, pats: ['checker', 'far', 'quad', 'star|near'], use: [WSIG.thunder, WSIG.thunder],
    msg: K('볼트로스가 영물의 모습으로 변했다! 모든 능력이 오르고, 하늘 전체가 번개로 갈라진다!', 'Thundurus takes its Therian Forme! Every stat rises, and the whole sky splits with lightning!') }),
  say: [
    N('수리가오 해협의 밤하늘이 검게 물들고, 꼬리로 번개를 내리치는 포켓몬이 나타났다. 볼트로스다.', 'The night sky over the Surigao Strait turns black, and a Pokémon that strikes lightning with its tail appears. It is Thundurus.'),
    { who: 642, name: K('볼트로스', 'Thundurus'), text: K('…포성보다 큰 번개를 들려주마! 이 하늘에서 살아남을 수 있겠느냐!', '...I will let you hear thunder louder than any gun! Can you survive this sky?') },
    PT('번개가 몇 턴 동안 붉은 칸에 떨어져! 맞으면 마비될 수도 있어!', 'Lightning will fall on the red tiles for several turns! It can paralyse whoever it hits!')],
  after: [{ who: 642, name: K('볼트로스', 'Thundurus'), text: K('…요란한 건 우레만이 아니었군. 너희의 마음도 꽤 시끄럽다.', '...So thunder is not the only loud thing. Your hearts are quite noisy too.') }],
  join: K('볼트로스가 번개를 거두었다. 함께 가고 싶어 한다!', 'Thundurus draws its lightning in. It wants to come along!') });

export const LANDORUS = legend({ sp: 645, lv: 77, hp: 3.0, bgm: 'vs_strong', moves: [414, 89, 157, 326],
  tele: blast(K('지진', 'Earthquake'), 4, ['ring', 'near', 'cross', 'far']),
  sig: { use: [WSIG.earthPower], at: SIG_AT1 },
  revive: therian({ aura: '#ffc870', form: K('영물폼', 'Therian Forme'), name: K('대지의힘', 'Earth Power'), type: 4, pats: ['quad', 'checker', 'far|ring', 'star'], use: [WSIG.earthPower, WSIG.stoneEdge],
    msg: K('랜드로스가 영물의 모습으로 변했다! 모든 능력이 오르고, 진흙길이 사방에서 터져 오른다!', 'Landorus takes its Therian Forme! Every stat rises, and the mud road bursts open everywhere!') }),
  say: [
    N('끝없는 진흙길 위에 구름을 탄 포켓몬이 내려앉았다. 밭을 풍요롭게 한다는 땅의 수호자 랜드로스다.', 'A Pokémon riding a cloud settles on the endless mud road. It is Landorus, the guardian of the land who makes the fields rich.'),
    { who: 645, name: K('랜드로스', 'Landorus'), text: K('…이 땅은 몇 번이나 군대에게 짓밟혔다. 1812년에도, 지금도. 땅의 분노를 받아 보아라!', '...This land has been trampled by armies again and again. In 1812, and now. Feel the anger of the land!') },
    PT('땅이 몇 턴 동안 붉은 칸에서 솟구쳐! 계속 살피자!', 'The ground will burst up on the red tiles for several turns! Keep watching!')],
  after: [{ who: 645, name: K('랜드로스', 'Landorus'), text: K('…봄이 오면 이 땅에 다시 밀이 자랄 것이다. 짓밟힌 땅도 다시 일어선다.', '...When spring comes, wheat will grow on this land again. Trampled land rises again too.') }],
  join: K('랜드로스가 땅에 손을 얹었다. 함께 가고 싶어 한다!', 'Landorus lays a hand on the ground. It wants to come along!') });

// The world line's final battle, the last quest of the Second World War: Kyurem, then Black Kyurem, then White Kyurem.
// Pokémon Black has no picture of the fused formes (Black 2 and White 2 brought them), so they rise in Kyurem's own
// body with their aura (Black: dark with lightning; White: its pale shiny colours with white fire) and their names.
// A final boss sets its own numbers (dungeon.js bossTier). Since 1.19 they stand a step above Reshiram's and Zekrom's: the
// same HP and attack as GREAT's on a legend's tier, every stat (HP with it) +44% where theirs have +32%, the same blasts
// from the same ultimates. Its first form fights with its own Blizzard and Glaciate. Black Kyurem takes Reshiram's and
// Zekrom's ultimates by turns beside its Freeze Shock; White Kyurem does nothing but those ultimates, two at once.
const LEGEND_HP = 3.2, LEGEND_ATK = 1.2, LEGEND_BLAST = 1.25; // dungeon.js LEGEND_TIER, which a final boss's tier leaves out
const UP = 1.2;
export const KYUREM = { sp: 646, lv: 180, lvMin: 72, lvUp: 2, lvCap: 180, hp: GREAT.hp * LEGEND_HP, atk: GREAT.atk * LEGEND_ATK, cap: GREAT.cap, buff: 1.2 * UP, sigUp: LEGEND_BLAST * TOP, final: true, retry: true, noWander: true,
  bgm: 'vs_kyurem', moves: [549, 304, 59, 337], joinMoves: [549, 553, 554, 337], // joining, it keeps Freeze Shock and Ice Burn
  tele: [
    { name: K('눈보라', 'Blizzard'), every: 2, dmg: 0.5, stagger: 1, pats: ['cross', 'x', 'target', 'near', 'ring'], type: 15, first: 2 },
    { at: 0.66, name: K('눈보라', 'Blizzard'), every: 2, dmg: 0.56, stagger: 1, pats: ['star', 'rows', 'cols', 'checker', 'ring', 'quad'], type: 15, summon: 2, summonSp: [614, 615],
      msg: K('큐레무의 몸에서 얼음 기둥이 솟는다! 얼음 포켓몬들이 몰려온다!', 'Pillars of ice burst from Kyurem! Ice Pokémon swarm in!') },
    { at: 0.33, name: K('얼다세계', 'Glaciate'), every: 1, dmg: 0.6, stagger: 1, pats: ['quad', 'random', 'checker|cross', 'ring|x', 'far'], type: 15,
      msg: K('도시가 통째로 얼어붙는다! 공격이 한층 거세진다!', 'The whole city freezes over! The attacks grow fiercer!') },
  ],
  sig: { use: [WSIG.glaciate], at: SIG_AT2[0] },
  revive: [
    { hp: 2 / 3, atk: 1.35, cap: 0.42 * TOP, aura: '#3a46ff', rename: K('블랙큐레무', 'Black Kyurem'), bgm: 'ba_secret2',
      msg: K('큐레무가 검은 번개를 끌어안았다! 2페이즈, 이상의 힘을 삼킨 블랙큐레무다!', 'Kyurem embraces black lightning! Phase two: Black Kyurem, the power of ideals swallowed!'),
      line: [{ who: 646, name: K('블랙큐레무', 'Black Kyurem'), text: K('…이상도, 진실도, 모두 얼려 주마. 레시라무의 불꽃도, 제크로무의 번개도 이 몸의 것이다!', "...Ideals, truth, I will freeze them all. Reshiram's flame and Zekrom's lightning are mine now!") }],
      sig: { use: [WSIG.fusionFlare, WSIG.bolt, WSIG.flare, WSIG.fusionBolt], at: [0.88, 0.72, 0.56, 0.4, 0.24] },
      tele: [
        { name: K('프리즈볼트', 'Freeze Shock'), every: 2, dmg: 0.5, stagger: 1, pats: ['rows', 'cols', 'cross', 'far', 'checker'], type: 13, first: 2 },
        { at: 0.5, name: K('프리즈볼트', 'Freeze Shock'), every: 1, dmg: 0.56, stagger: 1, pats: ['checker|cross', 'rows|x', 'quad', 'star|near'], type: 13, summon: 2, summonSp: [604, 523] },
      ] },
    { hp: 0.5, atk: 1.1, def: 1.2, cap: 0.44 * TOP, shiny: true, aura: '#fff4e0', rename: K('화이트큐레무', 'White Kyurem'), bgm: 'vs_kyurem',
      msg: K('큐레무가 하얀 불꽃을 두르고 다시 일어섰다! 3페이즈, 화이트큐레무가 두 궁극기를 한꺼번에 쓴다!', 'Kyurem rises again wrapped in white fire! Phase three: White Kyurem uses two ultimates at once!'),
      line: [{ who: 646, name: K('화이트큐레무', 'White Kyurem'), text: K('…불꽃과 번개를 함께 받아 보아라. 이 몸을, 너희가 녹일 수 있겠느냐!', '...Take flame and lightning together. This body: can you thaw it?') }],
      ult: { use: [[WSIG.fusionFlare, WSIG.bolt], [WSIG.flare, WSIG.fusionBolt], [WSIG.fusionFlare, WSIG.fusionBolt], [WSIG.flare, WSIG.bolt]] } },
  ],
  say: [
    N('1945년 8월, 전쟁이 끝나기 직전. 무너진 도시를 덮은 눈보라 한가운데서 잿빛 용이 얼어붙은 날개를 펼친다.', 'August 1945, on the eve of the war\'s end. In the heart of the blizzard over the ruined city, an ash-grey dragon spreads its frozen wings.'),
    { who: 646, name: K('큐레무', 'Kyurem'), text: K('…나는 텅 빈 것. 전쟁이 지나간 자리에 남는 차가운 빈자리다. 전쟁이 끝나는 이 순간에 세계의 시간을 얼려, 다시는 아무것도 잃지 않게 하겠다.', '...I am the empty one. The cold void that remains where war has passed. I will freeze this world\'s time at the very moment the war ends, so that nothing is ever lost again.') },
    PT('안 돼! 시간이 멈추면 다시 일어설 수도 없어! 지금까지 만난 사람들은 잃어버린 뒤에도 서로를 일으켜 세웠어!', "No! If time stops, nobody can stand up again! Everyone we\'ve met helped each other up even after losing everything!"),
    C('큐레무는 세 번 일어설 거야. 레시라무와 제크로무의 궁극기까지 삼키고! 마지막에는 두 기술을 한꺼번에 쓰니까, 불길이 쫓아오면 멈추지 말고 붉은 칸을 끝까지 봐!', "Kyurem will rise three times, swallowing Reshiram's and Zekrom's ultimates! At the last it uses two at once, so when fire chases you keep moving, and watch the red tiles to the end!")],
  after: [
    { who: 646, name: K('큐레무', 'Kyurem'), text: K('……차가운 빈자리에도 봄은 오는가. 너희가 녹인 것은 얼음이 아니라, 나였구나.', '......Does spring come even to the cold void? It was not the ice you thawed. It was me.') }],
  join: K('큐레무가 얼음을 털고 조용히 다가왔다. 함께 봄을 보고 싶어 한다!', 'Kyurem shakes off its ice and quietly comes over. It wants to see the spring with you!') };

export const WORLD_QITEMS = {
  w_seal: { name: K('원명원 청동 인장', 'Yuanmingyuan Bronze Seal'), desc: K('불탄 원명원 잿더미 속에서 찾은 청동 인장.', 'A bronze seal found in the ashes of the burned Yuanmingyuan.') },
  w_flag: { name: K('신호기', 'Signal Flag'), desc: K('함대에 보낼 신호를 적은 깃발.', 'A flag carrying a signal for the fleet.') },
  w_letter: { name: K('전선의 편지', 'Letter from the Front'), desc: K('참호에서 집으로 보내는 꼬깃꼬깃한 편지.', 'A crumpled letter from the trenches to home.') },
  w_medkit: { name: K('구급 상자', 'First-Aid Kit'), desc: K('붕대와 소독약이 든 야전 구급 상자.', 'A field first-aid kit of bandages and antiseptic.') },
  w_petition: { name: K('독립 청원서', 'Petition for Independence'), desc: K('파리 강화 회의에 내려던 한국 독립 청원서 사본.', 'A copy of the petition for Korean independence meant for the Paris Peace Conference.') },
  w_score: { name: K('교향곡 악보', 'Symphony Score'), desc: K('포위된 도시에서 연주될 교향곡의 파트 악보.', 'A part from the symphony to be played in the besieged city.') },
  w_ration: { name: K('구호 식량', 'Relief Rations'), desc: K('얼음길을 건너 온 빵과 통조림.', 'Bread and tins carried across the ice road.') },
  w_lifebelt: { name: K('구명 부표', 'Lifebelt'), desc: K('바다에 빠진 사람에게 던질 구명 부표.', 'A lifebelt to throw to someone in the sea.') },
};
