/* ============================================================
   797 DISTILLERY — MASH DEFINITIONS
   Canonical mash bill definitions ONLY
   No calculations, no scaling logic
   ============================================================ */

import { MASH_FAMILIES } from "./mash-rules.js";

/* =========================
   MASH DEFINITIONS
   ========================= */
export const MASH_DEFINITIONS = {

  /* ------------------------------------------------------------
     MOONSHINE — BASE (CANONICAL)
     Corn + Malt + Granulated Sugar
     Ferment on grain
     ------------------------------------------------------------ */
  MOONSHINE_BASE: {
    id: "MOONSHINE_BASE",
    name: "Moonshine Base Mash",
    family: MASH_FAMILIES.MOONSHINE,
    fermentOnGrain: true,

    fermentables: {
      corn: {
        lb_per_gal: 4.0
      },
      malted_barley: {
        lb_per_gal: 0.75
      },
      sugar: {
        type: "GRANULATED",
        lb_per_gal: 1.8
      }
    },

    enzymes: {
      amylo_300: {
        applies_to: "CORN_ONLY"
      },
      glucoamylase: {
        applies_to: "TOTAL_GRAIN"
      }
    },

    yeast_family: "GRAIN",
    nutrients_required: true
  },

  /* ------------------------------------------------------------
     GRAIN WHISKEY — BASE (NO SUGAR)
     Corn + Malt + Wheat
     Ferment on grain
     ------------------------------------------------------------ */
  GRAIN_WHISKEY_BASE: {
    id: "GRAIN_WHISKEY_BASE",
    name: "Grain Whiskey Base Mash",
    family: MASH_FAMILIES.GRAIN_WHISKEY,
    fermentOnGrain: true,

    fermentables: {
      corn: {
        lb_per_gal: 3.5
      },
      malted_barley: {
        lb_per_gal: 1.0
      },
      wheat: {
        lb_per_gal: 0.5
      }
    },

    enzymes: {
      amylo_300: {
        applies_to: "CORN_ONLY"
      },
      glucoamylase: {
        applies_to: "TOTAL_GRAIN"
      }
    },

    yeast_family: "GRAIN",
    nutrients_required: false
  },

  /* ------------------------------------------------------------
     HYBRID WHISKEY — BASE (SUGAR ASSIST)
     Grain-forward with yield boost
     ------------------------------------------------------------ */
  HYBRID_WHISKEY_BASE: {
    id: "HYBRID_WHISKEY_BASE",
    name: "Hybrid Whiskey Mash (Sugar Assist)",
    family: MASH_FAMILIES.HYBRID_WHISKEY,
    fermentOnGrain: true,

    fermentables: {
      corn: {
        lb_per_gal: 3.5
      },
      malted_barley: {
        lb_per_gal: 0.75
      },
      wheat: {
        lb_per_gal: 0.5
      },
      sugar: {
        type: "GRANULATED",
        lb_per_gal: 1.0
      }
    },

    enzymes: {
      amylo_300: {
        applies_to: "CORN_ONLY"
      },
      glucoamylase: {
        applies_to: "TOTAL_GRAIN"
      }
    },

    yeast_family: "GRAIN",
    nutrients_required: true
  },

  /* ------------------------------------------------------------
     RUM — BASE
     SugarRite L350 + Molasses
     No enzymes
     ------------------------------------------------------------ */
  RUM_BASE: {
    id: "RUM_BASE",
    name: "Rum Wash Base",
    family: MASH_FAMILIES.RUM,
    fermentOnGrain: false,

    fermentables: {
      l350: {
        type: "L350",
        lb_per_gal: 1.9
      },
      molasses: {
        lb_per_gal: 0.5
      }
    },

    enzymes: null,

    yeast_family: "RUM",
    nutrients_required: true
  }

};

/* =========================
   END OF DEFINITIONS
   ========================= */

