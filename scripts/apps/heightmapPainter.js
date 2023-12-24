export class HeightmapPainter extends Application {
    constructor(tile, texture, matrix, input) {
        super();
        tile ??= canvas.tiles.controlled[0];
        if (!tile && !input) return ui.notifications.error("Please select a tile first");
        this.document = tile?.document ?? tile;
        this.tile = tile;
        this.leftDown = false;
        this.rightDown = false;
        this.texturePath = texture;
        this.matrix = matrix;
        this.input = input;
    }

    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            title: "Heightmap Painter",
            id: "terrain-painter",
            template: `modules/canvas3dcompendium/templates/terrain-painter.hbs`,
            width: 540,
            //height: 670,
            resizable: false,
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        this.updateBrushData();
        html = html[0];
        this.brushElement = html.querySelector("#terrain-painter-brush");
        this.canvasContainer = html.querySelector(".terrain-painter-canvas-container");
        this.canvas = html.querySelector("#terrain-painter-canvas");
        this.ctx = this.canvas.getContext("2d");

        //set canvas size
        this.canvas.width = 512;
        this.canvas.height = 512;

        //black fill
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.texturePath) {            
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.src = this.texturePath;
            image.onload = () => {
                //draw image
                const offsetX = this.matrix.offsetX * image.width;
                const offsetY = this.matrix.offsetY * image.height;
                const scaleX = this.matrix.scaleX;
                const scaleY = this.matrix.scaleY;
                //this.ctx.setTransform(scaleX, 0, 0, scaleY, offsetX, offsetY);
                this.ctx.drawImage(image, offsetX, offsetY, image.width / scaleX, image.height / scaleY, 0, 0, this.canvas.width, this.canvas.height);
                //this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            };
        }

        this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
        this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
        this.canvas.addEventListener("mouseup", this.onMouseUp.bind(this));

        html.querySelector("#save-heightmap").addEventListener("click", this.saveHeightmap.bind(this));

        html.querySelectorAll(".terrain-painter-controls input").forEach((input) => {
            input.addEventListener("change", this.updateBrushData.bind(this));
        });

        html.querySelectorAll(".input-info input").forEach((input) => {
            input.addEventListener("change", this.updateRangeInputs.bind(this));
        });
    }

    getData() {
        return {
            fileName: `${window.canvas.scene.name.slugify()}-heightmap-${randomID()}`
        }
    }

    getBrushData() {
        return this.brushData;
    }

    updateRangeInputs(e) {
        e.preventDefault();
        const input = e.currentTarget;
        const value = parseFloat(input.value);
        const className = input.classList[0];
        const rangeInput = this.element[0].querySelector(`#${className}`);
        rangeInput.value = value;
        this.updateBrushData();
    }

    updateBrushData() {
        const html = this.element[0];
        this.brushData = {
            size: parseFloat(html.querySelector("#brush-size").value),
            opacity: parseFloat(html.querySelector("#brush-opacity").value),
            hardness: parseFloat(html.querySelector("#brush-hardness").value),
            color: parseInt(html.querySelector("#brush-color").value),
        };
        html.querySelector(".brush-size").value = this.brushData.size;
        html.querySelector(".brush-opacity").value = this.brushData.opacity;
        html.querySelector(".brush-hardness").value = this.brushData.hardness;
        html.querySelector(".brush-color").style.backgroundColor = `rgba(${this.brushData.color}, ${this.brushData.color}, ${this.brushData.color}, 1)`;
        html.querySelector(".brush-color").style.color = this.brushData.color > 127 ? "#000000" : "#ffffff";
        html.querySelector(".brush-color").value = this.brushData.color;
    }

    onMouseDown(e) {
        this.updateBrushData();
        this.onMouseMove(e);
    }

    onMouseUp(e) {
        this.updateBrushData();
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.updateBrushPreview(x, y, false);

        this.updateTilePreview();
    }

    updateTilePreview() {
        if(!this.tile) return;
        const tile = canvas.tiles.get(this.document.id);
        game.Levels3DPreview.tiles[tile.id]?.destroy(true);
        const newTile = new game.Levels3DPreview.CONFIG.entityClass.Tile3D(tile, game.Levels3DPreview, true, this.canvas);
        game.Levels3DPreview.tiles[tile.id] = newTile;
        newTile.load();
    }

    updateBrushPreview(x, y, hidden) {
        if (hidden) {
            this.brushElement.style.display = "none";
            return;
        } else {
            this.brushElement.style.display = "block";
        }
        const brush = this.getBrushData();
        const brushSize = brush.size;
        const brushOpacity = brush.opacity;
        const brushColor = brush.color;
        const brushColorVec4 = [brushColor, brushColor, brushColor, brushOpacity];

        const canvasRect = this.canvas.getBoundingClientRect();
        const containerRect = this.canvasContainer.getBoundingClientRect();
        const deltaX = canvasRect.left - containerRect.left;
        const deltaY = canvasRect.top - containerRect.top;
        this.brushElement.style.left = `${x + deltaX -brushSize/2}px`;
        this.brushElement.style.top = `${y + deltaY - brushSize/2}px`;

        this.brushElement.style.width = `${brushSize}px`;
        this.brushElement.style.height = `${brushSize}px`;
        this.brushElement.style.borderRadius = `50%`;
        this.brushElement.style.backgroundColor = `rgba(${brushColorVec4.join(",")})`;
    }

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const isLeftDown = e.buttons === 1;
        const isRightDown = e.buttons === 2;
        this.updateBrushPreview(x, y, isLeftDown || isRightDown);
        if(!isLeftDown && !isRightDown) return;

        const brush = this.getBrushData();
        const brushSize = brush.size;
        const brushOpacity = brush.opacity;
        const brushHardness = brush.hardness;
        const brushColor = brush.color;
        const brushColorVec4 = [brushColor, brushColor, brushColor, brushOpacity];
        const brushColorVec4ExteriorGradient = [brushColor, brushColor, brushColor, 0];

        const brushRadius = brushSize / 2;

        //draw radial gradient circle
        const gradient = this.ctx.createRadialGradient(x, y, brushRadius * brushHardness, x, y, brushRadius);
        gradient.addColorStop(0, `rgba(${brushColorVec4.join(",")})`);
        gradient.addColorStop(1, `rgba(${brushColorVec4ExteriorGradient.join(",")})`);
        this.ctx.fillStyle = gradient;

        //draw circle

        this.ctx.beginPath();
        this.ctx.arc(x, y, brushRadius, 0, 2 * Math.PI);
        this.ctx.fill();

        //this.ctx.fillRect(x - brushRadius, y - brushRadius, brushDiameter, brushDiameter);
    }

    async saveHeightmap(e) {
        e.preventDefault();

        const canvas = this.canvas;
        const base64 = canvas.toDataURL("image/jpeg");

        const path = await new Promise((resolve, reject) => {
            const fp = new FilePicker({
                type: "folder",
                callback: (path, fp) => {
                    resolve({ path, fp });
                },
            }).render(true);
        });

        const fn = this.element[0].querySelector("#heightmap-file-name").value;
        const filenameNoExtension = fn.split(".").shift();

        const filename = `${filenameNoExtension}.jpg`;
        const dir = path.fp.result.target;
        const source = path.fp.activeSource;

        //base64 to File object

        const blob = await (await fetch(base64)).blob();
        const file = new File([blob], filename, {type: "image/jpeg"});

        //upload to server
        const response = await FilePicker.upload(source, dir, file, {filename});
        
        const outputPath = response.path;

        if (this.document) {            
            //update tile
    
            await this.document.setFlag("levels-3d-preview", "displacementMap", outputPath);
    
            //reset matrix
    
            await this.document.setFlag("levels-3d-preview", "displacementMatrix", "0,0,1,1");
    
            this._saved = true;
        } else {
            this.input.value = outputPath;
            this.input.dispatchEvent(new Event("change"));
            this._saved = true;
        }

        this.close();
    }

    async close(...args) {
        if(this._saved) return super.close(...args);
        const res = await Dialog.confirm({
            title: "Close without saving?",
            content: "Are you sure you want to close without saving? Any changes will be lost.",
            yes: () => {
                return true;
            },
            no: () => {
                return false;
            },
            defaultYes: false,
            close: () => {
                return false;
            },
        })
        if(!res) return;
        return super.close(...args);
    }

    static async create(input) {
        const button = document.createElement("button");
        button.innerHTML = `<i class="fas fa-paint-brush"></i>`;
        button.style.order = 98;
        input.after(button);
        button.addEventListener("click", (e) => {
            e.preventDefault();
            const app = new HeightmapPainter(null, input.value, {offsetX:0, offsetY:0, scaleX:1, scaleY:1}, input);
            app.render(true);
        });
    }
}
