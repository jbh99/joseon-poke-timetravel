// Story content: eighteen eras from Goguryeo (612) to the Korean War (1953).
// The Joseon-era chapters (1392-1945) live here; earlier eras are in content_ancient.js, the war in content_war.js.
// NPC species ids come from the ROM's national dex; names are read from dex.json at runtime.

import { K, EN_EXTRA, CELEBI, T, SIG, SIG_AT1, SIG_AT2 } from './content_k.js';
import { ANCIENT, ANCIENT_QITEMS } from './content_ancient.js';
import { WAR, WAR_QITEMS, FACTIONS, FACTION_TALK, FACTION_PICK } from './content_war.js';
import { ERA_1905, ERA_1979, MODERN_QITEMS, addPostWar, addSkyLine, addFinale, spyLog } from './content_modern.js';
import { addTower } from './content_tower.js';
import { S } from './game.js';
export { FACTIONS, FACTION_TALK, FACTION_PICK };
export { EN_EXTRA, CELEBI, T };

export const STARTERS = [387, 390, 393];

// second page for Dialga / Palkia / Giratina: back up in Origin Forme with 2/3 HP, harder hits, faster double patterns
// (no Origin Forme sprites exist in Pearl or PMD Blue, so the dungeon draws it bigger inside an aura of `aura`)
// an Origin Forme second phase; `use`: its signature moves, two or three this time
function origin(aura, msg, name, type, pats, use) {
  return { hp: 2 / 3, atk: 1.3, cap: 0.42, form: K('오리진폼', 'Origin Forme'), aura, msg, sig: use && { use, at: SIG_AT2 },
    tele: [
      { name, every: 3, dmg: 0.42, stagger: 1, pats, type, first: 2 },
      { at: 0.5, name, every: 2, dmg: 0.5, stagger: 1, pats: [...pats, 'quad|target', 'random|cross'], type, summon: 1,
        msg: K('오리진폼의 힘이 폭주한다! 공격이 더욱 거세진다!', 'The Origin Forme\'s power runs wild! Its attacks grow fiercer still!') },
    ] };
}

export const QITEMS = {
  timber: { name: '궁궐 목재', desc: '경복궁을 지을 튼튼한 소나무 목재.' },
  hunmin: { name: '훈민정음 낱장', desc: '새 글자 스물여덟 자가 적힌 원고 낱장.' },
  plate: { name: '거북선 철판', desc: '거북선 등에 덮을 쇠못 박힌 철판.' },
  letter: { name: '의병 서찰', desc: '수군의 승전 소식을 적은 편지.' },
  rice_sack: { name: '군량미 자루', desc: '남한산성으로 옮길 쌀자루.' },
  firewood: { name: '땔감', desc: '혹한을 버틸 마른 장작.' },
  book: { name: '규장각 서책', desc: '정조 임금이 아끼던 책.' },
  uigwe: { name: '의궤 낱장', desc: '왕실 행사를 그림과 글로 기록한 책의 일부.' },
  newspaper: { name: '독립신문', desc: '1896년 창간된 한글 신문.' },
  cloth: { name: '태극기 천', desc: '태극기를 만들 흰 무명천.' },
  declaration: { name: '독립선언서', desc: '1919년 3월 1일 낭독된 선언서의 사본.' },
  malmoi: { name: '말모이 원고', desc: '우리말 사전을 만들려고 모은 낱말 카드 뭉치.' },
  supply: { name: '보급품 꾸러미', desc: '독립군에게 전할 식량과 옷가지.' },
  names: { name: K('이름 명부', 'Name Register'), desc: K('사람들의 본래 이름을 적어 둔 명부의 낱장.', 'A page of the register that keeps people\'s true names.') },
  lastpaper: { name: K('마지막 호 신문', 'Last Issue'), desc: K('1940년 8월 강제로 폐간된 신문의 마지막 호.', 'The final issue of a newspaper forced to close in August 1940.') },
};

const JOSEON = [
  // ------------------------------------------------------------------ 1
  {
    id: 1, year: 1392, years: '1392 – 1395', title: '조선 건국', sub: '새 나라, 새 도읍 한양',
    art: 'e1', artProps: ['palace'], town: {
      name: '한양', bgm: 'town01_d', bgmN: 'town01_n', biome: 'spring', landmark: 'palace',
      houses: ['hanok', 'choga', 'choga', 'hanok', 'choga', 'hanok', 'choga', 'hanok'], props: ['cherry', 'persimmon', 'maple', 'jars', 'logs', 'logs', 'lantern'],
    },
    world: 'road_a',
    intro: [
      '1392년 7월, 이성계가 개경에서 왕위에 올라 새 나라가 열렸다.',
      '이듬해 나라 이름을 "조선"이라 정하고, 1394년 도읍을 한양으로 옮겼다.',
      '한양에는 지금, 새 궁궐을 짓는 망치 소리가 울려 퍼지고 있다.',
    ],
    nodes: [
      { id: 'town', name: '한양', lon: 126.98, lat: 37.57 },
      { id: 'inwang', name: '인왕산 숲길', lon: 126.55, lat: 37.78, d: 'inwang' },
      { id: 'bugak', name: '북악산', lon: 127.38, lat: 37.98, d: 'bugak' },
      { mark: true, name: '개경', lon: 126.55, lat: 38.05, text: '1392년 7월 17일, 이성계가 개경 수창궁에서 즉위했다.' },
    ],
    dungeons: {
      inwang: { name: '인왕산 숲길', tiles: T.forest, floors: 4, lv: [4, 7], mons: [396, 399, 10, 13, 16, 19, 401, 165], bgm: 'road_c',
        boss: { sp: 217, lv: 10, bgm: 'ba_poke', say: [
          { who: 217, text: '그르르… 여긴 내 숲이다! 나무를 베어 가는 놈들은 용서 못 해!' },
          { who: 'partner', text: '궁궐을 지을 나무가 꼭 필요해. 진정시키고 이야기해 보자!' }],
        after: [{ who: 217, text: '…미안하다. 숲이 사라질까 봐 겁이 났어. 필요한 만큼만 가져가거라.' }] } },
      bugak: { name: '북악산', tiles: T.mountain, floors: 3, lv: [3, 6], mons: [16, 19, 74, 396, 399, 56], bgm: 'd_05' },
    },
    npcs: [
      { id: 'machoke', sp: 67, name: '목수 근육몬', x: 22, y: 15, say: [{ text: '경복궁은 백성들의 땀으로 지어지는 거라네.' }] },
      { id: 'bibarel', sp: 400, name: '비버통', x: 9, y: 16, wander: 2, say: [{ text: '도성 성곽(한양도성)도 곧 쌓는대요. 나무랑 돌이 엄청 필요해요!' }] },
      { id: 'alakazam', sp: 65, name: '서생 후딘', x: 27, y: 12, say: [{ text: '한양은 북악산을 등지고 한강을 앞에 둔 땅이지. 정도전 대감이 도성의 큰 틀을 짰다네.' }] },
      { id: 'eevee', sp: 133, name: '이브이', x: 14, y: 21, wander: 3, say: [{ text: '새 궁궐 이름이 뭐가 될까? 엄청 멋진 이름이었으면 좋겠다!' }] },
      { id: 'pidgey', sp: 16, name: '구구', x: 31, y: 19, wander: 2, say: [{ text: '구구! 개경에서 이사 온 집이 많아. 길이 아직 낯설어.' }] },
    ],
    main: [
      { do: 'talk', npc: 'machoke', log: '목수 근육몬과 이야기하자', say: [
        { who: 67, name: '목수 근육몬', text: '오, 낯선 얼굴이구먼! 마침 잘 왔네. 1394년, 임금님께서 도읍을 이곳 한양으로 옮기셨지.' },
        { who: 67, name: '목수 근육몬', text: '새 궁궐을 짓는데 인왕산에서 목재가 내려오질 않아. 숲 깊은 곳에서 링곰이 길을 막고 있다는군.' },
        { who: 'partner', text: '우리가 가 볼게요! 세계 지도에서 "인왕산 숲길"을 고르면 되겠다.' }] },
      { do: 'dungeon', d: 'inwang', log: '인왕산 숲길 깊은 곳의 링곰을 진정시키자' },
      { do: 'talk', npc: 'machoke', log: '근육몬에게 돌아가 소식을 전하자', say: [
        { who: 67, name: '목수 근육몬', text: '목재가 내려오고 있어! 자네들 덕분이야. 이제 궁궐을 완성할 수 있겠어!' }] },
    ],
    outro: [
      { who: 'narr', text: '1395년, 새 궁궐이 완성되었다. 정도전은 "큰 복을 누리라"는 뜻을 담아 이름을 "경복궁"이라 지었다.' },
      { who: 'narr', text: '이듬해에는 도성을 둘러싸는 한양도성도 쌓기 시작했다. 조선 500년의 도읍이 이렇게 태어났다.' },
    ],
    side: [
      { id: 'e1a', title: '북악산 약초 캐기', giver: '주막 럭키', kind: 'collect', item: 'herb', n: 3, d: 'bugak', reward: { money: 200, exp: 120 },
        desc: '궁궐 공사로 다친 일꾼이 많아요. 북악산에서 약초 3개를 캐다 주세요.' },
      { id: 'e1b', title: '길 잃은 아기 푸린', kind: 'rescue', sp: 39, floor: 2, d: 'bugak', reward: { money: 150, items: { sitrus: 1 }, exp: 150 },
        desc: '이사 오던 아기 푸린이 북악산 2층에서 길을 잃었대요. 찾아서 데려와 주세요!' },
      { id: 'e1c', title: '숲의 소란 잠재우기', kind: 'defeat', sp: 19, n: 4, d: 'inwang', reward: { money: 180, exp: 100 },
        desc: '인왕산 꼬렛들이 일꾼들의 주먹밥을 훔쳐 가요. 4마리만 혼내 주세요.' },
    ],
  },
  // ------------------------------------------------------------------ 2
  {
    id: 2, year: 1443, years: '1443 – 1446', title: '훈민정음', sub: '백성을 가르치는 바른 소리',
    art: 'e2', artProps: ['hanok_hall'], town: {
      name: '한양 · 집현전', bgm: 'town02_d', bgmN: 'town02_n', biome: 'spring', landmark: 'hanok_hall',
      houses: ['hanok', 'hanok', 'choga', 'hanok', 'hanok', 'choga', 'hanok', 'choga'], props: ['persimmon', 'cherry', 'bamboo', 'jars', 'lantern', 'board'],
    },
    world: 'road_b',
    intro: [
      '세종 임금 시대. 집현전 학자들과 과학자 장영실이 나라를 밝히고 있다.',
      '1441년 측우기로 비의 양을 재기 시작했고, 해시계 앙부일구와 물시계 자격루도 만들어졌다.',
      '그리고 1443년, 임금은 백성을 위한 새 글자를 만들었다.',
    ],
    nodes: [
      { id: 'town', name: '한양 · 집현전', lon: 126.98, lat: 37.57 },
      { id: 'library', name: '집현전 서고', lon: 127.32, lat: 37.86, d: 'library' },
      { id: 'gwanak', name: '관악산', lon: 126.92, lat: 37.18, d: 'gwanak' },
      { mark: true, name: '측우기', lon: 127.45, lat: 37.35, text: '1441년, 세계 최초의 측정용 우량계 측우기가 만들어졌다.' },
    ],
    dungeons: {
      library: { name: '집현전 서고', tiles: T.library, floors: 4, lv: [9, 13], mons: [201, 201, 63, 96, 177, 343, 436, 163], bgm: 'd_02',
        quest: { item: 'hunmin', perFloor: 1 },
        boss: { sp: 437, lv: 15, bgm: 'ba_gym', say: [
          { who: 437, text: '…글자는 귀한 사람만 아는 것이다… 백성에게 줄 수 없다…' },
          { who: 'partner', text: '아니야! 임금님은 누구나 쉽게 익히라고 이 글자를 만드셨어!' }],
        after: [{ who: 437, text: '…누구나 쉽게 쓰는 글자라… 종소리처럼 멀리 퍼지겠구나.' }] } },
      gwanak: { name: '관악산', tiles: T.hill, floors: 3, lv: [8, 12], mons: [74, 66, 56, 37, 77, 58], bgm: 'road_e' },
    },
    npcs: [
      { id: 'slowking', sp: 199, name: '학사 야도킹', x: 22, y: 15, say: [{ text: '"나라의 말이 중국과 달라 문자로 서로 통하지 아니하니…" 임금님의 뜻이 담긴 서문이라네.' }] },
      { id: 'magnemite', sp: 81, name: '장영실의 조수 코일', x: 27, y: 12, say: [{ text: '삐빗. 측우기, 앙부일구, 자격루. 장영실 님은 노비 출신이었지만 재능으로 인정받았다. 삐빗.' }] },
      { id: 'kadabra', sp: 64, name: '윤겔라', x: 10, y: 15, wander: 2, say: [{ text: '스물여덟 자만 알면 무엇이든 적을 수 있다니! 슬기로운 사람은 아침나절이 되기 전에 깨친대요.' }] },
      { id: 'buneary', sp: 427, name: '이어롤', x: 15, y: 21, wander: 3, say: [{ text: '"ㄱ"은 혀뿌리가 목구멍을 막는 모양을 본떠 만들었대!' }] },
      { id: 'hoothoot', sp: 163, name: '부우부', x: 32, y: 20, wander: 2, say: [{ text: '부우! 밤마다 집현전에 불이 꺼지질 않아. 학자들이 밤새 공부하나 봐.' }] },
    ],
    main: [
      { do: 'talk', npc: 'slowking', log: '집현전 학사 야도킹을 만나자', say: [
        { who: 199, name: '학사 야도킹', text: '큰일이네! 반포를 앞둔 "훈민정음" 원고 낱장이 서고 깊은 곳으로 흩어져 버렸어.' },
        { who: 199, name: '학사 야도킹', text: '서고에 사는 안농들이 글자 모양이 신기하다며 가져갔다지 뭔가. 각 층에서 낱장을 모아 주게!' }] },
      { do: 'dungeon', d: 'library', log: '집현전 서고에서 훈민정음 낱장을 모으고 가장 깊은 곳까지 가자' },
      { do: 'talk', npc: 'slowking', log: '야도킹에게 원고를 돌려주자', say: [
        { who: 199, name: '학사 야도킹', text: '오오, 원고가 모두 돌아왔어! 이제 온 백성에게 새 글자를 알릴 수 있겠네.' }] },
    ],
    outro: [
      { who: 'narr', text: '1446년, "훈민정음"이 세상에 반포되었다. "백성을 가르치는 바른 소리"라는 뜻이다.' },
      { who: 'narr', text: '자음 17자와 모음 11자, 스물여덟 자로 무엇이든 적을 수 있는 글자. 오늘날 우리가 쓰는 한글이다.' },
    ],
    side: [
      { id: 'e2a', title: '서고의 안농 진정시키기', kind: 'defeat', sp: 201, n: 6, d: 'library', reward: { money: 300, exp: 200 },
        desc: '흥분한 안농들이 책장을 어지럽히고 있어요. 6마리를 진정시켜 주세요.' },
      { id: 'e2b', title: '해시계 받침돌 찾기', kind: 'collect', item: 'stone', n: 4, d: 'gwanak', reward: { money: 250, items: { rice: 2 }, exp: 150 },
        desc: '앙부일구를 고정할 돌이 필요해요. 관악산에서 돌팔매용 돌 4개를 모아 주세요.' },
      { id: 'e2c', title: '관악산의 아기 식스테일', kind: 'rescue', sp: 37, floor: 3, d: 'gwanak', reward: { money: 220, items: { sitrus: 1 }, exp: 200 },
        desc: '불의 산이라 불리는 관악산 3층에서 아기 식스테일이 떨고 있대요.' },
    ],
  },
  // ------------------------------------------------------------------ 3
  {
    id: 3, year: 1592, years: '1592 – 1598', title: '임진왜란', sub: '바다를 지킨 수군',
    art: 'e3', artProps: ['geobukseon', 'panokseon'], town: {
      name: '여수 · 전라좌수영', bgm: 'city02_d', bgmN: 'city02_n', biome: 'coast', landmark: 'gate',
      houses: ['hanok', 'choga', 'choga', 'hanok', 'choga', 'hanok'], props: ['maple', 'logs', 'logs', 'jars', 'lantern', 'crates'],
      ships: ['geobukseon', 'panokseon', 'boat'],
    },
    world: 'road_d',
    intro: [
      '1592년 4월 13일, 일본군이 부산에 상륙하며 7년에 걸친 전쟁, 임진왜란이 시작되었다.',
      '육지에서는 의병이 일어났고, 바다에서는 전라좌수사 이순신이 수군을 이끌었다.',
      '여수 전라좌수영에서는 거북선이 바다로 나갈 준비를 하고 있다.',
    ],
    nodes: [
      { id: 'town', name: '여수 · 전라좌수영', lon: 127.66, lat: 34.78 },
      { id: 'hansan', name: '한산도 앞바다', lon: 128.48, lat: 34.6, d: 'hansan' },
      { id: 'uldol', name: '울돌목', lon: 126.28, lat: 34.62, d: 'uldol' },
      { id: 'usuyeong', name: K('전라 우수영', 'Jeolla Right Naval Base'), lon: 126.45, lat: 35.05, d: 'usuyeong' },
      { id: 'seacave', name: '여수 해안 동굴', lon: 127.75, lat: 34.36, d: 'seacave' },
      { mark: true, name: '부산', lon: 129.08, lat: 35.18, text: '1592년 4월 13일, 일본군이 부산에 상륙했다.' },
      { mark: true, name: '행주산성', lon: 126.82, lat: 37.6, text: '1593년, 권율 장군과 백성들이 행주산성에서 크게 이겼다.' },
    ],
    dungeons: {
      hansan: { name: '한산도 앞바다', tiles: T.sea, floors: 4, lv: [13, 17], mons: [72, 118, 98, 318, 422, 456, 129, 116], bgm: 'naminori',
        boss: { sp: 130, lv: 21, bgm: 'ba_ginga', say: [
          { who: 130, text: '크아아앙! 포성과 불길에 놀란 갸라도스가 바닷길을 막고 날뛰고 있다!' },
          { who: 'partner', text: '수군의 배가 지나갈 수 있게 길을 열어야 해!' }],
        after: [{ who: 130, text: '…크르르. 바다가 조용해지면… 다시 깊은 곳으로 돌아가겠다.' }] } },
      uldol: { name: '울돌목', tiles: T.strait, floors: 4, lv: [16, 20], mons: [73, 99, 319, 117, 171, 223], bgm: 'd_04',
        boss: { sp: 73, lv: 24, bgm: 'ba_tenno', say: [
          { who: 73, text: '소용돌이치는 물살 속에서 독파리가 촉수를 휘두른다!' },
          { who: 'partner', text: '울돌목의 물살은 거세지만, 이 길을 알면 이길 수 있어!' }],
        after: [{ who: 73, text: '…물살이 바뀌었다. 이제 길을 비켜 주마.' }] } },
      seacave: { name: '여수 해안 동굴', tiles: T.cave, floors: 3, lv: [12, 16], mons: [41, 74, 98, 72, 90], bgm: 'd_03' },
      // Azelf keeps the Right Naval Base, where Yi Sun-sin told his men "seek death and you will live" the day before
      // Myeongnyang. Each legend has a place of its own: no map holds two.
      usuyeong: { name: K('전라 우수영', 'Jeolla Right Naval Base'), tiles: T.fort, floors: 3, lv: [15, 19], mons: [72, 98, 278, 307, 308, 66], bgm: 'd_lake', legend: true,
        tint: 'rgba(90,150,255,0.08)',
        boss: { sp: 482, lv: 23, lvUp: 3, hp: 1.8, atk: 0.85, bgm: 'ba_secret1', moves: [93, 326],
          tele: { name: '의지의 섬광', every: 4, dmg: 0.3, pats: ['cross', 'x', 'target'], type: 14 },
          say: [
            { who: 482, name: '아그놈', text: '…멈춰라. 열세 척의 배로 백서른 척에 맞서겠다고? 그 의지가 진짜인지 시험하겠다.' },
            { who: 'partner', text: '의지의 신 아그놈이야! 물러서지 않는 마음을 보여 주자!' }],
          after: [{ who: 482, name: '아그놈', text: '…꺾이지 않는 의지, 확인했다. "죽고자 하면 살 것이다"… 그 말을 잊지 마라.' }],
          join: '아그놈이 너희의 의지에 끌린 듯 곁으로 다가왔다. 함께 가고 싶어 한다!' } },
    },
    npcs: [
      { id: 'kingdra', sp: 230, name: '수군 군관 킹드라', x: 22, y: 15, say: [{ text: '장군께서는 바다의 물길과 물때를 누구보다 잘 아시지.' }] },
      { id: 'bibarel3', sp: 400, name: '조선공 비버통', x: 8, y: 16, wander: 1, say: [{ text: '거북선 등에는 쇠못을 촘촘히 박아 적이 함부로 올라타지 못하게 했지요!' }] },
      { id: 'machamp', sp: 68, name: '의병 괴력몬', x: 30, y: 12, say: [{ text: '경상도에서는 곽재우 장군이 붉은 옷을 입고 의병을 이끈다더군. 홍의장군이라 부르지!' }] },
      { id: 'wingull', sp: 278, name: '갈모매', x: 14, y: 19, wander: 3, say: [{ text: '끼룩! 바다 위 판옥선은 2층 구조라 노 젓는 사람이 안전하대!' }] },
    ],
    main: [
      { do: 'talk', npc: 'kingdra', log: '수군 군관 킹드라와 이야기하자', say: [
        { who: 230, name: '수군 군관 킹드라', text: '전쟁 소식에 바다 포켓몬들이 겁에 질려 날뛰고 있소. 특히 한산도 앞바다의 갸라도스 무리가 문제요.' },
        { who: 230, name: '수군 군관 킹드라', text: '장군의 함대가 나아갈 물길을 열어 주시오!' }] },
      { do: 'dungeon', d: 'hansan', log: '한산도 앞바다의 갸라도스를 진정시키자' },
      { do: 'scene', say: [
        { who: 'narr', text: '1592년 7월 8일, 한산도 대첩. 이순신은 학이 날개를 펼친 듯한 "학익진"으로 적 함대를 크게 무찔렀다.' }] },
      { do: 'talk', npc: 'kingdra', log: '킹드라에게 다음 임무를 듣자', say: [
        { who: 230, name: '수군 군관 킹드라', text: '…1597년, 조선 수군은 큰 패배로 배를 거의 잃었소. 장군께 남은 배는 단 열세 척.' },
        { who: 230, name: '수군 군관 킹드라', text: '장군은 물살이 거센 울돌목에서 싸우기로 하셨소. 그 물길을 먼저 살펴 주시오!' }] },
      { do: 'dungeon', d: 'uldol', log: '울돌목의 거센 물살을 헤치고 가장 깊은 곳까지 가자' },
      { do: 'talk', npc: 'kingdra', log: '킹드라에게 돌아가자', say: [
        { who: 230, name: '수군 군관 킹드라', text: '"신에게는 아직 열두 척의 배가 있습니다." 장군의 말씀대로, 우리는 끝까지 바다를 지켰소.' }] },
    ],
    outro: [
      { who: 'narr', text: '1597년 9월 16일, 명량 해전. 열세 척의 배로 백서른 척이 넘는 적선을 막아 냈다.' },
      { who: 'narr', text: '1598년 노량 해전에서 이순신은 "나의 죽음을 알리지 말라"는 말을 남기고 전사했다. 7년 전쟁은 그렇게 끝이 났다.' },
    ],
    side: [
      { id: 'e3a', title: '거북선 철판 모으기', kind: 'collect', item: 'plate', n: 3, d: 'seacave', reward: { money: 400, exp: 300 },
        desc: '조선공 비버통이 거북선 등에 덮을 철판을 찾고 있어요. 해안 동굴에서 3장을 모아 주세요.' },
      { id: 'e3b', title: '의병에게 서찰 전하기', kind: 'deliver', item: 'letter', to: 'machamp', reward: { money: 300, items: { rice: 2 }, exp: 200 },
        desc: '수군의 승전 소식이 담긴 서찰을 의병 괴력몬에게 전해 주세요. (수락하면 서찰을 받습니다)' },
      { id: 'e3c', title: '샤프니아 쫓아내기', kind: 'defeat', sp: 318, n: 4, d: 'hansan', reward: { money: 350, exp: 250 },
        desc: '고기잡이배를 노리는 샤프니아 4마리를 쫓아내 주세요.' },
    ],
  },
  // ------------------------------------------------------------------ 4
  {
    id: 4, year: 1636, years: '1636 – 1637', title: '병자호란', sub: '남한산성의 겨울',
    art: 'e4', artProps: ['fortgate'], town: {
      name: '남한산성', bgm: 'city09_d', bgmN: 'city09_n', biome: 'snow', landmark: 'fortgate', walls: true,
      houses: ['hanok_snow', 'hanok_snow', 'hanok_snow', 'hanok_snow', 'hanok_snow', 'hanok_snow'], props: ['snowpine', 'snowpine', 'baretree', 'pagoda', 'logs', 'jars'],
    },
    world: 'road_snow',
    intro: [
      '1636년 12월, 청나라 군대가 꽁꽁 언 압록강을 건너 쳐들어왔다. 병자호란이다.',
      '임금 인조는 강화도로 가는 길이 막히자 남한산성으로 피했다.',
      '혹독한 추위 속에서 산성의 47일이 시작되었다.',
    ],
    nodes: [
      { id: 'town', name: '남한산성', lon: 127.18, lat: 37.48 },
      { id: 'blizzard', name: '눈보라 산길', lon: 127.58, lat: 37.78, d: 'blizzard' },
      { id: 'outer', name: '산성 외곽', lon: 127.45, lat: 37.18, d: 'outer' },
      { mark: true, name: '압록강', lon: 124.75, lat: 40.25, text: '1636년 12월, 청군이 얼어붙은 압록강을 건넜다.' },
      { mark: true, name: '강화도', lon: 126.45, lat: 37.72, text: '왕실 가족이 피란했던 강화도는 1637년 1월에 함락되었다.' },
      { id: 'icetemple', name: '얼음 신전', lon: 128.05, lat: 37.55, d: 'icetemple' },
    ],
    dungeons: {
      blizzard: { name: '눈보라 산길', tiles: T.snow, floors: 4, lv: [18, 22], mons: [220, 361, 459, 215, 124, 225], bgm: 'road_snow',
        rescue: { sp: 175, floor: 2, name: '피란 온 토게피' },
        boss: { sp: 473, lv: 26, bgm: 'ba_secret1', say: [
          { who: 473, text: '부오오오…! 눈보라에 길을 잃은 맘모꾸리가 산길을 막고 있다!' },
          { who: 'partner', text: '이대로면 피란민들이 산성에 닿지 못해!' }],
        after: [{ who: 473, text: '…따뜻한 산성의 불빛이 보인다. 나도 이제 길을 찾겠다.' }] } },
      outer: { name: '산성 외곽', tiles: T.fortsnow, floors: 3, lv: [17, 21], mons: [220, 459, 215, 41, 42, 361], bgm: 'd_lake' },
      icetemple: { name: '얼음 신전', tiles: T.fortsnow, floors: 3, lv: [19, 23], mons: [220, 361, 215, 459, 225, 124], bgm: 'd_ice', legend: true,
        tint: 'rgba(120,170,255,0.10)',
        // Suicune, the north wind's incarnation, over a frozen spring (Regigigas waits for the Regi line after 1945)
        boss: { sp: 245, lv: 32, lvMin: 24, lvUp: 4, hp: 2.2, atk: 0.9, bgm: 'ba_secret2', moves: [62, 61, 326, 59],
          tele: { name: K('오로라빔', 'Aurora Beam'), every: 4, dmg: 0.33, pats: ['near', 'rows', 'cols', 'ring'], type: 15 },
          say: [
            { who: 'narr', text: K('얼음 신전 가장 깊은 곳, 얼어붙은 샘 위로 차가운 북풍이 모여들었다!', 'In the deepest hall of the Ice Temple, a cold north wind gathers over a frozen spring!') },
            { who: 245, name: K('스이쿤', 'Suicune'), text: K('……(북풍을 두른 푸른 짐승이 샘 위에 조용히 내려섰다. 맑은 눈이 너희를 꿰뚫어 본다)', '......(A blue beast cloaked in the north wind alights on the spring. Its clear eyes see right through you)') },
            { who: 'partner', text: K('북풍의 화신 스이쿤이야! 이 혹독한 겨울을 견디는 우리 마음을 보여 주자!', 'It\'s Suicune, the incarnation of the north wind! Let\'s show it the hearts that endure this bitter winter!') }],
          after: [{ who: 245, name: K('스이쿤', 'Suicune'), text: K('……(스이쿤이 북풍을 거두었다. 얼어붙었던 샘에서 맑은 물이 다시 흐르기 시작한다)', '......(Suicune calls back the north wind. Clear water begins to flow from the frozen spring again)') }],
          join: K('스이쿤이 북풍처럼 가볍게 곁으로 다가왔다. 함께 가고 싶어 한다!', 'Suicune comes to your side, light as the north wind. It wants to come along!') } },
    },
    npcs: [
      { id: 'lucario', sp: 448, name: '수비대장 루카리오', x: 22, y: 15, say: [{ text: '산성의 성벽은 험한 산세를 따라 쌓여 있다. 쉽게 무너지지 않아.' }] },
      { id: 'snorlax', sp: 143, name: '군량 창고지기 잠만보', x: 9, y: 16, say: [{ text: '쿨… 쌀이 바닥나고 있어… 배고파…' }] },
      { id: 'slowbro', sp: 80, name: '야도란 대감', x: 29, y: 12, say: [{ text: '화친하여 백성을 살리자는 최명길 대감, 끝까지 싸우자는 김상헌 대감… 둘 다 나라를 위한 마음이겠지.' }] },
      { id: 'swinub', sp: 220, name: '꾸꾸리', x: 15, y: 21, wander: 3, say: [{ text: '꾸꾸! 눈이 너무 많이 와서 코끝이 얼었어.' }] },
    ],
    main: [
      { do: 'talk', npc: 'lucario', log: '수비대장 루카리오에게 상황을 듣자', say: [
        { who: 448, name: '수비대장 루카리오', text: '산성으로 오는 피란민들이 눈보라 산길에서 발이 묶였다. 길을 막은 큰 포켓몬도 있다고 한다.' },
        { who: 448, name: '수비대장 루카리오', text: '산길 2층 어딘가에 아기 토게피가 갇혀 있다는 소식도 있다. 꼭 구해 다오.' }] },
      { do: 'dungeon', d: 'blizzard', log: '눈보라 산길에서 피란민을 구하고 길을 열자' },
      { do: 'talk', npc: 'snorlax', log: '창고지기 잠만보에게 군량을 전하자', say: [
        { who: 143, name: '군량 창고지기 잠만보', text: '길이 열려서 쌀이 조금 들어왔어. 다들 나눠 먹자… 쿨.' }] },
      { do: 'talk', npc: 'lucario', log: '루카리오에게 돌아가자', say: [
        { who: 448, name: '수비대장 루카리오', text: '…해가 바뀌었다. 성 안의 식량도, 기운도 다해 간다.' }] },
    ],
    outro: [
      { who: 'narr', text: '1637년 1월 30일, 47일 만에 산성 문이 열렸다. 인조는 삼전도에서 청 태종에게 항복의 예를 올려야 했다.' },
      { who: 'narr', text: '수많은 백성이 끌려가는 아픔을 겪었다. 그래도 사람들은 다시 땅을 일구고 나라를 일으켜 세웠다.' },
    ],
    side: [
      { id: 'e4a', title: '땔감 모으기', kind: 'collect', item: 'firewood', n: 3, d: 'outer', reward: { money: 500, exp: 400 },
        desc: '혹한에 얼어붙은 피란민들을 위해 산성 외곽에서 땔감 3개를 모아 주세요.' },
      { id: 'e4b', title: '군량미 운반', kind: 'collect', item: 'rice_sack', n: 2, d: 'blizzard', reward: { money: 450, items: { rice: 3 }, exp: 350 },
        desc: '눈보라 산길에 버려진 군량미 자루 2개를 찾아 주세요.' },
      { id: 'e4c', title: '포푸니 쫓기', kind: 'defeat', sp: 215, n: 4, d: 'outer', reward: { money: 400, exp: 300 },
        desc: '창고의 곡식을 노리는 포푸니 4마리를 쫓아 주세요.' },
    ],
  },
  // ------------------------------------------------------------------ 5
  {
    id: 5, year: 1794, years: '1794 – 1796', title: '수원 화성', sub: '정조의 꿈, 실학의 성',
    art: 'e5', artProps: [], town: {
      name: '수원 화성', bgm: 'city05_d', bgmN: 'city05_n', biome: 'autumn', landmark: 'fortgate', walls: true,
      houses: ['hanok', 'hanok', 'hanok', 'choga', 'hanok', 'hanok', 'choga', 'hanok'], props: ['maple', 'persimmon', 'logs', 'logs', 'jars', 'lantern', 'board'],
    },
    world: 'road_e',
    intro: [
      '1776년 즉위한 정조는 학문 연구 기관인 규장각을 세우고 개혁을 펼쳤다.',
      '1794년 1월, 정조는 수원에 새 성, 화성을 쌓기 시작했다.',
      '실학자 정약용이 고안한 거중기가 무거운 돌을 번쩍번쩍 들어 올린다.',
    ],
    nodes: [
      { id: 'town', name: '수원 화성', lon: 127.01, lat: 37.28 },
      { id: 'quarry', name: '숙지산 채석장', lon: 126.62, lat: 37.08, d: 'quarry' },
      { id: 'gwanggyo', name: '광교산', lon: 127.42, lat: 37.12, d: 'gwanggyo' },
      { id: 'kyujanggak', name: K('규장각', 'Kyujanggak'), lon: 127.45, lat: 37.82, d: 'kyujanggak' },
      { mark: true, name: '한양', lon: 126.98, lat: 37.62, text: '1795년 윤2월, 정조는 어머니 혜경궁 홍씨를 모시고 화성으로 행차했다(을묘원행).' },
    ],
    dungeons: {
      quarry: { name: '숙지산 채석장', tiles: T.quarry, floors: 4, lv: [23, 27], mons: [74, 75, 95, 111, 246, 304, 66, 67], bgm: 'd_06',
        boss: { sp: 464, lv: 31, bgm: 'ba_gym', say: [
          { who: 464, text: '쿠웅! 돌 깨는 소리에 화가 난 거대코뿌리가 채석장을 막아섰다!' },
          { who: 'partner', text: '필요한 만큼만 캐고, 산은 소중히 할게! 그러니 길을 비켜 줘!' }],
        after: [{ who: 464, text: '…약속을 지킨다면, 돌을 가져가도 좋다.' }] } },
      gwanggyo: { name: '광교산', tiles: T.autumn, floors: 3, lv: [22, 26], mons: [163, 164, 37, 190, 285, 286, 203], bgm: 'road_f' },
      // Uxie keeps King Jeongjo's royal library: a book from it taught Jeong Yak-yong to build the crane
      kyujanggak: { name: K('규장각', 'Kyujanggak'), tiles: T.library, floors: 3, lv: [22, 26], mons: [63, 64, 201, 177, 178, 436], bgm: 'd_lake', legend: true,
        tint: 'rgba(240,210,120,0.08)',
        boss: { sp: 480, lv: 30, lvUp: 3, hp: 1.8, atk: 0.85, bgm: 'ba_secret1', moves: [326, 93, 248],
          tele: { name: '지식의 봉인', every: 4, dmg: 0.3, pats: ['checker', 'rows', 'near', 'cols'], type: 14 },
          say: [
            { who: 480, name: '유크시', text: K('…규장각의 책 한 권이 거중기가 되어 무거운 돌을 들어 올렸지. 사람은 지식으로 산도 옮기는구나.', '...A single book from this library became the crane that lifts the heavy stones. With knowledge, people even move mountains.') },
            { who: 480, name: '유크시', text: '그 지식이 바르게 쓰이는지, 내가 시험하겠다.' },
            { who: 'partner', text: '지식의 신 유크시! 백성을 위한 학문이라는 걸 보여 주자!' }],
          after: [{ who: 480, name: '유크시', text: K('…백성의 삶을 위한 지식이었군. 기록하고 기억하라. 그 기록이 훗날 화성을 다시 세울 것이다.', '...So it was knowledge for the people\'s lives. Record it and remember. One day those records will rebuild Hwaseong.') }],
          join: '유크시가 눈을 감은 채 조용히 곁에 내려앉았다. 함께 배우고 싶은 듯하다!' } },
    },
    npcs: [
      { id: 'machamp5', sp: 68, name: '석수 괴력몬', x: 22, y: 15, say: [{ text: '거중기 하나면 장정 수십 명이 할 일을 해낸다네!' }] },
      { id: 'alakazam5', sp: 65, name: '실학자 후딘', x: 29, y: 12, say: [{ text: '정약용 선생은 도르래의 원리로 거중기를 만드셨지. 학문은 백성의 삶에 쓰여야 하네.' }] },
      { id: 'ponyta', sp: 77, name: '포니타', x: 10, y: 15, wander: 2, say: [{ text: '임금님 행차 때 배다리를 놓아 한강을 건넜대요! 배를 줄지어 엮어 다리를 만든 거래요.' }] },
      { id: 'chatot5', sp: 441, name: '저잣거리 페라페', x: 16, y: 21, wander: 2, say: [{ text: '화성 공사 일꾼들은 품삯을 받고 일한대! 억지로 끌려온 게 아니래!' }] },
    ],
    main: [
      { do: 'talk', npc: 'machamp5', log: '석수 괴력몬에게 이야기를 듣자', say: [
        { who: 68, name: '석수 괴력몬', text: '성벽에 쓸 돌을 숙지산에서 캐는데, 거대코뿌리가 화가 나서 채석장을 막아 버렸어.' },
        { who: 68, name: '석수 괴력몬', text: '이대로면 공사가 멈춘다네. 좀 도와주겠나?' }] },
      { do: 'dungeon', d: 'quarry', log: '숙지산 채석장의 거대코뿌리를 진정시키자' },
      { do: 'talk', npc: 'machamp5', log: '괴력몬에게 돌아가자', say: [
        { who: 68, name: '석수 괴력몬', text: '돌이 다시 내려온다! 거중기야, 힘내라!' }] },
    ],
    outro: [
      { who: 'narr', text: '1796년 9월, 10년을 예상했던 공사가 2년 9개월 만에 끝났다. 화성은 동서양의 축성 기술을 함께 담은 성이 되었다.' },
      { who: 'narr', text: '공사의 모든 과정을 기록한 "화성성역의궤" 덕분에 훗날 화성을 되살릴 수 있었고, 1997년 유네스코 세계유산이 되었다.' },
    ],
    side: [
      { id: 'e5a', title: '규장각 서책 찾기', kind: 'collect', item: 'book', n: 3, d: 'gwanggyo', reward: { money: 700, exp: 600 },
        desc: '실학자 후딘이 광교산에 떨어뜨린 규장각 서책 3권을 찾아 주세요.' },
      { id: 'e5b', title: '길 잃은 아기 깜지곰', kind: 'rescue', sp: 216, floor: 2, d: 'gwanggyo', reward: { money: 600, items: { ginseng: 1 }, exp: 500 },
        desc: '광교산 2층에서 아기 깜지곰이 엄마를 찾고 있어요.' },
      { id: 'e5c', title: '꼬마돌 무리 진정시키기', kind: 'defeat', sp: 74, n: 5, d: 'quarry', reward: { money: 650, exp: 500 },
        desc: '채석장에서 굴러다니는 꼬마돌 5마리를 진정시켜 주세요.' },
    ],
  },
  // ------------------------------------------------------------------ 6
  {
    id: 6, year: 1866, years: '1866 – 1871', title: '병인양요 · 신미양요', sub: '강화도를 지켜라',
    art: 'e6', artProps: ['wallseg', 'wallseg', 'wallseg'], town: {
      name: '강화도', bgm: 'city07_d', bgmN: 'city07_n', biome: 'coast', landmark: 'hanok_hall', walls: true,
      houses: ['hanok', 'choga', 'hanok', 'choga', 'hanok', 'choga'], props: ['maple', 'jars', 'logs', 'lantern', 'crates', 'pagoda'],
      ships: ['boat', 'boat'],
    },
    world: 'road_c',
    intro: [
      '19세기, 서양의 배들이 조선의 바다에 나타나기 시작했다.',
      '1866년, 프랑스 함대가 강화도를 침략했다. 병인양요다.',
      '강화도에는 왕실의 귀한 기록을 보관하는 외규장각이 있다.',
    ],
    nodes: [
      { id: 'town', name: '강화도', lon: 126.48, lat: 37.72 },
      { id: 'jeongjok', name: '정족산성', lon: 126.12, lat: 37.48, d: 'jeongjok' },
      { id: 'gwangseong', name: '광성보', lon: 126.88, lat: 37.62, d: 'gwangseong' },
      { id: 'tidal', name: '강화 갯벌', lon: 126.18, lat: 37.95, d: 'tidal' },
      { id: 'moonisle', name: '달빛 섬', lon: 125.82, lat: 37.62, d: 'moonisle' },
    ],
    dungeons: {
      jeongjok: { name: '정족산성', tiles: T.fort, floors: 4, lv: [27, 31], mons: [81, 82, 304, 305, 436, 227, 66], bgm: 'd_01',
        quest: { item: 'uigwe', perFloor: 1 },
        boss: { sp: 376, lv: 35, bgm: 'ba_tenno', say: [
          { who: 376, text: '철컹… 철컹… 포성에 혼란에 빠진 메타그로스가 산성 길을 막아섰다!' },
          { who: 'partner', text: '양헌수 장군의 부대가 산성을 지키고 있어. 우리도 힘을 보태자!' }],
        after: [{ who: 376, text: '…계산 완료. 이곳은 지켜야 할 장소다. 길을 열겠다.' }] } },
      gwangseong: { name: '광성보', tiles: T.bastion, floors: 4, lv: [29, 33], mons: [81, 82, 100, 101, 125, 227], bgm: 'road_d',
        boss: { sp: 462, lv: 37, bgm: 'ba_rival', say: [
          { who: 462, text: '지지지직! 쇳덩이 배의 굉음에 자포코일이 폭주하고 있다!' },
          { who: 'partner', text: '어재연 장군과 병사들이 끝까지 지킨 곳이야. 우리도 물러서지 않아!' }],
        after: [{ who: 462, text: '…지직. 소음이 멎었다. 고맙다.' }] } },
      tidal: { name: '강화 갯벌', tiles: T.flat, floors: 3, lv: [26, 30], mons: [98, 99, 422, 423, 278, 279], bgm: 'd_safari' },
      moonisle: { name: '달빛 섬', tiles: T.sea, floors: 3, lv: [27, 31], mons: [278, 279, 422, 120, 223, 98], bgm: 'd_lake', legend: true,
        tint: 'rgba(40,50,140,0.20)',
        boss: { sp: 488, lv: 40, lvMin: 32, lvUp: 4, hp: 2.0, atk: 0.9, bgm: 'ba_secret2', moves: [94, 62, 427],
          tele: { name: '초승달 빛', every: 4, dmg: 0.33, pats: ['ring', 'checker', 'x', 'far'], type: 14 },
          say: [
            { who: 'narr', text: '바다 위로 둥근 달이 떠오르자, 갯바위 위에 은빛 날개가 내려앉았다.' },
            { who: 488, text: '…낯선 시간에서 온 아이들. 너희 꿈은 어떤 빛깔이지?' },
            { who: 'partner', text: '초승달의 전설, 크레세리아야! 달빛 공격을 조심하자!' }],
          after: [{ who: 488, text: '…맑은 꿈이구나. 그 꿈이 악몽에 물들지 않도록, 나도 함께 지켜 줄게.' }] } },
    },
    npcs: [
      { id: 'gallade', sp: 475, name: '수비군 엘레이드', x: 22, y: 15, say: [{ text: '이 섬은 예로부터 나라의 보물을 지키는 마지막 보루였다.' }] },
      { id: 'xatu', sp: 178, name: '외규장각 사서 네이티오', x: 29, y: 12, say: [{ text: '…의궤는 왕실 행사를 그림과 글로 낱낱이 기록한 책. 세상에 둘도 없는 보물이지.' }] },
      { id: 'shellos', sp: 422, name: '깝질무', x: 10, y: 16, wander: 2, say: [{ text: '갯벌은 썰물 때 엄청 넓어져! 큰 배는 함부로 못 들어와!' }] },
      { id: 'pelipper', sp: 279, name: '패리퍼', x: 15, y: 21, wander: 3, say: [{ text: '1871년에 세워진 척화비에는 서양과 화친하지 말라고 적혀 있대.' }] },
    ],
    main: [
      { do: 'talk', npc: 'gallade', log: '수비군 엘레이드를 만나자', say: [
        { who: 475, name: '수비군 엘레이드', text: '프랑스 함대가 강화성을 점령했다. 외규장각의 의궤가 위험해!' },
        { who: 475, name: '수비군 엘레이드', text: '양헌수 장군이 정족산성에 몰래 들어가 매복했다. 산성으로 가는 길에 흩어진 의궤 낱장도 챙겨 다오!' }] },
      { do: 'dungeon', d: 'jeongjok', log: '정족산성으로 가며 흩어진 의궤 낱장을 모으자' },
      { do: 'scene', say: [
        { who: 'narr', text: '양헌수 장군의 부대는 정족산성에서 프랑스군을 물리쳤다. 그러나 물러가던 프랑스군은 외규장각에 불을 지르고 의궤 수백 권을 가져갔다.' },
        { who: 'narr', text: '빼앗긴 의궤는 145년이 지난 2011년, 영구 대여라는 형식으로 고국에 돌아온다.' }] },
      { do: 'talk', npc: 'gallade', log: '엘레이드에게 다음 소식을 듣자', say: [
        { who: 475, name: '수비군 엘레이드', text: '…1871년, 이번에는 미국 함대가 왔다. 신미양요다. 어재연 장군이 광성보를 지키고 있다!' }] },
      { do: 'dungeon', d: 'gwangseong', log: '광성보로 가서 수비군을 돕자' },
      { do: 'talk', npc: 'gallade', log: '엘레이드에게 돌아가자', say: [
        { who: 475, name: '수비군 엘레이드', text: '광성보의 병사들은 마지막까지 물러서지 않았다. 미국 함대는 결국 돌아갔다.' }] },
    ],
    outro: [
      { who: 'narr', text: '광성보 전투에서 조선군은 큰 희생을 치렀다. 미군이 가져간 어재연 장군의 "수(帥)"자 깃발은 2007년 장기 대여로 돌아왔다.' },
      { who: 'narr', text: '그리고 1876년, 조선은 이 강화도에서 일본과 불평등한 조약을 맺으며 문을 열게 된다.' },
    ],
    side: [
      { id: 'e6a', title: '갯벌의 아기 깝질무', kind: 'rescue', sp: 422, floor: 2, d: 'tidal', reward: { money: 900, items: { ginseng: 1 }, exp: 800 },
        desc: '밀물에 휩쓸린 아기 깝질무가 갯벌 2층에 있어요.' },
      { id: 'e6b', title: '코일 무리 진정시키기', kind: 'defeat', sp: 81, n: 5, d: 'gwangseong', reward: { money: 850, exp: 700 },
        desc: '포성에 놀라 전기를 뿜는 코일 5마리를 진정시켜 주세요.' },
      { id: 'e6c', title: '갯벌 돌 모으기', kind: 'collect', item: 'stone', n: 5, d: 'tidal', reward: { money: 700, items: { sitrus: 2 }, exp: 600 },
        desc: '성벽을 보수할 돌 5개를 갯벌에서 모아 주세요.' },
    ],
  },
  // ------------------------------------------------------------------ 7
  {
    id: 7, year: 1887, years: '1887 – 1899', title: '대한제국', sub: '전깃불과 전차의 시대',
    art: 'e7', artProps: ['western'], town: {
      name: '한성', bgm: 'city01_d', bgmN: 'city01_n', biome: 'modern', landmark: 'palace',
      houses: ['western', 'hanok', 'hanok', 'western', 'hanok', 'choga', 'hanok', 'western'], props: ['pole', 'pole', 'lamp', 'lamp', 'rickshaw', 'persimmon', 'tram'],
    },
    world: 'road_f',
    intro: [
      '1887년, 경복궁 건청궁에 조선 최초의 전깃불이 켜졌다.',
      '1894년 동학 농민 운동, 1895년 명성황후 시해 사건(을미사변)… 나라는 거센 소용돌이 속에 있었다.',
      '1896년 한글로 된 "독립신문"이 창간되고, 1897년 독립문이 세워졌다.',
    ],
    nodes: [
      { id: 'town', name: '한성', lon: 126.98, lat: 37.57 },
      { id: 'plant', name: '건청궁 발전소', lon: 127.34, lat: 37.86, d: 'plant' },
      { id: 'tramway', name: '종로 전찻길', lon: 127.02, lat: 37.18, d: 'tramway' },
      { mark: true, name: '우금치', lon: 127.1, lat: 36.45, text: '1894년 11월, 전봉준이 이끈 동학 농민군이 공주 우금치에서 싸웠다.' },
      { mark: true, name: '제물포', lon: 126.62, lat: 37.47, text: '1899년, 서울과 제물포를 잇는 경인선 철도가 놓이기 시작했다.' },
      { id: 'clocktower', name: K('소원의 시계탑', 'Wishing Clock Tower'), lon: 127.62, lat: 37.22, d: 'clocktower' },
    ],
    dungeons: {
      plant: { name: '건청궁 발전소', tiles: T.plant, floors: 4, lv: [31, 35], mons: [81, 82, 100, 101, 125, 239, 403, 404, 417], bgm: 'd_ginlobby',
        boss: { sp: 466, lv: 39, bgm: 'ba_ginga', say: [
          { who: 466, text: '파지지직! 과열된 발전기 속에서 에레키블이 전기를 마구 뿜어낸다!' },
          { who: 'partner', text: '전깃불이 자꾸 꺼지는 이유가 이거였구나!' }],
        after: [{ who: 466, text: '…휴. 시원한 연못물 덕분에 열이 식었다.' }] } },
      tramway: { name: '종로 전찻길', tiles: T.street, floors: 3, lv: [30, 34], mons: [100, 81, 19, 20, 52, 431, 434], bgm: 'road_b' },
      clocktower: { name: K('소원의 시계탑', 'Wishing Clock Tower'), tiles: T.rift, floors: 3, lv: [31, 35], mons: [81, 82, 436, 437, 374, 375], bgm: 'd_mount2', legend: true,
        tint: 'rgba(60,120,200,0.10)',
        boss: { sp: 385, lv: 42, lvMin: 34, lvUp: 4, hp: 2.0, atk: 0.85, bgm: 'ba_dpoke1', moves: [353, 94, 442, 129],
          tele: { name: K('파멸의 소원', 'Doom Desire'), every: 4, dmg: 0.36, pats: ['far', 'ring', 'random', 'x'], type: 8 },
          say: [
            { who: 'narr', text: K('째깍, 째깍… 시계탑 꼭대기에서 별 모양의 빛이 깜박인다.', 'Tick, tock... A star-shaped light blinks atop the clock tower.') },
            { who: 385, text: K('…후아암. 천 년 만에 눈을 떴는데 세상이 이렇게 시끄러워졌네? (지라치가 별빛을 번뜩인다!)', '...Yawn. I wake up after a thousand years and the world got this noisy? (Jirachi flashes with starlight!)') },
            { who: CELEBI, name: '세레비', text: K('소원을 들어주는 지라치야! 갑자기 깨어나서 놀란 것 같아. 진정시켜 주자!', 'It\'s Jirachi, who grants wishes! It woke up suddenly and got startled. Let\'s calm it down!') }],
          after: [{ who: 385, text: K('…새 나라를 바라는 소원이 잔뜩 들려. 이 소원들이 이루어지는 날을 나도 기다려 볼게.', '...I can hear so many wishes for a new nation. I\'ll wait for the day they come true, too.') }] } },
    },
    npcs: [
      { id: 'luxray', sp: 405, name: '전기 기술자 렌트라', x: 22, y: 15, say: [{ text: '전기는 백성의 밤을 밝히는 힘이 될 거야.' }] },
      { id: 'chatot7', sp: 441, name: '신문팔이 페라페', x: 10, y: 16, wander: 2, say: [{ text: '독립신문이오! 누구나 읽을 수 있게 한글로 썼다오! 1896년 4월 7일 창간!' }] },
      { id: 'persian', sp: 53, name: '상인 페르시온', x: 29, y: 12, say: [{ text: '1899년엔 서대문에서 청량리까지 전차가 다닌다던데. 세상 참 빨라졌어.' }] },
      { id: 'pachirisu', sp: 417, name: '파치리스', x: 15, y: 21, wander: 3, say: [{ text: '찌릿! 전깃불은 연못물을 끌어다 발전기를 식혔대. 그래서 "물불"이라고도 불렀대!' }] },
    ],
    main: [
      { do: 'talk', npc: 'luxray', log: '전기 기술자 렌트라와 이야기하자', say: [
        { who: 405, name: '전기 기술자 렌트라', text: '궁궐 전깃불이 툭하면 꺼져서 사람들이 "건달불"이라고 놀린다니까.' },
        { who: 405, name: '전기 기술자 렌트라', text: '발전소 안이 과열됐나 봐. 안쪽을 살펴봐 줄래?' }] },
      { do: 'dungeon', d: 'plant', log: '건청궁 발전소 깊은 곳의 과열 원인을 찾자' },
      { do: 'talk', npc: 'luxray', log: '렌트라에게 돌아가자', say: [
        { who: 405, name: '전기 기술자 렌트라', text: '전깃불이 환하게 켜졌어! 이제 밤에도 책을 읽을 수 있겠다!' }] },
    ],
    outro: [
      { who: 'narr', text: '1897년 10월 12일, 고종은 환구단에서 황제로 즉위하고 나라 이름을 "대한제국"으로 선포했다.' },
      { who: 'narr', text: '1899년에는 서대문과 청량리를 잇는 전차가 달리기 시작했다. 그러나 나라를 노리는 열강의 그림자도 짙어지고 있었다.' },
    ],
    side: [
      { id: 'e7a', title: '독립신문 배달', kind: 'deliver', item: 'newspaper', to: 'persian', reward: { money: 1000, exp: 800 },
        desc: '갓 찍은 독립신문을 상인 페르시온에게 배달해 주세요. (수락하면 신문을 받습니다)' },
      { id: 'e7b', title: '찌리리공 진정시키기', kind: 'defeat', sp: 100, n: 5, d: 'tramway', reward: { money: 1100, exp: 900 },
        desc: '전찻길에서 데굴데굴 구르는 찌리리공 5마리를 진정시켜 주세요.' },
      { id: 'e7c', title: '전찻길의 아기 피츄', kind: 'rescue', sp: 172, floor: 3, d: 'tramway', reward: { money: 1000, items: { ginseng: 1 }, exp: 900 },
        desc: '전차 소리에 놀라 숨어 버린 아기 피츄를 찾아 주세요.' },
    ],
  },
  // ------------------------------------------------------------------ 8
  {
    id: 8, year: 1919, years: '1910 – 1919', title: '3 · 1 운동', sub: '대한 독립 만세',
    art: 'e8', artProps: ['pavilion8'], town: {
      name: '경성', bgm: 'city04_d', bgmN: 'city04_n', biome: 'modern', landmark: 'pavilion8',
      houses: ['western', 'hanok', 'western', 'hanok', 'western', 'hanok', 'choga', 'western'], props: ['pole', 'lamp', 'lamp', 'baretree', 'cherry', 'rickshaw'],
    },
    world: 'road_a_n',
    intro: [
      '1905년 을사늑약으로 외교권을 빼앗기고, 1910년 8월 29일 대한제국은 끝내 나라를 빼앗겼다.',
      '1909년 안중근은 하얼빈에서 이토 히로부미를 저격했고, 많은 이들이 나라 밖에서 독립을 준비했다.',
      '1919년 봄, 경성의 사람들은 조용히, 그러나 굳게 한 가지를 준비하고 있었다.',
    ],
    nodes: [
      { id: 'town', name: '경성', lon: 126.98, lat: 37.57 },
      { id: 'alley', name: '경성 뒷골목', lon: 127.34, lat: 37.86, d: 'alley' },
      { id: 'namsan', name: '남산 숲', lon: 126.66, lat: 37.32, d: 'namsan' },
      { id: 'tapgol', name: K('탑골 공원', 'Tapgol Park'), lon: 127.5, lat: 37.3, d: 'tapgol' },
      { mark: true, name: '아우내 장터', lon: 127.3, lat: 36.77, text: '1919년 4월 1일, 유관순 열사가 아우내 장터에서 만세 운동을 이끌었다.' },
      { mark: true, name: '→ 상하이', lon: 124.2, lat: 33.6, text: '1919년 4월 11일, 중국 상하이에서 대한민국 임시정부가 수립되었다.' },
    ],
    dungeons: {
      alley: { name: '경성 뒷골목', tiles: T.alley, floors: 5, lv: [34, 38], mons: [198, 92, 93, 353, 355, 434, 435, 228, 200], bgm: 'd_agito',
        quest: { item: 'declaration', lastFloor: true },
        boss: { sp: 483, lv: 42, lvMin: 36, lvUp: 4, hp: 2.43, atk: 0.98, bgm: 'ba_dpoke1', moves: [337, 430, 414, 246], // 1.7: HP +30% and attack +15% (was 1.87 / 0.85)
          tele: { name: K('러스터캐논', 'Flash Cannon'), every: 4, dmg: 0.36, pats: ['cols', 'rows', 'cross', 'quad'], type: 8 },
          sig: { use: [SIG.roar], at: SIG_AT1 },
          revive: origin('#6a9cff', K('디아루가가 쓰러지지 않는다! 시간이 거꾸로 흐르며 오리진폼으로 모습을 바꿨다!', "Dialga won't go down! Time flows backwards as it takes its Origin Forme!"),
            K('시간 붕괴', 'Time Collapse'), 8, ['cols|cross', 'rows|x', 'quad', 'checker', 'star|near'], [SIG.roar]),
          say: [
            { who: 'narr', text: K('1919년 3월 1일 오후 2시를 앞두고, 인쇄소 앞의 시계가 멈춰 섰다.', 'Just before 2 p.m. on March 1, 1919, the clock in front of the print shop stopped.') },
            { who: 483, text: K('그라아아아…! (시간의 신 디아루가가 경성의 시간을 붙잡고 있다!)', 'Grahhh...! (Dialga, lord of time, is holding Gyeongseong\'s time still!)') },
            { who: CELEBI, name: '세레비', text: K('두려움이 너무 커서 디아루가가 이 순간을 멈춰 버렸어! 시간이 흘러야 선언서를 읽을 수 있어!', 'The fear is so great that Dialga froze this moment! Time has to flow for the declaration to be read!') },
            { who: 'partner', text: K('오후 2시는 꼭 와야 해. 모두가 함께 외칠 시간이야!', '2 p.m. has to come. It\'s the moment everyone shouts together!') }],
          after: [{ who: 483, text: K('…두려움 속에서도 앞으로 나아가려는 마음이 보인다. 시간을 다시 흐르게 하마. 가거라, 너희의 목소리가 닿도록.', '...Even in fear, I see hearts that want to move forward. I will let time flow again. Go, so your voices may be heard.') }],
          join: K('디아루가가 거대한 몸을 낮추었다. 앞으로 흐르는 시간을 함께 지켜보고 싶어 한다!', 'Dialga lowers its great body. It wants to watch time flow forward with you!') } },
      namsan: { name: '남산 숲', tiles: T.autumn, floors: 3, lv: [33, 37], mons: [163, 164, 198, 425, 187, 188, 315], bgm: 'road_a_n' },
      // Mesprit waits in the park where the declaration was read aloud on March 1
      tapgol: { name: K('탑골 공원', 'Tapgol Park'), tiles: T.street, floors: 3, lv: [33, 37], mons: [280, 281, 311, 312, 183, 39], bgm: 'd_lake', legend: true,
        tint: 'rgba(255,140,200,0.08)',
        boss: { sp: 481, lv: 40, lvUp: 3, hp: 1.8, atk: 0.85, bgm: 'ba_secret1', moves: [326, 94, 248],
          tele: { name: '감정의 파동', every: 4, dmg: 0.32, pats: ['ring', 'target', 'x', 'checker'], type: 14 },
          say: [
            { who: 481, name: '엠라이트', text: K('두려움, 분노, 슬픔… 그리고 희망. 이 공원에는 사람들의 마음이 소용돌이치고 있어.', 'Fear, anger, sorrow... and hope. People\'s hearts are swirling in this park.') },
            { who: 481, name: '엠라이트', text: '너희 마음은 어느 쪽이지? 부딪혀 보면 알 수 있겠지!' },
            { who: 'partner', text: '감정의 신 엠라이트! 우리 마음은 희망 쪽이야!' }],
          after: [{ who: 481, name: '엠라이트', text: '…따뜻해. 혼자가 아니라는 마음이 두려움을 이기는구나. 그 목소리를 모두에게 전해 줘.' }],
          join: '엠라이트가 웃으며 주위를 맴돈다. 너희와 함께 있고 싶은 것 같다!' } },
    },
    npcs: [
      { id: 'togekiss', sp: 468, name: '학생 대표 토게키스', x: 22, y: 15, say: [{ text: '총칼 대신 맨손과 목소리로. 우리는 평화롭게 외칠 거야.' }] },
      { id: 'pikachu8', sp: 25, name: '배재학당 피카츄', x: 10, y: 16, wander: 2, say: [{ text: '민족 대표 33인이 태화관에서 독립선언식을 한대. 우리는 탑골공원에 모일 거야!' }] },
      { id: 'chimecho', sp: 358, name: '치렁', x: 29, y: 12, say: [{ text: '딸랑… 고종 황제의 장례식(인산일)이 3월 3일이라 전국에서 사람들이 경성으로 모이고 있어요.' }] },
      { id: 'cherrim', sp: 421, name: '체리꼬', x: 15, y: 21, wander: 3, say: [{ text: '봄이 오면 꽃은 다시 피어. 아무리 추운 겨울이 길어도.' }] },
    ],
    main: [
      { do: 'talk', npc: 'togekiss', log: '학생 대표 토게키스를 만나자', say: [
        { who: 468, name: '학생 대표 토게키스', text: '3월 1일 오후 2시, 탑골공원에서 독립선언서를 읽을 거야. 그런데 선언서 사본이 뒷골목 인쇄소에 갇혀 버렸어.' },
        { who: 468, name: '학생 대표 토게키스', text: '감시가 심해서 우리는 갈 수가 없어. 뒷골목 가장 깊은 곳에서 선언서를 가져와 줄래?' }] },
      { do: 'dungeon', d: 'alley', log: '경성 뒷골목 깊은 곳에서 독립선언서를 찾아오자' },
      { do: 'talk', npc: 'togekiss', log: '토게키스에게 선언서를 전하자', say: [
        { who: 468, name: '학생 대표 토게키스', text: '고마워! 이제 탑골공원으로 가자. 모두 함께!' }] },
    ],
    outro: [
      { who: 'narr', text: '1919년 3월 1일, 탑골공원 팔각정에서 독립선언서가 낭독되었다. "대한 독립 만세!"' },
      { who: 'narr', text: '만세 소리는 전국으로, 나라 밖으로 퍼져 나갔다. 그해 4월 11일, 상하이에 대한민국 임시정부가 세워졌다.' },
    ],
    side: [
      { id: 'e8a', title: '태극기 천 모으기', kind: 'collect', item: 'cloth', n: 3, d: 'namsan', reward: { money: 1300, exp: 1100 },
        desc: '만세 운동에 쓸 태극기를 만들 천 3장을 남산 숲에서 모아 주세요.' },
      { id: 'e8b', title: '감시하는 니로우 쫓기', kind: 'defeat', sp: 198, n: 5, d: 'alley', reward: { money: 1200, exp: 1000 },
        desc: '사람들을 감시하는 니로우 5마리를 쫓아내 주세요.' },
      { id: 'e8c', title: '남산의 아기 체리버', kind: 'rescue', sp: 420, floor: 3, d: 'namsan', reward: { money: 1200, items: { ginseng: 1 }, exp: 1000 },
        desc: '남산 숲 3층에서 아기 체리버가 봄을 기다리며 웅크리고 있대요.' },
    ],
  },
  // ------------------------------------------------------------------ 9
  {
    id: 9, year: 1920, years: '1920 – 1932', title: '독립군', sub: '청산리의 가을',
    art: 'e9', artProps: [], town: {
      name: '독립군 기지 (만주)', bgm: 'city11_d', bgmN: 'city11_n', biome: 'camp', landmark: null, police: false, // no constables patrol the army's own base
      houses: ['tent', 'tent', 'tent', 'tent', 'tent', 'tent'], props: ['campfire', 'crates', 'crates', 'tower', 'baretree', 'maple', 'logs'],
    },
    world: 'road_bza',
    intro: [
      '나라를 잃은 사람들은 만주와 연해주로 건너가 독립군을 길렀다.',
      '1920년 6월, 홍범도 장군이 봉오동에서 일본군을 크게 무찔렀다.',
      '그리고 1920년 10월, 김좌진과 홍범도의 부대가 청산리 골짜기로 향한다.',
    ],
    nodes: [
      { id: 'town', name: '독립군 기지', lon: 128.35, lat: 42.72 },
      { id: 'cheongsan', name: '청산리 골짜기', lon: 129.35, lat: 42.55, d: 'cheongsan' },
      { id: 'baekdu', name: '백두산 기슭', lon: 128.05, lat: 41.85, d: 'baekdu' },
      { mark: true, name: '봉오동', lon: 130.0, lat: 42.88, text: '1920년 6월, 홍범도 장군의 부대가 봉오동에서 크게 이겼다.' },
      { mark: true, name: K('→ 상하이', '→ Shanghai'), lon: 124.2, lat: 33.6, text: K('1932년 4월 29일, 윤봉길 의사가 상하이 훙커우 공원에서 의거를 일으켰다.', 'On April 29, 1932, Yun Bong-gil struck at Hongkou Park in Shanghai.') },
      { id: 'cheonji', name: '천지 화구', lon: 128.5, lat: 41.95, d: 'cheonji' },
    ],
    dungeons: {
      cheongsan: { name: '청산리 골짜기', tiles: T.birch, floors: 5, lv: [38, 42], mons: [123, 214, 127, 193, 469, 397, 204, 205, 287], bgm: 'd_03',
        quest: { item: 'supply', perFloor: 1 },
        boss: { sp: 212, lv: 46, bgm: 'ba_chanp', say: [
          { who: 212, text: '철컥! 숲을 지키던 핫삼이 포성에 놀라 골짜기를 가로막았다!' },
          { who: 'partner', text: '보급품이 독립군에게 닿아야 해. 함께 길을 열자!' }],
        after: [{ who: 212, text: '…너희의 눈빛은 맑다. 이 숲을 지나가도 좋다.' }] } },
      baekdu: { name: '백두산 기슭', tiles: T.baekdu, floors: 3, lv: [36, 40], mons: [215, 220, 221, 361, 459, 246, 247], bgm: 'd_lake' },
      cheonji: { name: '백두산 천지 화구', tiles: T.volcano, floors: 3, lv: [38, 42], mons: [126, 218, 219, 322, 323, 324], bgm: 'd_06', legend: true,
        tint: 'rgba(255,80,20,0.12)',
        boss: { sp: 485, lv: 50, lvMin: 42, lvUp: 4, hp: 2.1, atk: 0.85, bgm: 'ba_secret2', moves: [436, 53, 442, 414],
          tele: { name: '마그마 분출', every: 4, dmg: 0.36, pats: ['near', 'ring', 'random', 'rows'], type: 10 },
          say: [
            { who: 'narr', text: '백두산 천지 아래, 잠든 화산의 심장부. 용암 속에서 무언가가 기어 나왔다.' },
            { who: 485, text: '그르르르…! (화구에 사는 히드런이 뜨거운 숨을 내뿜는다!)' },
            { who: 'partner', text: '불꽃과 강철의 몸을 가진 히드런이야! 발밑이 붉게 빛나면 바로 피하자!' }],
          after: [{ who: 485, text: '그르르… (히드런이 불꽃을 거두었다. 너희의 뜨거운 마음이 마음에 든 것 같다)' }] } },
    },
    npcs: [
      { id: 'arcanine', sp: 59, name: '독립군 기병 윈디', x: 22, y: 15, say: [{ text: '빼앗긴 나라를 되찾을 때까지, 우리는 멈추지 않는다.' }] },
      { id: 'staravia', sp: 397, name: '전령 찌르버드', x: 10, y: 16, wander: 2, say: [{ text: '상하이 임시정부와 만주를 오가며 소식을 전하고 있어!' }] },
      { id: 'abomasnow9', sp: 459, name: '눈쓰개', x: 29, y: 12, say: [{ text: '만주의 겨울은 길고 혹독해. 그래도 다들 서로 돕고 있어.' }] },
      { id: 'growlithe', sp: 58, name: '가디', x: 15, y: 21, wander: 3, say: [{ text: '왈! 조선어학회 어른들이 우리말 사전을 만들고 있대. 말을 잃으면 나라도 잃는 거래!' }] },
    ],
    main: [
      { do: 'talk', npc: 'arcanine', log: '독립군 기병 윈디를 만나자', say: [
        { who: 59, name: '독립군 기병 윈디', text: '청산리 골짜기로 가는 보급대가 숲에서 흩어졌다. 각 층에 떨어진 보급품을 모아 줄 수 있겠나?' }] },
      { do: 'dungeon', d: 'cheongsan', log: '청산리 골짜기에서 보급품을 모으며 숲 끝까지 가자' },
      { do: 'talk', npc: 'arcanine', log: '윈디에게 돌아가자', say: [
        { who: 59, name: '독립군 기병 윈디', text: '보급품이 무사히 닿았다! 엿새에 걸친 싸움이었지만, 우리는 이겼다!' }] },
      { do: 'scene', say: [
        { who: 'narr', text: K('청산리에서 크게 진 일본군은 그해 겨울 간도의 조선인 마을들을 덮쳐 수많은 사람을 해쳤다(간도 참변).', 'Badly beaten at Cheongsan-ri, the Japanese army fell on the Korean villages of Jiandao that winter and killed a great many people (the Gando Massacre).') },
        { who: 'narr', text: K('그 뒤로 독립군의 작전이 번번이 새어 나갔다. 기지 안에 밀정이 숨어 있다는 소문이 돌았다.', 'After that, the independence army\'s plans kept leaking out. Word spread that a spy was hiding in the base.') }] },
      // the spy hunt (quests.js spy*): the informant gives a type and a weight, suspects are weighed and one accused
      { do: 'spy', npc: 'staravia', get log() { return spyLog(); } },
      { do: 'talk', npc: 'arcanine', log: K('윈디에게 밀정 소식을 전하자', 'Tell Arcanine about the spy'), say: [
        { who: 59, name: '독립군 기병 윈디', text: K('밀정을 잡았다고? 장하다! 이제 우리 작전이 새어 나가지 않을 것이다.', 'You caught the spy? Well done! Now our plans won\'t leak anymore.') }] },
    ],
    outro: [
      { who: 'narr', text: '1920년 10월, 청산리 대첩. 김좌진과 홍범도의 독립군은 백운평, 어랑촌 등지에서 큰 승리를 거두었다.' },
      { who: 'narr', text: K('1932년 윤봉길 의사의 의거로 임시정부는 다시 힘을 얻었다. 독립을 향한 걸음은 멈추지 않았다.', 'Yun Bong-gil\'s strike in 1932 gave the Provisional Government new strength. The march toward independence never stopped.') },
    ],
    side: [
      { id: 'e9a', title: '말모이 원고 지키기', kind: 'collect', item: 'malmoi', n: 3, d: 'baekdu', reward: { money: 1600, exp: 1500 },
        desc: '우리말 사전을 만들려고 모은 낱말 원고가 흩어졌어요. 백두산 기슭에서 3뭉치를 찾아 주세요.' },
      { id: 'e9b', title: '스라크 진정시키기', kind: 'defeat', sp: 123, n: 4, d: 'cheongsan', reward: { money: 1500, exp: 1300 },
        desc: '골짜기에서 칼날을 휘두르는 스라크 4마리를 진정시켜 주세요.' },
      { id: 'e9c', title: '백두산의 아기 애버라스', kind: 'rescue', sp: 246, floor: 2, d: 'baekdu', reward: { money: 1500, items: { ginseng: 2 }, exp: 1400 },
        desc: '백두산 기슭 2층에서 아기 애버라스가 길을 잃었어요.' },
    ],
  },
  // ------------------------------------------------------------------ 1940
  {
    id: 10, year: 1940, years: '1938 – 1943', title: K('민족 말살 통치', 'Erasing a People'), sub: K('빼앗긴 이름, 지켜 낸 말', 'Stolen names, words kept safe'),
    card: { set: T.rift, mons: [487, 164, 448, 427] }, artProps: [], town: {
      name: K('경성 (1940)', 'Gyeongseong (1940)'), bgm: 'city04_d', bgmN: 'city04_n', biome: 'modern', landmark: null, pearl: 'C03', // Oreburgh: the mines and factories of the war years
      houses: ['western', 'hanok', 'western', 'hanok', 'western', 'choga', 'hanok', 'western'], props: ['pole', 'lamp', 'baretree', 'baretree', 'rickshaw', 'jars'],
    },
    world: 'road_a_n',
    intro: [
      K('1937년 중일 전쟁을 일으킨 일제는 우리 민족의 얼마저 지우려 들었다.', 'Having started the war with China in 1937, imperial Japan set out to erase the very spirit of the Korean people.'),
      K('학교에서 우리말 수업이 사라졌고, 1940년 2월부터는 이름까지 일본식으로 바꾸라고 강요했다. 이른바 창씨개명이다.', 'Korean lessons vanished from schools, and from February 1940 people were forced to take Japanese-style names, the so-called Changssi Gaemyeong.'),
      K('그해 여름, 경성의 우물가에 이상한 소문이 돌았다. "우물에 비친 세상이 거꾸로 뒤집혀 있다…"', 'That summer a strange rumour spread around a Gyeongseong well: "The world reflected in the water is upside down..."'),
    ],
    nodes: [
      { id: 'town', name: K('경성', 'Gyeongseong'), lon: 126.98, lat: 37.57 },
      { id: 'distortion', name: K('반전세계', 'Distortion World'), lon: 127.78, lat: 37.3, d: 'distortion' },
      { id: 'inwang', name: K('인왕산', 'Mount Inwang'), lon: 126.62, lat: 37.86, d: 'inwang' },
      { mark: true, name: K('신문 폐간', 'Papers shut down'), lon: 126.7, lat: 37.2, text: K('1940년 8월, 동아일보와 조선일보가 강제로 문을 닫았다.', 'In August 1940 the Dong-A Ilbo and the Chosun Ilbo were forced to close.') },
    ],
    dungeons: {
      distortion: { name: K('반전세계', 'Distortion World'), tiles: T.rift, floors: 5, lv: [40, 44], mons: [92, 93, 200, 429, 425, 426, 302, 355, 356], bgm: 'd_agito',
        tint: 'rgba(70,0,90,0.22)', quest: { item: 'names', perFloor: 1 },
        // Aura Sphere answers the Dark types brought against a Ghost. HP +30% and attack +15% in 1.7 (was 2.31 / 0.85).
        // Its first form takes turns among five telegraphed attacks (dungeon.js charge: mix) and two signature moves.
        boss: { sp: 487, lv: 46, lvMin: 38, lvUp: 4, hp: 3.0, atk: 0.98, bgm: 'ba_secret2', moves: [247, 337, 396, 414],
          tele: { name: K('그림자 폭풍', 'Shadow Storm'), every: 3, dmg: 0.36, pats: ['x', 'random', 'quad', 'checker'], type: 7,
            mix: [
              { name: K('그림자 폭풍', 'Shadow Storm'), type: 7, dmg: 0.36, pats: ['x', 'random', 'quad', 'checker'] },
              { name: K('대지의힘', 'Earth Power'), type: 4, dmg: 0.34, pats: ['near', 'rows', 'cols', 'ring'] },
              { name: K('용성군', 'Draco Meteor'), type: 16, dmg: 0.38, pats: ['random', 'far', 'star', 'quad'] },
              { name: K('파동탄', 'Aura Sphere'), type: 1, dmg: 0.34, pats: ['target', 'cross', 'checker'] },
              { name: K('원시의힘', 'Ancient Power'), type: 5, dmg: 0.34, pats: ['ring', 'x', 'cols', 'near'] },
            ] },
          sig: { use: [SIG.shadow, SIG.dragon], at: [0.8, 0.55] },
          revive: origin('#ff4a3a', K('기라티나가 쓰러지지 않는다! 그림자 날개를 펼치며 오리진폼으로 모습을 바꿨다!', "Giratina won't go down! It spreads its shadow wings and takes its Origin Forme!"),
            K('반전의 그림자', 'Reverse Shadow'), 7, ['x|random', 'quad', 'checker|ring', 'far|target', 'star'], [SIG.shadow]),
          say: [
            { who: 'narr', text: K('위와 아래가 뒤집힌 세계. 빼앗긴 이름들이 그림자가 되어 떠다닌다.', 'A world turned upside down. Stolen names drift about as shadows.') },
            { who: 487, text: '그오오…! (반전세계의 주인 기라티나가 그림자 속에서 모습을 드러냈다!)' },
            { who: CELEBI, name: '세레비', text: K('이름과 말을 빼앗긴 슬픔이 세계를 뒤집어서 기라티나가 깨어났어! 명부를 되찾으려면 기라티나를 진정시켜야 해!', 'The grief of stolen names and words turned the world over and woke Giratina! Calm it down to win back the register!') },
            { who: 'partner', text: '세상이 뒤집힌 것 같은 어두운 시대라도, 우리는 길을 잃지 않아!' }],
          after: [{ who: 487, text: '……………… (기라티나가 그림자를 거두었다. 뒤집혔던 세계가 천천히 제자리를 찾는다)' }],
          join: K('기라티나가 그림자 날개를 접고 고개를 숙였다. 함께 가고 싶어 한다!', 'Giratina folds its shadow wings and bows its head. It wants to come along!') } },
      inwang: { name: K('인왕산', 'Mount Inwang'), tiles: T.mountain, floors: 3, lv: [38, 42], mons: [163, 164, 198, 430, 215, 461, 447, 302], bgm: 'road_a_n' },
    },
    npcs: [
      { id: 'scholar40', sp: 164, name: K('조선어학회 야부엉', 'Language Society Noctowl'), x: 22, y: 15, say: [{ text: K('말은 겨레의 얼이라네. 말을 잃으면 겨레도 잃는 것이지.', 'Language is the soul of a people. Lose the words and you lose the people.') }] },
      { id: 'pupil40', sp: 427, name: K('학생 이어롤', 'Student Buneary'), x: 10, y: 16, wander: 2, say: [{ text: K('학교에서 우리말을 쓰면 벌을 받아. 그래서 집에서만 몰래 써.', 'We get punished for speaking Korean at school, so we only use it at home, in secret.') }] },
      { id: 'grandpa40', sp: 400, name: K('비버통 할아버지', 'Grandpa Bibarel'), x: 29, y: 12, say: [{ text: K('조상께 물려받은 이름을 바꾸라니… 차라리 이름 없이 살겠다는 사람도 많다네.', 'Change the name our ancestors gave us... Many would rather live with no name at all.') }] },
      { id: 'reporter40', sp: 441, name: K('기자 페라페', 'Reporter Chatot'), x: 15, y: 21, wander: 3, say: [{ text: K('신문사가 문을 닫는대. 마지막 호만은 어딘가에 꼭 남겨 둘 거야.', 'They\'re shutting our paper down. I\'ll make sure the last issue survives somewhere.') }] },
    ],
    main: [
      { do: 'talk', npc: 'scholar40', log: K('조선어학회 야부엉을 만나자', 'Meet Noctowl of the Korean Language Society'), say: [
        { who: 164, name: K('조선어학회 야부엉', 'Language Society Noctowl'), text: K('사람들의 본래 이름을 적어 둔 명부와 사전 원고가 우물 속으로 빨려 들어가고 있네. 그 안은 모든 것이 거꾸로 뒤집힌 "반전세계"라네.', 'The register of people\'s true names and our dictionary manuscript are being sucked into the well. Inside is the "Distortion World", where everything is upside down.') },
        { who: 164, name: K('조선어학회 야부엉', 'Language Society Noctowl'), text: K('층마다 흩어진 명부 낱장을 되찾아 주게. 이름은 사람의 첫 번째 말이니까.', 'Recover the register pages scattered on each floor. A name is the first word a person has.') }] },
      { do: 'dungeon', d: 'distortion', log: K('반전세계(5층)에서 이름 명부를 되찾으며 가장 깊은 곳으로', 'Recover the name register in the Distortion World (5 floors) and reach its depths') },
      { do: 'talk', npc: 'scholar40', log: K('야부엉에게 명부를 돌려주자', 'Bring the register back to Noctowl'), say: [
        { who: 164, name: K('조선어학회 야부엉', 'Language Society Noctowl'), text: K('잘 지켜 주었네! 이 소식을 충칭의 임시정부에 전해 주게. 그곳에서 우리 군대가 일어서고 있다네.', 'Well kept! Take the news to the Provisional Government in Chongqing. Our own army is rising there.') }] },
      { do: 'talk', npc: 'kla40', log: K('충칭의 광복군 루카리오에게 소식을 전하자', 'Bring the news to Lucario of the Liberation Army in Chongqing'), say: [
        { who: 448, name: K('광복군 대원 루카리오', 'Liberation Army Lucario'), text: K('경성에서 온 소식, 잘 받았다. 이름도 말도 지켜 낸 사람들이 있는 한 우리는 지지 않는다.', 'We got your news from Gyeongseong. As long as there are people who keep their names and their words, we will not lose.') },
        { who: 448, name: K('광복군 대원 루카리오', 'Liberation Army Lucario'), text: K('1940년 9월 17일, 우리는 한국광복군으로 다시 태어났다. 언젠가 반드시 고향으로 돌아갈 것이다.', 'On September 17, 1940, we were reborn as the Korean Liberation Army. One day we will surely go home.') }] },
    ],
    outro: [
      { who: 'narr', text: K('1940년 9월 17일, 충칭의 대한민국 임시정부는 한국광복군을 창설했다. 총사령관은 지청천이었다.', 'On September 17, 1940, the Provisional Government in Chongqing founded the Korean Liberation Army, with Ji Cheong-cheon as commander.') },
      { who: 'narr', text: K('1942년 10월, 조선어학회 사건으로 많은 학자가 붙잡혔다. 그러나 사전 원고는 끝내 살아남았다.', 'In October 1942 the Korean Language Society incident put many scholars in prison. But the dictionary manuscript survived.') },
      { who: 'narr', text: K('1943년 11월 카이로 회담에서 미국·영국·중국은 "적절한 절차를 거쳐 한국을 자유롭고 독립된 나라로 만들겠다"고 처음으로 약속했다.', 'At the Cairo Conference in November 1943, the US, Britain and China promised for the first time that "in due course Korea shall become free and independent".') },
      { who: 'narr', text: K('어둠이 가장 깊을 때, 새벽은 이미 가까이 와 있었다.', 'When the darkness was deepest, the dawn was already close.') },
    ],
    side: [
      { id: 'e40a', title: K('마지막 호 신문 찾기', 'Find the Last Issue'), kind: 'collect', item: 'lastpaper', n: 3, d: 'inwang', reward: { money: 1700, exp: 1600 },
        desc: K('강제 폐간된 신문의 마지막 호를 인왕산에 숨겨 두었대요. 3부를 찾아 주세요.', 'The last issue of the shut-down paper was hidden on Mount Inwang. Find 3 copies.') },
      { id: 'e40b', title: K('이름 도둑 깜까미', 'The Name Thieves'), kind: 'defeat', sp: 302, n: 5, d: 'distortion', reward: { money: 1600, exp: 1400 },
        desc: K('반전세계에서 사람들의 이름표를 훔쳐 가는 깜까미 5마리를 쫓아내 주세요.', 'Drive off 5 Sableye stealing people\'s name tags in the Distortion World.') },
      { id: 'e40c', title: K('인왕산의 아기 리오르', 'The Baby Riolu'), kind: 'rescue', sp: 447, floor: 2, d: 'inwang', reward: { money: 1600, items: { ginseng: 2 }, exp: 1500 },
        desc: K('인왕산 2층에서 아기 리오르가 길을 잃었어요.', 'A baby Riolu got lost on floor 2 of Mount Inwang.') },
    ],
  },
  // ------------------------------------------------------------------ 10
  {
    id: 10, year: 1945, years: '1945', title: '광복', sub: '빛을 되찾은 날',
    art: 'e10', artProps: [], town: {
      name: '서울', bgm: 'city08_d', bgmN: 'city08_n', biome: 'modern', landmark: 'gate',
      houses: ['hanok', 'western', 'hanok', 'western', 'hanok', 'hanok', 'choga', 'western'], props: ['cherry', 'persimmon', 'lamp', 'pole', 'tram', 'jars'],
    },
    world: 'city10_d',
    intro: [
      K('1945년 2월 얄타 회담에서 미국·영국·소련은 소련이 일본과의 전쟁에 뛰어들기로 약속했다.', 'At the Yalta Conference in February 1945, the US, Britain and the USSR agreed that the Soviets would join the war against Japan.'),
      K('7월 포츠담 선언은 일본에 항복을 요구하며, 카이로 선언대로 한국을 독립시키겠다는 약속을 다시 확인했다.', 'In July the Potsdam Declaration called on Japan to surrender and reaffirmed the Cairo promise of Korean independence.'),
      K('1945년 8월. 35년에 걸친 일제 강점기의 끝이 다가오고 있다. 그런데 서울 하늘 위로 커다란 "시간의 틈"이 열렸다…!', 'August 1945. The end of thirty-five years of colonial rule is near. But a huge "rift in time" has opened over Seoul...!'),
    ],
    nodes: [
      { id: 'town', name: '서울', lon: 126.98, lat: 37.57 },
      { id: 'rift', name: '시간의 틈', lon: 127.6, lat: 38.35, d: 'rift' },
      { id: 'warehouse', name: '서울역 창고', lon: 126.62, lat: 37.36, d: 'warehouse' },
    ],
    dungeons: {
      rift: { name: '시간의 틈', tiles: T.rift, floors: 6, lv: [42, 47], mons: [444, 148, 247, 359, 197, 196, 356, 281, 429, 477], bgm: 'd_mount2', // 600-total lines stay boss-only (Garchomp, Tyranitar lead 1950)
        // HP +30% and attack +15% in 1.7 (was 2.2 / 0.85); Hydro Pump in place of Water Pulse
        mid: { floor: 3, sp: 484, lv: 52, lvUp: 3, hp: 2.86, atk: 0.98, bgm: 'ba_dpoke1', moves: [56, 337, 414, 246],
          tele: { name: K('하이드로펌프', 'Hydro Pump'), every: 4, dmg: 0.36, pats: ['cross', 'quad', 'rows', 'star'], type: 11 },
          sig: { use: [SIG.rend], at: SIG_AT1 },
          revive: origin('#ff9ad8', K('펄기아가 쓰러지지 않는다! 공간이 일그러지며 오리진폼으로 모습을 바꿨다!', "Palkia won't go down! Space warps as it takes its Origin Forme!"),
            K('아공절단', 'Subspace Rend'), 11, ['cross|ring', 'quad', 'star', 'rows|x', 'checker|near'], [SIG.rend]),
          say: [
            { who: 484, text: '그오오오오…!! 뒤틀린 공간 한가운데, 펄기아가 포효한다!' },
            { who: CELEBI, name: '세레비', text: '시대를 넘나든 시간이 공간까지 비틀어 버렸어! 펄기아를 진정시켜 줘!' },
            { who: 'partner', text: '1392년부터 여기까지 왔어. 끝까지 함께야!' }],
          after: [
            { who: 484, text: '…………. 공간을 비튼 것은 내가 아니다. 더 깊은 곳… 모든 것을 만든 자가 눈을 떴다.' },
            { who: CELEBI, name: '세레비', text: '모든 것을 만든… 설마, 아르세우스?! 서두르자, 틈의 가장 깊은 곳으로!' }],
          join: '펄기아가 거대한 몸을 낮췄다. 아르세우스에게 맞서려는 너희를 돕고 싶은 듯하다!' },
        // final boss: three phases; every blast is telegraphed and must be dodged
        boss: { sp: 493, lv: 60, lvMin: 54, lvUp: 5, hp: 5.5, atk: 0.75, cap: 0.2, bgm: 'ba_dpoke2', moves: [449, 304, 245, 414],
          tele: [
            { name: '심판의 뭉치', every: 2, dmg: 0.42, stagger: 1, pats: ['cross', 'x', 'target', 'near', 'ring'], type: 0, first: 2 },
            { at: 0.66, name: '심판의 뭉치', every: 2, dmg: 0.48, stagger: 1, pats: ['star', 'rows', 'cols', 'checker', 'ring', 'quad'], type: 16, typeTo: 16, summon: 2, summonSp: [436, 343],
              msg: '아르세우스가 용의 플레이트를 해방했다! 타입이 드래곤으로 바뀌었다!',
              line: [{ who: 493, name: '아르세우스', text: '…아직이다. 너희가 지켜 온 마음을, 끝까지 보여 다오.' }] },
            { at: 0.33, name: '창세의 빛', every: 1, dmg: 0.55, stagger: 1, pats: ['quad', 'random', 'checker|cross', 'ring|x', 'target|rows', 'far'], type: 17, typeTo: 17,
              msg: '아르세우스가 어둠의 플레이트를 꺼내 들었다! 공격이 한층 거세진다!',
              line: [{ who: 493, name: '아르세우스', text: '시간이 시작되기 전의 빛이다. 피할 수 있겠느냐!' }] },
          ],
          say: [
            { who: 'narr', text: '눈부신 빛 속에서, 거대한 포켓몬이 천천히 고개를 들었다.' },
            { who: 493, name: '아르세우스', text: '…나는 아르세우스. 시간과 공간을 낳은 자. 꽃잎을 좇아 시대를 건너온 작은 것들이여.' },
            { who: 493, name: '아르세우스', text: '뒤엉킨 시간을 처음으로 되돌리겠다. 553년의 기쁨도, 슬픔도 모두 지워질 것이다.' },
            { who: 'partner', text: '안 돼! 그 시간 속에는 수많은 사람과 포켓몬이 지켜 낸 소원이 담겨 있어!' },
            { who: CELEBI, name: '세레비', text: '아르세우스의 심판은 붉게 빛나는 곳에 떨어져! 잘 보고 피한 다음, 빈틈을 노려!' }],
          after: [
            { who: 493, name: '아르세우스', text: '……보았다. 너희가 걸어온 길에 깃든 마음을. 잊지 않는 한, 그 시간은 사라지지 않겠지.' },
            { who: 493, name: '아르세우스', text: '이 땅의 시간은 이대로 흐르게 두겠다. 빛을 되찾을 날이 바로 눈앞에 있다.' }],
          join: '아르세우스가 조용히 너희 곁에 내려섰다. 함께 가겠다는 듯하다…!' } },
      warehouse: { name: '서울역 창고', tiles: T.warehouse, floors: 3, lv: [40, 44], mons: [52, 53, 19, 20, 434, 435, 92, 93], bgm: 'road_a' },
    },
    npcs: [
      { id: 'celebi10', sp: CELEBI, name: '세레비', x: 22, y: 15, say: [{ text: K('이 시대의 꽃잎이야. 함께 가자!', 'This era\'s petal. Let\'s go together!') }] },
      { id: 'togekiss10', sp: 468, name: '토게키스', x: 10, y: 16, wander: 2, say: [{ text: '라디오에서 중대 발표가 있을 거래. 다들 숨죽이고 있어.' }] },
      { id: 'pikachu10', sp: 26, name: '라이츄 할아버지', x: 29, y: 12, say: [{ text: '내가 어릴 적 만세를 외치던 그 봄을 아직도 기억한다네.' }] },
      { id: 'sunflora', sp: 192, name: '해루미', x: 15, y: 21, wander: 3, say: [{ text: '해바라기처럼 빛을 향해 고개를 들자!' }] },
    ],
    main: [
      { do: 'talk', npc: 'celebi10', log: '세레비와 이야기하자', say: [
        { who: CELEBI, name: '세레비', text: '시간의 틈 너머에서 펄기아가 날뛰고 있어. 이대로면 모든 시대가 뒤섞여 버릴 거야!' },
        { who: CELEBI, name: '세레비', text: K('세계 지도의 "시간의 틈"으로 가 줘. 빛을 되찾을 날이 바로 앞이야!', 'Go to the "rift in time" on the world map. The day the light comes back is right ahead!') }] },
      { do: 'dungeon', d: 'rift', log: '시간의 틈(6층) 가장 깊은 곳으로! 무언가가 기다리고 있다' },
      { do: 'scene', say: [
        { who: 'narr', text: '1945년 8월 15일 정오. 라디오에서 일본의 항복 소식이 흘러나왔다.' },
        { who: 'narr', text: '35년의 일제 강점기가 끝났다. 사람들은 거리로 쏟아져 나와 태극기를 흔들었다. "대한 독립 만세!"' }] },
      { do: 'scene', say: [
        { who: 'narr', text: K('그러나 기쁨도 잠시. 9월, 38도선 남쪽에는 미군이, 북쪽에는 소련군이 들어왔다. 나라는 둘로 나뉘어 다스려지기 시작했다.', 'But the joy was brief. In September US troops came in south of the 38th parallel and Soviet troops in the north. The land began to be governed in two halves.') },
        { who: 'narr', text: K('1948년, 남쪽에는 대한민국 정부가, 북쪽에는 조선민주주의인민공화국 정부가 따로 들어섰다.', 'In 1948 the Republic of Korea was founded in the south and the Democratic People\'s Republic of Korea in the north.') }] },
      { do: 'faction', log: K('어느 쪽 사람들 곁에 설지 고르자', 'Choose whose side to stand by') },
    ],
    outro: [
      { who: 'narr', text: K('빛을 되찾았다는 뜻의 "광복". 그러나 갈라진 땅에서, 남은 꽃잎들은 아직 더 먼 시간 속에서 흔들리고 있었다.', '"Gwangbok": the light regained. Yet on the divided land, the remaining petals still flickered further ahead in time.') },
    ],
    side: [
      { id: 'e10a', title: '서울역 창고의 원고', kind: 'collect', item: 'malmoi', n: 3, d: 'warehouse', reward: { money: 2000, exp: 2000 },
        desc: '조선어학회 사건으로 빼앗겼던 사전 원고가 서울역 창고 어딘가에 있대요. 3뭉치를 찾아 주세요. (실제로 1945년 9월 이곳에서 발견되었습니다)' },
      { id: 'e10b', title: '창고의 꼬렛 소동', kind: 'defeat', sp: 20, n: 5, d: 'warehouse', reward: { money: 1800, exp: 1600 },
        desc: '창고를 헤집는 레트라 5마리를 진정시켜 주세요.' },
    ],
  },
];

// ---------------------------------------------------------------- additions to the Joseon chapters
const J = (y) => JOSEON.find((e) => e.year === y);
{ // 1592: every sea battle is fought by Water types only, and Noryang closes the war
  const e = J(1592);
  Object.assign(e.dungeons.hansan, { water: true, loan: [116, 7] });
  Object.assign(e.dungeons.uldol, { water: true, loan: [116, 7] });
  e.dungeons.noryang = { name: K('노량', 'Noryang'), tiles: T.deepsea, floors: 4, lv: [17, 21], water: true, loan: [116, 7], mons: [73, 99, 117, 119, 130, 224, 230, 319], bgm: 'd_04',
    boss: { sp: 130, lv: 26, lvMin: 22, lvUp: 3, hp: 1.6, bgm: 'ba_tenno', say: [
      { who: 'narr', text: K('1598년 11월, 노량 앞바다. 물러가려는 적선 수백 척과 조명 연합 수군이 맞붙었다.', 'November 1598, the strait of Noryang. Hundreds of withdrawing enemy ships clash with the Joseon-Ming fleet.') },
      { who: 130, text: K('크와아아앙! 불타는 배들 사이로 갸라도스가 날뛴다!', 'Graaaah! Gyarados rampages between the burning ships!') },
      { who: 'partner', text: K('이게 7년 전쟁의 마지막 싸움이야. 끝까지 함께하자!', 'This is the last battle of the seven-year war. Together to the end!') }],
    after: [{ who: 130, text: K('…바다가 조용해졌다. 이제 정말 끝났구나.', '...The sea is quiet. It\'s truly over now.') }] } };
  e.nodes.push({ id: 'noryang', name: K('노량', 'Noryang'), lon: 127.95, lat: 35.1, d: 'noryang' });
  const k = e.main.findIndex((st) => st.do === 'dungeon' && st.d === 'uldol');
  e.main.splice(k + 1, 0,
    { do: 'scene', say: [{ who: 'narr', text: K('1597년 9월, 명량. 열세 척의 배로 백서른 척이 넘는 적선을 막아 냈다. 그리고 이듬해, 적이 물러가기 시작했다.', 'September 1597, Myeongnyang: thirteen ships held off more than 130. The next year, the enemy began to withdraw.') }] },
    { do: 'dungeon', d: 'noryang', log: K('노량 앞바다로! 마지막 해전 (물 타입만)', 'To Noryang! The last sea battle (Water types only)') });
}
{ // 1866: Gardevoir guards the royal archive the French came to loot
  const d = J(1866).dungeons.jeongjok;
  d.boss = { sp: 282, lv: 35, lvMin: 30, lvUp: 3, hp: 2.2, atk: 0.9, cap: 0.3, bgm: 'ba_secret1', moves: [94, 247, 85, 95],
    tele: { name: K('미래예지', 'Future Sight'), every: 3, dmg: 0.32, stagger: 1, pats: ['far', 'target', 'ring', 'checker'], type: 14 },
    say: [
      { who: 282, name: K('가디안', 'Gardevoir'), text: K('…이 산성의 사고에는 왕실의 기록이 잠들어 있어요. 누구도 함부로 가져가게 두지 않겠어요.', '...The royal records sleep in this fortress\'s archive. I will let no one carry them off.') },
      { who: 'partner', text: K('가디안은 앞날을 내다봐! 붉은 칸이 나타나면 미리 피하자!', 'Gardevoir can see the future! When red tiles appear, get out of the way early!') }],
    after: [{ who: 282, name: K('가디안', 'Gardevoir'), text: K('…당신들의 마음이 보여요. 기록을 지키러 왔군요. 함께 가겠어요.', '...I can see your hearts. You came to protect the records. I will go with you.') }],
    join: K('가디안이 조용히 손을 내밀었다. 함께 가고 싶어 한다!', 'Gardevoir quietly holds out a hand. It wants to come along!') };
}
{ // 1887: Metagross, a steel brain overheating in the new power plant; Electivire waits halfway
  const d = J(1887).dungeons.plant;
  d.mid = { ...d.boss, floor: 2 };
  d.boss = { sp: 376, lv: 44, lvMin: 38, lvUp: 4, hp: 2.1, atk: 0.9, cap: 0.35, bgm: 'ba_chanp', moves: [309, 428, 418, 89], // 600-class tier (dungeon.js bossTier) scales these
    tele: [
      { name: K('코멧펀치', 'Meteor Mash'), every: 3, dmg: 0.36, stagger: 1, pats: ['cols', 'rows', 'cross', 'target'], type: 8, first: 2 },
      { at: 0.5, name: K('사이코키네시스', 'Psychic'), every: 2, dmg: 0.4, stagger: 1, pats: ['checker', 'quad', 'x', 'ring', 'star'], type: 14,
        msg: K('메타그로스의 네 개의 뇌가 한꺼번에 계산을 시작했다! 공격이 빨라진다!', 'Metagross\'s four brains start calculating at once! Its attacks speed up!'),
        line: [{ who: 376, name: K('메타그로스', 'Metagross'), text: K('…계산 완료. 너희의 다음 움직임, 모두 예측했다.', '...Calculation complete. I have predicted your every next move.') }] },
    ],
    say: [
      { who: 'narr', text: K('발전기의 굉음 속에서, 네 개의 다리를 가진 강철 거인이 눈을 떴다.', 'Amid the roar of the generators, a four-legged steel giant opens its eyes.') },
      { who: 376, name: K('메타그로스', 'Metagross'), text: K('철컹… 철컹… 과열… 과열… 침입자 제거.', 'Clank... clank... overheating... overheating... removing intruders.') },
      { who: 'partner', text: K('메타그로스는 단단하고 계산이 빨라! 붉은 칸을 피하고 빈틈을 노리자!', 'Metagross is tough and calculates fast! Dodge the red tiles and hit its openings!') }],
    after: [{ who: 376, name: K('메타그로스', 'Metagross'), text: K('…냉각 완료. 너희는 위협이 아니다. 동행을 요청한다.', '...Cooling complete. You are no threat. Requesting to accompany you.') }],
    join: K('메타그로스가 무거운 몸을 낮추었다. 함께 가고 싶어 한다!', 'Metagross lowers its heavy body. It wants to come along!') };
}
{ // 1945: Palkia now ends the rift; Arceus waits in the last era
  const e = J(1945), d = e.dungeons.rift;
  d.boss = { ...d.mid, after: [
    { who: 484, text: K('…공간을 비튼 것은 내가 아니다. 더 먼 시간 속에서, 모든 것을 만든 자가 너희를 지켜보고 있다.', '...It was not I who twisted space. Further along in time, the one who made everything is watching you.') },
    { who: CELEBI, name: '세레비', text: K('모든 것을 만든… 아르세우스? 더 먼 시대의 꽃잎이 있는 곳에서 만나게 될지도 몰라.', 'The one who made everything... Arceus? We might meet it where the last petal is.') }] };
  delete d.mid;

}

// second towns for the Joseon-era chapters (each era's world map shows both)
const TOWN2 = {
  1392: { node: [126.55, 37.97], town: { name: K('개경 · 옛 도읍', 'Gaegyeong, the old capital'), bgm: 'town03_d', bgmN: 'town03_n', biome: 'autumn',
    houses: ['hanok', 'choga', 'hanok', 'choga'], props: ['maple', 'persimmon', 'jars', 'logs'],
    npcs: [
      { id: 'kg1392a', sp: 79, name: K('개경 토박이 야돈', 'Gaegyeong Local Slowpoke'), x: 22, y: 15, say: [{ text: K('도읍이 한양으로 옮겨 간다니… 오백 년 고려의 도읍도 이제 조용해지겠구먼.', 'The capital is moving to Hanyang... After five hundred years, Goryeo\'s old capital will go quiet.') }] },
      { id: 'kg1392b', sp: 133, name: K('이브이', 'Eevee'), x: 14, y: 19, wander: 2, say: [{ text: K('선죽교 돌다리에는 붉은 자국이 남아 있대. 정몽주 선생의 이야기야.', 'They say there is a red stain on the stones of Seonjuk Bridge. It\'s the story of Jeong Mong-ju.') }] },
    ] } },
  1592: { node: [128.66, 35.02], town: { name: K('한산도 통제영', 'Hansan Naval Command'), bgm: 'city07_d', bgmN: 'city07_n', biome: 'coast',
    houses: ['hanok', 'choga', 'choga', 'hanok'], props: ['logs', 'crates', 'jars', 'maple'], ships: ['panokseon', 'boat'],
    npcs: [
      { id: 'hs1592a', sp: 230, name: K('수군 킹드라', 'Navy Kingdra'), x: 22, y: 15, say: [{ text: K('이곳 한산도에 삼도수군통제영을 두었다. 장군께서는 제승당에서 작전을 세우신다.', 'The Three-Province Naval Command was set up here on Hansan. The admiral plans his battles at Jeseungdang.') }] },
      { id: 'hs1592b', sp: 278, name: K('갈모매', 'Wingull'), x: 14, y: 19, wander: 2, say: [{ text: K('끼룩! 장군님은 바쁜 와중에도 날마다 일기를 쓰신대. 난중일기래!', 'Kyuu! Busy as he is, the admiral writes a diary every day. The War Diary!') }] },
    ] } },
  1636: { node: [126.45, 37.72], town: { name: K('강화도', 'Ganghwa Island'), bgm: 'city11_d', bgmN: 'city11_n', biome: 'snow',
    houses: ['hanok_snow', 'hanok_snow', 'hanok_snow', 'hanok_snow'], props: ['snowpine', 'baretree', 'logs', 'jars'],
    npcs: [
      { id: 'gh1636a', sp: 80, name: K('피란 온 야도란', 'Refugee Slowbro'), x: 22, y: 15, say: [{ text: K('왕실 가족은 이곳 강화도로 피했지. 바다가 지켜 줄 거라 믿었는데…', 'The royal family fled here to Ganghwa. We believed the sea would protect us...') }] },
      { id: 'gh1636b', sp: 220, name: K('꾸꾸리', 'Swinub'), x: 14, y: 19, wander: 2, say: [{ text: K('꾸꾸… 바닷물까지 얼 것 같은 추위야.', 'Oink... It\'s so cold even the sea might freeze.') }] },
    ] } },
  1887: { node: [126.52, 37.42], town: { name: K('제물포 항구', 'Jemulpo Port'), bgm: 'city02_d', bgmN: 'city02_n', biome: 'coast', pearl: 'C02', // Canalave's harbour and canal
    houses: ['western', 'hanok', 'western', 'choga'], props: ['crates', 'lamp', 'pole', 'jars'], ships: ['boat'],
    npcs: [
      { id: 'jm1887a', sp: 52, name: K('무역상 나옹', 'Trader Meowth'), x: 22, y: 15, say: [{ text: K('1883년에 항구가 열린 뒤로 서양 배가 끊이질 않아. 성냥, 석유, 옷감… 별게 다 들어온다냥.', 'Since the port opened in 1883, Western ships never stop coming. Matches, kerosene, cloth... everything comes in, meow.') }] },
      { id: 'jm1887b', sp: 81, name: K('코일', 'Magnemite'), x: 14, y: 19, wander: 2, say: [{ text: K('삐빗. 이곳에서 서울까지 기찻길을 놓을 계획이 있다. 삐빗.', 'Beep. There are plans to lay a railway from here to Seoul. Beep.') }] },
    ] } },
  1919: { node: [127.3, 36.75], town: { name: K('아우내 장터', 'Aunae Market'), bgm: 'town01_d', bgmN: 'town01_n', biome: 'spring',
    houses: ['choga', 'hanok', 'choga', 'choga'], props: ['jars', 'logs', 'cherry', 'bamboo'],
    npcs: [
      { id: 'au1919a', sp: 39, name: K('장터 푸린', 'Market Jigglypuff'), x: 22, y: 15, say: [{ text: K('4월 1일 장날, 유관순 언니와 마을 사람들이 태극기를 나눠 주며 만세를 불렀어.', 'On market day, April 1, Yu Gwan-sun and the villagers handed out flags and shouted "Manse!"') }] },
      { id: 'au1919b', sp: 183, name: K('마릴', 'Marill'), x: 14, y: 19, wander: 2, say: [{ text: K('그날 많은 사람이 다치고 붙잡혀 갔대… 그래도 만세 소리는 멈추지 않았어.', 'Many were hurt and arrested that day... but the cheers never stopped.') }] },
    ] } },
  1920: { node: [129.5, 42.78], town: { name: K('용정', 'Yongjeong'), bgm: 'city04_d', bgmN: 'city04_n', biome: 'camp',
    houses: ['choga', 'choga', 'hanok', 'choga'], props: ['logs', 'campfire', 'jars', 'crates'],
    npcs: [
      { id: 'yj1920a', sp: 64, name: K('학교 선생님 윤겔라', 'Teacher Kadabra'), x: 22, y: 15, say: [{ text: K('간도 용정에는 우리 학교가 여럿 있지. 아이들에게 우리말과 역사를 가르친다네.', 'Yongjeong in Jiandao has several Korean schools. We teach the children our language and history.') }] },
      { id: 'yj1920b', sp: 163, name: K('부우부', 'Hoothoot'), x: 14, y: 19, wander: 2, say: [{ text: K('부우! 멀리 고향을 떠나온 사람들이 서로 기대어 살고 있어.', 'Hoo! People far from home lean on each other here.') }] },
    ] } },
  1940: { node: [124.45, 34.1], town: { name: K('충칭 · 임시정부', 'Chongqing · Provisional Government'), bgm: 'city11_d', bgmN: 'city11_n', biome: 'modern', police: false, // free China
    houses: ['western', 'hanok', 'western', 'western'], props: ['lamp', 'crates', 'pole', 'bamboo'],
    npcs: [
      { id: 'kla40', sp: 448, name: K('광복군 대원 루카리오', 'Liberation Army Lucario'), x: 22, y: 15, say: [{ text: K('우리는 이곳 충칭에서 나라를 되찾을 군대를 기르고 있다.', 'Here in Chongqing we are raising an army to win our country back.') }] },
      { id: 'gov40', sp: 65, name: K('임시정부 후딘', 'Provisional Government Alakazam'), x: 14, y: 19, wander: 2, say: [{ text: K('임시정부는 상하이를 떠나 여러 도시를 옮겨 다니다가, 1940년 이곳 충칭에 자리 잡았지.', 'The Provisional Government left Shanghai, moved from city to city, and settled here in Chongqing in 1940.') }] },
    ] } },
};
for (const [y, t] of Object.entries(TOWN2)) {
  const e = J(+y);
  e.town2 = t.town;
  // a history mark at the same spot would sit under the town's icon; the town's people tell that story instead
  e.nodes = e.nodes.filter((n) => !(n.mark && Math.hypot(n.lon - t.node[0], n.lat - t.node[1]) < 0.25));
  e.nodes.splice(1, 0, { id: 'town2', name: t.town.name, lon: t.node[0], lat: t.node[1], town: 2 });
}

// The Joseon chapters were balanced as the opening of the game; they now come after six earlier eras,
// so their foes and bosses are lifted to continue the level curve (about Lv 23 in 1392 to Lv 58 in 1945).
function lift(e, j) {
  const f = (lv) => Math.round(lv * 0.92 + 19 - j * 0.5);
  for (const d of Object.values(e.dungeons)) {
    d.lv = d.lv.map(f);
    for (const b of [d.boss, d.mid]) if (b) { b.lv = f(b.lv); if (b.lvMin) b.lvMin = f(b.lvMin); }
  }
}
JOSEON.forEach(lift);

const J1919 = JOSEON.findIndex((e) => e.year === 1919);
export const ERAS = [...ANCIENT, ...JOSEON.slice(0, J1919), ERA_1905, ...JOSEON.slice(J1919), ...WAR, ERA_1979];
ERAS.forEach((e, i) => { e.id = i + 1; });
addPostWar(ERAS.filter((e) => e.year >= 1945));
// the battle for Seoul is behind the team once 1950's story has gone past it (and in every later era)
const seoulWon = () => { const e = ERAS[S.era]; return e.year > 1950 || (e.year === 1950 && S.step > e.main.findIndex((s) => s.d === 'seoul1950')); };
addSkyLine(ERAS.filter((e) => e.year >= 1950), seoulWon);
Object.assign(QITEMS, ANCIENT_QITEMS, WAR_QITEMS, MODERN_QITEMS);
// the Arceus finale's guardians and the Boss Tower fight as the story's own legends (the first of each species met)
const bossOf = (sp) => ERAS.flatMap((e) => Object.values(e.dungeons).flatMap((d) => [d.boss, d.mid])).find((b) => b?.sp === sp);
addFinale(bossOf);
addTower(ERA_1979, bossOf);

// shown the first time a boss with telegraphed attacks appears
export const TELE_TUT = [
  { who: 'partner', text: '조심해! 바닥이 붉게 빛나는 곳에는 곧 강력한 공격이 떨어져. 위쪽에 표시된 턴이 지나기 전에 붉은 칸 밖으로 피하자!' },
  { who: 'partner', text: '큰 기술을 쓴 직후에는 빈틈이 생겨. 그때 공격하면 1.5배 피해를 줄 수 있어!' },
];

export const CELEBI_INTRO = [
  { who: 'narr', text: '……어디선가 맑은 방울 소리가 들린다.' },
  { who: CELEBI, name: '???', text: '깨어났구나! 다행이다. 나는 시간을 여행하는 포켓몬, 세레비야.' },
  { who: CELEBI, name: '세레비', text: K('시간의 꽃이 부서져서, 꽃잎 스무 장이 한반도의 역사 곳곳으로 흩어져 버렸어.', 'The Flower of Time shattered, and its twenty petals scattered across the history of the Korean peninsula.') },
  { who: CELEBI, name: '세레비', text: K('꽃잎은 그 시대 사람들과 포켓몬의 소원이 이루어질 때 다시 빛나. 고구려의 612년부터 1980년까지, 함께 여행해 줄래?', 'A petal shines again when the wishes of that era\'s people and Pokémon come true. From Goguryeo in 612 to 1980, will you travel with me?') },
  { who: CELEBI, name: '세레비', text: '시간을 건너온 탓인지 너희 몸 색이 조금 달라 보이네. 반짝반짝 예쁜걸!' },
];
