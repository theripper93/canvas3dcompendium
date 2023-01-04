let fileCache = null;
let dataCache = null;

export class AssetBrowser extends Application {
    constructor() {
        super();
        this._maxCount = 200;
    }

    scale = 1;

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
            return dataCache;
        }
        let source = "user";
        if (typeof ForgeVTT !== "undefined" && ForgeVTT.usingTheForge) {
            source = "forge-bazaar";
        }
        const materials = [];
        const files = fileCache ?? (await getFiles("modules/canvas3dcompendium/assets/Tiles", source));
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
    }
}


async function getFiles(root, source = "user") {
    const files = [];

    const contents = await FilePicker.browse(source, root);
    for (let file of contents.files) {
        const ext = file.split(".").pop();
        if(ext.toLowerCase() == "glb") files.push(file);
    }
    for (let folder of contents.dirs) {
        files.push(...(await getFiles(folder, source)));
    }

    return files;
 }