// The Boss Tower (보스 탑): once the journey's story is over (1979's last quest done), a tower rises on the last era's map
// where nothing but legendary Pokémon wait, one stage a floor, ten floors, no wild Pokémon in between (dungeon.js
// stages). Lesser legends come in pairs that cover each other's weaknesses and fight as they did in the story; the
// great ones come alone, 15% stronger in HP and attack, and Arceus, 15% stronger too, waits at the top. Nothing in the
// tower can be caught. Between floors the team is restored (Dungeon.restoreTeam), and a later visit may start above
// the highest floor cleared (S.flags.towerTop, scenes.js WorldMap).
import { K, T } from './content_k.js';
import { S } from './game.js';
import { ARCEUS } from './content_modern.js';

// Latias and Latios never fight as bosses in the story (in town they join by choice): their tower selves
const LATI = (sp, moves, tele) => ({ sp, hp: 1.9, atk: 0.85, cap: 0.34, bgm: 'ba_secret2', moves, tele });
const LATIAS = LATI(380, [296, 406, 94, 225], { name: K('미스트볼', 'Mist Ball'), every: 3, dmg: 0.32, pats: ['ring', 'target', 'checker', 'near'], type: 14 });
const LATIOS = LATI(381, [295, 406, 94, 337], { name: K('라스트버지', 'Luster Purge'), every: 3, dmg: 0.32, pats: ['cross', 'x', 'far', 'rows'], type: 14 });

const UP = 1.15; // the great legends' edge in the tower: HP and attack
// a tower boss: the story's own (moves, blasts, later forms), at the team's level like Arceus, never joining
const keeper = (b, k = 1) => ({ ...b, hp: b.hp * k, atk: b.atk * k, lv: 180, lvMin: 70, lvUp: 2, lvCap: 180, noJoin: true, noWander: true, say: [], after: [] });
const narr = (ko, en) => ({ who: 'narr', text: K(ko, en) });
const tip = (ko, en) => ({ who: 'partner', text: K(ko, en) });

export function addTower(era, bossOf) {
  const pair = (a, b, tiles, tint, say) => ({ bosses: [keeper(a), keeper(b)], tiles, tint, say });
  const one = (b, tiles, tint, say) => ({ boss: keeper(b, UP), tiles, tint, say });
  const stages = [
    pair(bossOf(145), bossOf(144), T.mountain, 'rgba(150,200,255,0.10)', [
      narr('보스 탑 1층. 번개와 얼음 바람이 한꺼번에 몰아친다! 썬더와 프리져가 서로의 등을 지키며 날아올랐다.', 'Boss Tower, floor 1. Lightning and an icy wind strike at once! Zapdos and Articuno take wing, each guarding the other\'s back.'),
      tip('서로의 약점을 덮어 주고 있어. 바위 기술은 둘 다에게 잘 들어!', 'They cover each other\'s weaknesses. Rock moves hit them both hard!')]),
    pair(bossOf(146), bossOf(245), T.volcano, 'rgba(255,150,90,0.08)', [
      narr('2층. 불길과 북풍이 맞부딪친다! 파이어의 불꽃을 스이쿤의 물결이 감싸 안았다.', 'Floor 2. Fire meets the north wind! Suicune\'s waters wrap around Moltres\'s flames.'),
      tip('불은 물이 지켜 주고, 물은 불이 지켜 줘. 전기 기술은 둘 다에게 잘 들어!', 'Water guards the fire and fire guards the water. Electric moves hit them both hard!')]),
    pair(bossOf(481), bossOf(482), T.crystal, 'rgba(255,150,220,0.08)', [
      narr('3층. 잔잔한 호수 같은 방에 마음과 의지가 소용돌이친다. 엠라이트와 아그놈이 나란히 떠올랐다!', 'Floor 3. Emotion and willpower swirl in a room as still as a lake. Mesprit and Azelf rise side by side!'),
      tip('둘 다 에스퍼 타입이야. 악이나 고스트 기술을 노리자!', 'Both are Psychic types. Go for Dark or Ghost moves!')]),
    pair(LATIAS, LATIOS, T.field, 'rgba(160,200,255,0.10)', [
      narr('4층. 바람을 가르는 소리와 함께 붉고 푸른 두 날개가 내려왔다. 라티아스와 라티오스 남매다!', 'Floor 4. With a rush of wind, two wings, red and blue, sweep down. It\'s the siblings Latias and Latios!'),
      tip('드래곤과 에스퍼 타입! 얼음, 드래곤, 악 기술이 잘 들어!', 'Dragon and Psychic types! Ice, Dragon and Dark moves work well!')]),
    pair(bossOf(378), bossOf(485), T.fortsnow, 'rgba(200,220,255,0.10)', [
      narr('5층. 한쪽은 얼어붙고 한쪽은 끓어오른다! 레지아이스와 히드런이 얼음과 용암으로 길을 막았다.', 'Floor 5. One side freezes, the other boils! Regice and Heatran block the way with ice and lava.'),
      tip('얼음과 불꽃이 서로를 덮어 줘. 격투 기술은 둘 다에게 잘 들어!', 'Ice and fire cover for each other. Fighting moves hit them both hard!')]),
    one(bossOf(150), T.library, 'rgba(90,40,120,0.12)', [
      narr('6층. 공기가 무겁게 가라앉는다… 억눌린 힘을 품은 뮤츠가 홀로 기다리고 있다!', 'Floor 6. The air turns heavy... Mewtwo waits alone, its held-back power all around it!'),
      tip('여기서부터는 한 마리씩이지만 이야기 때보다 훨씬 강해! 끝까지 집중하자!', 'From here they come one at a time, but far stronger than in the story! Stay sharp to the end!')]),
    one(bossOf(483), T.castle, 'rgba(110,150,255,0.12)', [
      narr('7층. 시계 소리가 멎었다. 시간의 신 디아루가가 금강석 같은 몸을 일으킨다!', 'Floor 7. The ticking stops. Dialga, lord of time, raises its adamant body!'),
      tip('시간의 포효가 오면 HP를 넉넉히 채워 두자!', 'Keep your HP topped up for the Roar of Time!')]),
    one(bossOf(484), T.rift, 'rgba(255,140,210,0.10)', [
      narr('8층. 벽과 바닥이 늘어났다 줄어든다. 공간의 신 펄기아가 길을 막아선다!', 'Floor 8. The walls and floor stretch and shrink. Palkia, lord of space, blocks the way!'),
      tip('공간절단이 싸움터를 좁혀! 가장자리에 서 있지 말자!', 'Spacial Rend closes the arena in! Don\'t stand at the edges!')]),
    one(bossOf(487), T.rift, 'rgba(70,0,90,0.22)', [
      narr('9층. 위와 아래가 뒤집혔다! 반전세계의 주인 기라티나가 그림자 속에서 솟아오른다!', 'Floor 9. Up and down turn over! Giratina, master of the Distortion World, rises from the shadows!'),
      tip('여러 가지 기술이 번갈아 날아와. 바닥의 붉은 칸을 잘 보자!', 'Its attacks keep changing. Watch the red tiles on the floor!')]),
    one(ARCEUS, T.temple, 'rgba(255,226,150,0.12)', [
      narr('보스 탑 꼭대기. 눈부신 빛 속에서 아르세우스가 기다리고 있었다.', 'The top of the Boss Tower. Arceus was waiting in a blinding light.'),
      { who: 493, name: K('아르세우스', 'Arceus'), text: K('…다시 왔구나. 이번에는 조금도 봐주지 않겠다.', '...So you came again. This time I will hold nothing back.') },
      tip('마지막이야! 지금까지 익힌 걸 모두 쏟아붓자!', 'This is the last one! Give it everything we\'ve learned!')]),
  ];
  era.dungeons.tower = { name: K('보스 탑', 'Boss Tower'), tiles: T.temple, floors: stages.length, lv: [66, 70], mons: [], bgm: 'd_ginlobby', tower: true, stages };
  era.nodes.push({ id: 'tower', name: era.dungeons.tower.name, lon: 128.3, lat: 37.95, d: 'tower', when: () => S.step >= era.main.length });
}
