// The world line's quest bosses (1.19). Every quest dungeon on Pokémon Black's maps ends on its third floor, and what waits
// there is a legendary Pokémon, each only once in the line; where the legends run out, one of the 600-total lines (two
// quests each). Left out of the list on purpose: Celebi (the guide), Arceus, Dialga, Palkia and Giratina (the Korean line's
// finale), Darkrai (1979 alone), Regigigas (the Regi line after 1945), Groudon and Kyogre (the 1950 battle's two sides),
// Deoxys (the Sky Pillar's line). The Gen 5 legends keep the lairs and town battles they already have (content_wkit.js).
// A quest's legend fights in one form, a step below a lair's keeper: its blast, the tier's fiercer second stage at half HP
// (dungeon.js spawnBoss) and its signature move at 60% and 30% of its HP. One that already joined doesn't join twice.
import { K, N, PT, boss, blast, legend, WSIG } from './content_wkit.js';
import { S } from './game.js';

const P = (k) => [56 + Math.round(k * 1.2), 60 + Math.round(k * 1.2)]; // the designed levels of the k-th world era, as in content_w1.js

function quest(o) {
  const { use, ...rest } = o;
  const b = legend({ hp: 3, atk: 0.98, cap: 0.36, buff: 1, bgm: 'vs_strong', sig: use && { use: [use], at: [0.6, 0.3] }, ...rest });
  return Object.defineProperty(b, 'noJoin', { enumerable: true, get: () => !!S.flags['got_' + b.sp] });
}
// the 600-total lines: an ordinary boss's numbers on their own tier (dungeon.js PSEUDO_TIER)
const strong = (sp, lv, moves, tele, say, after) => boss(sp, lv, moves, tele, say, after, { hp: 3, bgm: 'vs_strong' });

const SAY = {
  thunder: PT('번개가 몇 턴 동안 붉은 칸에 떨어져! 맞으면 마비될 수도 있어!', 'Lightning will fall on the red tiles for several turns! It can paralyse whoever it hits!'),
  lava: PT('용암이 몇 턴 동안 붉은 칸에서 솟아! 계속 움직이자!', 'Lava will burst up on the red tiles for several turns! Keep moving!'),
};

export const WB = {
  // ---------------------------------------------------------------- 1860: the Convention of Peking
  yuanming: quest({ sp: 250, lv: P(0)[1] + 2, moves: [221, 413, 53, 246], use: WSIG.sacredFire,
    tele: blast(K('불대문자', 'Fire Blast'), 10, ['cross', 'ring', 'x', 'near']),
    say: [
      N('잿더미가 된 정원 위로 일곱 빛깔 날개가 내려앉았다. 황제의 봉황이라 불리던 칠색조가 불길을 향해 울부짖는다.', "Seven-coloured wings settle over the garden turned to ash. Ho-Oh, once called the emperor's phoenix, cries out at the flames."),
      { who: 250, text: K('쿠오오오! (정원을 불태운 것들을 향한 분노로 앞을 보지 못하고 있다!)', 'Kwooooh! (Rage at what burned the garden has blinded it!)') },
      PT('성스러운 불꽃이 몇 턴 동안 붉은 칸에 쏟아져! 발밑을 보자!', 'Sacred fire will rain on the red tiles for several turns! Watch your feet!')],
    after: [{ who: 250, text: K('…쿠오. (불길이 잦아들자, 칠색조는 무너진 정자 위에 깃털 하나를 떨어뜨렸다.)', '...Kwoh. (As the flames die down, Ho-Oh lets one feather fall on a fallen pavilion.)') }],
    join: K('칠색조가 일곱 빛깔 날개를 접었다. 함께 가고 싶어 한다!', 'Ho-Oh folds its seven-coloured wings. It wants to come along!') }),
  ussuri: quest({ sp: 243, lv: P(0)[1] + 3, moves: [85, 422, 242, 87], use: WSIG.thunder,
    tele: blast(K('방전', 'Discharge'), 13, ['rows', 'cols', 'quad', 'far']),
    say: [
      N('국경의 숲에 마른번개가 떨어지고, 호랑이를 닮은 라이코가 길을 막아섰다. 새로 그어진 경계선이 제 사냥터를 둘로 갈라놓은 모양이다.', 'Dry lightning strikes the frontier woods, and tiger-like Raikou blocks the way. The newly drawn border seems to have cut its hunting ground in two.'),
      { who: 243, text: K('크르르르! (번개를 두른 갈기가 곤두선다!)', 'Krrrrr! (Its lightning-wrapped mane stands on end!)') }, SAY.thunder],
    after: [{ who: 243, text: K('…크르. (라이코는 숲 너머 두만강 쪽을 한참 바라보다 번개처럼 사라졌다.)', '...Krr. (Raikou stares a long while toward the Tumen River beyond the woods, then vanishes like lightning.)') }],
    join: K('라이코가 번개를 거두고 곁에 앉았다. 함께 가고 싶어 한다!', 'Raikou draws in its lightning and sits beside you. It wants to come along!') }),
  // ---------------------------------------------------------------- 1894: the Sino-Japanese War at sea
  pungdo: quest({ sp: 490, lv: P(1)[1] + 2, moves: [57, 58, 94, 352], use: WSIG.surf,
    tele: blast(K('하이드로펌프', 'Hydro Pump'), 11, ['rows', 'cross', 'ring', 'far']),
    say: [
      N('포탄이 떨어진 바다가 소용돌이친다. 그 한가운데서 바다의 왕자 마나피가 겁에 질려 파도를 일으키고 있다.', 'Where the shells fell, the sea swirls. In its centre Manaphy, the prince of the sea, is raising waves in terror.'),
      { who: 490, text: K('마나… 피이이! (바다를 지키려고 필사적이다!)', 'Mana... phyyy! (It is desperately trying to protect the sea!)') },
      PT('파도가 몇 턴 동안 붉은 칸을 덮쳐! 배를 잘 몰자!', 'Waves will crash on the red tiles for several turns! Steer carefully!')],
    after: [{ who: 490, text: K('…피이. (파도가 가라앉고, 마나피는 바다에 빠진 사람들 쪽으로 물길을 열어 주었다.)', '...Phyy. (The waves settle, and Manaphy opens a channel toward the people in the water.)') }],
    join: K('마나피가 뱃전으로 헤엄쳐 왔다. 함께 가고 싶어 한다!', 'Manaphy swims up to the side of the boat. It wants to come along!') }),
  yellowsea: quest({ sp: 249, lv: P(1)[1] + 4, moves: [177, 94, 56, 403], use: WSIG.aeroblast, bgm: 'ba_dpoke2',
    tele: blast(K('에어슬래시', 'Air Slash'), 2, ['rows', 'cols', 'x', 'quad']),
    say: [
      N('연기에 휩싸인 군함들 사이에서 바다가 갈라지고, 거대한 루기아가 솟구쳤다! 포성에 깊은 바다의 잠이 깨어 버렸다.', 'Among warships wrapped in smoke the sea parts, and a huge Lugia bursts up! The guns have broken its sleep in the deep.'),
      { who: 249, text: K('…바다의 잠을 깨운 것은 누구인가. 이 바다에서 당장 물러가라!', '...Who woke the sea from its sleep? Leave these waters at once!') },
      PT('에어로블라스트가 한 바퀴를 돌아! 줄기가 지나가는 칸을 피하자!', 'Its Aeroblast turns a full circle! Keep off the tiles it sweeps!')],
    after: [{ who: 249, text: K('…너희는 싸우러 온 것이 아니구나. 바다에 빠진 자들을 데려가라.', '...You did not come to fight. Take those in the water with you.') }],
    join: K('루기아가 커다란 날개를 낮추었다. 함께 바다를 건너고 싶어 한다!', 'Lugia lowers its great wings. It wants to cross the sea with you!') }),
  // ---------------------------------------------------------------- 1904: the Russo-Japanese War
  chemulpo: quest({ sp: 489, lv: P(2)[1] + 2, moves: [352, 57, 58, 61], use: WSIG.waterSpouts,
    tele: blast(K('파도타기', 'Surf'), 11, ['cross', 'x', 'rows', 'near']),
    say: [
      N('항구 앞바다에 가라앉는 배들 사이로, 피오네 한 마리가 물결을 타고 떠돌고 있다. 제 바다를 잃고 화가 난 모양이다.', 'Among ships sinking off the harbour, a lone Phione drifts on the swell. It seems to be angry at losing its sea.'),
      { who: 489, text: K('피오! 피오오! (머리 위 물풍선을 크게 부풀렸다!)', 'Phio! Phioo! (It blows up the water balloon on its head!)') },
      PT('물기둥이 몇 턴 동안 붉은 칸에서 솟아! 발밑을 보자!', 'Water spouts will rise on the red tiles for several turns! Watch your feet!')],
    after: [{ who: 489, text: K('…피오. (피오네는 가라앉은 배를 한 번 돌아보고 물결을 따라 떠나갔다.)', '...Phio. (Phione looks back once at the sunken ship and drifts off on the swell.)') }],
    join: K('피오네가 물결을 타고 다가왔다. 함께 가고 싶어 한다!', 'Phione rides the swell over to you. It wants to come along!') }),
  hill203: strong(248, P(2)[1] + 4, [444, 89, 242, 157], blast(K('스톤에지', 'Stone Edge'), 5, ['cols', 'rows', 'quad', 'x']),
    [N('포탄으로 깎여 나간 언덕을 마기라스가 짓밟고 있다. 산도 무너뜨린다는 발길질에 언덕 전체가 무너질 것만 같다!', 'Tyranitar is trampling a hill gouged by shells. Its stamping, said to bring down mountains, looks ready to collapse the whole hill!')],
    [{ who: 248, text: K('…그르르. (마기라스가 걸음을 멈추었다. 언덕 아래로 무너진 참호들이 보인다.)', '...Grrr. (Tyranitar stops stamping. Below the hill, collapsed trenches come into view.)') }]),
  tsushima: quest({ sp: 145, lv: P(2)[1] + 5, moves: [87, 85, 403, 246], use: WSIG.thunder, bgm: 'ba_dpoke2',
    tele: blast(K('번개', 'Thunder'), 13, ['ring', 'far', 'quad', 'checker']),
    say: [
      N('대한 해협 한가운데, 먹구름 속에서 썬더가 날개를 펼쳤다! 함대의 신호기보다 높이 번개가 번쩍인다.', "In the middle of the Korea Strait, Zapdos spreads its wings in the black clouds! Lightning flashes higher than the fleets' signal flags."),
      { who: 145, text: K('끼오오오! (포성에 맞서듯 번개를 내리친다!)', 'Kyaooo! (It strikes down lightning as if to answer the guns!)') }, SAY.thunder],
    after: [{ who: 145, text: K('…끼오. (먹구름이 걷히자, 바다에 빠진 수병들을 건질 길이 열렸다.)', '...Kyao. (The clouds lift, and a way opens to the sailors in the water.)') }],
    join: K('썬더가 돛대 위에 내려앉았다. 함께 가고 싶어 한다!', 'Zapdos settles on the mast. It wants to come along!') }),
  // ---------------------------------------------------------------- 1914: Sarajevo
  latin: quest({ sp: 481, lv: P(3)[1] + 2, moves: [94, 326, 248, 247], use: WSIG.emotion,
    tele: blast(K('사이코키네시스', 'Psychic'), 14, ['ring', 'near', 'x', 'target']),
    say: [
      N('골목 그늘에 엠라이트가 떠 있다. 사람들의 마음이 뒤흔들려 의심과 분노가 번져 나간다!', "Mesprit floats in the shade of an alley. People's hearts are shaken, and suspicion and anger spread!"),
      { who: 481, text: K('…이 도시의 마음이 너무 시끄러워. 미움이 넘쳐서 나도 멈출 수가 없어!', "...This city's heart is too loud. There is so much hate that even I can't stop!") },
      PT('마음의 파동이 여덟 방향으로 퍼져! 줄 밖으로 피하자!', 'The wave of emotion spreads in eight directions! Step off its lines!')],
    after: [{ who: 481, text: K('…고마워. 그래도 오늘 일어날 일은 막을 수 없을 거야. 미움은 이미 너무 커졌으니까.', "...Thank you. But what will happen today can't be stopped. The hate has grown too great.") }],
    join: K('엠라이트가 조용히 다가왔다. 함께 가고 싶어 한다!', 'Mesprit quietly comes over. It wants to come along!') }),
  balkan: quest({ sp: 244, lv: P(3)[1] + 3, moves: [221, 53, 242, 89], use: WSIG.eruption,
    tele: blast(K('불대문자', 'Fire Blast'), 10, ['cross', 'far', 'rows', 'x']),
    say: [
      N('국경의 산길에 불길이 치솟고, 앤테이가 포효했다. 유럽의 화약고라 불리는 이 산에서 화산 같은 분노가 터져 나온다!', 'Flames leap up on the frontier pass, and Entei roars. On this mountain, the powder keg of Europe, a fury like a volcano breaks out!'),
      { who: 244, text: K('그오오오! (동원령이 내려진 산길을 지나는 이들을 모두 쫓아내고 있다!)', 'Groooh! (It is driving off everyone on the road the mobilisation has filled!)') }, SAY.lava],
    after: [{ who: 244, text: K('…그르르. (앤테이는 불길을 거두고 동쪽 산등성이로 사라졌다.)', '...Grrr. (Entei draws in its flames and vanishes over the eastern ridge.)') }],
    join: K('앤테이가 불길을 거두고 곁에 섰다. 함께 가고 싶어 한다!', 'Entei draws in its flames and stands beside you. It wants to come along!') }),
  // ---------------------------------------------------------------- 1914: the Marne
  marne: quest({ sp: 482, lv: P(4)[1] + 2, moves: [94, 326, 247, 58], use: WSIG.will,
    tele: blast(K('사이코키네시스', 'Psychic'), 14, ['rows', 'cross', 'quad', 'near']),
    say: [
      N('무너지는 강둑 위에 아그놈이 떠 있다. 의지의 신이라는 아그놈이 강을 건너려는 이들의 각오를 시험하고 있다.', 'Azelf floats over the crumbling riverbank. Azelf, the being of willpower, is testing the resolve of those trying to cross.'),
      { who: 482, text: K('…물러서지 않겠다고? 그 의지가 진짜인지 보여 줘!', "...You won't fall back? Show me that your will is real!") },
      PT('의지의 파동이 여덟 방향으로 퍼져! 줄 밖으로 피하자!', 'The wave of will spreads in eight directions! Step off its lines!')],
    after: [{ who: 482, text: K('…좋아. 그 의지라면 이 다리는 버틸 거야. (아그놈이 힘을 빌려주자 무너지던 다리가 멈추었다.)', '...Good. With a will like that, this bridge will hold. (Azelf lends its strength, and the crumbling bridge stops falling.)') }],
    join: K('아그놈이 곁으로 날아왔다. 함께 가고 싶어 한다!', 'Azelf flies over to you. It wants to come along!') }),
  noman: quest({ sp: 385, lv: P(4)[1] + 3, moves: [353, 94, 430, 248], use: WSIG.doom,
    tele: blast(K('러스터캐논', 'Flash Cannon'), 8, ['ring', 'far', 'checker', 'x']),
    say: [
      N('참호와 참호 사이, 철조망과 포탄 구덩이뿐인 땅. 그 가운데서 지라치가 잠에서 깨어 별빛을 흩뿌리고 있다.', 'Between the trenches lies a land of wire and shell holes. In its middle Jirachi has woken, scattering starlight.'),
      { who: 385, text: K('…누가 소원을 빌었어? 전쟁을 끝내 달라고? 그 소원의 무게를 견딜 수 있어?', '...Who made a wish? To end the war? Can you bear the weight of that wish?') },
      PT('별빛이 몇 턴 동안 붉은 칸에 떨어져! 발밑을 보자!', 'Starlight will fall on the red tiles for several turns! Watch your feet!')],
    after: [{ who: 385, text: K('…그 소원은 오늘 밤만 들어줄게. (지라치가 잠들자, 양쪽 참호에서 노랫소리가 들려왔다.)', '...I can grant that wish for tonight only. (As Jirachi falls asleep, singing drifts from the trenches on both sides.)') }],
    join: K('지라치가 별빛을 거두며 다가왔다. 함께 가고 싶어 한다!', 'Jirachi gathers in its starlight and comes over. It wants to come along!') }),
  // ---------------------------------------------------------------- 1915: Gallipoli
  dardanelles: strong(376, P(5)[1] + 2, [309, 428, 89, 443], blast(K('코멧펀치', 'Meteor Mash'), 8, ['rows', 'cols', 'near', 'x']),
    [N('기뢰가 깔린 해협 위에 메타그로스가 떠 있다. 강철 몸의 자력에 기뢰들이 끌려와 군함들 사이를 떠돈다!', 'Metagross hovers over the mined straits. Mines drawn by the magnetism of its steel body drift among the warships!')],
    [{ who: 376, text: K('…쿠웅. (메타그로스가 자력을 거두자, 기뢰 없는 물길이 드러났다.)', '...Boom. (Metagross lets its magnetism go, and a channel free of mines appears.)') }]),
  anzac: quest({ sp: 480, lv: P(5)[1] + 4, moves: [94, 326, 248, 247], use: WSIG.memory,
    tele: blast(K('미래예지', 'Future Sight'), 14, ['cols', 'quad', 'cross', 'far']),
    say: [
      N('해안 절벽 위에 유크시가 눈을 감고 떠 있다. 이곳에서 쓰러진 이들의 기억이 바람처럼 절벽을 떠돈다.', 'Uxie floats with closed eyes above the coastal cliffs. The memories of those who fell here drift along the cliffs like wind.'),
      { who: 480, text: K('…기억을 가져가려는 건가. 아직 이 절벽을 떠나지 못한 이들이 있다.', '...Have you come to take the memories? There are those who have not yet left these cliffs.') },
      PT('기억의 파편이 몇 턴 동안 붉은 칸에 쏟아져! 발밑을 보자!', 'Shards of memory will rain on the red tiles for several turns! Watch your feet!')],
    after: [{ who: 480, text: K('…잊지 않겠다면 길을 열겠다. (유크시가 눈을 감은 채, 부상병들이 내려갈 길을 비켜 주었다.)', '...If you will not forget, I will open the way. (Eyes still closed, Uxie moves aside for the wounded to come down.)') }],
    join: K('유크시가 조용히 곁으로 왔다. 함께 기억하고 싶어 한다!', 'Uxie quietly comes to your side. It wants to remember with you!') }),
  // ---------------------------------------------------------------- 1916: Verdun and the Somme
  douaumont: quest({ sp: 379, lv: P(6)[1] + 3, moves: [442, 309, 430, 89], use: WSIG.metalBurst,
    tele: blast(K('러스터캐논', 'Flash Cannon'), 8, ['cross', 'rows', 'cols', 'quad']),
    say: [
      N('요새 깊은 곳에서 점자가 새겨진 강철 거인이 일어섰다. 레지스틸이 움직일 때마다 요새의 문이 열렸다 닫히기를 되풀이한다!', 'Deep in the fort a steel colossus carved with braille rises. Each time Registeel moves, the gates open and slam shut!'),
      { who: 379, text: K('…삐… 삐빗… 지나가지… 못한다…', '...Bee... bee-beep... shall... not pass...') },
      PT('강철 파편이 몇 턴 동안 붉은 칸에 쏟아져! 발밑을 보자!', 'Steel shards will rain on the red tiles for several turns! Watch your feet!')],
    after: [{ who: 379, text: K('…삐빗. (레지스틸이 멈추자, 요새의 문이 천천히 열렸다.)', '...Beep. (Registeel stops, and the gates slowly open.)') }],
    join: K('레지스틸이 묵직하게 걸어왔다. 함께 가고 싶어 한다!', 'Registeel walks over heavily. It wants to come along!') }),
  somme: strong(376, P(6)[1] + 4, [309, 428, 89, 443], blast(K('아이언헤드', 'Iron Head'), 8, ['rows', 'far', 'x', 'checker']),
    [N('진흙투성이 참호를 짓밟으며 강철 몸의 메타그로스가 나타났다! 사람들이 처음 본 "탱크"처럼 네 다리로 철조망을 밀어붙인다!', 'Trampling through the muddy trenches, steel-bodied Metagross appears! Like the first "tanks" people ever saw, it pushes straight through the wire on four legs!')],
    [{ who: 376, text: K('…쿠웅. (메타그로스는 무거운 몸을 진흙 속에 가만히 내려놓았다.)', '...Boom. (Metagross lowers its heavy body into the mud and stays still.)') }]),
  // ---------------------------------------------------------------- 1916: Jutland
  northsea: quest({ sp: 245, lv: P(7)[1] + 2, moves: [56, 58, 62, 352], use: WSIG.northWind,
    tele: blast(K('오로라빔', 'Aurora Beam'), 15, ['ring', 'cross', 'far', 'x']),
    say: [
      N('짙은 안개 속에서 북풍이 불어온다. 스이쿤이 물 위를 달리며 함대의 길을 어지럽히고 있다. 안개를 걷어 내야 배들이 서로를 알아볼 수 있다.', 'A north wind blows through the thick fog. Suicune runs over the water, leading the fleets astray. Clear the fog so the ships can see each other.'),
      { who: 245, text: K('…(더럽혀진 바다를 바라보는 눈이 차갑다.)', '...(Its eyes are cold as it looks over the fouled sea.)') },
      PT('북풍이 몇 턴 동안 붉은 칸을 휩쓸어! 계속 움직이자!', 'The north wind will sweep the red tiles for several turns! Keep moving!')],
    after: [{ who: 245, text: K('…(안개가 걷히자, 스이쿤은 북쪽으로 물 위를 달려갔다.)', '...(As the fog lifts, Suicune runs off north over the water.)') }],
    join: K('스이쿤이 물 위에 멈춰 서서 이쪽을 바라본다. 함께 가고 싶어 한다!', 'Suicune stops on the water and looks your way. It wants to come along!') }),
  jutland: strong(149, P(7)[1] + 4, [406, 200, 87, 403], blast(K('용의파동', 'Dragon Pulse'), 16, ['cross', 'x', 'rows', 'quad']),
    [N('두 함대 사이로 거대한 소용돌이가 솟았다. 바다에 빠진 이들을 구한다는 망나뇽이 포성에 놀라 바다를 휘젓고 있다!', 'A huge whirlpool rises between the two fleets. Dragonite, said to save those lost at sea, is churning up the waves, startled by the guns!')],
    [{ who: 149, text: K('…뇽. (소용돌이가 멎자, 망나뇽은 구명보트 쪽으로 사람들을 이끌었다.)', '...Nyong. (As the whirlpool stills, Dragonite leads people to the lifeboats.)') }]),
  // ---------------------------------------------------------------- 1918: the Armistice
  forest18: quest({ sp: 492, lv: P(8)[1] + 3, moves: [465, 412, 402, 202], use: WSIG.seedFlare,
    tele: blast(K('에너지볼', 'Energy Ball'), 12, ['rows', 'x', 'near', 'cols']),
    say: [
      N('특별 열차로 가는 숲길이 꽃과 덩굴로 막혔다. 쉐이미가 전쟁에 더럽혀진 숲을 되살리려 온 힘을 쓰고 있다.', 'The forest road to the special train is blocked with flowers and vines. Shaymin is using all its strength to bring back a forest fouled by war.'),
      { who: 492, text: K('쉐이이! (이 숲은 아무도 지나가지 못하게 하겠다는 듯하다!)', 'Shayyy! (It seems set on letting no one through this forest!)') },
      PT('꽃씨가 몇 턴 동안 붉은 칸에서 터져! 발밑을 보자!', 'Seeds will burst on the red tiles for several turns! Watch your feet!')],
    after: [{ who: 492, text: K('…쉐이. (쉐이미가 덩굴을 거두자, 숲길에 꽃만 남았다. 사절단이 그 길을 지나갔다.)', '...Shay. (Shaymin draws back its vines, leaving only flowers on the road. The delegates pass along it.)') }],
    join: K('쉐이미가 꽃을 피우며 다가왔다. 함께 가고 싶어 한다!', 'Shaymin comes over, flowers blooming around it. It wants to come along!') }),
  lastday: strong(635, P(8)[1] + 4, [406, 399, 53, 434], blast(K('악의파동', 'Dark Pulse'), 17, ['cross', 'x', 'target', 'ring']),
    [N('휴전이 서명된 뒤에도, 11시까지 전선의 싸움은 멈추지 않았다. 움직이는 것은 모두 덮친다는 삼삼드래가 참호 위를 날고 있다.', 'Even after the armistice was signed, the fighting went on until 11. Hydreigon, said to fall on anything that moves, is flying over the trenches.'),
      PT('몇 시간만 지나면 끝나는데…! 마지막 날에 아무도 쓰러지지 않게 하자!', "In a few hours it's over...! Let's make sure nobody falls on the last day!")],
    [{ who: 635, text: K('…크와아. (오전 11시를 알리는 종소리에 삼삼드래가 세 머리를 낮추었다.)', '...Kwaah. (At the bells ringing eleven, Hydreigon lowers its three heads.)') }]),
  // ---------------------------------------------------------------- 1919: the Paris Peace Conference
  mirrors: quest({ sp: 151, lv: P(9)[1] + 3, moves: [94, 247, 396, 58], use: WSIG.mirror,
    tele: blast(K('사이코키네시스', 'Psychic'), 14, ['quad', 'x', 'ring', 'checker']),
    say: [
      N('수백 개의 거울이 서로를 비추는 방. 거울마다 뮤가 웃고 있다. 거울 속에 갇힌 목소리들을 장난감처럼 붙잡고 놓아주지 않는다.', 'A room of hundreds of mirrors reflecting one another. In every mirror Mew is laughing, holding the voices trapped in them like toys and not letting go.'),
      { who: 151, text: K('뮤우! (어느 거울이 진짜일까, 하고 묻는 듯하다!)', 'Mewww! (It seems to ask which mirror is the real one!)') },
      PT('거울 빛이 여덟 방향으로 뻗어! 줄 밖으로 피하자!', 'Mirror light shoots out in eight directions! Step off its lines!')],
    after: [{ who: 151, text: K('…뮤. (거울이 맑아지자, 잊혔던 목소리들이 하나둘 방을 빠져나갔다.)', '...Mew. (As the mirrors clear, forgotten voices slip out of the hall one by one.)') }],
    join: K('뮤가 거울에서 빠져나와 어깨 위를 맴돈다. 함께 가고 싶어 한다!', 'Mew slips out of a mirror and circles your shoulder. It wants to come along!') }),
  seine: quest({ sp: 488, lv: P(9)[1] + 4, moves: [94, 58, 248, 247], use: WSIG.moonlight,
    tele: blast(K('섀도볼', 'Shadow Ball'), 7, ['ring', 'near', 'far', 'target']),
    say: [
      N('다리 밑의 어둠 위로 초승달 같은 크레세리아가 떠 있다. 버려진 청원서들이 달빛 아래 꿈처럼 맴돈다.', 'Crescent-shaped Cresselia floats over the dark under the bridge. Discarded petitions circle like dreams in its moonlight.'),
      { who: 488, text: K('…이루어지지 않은 소원이 이토록 많구나. 여기서 꿈이나 꾸며 잠들어라.', '...So many wishes that never came true. Stay here, dream, and sleep.') },
      PT('달빛이 몇 턴 동안 붉은 칸에 쏟아져! 발밑을 보자!', 'Moonlight will pour on the red tiles for several turns! Watch your feet!')],
    after: [{ who: 488, text: K('…꿈은 깨어 있는 자의 것이다. (크레세리아가 떠오르자, 그 아래에서 한국의 청원서 사본이 나왔다.)', '...Dreams belong to those who stay awake. (Cresselia rises, and a copy of the Korean petition lies beneath it.)') }],
    join: K('크레세리아가 달빛을 거두며 다가왔다. 함께 가고 싶어 한다!', 'Cresselia draws in its moonlight and comes over. It wants to come along!') }),
  // ---------------------------------------------------------------- 1939: Westerplatte
  westerplatte: strong(248, P(10)[1] + 3, [444, 89, 242, 157], blast(K('스톤샤워', 'Rock Slide'), 5, ['cross', 'cols', 'near', 'x']),
    [N('포탄에 무너진 막사 사이로 마기라스가 걸어 나왔다. 포격에 둥지를 잃고 수비대를 몰아붙이고 있다!', 'Out from among barracks shattered by shells walks Tyranitar. The shelling has cost it its nest, and it is driving at the garrison!')],
    [{ who: 248, text: K('…그르르. (마기라스가 물러나자, 막사 밑에 갇힌 병사들이 기어 나왔다.)', '...Grrr. (Tyranitar withdraws, and soldiers trapped under the barracks crawl out.)') }]),
  postoffice: quest({ sp: 381, lv: P(10)[1] + 4, moves: [295, 406, 94, 337], use: WSIG.luster,
    tele: blast(K('사이코키네시스', 'Psychic'), 14, ['ring', 'far', 'x', 'checker']),
    say: [
      N('끊어진 전신선 사이에 라티오스가 떠 있다. 마음으로 보고 듣는다는 라티오스가 우체국에 남은 사람들의 두려움에 휩쓸려 빛을 쏘아 대고 있다!', "Latios floats among the severed telegraph wires. Latios, who sees and hears with its heart, is swept up in the fear of those left in the post office, and shoots out light in all directions!"),
      { who: 381, text: K('…무서워하는 마음이 너무 많다. 이 소리들을 멈춰 다오!', '...So many frightened hearts. Make these voices stop!') },
      PT('빛줄기가 여덟 방향으로 뻗어! 줄 밖으로 피하자!', 'Beams of light shoot out in eight directions! Step off their lines!')],
    after: [{ who: 381, text: K('…(빛이 잦아들자, 지하실의 직원들이 밖으로 나왔다. 라티오스는 그들의 마지막 전보를 마음으로 전해 주었다.)', '...(The light dies down, and the clerks in the cellar come out. Latios carries their last telegram in its heart.)') }],
    join: K('라티오스가 빛을 거두고 곁으로 왔다. 함께 가고 싶어 한다!', 'Latios draws in its light and comes to your side. It wants to come along!') }),
  // ---------------------------------------------------------------- 1940: Dunkirk
  mole: strong(445, P(11)[1] + 2, [89, 337, 444, 242], blast(K('지진', 'Earthquake'), 4, ['rows', 'near', 'cross', 'x']),
    [N('부서진 방파제 위로 한카리아스가 모래를 뚫고 솟구쳤다. 배에 오르려는 사람들의 길이 막혔다!', 'Garchomp bursts up through the sand onto the broken mole. The way to the boats is blocked!')],
    [{ who: 445, text: K('…크아. (한카리아스가 모래 속으로 물러나자, 사람들이 줄지어 배에 올랐다.)', '...Kraa. (As Garchomp retreats into the sand, people board the boats in line.)') }]),
  channel: quest({ sp: 380, lv: P(11)[1] + 3, moves: [296, 406, 94, 225], use: WSIG.mist,
    tele: blast(K('사이코키네시스', 'Psychic'), 14, ['cross', 'ring', 'far', 'rows']),
    say: [
      N('해협 한가운데서 라티아스가 겁에 질려 날아다닌다. 날개가 일으킨 물결에 사람을 가득 실은 작은 배들이 기운다!', 'In the middle of the Channel, Latias flies about in terror. The swell from its wings tips the little ships full of people!'),
      { who: 380, text: K('…시끄러워, 무서워! 아무도 오지 마!', "...So loud, so frightening! Don't come near!") },
      PT('안개 같은 빛이 여덟 방향으로 뻗어! 줄 밖으로 피하자!', 'Light like mist shoots out in eight directions! Step off its lines!')],
    after: [{ who: 380, text: K('…(라티아스가 진정하자, 작은 배들이 도버의 하얀 절벽을 향해 나아갔다.)', '...(Latias calms, and the little ships head for the white cliffs of Dover.)') }],
    join: K('라티아스가 뱃전에 내려앉았다. 함께 가고 싶어 한다!', 'Latias settles on the side of the boat. It wants to come along!') }),
  // ---------------------------------------------------------------- 1940: the Blitz
  airfield: strong(373, P(12)[1] + 3, [406, 53, 403, 337], blast(K('에어슬래시', 'Air Slash'), 2, ['cross', 'far', 'x', 'rows']),
    [N('폭격으로 패인 활주로 위를 보만다가 날아다니고 있다. 하늘을 빼앗긴 용이 전투기들을 쫓아내려 한다! 조종사들이 출격하지 못한다!', 'Salamence is flying over a runway cratered by bombs. A dragon robbed of its sky, it is out to drive off the fighters! The pilots can\'t take off!')],
    [{ who: 373, text: K('…크르. (보만다는 날개를 접고 격납고 지붕에 내려앉았다.)', '...Krr. (Salamence folds its wings and lands on the hangar roof.)') }]),
  // ---------------------------------------------------------------- 1941: Moscow
  mud: quest({ sp: 377, lv: P(13)[1] + 3, moves: [444, 157, 89, 7], use: WSIG.stoneEdge,
    tele: blast(K('스톤샤워', 'Rock Slide'), 5, ['ring', 'rows', 'checker', 'near']),
    say: [
      N('끝없는 진흙길 한가운데서 바위 거인이 일어섰다. 레지락이 걸을 때마다 진흙이 튀어 피난민들의 수레가 더 깊이 빠진다!', "In the middle of the endless mud a stone giant rises. With every step Regirock takes, mud flies and the refugees' carts sink deeper!"),
      { who: 377, text: K('…쿠웅… 쿠웅…', '...Boom... boom...') },
      PT('바위가 몇 턴 동안 붉은 칸에 쏟아져! 발밑을 보자!', 'Rocks will fall on the red tiles for several turns! Watch your feet!')],
    after: [{ who: 377, text: K('…쿠웅. (레지락이 길을 비키자, 수레들이 다시 움직였다.)', '...Boom. (Regirock steps aside, and the carts move again.)') }],
    join: K('레지락이 바위 몸을 낮추었다. 함께 가고 싶어 한다!', 'Regirock lowers its stone body. It wants to come along!') }),
  snowfield: quest({ sp: 378, lv: P(13)[1] + 4, moves: [58, 59, 85, 63], use: WSIG.blizzard,
    tele: blast(K('눈보라', 'Blizzard'), 15, ['rows', 'cols', 'quad', 'far']),
    say: [
      N('영하 40도의 눈보라 속에서 얼음 거인이 하늘을 얼리고 있다. 레지아이스를 멈추지 않으면 모두가 얼어붙는다!', 'In a blizzard at forty below, a giant of ice is freezing the sky. Unless Regice is stopped, everyone will freeze!'),
      { who: 378, text: K('…피이잉…', '...Peeeng...') },
      PT('눈보라가 몇 턴 동안 붉은 칸을 덮쳐! 얼어붙을 수도 있어!', 'The blizzard will sweep the red tiles for several turns! It can freeze whoever it hits!')],
    after: [{ who: 378, text: K('…피잉. (눈보라가 잦아들자, 설원 너머로 모스크바의 지붕들이 보였다.)', '...Peeng. (As the blizzard eases, the roofs of Moscow appear beyond the snow.)') }],
    join: K('레지아이스가 차가운 빛을 거두었다. 함께 가고 싶어 한다!', 'Regice dims its icy light. It wants to come along!') }),
  // ---------------------------------------------------------------- 1941-42: Pearl Harbor and Midway
  pearl: quest({ sp: 146, lv: P(14)[1] + 3, moves: [53, 257, 403, 246], use: WSIG.heatWave,
    tele: blast(K('화염방사', 'Flamethrower'), 10, ['rows', 'cols', 'x', 'ring']),
    say: [
      N('기름이 불타는 항구 위로 파이어가 날고 있다. 불길에 이끌려 온 파이어의 날갯짓마다 불바람이 수면을 훑는다. 물에 빠진 수병들이 위험하다!', 'Moltres flies over a harbour of burning oil. Drawn by the flames, it sends a wind of fire over the water with every wingbeat. The sailors in the water are in danger!'),
      { who: 146, text: K('끼아아아! (불타는 바다가 제 둥지라도 되는 듯 맴돈다!)', 'Kyaaah! (It circles the burning sea as if it were its nest!)') },
      PT('불바람이 몇 턴 동안 붉은 칸을 휩쓸어! 계속 움직이자!', 'A wind of fire will sweep the red tiles for several turns! Keep moving!')],
    after: [{ who: 146, text: K('…끼아. (파이어가 높이 날아오르자, 구조선들이 다가갈 수 있게 되었다.)', '...Kyah. (Moltres soars high, and the rescue boats can draw near.)') }],
    join: K('파이어가 불길을 낮추고 내려앉았다. 함께 가고 싶어 한다!', 'Moltres lowers its flames and settles. It wants to come along!') }),
  midway: quest({ sp: 384, lv: P(14)[1] + 5, moves: [200, 406, 245, 89], use: WSIG.skyBeam, bgm: 'ba_dpoke2',
    tele: blast(K('용의파동', 'Dragon Pulse'), 16, ['near', 'x', 'cross', 'target']),
    say: [
      N('불타는 항공모함들 위, 구름보다 높은 곳에서 레쿠쟈가 내려왔다. 하늘을 가득 메운 비행기들에 화가 나 바다까지 내려온 것이다!', 'Above the burning carriers, Rayquaza comes down from beyond the clouds. Angered by the planes filling its sky, it has come all the way down to the sea!'),
      { who: 384, text: K('……하늘은 너희의 싸움터가 아니다!', '......The sky is no battlefield of yours!') },
      PT('빛줄기가 한 바퀴를 돌아! 줄기가 지나가는 칸을 피하자!', 'Its beam turns a full circle! Keep off the tiles it sweeps!')],
    after: [{ who: 384, text: K('……바다에 빠진 자들을 건져라. 하늘은 잠시 조용히 두겠다.', '......Pull out those in the water. I will leave the sky quiet for a while.') }],
    join: K('레쿠쟈가 긴 몸을 낮추었다. 함께 하늘을 날고 싶어 한다!', 'Rayquaza lowers its long body. It wants to fly with you!') }),
  // ---------------------------------------------------------------- 1942: the Siege of Leningrad
  ladoga: quest({ sp: 144, lv: P(15)[1] + 3, moves: [58, 59, 403, 246], use: WSIG.iceStorm,
    tele: blast(K('냉동빔', 'Ice Beam'), 15, ['rows', 'cols', 'x', 'checker']),
    say: [
      N('얼음길 한가운데에 프리져가 내려앉았다. 날갯짓마다 얼음이 갈라지고, 식량을 실은 트럭이 호수에 빠지려 한다!', 'Articuno has settled in the middle of the ice road. The ice cracks with every wingbeat, and a truck full of food is about to go into the lake!'),
      { who: 144, text: K('끼이이잉! (얼음길을 제 땅으로 여기는 듯 날개를 펼친다!)', 'Kyeeeng! (It spreads its wings as if the ice road were its own!)') },
      PT('얼음 폭풍이 몇 턴 동안 붉은 칸을 덮쳐! 얼어붙을 수도 있어!', 'An ice storm will sweep the red tiles for several turns! It can freeze whoever it hits!')],
    after: [{ who: 144, text: K('…끼잉. (프리져가 날아오르자 얼음이 다시 단단해졌다. 트럭들이 도시를 향해 달려갔다.)', '...Kyeng. (Articuno takes wing and the ice holds firm again. The trucks race for the city.)') }],
    join: K('프리져가 차가운 날개를 접었다. 함께 가고 싶어 한다!', 'Articuno folds its cold wings. It wants to come along!') }),
  // ---------------------------------------------------------------- 1942: El Alamein
  minefield: quest({ sp: 485, lv: P(16)[1] + 3, moves: [463, 436, 430, 414], use: WSIG.magma,
    tele: blast(K('분연', 'Lava Plume'), 10, ['cross', 'near', 'ring', 'x']),
    say: [
      N('지뢰밭 한가운데서 땅이 갈라지고 히드런이 기어 나왔다! 용암 같은 몸의 열기에 지뢰가 연달아 터질 것만 같다!', 'In the middle of the minefield the ground splits and Heatran crawls out! In the heat of its lava-like body the mines could go off one after another!'),
      { who: 485, text: K('그르르르… (달아오른 강철 몸에서 모래가 녹아내린다!)', 'Grrrrr... (Sand melts off its glowing steel body!)') }, SAY.lava],
    after: [{ who: 485, text: K('…그르. (히드런이 땅속으로 돌아가자, 공병들이 지뢰를 걷어 냈다.)', '...Grr. (Heatran goes back underground, and the sappers clear the mines.)') }],
    join: K('히드런이 열기를 낮추고 다가왔다. 함께 가고 싶어 한다!', 'Heatran lowers its heat and comes over. It wants to come along!') }),
  // ---------------------------------------------------------------- 1943: Stalingrad
  tractor: quest({ sp: 150, lv: P(17)[1] + 4, moves: [94, 396, 247, 58], use: WSIG.psystrike,
    tele: blast(K('사이코키네시스', 'Psychic'), 14, ['x', 'cross', 'near', 'quad']),
    say: [
      N('무너진 공장 한가운데 뮤츠가 서 있다. 전쟁 무기를 찍어 내던 기계들이 보이지 않는 힘에 구겨져 간다!', 'Mewtwo stands in the middle of the ruined factory. The machines that stamped out weapons of war are crumpling under an unseen force!'),
      { who: 150, text: K('…무기를 만드는 손. 나를 만든 손과 다르지 않다. 모두 부숴 주마!', '...Hands that make weapons. No different from the hands that made me. I will break them all!') },
      PT('보이지 않는 힘이 여덟 방향으로 뻗어! 줄 밖으로 피하자!', 'The unseen force shoots out in eight directions! Step off its lines!')],
    after: [{ who: 150, text: K('…너희는 부수러 온 것이 아니라 꺼내러 왔구나. (뮤츠가 물러나자, 지하에 숨은 노동자들이 빠져나왔다.)', '...You came to pull people out, not to break things. (Mewtwo withdraws, and the workers hidden underground get out.)') }],
    join: K('뮤츠가 조용히 내려앉았다. 너희의 뜻을 끝까지 지켜보고 싶어 한다!', 'Mewtwo quietly comes down. It wants to watch your will to the very end!') }),
  // ---------------------------------------------------------------- 1944: Normandy
  omaha: strong(445, P(18)[1] + 4, [89, 337, 444, 242], blast(K('스톤에지', 'Stone Edge'), 5, ['rows', 'x', 'checker', 'far']),
    [N('절벽 아래 해변, 한카리아스가 모래 속에서 솟아올라 상륙하는 이들을 덮친다!', 'On the beach below the bluffs, Garchomp bursts out of the sand at those coming ashore!')],
    [{ who: 445, text: K('…크아. (한카리아스가 모래 속으로 사라지자, 사람들이 절벽 위로 올라갔다.)', '...Kraa. (As Garchomp sinks into the sand, people climb the bluffs.)') }]),
  // ---------------------------------------------------------------- 1944: Leyte Gulf
  surigao: strong(373, P(19)[1] + 3, [406, 53, 403, 337], blast(K('화염방사', 'Flamethrower'), 10, ['cross', 'far', 'rows', 'ring']),
    [N('밤의 해협에 불붙은 배들이 떠 있다. 불빛에 날아든 보만다가 가라앉는 배 위를 맴돌며 불을 내뿜는다!', 'Burning ships float in the strait at night. Drawn by the light, Salamence circles over a sinking ship, breathing fire!')],
    [{ who: 373, text: K('…크르. (보만다가 날아가자, 사람들이 구명정으로 헤엄쳐 갔다.)', '...Krr. (Salamence flies off, and people swim for the lifeboats.)') }]),
  samar: strong(149, P(19)[1] + 5, [406, 200, 87, 403], blast(K('파괴광선', 'Hyper Beam'), 0, ['rows', 'cols', 'x', 'quad']),
    [N('사마르 앞바다, 포성에 미쳐 날뛰는 망나뇽이 작은 호위함들 위로 내려온다!', 'Off Samar, a Dragonite maddened by the guns comes down on the little escort ships!')],
    [{ who: 149, text: K('…뇽. (망나뇽이 깊은 바다로 사라지자, 바다 위에 고요가 찾아왔다.)', '...Nyong. (Dragonite sinks into the deep, and quiet falls over the sea.)') }]),
};
