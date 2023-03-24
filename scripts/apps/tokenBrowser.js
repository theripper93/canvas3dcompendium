import { getFiles } from "./assetBrowser.js";

let fileCache = null;
let dataCache = null;

let _this = null;

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
        };
    }

    get title() {
        return "Token Browser: " + this._assetCount + " tokens available";
    }

    async getData() {
        const data = super.getData();
        if (dataCache) {
            this._assetCount = dataCache.materials.length;
            return dataCache;
        }
        const materials = [];
        const files = fileCache ?? (await this.getSources());
        fileCache = files;
        for (let file of files) {
            const filename = file.split("/").pop().replaceAll("%20", "_");
            const cleanName = filename.replaceAll("_", " ").replace(".glb", "").replace("MZ4250 - ", "");
            materials.push({
                displayName: cleanName,
                preview: file.replace(".glb", ".webp"),
                output: file,
                search: file.split("/canvas3dtokencompendium/miniatures/_Colorized").pop(),
            });
        }
        materials.sort((a, b) => a.displayName.localeCompare(b.displayName));
        data.materials = materials;
        this._assetCount = materials.length;
        dataCache = data;
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
        for (let target of this.sources) {
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
            if (game.settings.get("canvas3dcompendium", "autoApply")) this._app._onSubmit(e, { preventClose: true, preventRender: true });
            if (game.settings.get("canvas3dcompendium", "autoClose")) this.close();
        });
    }

    static create(filepicker, app) {
        const fpFG = filepicker.closest(".form-group").length ? filepicker.closest(".form-group") : filepicker;
        const button = $(`
        <button type="button" style="order: 99;" title="Open Token Browser">
        <i class="fa-regular fa-person" style="margin: 0;"></i>
        </button>
        `);
        const input = fpFG.find("input").first();
        const fpButton = fpFG.find("button").first();
        fpButton.before(button);
        button.on("click", (e) => {
            e.preventDefault();
            new TokenBrowser(input, app).render(true);
        });
    }
}