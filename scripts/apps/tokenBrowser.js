import { getFiles } from "./assetBrowser.js";

let fileCache = null;
let dataCache = null;
let fuseSearch = null;

let _this = null;

let _new = null;

async function initFuse(data) {
    const Fuse = (await import("../lib/fuse.js")).default;
    const options = {
        includeScore: true,
        keys: ["slug"],
        threshold: 0.5,
    };
    const heroforgeList = game.threeportrait?.HFBrowser?.getHeroList?.() ?? [];
    fuseSearch = new Fuse(data.materials.concat(heroforgeList), options);
}

export class TokenBrowser extends Application {
    constructor(input, app) {
        super();
        _this = this;
        this.input = input;
        this._app = app;
    }

    get sources() {
        const allTokens = game.settings.get("canvas3dcompendium", "allTokens");
        return allTokens ? ["modules/canvas3dtokencompendium/miniatures"] : ["modules/canvas3dtokencompendium/miniatures/_Colorized"];
    }

    static get exclude() {
        return [];
    }

    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            title: "Asset Browser",
            id: "token-browser",
            classes: ["three-canvas-compendium-app"],
            template: `modules/canvas3dcompendium/templates/material-explorer.hbs`,
            width: 400,
            height: window.innerHeight * 0.8,
            resizable: true,
            dragDrop: [{ dragSelector: "li", dropSelector: "" }],
        };
    }

    get title() {
        return "Token Browser: " + this._assetCount + " tokens available";
    }

    static async preloadData() {
        await this.prototype.getData();
    }

    static findByName(name, { async = false, returnFirst = false, fuzzy = true, wildcard = true } = {}) {
        if (async && !dataCache) return this.preloadData().then((data) => this.findByName(name, { async: false, returnFirst }));
        if (!dataCache) return ui.notifications.error("Token Browser data is not yet loaded. Please, use the game.canvas3d.CONFIG.UI.TokenBrowser.preloadData() function before using this function or run this search with {async: true}.");
        const slugName = name.slugify({ strict: true });
        if (fuzzy) {
            const words = slugName.split("-");
            const permutations = generatePermutations(words);
            const matches = fuseSearch.search(slugName);
            if (returnFirst) {
                //find best possible result
                const multiMatchesArrays = [];
                for (let permutation of permutations) {
                    const multiMatches = fuseSearch.search(permutation);
                    multiMatchesArrays.push(multiMatches);
                }
                const multiMatches = multiMatchesArrays.flat();
                multiMatches.sort((a, b) => a.score - b.score);
                if (wildcard && multiMatches[0].score < 0.1) {
                    const bestScore = multiMatches[0].score;
                    const multiMatchesFiltered = multiMatches.filter((m) => m.score <= bestScore + 0.01);
                    return multiMatchesFiltered[Math.floor(Math.random() * multiMatchesFiltered.length)]?.item?.output ?? "";
                }
                return multiMatches[0]?.item?.output ?? "";
            }
            return matches.map((m) => m.item);
        }
        const results = dataCache.materials.filter((m) => m.slug.includes(slugName) || slugName.includes(m.slug));
        if (returnFirst) return results[0]?.output ?? "";
        return results;
    }

    static get ready() {
        return !!dataCache;
    }

    async getData() {
        const data = super.getData();
        if (!_new) await getNew();
        data.isTokenBrowser = true;
        if (dataCache) {
            this._assetCount = dataCache.materials.length;
            return dataCache;
        }
        const materials = [];
        const files = fileCache ?? (await this.getSources());
        fileCache = files;
        for (let file of files) {
            const cleanedName = decodeURIComponent(file.split("/").pop().split(".").shift());
            const filename = file.split("/").pop().replaceAll("%20", "_");
            const cleanName = filename.replaceAll("_", " ").replace(".glb", "").replace("MZ4250 - ", "");
            materials.push({
                displayName: cleanName,
                preview: file.replace(".glb", ".webp"),
                output: file,
                search: file.split("/canvas3dtokencompendium/miniatures/_Colorized").pop(),
                isNew: _new.includes(cleanedName),
                slug: cleanName.slugify({ strict: true }),
            });
        }
        materials.sort((a, b) => a.displayName.localeCompare(b.displayName));
        materials.sort((a, b) => {
            if (a.isNew && !b.isNew) return -1;
            if (!a.isNew && b.isNew) return 1;
            return 0;
        });
        data.materials = materials;
        data.hasInput = true;
        this._assetCount = materials.length;
        dataCache = data;
        await initFuse(dataCache);
        return data;
    }

    get usingTheForge() {
        return typeof ForgeVTT !== "undefined" && ForgeVTT.usingTheForge;
    }

    async getSources() {
        let source = "user";
        if (this.usingTheForge) {
            source = "forge-bazaar";
        }
        const files = [];
        for (let target of TokenBrowser.defaultSources.concat(this.sources)) {
            let sourceFiles;
            try {
                sourceFiles = await getFiles(target, source);
            } catch (e) {
                try {
                    sourceFiles = await getFiles(target, "user");
                } catch (e) {
                    sourceFiles = [];
                }
            }
            files.push(...sourceFiles);
        }
        return files;
    }

    activateListeners(html) {
        super.activateListeners(html);
        this.element.find(".material-confirm").hide();
        this.element.on("keyup", "#search", (e) => {
            const value = e.target.value;
            let count = 0;
            this.element.find("li").each((i, el) => {
                const displayName = String($(el).data("displayname"));
                const search = String($(el).data("search"));
                const display = search.toLowerCase().includes(value.toLowerCase()) || displayName.toLowerCase().includes(value.toLowerCase());
                $(el).toggle(display);
                if (display) count++;
            });
        });
        this.element.find("input").trigger("keyup");
        this.element.on("click", "li", (e) => {
            const output = $(e.currentTarget).data("output");
            this.input.val(output);
            if (this._app.isPrototype) return;
            if (game.settings.get("canvas3dcompendium", "autoApply")) this._app.object.setFlag("levels-3d-preview", "model3d", output); //this._app._onSubmit(e, { preventClose: true, preventRender: true });
            if (game.settings.get("canvas3dcompendium", "autoClose")) this.close();
        });
        this.element.on("dragstart", "li", this._onDragStart);
    }

    _onDragStart(event) {
        canvas.tiles.releaseAll();
        const src = event.currentTarget.dataset.output;
        const dragData = {
            type: "Tile",
            texture: { src: src },
            tileSize: canvas.dimensions.size,
        };
        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }

    static create(filepicker, app) {
        const fpFG = filepicker.closest(".form-group").length ? filepicker.closest(".form-group") : filepicker;
        const button = $(`
        <button type="button" style="order: 99;" data-tooltip="Token Browser - Ctrl + Click for Quick Match">
        <i class="fa-regular fa-person" style="margin: 0;"></i>
        </button>
        `);
        const input = fpFG.find("input").first();
        const fpButton = fpFG.find("button").first();
        fpButton.before(button);
        button.on("mouseup", async (e) => {
            e.preventDefault();
            const isLeftClick = e.button === 0;
            const isRightClick = e.button === 2;
            const isCtrlClick = e.ctrlKey;
            if (isLeftClick && !isCtrlClick) new TokenBrowser(input, app).render(true);
            if (isRightClick || isCtrlClick) {
                const name = app.object.name;
                const closestMatch = await this.findByName(name, { returnFirst: true, async: true });
                if (closestMatch) {
                    input.val(closestMatch);
                    if (game.settings.get("canvas3dcompendium", "autoApply")) app.object.setFlag("levels-3d-preview", "model3d", closestMatch); //app._onSubmit(e, { preventClose: true, preventRender: true });
                }
            }
        });
    }

    static registerPack(packId, packName, assetPacks = [], options = {}) {
        let packPath = `modules/${packId}`;
        if (options.subfolder) packPath += `/${options.subfolder}`;
        if (!TokenBrowser.defaultSources.includes(packPath)) TokenBrowser.defaultSources.push(packPath);
        if (!assetPacks.length) return;
        assetPacks.map((p) => {
            p.query = packId + "," + p.query;
            p.query = p.query.toLowerCase();
            p.query.replaceAll(" ", "%20");
            return p;
        });
        assetPacks.sort((a, b) => a.name.localeCompare(b.name));
        if (!TokenBrowser.assetPacks[packId]) {
            TokenBrowser.assetPacks[packId] = { name: packName, packs: assetPacks };
        } else {
            TokenBrowser.assetPacks[packId].packs.push(...assetPacks);
        }
    }
}

TokenBrowser.defaultSources = [];
TokenBrowser.assetPacks = {};

async function getNew() {
    try {
        _new = await fetchJsonWithTimeout("modules/canvas3dtokencompendium/miniatures/_Colorized/new.json");
    } catch (e) {
        _new = [];
    }
    return _new;
}

function generatePermutations(words) {
    const permutations = [];

    function permute(arr, prefix = []) {
        if (arr.length === 0) {
            permutations.push(prefix.join(" "));
        } else {
            for (let i = 0; i < arr.length; i++) {
                const current = arr.slice();
                const word = current.splice(i, 1);
                permute(current, prefix.concat(word));
            }
        }
    }

    permute(words);
    return permutations;
}

async function quickMatch(tokenDocument, topDown = false) {
    tokenDocument = tokenDocument.document ?? tokenDocument;
    const closestMatch = await TokenBrowser.findByName(tokenDocument.name, { returnFirst: true, async: true });
    if (closestMatch) {
        await tokenDocument.update({
            flags: {
                "levels-3d-preview": {
                    model3d: closestMatch,
                    scale: (tokenDocument.texture.scaleX + tokenDocument.texture.scaleY) / 2,
                },
            },
        });
        if (topDown)
            await tokenDocument.update({
                texture: {
                    src: closestMatch.replace(".glb", "-topdown.webp"),
                    scaleX: tokenDocument.texture.scaleX * 2,
                    scaleY: tokenDocument.texture.scaleY * 2,
                },
            });
        return closestMatch;
    }
    return false;
}

function quickMatchSync(tokenDocument, topDown = false) {
    tokenDocument = tokenDocument.document ?? tokenDocument;
    const closestMatch = TokenBrowser.findByName(tokenDocument.name, { returnFirst: true, async: false });
    if (closestMatch) {
        tokenDocument.updateSource({
            flags: {
                "levels-3d-preview": {
                    model3d: closestMatch,
                    scale: (tokenDocument.texture.scaleX + tokenDocument.texture.scaleY) / 2,
                },
            },
        });
        if (topDown)
            tokenDocument.updateSource({
                texture: {
                    src: closestMatch.replace(".glb", "-topdown.webp"),
                    scaleX: tokenDocument.texture.scaleX * 2,
                    scaleY: tokenDocument.texture.scaleY * 2,
                },
            });
        return closestMatch;
    }
    return false;
}

export function setHudHook() {
    Hooks.on("renderTokenHUD", async (hud, html, data) => {
        if (!game.canvas3D?._active) return;
        const model3d = hud.object.document.getFlag("levels-3d-preview", "model3d");
        if (model3d) return;
        const colRight = html.find(".col.left");
        const quickMatchBtn = $(`
        <div class="control-icon" data-action="quickmatch">
            <img src="icons/tools/scribal/magnifying-glass.webp" width="36" height="36" title="Quick-Match 3D Token">
        </div>
        `);
        quickMatchBtn.on("click", async (e) => {
            for (const token of canvas.tokens.controlled) {
                const tokenModel3d = token.document.getFlag("levels-3d-preview", "model3d");
                if (tokenModel3d) continue;
                await quickMatch(token);
            }
        });
        colRight.append(quickMatchBtn);
    });
    Hooks.on("preCreateToken", (tokenDocument, data, options, userId) => {
        const autoAssignToken = game.settings.get("canvas3dcompendium", "autoAssignToken");
        if (!game.canvas3D?._active && autoAssignToken < 2) return;
        if (tokenDocument.actorLink) return;
        if (!autoAssignToken) return;
        const model3d = tokenDocument.getFlag("levels-3d-preview", "model3d");
        if (model3d) return;
        if (TokenBrowser.ready) quickMatchSync(tokenDocument, autoAssignToken == 2);
        else {
            const hookId = Hooks.once("createToken", async (tD) => {
                await quickMatch(tD, autoAssignToken == 2);
            });
        }
    });
}
