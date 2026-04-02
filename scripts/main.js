
Hooks.on("3DCanvasMapmakingPackRegisterAssetPacks", (ab) => {
    ab.registerPack(
        "canvas3dcompendium",
        "Mapmaking Pack",
        [
            {
                name: "Items",
                query: "RPG Items,CreativeTrio/Potions",
            },
            {
                name: "Furniture",
                query: "Furniture",
            },
            {
                name: "Dungeon",
                query: "KayKitPack/Dungeon,Kenney/Medieval,Tiles/Medieval Dungeon,Tiles/Modular Ruins",
            },
            {
                name: "Dungeon Set",
                query: "KayKitPack/Dungeon/Remastered",
            },
            {
                name: "Nature",
                query: "nature",
            },
            {
                name: "Rock Formations",
                query: "Rocks_highend,Rocks_desert,Rocks_runic",
            },
            {
                name: "Sci-Fi",
                query: "scifi,cyberpunk,space",
            },
            {
                name: "Structures",
                query: "buildings,Ultimate Fantasy",
            },
            {
                name: "Bridges",
                query: "CreativeTrio/Bridges",
            },
            {
                name: "Doors",
                query: "door,gate,arch",
            },
            {
                name: "Fences",
                query: "fence,pole,board",
            },
            {
                name: "Vegetation",
                query: "CreativeTrio/FlowersPlants,CreativeTrio/Mushrooms,CreativeTrio/Trees,Tiles/Stylized Trees",
            },
            {
                name: "Grass & Shrubs",
                query: "Vegetation_billboard/high_res",
            },
            {
                name: "Crops",
                query: "Crops",
            },
            {
                name: "Food",
                query: "food",
            },
        ],
        {
            subfolder: "assets/Tiles",
        },
    );
});