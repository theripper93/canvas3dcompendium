import {AssetBrowser} from "./assetBrowser.js";
import {EffectBrowser} from "./effectBrowser.js";
import {QuickTerrain} from "./quickTerrain.js";
import { QuickEnvironment } from "./quickEnvironment.js";

export class BuildPanel extends Application {
    constructor() {
        super();
        this._autoHide = true;
    }

    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            id: "build-panel",
            template: `modules/canvas3dcompendium/templates/build-panel.hbs`,
            resizable: false,
            popOut: false,
        };
    }

    getData() {
        return {
            buttons: BUILD_PANEL_BUTTONS,
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        setTimeout(() => { 
            if (this._autoHide) {
                html.addClass("minimized");
            }
        }, 10000);
        $("#ui-right").prepend(html);
        html.on("click", "#build-panel-minimize", () => { 
            html.toggleClass("minimized");
        });
        html.on("click", ".build-panel-button", (event) => { 
            this._autoHide = false;
            const action = event.currentTarget.dataset.action;
            const btn = BUILD_PANEL_BUTTONS.find(b => b.id === action);
            btn.callback();
        });
    }

    static setHook() {
        Hooks.once("ready", () => { 
            if(!game.user.isGM) return;
            Hooks.on("3DCanvasToggleMode", (enabled) => {
                if (ui.buildPanel) ui.buildPanel.close();
            });
            Hooks.on("3DCanvasSceneReady", () => {
                ui.buildPanel = new BuildPanel();
                ui.buildPanel.render(true);
            });
        });
    }
}

const BUILD_PANEL_BUTTONS = [
    {
        id: "environment",
        name: "Environment",
        icon: "fa-duotone fa-cloud-bolt-sun",
        callback: () => {
            new QuickEnvironment().render(true);
        },
    },
    {
        id: "terrain",
        name: "Terrain",
        icon: "fa-duotone fa-mountain",
        callback: () => {
            new QuickTerrain().render(true);
        },
    },
    {
        id: "props",
        name: "Props",
        icon: "fa-duotone fa-tree",
        callback: () => {
            new AssetBrowser().render(true);
        },
    },
    {
        id: "effects",
        name: "Effects",
        icon: "fa-duotone fa-fire",
        callback: () => {
            new EffectBrowser().render(true);
        },
    },
    {
        id: "community-maps",
        name: "Community Maps",
        icon: "fa-duotone fa-map",
        callback: () => {
            new game.Levels3DPreview.sharing.apps.MapBrowser().render(true);
        },
    },
    {
        id: "tutorials",
        name: "More Tours",
        icon: "fad fa-person-hiking",
        callback: () => {
            new ToursManagement().render(true);
            setTimeout(() => {
                $('.item[data-tab="levels-3d-preview"]')[0].click();
            }, 500);
        },
    },
];
