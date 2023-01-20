import {MaterialBrowser} from "./apps/materialBrowser.js";
import { AssetBrowser } from "./apps/assetBrowser.js";
import { QuickTerrain } from "./apps/quickTerrain.js";


Hooks.on("getSceneControlButtons", (buttons) => {
  const tools = [
      {
          name: "assetBrowser",
          title: "3D Asset Browser",
          icon: "fa-duotone fa-grid-dividers",
          button: true,
          visible: game.Levels3DPreview?._active,
          onClick: () => {
              new AssetBrowser().render(true);
          },
      },
      {
          name: "quickTerrain",
          title: "Quick 3D Terrain",
          icon: "fa-duotone fa-mountain",
          button: true,
          visible: game.Levels3DPreview?._active,
          onClick: () => {
              new QuickTerrain().render(true);
          },
      },
  ];

  const tileTools = buttons.find((b) => b.name === "tiles")?.tools;
  const browseToolIndex = tileTools.findIndex((t) => t.name === "browse");
  tileTools.splice(browseToolIndex + 1, 0, ...tools);
})


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

Hooks.on("renderMapGen", (app, html) => {
  html.find('input.image').closest('.form-group').each((i, el) => {
    MaterialBrowser.create($(el), app);
  });
});

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

Hooks.once("ready", () => {
  // Module title
  const MODULE_ID = "canvas3dcompendium";
  const MODULE_TITLE = "3D Canvas Mapmaking Pack";

  const FALLBACK_MESSAGE_TITLE = MODULE_TITLE;
  const FALLBACK_MESSAGE = `
  <h2>3D Canvas Mapmaking Pack License Agreement</h3>
  <p>By using this module, you understand that some of the included assets can be used <strong>only inside 3D Canvas</strong>.</p>
  <p>By clicking <strong>'I Accept'</strong> you confirm that you read the asset specific licensing linked below.</p>
  <p>Check <a href="https://github.com/theripper93/canvas3dcompendium">HERE</a> for the specific license of every included asset.</p>`;

  // Settings key used for the "Don't remind me again" setting
  const DONT_REMIND_AGAIN_KEY = "canvas3dcompendiumLicenseAgreement";

  // Dialog code
  game.settings.register(MODULE_ID, DONT_REMIND_AGAIN_KEY, {
    name: "",
    default: false,
    type: Boolean,
    scope: "world",
    config: false,
  });
  if (game.user.isGM && !game.settings.get(MODULE_ID, DONT_REMIND_AGAIN_KEY)) {
    new Dialog({
      title: FALLBACK_MESSAGE_TITLE,
      content: FALLBACK_MESSAGE,
      buttons: {
        ok: { icon: '<i class="fas fa-check"></i>', label: "I Accept", callback: () => game.settings.set(MODULE_ID, DONT_REMIND_AGAIN_KEY, true), },
        dont_remind: {
          icon: '<i class="fas fa-times"></i>',
          label: "I Refuse",
        },
      },
    }).render(true);
  }
});

