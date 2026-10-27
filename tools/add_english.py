"""Add English species / move / type names to dex.json.

The Korean ROM only carries Korean text, so English names come from PokeAPI's public CSV tables
(pokemon_species_names.csv, move_names.csv). The Korean column of those tables is compared with the
ROM's own names to confirm the id mapping before anything is written.
usage: python add_english.py <dir with the two csv files>
"""
import csv
import json
import sys
from pathlib import Path

DEX = Path(__file__).resolve().parent.parent / "web/assets/data/dex.json"
KO, EN = "3", "9"  # PokeAPI local_language_id
TYPES_EN = ["Normal", "Fighting", "Flying", "Poison", "Ground", "Rock", "Bug", "Ghost", "Steel", "???",
            "Fire", "Water", "Grass", "Electric", "Psychic", "Ice", "Dragon", "Dark"]


def names(path, key):
    out = {KO: {}, EN: {}}
    with open(path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["local_language_id"] in out:
                out[row["local_language_id"]][int(row[key])] = row["name"]
    return out


def main(src):
    d = json.loads(DEX.read_text(encoding="utf-8"))
    sp = names(Path(src) / "pokemon_species_names.csv", "pokemon_species_id")
    mv = names(Path(src) / "move_names.csv", "move_id")
    for label, table, rows in (("species", sp, d["species"]), ("moves", mv, d["moves"])):
        same = diff = 0
        for i, row in enumerate(rows):
            if not row or i == 0:
                continue
            en = table[EN].get(i)
            if not en:
                raise SystemExit(f"no English name for {label} {i}")
            row["en"] = en
            ko = table[KO].get(i, "").replace(" ", "")
            if ko == row["name"].replace(" ", ""):
                same += 1
            else:
                diff += 1
        print(f"{label}: {same} Korean names match the ROM, {diff} differ (romanisation updates)")
        if same < diff * 3:
            raise SystemExit(f"{label}: id mapping looks wrong")
    d["types_en"] = TYPES_EN
    DEX.write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    main(sys.argv[1])
