let fileCache = null;
let dataCache = null;

let _this = null;

export class AssetBrowser extends Application {
    constructor() {
        super();
        game.Levels3DPreview.CONFIG.UI.windows.AssetBrowser = this;
        this._maxCount = 200;
        this._hasSelected = false;
        this.lastPlacementPosition = new game.Levels3DPreview.THREE.Vector3();
        game.Levels3DPreview.renderer.domElement.addEventListener("mouseup", this._on3DCanvasClick, false);
        game.Levels3DPreview.renderer.domElement.addEventListener("mousemove", this._on3DCanvasMove, false);
        _this = this;
    }

    get sources() {
        const sources = this.defaultSources;
        const custom = game.settings.get("canvas3dcompendium", "assetBrowserCustomPath");
        if (custom) sources.push(custom);
        return sources;
    }

    get defaultSources() {
        return ["modules/canvas3dcompendium/assets/Tiles", "modules/baileywiki-3d"];
    }

    static get exclude() {
        return [];
    }

    static scale = 1;

    static density = 10;

    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            title: "Asset Browser",
            id: "asset-browser",
            classes: ["three-canvas-compendium-app"],
            template: `modules/canvas3dcompendium/templates/material-explorer.hbs`,
            width: 390,
            height: window.innerHeight * 0.8,
            resizable: true,
            dragDrop: [{ dragSelector: "li", dropSelector: "" }],
        };
    }

    get title() {
        return "Asset Browser: " + this._assetCount + " assets available";
    }

    get currentPoint() {
        return game.Levels3DPreview.interactionManager.mouseIntersection3DCollision(undefined, true, "compendium")[0];
    }

    _on3DCanvasMove(event) {
        if (!_this.quickPlacementOptions.paint) return;
        if (!_this._hasSelected || !game.Levels3DPreview.interactionManager._leftDown || !_this.currentPoint?.point) return;
        const currentPos = _this.currentPoint.point;
        if (!_this.lastPlacementPosition) return _this._on3DCanvasClick(event, true); 
        if (!currentPos || currentPos.distanceTo(_this.lastPlacementPosition) < 1 / AssetBrowser.density) return;
        _this._on3DCanvasClick(event, true);
    }

    _on3DCanvasClick(event, fromDrag = false) {
        if (!event.shiftKey && !fromDrag) return;
        const currentIntersect = _this.currentPoint;
        if (!_this._hasSelected || (event.which !== 1 && !fromDrag) || !currentIntersect) return;
        canvas.tiles.releaseAll();
        _this.lastPlacementPosition.copy(currentIntersect.point);
        const srcs = [];
        _this.element.find("li.selected").each((i, el) => srcs.push(el.dataset.output));
        const randomSrc = srcs[Math.floor(Math.random() * srcs.length)];
        const angle = parseFloat(_this.element.find("#angle").val() || 0);
        let color = _this.element.find("#color").val();
        const options = _this.quickPlacementOptions;
        let normal = null;
        let scale = AssetBrowser.scale;
        const grid = options.grid;
        const randomRotate = options.rotation;
        const rotation = randomRotate ? Math.random() * 360 : angle;
        if (options.scale) scale *= Math.random() + 0.5;
        if (options.normal) normal = currentIntersect.face.normal;
        if (options.colorvar) {
            const threecolor = new game.Levels3DPreview.THREE.Color(color);
            const hsl = threecolor.getHSL(new game.Levels3DPreview.THREE.Color());
            const hue = hsl.h + (Math.random() - 0.5) * 0.05;
            const sat = hsl.s + (Math.random() - 0.5) * 0.4;
            const lum = hsl.l + (Math.random() - 0.5) * 0.4;
            threecolor.setHSL(hue, sat, lum);
            color = "#" + threecolor.getHexString();
        }
        //AssetBrowser.scale = scale;
        const sight = _this.quickPlacementOptions.sight;
        const collision = _this.quickPlacementOptions.collision;
        const cameraCollision = _this.quickPlacementOptions.cameraCollision;
        const dragData = {
            type: "Tile",
            texture: { src: randomSrc },
            tileSize: canvas.dimensions.size / scale,
            params: { color, sight, collision, cameraCollision },
            coord3d: currentIntersect.point,
        };

        game.Levels3DPreview.interactionManager._onDrop(event, grid, normal, dragData, rotation, options.center);
    }

    _onDragStart(event) {
        canvas.tiles.releaseAll();
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
            dataCache.density = AssetBrowser.density !== 10 ? AssetBrowser.density : "";
            return dataCache;
        } else {
            ui.notifications.info("Loading 3D asset list, please wait...");
        }
        const materials = [];
        const files = fileCache ?? (await this.getSources());
        fileCache = files;
        for (let file of files) {
            const filename = file.split("/").pop().replaceAll("%20", "_");
            const cleanName = filename.replaceAll("_", " ").replace(".glb", "");
            materials.push({
                displayName: cleanName.replace("MZ4250 - ", ""),
                preview: file.replace(".glb", ".webp"),
                output: file,
                search: file.split("/assets/Tiles/").pop(),
            });
        }
        materials.sort((a, b) => a.displayName.localeCompare(b.displayName));
        data.materials = materials;
        data.isAssetBrowser = true;
        data.scale = AssetBrowser.scale || 1;
        data.density = AssetBrowser.density || 10;
        data.angle = AssetBrowser.angle || 0;
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
            if (!this.defaultSources.includes(target)) source = FilePicker.prototype._inferCurrentDirectory(target)[0];
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
        this.startTour();
        this.element.find("#selected-notification").toggle(false);
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
            this.element.find("#selected-notification").toggle(this._hasSelected, 200);
            if (this._hasSelected) canvas.tiles.releaseAll();
        });
        this.element.on("click", ".quick-placement-toggle", (e) => {
            e.currentTarget.classList.toggle("active");
        });
        this.element.on("change", "#scale", (e) => {
            AssetBrowser.scale = parseFloat(e.target.value);
        });
        this.element.on("change", "#density", (e) => {
            AssetBrowser.density = parseFloat(e.target.value);
        });
    }

    startTour() {
        const done = game.settings.get("canvas3dcompendium", "assetbrowsertour");
        if (done) return;
        game.settings.set("canvas3dcompendium", "assetbrowsertour", true);
        setTimeout(() => {
            game.tours.get("levels-3d-preview.asset-browser").start();
        }, 2000);
    }

    _getHeaderButtons() { 
        const buttons = super._getHeaderButtons();
        buttons.unshift({
            label: "Merge",
            class: "merge",
            icon: "fas fa-object-group",
            onclick: () => {
                game.Levels3DPreview.UTILS.autoMergeTiles();
            },
        });
        return buttons;
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
        game.Levels3DPreview.renderer.domElement.removeEventListener("mousemove", this._on3DCanvasMove, false);
        game.Levels3DPreview.CONFIG.UI.windows.assetBrowser = null;
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

function wait (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}