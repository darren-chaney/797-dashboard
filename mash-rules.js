
/* ============================================================
   797 DISTILLERY — MASH RULES (CANONICAL)
   Guardrails, constants, and hard constraints ONLY
   No calculations, no UI logic
   ============================================================ */

/* =========================
   TANKS
   ========================= */
export const TANKS = {
  SMALL: {
    capacity_gal: 55,
    typical_fill_gal: 55
  },
  LARGE: {
    capacity_gal: 265,
    typical_fill_gal: 235
  }
};

/* =========================
   STILLS
   ========================= */
export const STILLS = {
  OFF_GRAIN: {
    max_charge_gal: 53,
    allows_on_grain: false
  },
  ON_GRAIN: {
    max_charge_gal: 150,
    allows_on_grain: true
  }
};

/* =========================
   MASH FAMILIES
   ========================= */
export const MASH_FAMILIES = {
  MOONSHINE: "MOONSHINE",
  GRAIN_WHISKEY: "GRAIN_WHISKEY",
  HYBRID_WHISKEY: "HYBRID_WHISKEY",
  RUM: "RUM"
};

/* =========================
   YEAST BY FAMILY
   ========================= */
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

/* =========================
   SUGAR RULES
   ========================= */
export const SUGARS = {
  GRANULATED: "Granulated Sugar",
  L350: "SugarRite L350",
  MOLASSES: "Molasses"
};

export const SUGAR_RULES = {
  RUM: [SUGARS.L350, SUGARS.MOLASSES],
  GRAIN: [SUGARS.GRANULATED]
};

/* =========================
   GRAVITY POINT CONSTANTS
   (points per lb per gallon)
   ========================= */
export const GRAVITY_POINTS = {
  CORN: 30,
  MALT: 36,
  WHEAT: 34,
  GRANULATED_SUGAR: 46,
  L350: 43,        // RUM ONLY
  MOLASSES: 36     // RUM ONLY
};

/* =========================
   ENZYMES
   ========================= */
export const ENZYMES = {
  AMYLO_300: {
    name: "Amylo 300",
    dose_ml_per_lb_corn: 0.30,
    add_stage: "HOT_WATER_REST"
  },
  GLUCOAMYLASE: {
    name: "Glucoamylase",
    dose_ml_per_lb_grain: 0.20,
    add_stage: "YEAST_PITCH"
  }
};

/* =========================
   FERMENTATION TARGETS
   ========================= */
export const FERMENTATION = {
  temp_f: {
    min: 80,
    max: 85
  },
  og_limits: {
    GRAIN_ONLY_MAX: 1.065,
    SUGAR_ASSIST_MAX: 1.090
  },
  fg_target_max: 1.000
};

/* =========================
   pH TARGETS & CHECKPOINTS
   ========================= */
export const PH_TARGETS = {
  GRAIN: {
    POST_MASH: [5.6, 5.8],
    YEAST_PITCH: [5.2, 5.5],
    MID_FERMENT: [4.2, 4.6],
    FINAL: [3.6, 4.0]
  },
  RUM: {
    YEAST_PITCH: [5.0, 5.4],
    MID_FERMENT: [4.2, 4.6],
    FINAL: [3.6, 4.0]
  }
};

/* =========================
   pH CORRECTION RULES
   ========================= */
export const PH_CORRECTION = {
  ACID: {
    name: "Citric Acid",
    dose_g_per_gal: 0.5,
    max_total_g_per_gal: 1.5
  },
  BASE: {
    name: "Calcium Carbonate (CaCO3)",
    dose_g_per_gal: 0.5,
    max_total_g_per_gal: 1.0
  }
};

/* =========================
   NUTRIENTS
   ========================= */
export const NUTRIENTS = {
  required_if_sugar_present: true,
  dose_g_per_gal: 1.0
};

/* =========================
   TOP-UP RULES
   ========================= */
export const TOP_UP = {
  allow_yeast_reuse: true,
  recalc_base_recipe: false,
  enzymes_apply_to_new_grain_only: true,
  max_on_grain_pull_gal: 150
};

/* =========================
   RECORD KEEPING CHECKPOINTS
   ========================= */
export const LOG_CHECKPOINTS = [
  "MASH_COMPLETE",
  "YEAST_PITCH",
  "FERMENT_24_HR",
  "FERMENT_48_HR",
  "FERMENT_COMPLETE"
];

/* =========================
   END OF RULES
   ========================= */
