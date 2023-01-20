let fileCache = null;
let dataCache = null;

let _this = null;

export class AssetBrowser extends Application {
    constructor() {
        super();
        this._maxCount = 200;
        this._hasSelected = false;
        game.Levels3DPreview.renderer.domElement.addEventListener("mouseup", this._on3DCanvasClick, false);
        _this = this;
        this.hookid = Hooks.on("controlTile", (tile, control) => { 
            if (this._hasSelected) canvas.tiles.releaseAll();
        })
    }

    sources = ["modules/canvas3dcompendium/assets/Tiles", "modules/baileywiki-3d"];


    static get exclude(){return [];}

    static scale = 1;

    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            title: "Asset Browser",
            id: "material-browser",
            template: `modules/canvas3dcompendium/templates/material-explorer.hbs`,
            width: 400,
            height: window.innerHeight * 0.8,
            resizable: true,
            dragDrop: [{ dragSelector: "li", dropSelector: "" }],
        };
    }

    get title() {
        return "Asset Browser: " + this._assetCount + " assets available";
    }

    _on3DCanvasClick(event) {
        if (!_this._hasSelected || event.which !== 1 || !game.Levels3DPreview.interactionManager.eventData) return;
        const srcs = [];
        _this.element.find("li.selected").each((i, el) => srcs.push(el.dataset.output));
        const randomSrc = srcs[Math.floor(Math.random() * srcs.length)];
        const angle = parseFloat(_this.element.find("#angle").val() || 0);
        const options = _this.quickPlacementOptions;
        let scale = parseFloat(_this.element.find("#scale").val() || 1);
        let normal = null;
        const grid = options.grid;
        const randomRotate = options.rotation;
        const rotation = randomRotate ? Math.random() * 360 : angle;
        if (options.scale) scale *= (Math.random() + 0.5);
        if (options.normal) normal = game.Levels3DPreview.interactionManager.eventData.intersectData.face.normal;
        AssetBrowser.scale = scale;
        const dragData = {
            type: "Tile",
            texture: { src: randomSrc },
            tileSize: canvas.dimensions.size / AssetBrowser.scale,
        };

        game.Levels3DPreview.interactionManager._onDrop(event, grid, normal, dragData, rotation, options.center);
    }

    _onDragStart(event) {
        const li = event.currentTarget;
        const scale = parseFloat(this.element.find("#scale").val() || 1);
        AssetBrowser.scale = scale;
        const dragData = {
            type: "Tile",
            texture: { src: li.dataset.output },
            tileSize: canvas.dimensions.size / AssetBrowser.scale,
        };
        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }

    async getData() {
        const data = super.getData();
        if (dataCache) {
            this._assetCount = dataCache.materials.length;
            dataCache.scale = AssetBrowser.scale !== 1 ? AssetBrowser.scale : "";
            return dataCache;
        }
        const materials = [];
        const files = fileCache ?? (await this.getSources());
        fileCache = files;
        for (let file of files) {
            const filename = file.split("/").pop().replaceAll("%20", "_");
            const cleanName = filename.replaceAll("_", " ").replace(".glb", "");
            materials.push({
                displayName: cleanName,
                preview: file.replace(".glb", ".webp"),
                output: file,
                search: file.split("/assets/Tiles/").pop(),
            });
        }
        materials.sort((a, b) => a.displayName.localeCompare(b.displayName));
        data.materials = materials;
        data.isAssetBrowser = true;
        this._assetCount = materials.length;
        dataCache = data;
        return data;
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
                const displayName = $(el).data("displayname");
                const search = $(el).data("search");
                const display = count >= this._maxCount ? false : search.toLowerCase().includes(value.toLowerCase()) || displayName.toLowerCase().includes(value.toLowerCase());
                $(el).toggle(display);
                if (display) count++;
            });
        });
        this.element.find("input").trigger("keyup");
        this.element.on("mouseup", (e) => { 
            const li = $(e.target).closest("li");
            if(li.length === 0) return;
            const isSelect = $(e.target).closest("li").hasClass("selected");
            if (!e.ctrlKey) this.element.find("li").removeClass("selected");
            if(e.ctrlKey) $(e.target).closest("li").toggleClass("selected");
            if (!isSelect) {
                $(e.target).closest("li").addClass("selected"); 
            }
            this._hasSelected = this.element.find("li.selected").length > 0;
        });
        this.element.on("click", ".quick-placement-toggle", (e) => { 
            e.currentTarget.classList.toggle("active");
        });
    }

    get quickPlacementOptions() { 
        const options = {};
        const quickPlacementToggles = this.element.find(".quick-placement-toggle");
        for (let toggle of quickPlacementToggles) { 
            const action = toggle.dataset.action;
            options[action] = toggle.classList.contains("active");
        }
        return options;
    }

    async close(...args) { 
        super.close(...args);
        game.Levels3DPreview.renderer.domElement.removeEventListener("mouseup", this._on3DCanvasClick, false);
        Hooks.off("controlTile", this.hookid);
    }
}


export async function getFiles(root, source = "user", extC = "glb") {
    const files = [];

    const contents = await FilePicker.browse(source, root);
    for (let file of contents.files) {
        const ext = file.split(".").pop();
        if (ext.toLowerCase() == extC) files.push(file);
    }
    for (let folder of contents.dirs) {
        //if(AssetBrowser.exclude.some(e => folder.includes(e))) continue;
        files.push(...(await getFiles(folder, source, extC)));
    }

    return files;
 }