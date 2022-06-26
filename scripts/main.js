import { MaterialBrowser } from "./materialBrowser.js";

Hooks.on("renderTileConfig", injectMaterialBrowser)
Hooks.on("renderTokenConfig", injectMaterialBrowser)

async function injectMaterialBrowser(app,html){
  if(!game.modules.get("levels-3d-preview")?.active) return;
  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  while(!html.find(`input[name="flags.levels-3d-preview.imageTexture"]`).length) {
    await wait(100);
  }

  const filepicker = html.find(`input[name="flags.levels-3d-preview.imageTexture"]`).closest(".form-group");
  MaterialBrowser.create(filepicker, app);
}

Hooks.on("renderWallConfig", async (app,html) => {
  if(!game.modules.get("levels-3d-preview")?.active) return;
  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  while(!html.find(`input[name="flags.levels-3d-preview.wallTexture"]`).length) {
    await wait(100);
  }

  const filepicker = html.find(`input[name="flags.levels-3d-preview.wallTexture"]`).closest(".form-group");
  MaterialBrowser.create(filepicker, app);
  const filepicker2 = html.find(`input[name="flags.levels-3d-preview.wallSidesTexture"]`).closest(".form-group");
  MaterialBrowser.create(filepicker2, app);
})


