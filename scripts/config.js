Hooks.once('init', async function() {
    game.settings.register("canvas3dcompendium", "autoApply", {
        name: "Automatically Apply Materials",
        hint: "When selecting a material, it will be immediatelly applied to the selected object.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
      });

      game.settings.register("canvas3dcompendium", "autoClose", {
        name: "Close Material Browser",
        hint: "After selecting a material, the material browser will be closed.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
      });
  
      game.settings.register("canvas3dcompendium", "allTokens", {
          name: "Show All Tokens",
          hint: "When disabled, show only colorized tokens, if enabled, show every token available.",
          scope: "world",
          config: true,
          type: Boolean,
          default: false,
      });
  
      game.settings.register("canvas3dcompendium", "autoAssignToken", {
        name: "Auto Assign 3D Model",
        hint: "When placing an Unlinked token on the canvas, automatically assign a 3D model to it if none is assigned.",
        scope: "world",
        config: true,
        choices: {
          0: "Disabled",
          1: "3D Model Only",
          2: "3D Model and Top Down Token",
        },
        type: Number,
        default: 1,
    });
  
      game.settings.register("canvas3dcompendium", "assetBrowserCustomPath", {
          name: "Custom Asset Path",
          hint: "If you want to use a custom path for the asset browser, set it here.",
          scope: "world",
          config: true,
          filePicker: "folder",
          type: String,
          default: "",
      });
  
      game.settings.register("canvas3dcompendium", "assetbrowsertour", {
          scope: "world",
          config: false,
          type: Boolean,
          default: false,
      });
    
      game.settings.register("canvas3dcompendium", "roombuildeercustomthemes", {
        scope: "world",
        config: false,
        type: Array,
        default: [],
    });
    
      game.settings.register("canvas3dcompendium", "assetbrowserpainttour", {
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
    });
});

Hooks.once('ready', async function() {

});
