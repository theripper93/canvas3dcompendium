import os
import re
import json

script_directory = os.path.dirname(os.path.abspath(__file__))

STYLES = ["fantasy", "toy", "scifi", "modern", "nature", "other"]
CATEGORIES = ["buildings", "furniture", "storage", "lighting", "tableware", "items", "decor", "dungeon", "trees", "rocks", "creatures", "vehicles", "billboards"]

FOLDERS = {
    "Animated Animals": ("fantasy", "creatures", {"fixed": True}),
    "BasicShapes": ("other", "decor", {"fixed": True}),
    "Bones Pack": ("fantasy", "dungeon", {"fixed": True}),
    "Buildings": ("modern", "buildings", {}),
    "Cobwebs": ("fantasy", "dungeon", {"fixed": True}),
    "CreativeTrio/Bridges": ("toy", "buildings", {"fixed": True}),
    "CreativeTrio/Doors": ("toy", "buildings", {"fixed": True}),
    "CreativeTrio/Fences": ("toy", "buildings", {"fixed": True}),
    "CreativeTrio/FlowersPlants": ("toy", "trees", {"fixed": True}),
    "CreativeTrio/Furniture": ("toy", "furniture", {"fixed": True}),
    "CreativeTrio/Mushrooms": ("toy", "trees", {"fixed": True}),
    "CreativeTrio/Potions": ("toy", "items", {"fixed": True}),
    "CreativeTrio/Trees": ("toy", "trees", {"fixed": True}),
    "Crops": ("nature", "trees", {"fixed": True}),
    "Cyberpunk Pack": ("scifi", "decor", {}),
    "Desert Pack": ("nature", "trees", {"fixed": True}),
    "Downtown City MegaKit": ("modern", "buildings", {"kit": "Downtown City MegaKit"}),
    "Dungeon Crawler Kit": ("fantasy", "buildings", {"kit": "Dungeon Crawler Kit"}),
    "Dungeon Props": ("fantasy", "dungeon", {}),
    "Fantasy Props MegaKit": ("fantasy", "decor", {}),
    "FantasyWeapons": ("fantasy", "items", {"fixed": True}),
    "Food": ("fantasy", "tableware", {"fixed": True}),
    "Furniture": ("modern", "furniture", {}),
    "KayKitPack/Dungeon/Remastered": ("toy", "decor", {"kit": "KayKit Dungeon Remastered"}),
    "KayKitPack/Dungeon": ("toy", "decor", {"kit": "KayKit Dungeon"}),
    "KayKitPack/Medieval Builder": ("toy", "buildings", {"kit": "KayKit Medieval Builder", "allKit": True}),
    "KayKitPack/Mini-Game Variety": ("toy", "decor", {"kit": "KayKit Mini-Game"}),
    "KayKitPack/Spooktober": ("toy", "decor", {"kit": "KayKit Spooktober"}),
    "Kenney/City": ("toy", "buildings", {"kit": "Kenney City"}),
    "Kenney/ConveyorKit": ("toy", "buildings", {"kit": "Kenney Conveyor Kit", "allKit": True}),
    "Kenney/Food": ("toy", "tableware", {"fixed": True}),
    "Kenney/Graveyard": ("toy", "dungeon", {"kit": "Kenney Graveyard"}),
    "Kenney/Medieval": ("toy", "buildings", {"kit": "Kenney Medieval", "allKit": True}),
    "Kenney/Nature": ("toy", "trees", {"kit": "Kenney Nature"}),
    "Kenney/Space": ("toy", "decor", {"kit": "Kenney Space"}),
    "Kenney/Urban 2": ("toy", "buildings", {"kit": "Kenney Urban"}),
    "Kenney/Urban": ("toy", "buildings", {"kit": "Kenney Urban"}),
    "Medieval Dungeon": ("fantasy", "dungeon", {"kit": "Medieval Dungeon"}),
    "Medieval Village MegaKit": ("fantasy", "buildings", {"kit": "Medieval Village MegaKit"}),
    "MedievalWeapons": ("fantasy", "items", {"fixed": True}),
    "Modular Dungeon": ("fantasy", "dungeon", {"kit": "Modular Dungeon"}),
    "Modular Medieval Buildings/Props": ("fantasy", "decor", {}),
    "Modular Medieval Buildings": ("fantasy", "buildings", {"kit": "Modular Medieval Buildings"}),
    "Modular Ruins": ("fantasy", "buildings", {"kit": "Modular Ruins"}),
    "Modular Scifi/Details": ("scifi", "decor", {"kit": "Modular Sci-Fi"}),
    "Modular Scifi": ("scifi", "buildings", {"kit": "Modular Sci-Fi"}),
    "Nature": ("nature", "trees", {}),
    "Old Mine": ("fantasy", "dungeon", {}),
    "RPG Items": ("fantasy", "items", {}),
    "Rocks_desert": ("nature", "rocks", {"fixed": True}),
    "Rocks_highend": ("nature", "rocks", {"fixed": True}),
    "Rocks_runic": ("nature", "rocks", {"fixed": True}),
    "Sci-Fi Essentials Kit": ("scifi", "decor", {}),
    "SciFi MegaKit/Aliens": ("scifi", "creatures", {"fixed": True}),
    "SciFi MegaKit/Decals": ("scifi", "decor", {"fixed": True}),
    "SciFi MegaKit/Props": ("scifi", "decor", {"kit": "SciFi MegaKit"}),
    "SciFi MegaKit": ("scifi", "buildings", {"kit": "SciFi MegaKit", "allKit": True}),
    "Ships": ("fantasy", "vehicles", {"fixed": True}),
    "Stylized Nature MegaKit": ("nature", "trees", {}),
    "Stylized Trees": ("nature", "trees", {}),
    "Ultimate Fantasy": ("fantasy", "buildings", {}),
    "UltimateSpaceScifi": ("scifi", "buildings", {"kit": "Ultimate Space Sci-Fi"}),
    "wooden_bridge": ("fantasy", "buildings", {"kit": "Wooden Bridge", "allKit": True}),
}

KIT = r"\b(walls?|wall [a-c]|floors?|floor ?decoration|roofs?|corners?|tiles?|overhang|stairs?|staircase|steps|door ?frame|frame|trim|partition|cornice|foundation|road|roads|path|driveway|ground|terrain|platform|corridor|scaffold\w*|scaffolding|battlement|balcony|beams?|columns?|pillars?|structure|cover|hole ?cover|border|dormer|chimney|windows?|window ?shutters|doors?|doorway|arch|arches|ramp|connector|support|supports|sidewalk|pipe|pipes|conveyor|hopper|crops dirt\w*|cliff|short ?wall|bricks?|concrete|curve)\b"

RULES = [
    ("decor", r"\b(statue|statues)\b"),
    ("furniture", r"\b(book ?case|book ?shelf|bookshelf|book ?stand|weapon ?(stand|rack)|peg ?rack|hammer ?rack|shelf|shelves|shelf)\b"),
    ("tableware", r"\btable (fork|knife|spoon|plate)\b"),
    ("dungeon", r"\b(wall ?chain|chains?|chain ?coil|cobwebs?)\b"),
    ("decor", r"\b(banners?|banner|flags?|signs?|sign|decals?|vines?|awning|awnings|mirror\d*|towel|toilet ?paper\w*)\b"),
    ("items", r"\b(coins?|coin)\b"),
    ("lighting", r"\b(torch|torches|torch|candles?|candle|candle ?stick\w*|lanterns?|lantern|chandelier|brazier|lamps?|lamp ?post|lights?|light|lightpost\w*|fire ?basket|fire ?pit|bonfire|campfire|woodfire)\b"),
    ("creatures", r"\b(character|characer|alien|aliens|astronaut|ghost|skeleton|zombie|vampire|digger)\b"),
    ("vehicles", r"\b(wagon|carts?|boat|boats|ships?|canoe|rover|craft|truck|train|spaceship|rocket|lifeboat|sail)\b"),
    ("@kit", KIT),
    ("buildings", r"\b(fences?|fence|gates?|gate|bridges?|bridge|rails?|railing|barriers?|barrier|houses?|house|building|buildings|barn|silo|hangar|castle|towers?|tower|mill|windmill|watermill|lumbermill|sawmill|temple|inn|stable|market|market ?stand|barracks|archery\w*|blacksmith|watchtower|watch ?tower|well|tent|gazebo|stalls?|stall|dock|wonder|skyscraper|coop|dome|satellite ?dish\w*|solar ?panel|tunnel|bell ?tower|hospital|bank|shop|water ?tower)\b"),
    ("storage", r"\b(barrels?|barrel|crates?|crate|chests?|chest|box|boxes|box|bags?|bag|sacks?|keg|kegs|trunk|trunks|buckets?|bucket|baskets?|pouch|pouches|containers?|container ?full|packages?|package|ammo|loot ?sack|lootbox|vessel|tank|hay|vases?)\b"),
    ("furniture", r"\b(tables?|table|chairs?|chair|stools?|bench|benches|beds?|bed|bunk|sofas?|sofa|couch|desk|desks|drawers?|dresser|night ?stand|nightstand|wardrobe|closet\w*|closets?|cabinets?|cabinet|kitchen|bathroom|bathtub|toilet\d*|shower\d*|sink|fridge|oven|fireplace|workbench|anvil|anvils|bellows|throne|carpets?|rugs?|rug|counter|locker|computers?|computer|tv|item ?holder|pipe ?holder|pod|curtains|whetstone|dummy|target|cauldron)\b"),
    ("tableware", r"\b(plates?|plate|mugs?|cups?|cup|chalice|chalices|forks?|knife|knives|spoons?|bottles?|bottle|small ?bottles?|glass|glasses|pans?|pots?|pot ?lid|cooking ?pot\w*|bowls?|jars?|kettle|tankard|goblet|teapot|bread|cheese|meat|fish|apples?|carrot|leek|radish|tomato|soda|wine|utensil|cutting ?board\w*|rolling ?pin|whisk|candy|candy|lollipop|chicken ?leg|lollipops?|cake)\b"),
    ("items", r"\b(swords?|sword|axe|axes|axe|daggers?|dagger|hammers?|hammer|maces?|spears?|halberd|pole ?arm\w*|bows?|bow|crossbows?|crossbow|quiver|arrows?|arrow|shields?|shield|staff|staff|katana|greatsword|great ?axe|war ?hammer|pickaxe\w*|pickaxes?|shovels?|shovel|hoe|hoes|hoe|potions?|potion|potion\d+|scrolls?|scroll|books?|book|book\d+|spell ?book|pages?|page|parchment|keys?|key|key\d+|keyring|rings?|ring\d+|necklace\d*|crown\d*|crystal\d*|gems?|gold ?ingots|ingots?|mineral|helmet|armor|glove|backpack|padlock|dynamite|plunger|guns?|gun|rifle|pistol|revolver|sniper|grenade|syringe|health ?pack\w*|key ?card|pickup|collectible|artifact|blaster|bomb|slingshot|hearts?|heart|stars?|diamond|snowflake\d*|weapon|turret|darts?|dart|runes|lightning|powerup)\b"),
    ("dungeon", r"\b(skulls?|skull|bones?|bone ?pile|coffins?|coffin|sarcophagus|graves?|grave|gravestone|tombstone|tomb|crypt|crypt|spikes?|spike|traps?|trap|trapdoor|cages?|cage|altar|shrine|urn|head ?clamp|rubble|debris|bear ?trap|pillory|cross|cross|obelisk|iron ?bars)\b"),
    ("trees", r"\b(trees?|tree|pines?|pine|birch|willow|maple|cherry|palm|bush|bushes|bush|shrubs?|plants?|plant|houseplant|flowers?|flower|grass|grass|ferns?|mushrooms?|mushroom|cactus|cacti|cactus|crops?|crop|lily|lilypad|clover|petals?|bamboo|wheat|corn|moss|hanging ?moss|logs?|log|wood ?log|stumps?|stump|tree ?stump|reeds?|planters?|planter|giant ?pine|tall ?thick|leafs?|ivy)\b"),
    ("rocks", r"\b(rocks?|rock|stones?|stone|boulders?|pebbles?|pebble|mountain|mountains?|meteor|craters?|crater|formation|cluster|flat ?cluster|slanted ?rock)\b"),
    ("decor", r"\b(vases?|vase|rug|pedestal\d*|target|clock|painting|vent|vents|fan|cable|cables|antenna|ac|ac|clamp|umbrella|dumpster|trashcan|bollard|manhole|drain|bell|pumpkins?|pumpkin|jackolantern|teleporter|laser|details?|smoke)\b"),
]

PALETTE_STRONG = {"lights": "lighting", "storage": "storage", "trees": "trees", "plants": "trees", "rocks": "rocks"}
PALETTE_WEAK = {"furniture": "furniture", "structures": "buildings", "tabletop": "tableware", "wallDecor": "decor", "clutter": "decor"}


def words(name):
    name = re.sub(r"\.(glb|gltf|webp)$", "", name, flags=re.I)
    name = name.replace("%20", " ")
    name = re.sub(r"([a-z])([A-Z])", r"\1 \2", name)
    name = re.sub(r"([A-Za-z])(\d)", r"\1 \2", name)
    name = re.sub(r"[_\-.()]+", " ", name)
    return re.sub(r"\s+", " ", name).strip().lower()


def folder_of(path):
    folder = path.rsplit("/", 1)[0] if "/" in path else ""
    for prefix in sorted(FOLDERS, key=len, reverse=True):
        if folder == prefix or folder.startswith(prefix + "/"):
            return prefix
    return None


COMPILED = [(c, re.compile(p)) for c, p in RULES]
KIT_RE = re.compile(KIT)


def classify(path, palette, overrides):
    prefix = folder_of(path)
    style, default, opts = FOLDERS.get(prefix, ("other", "decor", {}))
    name = path.rsplit("/", 1)[-1]
    w = words(name)
    kit = opts.get("kit")
    category = None
    piece = False
    base = re.sub(r"_Worn(\.glb)$", r"\1", path)
    pal = palette.get(path) or palette.get(base)
    if pal in PALETTE_STRONG:
        category = PALETTE_STRONG[pal]
    if category is None and opts.get("fixed"):
        category = default
    if category is None and opts.get("allKit"):
        category, piece = "buildings", True
    if category is None:
        for c, rx in COMPILED:
            if not rx.search(w):
                continue
            if c == "@kit":
                category, piece = "buildings", True
            else:
                category = c
            break
    if category is None and pal in PALETTE_WEAK:
        category = PALETTE_WEAK[pal]
    if category is None:
        category = default
    if category == "buildings" and kit and not piece:
        piece = bool(KIT_RE.search(w)) or opts.get("allKit", False)
    if style == "fantasy" and category in ("trees", "rocks"):
        style = "nature"
    entry = {"s": style, "c": category, "k": piece}
    for key, value in overrides.items():
        if key == path or (key.startswith("re:") and re.search(key[3:], path)):
            entry.update(value)
    out = [entry["s"], entry["c"]]
    if entry["c"] == "buildings" and entry["k"]:
        out.append(1)
    return out


def load(name, fallback):
    p = os.path.join(script_directory, name)
    if not os.path.exists(p):
        return fallback
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def main():
    index = load("index.json", [])
    palette = load("place_palette.json", {})
    overrides = load("tag_overrides.json", {})
    assets = {path: classify(path, palette, overrides) for path in sorted(index)}
    kits = {prefix: opts["kit"] for prefix, (_, _, opts) in FOLDERS.items() if opts.get("kit")}
    data = {
        "styles": STYLES,
        "categories": CATEGORIES,
        "rules": [[c, p] for c, p in RULES],
        "kits": kits,
        "assets": assets,
    }
    output_file = os.path.join(script_directory, "tags.json")
    with open(output_file, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, separators=(",", ":"))
    counts = {}
    for s, c, *_ in assets.values():
        counts[c] = counts.get(c, 0) + 1
    print(f"Tags saved to {output_file}: {len(assets)} assets")
    for c in CATEGORIES:
        print(f"  {c}: {counts.get(c, 0)}")


if __name__ == "__main__":
    main()
