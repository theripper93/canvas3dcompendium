import { getFiles } from "./assetBrowser.js";

let fileCache = null;
let dataCache = null;

let _this = null;

export class QuickEnvironment extends Application {
    constructor() {
        super();
    }

    sources = ["modules/canvas3dcompendium/assets/Beautiful-Sky/2K", "modules/canvas3dcompendium/assets/hdri_panoramas"];

    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            title: "Quick Environment",
            id: "quick-environment",
            template: `modules/canvas3dcompendium/templates/quick-environment.hbs`,
            width: 200,
            height: "auto",
            top: 0,
            left: window.innerWidth - 500,
            resizable: false,
        };
    }

    async getSources() {
        let source = "user";
        if (typeof ForgeVTT !== "undefined" && ForgeVTT.usingTheForge) {
            source = "forge-bazaar";
        }
        const files = [];
        for (let target of this.sources) {
            let sourceFiles;
            try {
                sourceFiles = await getFiles(target, source, "webp");
            } catch (e) {
                try {
                    sourceFiles = await getFiles(target, "user", "webp");
                } catch (e) {
                    sourceFiles = [];
                }
            }
            files.push(...sourceFiles);
        }
        return files;
    }

    async getData() {
        const files = fileCache ?? (await this.getSources());
        fileCache = files;
        const data = [];
        for (let file of files) {
            data.push({
                url: file,
                name: file.split("/").pop().split(".")[0],
            });
        }
        const weather = {
            none: "Weather (" + game.i18n.localize("levels3dpreview.flags.particlePreset.options.none") + ")",
            rain: game.i18n.localize("levels3dpreview.flags.particlePreset.options.rain"),
            heavyrain: game.i18n.localize("levels3dpreview.flags.particlePreset.options.heavyrain"),
            snow: game.i18n.localize("levels3dpreview.flags.particlePreset.options.snow"),
            hail: game.i18n.localize("levels3dpreview.flags.particlePreset.options.hail"),
            leaves: game.i18n.localize("levels3dpreview.flags.particlePreset.options.leaves"),
            embers: game.i18n.localize("levels3dpreview.flags.particlePreset.options.embers"),
            mysteriouslights: game.i18n.localize("levels3dpreview.flags.particlePreset.options.mysteriouslights"),
            stars: game.i18n.localize("levels3dpreview.flags.particlePreset.options.stars"),
            starfall: game.i18n.localize("levels3dpreview.flags.particlePreset.options.starfall"),
            dust: game.i18n.localize("levels3dpreview.flags.particlePreset.options.dust"),
            smoke: game.i18n.localize("levels3dpreview.flags.particlePreset.options.smoke"),
            toxic: game.i18n.localize("levels3dpreview.flags.particlePreset.options.toxic"),
        };
        return {
            weather: weather,
            selectedWeather: canvas.scene.getFlag("levels-3d-preview", "particlePreset2") ?? "none",
            envs: data,
            timeofday: canvas.scene.getFlag("levels-3d-preview", "sunPosition") ?? 9,
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.on("change", "input", (event) => {
            const time = event.currentTarget.value;
            canvas.scene.setFlag("levels-3d-preview", "sunPosition", time);
            html.find(".range-value").text(time);
        });
        html.on("change", "select", (event) => {
            const weather = event.currentTarget.value;
            canvas.scene.setFlag("levels-3d-preview", "particlePreset2", weather);
        });
        html.on("click", ".environment", (event) => {
            const url = event.currentTarget.dataset.url;
            canvas.scene.setFlag("levels-3d-preview", "exr", url);
        });
    }
}
