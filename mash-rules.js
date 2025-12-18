/* ============================================================
   797 DISTILLERY — MASH RULES (GLOBAL CONSTANTS)
   ============================================================ */

(function(){

  const MASH_FAMILIES = {
    MOONSHINE: "MOONSHINE",
    GRAIN_WHISKEY: "GRAIN_WHISKEY",
    HYBRID_WHISKEY: "HYBRID_WHISKEY",
    RUM: "RUM"
  };

  // Gravity points (PPG-style planning numbers)
  // IMPORTANT: points per lb per gallon
  const GRAVITY_POINTS = {
    CORN: 37,
    MALTED_BARLEY: 36,
    WHEAT: 36,

    GRANULATED_SUGAR: 46,

    // Rum inputs (treated as sugar-equivalent)
    L350: 46,
    MOLASSES: 36
  };

  const ENZYMES = {
    AMYLO_300: {
      dose_ml_per_lb_corn: 0.30
    },
    GLUCOAMYLASE: {
      dose_ml_per_lb_grain: 0.25
    }
  };

  const YEAST = {
    GRAIN: {
      name: "Red Star Distillers Yeast",
      pitch_g_per_gal: 1.0
    },
    RUM: {
      name: "C-70",
      pitch_g_per_gal: 1.0
    }
  };

  const STILLS = {
    OFF_GRAIN: { name: "53 gal Off-Grain Still", max_charge_gal: 53 },
    ON_GRAIN:  { name: "150 gal Jacketed Still", max_charge_gal: 150 }
  };

  const FERMENTATION = {
    og_limits: {
      SUGAR_ASSIST_MAX: 1.090
    }
  };

  /* =========================
     EXPOSE GLOBAL
     ========================= */
  window.MASH_RULES = {
    MASH_FAMILIES,
    GRAVITY_POINTS,
    ENZYMES,
    YEAST,
    STILLS,
    FERMENTATION
  };

})();
