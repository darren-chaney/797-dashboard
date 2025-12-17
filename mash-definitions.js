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
    name: "Moonshine Base Mash (797)",
    family: MASH_FAMILIES.MOONSHINE,
    fermentOnGrain: true,

    fermentables: {
      corn: { lb_per_gal: 1.20 },
      malted_barley: { lb_per_gal: 0.27 },
      sugar: { type: "GRANULATED", lb_per_gal: 1.82 }
    },

    enzymes: {
      amylo_300: { applies_to: "CORN_ONLY" },
      glucoamylase: { applies_to: "TOTAL_GRAIN" }
    },

    yeast_family: "GRAIN",
    nutrients_required: true
  },

  /* ------------------------------------------------------------
     MOONSHINE — 350 GAL COOKER BILL (OTHER DISTILLERY)
     350 gal reference:
     Corn 400 lb | Sugar 200 lb | Malt 50 lb
     Yeast 400 g total
     NOTE: enzyme in their note is "100 mL" (unknown type),
     so we DO NOT guess gluco here. Amylo schedule only.
     ------------------------------------------------------------ */
  MOONSHINE_350_COOKER: {
    id: "MOONSHINE_350_COOKER",
    name: "Moonshine (350 Cooker Bill)",
    family: MASH_FAMILIES.MOONSHINE,
    fermentOnGrain: true,

    fermentables: {
      corn: { lb_per_gal: 1.142857 },         // 400 / 350
      malted_barley: { lb_per_gal: 0.142857 },// 50 / 350
      sugar: { type: "GRANULATED", lb_per_gal: 0.571429 } // 200 / 350
    },

    enzymes: {
      amylo_300: { applies_to: "CORN_ONLY" },
      // glucoamylase intentionally omitted (unknown in their 100 mL note)
    },

    yeast_family: "GRAIN",
    // their yeast is effectively 1.142857 g/gal; our rules file is 1.0 g/gal
    // We’ll accept your standards for now; if you want exact, we can add per-definition pitch later.
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
      sugar: { type: "GRANULATED", lb_per_gal: 0.75 }
    },

    enzymes: {
      amylo_300: { applies_to: "CORN_ONLY" },
      glucoamylase: { applies_to: "TOTAL_GRAIN" }
    },

    yeast_family: "GRAIN",
    nutrients_required: true
  },

  /* ------------------------------------------------------------
     RUM — BASE (REAL WORLD, VOLUME-BASED)
     55 gal reference:
     L350 = 14 gal | Molasses = 1 gal
     ------------------------------------------------------------ */
  RUM_BASE: {
  id: "RUM_BASE",
  name: "Rum Wash Base",
  family: MASH_FAMILIES.RUM,
  fermentOnGrain: false,

  fermentables: {
    l350: {
      type: "L350",
      gal_per_gal: 0.254545  // 14 / 55
    },
    molasses: {
      gal_per_gal: 0.018182  // 1 / 55
    }
  },

  enzymes: null,

  yeast_family: "RUM",
  nutrients_required: true
}

};
