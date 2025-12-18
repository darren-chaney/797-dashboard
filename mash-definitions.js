/* ============================================================
   mash-definitions.js
   Tanks, stills, recipes, defaults
   ============================================================ */

(function(){
  const DEF_VERSION = "mash-definitions v1.2.0";

  const TANKS = [
    { id:"tank55",  name:"55 gal tank (working fill 55)", workingFillGal:55 },
    { id:"tank235", name:"235 gal tank (working fill 235 in 265)", workingFillGal:235 }
  ];

  const STILLS = [
    { id:"still53",  name:"53 gal off-grain", capacityGal:53 },
    { id:"still150", name:"150 gal jacketed (on-grain)", capacityGal:150 }
  ];

  // Ground truth @ 55 gal
  const RECIPES = {
    moonshine_sugarhead: {
      id:"moonshine_sugarhead",
      label:"Moonshine Base Mash (Sugarhead)",
      kind:"moonshine",
      baseVolumeGal:55,
      grains: [
        { key:"corn", label:"Corn (ground)", lb:66 },
        { key:"malt", label:"Malted Barley", lb:15 }
      ],
      sugarLb:100,
      yeast:"Red Star Distillers Yeast (grain)",
      notes:"180°F water soak + Amylo 300 + gluco. Ferment ~80–85°F. Nutrients used."
    },

    rum_l350_molasses: {
      id:"rum_l350_molasses",
      label:"Rum Base (L350 + Molasses)",
      kind:"rum",
      baseVolumeGal:55,
      l350Gal:14,
      molassesGal:1,
      yeast:"C-70 (rum)",
      notes:"L350 + molasses in gallons. Target ABV does NOT auto-adjust rum unless dedicated mode is enabled."
    }
  };

  const DEFAULTS = {
    mashId:"moonshine_sugarhead",
    tankId:"tank55",
    stillId:"still53",
    fillGal:55,
    targetWashAbvPct: 8.0,
    stripLowWinesAbvPct: 35.0,
    chargeFillPct: 95,
    rumAdjustMode: false
  };

  window.MASH_DEFS = { DEF_VERSION, TANKS, STILLS, RECIPES, DEFAULTS };
})();
