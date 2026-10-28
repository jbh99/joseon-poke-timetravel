// Story content before Joseon: Goguryeo's Salsu (612) through the last years of Goryeo (1388).
// Text is Korean with its English registered through K(); species ids are national dex numbers.
import { K, T, CELEBI } from './content_k.js';

export const ANCIENT_QITEMS = {
  arrows: { name: K('화살 다발', 'Bundle of Arrows'), desc: K('고구려 궁수들이 쓸 맥궁 화살.', 'Arrows for the bows of Goguryeo\'s archers.') },
  ironplate: { name: K('철갑 조각', 'Armor Plate'), desc: K('말까지 철갑을 두른 개마무사의 갑옷 조각.', 'A plate from the armor of Goguryeo\'s heavy cavalry, horses and all.') },
  rooftile: { name: K('연꽃 수막새', 'Lotus Roof Tile'), desc: K('연꽃무늬가 새겨진 백제의 기와 끝장식.', 'A Baekje roof-end tile carved with a lotus.') },
  goldleaf: { name: K('금관 장식', 'Gold Crown Ornament'), desc: K('신라 금관에 달려 있던 작은 금 잎사귀.', 'A small gold leaf that hung from a Silla crown.') },
  celadon: { name: K('청자 조각', 'Celadon Shard'), desc: K('하늘빛이 도는 고려청자 조각.', 'A shard of sky-green Goryeo celadon.') },
  woodblock: { name: K('대장경 목판', 'Tripitaka Woodblock'), desc: K('불경을 새긴 목판. 팔만 장이 넘게 만들어졌다.', 'A woodblock carved with scripture. More than eighty thousand were made.') },
  hwaletter: { name: K('화랑의 편지', "Hwarang's Letter"), desc: K('기벌포 소식을 적은 화랑의 편지.', "A hwarang's letter with news from Gibeolpo.") },
  powder: { name: K('화약 주머니', 'Gunpowder Pouch'), desc: K('최무선이 만든 화약이 든 주머니.', 'A pouch of the gunpowder Choe Mu-seon learned to make.') },
};

export const ANCIENT = [
  // ------------------------------------------------------------------ 612 Goguryeo
  {
    year: 612, years: '598 – 612', title: K('살수대첩', 'The Battle of Salsu'), sub: K('을지문덕과 고구려', 'Eulji Mundeok and Goguryeo'),
    card: { set: T.plain, mons: [59, 178, 16, 60] }, artProps: ['fortgate'], inn: 40, shop: 52,
    town: {
      name: K('평양성', 'Pyongyang Fortress'), bgm: 'town03_d', bgmN: 'town03_n', biome: 'ancient', landmark: 'fortgate', walls: true,
      houses: ['choga', 'hanok', 'choga', 'choga', 'hanok', 'choga', 'hanok', 'choga', 'choga', 'hanok'], props: ['maple', 'logs', 'jars', 'pagoda', 'lantern', 'bamboo'],
    },
    town2: {
      name: K('살수 나루', 'Salsu Ferry'), bgm: 'city07_d', bgmN: 'city07_n', biome: 'coast',
      houses: ['choga', 'choga', 'choga', 'choga'], props: ['logs', 'jars', 'crates', 'maple'], ships: ['boat'],
      npcs: [
        { id: 'ferry612', sp: 54, name: K('뱃사공 고라파덕', 'Ferryman Psyduck'), x: 22, y: 15, say: [{ text: K('살수(청천강)는 평양으로 가는 길목이야. 여름이면 물이 불어나 건너기가 무섭지.', 'The Salsu, the Cheongcheon River, guards the road to Pyongyang. In summer it swells and gets scary to cross.') }] },
        { id: 'marill612', sp: 183, name: K('마릴', 'Marill'), x: 14, y: 19, wander: 3, say: [{ text: K('마릴마릴! 강물 소리가 오늘따라 무섭게 들려.', 'Marill! The river sounds frightening today.') }] },
        { id: 'oldman612', sp: 79, name: K('나루지기 야돈', 'Ferry Keeper Slowpoke'), x: 30, y: 12, say: [{ text: K('…수나라 군사들이 먹을 것이 떨어져서 지쳤다더군. 군량을 버리고 왔대.', '...They say the Sui soldiers ran out of food and are worn out. They dumped their rations on the way.') }] },
      ],
    },
    world: 'road_e',
    intro: [
      K('598년부터 중국을 통일한 수나라가 고구려를 거듭 넘보았다.', 'From 598, the Sui dynasty that had unified China kept eyeing Goguryeo.'),
      K('612년, 수 양제는 백만이 넘는 대군을 이끌고 쳐들어왔다. 역사책에 남은 가장 큰 군대 가운데 하나였다.', 'In 612 Emperor Yang of Sui invaded with an army of more than a million, one of the largest ever recorded.'),
      K('요동성이 버티는 사이, 수나라 별동대 30만이 평양성을 향해 곧장 내려오고 있다.', 'While Liaodong Fortress held out, a strike force of 300,000 marched straight for Pyongyang.'),
    ],
    nodes: [
      { id: 'town', name: K('평양성', 'Pyongyang Fortress'), lon: 125.75, lat: 39.02 },
      { id: 'town2', name: K('살수 나루', 'Salsu Ferry'), lon: 125.25, lat: 39.42, town: 2 },
      { id: 'liaodong', name: K('요동 들판', 'Liaodong Plains'), lon: 124.1, lat: 40.75, d: 'liaodong' },
      { id: 'salsu', name: K('살수', 'The Salsu'), lon: 125.75, lat: 39.68, d: 'salsu' },
      { id: 'daeseong', name: K('대성산 숲', 'Daeseong Forest'), lon: 126.3, lat: 39.3, d: 'daeseong' },
      { mark: true, name: K('요동성', 'Liaodong Fortress'), lon: 123.7, lat: 41.3, text: K('612년, 요동성은 수나라 대군의 공격을 몇 달이나 버텨 냈다.', 'In 612, Liaodong Fortress held out against the Sui host for months.') },
    ],
    dungeons: {
      liaodong: { name: K('요동 들판', 'Liaodong Plains'), tiles: T.plain, floors: 3, lv: [3, 6], mons: [16, 19, 21, 29, 32, 56, 396, 399], bgm: 'road_c',
        boss: { sp: 57, lv: 9, bgm: 'ba_poke', say: [
          { who: 57, text: K('끼끼끼! 북소리, 말발굽 소리! 시끄러워서 못 살겠다! 다 덤벼라!', 'Eek eek! Drums! Hooves! I can\'t stand the noise! Come at me, all of you!') },
          { who: 'partner', text: K('대군이 지나가며 들판이 엉망이 됐어. 성원숭을 진정시키자!', 'The army trampled the whole plain. Let\'s calm Primeape down!') }],
          after: [{ who: 57, text: K('…헉헉. 미안. 우리 들판이 짓밟혀서 화가 났던 거야.', '...Huff. Sorry. I was angry that our plains got trampled.') }] } },
      salsu: { name: K('살수', 'The Salsu'), tiles: T.strait, floors: 3, lv: [4, 7], water: true, loan: [158, 258], mons: [60, 118, 129, 54, 183, 339, 194], bgm: 'naminori',
        boss: { sp: 340, lv: 11, bgm: 'ba_gym', say: [
          { who: 340, text: K('부글부글… 내 강을 군대가 어지럽히는구나! 누구든 이 물을 건너게 두지 않겠다!', 'Blub blub... Armies churning my river! No one crosses this water!') },
          { who: 'partner', text: K('살수의 주인 메깅이야! 물 위에서는 물 포켓몬만 싸울 수 있어. 힘내!', 'Whiscash, master of the Salsu! On the water only Water types can fight. You can do it!') }],
          after: [{ who: 340, text: K('…알겠다. 이 강은 고구려 사람들의 편이 되어 주지.', '...Very well. This river will stand with the people of Goguryeo.') }] } },
      daeseong: { name: K('대성산 숲', 'Daeseong Forest'), tiles: T.forest, floors: 3, lv: [3, 6], mons: [10, 13, 43, 46, 165, 167, 191], bgm: 'd_05' },
    },
    npcs: [
      { id: 'aide612', sp: 59, name: K('부관 윈디', 'Adjutant Arcanine'), x: 22, y: 15, say: [{ text: K('을지문덕 장군께서는 싸우는 척 물러나며 적을 깊이 끌어들이고 계시오.', 'General Eulji Mundeok keeps pulling back as if beaten, luring the enemy deeper.') }] },
      { id: 'xatu612', sp: 178, name: K('천문관 네이티오', 'Astronomer Xatu'), x: 27, y: 12, say: [{ text: K('고구려 무덤 벽화에는 해와 달, 별자리가 그려져 있지. 우리는 하늘을 읽는 사람들이라네.', 'Goguryeo tomb murals show the sun, the moon and the stars. We are a people who read the sky.') }] },
      { id: 'smith612', sp: 297, name: K('대장장이 하리뭉치', 'Smith Hariyama'), x: 9, y: 16, say: [{ text: K('고구려는 쇠를 잘 다루지. 개마무사는 말에게까지 철갑을 입힌다네!', 'Goguryeo knows its iron. Our heavy cavalry even put armor on the horses!') }] },
      { id: 'poliwag612', sp: 60, name: K('발챙이', 'Poliwag'), x: 14, y: 21, wander: 3, say: [{ text: K('살수 강물은 여름이면 불어나서 엄청 빨라져!', 'The Salsu swells in summer and gets really fast!') }] },
      { id: 'pidgey612', sp: 16, name: K('구구', 'Pidgey'), x: 31, y: 19, wander: 2, say: [{ text: K('수나라 군대가 들판을 새까맣게 덮었대. 하늘에서 봐도 끝이 안 보였어!', 'The Sui army covered the plain black. Even from the sky I couldn\'t see its end!') }] },
    ],
    main: [
      { do: 'talk', npc: 'aide612', log: K('부관 윈디에게 전황을 듣자', 'Hear the news from Adjutant Arcanine'), say: [
        { who: 59, name: K('부관 윈디', 'Adjutant Arcanine'), text: K('수나라 별동대가 평양으로 내려오고 있소. 장군께서는 일부러 져 주며 적을 지치게 하는 중이오.', 'The Sui strike force is heading for Pyongyang. The general is losing on purpose to wear them down.') },
        { who: 59, name: K('부관 윈디', 'Adjutant Arcanine'), text: K('그런데 대군이 휩쓸고 간 요동 들판에서 포켓몬들이 날뛰어 백성들이 피란을 못 가고 있소. 들판을 살펴 주시오!', 'But the Pokémon of the trampled Liaodong plains are running wild, and the villagers can\'t get away. Please go and see!') },
        { who: 'partner', text: K('세계 지도에서 "요동 들판"을 고르면 되겠다. 첫 번째 꽃잎을 찾으러 가자!', 'We pick "Liaodong Plains" on the world map. Let\'s go find the first petal!') }] },
      { do: 'dungeon', d: 'liaodong', log: K('요동 들판 깊은 곳의 성원숭을 진정시키자', 'Calm the Primeape deep in the Liaodong Plains') },
      { do: 'scene', say: [
        { who: 'narr', text: K('을지문덕은 적장 우중문에게 시 한 수를 보냈다.', 'Eulji Mundeok sent the enemy commander Yu Zhongwen a poem.') },
        { who: 'narr', text: K('"신기한 계책은 하늘의 이치를 꿰뚫고, 오묘한 꾀는 땅의 이치를 다했도다. 싸움마다 이겨 공이 이미 높으니, 만족함을 알고 그만두기를 바라노라."', '"Your divine strategy fathoms the heavens, your clever plans exhaust the earth. You have won every battle and your merit is great. Know when you have enough, and stop."') },
        { who: 'narr', text: K('굶주리고 지친 수나라 군사들은 결국 발길을 돌리기 시작했다.', 'Starving and exhausted, the Sui soldiers finally began to turn back.') }] },
      { do: 'talk', npc: 'aide612', gift: [158, 258], log: K('부관 윈디에게 돌아가자', 'Return to Adjutant Arcanine'), say: [
        { who: 59, name: K('부관 윈디', 'Adjutant Arcanine'), text: K('적이 물러간다! 놈들이 살수를 건널 때가 기회요.', 'They\'re retreating! Our chance comes when they cross the Salsu.') },
        { who: 59, name: K('부관 윈디', 'Adjutant Arcanine'), text: K('강 위의 싸움에는 물 포켓몬만 나설 수 있소. 이 아이들을 데려가시오. 리아코와 물짱이요!', 'Only Water types can fight on the river. Take these two with you: Totodile and Mudkip!') },
        { who: 'partner', text: K('물 위에서는 이 친구들이 우리 대신 싸워 줄 거야. 리더, 파트너 둘 다 응원하자!', 'On the water these two will fight for us. Let\'s cheer them on!') }] },
      { do: 'dungeon', d: 'salsu', log: K('살수에서 물 포켓몬과 함께 메깅을 진정시키자', 'Calm Whiscash at the Salsu with your Water-type crew') },
      { do: 'talk', npc: 'aide612', log: K('부관 윈디에게 소식을 전하자', 'Report to Adjutant Arcanine'), say: [
        { who: 59, name: K('부관 윈디', 'Adjutant Arcanine'), text: K('살수를 건너던 수나라 30만 군사 가운데 살아 돌아간 자가 2,700명뿐이라 하오!', 'Of the 300,000 Sui soldiers who crossed the Salsu, they say only 2,700 made it home!') }] },
    ],
    outro: [
      { who: 'narr', text: K('612년 7월, 살수대첩. 고구려는 살수에서 수나라 별동대를 크게 무찔렀다.', 'July 612, the Battle of Salsu. Goguryeo crushed the Sui strike force at the river.') },
      { who: 'narr', text: K('둑을 막았다가 터뜨렸다는 이야기도 전해지지만, 확실한 것은 을지문덕의 지혜가 나라를 지켰다는 사실이다.', 'Tales say a dam was opened on them, but what is certain is that Eulji Mundeok\'s wits saved the kingdom.') },
      { who: 'narr', text: K('거듭된 원정 실패로 수나라는 기울었고, 618년에 무너졌다.', 'Worn down by failed campaigns, the Sui dynasty fell in 618.') },
    ],
    side: [
      { id: 'a1a', title: K('맥궁 화살 모으기', 'Gather Bow Arrows'), kind: 'collect', item: 'arrows', n: 3, d: 'daeseong', reward: { money: 150, items: { oran: 2 }, exp: 80 },
        desc: K('성을 지킬 화살이 모자라요. 대성산 숲에서 화살 다발 3개를 모아 주세요.', 'We\'re short of arrows to defend the fortress. Gather 3 bundles in Daeseong Forest.') },
      { id: 'a1b', title: K('꼬렛 소동', 'Rattata Trouble'), kind: 'defeat', sp: 19, n: 3, d: 'liaodong', reward: { money: 120, exp: 60 },
        desc: K('피란 짐을 갉아먹는 꼬렛 3마리를 쫓아 주세요.', 'Chase off 3 Rattata gnawing at the refugees\' bundles.') },
      { id: 'a1c', title: K('강가의 아기 우파', 'The Baby Wooper'), kind: 'rescue', sp: 194, floor: 2, d: 'salsu', reward: { money: 160, items: { sitrus: 1 }, exp: 100 },
        desc: K('살수 2층 물살에 아기 우파가 떠내려갔대요. 구해 주세요!', 'A baby Wooper was swept away on floor 2 of the Salsu. Please save it!') },
    ],
  },
  // ------------------------------------------------------------------ 660 Baekje
  {
    year: 660, years: '660 – 668', title: K('황산벌 전투', 'The Battle of Hwangsanbeol'), sub: K('계백과 오천 결사대', 'Gyebaek and his five thousand'),
    card: { set: T.field, mons: [214, 115, 38, 279] }, artProps: ['pavilion8'], inn: 40, shop: 52,
    town: {
      name: K('사비성', 'Sabi Fortress'), bgm: 'city01_d', bgmN: 'city01_n', biome: 'ancient', landmark: 'pavilion8',
      houses: ['hanok', 'choga', 'hanok', 'choga', 'choga', 'hanok', 'choga', 'hanok', 'choga'], props: ['pagoda', 'cherry', 'maple', 'jars', 'lantern', 'bamboo'],
    },
    town2: {
      name: K('웅진성', 'Ungjin Fortress'), bgm: 'city04_d', bgmN: 'city04_n', biome: 'autumn',
      houses: ['hanok', 'choga', 'choga', 'hanok'], props: ['maple', 'persimmon', 'logs', 'jars'],
      npcs: [
        { id: 'sentry660', sp: 66, name: K('성지기 알통몬', 'Gatekeeper Machop'), x: 22, y: 15, say: [{ text: K('웅진은 사비로 옮기기 전 백제의 도읍이었어. 공산성이 든든하게 지켜 주지.', 'Ungjin was Baekje\'s capital before Sabi. Gongsan Fortress keeps it safe.') }] },
        { id: 'gulpin660', sp: 316, name: K('꼴깍몬', 'Gulpin'), x: 14, y: 19, wander: 2, say: [{ text: K('꼴깍. 무령왕릉에는 보물이 가득하대. 근데 아무도 위치를 몰라!', 'Gulp. King Muryeong\'s tomb is full of treasure, they say. But nobody knows where it is!') }] },
      ],
    },
    world: 'road_b',
    intro: [
      K('한반도에는 고구려, 백제, 신라 세 나라가 겨루고 있었다.', 'Three kingdoms, Goguryeo, Baekje and Silla, vied for the peninsula.'),
      K('660년, 신라는 당나라와 손을 잡고 백제를 공격했다. 당의 13만 군은 바다로, 김유신의 신라군 5만은 땅으로 밀려왔다.', 'In 660 Silla allied with Tang and struck Baekje: 130,000 Tang troops by sea, and Kim Yu-sin\'s 50,000 Silla soldiers by land.'),
      K('백제의 장군 계백은 오천 결사대를 이끌고 황산벌로 나섰다.', 'Baekje\'s General Gyebaek marched to Hwangsanbeol with five thousand men sworn to die.'),
    ],
    nodes: [
      { id: 'town', name: K('사비성', 'Sabi Fortress'), lon: 126.91, lat: 36.28 },
      { id: 'town2', name: K('웅진성', 'Ungjin Fortress'), lon: 127.12, lat: 36.46, town: 2 },
      { id: 'hwangsan', name: K('황산벌', 'Hwangsanbeol'), lon: 127.25, lat: 36.12, d: 'hwangsan' },
      { id: 'busosan', name: K('부소산성', 'Busosan Fortress'), lon: 126.75, lat: 36.42, d: 'busosan' },
      { id: 'baekgang', name: K('백강 어귀', 'Mouth of the Baekgang'), lon: 126.5, lat: 35.98, d: 'baekgang' },
      { id: 'pyongyang', name: K('평양성', 'Pyongyang Fortress'), lon: 125.75, lat: 39.02, d: 'pyongyang' },
      { mark: true, name: K('서라벌', 'Seorabeol'), lon: 129.22, lat: 35.84, text: K('신라의 도읍. 이곳에서 김춘추와 김유신이 삼국 통일을 꿈꾸었다.', 'Silla\'s capital, where Kim Chun-chu and Kim Yu-sin dreamed of uniting the three kingdoms.') },
    ],
    dungeons: {
      hwangsan: { name: K('황산벌', 'Hwangsanbeol'), tiles: T.field, floors: 4, lv: [6, 10], mons: [21, 27, 66, 74, 204, 261, 263, 84], bgm: 'road_d',
        boss: { sp: 128, lv: 14, bgm: 'ba_poke', say: [
          { who: 128, text: K('부르르릉!! 함성과 북소리에 놀란 켄타로스 떼가 벌판을 내달린다!', 'Snort!! Startled by war cries and drums, a herd of Tauros is stampeding across the plain!') },
          { who: 'partner', text: K('이대로면 피란 가는 사람들이 다쳐! 우두머리를 멈추자!', 'The fleeing families will get hurt! Stop the leader!') }],
          after: [{ who: 128, text: K('…후우. 무리를 데리고 산으로 가겠다. 사람들을 놀라게 해서 미안하다.', '...Phew. I\'ll take the herd to the hills. Sorry for scaring everyone.') }] } },
      busosan: { name: K('부소산성', 'Busosan Fortress'), tiles: T.moss, floors: 3, lv: [7, 11], mons: [37, 43, 69, 92, 163, 198, 200], bgm: 'd_03',
        boss: { sp: 38, lv: 15, bgm: 'ba_gym', say: [
          { who: 38, text: K('…이 산성은 백제의 마지막 자리. 무너지는 나라를 지켜보는 것이 내 몫이었다.', '...This fortress is Baekje\'s last stand. Watching a kingdom fall has been my lot.') },
          { who: 'partner', text: K('나인테일, 슬픔에 갇히지 마. 백제 사람들의 이야기는 사라지지 않아!', 'Ninetales, don\'t drown in grief. The story of Baekje\'s people won\'t vanish!') }],
          after: [{ who: 38, text: K('…그래. 백제의 기와와 탑, 향로는 오래오래 남아 사람들을 놀라게 하겠지.', '...Yes. Baekje\'s roof tiles, pagodas and censers will amaze people for ages to come.') }] } },
      baekgang: { name: K('백강 어귀', 'Mouth of the Baekgang'), tiles: T.sea, floors: 3, lv: [8, 12], water: true, mons: [72, 98, 90, 116, 170, 222, 278], bgm: 'd_lake' },
      // 668: Goguryeo's last battle. The siege of its capital, the gate opened from inside, the walls' last guardian
      pyongyang: { name: K('평양성', 'Pyongyang Fortress'), tiles: T.castle, floors: 4, lv: [9, 13], mons: [74, 66, 56, 304, 95, 75, 67, 57], bgm: 'd_01',
        boss: { sp: 306, lv: 17, lvMin: 13, lvUp: 3, hp: 1.4, atk: 0.95, bgm: 'ba_gym', moves: [232, 36, 157, 231],
          tele: { name: K('성벽 무너뜨리기', 'Toppling Wall'), every: 4, dmg: 0.3, pats: ['near', 'cross', 'rows'], type: 5 },
          say: [
            { who: 'narr', text: K('668년 9월. 한 달 넘게 버틴 평양성의 성문이, 끝내 안에서 열렸다.', 'September 668. After holding out for more than a month, the gate of Pyongyang was at last opened from within.') },
            { who: 306, name: K('보스로라', 'Aggron'), text: K('그롸아아…! 칠백 년을 지킨 성벽이다… 누구도 넘어오지 못한다…!', 'Grraaah...! These walls have stood for seven hundred years... No one gets past them...!') },
            { who: 'partner', text: K('성벽을 지키던 보스로라가 너무 지쳐서 아군과 적도 못 알아봐! 사람들이 빠져나갈 수 있게 진정시키자!', 'The Aggron that guarded the walls is so worn out it can\'t tell friend from foe! Calm it so the people can get out!') }],
          after: [{ who: 306, name: K('보스로라', 'Aggron'), text: K('…그래. 성은 무너져도, 이 성을 지킨 사람들의 이야기는 남겠지. 북쪽으로 가는 사람들을 지켜 주마.', '...Yes. The fortress may fall, but the story of those who defended it will remain. I\'ll guard the people heading north.') }] } },
    },
    npcs: [
      { id: 'heracross660', sp: 214, name: K('결사대 헤라크로스', 'Vanguard Heracross'), x: 22, y: 15, say: [{ text: K('우리는 다섯 번 싸워 네 번을 이겼다. 그래도 적은 끝이 없구나.', 'We fought five times and won four. Still the enemy never ends.') }] },
      { id: 'kanga660', sp: 115, name: K('사비성 아낙 캥카', 'Sabi Mother Kangaskhan'), x: 9, y: 16, say: [{ text: K('아이들만은 꼭 지켜야 해요…', 'Whatever happens, the children must be safe...') }] },
      { id: 'scholar660', sp: 65, name: K('박사 후딘', 'Scholar Alakazam'), x: 27, y: 12, say: [{ text: K('백제는 바다 건너 왜, 중국 남조와 활발히 오갔지. 칠지도라는 칼을 왜에 보냈다고도 전한다네.', 'Baekje traded busily across the sea with Wa and southern China. It is said we even sent the Seven-Branched Sword to Wa.') }] },
      { id: 'skitty660', sp: 300, name: K('에나비', 'Skitty'), x: 14, y: 21, wander: 3, say: [{ text: K('백제 사람들이 만든 금동 향로는 산이랑 동물이 잔뜩 새겨져 있대. 정말 섬세하대!', 'Baekje\'s gilt-bronze censers are covered in mountains and animals. They say the detail is amazing!') }] },
      { id: 'pelipper660', sp: 279, name: K('펠리퍼', 'Pelipper'), x: 31, y: 19, wander: 2, say: [{ text: K('펠리! 백강 쪽 바다에 커다란 배들이 잔뜩 몰려오고 있어!', 'Peli! Huge ships are crowding toward the Baekgang!') }] },
    ],
    main: [
      { do: 'talk', npc: 'heracross660', log: K('결사대 헤라크로스와 이야기하자', 'Talk to Vanguard Heracross'), say: [
        { who: 214, name: K('결사대 헤라크로스', 'Vanguard Heracross'), text: K('계백 장군께서 황산벌에 진을 치셨다. 그런데 싸움에 놀란 포켓몬들이 벌판을 휘젓고 있어.', 'General Gyebaek has made camp at Hwangsanbeol, but Pokémon panicked by the fighting are tearing across the plain.') },
        { who: 214, name: K('결사대 헤라크로스', 'Vanguard Heracross'), text: K('피란 가는 백성들이 다치지 않게 벌판을 지켜 다오!', 'Keep the plain safe so the fleeing families don\'t get hurt!') }] },
      { do: 'dungeon', d: 'hwangsan', log: K('황산벌의 켄타로스 우두머리를 멈추자', 'Stop the Tauros leader at Hwangsanbeol') },
      { do: 'scene', say: [
        { who: 'narr', text: K('신라의 어린 화랑 관창이 홀로 적진에 뛰어들었다. 계백은 그를 사로잡았다가 어린 나이를 아껴 돌려보냈다.', 'Gwanchang, a young hwarang of Silla, charged the Baekje lines alone. Gyebaek captured him, then sent him back, sparing him for his youth.') },
        { who: 'narr', text: K('관창은 다시 달려들었고 끝내 목숨을 잃었다. 그 모습에 신라군의 사기가 크게 올랐다.', 'Gwanchang charged again and was killed. His death fired up the Silla army.') },
        { who: 'narr', text: K('오천 결사대는 끝까지 싸웠고, 계백도 황산벌에서 쓰러졌다.', 'The five thousand fought to the end, and Gyebaek fell at Hwangsanbeol.') }] },
      { do: 'talk', npc: 'kanga660', log: K('사비성의 캥카를 찾아가자', 'Go to Kangaskhan in Sabi'), say: [
        { who: 115, name: K('사비성 아낙 캥카', 'Sabi Mother Kangaskhan'), text: K('사비성이 위험해요! 사람들이 부소산성으로 피하고 있는데, 산성 안이 포켓몬들로 어지러워요.', 'Sabi is in danger! People are fleeing up to Busosan Fortress, but the fortress is full of restless Pokémon.') }] },
      { do: 'dungeon', d: 'busosan', log: K('부소산성 꼭대기까지 피란길을 열자', 'Clear the refugee path to the top of Busosan Fortress') },
      { do: 'talk', npc: 'kanga660', log: K('캥카에게 돌아가자', 'Return to Kangaskhan'), say: [
        { who: 115, name: K('사비성 아낙 캥카', 'Sabi Mother Kangaskhan'), text: K('고마워요. 나라는 무너져도… 우리가 만든 것들과 이야기는 남을 거예요.', 'Thank you. Even if the kingdom falls... the things we made and our stories will live on.') }] },
      { do: 'scene', say: [
        { who: 'narr', text: K('663년, 백제를 되살리려던 부흥군이 백강 전투에서 꺾였다. 665년에는 고구려를 이끌던 연개소문이 세상을 떠났고, 그의 아들들이 권력을 두고 다투었다.', 'In 663 the army trying to revive Baekje was crushed at the Baekgang. In 665 Yeon Gaesomun, who had led Goguryeo, died, and his sons fought over power.') },
        { who: 'narr', text: K('668년, 신라와 당의 연합군이 고구려의 도읍 평양성을 에워쌌다. 칠백 년 고구려의 마지막 싸움이었다.', 'In 668 the Silla-Tang alliance surrounded Pyongyang, Goguryeo\'s capital. It was the last battle of seven-hundred-year Goguryeo.') }] },
      { do: 'talk', npc: 'pelipper660', log: K('펠리퍼에게 평양성 소식을 듣자', 'Hear the news from Pyongyang from Pelipper'), say: [
        { who: 279, name: K('펠리퍼', 'Pelipper'), text: K('펠리! 북쪽 평양성에서 날아왔어! 한 달 넘게 포위된 성 안에 사람들이 갇혀 있어.', 'Peli! I flew down from Pyongyang in the north! People are trapped in the city after more than a month of siege.') },
        { who: 279, name: K('펠리퍼', 'Pelipper'), text: K('성벽을 지키던 보스로라가 지쳐서 정신을 잃어 가고 있대. 사람들이 빠져나갈 길을 열어 줘!', 'The Aggron guarding the walls is so exhausted it is losing its mind. Open a way out for the people!') }] },
      { do: 'dungeon', d: 'pyongyang', log: K('평양성으로! 고구려의 마지막 싸움', 'To Pyongyang! Goguryeo\'s last battle') },
    ],
    outro: [
      { who: 'narr', text: K('660년 7월, 사비성이 함락되고 의자왕이 항복했다. 700년 가까이 이어진 백제가 막을 내렸다.', 'In July 660 Sabi fell and King Uija surrendered. Baekje, nearly 700 years old, came to an end.') },
      { who: 'narr', text: K('백제를 되살리려는 부흥 운동은 663년 백강 전투에서 끝내 꺾였다.', 'The movement to revive Baekje was finally crushed at the Battle of Baekgang in 663.') },
      { who: 'narr', text: K('668년 9월, 평양성이 함락되며 칠백 년 고구려도 막을 내렸다. 고구려 사람들의 꿈은 훗날 발해로 이어진다.', 'In September 668 Pyongyang fell, and seven-hundred-year Goguryeo came to an end too. The dream of its people would live on later in Balhae.') },
    ],
    side: [
      { id: 'a2a', title: K('연꽃 수막새 찾기', 'Find the Lotus Tiles'), kind: 'collect', item: 'rooftile', n: 3, d: 'busosan', reward: { money: 220, exp: 150 },
        desc: K('무너진 지붕에서 떨어진 연꽃 수막새 3개를 찾아 주세요. 백제의 솜씨를 남기고 싶어요.', 'Find 3 lotus roof tiles fallen from the ruined roofs. I want Baekje\'s craft to survive.') },
      { id: 'a2b', title: K('백강의 아기 쏘드라', 'The Baby Horsea'), kind: 'rescue', sp: 116, floor: 2, d: 'baekgang', reward: { money: 250, items: { sitrus: 1 }, exp: 180 },
        desc: K('백강 어귀 2층에서 아기 쏘드라가 배 사이에 갇혔대요. (물 타입만 들어갈 수 있어요)', 'A baby Horsea is trapped between ships on floor 2 of the Baekgang. (Water types only)') },
      { id: 'a2c', title: K('들개 쫓기', 'Chase the Poochyena'), kind: 'defeat', sp: 261, n: 4, d: 'hwangsan', reward: { money: 200, exp: 120 },
        desc: K('피란민을 쫓아다니는 포챠나 4마리를 쫓아 주세요.', 'Chase off 4 Poochyena hounding the refugees.') },
    ],
  },
  // ------------------------------------------------------------------ 676 Silla
  {
    year: 676, years: '670 – 676', title: K('나당 전쟁', 'The Silla-Tang War'), sub: K('삼국 통일을 완성하다', 'Completing the unification'),
    card: { set: T.castle, mons: [145, 237, 76, 116] }, artProps: ['palace'], inn: 40, shop: 52,
    town: {
      name: K('서라벌', 'Seorabeol'), bgm: 'town02_d', bgmN: 'town02_n', biome: 'spring', landmark: 'palace',
      houses: ['hanok', 'hanok', 'choga', 'hanok', 'hanok', 'choga', 'hanok', 'choga', 'hanok'], props: ['pagoda', 'cherry', 'persimmon', 'jars', 'lantern', 'maple'],
    },
    town2: {
      name: K('감포 바닷가', 'Gampo Shore'), bgm: 'city02_d', bgmN: 'city02_n', biome: 'coast',
      houses: ['choga', 'choga', 'hanok', 'choga'], props: ['logs', 'crates', 'jars', 'maple'], ships: ['boat'],
      npcs: [
        { id: 'corsola676', sp: 222, name: K('코산호', 'Corsola'), x: 22, y: 15, say: [{ text: K('저 앞바다 바위에서 가끔 커다란 그림자가 보여. 바다를 지키는 누군가가 있는 걸까?', 'Sometimes a huge shadow appears by the rocks offshore. Is someone guarding the sea?') }] },
        { id: 'fisher676', sp: 279, name: K('어부 펠리퍼', 'Fisher Pelipper'), x: 30, y: 12, say: [{ text: K('펠리! 신라 배들은 바닷길에 밝아. 바람과 물때를 잘 읽지.', 'Peli! Silla\'s ships know the sea lanes. They read wind and tide well.') }] },
      ],
    },
    world: 'road_f',
    intro: [
      K('백제와 고구려가 무너진 뒤, 당나라는 한반도 전체를 다스리려 했다.', 'With Baekje and Goguryeo gone, Tang tried to rule the whole peninsula.'),
      K('백제 땅에는 웅진도독부를, 고구려 땅에는 안동도호부를 두고, 신라마저 계림도독부라 불렀다.', 'It set up commanderies over Baekje and Goguryeo, and even named Silla one of its own.'),
      K('670년, 문무왕은 당나라와의 싸움을 결심했다. 나당 전쟁의 시작이다.', 'In 670 King Munmu resolved to fight Tang. The Silla-Tang War had begun.'),
    ],
    nodes: [
      { id: 'town', name: K('서라벌', 'Seorabeol'), lon: 129.22, lat: 35.84 },
      { id: 'town2', name: K('감포 바닷가', 'Gampo Shore'), lon: 129.5, lat: 35.95, town: 2 },
      { id: 'maeso', name: K('매소성', 'Maeso Fortress'), lon: 127.07, lat: 38.1, d: 'maeso' },
      { id: 'gibeolpo', name: K('기벌포', 'Gibeolpo'), lon: 126.55, lat: 36.05, d: 'gibeolpo' },
      { id: 'daewangam', name: K('대왕암', 'Daewangam Rock'), lon: 129.62, lat: 35.62, d: 'daewangam' },
      { mark: true, name: K('첨성대', 'Cheomseongdae'), lon: 129.0, lat: 35.62, text: K('선덕여왕 때 쌓은 별을 살피는 돌탑. 지금도 경주에 서 있다.', 'A stone tower for watching the stars, built under Queen Seondeok. It still stands in Gyeongju.') },
    ],
    dungeons: {
      maeso: { name: K('매소성', 'Maeso Fortress'), tiles: T.castle, floors: 4, lv: [9, 13], mons: [74, 95, 66, 67, 81, 100, 179, 180, 309], bgm: 'd_01',
        // eased after playtest feedback: HP 4.2 → 2.94 (−30%), hits, hit cap and Thunderstorm all −20%
        boss: { sp: 145, lv: 18, lvMin: 14, lvUp: 3, hp: 2.94, atk: 1.04, cap: 0.34, relentless: true, bgm: 'ba_secret1', moves: [85, 65, 84, 86],
          tele: { name: K('번개 폭풍', 'Thunderstorm'), every: 3, dmg: 0.3, pats: ['cross', 'x', 'target', 'rows'], type: 13 },
          say: [
            { who: 'narr', text: K('당나라 20만 대군 위로 먹구름이 몰려들었다. 하늘을 가르는 번개 속에서 거대한 새가 내려온다!', 'Storm clouds gather over the 200,000 Tang troops. A great bird descends amid splitting lightning!') },
            { who: 145, name: K('썬더', 'Zapdos'), text: K('끼아아앗!! 이 땅의 하늘을 어지럽히는 자는 누구냐!', 'Kyaaah!! Who dares disturb the skies of this land?!') },
            { who: 'partner', text: K('전설의 새 썬더야! 바닥이 빛나는 곳을 잘 피하면서 싸우자!', 'It\'s Zapdos, the legendary bird! Dodge the glowing tiles and fight!') }],
          after: [{ who: 145, name: K('썬더', 'Zapdos'), text: K('…너희는 하늘을 어지럽히러 온 게 아니었군. 이 땅을 지키려는 마음, 번개처럼 분명하다.', '...You did not come to disturb the sky. Your will to protect this land is as clear as lightning.') }],
          join: K('썬더가 날개를 접고 곁에 내려앉았다. 함께 가고 싶어 한다!', 'Zapdos folds its wings and lands beside you. It wants to come along!') } },
      gibeolpo: { name: K('기벌포', 'Gibeolpo'), tiles: T.deepsea, floors: 3, lv: [10, 14], water: true, loan: [116, 7], mons: [72, 98, 116, 117, 120, 223, 279], bgm: 'naminori',
        boss: { sp: 99, lv: 17, bgm: 'ba_gym', say: [
          { who: 99, text: K('철컥철컥! 당나라 함대가 지나가는 이 바다는 이제 내 바다다!', 'Clack clack! The sea the Tang fleet sails is mine now!') },
          { who: 'partner', text: K('설인귀의 함대가 오기 전에 바닷길을 지키자!', 'Hold the sea lane before Xue Rengui\'s fleet arrives!') }],
          after: [{ who: 99, text: K('…철컥. 바다는 누구의 것도 아니었지. 비켜 주마.', '...Clack. The sea never belonged to anyone. I\'ll move aside.') }] } },
      daewangam: { name: K('대왕암', 'Daewangam Rock'), tiles: T.sea, floors: 3, lv: [11, 15], water: true, legend: true, mons: [120, 121, 222, 226, 170, 171], bgm: 'd_lake',
        tint: 'rgba(120,170,255,0.08)',
        boss: { sp: 249, lv: 24, lvMin: 17, lvUp: 4, hp: 1.8, atk: 0.85, bgm: 'ba_secret2', moves: [177, 94, 56, 239],
          tele: { name: K('에어로블라스트', 'Aeroblast'), every: 4, dmg: 0.3, pats: ['cross', 'far', 'ring', 'x'], type: 2 },
          say: [
            { who: 'narr', text: K('파도가 갈라지고, 바위 아래 깊은 바다에서 은빛 날개가 떠올랐다!', 'The waves part, and silver wings rise from the deep below the rock!') },
            { who: 249, name: K('루기아', 'Lugia'), text: K('…죽어서 바다의 용이 되어서라도 나라를 지키겠다는 임금이 있다. 그 마음을 지키는 것이 나의 일.', '...There is a king who vows to become a sea dragon after death to guard his land. Keeping that wish is my task.') },
            { who: 'partner', text: K('바다의 수호신 루기아야! 우리 마음도 보여 주자!', 'Lugia, guardian of the sea! Let\'s show it our resolve!') }],
          after: [{ who: 249, name: K('루기아', 'Lugia'), text: K('…좋다. 너희의 여행이 이 바다처럼 길고 깊기를.', '...Good. May your journey be as long and deep as this sea.') }],
          join: K('루기아가 조용히 날개를 내렸다. 너희와 함께 바다를 건너고 싶어 한다!', 'Lugia quietly lowers its wings. It wants to cross the seas with you!') } },
    },
    npcs: [
      { id: 'hwarang676', sp: 237, name: K('화랑 카포에라', 'Hwarang Hitmontop'), x: 22, y: 15, say: [{ text: K('화랑은 산과 강을 다니며 몸과 마음을 닦는다. 세속오계를 잊지 않지!', 'Hwarang train body and mind in the hills and rivers. We never forget the five precepts!') }] },
      { id: 'golem676', sp: 76, name: K('석공 딱구리', 'Mason Golem'), x: 9, y: 16, say: [{ text: K('첨성대는 선덕여왕 때 쌓았지. 별을 살피는 돌탑이라네.', 'Cheomseongdae went up under Queen Seondeok. A stone tower for watching the stars.') }] },
      { id: 'wobbuffet676', sp: 202, name: K('마자용', 'Wobbuffet'), x: 27, y: 12, say: [{ text: K('마자용! 신라 임금님들은 반짝반짝한 금관을 썼대!', 'Wobbuffet! Silla\'s kings wore sparkly gold crowns!') }] },
      { id: 'snubbull676', sp: 209, name: K('블루', 'Snubbull'), x: 14, y: 21, wander: 3, say: [{ text: K('불국사를 짓는다는 소문이 있어. 언젠가 꼭 보고 싶다!', 'They say a great temple will be built someday. I want to see it!') }] },
      { id: 'horsea676', sp: 116, name: K('쏘드라', 'Horsea'), x: 31, y: 19, wander: 2, say: [{ text: K('기벌포 바다는 물살이 세서 큰 배도 휘청거려.', 'The sea at Gibeolpo is so rough even big ships sway.') }] },
    ],
    main: [
      { do: 'talk', npc: 'hwarang676', log: K('화랑 카포에라와 이야기하자', 'Talk to Hwarang Hitmontop'), say: [
        { who: 237, name: K('화랑 카포에라', 'Hwarang Hitmontop'), text: K('당나라 장수 이근행이 20만 군을 이끌고 매소성에 진을 쳤다!', 'The Tang general Li Jinxing has camped at Maeso Fortress with 200,000 men!') },
        { who: 237, name: K('화랑 카포에라', 'Hwarang Hitmontop'), text: K('그런데 매소성 하늘에 번개를 부르는 새가 나타나 모두가 겁에 질렸어. 그 새를 진정시켜 다오!', 'But a bird that calls lightning has appeared over Maeso, and everyone is terrified. Please calm it!') }] },
      { do: 'dungeon', d: 'maeso', log: K('매소성 하늘의 썬더를 진정시키자', 'Calm Zapdos in the skies over Maeso Fortress') },
      { do: 'scene', say: [
        { who: 'narr', text: K('675년 9월, 매소성 전투. 신라군은 당의 20만 대군을 물리치고 말 3만여 필을 얻었다.', 'September 675, the Battle of Maeso Fortress. Silla drove off 200,000 Tang troops and seized over 30,000 horses.') }] },
      { do: 'talk', npc: 'hwarang676', gift: [116], log: K('화랑 카포에라에게 돌아가자', 'Return to Hwarang Hitmontop'), say: [
        { who: 237, name: K('화랑 카포에라', 'Hwarang Hitmontop'), text: K('이제 바다다. 당의 장수 설인귀가 수군을 이끌고 기벌포로 온다.', 'Now the sea. Tang\'s general Xue Rengui is bringing a fleet to Gibeolpo.') },
        { who: 237, name: K('화랑 카포에라', 'Hwarang Hitmontop'), text: K('바다 위에서는 물 포켓몬만 싸울 수 있지. 쏘드라도 데려가라!', 'Only Water types can fight at sea. Take Horsea with you too!') }] },
      { do: 'dungeon', d: 'gibeolpo', log: K('기벌포 바다를 지키자 (물 타입만)', 'Hold the sea at Gibeolpo (Water types only)') },
      { do: 'talk', npc: 'hwarang676', log: K('화랑 카포에라에게 승전을 알리자', 'Report the victory to Hwarang Hitmontop'), say: [
        { who: 237, name: K('화랑 카포에라', 'Hwarang Hitmontop'), text: K('스물두 번을 싸워 끝내 이겼다! 이제 당나라도 물러갈 거야.', 'Twenty-two clashes, and we won in the end! Now Tang will pull back.') }] },
    ],
    outro: [
      { who: 'narr', text: K('676년 11월, 기벌포 해전. 신라 수군은 크고 작은 싸움 스물두 번 끝에 당 수군을 물리쳤다.', 'November 676, the Battle of Gibeolpo. After twenty-two engagements, Silla\'s navy beat the Tang fleet.') },
      { who: 'narr', text: K('당은 안동도호부를 요동으로 옮겼고, 신라는 대동강 남쪽 땅을 하나로 아울렀다. 삼국 통일이다.', 'Tang moved its protectorate back to Liaodong, and Silla united the land south of the Taedong River.') },
      { who: 'narr', text: K('고구려의 옛 땅 북쪽에서는 698년 대조영이 발해를 세웠다.', 'In the north, on old Goguryeo land, Dae Jo-yeong founded Balhae in 698.') },
    ],
    side: [
      { id: 'a3a', title: K('금관 장식 찾기', 'Gold Crown Leaves'), kind: 'collect', item: 'goldleaf', n: 3, d: 'maeso', reward: { money: 300, exp: 220 },
        desc: K('전쟁통에 떨어진 금관 장식 3개를 매소성에서 찾아 주세요.', 'Find 3 gold crown leaves lost at Maeso Fortress in the chaos.') },
      { id: 'a3b', title: K('바다 위의 소식', 'News at Sea'), kind: 'deliver', item: 'hwaletter', to: 'corsola676', reward: { money: 260, items: { rice: 2 }, exp: 160 },
        desc: K('화랑의 편지를 감포 바닷가의 코산호에게 전해 주세요. (수락하면 편지를 받습니다)', 'Deliver a hwarang\'s letter to Corsola at Gampo Shore. (You get the letter on accepting)') },
      { id: 'a3c', title: K('찌리리공 소동', 'Voltorb Trouble'), kind: 'defeat', sp: 100, n: 4, d: 'maeso', reward: { money: 280, exp: 200 },
        desc: K('번개를 맞고 흥분한 찌리리공 4마리를 진정시켜 주세요.', 'Calm 4 Voltorb that got charged up by the lightning.') },
    ],
  },
  // ------------------------------------------------------------------ 1019 Goryeo
  {
    year: 1019, years: '993 – 1019', title: K('귀주대첩', 'The Battle of Gwiju'), sub: K('서희의 담판과 강감찬', 'Seo Hui\'s talks and Gang Gam-chan'),
    card: { set: T.cliff, mons: [308, 196, 78, 260] }, artProps: ['palace'], inn: 113, shop: 52,
    town: {
      name: K('개경', 'Gaegyeong'), bgm: 'city05_d', bgmN: 'city05_n', biome: 'spring', landmark: 'palace',
      houses: ['hanok', 'hanok', 'choga', 'hanok', 'choga', 'hanok', 'hanok', 'choga', 'hanok'], props: ['persimmon', 'cherry', 'pagoda', 'jars', 'lantern', 'bamboo'],
    },
    town2: {
      name: K('서경', 'Seogyeong'), bgm: 'town03_d', bgmN: 'town03_n', biome: 'autumn', walls: true,
      houses: ['hanok', 'choga', 'choga', 'hanok'], props: ['maple', 'logs', 'jars', 'persimmon'],
      npcs: [
        { id: 'diglett1019', sp: 50, name: K('디그다', 'Diglett'), x: 22, y: 15, say: [{ text: K('서경은 옛 고구려의 평양이야. 고려는 고구려를 잇는다는 뜻으로 이곳을 아꼈지.', 'Seogyeong is old Goguryeo\'s Pyongyang. Goryeo cherished it as heir to Goguryeo.') }] },
        { id: 'stantler1019', sp: 234, name: K('노루 노라키', 'Stantler'), x: 14, y: 19, wander: 2, say: [{ text: K('북쪽 국경에 성을 여섯 개나 쌓았대. 강동 6주라고 부른대.', 'Six forts went up on the northern border. They call them the Six Garrisons East of the River.') }] },
      ],
    },
    world: 'road_a',
    intro: [
      K('918년 왕건이 고려를 세웠고, 936년 후삼국을 하나로 통일했다.', 'Wang Geon founded Goryeo in 918 and reunited the Later Three Kingdoms in 936.'),
      K('북쪽에서는 거란이 세운 요나라가 세력을 키워 고려를 거듭 침략했다.', 'In the north, the Khitan Liao dynasty grew strong and invaded Goryeo again and again.'),
      K('1018년 겨울, 거란의 장수 소배압이 10만 대군을 이끌고 세 번째로 쳐들어왔다.', 'In the winter of 1018, the Khitan general Xiao Paiya invaded for the third time with 100,000 troops.'),
    ],
    nodes: [
      { id: 'town', name: K('개경', 'Gaegyeong'), lon: 126.55, lat: 37.97 },
      { id: 'town2', name: K('서경', 'Seogyeong'), lon: 125.75, lat: 39.02, town: 2 },
      { id: 'heunghwa', name: K('흥화진 냇물', 'Heunghwajin Stream'), lon: 124.65, lat: 40.25, d: 'heunghwa' },
      { id: 'gwiju', name: K('귀주 벌판', 'Gwiju Plain'), lon: 125.2, lat: 39.98, d: 'gwiju' },
      { id: 'gangdong', name: K('강동 6주 산길', 'Garrison Trail'), lon: 125.65, lat: 40.55, d: 'gangdong' },
      { mark: true, name: K('강동 6주', 'Six Garrisons'), lon: 124.9, lat: 40.6, text: K('993년 서희가 거란의 소손녕과 담판을 지어 싸우지 않고 얻어 낸 땅.', 'Land Seo Hui won without a fight by negotiating with the Khitan Xiao Xunning in 993.') },
    ],
    dungeons: {
      heunghwa: { name: K('흥화진 냇물', 'Heunghwajin Stream'), tiles: T.strait, floors: 3, lv: [12, 16], water: true, mons: [55, 60, 61, 118, 119, 194, 195, 270, 271], bgm: 'd_04',
        boss: { sp: 260, lv: 19, bgm: 'ba_gym', say: [
          { who: 260, text: K('쇠가죽으로 막아 둔 냇물이 넘실거린다! 둑을 지키던 대짱이가 성이 나 있다!', 'The stream dammed with cowhides is brimming! Swampert, who guarded the dam, is furious!') },
          { who: 'partner', text: K('둑이 엉뚱하게 터지면 우리 군사들이 휩쓸려! 대짱이를 진정시키자!', 'If the dam bursts at the wrong time our own soldiers will be swept away! Calm Swampert!') }],
          after: [{ who: 260, text: K('…알았다. 물은 때를 맞춰 흘려보내야 하는 법이지.', '...Understood. Water must be released at the right moment.') }] } },
      gwiju: { name: K('귀주 벌판', 'Gwiju Plain'), tiles: T.plain, floors: 4, lv: [13, 17], mons: [20, 22, 77, 84, 128, 203, 234, 262], bgm: 'road_e',
        boss: { sp: 78, lv: 21, bgm: 'ba_rival', say: [
          { who: 78, text: K('히히힝! 거란 기병보다 빨리, 바람보다 빨리! 아무도 날 막을 수 없어!', 'Neigh! Faster than the Khitan riders, faster than the wind! No one can stop me!') },
          { who: 'partner', text: K('날쌩마가 벌판의 포켓몬들을 몰아붙이고 있어. 멈춰 세우자!', 'Rapidash is stampeding the plain\'s Pokémon. Let\'s bring it to a halt!') }],
          after: [{ who: 78, text: K('…헉. 바람이 바뀌었어. 이제 그만 달릴게.', '...Huff. The wind changed. I\'ll stop running now.') }] } },
      gangdong: { name: K('강동 6주 산길', 'Garrison Trail'), tiles: T.mountain, floors: 3, lv: [11, 15], mons: [74, 75, 95, 111, 207, 246, 304], bgm: 'd_05' },
    },
    npcs: [
      { id: 'officer1019', sp: 308, name: K('군관 요가램', 'Officer Medicham'), x: 22, y: 15, say: [{ text: K('강감찬 장군은 일흔이 넘으셨지만 누구보다 날카로우시오.', 'General Gang Gam-chan is past seventy, but sharper than anyone.') }] },
      { id: 'envoy1019', sp: 196, name: K('사신 에브이', 'Envoy Espeon'), x: 27, y: 12, say: [{ text: K('993년, 서희 대감은 "고려는 고구려를 이은 나라"라며 당당히 말해 싸우지 않고 땅을 얻었지.', 'In 993 Lord Seo Hui declared "Goryeo is the heir of Goguryeo" and gained land without a fight.') }] },
      { id: 'potter1019', sp: 296, name: K('도공 마크탕', 'Potter Makuhita'), x: 9, y: 16, say: [{ text: K('고려청자의 비색은 비밀이야. 송나라 사람들도 천하제일이라 했다지!', 'The jade-green of Goryeo celadon is a secret. Even the Song called it the finest under heaven!') }] },
      { id: 'cubone1019', sp: 104, name: K('탕구리', 'Cubone'), x: 14, y: 21, wander: 3, say: [{ text: K('개경 사람들은 차를 즐겨 마셔. 청자 찻잔은 하늘빛이야!', 'People in Gaegyeong love tea. Celadon teacups are the color of the sky!') }] },
      { id: 'zigzagoon1019', sp: 263, name: K('지그제구리', 'Zigzagoon'), x: 31, y: 19, wander: 2, say: [{ text: K('벽란도 항구에는 아라비아 상인까지 온대. 고려라는 이름이 멀리멀리 퍼진대!', 'Even Arab merchants come to Byeongnando port. The name "Goryeo" travels far!') }] },
    ],
    main: [
      { do: 'talk', npc: 'officer1019', log: K('군관 요가램에게 전황을 듣자', 'Hear the news from Officer Medicham'), say: [
        { who: 308, name: K('군관 요가램', 'Officer Medicham'), text: K('거란군이 압록강을 건넜소. 강감찬 장군께서 흥화진에 군사를 숨기고 계시오.', 'The Khitan crossed the Yalu. General Gang has hidden troops at Heunghwajin.') },
        { who: 308, name: K('군관 요가램', 'Officer Medicham'), text: K('냇물을 쇠가죽으로 막아 두었다가 적이 건널 때 한꺼번에 터뜨릴 계획이오. 그런데 냇물의 포켓몬들이 소란스럽소!', 'We dammed the stream with cowhides and will release it as they cross. But the stream\'s Pokémon are in an uproar!') },
        { who: 'partner', text: K('물 위의 싸움이니 물 포켓몬들과 가야 해. 동료 명부에서 물 타입을 챙기자!', 'It\'s a fight on the water, so we go with Water types. Check the roster for them!') }] },
      { do: 'dungeon', d: 'heunghwa', log: K('흥화진 냇물을 지키자 (물 타입만)', 'Guard the Heunghwajin stream (Water types only)') },
      { do: 'scene', say: [
        { who: 'narr', text: K('막아 두었던 냇물이 터지자 거란군은 크게 흔들렸다. 그래도 소배압은 개경을 향해 밀고 내려왔다.', 'When the dammed stream burst, the Khitan reeled. Still Xiao Paiya pushed south toward Gaegyeong.') },
        { who: 'narr', text: K('개경 근처에서 성과 들을 비워 두는 전술에 막힌 거란군은 지쳐 물러가기 시작했다.', 'Near Gaegyeong, met with emptied fields and walls, the worn-out Khitan began to withdraw.') }] },
      { do: 'talk', npc: 'officer1019', log: K('군관 요가램에게 돌아가자', 'Return to Officer Medicham'), say: [
        { who: 308, name: K('군관 요가램', 'Officer Medicham'), text: K('물러가는 적을 귀주에서 맞이할 것이오. 벌판의 포켓몬들이 날뛰지 않게 먼저 살펴 주시오!', 'We will meet the retreating enemy at Gwiju. Please make sure the plain\'s Pokémon aren\'t running wild first!') }] },
      { do: 'dungeon', d: 'gwiju', log: K('귀주 벌판의 날쌩마를 멈추자', 'Stop Rapidash on the Gwiju plain') },
      { do: 'talk', npc: 'officer1019', log: K('승전 소식을 전하자', 'Report the victory'), say: [
        { who: 308, name: K('군관 요가램', 'Officer Medicham'), text: K('싸움이 한창일 때 남쪽에서 비바람이 몰아쳐 거란 진영으로 불었다더군. 하늘도 우리 편이었소!', 'They say that at the height of battle a storm blew in from the south, straight into the Khitan lines. Even the sky was on our side!') }] },
    ],
    outro: [
      { who: 'narr', text: K('1019년 2월, 귀주대첩. 10만 거란군 가운데 살아 돌아간 자는 수천에 불과했다.', 'February 1019, the Battle of Gwiju. Of 100,000 Khitan, only a few thousand made it home.') },
      { who: 'narr', text: K('고려는 이후 개경에 나성을 쌓고, 북쪽 국경에는 천리장성을 쌓아 나라를 지켰다.', 'Goryeo later walled Gaegyeong and built a thousand-li wall along its northern border.') },
    ],
    side: [
      { id: 'a4a', title: K('청자 조각 모으기', 'Celadon Shards'), kind: 'collect', item: 'celadon', n: 3, d: 'gangdong', reward: { money: 380, exp: 300 },
        desc: K('피란 짐에서 떨어진 청자 조각 3개를 산길에서 찾아 주세요. 도공이 다시 붙여 본대요.', 'Find 3 celadon shards dropped on the trail. The potter wants to piece them back together.') },
      { id: 'a4b', title: K('애버라스를 찾아서', 'The Little Larvitar'), kind: 'rescue', sp: 246, floor: 3, d: 'gangdong', reward: { money: 400, items: { sitrus: 1 }, exp: 320 },
        desc: K('산길 3층에서 아기 애버라스가 바위 틈에 끼었대요.', 'A baby Larvitar is stuck between rocks on floor 3 of the trail.') },
      { id: 'a4c', title: K('그라에나 쫓기', 'Mightyena Pack'), kind: 'defeat', sp: 262, n: 3, d: 'gwiju', reward: { money: 360, exp: 260 },
        desc: K('벌판에서 피란민을 노리는 그라에나 3마리를 쫓아 주세요.', 'Drive off 3 Mightyena stalking refugees on the plain.') },
    ],
  },
  // ------------------------------------------------------------------ 1232 Goryeo vs the Mongols
  {
    year: 1232, years: '1231 – 1270', title: K('대몽 항쟁', 'Resisting the Mongols'), sub: K('강화도와 팔만대장경', 'Ganghwa Island and the Tripitaka'),
    card: { set: T.temple, mons: [146, 326, 235, 227] }, artProps: ['pavilion8'], inn: 113, shop: 52,
    town: {
      name: K('강도(강화)', 'Gangdo (Ganghwa)'), bgm: 'city11_d', bgmN: 'city11_n', biome: 'coast', landmark: 'pavilion8',
      houses: ['hanok', 'choga', 'hanok', 'choga', 'hanok', 'choga'], props: ['maple', 'logs', 'jars', 'pagoda', 'lantern', 'crates'], ships: ['boat'],
    },
    town2: {
      name: K('충주성', 'Chungju Fortress'), bgm: 'city09_d', bgmN: 'city09_n', biome: 'autumn', walls: true,
      houses: ['choga', 'choga', 'hanok', 'choga'], props: ['maple', 'logs', 'jars', 'baretree'],
      npcs: [
        { id: 'slave1232', sp: 66, name: K('노비 알통몬', 'Servant Machop'), x: 22, y: 15, say: [{ text: K('김윤후 스님은 노비 문서를 불태우고 "힘을 다해 싸우면 귀천 없이 벼슬을 주겠다" 하셨어!', 'Monk Kim Yun-hu burned the slave registers and said, "Fight with all you have, and rank will be given regardless of birth!"') }] },
        { id: 'rattata1232', sp: 19, name: K('꼬렛', 'Rattata'), x: 14, y: 19, wander: 2, say: [{ text: K('찍찍! 성안 사람들이 70일 동안이나 버텼대!', 'Squeak! The people here held out for seventy days!') }] },
      ],
    },
    world: 'road_bza',
    intro: [
      K('1231년, 초원을 휩쓴 몽골의 군대가 고려에 쳐들어왔다.', 'In 1231 the Mongol armies that swept the steppes invaded Goryeo.'),
      K('이듬해 고려는 도읍을 개경에서 바다 건너 강화도로 옮겼다. 말을 탄 몽골군은 바다에 약했기 때문이다.', 'The next year Goryeo moved its capital from Gaegyeong across the water to Ganghwa Island, because the Mongol horsemen were weak at sea.'),
      K('하지만 육지에 남은 백성들의 싸움은 길고 힘겨웠다.', 'But for the people left on the mainland, the struggle was long and hard.'),
    ],
    nodes: [
      { id: 'town', name: K('강도(강화)', 'Gangdo (Ganghwa)'), lon: 126.45, lat: 37.72 },
      { id: 'town2', name: K('충주성', 'Chungju Fortress'), lon: 127.93, lat: 36.99, town: 2 },
      { id: 'cheoin', name: K('처인성', 'Cheoin Fortress'), lon: 127.2, lat: 37.24, d: 'cheoin' },
      { id: 'hwangnyong', name: K('황룡사', 'Hwangnyongsa'), lon: 129.23, lat: 35.83, d: 'hwangnyong' },
      { id: 'jindo', name: K('진도 앞바다', 'Waters off Jindo'), lon: 126.26, lat: 34.49, d: 'jindo' },
      { mark: true, name: K('합천 해인사', 'Haeinsa'), lon: 128.1, lat: 35.8, text: K('강화도에서 만든 팔만대장경 목판은 조선 초 이곳으로 옮겨져 지금까지 남아 있다.', 'The Tripitaka woodblocks carved on Ganghwa were moved here in early Joseon and survive to this day.') },
    ],
    dungeons: {
      cheoin: { name: K('처인성', 'Cheoin Fortress'), tiles: T.fort, floors: 4, lv: [15, 19], mons: [21, 22, 41, 42, 56, 57, 207, 261, 262], bgm: 'd_01',
        boss: { sp: 142, lv: 22, bgm: 'ba_tenno', say: [
          { who: 142, text: K('끼에에엑! 하늘을 달리는 기병처럼 프테라가 성 위를 휘젓는다!', 'Skreee! Like a cavalryman of the sky, Aerodactyl tears over the walls!') },
          { who: 'partner', text: K('작은 성이지만 백성들이 끝까지 지키고 있어. 우리도 힘을 보태자!', 'It\'s a small fort, but the people are holding it to the end. Let\'s lend a hand!') }],
          after: [{ who: 142, text: K('…크르. 이 작은 성의 사람들은 겁을 모르는구나.', '...Krr. The people of this little fort know no fear.') }] } },
      hwangnyong: { name: K('황룡사', 'Hwangnyongsa'), tiles: T.temple, floors: 4, lv: [16, 20], mons: [37, 58, 77, 126, 218, 228, 322], bgm: 'd_06',
        // eased after playtest feedback: HP 5.6 → 4.48 (−20%), hits, hit cap and Fire Vortex all −20%
        boss: { sp: 146, lv: 23, lvMin: 18, lvUp: 3, hp: 4.48, atk: 1.04, cap: 0.4, relentless: true, bgm: 'ba_secret1', moves: [53, 403, 246, 17],
          tele: { name: K('불꽃 소용돌이', 'Fire Vortex'), every: 3, dmg: 0.32, pats: ['near', 'ring', 'cross', 'far'], type: 10 },
          say: [
            { who: 'narr', text: K('1238년, 몽골군이 지른 불이 황룡사 구층목탑을 집어삼켰다. 불길 한가운데서 붉은 날개가 펼쳐진다!', '1238. The fire the Mongols set engulfs the nine-story wooden pagoda of Hwangnyongsa. Crimson wings spread from the heart of the blaze!') },
            { who: 146, name: K('파이어', 'Moltres'), text: K('끼오오오!! 이 불길은 나의 것이 아니다… 그런데도 멈출 수가 없구나!', 'Kyoooh!! This fire is not mine... and yet I cannot stop it!') },
            { who: 'partner', text: K('전설의 새 파이어야! 불길에 휩쓸려 정신을 잃었어. 붉은 칸을 피하면서 깨워 주자!', 'Moltres, the legendary bird! The blaze has swept it away. Dodge the red tiles and wake it up!') }],
          after: [{ who: 146, name: K('파이어', 'Moltres'), text: K('…탑은 잿더미가 되었지만, 사람들의 마음에 남은 불씨는 꺼지지 않았구나.', '...The pagoda is ash, but the embers in people\'s hearts have not gone out.') }],
          join: K('파이어가 따스한 불꽃을 거두고 곁에 내려앉았다. 함께 가고 싶어 한다!', 'Moltres draws in its flames and settles beside you. It wants to come along!') } },
      jindo: { name: K('진도 앞바다', 'Waters off Jindo'), tiles: T.strait, floors: 3, lv: [15, 19], water: true, mons: [72, 73, 90, 98, 99, 222, 224, 279], bgm: 'naminori' },
    },
    npcs: [
      { id: 'monk1232', sp: 326, name: K('스님 피그킹', 'Monk Grumpig'), x: 22, y: 15, say: [{ text: K('부처님의 힘을 빌려 나라를 지키자는 마음으로 대장경을 새기고 있다네.', 'We carve the Tripitaka hoping the Buddha\'s power will protect the land.') }] },
      { id: 'carver1232', sp: 235, name: K('각수 루브도', 'Carver Smeargle'), x: 9, y: 16, say: [{ text: K('글자 하나 새길 때마다 절을 올렸다고 전해져요. 그래서 틀린 글자가 거의 없대요!', 'They say a bow was made for every character carved. That\'s why there are almost no mistakes!') }] },
      { id: 'kecleon1232', sp: 352, name: K('피란민 켈리몬', 'Refugee Kecleon'), x: 27, y: 12, say: [{ text: K('몽골 기병은 바다를 건너지 못한대. 그래서 임금님이 강화도로 오신 거야.', 'The Mongol riders can\'t cross the sea. That\'s why the king came to Ganghwa.') }] },
      { id: 'spinda1232', sp: 327, name: K('얼루기', 'Spinda'), x: 14, y: 21, wander: 3, say: [{ text: K('빙글빙글… 강화도 갯벌은 넓고 미끄러워!', 'Twirl twirl... Ganghwa\'s mudflats are wide and slippery!') }] },
      { id: 'skarmory1232', sp: 227, name: K('무장조', 'Skarmory'), x: 31, y: 19, wander: 2, say: [{ text: K('삼별초라는 군대는 끝까지 싸우겠다며 진도와 제주로 내려갔대.', 'An army called the Sambyeolcho swore to fight on and went south to Jindo and Jeju.') }] },
    ],
    main: [
      { do: 'talk', npc: 'monk1232', log: K('스님 피그킹과 이야기하자', 'Talk to Monk Grumpig'), say: [
        { who: 326, name: K('스님 피그킹', 'Monk Grumpig'), text: K('몽골의 장수 살리타가 남쪽으로 내려오고 있소. 용인의 작은 처인성에서 백성들과 스님들이 맞서려 하오.', 'The Mongol general Saritai is coming south. Villagers and monks mean to stand at tiny Cheoin Fortress in Yongin.') },
        { who: 326, name: K('스님 피그킹', 'Monk Grumpig'), text: K('김윤후 스님이 그곳에 계시오. 성으로 가는 길을 지켜 주시오!', 'Monk Kim Yun-hu is there. Please guard the way to the fortress!') }] },
      { do: 'dungeon', d: 'cheoin', log: K('처인성의 프테라를 진정시키자', 'Calm Aerodactyl at Cheoin Fortress') },
      { do: 'scene', say: [
        { who: 'narr', text: K('1232년 12월, 처인성 전투. 김윤후가 쏜 화살에 몽골의 장수 살리타가 쓰러졌다. 몽골군은 물러갔다.', 'December 1232, Cheoin Fortress. The Mongol general Saritai fell to an arrow shot by Kim Yun-hu. The Mongols withdrew.') }] },
      { do: 'talk', npc: 'monk1232', log: K('스님 피그킹에게 돌아가자', 'Return to Monk Grumpig'), say: [
        { who: 326, name: K('스님 피그킹', 'Monk Grumpig'), text: K('…큰일이오. 몽골군이 경주까지 내려가 황룡사에 불을 질렀다고 하오!', '...Terrible news. The Mongols have reached Gyeongju and set Hwangnyongsa on fire!') },
        { who: 326, name: K('스님 피그킹', 'Monk Grumpig'), text: K('불길 속에서 붉은 새가 울부짖는다는 소문도 있소. 서둘러 주시오!', 'There are rumors of a crimson bird screaming in the flames. Hurry!') }] },
      { do: 'dungeon', d: 'hwangnyong', log: K('불타는 황룡사의 파이어를 깨우자', 'Wake Moltres in burning Hwangnyongsa') },
      { do: 'talk', npc: 'carver1232', log: K('각수 루브도에게 가 보자', 'Visit Carver Smeargle'), say: [
        { who: 235, name: K('각수 루브도', 'Carver Smeargle'), text: K('탑은 불탔지만, 우리는 멈추지 않아요. 한 장 한 장, 팔만 장을 새길 거예요.', 'The pagoda burned, but we won\'t stop. One by one, we will carve eighty thousand blocks.') }] },
    ],
    outro: [
      { who: 'narr', text: K('1236년부터 1251년까지 강화도에서 팔만대장경이 만들어졌다. 8만 장이 넘는 목판은 오늘날 해인사에 남아 세계기록유산이 되었다.', 'From 1236 to 1251 the Tripitaka Koreana was carved on Ganghwa. Its 80,000-plus blocks survive at Haeinsa, a UNESCO Memory of the World.') },
      { who: 'narr', text: K('1253년 충주성에서는 김윤후와 백성들이 70일 동안 성을 지켰다.', 'In 1253 Kim Yun-hu and the people of Chungju held their fortress for seventy days.') },
      { who: 'narr', text: K('1270년 고려는 개경으로 돌아갔지만, 삼별초는 진도와 제주에서 1273년까지 싸움을 이어 갔다.', 'Goryeo returned to Gaegyeong in 1270, but the Sambyeolcho fought on at Jindo and Jeju until 1273.') },
    ],
    side: [
      { id: 'a5a', title: K('대장경 목판 지키기', 'Save the Woodblocks'), kind: 'collect', item: 'woodblock', n: 3, d: 'cheoin', reward: { money: 500, exp: 400 },
        desc: K('강화도로 옮기던 목판 3장을 처인성 근처에서 잃어버렸어요. 찾아 주세요!', 'Three woodblocks bound for Ganghwa were lost near Cheoin. Please find them!') },
      { id: 'a5b', title: K('진도의 아기 총어', 'Baby Remoraid'), kind: 'rescue', sp: 223, floor: 2, d: 'jindo', reward: { money: 450, items: { rice: 2 }, exp: 360 },
        desc: K('진도 앞바다 2층에 아기 총어가 그물에 걸렸대요. (물 타입만)', 'A baby Remoraid is tangled in a net on floor 2 off Jindo. (Water types only)') },
      { id: 'a5c', title: K('주뱃 떼 쫓기', 'Zubat Swarm'), kind: 'defeat', sp: 41, n: 5, d: 'cheoin', reward: { money: 420, exp: 300 },
        desc: K('성벽 틈을 차지한 주뱃 5마리를 쫓아 주세요.', 'Drive out 5 Zubat roosting in the wall cracks.') },
    ],
  },
  // ------------------------------------------------------------------ 1388 the end of Goryeo
  {
    year: 1388, years: '1380 – 1388', title: K('위화도 회군', 'The Wihwado Retreat'), sub: K('고려의 끝, 새 나라의 시작', 'The end of Goryeo'),
    card: { set: T.fortsnow, mons: [144, 359, 324, 224] }, artProps: ['gate'], inn: 113, shop: 52,
    town: {
      name: K('개경 · 고려 말', 'Gaegyeong, late Goryeo'), bgm: 'city04_d', bgmN: 'city04_n', biome: 'autumn', landmark: 'gate',
      houses: ['hanok', 'hanok', 'choga', 'hanok', 'choga', 'hanok', 'hanok', 'choga', 'choga'], props: ['maple', 'persimmon', 'jars', 'logs', 'lantern', 'pagoda'],
    },
    town2: {
      name: K('남원 운봉', 'Unbong, Namwon'), bgm: 'town01_d', bgmN: 'town01_n', biome: 'spring',
      houses: ['choga', 'choga', 'hanok', 'choga'], props: ['cherry', 'logs', 'jars', 'bamboo'],
      npcs: [
        { id: 'teddy1388', sp: 216, name: K('깜지곰', 'Teddiursa'), x: 22, y: 15, say: [{ text: K('황산에서 이성계 장군이 아지발도라는 젊은 왜구 장수의 투구를 화살로 떨어뜨렸대!', 'At Hwangsan, General Yi Seong-gye shot the helmet off a young pirate captain called Agibaldo!') }] },
        { id: 'oddish1388', sp: 43, name: K('뚜벅쵸', 'Oddish'), x: 14, y: 19, wander: 2, say: [{ text: K('왜구가 지나간 마을은 쌀 한 톨 안 남았대…', 'Villages the pirates passed through don\'t have a grain of rice left...') }] },
      ],
    },
    world: 'road_a_n',
    intro: [
      K('14세기 후반, 고려는 안팎으로 흔들렸다. 바다에서는 왜구가 쉴 새 없이 쳐들어왔다.', 'In the late fourteenth century Goryeo was shaken inside and out. Pirates raided from the sea without pause.'),
      K('최무선은 화통도감에서 화약과 화포를 만들었고, 이성계는 왜구를 물리치며 이름을 떨쳤다.', 'Choe Mu-seon made gunpowder and cannons at the Gunpowder Bureau, and Yi Seong-gye won fame fighting the pirates.'),
      K('그리고 1388년, 명나라와의 갈등 속에서 요동 정벌이 결정된다.', 'Then in 1388, amid a dispute with Ming, an expedition against Liaodong was ordered.'),
    ],
    nodes: [
      { id: 'town', name: K('개경 · 고려 말', 'Gaegyeong, late Goryeo'), lon: 126.55, lat: 37.97 },
      { id: 'town2', name: K('남원 운봉', 'Unbong, Namwon'), lon: 127.53, lat: 35.43, town: 2 },
      { id: 'jinpo', name: K('진포', 'Jinpo'), lon: 126.6, lat: 35.98, d: 'jinpo' },
      { id: 'hwangsan2', name: K('황산', 'Mount Hwangsan'), lon: 127.6, lat: 35.62, d: 'hwangsan2' },
      { id: 'wihwa', name: K('위화도', 'Wihwado'), lon: 124.45, lat: 40.12, d: 'wihwa' },
      { mark: true, name: K('화통도감', 'Gunpowder Bureau'), lon: 126.95, lat: 38.25, text: K('1377년 최무선의 건의로 세운 관청. 화약과 화포를 만들었다.', 'An office set up in 1377 at Choe Mu-seon\'s urging. It made gunpowder and cannons.') },
    ],
    dungeons: {
      jinpo: { name: K('진포', 'Jinpo'), tiles: T.sea, floors: 3, lv: [18, 22], water: true, mons: [72, 73, 98, 99, 222, 223, 279, 318, 320], bgm: 'naminori',
        boss: { sp: 224, lv: 24, bgm: 'ba_gym', say: [
          { who: 224, text: K('푸슝! 푸슝! 왜구의 배 오백 척이 진포에 밧줄로 묶여 있다! 대포무노가 먹물을 뿜으며 날뛴다!', 'Foom! Foom! Five hundred pirate ships lie roped together at Jinpo! Octillery is rampaging and spraying ink!') },
          { who: 'partner', text: K('최무선 나리의 화포가 쏠 수 있게 바닷길을 열어 주자!', 'Clear the waters so Choe Mu-seon\'s cannons can fire!') }],
          after: [{ who: 224, text: K('…푸슝. 쾅쾅거리는 소리가 무서워서 그랬어.', '...Foom. The booming scared me, that\'s all.') }] } },
      hwangsan2: { name: K('황산', 'Mount Hwangsan'), tiles: T.mountain, floors: 4, lv: [19, 23], mons: [74, 75, 95, 111, 207, 216, 217, 274, 275], bgm: 'd_05',
        boss: { sp: 275, lv: 25, bgm: 'ba_tenno', say: [
          { who: 275, text: K('후오오! 산을 어지럽히는 자들은 바람으로 날려 버리겠다!', 'Whoo! I\'ll blow away anyone who troubles my mountain!') },
          { who: 'partner', text: K('다탱구가 산길을 막고 있어! 마을 사람들이 돌아갈 길을 열자!', 'Shiftry is blocking the mountain path! Open the way home for the villagers!') }],
          after: [{ who: 275, text: K('…허허. 너희는 산을 지키러 왔구나. 길을 열어 주마.', '...Heh. You came to protect the mountain. I\'ll open the path.') }] } },
      wihwa: { name: K('위화도', 'Wihwado'), tiles: T.fortsnow, floors: 4, lv: [20, 24], mons: [86, 87, 124, 215, 220, 225, 238, 363], bgm: 'd_ice',
        tint: 'rgba(140,170,220,0.10)',
        // eased after playtest feedback: HP 4.6 → 3.68 (−20%), hits, hit cap and Blizzard all −20%
        boss: { sp: 144, lv: 26, lvMin: 21, lvUp: 3, hp: 3.68, atk: 1.04, cap: 0.4, relentless: true, bgm: 'ba_secret1', moves: [58, 246, 59, 16],
          tele: { name: K('눈보라', 'Blizzard'), every: 3, dmg: 0.32, pats: ['rows', 'cols', 'checker', 'near'], type: 15 },
          say: [
            { who: 'narr', text: K('장맛비로 불어난 압록강 한가운데, 위화도에 때아닌 얼음 바람이 몰아친다!', 'In the middle of the rain-swollen Yalu, an out-of-season icy wind howls across Wihwado!') },
            { who: 144, name: K('프리져', 'Articuno'), text: K('삐요오오… 이 물을 건너는 자, 돌아갈 길을 잃으리라.', 'Pyooo... Those who cross this water shall lose their way home.') },
            { who: 'partner', text: K('전설의 새 프리져야! 얼음 바람이 몰아치기 전에 붉은 칸 밖으로!', 'Articuno, the legendary bird! Get off the red tiles before the ice wind hits!') }],
          after: [{ who: 144, name: K('프리져', 'Articuno'), text: K('…돌아가는 것도 용기다. 너희가 돌아간 그 길 끝에서 새 시대가 열리겠지.', '...Turning back takes courage too. At the end of the road home, a new age will begin.') }],
          join: K('프리져가 차가운 날개를 거두고 곁에 내려왔다. 함께 가고 싶어 한다!', 'Articuno folds its cold wings and comes down beside you. It wants to come along!') } },
    },
    npcs: [
      { id: 'absol1388', sp: 359, name: K('장수 앱솔', 'Captain Absol'), x: 22, y: 15, say: [{ text: K('…큰 바람이 불어올 것 같다. 나라의 운명이 바뀔 바람이.', '...A great wind is coming. A wind that will change the kingdom\'s fate.') }] },
      { id: 'torkoal1388', sp: 324, name: K('화약장인 코터스', 'Gunpowder Maker Torkoal'), x: 9, y: 16, say: [{ text: K('최무선 나리가 화통도감에서 화약을 만드셨지. 이제 왜구의 배를 불태울 수 있어!', 'Master Choe made gunpowder at the bureau. Now we can burn the pirate ships!') }] },
      { id: 'scholar1388', sp: 103, name: K('유생 나시', 'Scholar Exeggutor'), x: 27, y: 12, say: [{ text: K('정몽주 선생과 정도전 선생… 두 분 다 나라를 걱정하시지만 생각이 다르시다네.', 'Master Jeong Mong-ju and Master Jeong Do-jeon... both worry for the kingdom, but they think differently.') }] },
      { id: 'wynaut1388', sp: 360, name: K('마자', 'Wynaut'), x: 14, y: 21, wander: 3, say: [{ text: K('마자! 이성계 장군은 활을 정말 잘 쏜대!', 'Wynaut! General Yi Seong-gye is a fantastic archer!') }] },
      { id: 'lombre1388', sp: 271, name: K('로토스', 'Lombre'), x: 31, y: 19, wander: 2, say: [{ text: K('여름에 군대가 강을 건넌대. 비가 많이 올 텐데 괜찮을까?', 'The army is crossing the river in summer. It\'ll rain hard. Will they be okay?') }] },
    ],
    main: [
      { do: 'talk', npc: 'torkoal1388', log: K('화약장인 코터스를 만나자', 'Meet Gunpowder Maker Torkoal'), say: [
        { who: 324, name: K('화약장인 코터스', 'Gunpowder Maker Torkoal'), text: K('왜구가 배 오백 척을 이끌고 진포에 왔다! 최무선 나리가 화포를 싣고 출정하셨지.', 'Pirates have come to Jinpo with five hundred ships! Master Choe set sail with the cannons.') },
        { who: 324, name: K('화약장인 코터스', 'Gunpowder Maker Torkoal'), text: K('그런데 바다 포켓몬들이 놀라 날뛰는 바람에 배가 가까이 갈 수 없다는구먼. 물 포켓몬과 함께 가 주게!', 'But the sea Pokémon are panicking and the ships can\'t get close. Go with your Water types!') }] },
      { do: 'dungeon', d: 'jinpo', log: K('진포의 바닷길을 열자 (물 타입만)', 'Open the waters at Jinpo (Water types only)') },
      { do: 'scene', say: [
        { who: 'narr', text: K('1380년, 진포 대첩. 고려 수군은 처음으로 화포를 써서 왜구의 배 오백 척을 불태웠다.', '1380, the Battle of Jinpo. For the first time Goryeo\'s navy used cannons, burning five hundred pirate ships.') },
        { who: 'narr', text: K('배를 잃은 왜구들은 내륙으로 흩어져 남원의 황산까지 밀려들었다.', 'With their ships gone, the pirates scattered inland as far as Mount Hwangsan in Namwon.') }] },
      { do: 'talk', npc: 'absol1388', log: K('장수 앱솔과 이야기하자', 'Talk to Captain Absol'), say: [
        { who: 359, name: K('장수 앱솔', 'Captain Absol'), text: K('이성계 장군께서 황산으로 가셨다. 산길이 어지러워 마을 사람들이 고립되었다는구나. 도와 다오.', 'General Yi has gone to Hwangsan. The mountain paths are in chaos and the villagers are cut off. Help them.') }] },
      { do: 'dungeon', d: 'hwangsan2', log: K('황산의 다탱구를 진정시키자', 'Calm Shiftry on Mount Hwangsan') },
      { do: 'talk', npc: 'absol1388', log: K('장수 앱솔에게 돌아가자', 'Return to Captain Absol'), say: [
        { who: 359, name: K('장수 앱솔', 'Captain Absol'), text: K('…1388년. 조정은 요동을 치라고 명했다. 이성계 장군은 네 가지 까닭을 들어 반대하셨지.', '...1388. The court ordered an attack on Liaodong. General Yi opposed it, giving four reasons.') },
        { who: 359, name: K('장수 앱솔', 'Captain Absol'), text: K('"작은 나라가 큰 나라를 치는 것, 여름에 군사를 일으키는 것, 왜구가 빈틈을 노릴 것, 장마철에 활이 풀리고 병이 도는 것."', '"A small country attacking a large one; raising troops in summer; the pirates seizing the chance; the rains loosening bows and spreading sickness."') },
        { who: 359, name: K('장수 앱솔', 'Captain Absol'), text: K('그래도 군대는 압록강의 위화도까지 갔다. 그곳에 얼음 새가 나타났다는구나!', 'Still the army marched to Wihwado on the Yalu. And now they say an ice bird has appeared there!') }] },
      { do: 'dungeon', d: 'wihwa', log: K('위화도의 프리져를 진정시키자', 'Calm Articuno at Wihwado') },
      { do: 'talk', npc: 'absol1388', log: K('장수 앱솔에게 소식을 전하자', 'Bring the news to Captain Absol'), say: [
        { who: 359, name: K('장수 앱솔', 'Captain Absol'), text: K('이성계 장군이 군대를 돌렸다. 나라의 바람이 바뀌었다…', 'General Yi has turned the army back. The wind of the kingdom has changed...') }] },
    ],
    outro: [
      { who: 'narr', text: K('1388년 5월, 위화도 회군. 이성계는 군대를 돌려 개경으로 돌아와 권력을 잡았다.', 'May 1388, the Wihwado retreat. Yi Seong-gye turned his army around, returned to Gaegyeong and took power.') },
      { who: 'narr', text: K('개혁을 둘러싸고 신하들이 갈라섰고, 고려를 지키려던 정몽주는 1392년 선죽교에서 목숨을 잃었다.', 'Ministers split over reform, and Jeong Mong-ju, who stood by Goryeo, was killed at Seonjuk Bridge in 1392.') },
      { who: 'narr', text: K('474년을 이어 온 고려가 저물고, 새 나라의 아침이 밝아 오고 있었다.', 'Goryeo, 474 years old, was setting, and a new kingdom\'s dawn was breaking.') },
    ],
    side: [
      { id: 'a6a', title: K('화약 주머니 나르기', 'Carry the Gunpowder'), kind: 'collect', item: 'powder', n: 3, d: 'hwangsan2', reward: { money: 600, exp: 500 },
        desc: K('산길에 흩어진 화약 주머니 3개를 모아 주세요. 젖으면 큰일이에요!', 'Gather 3 gunpowder pouches scattered on the mountain path. They mustn\'t get wet!') },
      { id: 'a6b', title: K('위화도의 아기 꾸꾸리', 'Baby Swinub'), kind: 'rescue', sp: 220, floor: 2, d: 'wihwa', reward: { money: 550, items: { sitrus: 2 }, exp: 450 },
        desc: K('위화도 2층에서 아기 꾸꾸리가 얼음에 갇혔대요.', 'A baby Swinub is trapped in ice on floor 2 of Wihwado.') },
      { id: 'a6c', title: K('샤프니아 쫓기', 'Carvanha Raid'), kind: 'defeat', sp: 318, n: 4, d: 'jinpo', reward: { money: 520, exp: 400 },
        desc: K('그물을 찢는 샤프니아 4마리를 쫓아 주세요. (물 타입만)', 'Drive off 4 Carvanha tearing the fishing nets. (Water types only)') },
    ],
  },
];
