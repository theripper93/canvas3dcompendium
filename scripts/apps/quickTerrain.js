import {getFiles} from "./assetBrowser.js";
import {AssetBrowser} from "./assetBrowser.js";
import { MatrixEditor } from "./matrixEditor.js";

let fileCache = null;
let dataCache = null;

let _this = null;

export class QuickTerrain extends FormApplication {
    constructor (createOnOpen = false, openAssetBrowser = false) {
        super();
        this.createOnOpen = createOnOpen;
        this.openAssetBrowser = openAssetBrowser;
    }

    sources = ["modules/canvas3dcompendium/assets/Terrain_heightmaps"];

    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            title: "Quick Terrain",
            id: "quick-terrain",
            template: `modules/canvas3dcompendium/templates/quick-terrain.hbs`,
            width: 200,
            height: "auto",
            top: 0,
            left: window.innerWidth - 500,
            resizable: false,
        };
    }

    async getSources() {
        let source = "user";
        if (typeof ForgeVTT !== "undefined" && ForgeVTT.usingTheForge) {
            source = "forge-bazaar";
        }
        const files = [];
        for (let target of this.sources) {
            let sourceFiles;
            try {
                sourceFiles = await getFiles(target, source, "webp");
            } catch (e) {
                try {
                    sourceFiles = await getFiles(target, "user", "webp");
                } catch (e) {
                    sourceFiles = [];
                }
            }
            files.push(...sourceFiles);
        }
        return files;
    }

    async getData() {
        const files = fileCache ?? (await this.getSources()).filter((f) => /\d/.test(f.split("/").pop()));
        fileCache = files;
        return {
            themes: themes,
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.on("click", "button", (e) => {
            e.preventDefault();
            const dataAction = e.currentTarget.dataset.action;
            if (dataAction == "theme") return this.applyTheme();
            if (dataAction == "generate") return this.generateTerrain();
            if (dataAction == "water") return this.createWater();
            if (dataAction == "variation") return this.generateVariation();
            if (dataAction == "fine-tune") return new MatrixEditor(canvas.tiles.controlled[0]).render(true);
        });
        if(this.createOnOpen) {
            this.generateTerrain();
        }
    }

    async applyTheme() { 
        const tile = canvas.tiles.controlled[0];
        if (!tile) return ui.notifications.error("Please select a tile to apply the theme to.");
        const data = this._getSubmitData();
        const theme = data.theme == "random" ? themes[Object.keys(themes)[Math.floor(Math.random() * Object.keys(themes).length)]] : themes[data.theme];
        tile.document.update({ flags: { "levels-3d-preview": { shaders: theme.data } } });
    }

    async generateTerrain() {
        if(canvas.scene.getFlag("levels-3d-preview", "renderBackground")) await canvas.scene.setFlag("levels-3d-preview", "renderBackground", false);
        const data = this._getSubmitData();
        const theme = data.theme == "random" ? themes[Object.keys(themes)[Math.floor(Math.random() * Object.keys(themes).length)]] : themes[data.theme];
        const scale = (Math.random()+ 0.2)*5;
        const tileData = {
            width: canvas.scene.dimensions.sceneWidth,
            height: canvas.scene.dimensions.sceneHeight,
            x: canvas.scene.dimensions.sceneX,
            y: canvas.scene.dimensions.sceneY,
            flags: {
                levels: {
                    rangeBottom: 0,
                },
                "levels-3d-preview": {
                    imageTexture: "modules/levels-3d-preview/assets/blankTex.jpg",
                    displacementMap: fileCache[Math.floor(Math.random() * fileCache.length)],
                    displacementMatrix: `${Math.random()},${Math.random()},${scale},${scale}`,
                    invertDisplacementMap: true,
                    shaders: theme.data,
                    depth: Math.max(canvas.scene.dimensions.sceneWidth, canvas.scene.dimensions.sceneHeight) / 4,
                    dynaMesh: "box",
                    dynaMeshResolution: 2,
                    autoGround: true,
                },
            },
        };
        const controlled = canvas.tiles.controlled[0];
        if (controlled) {
            await controlled.document.update(tileData);
        } else {
            const tile = (await canvas.scene.createEmbeddedDocuments("Tile", [tileData]))[0];
            tile.object.control({ releaseOthers: true });
        }
    }

    async generateVariation() { 
        if (!canvas.tiles.controlled[0]) return ui.notifications.error("Please select a terrain to generate a variation for.");
        const scale = (Math.random() + 0.2) * 5;
        canvas.tiles.controlled[0].document.setFlag("levels-3d-preview", "displacementMatrix", `${Math.random()},${Math.random()},${scale},${scale}`);
        
    }

    async createWater() { 
        const tileData = {
            width: canvas.scene.dimensions.sceneWidth-10,
            height: canvas.scene.dimensions.sceneHeight-10,
            x: canvas.scene.dimensions.sceneX + 5,
            y: canvas.scene.dimensions.sceneY + 5,
            flags: {
                levels: {
                    rangeBottom: 0,
                },
                "levels-3d-preview": {
                    shaders: water,
                    depth: 100,
                    dynaMesh: "box",
                    dynaMeshResolution: 1,
                    autoGround: true,
                    color: "#3db5ff",
                    sight: false,
                    collision: false,
                    metalness: 0.53,
                    roughness: 0,
                    transparency: 0.88,
                },
            },
        };
        const tile = (await canvas.scene.createEmbeddedDocuments("Tile", [tileData]))[0];
    }

    async close(...args) { 
        if(this.openAssetBrowser) {
            new AssetBrowser().render(true);
        }
        return super.close(...args);
    }
}

const water = { ocean: { enabled: true, speed: 0.1, scale: 0.1, waveA_wavelength: 0.6, waveA_steepness: 0.3029, waveA_direction: 90, waveB_wavelength: 0.3, waveB_steepness: 0.2524, waveB_direction: 260, waveC_wavelength: 0.2, waveC_steepness: 0.3534, waveC_direction: 180, foam: false } };

const themes = {
    grassy: {
        name: "Grassy",
        data: { textureGradient: { enabled: true, texCount: 3, smoothing: 0.1275, useNormals: true, tex0Begin: 0, tex1Begin: 0.71, tex2Begin: 0.89, tex3Begin: 0.75, textureDiffuse0: "modules/canvas3dcompendium/assets/Materials/Rock029/Rock029_Color.webp", color0: "#9b4517", repeat0: 5, textureDiffuse1: "modules/canvas3dcompendium/assets/Materials/Grass003/Grass003_Color.webp", color1: "#abc299", repeat1: 4, textureDiffuse2: "modules/canvas3dcompendium/assets/Materials/Ground037/Ground037_Color.webp", color2: "#759447", repeat2: 4, textureDiffuse3: "", color3: "#ffffff", repeat3: 1 } },
    },
    island: {
        name: "Island",
        data: { textureGradient: { enabled: true, texCount: 4, smoothing: 0.08, useNormals: false, tex0Begin: 0, tex1Begin: 0.08, tex2Begin: 0.19, tex3Begin: 0.81, textureDiffuse0: "modules/canvas3dcompendium/assets/TheMadCartographerTexturePack/Texture-Water.webp", color0: "#ffffff", repeat0: 5, textureDiffuse1: "modules/canvas3dcompendium/assets/TheMadCartographerTexturePack/Texture-Desert.webp", color1: "#e29255", repeat1: 5, textureDiffuse2: "modules/canvas3dcompendium/assets/TheMadCartographerTexturePack/Texture-Grass.webp", color2: "#ffffff", repeat2: 5, textureDiffuse3: "modules/canvas3dcompendium/assets/Materials/Rock024/Rock024_Color.webp", color3: "#5b4215", repeat3: 5 } },
    },
    deadlands: {
        name: "Deadlands",
        data: { textureGradient: { enabled: true, texCount: 3, smoothing: 0.1275, useNormals: true, tex0Begin: 0, tex1Begin: 0.71, tex2Begin: 0.89, tex3Begin: 0.75, textureDiffuse0: "modules/canvas3dcompendium/assets/Materials/Rock012/Rock012_Color.webp", color0: "#2e2e2e", repeat0: 5, textureDiffuse1: "modules/canvas3dcompendium/assets/Materials/Ground031/Ground031_Color.webp", color1: "#98673a", repeat1: 4, textureDiffuse2: "modules/canvas3dcompendium/assets/Materials/Ground031/Ground031_Color.webp", color2: "#876345", repeat2: 4, textureDiffuse3: "", color3: "#ffffff", repeat3: 1 } },
    },
    desert: {
        name: "Desert",
        data: { textureGradient: { enabled: true, texCount: 3, smoothing: 0.1275, useNormals: true, tex0Begin: 0, tex1Begin: 0.71, tex2Begin: 0.89, tex3Begin: 0.75, textureDiffuse0: "modules/canvas3dcompendium/assets/TheMadCartographerTexturePack/Texture-Desert.webp", color0: "#a17230", repeat0: 2, textureDiffuse1: "modules/canvas3dcompendium/assets/TheMadCartographerTexturePack/Texture-Desert.webp", color1: "#df9a3a", repeat1: 2, textureDiffuse2: "modules/canvas3dcompendium/assets/TheMadCartographerTexturePack/Texture-Desert.webp", color2: "#c88e3c", repeat2: 2, textureDiffuse3: "", color3: "#ffffff", repeat3: 1 } },
    },
    frozen: {
        name: "Frozen",
        data: { textureGradient: { enabled: true, texCount: 3, smoothing: 0.2225, useNormals: true, tex0Begin: 0, tex1Begin: 0.53, tex2Begin: 0.89, tex3Begin: 0.75, textureDiffuse0: "modules/canvas3dcompendium/assets/Materials/Ice002/Ice002_Color.webp", color0: "#19cee6", repeat0: 5, textureDiffuse1: "modules/canvas3dcompendium/assets/Materials/Snow004/Snow004_Color.webp", color1: "#a8e6e5", repeat1: 4, textureDiffuse2: "modules/canvas3dcompendium/assets/Materials/Snow004/Snow004_Color.webp", color2: "#ffffff", repeat2: 4, textureDiffuse3: "", color3: "#ffffff", repeat3: 1 } },
    },
    wasteland: {
        name: "Wasteland",
        data: { textureGradient: { enabled: true, texCount: 2, smoothing: 0.1, useNormals: true, tex0Begin: 0, tex1Begin: 0.87, tex2Begin: 1, tex3Begin: 0.75, textureDiffuse0: "modules/canvas3dcompendium/assets/Materials/Rock029/Rock029_Color.webp", color0: "#9b4517", repeat0: 5, textureDiffuse1: "modules/canvas3dcompendium/assets/Materials/Ground048/Ground048_Color.webp", color1: "#e29255", repeat1: 1, textureDiffuse2: "", color2: "#ffffff", repeat2: 1, textureDiffuse3: "", color3: "#ffffff", repeat3: 1 } },
    },
    grassystyle: {
        name: "Grassy Cartoon",
        data: { textureGradient: { enabled: true, texCount: 3, smoothing: 0.24, useNormals: true, tex0Begin: 0, tex1Begin: 0.71, tex2Begin: 0.89, tex3Begin: 0.75, textureDiffuse0: "modules/canvas3dcompendium/assets/Materials/_Stylized2/Cliff_01/Cliff_01_Color.webp", color0: "#9b4517", repeat0: 5, textureDiffuse1: "modules/canvas3dcompendium/assets/Materials/_Stylized2/Grass_03/Grass_03_Color.webp", color1: "#a25701", repeat1: 8, textureDiffuse2: "modules/canvas3dcompendium/assets/Materials/_Stylized2/Grass_03/Grass_03_Color.webp", color2: "#ffffff", repeat2: 8, textureDiffuse3: "", color3: "#ffffff", repeat3: 1 } },
    },
    icestyle: {
        name: "Ice Cartoon",
        data: { textureGradient: { enabled: true, texCount: 3, smoothing: 0.24, useNormals: true, tex0Begin: 0, tex1Begin: 0.71, tex2Begin: 0.89, tex3Begin: 0.75, textureDiffuse0: "modules/canvas3dcompendium/assets/Materials/_Stylized2/Crystals_02/Crystals_02_Color.webp", color0: "#ffffff", repeat0: 8, textureDiffuse1: "modules/canvas3dcompendium/assets/Materials/_Stylized2/Snow_04/Snow_04_Color.webp", color1: "#414b95", repeat1: 8, textureDiffuse2: "modules/canvas3dcompendium/assets/Materials/_Stylized2/Snow_04/Snow_04_Color.webp", color2: "#ffffff", repeat2: 8, textureDiffuse3: "", color3: "#ffffff", repeat3: 1 } },
    },
    drystyle: {
        name: "Dry Cartoon",
        data: { textureGradient: { enabled: true, texCount: 3, smoothing: 0.24, useNormals: true, tex0Begin: 0, tex1Begin: 0.71, tex2Begin: 0.89, tex3Begin: 0.75, textureDiffuse0: "modules/canvas3dcompendium/assets/Materials/_Stylized2/Rocks_04/Rocks_04_Color.webp", color0: "#993d1e", repeat0: 14, textureDiffuse1: "modules/canvas3dcompendium/assets/Materials/_Stylized2/CrackedSoil_02/CrackedSoil_02_Color.webp", color1: "#e3944a", repeat1: 8, textureDiffuse2: "modules/canvas3dcompendium/assets/Materials/_Stylized2/CrackedSoil_02/CrackedSoil_02_Color.webp", color2: "#994315", repeat2: 8, textureDiffuse3: "", color3: "#ffffff", repeat3: 1 } },
    },
    gemsstyle: {
        name: "Gems Cartoon",
        data: { textureGradient: { enabled: true, texCount: 3, smoothing: 0.24, useNormals: true, tex0Begin: 0, tex1Begin: 0.71, tex2Begin: 0.89, tex3Begin: 0.75, textureDiffuse0: "modules/canvas3dcompendium/assets/Materials/_Stylized2/Crystals_01/Crystals_01_Color.webp", color0: "#ff3d3d", repeat0: 14, textureDiffuse1: "modules/canvas3dcompendium/assets/Materials/_Stylized2/Dirt_09/Dirt_09_Color.webp", color1: "#48324d", repeat1: 8, textureDiffuse2: "modules/canvas3dcompendium/assets/Materials/_Stylized2/Dirt_09/Dirt_09_Color.webp", color2: "#7e90b9", repeat2: 8, textureDiffuse3: "", color3: "#ffffff", repeat3: 1 } },
    },
};