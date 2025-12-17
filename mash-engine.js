/* ============================================================
   797 DISTILLERY — MASH ENGINE
   Mash scaling + ABV targeting + FULL STRIP (NO CUTS)
   ============================================================ */

import {
  GRAVITY_POINTS,
  ENZYMES,
  YEAST,
  STILLS,
  FERMENTATION
} from "./mash-rules.js";

import { MASH_DEFINITIONS } from "./mash-definitions.js";

function round(v, d = 2) {
  return Number(v.toFixed(d));
}

/* =========================
   BASE SCALE
   ========================= */
function scaleBaseMash(mash, fillGal) {
  const out = {
    fermentables: {},
    totalGrainLb: 0,
    gravityPoints: 0
  };

  for (const key in mash.fermentables) {
    const f = mash.fermentables[key];

    // lb/gal (grain + granulated sugar)
    if (f.lb_per_gal !== undefined) {
      const lb = f.lb_per_gal * fillGal;
      out.fermentables[key] = { lb: round(lb, 1), type: f.type || null };

      let gpKey = key.toUpperCase();
      if (gpKey === "SUGAR") gpKey = "GRANULATED_SUGAR";

      out.gravityPoints += lb * (GRAVITY_POINTS[gpKey] || 0);
      if (key !== "sugar") out.totalGrainLb += lb;
    }

    // gal/gal (rum)
    if (f.gal_per_gal !== undefined) {
      const gal = f.gal_per_gal * fillGal;
      out.fermentables[key] = { gal: round(gal, 2), type: f.type || null };
      out.gravityPoints += gal * 8.34 * (GRAVITY_POINTS[key.toUpperCase()] || 0);
    }
  }

  return out;
}

/* =========================
   ABV TARGETING (SUGAR ONLY)
   ========================= */
function adjustGranulatedSugarForTargetABV({ mash, fillGal, targetABV, base }) {
  const MIN_ABV = 6.0;
  const MAX_ABV = 11.5;

  const clampedABV = Math.min(Math.max(targetABV, MIN_ABV), MAX_ABV);

  const targetOG = 1 + clampedABV / 131;
  const targetTotalGP = (targetOG - 1) * 1000 * fillGal;

  // grain-only GP
  let grainGP = 0;
  for (const key in mash.fermentables) {
    if (key === "sugar") continue;
    const f = mash.fermentables[key];
    if (f.lb_per_gal !== undefined) {
      const lb = f.lb_per_gal * fillGal;
      grainGP += lb * (GRAVITY_POINTS[key.toUpperCase()] || 0);
    }
  }

  const requiredSugarGP = targetTotalGP - grainGP;
  const requiredSugarLb =
    requiredSugarGP <= 0
      ? 0
      : requiredSugarGP / GRAVITY_POINTS.GRANULATED_SUGAR;

  if (!base.fermentables.sugar) {
    base.fermentables.sugar = { lb: 0, type: "GRANULATED" };
  }

  base.fermentables.sugar.lb = round(requiredSugarLb, 1);
  base.gravityPoints =
    grainGP + requiredSugarLb * GRAVITY_POINTS.GRANULATED_SUGAR;

  return {
    clamped: clampedABV !== targetABV,
    targetABV: clampedABV
  };
}

/* =========================
   FULL STRIP — NO CUTS
   OFF-GRAIN, COLLECT EVERYTHING
   ========================= */
function calculateFullStrip({ washChargedGal, washABV }) {
  const RECOVERY = 0.90; // full strip, no cuts
  const LOW_WINES_ABV = 0.25;

  const pureAlcohol = washChargedGal * (washABV / 100);
  const recoveredAlcohol = pureAlcohol * RECOVERY;
  const lowWinesGal = recoveredAlcohol / LOW_WINES_ABV;

  return {
    strip_style: "FULL_STRIP_NO_CUTS",
    wash_charged_gal: washChargedGal,
    recovery_percent: 90,
    low_wines_abv: 25,
    low_wines_gal: round(lowWinesGal, 2)
  };
}

/* =========================
   PUBLIC API
   ========================= */
export function scaleMash(mashId, fillGal, targetABV = null) {
  const mash = MASH_DEFINITIONS[mashId];
  if (!mash) throw new Error("Unknown mash");

  const base = scaleBaseMash(mash, fillGal);

  let abvAdjustment = null;
  if (targetABV && mash.fermentables.sugar?.lb_per_gal !== undefined) {
    abvAdjustment = adjustGranulatedSugarForTargetABV({
      mash,
      fillGal,
      targetABV,
      base
    });
  }

  const og = 1 + base.gravityPoints / fillGal / 1000;
  const washABV = (og - 1) * 131;
  const pureAlcoholGal = fillGal * washABV / 100;

  // enzymes
  const enzymes = {};
  if (mash.enzymes) {
    const cornLb = base.fermentables.corn?.lb || 0;

    if (mash.enzymes.amylo_300 && cornLb > 0) {
      enzymes.amylo_300_ml = round(
        cornLb * ENZYMES.AMYLO_300.dose_ml_per_lb_corn,
        1
      );
    }
    if (mash.enzymes.glucoamylase) {
      enzymes.glucoamylase_ml = round(
        base.totalGrainLb * ENZYMES.GLUCOAMYLASE.dose_ml_per_lb_grain,
        1
      );
    }
  }

  const yeast =
    mash.yeast_family === "RUM"
      ? { name: YEAST.RUM.name, grams: round(fillGal * YEAST.RUM.pitch_g_per_gal, 1) }
      : { name: YEAST.GRAIN.name, grams: round(fillGal * YEAST.GRAIN.pitch_g_per_gal, 1) };

  // STRIP BASED ON STILL CHARGE, NOT FERMENTER SIZE
  const washChargedGal = Math.min(fillGal, STILLS.OFF_GRAIN.max_charge_gal);

  return {
    mashId,
    name: mash.name,
    family: mash.family,
    fillGal,

    fermentables: base.fermentables,
    enzymes,
    yeast,
    nutrients_g: mash.nutrients_required ? round(fillGal, 1) : 0,

    totals: {
      gravityPoints: round(base.gravityPoints, 0),
      totalGrainLb: round(base.totalGrainLb, 1),
      og: round(og, 4),
      washABV_percent: round(washABV, 2),
      pureAlcohol_gal: round(pureAlcoholGal, 2)
    },

    stripping: calculateFullStrip({
      washChargedGal,
      washABV
    }),

    abvAdjustment
  };
}
