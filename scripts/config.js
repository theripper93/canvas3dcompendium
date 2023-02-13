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
});

Hooks.once('ready', async function() {

});
