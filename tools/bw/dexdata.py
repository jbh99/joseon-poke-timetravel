"""Add the fifth generation to web/assets/data/dex.json from Pokémon Black: species #494-649 (base stats, types,
base experience, weight, level-up moves, level-up evolutions; Korean names from text bank 70) and moves #468-559
(type, category, power, accuracy, PP, target, a secondary effect in the game's Gen 4 effect numbers where one fits;
Korean names from text bank 203). Earlier entries are left as they are.

Black's layouts: personal a/0/1/6 (HP Atk Def Spe SpA SpD, types, ..., base exp u16 at 0x22, weight u16 at 0x26 in
tenths of kg; types in Black's order, which has no ??? type), level-up moves a/0/1/8 (u16 move, u16 level pairs up
to 0xFFFF), evolutions a/0/1/9 (u16 method, u16 parameter, u16 species, seven slots), moves a/0/2/1 (type,
quality, category 0 status / 1 physical / 2 special, power, accuracy, PP, priority, hits, u16 status, status chance,
..., target at 0x14, stats at 0x15, changes at 0x18, chances at 0x1B).

usage: python dexdata.py
"""
import json
import os
import struct
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bwtext  # noqa: E402
import ndsfs  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(HERE))
ROM = os.environ.get('BLACK_ROM') or os.path.join(os.path.expanduser('~'), 'Downloads', 'claude skills', '포켓몬스터 블랙(K).nds')
DEX = os.path.join(ROOT, 'web', 'assets', 'data', 'dex.json')

EN_SPECIES = """Victini Snivy Servine Serperior Tepig Pignite Emboar Oshawott Dewott Samurott Patrat Watchog Lillipup Herdier
Stoutland Purrloin Liepard Pansage Simisage Pansear Simisear Panpour Simipour Munna Musharna Pidove Tranquill Unfezant
Blitzle Zebstrika Roggenrola Boldore Gigalith Woobat Swoobat Drilbur Excadrill Audino Timburr Gurdurr Conkeldurr
Tympole Palpitoad Seismitoad Throh Sawk Sewaddle Swadloon Leavanny Venipede Whirlipede Scolipede Cottonee Whimsicott
Petilil Lilligant Basculin Sandile Krokorok Krookodile Darumaka Darmanitan Maractus Dwebble Crustle Scraggy Scrafty
Sigilyph Yamask Cofagrigus Tirtouga Carracosta Archen Archeops Trubbish Garbodor Zorua Zoroark Minccino Cinccino
Gothita Gothorita Gothitelle Solosis Duosion Reuniclus Ducklett Swanna Vanillite Vanillish Vanilluxe Deerling Sawsbuck
Emolga Karrablast Escavalier Foongus Amoonguss Frillish Jellicent Alomomola Joltik Galvantula Ferroseed Ferrothorn
Klink Klang Klinklang Tynamo Eelektrik Eelektross Elgyem Beheeyem Litwick Lampent Chandelure Axew Fraxure Haxorus
Cubchoo Beartic Cryogonal Shelmet Accelgor Stunfisk Mienfoo Mienshao Druddigon Golett Golurk Pawniard Bisharp
Bouffalant Rufflet Braviary Vullaby Mandibuzz Heatmor Durant Deino Zweilous Hydreigon Larvesta Volcarona Cobalion
Terrakion Virizion Tornadus Thundurus Reshiram Zekrom Landorus Kyurem Keldeo Meloetta Genesect""".split()
EN_MOVES = [m.strip() for m in """Hone Claws|Wide Guard|Guard Split|Power Split|Wonder Room|Psyshock|Venoshock|Autotomize|Rage Powder|
Telekinesis|Magic Room|Smack Down|Storm Throw|Flame Burst|Sludge Wave|Quiver Dance|Heavy Slam|Synchronoise|Electro Ball|
Soak|Flame Charge|Coil|Low Sweep|Acid Spray|Foul Play|Simple Beam|Entrainment|After You|Round|Echoed Voice|Chip Away|
Clear Smog|Stored Power|Quick Guard|Ally Switch|Scald|Shell Smash|Heal Pulse|Hex|Sky Drop|Shift Gear|Circle Throw|
Incinerate|Quash|Acrobatics|Reflect Type|Retaliate|Final Gambit|Bestow|Inferno|Water Pledge|Fire Pledge|Grass Pledge|
Volt Switch|Struggle Bug|Bulldoze|Frost Breath|Dragon Tail|Work Up|Electroweb|Wild Charge|Drill Run|Dual Chop|
Heart Stamp|Horn Leech|Sacred Sword|Razor Shell|Heat Crash|Leaf Tornado|Steamroller|Cotton Guard|Night Daze|Psystrike|
Tail Slap|Hurricane|Head Charge|Gear Grind|Searing Shot|Techno Blast|Relic Song|Secret Sword|Glaciate|Bolt Strike|
Blue Flare|Fiery Dance|Freeze Shock|Ice Burn|Snarl|Icicle Crash|V-create|Fusion Flare|Fusion Bolt""".replace('\n', '').split('|')]
assert len(EN_SPECIES) == 156 and len(EN_MOVES) == 92, (len(EN_SPECIES), len(EN_MOVES))

TYPE = lambda t: t if t < 9 else t + 1  # Black has no ??? type; the game keeps Gen 4's, which has it at 9
CAT = {0: 2, 1: 0, 2: 1}                # Black: status, physical, special -> the game: physical, special, status
# Black's targets -> the game's (Gen 4's): one foe 0, both foes 4, everyone else 8, the user 16
TARGET = {0: 0, 1: 0, 2: 16, 3: 0, 4: 8, 5: 4, 6: 32, 7: 16, 8: 8, 9: 2, 10: 64, 11: 128, 12: 32, 13: 0}
HIT_STATUS = {1: 6, 3: 5, 4: 4, 5: 2}   # paralysis, freeze, burn, poison -> the game's hit-status effects
STAT = {1: 'atk', 2: 'def', 3: 'spa', 4: 'spd', 5: 'spe', 6: 'acc', 7: 'eva'}
FOE_DROP = {'atk': 68, 'def': 69, 'spe': 70, 'spa': 71, 'spd': 72, 'acc': 73}
SELF_UP = {('atk', 1): 10, ('def', 1): 11, ('spe', 1): 12, ('spa', 1): 13, ('spd', 1): 14, ('eva', 1): 16,
           ('atk', 2): 50, ('def', 2): 51, ('spe', 2): 52}
STATUS_MOVE = {2: 1, 5: 66, 1: 67}       # sleep, poison, paralysis caused by a status move
LEVEL_METHODS = {4, 9, 10, 11, 12, 13, 14, 15, 20, 21, 22, 23}  # plain level-up and the level variants


def move_entry(i, b, name_ko):
    mtype, _quality, cat, power, acc, pp = b[0], b[1], b[2], b[3], b[4], b[5]
    status, chance = struct.unpack_from('<H', b, 8)[0], b[10]
    drain, heal, target = struct.unpack_from('<b', b, 0x12)[0], b[0x13], b[0x14]
    stats, changes, chances = b[0x15:0x18], struct.unpack_from('<3b', b, 0x18), b[0x1B:0x1E]
    effect, ch = 0, 0
    if CAT[cat] != 2:
        if status in HIT_STATUS and chance:
            effect, ch = HIT_STATUS[status], chance
        elif stats[0] in STAT and changes[0] < 0 and STAT[stats[0]] in FOE_DROP:
            effect, ch = FOE_DROP[STAT[stats[0]]], chances[0] or 100
        elif drain >= 50:
            effect = 3
        elif drain < 0:
            effect = 48
    else:
        if status in STATUS_MOVE:
            effect = STATUS_MOVE[status]
        elif heal >= 50 and TARGET.get(target) == 16:
            effect = 32
        elif stats[0] in STAT and changes[0] > 0 and (STAT[stats[0]], min(2, changes[0])) in SELF_UP:
            effect = SELF_UP[(STAT[stats[0]], min(2, changes[0]))]
        elif stats[0] in STAT and changes[0] < 0:
            effect = {'atk': 18, 'def': 19, 'spe': 20, 'spa': 21, 'spd': 22, 'acc': 23}.get(STAT[stats[0]], 0)
    return {'id': i, 'name': name_ko, 'effect': effect, 'cat': CAT[cat], 'power': power, 'type': TYPE(mtype),
            'acc': 0 if acc > 100 else acc, 'pp': pp, 'chance': ch, 'target': TARGET.get(target, 0), 'en': EN_MOVES[i - 468]}


def main():
    rom = ndsfs.Rom(ROM)
    personal = ndsfs.narc(rom.find('a/0/1/6'))
    learn = ndsfs.narc(rom.find('a/0/1/8'))
    evos = ndsfs.narc(rom.find('a/0/1/9'))
    moves = ndsfs.narc(rom.find('a/0/2/1'))
    text = ndsfs.narc(rom.find('a/0/0/2'))
    names, mnames = bwtext.strings(text[70]), bwtext.strings(text[203])
    dex = json.load(open(DEX, encoding='utf-8'))
    sp_list, mv_list = dex['species'], dex['moves']
    for i in range(len(mv_list), 560):
        mv_list.append(move_entry(i, moves[i], mnames[i]))
    for sp in range(len(sp_list), 650):
        p = personal[sp]
        hp, atk, df, spe, spa, spd = p[0:6]
        types = [TYPE(p[6])] + ([TYPE(p[7])] if p[7] != p[6] else [])
        base_exp = struct.unpack_from('<H', p, 0x22)[0]
        kg = struct.unpack_from('<H', p, 0x26)[0] / 10
        ls, k = [], 0
        while k + 4 <= len(learn[sp]):
            mv, lv = struct.unpack_from('<HH', learn[sp], k)
            k += 4
            if mv == 0xFFFF:
                break
            ls.append([lv, mv])
        entry = {'id': sp, 'name': names[sp], 'base': [hp, atk, df, spa, spd, spe], 'types': types, 'exp': base_exp,
                 'learn': ls, 'en': EN_SPECIES[sp - 494], 'kg': kg}
        for j in range(7):
            method, param, to = struct.unpack_from('<HHH', evos[sp], 6 * j)
            if method in LEVEL_METHODS and to:
                entry['evo'] = [4, param, to]
                break
            if method and to and 'evo' not in entry:  # stones, trades and friendship: level 36 here
                entry['evo'] = [4, 36, to]
        sp_list.append(entry)
    json.dump(dex, open(DEX, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('species', len(sp_list), 'moves', len(mv_list))


if __name__ == '__main__':
    main()
