const COLOR_MODES = ["bw", "r", "g", "b"];

export class HeightmapPainter extends Application {
    constructor(tile, texture, matrix, input, useRGB = false) {
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
        if (this.input) {
            this.shaderConfig = Object.values(ui.windows).find((w) => w.id == "levels-3d-preview-shader-config");
        }
        game.Levels3DPreview.CONFIG.UI.windows.HeightmapPainter = this;
        this.isPainting = true;
        this._compact = false;
        this.useRGB = useRGB;
        this.color = "bw";
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
        if (this.input) {
            game.Levels3DPreview._heightmapPainter = this;
        }
        document.querySelector("#levels3d").addEventListener("mousemove", this._on3DMouseMove.bind(this));
        document.querySelector("#levels3d").addEventListener("mouseup", this.onMouseUp.bind(this));
        document.querySelector("#levels3d").addEventListener("mousedown", this._on3DMouseDown.bind(this));
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

        if (this.useRGB) {
            html.querySelector("#cycle-color").addEventListener("click", (e) => {
                e.preventDefault();
                const index = COLOR_MODES.indexOf(this.color);
                this.color = COLOR_MODES[index + 1] ?? COLOR_MODES[0];
                this.updateBrushData();
            });
        }
    }

    _on3DMouseMove(e) {
        this.update3DBrush();
        const mouse = { ...game.Levels3DPreview.interactionManager.canvas2dMousePosition };
        const { width, height } = this.shaderConfig?.document ?? this.document;
        const { x, y } = this.shaderConfig?.document ?? this.document;
        //if outside tile bounds, return
        if (mouse.x < x || mouse.x > x + width || mouse.y < y || mouse.y > y + height) return;
        const xPercent = (mouse.x - x) / width;
        const yPercent = (mouse.y - y) / height;
        this.onMouseMove(e, xPercent, yPercent);
    }

    _on3DMouseDown(e) {
        this.updateBrushData();
        this._on3DMouseMove(e);
    }

    update3DBrush() {
        if (!this.brush3D) {
            const THREE = game.Levels3DPreview.THREE;
            const brush = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
            this.brush3D = brush;
            this.brush3D.userData.ignoreHover = true;
            this.brush3D.userData.interactive = false;
            this.brush3D.userData.noIntersect = true;
            game.Levels3DPreview.scene.add(brush);
            this.updateBrushData();
        }
        this.brush3D.position.copy(game.Levels3DPreview.interactionManager.canvas3dMousePosition);
    }

    getData() {
        return {
            fileName: `${window.canvas.scene.name.slugify()}-heightmap-${randomID()}`,
            useRGB: this.useRGB,
        };
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
        const color = [this.brushData.color, this.brushData.color, this.brushData.color, 1];
        this.mutateVec4Color(color);
        html.querySelector(".brush-color").style.backgroundColor = `rgba(${color.join(",")})`;
        html.querySelector(".brush-color").style.color = this.brushData.color > 127 && this.color !== "b" ? "#000000" : "#ffffff";
        html.querySelector(".brush-color").value = this.brushData.color;

        if (this.brush3D) {
            const brushData = this.getBrushData();
            const brushSize = brushData.size;
            const { width, height } = this.shaderConfig?.document ?? this.document;
            const avg = (width + height) / 2;
            const canvasWidthHeight = this.canvas.width;
            const brushScale = (brushSize * avg) / canvasWidthHeight / game.Levels3DPreview.factor;
            this.brush3D.scale.set(brushScale, brushScale, brushScale);
            this.brush3D.material.opacity = brushData.opacity;
            this.brush3D.material.color.setRGB(color[0] / 255, color[1] / 255, color[2] / 255);
        }
    }

    onMouseDown(e) {
        this.updateBrushData();
        this.onMouseMove(e);
    }

    onMouseUp(e) {
        const isLeft = e.button === 0;
        if (!isLeft) return;
        this.updateBrushData();
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.updateBrushPreview(x, y, false);

        this.updateTilePreview();
    }

    updateTilePreview() {
        if (this.CanvasTexture) return;
        const tile = canvas.tiles.get(this.document?.id) ?? canvas.tiles.get(this.shaderConfig?.document?.id);
        game.Levels3DPreview.tiles[tile.id]?.destroy(true);
        const newTile = new game.Levels3DPreview.CONFIG.entityClass.Tile3D(tile, game.Levels3DPreview, true, this.input ? null : this.canvas);
        game.Levels3DPreview.tiles[tile.id] = newTile;
        newTile.load();
    }

    mutateVec4Color(brushColorVec4) {
        if (this.color !== "bw") {
            brushColorVec4[0] = this.color === "r" ? brushColorVec4[0] : 0;
            brushColorVec4[1] = this.color === "g" ? brushColorVec4[1] : 0;
            brushColorVec4[2] = this.color === "b" ? brushColorVec4[2] : 0;
        }
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
        this.mutateVec4Color(brushColorVec4);
        const canvasRect = this.canvas.getBoundingClientRect();
        const containerRect = this.canvasContainer.getBoundingClientRect();
        const deltaX = canvasRect.left - containerRect.left;
        const deltaY = canvasRect.top - containerRect.top;
        this.brushElement.style.left = `${x + deltaX - brushSize / 2}px`;
        this.brushElement.style.top = `${y + deltaY - brushSize / 2}px`;

        this.brushElement.style.width = `${brushSize}px`;
        this.brushElement.style.height = `${brushSize}px`;
        this.brushElement.style.borderRadius = `50%`;
        this.brushElement.style.backgroundColor = `rgba(${brushColorVec4.join(",")})`;
    }

    onMouseMove(e, xPercent, yPercent) {
        const rect = this.canvas.getBoundingClientRect();
        const x = xPercent ? xPercent * this.canvas.width : e.clientX - rect.left;
        const y = yPercent ? yPercent * this.canvas.height : e.clientY - rect.top;

        const isLeftDown = e.buttons === 1;
        const isRightDown = e.buttons === 2;
        this.updateBrushPreview(x, y, isLeftDown || isRightDown);

        if (isRightDown) {
            //pick the color from the canvas and set it as the brush color
            const imageData = this.ctx.getImageData(x, y, 1, 1);
            const pixel = imageData.data;
            //detect if the color is grayscale
            const isGrayscale = pixel[0] === pixel[1] && pixel[1] === pixel[2];

            if (isGrayscale) {
                this.brushData.color = pixel[0];
                this.color = "bw";
            } else {
                const biggestColor = Math.max(pixel[0], pixel[1], pixel[2]);
                const colorKey = ["r", "g", "b"][pixel.indexOf(biggestColor)];
                this.brushData.color = biggestColor;
                this.color = colorKey;
            }

            //set input value
            const html = this.element[0];
            html.querySelector("#brush-color").value = this.brushData.color;
            this.updateBrushData();
        }

        if (!isLeftDown) return;

        const brush = this.getBrushData();
        const brushSize = brush.size;
        const brushOpacity = brush.opacity;
        const brushHardness = Math.min(brush.hardness, 0.99);
        const brushColor = brush.color;
        const brushColorVec4 = [brushColor, brushColor, brushColor, brushOpacity];
        this.mutateVec4Color(brushColorVec4);
        const brushColorVec4ExteriorGradient = [brushColorVec4[0], brushColorVec4[1], brushColorVec4[2], 0];

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
        if (this.CanvasTexture) this.CanvasTexture.needsUpdate = true;
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
        const dir = decodeURIComponent(path.fp.result.target);
        const source = path.fp.activeSource;

        //base64 to File object

        const blob = await (await fetch(base64)).blob();
        const file = new File([blob], filename, { type: "image/jpeg" });

        //upload to server
        const response = await FilePicker.upload(source, dir, file, { filename });

        const outputPath = response.path;

        if (!this.input) {
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

    _getHeaderButtons() {
        let buttons = super._getHeaderButtons();
        buttons.unshift({
            class: "compact-mode",
            icon: "fas fa-expand-arrows-alt",
            onclick: this.toggleCompactMode.bind(this),
        });
        return buttons;
    }

    toggleCompactMode() {
        this.element[0].querySelector(".terrain-painter-canvas-container").style.display = this._compact ? null : "none";
        this._compact = !this._compact;
        this.setPosition({ height: "auto" });
    }

    async close(...args) {
        if (this._saved) {
            game.Levels3DPreview._heightmapPainter = null;
            game.Levels3DPreview.scene.remove(this.brush3D);
            document.querySelector("#levels3d").removeEventListener("mousemove", this._on3DMouseMove.bind(this));
            document.querySelector("#levels3d").removeEventListener("mouseup", this.onMouseUp.bind(this));
            game.Levels3DPreview.CONFIG.UI.windows.HeightmapPainter = null;
            this.isPainting = false;
            return super.close(...args);
        }
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
        });
        if (!res) return;
        game.Levels3DPreview._heightmapPainter = null;
        game.Levels3DPreview.scene.remove(this.brush3D);
        document.querySelector("#levels3d").removeEventListener("mousemove", this._on3DMouseMove.bind(this));
        document.querySelector("#levels3d").removeEventListener("mouseup", this.onMouseUp.bind(this));
        document.querySelector("#levels3d").removeEventListener("mousedown", this._on3DMouseDown.bind(this));
        game.Levels3DPreview.CONFIG.UI.windows.HeightmapPainter = null;
        this.isPainting = false;
        return super.close(...args);
    }

    static async create(input, useRGB = false) {
        useRGB = input.name === "splatMap.textureSplatMap" ? true : useRGB;
        const button = document.createElement("button");
        button.innerHTML = `<i class="fas fa-paint-brush"></i>`;
        button.style.order = 98;
        input.after(button);
        button.addEventListener("click", (e) => {
            e.preventDefault();
            const app = new HeightmapPainter(null, input.value, { offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1 }, input, useRGB);
            app.render(true);
        });
    }
}
