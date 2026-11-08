// The world line, part two: the Second World War, from Westerplatte (1939) to the end in 1945. Its legends from
// Pokémon Black: Reshiram over London in the Blitz and Kyurem in the last battle (town battles, like Darkrai's
// December 12), and the lairs of Meloetta, Victini, Genesect and Zekrom (the keeper on the third floor, two forms).
import { K, T, N, PT, C, person, talk, go, scene, boss, blast, era, RESHIRAM, ZEKROM, KYUREM } from './content_wkit.js';
import { WB } from './content_wboss.js';

const P = (k) => [56 + Math.round(k * 1.2), 60 + Math.round(k * 1.2)];

// ---------------------------------------------------------------- 1939: Westerplatte
const post = person('post1939', 508, K('우체국 직원 바랜드', 'Postal Clerk Stoutland'), K('단치히 우체국 사람들도 끝까지 버티겠다고 했어요. 무섭지만… 여긴 우리 일터니까요.', 'The people of the Danzig post office say they will hold out to the end. It\'s frightening... but this is where we work.'));
const wester = person('wester1939', 625, K('수비대원 절각참', 'Garrison Soldier Bisharp'), K('베스테르플라테 반도의 수비대는 2백 명 남짓이오. 그래도 우리는 물러서지 않소.', 'The Westerplatte garrison is barely two hundred men. Still, we are not giving way.'));
const child39 = person('child1939', 572, K('피난민 아이의 치라미', "A Refugee Child's Minccino"), K('찌라…! (짐수레 위에서 겁에 질려 꼬리를 감싸 안고 있다.)', 'Chira...! (It huddles on a handcart, clutching its tail in fear.)'), { wander: 2 });
export const W1939 = era({
  year: 1939, years: K('1939 9월', 'Sep 1939'), title: K('제2차 세계 대전의 시작', 'The Second World War Begins'), sub: K('베스테르플라테의 7일', 'Seven days at Westerplatte'),
  place: K('단치히 (그단스크)', 'Danzig (Gdańsk)'), bw: 'nacrene', map: 'europe', at: [18.65, 54.35], bgm: 'city02_d', world: 'road_d', card: [T.bastion, [625, 508, 572, 601]], inn: 531, shop: 573,
  intro: [
    K('1933년 독일에서는 히틀러와 나치당이 권력을 잡았다. 독일은 오스트리아와 체코슬로바키아를 차례로 삼켰다.', 'In 1933 Hitler and the Nazi Party took power in Germany. Germany swallowed Austria and then Czechoslovakia.'),
    K('1939년 9월 1일 새벽, 독일 전함이 단치히 항의 베스테르플라테를 포격하며 폴란드를 침공했다.', 'Before dawn on September 1, 1939, a German battleship shelled Westerplatte in the port of Danzig as Germany invaded Poland.'),
    K('9월 3일 영국과 프랑스가 독일에 전쟁을 선포했다. 제2차 세계 대전이 시작되었다.', 'On September 3 Britain and France declared war on Germany. The Second World War had begun.'),
  ],
  dungeons: {
    westerplatte: { name: K('베스테르플라테', 'Westerplatte'), at: [19.2, 54.38], tiles: T.bastion, floors: 3, lv: P(10), bgm: 'd_06',
      mons: [624, 625, 599, 600, 532, 533, 524, 525, 627, 629, 551, 552, 589],
      boss: WB.westerplatte },
    postoffice: { name: K('단치히 우체국', 'The Danzig Post Office'), at: [18.3, 54.05], tiles: T.warehouse, floors: 3, lv: P(10), bgm: 'd_agito',
      mons: [599, 600, 568, 569, 509, 510, 527, 528, 607, 608, 587, 604],
      boss: WB.postoffice },
  },
  npcs: [post, wester, child39],
  main: [
    talk(wester, K('수비대원 절각참과 이야기하자', 'Talk to Garrison Soldier Bisharp'),
      K('전함의 포격으로 막사가 무너졌소. 그 밑에 동료들이 갇혀 있소!', 'The battleship\'s guns have brought the barracks down. Our comrades are trapped beneath!')),
    go('westerplatte', K('베스테르플라테의 무너진 막사에서 사람들을 구하자', 'Rescue people from the wrecked barracks at Westerplatte')),
    talk(post, K('우체국 직원 바랜드에게 가 보자', 'Go and see Postal Clerk Stoutland'),
      K('우체국에 남은 동료들이 지하실에 갇혀 있어요. 전선이 끊어져 불꽃이 튀고 있어요!', 'Our colleagues who stayed are trapped in the post office cellar. The broken wires are throwing sparks!')),
    go('postoffice', K('단치히 우체국에 갇힌 사람들을 구하자', 'Rescue the people trapped in the Danzig post office')),
    scene(N('베스테르플라테의 수비대는 7일을 버틴 뒤 항복했다. 폴란드는 서쪽의 독일과 동쪽의 소련에 나뉘어 점령되었다.', 'The Westerplatte garrison held out seven days before surrendering. Poland was occupied, divided between Germany in the west and the Soviet Union in the east.'),
      PT('이제부터 6년 동안 전쟁이 세계를 덮어. …그래도 끝까지 함께 가자.', 'For the next six years war will cover the world. ...Let\'s still see it through together.')),
    talk(child39, K('피난민 아이의 치라미를 달래 주자', "Comfort the refugee child's Minccino"),
      K('찌라…. (꼬리를 풀고 조금은 안심한 듯 너희를 바라본다.)', 'Chira.... (It loosens its tail and looks at you, a little reassured.)')),
  ],
  outro: [N('제2차 세계 대전은 인류 역사에서 가장 큰 전쟁이 되었다. 군인과 민간인을 합쳐 수천만 명이 목숨을 잃었다.', 'The Second World War became the largest war in human history. Tens of millions of soldiers and civilians lost their lives.')],
  side: [{ id: 'w39a', title: K('전선의 편지', 'Letters from the Front'), kind: 'collect', item: 'w_letter', n: 3, d: 'postoffice', reward: { money: 5400, exp: 5400 },
    desc: K('우체국에 흩어진 편지 3통을 찾아 주인에게 전해 주세요.', 'Find 3 letters scattered through the post office and get them to their owners.') }],
});

// ---------------------------------------------------------------- 1940: Dunkirk
const skipper = person('skip1940', 279, K('작은 배 선장 패리퍼', 'Little-Ship Skipper Pelipper'), K('정부가 작은 배라도 다 보내 달래요. 내 낚싯배로도 사람을 태울 수 있다면 가야죠!', 'The government is asking for every boat, however small. If my fishing boat can carry people, I\'m going!'));
const tommy = person('tommy1940', 507, K('영국 병사 하데리어', 'British Soldier Herdier'), K('해변에 수십만 명이 몰려 있소. 바다로 나갈 배가 오기만을 기다리고 있소.', 'Hundreds of thousands are crowded on the beaches, waiting for boats to take them out to sea.'));
const fr40 = person('fr1940', 531, K('프랑스 간호사 다부니', 'French Nurse Audino'), K('부상병부터 배에 태워야 해요. 그런데 부두가 무너져 가요.', 'The wounded must board first. But the pier is collapsing.'), { wander: 1 });
export const W1940A = era({
  year: 1940, years: K('1940 5월 – 6월', 'May – Jun 1940'), title: K('됭케르크 철수', 'The Dunkirk Evacuation'), sub: K('작은 배들의 기적', 'The miracle of the little ships'),
  place: K('됭케르크', 'Dunkirk'), bw: 'driftveil', map: 'europe', at: [2.38, 51.03], bgm: 'city05_d', world: 'naminori', card: [T.sand, [279, 507, 531, 581]], inn: 531, shop: 279,
  intro: [
    K('1940년 5월, 독일군은 벨기에와 프랑스를 빠르게 휩쓸었다.', 'In May 1940 the German army swept rapidly through Belgium and France.'),
    K('영국과 프랑스 군인 수십만 명이 프랑스 북쪽 항구 됭케르크의 해변에 갇혔다.', 'Hundreds of thousands of British and French soldiers were trapped on the beaches of Dunkirk, a port in northern France.'),
    K('영국은 "다이너모 작전"으로 군함과 함께 어선, 유람선 같은 작은 배들까지 보내 33만여 명을 구했다.', 'In "Operation Dynamo" Britain sent warships along with fishing boats, pleasure boats and other little ships, and saved some 330,000 people.'),
  ],
  dungeons: {
    mole: { name: K('됭케르크 방파제', 'The Dunkirk Mole'), at: [2.8, 51.32], tiles: T.sand, floors: 3, lv: P(11), bgm: 'd_04',
      mons: [557, 558, 551, 552, 278, 279, 580, 581, 594, 98, 99],
      boss: WB.mole },
    channel: { name: K('영국 해협', 'The English Channel'), at: [1.5, 51.0], tiles: T.strait, water: true, floors: 3, lv: P(11), bgm: 'd_04',
      mons: [592, 593, 594, 550, 73, 279, 278, 580, 581, 320],
      boss: WB.channel },
    yser: { name: K('이제르 강 물길', 'The Waterways of the Yser'), at: [3.0, 50.9], tiles: T.moss, floors: 3, lv: P(11), legend: true, bgm: 'd_lake', tint: 'rgba(140,200,255,0.08)',
      mons: [535, 536, 537, 550, 594, 580, 581, 515, 516, 501, 502], boss: WB.yser },
  },
  npcs: [skipper, tommy, fr40],
  main: [
    talk(tommy, K('영국 병사 하데리어와 이야기하자', 'Talk to British Soldier Herdier'),
      K('배가 닿을 수 있는 곳은 무너져 가는 방파제뿐이오. 그런데 거기서 포켓몬이 길을 막고 있소!', 'The only place the ships can reach is the crumbling mole. And a Pokémon is blocking the way there!')),
    go('mole', K('됭케르크 방파제의 길을 열자', 'Clear the way along the Dunkirk mole')),
    talk(skipper, K('작은 배 선장 패리퍼와 이야기하자', 'Talk to Little-Ship Skipper Pelipper'),
      K('사람을 태웠어요! 그런데 해협에서 무언가가 물결을 일으켜 배를 뒤흔든대요. 함께 건너 주세요!', 'We\'ve taken people on! But something in the Channel is raising a swell that tips the boats. Cross with us!')),
    go('channel', K('작은 배들과 함께 영국 해협을 건너자 (해전)', 'Cross the English Channel with the little ships (naval battle)')),
    scene(N('9일 동안 크고 작은 배 8백여 척이 오가며 33만 명이 넘는 군인을 구했다.', 'Over nine days some 800 ships large and small went back and forth and saved more than 330,000 soldiers.'),
      N('사람들은 이를 "됭케르크의 기적"이라 불렀다. 그러나 6월, 프랑스는 결국 항복했다.', 'People called it "the miracle of Dunkirk". Yet in June France fell.')),
    talk(fr40, K('간호사 다부니와 이야기하자', 'Talk to Nurse Audino'),
      K('구한 사람들은 다시 싸우러 돌아올 거예요. 그때까지 버텨야 해요.', 'Those who were saved will come back to fight. We have to hold on until then.')),
  ],
  outro: [N('프랑스가 무너진 뒤, 영국은 홀로 남아 독일과 맞섰다.', 'With France fallen, Britain was left to face Germany alone.')],
  side: [{ id: 'w40a', title: K('구명 부표', 'Lifebelts'), kind: 'collect', item: 'w_lifebelt', n: 3, d: 'channel', reward: { money: 5500, exp: 5500 },
    desc: K('해협에 흩어진 구명 부표 3개를 작은 배들에 나눠 주세요.', 'Hand out 3 lifebelts scattered across the Channel to the little ships.') }],
});

// ---------------------------------------------------------------- 1940: the Blitz (Reshiram, a town battle)
const warden = person('warden1940', 534, K('방공 감시원 노보청', 'Air Raid Warden Conkeldurr'), K('사이렌이 울리면 모두 지하철역으로! 오늘 밤도 폭격기가 올 거요.', 'When the sirens go, everyone into the Underground! The bombers will come again tonight.'));
const pilot = person('pilot1940', 567, K('조종사 아케오스', 'Pilot Archeops'), K('비긴 힐 비행장에서 출격했어요. 하늘에서 보니 런던이 온통 불바다였어요… 그 불길 속에 하얀 용이 있었어요!', 'I flew out of Biggin Hill. From the sky, London was a sea of fire... and in the flames there was a white dragon!'));
const tube = person('tube1940', 572, K('지하철역의 치라미', 'Minccino in the Underground'), K('찌라! (지하철역 계단에서 사람들과 함께 노래를 부르고 있다.)', 'Chira! (It is singing with the people on the steps of the Underground station.)'), { wander: 2 });
export const W1940B = era({
  year: 1940, years: K('1940 9월 – 1941 5월', 'Sep 1940 – May 1941'), title: K('런던 대공습', 'The Blitz'), sub: K('불타는 도시의 하얀 용', 'A white dragon over the burning city'),
  place: K('런던', 'London'), bw: 'mistralton', map: 'europe', at: [-0.12, 51.5], bgm: 'city08_d', world: 'road_e', card: [T.street, [643, 534, 567, 572]], inn: 531, shop: 573,
  intro: [
    K('1940년 여름, 독일 공군과 영국 공군이 영국 하늘을 두고 싸웠다(영국 본토 항공전).', 'In the summer of 1940 the German and British air forces fought over the skies of Britain: the Battle of Britain.'),
    K('9월부터 독일은 밤마다 런던을 폭격했다(대공습, "블리츠"). 시민들은 지하철역으로 피했다.', 'From September Germany bombed London night after night: the Blitz. Londoners sheltered in the Underground stations.'),
    K('불타는 런던의 밤하늘에, 진실을 묻는 하얀 용 레시라무가 나타났다.', 'Over burning London, in the night sky, appeared Reshiram, the white dragon that asks for the truth.'),
  ],
  dungeons: {
    airfield: { name: K('비긴 힐 비행장', 'Biggin Hill Airfield'), at: [0.2, 51.15], tiles: T.flat, floors: 3, lv: P(12), bgm: 'd_05',
      mons: [519, 520, 521, 527, 528, 566, 567, 587, 607, 627, 628, 629, 630], // 607 Litwick: the embers of the bombing (side w40b)
      boss: WB.airfield },
    // the town battle: London (Mistralton as drawn by Pokémon Black) on fire at night, Reshiram over it
    blitz: { name: K('대공습의 밤 · 런던', 'London, a Night of the Blitz'), tiles: T.street, floors: 1, lv: P(12), fromTown: true, bgm: 'vs_reshiram',
      mons: [607, 608, 609, 631, 554, 555, 636, 637], tint: 'rgba(255,90,40,0.16)',
      battle: { town: null, foeBuff: 1 }, boss: RESHIRAM },
  },
  npcs: [warden, pilot, tube],
  main: [
    talk(pilot, K('조종사 아케오스와 이야기하자', 'Talk to Pilot Archeops'),
      K('비행장 활주로가 엉망이 됐어요. 우리가 날아오르지 못하면 런던을 지킬 수 없어요!', 'The runway is wrecked. If we can\'t get up, we can\'t protect London!')),
    go('airfield', K('비긴 힐 비행장의 활주로를 되찾자', 'Win back the runway at Biggin Hill')),
    talk(warden, K('방공 감시원 노보청과 이야기하자', 'Talk to Air Raid Warden Conkeldurr'),
      K('오늘 밤 공습이 시작됐소! 폭탄의 불길에 하얀 용의 불꽃까지 더해져 거리가 녹아내리고 있소!', 'Tonight\'s raid has begun! The white dragon\'s flames have joined the fire of the bombs and the streets are melting!'),
      K('지하철역으로 피하지 못한 사람들이 있소. 저 용을 진정시켜 주시오!', 'Some people never made it to the Underground. Calm that dragon, please!')),
    { do: 'battle', d: 'blitz', npc: 'warden1940', log: K('불타는 런던 거리에서 레시라무를 진정시키자 (마을 전투)', 'Calm Reshiram in the burning streets of London (town battle)'),
      say: [{ who: 534, name: K('방공 감시원 노보청', 'Air Raid Warden Conkeldurr'), text: K('불길이 이쪽으로 번진다! 함께 가 주시오!', 'The fire is spreading this way! Come with me!') }] },
    scene(N('대공습은 8개월 동안 이어져 4만 명이 넘는 시민이 목숨을 잃었다. 그래도 런던 사람들은 서로를 돌보며 버텼다.', 'The Blitz went on for eight months and killed more than 40,000 civilians. Still Londoners held on, looking after one another.')),
    talk(tube, K('지하철역의 치라미와 이야기하자', 'Talk to the Minccino in the Underground'),
      K('찌라찌라! (아침이 오자, 사람들이 지하철역 계단을 올라 무너진 거리를 치우기 시작했다.)', 'Chira chira! (Morning has come, and people climb the station steps to start clearing the ruined streets.)')),
  ],
  outro: [N('영국 본토 항공전에서 진 독일은 영국 침공을 미루었다. 전쟁의 불길은 이제 동쪽으로 번져 간다.', 'Having lost the Battle of Britain, Germany put off its invasion of Britain. The fire of war was now spreading east.')],
  side: [{ id: 'w40b', title: K('잔불 끄기', 'Put Out the Embers'), kind: 'defeat', sp: 607, n: 5, d: 'airfield', reward: { money: 5600, exp: 5600 },
    desc: K('불탄 비행장에서 잔불에 모여든 불켜미 5마리를 진정시켜 주세요.', 'Calm 5 Litwick drawn to the embers of the burned airfield.') }],
});

// ---------------------------------------------------------------- 1941: Moscow
const sib = person('sib1941', 614, K('시베리아 병사 툰베어', 'Siberian Soldier Beartic'), K('시베리아에서 막 도착했소. 이 추위는 우리에게는 익숙하오.', 'We have just arrived from Siberia. This cold is home to us.'));
const metro = person('metro1941', 573, K('마야콥스카야역의 치라치노', 'Cinccino at Mayakovskaya Station'), K('지하철역 승강장에서 혁명 기념식이 열렸어요. 적이 코앞까지 왔는데도요.', 'The Revolution Day meeting was held on the platform of a metro station, with the enemy right at the gates.'), { wander: 2 });
const fac = person('fac1941', 601, K('공장 노동자 기기기어르', 'Factory Worker Klinklang'), K('공장을 통째로 우랄산맥 너머로 옮기고 있어요. 기계 하나도 남기지 않고요.', 'We are moving whole factories beyond the Urals, down to the last machine.'));
export const W1941 = era({
  year: 1941, years: '1941 – 1942', title: K('모스크바 전투', 'The Battle of Moscow'), sub: K('동장군과 시베리아의 병사들', 'General Winter and the Siberian divisions'),
  place: K('모스크바', 'Moscow'), bw: 'opelucid', map: 'europe', at: [37.62, 55.75], bgm: 'city10_d', world: 'road_snow', card: [T.snow, [614, 573, 601, 584]], inn: 531, shop: 573,
  intro: [
    K('1941년 6월, 독일은 불가침 조약을 깨고 소련을 침공했다(바르바로사 작전).', 'In June 1941 Germany broke the non-aggression pact and invaded the Soviet Union: Operation Barbarossa.'),
    K('10월, 독일군이 모스크바 코앞까지 다가왔다. 그러나 가을비의 진흙과 혹독한 겨울이 찾아왔다.', 'In October the German army came to the very edge of Moscow. Then came the mud of the autumn rains and a brutal winter.'),
    K('12월, 시베리아에서 온 부대들과 함께 소련군이 반격해 모스크바를 지켜 냈다.', 'In December the Soviet army, with divisions brought from Siberia, struck back and saved Moscow.'),
  ],
  dungeons: {
    mud: { name: K('라스푸티차의 진흙길', 'The Rasputitsa Mud'), at: [35.5, 55.2], tiles: T.moss, floors: 3, lv: P(13), bgm: 'd_02',
      mons: [535, 536, 537, 618, 551, 552, 590, 591, 194, 195, 422, 423, 588],
      boss: WB.mud },
    snowfield: { name: K('모스크바 근교 설원', 'The Snowfields outside Moscow'), at: [36.8, 56.4], tiles: T.snow, floors: 3, lv: P(13), bgm: 'd_ice', tint: 'rgba(150,200,255,0.10)',
      mons: [613, 614, 582, 583, 584, 615, 215, 461, 220, 221, 473, 478],
      boss: WB.snowfield },
  },
  npcs: [sib, metro, fac],
  main: [
    talk(fac, K('공장 노동자 기기기어르와 이야기하자', 'Talk to Factory Worker Klinklang'),
      K('피난 열차와 수레가 진흙길에 빠졌어요. 이대로면 공장도 사람도 옮길 수 없어요!', 'The evacuation trains and carts are stuck in the mud. At this rate we can\'t move the factories or the people!')),
    go('mud', K('라스푸티차의 진흙길에서 피난민들을 도와주자', 'Help the refugees on the Rasputitsa mud roads')),
    talk(sib, K('시베리아 병사 툰베어와 이야기하자', 'Talk to Siberian Soldier Beartic'),
      K('12월이 되면 우리는 반격하오. 그런데 설원의 눈보라 속에서 머리 셋 달린 용이 날뛰고 있소.', 'In December we strike back. But a three-headed dragon is raging in the blizzard on the snowfields.')),
    go('snowfield', K('모스크바 근교 설원에서 날뛰는 용을 멈추자', 'Stop the dragon raging on the snowfields outside Moscow')),
    scene(N('1941년 12월 5일, 소련군의 반격이 시작되었다. 모스크바는 함락되지 않았다.', 'On December 5, 1941 the Soviet counter-offensive began. Moscow did not fall.'),
      N('이틀 뒤, 지구 반대편의 하와이에서 또 하나의 전쟁이 시작된다.', 'Two days later, on the far side of the globe in Hawaii, another war began.')),
    talk(metro, K('치라치노와 이야기하자', 'Talk to Cinccino'),
      K('겨울은 아직 길어요. 하지만 이번 겨울은 우리 편이었어요.', 'Winter is still long. But this winter was on our side.')),
  ],
  outro: [N('모스크바 앞에서 독일군의 빠른 승리는 끝났다. 동부 전선의 전쟁은 더 길고 처절해진다.', 'Before Moscow, Germany\'s quick victories came to an end. The war in the east grew longer and more terrible.')],
  side: [{ id: 'w41a', title: K('얼음길의 구호 식량', 'Rations on the Ice'), kind: 'collect', item: 'w_ration', n: 3, d: 'snowfield', reward: { money: 5700, exp: 5700 },
    desc: K('설원에 떨어진 구호 식량 꾸러미 3개를 찾아 주세요.', 'Find 3 ration bundles dropped on the snowfields.') }],
});

// ---------------------------------------------------------------- 1941-42: Pearl Harbor and Midway
const nurse41 = person('nurse1941', 531, K('해군 병원 간호사 다부니', 'Naval Hospital Nurse Audino'), K('일요일 아침이었어요. 하늘에서 갑자기 비행기들이 내려왔어요.', 'It was a Sunday morning. Suddenly planes came down out of the sky.'));
const code = person('code1942', 606, K('암호 해독병 벰크라이스', 'Codebreaker Beheeyem'), K('적의 암호를 풀었소! 다음 목표는 "AF", 바로 미드웨이 섬이오.', 'We\'ve broken the enemy code! The next target is "AF": Midway Island.'));
const kor42 = person('kor1942', 554, K('강제 동원된 조선인 노동자의 달막화', "A Conscripted Korean Labourer's Darumaka"), K('달마…. (남태평양 섬의 비행장 공사에 끌려온 주인을 걱정하고 있다.)', 'Daruma.... (It is worried about its owner, dragged off to build an airfield on a South Pacific island.)'), { wander: 1 });
export const W1942P = era({
  year: 1942, years: K('1941 12월 – 1942 6월', 'Dec 1941 – Jun 1942'), title: K('진주만과 미드웨이', 'Pearl Harbor and Midway'), sub: K('태평양 전쟁', 'The Pacific War'),
  place: K('호놀룰루', 'Honolulu'), bw: 'undella', map: 'pacific', at: [202.14, 21.31], bgm: 'town05_su', world: 'naminori', card: [T.deepsea, [531, 606, 554, 321]], inn: 594, shop: 279,
  intro: [
    K('1941년 12월 7일 아침, 일본 해군이 하와이 진주만의 미국 함대를 기습했다. 미국이 전쟁에 뛰어들었다.', 'On the morning of December 7, 1941 the Japanese navy made a surprise attack on the US fleet at Pearl Harbor in Hawaii. The United States entered the war.'),
    K('일본은 동남아시아와 태평양의 섬들을 빠르게 차지했다. 식민지 조선의 사람들도 노동자와 군인으로 강제로 끌려갔다.', 'Japan quickly seized Southeast Asia and the Pacific islands. People of colonised Korea, too, were forcibly taken as labourers and soldiers.'),
    K('1942년 6월, 미드웨이 해전에서 미국이 일본 항공모함 네 척을 가라앉혔다. 태평양 전쟁의 흐름이 바뀌었다.', 'In June 1942, at the Battle of Midway, the US sank four Japanese aircraft carriers. The tide of the Pacific War turned.'),
  ],
  dungeons: {
    pearl: { name: K('진주만', 'Pearl Harbor'), at: [201.5, 20.75], tiles: T.strait, water: true, floors: 3, lv: P(14), bgm: 'd_04',
      mons: [592, 593, 594, 550, 73, 222, 120, 121, 279, 580, 581, 226],
      boss: WB.pearl },
    midway: { name: K('미드웨이 해전', 'Battle of Midway'), at: [182.63, 28.21], tiles: T.deepsea, water: true, floors: 3, lv: P(14), bgm: 'ba_dpoke2',
      mons: [130, 565, 593, 319, 321, 73, 550, 230, 567, 521, 628],
      boss: WB.midway },
  },
  marks: [{ name: K('→ 과달카날', '→ Guadalcanal'), lon: 160.0, lat: 2.0, text: K('남태평양의 섬들에는 강제로 끌려간 조선인들도 비행장 공사와 전투에 동원되었다.', 'On the South Pacific islands, forcibly taken Koreans too were put to work building airfields and sent into battle.') }],
  npcs: [nurse41, code, kor42],
  main: [
    talk(nurse41, K('해군 병원 간호사 다부니와 이야기하자', 'Talk to Naval Hospital Nurse Audino'),
      K('항구가 불타고 있어요! 물에 빠진 수병들을 건져야 해요!', 'The harbour is burning! We have to pull the sailors out of the water!')),
    go('pearl', K('불타는 진주만에서 사람들을 구하자 (해전)', 'Rescue people in burning Pearl Harbor (naval battle)')),
    talk(kor42, K('달막화와 이야기하자', 'Talk to Darumaka'),
      K('달마, 달마! (멀리 남쪽 바다를 가리키며 주인을 찾아 달라는 듯 너희를 바라본다.)', 'Daruma, daruma! (It points at the far southern sea and looks at you, as if asking you to find its owner.)'),
      K('…달마. (일본의 전쟁에 끌려간 조선 사람들이 태평양 곳곳에 있다는 이야기를 들었다.)', '...Daruma. (You hear that Koreans dragged into Japan\'s war are scattered all over the Pacific.)')),
    talk(code, K('암호 해독병 벰크라이스와 이야기하자', 'Talk to Codebreaker Beheeyem'),
      K('미드웨이에서 결전이 벌어질 거요. 그 바다에 빠지는 사람이 없도록 함께 가 주시오.', 'The decisive battle will be at Midway. Come with us so no one is left in that sea.')),
    go('midway', K('미드웨이 해전의 바다에서 사람들을 구하자 (해전)', 'Rescue people in the sea of the Battle of Midway (naval battle)')),
    scene(N('미드웨이에서 일본은 항공모함 네 척과 숙련된 조종사들을 잃었다. 이후 태평양 전쟁의 주도권은 미국에 넘어갔다.', 'At Midway Japan lost four carriers and its seasoned pilots. After that the initiative in the Pacific passed to the United States.')),
  ],
  outro: [N('태평양 전쟁은 1945년까지 이어졌다. 그 사이 수많은 아시아 사람들이 전쟁에 끌려가고 목숨을 잃었다.', 'The Pacific War went on until 1945. In that time countless people across Asia were dragged into the war and lost their lives.')],
  side: [{ id: 'w42a', title: K('흩어진 구명 부표', 'Scattered Lifebelts'), kind: 'collect', item: 'w_lifebelt', n: 3, d: 'pearl', reward: { money: 5800, exp: 5800 },
    desc: K('진주만에 떠다니는 구명 부표 3개를 구조선에 모아 주세요.', 'Gather 3 lifebelts floating in Pearl Harbor for the rescue boats.') }],
});

// ---------------------------------------------------------------- 1942: the Siege of Leningrad (Meloetta's lair)
const cond = person('cond1942', 576, K('지휘자 고디모아젤', 'Conductor Gothitelle'), K('라디오 오케스트라에 남은 단원은 열다섯 명뿐이에요. 그래도 교향곡을 연주할 거예요.', 'Only fifteen players are left in the radio orchestra. We will still play the symphony.'));
const lad = person('lad1942', 614, K('얼음길 운전사 툰베어', 'Ice Road Driver Beartic'), K('라도가 호수의 얼음 위로 트럭을 몰아요. "생명의 길"이죠.', 'I drive trucks across the ice of Lake Ladoga. The "Road of Life".'), { wander: 1 });
const herm = person('herm1942', 563, K('미술관 지기 데스니칸', 'Museum Keeper Cofagrigus'), K('에르미타시 미술관의 그림들은 피난을 갔어요. 빈 액자만 벽에 걸려 있죠.', 'The Hermitage\'s paintings have been evacuated. Only empty frames hang on the walls.'));
export const W1942L = era({
  year: 1942, years: '1941 – 1944', title: K('레닌그라드 포위전', 'The Siege of Leningrad'), sub: K('포위된 도시의 교향곡', 'A symphony in a besieged city'),
  place: K('레닌그라드', 'Leningrad'), bw: 'nacrene', map: 'europe', at: [30.32, 59.94], bgm: 'city02_d', world: 'road_snow', card: [T.library, [648, 576, 614, 563]], inn: 531, shop: 573,
  intro: [
    K('1941년 9월, 독일군이 레닌그라드를 둘러싸 포위했다. 포위는 872일 동안 이어졌다.', 'In September 1941 the German army surrounded Leningrad. The siege lasted 872 days.'),
    K('도시는 굶주림과 추위에 시달렸다. 얼어붙은 라도가 호수 위의 "생명의 길"로만 식량이 들어왔다.', 'The city suffered hunger and cold. Food came in only along the "Road of Life" across the frozen Lake Ladoga.'),
    K('1942년 8월 9일, 굶주린 음악가들이 쇼스타코비치의 교향곡 7번 "레닌그라드"를 연주해 확성기로 온 도시에 들려주었다.', 'On August 9, 1942, starving musicians performed Shostakovich\'s Seventh Symphony, "Leningrad", and loudspeakers carried it across the whole city.'),
  ],
  dungeons: {
    ladoga: { name: K('라도가 호수 얼음길', 'The Lake Ladoga Ice Road'), at: [31.5, 60.6], tiles: T.fortsnow, floors: 3, lv: P(15), bgm: 'd_ice', tint: 'rgba(160,210,255,0.10)',
      mons: [613, 614, 582, 583, 584, 615, 87, 91, 131, 225, 471],
      boss: WB.ladoga },
    // Meloetta's lair: the empty concert hall, the keeper on the third floor
    philharmonia: { name: K('얼어붙은 연주회장', 'The Frozen Concert Hall'), at: [29.8, 59.6], tiles: T.library, floors: 3, lv: P(15), legend: true, bgm: 'd_lake', tint: 'rgba(200,255,220,0.08)',
      mons: [574, 575, 576, 517, 518, 527, 528, 607, 608, 355, 356], boss: WB.philharmonia },
  },
  npcs: [cond, lad, herm],
  main: [
    talk(lad, K('얼음길 운전사 툰베어와 이야기하자', 'Talk to Ice Road Driver Beartic'),
      K('얼음이 갈라지고 있어요. 이대로면 식량 트럭이 호수에 빠져요. 도시 사람들이 굶고 있는데!', 'The ice is cracking. At this rate the food trucks will go into the lake. And the city is starving!')),
    go('ladoga', K('라도가 호수의 얼음길을 지키자', 'Keep the Lake Ladoga ice road open')),
    talk(cond, K('지휘자 고디모아젤과 이야기하자', 'Talk to Conductor Gothitelle'),
      K('교향곡을 연주하려는데, 연주회장에서 낯선 노랫소리가 들려와요. 듣는 사람마다 잠들어 버린대요.', 'We mean to play the symphony, but a strange song echoes in the concert hall. Everyone who hears it falls asleep.'),
      K('그 노랫소리의 주인을 만나 주세요. 이 도시가 아직 살아 있다는 걸 들려주고 싶어요.', 'Please meet whoever is singing. I want to show it this city is still alive.')),
    go('philharmonia', K('얼어붙은 연주회장의 노랫소리를 찾아가자 (환상의 포켓몬: 3층)', 'Find the song in the frozen concert hall (mythical Pokémon: floor 3)')),
    scene(N('1942년 8월 9일 저녁, 교향곡 7번이 연주되었다. 포위한 독일군의 진지에도 확성기의 음악이 들렸다.', 'On the evening of August 9, 1942 the Seventh Symphony was played. Its music reached even the German lines around the city through the loudspeakers.'),
      N('포위는 1944년 1월에야 풀렸다. 그 사이 백만 명 가까운 시민이 굶주림과 폭격으로 목숨을 잃었다.', 'The siege was lifted only in January 1944. By then nearly a million civilians had died of hunger and bombardment.')),
    talk(herm, K('미술관 지기 데스니칸과 이야기하자', 'Talk to Museum Keeper Cofagrigus'),
      K('빈 액자 앞에서, 사람들은 그림이 있던 자리를 서로에게 설명해 주었대요. 기억은 빼앗길 수 없으니까요.', 'Before the empty frames, people described to each other the paintings that once hung there. Memory can\'t be taken away.')),
  ],
  outro: [N('굶주림 속에서도 연주를 멈추지 않은 도시는, 끝내 함락되지 않았다.', 'The city that kept playing through its hunger never fell.')],
  side: [{ id: 'w42b', title: K('교향곡 악보', 'Pages of the Symphony'), kind: 'collect', item: 'w_score', n: 3, d: 'philharmonia', reward: { money: 6000, exp: 6000 },
    desc: K('연주회장에 흩어진 교향곡 파트 악보 3장을 지휘자에게 가져다주세요.', 'Bring the conductor 3 parts of the symphony scattered through the concert hall.') }],
});

// ---------------------------------------------------------------- 1942: El Alamein (Victini's lair)
const desert = person('desert1942', 553, K('사막 정찰병 악비아르', 'Desert Scout Krookodile'), K('엘알라메인은 바다와 소금 습지 사이의 좁은 길목이오. 여기서 밀리면 이집트가 무너지오.', 'El Alamein is a narrow gap between the sea and the salt marsh. If we give way here, Egypt falls.'));
const vee = person('vee1942', 628, K('종군 기자 워글', 'War Correspondent Braviary'), K('사막 한가운데 "승리를 부르는 포켓몬"이 산다는 소문이 있소. V자 귀를 가졌다던가.', 'They say a "Pokémon that brings victory" lives out in the desert. With V-shaped ears, apparently.'));
const camel = person('camel1942', 450, K('대상의 하마돈', "Caravan Hippowdon"), K('히포. (모래바람 속에서 지친 사람들을 등에 태우고 오아시스로 가고 있다.)', 'Hippo. (It is carrying weary people through the sandstorm to an oasis.)'), { wander: 2 });
export const W1942E = era({
  year: 1942, years: K('1942 10월 – 11월', 'Oct – Nov 1942'), title: K('엘알라메인 전투', 'The Battle of El Alamein'), sub: K('사막의 승리', 'Victory in the desert'),
  place: K('알렉산드리아', 'Alexandria'), bw: 'undella', map: 'europe', at: [29.92, 31.2], bgm: 'town05_su', world: 'road_f', card: [T.sand, [494, 553, 628, 450]], inn: 531, shop: 509,
  intro: [
    K('북아프리카에서는 독일·이탈리아군과 영국군이 사막을 오가며 싸웠다. 독일의 롬멜은 "사막의 여우"라 불렸다.', 'In North Africa, German and Italian forces fought the British back and forth across the desert. Germany\'s Rommel was called "the Desert Fox".'),
    K('1942년 10월 23일, 몽고메리가 이끄는 영국군이 이집트의 엘알라메인에서 공세를 시작했다.', 'On October 23, 1942 the British under Montgomery opened their attack at El Alamein in Egypt.'),
    K('영국군이 이겼다. 처칠은 이것을 "끝의 시작이 아니라, 시작의 끝"이라 말했다.', 'The British won. Churchill called it "not the end, nor the beginning of the end, but the end of the beginning".'),
  ],
  dungeons: {
    minefield: { name: K('"악마의 정원" 지뢰밭', 'The "Devil\'s Gardens" Minefields'), at: [28.9, 30.85], tiles: T.sand, floors: 3, lv: P(16), bgm: 'd_05',
      mons: [551, 552, 553, 554, 555, 556, 557, 558, 561, 562, 563, 449, 450, 328, 329],
      boss: WB.minefield },
    // Victini's lair: the ruins in the dunes where the victory Pokémon is said to live, the keeper on the third floor
    vruins: { name: K('모래 언덕의 V 유적', 'The V Ruins in the Dunes'), at: [28.2, 30.4], tiles: T.temple, floors: 3, lv: P(16), legend: true, bgm: 'd_lake', tint: 'rgba(255,190,90,0.10)',
      mons: [561, 562, 563, 554, 555, 343, 344, 627, 628, 631], boss: WB.vruins },
  },
  npcs: [desert, vee, camel],
  main: [
    talk(desert, K('사막 정찰병 악비아르와 이야기하자', 'Talk to Desert Scout Krookodile'),
      K('적은 길목에 수십만 개의 지뢰를 깔아 "악마의 정원"이라 불렀소. 공병들이 길을 내야 하는데, 그 안에서 땅이 울리고 있소!', 'The enemy has laid hundreds of thousands of mines in the gap and calls it "the Devil\'s Gardens". The sappers must clear a path, but the ground inside is rumbling!')),
    go('minefield', K('"악마의 정원" 지뢰밭의 땅울림을 멈추자', 'Stop the rumbling ground in the "Devil\'s Gardens" minefields')),
    talk(vee, K('종군 기자 워글과 이야기하자', 'Talk to War Correspondent Braviary'),
      K('전투는 우리 쪽으로 기울고 있소. 그런데 모래 언덕의 유적에서 그 "승리의 포켓몬"을 봤다는 병사가 있소!', 'The battle is turning our way. And a soldier swears he saw that "Pokémon of victory" at the ruins in the dunes!')),
    go('vruins', K('모래 언덕의 V 유적에서 승리의 포켓몬을 만나자 (환상의 포켓몬: 3층)', 'Meet the Pokémon of victory in the V ruins in the dunes (mythical Pokémon: floor 3)')),
    scene(N('11월 4일, 독일·이탈리아군이 물러나기 시작했다. 며칠 뒤 연합군이 북아프리카 서쪽 해안에 상륙했다.', 'On November 4 the German and Italian forces began to fall back. Days later the Allies landed on the western coast of North Africa.')),
    talk(camel, K('대상의 하마돈과 이야기하자', 'Talk to the caravan Hippowdon'),
      K('히포…. (승리 뒤에도 사막에는 부상병과 피난민이 남아 있다. 하마돈은 오늘도 그들을 태우고 걷는다.)', 'Hippo.... (Even after the victory the desert is full of wounded and refugees. Hippowdon walks on, carrying them, today too.)')),
  ],
  outro: [N('엘알라메인과 스탈린그라드를 지나며, 전쟁의 흐름은 연합국 쪽으로 바뀌어 간다.', 'With El Alamein and Stalingrad, the tide of the war turned toward the Allies.')],
  side: [{ id: 'w42c', title: K('사막의 데스마스', 'Yamask in the Desert'), kind: 'defeat', sp: 562, n: 5, d: 'minefield', reward: { money: 6100, exp: 6100 },
    desc: K('지뢰밭 근처를 떠도는 데스마스 5마리를 진정시켜 주세요.', 'Calm 5 Yamask drifting around the minefields.') }],
});

// ---------------------------------------------------------------- 1943: Stalingrad and Kursk (Genesect's lair)
const pav = person('pav1943', 625, K('파블로프의 집 수비대 절각참', "Pavlov's House Defender Bisharp"), K('이 아파트 한 채를 58일 동안 지켰소. 우리 집이 곧 전선이오.', 'We held this one apartment house for fifty-eight days. Our home is the front line.'));
const tank = person('tank1943', 601, K('전차병 기기기어르', 'Tank Crewman Klinklang'), K('쿠르스크 평원에 수천 대의 전차가 모이고 있어요. 그런데 그 사이에 이상한 "강철 포켓몬"이 섞여 있대요.', 'Thousands of tanks are gathering on the Kursk plain. And they say a strange "steel Pokémon" is mixed in among them.'));
const babush = person('babush1943', 584, K('할머니의 바닐리치', "Grandmother's Vanilluxe"), K('바닐…. (지하실에서 버틴 할머니 곁을 떠나지 않고 있다.)', 'Vanil.... (It will not leave the side of the old woman who held out in the cellar.)'), { wander: 1 });
export const W1943 = era({
  year: 1943, years: K('1942 8월 – 1943 8월', 'Aug 1942 – Aug 1943'), title: K('스탈린그라드와 쿠르스크', 'Stalingrad and Kursk'), sub: K('동부 전선의 전환점', 'The turning point in the east'),
  place: K('스탈린그라드', 'Stalingrad'), bw: 'icirrus', map: 'europe', at: [44.5, 48.7], bgm: 'city07_d', world: 'road_snow', card: [T.warehouse, [649, 625, 601, 584]], inn: 531, shop: 509,
  intro: [
    K('1942년 8월, 독일군이 볼가강의 도시 스탈린그라드를 공격했다. 싸움은 건물 하나, 층 하나를 두고 벌어졌다.', 'In August 1942 the German army attacked Stalingrad on the Volga. The fighting was for single buildings, single floors.'),
    K('1943년 2월 2일, 포위된 독일 제6군이 항복했다. 동부 전선의 흐름이 바뀌었다.', 'On February 2, 1943 the encircled German Sixth Army surrendered. The tide turned in the east.'),
    K('1943년 7월, 쿠르스크에서 역사상 가장 큰 전차전이 벌어졌다. 이후 독일은 다시 공세를 펼치지 못했다.', 'In July 1943 the largest tank battle in history was fought at Kursk. After it Germany never again launched a major offensive in the east.'),
  ],
  dungeons: {
    tractor: { name: K('트랙터 공장', 'The Tractor Factory'), at: [44.45, 49.08], tiles: T.warehouse, floors: 3, lv: P(17), bgm: 'd_06',
      mons: [599, 600, 601, 632, 624, 625, 568, 569, 532, 533, 534, 529, 530, 500],
      boss: WB.tractor },
    // Genesect's lair: the burning tank field at Prokhorovka, the keeper on the third floor
    prokhorovka: { name: K('프로호롭카 전차 평원', 'The Tank Field at Prokhorovka'), at: [36.5, 51.0], tiles: T.plain, floors: 3, lv: P(17), legend: true, bgm: 'd_05', tint: 'rgba(200,120,255,0.08)',
      mons: [599, 600, 601, 624, 625, 632, 589, 616, 617, 597, 598], boss: WB.prokhorovka },
  },
  npcs: [pav, tank, babush],
  main: [
    talk(pav, K('파블로프의 집 수비대 절각참과 이야기하자', "Talk to Pavlov's House Defender Bisharp"),
      K('트랙터 공장에 노동자들이 갇혀 있소. 공장은 무너지고, 그 안에서 무언가가 벽을 들이받고 있소!', 'Workers are trapped in the Tractor Factory. It is falling in, and something inside is ramming the walls!')),
    go('tractor', K('트랙터 공장에 갇힌 노동자들을 구하자', 'Rescue the workers trapped in the Tractor Factory')),
    scene(N('1943년 2월, 스탈린그라드의 싸움이 끝났다. 양쪽을 합쳐 2백만 명에 가까운 사람이 죽거나 다쳤다.', 'In February 1943 the fighting at Stalingrad ended. Close to two million people on both sides had been killed or wounded.')),
    talk(tank, K('전차병 기기기어르와 이야기하자', 'Talk to Tank Crewman Klinklang'),
      K('쿠르스크의 프로호롭카에서 전차들이 맞붙었어요. 그 불바다 속에서 등에 대포를 단 포켓몬이 모든 것을 쏘고 있어요!', 'The tanks have clashed at Prokhorovka near Kursk. In that sea of fire, a Pokémon with a cannon on its back is shooting at everything!')),
    go('prokhorovka', K('프로호롭카 전차 평원의 강철 포켓몬을 멈추자 (환상의 포켓몬: 3층)', 'Stop the steel Pokémon on the tank field at Prokhorovka (mythical Pokémon: floor 3)')),
    talk(babush, K('바닐리치와 이야기하자', 'Talk to Vanilluxe'),
      K('바닐…. (할머니가 폐허가 된 거리에 처음으로 해바라기 씨앗을 심고 있다.)', 'Vanil.... (The old woman is planting sunflower seeds in the ruined street, the first in a long time.)')),
  ],
  outro: [N('쿠르스크 뒤로 소련군은 서쪽으로 진격하기 시작했다. 전쟁은 이제 끝을 향해 간다.', 'After Kursk the Soviet army began to advance west. The war was now heading toward its end.')],
  side: [{ id: 'w43a', title: K('공장의 아이앤트', 'Durant in the Factory'), kind: 'defeat', sp: 632, n: 5, d: 'tractor', reward: { money: 6200, exp: 6200 },
    desc: K('공장을 갉아먹는 아이앤트 5마리를 진정시켜 주세요.', 'Calm 5 Durant eating away at the factory.') }],
});

// ---------------------------------------------------------------- 1944: Normandy (Zekrom's lair)
const met = person('met1944', 606, K('기상 장교 벰크라이스', 'Weather Officer Beheeyem'), K('6월 5일로 정한 상륙일에 큰 폭풍이 왔소. 해협 위의 폭풍만 걷히면 6일에 나갈 수 있소.', 'A great storm came on June 5, the day set for the landing. If only the storm over the Channel lifts, we can go on the 6th.'));
const para = person('para1944', 521, K('낙하산병 켄호로우', 'Paratrooper Unfezant'), K('밤새 낙하산으로 내려왔어요. 해변에서 친구들이 올라오기를 기다려요.', 'We dropped by parachute all night. We are waiting for our friends to come up from the beaches.'), { wander: 2 });
const res44 = person('res1944', 510, K('레지스탕스 레파르다스', 'Resistance Liepard'), K('라디오에서 시 구절이 흘러나오면 철도를 끊기로 했어요. 오늘 밤이에요.', 'When the line of verse comes over the radio, we cut the railways. It\'s tonight.'));
export const W1944N = era({
  year: 1944, years: K('1944 6월', 'Jun 1944'), title: K('노르망디 상륙 작전', 'The Normandy Landings'), sub: K('폭풍 너머의 D-데이', 'D-Day beyond the storm'),
  place: K('노르망디 (바이외)', 'Normandy (Bayeux)'), bw: 'nuvema', map: 'europe', at: [-0.5, 49.2], bgm: 'town01_d', world: 'road_c', card: [T.sand, [644, 606, 521, 510]], inn: 531, shop: 573,
  intro: [
    K('1944년 6월 6일, 연합군 15만여 명이 영국 해협을 건너 프랑스 노르망디 해안에 상륙했다(D-데이).', 'On June 6, 1944 some 150,000 Allied troops crossed the Channel and landed on the coast of Normandy in France: D-Day.'),
    K('원래 날짜는 6월 5일이었지만 큰 폭풍 때문에 하루 늦추어졌다.', 'The original date was June 5, but a great storm put it off by a day.'),
    K('해협 위의 폭풍 속에, 이상을 품은 검은 용 제크로무가 깨어 있었다.', 'In the storm over the Channel, Zekrom, the black dragon of ideals, was awake.'),
  ],
  dungeons: {
    // Zekrom's lair: the storm over the Channel, the keeper on the third floor
    storm: { name: K('해협 위의 폭풍', 'The Storm over the Channel'), at: [-1.2, 50.0], tiles: T.rift, floors: 3, lv: P(18), legend: true, bgm: 'd_mount2', tint: 'rgba(60,70,120,0.18)',
      mons: [602, 603, 604, 587, 595, 596, 522, 523, 135, 466], boss: ZEKROM },
    omaha: { name: K('오마하 해변', 'Omaha Beach'), at: [-0.98, 49.4], tiles: T.sand, floors: 3, lv: P(18), bgm: 'd_04',
      mons: [557, 558, 551, 552, 553, 624, 625, 98, 99, 594, 580, 581],
      boss: WB.omaha },
  },
  npcs: [met, para, res44],
  main: [
    talk(met, K('기상 장교 벰크라이스와 이야기하자', 'Talk to Weather Officer Beheeyem'),
      K('해협에 멈춰 선 폭풍 한가운데서 검은 용이 번개를 부르고 있소! 폭풍이 걷히지 않으면 상륙도 없소.', 'In the heart of the storm standing still over the Channel, a black dragon is calling lightning! No landing unless the storm lifts.')),
    go('storm', K('해협 위의 폭풍 속으로 들어가 제크로무를 만나자 (전설: 3층)', 'Go into the storm over the Channel and meet Zekrom (legend: floor 3)')),
    talk(res44, K('레지스탕스 레파르다스와 이야기하자', 'Talk to Resistance Liepard'),
      K('라디오에서 시 구절이 나왔어요! 오늘 새벽 상륙이 시작돼요. 오마하 해변이 가장 위험하대요.', 'The line of verse came over the radio! The landing starts at dawn. They say Omaha Beach is the most dangerous.')),
    go('omaha', K('오마하 해변에서 상륙하는 이들을 지키자', 'Protect those landing on Omaha Beach')),
    scene(N('D-데이 하루에만 연합군 1만여 명이 죽거나 다쳤다. 그러나 해안은 뚫렸다.', 'On D-Day alone some 10,000 Allied troops were killed or wounded. But the coast was breached.'),
      N('8월 25일 파리가 해방되었다.', 'On August 25 Paris was liberated.')),
    talk(para, K('낙하산병 켄호로우와 이야기하자', 'Talk to Paratrooper Unfezant'),
      K('해변의 친구들이 올라왔어요! 이제 서쪽에서도 동쪽에서도 전쟁의 끝이 다가와요.', 'Our friends from the beaches made it up! Now the end of the war is coming from the west and the east.')),
  ],
  outro: [N('서쪽에서는 연합군이, 동쪽에서는 소련군이 독일을 향해 다가갔다.', 'The Allies in the west and the Soviets in the east closed in on Germany.')],
  side: [{ id: 'w44a', title: K('상륙 해변의 구급 상자', 'First-Aid Kits on the Beach'), kind: 'collect', item: 'w_medkit', n: 3, d: 'omaha', reward: { money: 6400, exp: 6400 },
    desc: K('오마하 해변에 떨어진 구급 상자 3개를 의무병에게 가져다주세요.', 'Bring the medics 3 first-aid kits dropped on Omaha Beach.') }],
});

// ---------------------------------------------------------------- 1944: Leyte Gulf
const fil = person('fil1944', 497, K('필리핀 게릴라 샤로다', 'Filipino Guerrilla Serperior'), K('3년 가까이 정글에서 버텼소. 이제 해방군의 배가 레이테 만으로 들어온다오.', 'We held out in the jungle for nearly three years. Now the liberating fleet is entering Leyte Gulf.'));
const kor44 = person('kor1944', 554, K('징병된 조선 청년의 달막화', "A Conscripted Korean Youth's Darumaka"), K('달마…. (전쟁에 끌려온 주인이 무사히 고향에 돌아가기만을 바라고 있다.)', 'Daruma.... (It wishes only that its owner, dragged into the war, gets home safely.)'), { wander: 1 });
const sea44 = person('sea1944', 594, K('어부 맘복치', 'Fisher Alomomola'), K('바다가 기름과 잔해로 뒤덮였어요.', 'The sea is covered in oil and wreckage.'));
export const W1944L = era({
  year: 1944, years: K('1944 10월', 'Oct 1944'), title: K('레이테 만 해전', 'The Battle of Leyte Gulf'), sub: K('사상 최대의 해전', 'The largest naval battle in history'),
  place: K('타클로반 (레이테)', 'Tacloban (Leyte)'), bw: 'undella', map: 'pacific', at: [125.0, 11.24], bgm: 'town05_su', world: 'naminori', card: [T.deepsea, [497, 554, 594, 130]], inn: 594, shop: 279,
  intro: [
    K('1944년 10월, 미군이 필리핀의 레이테섬에 상륙했다.', 'In October 1944 American forces landed on Leyte in the Philippines.'),
    K('일본 해군은 남은 함대를 모두 모아 반격했다. 10월 23일부터 26일까지, 역사상 가장 큰 해전이 벌어졌다.', 'The Japanese navy gathered everything it had left and struck back. From October 23 to 26, the largest naval battle in history was fought.'),
    K('일본 함대는 무너졌다. 이 해전에서 처음으로 "가미카제" 특공 공격이 시작되었다.', 'The Japanese fleet was shattered. In this battle the "kamikaze" suicide attacks began.'),
  ],
  dungeons: {
    surigao: { name: K('수리가오 해협', 'Surigao Strait'), at: [125.4, 10.2], tiles: T.strait, water: true, floors: 3, lv: P(19), bgm: 'd_04',
      mons: [592, 593, 594, 550, 73, 222, 120, 121, 279, 226, 223, 224],
      boss: WB.surigao },
    samar: { name: K('사마르 앞바다', 'Off Samar'), at: [126.2, 11.8], tiles: T.deepsea, water: true, floors: 3, lv: P(19), bgm: 'ba_dpoke2',
      mons: [130, 565, 593, 319, 321, 73, 550, 230, 567, 521, 628, 581],
      boss: WB.samar },
  },
  npcs: [fil, kor44, sea44],
  main: [
    talk(fil, K('필리핀 게릴라 샤로다와 이야기하자', 'Talk to Filipino Guerrilla Serperior'),
      K('수리가오 해협에서 밤새 포성이 울렸소. 가라앉는 배에서 빠져나오지 못한 사람들이 있소!', 'The guns roared all night in the Surigao Strait. Some never got off the sinking ships!')),
    go('surigao', K('수리가오 해협에서 사람들을 구하자 (해전)', 'Rescue people in the Surigao Strait (naval battle)')),
    talk(kor44, K('달막화와 이야기하자', 'Talk to Darumaka'),
      K('달마! (사마르 앞바다를 가리킨다. 그 바다의 배에 주인이 타고 있다고 말하는 것 같다.)', 'Daruma! (It points out to sea off Samar, as if saying its owner is on a ship out there.)')),
    go('samar', K('사마르 앞바다의 사람들을 구하자 (해전)', 'Rescue the people off Samar (naval battle)')),
    scene(N('레이테 만 해전으로 일본 해군은 사실상 사라졌다. 그러나 전쟁은 아직 끝나지 않았다.', 'After Leyte Gulf the Japanese navy was all but gone. Yet the war was not over.')),
    talk(sea44, K('어부 맘복치와 이야기하자', 'Talk to Fisher Alomomola'),
      K('달막화의 주인이 구명정에서 손을 흔들었대요! 살아 있었어요!', "Darumaka's owner waved from a lifeboat! He was alive!")),
  ],
  outro: [N('1945년이 밝았다. 유럽에서도 태평양에서도, 전쟁은 마지막 해로 접어들었다.', '1945 dawned. In Europe and in the Pacific, the war entered its final year.')],
  side: [{ id: 'w44b', title: K('바다 위의 잔해', 'Wreckage at Sea'), kind: 'defeat', sp: 592, n: 5, d: 'surigao', reward: { money: 6500, exp: 6500 },
    desc: K('잔해 사이에서 사람들을 휘감는 탱그릴 5마리를 진정시켜 주세요.', 'Calm 5 Frillish tangling people among the wreckage.') }],
});

// ---------------------------------------------------------------- 1945: the end of the Second World War. Its last quest
// is the world line's final battle (Kyurem), fought on the eve of Japan's surrender; the surrender and Korea's
// liberation follow it, in the outro
const ber = person('ber1945', 584, K('폐허의 바닐리치', 'Vanilluxe in the Ruins'), K('바닐…. (여름이 오는데도 눈이 그치지 않는다. 무너진 도시가 하얗게 얼어 간다.)', 'Vanil.... (Summer is coming, yet the snow does not stop. The ruined city is freezing white.)'));
const sol45 = person('sol1945', 534, K('귀향병 노보청', 'Homecoming Soldier Conkeldurr'), K('5월 8일, 유럽의 전쟁이 끝났소. 그런데 이 도시만 이상한 겨울에 갇혔소.', 'On May 8 the war in Europe ended. But this one city is trapped in a strange winter.'));
const kor45 = person('kor1945', 554, K('조선 청년의 달막화', "A Korean Youth's Darumaka"), K('달마! (주인과 함께 고향으로 돌아갈 날을 기다리고 있다.)', 'Daruma! (It is waiting with its owner for the day they can go home.)'), { wander: 2 });
export const W1945 = era({
  year: 1945, years: '1945', title: K('제2차 세계 대전의 끝', 'The End of the Second World War'), sub: K('최종 결전 · 큐레무', 'The final battle: Kyurem'),
  place: K('베를린', 'Berlin'), bw: 'lacunosa', map: 'europe', at: [13.4, 52.52], bgm: 'town04_d', bgmN: 'town04_d', world: 'road_snow', card: [T.fortsnow, [646, 584, 534, 554]], inn: 531, shop: 573,
  intro: [
    K('1945년 4월, 소련군이 베를린에 들어갔다. 5월 8일 독일이 항복하며 유럽의 전쟁이 끝났다.', 'In April 1945 the Soviet army entered Berlin. On May 8 Germany surrendered and the war in Europe ended.'),
    K('전쟁이 끝난 뒤 세계는 나치 독일이 저지른 대학살(홀로코스트)의 진실을 마주했다. 6백만 명의 유대인이 희생되었다.', 'After the war the world faced the truth of the genocide Nazi Germany had committed: the Holocaust. Six million Jews were murdered.'),
    K('그런데 무너진 도시에 때아닌 겨울이 찾아왔다. 태평양에서는 아직 전쟁이 이어지는데, 전쟁이 남긴 텅 빈 자리에서 얼음의 용 큐레무가 깨어나려 하고 있다.', 'Yet an out-of-season winter came to the ruined city. While the war still went on in the Pacific, Kyurem, the dragon of ice, was stirring in the empty place the war had left behind.'),
  ],
  dungeons: {
    ruins45: { name: K('얼어붙은 폐허', 'The Frozen Ruins'), at: [13.75, 52.85], tiles: T.fortsnow, floors: 3, lv: P(20), bgm: 'd_ice', tint: 'rgba(170,210,255,0.12)',
      mons: [613, 614, 582, 583, 584, 615, 215, 461, 473, 478, 362, 571, 609, 635, 623, 633, 634],
      boss: boss(635, P(20)[1] + 5, [406, 399, 53, 434], blast(K('용의파동', 'Dragon Pulse'), 16, ['ring', 'x', 'far', 'checker']),
        [N('얼어붙은 폐허 위를 삼삼드래가 세 개의 머리로 울부짖으며 날고 있다. 큐레무의 냉기에 휩쓸려 이성을 잃었다!', 'Hydreigon flies over the frozen ruins, howling from its three heads. Swept up in Kyurem\'s cold, it has lost its reason!')],
        [{ who: 635, text: K('…크와아. (삼삼드래가 북쪽 하늘의 눈구름 한가운데를 가리킨다. 그곳에 큐레무가 있다.)', '...Kwaah. (Hydreigon points into the heart of the snow clouds in the northern sky. Kyurem is there.)') }], { hp: 3, bgm: 'vs_strong' }) }, // as the other 600-total bosses (content_wboss.js strong)
    // the last battle: the city (Lacunosa as drawn by Pokémon Black, the walled town Kyurem comes to at night) frozen
    kyurem45: { name: K('얼어붙은 도시 · 큐레무', 'The Frozen City: Kyurem'), tiles: T.fortsnow, floors: 1, lv: P(20), fromTown: true, bgm: 'vs_kyurem',
      mons: [613, 614, 615, 583, 584, 215, 461], tint: 'rgba(170,215,255,0.28)',
      battle: { town: null, foeBuff: 1 }, boss: KYUREM },
  },
  npcs: [ber, sol45, kor45],
  main: [
    talk(sol45, K('귀향병 노보청과 이야기하자', 'Talk to Homecoming Soldier Conkeldurr'),
      K('전쟁은 끝났는데 도시가 얼어 가고 있소. 폐허 위로 머리 셋 달린 용이 미쳐 날뛰고 있소!', 'The war is over, yet the city is freezing. A three-headed dragon is running wild over the ruins!')),
    go('ruins45', K('얼어붙은 폐허에서 삼삼드래를 진정시키자', 'Calm Hydreigon in the frozen ruins')),
    talk(kor45, K('조선 청년의 달막화와 이야기하자', "Talk to the Korean youth\'s Darumaka"),
      K('달마…. (주인은 고향으로 돌아갈 날만 기다린다. 유럽의 전쟁은 끝났지만, 태평양에서는 아직 싸움이 이어지고 있다.)', 'Daruma.... (Its owner waits only for the day they can go home. The war in Europe is over, but in the Pacific the fighting goes on.)')),
    scene(N('1945년 7월, 베를린 곁 포츠담에 모인 연합국이 일본에 무조건 항복을 요구했다(포츠담 선언). 한국의 독립을 약속한 카이로 선언도 다시 확인되었다.', 'In July 1945 the Allies, meeting at Potsdam beside Berlin, demanded Japan\'s unconditional surrender (the Potsdam Declaration). It reaffirmed the Cairo Declaration\'s promise of Korean independence.'),
      N('8월, 미국이 일본의 히로시마와 나가사키에 원자 폭탄을 떨어뜨려 수많은 사람이 희생되었다. 그중에는 강제로 끌려간 조선 사람들도 많았다.', 'In August the United States dropped atomic bombs on Hiroshima and Nagasaki in Japan, and vast numbers of people died. Many of them were Koreans who had been forcibly taken there.'),
      N('전쟁이 끝나기 직전, 얼어붙은 도시 위의 눈구름이 한꺼번에 내려앉았다.', 'On the eve of the war\'s end, the snow clouds over the frozen city came down all at once.'),
      C('…느껴져? 세계의 시간이 이곳에서 얼어붙으려 하고 있어. 전쟁이 남긴 텅 빈 자리가 큐레무를 불러냈어.', '...Do you feel it? The world\'s time is about to freeze here. The emptiness the war left behind has called Kyurem out.'),
      C('큐레무를 진정시키지 못하면, 이 세계는 전쟁이 끝나는 이 순간에 멈춰 버려. 아무도 다시 일어서지 못하게 돼.', 'If we can\'t calm Kyurem, this world will stop at the very moment the war ends. Nobody will ever get back up.'),
      PT('612년부터 1945년까지, 한국에서도 세계에서도 사람들은 쓰러졌다가 다시 일어섰어. 그걸 보여 주자. 마지막 싸움이야!', 'From 612 to 1945, in Korea and across the world, people fell and stood up again. Let\'s show it that. This is the last fight!')),
    // the last quest of the Second World War, and of the world line: the final battle
    { do: 'battle', d: 'kyurem45', npc: 'ber1945', final: true,
      log: K('최종 결전! 얼어붙은 도시에서 큐레무를 진정시키고 제2차 세계 대전을 끝내자 (큐레무 → 블랙큐레무 → 화이트큐레무)', 'The final battle! Calm Kyurem in the frozen city and end the Second World War (Kyurem → Black Kyurem → White Kyurem)'),
      say: [{ who: 584, name: K('폐허의 바닐리치', 'Vanilluxe in the Ruins'), text: K('바닐…! (눈구름이 도시 위로 내려앉는다. 큐레무가 온다!)', 'Vanil...! (The snow clouds settle over the city. Kyurem is coming!)') }] },
  ],
  outro: [
    N('얼음이 녹으며 도시에 늦은 봄이 찾아왔다.', 'The ice melted, and a late spring came to the city.'),
    N('8월 15일, 일본이 항복했다. 제2차 세계 대전이 끝나고, 한국은 35년 만에 광복을 맞았다.', 'On August 15 Japan surrendered. The Second World War was over, and Korea was liberated after thirty-five years.'),
    { who: 554, name: K('조선 청년의 달막화', "A Korean Youth\'s Darumaka"), text: K('달마, 달마! (주인과 함께 고향으로 가는 배에 오른다. 한반도 쪽 하늘이 밝게 빛나고 있다.)', 'Daruma, daruma! (It boards the ship home with its owner. The sky over the Korean peninsula is shining bright.)') },
    N('전쟁은 6천만 명이 넘는 사람의 목숨을 앗아 갔다. 살아남은 사람들은 다시는 이런 전쟁이 없도록 국제 연합(UN)을 만들었다.', 'The war took the lives of more than sixty million people. The survivors founded the United Nations so that there would never be such a war again.'),
    C('세계 여행은 여기까지야. 이제 한국으로 돌아가자. 광복 뒤의 이야기가 우리를 기다리고 있어!', 'This is as far as our world journey goes. Let\'s go back to Korea. The story after liberation is waiting for us!'),
  ],
  side: [{ id: 'w45a', title: K('폐허의 구호 식량', 'Rations for the Ruins'), kind: 'collect', item: 'w_ration', n: 3, d: 'ruins45', reward: { money: 7000, exp: 7000 },
    desc: K('얼어붙은 폐허에 흩어진 구호 식량 3꾸러미를 찾아 사람들에게 나눠 주세요.', 'Find 3 ration bundles scattered across the frozen ruins and share them out.') }],
});

export const W2 = [W1939, W1940A, W1940B, W1941, W1942P, W1942L, W1942E, W1943, W1944N, W1944L, W1945];
