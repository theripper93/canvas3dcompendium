import { QuickTerrain } from "./apps/quickTerrain.js";

Hooks.on("renderDialog", (dialog, html, data) => {
    if (dialog.title !== "Create New Scene") return;
    
    const checkbox = $(`
    <div class="form-group">
            <label>Quick 3D Scene</label>
            <div class="form-fields">
                <input type="checkbox" name="scene3d">
            </div>
    </div>
    `);

    dialog.element.find(".form-group").last().after(checkbox);

    dialog.element.find(".dialog-button.ok").on("click", () => {
        const isChecked = dialog.element.find("input[name=scene3d]").is(":checked");
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