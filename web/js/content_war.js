// The last era: the Korean War (1950-1953). The player picks the side whose people they stay with;
// both routes follow the real course of the war and end at the armistice. Town, NPCs and the main
// quest come from the chosen side (S.faction); dungeons and the finale are shared.
import { K, T, CELEBI, SIG } from './content_k.js';
import { S } from './game.js';
import { tr } from './i18n.js'; // runtime lines (they read a name) must follow the language live; K() is for fixed story text

// faction companions offered when the side is chosen
export const FACTIONS = {
  south: { name: K('민주주의 남한 · 대한민국', 'Democratic South · Republic of Korea'), mons: [59, 230, 18] },
  north: { name: K('공산주의 북한 · 조선민주주의인민공화국', 'Communist North · DPRK'), mons: [217, 227, 232] },
};
export const FACTION_TALK = [
  { who: CELEBI, name: '세레비', text: K('…나라가 38도선을 사이에 두고 남과 북으로 갈라지고 있어. 남쪽은 민주주의, 북쪽은 공산주의 정부를 세우려 해.', '...The country is being split at the 38th parallel. The south means to build a democratic government, the north a communist one.') },
  { who: CELEBI, name: '세레비', text: K('이 갈라짐은 5년 뒤 전쟁으로 이어져. 어느 쪽에 서든, 사람과 포켓몬 모두에게 아픈 시간이 될 거야.', 'This split leads to war five years from now. Whichever side you stand on, it will be a painful time for people and Pokémon alike.') },
  { who: CELEBI, name: '세레비', text: K('어느 쪽 사람들 곁에 있을지 골라 줘. 역사는 바뀌지 않지만, 우리가 지킬 수 있는 사람과 포켓몬은 분명히 있을 거야.', 'Choose whose side you\'ll stay beside. History won\'t change, but there will surely be people and Pokémon we can protect.') },
];
export const FACTION_PICK = { text: K('함께할 포켓몬을 골라 줘. 그 땅에서 너희를 도와줄 거야.', 'Pick a Pokémon to travel with. It will help you in that land.') };

const SOUTH = {
  town: {
    name: K('부산 · 임시 수도', 'Busan, wartime capital'), bgm: 'city10_d', bgmN: 'city08_n', biome: 'war', landmark: 'gate',
    houses: ['western', 'choga', 'tent', 'hanok', 'tent', 'choga', 'western', 'tent'], props: ['crates', 'pole', 'lamp', 'jars', 'logs', 'campfire'],
  },
  town2: {
    name: K('대구 · 피란민 거리', 'Daegu refugee quarter'), bgm: 'city11_d', bgmN: 'city11_n', biome: 'war',
    houses: ['tent', 'choga', 'tent', 'western'], props: ['crates', 'campfire', 'jars', 'logs'],
    npcs: [
      { id: 'teacher1950', sp: 199, name: K('천막 학교 선생님 야도킹', 'Tent-school Teacher Slowking'), x: 22, y: 15, say: [{ text: K('천막 학교에서도 아이들은 공부를 해. 칠판 하나, 공책 몇 권이 전부지만.', 'Even in a tent school the children study. One blackboard and a few notebooks, that\'s all.') }] },
      { id: 'pup1950', sp: 58, name: K('가디', 'Growlithe'), x: 14, y: 19, wander: 2, say: [{ text: K('멍! 주인을 찾고 있어. 피란 오다 길을 잃었거든.', 'Woof! I\'m looking for my owner. We got separated on the way here.') }] },
    ],
  },
  npcs: [
    { id: 'nurse1950', sp: 242, name: K('간호장교 해피너스', 'Army Nurse Blissey'), x: 22, y: 15, say: [{ text: K('다친 사람은 누구든 치료해요. 군인이든 피란민이든, 포켓몬이든요.', 'I treat anyone who is hurt. Soldiers, refugees, Pokémon.') }] },
    { id: 'reporter1950', sp: 178, name: K('종군기자 네이티오', 'War Correspondent Xatu'), x: 27, y: 12, say: [{ text: K('나는 보고 들은 것을 기록할 뿐이오. 전쟁이 무엇을 남기는지 잊히지 않도록.', 'I only record what I see and hear, so no one forgets what war leaves behind.') }] },
    { id: 'market1950', sp: 52, name: K('국제시장 나옹', 'Market Meowth'), x: 9, y: 16, say: [{ text: K('부산 국제시장엔 피란민들이 별의별 물건을 다 내다 팔아. 다들 살아야 하니까냥.', 'Refugees sell every kind of thing at Busan\'s market. Everyone has to get by, meow.') }] },
    { id: 'mother1950', sp: 115, name: K('피란민 캥카', 'Refugee Kangaskhan'), x: 31, y: 19, say: [{ text: K('북쪽에서 내려오다 남편과 헤어졌어요… 꼭 다시 만날 거예요.', 'I lost my husband on the way down from the north... We will meet again.') }] },
    { id: 'student1950', sp: 296, name: K('학도병 마크탕', 'Student Soldier Makuhita'), x: 14, y: 21, wander: 2, say: [{ text: K('교복을 입은 채로 전쟁터에 나왔어요. 엄마가 보고 싶어요.', 'I went to the front still in my school uniform. I miss my mom.') }] },
  ],
  main: [
    { do: 'talk', npc: 'nurse1950', log: K('간호장교 해피너스와 이야기하자', 'Talk to Army Nurse Blissey'), say: [
      { who: 242, name: K('간호장교 해피너스', 'Army Nurse Blissey'), text: K('북한군이 낙동강까지 내려왔어요. 낙동강 방어선이 마지막 보루예요.', 'The North Korean army has pushed down to the Nakdong. The Nakdong line is the last stand.') },
      { who: 242, name: K('간호장교 해피너스', 'Army Nurse Blissey'), text: K('그런데 강가에서 포성에 미쳐 버린 커다란 용 포켓몬이 날뛰어서, 다친 사람들을 옮길 수가 없어요!', 'But a huge dragon Pokémon, driven mad by the shelling, is rampaging by the river and we can\'t move the wounded!') }] },
    { do: 'dungeon', d: 'nakdong', log: K('낙동강 전선의 한카리아스를 진정시키자', 'Calm Garchomp on the Nakdong front') },
    { do: 'talk', npc: 'reporter1950', log: K('종군기자 네이티오에게 가 보자', 'See War Correspondent Xatu'), say: [
      { who: 178, name: K('종군기자 네이티오', 'War Correspondent Xatu'), text: K('유엔군이 인천에 상륙하려 하오. 인천 앞바다는 밀물과 썰물의 차이가 9미터가 넘는 곳이오.', 'The UN forces are about to land at Incheon, where the tide rises and falls more than nine meters.') },
      { who: 178, name: K('종군기자 네이티오', 'War Correspondent Xatu'), text: K('바다 포켓몬들이 놀라 배들이 위험하다는군. 물 포켓몬들과 가 보시오.', 'The sea Pokémon are panicking and the boats are in danger. Go with your Water types.') }] },
    { do: 'dungeon', d: 'incheon', log: K('인천 앞바다의 씨카이저를 진정시키자 (물 타입만)', 'Calm Walrein off Incheon (Water types only)') },
    { do: 'scene', say: [
      { who: 'narr', text: K('1950년 9월 15일, 인천 상륙 작전. 9월 28일 서울을 되찾았고, 국군과 유엔군은 38도선을 넘어 압록강까지 올라갔다.', 'September 15, 1950, the Incheon landing. Seoul was retaken on the 28th, and ROK and UN troops crossed the 38th parallel up to the Yalu.') },
      { who: 'narr', text: K('10월, 중국군이 전쟁에 뛰어들었다. 전선은 다시 남쪽으로 밀리기 시작했다.', 'In October China entered the war, and the front began to be pushed south again.') }] },
    { do: 'talk', npc: 'nurse1950', log: K('해피너스에게 돌아가자', 'Return to Blissey'), say: [
      { who: 242, name: K('간호장교 해피너스', 'Army Nurse Blissey'), text: K('장진호에서 군인들이 영하 30도 추위 속에 갇혔대요. 동상으로 쓰러지는 사람이 너무 많아요…', 'Soldiers are trapped at the Chosin Reservoir in cold below minus thirty. So many are going down with frostbite...') }] },
    { do: 'dungeon', d: 'chosin', log: K('얼어붙은 장진호의 눈설왕을 진정시키자', 'Calm Abomasnow at the frozen Chosin Reservoir') },
    { do: 'scene', say: [
      { who: 'narr', text: K('1950년 12월, 흥남 철수. 10만 명이 넘는 피란민이 배를 타고 남쪽으로 떠났다. 메러디스 빅토리호 한 척에만 1만 4천 명이 탔다.', 'December 1950, the Hungnam evacuation. Over 100,000 refugees left by sea for the south; the SS Meredith Victory alone carried 14,000.') },
      { who: 'narr', text: K('1951년 1월 4일, 서울을 다시 내주었다. 그 뒤로 전선은 38도선 근처에서 멈춘 채 2년 넘게 이어졌다.', 'On January 4, 1951, Seoul was lost again. After that the front stalled near the 38th parallel for more than two years.') }] },
    { do: 'talk', npc: 'reporter1950', log: K('네이티오에게 판문점 소식을 듣자', 'Hear Xatu\'s news from Panmunjom'), say: [
      { who: 178, name: K('종군기자 네이티오', 'War Correspondent Xatu'), text: K('판문점에서 정전 회담이 2년째 이어지고 있소. 그런데… 그 하늘에 커다란 틈이 열렸다는 소문이 돌고 있소.', 'The armistice talks at Panmunjom have gone on for two years. And now... rumor says a great rift has opened in the sky there.') },
      { who: CELEBI, name: '세레비', text: K('이 시대의 꽃잎이 거기 있어! 모든 시대의 시간이 그곳으로 빨려 들어가고 있어. 가자!', 'The petal of this era is there! The time of every era is being pulled into it. Let\'s go!') }] },
    { do: 'dungeon', d: 'panmun', log: K('판문점 하늘의 시간의 틈 가장 깊은 곳으로!', 'Into the depths of the rift over Panmunjom!') },
  ],
};

const NORTH = {
  town: {
    name: K('평양', 'Pyongyang'), bgm: 'city10_d', bgmN: 'city08_n', biome: 'war', landmark: 'gate',
    houses: ['choga', 'western', 'tent', 'hanok', 'choga', 'tent', 'hanok', 'tent'], props: ['crates', 'pole', 'jars', 'logs', 'campfire', 'lamp'],
  },
  town2: {
    name: K('흥남 부두', 'Hungnam Docks'), bgm: 'city02_d', bgmN: 'city02_n', biome: 'snow', pearl: 'C09', // Snowpoint's snowy harbour: the December evacuation
    houses: ['choga', 'tent', 'choga', 'western'], props: ['crates', 'logs', 'jars', 'campfire'], ships: ['boat'],
    npcs: [
      { id: 'lapras1950', sp: 131, name: K('라프라스', 'Lapras'), x: 22, y: 15, say: [{ text: K('부두에 사람들이 잔뜩 모였어. 남쪽으로 가는 배를 기다린대. 다시 돌아올 수 있을까…', 'The docks are packed with people waiting for ships south. Will they ever come back...') }] },
      { id: 'gull1950', sp: 278, name: K('갈모매', 'Wingull'), x: 14, y: 19, wander: 2, say: [{ text: K('끼룩… 눈보라 속에서 배 위에 사람이 빼곡해.', 'Kyuu... In the blizzard the ships are packed with people.') }] },
    ],
  },
  npcs: [
    { id: 'doctor1950', sp: 113, name: K('의사 럭키', 'Doctor Chansey'), x: 22, y: 15, say: [{ text: K('다친 사람이 끝도 없어. 누구 편인지는 상관없어. 살려야 해.', 'The wounded never stop coming. Whose side they\'re on doesn\'t matter. They have to live.') }] },
    { id: 'miner1950', sp: 75, name: K('광부 데구리', 'Miner Graveler'), x: 27, y: 12, say: [{ text: K('폭격 소리가 들리면 다들 방공호로 뛰어. 밤에도 잠을 못 자.', 'When the bombers come everyone runs for the shelters. No one sleeps at night.') }] },
    { id: 'youth1950', sp: 66, name: K('징집된 청년 알통몬', 'Conscript Machop'), x: 9, y: 16, say: [{ text: K('난 그저 고향에서 농사를 짓고 싶었어… 이 전쟁은 언제 끝날까.', 'All I wanted was to farm back home... When will this war end?') }] },
    { id: 'grandma1950', sp: 40, name: K('할머니 푸크린', 'Grandma Wigglytuff'), x: 31, y: 19, say: [{ text: K('피란길에 손주 손을 놓쳤어… 남쪽으로 갔을까, 살아만 있으면 좋겠구나.', 'I let go of my grandchild\'s hand on the road... Did they go south? If only they\'re alive.') }] },
    { id: 'togepi1950', sp: 175, name: K('토게피', 'Togepi'), x: 14, y: 21, wander: 2, say: [{ text: K('토게토게… 방공호에 숨으면 무서운 소리가 조금 멀어져.', 'Toge toge... In the shelter the scary noises get a little farther away.') }] },
  ],
  main: [
    { do: 'talk', npc: 'doctor1950', log: K('의사 럭키와 이야기하자', 'Talk to Doctor Chansey'), say: [
      { who: 113, name: K('의사 럭키', 'Doctor Chansey'), text: K('전쟁이 시작된 지 두 달… 남쪽 낙동강 전선에서 다친 사람들이 실려 오고 있어.', 'Two months since the war began... The wounded are being carried back from the Nakdong front in the south.') },
      { who: 113, name: K('의사 럭키', 'Doctor Chansey'), text: K('강가에서 포성에 미친 용 포켓몬이 날뛰어서 아무도 다가가지 못한대. 누구든 다친 사람은 데려와야 해!', 'A dragon Pokémon gone mad from the shelling is rampaging by the river and no one can get close. Whoever is hurt, we have to bring them back!') }] },
    { do: 'dungeon', d: 'nakdong', log: K('낙동강 전선의 한카리아스를 진정시키자', 'Calm Garchomp on the Nakdong front') },
    { do: 'scene', say: [
      { who: 'narr', text: K('1950년 9월 15일, 유엔군이 인천에 상륙했다. 북한군은 북쪽으로 물러났고, 10월 19일 평양에도 유엔군이 들어왔다.', 'On September 15, 1950, UN forces landed at Incheon. The North Korean army fell back north, and UN troops entered Pyongyang on October 19.') },
      { who: 'narr', text: K('10월 말, 중국군이 압록강을 건너 전쟁에 뛰어들었다.', 'At the end of October, Chinese troops crossed the Yalu and joined the war.') }] },
    { do: 'talk', npc: 'miner1950', log: K('광부 데구리에게 가 보자', 'Go see Miner Graveler'), say: [
      { who: 75, name: K('광부 데구리', 'Miner Graveler'), text: K('장진호 산속에서 중국군과 유엔군이 얼어붙은 채로 맞붙었대. 영하 30도… 양쪽 군인 모두 추위에 쓰러지고 있어.', 'In the mountains at Chosin, Chinese and UN troops are locked in battle in the freezing cold. Minus thirty... soldiers on both sides are dropping from it.') }] },
    { do: 'dungeon', d: 'chosin', log: K('얼어붙은 장진호의 눈설왕을 진정시키자', 'Calm Abomasnow at the frozen Chosin Reservoir') },
    { do: 'talk', npc: 'grandma1950', log: K('할머니 푸크린을 찾아가자', 'Visit Grandma Wigglytuff'), say: [
      { who: 40, name: K('할머니 푸크린', 'Grandma Wigglytuff'), text: K('유엔군이 물러나면서 대동강 철교가 끊어졌대. 그런데 피란민들이 무너진 다리에 매달려 강을 건너고 있어!', 'The Taedong River bridge was blown as the UN troops pulled back. And refugees are clinging to the wreck to cross the river!') },
      { who: 'partner', text: K('강물이 얼음처럼 차가워. 물 포켓몬들과 함께 사람들이 떨어지지 않게 지키자!', 'The water is ice cold. Let\'s go with our Water types and make sure no one falls!') }] },
    { do: 'dungeon', d: 'taedong', log: K('끊어진 대동강 철교 아래를 지키자 (물 타입만)', 'Guard the river under the broken Taedong bridge (Water types only)') },
    { do: 'scene', say: [
      { who: 'narr', text: K('1950년 12월, 흥남 부두에서는 10만 명이 넘는 피란민이 배를 타고 남쪽으로 떠났다. 많은 가족이 그렇게 남과 북으로 갈라졌다.', 'In December 1950, more than 100,000 refugees sailed south from the Hungnam docks. That is how so many families were split between north and south.') },
      { who: 'narr', text: K('1951년부터 전선은 38도선 근처에서 멈췄고, 고지를 차지하려는 싸움이 2년 넘게 이어졌다.', 'From 1951 the front stalled near the 38th parallel, and battles for the hills went on for more than two years.') }] },
    { do: 'talk', npc: 'doctor1950', log: K('럭키에게 판문점 소식을 듣자', 'Hear Chansey\'s news from Panmunjom'), say: [
      { who: 113, name: K('의사 럭키', 'Doctor Chansey'), text: K('판문점에서 정전 회담이 계속되고 있대. 그런데 그 하늘에 이상한 틈이 열렸다는구나.', 'The armistice talks at Panmunjom are still going. And they say a strange rift has opened in the sky there.') },
      { who: CELEBI, name: '세레비', text: K('이 시대의 꽃잎이 거기 있어! 모든 시대의 시간이 그곳으로 빨려 들어가고 있어. 가자!', 'The petal of this era is there! The time of every era is being pulled into it. Let\'s go!') }] },
    { do: 'dungeon', d: 'panmun', log: K('판문점 하늘의 시간의 틈 가장 깊은 곳으로!', 'Into the depths of the rift over Panmunjom!') },
  ],
};
// June 1950: Seoul's streets as a battlefield, built on Veilstone's layout (data/pearl.json C07). Each side brings its
// legend: Groudon marches with the North, Kyogre comes in with the South. Yours fights beside you and joins (with its
// orb) when the battle is won; the other leads the enemy and cannot be caught. Neither can be met again after.
const BATTLE_TOWN = { name: K('서울 · 1950년 6월', 'Seoul, June 1950'), pearl: 'C07', biome: 'war', landmark: null,
  houses: ['western', 'choga', 'hanok', 'western', 'choga', 'hanok'], props: ['crates', 'logs', 'jars', 'pole', 'campfire'] };
const SOUTH_ARMY = [59, 230, 18, 67, 58], NORTH_ARMY = [217, 227, 232, 67, 75];
const GROUDON_JOIN = { sp: 383, item: 'redorb', text: K('그란돈이 땅을 울리며 다가왔다. 주홍구슬이 그 손에서 빛난다. 함께 가고 싶어 한다!', 'Groudon comes over, shaking the ground. The Red Orb glows in its hand. It wants to come along!') };
const KYOGRE_JOIN = { sp: 382, item: 'blueorb', text: K('가이오가가 물보라를 일으키며 다가왔다. 쪽빛구슬이 그 곁에서 빛난다. 함께 가고 싶어 한다!', 'Kyogre comes over in a spray of water. The Blue Orb glows beside it. It wants to come along!') };
// the legends' signature moves: once above half their HP, two or three times below it (their second phase)
const CMD_SIG_AT = [[0.75, 0.4, 0.15], [0.75, 0.42, 0.27, 0.12]];
const COMMANDER = { lv: 60, lvMin: 54, lvUp: 3, hp: 1.5, atk: 0.85, cap: 0.32, noJoin: true, noWander: true, bgm: 'ba_dpoke1' };
const GROUDON_CMD = { ...COMMANDER, sp: 383, moves: [89, 53, 157, 444],
  tele: { name: K('대지의 힘', 'Earth Power'), every: 3, dmg: 0.32, pats: ['near', 'rows', 'cross', 'ring'], type: 4 },
  sig: { use: [SIG.blades], at: CMD_SIG_AT },
  say: [
    { who: 'narr', text: K('1950년 6월 28일. 전쟁이 시작된 지 사흘 만에 서울 거리가 싸움터가 되었다. 땅이 갈라지며 붉은 거인이 북쪽 군대 앞에 섰다!', 'June 28, 1950. Three days into the war, Seoul\'s streets have become a battlefield. The ground splits, and a red giant stands before the northern army!') },
    { who: 383, name: K('그란돈', 'Groudon'), text: K('그오오오…!! 땅을 넓히는 것이 나의 뜻이다. 막아서는 자는 모두 밀어내겠다!', 'Groooh...!! To widen the land is my will. Whoever stands in the way will be pushed aside!') },
    { who: 'partner', text: K('그란돈이 북쪽 군대를 이끌고 있어! 가이오가와 아군이 함께 싸워 줄 거야. 시민들을 지키자!', 'Groudon leads the northern army! Kyogre and our troops will fight with us. Let\'s protect the people!') }],
  after: [{ who: 383, name: K('그란돈', 'Groudon'), text: K('…그르르. 이 땅을 지키려는 마음, 단단하구나. 오늘은 물러나겠다.', '...Grrr. Your will to defend this land is firm. Today I will fall back.') }] };
const KYOGRE_CMD = { ...COMMANDER, sp: 382, moves: [57, 58, 87, 56],
  tele: { name: K('하이드로펌프', 'Hydro Pump'), every: 3, dmg: 0.32, pats: ['far', 'ring', 'cols', 'x'], type: 11 },
  sig: { use: [SIG.pulse], at: CMD_SIG_AT },
  say: [
    { who: 'narr', text: K('1950년 6월 28일. 북쪽 군대가 서울로 들어서자, 한강 쪽에서 거대한 파도가 거리를 덮치며 푸른 거인이 남쪽 군대 앞에 섰다!', 'June 28, 1950. As the northern army enters Seoul, a huge wave sweeps the streets from the Han River, and a blue giant stands before the southern army!') },
    { who: 382, name: K('가이오가', 'Kyogre'), text: K('부오오오…!! 바다를 넓히는 것이 나의 뜻이다. 모두 물결 아래로 가라앉아라!', 'Booooh...!! To widen the sea is my will. Sink beneath the waves, all of you!') },
    { who: 'partner', text: K('가이오가가 남쪽 군대를 이끌고 있어! 그란돈과 아군이 함께 싸워 줄 거야. 사람들을 지키자!', 'Kyogre leads the southern army! Groudon and our troops will fight with us. Let\'s protect the people!') }],
  after: [{ who: 382, name: K('가이오가', 'Kyogre'), text: K('…부우. 물러서지 않는구나. 오늘은 바다로 돌아가겠다.', '...Booh. You will not give way. Today I return to the sea.') }] };
const SEOUL_S = { town: BATTLE_TOWN, allies: SOUTH_ARMY, foes: NORTH_ARMY.concat([66, 262]), join: KYOGRE_JOIN };
const SEOUL_N = { town: BATTLE_TOWN, allies: NORTH_ARMY, foes: SOUTH_ARMY.concat([66, 237]), join: GROUDON_JOIN };
const BATTLE_STEPS = [
  { do: 'scene', say: [
    { who: 'narr', text: K('전쟁이 시작된 지 사흘. 서울은 남과 북의 군대가 맞부딪치는 싸움터가 되었다.', 'Three days into the war, Seoul has become the place where the two armies collide.') },
    { who: CELEBI, name: '세레비', text: K('거리 한가운데서 전설의 포켓몬들이 깨어났어! 세계 지도의 "서울 · 1950년 6월"로 가자!', 'Legendary Pokémon have woken in the middle of the streets! Go to "Seoul, June 1950" on the world map!') }] },
  { do: 'dungeon', d: 'seoul1950', log: K('서울 시가전에서 시민들을 지키자 (전투)', 'Protect the people in the battle for Seoul (battle)') },
];
const BASE_NODES = [
  { id: 'nakdong', name: K('낙동강 전선', 'Nakdong Front'), lon: 128.4, lat: 35.85, d: 'nakdong' },
  { id: 'chosin', name: K('장진호', 'Chosin Reservoir'), lon: 127.25, lat: 40.45, d: 'chosin' },
  { id: 'baengma', name: K('백마고지', 'White Horse Hill'), lon: 127.2, lat: 38.3, d: 'baengma' },
  { id: 'panmun', name: K('판문점 · 시간의 틈', 'Panmunjom · Rift'), lon: 126.68, lat: 37.95, d: 'panmun' },
  { mark: true, name: K('38도선', '38th Parallel'), lon: 127.8, lat: 38.0, text: K('1945년 미국과 소련이 나누어 맡기로 한 경계선. 1953년 정전 뒤에는 군사분계선이 되었다.', 'The line the US and USSR agreed to divide at in 1945. After the 1953 armistice the Military Demarcation Line replaced it.') },
];
// built once (not per call) so the translation binder sees the same objects the world map draws
const SEOUL_NODE = { id: 'seoul1950', name: BATTLE_TOWN.name, lon: 127.12, lat: 37.62, d: 'seoul1950' };
const NODES_S = [{ id: 'town', name: SOUTH.town.name, lon: 129.04, lat: 35.1 }, { id: 'town2', name: SOUTH.town2.name, lon: 128.6, lat: 35.87, town: 2 },
  { id: 'incheon', name: K('인천 앞바다', 'Off Incheon'), lon: 126.4, lat: 37.45, d: 'incheon' }, SEOUL_NODE, ...BASE_NODES];
const NODES_N = [{ id: 'town', name: NORTH.town.name, lon: 125.75, lat: 39.02 }, { id: 'town2', name: NORTH.town2.name, lon: 127.62, lat: 39.83, town: 2 },
  { id: 'taedong', name: K('대동강 철교', 'Taedong River Bridge'), lon: 125.95, lat: 38.82, d: 'taedong' }, SEOUL_NODE, ...BASE_NODES];
SOUTH.main.unshift(...BATTLE_STEPS);
NORTH.main.unshift(...BATTLE_STEPS);
const side = () => (S.faction === 'north' ? NORTH : SOUTH);

export const WAR = [
  {
    year: 1950, years: '1950 – 1953', title: K('한국 전쟁', 'The Korean War'), sub: K('갈라진 땅, 이어지는 마음', 'A land divided, hearts still joined'),
    card: { set: T.flat, mons: [242, 59, 217, 445] }, artProps: [], inn: 242, shop: 52, faction: true,
    // side-specific parts (both kept as plain data so their text is bound for translation)
    south: SOUTH, north: NORTH, nodesS: NODES_S, nodesN: NODES_N,
    get town() { return side().town; }, get town2() { return side().town2; },
    get npcs() { return side().npcs; }, get main() { return side().main; },
    world: 'road_snow',
    intro: [
      K('1945년 광복의 기쁨도 잠시, 한반도는 38도선을 사이에 두고 남과 북으로 나뉘었다.', 'The joy of liberation in 1945 was short-lived: the peninsula was divided at the 38th parallel.'),
      K('1948년, 남쪽에는 대한민국 정부가, 북쪽에는 조선민주주의인민공화국 정부가 들어섰다.', 'In 1948 the Republic of Korea was established in the south and the Democratic People\'s Republic of Korea in the north.'),
      K('1950년 6월 25일 새벽, 북한군이 38도선을 넘어 남쪽으로 쳐들어왔다. 한국 전쟁이 시작되었다.', 'At dawn on June 25, 1950, the North Korean army crossed the 38th parallel into the south. The Korean War had begun.'),
    ],
    get nodes() { return S.faction === 'north' ? NODES_N : NODES_S; },
    dungeons: {
      seoul1950: { name: BATTLE_TOWN.name, tiles: T.flat, floors: 1, lv: [54, 58], mons: [...SOUTH_ARMY, ...NORTH_ARMY], bgm: 'ba_ginga',
        get battle() { return S.faction === 'north' ? SEOUL_N : SEOUL_S; },
        get boss() { return S.faction === 'north' ? KYOGRE_CMD : GROUDON_CMD; },
        sides: [SEOUL_S, SEOUL_N, GROUDON_CMD, KYOGRE_CMD] }, // the getters return one side: this lets the translation binder see both
      nakdong: { name: K('낙동강 전선', 'Nakdong Front'), tiles: T.flat, floors: 4, lv: [56, 60], mons: [262, 229, 112, 76, 26, 82, 135, 335, 336, 357], bgm: 'd_agito',
        field: [{ sp: 383, mul: 1.2, msg: (n) => tr(`낙동강 전선의 뜨거운 여름 볕에 ${n}의 힘이 끓어오른다! (능력 +20%)`, `The blazing summer sun over the Nakdong front makes ${n}'s power boil over! (stats +20%)`) }],
        boss: { sp: 445, lv: 64, lvMin: 58, lvUp: 4, hp: 2.2, atk: 0.95, cap: 0.35, bgm: 'ba_chanp', moves: [407, 89, 242, 337], // 600-class tier (dungeon.js bossTier) scales these
          tele: [
            { name: K('지진', 'Earthquake'), every: 3, dmg: 0.38, stagger: 1, pats: ['near', 'ring', 'rows', 'cols'], type: 4, first: 2 },
            { at: 0.5, name: K('드래곤다이브', 'Dragon Rush'), every: 2, dmg: 0.42, stagger: 1, pats: ['target', 'cross', 'x', 'star', 'quad'], type: 16,
              msg: K('한카리아스가 날개를 펼쳤다! 마하의 속도로 덮쳐 온다!', 'Garchomp spreads its wings! It\'s coming at Mach speed!'),
              line: [{ who: 445, name: K('한카리아스', 'Garchomp'), text: K('크롸아아!! 이 소리… 멈추지 않아… 전부 날려 버리겠다!', 'Grraaah!! This noise... it won\'t stop... I\'ll blow it all away!') }] },
          ],
          say: [
            { who: 'narr', text: K('포탄이 떨어지는 강가 모래밭이 갈라지며, 상어를 닮은 용이 솟구쳤다!', 'The sandbank under the shellfire splits open, and a shark-like dragon bursts out!') },
            { who: 445, name: K('한카리아스', 'Garchomp'), text: K('그르르르… 쾅, 쾅, 쾅… 시끄러워… 모두 사라져라!!', 'Grrrr... boom, boom, boom... so loud... everything, vanish!!') },
            { who: 'partner', text: K('한카리아스는 정말 빨라! 붉은 칸을 피하는 데만 집중하고, 빈틈이 생기면 그때 공격하자!', 'Garchomp is incredibly fast! Focus on dodging the red tiles and strike only when it leaves an opening!') }],
          after: [{ who: 445, name: K('한카리아스', 'Garchomp'), text: K('…헉, 헉. 그 소리가 무서웠을 뿐이야. 너희는… 다친 사람들을 지키러 왔구나.', '...Huff, huff. I was only scared of the noise. You... came to protect the wounded.') }],
          join: K('한카리아스가 지느러미를 접고 고개를 숙였다. 함께 가고 싶어 한다!', 'Garchomp folds its fins and lowers its head. It wants to come along!') } },
      incheon: { name: K('인천 앞바다', 'Off Incheon'), tiles: T.deepsea, floors: 3, lv: [57, 61], water: true, mons: [73, 91, 99, 117, 119, 121, 130, 131, 224, 226, 319, 365], bgm: 'naminori',
        field: [{ sp: 382, mul: 1.2, msg: (n) => tr(`인천 앞바다의 큰 밀물을 타고 ${n}의 힘이 거세진다! (능력 +20%)`, `Riding Incheon's great tide, ${n} grows mightier! (stats +20%)`) }],
        boss: { sp: 365, lv: 62, bgm: 'ba_tenno', say: [
          { who: 365, text: K('우오오오! 물이 빠졌다 밀려오기를 거듭하는 바다에서 씨카이저가 날뛴다!', 'Wooooh! In the sea that drains and floods again and again, Walrein is on a rampage!') },
          { who: 'partner', text: K('밀물 시간이 짧아! 서두르자!', 'High tide won\'t last long! Hurry!') }],
          after: [{ who: 365, text: K('…후우. 바다가 다시 조용해지는구나.', '...Whew. The sea is calming down again.') }] } },
      taedong: { name: K('대동강 철교', 'Taedong River Bridge'), tiles: T.strait, floors: 3, lv: [57, 61], water: true, mons: [55, 62, 119, 130, 195, 260, 340, 350, 91], bgm: 'd_ice',
        boss: { sp: 350, lv: 62, bgm: 'ba_tenno', say: [
          { who: 350, text: K('…아파, 차가워. 다리가 부서지는 소리에 놀란 밀로틱이 강물을 휘젓는다!', '...It hurts, it\'s cold. Startled by the bridge collapsing, Milotic is churning the river!') },
          { who: 'partner', text: K('다리에 매달린 사람들이 떨어지면 큰일이야! 밀로틱을 진정시키자!', 'If the people on the bridge fall it\'ll be a disaster! Calm Milotic!') }],
          after: [{ who: 350, text: K('…미안해. 사람들이 무사히 건널 수 있게 물살을 잔잔히 할게.', '...I\'m sorry. I\'ll calm the current so everyone can cross safely.') }] } },
      chosin: { name: K('장진호', 'Chosin Reservoir'), tiles: T.snow, floors: 4, lv: [58, 62], mons: [87, 124, 215, 221, 225, 362, 365, 460, 461, 473], bgm: 'road_snow',
        tint: 'rgba(150,180,230,0.12)',
        boss: { sp: 460, lv: 64, bgm: 'ba_secret1', say: [
          { who: 460, text: K('부오오오… 이 산은 너무 춥다. 모두 얼어붙어 버려라…!', 'Booooh... This mountain is too cold. Let everything freeze...!') },
          { who: 'partner', text: K('양쪽 군인 모두 추위에 쓰러지고 있어. 눈보라를 멈추자!', 'Soldiers on both sides are falling to the cold. Stop the blizzard!') }],
          after: [{ who: 460, text: K('…눈이 그쳤다. 따뜻한 곳으로 내려가거라.', '...The snow has stopped. Go down to somewhere warm.') }] } },
      baengma: { name: K('백마고지', 'White Horse Hill'), tiles: T.cliff, floors: 3, lv: [58, 62], legend: true, mons: [74, 75, 76, 95, 111, 112, 246, 247, 208], bgm: 'd_mount2',
        tint: 'rgba(90,70,50,0.10)',
        boss: { sp: 248, lv: 66, lvMin: 59, lvUp: 4, hp: 2.2, atk: 0.95, cap: 0.33, bgm: 'ba_secret2', moves: [242, 157, 89, 444], // 600-class tier (dungeon.js bossTier) scales these
          tele: { name: K('스톤에지', 'Stone Edge'), every: 3, dmg: 0.36, stagger: 1, pats: ['cols', 'rows', 'near', 'checker', 'target'], type: 5 },
          say: [
            { who: 'narr', text: K('1952년 10월, 열흘 동안 주인이 스물네 번이나 바뀐 고지. 포탄에 깎인 산 위에서 마기라스가 울부짖는다!', 'October 1952: a hill that changed hands twenty-four times in ten days. On the shell-carved summit, Tyranitar roars!') },
            { who: 248, name: K('마기라스', 'Tyranitar'), text: K('그아아앙!! 산이 깎여 나간다… 내 산을 돌려 다오!!', 'Graaah!! My mountain is being carved away... Give it back!!') },
            { who: 'partner', text: K('산을 무너뜨릴 만큼 힘이 센 마기라스야! 바위가 떨어지는 칸을 잘 보고 피하자!', 'Tyranitar is strong enough to topple mountains! Watch where the rocks fall and dodge!') }],
          after: [{ who: 248, name: K('마기라스', 'Tyranitar'), text: K('…산은 다시 풀이 자라겠지. 너희가 그렇게 믿는다면.', '...Grass will grow on the mountain again. If you believe so.') }],
          join: K('마기라스가 묵직한 발걸음으로 다가왔다. 함께 가고 싶어 한다!', 'Tyranitar comes closer with heavy steps. It wants to come along!') } },
      panmun: { name: K('판문점 · 시간의 틈', 'Panmunjom · Rift'), tiles: T.rift, floors: 5, lv: [60, 64], mons: [443, 444, 359, 197, 229, 247, 281, 429, 477, 356], bgm: 'd_mount2',
        // the rift's keeper: Salamence, stirred up by the torn sky (Arceus waits at the very end of the journey, in 1979)
        boss: { sp: 373, lv: 66, lvUp: 3, hp: 2.2, atk: 0.95, cap: 0.33, bgm: 'ba_dpoke1', moves: [337, 53, 242, 89], // 600-class tier (dungeon.js bossTier) scales these
          tele: { name: K('용성군', 'Draco Meteor'), every: 3, dmg: 0.38, stagger: 1, pats: ['random', 'star', 'quad', 'far'], type: 16 },
          say: [
            { who: 373, name: K('보만다', 'Salamence'), text: K('크오오오! 하늘을 나는 것이 꿈이었던 나다. 이 갈라진 하늘을 날게 두지 않겠다면, 힘으로 증명해 봐라!', 'Kroooh! I who dreamed of flight! If you would keep me from this torn sky, prove it with strength!') },
            { who: CELEBI, name: '세레비', text: K('시간의 틈 때문에 보만다가 흥분했어! 별이 떨어지는 칸을 피해!', 'The rift has Salamence riled up! Dodge where the stars fall!') }],
          after: [
            { who: 373, name: K('보만다', 'Salamence'), text: K('…좋다. 이 하늘 끝에 무엇이 있는지, 함께 보러 가자.', '...Good. Let\'s go and see what lies at the end of this sky, together.') },
            { who: CELEBI, name: '세레비', text: K('틈이 닫히고 있어… 그런데 그 너머에서 누군가 우리를 지켜보고 있었어. 모든 것을 만든 그 포켓몬일까?', 'The rift is closing... but someone was watching us from beyond it. Could it be the one who made everything?') }],
          join: K('보만다가 날개를 낮추었다. 함께 날아가고 싶어 한다!', 'Salamence lowers its wings. It wants to fly with you!') } },
    },
    outro: [
      { who: 'narr', text: K('1953년 7월 27일, 판문점에서 정전 협정이 맺어졌다. 총성은 멎었지만 전쟁은 끝나지 않은 채 멈추었다.', 'On July 27, 1953, the armistice was signed at Panmunjom. The guns fell silent, but the war was halted, not ended.') },
      { who: 'narr', text: K('군사분계선을 따라 비무장지대가 생겼다. 수백만 명이 죽거나 다쳤고, 천만 명에 이르는 이산가족이 남았다.', 'A demilitarized zone formed along the demarcation line. Millions were killed or wounded, and some ten million people were left in separated families.') },
      { who: 'narr', text: K('그래도 사람들은 다시 일어섰다. 언젠가 다시 만날 날을 기다리며, 지금도.', 'Still, people rose again, waiting for the day they will meet once more. Even now.') },
    ],
    side: [
      { id: 'w1', title: K('흩어진 가족 사진', 'Scattered Family Photos'), kind: 'collect', item: 'photo', n: 3, d: 'nakdong', reward: { money: 3000, exp: 3000 },
        desc: K('피란길에 떨어뜨린 가족사진 3장을 찾아 주세요. 주인들에게 꼭 돌려주고 싶어요.', 'Find 3 family photos dropped on the refugee road. We want to return them to their owners.') },
      { id: 'w2', title: K('길 잃은 아기 메리프', 'The Lost Mareep'), kind: 'rescue', sp: 179, floor: 2, d: 'chosin', reward: { money: 2800, items: { sitrus: 2 }, exp: 2600 },
        desc: K('장진호 2층 눈밭에서 아기 메리프가 떨고 있대요.', 'A baby Mareep is shivering in the snow on floor 2 of Chosin.') },
      { id: 'w3', title: K('고지의 애버라스', 'Larvitar on the Hill'), kind: 'defeat', sp: 246, n: 4, d: 'baengma', reward: { money: 2600, exp: 2400 },
        desc: K('포탄 구덩이마다 숨어 있다 튀어나오는 애버라스 4마리를 진정시켜 주세요.', 'Calm 4 Larvitar that keep bursting out of the shell craters.') },
    ],
  },
];
export const WAR_QITEMS = {
  photo: { name: K('가족사진', 'Family Photo'), desc: K('피란길에 떨어진 빛바랜 가족사진.', 'A faded family photo dropped on the refugee road.') },
};
