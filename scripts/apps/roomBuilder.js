export class RoomBuilder extends FormApplication {
    constructor() {
        super();
        this._mode = "union";
        this.tileCreateHook = Hooks.on("preCreateTile", this._onTileCreate.bind(this));
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

    get floorPolygon() {
        if (!this._floorTile) return []
        const flag = this._floorTile.getFlag("levels-3d-preview", "model3d");
        if (!flag.includes("#")) return flag.split(",").map((s) => parseFloat(s));
        const [thickness, points] = flag.split("#");
        return points.split(",").map((s) => parseFloat(s));
    }

    get wallPolygon() {
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
        const floorPolygon = this.getFloorPolygon(polygon);
        const wallPolygon = this.getWallPolygon(polygon);
        this.createFloor(floorPolygon,elevation);
        this.createWall(wallPolygon,elevation);
        return false;
    }

    async createFloor(polygon, elevation) {
        const minX = Math.min(...polygon.filter((_, i) => i % 2 == 0));
        const minY = Math.min(...polygon.filter((_, i) => i % 2 == 1));
        const maxX = Math.max(...polygon.filter((_, i) => i % 2 == 0));
        const maxY = Math.max(...polygon.filter((_, i) => i % 2 == 1));
        const width = maxX - minX;
        const height = maxY - minY;
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
        if (this._floorTile) {
            this._floorTile.update(data);
        } else {
            this._floorTile = (await canvas.scene.createEmbeddedDocuments("Tile", [data]))[0];
        }
    }

    async createWall(polygon, elevation) {
        const minX = Math.min(...polygon.filter((_, i) => i % 2 == 0));
        const minY = Math.min(...polygon.filter((_, i) => i % 2 == 1));
        const maxX = Math.max(...polygon.filter((_, i) => i % 2 == 0));
        const maxY = Math.max(...polygon.filter((_, i) => i % 2 == 1));
        const width = maxX - minX;
        const height = maxY - minY;
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
        if (this._wallTile) {
            this._wallTile.update(data);
        } else {
            this._wallTile = (await canvas.scene.createEmbeddedDocuments("Tile", [data]))[0];
        }
    }

    getNewPolygon(currentPoints, points) {
        if(!currentPoints.length) return points;
        //Use the clipper library to union or subtract the new polygon from the current one
        const clipper = new ClipperLib.Clipper();
        
        const currentPath = new ClipperLib.Path();
        for (let i = 0; i < currentPoints.length; i += 2) { 
            currentPath.push(new ClipperLib.IntPoint(currentPoints[i], currentPoints[i + 1]));
        }

        const pathToAddOrSubtract = new ClipperLib.Path();
        for (let i = 0; i < points.length; i += 2) {
            pathToAddOrSubtract.push(new ClipperLib.IntPoint(points[i], points[i + 1]));
        }

        clipper.AddPath(currentPath, ClipperLib.PolyType.ptSubject, true);
        clipper.AddPath(pathToAddOrSubtract, ClipperLib.PolyType.ptClip, true);
        const solutionPaths = new ClipperLib.Paths();
        clipper.Execute(this._mode == "union" ? ClipperLib.ClipType.ctUnion : this._mode == "subtract" ? ClipperLib.ClipType.ctDifference : ClipperLib.ClipType.ctIntersection, solutionPaths, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
        const solution = solutionPaths[0] ? solutionPaths[0].map((point) => [point.X, point.Y]).flat() : null;
        if(solution) solution.push(solution[0], solution[1]);
        const fallback = currentPoints.length > 0 ? currentPoints : points;
        return solution ?? fallback;
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
        });
    }

    async close() {
        await super.close();
        Hooks.off("preCreateTile", this.tileCreateHook)
    }
}