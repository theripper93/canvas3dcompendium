import {MaterialBrowser} from "./apps/materialBrowser.js";
import {AssetBrowser} from "./apps/assetBrowser.js";
import {TokenBrowser, setHudHook} from "./apps/tokenBrowser.js";
import {QuickTerrain} from "./apps/quickTerrain.js";
import {EffectBrowser} from "./apps/effectBrowser.js";
import {BuildPanel} from "./apps/buildPanel.js";
import {QuickEnvironment} from "./apps/quickEnvironment.js";
import {CutscenePanel} from "./apps/cutscenePanel.js";
import { RoomBuilder } from "./apps/roomBuilder.js";

BuildPanel.setHook();

setHudHook();

Hooks.on("3DCanvasConfig", (config) => {
  const UI = config.UI;
  UI.MaterialBrowser = MaterialBrowser;
  UI.AssetBrowser = AssetBrowser;
  UI.TokenBrowser = TokenBrowser;
  UI.QuickTerrain = QuickTerrain;
  UI.EffectBrowser = EffectBrowser;
  UI.BuildPanel = BuildPanel;
  UI.QuickEnvironment = QuickEnvironment;
  UI.CutscenePanel = CutscenePanel;
  UI.RoomBuilder = RoomBuilder;
  Hooks.callAll("3DCanvasMapmakingPackRegisterAssetPacks", UI.AssetBrowser);
  Hooks.callAll("3DCanvasMapmakingPackRegisterTokenPacks", UI.TokenBrowser);
})

Hooks.on("3DCanvasMapmakingPackRegisterAssetPacks", (ab) => {
    ab.registerPack(
        "canvas3dcompendium",
        "Mapmaking Pack",
        [
            {
                name: "Items",
                query: "Tiles/RPG Items,CreativeTrio/Potions",
            },
            {
                name: "Furniture",
                query: "Furniture",
            },
            {
                name: "Dungeon",
                query: "KayKitPack/Dungeon,Kenney/Medieval,Tiles/Medieval Dungeon,Tiles/Modular Ruins",
            },
            {
                name: "Dungeon Set",
                query: "KayKitPack/Dungeon/Remastered",
            },
            {
                name: "Nature",
                query: "nature",
          },
          {
            name: "Rock Formations",
            query: "Rocks_highend,Rocks_desert,Rocks_runic",
          },
            {
                name: "Sci-Fi",
                query: "scifi,cyberpunk,space",
            },
            {
                name: "Structures",
                query: "tiles/buildings,Tiles/Ultimate Fantasy",
            },
            {
                name: "Bridges",
                query: "CreativeTrio/Bridges",
            },
            {
                name: "Doors",
                query: "door,gate,arch",
            },
            {
                name: "Fences",
                query: "fence,pole,board",
            },
            {
                name: "Vegetation",
                query: "CreativeTrio/FlowersPlants,CreativeTrio/Mushrooms,CreativeTrio/Trees,Tiles/Stylized Trees",
            },
            {
                name: "Grass & Shrubs",
                query: "Vegetation_billboard/high_res",
            },
            {
                name: "Crops",
                query: "tiles/Crops",
            },
            {
                name: "Food",
                query: "food",
            },
        ],
        {
            subfolder: "assets/Tiles",
        },
    );
    ab.registerPack("baileywiki-3d", "Baileywiki 3D");
});


Hooks.on("renderTileConfig", injectMaterialBrowser)
Hooks.on("renderTokenConfig", injectMaterialBrowser)
Hooks.on("renderShaderConfig", injectMaterialBrowser);
Hooks.on("renderRoomBuilder", injectMaterialBrowser);

Hooks.on("renderTokenConfig", async (app, html) => {
    if (!game.modules.get("levels-3d-preview")?.active) return;
    function wait(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    while (!html.find(`input[name="flags.levels-3d-preview.model3d"]`).length) {
        await wait(100);
  }
            const filepicker = html.find(`input[name="flags.levels-3d-preview.model3d"]`).closest(".form-group");
            TokenBrowser.create(filepicker, app);
});

async function injectMaterialBrowser(app, html) {
  if(!game.modules.get("levels-3d-preview")?.active) return;
  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  if (app.id == "levels-3d-preview-shader-config") {
    const filepickers = html.find(`input.image`)
    filepickers.each((i, el) => { 
      MaterialBrowser.create($(el).closest(".form-group"), app, "_Color");
    });
    
  } else if (app.id == "room-builder") {
    const filepickers = html.find(`input.image`)
    filepickers.each((i, el) => { 
      MaterialBrowser.create($(el).closest(".form-group"), app);
    });
  } else {
          while (!html.find(`input[name="flags.levels-3d-preview.imageTexture"]`).length) {
              await wait(100);
          }

          const filepicker = html.find(`input[name="flags.levels-3d-preview.imageTexture"]`).closest(".form-group");
          MaterialBrowser.create(filepicker, app);
  }

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

