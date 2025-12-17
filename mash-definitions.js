/* ============================================================
   797 DISTILLERY — MASH DEFINITIONS
   ============================================================ */

import { MASH_FAMILIES } from "./mash-rules.js";

export const MASH_DEFINITIONS = {
  MOONSHINE_BASE: {
    id: "MOONSHINE_BASE",
    name: "Moonshine Base Mash",
    family: MASH_FAMILIES.MOONSHINE,
    fermentOnGrain: true,

    // 55 gal reference: Corn 66 | Sugar 100 | Malt 15
    fermentables: {
      corn: { lb_per_gal: 1.20 },
      malted_barley: { lb_per_gal: 0.2727 },
      sugar: { lb_per_gal: 1.8182, type: "GRANULATED" }
    },

    enzymes: {
      amylo_300: { applies_to: "CORN_ONLY" },
      glucoamylase: { applies_to: "TOTAL_GRAIN" }
    },

    yeast_family: "GRAIN",
    nutrients_required: true
  },

  HYBRID_WHISKEY_BASE: {
    id: "HYBRID_WHISKEY_BASE",
    name: "Hybrid Whiskey Mash (Sugar Assist)",
    family: MASH_FAMILIES.HYBRID_WHISKEY,
    fermentOnGrain: true,

    fermentables: {
      corn: { lb_per_gal: 3.0 },
      malted_barley: { lb_per_gal: 0.75 },
      wheat: { lb_per_gal: 0.5 },
      sugar: { lb_per_gal: 0.75, type: "GRANULATED" }
    },

    enzymes: {
      amylo_300: { applies_to: "CORN_ONLY" },
      glucoamylase: { applies_to: "TOTAL_GRAIN" }
    },

    yeast_family: "GRAIN",
    nutrients_required: true
  },

  RUM_BASE: {
    id: "RUM_BASE",
    name: "Rum Wash Base",
    family: MASH_FAMILIES.RUM,
    fermentOnGrain: false,

    // 55 gal reference: L350 = 14 gal, Molasses = 1 gal
    fermentables: {
      l350: { type: "L350", gal_per_gal: 14 / 55 },
      molasses: { type: "MOLASSES", gal_per_gal: 1 / 55 }
    },

    enzymes: null,

    yeast_family: "RUM",
    nutrients_required: true
  }
};
