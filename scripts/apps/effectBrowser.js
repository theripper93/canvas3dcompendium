import {getFiles} from "./assetBrowser.js";

let jb2a_loaded = false;

let _this = null;

export class EffectBrowser extends Application {
    constructor() {
        super();
        game.Levels3DPreview.renderer.domElement.addEventListener("mouseup", this._on3DCanvasClick, false);
        this.hookid = Hooks.on("controlTile", (tile, control) => {
            if (this._hasSelected) canvas.tiles.releaseAll();
        });
        _this = this;
    }

    static scale = 5;

    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            title: "Effect Browser",
            classes: ["three-canvas-compendium-app"],
            id: "effect-browser",
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
            texture: { src: effect.src },
            shaderData: effect.shaderData,
            tileSize: EffectBrowser.scale,
        };
        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }

    get currentPoint() {
        return game.Levels3DPreview.interactionManager.mouseIntersection3DCollision(undefined, true, "compendium")[0];
    }

    _on3DCanvasClick(event, fromDrag = false) {
        const currentIntersect = _this.currentPoint;
        if (!_this._hasSelected || (event.which !== 1 && !fromDrag) || !currentIntersect) return;
        const srcs = [];
        _this.element.find("li.selected").each((i, el) => srcs.push(el.dataset.output));
        const scale = parseFloat(_this.element.find("#scale").val() || 5);
        EffectBrowser.scale = scale;
        const effect = getEffect(srcs[Math.floor(Math.random() * srcs.length)]);
        const dragData = {
            type: "Tile",
            texture: { src: effect.src },
            shaderData: effect.shaderData,
            tileSize: EffectBrowser.scale,
            coord3d: currentIntersect.point,
        };

        game.Levels3DPreview.interactionManager._onDrop(event, null, null, dragData);
    }

    async getData() {
        const materials = [];
        const data = {};
        await getJB2A();
        const addEffect = (effectId, effect, variation) => {
            const name = variation ? variation.name + ": " + effect.name : effect.name;
            materials.push({
                displayName: name,
                preview: effect.thumb ?? effect.src,
                output: variation ? effectId + "-" + variation.id : effectId,
                search: name,
                isVariation: !!variation,
            });
        };

        for (const [effectId, effect] of Object.entries(effectsDatabase)) {
            if (effect.variations) {
                effect.variations.forEach((e) => addEffect(effectId, effect, e));
            } else {
                addEffect(effectId, effect);
            }
        }

        materials.sort((a, b) => a.displayName.localeCompare(b.displayName)).sort((a, b) => b.isVariation - a.isVariation);
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
        this.element.on("mouseup", (e) => {
            const li = $(e.target).closest("li");
            if (li.length === 0) return;
            const isSelect = $(e.target).closest("li").hasClass("selected");
            if (!e.ctrlKey && !e.shiftKey) this.element.find("li").removeClass("selected");
            if (e.ctrlKey) $(e.target).closest("li").toggleClass("selected");
            if (e.shiftKey) {
                const selected = this.element.find("li.selected");
                if (selected.length === 0) {
                    $(e.target).closest("li").addClass("selected");
                } else {
                    const start = selected.first().index();
                    const end = li.index();
                    const min = Math.min(start, end);
                    const max = Math.max(start, end);
                    this.element.find("li").each((i, el) => {
                        if (i >= min && i <= max) $(el).addClass("selected");
                    });
                }
            }
            if (!isSelect) {
                $(e.target).closest("li").addClass("selected");
            }
            this._hasSelected = this.element.find("li.selected").length > 0;
            if (this._hasSelected) canvas.tiles.releaseAll();
        });
        this.element.find("input").trigger("keyup");
        this.element.on("change", "#scale", (e) => {
            EffectBrowser.scale = parseFloat(e.target.value);
        });
    }

    async close(...args) {
        super.close(...args);
        game.Levels3DPreview.renderer.domElement.removeEventListener("mouseup", this._on3DCanvasClick, false);
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
    surface1: {
        src: "modules/canvas3dcompendium/assets/Effects/Spills/spill1.webp",
        name: "Surface 1",
    },
    surface2: {
        src: "modules/canvas3dcompendium/assets/Effects/Spills/spill2.webp",
        name: "Surface 2",
    },
    surface3: {
        src: "modules/canvas3dcompendium/assets/Effects/Spills/spill3.webp",
        name: "Surface 3",
    },
    surface4: {
        src: "modules/canvas3dcompendium/assets/Effects/Spills/spill4.webp",
        name: "Surface 4",
    },
    surface5: {
        src: "modules/canvas3dcompendium/assets/Effects/Spills/spill5.webp",
        name: "Surface 5",
    },
};


["vortex1", "vortex2", "star1", "star2", "star3"].forEach((e) => {
    createElementalVariations(effectsDatabase[e])
    addRotation(effectsDatabase[e])
    addGlow(effectsDatabase[e])
});

["surface1", "surface2", "surface3", "surface4", "surface5"].forEach((e) => {
    createElementalVariations(effectsDatabase[e])
    addGlow(effectsDatabase[e], false, 0.4)
    addWavy(effectsDatabase[e])
});

[("cracks1", "cracks2", "cracks3")].forEach((e) => {
    createElementalVariations(effectsDatabase[e]);
    addGlow(effectsDatabase[e], true);
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
            id: "lightning",
            name: "Lightning",
            shaderData: {
                overlay: { enabled: true, textureDiffuse: "modules/canvas3dcompendium/assets/Materials/_Stylized2/Ice_01/Ice_01_Color.webp", color: "#80dfff", strength: 1, coveragePercent: 1, inclination: 0, repeat: 1, rotation_angle: 0, offsetX: 0, offsetY: 0, black_alpha: false, add_blend: false, mult_blend: true },
                lightning: { enabled: true, speed: 0.1, intensity: 0.4924, scale: 1, color: "#0037ff", blendMode: true },
            },
        },
        {
            id: "acid",
            name: "Acid",
            shaderData: { overlay: { enabled: true, textureDiffuse: "modules/canvas3dcompendium/assets/Materials/_Stylized2/Lava_04/Lava_04_Color.webp", color: "#00e62e", strength: 1, coveragePercent: 1, inclination: 0, repeat: 1, rotation_angle: 0, offsetX: 0, offsetY: 0, black_alpha: false, add_blend: false, mult_blend: true } },
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

function addGlow(effect, pulse = false, intensity = 2) {
    if (pulse) {
        effect.variations.forEach((variation) => {
            variation.shaderData.colorwarp = { enabled: true, speed: 0.1, glow: intensity, hue_angle: 0, flicker: false, animate_range: 1 };
        });
    } else {
        effect.variations.forEach((variation) => { 
            variation.shaderData.colorwarp = { enabled: true, speed: 0, glow: intensity, hue_angle: 0, flicker: false, animate_range: 0.5 };
        });
    }
}

function addWavy(effect) {
    effect.variations.forEach((variation) => { 
        variation.shaderData.ocean = { enabled: true, speed: 0.05, scale: 0.1, waveA_wavelength: 0.6, waveA_steepness: 0.3029, waveA_direction: 90, waveB_wavelength: 0.3, waveB_steepness: 0.2524, waveB_direction: 260, waveC_wavelength: 0.2, waveC_steepness: 0.3534, waveC_direction: 180, foam: false };
    });
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

