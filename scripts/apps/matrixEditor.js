import { HeightmapPainter } from "./heightmapPainter.js";
export class MatrixEditor extends FormApplication {
    constructor(tile) {
        super();
        tile ??= canvas.tiles.controlled[0];
        if (!tile) return ui.notifications.error("Please select a tile first");
        this.tile = tile;
        this.document = tile.document ?? tile;
        this.updateMatrix = debounce(this.updateMatrix.bind(this), 100);
    }

    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            title: "Terrain Editor",
            id: "terrain-editor",
            template: `modules/canvas3dcompendium/templates/terrain-editor.hbs`,
            width: 415,
            height: "auto",
            resizable: false,
        };
    }

    async getData() {
        return {
            heightmap: this.heightmap,
            matrix: this.matrix,
        };
    }

    get matrix() {
        try {
            const string = this.document.getFlag("levels-3d-preview", "displacementMatrix") ?? "0,0,1,1";
            const matrix = string.split(",").map((s) => parseFloat(s));
            this._heightmapMatrix = {
                offsetX: matrix[0] || 0,
                offsetY: matrix[1] || 0,
                scaleX: matrix[2] || 1,
                scaleY: matrix[3] || 1,
            };
            return this._heightmapMatrix;
        } catch (error) {
            console.error("Error parsing heightmap matrix", error);
            return {
                offsetX: 0,
                offsetY: 0,
                scaleX: 1,
                scaleY: 1,
            };
        }
    }

    get heightmap() {
        return this.document.getFlag("levels-3d-preview", "displacementMap") ?? "";
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.on("change", "input", this.updateMatrix.bind(this));
        html[0].querySelector("#open-terrain-painter").addEventListener("click", (e) => {
            e.preventDefault();
            new HeightmapPainter(this.tile, this.heightmap, this.matrix).render(true);
            this.close();
        });
        const matrixVisualizerEl = html[0].querySelector(".matrix-visualizer");
        const resizeHandle = html[0].querySelector(".matrix-visualizer-handle");
        const heigtmapContainer = html[0].querySelector(".heigtmap-container");
        let dragging = false;
        let lastX = 0;
        let lastY = 0;
        let draggingData = {
            offsetX: 0,
            offsetY: 0,
        }
        let resizing = false;
        let lastWidth = 0;
        let lastHeight = 0;
        let lastWidthX = 0;
        let lastHeightY = 0;
        let resizingData = {
            scaleX: 0,
            scaleY: 0,
        }

        const offsetXInput = html[0].querySelector(`input[name="offsetX"]`);
        const offsetYInput = html[0].querySelector(`input[name="offsetY"]`);

        matrixVisualizerEl.addEventListener("mousedown", (e) => {
            if(e.target != matrixVisualizerEl) return;
            dragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
        });
        heigtmapContainer.addEventListener("mousemove", (e) => {
            if (dragging) {       
                resizing = false;
                const offsetX = this.matrix.offsetX + (e.clientX - lastX) / 400;
                const offsetY = this.matrix.offsetY + (e.clientY - lastY) / 400;
                draggingData.offsetX = Math.min(Math.max(offsetX , -1), 1);
                draggingData.offsetY = Math.min(Math.max(offsetY , -1), 1);
                matrixVisualizerEl.style.left = `${offsetX * 400}px`;
                matrixVisualizerEl.style.top = `${offsetY * 400}px`;
            }
            if (resizing) {
                dragging = false;
                const deltaXPx = e.clientX - lastWidthX;
                const deltaYPx = e.clientY - lastHeightY;
                const newWidth = lastWidth + deltaXPx;
                const newHeight = lastHeight + deltaYPx;
                const scaleX = 400 / newWidth;
                const scaleY = 400 / newHeight;
                if(!isFinite(scaleX) || !isFinite(scaleY)) return;
                resizingData.scaleX = Math.min(Math.max(scaleX , 0.1), 10);
                resizingData.scaleY = Math.min(Math.max(scaleY , 0.1), 10);
                matrixVisualizerEl.style.width = `${400 / scaleX}px`;
                matrixVisualizerEl.style.height = `${400 / scaleY}px`;
            }

        });
        matrixVisualizerEl.addEventListener("mouseup", () => {
            if(!dragging) return;
            dragging = false;
            offsetXInput.value = draggingData.offsetX;
            offsetYInput.value = draggingData.offsetY;
            this.updateMatrix();
        });



        resizeHandle.addEventListener("mousedown", (e) => {
            resizing = true;
            lastWidthX = e.clientX;
            lastHeightY = e.clientY;
            lastWidth = 400 / this.matrix.scaleX;
            lastHeight = 400 / this.matrix.scaleY;
        });
        resizeHandle.addEventListener("mouseup", () => {
            if(!resizing) return;
            resizing = false;
            html[0].querySelector(`input[name="scaleX"]`).value = resizingData.scaleX;
            html[0].querySelector(`input[name="scaleY"]`).value = resizingData.scaleY;
            this.updateMatrix();
        });




        this.updateMatrixVisualizer();
    }

    updateMatrixVisualizer() {
        const visualizer = this.element[0].querySelector(".matrix-visualizer");
        const matrix = this.matrix;
        const widthHeight = 400;
        const offsetX = matrix.offsetX * widthHeight;
        const offsetY = matrix.offsetY * widthHeight;
        const scaleX = matrix.scaleX;
        const scaleY = matrix.scaleY;
        visualizer.style.width = `${widthHeight / scaleX}px`;
        visualizer.style.height = `${widthHeight / scaleY}px`;
        visualizer.style.left = `${offsetX}px`;
        visualizer.style.top = `${offsetY}px`;
    }

    async updateMatrix() {
        const data = this._getSubmitData();
        const matrix = `${data.offsetX},${data.offsetY},${data.scaleX},${data.scaleY}`;
        await this.document.setFlag("levels-3d-preview", "displacementMatrix", matrix);
        this.updateMatrixVisualizer();
    }
}