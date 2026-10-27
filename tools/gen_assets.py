"""Batch-generate all fal source images (textures, props, era art). Idempotent: skips existing files."""
import shutil
import os
from concurrent.futures import ThreadPoolExecutor
from fal_gen import generate, RAW_DIR

DEV = "fal-ai/flux/dev"
PIX = "pixel art, 16-bit Nintendo DS Pokemon game style, limited color palette, crisp pixel clusters, no text, no letters, no watermark"
TEX = ("2x2 grid of four seamless tileable textures, flat orthographic top-down view, each square uniformly "
       "filled edge to edge with no objects and no border: ")
PROP = ("2x2 sprite sheet of four separate game objects on a plain pure white background, each seen from the "
        "front and slightly above like objects in Pokemon Diamond overworld: ")
ART = ("wide panoramic pixel art illustration, Nintendo DS RPG cutscene, 16-bit, limited 32-color palette, "
       "soft dithering, no text, no letters, no watermark, ")

TEXTURES = {
    "tex_ground_b": "top-left fresh white snow, top-right pale beach sand, bottom-left dry fallen autumn leaves on brown soil, bottom-right dark polished wooden floor boards",
    "tex_mats_a": "top-left rows of black korean giwa roof tiles seen from above, top-right golden straw thatch roof, bottom-left white lime plaster wall, bottom-right dark brown wooden planks",
    "tex_mats_b": "top-left grey granite fortress wall blocks, top-right red clay bricks, bottom-left green and red korean dancheong painted pattern, bottom-right cream hanji mulberry paper",
    "tex_dun_1": "top-left rocky mountain dirt path with gravel, top-right mossy grey granite boulders cliff, bottom-left forest floor with pine needles and leaves, bottom-right dense dark green pine tree canopy",
    "tex_dun_2": "top-left old wooden library floor, top-right rows of old books on shelves seen from above, bottom-left wet sand shoal with small shells, bottom-right jagged dark sea rocks with white foam",
    "tex_dun_3": "top-left deep blue sea water with waves, top-right snowy stone pavement, bottom-left snow covered grey stone fortress wall top, bottom-right icy frozen ground",
    "tex_dun_4": "top-left dusty gravel quarry ground, top-right cut granite blocks, bottom-left earthen fort ground with grass patches, bottom-right stone rampart blocks",
    "tex_dun_5": "top-left riveted iron floor plates, top-right red brick wall with copper pipes, bottom-left old cobblestone street, bottom-right dark grey slate rooftops",
    "tex_dun_6": "top-left dark autumn birch forest floor, top-right dense birch and pine forest canopy, bottom-left glowing cosmic crystal floor, bottom-right swirling purple and blue void with stars",
}
PROPS = {
    "prop_trees": "top-left korean red pine tree, top-right persimmon tree with orange fruit, bottom-left cherry blossom tree, bottom-right cluster of green bamboo",
    "prop_village": "top-left cluster of brown onggi earthenware jars on a stone platform, top-right stone lantern, bottom-left wooden notice board with paper notices, bottom-right stack of wooden logs",
    "prop_ships": "top-left korean turtle ship geobukseon seen from above, top-right korean panokseon wooden warship seen from above, bottom-left small wooden fishing boat seen from above, bottom-right wooden pier dock",
    "prop_winter": "top-left snow covered pine tree, top-right korean stone pagoda, bottom-left haetae stone statue, bottom-right bare winter tree",
    "prop_modern": "top-left 1900s korean electric streetcar tram, top-right wooden telegraph pole, bottom-left iron street lamp post, bottom-right wooden rickshaw",
    "prop_camp": "top-left canvas military tent, top-right campfire with logs, bottom-left stack of wooden supply crates, bottom-right wooden watchtower",
}
ARTS = {
    "art_title": "Joseon dynasty Korea at dawn, Gyeongbokgung palace roofs in front of misty Bugaksan mountain, cherry blossom petals drifting, golden sunrise sky",
    "art_e1": "1395 Hanyang, newly built Gyeongbokgung palace and Gwanghwamun gate with workers carrying timber, Bugaksan mountain behind, morning mist",
    "art_e2": "1440s Joseon royal academy hall with scholars' wooden desks, brushes, ink stones and stacked books, bronze rain gauge in a sunny courtyard, warm light",
    "art_e3": "1592 Joseon navy turtle ships and panokseon warships sailing in crane wing formation near Hansando island, dramatic orange sunset sea, cannon smoke",
    "art_e4": "1636 Namhansanseong mountain fortress stone walls and gate in a heavy winter snowstorm at night, red lanterns glowing",
    "art_e5": "1796 Suwon Hwaseong fortress Janganmun gate under construction, wooden geojunggi crane lifting granite blocks, colorful royal banners, clear autumn sky",
    "art_e6": "1871 Ganghwa island coastal stone fort on a cliff with old cannons on the ramparts, steam warships on the grey horizon, stormy clouds",
    "art_e7": "1897 Seoul street of the Korean Empire at dusk, early electric streetcar tram and telegraph poles, hanok roofs mixed with western stone buildings, electric lamps glowing",
    "art_e8": "1919 spring in Seoul, crowd of people in white hanbok gathered in front of the octagonal pavilion of Tapgol park, solemn and hopeful mood",
    "art_e9": "1920 autumn birch forest in Manchuria, Korean independence army camp with canvas tents and campfire smoke, misty mountains at dawn",
    "art_e10": "15 August 1945 Seoul, bright summer blue sky, joyful crowd in white clothes celebrating in a wide street, hanok roofs, sunlight",
    "art_end": "sunrise over layered Korean mountains and the Han river, peaceful golden light, birds flying",
}


def main():
    jobs = []
    for name, p in TEXTURES.items():
        jobs.append((name, DEV, TEX + p + ". " + PIX, 992, 992))
    for name, p in PROPS.items():
        jobs.append((name, DEV, PROP + p + ". " + PIX, 992, 992))
    for name, p in ARTS.items():
        jobs.append((name, DEV, ART + p, 1328, 752))
    with ThreadPoolExecutor(4) as ex:
        for f in [ex.submit(generate, *j) for j in jobs]:
            f.result()
    # the first test sheet already covers dirt / grass / flagstone / water
    a = os.path.join(RAW_DIR, "tex_ground_a.png")
    if not os.path.exists(a):
        shutil.copy(os.path.join(RAW_DIR, "test_texsheet.png"), a)


if __name__ == "__main__":
    main()
