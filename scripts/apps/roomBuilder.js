export class RoomBuilder extends FormApplication {
    constructor() {
        super();
        this._mode = "union";
        this._shape = "rectangle";
        this._smooth = true;
        this.tileCreateHook = Hooks.on("preCreateTile", this._onTileCreate.bind(this));
        ui.controls.initialize({ control: "tiles", tool: "tile" });
        canvas.tiles.activate({tool: "tile"});
        game.Levels3DPreview.CONFIG.UI.windows.RoomBuilder = this;
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

    get solidifyType() {
        return this._smooth ? "polygonbevelsolidify" : "polygonbevelsolidifyjagged";
    }

    get thickness() { 
        return parseInt(this.element.find("#thickness").val()) || 10;
    }

    get height() {
        return parseInt(this.element.find("#height").val()) || canvas.scene.grid.size * 2.5;
    }

    get theme() {
        const selectValue = this.element.find("#theme").val();
        return themes[selectValue];
    }

    get floorTexture() {
        return this.theme.floor ?? this.element.find("#floorTexture").val();
    }

    get wallTexture() { 
        return this.theme.wall ?? this.element.find("#wallTexture").val();
    }

    get textureRepeat() { 
        return 7
    }

    get wallRepeat() {
        return this.theme.wallRepeat ?? this.textureRepeat;
    }

    get floorRepeat() {
        return this.theme.floorRepeat ?? this.textureRepeat;
    }

    get useFloors() {
        return this.element.find("#floor")[0].classList.contains("active");
    }

    get useWalls() {
        return this.element.find("#wall")[0].classList.contains("active");
    }
    
    getIntersectingTiles(rect, elevation, dynaMeshType) {
        dynaMeshType instanceof Array ? dynaMeshType : [dynaMeshType];
        const currentSelection = [...rect];
        const toDelete = [];
        const tiles = [];
        const intersectionTiles = canvas.tiles.placeables.filter((tile) => { 
            try {                
                if (!dynaMeshType.includes(tile.data.flags["levels-3d-preview"].dynaMesh)) return false;
                const depth = Math.max(tile.data.flags["levels-3d-preview"].depth, 50) - 15;
                const rb = tile.data.flags["levels"].rangeBottom;
                if (elevation < (rb - 5) || elevation > (rb + toUnits(depth))) return false;
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
                tiles.push(tile);
            }
        }
        return { toDelete, intersectingTiles: tiles, intersectData, currentSelection };
    }

    getWallFloorPolygons(rect, elevation, mode) {
        let dynaMeshType = "polygon";
        if (mode === "floor") dynaMeshType = "polygon";
        if (mode === "wall") dynaMeshType = ["polygonbevelsolidify", "polygonbevelsolidifyjagged"];

        const { toDelete, intersectingTiles, intersectData, currentSelection } = this.getIntersectingTiles(rect, elevation, dynaMeshType);

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
        const themesSelect = {};
        for (const [key, value] of Object.entries(themes)) { 
            themesSelect[key] = value.name;
        }
        return {
            themes: themesSelect,
            height: canvas.scene.grid.size * 2.5,
        }
    }

    _onTileCreate(scene, tileData) {
        const isBox = tileData.flags["levels-3d-preview"].dynaMesh === "box";
        const isPolygon = tileData.flags["levels-3d-preview"].fromPolygonTool;
        if (!isBox && !isPolygon) return;
        const elevation = tileData.flags.levels.rangeBottom;
        const {x, y, width, height} = tileData;
        const polygonToolPoints = isPolygon ? toWorldSpace(getPolygonFromTile(tileData).polygon, x, y) : null;
        const isClosed = isPolygon ? polygonToolPoints[0] === polygonToolPoints[polygonToolPoints.length - 2] && polygonToolPoints[1] === polygonToolPoints[polygonToolPoints.length - 1] : false;
        if (width === 0 || height === 0) {
            this.createSingleWall(x, y, width, height, elevation);
            return false;
        }
        const polygon = this.getBasicPolygon(x, y, width, height, polygonToolPoints);
        if (isPolygon && !isClosed) {
            this.createWall([polygon], elevation);
            return false;
        }
        if (this._mode == "knife") {
            this.cutWall(polygon, elevation);
            return false;
        }
        if (this.useFloors) {
            const floorPolygons = this.getWallFloorPolygons(polygon, elevation, "floor");
            this.createFloor(floorPolygons,elevation);    
        }
        if (this.useWalls) {
            const wallPolygons = this.getWallFloorPolygons(polygon, elevation, "wall");
            this.createWall(wallPolygons,elevation);
        }
        return false;
    }

    async cutWall(polygon, elevation) {
        const {intersectingTiles, intersectData} = this.getIntersectingTiles(polygon, elevation, ["polygonbevelsolidify", "polygonbevelsolidifyjagged"]);
        const toCreate = [];
        const toDelete = [];
        for (let i = 0; i < intersectingTiles.length; i++) { 
            const tilePolygon = intersectData[i];
            const tile = intersectingTiles[i];
            const prevMode = this._mode;
            this._mode = "subtract";
            const newPolygons = this.getNewPolygon(polygon, [tilePolygon], false);
            this._mode = prevMode;
            if(newPolygons.length > 0) {
                toCreate.push(...newPolygons);
                toDelete.push(tile.document.id);
            }
        }

        await canvas.scene.deleteEmbeddedDocuments("Tile", toDelete);
        this.createWall(toCreate, elevation);
    }

    getBasicPolygon(x, y, width, height, polygon) { 
        switch (this._shape) { 
            case "rectangle":
                return [x, y, x + width, y, x + width, y + height, x, y + height, x, y].map((n) => parseInt(n));
            case "ellipse":
                return createEllipsePolygon(x, y, width, height);
            case "polygon":
                return polygon;
            case "spline":
                const vec2Points = [];
                for (let i = 0; i < polygon.length; i += 2) { 
                    vec2Points.push(new game.Levels3DPreview.THREE.Vector2(polygon[i], polygon[i + 1]));
                }
                const spline = new game.Levels3DPreview.THREE.SplineCurve(vec2Points);
                const points = spline.getPoints(polygon.length * 2);
                const newPolygon = [];
                for (let point of points) {
                    newPolygon.push(point.x, point.y);
                }
                return newPolygon;
        }
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
                        textureRepeat: this.floorRepeat,
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
                x: minX - this.thickness * 2,
                y: minY - this.thickness * 2,
                width: width + this.thickness * 4,
                height: height + this.thickness * 4,
                flags: {
                    "levels-3d-preview": {
                        model3d: this.thickness + "#" + polygon.join(","),
                        dynaMesh: this.solidifyType,
                        depth: this.height,
                        imageTexture: this.wallTexture,
                        autoGround: true,
                        autoCenter: true,
                        textureRepeat: this.wallRepeat,
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

    async createSingleWall(x, y, width, height, elevation) { 
        let polygon = [];
        if(width === 0) {
            polygon = [x, y, x, y + height];
        } else {
            polygon = [x, y, x + width, y];
        }
        let minX = Math.min(...polygon.filter((_, i) => i % 2 == 0));
        let minY = Math.min(...polygon.filter((_, i) => i % 2 == 1));
        const maxX = Math.max(...polygon.filter((_, i) => i % 2 == 0));
        const maxY = Math.max(...polygon.filter((_, i) => i % 2 == 1));
        width = maxX - minX;
        height = maxY - minY;
        if (width === 0) {
            width = this.thickness * 4;
            minX -= this.thickness;
        }
        if (height === 0) {
            height = this.thickness * 4;
            minY -= this.thickness;
        }
        polygon = toLocalSpace(polygon, minX, minY);
        const data = {
            x: minX,
            y: minY,
            width,
            height,
            flags: {
                "levels-3d-preview": {
                    model3d: this.thickness + "#" + polygon.join(","),
                    dynaMesh: this.solidifyType,
                    depth: this.height,
                    imageTexture: this.wallTexture,
                    autoGround: true,
                    autoCenter: true,
                    textureRepeat: this.wallRepeat,
                },
                "levels": {
                    rangeBottom: elevation,
                }
            }
        }
        await canvas.scene.createEmbeddedDocuments("Tile", [data]);
    }

    getNewPolygon(selectedPolygon, intersectingPolygons, closed = true) {
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
                    solution.push(solution[0], solution[1]);
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
                clipper.AddPath(pathToAddOrSubtract, ClipperLib.PolyType.ptSubject, closed);
            }
    
            const solutionPaths = new ClipperLib.PolyTree();
            clipper.Execute(this._mode == "union" ? ClipperLib.ClipType.ctUnion : this._mode == "subtract" ? ClipperLib.ClipType.ctDifference : ClipperLib.ClipType.ctIntersection, solutionPaths, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
            const solutions = [];
            if (solutionPaths?.m_AllPolys.length > 0) { 
                for (let solutionPath of solutionPaths.m_AllPolys) {
                    const solution = solutionPath.m_polygon.map((point) => [point.X, point.Y]).flat();
                    if(closed) solution.push(solution[0], solution[1]);
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
            if (dataAction == "union" || dataAction == "subtract" || dataAction == "intersect" || dataAction == "knife") { 
                this._mode = dataAction;
            }
            if (dataAction == "rectangle" || dataAction == "ellipse" || dataAction == "polygon" || dataAction == "spline") {
                this._shape = dataAction;
                if (this._shape == "polygon" || this._shape == "spline") {
                    ui.controls.initialize({ control: "tiles", tool: "tile3dPolygon" });
                    canvas.tiles.activate({tool: "tile3dPolygon"});
                } else {
                    ui.controls.initialize({ control: "tiles", tool: "tile" });
                    canvas.tiles.activate({tool: "tile"});
                }
            }
            if (dataAction == "smooth" || dataAction == "rough") { 
                this._smooth = dataAction == "smooth";
            }
            if (e.currentTarget.classList.contains("toggle") && e.currentTarget.classList.contains("entity")) {
                const isActive = e.currentTarget.classList.contains("active");
                if(isActive) e.currentTarget.classList.remove("active");
                else e.currentTarget.classList.add("active");
            } else if (e.currentTarget.classList.contains("toggle")) {
                for (let child of e.currentTarget.parentElement.children) {
                    if (child.classList.contains("toggle") && !child.classList.contains("entity")) child.classList.remove("active");
                }
                e.currentTarget.classList.add("active");
            }
        });
    }

    async close() {
        await super.close();
        Hooks.off("preCreateTile", this.tileCreateHook)
        game.Levels3DPreview.CONFIG.UI.windows.RoomBuilder = null;
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

export function toWorldSpace(polygon, x, y) {
    return polygon.map((n, index) => index % 2 == 0 ? n + x : n + y);
}

function toUnits(pixels) {
    return (pixels * canvas.scene.dimensions.distance) / canvas.scene.dimensions.size;
}

export function getPolygonFromTile(tileDocument) {
    const flags = tileDocument.flags["levels-3d-preview"]?.model3d;
    if (flags) {
        if (!flags.includes("#")) return {thickness: null, polygon: flags.split(",").map((s) => parseInt(s))};
        const [thickness, points] = flags.split("#");
        const isWall = tileDocument.flags["levels-3d-preview"]?.dynaMesh == "polygonbevelsolidify" || tileDocument.flags["levels-3d-preview"]?.dynaMesh == "polygonbevelsolidifyjagged";
        let mappedPoints = points.split(",").map((s) => parseInt(s));
        if(isWall) mappedPoints = mappedPoints.map((p) => p + thickness*2)
        return {thickness: parseInt(thickness), polygon: mappedPoints};
    }
    return null;
}

function createEllipsePolygon(x, y, width, height) {
    const points = [];
    const step = Math.PI / 16;
    width /= 2;
    height /= 2;
    x += width;
    y += height;
    for (let angle = 0; angle < Math.PI * 2; angle += step) {
        points.push(x + width * Math.cos(angle));
        points.push(y + height * Math.sin(angle));
    }
    points.push(points[0]);
    points.push(points[1]);

    return points
}

const themes = {
    "custom": {
        name: "Custom",
    },
    "bricks1": {
        name: "Interior (Elegant)",
        floor: "modules/canvas3dcompendium/assets/Materials/WoodFloor008/WoodFloor008_NormalGL.webp",
        floorRepeat: 7,
        wall: "modules/canvas3dcompendium/assets/Materials/_Stylized2/Bricks_04/Bricks_04_NormalGL.webp",
        wallRepeat: 7,
    },
    "bricks2": {
        name: "Interior (Bricks)",
        floor: "modules/canvas3dcompendium/assets/Materials/PavingStones079/PavingStones079_NormalGL.webp",
        floorRepeat: 2,
        wall: "modules/canvas3dcompendium/assets/Materials/_Stylized2/Bricks_06/Bricks_06_NormalGL.webp",
        wallRepeat: 7,
    },
    "wooden1": {
        name: "Interior (Wooden)",
        floor: "modules/canvas3dcompendium/assets/Materials/_Stylized2/WoodPlanks_07/WoodPlanks_07_NormalGL.webp",
        floorRepeat: 7,
        wall: "modules/canvas3dcompendium/assets/Materials/_Stylized2/WoodPlanks_08/WoodPlanks_08_NormalGL.webp",
        wallRepeat: 4,
    },
    "modern": {
        name: "Interior (Modern)",
        floor: "modules/canvas3dcompendium/assets/Materials/WoodFloor004/WoodFloor004_NormalGL.webp",
        floorRepeat: 1,
        wall: "modules/canvas3dcompendium/assets/Materials/Paint004/Paint004_NormalGL.webp",
        wallRepeat: 2,
    },
    "caveDirt": {
        name: "Cave (Dirt)",
        floor: "modules/canvas3dcompendium/assets/Materials/_Stylized2/Dirt_06/Dirt_06_NormalGL.webp",
        floorRepeat: 3,
        wall: "modules/canvas3dcompendium/assets/Materials/_Stylized2/Cliff_05/Cliff_05_NormalGL.webp",
        wallRepeat: 1.7,
    },
    "caveStone": {
        name: "Cave (Stone)",
        floor: "modules/canvas3dcompendium/assets/Materials/_Stylized2/Dirt_09/Dirt_09_NormalGL.webp",
        floorRepeat: 1.2,
        wall: "modules/canvas3dcompendium/assets/Materials/_Stylized2/Cliff_04/Cliff_04_NormalGL.webp",
        wallRepeat: 5,
    },
    "caveSand": {
        name: "Cave (Sand)",
        floor: "modules/canvas3dcompendium/assets/Materials/_Stylized2/Dirt_01/Dirt_01_NormalGL.webp",
        floorRepeat: 1.2,
        wall: "modules/canvas3dcompendium/assets/Materials/_Stylized2/Cliff_01/Cliff_01_NormalGL.webp",
        wallRepeat: 1,
    },
    "caveRealistic": {
        name: "Cave (Realistic)",
        floor: "modules/canvas3dcompendium/assets/Materials/Rock010/Rock010_NormalGL.webp",
        floorRepeat: 2,
        wall: "modules/canvas3dcompendium/assets/Materials/Rock010/Rock010_NormalGL.webp",
        wallRepeat: 2.5,
    },
    "sewers": {
        name: "Sewers",
        floor: "modules/canvas3dcompendium/assets/Materials/PavingStones089/PavingStones089_NormalGL.webp",
        floorRepeat: 1,
        wall: "modules/canvas3dcompendium/assets/Materials/PavingStones084/PavingStones084_NormalGL.webp",
        wallRepeat: 2,
    },
};