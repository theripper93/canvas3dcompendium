export class RoomBuilder extends FormApplication {
    constructor() {
        super();
        this._mode = "union";
        this.tileCreateHook = Hooks.on("preCreateTile", this._onTileCreate.bind(this));
        ui.controls.initialize({ control: "tiles", tool: "tile" });
        canvas.tiles.activate({ tool: "tile" });
    }

    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            title: "Room Builder",
            id: "room-builder",
            classes: ["three-canvas-compendium-app"],
            template: `modules/canvas3dcompendium/templates/room-builder.hbs`,
            width: 200,
            height: "auto",
            top: 0,
            left: window.innerWidth - 550,
            resizable: false,
        };
    }

    get floorTexture() {
        return "modules/canvas3dcompendium/assets/Materials/Wood071/Wood071_NormalGL.webp"
    }

    get wallTexture() { 
        return "modules/canvas3dcompendium/assets/Materials/_Stylized2/Bricks_04/Bricks_04_NormalGL.webp"
    }

    get textureRepeat() { 
        return 7
    }

    getWallFloorPolygons(rect, elevation, mode) {
        let dynaMeshType = "polygon";
        if (mode === "floor") dynaMeshType = "polygon";
        if (mode === "wall") dynaMeshType = "polygonbevelsolidify";
        const currentSelection = [...rect];
        const toDelete = [];
        const intersectionTiles = canvas.tiles.placeables.filter((tile) => { 
            try {                
                if (tile.data.flags["levels-3d-preview"].dynaMesh !== dynaMeshType) return false;
                const depth = tile.data.flags["levels-3d-preview"].depth;
                const rb = tile.data.flags["levels"].rangeBottom;
                if (elevation < (rb - 5) || elevation > (rb + toUnits(depth) + 5)) return false;
                return true;
            } catch {
                return false;
            }
        });

        const intersectData = [];

        for (const tile of intersectionTiles) { 
            const polygonData = toWorldSpace(getPolygonFromTile(tile.document).polygon, tile.document.x, tile.document.y);
            const intersection = doPolygonsIntersect(currentSelection, polygonData);
            if (intersection) {
                intersectData.push(polygonData);
                toDelete.push(tile.document.id);
            }
        }

        canvas.scene.deleteEmbeddedDocuments("Tile", toDelete);
        
        return this.getNewPolygon(currentSelection, intersectData);

    }

    getWallPolygons(rect) {
        if (!this._wallTile) return []
        const flag = this._wallTile.getFlag("levels-3d-preview", "model3d");
        if (!flag.includes("#")) return flag.split(",").map((s) => parseFloat(s));
        const [thickness, points] = flag.split("#");
        return points.split(",").map((s) => parseFloat(s));
    }

    async getData() {
        return {}
    }

    _onTileCreate(scene, tileData) {
        if(tileData.flags["levels-3d-preview"].dynaMesh !== "box") return;
        const {x, y, width, height} = tileData;
        const elevation = tileData.flags.levels.rangeBottom;
        const polygon = [x, y, x + width, y, x + width, y + height, x, y + height, x, y].map((n) => parseInt(n));
        const floorPolygons = this.getWallFloorPolygons(polygon, elevation, "floor");
        const wallPolygons = this.getWallFloorPolygons(polygon, elevation, "wall");
        this.createFloor(floorPolygons,elevation);
        this.createWall(wallPolygons,elevation);
        return false;
    }

    async createFloor(polygons, elevation) {
        const tileData = [];
        for (let polygon of polygons) {
            
            const minX = Math.min(...polygon.filter((_, i) => i % 2 == 0));
            const minY = Math.min(...polygon.filter((_, i) => i % 2 == 1));
            const maxX = Math.max(...polygon.filter((_, i) => i % 2 == 0));
            const maxY = Math.max(...polygon.filter((_, i) => i % 2 == 1));
            const width = maxX - minX;
            const height = maxY - minY;
            polygon = toLocalSpace(polygon, minX, minY);
            const data = {
                x: minX,
                y: minY,
                width,
                height,
                flags: {
                    "levels-3d-preview": {
                        model3d: polygon.join(","),
                        dynaMesh: "polygon",
                        depth: 5,
                        imageTexture: this.floorTexture,
                        autoGround: true,
                        autoCenter: true,
                        textureRepeat: this.textureRepeat,
                    },
                    "levels": {
                        rangeBottom: elevation,
                    }
                }
            }
            tileData.push(data);
        }
        await canvas.scene.createEmbeddedDocuments("Tile", tileData);
    }

    async createWall(polygons, elevation) {
        const tileData = [];
        for (let polygon of polygons) {
            
            const minX = Math.min(...polygon.filter((_, i) => i % 2 == 0));
            const minY = Math.min(...polygon.filter((_, i) => i % 2 == 1));
            const maxX = Math.max(...polygon.filter((_, i) => i % 2 == 0));
            const maxY = Math.max(...polygon.filter((_, i) => i % 2 == 1));
            const width = maxX - minX;
            const height = maxY - minY;
            polygon = toLocalSpace(polygon, minX, minY);
            const data = {
                x: minX,
                y: minY,
                width,
                height,
                flags: {
                    "levels-3d-preview": {
                        model3d: "10#" + polygon.join(","),
                        dynaMesh: "polygonbevelsolidify",
                        depth: 200,
                        imageTexture: this.wallTexture,
                        autoGround: true,
                        autoCenter: true,
                        textureRepeat: this.textureRepeat,
                    },
                    "levels": {
                        rangeBottom: elevation,
                    }
                }
            }
            tileData.push(data);
        }
        await canvas.scene.createEmbeddedDocuments("Tile", tileData);
    }

    getNewPolygon(selectedPolygon, intersectingPolygons) {
        if(!intersectingPolygons.length) return [selectedPolygon];
        //Use the clipper library to union or subtract the new polygon from the current one

        if (this._mode == "union") {
            const clipper = new ClipperLib.Clipper();
        
            const currentPath = new ClipperLib.Path();
            for (let i = 0; i < selectedPolygon.length; i += 2) { 
                currentPath.push(new ClipperLib.IntPoint(selectedPolygon[i], selectedPolygon[i + 1]));
            }
            clipper.AddPath(currentPath, ClipperLib.PolyType.ptSubject, true);
            for (let polygon of intersectingPolygons) {
                const pathToAddOrSubtract = new ClipperLib.Path();
                for (let i = 0; i < polygon.length; i += 2) {
                    pathToAddOrSubtract.push(new ClipperLib.IntPoint(polygon[i], polygon[i + 1]));
                }
                clipper.AddPath(pathToAddOrSubtract, ClipperLib.PolyType.ptClip, true);
            }
    
            
            const solutionPaths = new ClipperLib.Paths();
            clipper.Execute(this._mode == "union" ? ClipperLib.ClipType.ctUnion : this._mode == "subtract" ? ClipperLib.ClipType.ctDifference : ClipperLib.ClipType.ctIntersection, solutionPaths, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
            const solutions = [];
            if (solutionPaths.length > 0) { 
                for (let solutionPath of solutionPaths) {
                    const solution = solutionPath.map((point) => [point.X, point.Y]).flat();
                    const dist = getDistance(solution[0], solution[1], solution[solution.length - 2], solution[solution.length - 1]);
                    if(dist < 10) solution.push(solution[0], solution[1]);
                    solutions.push(solution);
                }
            }
            return solutions;
        }
        else if (this._mode == "subtract") {
            const clipper = new ClipperLib.Clipper();
        
            const currentPath = new ClipperLib.Path();
            for (let i = 0; i < selectedPolygon.length; i += 2) { 
                currentPath.push(new ClipperLib.IntPoint(selectedPolygon[i], selectedPolygon[i + 1]));
            }
            clipper.AddPath(currentPath, ClipperLib.PolyType.ptClip, true);
            for (let polygon of intersectingPolygons) {
                const pathToAddOrSubtract = new ClipperLib.Path();
                for (let i = 0; i < polygon.length; i += 2) {
                    pathToAddOrSubtract.push(new ClipperLib.IntPoint(polygon[i], polygon[i + 1]));
                }
                clipper.AddPath(pathToAddOrSubtract, ClipperLib.PolyType.ptSubject, true);
            }
    
            
            const solutionPaths = new ClipperLib.Paths();
            clipper.Execute(this._mode == "union" ? ClipperLib.ClipType.ctUnion : this._mode == "subtract" ? ClipperLib.ClipType.ctDifference : ClipperLib.ClipType.ctIntersection, solutionPaths, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
            const solutions = [];
            if (solutionPaths.length > 0) { 
                for (let solutionPath of solutionPaths) {
                    const solution = solutionPath.map((point) => [point.X, point.Y]).flat();
                    const dist = getDistance(solution[0], solution[1], solution[solution.length - 2], solution[solution.length - 1]);
                    if(dist < 10) solution.push(solution[0], solution[1]);
                    solutions.push(solution);
                }
            }
            return solutions;
        }
    }

    getFloorPolygon(points) {
        return this.getNewPolygon(this.floorPolygon, points);
    }

    getWallPolygon(points) {
        return this.getNewPolygon(this.wallPolygon, points);
    }



    activateListeners(html) {
        super.activateListeners(html);
        html.on("click", "button", (e) => {
            e.preventDefault();
            const dataAction = e.currentTarget.dataset.action;
            if (dataAction == "union" || dataAction == "subtract" || dataAction == "intersect") { 
                this._mode = dataAction;
            }
            if(e.target.classList.contains("toggle")) {
                html.find(".toggle").removeClass("active");
                e.target.classList.add("active");
            }
        });
    }

    async close() {
        await super.close();
        Hooks.off("preCreateTile", this.tileCreateHook)
    }
}

function doPolygonsIntersect(p0, p1) {
    const p = p0;
    const q = p1;
    const pLength = p.length;
    const qLength = q.length;
    for (let i = 0; i < pLength; i += 2) {
        const p0x = p[i];
        const p0y = p[i + 1];
        const p1x = p[(i + 2) % pLength];
        const p1y = p[(i + 3) % pLength];
        for (let j = 0; j < qLength; j += 2) {
            const q0x = q[j];
            const q0y = q[j + 1];
            const q1x = q[(j + 2) % qLength];
            const q1y = q[(j + 3) % qLength];
            if (doLinesIntersect(p0x, p0y, p1x, p1y, q0x, q0y, q1x, q1y)) return true;
        }
    }
    return false;
}

function doLinesIntersect(p0x, p0y, p1x, p1y, q0x, q0y, q1x, q1y) {
    const r = (p1y - p0y) * (q1x - q0x) - (p1x - p0x) * (q1y - q0y);
    if (r == 0) return false;
    const s = (p1x - p0x) * (q0y - p0y) - (p1y - p0y) * (q0x - p0x);
    const t = (q1x - q0x) * (q0y - p0y) - (q1y - q0y) * (q0x - p0x);
    return (s >= 0 && s <= r && t >= 0 && t <= r);
}

function toLocalSpace(polygon, x, y) {
    return polygon.map((n, index) => index % 2 == 0 ? n - x : n - y);
}

function toWorldSpace(polygon, x, y) {
    return polygon.map((n, index) => index % 2 == 0 ? n + x : n + y);
}

function toUnits(pixels) {
    return (pixels * canvas.scene.dimensions.distance) / canvas.scene.dimensions.size;
}

function getPolygonFromTile(tileDocument) {
    const flags = tileDocument.getFlag("levels-3d-preview", "model3d");
    if (flags) {
        if (!flags.includes("#")) return {thickness: null, polygon: flags.split(",").map((s) => parseInt(s))};
        const [thickness, points] = flags.split("#");
        return {thickness: parseInt(thickness), polygon: points.split(",").map((s) => parseInt(s))};
    }
    return null;
}

function getDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function isPolygonClosed(polygon) {
    return polygon[0] == polygon[polygon.length - 2] && polygon[1] == polygon[polygon.length - 1];
}