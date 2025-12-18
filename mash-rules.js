/* ============================================================
   797 DISTILLERY — MASH RULES (constants)
   ============================================================ */

export const MASH_FAMILIES = {
  MOONSHINE: "MOONSHINE",
  GRAIN_WHISKEY: "GRAIN_WHISKEY",
  HYBRID_WHISKEY: "HYBRID_WHISKEY",
  RUM: "RUM"
};

// Gravity points (PPG-style planning numbers)
// IMPORTANT: these are "points per lb per gallon" (e.g. sugar ~46).
export const GRAVITY_POINTS = {
  CORN: 37,
  MALTED_BARLEY: 36,
  WHEAT: 36,

  GRANULATED_SUGAR: 46,

  // Rum inputs treated as sugar-equivalent
  // Used with: gallons * 8.34 lb/gal * GP
  L350: 46,
  MOLASSES: 36
};

export const ENZYMES = {
  AMYLO_300: {
    dose_ml_per_lb_corn: 0.30
  },
  GLUCOAMYLASE: {
    dose_ml_per_lb_grain: 0.25
  }
};

export const YEAST = {
  GRAIN: {
    name: "Red Star Distillers Yeast",
    pitch_g_per_gal: 1.0
  },
  RUM: {
    name: "C-70",
    pitch_g_per_gal: 1.0
  }
};

export const STILLS = {
  OFF_GRAIN: { name: "53 gal Off-Grain Still", max_charge_gal: 53 },
  ON_GRAIN:  { name: "150 gal Jacketed Still", max_charge_gal: 150 }
};

// guardrail warnings (you can tune later)
export const FERMENTATION = {
  og_limits: {
    SUGAR_ASSIST_MAX: 1.090
  }
};
