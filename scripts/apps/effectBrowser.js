import {getFiles} from "./assetBrowser.js";

let jb2a_loaded = false;

export class EffectBrowser extends Application {
    constructor() {
        super();
        this.lastPlacementPosition = new game.Levels3DPreview.THREE.Vector3();
        game.Levels3DPreview.renderer.domElement.addEventListener("mouseup", this._on3DCanvasClick, false);
        game.Levels3DPreview.renderer.domElement.addEventListener("mousemove", this._on3DCanvasMove, false);
    }

    static scale = 5;

    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            title: "Effect Browser",
            id: "material-browser",
            template: `modules/canvas3dcompendium/templates/material-explorer.hbs`,
            width: 400,
            height: window.innerHeight * 0.8,
            resizable: true,
            dragDrop: [{ dragSelector: "li", dropSelector: "" }],
        };
    }

    get title() {
        return "Effect Browser: " + this._assetCount + " effects available";
    }

    _onDragStart(event) {
        canvas.tiles.releaseAll();
        const li = event.currentTarget;
        const scale = parseFloat(this.element.find("#scale").val() || 5);
        EffectBrowser.scale = scale;
        const effect = getEffect(li.dataset.output);
        const dragData = {
            type: "Tile",
            texture: {src: effect.src},
            shaderData: effect.shaderData,
            tileSize: EffectBrowser.scale,
        };
        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }

    async getData() {
        const materials = [];
        const data = {};
        await getJB2A();
        const addEffect = (effectId, effect, variation) => {
            const name = variation ? effect.name + " - " + variation.name : effect.name;
            materials.push({
                displayName: name,
                preview: effect.thumb ?? effect.src,
                output: variation ? effectId + "-" + variation.id : effectId,
                search: name,
            });
         };

        for (const [effectId, effect] of Object.entries(effectsDatabase)) {
            if (effect.variations) {
                effect.variations.forEach((e) => addEffect(effectId, effect, e));
            } else {
                addEffect(effectId, effect);
            }
        }

        materials.sort((a, b) => a.displayName.localeCompare(b.displayName));
        data.materials = materials;
        data.isEffectBrowser = true;
        this._assetCount = materials.length;
        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);
        this.element.find(".material-confirm").hide();
        this.element.on("keyup", "#search", (e) => {
            const value = e.target.value;
            let count = 0;
            this.element.find("li").each((i, el) => {
                const displayName = $(el).data("displayname");
                const search = $(el).data("search");
                const display = count >= this._maxCount ? false : search.toLowerCase().includes(value.toLowerCase()) || displayName.toLowerCase().includes(value.toLowerCase());
                $(el).toggle(display);
                if (display) count++;
            });
        });
        this.element.find("input").trigger("keyup");
        this.element.on("change", "#scale", (e) => {
            EffectBrowser.scale = parseFloat(e.target.value);
        });
    }

    async close(...args) {
        super.close(...args);
        game.Levels3DPreview.renderer.domElement.removeEventListener("mouseup", this._on3DCanvasClick, false);
        game.Levels3DPreview.renderer.domElement.removeEventListener("mousemove", this._on3DCanvasMove, false);
        Hooks.off("controlTile", this.hookid);
    }
}

function getEffect(effectId) {
    let effect = effectsDatabase[effectId];
    if (effect) return effect;
    if (!effectId.includes("-")) return null;
    const effectIdWithoutVariation = effectId.split("-")[0];
    effect = effectsDatabase[effectIdWithoutVariation];
    if (!effect) return null;
    const variationId = effectId.split("-")[1];
    const variation = effect.variations.find((e) => e.id === variationId);
    if (!variation) return null;
    return { ...variation, src: effect.src };
}

const effectsDatabase = {
    vortex1: {
        src: "modules/canvas3dcompendium/assets/Effects/JB2A/vortex1.webp",
        name: "Vortex 1",
    },
    vortex2: {
        src: "modules/canvas3dcompendium/assets/Effects/JB2A/vortex2.webp",
        name: "Vortex 2",
    },
    star1: {
        src: "modules/canvas3dcompendium/assets/Effects/JB2A/star1.webp",
        name: "Star 1",
    },
    star2: {
        src: "modules/canvas3dcompendium/assets/Effects/JB2A/star2.webp",
        name: "Star 2",
    },
    star3: {
        src: "modules/canvas3dcompendium/assets/Effects/JB2A/star3.webp",
        name: "Star 3",
    },
    cracks1: {
        src: "modules/canvas3dcompendium/assets/Effects/JB2A/cracks1.webp",
        name: "Cracks 1",
    },
    cracks2: {
        src: "modules/canvas3dcompendium/assets/Effects/JB2A/cracks2.webp",
        name: "Cracks 2",
    },
    cracks3: {
        src: "modules/canvas3dcompendium/assets/Effects/JB2A/cracks3.webp",
        name: "Cracks 3",
    },
};


["vortex1", "vortex2", "star1", "star2", "star3"].forEach((e) => {
    createElementalVariations(effectsDatabase[e])
    addRotation(effectsDatabase[e])
    addGlow(effectsDatabase[e])
});

["cracks1", "cracks2", "cracks3"].forEach((e) => {
    createElementalVariations(effectsDatabase[e])
    addGlow(effectsDatabase[e], true)
});


function createElementalVariations(effect){
    const elementalVariations = [
        {
            id: "fire",
            name: "Fire",
            shaderData: { overlay: { enabled: true, textureDiffuse: "modules/canvas3dcompendium/assets/Materials/_Stylized2/Lava_06/Lava_06_Color.webp", color: "#ffae00", strength: 1, coveragePercent: 1, inclination: 0, repeat: 1, rotation_angle: 0, offsetX: 0, offsetY: 0, black_alpha: false, add_blend: false, mult_blend: true } },
        },
        {
            id: "ice",
            name: "Ice",
            shaderData: { overlay: { enabled: true, textureDiffuse: "modules/canvas3dcompendium/assets/Materials/_Stylized2/Ice_01/Ice_01_Color.webp", color: "#80dfff", strength: 1, coveragePercent: 1, inclination: 0, repeat: 1, rotation_angle: 0, offsetX: 0, offsetY: 0, black_alpha: false, add_blend: false, mult_blend: true } },
        },
        {
            id: "acid",
            name: "Acid",
            shaderData: { overlay: { enabled: true, textureDiffuse: "modules/canvas3dcompendium/assets/Materials/_Stylized2/Scales_04/Scales_04_Color.webp", color: "#00e62e", strength: 1, coveragePercent: 1, inclination: 0, repeat: 1, rotation_angle: 0, offsetX: 0, offsetY: 0, black_alpha: false, add_blend: false, mult_blend: true } },
        },
        {
            id: "dark",
            name: "Dark",
            shaderData: { overlay: { enabled: true, textureDiffuse: "modules/canvas3dcompendium/assets/Materials/_Stylized2/Crystals_06/Crystals_06_Color.webp", color: "#9516fe", strength: 1, coveragePercent: 1, inclination: 0, repeat: 1, rotation_angle: 0, offsetX: 0, offsetY: 0, black_alpha: false, add_blend: false, mult_blend: true } },
        },
    ];
    if (!effect.variations) effect.variations = [];
    effect.variations.push(...elementalVariations);
}

function addRotation(effect) {
    effect.variations.forEach((variation) => { 
        variation.shaderData.textureRotate = { enabled: true, speed: 0.1, centerx: 0.5, centery: 0.5 };
    });
}

function addGlow(effect, pulse = false) {
    if (pulse) {
        effect.variations.forEach((variation) => {
            variation.shaderData.colorwarp = { enabled: true, speed: 0.1, glow: 2, hue_angle: 0, flicker: false, animate_range: 1 };
        });
    } else {
        effect.variations.forEach((variation) => { 
            variation.shaderData.colorwarp = { enabled: true, speed: 0, glow: 2, hue_angle: 0, flicker: false, animate_range: 0.5 }
        });
    }
}

async function getJB2A() {
    if(jb2a_loaded) return;
    jb2a_loaded = true;
    const jb2aPatreon = "modules/jb2a_patreon";
    const jb2aFree = "modules/JB2A_DnD5e";
    const [source, dir] = new FilePicker()._inferCurrentDirectory(jb2aPatreon);
    let files;
    try { 
        files = await getFiles(dir, source, "webm");
    } catch {
        try {
            files = await getFiles(jb2aFree, source, "webm");
        } catch {
            return;
        }
    }
    const filtered = files.filter((file) => {
        if (file.includes("Opacities") || file.includes("Nametag")) return false;
        return JB2A_FILTER.some((filter) => file.includes(filter));
    });
    for (const file of filtered) {
        let name = file.split("/").pop().split(".")[0];
        let splitName = name.split("_");
        if (splitName.length > 1) { 
            splitName.pop();
            name = splitName.join("_");
        }
        const path = file.split("/").slice(0, -1).join("/"); 
        const thumb = `${path}/${name}_Thumb.webp`;
        name = name.replace(/_/g, " ");
        effectsDatabase[name] = {
            src: file,
            name: name,
            thumb: thumb,
        };
    }
}

const JB2A_FILTER = ["Cloud_Of_Daggers", "Darkness", "Flaming_Sphere", "Web", "Entangle", "Fog_Cloud", "Sleet_Storm", "Spirit_Guardians", "Wall_Of_Fire", "Antilife_Shell", "Whirlwind", "Magic_Signs", "Portals"];

