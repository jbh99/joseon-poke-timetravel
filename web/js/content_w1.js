// The world line, part one: from the Convention of Peking (1860) to the Paris Peace Conference (1919).
import { K, T, N, PT, person, talk, go, scene, era } from './content_wkit.js';
import { WB } from './content_wboss.js';

const P = (k) => [56 + Math.round(k * 1.2), 60 + Math.round(k * 1.2)]; // the designed levels of the k-th world era (the band rises above them)

// ---------------------------------------------------------------- 1860: the Convention of Peking
const yi = person('yi1860', 621, K('역관 크리만', 'Interpreter Druddigon'), K('나는 연경에 온 조선 사신단의 역관이오. 이 도시에 불길한 소문이 돌고 있소.', "I interpret for the Joseon embassy to Yanjing. Ominous rumours are going round this city."));
const mien = person('mien1860', 620, K('무도가 비조도', 'Martial Artist Mienshao'), K('서양 군대가 황제의 정원까지 들어왔다더군. 원명원 쪽 하늘이 붉어.', "They say the western armies reached the emperor's own gardens. The sky over the Yuanmingyuan is red."), { wander: 2 });
const fur = person('fur1860', 613, K('모피 상인 코고미', 'Fur Trader Cubchoo'), K('북쪽 우수리강 너머 땅을 러시아가 가져간다는 이야기가 있어요. 그럼 조선과 러시아가 국경을 맞대게 되죠.', 'Word is Russia will take the land past the Ussuri in the north. Then Joseon and Russia will share a border.'));
export const W1860 = era({
  year: 1860, years: '1856 – 1860', title: K('베이징 조약', 'The Convention of Peking'), sub: K('불타는 정원, 바뀌는 국경', 'A burning garden, a moving border'),
  place: K('베이징', 'Peking'), bw: 'opelucid', map: 'eastasia', at: [116.4, 39.9], bgm: 'city10_d', world: 'road_e', card: [T.castle, [621, 620, 612, 610]], inn: 113, shop: 572,
  intro: [
    K('1856년 영국과 프랑스는 청나라와 두 번째 아편 전쟁을 벌였다.', 'In 1856 Britain and France went to war with Qing China a second time: the Second Opium War.'),
    K('1860년 10월, 영국·프랑스 연합군이 베이징에 들어와 황제의 정원 원명원을 약탈하고 불태웠다.', 'In October 1860 the Anglo-French army entered Peking, looted the emperor\'s garden palace, the Yuanmingyuan, and burned it.'),
    K('청은 베이징 조약을 맺었다. 러시아는 그 틈에 연해주를 얻어 조선과 국경을 맞대게 되었다.', 'Qing signed the Convention of Peking. Russia, in the gap, took the Maritime Province and came to share a border with Joseon.'),
  ],
  dungeons: {
    yuanming: { name: K('불타는 원명원', 'The Burning Yuanmingyuan'), at: [116.0, 40.25], tiles: T.castle, floors: 3, lv: P(0), bgm: 'd_lake', tint: 'rgba(255,120,60,0.10)',
      mons: [621, 610, 611, 561, 607, 608, 619, 620, 622, 509, 510, 498, 499, 513, 514, 612],
      boss: WB.yuanming },
    ussuri: { name: K('우수리강 국경', 'The Ussuri Frontier'), at: [133.5, 45.5], tiles: T.birch, floors: 3, lv: P(0), bgm: 'road_snow',
      mons: [613, 614, 583, 584, 615, 215, 220, 221, 585, 586],
      boss: WB.ussuri },
  },
  marks: [{ name: K('→ 두만강 (조선)', '→ Tumen River (Joseon)'), lon: 130.5, lat: 42.4, text: K('베이징 조약으로 러시아 땅이 된 연해주는 두만강 하구에서 조선과 맞닿았다.', 'The Maritime Province, Russian after the Convention of Peking, met Joseon at the mouth of the Tumen.') }],
  npcs: [yi, mien, fur],
  main: [
    talk(yi, K('역관 크리만에게 사정을 듣자', 'Hear Interpreter Druddigon out'),
      K('세레비라고 했소? 시간을 건너왔다니… 그렇다면 내 말을 믿어 주시오.', 'Celebi, you said? Crossed time... then you will believe what I tell you.'),
      K('연합군이 원명원을 불태우는 바람에, 정원을 지키던 포켓몬들이 불길 속에 갇혔소. 저 불을 진정시켜 주시오!', 'The allied army has set the Yuanmingyuan on fire, and the Pokémon guarding the garden are trapped in it. Calm that fire, please!')),
    go('yuanming', K('불타는 원명원에서 정원의 포켓몬들을 구하자', 'Save the garden\'s Pokémon in the burning Yuanmingyuan')),
    talk(yi, K('크리만에게 돌아가자', 'Return to Druddigon'),
      K('고맙소. 하지만 오늘 청나라는 베이징 조약에 도장을 찍었소. 땅을 떼어 주고 항구를 열었지.', 'Thank you. But today Qing put its seal on the Convention of Peking. It gave away land and opened ports.'),
      K('러시아가 우수리강 너머 땅까지 얻었다는 소식이 있소. 국경의 숲이 어수선하다니, 가 보겠소?', 'They say Russia has even gained the land past the Ussuri. The frontier woods are in turmoil, will you go?')),
    go('ussuri', K('우수리강 국경의 숲을 살피자', 'Look into the frontier woods on the Ussuri')),
    scene(N('연해주가 러시아 땅이 되면서, 조선은 처음으로 서양 나라와 국경을 맞대게 되었다.', 'With the Maritime Province Russian, Joseon shared a border with a western power for the first time.'),
      N('베이징이 함락되었다는 소식은 조선 조정을 크게 놀라게 했다. 이 충격은 훗날 흥선 대원군의 통상 거부 정책으로 이어진다.', 'The news that Peking had fallen shook the Joseon court. The shock fed into the Heungseon Daewongun\'s later refusal of foreign trade.')),
    talk(yi, K('크리만과 이야기하자', 'Talk to Druddigon'),
      K('나는 이 소식을 한양에 전하러 돌아가겠소. 세상이 바다 건너에서부터 크게 흔들리고 있소.', 'I am going back to carry this news to Hanyang. The world is shaking, from across the seas.')),
  ],
  outro: [N('불탄 원명원의 돌기둥은 지금도 베이징에 남아, 그날을 기억하고 있다.', 'The stone pillars of the burned Yuanmingyuan still stand in Beijing, remembering that day.')],
  side: [{ id: 'w60a', title: K('잿더미 속 인장', 'A Seal in the Ashes'), kind: 'collect', item: 'w_seal', n: 3, d: 'yuanming', reward: { money: 4000, exp: 4000 },
    desc: K('원명원 잿더미에 묻힌 청동 인장 3개를 찾아 주세요.', 'Find 3 bronze seals buried in the ashes of the Yuanmingyuan.') }],
});

// ---------------------------------------------------------------- 1894: the Sino-Japanese War at sea
const ding = person('ding1894', 565, K('북양 함대 수병 늑골라', 'Beiyang Sailor Carracosta'), K('조선에서 동학 농민들이 일어나자, 청과 일본이 서로 군대를 보냈소. 바다가 수상하오.', 'When the Donghak peasants rose in Joseon, Qing and Japan both sent troops. The sea feels wrong.'));
const gull = person('gull1894', 279, K('등대지기 패리퍼', 'Lighthouse Keeper Pelipper'), K('아산만 쪽에서 포성이 들렸어요! 풍도 앞바다예요!', 'Gunfire from the direction of Asan Bay! Off Pungdo!'), { wander: 2 });
const swan = person('swan1894', 581, K('어부 스완나', 'Fisher Swanna'), K('압록강 어귀까지 큰 배들이 몰려간대요. 고기잡이도 못 나가겠어요.', 'Big ships are crowding toward the mouth of the Yalu. We can\'t even go out fishing.'));
export const W1894 = era({
  year: 1894, years: '1894 – 1895', title: K('청일 전쟁', 'The Sino-Japanese War'), sub: K('풍도와 황해, 바다에서 시작된 전쟁', 'Pungdo and the Yellow Sea: a war begun at sea'),
  place: K('웨이하이웨이', 'Weihaiwei'), bw: 'undella', map: 'eastasia', at: [122.1, 37.5], bgm: 'town05_su', world: 'naminori', card: [T.sea, [565, 593, 130, 581]], inn: 594, shop: 279,
  intro: [
    K('1894년 조선에서 동학 농민 운동이 일어나자, 청과 일본이 앞다투어 조선에 군대를 보냈다.', 'When the Donghak Peasant Revolution broke out in Joseon in 1894, Qing and Japan raced to send troops into Korea.'),
    K('7월 25일 아산만 앞 풍도에서 일본 함대가 청의 군함을 공격하며 전쟁이 시작되었다.', 'On July 25, off Pungdo before Asan Bay, the Japanese fleet attacked Qing warships and the war began.'),
    K('9월 17일 압록강 어귀의 황해 해전에서 청의 북양 함대가 크게 졌다.', 'On September 17, at the Battle of the Yellow Sea off the Yalu, Qing\'s Beiyang Fleet was badly beaten.'),
  ],
  dungeons: {
    pungdo: { name: K('풍도 앞바다', 'The Waters off Pungdo'), at: [126.4, 37.1], tiles: T.sea, water: true, floors: 3, lv: P(1), bgm: 'd_04',
      mons: [592, 593, 594, 550, 73, 279, 278, 320, 223, 224, 501, 502],
      boss: WB.pungdo },
    yellowsea: { name: K('황해 해전', 'Battle of the Yellow Sea'), at: [123.2, 39.0], tiles: T.deepsea, water: true, floors: 3, lv: P(1), bgm: 'ba_dpoke2',
      mons: [130, 565, 564, 592, 593, 550, 319, 73, 226, 581],
      boss: WB.yellowsea },
  },
  marks: [{ name: K('시모노세키', 'Shimonoseki'), lon: 130.9, lat: 33.95, text: K('1895년 4월 시모노세키 조약: 청은 조선이 "자주국"임을 인정하고, 타이완 등을 일본에 넘겼다.', 'The Treaty of Shimonoseki, April 1895: Qing recognised Korea as "independent" and ceded Taiwan and more to Japan.') }],
  npcs: [ding, gull, swan],
  main: [
    talk(ding, K('북양 함대 수병 늑골라에게 이야기를 듣자', 'Hear Beiyang Sailor Carracosta out'),
      K('우리 함대가 조선으로 군사를 실어 나르던 배를 지키러 나갔소. 그런데 풍도 앞바다에서 포성이 끊이질 않는다오.', 'Our fleet went out to guard the ships carrying soldiers to Korea. But the guns off Pungdo will not stop.'),
      K('바다에 빠진 사람들과 포켓몬들이 많소. 구해 주겠소?', 'Many people and Pokémon are in the water. Will you save them?')),
    go('pungdo', K('풍도 앞바다에서 바다에 빠진 이들을 구하자 (해전)', 'Rescue those in the water off Pungdo (naval battle)')),
    talk(swan, K('어부 스완나에게 가 보자', 'Go and see Fisher Swanna'),
      K('전쟁이 정말로 시작됐어요. 이제 두 나라 함대가 압록강 어귀에서 맞붙는대요.', 'The war has really begun. Now the two fleets will clash at the mouth of the Yalu.'),
      K('포성에 놀란 머리 셋 달린 용이 그 바다 위를 날뛰고 있대요. 사람들이 빠져나갈 수가 없어요!', 'A three-headed dragon startled by the guns is raging over that sea. Nobody can get away!')),
    go('yellowsea', K('황해 해전의 바다에서 삼삼드래를 진정시키자 (해전)', 'Calm Hydreigon in the sea of the Yellow Sea battle (naval battle)')),
    scene(N('북양 함대는 황해 해전에서 크게 졌고, 이듬해 웨이하이웨이에서 무너졌다.', 'The Beiyang Fleet was badly beaten in the Yellow Sea and fell at Weihaiwei the next year.'),
      N('1895년 시모노세키 조약으로 청은 조선에 대한 영향력을 잃었다. 그러자 일본이 조선에 더 깊이 손을 뻗었다.', 'With the Treaty of Shimonoseki in 1895, Qing lost its hold on Korea. Japan reached deeper into Korea in its place.')),
    talk(ding, K('늑골라에게 돌아가자', 'Return to Carracosta'),
      K('싸움터는 조선 땅과 조선의 바다였는데, 조선 사람들은 그 자리에 없었소. 그게 가장 마음에 걸리오.', 'The battlefield was Korean land and Korean sea, yet no Koreans had a say in it. That weighs on me most.')),
  ],
  outro: [N('청일 전쟁은 동아시아의 질서를 바꾸었다. 조선의 운명은 점점 다른 나라들의 손에 넘어가고 있었다.', 'The Sino-Japanese War changed the order of East Asia. Korea\'s fate was slipping into other nations\' hands.')],
  side: [{ id: 'w94a', title: K('구명 부표 나르기', 'Carry the Lifebelts'), kind: 'collect', item: 'w_lifebelt', n: 3, d: 'pungdo', reward: { money: 4200, exp: 4200 },
    desc: K('풍도 앞바다에 흩어진 구명 부표 3개를 모아 주세요.', 'Gather 3 lifebelts scattered over the sea off Pungdo.') }],
});

// ---------------------------------------------------------------- 1904: the Russo-Japanese War (Chemulpo, Port Arthur, Tsushima)
const var1904 = person('var1904', 581, K('바랴크호 수병 스완나', 'Varyag Sailor Swanna'), K('제물포 항에 일본 함대가 나타났소! 우리 배는 빠져나갈 수 없게 됐소.', 'A Japanese squadron has appeared off Chemulpo! Our ship can\'t get out.'));
const miner = person('miner1904', 526, K('공병 기가이어스', 'Sapper Gigalith'), K('뤼순 요새 앞의 203고지를 두고 몇 달째 싸우고 있어요. 언덕이 피로 물들었습니다.', 'They have fought for months over 203 Meter Hill before the Port Arthur fortress. The hill is soaked in blood.'));
const tele1904 = person('tele1904', 587, K('전신 기사 에몽가', 'Telegrapher Emolga'), K('발트 함대가 지구 반 바퀴를 돌아오고 있대요! 대한 해협에서 결판이 날 거예요.', 'The Baltic Fleet is coming halfway round the world! It will be decided in the Korea Strait.'), { wander: 2 });
export const W1904 = era({
  year: 1904, years: '1904 – 1905', title: K('러일 전쟁', 'The Russo-Japanese War'), sub: K('제물포에서 쓰시마까지', 'From Chemulpo to Tsushima'),
  place: K('뤼순', 'Port Arthur'), bw: 'driftveil', map: 'eastasia', at: [121.25, 38.8], bgm: 'city05_d', world: 'road_d', card: [T.strait, [526, 565, 581, 587]], inn: 113, shop: 509,
  intro: [
    K('1904년 2월, 일본은 뤼순 항의 러시아 함대와 제물포 항의 러시아 군함을 기습하며 러일 전쟁을 일으켰다.', 'In February 1904 Japan started the Russo-Japanese War with surprise attacks on the Russian fleet at Port Arthur and on Russian warships at Chemulpo.'),
    K('대한 제국은 중립을 선언했지만, 일본군은 한반도에 들어와 군사 기지로 삼았다.', 'The Korean Empire declared neutrality, but the Japanese army marched into the peninsula and used it as a base.'),
    K('1905년 5월 쓰시마(대한 해협) 해전에서 러시아 발트 함대가 무너졌다.', 'In May 1905 the Russian Baltic Fleet was destroyed at the Battle of Tsushima, in the Korea Strait.'),
  ],
  dungeons: {
    chemulpo: { name: K('제물포 해전', 'Battle of Chemulpo'), at: [126.6, 37.45], tiles: T.strait, water: true, floors: 3, lv: P(2), bgm: 'd_04',
      mons: [565, 564, 592, 593, 581, 580, 73, 279, 550],
      boss: WB.chemulpo },
    hill203: { name: K('203고지', '203 Meter Hill'), at: [121.5, 39.2], tiles: T.cliff, floors: 3, lv: P(2), bgm: 'd_mount2',
      mons: [524, 525, 526, 529, 530, 557, 558, 66, 67, 68, 532, 533, 538, 539],
      boss: WB.hill203 },
    tsushima: { name: K('쓰시마 해전', 'Battle of Tsushima'), at: [129.6, 34.5], tiles: T.deepsea, water: true, floors: 3, lv: P(2), bgm: 'ba_dpoke2',
      mons: [130, 565, 593, 319, 321, 320, 226, 73, 550, 581, 503],
      boss: WB.tsushima },
  },
  marks: [{ name: K('→ 포츠머스', '→ Portsmouth'), lon: 145.5, lat: 46.0, text: K('1905년 9월 미국 포츠머스에서 강화 조약이 맺어졌다. 일본은 대한 제국에 대한 우월권을 인정받았고, 두 달 뒤 을사늑약을 강요했다.', 'Peace was made at Portsmouth, USA, in September 1905. Japan won recognition of its paramount interest in Korea, and two months later forced the Eulsa Treaty on it.') }],
  npcs: [var1904, miner, tele1904],
  main: [
    talk(var1904, K('바랴크호 수병 스완나에게 이야기를 듣자', 'Hear Varyag Sailor Swanna out'),
      K('제물포 항 앞바다에서 우리 배가 포위되었소. 싸움이 벌어지면 항구 사람들까지 위험하오.', 'Our ship is surrounded off Chemulpo. If the fighting starts, the harbour people will be in danger too.'),
      K('바다에 빠진 이들을 건져 주시오. 대한 제국 사람들은 이 전쟁에 아무 상관도 없는데…', 'Please pull out those in the water. The people of the Korean Empire have nothing to do with this war...')),
    go('chemulpo', K('제물포 앞바다에서 사람들을 구하자 (해전)', 'Rescue people off Chemulpo (naval battle)')),
    talk(miner, K('공병 기가이어스와 이야기하자', 'Talk to Sapper Gigalith'),
      K('뤼순 요새의 마지막 언덕이 203고지예요. 땅속의 포켓몬들이 포성에 미쳐 굴을 파고 있어요.', 'The last hill before the Port Arthur fortress is 203 Meter Hill. The Pokémon underground are tunnelling in a frenzy from the guns.')),
    go('hill203', K('203고지의 무너지는 굴을 막자', 'Stop the collapsing tunnels on 203 Meter Hill')),
    talk(tele1904, K('전신 기사 에몽가에게 가 보자', 'Go and see Telegrapher Emolga'),
      K('뤼순이 함락됐어요! 이제 발트 함대가 대한 해협으로 들어온대요. 해협 위에서 구름을 탄 포켓몬이 번개를 내리친다는 전신도 왔어요!', 'Port Arthur has fallen! Now the Baltic Fleet is entering the Korea Strait. A telegram says a Pokémon riding a cloud is striking lightning over it too!')),
    go('tsushima', K('쓰시마 해전의 바다에서 볼트로스를 진정시키자 (해전)', 'Calm Thundurus in the waters of the Battle of Tsushima (naval battle)')),
    scene(N('1905년 5월, 대한 해협에서 러시아 발트 함대가 무너졌다.', 'In May 1905 the Russian Baltic Fleet was destroyed in the Korea Strait.'),
      N('같은 해 11월, 일본은 대한 제국의 외교권을 빼앗는 을사늑약을 강요했다.', 'That November, Japan forced the Eulsa Treaty on the Korean Empire, taking away its diplomacy.')),
    talk(var1904, K('스완나에게 돌아가자', 'Return to Swanna'),
      K('두 나라가 남의 땅과 바다에서 싸웠고, 그 대가는 대한 제국이 치렀소. 이 일을 잊으면 안 되오.', 'Two nations fought on someone else\'s land and sea, and the Korean Empire paid the price. This must never be forgotten.')),
  ],
  outro: [N('러일 전쟁의 승리로 일본은 대한 제국을 손에 넣으려 했다. 그 이야기는 한국의 1905년으로 이어진다.', 'With its victory over Russia, Japan set out to take the Korean Empire. That story goes on in Korea\'s 1905.')],
  side: [{ id: 'w04a', title: K('함대 신호기', 'Fleet Signal Flags'), kind: 'collect', item: 'w_flag', n: 3, d: 'tsushima', reward: { money: 4400, exp: 4400 },
    desc: K('쓰시마 바다에 떠다니는 신호기 3장을 건져 주세요.', 'Fish out 3 signal flags drifting on the sea off Tsushima.') }],
});

// ---------------------------------------------------------------- 1914: Sarajevo
const sop = person('sop1914', 573, K('꽃집 주인 치라치노', 'Florist Cinccino'), K('오늘은 성 비투스 축일이에요. 황태자 부부가 시내를 지나간대요.', "Today is St. Vitus' Day. The heir and his wife will drive through town."));
const guard14 = person('guard14', 625, K('경비대원 절각참', 'Guard Bisharp'), K('라틴 다리 근처가 어수선하오. 군중 속에 수상한 자들이 섞여 있소.', 'It\'s restless near the Latin Bridge. There are suspicious people in the crowd.'), { wander: 1 });
const news14 = person('news14', 587, K('신문팔이 에몽가', 'Newsboy Emolga'), K('호외요, 호외! 오스트리아가 세르비아에 최후통첩을 보냈대요!', 'Extra, extra! Austria has sent Serbia an ultimatum!'), { wander: 3 });
export const W1914A = era({
  year: 1914, years: '1914', title: K('사라예보 사건', 'The Sarajevo Assassination'), sub: K('한 발의 총성이 세계를 흔들다', 'One shot shakes the world'),
  place: K('사라예보', 'Sarajevo'), bw: 'nacrene', map: 'europe', at: [18.41, 43.86], bgm: 'city02_d', world: 'road_c', card: [T.street, [573, 625, 587, 571]], inn: 531, shop: 573,
  intro: [
    K('1914년의 유럽은 두 편으로 갈라져 있었다. 독일·오스트리아-헝가리와 영국·프랑스·러시아가 서로를 겨누고 있었다.', 'Europe in 1914 was split in two: Germany and Austria-Hungary on one side, Britain, France and Russia on the other.'),
    K('6월 28일, 오스트리아의 황태자 프란츠 페르디난트 부부가 보스니아의 사라예보를 방문했다.', 'On June 28, the Austrian heir, Archduke Franz Ferdinand, and his wife visited Sarajevo in Bosnia.'),
    K('라틴 다리 근처에서 청년 가브릴로 프린치프가 쏜 총에 부부가 숨졌다. 한 달 뒤 제1차 세계 대전이 시작되었다.', 'Near the Latin Bridge, shots from a young man, Gavrilo Princip, killed them both. A month later the First World War began.'),
  ],
  dungeons: {
    latin: { name: K('라틴 다리 골목', 'The Lanes by the Latin Bridge'), at: [17.85, 43.86], tiles: T.street, floors: 3, lv: P(3), bgm: 'd_agito',
      mons: [509, 510, 570, 571, 568, 569, 572, 573, 527, 528, 607],
      boss: WB.latin },
    balkan: { name: K('발칸 산길', 'The Balkan Pass'), at: [19.2, 43.5], tiles: T.mountain, floors: 3, lv: P(3), bgm: 'road_f',
      mons: [627, 628, 629, 630, 524, 525, 619, 620, 532, 533, 559, 560],
      boss: WB.balkan },
  },
  npcs: [sop, guard14, news14],
  main: [
    talk(sop, K('꽃집 주인 치라치노와 이야기하자', 'Talk to Florist Cinccino'),
      K('축일인데도 거리가 이상하게 차가워요. 오스트리아가 보스니아를 합병한 뒤로 다들 마음이 갈라졌거든요.', 'It\'s a feast day, but the streets feel strangely cold. Hearts have been divided ever since Austria annexed Bosnia.')),
    talk(guard14, K('경비대원 절각참에게 가 보자', 'Go and see Guard Bisharp'),
      K('라틴 다리 근처 골목에 머리 셋 달린 용이 숨어 있다는 소문이 돌고 있소. 사람들이 겁에 질려 서로를 의심하고 있소.', 'They say a three-headed dragon is hiding in the lanes near the Latin Bridge. People are scared and suspect one another.'),
      K('그 골목을 살펴 주겠소?', 'Will you look into those lanes?')),
    go('latin', K('라틴 다리 골목의 어둠 속을 살피자', 'Look into the dark lanes by the Latin Bridge')),
    scene(N('그러나 그날 오전 11시경, 라틴 다리 근처 모퉁이에서 총성이 울렸다. 황태자 부부가 숨졌다.', 'But at about 11 that morning, shots rang out at a corner near the Latin Bridge. The heir and his wife were dead.'),
      PT('…막을 수 없었어. 역사는 이미 일어난 일이니까. 그래도 다치는 사람을 줄일 수는 있을 거야.', "...We couldn't stop it. It already happened in history. But we can still help fewer people get hurt.")),
    talk(news14, K('신문팔이 에몽가와 이야기하자', 'Talk to Newsboy Emolga'),
      K('7월 28일, 오스트리아가 세르비아에 전쟁을 선포했어요! 러시아, 독일, 프랑스, 영국까지 줄줄이 따라 들어가고 있어요!', 'On July 28 Austria declared war on Serbia! Russia, Germany, France and Britain are following one after another!'),
      K('동원령 때문에 발칸 산길이 아수라장이래요.', 'The mobilisation has turned the Balkan pass into chaos.')),
    go('balkan', K('혼란에 빠진 발칸 산길을 지나자', 'Get through the Balkan pass in chaos')),
    talk(sop, K('치라치노에게 돌아가자', 'Return to Cinccino'),
      K('다들 크리스마스 전에는 전쟁이 끝날 거래요. …정말 그럴까요?', 'Everyone says the war will be over by Christmas. ...Will it really?')),
  ],
  outro: [N('사람들은 짧은 전쟁을 예상했다. 그러나 전쟁은 4년 넘게 이어지며 천만 명이 넘는 군인의 목숨을 앗아 갔다.', 'People expected a short war. It lasted more than four years and took the lives of over ten million soldiers.')],
  side: [{ id: 'w14a', title: K('골목의 조로아', 'Zorua in the Lanes'), kind: 'defeat', sp: 570, n: 5, d: 'latin', reward: { money: 4500, exp: 4500 },
    desc: K('사람 모습으로 둔갑해 소란을 피우는 조로아 5마리를 진정시켜 주세요.', 'Calm 5 Zorua making trouble disguised as people.') }],
});

// ---------------------------------------------------------------- 1914: the Marne, and the Christmas truce
const taxi = person('taxi1914', 523, K('택시 기사 제브라이카', 'Taxi Driver Zebstrika'), K('파리의 택시가 전부 마른 강으로 병사들을 실어 나르고 있소! 나도 곧 출발하오.', "Every taxi in Paris is carrying soldiers to the Marne! I'm off soon too."));
const nurse = person('nurse1914', 531, K('간호사 다부니', 'Nurse Audino'), K('부상병들이 끝없이 들어와요. 손이 모자라요.', 'The wounded keep coming without end. We\'re short of hands.'));
const poilu = person('poilu1914', 507, K('징집병 하데리어', 'Conscript Herdier'), K('크리스마스엔 집에 갈 줄 알았는데… 참호만 길어지고 있어.', 'I thought I would be home for Christmas... only the trenches keep getting longer.'), { wander: 1 });
export const W1914B = era({
  year: 1914, years: K('1914 9월 – 12월', 'Sep – Dec 1914'), title: K('마른 전투', 'The Battle of the Marne'), sub: K('파리의 택시와 크리스마스 휴전', 'The taxis of Paris and the Christmas truce'),
  place: K('파리', 'Paris'), bw: 'nimbasa', map: 'europe', at: [2.35, 48.86], bgm: 'city09_d', world: 'road_b', card: [T.field, [523, 531, 507, 534]], inn: 531, shop: 573,
  intro: [
    K('독일군은 벨기에를 지나 파리 코앞까지 밀려 내려왔다.', 'The German army swept through Belgium to the very gates of Paris.'),
    K('1914년 9월, 프랑스와 영국군은 마른 강에서 반격에 나섰다. 파리의 택시 수백 대가 병사들을 실어 날랐다.', 'In September 1914 the French and British struck back on the Marne. Hundreds of Paris taxis carried soldiers to the front.'),
    K('독일군의 진격은 멈췄지만, 양쪽은 땅을 파고 참호 속에서 마주 보게 되었다.', 'The German advance was stopped, but both sides dug in and came to face each other from trenches.'),
  ],
  dungeons: {
    marne: { name: K('마른 강 전선', 'The Marne Front'), at: [3.4, 48.95], tiles: T.field, floors: 3, lv: P(4), bgm: 'd_02',
      mons: [504, 505, 506, 507, 508, 519, 520, 521, 532, 533, 522, 523, 626, 534],
      boss: WB.marne },
    noman: { name: K('무인 지대', "No Man's Land"), at: [2.9, 50.4], tiles: T.quarry, floors: 3, lv: P(4), bgm: 'd_06',
      mons: [529, 530, 551, 552, 553, 624, 625, 568, 569, 607, 608],
      boss: WB.noman },
  },
  npcs: [taxi, nurse, poilu],
  main: [
    talk(taxi, K('택시 기사 제브라이카와 이야기하자', 'Talk to Taxi Driver Zebstrika'),
      K('독일군이 파리에서 고작 50킬로미터 떨어진 곳까지 왔소. 우리가 병사들을 마른 강으로 나르고 있소!', 'The Germans are barely fifty kilometres from Paris. We are carrying the soldiers to the Marne!'),
      K('그런데 강가에서 포켓몬이 날뛰어 다리가 무너지려 한다오. 도와주시오!', 'But a Pokémon is rampaging by the river and the bridge is about to give way. Help us!')),
    go('marne', K('마른 강 전선의 다리를 지키자', 'Save the bridge on the Marne front')),
    talk(nurse, K('간호사 다부니를 도와주자', 'Help Nurse Audino'),
      K('파리는 지켜졌어요. 하지만 이제 바다에서 스위스까지 참호가 이어졌어요. 끝이 보이지 않아요.', 'Paris is safe. But now the trenches run from the sea to Switzerland. There is no end in sight.')),
    scene(N('1914년 크리스마스 이브, 서부 전선 곳곳에서 병사들이 총을 내려놓고 캐럴을 불렀다.', 'On Christmas Eve 1914, all along the Western Front, soldiers laid down their rifles and sang carols.'),
      N('적이었던 병사들은 무인 지대에서 만나 담배와 초콜릿을 나누고, 함께 전사자를 묻었다. "크리스마스 휴전"이었다.', 'Soldiers who had been enemies met in No Man\'s Land, shared cigarettes and chocolate, and buried the dead together. It was the "Christmas truce".')),
    talk(poilu, K('징집병 하데리어와 이야기하자', 'Talk to Conscript Herdier'),
      K('무인 지대에서 사람들이 만난대. 그런데 거기 있는 포켓몬이 아무도 못 지나가게 막고 있어.', 'People are meeting in No Man\'s Land. But a Pokémon out there won\'t let anyone through.')),
    go('noman', K('무인 지대에서 크리스마스의 길을 열자', "Open the way for Christmas in No Man's Land")),
  ],
  outro: [N('크리스마스 휴전은 다시 오지 않았다. 지휘관들은 이듬해부터 그런 만남을 엄하게 금지했다.', 'The Christmas truce never came again. From the next year the commanders strictly forbade such meetings.')],
  side: [{ id: 'w14b', title: K('전선의 편지', 'Letters from the Front'), kind: 'collect', item: 'w_letter', n: 3, d: 'noman', reward: { money: 4600, exp: 4600 },
    desc: K('무인 지대에 떨어진 병사들의 편지 3통을 찾아 가족에게 보내 주세요.', "Find 3 soldiers' letters dropped in No Man's Land and send them home.") }],
});

// ---------------------------------------------------------------- 1915: Gallipoli
const anzac = person('anzac1915', 508, K('안작 병사 바랜드', 'Anzac Soldier Stoutland'), K('지구 반대편에서 이 낯선 해안까지 왔소. 절벽 위에서 총탄이 비처럼 쏟아지오.', 'We came from the far side of the world to this strange shore. Bullets pour down like rain from the cliffs.'));
const turk = person('turk1915', 620, K('오스만 병사 비조도', 'Ottoman Soldier Mienshao'), K('여기는 우리 땅이오. 해협을 지키지 못하면 이스탄불이 위험하오.', 'This is our land. If we lose the straits, Istanbul is in danger.'));
const medic15 = person('medic1915', 531, K('병원선 간호사 다부니', 'Hospital Ship Nurse Audino'), K('양쪽 부상병을 다 실어요. 바다 위에서는 편이 없어요.', 'We take the wounded from both sides. At sea there are no sides.'), { wander: 1 });
export const W1915 = era({
  year: 1915, years: '1915 – 1916', title: K('갈리폴리 전투', 'The Gallipoli Campaign'), sub: K('다르다넬스 해협의 절벽', 'The cliffs of the Dardanelles'),
  place: K('갈리폴리', 'Gallipoli'), bw: 'nuvema', map: 'europe', at: [26.8, 40.55], bgm: 'town01_d', world: 'road_a', card: [T.sand, [508, 620, 565, 581]], inn: 531, shop: 279,
  intro: [
    K('1915년, 영국과 프랑스는 오스만 제국의 다르다넬스 해협을 뚫어 러시아와 손잡으려 했다.', 'In 1915 Britain and France tried to force the Ottoman Empire\'s Dardanelles and link up with Russia.'),
    K('3월 18일 함대 공격이 기뢰에 막히자, 4월 25일 오스트레일리아·뉴질랜드군(안작) 등이 갈리폴리 반도에 상륙했다.', 'When the naval attack of March 18 was stopped by mines, Australian and New Zealand troops (the Anzacs) and others landed on the Gallipoli peninsula on April 25.'),
    K('8개월 동안 양쪽 모두 큰 희생을 치렀고, 연합군은 1916년 1월 끝내 물러났다.', 'Both sides suffered terribly for eight months, and the Allies finally withdrew in January 1916.'),
  ],
  dungeons: {
    dardanelles: { name: K('다르다넬스 해협', 'The Dardanelles'), at: [26.47, 40.03], tiles: T.strait, water: true, floors: 3, lv: P(5), bgm: 'd_04',
      mons: [592, 593, 594, 565, 564, 73, 72, 550, 580, 581],
      boss: WB.dardanelles },
    anzac: { name: K('안작 만 절벽', 'The Cliffs of Anzac Cove'), at: [26.2, 40.38], tiles: T.cliff, floors: 3, lv: P(5), bgm: 'd_mount2',
      mons: [557, 558, 551, 552, 624, 625, 627, 629, 532, 533, 619],
      boss: WB.anzac },
  },
  npcs: [anzac, turk, medic15],
  main: [
    talk(anzac, K('안작 병사 바랜드와 이야기하자', 'Talk to Anzac Soldier Stoutland'),
      K('우리 배들이 해협에서 기뢰에 걸렸소. 바다에 빠진 사람들이 많소. 해협으로 가 주겠소?', 'Our ships struck mines in the straits. Many are in the water. Will you go to the straits?')),
    go('dardanelles', K('다르다넬스 해협에서 사람들을 구하자 (해전)', 'Rescue people in the Dardanelles (naval battle)')),
    talk(turk, K('오스만 병사 비조도와 이야기하자', 'Talk to Ottoman Soldier Mienshao'),
      K('적이든 아군이든, 절벽에 갇힌 부상병들이 죽어 가오. 잠깐 총을 멈추고 그들을 데려가는 날이 있었소.', 'Friend or foe, the wounded trapped on the cliffs are dying. There were days we stopped firing so they could be carried off.'),
      K('그 절벽 길을 열어 주시오.', 'Please open the path down those cliffs.')),
    go('anzac', K('안작 만 절벽에서 부상병들의 길을 열자', 'Open a way for the wounded on the cliffs of Anzac Cove')),
    scene(N('1915년 5월 24일, 양쪽은 9시간 동안 총을 멈추고 전사자를 묻었다.', 'On May 24, 1915 both sides stopped firing for nine hours and buried their dead.'),
      N('연합군은 1916년 1월 반도에서 물러났다. 이 전투는 오스트레일리아·뉴질랜드, 그리고 튀르키예가 스스로를 돌아보는 날로 남았다.', 'The Allies left the peninsula in January 1916. The campaign remains a day of remembrance for Australia, New Zealand and Türkiye alike.')),
    talk(medic15, K('간호사 다부니에게 돌아가자', 'Return to Nurse Audino'),
      K('훗날 이 해안에는 "이곳에 누운 이들은 이제 우리의 아들"이라는 글이 새겨진대요.', 'One day these shores will carry the words: "those who lie here are now our sons as well."')),
  ],
  outro: [N('갈리폴리의 해안에는 지금도 양쪽 병사들의 묘지가 나란히 있다.', 'On the shores of Gallipoli, the graves of soldiers from both sides still lie side by side.')],
  side: [{ id: 'w15a', title: K('구급 상자 나르기', 'Carry the First-Aid Kits'), kind: 'collect', item: 'w_medkit', n: 3, d: 'anzac', reward: { money: 4700, exp: 4700 },
    desc: K('절벽 곳곳에 떨어진 구급 상자 3개를 병원선으로 가져와 주세요.', 'Bring 3 first-aid kits dropped across the cliffs to the hospital ship.') }],
});

// ---------------------------------------------------------------- 1916: Verdun and the Somme
const verdun = person('verdun1916', 534, K('요새병 노보청', 'Fortress Soldier Conkeldurr'), K('"그들은 지나가지 못한다!" 베르됭은 열 달째 버티고 있소.', '"They shall not pass!" Verdun has held for ten months.'));
const truck = person('truck1916', 601, K('수송대 기기기어르', 'Convoy Klinklang'), K('"신성한 길"로 트럭이 끝없이 오가요. 이 길이 끊기면 베르됭도 끝이에요.', 'Trucks come and go endlessly on the "Sacred Way". If the road is cut, Verdun is finished.'), { wander: 2 });
const somme = person('somme1916', 507, K('영국 병사 하데리어', 'British Soldier Herdier'), K('솜 강에서 첫날에만 수만 명이 쓰러졌소. 그리고 이번엔 "탱크"라는 쇳덩이가 나온다고 하오.', 'On the Somme, tens of thousands fell on the first day alone. Now they say an iron thing called a "tank" is coming.'));
export const W1916A = era({
  year: 1916, years: '1916', title: K('베르됭과 솜', 'Verdun and the Somme'), sub: K('끝나지 않는 참호의 해', 'The year of endless trenches'),
  place: K('베르됭', 'Verdun'), bw: 'icirrus', map: 'europe', at: [5.38, 49.16], bgm: 'city07_d', world: 'road_snow', card: [T.fort, [534, 601, 507, 625]], inn: 531, shop: 509,
  intro: [
    K('1916년 2월, 독일군이 프랑스의 요새 도시 베르됭을 공격했다. 전투는 10개월 동안 이어졌다.', 'In February 1916 the German army attacked the French fortress city of Verdun. The battle went on for ten months.'),
    K('7월에는 영국·프랑스군이 솜 강에서 공세를 펼쳤다. 첫날에만 영국군 5만 7천여 명이 죽거나 다쳤다.', 'In July the British and French attacked on the Somme. On the first day alone over 57,000 British soldiers were killed or wounded.'),
    K('9월 솜에서 처음으로 전차(탱크)가 전장에 나왔다. 그러나 전선은 거의 움직이지 않았다.', 'In September tanks appeared on a battlefield for the first time, on the Somme. Yet the front barely moved.'),
  ],
  dungeons: {
    douaumont: { name: K('두오몽 요새', 'Fort Douaumont'), at: [5.8, 49.42], tiles: T.fort, floors: 3, lv: P(6), bgm: 'd_06',
      mons: [599, 600, 601, 624, 625, 532, 533, 534, 524, 525, 526, 632],
      boss: WB.douaumont },
    somme: { name: K('솜 강 참호', 'The Somme Trenches'), at: [2.7, 50.0], tiles: T.quarry, floors: 3, lv: P(6), bgm: 'd_02',
      mons: [529, 530, 568, 569, 551, 552, 553, 504, 505, 627, 629, 632, 306],
      boss: WB.somme },
  },
  npcs: [verdun, truck, somme],
  main: [
    talk(verdun, K('요새병 노보청과 이야기하자', 'Talk to Fortress Soldier Conkeldurr'),
      K('두오몽 요새가 한때 적에게 넘어갔다가 되찾았소. 그런데 요새 안의 포켓몬이 미쳐 날뛰고 있소.', 'Fort Douaumont fell to the enemy once and was taken back. But a Pokémon inside it has gone mad.')),
    go('douaumont', K('두오몽 요새의 포켓몬을 진정시키자', 'Calm the Pokémon in Fort Douaumont')),
    talk(truck, K('수송대 기기기어르에게 가 보자', 'Go and see Convoy Klinklang'),
      K('"신성한 길"로 매일 수천 대의 트럭이 다녀요. 하지만 북쪽 솜 강에서도 큰 싸움이 시작됐어요.', 'Thousands of trucks use the "Sacred Way" every day. But a great battle has begun on the Somme to the north as well.')),
    talk(somme, K('영국 병사 하데리어와 이야기하자', 'Talk to British Soldier Herdier'),
      K('참호 사이로 강철 괴물이 나타났다는 말이 있소. 탱크인지 포켓몬인지 모르겠지만, 진흙탕에 빠진 병사들이 위험하오!', 'They say a steel monster has appeared between the trenches. Tank or Pokémon, I can\'t tell, but the soldiers stuck in the mud are in danger!')),
    go('somme', K('솜 강 참호의 강철 괴물을 막자', 'Stop the steel monster in the Somme trenches')),
    scene(N('베르됭과 솜에서만 백만 명이 넘는 군인이 죽거나 다쳤다. 그래도 전선은 몇 킬로미터밖에 움직이지 않았다.', 'At Verdun and the Somme alone, over a million soldiers were killed or wounded. The front moved only a few kilometres.')),
    talk(verdun, K('노보청에게 돌아가자', 'Return to Conkeldurr'),
      K('이 땅에는 지금도 녹슨 포탄이 묻혀 있소. 다시는 이런 전쟁이 없기를 바라오.', 'Rusty shells lie buried in this ground even now. May there never be such a war again.')),
  ],
  outro: [N('베르됭 근처에는 지금도 사람이 살 수 없는 "붉은 구역"이 남아 있다.', 'Near Verdun there is still a "red zone" where no one may live.')],
  side: [{ id: 'w16a', title: K('참호의 거대한 쓰레기', 'Trench Garbage'), kind: 'defeat', sp: 568, n: 5, d: 'somme', reward: { money: 4800, exp: 4800 },
    desc: K('참호에 쌓인 쓰레기에서 불어난 깨봉이 5마리를 진정시켜 주세요.', 'Calm 5 Trubbish that have multiplied in the rubbish piled in the trenches.') }],
});

// ---------------------------------------------------------------- 1916: Jutland
const scapa = person('scapa1916', 581, K('대함대 수병 스완나', 'Grand Fleet Sailor Swanna'), K('스캐파 플로의 함대가 출항하오! 독일 대양 함대가 북해로 나왔다는 소식이오.', 'The fleet at Scapa Flow is sailing! Word is the German High Seas Fleet has come out into the North Sea.'));
const radio = person('radio1916', 587, K('무전병 에몽가', 'Radio Operator Emolga'), K('독일 함대의 무전을 가로챘어요! 유틀란트 반도 앞바다예요.', "We've intercepted the German fleet's signals! Off the Jutland peninsula."));
const fisher16 = person('fisher1916', 594, K('어부 맘복치', 'Fisher Alomomola'), K('북해 어장이 포탄 때문에 엉망이 됐어요.', 'The North Sea fishing grounds are a mess from the shells.'), { wander: 2 });
export const W1916B = era({
  year: 1916, years: K('1916 5월', 'May 1916'), title: K('유틀란트 해전', 'The Battle of Jutland'), sub: K('북해의 거대한 함대', 'The great fleets of the North Sea'),
  place: K('스캐파 플로', 'Scapa Flow'), bw: 'driftveil', map: 'europe', at: [-3.1, 58.9], bgm: 'city05_d', world: 'naminori', card: [T.deepsea, [581, 594, 130, 321]], inn: 594, shop: 279,
  intro: [
    K('1916년 5월 31일, 북해 유틀란트 반도 앞바다에서 영국 대함대와 독일 대양 함대가 맞붙었다.', 'On May 31, 1916, off the Jutland peninsula in the North Sea, the British Grand Fleet met the German High Seas Fleet.'),
    K('250척의 군함이 참가한, 제1차 세계 대전에서 가장 큰 해전이었다.', 'Some 250 warships took part: the largest naval battle of the First World War.'),
    K('양쪽 모두 승리를 주장했지만, 독일 함대는 그 뒤 다시 큰 바다로 나오지 못했다.', 'Both sides claimed victory, but the German fleet never again came out into the open sea in force.'),
  ],
  dungeons: {
    northsea: { name: K('북해의 안개', 'The North Sea Fog'), at: [2.0, 57.5], tiles: T.sea, water: true, floors: 3, lv: P(7), bgm: 'd_04',
      mons: [592, 593, 594, 550, 580, 581, 73, 320, 86, 87],
      boss: WB.northsea },
    jutland: { name: K('유틀란트 해전', 'Battle of Jutland'), at: [6.0, 56.7], tiles: T.deepsea, water: true, floors: 3, lv: P(7), bgm: 'ba_dpoke2',
      mons: [130, 565, 593, 319, 321, 226, 73, 550, 230, 117],
      boss: WB.jutland },
  },
  npcs: [scapa, radio, fisher16],
  main: [
    talk(scapa, K('대함대 수병 스완나와 이야기하자', 'Talk to Grand Fleet Sailor Swanna'),
      K('함대가 출항하는데 북해에 안개가 짙소. 안개 속에서 길을 잃은 배들이 서로 부딪칠 것 같소.', 'The fleet is sailing, but the fog lies thick on the North Sea. Ships lost in it may run into each other.')),
    go('northsea', K('북해의 안개를 걷어 내자 (해전)', 'Clear the North Sea fog (naval battle)')),
    talk(radio, K('무전병 에몽가와 이야기하자', 'Talk to Radio Operator Emolga'),
      K('두 함대가 마주쳤어요! 군함이 연달아 가라앉고 있어요. 바다에 빠진 사람들을 구해 주세요!', 'The two fleets have met! Ships are going down one after another. Save the people in the water!')),
    go('jutland', K('유틀란트 해전의 바다에서 사람들을 구하자 (해전)', 'Rescue people in the sea of the Battle of Jutland (naval battle)')),
    scene(N('하룻밤 사이에 25척의 군함이 가라앉고, 8천 명이 넘는 수병이 목숨을 잃었다.', 'In a single night 25 warships sank and over 8,000 sailors lost their lives.')),
    talk(fisher16, K('어부 맘복치와 이야기하자', 'Talk to Fisher Alomomola'),
      K('바다는 누구의 편도 아니에요. 그냥 모두를 삼킬 뿐이죠.', 'The sea takes no one\'s side. It just swallows everyone.')),
  ],
  outro: [N('유틀란트 뒤로 독일은 잠수함전에 기대게 되었고, 이는 훗날 미국이 전쟁에 뛰어드는 계기가 되었다.', 'After Jutland Germany turned to submarine warfare, which in time helped bring the United States into the war.')],
  side: [{ id: 'w16b', title: K('표류하는 구명 부표', 'Drifting Lifebelts'), kind: 'collect', item: 'w_lifebelt', n: 3, d: 'jutland', reward: { money: 4900, exp: 4900 },
    desc: K('유틀란트 바다에 떠다니는 구명 부표 3개를 건져 주세요.', 'Pick up 3 lifebelts drifting on the sea off Jutland.') }],
});

// ---------------------------------------------------------------- 1918: the Armistice
const wagon = person('wagon1918', 589, K('철도원 슈바르고', 'Railwayman Escavalier'), K('콩피에뉴 숲에 특별 열차가 서 있소. 객차 한 칸에서 전쟁을 끝낼 서명을 한다오.', 'A special train stands in the Forest of Compiègne. In one carriage, they will sign the end of the war.'));
const flu = person('flu1918', 531, K('간호사 다부니', 'Nurse Audino'), K('전쟁만이 아니에요. 독감이 온 세계를 휩쓸고 있어요.', 'It isn\'t only the war. Influenza is sweeping the whole world.'), { wander: 1 });
const kid18 = person('kid1918', 506, K('소녀의 요테리', "A Girl's Lillipup"), K('아빠가 곧 집에 온대요! 진짜예요!', 'Papa is coming home soon! Really!'), { wander: 3 });
export const W1918 = era({
  year: 1918, years: K('1918 11월', 'Nov 1918'), title: K('휴전', 'The Armistice'), sub: K('11월 11일 11시', 'The eleventh hour of the eleventh day'),
  place: K('콩피에뉴', 'Compiègne'), bw: 'accumula', map: 'europe', at: [2.83, 49.42], bgm: 'town02_d', world: 'road_a', card: [T.forest, [589, 531, 506, 585]], inn: 531, shop: 572,
  intro: [
    K('1917년 미국이 전쟁에 뛰어들고, 러시아에서는 혁명이 일어나 전쟁에서 빠졌다.', 'In 1917 the United States entered the war, and Russia, in revolution, left it.'),
    K('1918년 가을, 지친 독일은 휴전을 청했다.', 'In the autumn of 1918 an exhausted Germany asked for an armistice.'),
    K('11월 11일 새벽, 콩피에뉴 숲의 열차 객차에서 휴전 협정이 맺어지고, 오전 11시에 총성이 멈추었다.', 'Before dawn on November 11, the armistice was signed in a railway carriage in the Forest of Compiègne, and at 11 a.m. the guns fell silent.'),
  ],
  dungeons: {
    forest18: { name: K('콩피에뉴 숲', 'The Forest of Compiègne'), at: [3.4, 49.3], tiles: T.forest, floors: 3, lv: P(8), bgm: 'd_02',
      mons: [540, 541, 542, 543, 544, 545, 546, 547, 548, 549, 585, 586, 590, 591, 495, 496, 511, 512],
      boss: WB.forest18 },
    lastday: { name: K('마지막 날의 전선', 'The Front on the Last Day'), at: [4.0, 49.6], tiles: T.quarry, floors: 3, lv: P(8), bgm: 'd_06',
      mons: [529, 530, 624, 625, 532, 533, 568, 569, 551, 552, 553],
      boss: WB.lastday },
    argonne: { name: K('아르곤 숲 깊은 곳', 'Deep in the Argonne Forest'), at: [4.95, 49.25], tiles: T.forest, floors: 3, lv: P(8), legend: true, bgm: 'd_lake',
      mons: [540, 541, 542, 543, 544, 545, 546, 547, 548, 549, 590, 591, 511, 512], boss: WB.argonne },
  },
  npcs: [wagon, flu, kid18],
  main: [
    talk(wagon, K('철도원 슈바르고와 이야기하자', 'Talk to Railwayman Escavalier'),
      K('오늘 밤 숲속 객차에서 휴전 서명이 있소. 그런데 숲길이 꽃과 덩굴로 막혀서 사절단이 올 수가 없소!', 'Tonight the armistice is signed in the carriage in the woods. But the forest road is choked with flowers and vines and the delegates can\'t get through!')),
    go('forest18', K('콩피에뉴 숲의 길을 열자', 'Clear the road through the Forest of Compiègne')),
    talk(flu, K('간호사 다부니와 이야기하자', 'Talk to Nurse Audino'),
      K('서명이 끝났대요. 하지만 전선에는 아직 11시가 오지 않았어요. 그 사이에도 사람들이 쓰러지고 있어요!', 'They\'ve signed. But eleven o\'clock hasn\'t come to the front yet. People are still falling in the meantime!')),
    go('lastday', K('마지막 날의 전선에서 11시까지 버티자', 'Hold the front until 11 on the last day')),
    scene(N('1918년 11월 11일 오전 11시. 4년 넘게 이어진 포성이 멈추었다.', 'Eleven a.m., November 11, 1918. Guns that had fired for over four years fell silent.'),
      N('그러나 같은 해 전 세계를 덮친 독감으로 전쟁보다 더 많은 사람이 목숨을 잃었다.', 'Yet the influenza that swept the world that same year took even more lives than the war.')),
    talk(kid18, K('요테리와 이야기하자', 'Talk to Lillipup'),
      K('왈왈! (소녀와 함께, 돌아오는 병사들의 열차를 기다리고 있다.)', 'Arf arf! (It is waiting with the girl for the train bringing the soldiers home.)')),
  ],
  outro: [N('11월 11일은 지금도 여러 나라에서 전쟁의 희생자를 기리는 날로 남아 있다.', 'November 11 is still a day for remembering the fallen in many countries.')],
  side: [{ id: 'w18a', title: K('숲속의 독충', 'Poisonous Bugs in the Woods'), kind: 'defeat', sp: 543, n: 5, d: 'forest18', reward: { money: 5000, exp: 5000 },
    desc: K('숲길에서 사람들을 위협하는 마디네 5마리를 진정시켜 주세요.', 'Calm 5 Venipede threatening people on the forest road.') }],
});

// ---------------------------------------------------------------- 1919: the Paris Peace Conference (and Korea's petition)
const kim = person('kim1919', 497, K('김규식 사절단의 샤로다', 'Serperior of the Kim Kyu-sik Mission'), K('나는 상하이 임시 정부의 이름으로 파리에 온 김규식 선생과 함께 왔소. 한국의 독립을 세계에 알리려 하오.', 'I came with Kim Kyu-sik, here in Paris in the name of the provisional government in Shanghai, to tell the world of Korea\'s independence.'));
const wil = person('wil1919', 628, K('기자 워글', 'Reporter Braviary'), K('미국 대통령 윌슨이 "민족 자결"을 말했소. 그런데 그 말은 승전국의 식민지에도 해당될까?', 'President Wilson spoke of "self-determination". But will it apply to the victors\' colonies too?'));
const mirror = person('mirror1919', 576, K('궁전 안내인 고디모아젤', 'Palace Guide Gothitelle'), K('강화 조약은 베르사유 궁전의 거울의 방에서 서명된답니다.', 'The peace treaty will be signed in the Hall of Mirrors at the Palace of Versailles.'), { wander: 1 });
export const W1919 = era({
  year: 1919, years: '1919', title: K('파리 강화 회의', 'The Paris Peace Conference'), sub: K('거울의 방과 한국의 청원', 'The Hall of Mirrors and Korea\'s petition'),
  place: K('파리 (베르사유)', 'Paris (Versailles)'), bw: 'striaton', map: 'europe', at: [2.12, 48.8], bgm: 'city01_d', world: 'road_b', card: [T.castle, [497, 628, 576, 579]], inn: 531, shop: 573,
  intro: [
    K('1919년 1월, 승전국들이 파리에 모여 전쟁 뒤의 세계를 정하는 회의를 열었다.', 'In January 1919 the victorious powers met in Paris to decide the post-war world.'),
    K('미국 대통령 윌슨의 "민족 자결주의"는 식민지 사람들에게 큰 희망을 주었다. 한국에서는 3·1 운동이 일어났다.', 'President Wilson\'s "self-determination" gave colonised peoples great hope. In Korea, the March 1st Movement broke out.'),
    K('김규식은 대한민국 임시 정부의 대표로 파리에 가서 독립 청원서를 냈지만, 회의는 받아들이지 않았다.', 'Kim Kyu-sik went to Paris as the delegate of the Korean Provisional Government and submitted a petition for independence, but the conference would not take it up.'),
  ],
  dungeons: {
    mirrors: { name: K('거울의 방', 'The Hall of Mirrors'), at: [2.0, 48.42], tiles: T.castle, floors: 3, lv: P(9), bgm: 'd_lake',
      mons: [574, 575, 576, 577, 578, 579, 517, 518, 561, 605, 606],
      boss: WB.mirrors },
    seine: { name: K('센 강 다리 밑', 'Under the Seine Bridges'), at: [2.7, 48.98], tiles: T.alley, floors: 3, lv: P(9), bgm: 'd_agito',
      mons: [509, 510, 527, 528, 568, 569, 572, 573, 607, 608, 562, 563, 515, 516],
      boss: WB.seine },
  },
  npcs: [kim, wil, mirror],
  main: [
    talk(kim, K('김규식 사절단의 샤로다와 이야기하자', 'Talk to the Serperior of the Kim Kyu-sik Mission'),
      K('한국에서는 3월 1일, 온 겨레가 독립 만세를 외쳤소. 그 목소리를 이 회의에 전하러 왔소.', 'On March 1 the whole Korean nation cried out for independence. We came to carry that voice to this conference.'),
      K('그런데 회의장 문은 굳게 닫혀 있소. 거울의 방에서 무슨 일이 벌어지는지 살펴 주겠소?', 'But the doors of the conference are shut tight. Will you see what is happening in the Hall of Mirrors?')),
    go('mirrors', K('거울의 방에 갇힌 목소리들을 풀어 주자', 'Free the voices trapped in the Hall of Mirrors')),
    talk(wil, K('기자 워글과 이야기하자', 'Talk to Reporter Braviary'),
      K('식민지 대표들의 청원서가 하나같이 무시당했다는 소문이오. 센 강 다리 밑에 버려진 서류 더미가 있다던데…', 'Word is every petition from colonised peoples was ignored. They say there\'s a pile of papers thrown away under a Seine bridge...')),
    go('seine', K('센 강 다리 밑에서 한국의 청원서를 되찾자', 'Recover the Korean petition from under a Seine bridge')),
    scene(N('1919년 6월 28일, 사라예보 사건 꼭 5년 뒤에 베르사유 조약이 서명되었다.', 'On June 28, 1919, five years to the day after Sarajevo, the Treaty of Versailles was signed.'),
      N('승전국의 식민지 문제는 다루어지지 않았다. 그러나 한국의 외교 활동은 임시 정부의 이름으로 계속되었다.', 'The colonies of the victors were never discussed. But Korea\'s diplomacy went on in the name of the provisional government.')),
    talk(kim, K('샤로다에게 돌아가자', 'Return to Serperior'),
      K('문은 닫혔지만, 우리의 목소리는 기록에 남았소. 언젠가 세계가 다시 들을 날이 올 것이오.', 'The doors stayed shut, but our voice is on the record. One day the world will listen again.')),
  ],
  outro: [N('베르사유 조약은 독일에 무거운 짐을 지웠고, 그 짐은 20년 뒤 또 하나의 전쟁으로 이어진다.', 'The Treaty of Versailles laid a heavy burden on Germany, and that burden led to another war twenty years later.')],
  side: [{ id: 'w19a', title: K('독립 청원서 사본', 'Copies of the Petition'), kind: 'collect', item: 'w_petition', n: 3, d: 'seine', reward: { money: 5200, exp: 5200 },
    desc: K('센 강 다리 밑에 흩어진 한국 독립 청원서 사본 3장을 찾아 주세요.', 'Find 3 copies of the Korean independence petition scattered under the Seine bridges.') }],
});

export const W1 = [W1860, W1894, W1904, W1914A, W1914B, W1915, W1916A, W1916B, W1918, W1919];
