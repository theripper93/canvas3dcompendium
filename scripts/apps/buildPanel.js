import {AssetBrowser} from "./assetBrowser.js";
import {EffectBrowser} from "./effectBrowser.js";
import {QuickTerrain} from "./quickTerrain.js";
import {QuickEnvironment} from "./quickEnvironment.js";
import {MaterialBrowser} from "./materialBrowser.js";
import {RoomBuilder} from "./roomBuilder.js";
import { CutscenePanel } from "./cutscenePanel.js";

export class BuildPanel extends Application {
    constructor() {
        super();
        this._autoHide = true;
        if (game.Levels3DPreview.CONFIG.UI.BUILD_PANEL.FORCE_AUTOHIDE_OFF || !game.settings.get("levels-3d-preview", "loadingShown")) {
            this._autoHide = false;
            game.Levels3DPreview.CONFIG.UI.BUILD_PANEL.FORCE_AUTOHIDE_OFF = false;
        }
    }

    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            id: "build-panel",
            classes: ["three-canvas-compendium-app-slim"],
            template: `modules/canvas3dcompendium/templates/build-panel.hbs`,
            resizable: false,
            popOut: false,
        };
    }

    getData() {
        const b = game.user.isGM ? BUILD_PANEL_BUTTONS.filter((b) => b.visible()) : [];
        const c = game.Levels3DPreview.CONFIG.UI.CLIP_NAVIGATION.BUTTONS.filter(b => b.visible());
        document.querySelector(":root").style.setProperty("--build-panel-height", `${(b.length + c.length) * 40 + 50}px`);
        const showSeparator = b.length > 0 && c.length > 0;
        return {
            showSeparator,
            buttons: b,
            clipNavigation: c,
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.find("#clip-navigation-fog").addClass("clip-navigation-enabled");
        this.insertMinimizeButton();
        html.find("#game-camera-toggle").toggleClass("clip-navigation-enabled", game.Levels3DPreview.GameCamera.enabled);
        setTimeout(() => { 
            if (this._autoHide) {
                html.addClass("minimized");
            }
        }, 10000);
        $("#sidebar-tabs menu").after(html);
        html.on("click", "#build-panel-minimize", () => { 
            html.toggleClass("minimized");
        });
        html.on("click", ".build-panel-button", (event) => { 
            this._autoHide = false;
            const action = event.currentTarget.dataset.action;
            const btn = [...BUILD_PANEL_BUTTONS, ...game.Levels3DPreview.CONFIG.UI.CLIP_NAVIGATION.BUTTONS].find((b) => b.id === action);
            btn.callback(event);
        });
        if (game.Levels3DPreview.sharing.apps.MapBrowser?.contest?.active) {
            html.find(`i[data-action="community-maps"]`).addClass("contest-active");
            const trophyIcon = $(`<i class="fas fa-trophy-star"></i>`);
            const li = html.find(`i[data-action="community-maps"]`).closest("li");
            li.css("position", "relative");
            trophyIcon.css({
                position: "absolute",
                left: "-3px",
                top: "2px",
                "font-size": "0.8rem",
                color: "#ffc200",
                "pointer-events": "none",
                "text-shadow": "0 0 3px black"
            })
            li.append(trophyIcon);
        }
    }

    insertMinimizeButton(remove = false){
        if(remove) return document.querySelectorAll("#build-panel-minimize").forEach(b => b.remove());

        const button = document.createElement("button")
        button.id = "build-panel-minimize";
        button.className = "ui-control plain icon fa-solid fa-cube";
        const li = document.createElement("li");
        li.appendChild(button)
        document.querySelector(`button[data-tab="settings"]`).closest("li").after(li)
        button.addEventListener("click", ()=>{
            this.element.toggleClass("minimized")
        })
    }

    async close(...args){
        this.insertMinimizeButton(true)
        return super.close(...args)
    }

    static setHook() {
        Hooks.once("ready", () => { 
            Hooks.on("canvasReady", () => {
                if (ui.buildPanel) ui.buildPanel.close();
            });
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
        icon: "fas fa-cloud-bolt-sun",
        visible: () => true,
        callback: () => {
            new QuickEnvironment().render(true);
        },
    },
    {
        id: "terrain",
        name: "Terrain",
        icon: "fas fa-mountain",
        visible: () => true,
        callback: () => {
            new QuickTerrain().render(true);
        },
    },
    {
        id: "props",
        name: "Props",
        icon: "fas fa-tree",
        visible: () => true,
        callback: () => {
            new AssetBrowser().render(true);
        },
    },
    {
        id: "materials",
        name: "Materials",
        icon: "fas fa-circle-half-stroke",
        visible: () => true,
        callback: () => {
            new MaterialBrowser().render(true);
        },
    },
    {
        id: "roombuilder",
        name: "Dungeons & Interiors",
        icon: "fas fa-block-brick",
        visible: () => true,
        callback: () => {
            new RoomBuilder().render(true);
        },
    },
    {
        id: "effects",
        name: "Effects",
        icon: "fas fa-fire",
        visible: () => true,
        callback: () => {
            new EffectBrowser().render(true);
        },
    },
    {
        id: "cutscenes",
        name: "Cutscenes",
        icon: "fas fa-clapperboard-play",
        visible: () => true,
        callback: () => {
            new CutscenePanel().render(true);
        },
    },
    {
        id: "community-maps",
        name: "Community Maps",
        icon: "fas fa-map",
        visible: () => true,
        callback: () => {
            new game.Levels3DPreview.sharing.apps.MapBrowser().render(true);
        },
    },
    {
        id: "tutorials",
        name: "More Tours",
        icon: "fas fa-person-hiking",
        visible: () => {
            return !Array.from(game.tours)
                .filter((t) => t.moduleId == "levels-3d-preview")
                .every((t) => t.status == "completed");
        },
        callback: () => {
            new ToursManagement().render(true);
            setTimeout(() => {
                $('.item[data-tab="levels-3d-preview"]')[0].click();
            }, 500);
        },
    },
];
