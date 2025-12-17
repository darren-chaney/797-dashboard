/* ============================================================
   797 DISTILLERY — MASH DEFINITIONS
   Canonical mash bill definitions ONLY
   ============================================================ */

import { MASH_FAMILIES } from "./mash-rules.js";

export const MASH_DEFINITIONS = {

  /* ------------------------------------------------------------
     MOONSHINE — BASE (REAL WORLD)
     55 gal reference:
     Corn 66 lb | Sugar 100 lb | Malt 15 lb
     ------------------------------------------------------------ */
  MOONSHINE_BASE: {
    id: "MOONSHINE_BASE",
    name: "Moonshine Base Mash",
    family: MASH_FAMILIES.MOONSHINE,
    fermentOnGrain: true,

    fermentables: {
      corn: { lb_per_gal: 1.20 },
      malted_barley: { lb_per_gal: 0.27 },
      sugar: {
        type: "GRANULATED",
        lb_per_gal: 1.82
      }
    },

    enzymes: {
      amylo_300: { applies_to: "CORN_ONLY" },
      glucoamylase: { applies_to: "TOTAL_GRAIN" }
    },

    yeast_family: "GRAIN",
    nutrients_required: true
  },

  /* ------------------------------------------------------------
     GRAIN WHISKEY — BASE (NO SUGAR)
     ------------------------------------------------------------ */
  GRAIN_WHISKEY_BASE: {
    id: "GRAIN_WHISKEY_BASE",
    name: "Grain Whiskey Base Mash",
    family: MASH_FAMILIES.GRAIN_WHISKEY,
    fermentOnGrain: true,

    fermentables: {
      corn: { lb_per_gal: 3.5 },
      malted_barley: { lb_per_gal: 1.0 },
      wheat: { lb_per_gal: 0.5 }
    },

    enzymes: {
      amylo_300: { applies_to: "CORN_ONLY" },
      glucoamylase: { applies_to: "TOTAL_GRAIN" }
    },

    yeast_family: "GRAIN",
    nutrients_required: false
  },

  /* ------------------------------------------------------------
     HYBRID WHISKEY — BASE (SUGAR ASSIST)
     ------------------------------------------------------------ */
  HYBRID_WHISKEY_BASE: {
    id: "HYBRID_WHISKEY_BASE",
    name: "Hybrid Whiskey Mash (Sugar Assist)",
    family: MASH_FAMILIES.HYBRID_WHISKEY,
    fermentOnGrain: true,

    fermentables: {
      corn: { lb_per_gal: 3.0 },
      malted_barley: { lb_per_gal: 0.75 },
      wheat: { lb_per_gal: 0.5 },
      sugar: {
        type: "GRANULATED",
        lb_per_gal: 0.75
      }
    },

    enzymes: {
      amylo_300: { applies_to: "CORN_ONLY" },
      glucoamylase: { applies_to: "TOTAL_GRAIN" }
    },

    yeast_family: "GRAIN",
    nutrients_required: true
  },

  /* ------------------------------------------------------------
     RUM — BASE (VOLUME-BASED, REAL WORLD)
     SugarRite L350 + Molasses measured in GALLONS
     ------------------------------------------------------------ */
  RUM_BASE: {
    id: "RUM_BASE",
    name: "Rum Wash Base",
    family: MASH_FAMILIES.RUM,
    fermentOnGrain: false,

    fermentables: {
      l350: {
        type: "L350",
        gal_per_gal: 0.18    // example ratio, adjust if needed
      },
      molasses: {
        gal_per_gal: 0.05    // example ratio, adjust if needed
      }
    },

    enzymes: null,

    yeast_family: "RUM",
    nutrients_required: true
  }

};
