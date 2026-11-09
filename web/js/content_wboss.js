// The world line's quest bosses. Every quest dungeon on Pokémon Black's maps ends on its third floor, where its boss waits.
// Since 1.20 they are the fifth generation's own (the user's request): every legendary, sub-legendary and mythical Pokémon
// of Pokémon Black is the boss of a quest, Reshiram, Zekrom and Kyurem once (their town battles and storm, content_wkit.js),
// the ten others twice: the Swords of Justice and the Forces of Nature in the era that held their lair up to 1.19 in their
// full two-form design (home), Victini, Meloetta and Genesect in their own quests (content_w2.js), and each of the ten
// once more in another era (one form; the Forces of Nature and, since 1.25, the Swords of Justice keep both forms again).
// Hydreigon, the fifth generation's 600-total line, is met once since 1.25, in the frozen ruins of 1945 (content_w2.js); the
// eleven other quests the 600-total lines held went to the strongest of Unova's own (the player's list), on those lines'
// tier, Darmanitan and Volcarona in two forms. Shaymin and Manaphy (the fourth generation's mythical Pokémon, Darkrai
// left to 1979) hold the eight left. Of the legends the line had up to 1.19 (each
// once): Ho-Oh, Raikou and Entei went to quests of the Korean line (content_ancient.js gwiju, content.js inwang and
// library), Mew and Phione to the lairs of the Argonne and the Yser, and the others are met in the Korean line already.
// A quest's legend in one form fights a step below the full design: its blast, the tier's fiercer second stage at half HP
// (dungeon.js spawnBoss) and its signature move at 60% and 30% of its HP. A legend joins the first time it is beaten and
// never again (once).
import { K, N, PT, boss, blast, legend, rise, WSIG, SIG_AT1, COBALION, TERRAKION, VIRIZION, KELDEO, TORNADUS, THUNDURUS, LANDORUS, MELOETTA, VICTINI, GENESECT } from './content_wkit.js';
import { S } from './game.js';

const P = (k) => [56 + Math.round(k * 1.2), 60 + Math.round(k * 1.2)]; // the designed levels of the k-th world era, as in content_w1.js

// a legend joins the first time it is beaten (dungeon.js offerRecruit), and no quest of the line offers it again
const once = (b) => Object.defineProperty(b, 'noJoin', { enumerable: true, get: () => !!S.flags['got_' + b.sp] });
function quest(o) {
  const { use, ...rest } = o;
  return once(legend({ hp: 3, atk: 0.98, cap: 0.36, buff: 1, bgm: 'vs_strong', sig: use && { use: [use], at: [0.6, 0.3] }, ...rest }));
}
// a Sword of Justice or a Force of Nature in the era of its old lair: its whole two-form design, at the lair's level
const home = (L) => once({ ...L });
// a Force of Nature met again: both its forms (the Therian Forme too) at this era's level, in this place's words
const again = (L, lv, o) => once({ ...L, lv, lvMin: lv - 8, ...o });
// the quests the 600-total lines held: an ordinary boss's numbers on those lines' tier (dungeon.js PSEUDO_TIER)
const strong = (sp, lv, moves, tele, say, after, o) => boss(sp, lv, moves, tele, say, after, { hp: 3, bgm: 'vs_strong', pseudo: true, ...o });

const SAY = {
  thunder: PT('번개가 몇 턴 동안 붉은 칸에 떨어져! 맞으면 마비될 수도 있어!', 'Lightning will fall on the red tiles for several turns! It can paralyse whoever it hits!'),
  seeds: PT('꽃씨가 몇 턴 동안 붉은 칸에서 터져! 발밑을 보자!', 'Seeds will burst on the red tiles for several turns! Watch your feet!'),
  waves: PT('파도가 몇 턴 동안 붉은 칸을 덮쳐! 배를 잘 몰자!', 'Waves will crash on the red tiles for several turns! Steer carefully!'),
  sword: PT('성스러운칼이 네 방향으로 땅을 가르며 뻗어 나가! 갈라진 줄을 피하자!', 'Its Sacred Sword splits the ground in four directions! Stay off the lines it cuts!'),
};
// Shaymin and Manaphy, met in more than one quest
const SHAYMIN = { sp: 492, moves: [465, 412, 414, 202], use: WSIG.seedFlare, join: K('쉐이미가 꽃을 피우며 다가왔다. 함께 가고 싶어 한다!', 'Shaymin comes over, flowers blooming around it. It wants to come along!') };
const MANAPHY = { sp: 490, moves: [57, 58, 94, 352], use: WSIG.surf, join: K('마나피가 뱃전으로 헤엄쳐 왔다. 함께 가고 싶어 한다!', 'Manaphy swims up to the side of the boat. It wants to come along!') };

export const WB = {
  // ---------------------------------------------------------------- 1860: the Convention of Peking
  yuanming: quest({ ...SHAYMIN, lv: P(0)[1] + 2,
    tele: blast(K('에너지볼', 'Energy Ball'), 12, ['cross', 'ring', 'x', 'near']),
    say: [
      N('잿더미가 된 정원 한가운데, 타다 남은 꽃밭 위에 쉐이미가 웅크리고 있다. 불길에서 정원의 꽃을 지키려고 온 힘으로 덩굴을 뻗고 있다.', "In the middle of the garden turned to ash, Shaymin crouches on a half-burned flowerbed. It is throwing out vines with all its strength to shield the garden's flowers from the fire."),
      { who: 492, text: K('쉐이이! (다가오는 이는 모두 불을 지른 자로 보이는 모양이다!)', 'Shayyy! (Everyone who comes near looks like a fire-raiser to it!)') }, SAY.seeds],
    after: [{ who: 492, text: K('…쉐이. (쉐이미가 덩굴을 거두자, 불길 속에 갇혀 있던 정원의 포켓몬들이 빠져나왔다.)', "...Shay. (Shaymin draws back its vines, and the garden's Pokémon trapped in the flames get out.)") }] }),
  ussuri: again(VIRIZION, P(0)[1] + 3, {
    tele: blast(K('리프블레이드', 'Leaf Blade'), 12, ['rows', 'cols', 'quad', 'far']),
    say: [
      N('자작나무 숲에 풀빛 사슴이 바람처럼 나타났다. 새로 그어진 국경선이 숲을 둘로 가르자, 숲을 지키는 비리디온이 길을 막아섰다.', 'A grass-green stag appears like the wind among the birches. With the new border cutting the forest in two, Virizion, the guardian of forests, stands in the way.'),
      { who: 640, name: K('비리디온', 'Virizion'), text: K('…사람들은 종이 위에 선을 긋고 숲을 나눈다. 이 숲의 포켓몬들은 어디로 가야 하는가!', '...People draw lines on paper and divide the forest. Where are the Pokémon of this forest to go?') }, SAY.sword],
    after: [{ who: 640, name: K('비리디온', 'Virizion'), text: K('…너희는 숲을 가르러 온 자들이 아니구나. (비리디온은 두만강 쪽 숲을 한참 바라보았다.)', '...You are not the ones who came to divide the forest. (Virizion gazes a long while at the woods toward the Tumen River.)') }] }),
  // ---------------------------------------------------------------- 1894: the Sino-Japanese War at sea
  pungdo: quest({ ...MANAPHY, lv: P(1)[1] + 2,
    tele: blast(K('하이드로펌프', 'Hydro Pump'), 11, ['rows', 'cross', 'ring', 'far']),
    say: [
      N('포탄이 떨어진 바다가 소용돌이친다. 그 한가운데서 바다의 왕자 마나피가 겁에 질려 파도를 일으키고 있다.', 'Where the shells fell, the sea swirls. In its centre Manaphy, the prince of the sea, is raising waves in terror.'),
      { who: 490, text: K('마나… 피이이! (바다를 지키려고 필사적이다!)', 'Mana... phyyy! (It is desperately trying to protect the sea!)') }, SAY.waves],
    after: [{ who: 490, text: K('…피이. (파도가 가라앉고, 마나피는 바다에 빠진 사람들 쪽으로 물길을 열어 주었다.)', '...Phyy. (The waves settle, and Manaphy opens a channel toward the people in the water.)') }] }),
  yellowsea: strong(537, P(1)[1] + 4, [56, 414, 482, 330], blast(K('탁류', 'Muddy Water'), 11, ['rows', 'cols', 'x', 'quad']),
    [N('연기에 휩싸인 군함들 사이로 거대한 두꺼비가 솟아올랐다! 포성의 진동에 깨어난 두빅굴이 온몸을 떨며 움직이는 배마다 파도를 일으키고 있다.', 'A giant toad surges up among the warships wrapped in smoke! Woken by the shaking of the guns, Seismitoad shudders all over and raises waves at every ship that moves.'),
      PT('저 진동이면 배가 뒤집혀! 배에 탄 사람들을 지키자!', 'Tremors like that will capsize the ships! Protect the people aboard!')],
    [{ who: 537, text: K('…구오오. (두빅굴이 몸의 떨림을 멈추자, 바다에 빠진 사람들을 건질 길이 열렸다.)', '...Gwooo. (Seismitoad stops shuddering, and a way opens to the people in the water.)') }]),
  // ---------------------------------------------------------------- 1904: the Russo-Japanese War
  chemulpo: strong(503, P(2)[1] + 2, [534, 56, 58, 163], blast(K('하이드로펌프', 'Hydro Pump'), 11, ['cross', 'x', 'rows', 'near']),
    [N('포위된 항구 앞바다, 가라앉는 배들 사이로 대검귀가 물살을 가르며 달려든다. 포탄 연기에 성이 나 뱃전마다 껍질 칼을 휘두르고 있다!', 'Off the besieged harbour, Samurott charges through the water between the sinking ships. Enraged by the shell smoke, it slashes at every hull with its shell blade!')],
    [{ who: 503, text: K('…크르릉. (대검귀가 칼을 거두고 물러나자, 바다에 빠진 수병들을 건져 올릴 수 있게 되었다.)', '...Krrrng. (Samurott sheathes its blade and backs off, and the sailors in the water can be pulled out.)') }]),
  hill203: home(TERRAKION),
  tsushima: again(THUNDURUS, P(2)[1] + 5, {
    say: [
      N('대한 해협 한가운데, 먹구름을 탄 포켓몬이 꼬리로 번개를 내리친다. 함대의 신호기보다 높이 번개가 번쩍인다. 볼트로스다!', "In the middle of the Korea Strait, a Pokémon riding a black cloud strikes lightning with its tail. Lightning flashes higher than the fleets' signal flags. It is Thundurus!"),
      { who: 642, name: K('볼트로스', 'Thundurus'), text: K('…쇠로 된 배들이 이 바다를 시끄럽게 하는구나. 포성보다 큰 번개를 들려주마!', '...Ships of iron make this sea so noisy. I will let you hear thunder louder than any gun!') }, SAY.thunder],
    after: [{ who: 642, name: K('볼트로스', 'Thundurus'), text: K('…흥. 너희는 배를 가라앉히러 온 게 아니라 사람을 건지러 왔구나. (먹구름이 걷히자, 바다에 빠진 수병들을 건질 길이 열렸다.)', '...Hmph. You came to pull people out, not to sink ships. (The clouds lift, and a way opens to the sailors in the water.)') }] }),
  // ---------------------------------------------------------------- 1914: Sarajevo
  latin: strong(545, P(3)[1] + 2, [224, 398, 89, 404], blast(K('오물폭탄', 'Sludge Bomb'), 3, ['ring', 'near', 'x', 'target']),
    [N('골목 그늘 깊은 곳에서 붉은 마디가 스르륵 움직였다. 사람들의 의심과 미움에 이끌린 펜드라가 골목을 차지하고 있다!', "Deep in the shade of the alley, red segments slide past. Drawn by people's suspicion and hatred, Scolipede has taken over the lane!"),
      PT('펜드라는 움직이는 건 뭐든 덮쳐! 골목 사람들이 다치기 전에 멈추자!', 'Scolipede falls on anything that moves! Stop it before the people in the lane get hurt!')],
    [{ who: 545, text: K('…키릭. (펜드라가 긴 몸을 말아 물러나자, 골목에 숨어 있던 사람들이 하나둘 밖으로 나왔다.)', '...Kirik. (Scolipede coils its long body and withdraws, and the people hiding in the lane come out one by one.)') }]),
  balkan: quest({ ...SHAYMIN, lv: P(3)[1] + 3,
    tele: blast(K('에너지볼', 'Energy Ball'), 12, ['cross', 'far', 'rows', 'x']),
    say: [
      N('동원령으로 가득 찬 산길이 갑자기 꽃과 덩굴로 뒤덮였다. 군화에 짓밟히는 꽃밭을 지키려고 쉐이미가 길을 막아섰다!', 'The pass crowded by the mobilisation is suddenly smothered in flowers and vines. Shaymin has blocked the road to save the meadows from the marching boots!'),
      { who: 492, text: K('쉐이이이! (꽃밭을 밟고 지나가는 이는 아무도 용서하지 않겠다는 듯하다!)', 'Shayyyy! (It seems set on forgiving no one who tramples the meadow!)') }, SAY.seeds],
    after: [{ who: 492, text: K('…쉐이. (쉐이미가 덩굴을 거두자, 꽃밭 옆으로 좁은 길이 열렸다. 피난민들이 그 길로 산을 넘었다.)', '...Shay. (Shaymin draws back its vines, and a narrow path opens beside the meadow. Refugees cross the mountains by it.)') }] }),
  // ---------------------------------------------------------------- 1914: the Marne
  marne: quest({ sp: 647, lv: P(4)[1] + 2, moves: [548, 56, 453, 370], use: WSIG.secretSword,
    tele: blast(K('하이드로펌프', 'Hydro Pump'), 11, ['rows', 'cross', 'quad', 'near']),
    say: [
      N('무너지는 강둑 위로 작은 망아지 같은 포켓몬이 물살을 가르며 달린다. 세 영웅에게 배우며 자란다는 케르디오가 다리를 건너려는 이들을 막아섰다.', 'A Pokémon like a small colt races along the crumbling riverbank, cutting through the current. Keldeo, who grows up learning from the three heroes, blocks those trying to cross the bridge.'),
      { who: 647, name: K('케르디오', 'Keldeo'), text: K('…이 다리를 건너면 또 싸우러 가는 거잖아! 강의 포켓몬들이 다치는 건 이제 싫어!', "...Crossing this bridge just means going off to fight again! I don't want the river's Pokémon hurt anymore!") },
      PT('신비의 칼이 줄을 따라 와! 갈라지는 줄을 피하자!', 'The Secret Sword comes along lines! Stay off the lines it cuts!')],
    after: [{ who: 647, name: K('케르디오', 'Keldeo'), text: K('…알았어. 너희는 강을 건너는 사람들을 지키려는 거구나. (케르디오가 물살을 잠재우자, 무너지던 다리가 멈추었다.)', '...I see. You want to protect the people crossing the river. (Keldeo calms the current, and the crumbling bridge stops falling.)') }],
    join: K('케르디오가 각오를 다진 얼굴로 다가왔다. 함께 가고 싶어 한다!', 'Keldeo comes over with a resolute face. It wants to come along!') }),
  noman: quest({ ...SHAYMIN, lv: P(4)[1] + 3, moves: [465, 412, 402, 202],
    tele: blast(K('에너지볼', 'Energy Ball'), 12, ['ring', 'far', 'checker', 'x']),
    say: [
      N('철조망과 포탄 구덩이뿐인 무인 지대에 갑자기 붉은 꽃이 피어났다. 꽃밭 한가운데서 쉐이미가 양쪽 참호를 향해 꽃씨를 쏘아 대고 있다.', "Red flowers suddenly bloom in no man's land, a place of wire and shell holes. In the middle of the flowers, Shaymin is shooting seeds at the trenches on both sides."),
      { who: 492, text: K('쉐이이! (이 꽃밭에 들어오는 이는 누구든 쫓아내겠다는 듯하다!)', 'Shayyy! (It seems set on driving out anyone who comes into its flowers!)') }, SAY.seeds],
    after: [{ who: 492, text: K('…쉐이. (쉐이미가 잠잠해지자, 양쪽 참호에서 병사들이 꽃밭으로 걸어 나와 서로에게 손을 내밀었다.)', '...Shay. (Shaymin quiets down, and soldiers from both trenches walk out into the flowers and hold out their hands to one another.)') }] }),
  // ---------------------------------------------------------------- 1915: Gallipoli
  dardanelles: quest({ ...MANAPHY, lv: P(5)[1] + 2,
    tele: blast(K('하이드로펌프', 'Hydro Pump'), 11, ['rows', 'cols', 'near', 'x']),
    say: [
      N('기뢰가 깔린 해협 한가운데서 바다가 소용돌이친다. 바다의 왕자 마나피가 기뢰에 놀란 물속 포켓몬들을 지키려고 파도를 일으키고 있다.', 'In the middle of the mined straits the sea swirls. Manaphy, the prince of the sea, is raising waves to shield the water Pokémon frightened by the mines.'),
      { who: 490, text: K('마나… 피이이! (배가 다가올 때마다 파도를 크게 일으킨다!)', 'Mana... phyyy! (It raises a great wave each time a ship comes near!)') }, SAY.waves],
    after: [{ who: 490, text: K('…피이. (마나피가 기뢰 사이로 물길을 열어 주었다. 바다에 빠진 이들을 건질 수 있다.)', '...Phyy. (Manaphy opens a channel between the mines. Those in the water can be pulled out.)') }] }),
  anzac: strong(526, P(5)[1] + 4, [444, 89, 442, 157], blast(K('스톤에지', 'Stone Edge'), 5, ['cols', 'quad', 'cross', 'far']),
    [N('해안 절벽 위에 바위산 같은 기가이어스가 버티고 섰다. 총성이 멈추지 않는 절벽에서 몸의 수정을 번쩍이며 움직이는 것마다 바위를 쏘아 댄다. 부상병들이 내려갈 수가 없다!', 'Gigalith stands on the coastal cliffs like a hill of rock. On cliffs where the gunfire never stops, its crystals flash and it shoots rocks at anything that moves. The wounded cannot get down!')],
    [{ who: 526, text: K('…쿠구궁. (기가이어스가 절벽 꼭대기로 물러나 앉자, 부상병들이 천천히 해변으로 내려갔다.)', '...Kuguung. (Gigalith settles back on the clifftop, and the wounded slowly make their way down to the beach.)') }]),
  // ---------------------------------------------------------------- 1916: Verdun and the Somme
  douaumont: home(COBALION),
  somme: quest({ sp: 649, lv: P(6)[1] + 4, moves: [546, 400, 430, 85], use: WSIG.techno,
    tele: blast(K('러스터캐논', 'Flash Cannon'), 8, ['rows', 'far', 'x', 'checker']),
    say: [
      N('진흙투성이 참호를 넘어, 등에 대포를 단 보라색 포켓몬이 다가온다. 사람들이 처음 본 "탱크"처럼 철조망을 밀어붙이는 게노세크트다!', 'Over the muddy trenches comes a purple Pokémon with a cannon on its back. It is Genesect, pushing through the wire like the first "tanks" people ever saw!'),
      { who: 649, name: K('게노세크트', 'Genesect'), text: K('…목표 확인. 참호를 모두 밀어 버린다.', '...Targets confirmed. Flatten every trench.') },
      PT('저 대포는 빛줄기로 한 바퀴를 돌아! 줄기가 지나가는 칸을 피하자!', 'That cannon turns its beam a full circle! Keep off the tiles it sweeps!')],
    after: [{ who: 649, name: K('게노세크트', 'Genesect'), text: K('…명령이 끊겼다. (게노세크트는 대포를 내리고 진흙 속에 가만히 멈춰 섰다.)', '...The orders are cut off. (Genesect lowers its cannon and stands still in the mud.)') }],
    join: K('게노세크트가 대포를 내렸다. 자기 길을 찾을 때까지 함께 가고 싶어 한다!', 'Genesect lowers its cannon. It wants to come along until it finds its own way!') }),
  // ---------------------------------------------------------------- 1916: Jutland
  northsea: home(TORNADUS),
  jutland: strong(609, P(7)[1] + 4, [247, 53, 412, 517], blast(K('섀도볼', 'Shadow Ball'), 7, ['cross', 'x', 'rows', 'quad']),
    [N('두 함대가 맞붙은 바다 위, 가라앉는 배마다 푸른 불빛이 떠돈다. 샹델라가 침몰선 위를 떠다니며 사라져 가는 혼을 불꽃으로 빨아들이고 있다!', 'On the sea where the two fleets clash, a blue light drifts over every sinking ship. Chandelure floats above the wrecks, drawing the fading souls into its flames!')],
    [{ who: 609, text: K('…스르르. (샹델라의 불꽃이 잦아들자, 바다에 빠진 이들이 구명보트에 오를 수 있었다.)', '...Shhh. (The flames of Chandelure die down, and those in the water can climb into the lifeboats.)') }]),
  // ---------------------------------------------------------------- 1918: the Armistice
  forest18: home(VIRIZION),
  lastday: quest({ sp: 494, lv: P(8)[1] + 4, moves: [557, 545, 94, 7], use: WSIG.searing,
    tele: blast(K('화염탄', 'Searing Shot'), 10, ['cross', 'x', 'target', 'ring']),
    say: [
      N('휴전이 서명된 뒤에도, 11시까지 전선의 싸움은 멈추지 않았다. 참호 위로 작은 포켓몬이 불꽃을 튀기며 뛰어다닌다. 이긴 쪽에 승리를 가져다준다는 비크티니다.', 'Even after the armistice was signed, the fighting went on until 11. A small Pokémon throwing off sparks is bounding over the trenches. It is Victini, said to bring victory to whichever side it favours.'),
      { who: 494, name: K('비크티니', 'Victini'), text: K('티니! (마지막 날에도 승리를 다투는 사람들을 향해 불꽃을 튀긴다!)', 'Tini! (It throws sparks at the people still fighting over victory on the last day!)') },
      PT('작아도 엄청 강해! 불덩이가 몇 턴 동안 쏟아질 거야!', 'Small but incredibly strong! Fireballs will rain down for several turns!')],
    after: [{ who: 494, name: K('비크티니', 'Victini'), text: K('티니…! (오전 11시를 알리는 종소리가 울리자, 비크티니는 두 손을 V자로 들어 올렸다. 이번 승리는 누구의 것도 아니라는 듯이.)', 'Tini...! (As the bells ring eleven, Victini raises both hands in a V, as if this victory belonged to no one.)') }],
    join: K('비크티니가 어깨 위로 뛰어올랐다. 함께 가고 싶어 한다!', 'Victini hops onto your shoulder. It wants to come along!') }),
  // ---------------------------------------------------------------- 1919: the Paris Peace Conference
  mirrors: quest({ sp: 648, lv: P(9)[1] + 3, moves: [547, 94, 304, 215], use: WSIG.relic,
    tele: blast(K('하이퍼보이스', 'Hyper Voice'), 0, ['quad', 'x', 'ring', 'checker']),
    say: [
      N('수백 개의 거울이 서로를 비추는 방. 거울마다 맑은 노랫소리가 울린다. 노래하는 포켓몬 메로엣타가 거울 속에 갇힌 목소리들을 노래로 붙잡고 있다.', 'A room of hundreds of mirrors reflecting one another. A clear song rings from every mirror. Meloetta, the singing Pokémon, is holding the voices trapped in them with its song.'),
      { who: 648, name: K('메로엣타', 'Meloetta'), text: K('♪…이 방에서는 아무도 다른 이의 노래를 듣지 않아요. 그러니 목소리들은 여기 남아 있어요.', "♪...In this room nobody listens to anyone else's song. So the voices stay here.") },
      PT('노랫소리에 걸리면 잠들어 버려! 발밑의 붉은 칸을 피하자!', "Get caught by the song and you'll fall asleep! Keep off the red tiles!")],
    after: [{ who: 648, name: K('메로엣타', 'Meloetta'), text: K('♪…들렸어요. 먼 나라에서 온 만세 소리가. (노래가 멎자, 갇혀 있던 목소리들이 하나둘 방을 빠져나갔다.)', '♪...I heard it. The cries of "Manse" from a faraway land. (The song stops, and the trapped voices slip out of the hall one by one.)') }],
    join: K('메로엣타가 마지막 음을 길게 끌며 다가왔다. 함께 노래하고 싶어 한다!', 'Meloetta holds its last note long as it comes over. It wants to sing with you!') }),
  seine: quest({ ...SHAYMIN, lv: P(9)[1] + 4,
    tele: blast(K('에너지볼', 'Energy Ball'), 12, ['ring', 'near', 'far', 'target']),
    say: [
      N('다리 밑 그늘에 버려진 서류 더미가 꽃으로 뒤덮였다. 쉐이미가 젖은 종이 위에 꽃을 피우며, 다가오는 이마다 꽃씨를 쏘아 댄다.', 'The pile of discarded papers in the shade under the bridge is covered in flowers. Shaymin is making flowers bloom on the wet paper, shooting seeds at anyone who comes near.'),
      { who: 492, text: K('쉐이이! (이 꽃밭은 제 둥지라는 듯 서류 더미를 꼭 끌어안는다!)', 'Shayyy! (It hugs the pile of papers tight, as if the flowers were its nest!)') }, SAY.seeds],
    after: [{ who: 492, text: K('…쉐이. (쉐이미가 꽃을 거두자, 그 아래에서 한국의 청원서 사본이 나왔다. 꽃 덕분에 젖지 않았다.)', '...Shay. (Shaymin draws its flowers back, and a copy of the Korean petition lies beneath them, kept dry by the flowers.)') }] }),
  // ---------------------------------------------------------------- 1939: Westerplatte
  westerplatte: strong(500, P(10)[1] + 3, [394, 359, 457, 53], blast(K('플레어드라이브', 'Flare Blitz'), 10, ['cross', 'cols', 'near', 'x']),
    [N('포탄에 무너진 막사 위로 불꽃 수염을 두른 염무왕이 뛰어올랐다. 포격에 놀라 미쳐 날뛰며, 무너진 막사를 다시 들이받고 있다!', 'Emboar, its beard of flame blazing, leaps onto the barracks shattered by shells. Maddened by the shelling, it keeps ramming the wrecked buildings!')],
    [{ who: 500, text: K('…부루루. (염무왕이 불꽃 수염을 거두고 물러나자, 막사 밑에 갇힌 병사들이 기어 나왔다.)', '...Buruuu. (Emboar draws in its beard of flame and withdraws, and soldiers trapped under the barracks crawl out.)') }]),
  postoffice: again(COBALION, P(10)[1] + 4, {
    tele: blast(K('아이언헤드', 'Iron Head'), 8, ['ring', 'far', 'x', 'checker']),
    say: [
      N('끊어진 전신선 사이로 강철빛 사슴이 걸어 나왔다. 사람의 전쟁에서 포켓몬을 지켜 왔다는 코바르온이 우체국 앞을 막아섰다.', 'Out from among the severed telegraph wires walks a steel-coloured stag. Cobalion, said to have protected Pokémon from the wars of people, bars the way to the post office.'),
      { who: 638, name: K('코바르온', 'Cobalion'), text: K('…스무 해 만에 또 전쟁인가. 이 건물 안에도 포켓몬들이 갇혀 있다. 함부로 들어가게 둘 수는 없다!', '...War again, after twenty years? There are Pokémon trapped in this building too. I will not let anyone barge in!') }, SAY.sword],
    after: [{ who: 638, name: K('코바르온', 'Cobalion'), text: K('…너희는 사람과 포켓몬을 가리지 않고 구하러 왔구나. (코바르온이 길을 비키자, 지하실의 직원들과 포켓몬들이 함께 밖으로 나왔다.)', '...You came to save people and Pokémon alike. (Cobalion steps aside, and the clerks and Pokémon in the cellar come out together.)') }] }),
  // ---------------------------------------------------------------- 1940: Dunkirk
  mole: strong(539, P(11)[1] + 2, [370, 444, 280, 89], blast(K('인파이트', 'Close Combat'), 1, ['rows', 'near', 'cross', 'x']),
    [N('부서진 방파제 한가운데 푸른 도복의 타격귀가 버티고 섰다. 폭격 소리에 놀라 달려드는 것마다 주먹을 날린다. 배에 오르려는 사람들의 길이 막혔다!', 'In the middle of the broken mole stands Sawk in its blue gi. Startled by the bombing, it throws a punch at everything that rushes past. The way to the boats is blocked!')],
    [{ who: 539, text: K('…핫! (타격귀가 주먹을 내리고 방파제 끝으로 물러나자, 사람들이 줄지어 배에 올랐다.)', '...Hah! (Sawk lowers its fists and steps back to the end of the mole, and people board the boats in line.)') }]),
  channel: home(KELDEO),
  // ---------------------------------------------------------------- 1940: the Blitz
  airfield: again(TORNADUS, P(12)[1] + 3, {
    say: [
      N('폭격으로 패인 활주로 위로 돌풍이 휘몰아친다. 구름을 탄 포켓몬이 하늘을 메운 비행기들을 향해 웃고 있다. 토네로스다!', 'Gusts whirl over the bomb-cratered runway. A Pokémon riding a cloud laughs at the planes filling the sky. It is Tornadus!'),
      { who: 641, name: K('토네로스', 'Tornadus'), text: K('…쇠로 된 새들이 하늘을 어지럽히는구나. 모두 바람으로 날려 버리겠다!', '...Iron birds cluttering up the sky. I will blow them all away!') },
      PT('돌풍이 몇 턴 동안 붉은 칸을 휩쓸어! 계속 움직이자!', 'Gusts will sweep the red tiles for several turns! Keep moving!')],
    after: [{ who: 641, name: K('토네로스', 'Tornadus'), text: K('…이 섬을 지키려고 날아오르는 자들이었나. 좋다, 바람을 거두마.', '...So these were the ones taking off to defend this island. Very well, I will calm the wind.') }] }),
  // ---------------------------------------------------------------- 1941: Moscow
  mud: home(LANDORUS),
  // Darmanitan rises again in its Zen Mode (Pokémon Black's own icon): Fire and Psychic, with Psychic moves and the Mode's stats
  snowfield: strong(555, P(13)[1] + 4, [394, 359, 276, 7], blast(K('플레어드라이브', 'Flare Blitz'), 10, ['rows', 'cols', 'quad', 'far']),
    [N('영하 40도의 눈보라 속에서 불덩이 같은 포켓몬이 울부짖는다. 추위에 이성을 잃은 불비달마가 설원을 지나는 모든 것을 덮치고 있다!', 'In a blizzard at forty below, a Pokémon like a ball of fire roars. Out of its mind with the cold, Darmanitan is falling on everything that crosses the snowfield!'),
      PT('쓰러뜨려도 돌처럼 앉아 명상하는 달마폼으로 일어설 거야! 그때부터는 에스퍼 기술이 날아와!', 'Even beaten, it will rise again in its Zen Mode, seated like a stone in meditation! From then on its moves turn Psychic!')],
    [{ who: 555, text: K('…다루마아. (불비달마가 눈 위에 주저앉자 눈보라가 잦아들고, 설원 너머로 모스크바의 지붕들이 보였다.)', '...Daruuma. (Darmanitan sinks down on the snow, the blizzard eases, and the roofs of Moscow appear beyond the snowfield.)') }],
    { sig: { use: [WSIG.eruption], at: SIG_AT1 }, joinMoves: [394, 359, 276, 428],
      revive: { ...rise({ aura: '#b48cff', name: K('사이코키네시스', 'Psychic'), type: 14, pats: ['star', 'checker', 'ring|x', 'far'], use: [WSIG.zenPulse, WSIG.zenFire],
        msg: K('불비달마가 돌처럼 굳어 앉더니 눈을 번쩍 떴다! 달마폼이다! 에스퍼의 힘이 설원을 뒤덮는다!', 'Darmanitan hardens like stone where it sits, then its eyes snap open! Zen Mode! Psychic power covers the snowfield!') }),
      forme: 'z', types: [10, 14], moves: [94, 326, 53, 473] } }),
  // ---------------------------------------------------------------- 1941-42: Pearl Harbor and Midway
  pearl: quest({ ...MANAPHY, lv: P(14)[1] + 3,
    tele: blast(K('파도타기', 'Surf'), 11, ['rows', 'cols', 'x', 'ring']),
    say: [
      N('기름이 불타는 항구 한가운데서 바다가 소용돌이친다. 불길에 겁에 질린 마나피가 바다를 지키려고 큰 파도를 일으키고 있다. 물에 빠진 수병들이 휩쓸린다!', 'In the middle of the harbour of burning oil the sea swirls. Terrified by the flames, Manaphy is raising great waves to protect its sea. The sailors in the water are being swept away!'),
      { who: 490, text: K('마나… 피이이! (불타는 바다를 향해 필사적으로 파도를 일으킨다!)', 'Mana... phyyy! (It desperately raises waves against the burning sea!)') }, SAY.waves],
    after: [{ who: 490, text: K('…피이. (마나피가 파도로 불길을 덮어 끄자, 구조선들이 다가갈 수 있게 되었다.)', '...Phyy. (Manaphy smothers the flames with its waves, and the rescue boats can draw near.)') }] }),
  midway: strong(637, P(14)[1] + 5, [552, 405, 542, 257], blast(K('불꽃춤', 'Fiery Dance'), 10, ['near', 'x', 'cross', 'target']),
    [N('불타는 항공모함들 위로 여섯 장의 불꽃 날개가 내려왔다. 치솟는 불길에 이끌린 불카모스가 타오르는 갑판 위를 춤추듯 맴돈다. 바다 위가 한낮처럼 환하다!', 'Six wings of flame come down over the burning carriers. Drawn by the leaping fire, Volcarona circles the blazing decks as if dancing. The sea is as bright as noon!'),
      PT('날개의 불꽃 가루에 닿으면 타 버려! 쓰러뜨려도 한 번 더 일어설 거야!', 'Touch the burning dust from its wings and you burn! Even beaten, it will rise once more!')],
    [{ who: 637, text: K('…파르르. (불카모스가 날개를 접어 갑판 위에 내려앉자, 바다에 빠진 이들을 건질 수 있었다.)', '...Prrr. (Volcarona folds its wings and settles on a deck, and those in the water can be pulled out.)') }],
    { sig: { use: [WSIG.heatWave], at: SIG_AT1 },
      revive: rise({ aura: '#ffb347', form: K('태양의 춤', 'Dance of the Sun'), name: K('열풍', 'Heat Wave'), type: 10, pats: ['far', 'star', 'checker', 'quad|ring'], use: [WSIG.heatWave, WSIG.hurricane],
        msg: K('불카모스가 날개를 활짝 펼쳤다! 불꽃 가루가 태양처럼 타오르며 춤이 빨라진다!', 'Volcarona spreads its wings wide! Its burning dust blazes like the sun, and its dance quickens!') }) }),
  // ---------------------------------------------------------------- 1942: the Siege of Leningrad
  ladoga: strong(612, P(15)[1] + 3, [337, 200, 89, 416], blast(K('드래곤크루', 'Dragon Claw'), 16, ['rows', 'cols', 'x', 'checker']),
    [N('얼음길 한가운데에 액스라이즈가 버티고 섰다. 도끼 같은 어금니로 얼음을 내리칠 때마다 금이 가고, 식량을 실은 트럭이 호수에 빠지려 한다!', 'Haxorus has planted itself in the middle of the ice road. Each time its axe-like tusks strike the ice it cracks, and a truck full of food is about to go into the lake!')],
    [{ who: 612, text: K('…그르릉. (액스라이즈가 얼음길 밖으로 물러나자, 트럭들이 다시 도시를 향해 달렸다.)', '...Grrrng. (Haxorus moves off the ice road, and the trucks race for the city again.)') }]),
  // ---------------------------------------------------------------- 1942: El Alamein
  minefield: again(LANDORUS, P(16)[1] + 3, {
    say: [
      N('지뢰밭 한가운데서 땅이 울리고, 구름을 탄 포켓몬이 사막에 내려앉았다. 땅의 수호자 랜드로스가 지뢰로 가득 찬 땅에 분노하고 있다!', 'In the middle of the minefield the ground rumbles, and a Pokémon riding a cloud settles on the desert. Landorus, the guardian of the land, is furious at ground filled with mines!'),
      { who: 645, name: K('랜드로스', 'Landorus'), text: K('…땅속에 죽음을 묻다니! 이 사막을 통째로 뒤집어 주마!', '...Burying death in the ground! I will turn this whole desert over!') },
      PT('땅이 몇 턴 동안 붉은 칸에서 솟구쳐! 계속 살피자!', 'The ground will burst up on the red tiles for several turns! Keep watching!')],
    after: [{ who: 645, name: K('랜드로스', 'Landorus'), text: K('…좋다. 너희는 땅에 묻힌 것을 거두러 왔구나. (랜드로스가 땅을 잠재우자, 공병들이 지뢰를 걷어 냈다.)', '...Very well. You came to clear what was buried. (Landorus calms the ground, and the sappers lift the mines.)') }] }),
  // ---------------------------------------------------------------- 1943: Stalingrad
  tractor: again(TERRAKION, P(17)[1] + 4, {
    tele: blast(K('스톤샤워', 'Rock Slide'), 5, ['x', 'cross', 'near', 'quad']),
    say: [
      N('무너진 공장 한가운데서 바위 같은 몸의 포켓몬이 벽을 들이받고 있다. 성벽을 부수고 갇힌 포켓몬을 구했다는 테라키온이다!', 'In the middle of the ruined factory, a Pokémon with a body like a boulder is ramming the walls. It is Terrakion, said to have broken a castle wall to free the Pokémon trapped inside!'),
      { who: 639, name: K('테라키온', 'Terrakion'), text: K('…무너진 벽마다 갇힌 포켓몬들의 울음이 들린다. 길을 막는다면 함께 부수고 지나가겠다!', '...Behind every fallen wall I hear the cries of trapped Pokémon. If you stand in the way, I will smash through you too!') }, SAY.sword],
    after: [{ who: 639, name: K('테라키온', 'Terrakion'), text: K('…너희도 갇힌 자들을 꺼내러 왔구나. (테라키온이 무너진 벽을 밀어내자, 지하에 숨은 노동자들이 빠져나왔다.)', '...You came to pull out the trapped as well. (Terrakion shoves the fallen wall aside, and the workers hidden underground get out.)') }] }),
  // ---------------------------------------------------------------- 1944: Normandy
  omaha: strong(503, P(18)[1] + 4, [534, 401, 224, 58], blast(K('셸블레이드', 'Razor Shell'), 11, ['rows', 'x', 'checker', 'far']),
    [N('절벽 아래 해변, 포연을 뚫고 대검귀가 파도 위로 뛰어올랐다. 껍질 칼이 번뜩일 때마다 상륙하는 이들의 길이 막힌다!', 'On the beach below the bluffs, Samurott leaps up out of the surf through the gun smoke. Each flash of its shell blade cuts off those coming ashore!')],
    [{ who: 503, text: K('…크르릉. (대검귀가 칼을 거두고 바다로 물러나자, 사람들이 해변을 건너 절벽을 올랐다.)', '...Krrrng. (Samurott sheathes its blade and goes back to the sea, and people cross the beach and climb.)') }]),
  // ---------------------------------------------------------------- 1944: Leyte Gulf
  surigao: home(THUNDURUS),
  samar: quest({ ...MANAPHY, lv: P(19)[1] + 4,
    tele: blast(K('하이드로펌프', 'Hydro Pump'), 11, ['rows', 'cols', 'x', 'quad']),
    say: [
      N('사마르 앞바다, 포성 사이로 바다가 크게 소용돌이친다. 작은 호위함들 사이에서 마나피가 겁에 질려 파도를 일으키고 있다!', 'Off Samar the sea swirls wildly between the gunshots. Among the little escort ships, a frightened Manaphy is raising waves!'),
      { who: 490, text: K('마나… 피이이! (바다의 포켓몬들을 지키려고 필사적이다!)', "Mana... phyyy! (It is desperately trying to protect the sea's Pokémon!)") }, SAY.waves],
    after: [{ who: 490, text: K('…피이. (마나피가 파도를 잠재우자, 바다 위에 고요가 찾아왔다. 가라앉는 배에서 사람들이 빠져나왔다.)', '...Phyy. (Manaphy calms the waves, and quiet falls over the sea. People get out of the sinking ships.)') }] }),

  // ---------------------------------------------------------------- the mythical Pokémon's own quests (content_w2.js)
  // met in an earlier quest too since 1.20: their own quest has them in full, without a second offer to join
  philharmonia: home(MELOETTA),
  vruins: home(VICTINI),
  prokhorovka: home(GENESECT),
  // ---------------------------------------------------------------- the lairs left: Mew and Phione (1.20)
  argonne: quest({ sp: 151, lv: P(8)[1] + 3, moves: [94, 247, 396, 58], use: WSIG.auraSphere,
    tele: blast(K('사이코키네시스', 'Psychic'), 14, ['quad', 'x', 'ring', 'checker']),
    say: [
      N('포탄이 닿지 않은 숲 가장 깊은 곳, 이끼 낀 나무 사이로 분홍빛 포켓몬이 장난스럽게 떠다닌다. 모든 포켓몬의 조상이라는 뮤다!', 'In the deepest part of the forest, where no shell has reached, a pink Pokémon floats playfully among the mossy trees. It is Mew, said to be the ancestor of all Pokémon!'),
      { who: 151, text: K('뮤우! (숨바꼭질을 하자는 듯 나무 뒤로 숨었다가 튀어나온다!)', 'Mewww! (It hides behind a tree and pops out again, as if asking for a game of hide-and-seek!)') },
      PT('파동이 여덟 방향으로 뻗어! 줄 밖으로 피하자!', 'Waves shoot out in eight directions! Step off their lines!')],
    after: [{ who: 151, text: K('…뮤. (뮤는 전쟁이 닿지 않은 이 숲을 지키고 싶다는 듯, 꺾인 나무 위를 한 바퀴 돌았다.)', '...Mew. (Mew circles once over a broken tree, as if it wants to keep this forest the war has not reached.)') }],
    join: K('뮤가 어깨 위를 맴돈다. 함께 가고 싶어 한다!', 'Mew circles your shoulder. It wants to come along!') }),
  yser: quest({ sp: 489, lv: P(11)[1] + 2, moves: [352, 57, 58, 61], use: WSIG.waterSpouts,
    tele: blast(K('파도타기', 'Surf'), 11, ['cross', 'x', 'rows', 'near']),
    say: [
      N('물길 위로 피오네 한 마리가 떠돌고 있다. 포성에 놀라 제 물길을 잃고 화가 난 모양이다.', 'A lone Phione drifts over the waterways. Startled by the guns, it seems angry at losing its way.'),
      { who: 489, text: K('피오! 피오오! (머리 위 물풍선을 크게 부풀렸다!)', 'Phio! Phioo! (It blows up the water balloon on its head!)') },
      PT('물기둥이 몇 턴 동안 붉은 칸에서 솟아! 발밑을 보자!', 'Water spouts will rise on the red tiles for several turns! Watch your feet!')],
    after: [{ who: 489, text: K('…피오. (피오네가 물풍선을 거두자, 물길 위에 잔잔한 물결만 남았다.)', '...Phio. (Phione lets its water balloon go, and only gentle ripples are left on the waterway.)') }],
    join: K('피오네가 물결을 타고 다가왔다. 함께 가고 싶어 한다!', 'Phione rides the swell over to you. It wants to come along!') }),
};
