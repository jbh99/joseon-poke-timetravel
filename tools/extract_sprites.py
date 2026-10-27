"""Extract front sprites (normal + shiny) and party icons; derive a shiny icon for every species."""
import numpy as np
from romlib import narc, ncgr_raw, decrypt_dp, nibbles_linear, nibbles_tiled, nclr_palettes, to_image, \
    front_index

OUT = "../web/assets/poke"
ICON_PAL_TABLE = np.load("../work/iconpal_table.npy")  # from ARM9 @ 0xF36C4
SHINY_ICON_SPECIES = range(1, 494)  # every shiny recruit keeps its colours in lists and, for Gen 4, in the field


def save_png(img, path):
    img.save(path, optimize=True)


def main():
    g = narc("poketool/pokegra/pokegra.narc")
    ic = narc("poketool/icongra/poke_icon.narc")
    icon_pals = nclr_palettes(ic[0])[:3]
    for sp in range(1, 494):
        raw, _ = ncgr_raw(g[front_index(g, sp)])
        grid = nibbles_linear(decrypt_dp(raw), 160, 80)
        pal = nclr_palettes(g[6 * sp + 4])[0]
        spal = nclr_palettes(g[6 * sp + 5])[0]
        save_png(to_image(grid, pal), f"{OUT}/front/{sp}.png")
        save_png(to_image(grid, spal), f"{OUT}/front/{sp}s.png")

        iraw, _ = ncgr_raw(ic[7 + sp])
        igrid = nibbles_tiled(iraw, 32, 64)
        ipal = icon_pals[ICON_PAL_TABLE[sp]]
        save_png(to_image(igrid, ipal), f"{OUT}/icon/{sp}.png")
        if sp in SHINY_ICON_SPECIES:
            # Icons have no shiny palette: map each icon colour to the nearest normal battle colour,
            # then take that slot's shiny colour.
            used = sorted({v for row in igrid for v in row if v})
            normal = np.array(pal[1:], float)
            shiny_ipal = list(ipal)
            for k in used:
                d = np.linalg.norm(normal - np.array(ipal[k], float), axis=1)
                j = int(np.argmin(d))
                if d[j] < 60:
                    shiny_ipal[k] = spal[1 + j]
            save_png(to_image(igrid, shiny_ipal), f"{OUT}/icon/{sp}s.png")
    print("done")


if __name__ == "__main__":
    main()
