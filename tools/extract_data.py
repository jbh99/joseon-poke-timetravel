"""Extract species/move data and Korean names from the ROM into web/assets/data/dex.json."""
import json
import struct
from romlib import narc, msg_entries

OUT = "../web/assets/data/dex.json"
KS = [bytes([0xB0 + i // 94, 0xA1 + i % 94]).decode("euc-kr") for i in range(2350)]
SPECIAL = {0x1AB: "!", 0x1AC: "?", 0x1AD: ",", 0x1AE: ".", 0x1DE: " ", 0x1E2: " ", 0xE000: "\n",
           0x1B1: "'", 0x1BE: "-", 0x1C4: "~", 0x1AF: "…", 0x1B3: "(", 0x1B4: ")", 0x1C7: ":"}


def decode(codes):
    out, i = [], 0
    while i < len(codes):
        c = codes[i]
        if c == 0xFFFF:
            break
        if c == 0xFFFE:  # control: cmd, argc, args...
            i += 3 + codes[i + 2]
            continue
        if 0x401 <= c < 0x401 + 2350:
            out.append(KS[c - 0x401])
        elif 0x121 <= c <= 0x12A:
            out.append(chr(ord("0") + c - 0x121))
        elif 0x12B <= c <= 0x144:
            out.append(chr(ord("A") + c - 0x12B))
        elif 0x145 <= c <= 0x15E:
            out.append(chr(ord("a") + c - 0x145))
        elif c in SPECIAL:
            out.append(SPECIAL[c])
        i += 1
    return "".join(out)


def text_file(idx):
    return [decode(e) for e in msg_entries(MSG[idx])]


MSG = narc("msgdata/msg.narc")


def find_file(n_entries, probe_index, probe_text):
    for i, d in enumerate(MSG):
        try:
            e = msg_entries(d)
        except Exception:
            continue
        if len(e) == n_entries and decode(e[probe_index]) == probe_text:
            return i
    raise LookupError(probe_text)


def main():
    species_names = text_file(357)
    move_file = find_file(468, 33, "몸통박치기")
    move_names = text_file(move_file)
    type_names = ["노말", "격투", "비행", "독", "땅", "바위", "벌레", "고스트", "강철", "???",
                  "불꽃", "물", "풀", "전기", "에스퍼", "얼음", "드래곤", "악"]

    personal = narc("poketool/personal_pearl/personal.narc")
    learn = narc("poketool/personal/wotbl.narc")
    evo = narc("poketool/personal/evo.narc")
    species = []
    for sp in range(494):
        p = personal[sp]
        hp, atk, df, spe, spa, spd, t1, t2 = p[:8]
        moves = []
        ld = learn[sp]
        for j in range(0, len(ld) - 1, 2):
            v = struct.unpack_from("<H", ld, j)[0]
            if v == 0xFFFF:
                break
            moves.append([v >> 9, v & 0x1FF])
        entry = {"id": sp, "name": species_names[sp], "base": [hp, atk, df, spa, spd, spe],
                 "types": sorted({t1, t2}, key=[t1, t2].index), "exp": p[9], "learn": moves}
        for k in range(7):  # first level-up evolution (method 4); friendship evolutions treated as Lv 24
            method, param, target = struct.unpack_from("<HHH", evo[sp], k * 6)
            if method == 4 and target:
                entry["evo"] = [4, param, target]
                break
            if method in (1, 2, 3) and target:
                entry["evo"] = [4, 24, target]
                break
        species.append(entry)

    waza = narc("poketool/waza/waza_tbl.narc")
    moves = []
    for m, d in enumerate(waza[:468]):
        effect, cat, power, typ, acc, pp, chance = struct.unpack_from("<HBBBBBB", d, 0)
        target = struct.unpack_from("<H", d, 8)[0]
        moves.append({"id": m, "name": move_names[m], "effect": effect, "cat": cat, "power": power,
                      "type": typ, "acc": acc, "pp": pp, "chance": chance, "target": target})

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"types": type_names, "species": species, "moves": moves}, f, ensure_ascii=False,
                  separators=(",", ":"))
    print("moves file", move_file, "species", len(species), "moves", len(moves))


if __name__ == "__main__":
    main()
