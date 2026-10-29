// Eras added after the eighteen: 1905 (the Eulsa Treaty, ending with the Hague envoys) between 1887 and 1919, and
// 1979 (October 26 and the December 12 coup) after the Korean War, which now ends the journey with Arceus. Also the
// post-1945 side line shared by the last eras: Registeel in town, then Regirock, Regice and Regigigas in Snowpoint
// Temple, and the Latias / Latios choice; and after the battle for Seoul, the Sky Pillar (Rayquaza), then the Duwon
// meteorite site (Deoxys).
// Their levels are set directly (the Joseon chapters' lift() curve is not applied to them).
import { K, T, CELEBI, SIG, DARKRAI_SIG, DARKRAI_REVIVE } from './content_k.js';
import { S } from './game.js';
import { tr } from './i18n.js';

const challenge = () => S.mode === 'challenge';
// the 1920 spy hunt's quest-log line: the in-era year runs on until 1930 (quests.js spy*)
export const spyLog = () => tr(`기지에 숨은 밀정을 찾자 · 지금 ${S.spy?.year || 1921}년 (1930년이 되기 전에!)`, `Find the spy hiding in the base · now ${S.spy?.year || 1921} (before 1930!)`); // legendary Pokémon never join a challenge, so their side lines stay closed

// ---------------------------------------------------------------- 1905
const MEWTWO = { sp: 150, lv: 54, lvMin: 47, lvUp: 4, hp: 2.35, atk: 0.9, cap: 0.38, bgm: 'ba_secret2', moves: [94, 396, 247, 58],
  tele: [
    { name: K('사이코키네시스', 'Psychic'), every: 3, dmg: 0.35, stagger: 1, pats: ['ring', 'target', 'x', 'checker'], type: 14, first: 2 },
    { at: 0.5, name: K('파동탄', 'Aura Sphere'), every: 2, dmg: 0.39, stagger: 1, pats: ['star', 'quad', 'far', 'target', 'random'], type: 1,
      msg: K('뮤츠의 눈이 차갑게 빛난다! 공격이 빨라진다!', 'Mewtwo\'s eyes flash cold! Its attacks speed up!'),
      line: [{ who: 150, name: K('뮤츠', 'Mewtwo'), text: K('억지로 맺은 약속에 무슨 힘이 있지? 힘이 있는 자가 이기는 것이 이 세상이다!', 'What power does a promise forced on others have? In this world the strong win!') }] },
  ],
  // second page: Mewtwo rises again, its held-back power let loose (no sprite exists for a Mega form: aura + name)
  revive: { hp: 0.5, atk: 1.2, cap: 0.4, form: K('각성', 'Awakened'), aura: '#b46cff',
    msg: K('뮤츠가 쓰러지지 않는다! 억눌려 있던 힘이 한꺼번에 터져 나왔다!', 'Mewtwo will not fall! All the power it held back bursts out at once!'),
    line: [{ who: 150, name: K('뮤츠', 'Mewtwo'), text: K('…좋다. 이것이 내 진짜 힘이다. 그래도 너희의 뜻이 꺾이지 않는지 보겠다!', '...Very well. This is my true strength. Let us see whether your will still holds!') }],
    tele: [
      { name: K('사이코브레이크', 'Psystrike'), every: 2, dmg: 0.42, stagger: 1, pats: ['star|ring', 'checker|cross', 'quad', 'target|far', 'rows|x'], type: 14, first: 2 },
      { at: 0.5, name: K('미래예지', 'Future Sight'), every: 2, dmg: 0.46, stagger: 1, pats: ['random|ring', 'quad|target', 'checker|x', 'star|near'], type: 14, summon: 1, summonSp: [64, 97],
        msg: K('각성한 뮤츠가 온 궁궐의 시간을 비튼다! 공격이 더욱 거세진다!', 'Awakened Mewtwo bends the very time of the palace! Its attacks grow fiercer still!') },
    ] },
  say: [
    { who: 'narr', text: K('1905년 11월 17일 밤. 총칼을 든 군인들이 둘러싼 중명전 깊은 곳에서, 보이지 않는 힘이 벽을 뒤흔들고 있었다.', 'The night of November 17, 1905. Deep inside Jungmyeongjeon, ringed by soldiers with bayonets, an unseen force was shaking the walls.') },
    { who: 150, name: K('뮤츠', 'Mewtwo'), text: K('…힘으로 남의 뜻을 꺾는 것들. 나를 만든 인간들도 그랬다. 너희도 다르지 않겠지.', '...Those who break others\' will by force. The humans who made me were the same. You will be no different.') },
    { who: 'partner', text: K('아니야! 우리는 빼앗으러 온 게 아니라 지키러 왔어!', 'No! We didn\'t come to take anything. We came to protect!') },
    { who: CELEBI, name: K('세레비', 'Celebi'), text: K('사람의 손으로 만들어진 포켓몬, 뮤츠야! 억지로 꺾이는 마음에 분노해서 날뛰고 있어. 붉은 칸을 피해!', 'It\'s Mewtwo, a Pokémon made by human hands! It is raging at wills being broken by force. Dodge the red tiles!') }],
  after: [{ who: 150, name: K('뮤츠', 'Mewtwo'), text: K('…억지로 맺은 약속은 약속이 아니다. 너희 같은 자들이 있는 한, 이 나라의 뜻은 꺾이지 않겠지.', '...A promise forced on someone is no promise. As long as there are people like you, this land\'s will won\'t be broken.') }],
  join: K('뮤츠가 조용히 내려앉았다. 너희의 뜻을 끝까지 지켜보고 싶어 한다!', 'Mewtwo quietly comes down. It wants to watch your will to the very end!') };

export const ERA_1905 = {
  year: 1905, years: '1905 – 1907', title: K('을사늑약', 'The Eulsa Treaty'), sub: K('빼앗긴 외교권, 헤이그로 간 특사', 'A stolen sovereignty, envoys to The Hague'),
  card: { set: T.autumn, mons: [150, 475, 178, 64] }, artProps: ['palace'], inn: 440, shop: 53, police: false,
  town: {
    name: K('한성 (1905)', 'Hanseong (1905)'), bgm: 'city05_d', bgmN: 'city05_n', biome: 'spring', landmark: 'palace', pearl: 'C05', // Hearthome: the old capital round its palace
    houses: ['hanok', 'western', 'hanok', 'hanok', 'western', 'choga', 'hanok', 'western'], props: ['persimmon', 'maple', 'lamp', 'pole', 'rickshaw', 'jars', 'lantern'],
  },
  world: 'road_f',
  intro: [
    K('1904년, 러시아와 일본이 한반도와 만주를 두고 전쟁을 벌였다(러일 전쟁).', 'In 1904 Russia and Japan went to war over Korea and Manchuria (the Russo-Japanese War).'),
    K('전쟁에서 이긴 일본은 1905년 11월, 경운궁 중명전을 군대로 에워싸고 대한제국에 조약을 강요했다.', 'Having won, Japan surrounded Jungmyeongjeon in Gyeongun Palace with troops in November 1905 and forced a treaty on the Korean Empire.'),
    K('고종 황제는 끝내 서명하지 않았지만 조약은 억지로 맺어졌고, 외교권을 빼앗겼다. 사람들은 이를 "을사늑약"이라 부른다.', 'Emperor Gojong never signed, yet the treaty was forced through and the right to diplomacy was taken. People call it the "Eulsa Treaty", a treaty made by force.'),
  ],
  nodes: [
    { id: 'town', name: K('한성', 'Hanseong'), lon: 126.98, lat: 37.57 },
    { id: 'jungmyeong', name: K('경운궁 중명전', 'Jungmyeongjeon Hall'), lon: 127.34, lat: 37.88, d: 'jungmyeong' },
    { id: 'jeongdong', name: K('정동 골목', 'Jeongdong Lanes'), lon: 126.62, lat: 37.3, d: 'jeongdong' },
    { mark: true, name: K('시일야방성대곡', '"Today we wail"'), lon: 127.4, lat: 37.1, text: K('1905년 11월 20일, 장지연은 황성신문에 "이날을 목 놓아 통곡하노라"라는 글을 실었다.', 'On November 20, 1905, Jang Ji-yeon published "Today we wail aloud" in the Hwangseong Sinmun.') },
    { mark: true, name: K('→ 헤이그', '→ The Hague'), lon: 124.2, lat: 33.6, text: K('1907년, 고종은 네덜란드 헤이그의 만국 평화 회의에 세 특사를 몰래 보냈다.', 'In 1907 Gojong secretly sent three envoys to the Peace Conference at The Hague in the Netherlands.') },
  ],
  dungeons: {
    jungmyeong: { name: K('경운궁 중명전', 'Jungmyeongjeon Hall'), tiles: T.library, floors: 5, lv: [46, 50], mons: [92, 93, 96, 97, 198, 200, 202, 203, 281, 355], bgm: 'd_ginlobby',
      tint: 'rgba(90,40,120,0.12)', boss: MEWTWO },
    jeongdong: { name: K('정동 골목', 'Jeongdong Lanes'), tiles: T.street, floors: 3, lv: [45, 49], mons: [19, 20, 52, 53, 198, 228, 431, 432, 163], bgm: 'road_b' },
  },
  npcs: [
    { id: 'gallade05', sp: 475, name: K('궁궐 시위대 엘레이드', 'Palace Guard Gallade'), x: 22, y: 15, say: [{ text: K('궁궐을 지키는 것이 우리 시위대의 일이오. 그런데 오늘 밤은 칼을 뽑을 수조차 없구려.', 'Guarding the palace is our duty. Yet tonight we cannot even draw our swords.') }] },
    { id: 'xatu05', sp: 178, name: K('황성신문 기자 네이티오', 'Hwangseong Reporter Xatu'), x: 10, y: 16, wander: 2, say: [{ text: K('"이날을 목 놓아 통곡하노라." 우리 신문에 실린 이 글을 읽고 다들 울고 있소.', '"Today we wail aloud." Everyone who reads this piece in our paper is weeping.') }] },
    { id: 'kadabra05', sp: 64, name: K('통역관 윤겔라', 'Interpreter Kadabra'), x: 29, y: 12, say: [{ text: K('억지로 맺은 조약이 무효라는 걸 나라 밖에 알려야 해. 2년 뒤 헤이그에서 세계 평화 회의가 열린대.', 'We must tell the world that a forced treaty is void. They say a world peace conference opens at The Hague in two years.') }] },
    { id: 'marill05', sp: 183, name: K('소년 마릴', 'Young Marill'), x: 15, y: 21, wander: 3, say: [{ text: K('시장 사람들이 가게 문을 닫고, 학생들은 학교에 안 갔대. 조약을 물리라고!', 'The market people shut their shops and the students skipped school. To make them take the treaty back!') }] },
  ],
  main: [
    { do: 'talk', npc: 'gallade05', log: K('궁궐 시위대 엘레이드와 이야기하자', 'Talk to Palace Guard Gallade'), say: [
      { who: 475, name: K('궁궐 시위대 엘레이드', 'Palace Guard Gallade'), text: K('중명전에 일본군이 들어와 대신들을 몰아붙이고 있소. 폐하께서는 끝까지 서명을 거부하고 계시오.', 'Japanese troops are inside Jungmyeongjeon, pressing the ministers hard. His Majesty refuses to sign to the last.') },
      { who: 475, name: K('궁궐 시위대 엘레이드', 'Palace Guard Gallade'), text: K('그런데 중명전 깊은 곳에서 이상한 힘이 날뛰어 아무도 다가가지 못한다오. 그 힘을 가라앉혀 주시오.', 'But a strange force is raging deep in the hall, and no one can get near. Please calm it.') }] },
    { do: 'dungeon', d: 'jungmyeong', log: K('중명전 가장 깊은 곳의 보이지 않는 힘을 찾자', 'Find the unseen force in the depths of Jungmyeongjeon') },
    { do: 'talk', npc: 'gallade05', log: K('엘레이드에게 돌아가자', 'Return to Gallade'), say: [
      { who: 475, name: K('궁궐 시위대 엘레이드', 'Palace Guard Gallade'), text: K('폐하의 옥새는 끝내 찍히지 않았소. 그러니 이 조약은 무효요. 세상이 그 사실을 알아야 하오.', 'His Majesty\'s seal was never put to it. So this treaty is void, and the world must know it.') }] },
    { do: 'scene', say: [
      { who: 'narr', text: K('1907년 6월, 고종의 밀명을 받은 이준, 이상설, 이위종 세 특사가 네덜란드 헤이그의 만국 평화 회의를 찾아갔다.', 'In June 1907 three envoys on Gojong\'s secret orders, Yi Jun, Yi Sang-seol and Yi Wi-jong, reached the Peace Conference at The Hague.') },
      { who: 'narr', text: K('그러나 일본과 열강의 방해로 회의장에는 끝내 들어가지 못했다. 이위종은 각국 기자들 앞에서 을사늑약이 억지로 맺어졌다고 연설했다.', 'Japan and the great powers kept them out of the hall. Yi Wi-jong spoke instead to the world\'s press, telling how the treaty had been forced.') },
      { who: 'narr', text: K('이준은 그곳에서 끝내 숨을 거두었다. 일본은 이 일을 구실로 고종을 강제로 물러나게 했다.', 'Yi Jun died there. Japan used the affair as a pretext to force Gojong from the throne.') }] },
    { do: 'talk', npc: 'kadabra05', log: K('통역관 윤겔라에게 특사 소식을 듣자', 'Hear about the envoys from Interpreter Kadabra'), say: [
      { who: 64, name: K('통역관 윤겔라', 'Interpreter Kadabra'), text: K('회의장 문은 닫혔지만 특사들의 목소리는 세계 신문에 실렸어. 우리가 억지로 빼앗겼다는 걸 이제 모두가 알아.', 'The conference doors stayed shut, but the envoys\' voices made the world\'s papers. Now everyone knows it was taken from us by force.') }] },
  ],
  outro: [
    { who: 'narr', text: K('1907년 8월, 대한제국의 군대마저 강제로 해산되었다. 해산된 군인들은 의병이 되어 전국에서 다시 일어섰다.', 'In August 1907 even the Korean Empire\'s army was forcibly disbanded. Its soldiers joined the righteous armies and rose again across the land.') },
    { who: 'narr', text: K('나라를 지키려는 싸움은 빼앗긴 뒤에도 멈추지 않았다.', 'The fight to protect the country did not stop, even after it was taken.') },
  ],
  side: [
    { id: 'e05a', title: K('황성신문 지키기', 'Save the Hwangseong Sinmun'), kind: 'collect', item: 'hwangsung', n: 3, d: 'jeongdong', reward: { money: 1300, exp: 1200 },
      desc: K('"시일야방성대곡"이 실린 신문을 빼앗기기 전에 정동 골목에서 3부를 찾아 주세요.', 'Find 3 copies of the paper with "Today we wail" in Jeongdong before they are seized.') },
    { id: 'e05b', title: K('감시꾼 니로우 쫓기', 'Drive off the Watchers'), kind: 'defeat', sp: 198, n: 5, d: 'jeongdong', reward: { money: 1200, exp: 1100 },
      desc: K('공사관 골목을 엿보는 니로우 5마리를 쫓아내 주세요.', 'Drive off 5 Murkrow spying along the legation lanes.') },
    { id: 'e05c', title: K('정동의 아기 토게피', 'The Baby Togepi'), kind: 'rescue', sp: 175, floor: 2, d: 'jeongdong', reward: { money: 1200, items: { ginseng: 1 }, exp: 1100 },
      desc: K('정동 골목 2층에서 아기 토게피가 길을 잃었대요.', 'A baby Togepi is lost on floor 2 of the Jeongdong lanes.') },
  ],
};

// ---------------------------------------------------------------- 1979
// December 12: the town itself turns into the battlefield (a 'battle' step started by talking to the officer)
const DARKRAI_1212 = { sp: 491, lv: 70, lvMin: 63, lvUp: 4, hp: 1.35, atk: 0.8, cap: 0.32, bgm: 'ba_secret1', moves: [399, 95, 185, 98],
  tele: { name: K('나이트메어', 'Bad Dreams'), every: 3, dmg: 0.34, pats: ['ring', 'target', 'checker', 'x', 'near'], type: 17 },
  sig: DARKRAI_SIG, revive: DARKRAI_REVIVE, // three phases: Dark Void, then Shadow Force, then Dark Pulse as well
  say: [
    { who: 'narr', text: K('12월 12일 밤. 반란군의 탱크 소리가 울리는 거리 한가운데, 어둠이 사람의 모양으로 일어섰다.', 'The night of December 12. In the middle of streets echoing with the rebels\' tanks, the darkness rose in a human-like shape.') },
    { who: 491, name: K('다크라이', 'Darkrai'), text: K('…모두가 악몽 속에 있다. 이 밤은 길고, 아침은 오지 않을 것이다.', '...Everyone is inside a nightmare. This night is long, and morning will not come.') },
    { who: 'partner', text: K('반란군이 다크라이의 악몽까지 등에 업었어! 하나회 쪽 포켓몬들이 15%나 강해졌어. 그래도 시민들을 지키자!', 'The rebels have Darkrai\'s nightmares behind them! The Hanahoe side is 15% stronger. We still protect the people!') }],
  after: [{ who: 491, name: K('다크라이', 'Darkrai'), text: K('…악몽 속에서도 깨어 있으려는 자들이 있구나. 언젠가 이 긴 밤도 끝나겠지.', '...So some try to stay awake even inside the nightmare. Someday this long night too will end.') }],
  join: K('다크라이가 그림자에서 걸어 나왔다. 아침이 오는 것을 함께 보고 싶어 한다!', 'Darkrai steps out of the shadows. It wants to see the morning come with you!') };

// ---------------------------------------------------------------- the last quest: Arceus (until now the 1950 finale)
const ARCEUS_TELE = [
  { name: '심판의 뭉치', every: 2, dmg: 0.5, stagger: 1, pats: ['cross', 'x', 'target', 'near', 'ring'], type: 0, first: 2 },
  { at: 0.66, name: '심판의 뭉치', every: 2, dmg: 0.56, stagger: 1, pats: ['star', 'rows', 'cols', 'checker', 'ring', 'quad'], type: 16, typeTo: 16, summon: 2, summonSp: [436, 343],
    msg: '아르세우스가 용의 플레이트를 해방했다! 타입이 드래곤으로 바뀌었다!',
    line: [{ who: 493, name: '아르세우스', text: '…아직이다. 너희가 지켜 온 마음을, 끝까지 보여 다오.' }] },
  { at: 0.33, name: '창세의 빛', every: 1, dmg: 0.65, stagger: 1, pats: ['quad', 'random', 'checker|cross', 'ring|x', 'target|rows', 'far'], type: 17, typeTo: 17,
    msg: '아르세우스가 어둠의 플레이트를 꺼내 들었다! 공격이 한층 거세진다!',
    line: [{ who: 493, name: '아르세우스', text: '시간이 시작되기 전의 빛이다. 피할 수 있겠느냐!' }] },
];
// second page: Arceus gets back up golden (its shiny colours) with 2/3 of its HP, harder hits and double patterns, and
// from now on Judgment's orbs of light rain on random spots all over the arena (patterns with 'orbs')
const JUDGMENT = K('심판의 뭉치', 'Judgment');
const ARCEUS_REVIVE = { hp: 2 / 3, atk: 1.35, shiny: true, cap: 0.34, aura: '#ffd84a',
  msg: K('아르세우스가 쓰러지지 않는다! 온몸이 황금빛으로 물들었다!', 'Arceus refuses to fall! Its whole body turns to gold!'),
  line: [{ who: 493, shiny: true, name: K('아르세우스', 'Arceus'), text: K('…좋다. 이것이 창조의 진짜 모습이다. 마지막까지 버텨 보아라!', '...Very well. This is the true face of creation. Hold out to the very end!') }],
  tele: [
    { name: K('황금 심판', 'Golden Judgment'), orbName: JUDGMENT, every: 2, dmg: 0.55, stagger: 1, pats: ['orbs', 'star|ring', 'orbs|cross', 'checker|cross', 'quad', 'orbs|x', 'rows|x', 'cols|near', 'target|far'], type: 0, first: 2 },
    { at: 0.5, name: K('황금 창세', 'Golden Genesis'), orbName: JUDGMENT, every: 1, dmg: 0.68, stagger: 1, pats: ['orbs|target', 'quad|target', 'random|cross', 'orbs|ring', 'checker|x', 'ring|rows', 'orbs|cols', 'star|far', 'cols|near'], type: 17, summon: 2, summonSp: [436, 343],
      msg: K('황금빛 아르세우스가 모든 플레이트를 한꺼번에 해방했다!', 'Golden Arceus unleashes every plate at once!'),
      line: [{ who: 493, shiny: true, name: K('아르세우스', 'Arceus'), text: K('이 빛을 견뎌 낸다면… 너희에게 이 시대의 꽃잎을 맡기겠다.', 'Endure this light... and I will entrust you with this era\'s petal.') }] },
  ] };
// third page: Arceus rises once more with half that HP, Attack +10% and Defense +20%, every plate merged into one
// (a rainbow aura): Judgment pours down every turn, and three times it swings Hyper Beam round a full circle
const ARCEUS_REVIVE3 = { hp: 0.5, atk: 1.1, def: 1.2, shiny: true, cap: 0.36, aura: 'rainbow', bgm: 'ba_chanp',
  msg: K('아르세우스가 또다시 일어선다! 모든 플레이트가 하나로 겹쳐지며 무지갯빛을 내뿜는다!', 'Arceus rises yet again! Every plate merges into one, blazing with rainbow light!'),
  line: [{ who: 493, shiny: true, name: K('아르세우스', 'Arceus'), text: K('…이것이 마지막이다. 시간과 공간이 태어나기 전의 힘, 받아 보아라!', '...This is the last. The power from before time and space were born: take it!') }],
  tele: [
    { name: K('창세의 심판', 'Genesis Judgment'), orbName: JUDGMENT, every: 1, dmg: 0.6, stagger: 1, pats: ['orbs|cross', 'orbs|x', 'star|orbs', 'quad|target', 'checker|ring', 'random|cols', 'orbs|rows'], type: 0, first: 2 },
    { at: 0.4, name: K('무한의 심판', 'Endless Judgment'), orbName: JUDGMENT, every: 1, dmg: 0.7, stagger: 1, pats: ['orbs|star', 'orbs|quad', 'checker|cross|orbs', 'ring|x|orbs', 'target|far|orbs'], type: 17, summon: 2, summonSp: [436, 343],
      msg: K('아르세우스의 빛이 끝없이 쏟아진다! 공격이 한층 거세진다!', 'Arceus\'s light pours down without end! Its attacks grow fiercer!') },
  ],
  sig: { use: [SIG.beam], at: [[0.9, 0.6, 0.25]] } };
// the final boss sets its own numbers (dungeon.js bossTier): its level follows the team's like any boss's, from Lv 70 up
// to Lv 180, a long fight where dodging decides everything. A team that already has Arceus (it joined in the 1950
// finale of older versions) gets no second one.
const ARCEUS = { sp: 493, lv: 180, lvMin: 70, lvUp: 2, lvCap: 180, hp: 8.25, atk: 0.62, cap: 0.28, final: true, bgm: 'ba_dpoke2', moves: [449, 304, 245, 414], tele: ARCEUS_TELE, revive: [ARCEUS_REVIVE, ARCEUS_REVIVE3],
  get noJoin() { return !!S.flags.got_493; },
  say: [
    { who: 'narr', text: '눈부신 빛 속에서, 거대한 포켓몬이 천천히 고개를 들었다.' },
    { who: 493, name: '아르세우스', text: '…나는 아르세우스. 시간과 공간을 낳은 자. 꽃잎을 좇아 시대를 건너온 작은 것들이여.' },
    { who: 493, name: K('아르세우스', 'Arceus'), text: K('갈라지고 싸우고 빼앗기고 슬퍼한 시간… 살수에서 오늘까지, 이 땅의 천삼백 년을 처음으로 되돌리겠다.', 'Ages of division, war, loss and grief... From the Salsu until today, I will return this land\'s thirteen hundred years to the beginning.') },
    { who: 'partner', text: K('안 돼! 고구려에서 여기까지, 사람들은 아파도 다시 일어나 서로를 지켜 왔어! 긴 겨울 끝의 봄도 스스로 되찾았고!', 'No! From Goguryeo until now, people got hurt and still stood up and protected each other! They even won back their own spring after the long winter!') },
    { who: CELEBI, name: '세레비', text: '아르세우스의 심판은 붉게 빛나는 곳에 떨어져! 잘 보고 피한 다음, 빈틈을 노려!' }],
  after: [
    { who: 493, name: '아르세우스', text: '……보았다. 너희가 걸어온 길에 깃든 마음을. 잊지 않는 한, 그 시간은 사라지지 않겠지.' },
    { who: 493, name: K('아르세우스', 'Arceus'), text: K('이 땅의 시간은 이대로 흐르게 두겠다. 갈라진 길도 언젠가 다시 이어질 수 있으리라.', 'I will let this land\'s time flow on. Even divided roads may one day be joined again.') }],
  join: '아르세우스가 조용히 너희 곁에 내려섰다. 함께 가겠다는 듯하다…!' };

export const ERA_1979 = {
  year: 1979, years: '1979 – 1980', title: K('10·26과 12·12', 'October 26 and December 12'), sub: K('끝나지 않은 겨울, 기다리는 봄', 'A winter that would not end, a spring yet to come'),
  card: { set: T.street, mons: [491, 448, 475, 430] }, artProps: [], inn: 242, shop: 52,
  town: {
    name: K('서울 (1979)', 'Seoul (1979)'), bgm: 'city09_d', bgmN: 'city09_n', biome: 'modern', landmark: null, pearl: 'C06', // Pastoria's streets: where the night of December 12 is fought
    houses: ['western', 'western', 'hanok', 'western', 'western', 'hanok', 'western', 'choga'], props: ['pole', 'lamp', 'pole', 'lamp', 'crates', 'baretree'],
  },
  world: 'city08_n',
  intro: [
    K('1961년 군사 정변으로 권력을 잡은 박정희 정부는 1972년 유신 헌법으로 대통령이 계속 집권할 수 있게 했다.', 'The Park Chung-hee government, in power since the 1961 coup, let the president rule on and on under the 1972 Yushin Constitution.'),
    K('1979년 10월 26일 밤, 박정희 대통령이 중앙정보부장 김재규의 총에 맞아 숨졌다(10·26 사건).', 'On the night of October 26, 1979, President Park Chung-hee was shot dead by Kim Jae-gyu, director of the KCIA (the October 26 incident).'),
    K('18년 만에 찾아온 큰 변화 앞에서 사람들은 민주주의의 봄을 기다렸다. 그러나 군대 안에서는 "하나회"라는 사조직이 움직이고 있었다.', 'Facing the first great change in eighteen years, people waited for a democratic spring. But inside the army a private clique called "Hanahoe" was on the move.'),
  ],
  nodes: [
    { id: 'town', name: K('서울', 'Seoul'), lon: 126.98, lat: 37.57 },
    { id: 'cheonggye', name: K('청계천 판자촌', 'Cheonggyecheon Shanties'), lon: 127.4, lat: 37.2, d: 'cheonggye' },
    { mark: true, name: K('10·26', 'October 26'), lon: 126.6, lat: 37.9, text: K('1979년 10월 26일, 서울 궁정동 안가에서 박정희 대통령이 숨졌다.', 'On October 26, 1979, President Park died at a KCIA safehouse in Gungjeong-dong, Seoul.') },
    { id: 'origin', name: K('시작의 하늘', 'Sky of Beginnings'), lon: 127.75, lat: 38.3, d: 'origin' },
    { mark: true, name: K('→ 광주 (1980년 5월)', '→ Gwangju (May 1980)'), lon: 126.85, lat: 35.16, text: K('1980년 5월, 광주 시민들은 계엄군에 맞서 민주주의를 외쳤다(5·18 민주화 운동).', 'In May 1980 the people of Gwangju stood against the martial-law troops and called for democracy (the May 18 Democratic Uprising).') },
  ],
  dungeons: {
    // the town battle: Pastoria (data/pearl.json C06) as built for 1979, at night; the Hanahoe side fights at +15%
    night1212: { name: K('12월 12일 밤 · 서울', 'Seoul, the night of December 12'), tiles: T.street, floors: 1, lv: [62, 66], fromTown: true, bgm: 'ba_akagi',
      mons: [262, 229, 430, 461, 435, 452, 359], tint: 'rgba(20,24,70,0.30)',
      battle: { town: null, foeBuff: 1.15, allies: [59, 448, 68, 475, 208], foes: [262, 229, 430, 461, 452, 359] },
      boss: DARKRAI_1212 },
    cheonggye: { name: K('청계천 판자촌', 'Cheonggyecheon Shanties'), tiles: T.alley, floors: 3, lv: [60, 64], mons: [88, 89, 19, 20, 109, 110, 52, 53, 41, 42], bgm: 'road_a' },
    // the last quest: the sky where time began, gathering every era's time; Arceus on the last floor
    origin: { name: K('시작의 하늘', 'Sky of Beginnings'), tiles: T.rift, floors: 5, lv: [66, 70], mons: [444, 359, 197, 229, 282, 429, 477, 356, 475, 474], bgm: 'legend',
      tint: 'rgba(255,220,140,0.08)', boss: ARCEUS },
  },
  npcs: [
    { id: 'spinda79', sp: 327, name: K('라디오 아나운서 얼루기', 'Radio Announcer Spinda'), x: 22, y: 15, say: [{ text: K('통행금지 사이렌이 울리기 전에 다들 집에 가셔야 해요. 밤 12시부터 새벽 4시까지는 거리에 나올 수 없거든요.', 'Everyone should be home before the curfew siren. No one may be on the streets from midnight to 4 a.m.') }] },
    { id: 'lucario79', sp: 448, name: K('수경사 군인 루카리오', 'Capital Guard Lucario'), x: 10, y: 16, say: [{ text: K('명령 없이 군대를 움직이는 건 반란이오. 우리는 헌법이 정한 지휘를 따를 뿐이오.', 'Moving troops without orders is rebellion. We only follow the command the constitution lays down.') }] },
    { id: 'plusle79', sp: 311, name: K('대학생 플러시', 'Student Plusle'), x: 29, y: 12, wander: 2, say: [{ text: K('이제 우리 손으로 대통령을 뽑는 날이 올까? 봄이 오면 꼭 그렇게 되면 좋겠어.', 'Will the day come when we choose our own president? I hope it does, come spring.') }] },
    { id: 'raticate79', sp: 20, name: K('택시 기사 레트라', 'Taxi Driver Raticate'), x: 15, y: 21, wander: 3, say: [{ text: K('요즘 손님들은 다들 말을 아껴. 누가 듣고 있을지 모르니까.', 'Passengers keep quiet these days. You never know who\'s listening.') }] },
  ],
  main: [
    { do: 'talk', npc: 'spinda79', log: K('라디오 아나운서 얼루기와 이야기하자', 'Talk to Radio Announcer Spinda'), say: [
      { who: 327, name: K('라디오 아나운서 얼루기', 'Radio Announcer Spinda'), text: K('10월 26일 밤의 긴급 뉴스를 전한 게 저였어요. 그 뒤로 전국에 비상계엄이 내려졌죠.', 'I was the one who read the emergency news on the night of October 26. Martial law has covered the country ever since.') },
      { who: 327, name: K('라디오 아나운서 얼루기', 'Radio Announcer Spinda'), text: K('다들 이제 민주주의가 올 거라 믿고 있어요. 그런데 군대 쪽 분위기가 심상치 않아요…', 'Everyone believes democracy is coming now. But something feels wrong in the army...') }] },
    { do: 'scene', say: [
      { who: 'narr', text: K('1979년 12월 12일 저녁, 보안사령관 전두환과 하나회 군인들이 대통령의 재가 없이 계엄사령관 정승화를 강제로 연행했다.', 'On the evening of December 12, 1979, Security Commander Chun Doo-hwan and Hanahoe officers seized Martial Law Commander Jeong Seung-hwa without the president\'s approval.') },
      { who: 'narr', text: K('수도경비사령관 장태완 등은 반란을 막으려 했지만, 하나회는 전방의 부대까지 서울로 불러들였다.', 'Capital Garrison Commander Jang Tae-wan and others tried to stop the rebellion, but Hanahoe even pulled front-line units into Seoul.') }] },
    { do: 'battle', d: 'night1212', npc: 'lucario79', log: K('수경사 군인 루카리오와 함께 서울 거리를 지키자 (전투)', 'Hold Seoul\'s streets with Capital Guard Lucario (battle)'), say: [
      { who: 448, name: K('수경사 군인 루카리오', 'Capital Guard Lucario'), text: K('반란군이 시내로 들어오고 있소! 저들은 하나회의 기세를 업고 한층 강해졌소. 시민들이 다치지 않게 함께 막아 주겠소?', 'The rebels are entering the city! Riding Hanahoe\'s momentum they are stronger than before. Will you help us keep the people from harm?') }] },
    { do: 'scene', say: [
      { who: 'narr', text: K('…그러나 그날 밤, 반란은 끝내 성공했다. 하나회는 군을 손에 넣었고, 이듬해 권력까지 차지했다.', '...But that night the rebellion succeeded. Hanahoe took the army, and the next year the government too.') },
      { who: 'narr', text: K('1980년 봄, 사람들은 민주주의를 외치며 거리로 나섰다(서울의 봄). 5월, 광주에서는 계엄군이 시민들을 무력으로 짓밟았다(5·18 민주화 운동).', 'In the spring of 1980 people took to the streets for democracy (the Seoul Spring). In May, martial-law troops crushed the citizens of Gwangju by force (the May 18 Democratic Uprising).') }] },
    { do: 'talk', npc: 'spinda79', log: K('얼루기에게 돌아가자', 'Return to Spinda'), say: [
      { who: 327, name: K('라디오 아나운서 얼루기', 'Radio Announcer Spinda'), text: K('역사는 그날 밤을 "군사 반란"이라 부르게 될 거예요. 1997년 대법원 판결이 그랬죠.', 'History will call that night a "military rebellion". The Supreme Court ruled so in 1997.') },
      { who: 327, name: K('라디오 아나운서 얼루기', 'Radio Announcer Spinda'), text: K('그리고 1987년 6월, 시민들은 대통령을 직접 뽑을 권리를 스스로 되찾았어요. 봄은 늦게, 그래도 왔어요.', 'And in June 1987 the people won back the right to choose their own president. Spring came late, but it came.') }] },
    { do: 'scene', say: [
      { who: CELEBI, name: K('세레비', 'Celebi'), text: K('…느껴져? 마지막 꽃잎이 서울 하늘 위, 시간이 처음 시작된 곳에서 빛나고 있어.', '...Do you feel it? The last petal is shining in the sky above Seoul, where time first began.') },
      { who: CELEBI, name: K('세레비', 'Celebi'), text: K('612년부터 1980년까지, 모든 시대의 시간이 그곳으로 모이고 있어. 그곳에서… 아르세우스가 기다리고 있을 거야.', 'From 612 to 1980, the time of every era is gathering there. And there... Arceus will be waiting.') },
      { who: 'partner', text: K('여기까지 함께 온 모두의 마음을 보여 주자. 마지막 여행이야!', 'Let\'s show it the hearts of everyone who came this far with us. Our last journey!') }] },
    { do: 'dungeon', d: 'origin', log: K('시작의 하늘 가장 깊은 곳에서 아르세우스를 만나자 (마지막 퀘스트)', 'Meet Arceus in the depths of the Sky of Beginnings (the last quest)') },
  ],
  outro: [
    { who: 'narr', text: K('긴 겨울을 지나, 사람들은 스스로의 힘으로 민주주의를 되찾았다.', 'After a long winter, the people won back democracy by their own strength.') },
    { who: 'narr', text: K('612년 살수에서 시작된 여행이 여기까지 왔다. 그러나 역사는 지금도 이어지고 있다.', 'The journey that began at the Salsu in 612 has come this far. But history goes on, even now.') },
  ],
  side: [
    { id: 'e79a', title: K('야학 교과서 찾기', 'Find the Night-School Books'), kind: 'collect', item: 'textbook', n: 3, d: 'cheonggye', reward: { money: 3200, exp: 3200 },
      desc: K('공장에서 일하며 밤에 공부하는 사람들의 야학 교과서 3권을 청계천에서 찾아 주세요.', 'Find 3 textbooks for the night school where factory workers study after their shifts, somewhere in Cheonggyecheon.') },
    { id: 'e79b', title: K('질퍽이 치우기', 'Clear the Grimer'), kind: 'defeat', sp: 88, n: 5, d: 'cheonggye', reward: { money: 3000, exp: 3000 },
      desc: K('더러워진 개천에서 불어난 질퍽이 5마리를 진정시켜 주세요.', 'Calm 5 Grimer that have multiplied in the polluted stream.') },
  ],
};
// the battlefield is the 1979 town as built (the same object, so the battle map is the town you walk in)
ERA_1979.dungeons.night1212.battle.town = ERA_1979.town;

export const MODERN_QITEMS = {
  hwangsung: { name: K('황성신문', 'Hwangseong Sinmun'), desc: K('"시일야방성대곡"이 실린 1905년 11월 20일 자 신문.', 'The November 20, 1905 issue carrying "Today we wail".') },
  textbook: { name: K('야학 교과서', 'Night-School Textbook'), desc: K('공장 노동자들이 밤에 공부하던 손때 묻은 교과서.', 'A well-thumbed textbook factory workers studied from at night.') },
};

// ---------------------------------------------------------------- after 1945: the Regi line and the Eon pair
// Registeel stands in town; once it joins, Regirock and Regice appear on the world map (boss on floor 2); with all
// three in the team, Snowpoint Temple opens (Pearl's real temple: its entrance floor, then the deepest hall).
// These legends can be fought again until they join, never move on to later eras, and stay closed in a challenge.
const got = (sp) => !!S.flags['got_' + sp];
const REGI = (sp, name, moves, tele, extra = {}) => ({ sp, lv: 60, lvMin: 54, lvUp: 4, hp: 1.9, atk: 0.85, cap: 0.34, bgm: 'ba_secret2', moves, tele, retry: true, noWander: true, ...extra });
const REGISTEEL = REGI(379, K('레지스틸', 'Registeel'), [442, 309, 334, 89], { name: K('러스트캐논', 'Flash Cannon'), every: 3, dmg: 0.34, pats: ['cross', 'x', 'rows', 'cols'], type: 8 }, {
  say: [
    { who: 'narr', text: K('점자가 새겨진 강철 거인이 삐걱이며 몸을 일으켰다. 몸속 깊은 곳에서 기계 소리 같은 울림이 난다.', 'The steel colossus carved with braille creaks to its feet. A machine-like hum rises from deep inside it.') },
    { who: 379, name: K('레지스틸', 'Registeel'), text: K('…삐… 삐빗… 강철… 시대… 깨어남…', '...Bee... bee-beep... steel... era... awakening...') }],
  after: [{ who: 379, name: K('레지스틸', 'Registeel'), text: K('…삐빗. 바위와 얼음의 형제가 깨어난다. 셋이 모이면, 거인의 신전이 열린다.', '...Beep. The brothers of rock and ice awaken. When three gather, the giant\'s temple opens.') }],
  join: K('레지스틸이 묵직하게 걸어왔다. 형제들을 찾으러 함께 가고 싶어 한다!', 'Registeel walks over heavily. It wants to come along to find its brothers!') });
const REGIROCK = REGI(377, K('레지락', 'Regirock'), [444, 157, 89, 7], { name: K('스톤에지', 'Stone Edge'), every: 3, dmg: 0.34, pats: ['near', 'ring', 'rows', 'checker'], type: 5 }, {
  say: [{ who: 377, name: K('레지락', 'Regirock'), text: K('…쿠웅… 쿠웅… (바위로 된 몸이 무너진 산 속에서 일어섰다!)', '...Boom... boom... (A body of stone rises from the collapsed mountain!)') }],
  after: [{ who: 377, name: K('레지락', 'Regirock'), text: K('…쿠웅. 강철의 형제가 너희와 함께 있구나.', '...Boom. Our steel brother is with you.') }],
  join: K('레지락이 바위 몸을 낮추었다. 함께 가고 싶어 한다!', 'Regirock lowers its stone body. It wants to come along!') });
const REGICE = REGI(378, K('레지아이스', 'Regice'), [58, 59, 85, 63], { name: K('눈보라', 'Blizzard'), every: 3, dmg: 0.34, pats: ['cols', 'rows', 'far', 'x'], type: 15 }, {
  say: [{ who: 378, name: K('레지아이스', 'Regice'), text: K('…피이잉… (만 년 얼음으로 된 거인이 차가운 숨을 내뿜는다!)', '...Peeeng... (A giant of ten-thousand-year ice breathes out a freezing breath!)') }],
  after: [{ who: 378, name: K('레지아이스', 'Regice'), text: K('…피잉. 셋이 모이면, 선단의 신전에서 거인이 깨어난다.', '...Peeng. When the three gather, the giant wakes in the Snowpoint temple.') }],
  join: K('레지아이스가 차가운 빛을 거두었다. 함께 가고 싶어 한다!', 'Regice dims its icy light. It wants to come along!') });
const REGIGIGAS = { sp: 486, lv: 64, lvMin: 58, lvUp: 4, hp: 2.0, atk: 0.9, cap: 0.36, slow: 5, retry: true, noWander: true, bgm: 'ba_secret2', moves: [276, 5, 8, 9],
  tele: { name: K('거인의 손바닥', 'Giant\'s Palm'), every: 4, dmg: 0.36, pats: ['quad', 'near', 'cross', 'rows'], type: 0 },
  say: [
    { who: 'narr', text: K('세 거인이 신전 바닥의 점자 앞에 나란히 섰다. 얼음 아래 잠들어 있던 거대한 몸이 천천히 눈을 떴다.', 'The three giants stand side by side before the braille on the temple floor. The vast body asleep beneath the ice slowly opens its eyes.') },
    { who: 486, name: K('레지기가스', 'Regigigas'), text: K('……대륙을 끌어 옮긴 거인이 깨어났다. 처음에는 힘이 다 돌아오지 않았지만, 곧 그 힘이 돌아올 것이다!', '......The giant that towed the continents has woken. Its strength hasn\'t fully returned yet, but it soon will!') },
    { who: 'partner', text: K('레지기가스는 처음 몇 턴 동안만 느려! 그때 최대한 공격하자!', 'Regigigas is only slow for the first few turns! Hit it as hard as we can then!') }],
  after: [{ who: 486, name: K('레지기가스', 'Regigigas'), text: K('……세 형제를 이끌어 온 자들이여. 거인의 힘을 너희에게 빌려주마.', '......You who led the three brothers here. I will lend you a giant\'s strength.') }],
  join: K('레지기가스가 거대한 몸을 굽혔다. 함께 가고 싶어 한다!', 'Regigigas bends its enormous body. It wants to come along!') };

const POSTWAR_DUNGEONS = {
  registeel: { name: K('잠든 강철 거인', 'The Sleeping Steel Giant'), tiles: T.temple, floors: 1, lv: [52, 56], legend: true, fromTown: true, mons: [81, 82, 436, 437], bgm: 'd_ginlobby', boss: REGISTEEL },
  regirock: { name: K('무너진 산의 바위굴', 'Rock Cave of the Fallen Hill'), tiles: T.cliff, floors: 2, lv: [52, 56], legend: true, mons: [74, 75, 95, 111, 112, 246, 247, 299], bgm: 'd_mount2', boss: REGIROCK },
  regice: { name: K('만년 얼음굴', 'Ten-Thousand-Year Ice Cave'), tiles: T.fortsnow, floors: 2, lv: [52, 56], legend: true, mons: [86, 87, 124, 215, 220, 221, 361, 362], bgm: 'd_ice', tint: 'rgba(150,200,255,0.10)', boss: REGICE },
  // Pearl's Snowpoint Temple (data/pearl.json): its entrance floor, then the deepest hall where Regigigas sleeps
  snowtemple: { name: K('선단신전', 'Snowpoint Temple'), tiles: T.temple, floors: 2, lv: [54, 58], legend: true, layouts: ['D20R0101', 'D20R0106'], mons: [215, 220, 221, 225, 361, 362, 478, 473],
    bgm: 'd_ice', tint: 'rgba(170,210,255,0.10)', boss: REGIGIGAS, needs: [377, 378, 379],
    needsText: K('신전 바닥의 점자가 희미하게 빛날 뿐 문이 열리지 않는다. 레지락·레지아이스·레지스틸을 모두 데리고 오면 열릴 것 같다.', 'The braille on the temple floor glows faintly, but the door stays shut. It looks like it will open if you bring Regirock, Regice and Registeel together.') },
};
const POSTWAR_NODES = [
  { id: 'regirock', name: K('무너진 산의 바위굴', 'Rock Cave of the Fallen Hill'), lon: 128.9, lat: 36.55, d: 'regirock', when: () => got(379) },
  { id: 'regice', name: K('만년 얼음굴', 'Ice Cave'), lon: 128.25, lat: 41.6, d: 'regice', when: () => got(379) },
  { id: 'snowtemple', name: K('선단신전', 'Snowpoint Temple'), lon: 129.55, lat: 40.85, d: 'snowtemple', when: () => got(377) && got(378) && got(379) },
];
const POSTWAR_NPCS = [
  { id: 'registeel', sp: 379, name: K('점자가 새겨진 강철 거인', 'Steel Giant Carved with Braille'), x: 33, y: 9, role: 'regi', d: 'registeel', when: () => !got(379) && !challenge() },
  // two NPCs, one choice: whichever you talk to, only one of the pair can come along
  { id: 'latias', sp: 380, name: K('라티아스', 'Latias'), x: 5, y: 9, role: 'lati', when: () => !S.flags.lati && !challenge() },
  { id: 'latios', sp: 381, name: K('라티오스', 'Latios'), x: 7, y: 9, role: 'lati', when: () => !S.flags.lati && !challenge() },
];
// eras from 1945 on: their dungeons, map nodes and main-town people gain the post-war side line
export function addPostWar(eras) {
  for (const e of eras) {
    Object.assign(e.dungeons, POSTWAR_DUNGEONS);
    for (const nodes of e.nodesS ? [e.nodesS, e.nodesN] : [e.nodes]) nodes.push(...POSTWAR_NODES);
    for (const npcs of e.south ? [e.south.npcs, e.north.npcs] : [e.npcs]) npcs.push(...POSTWAR_NPCS);
  }
}

// ---------------------------------------------------------------- after the battle for Seoul: the Sky Pillar and Duwon
// Once Groudon and Kyogre have clashed in Seoul (1950), the Sky Pillar appears on the world map with its keeper on
// floor 2: Rayquaza, come down to calm the land and the sea. Once Rayquaza joins, a meteor brings Deoxys to Duwon in
// Goheung, where the first meteorite on record in Korea fell in 1943: a place of its own, as no map holds two legends.
// Both can be fought again until they join and never move on to later eras; in a challenge neither place opens. A red
// meteorite then stands in town, where Deoxys changes Forme (town.js meteorTalk, game.js FORMES).
// second page: Mega Rayquaza (no sprite exists for it: aura + name, as for Mewtwo)
const RAYQUAZA = { sp: 384, lv: 66, lvMin: 60, lvUp: 4, hp: 2.0, atk: 0.8, cap: 0.34, retry: true, noWander: true, bgm: 'ba_secret2', moves: [200, 406, 245, 89],
  tele: { name: K('화룡점정', 'Dragon Ascent'), every: 3, dmg: 0.36, pats: ['x', 'star', 'cols', 'far'], type: 2 },
  revive: { hp: 0.42, atk: 1.1, cap: 0.4, form: K('메가', 'Mega'), aura: '#7cffb0',
    msg: K('레쿠쟈가 쓰러지지 않는다! 하늘의 힘을 모아 메가진화했다!', 'Rayquaza will not fall! It gathers the power of the sky and Mega Evolves!'),
    line: [{ who: 384, name: K('레쿠쟈', 'Rayquaza'), text: K('……하늘이 내게 힘을 빌려준다. 끝까지 보여 다오!', '......The sky lends me its strength. Show me everything you have!') }],
    tele: [
      { name: K('화룡점정', 'Dragon Ascent'), every: 2, dmg: 0.4, stagger: 1, pats: ['x|cols', 'star', 'far|rows', 'cross'], type: 2, first: 2 },
      { at: 0.5, name: K('용성군', 'Draco Meteor'), every: 2, dmg: 0.44, stagger: 1, pats: ['random', 'quad|target', 'star|ring', 'checker'], type: 16,
        msg: K('메가레쿠쟈가 하늘 끝에서 유성을 불러냈다!', 'Mega Rayquaza calls meteors down from the edge of the sky!') },
    ] },
  say: [
    { who: 'narr', text: K('구름보다 높은 하늘기둥 꼭대기. 땅과 바다의 거인이 서울에서 맞부딪친 날부터, 초록빛 용이 하늘을 맴돌고 있었다.', 'The top of the Sky Pillar, above the clouds. Ever since the giants of land and sea clashed in Seoul, a green dragon has been circling the sky.') },
    { who: 384, name: K('레쿠쟈', 'Rayquaza'), text: K('……땅과 바다가 다투면 하늘이 내려온다. 그것이 나의 일이다. 너희는 무엇을 위해 싸웠느냐!', '......When land and sea quarrel, the sky comes down. That is my task. What did you fight for?') },
    { who: 'partner', text: K('레쿠쟈야! 그란돈과 가이오가의 싸움을 멈추러 하늘에서 내려왔대. 우리 마음을 보여 주자!', 'It\'s Rayquaza! It came down from the sky to stop Groudon and Kyogre fighting. Let\'s show it our hearts!') }],
  after: [{ who: 384, name: K('레쿠쟈', 'Rayquaza'), text: K('…좋다. 너희는 빼앗으려고 싸운 것이 아니구나. …하늘 너머에서 무언가가 나를 쫓아온다. 내가 너희와 가면, 그것도 이 땅 어딘가로 내려오겠지.', '...Good. You did not fight to take. ...Something from beyond the sky is chasing me. If I go with you, it too will come down somewhere on this land.') }],
  join: K('레쿠쟈가 긴 몸을 낮추었다. 함께 하늘을 날고 싶어 한다!', 'Rayquaza lowers its long body. It wants to fly with you!') };
// Deoxys shows all its Formes in one fight: Normal, the Attack Forme at half HP (dungeon.js bossPhase: forme), and on
// its second page the Speed Forme, which dodges (game.js FORMES eva)
const DEOXYS = { sp: 386, lv: 68, lvMin: 62, lvUp: 4, hp: 2.3, atk: 0.9, cap: 0.36, retry: true, noWander: true, bgm: 'ba_secret1', moves: [354, 94, 245, 276],
  tele: [
    { name: K('사이코부스트', 'Psycho Boost'), every: 3, dmg: 0.36, stagger: 1, pats: ['random', 'checker', 'target', 'ring'], type: 14, first: 2 },
    { at: 0.5, forme: 'a', name: K('사이코부스트', 'Psycho Boost'), every: 2, dmg: 0.42, stagger: 1, pats: ['star', 'quad', 'far', 'checker|x', 'target'], type: 14,
      msg: K('테오키스가 어택폼으로 모습을 바꿨다! 공격이 한층 거세진다!', 'Deoxys changes into its Attack Forme! Its attacks grow fiercer!') },
  ],
  revive: { hp: 0.6, atk: 1.1, cap: 0.4, forme: 's', aura: '#ff8a5a',
    msg: K('테오키스가 쓰러지지 않는다! 스피드폼으로 바뀌어 다시 일어섰다! (공격이 잘 맞지 않는다)', 'Deoxys will not fall! It rises again in its Speed Forme! (attacks hit it less often)'),
    tele: [
      { name: K('사이코부스트', 'Psycho Boost'), every: 2, dmg: 0.4, stagger: 1, pats: ['ring|x', 'random', 'checker|cross', 'target|far'], type: 14, first: 2 },
    ] },
  say: [
    { who: 'narr', text: K('1943년, 우리 땅에서 처음 기록된 운석이 떨어진 고흥 두원. 레쿠쟈가 함께한 뒤, 그 들판에 붉은 별똥별이 또 하나 떨어졌다. 깨진 운석 속에서 무언가가 일어선다!', 'Duwon in Goheung, where the first meteorite on record in Korea fell in 1943. After Rayquaza joined you, another red shooting star fell on its fields. Something rises from the broken meteorite!') },
    { who: 386, name: K('테오키스', 'Deoxys'), text: K('……(우주에서 온 DNA 포켓몬이 레쿠쟈를 노려보며 몸을 바꾸기 시작한다!)', '......(The DNA Pokémon from space glares at Rayquaza and begins to change its body!)') },
    { who: 'partner', text: K('운석에서 나타난 테오키스야! 싸우는 도중에 모습을 바꾼대. 조심해!', 'It\'s Deoxys, out of the meteorite! It changes form in the middle of a fight. Careful!') }],
  after: [{ who: 386, name: K('테오키스', 'Deoxys'), text: K('……(테오키스의 몸에서 빛이 잦아들었다. 레쿠쟈를 바라보더니 조용히 고개를 끄덕인다.)', '......(The light in Deoxys\'s body fades. It looks at Rayquaza and quietly nods.)') }],
  join: K('테오키스가 너희 곁으로 내려왔다. 함께 가고 싶어 한다! (마을의 붉은 운석에서 모습을 바꿀 수 있다)', 'Deoxys comes down beside you. It wants to come along! (It can change Forme at the red meteorite in town)') };
const SKY = {
  skypillar: { name: K('하늘기둥', 'Sky Pillar'), tiles: T.crystal, floors: 2, lv: [58, 62], legend: true, mons: [333, 334, 357, 227, 22, 279, 337, 338, 343, 344], bgm: 'd_lake',
    tint: 'rgba(120,170,255,0.10)', boss: RAYQUAZA },
  duwon: { name: K('두원 운석터', 'Duwon Meteorite Site'), tiles: T.cliff, floors: 2, lv: [60, 64], legend: true, mons: [35, 36, 337, 338, 343, 344, 374, 375], bgm: 'd_mount2',
    tint: 'rgba(255,90,60,0.10)', boss: DEOXYS },
};
const SKY_NODES = [
  { id: 'skypillar', name: SKY.skypillar.name, lon: 127.73, lat: 35.34, d: 'skypillar' },
  { id: 'duwon', name: SKY.duwon.name, lon: 127.3, lat: 34.6, d: 'duwon', when: () => !challenge() && got(384) },
];
const METEOR = { id: 'meteor', sp: 386, name: K('붉은 운석', 'Red Meteorite'), x: 30, y: 9, role: 'meteor', when: () => got(386) };
// eras from 1950 on; seoulWon() tells whether 1950's battle for Seoul is behind the team (content.js)
export function addSkyLine(eras, seoulWon) {
  SKY_NODES[0].when = () => !challenge() && seoulWon();
  for (const e of eras) {
    Object.assign(e.dungeons, SKY);
    for (const nodes of e.nodesS ? [e.nodesS, e.nodesN] : [e.nodes]) nodes.push(...SKY_NODES);
    for (const npcs of e.south ? [e.south.npcs, e.north.npcs] : [e.npcs]) npcs.push(METEOR);
  }
}
