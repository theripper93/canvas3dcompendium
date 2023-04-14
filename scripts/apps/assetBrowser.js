import { toWorldSpace, getPolygonFromTile } from "./roomBuilder.js";

let fileCache = null;
let dataCache = null;

let _this = null;

export class AssetBrowser extends Application {
    constructor() {
        super();
        game.Levels3DPreview.CONFIG.UI.windows.AssetBrowser = this;
        this._maxCount = 400;
        this._hasSelected = false;
        this.lastPlacementPosition = new game.Levels3DPreview.THREE.Vector3();
        game.Levels3DPreview.renderer.domElement.addEventListener("mouseup", this._on3DCanvasClick, false);
        game.Levels3DPreview.renderer.domElement.addEventListener("mousemove", this._on3DCanvasMove, false);
        this.tilePreCrateHookId = Hooks.on("preCreateTile", this._onTileCreate.bind(this));
        _this = this;
    }

    get sources() {
        const sources = AssetBrowser.defaultSources;
        const custom = game.settings.get("canvas3dcompendium", "assetBrowserCustomPath");
        if (custom) sources.push(custom);
        return sources;
    }

    static defaultSources = [];

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
        if (!event.shiftKey || event.which !== 1 || !_this.quickPlacementOptions.paint) return;
        if (!_this._hasSelected || !_this.currentPoint?.point) return;
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
        const dragData = _this.buildTileData();

        game.Levels3DPreview.interactionManager._onDrop(event, dragData);
    }

    _onTileCreate(tile, tileData) {
        if (!this.quickPlacementOptions.paint) return;
        const isBox = tileData.flags["levels-3d-preview"].dynaMesh === "box";
        const isPolygon = tileData.flags["levels-3d-preview"].fromPolygonTool;
        if (!isBox && !isPolygon) return;
        const depth = tileData.flags["levels-3d-preview"].depth;
        const elevation = tileData.flags.levels.rangeBottom + (depth * canvas.scene.dimensions.distance) / canvas.scene.dimensions.size;
        const {x, y, width, height} = tileData;
        const approxArea = width * height;
        const pointCount = (approxArea / Math.pow(canvas.grid.size, 2)) * AssetBrowser.density * 0.3;
        const polygonToolPoints = isPolygon ? toWorldSpace(getPolygonFromTile(tileData).polygon, x, y) : [x, y, x + width, y, x + width, y + height, x, y + height, x, y].map((n) => parseInt(n));
        const randomPoints = getRandomPointsInsidePolygon(polygonToolPoints, pointCount);
        const pos3D = (...args) => game.Levels3DPreview.CONFIG.entityClass.Ruler3D.posCanvasTo3d(...args);
        const collisionPoints = [];
        for (const point of randomPoints) {
            const origin = pos3D({x: point.x, y: point.y, z: elevation + canvas.scene.dimensions.distance});
            const target = pos3D({x: point.x, y: point.y, z: elevation -1000});
            const collision = game.Levels3DPreview.interactionManager.computeSightCollisionFrom3DPositions(origin, target, "collision", false, false, false, true);
            if (collision){
                const dragData = _this.buildTileData(null, collision[0]);
                game.Levels3DPreview.interactionManager._onDrop(new Event("click"), dragData);
            }
        }
        return false;
    }

    buildTileData(src, collisionPoint) {
        const currentIntersect = collisionPoint ?? _this.currentPoint;
        if (currentIntersect?.point) _this.lastPlacementPosition.copy(currentIntersect.point);
        const srcs = [];
        src ? srcs.push(src) : _this.element.find("li.selected").each((i, el) => srcs.push(el.dataset.output));
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
        if (options.normal) normal = currentIntersect?.face?.normal ?? {x: 0, y: 1, z: 0};
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
        const isImage = !randomSrc.toLowerCase().endsWith(".glb") && !randomSrc.toLowerCase().endsWith(".gltf");
        const dragData = {
            type: "Tile",
            texture: { src: randomSrc },
            tileSize: canvas.dimensions.size / scale,
            params: { color, sight, collision, cameraCollision, dynaMesh: isImage ? "billboard2" : "default", castShadow: !isImage },
            coord3d: currentIntersect?.point ?? null,
            assetBrowser: {
                grid,
                normal,
                rotation,
                pos: options.center,
            },
        };
        if(src) delete dragData.coord3d;

        return dragData;
    }

    _onDragStart(event) {
        canvas.tiles.releaseAll();
        const src = event.currentTarget.dataset.output;
        const dragData = _this.buildTileData(src);
        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }

    async getData() {
        const data = super.getData();
        data.assetPacks = AssetBrowser.assetPacks;
        if (dataCache) {
            this._assetCount = dataCache.materials.length;
            dataCache.scale = AssetBrowser.scale || 1;
            dataCache.density = AssetBrowser.density || 10;
            dataCache.angle = AssetBrowser.angle || 0;
            return dataCache;
        }
        const materials = [];
        const files = fileCache ?? (await this.getSources());
        fileCache = files;
        for (let file of files) {
            const filename = file.split("/").pop().replaceAll("%20", "_");
            const cleanName = filename.replaceAll("_", " ").replace(".glb", "").replace(".gltf", "")
            materials.push({
                displayName: cleanName.replace("MZ4250 - ", ""),
                preview: file.replace(".glb", ".webp").replace(".gltf", ".webp"),
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
        const files = [];
        const billboards = await getFiles("modules/canvas3dcompendium/assets/Vegetation_billboard/high_res", "", "webp");
        files.push(...billboards);
        for (let target of this.sources) {
            let sourceFiles;
            try {
                sourceFiles = await getFiles(target, "");
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
        this.element.find(`.tab[data-tab="options"]`).show();
        this.element.find(".tab-button").on("click", (e) => { 
            const tab = $(e.target).data("tab");
            this.element.find(".tab").hide();
            this.element.find(`.tab[data-tab="${tab}"]`).show();
            this.element.find(".tab-button").removeClass("active");
            $(e.target).addClass("active");
        });
        this.element.find("#toggle-tabs").on("click", (e) => { 
            this.element.find(".tab").toggleClass("hidden");
            $(e.currentTarget).find("i").toggleClass("fa-caret-up fa-caret-down");
        });
        this.element.find("#selected-notification").toggle(false);
        this.element.find(".material-confirm").hide();
        this.element.on("keyup", "#search", this.onSearch.bind(this));
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
        this.element.on("change", "#asset-packs", this.onSearch.bind(this));
        this.element.on("click", ".quick-placement-toggle", (e) => {
            e.currentTarget.classList.toggle("active");
        });
        this.element.on("click", ".utility-button", (e) => { 
            const action = e.currentTarget.dataset.action;
            runScript(action);
        });
        this.element.on("change", "#scale", (e) => {
            AssetBrowser.scale = parseFloat(e.target.value);
        });
        this.element.on("change", "#density", (e) => {
            AssetBrowser.density = parseFloat(e.target.value);
        });
    }

    onSearch() {
        const value = this.element.find("#search").val();
        const packData = this.element.find("#asset-packs").val().split(",").filter((p) => p).map(p => p.trim().toLowerCase().replaceAll(" ", "%20"));
        const packName = packData[0].toLowerCase();
        const pack = packData.filter((p) => p !== packName);
        let count = 0;
        this.element.find("li").each((i, el) => {
            const displayName = $(el).data("displayname");
            const search = $(el).data("output");
            const searchLC = search.toLowerCase();
            const inSearch = count >= this._maxCount ? false : searchLC.includes(value.toLowerCase()) || displayName.toLowerCase().includes(value.toLowerCase());
            const packMatch = packName === "all" || (searchLC.includes(packName) && pack.some((p) => searchLC.includes(p)));
            const display = inSearch && packMatch;
            $(el).toggle(display);
            if (display) count++;
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

    get quickPlacementOptions() {
        const options = {};
        const quickPlacementToggles = this.element.find(".quick-placement-toggle");
        for (let toggle of quickPlacementToggles) {
            const action = toggle.dataset.action;
            options[action] = toggle.classList.contains("active");
        }
        return options;
    }

    async _render(...args) { 
        const res = await super._render(...args);
        this.startTour();
        return res;
    }

    async close(...args) {
        super.close(...args);
        Hooks.off("preCreateTile", this.tilePreCrateHookId);
        game.Levels3DPreview.renderer.domElement.removeEventListener("mouseup", this._on3DCanvasClick, false);
        game.Levels3DPreview.renderer.domElement.removeEventListener("mousemove", this._on3DCanvasMove, false);
        game.Levels3DPreview.CONFIG.UI.windows.assetBrowser = null;
    }

    static registerPack(packId, packName, assetPacks = [], options = {}) {
        let packPath = `modules/${packId}`;
        if(options.subfolder) packPath += `/${options.subfolder}`;
        if (!AssetBrowser.defaultSources.includes(packPath)) AssetBrowser.defaultSources.push(packPath);
        if(!assetPacks.length) return;
        assetPacks.map((p) => {
            p.query = packId + "," + p.query;
            p.query = p.query.toLowerCase();
            p.query.replaceAll(" ", "%20");
            return p;
        });
        assetPacks.sort((a, b) => a.name.localeCompare(b.name));
        if (!AssetBrowser.assetPacks[packId]) {
            AssetBrowser.assetPacks[packId] = { name: packName, packs: assetPacks };
        } else {
            AssetBrowser.assetPacks[packId].packs.push(...assetPacks);
        }
    }
}

AssetBrowser.assetPacks = {};

export async function getFiles(root, source = "user", extC = ["glb","gltf"], outerPass = true) {
    const files = [];
    extC = extC instanceof Array ? extC : [extC];
    source = new FilePicker()._inferCurrentDirectory(root)[0];
    const contents = await FilePicker.browse(source, root);
    for (let file of contents.files) {
        const ext = file.split(".").pop();
        if (extC.includes(ext.toLowerCase())) files.push(file);
    }
    for (let i = 0; i < contents.dirs.length; i++) {
        let folder = contents.dirs[i];
        if (outerPass) SceneNavigation.displayProgressBar({ label: `Loading assets in folder: ${folder}`, pct: Math.round(((i+1) / contents.dirs.length) * 100) });
        files.push(...(await getFiles(folder, source, extC, false)));
    }

    return files;
}

function wait (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runScript(id) {
    switch (id) { 
        case "merge":
            game.Levels3DPreview.UTILS.autoMergeTiles();
            break;
        case "split":
            game.Levels3DPreview.UTILS.unmergeTiles();
            break;
        case "lock":
            const tiles = canvas.tiles.controlled;
            if (!tiles.length) return ui.notifications.error("Please select a tile to lock/unlock.");
            const locked = tiles[0].document.locked;
            const updates = tiles.map(tile => {
                return {_id: tile.id, locked: !tile.data.locked};
            });
            await canvas.scene.updateEmbeddedDocuments("Tile", updates);
            ui.notifications.info(`Tile/s ${locked ? "unlocked" : "locked"}.`);
            break;
        case "extrude":
            game.Levels3DPreview.UTILS.extractPointsFromDrawing();
            break;
        case "extrude-walls":
            game.Levels3DPreview.UTILS.extrudeWalls();
            break;
    }
}

function getRandomPointsInsidePolygon(polygon, nPoints) {
    const pointPolygon = [];
    for (let i = 0; i < polygon.length; i += 2) {
        const x = polygon[i];
        const y = polygon[i + 1];
        pointPolygon.push({x, y});
    }
    const minX = Math.min(...pointPolygon.map(p => p.x));
    const maxX = Math.max(...pointPolygon.map(p => p.x));
    const minY = Math.min(...pointPolygon.map(p => p.y));
    const maxY = Math.max(...pointPolygon.map(p => p.y));
    polygon = new PIXI.Polygon(polygon)
    const points = [];
    while (points.length < nPoints) {
        const point = {x: Math.random() * (maxX - minX) + minX, y: Math.random() * (maxY - minY) + minY};
        if (polygon.contains(point.x,point.y)) points.push(point);
    }

    return points;
}