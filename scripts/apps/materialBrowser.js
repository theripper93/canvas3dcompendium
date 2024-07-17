export class MaterialBrowser extends Application {
    constructor(input, app, targetTexture) {
        super();
        this._input = input ? $(input) : null;
        this._app = app;
        this._targetTexture = targetTexture || "_NormalGL";
    }

    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            title: "Material Browser",
            classes: ["three-canvas-compendium-app"],
            id: "material-browser",
            template: `modules/canvas3dcompendium/templates/material-explorer.hbs`,
            width: 400,
            height: window.innerHeight * 0.8,
            resizable: true,
        };
    }

    get title() {
        return "Material Browser: " + this._assetCount + " materials available";
    }

    _getHeaderButtons() {
        const buttons = super._getHeaderButtons();
        if(this._input) return buttons;
        buttons.unshift(
            {
                label: "",
                class: "tour",
                icon: "fas fa-question",
                onclick: () => {
                    const tour = game.tours.get(`levels-3d-preview.${this.id}`);
                    tour ? tour.start() : ui.notifications.warn("No tour found for this panel.");
                }
            })
        return buttons;
    }

    async getData() {
        const data = super.getData();
        let source = "user";
        if (typeof ForgeVTT !== "undefined" && ForgeVTT.usingTheForge) {
            source = "forge-bazaar";
        }
        const ambiendCG = await FilePicker.browse(source, "modules/canvas3dcompendium/assets/Materials");
        const c4dcenter = await FilePicker.browse(source, "modules/canvas3dcompendium/assets/Materials/_Stylized");
        const neuroTremolo = await FilePicker.browse(source, "modules/canvas3dcompendium/assets/Materials/_Stylized2");
        const materials = [];
        for (let folder of ambiendCG.dirs.concat(c4dcenter.dirs).concat(neuroTremolo.dirs)) {
            if (folder.endsWith("_Stylized") || folder.endsWith("_Stylized2")) continue;
            const filename = folder.split("/").pop().replaceAll("%20", "_");
            const cleanName = filename.replaceAll("_", " ");
            materials.push({
                displayName: cleanName,
                preview: folder + "/" + filename + "_Color.webp",
                output: folder + "/" + filename + "_NormalGL.webp",
            });
        }
        materials.sort((a, b) => a.displayName.localeCompare(b.displayName));
        data.materials = materials;
        this._assetCount = materials.length;
        data.hasInput = this._input ? true : false;
        return data;
    }
    activateListeners(html) {
        super.activateListeners(html);
        this.element.find(".material-confirm").hide();
        this.element.on("change", `input[type="range"]`, async (e) => { 
            const value = e.target.value;
            this.element.find(".range-value").text(value);
            const tiles = canvas.tiles.controlled;
            if (tiles.length) {
                const updates = [];
                for (let tile of tiles) {
                    updates.push({_id: tile.id, flags: {"levels-3d-preview": {textureRepeat: e.target.value}}});
                }
                canvas.scene.updateEmbeddedDocuments("Tile", updates);
            } else {
                ui.notifications.warn("Please select a tile first.");
            }
        })
        this.element.on("keyup", "input", (e) => {
            const value = e.target.value;
            this.element.find("li").each((i, el) => {
                const displayName = $(el).data("src");
                $(el).toggle(displayName.toLowerCase().includes(value.toLowerCase()));
            });
        });
        this.element.on("click", "li", (e) => {
            const material = $(e.currentTarget).data("output").replace("_NormalGL", this._targetTexture);
            if (this._input) {                
                this._input.val(material);
                this._input.closest("file-picker").val(material);
                if (game.settings.get("canvas3dcompendium", "autoApply") && this._targetTexture != "_Color") this._app._onSubmit(e, { preventClose: true, preventRender: true });
                if (game.settings.get("canvas3dcompendium", "autoClose")) this.close();
            } else {
                const tiles = canvas.tiles.controlled;
                if (tiles.length) {
                    const updates = [];
                    for (let tile of tiles) {
                        updates.push({_id: tile.id, flags: {"levels-3d-preview": {imageTexture: material}}});
                    }
                    canvas.scene.updateEmbeddedDocuments("Tile", updates);
                    ui.notifications.info("Material applied to " + updates.length + " tiles");
                } else {
                    ui.notifications.warn("Please select a tile first.");
                }
            }
            $(e.currentTarget)
                .find(".material-confirm")
                .fadeIn(300, () => {})
                .delay(1000)
                .fadeOut(200, () => {});
        });
    }

    static create(filepicker, app, targetTexture) {
        const fpFG = filepicker.closest(".form-group").length ? filepicker.closest(".form-group") : filepicker;
        const button = $(`
        <button type="button" style="order: 99;" title="Open Material Browser">
        <i class="fas fa-adjust" style="margin: 0;"></i>
        </button>
        `);
        const input = fpFG.find("input").first();
        const fpButton = fpFG.find("button").first();
        fpButton.before(button);
        button.on("click", (e) => {
            e.preventDefault();
            new MaterialBrowser(input, app, targetTexture).render(true);
        });
    }
}