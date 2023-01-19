export class MatrixEditor extends FormApplication {
    constructor(tile) {
        super();
        tile ??= canvas.tiles.controlled[0];
        if(!tile) return ui.notifications.error("Please select a tile first");
        this.document = tile.document ?? tile;
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