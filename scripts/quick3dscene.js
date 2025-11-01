import { QuickTerrain } from "./apps/quickTerrain.js";

Hooks.on("renderDialogV2", (dialog, html, data) => {
    if (dialog.title !== game.i18n.format("DOCUMENT.Create", {type: game.i18n.localize("DOCUMENT.Scene")})) return;
    
    const checkbox = document.createElement('div');
    checkbox.className = 'form-group';
    checkbox.innerHTML = `
            <label>Quick 3D Scene</label>
            <div class="form-fields">
                <input type="checkbox" name="scene3d">
            </div>
    `;

    const lastFormGroup = dialog.element.querySelector(".form-group:last-child");
    lastFormGroup.insertAdjacentElement('afterend', checkbox);

    dialog.element.querySelector("button[data-action='ok']").addEventListener("click", () => {
        const isChecked = dialog.element.querySelector("input[name=scene3d]").checked;
        if (!isChecked) return;
        
        Hooks.once("preCreateScene", (scene, data) => {
            scene.updateSource({
                flags: {
                    "levels-3d-preview": {
                        auto3d: true,
                        object3dSight: true,
                        enablePlayers: true,
                        exr: "modules/canvas3dcompendium/assets/Beautiful-Sky/2K/Sky_LowPoly_01_Day_a.webp",
                        skybox: "",
                        renderBackground: false,
                    },
                },
            });
        })

        Hooks.once("createScene", (scene, data) => { 
            scene.view();
        })

        Hooks.once("renderSceneConfig", (dialog, html, data) => {
            setTimeout(() => {
                dialog.close(true);
            }, 1000);
        });

        Hooks.once("3DCanvasSceneReady", () => {
            setTimeout(() => {
                canvas.tiles.activate();
                new QuickTerrain(true).render(true);
            }, 1000);
        });
    });

    dialog.setPosition({height: "auto"});

 });