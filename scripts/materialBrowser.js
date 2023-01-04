export class MaterialBrowser extends Application {
    constructor(input, app) {
        super();
        this._input = $(input);
        this._app = app;
    }

    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            title: "Material Browser",
            id: "material-browser",
            template: `modules/canvas3dcompendium/templates/material-explorer.hbs`,
            width: 400,
            height: window.innerHeight * 0.8,
            resizable: true,
        };
    }

    get title() {
        return "Material Browser: " + this._assetCount + " materials available";
    }

    async getData() {
        const data = super.getData();
        let source = "user";
        if (typeof ForgeVTT !== "undefined" && ForgeVTT.usingTheForge) {
            source = "forge-bazaar";
        }
        const ambiendCG = await FilePicker.browse(source, "modules/canvas3dcompendium/assets/Materials");
        const c4dcenter = await FilePicker.browse(source, "modules/canvas3dcompendium/assets/Materials/_Stylized");
        const materials = [];
        for (let folder of ambiendCG.dirs.concat(c4dcenter.dirs)) {
            if (folder.endsWith("_Stylized")) continue;
            const filename = folder.split("/").pop().replaceAll("%20", "_");
            const cleanName = filename.replaceAll("_", " ");
            materials.push({
                displayName: cleanName,
                preview: folder + "/" + filename + "_Color.webp",
                output: folder + "/" + filename + "_NormalGL.webp",
            });
        }
        materials.sort((a, b) => a.displayName.localeCompare(b.displayName));
      data.materials = materials;
        this._assetCount = materials.length;
        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);
        this.element.find(".material-confirm").hide();
        this.element.on("keyup", "input", (e) => {
            const value = e.target.value;
            this.element.find("li").each((i, el) => {
                const displayName = $(el).data("displayname");
                $(el).toggle(displayName.toLowerCase().includes(value.toLowerCase()));
            });
        });
        this.element.on("click", "li", (e) => {
            const material = $(e.currentTarget).data("output");
            this._input.val(material);
            if (game.settings.get("canvas3dcompendium", "autoApply")) this._app._onSubmit(e, { preventClose: true, preventRender: true });
            if (game.settings.get("canvas3dcompendium", "autoClose")) this.close();
            $(e.currentTarget)
                .find(".material-confirm")
                .fadeIn(300, () => {})
                .delay(1000)
                .fadeOut(200, () => {});
        });
    }

    static create(filepicker, app) {
        const fpFG = filepicker.closest(".form-group").length ? filepicker.closest(".form-group") : filepicker;
        const button = $(`
        <button type="button" style="order: 99;" title="Open Material Browser">
        <i class="fas fa-adjust" style="margin: 0;"></i>
        </button>
        `);
        const input = fpFG.find("input").first();
        const fpButton = fpFG.find("button").first();
        fpButton.before(button);
        button.on("click", (e) => {
            e.preventDefault();
            new MaterialBrowser(input, app).render(true);
        });
    }
}