/* ============================================================
   797 DISTILLERY — MASH ENGINE
   Scaling, yield, gravity, and enforcement logic
   ============================================================ */

import {
  GRAVITY_POINTS,
  ENZYMES,
  YEAST,
  STILLS,
  FERMENTATION
} from "./mash-rules.js";

import { MASH_DEFINITIONS } from "./mash-definitions.js";

/* =========================
   UTILITY
   ========================= */
function round(value, decimals = 2) {
  return Number(value.toFixed(decimals));
}

/* ============================================================
   SCALE MASH
   ============================================================ */
export function scaleMash(mashId, fillGal) {
  const mash = MASH_DEFINITIONS[mashId];
  if (!mash) throw new Error("Unknown mash definition");

  const scaled = {
    mashId,
    name: mash.name,
    family: mash.family,
    fillGal,
    fermentOnGrain: mash.fermentOnGrain,
    fermentables: {},
    enzymes: {},
    yeast: null,
    nutrients_g: 0
  };

  let totalGrainLb = 0;
  let gravityPoints = 0;

  /* =========================
     FERMENTABLES
     ========================= */
  for (const key in mash.fermentables) {
    const f = mash.fermentables[key];

    /* ---------- WEIGHT-BASED (lb/gal) ---------- */
    if (f.lb_per_gal !== undefined) {
      const lb = f.lb_per_gal * fillGal;

      scaled.fermentables[key] = {
        lb: round(lb, 1),
        type: f.type || null
      };

      let gpKey = key.toUpperCase();
      if (gpKey === "SUGAR") gpKey = "GRANULATED_SUGAR";

      const gpPerLb = GRAVITY_POINTS[gpKey] || 0;
      gravityPoints += lb * gpPerLb;

      if (!["sugar", "l350", "molasses"].includes(key)) {
        totalGrainLb += lb;
      }
    }

    /* ---------- VOLUME-BASED (gal/gal) — RUM ---------- */
    if (f.gal_per_gal !== undefined) {
      const gal = f.gal_per_gal * fillGal;

      scaled.fermentables[key] = {
        gal: round(gal, 2),
        type: f.type || null
      };

      const gpPerLb = GRAVITY_POINTS[key.toUpperCase()] || 0;

      /*
        Convert gallons → pounds using water equivalent (8.34 lb/gal)
        then apply gravity points
      */
      gravityPoints += gal * 8.34 * gpPerLb;
    }
  }

  /* =========================
     OG / ABV / YIELD
     ========================= */
  const og = 1 + gravityPoints / fillGal / 1000;
  const washABV = (og - 1.0) * 131;
  const pureAlcoholGal = fillGal * washABV / 100;

  /* =========================
     ENZYMES (GRAIN ONLY)
     ========================= */
  if (mash.enzymes) {
    const cornLb = scaled.fermentables.corn?.lb || 0;

    if (mash.enzymes.amylo_300) {
      scaled.enzymes.amylo_300_ml = round(
        cornLb * ENZYMES.AMYLO_300.dose_ml_per_lb_corn,
        1
      );
    }

    if (mash.enzymes.glucoamylase) {
      scaled.enzymes.glucoamylase_ml = round(
        totalGrainLb * ENZYMES.GLUCOAMYLASE.dose_ml_per_lb_grain,
        1
      );
    }
  }

  /* =========================
     YEAST
     ========================= */
  if (mash.yeast_family === "GRAIN") {
    scaled.yeast = {
      name: YEAST.GRAIN.name,
      grams: round(fillGal * YEAST.GRAIN.pitch_g_per_gal, 1)
    };
  } else {
    scaled.yeast = {
      name: YEAST.RUM.name,
      grams: round(fillGal * YEAST.RUM.pitch_g_per_gal, 1)
    };
  }

  /* =========================
     NUTRIENTS
     ========================= */
  if (mash.nutrients_required) {
    scaled.nutrients_g = round(fillGal * 1.0, 1);
  }

  /* =========================
     ENFORCEMENT / WARNINGS
     ========================= */
  const warnings = [];

  if (og > FERMENTATION.og_limits.SUGAR_ASSIST_MAX) {
    warnings.push("OG exceeds clean fermentation limit");
  }

  if (mash.fermentOnGrain && fillGal > STILLS.ON_GRAIN.max_charge_gal) {
    warnings.push("Fill exceeds on-grain still charge capacity");
  }

  /* =========================
     OUTPUT
     ========================= */
  return {
    ...scaled,
    totals: {
      gravityPoints: round(gravityPoints, 0),
      totalGrainLb: round(totalGrainLb, 1),
      og: round(og, 4),
      washABV_percent: round(washABV, 2),
      pureAlcohol_gal: round(pureAlcoholGal, 2)
    },
    warnings
  };
}

/* ============================================================
   STILL COMPATIBILITY CHECK
   ============================================================ */
export function checkStillCompatibility({
  fermentOnGrain,
  chargeGal,
  stillType
}) {
  if (stillType === "OFF_GRAIN") {
    if (fermentOnGrain) {
      return { ok: false, reason: "Off-grain still cannot accept on-grain mash" };
    }
    if (chargeGal > STILLS.OFF_GRAIN.max_charge_gal) {
      return { ok: false, reason: "Charge exceeds off-grain still capacity" };
    }
  }

  if (stillType === "ON_GRAIN") {
    if (chargeGal > STILLS.ON_GRAIN.max_charge_gal) {
      return { ok: false, reason: "Charge exceeds on-grain still capacity" };
    }
  }

  return { ok: true };
}

/* =========================
   END OF ENGINE
   ========================= */
