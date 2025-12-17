/* ============================================================
   797 DISTILLERY — MASH ENGINE
   Scaling, yield, ABV targeting (sugar-only), stripping estimates
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

/* ============================================================
   BASE SCALE (no targeting)
   ============================================================ */
function scaleBaseMash(mash, fillGal) {
  const out = {
    fermentables: {},
    totalGrainLb: 0,
    gravityPoints: 0
  };

  for (const key in mash.fermentables) {
    const f = mash.fermentables[key];

    // Weight-based (lb/gal)
    if (f.lb_per_gal !== undefined) {
      const lb = f.lb_per_gal * fillGal;

      out.fermentables[key] = { lb: round(lb, 1), type: f.type || null };

      let gpKey = key.toUpperCase();
      if (gpKey === "SUGAR") gpKey = "GRANULATED_SUGAR";

      out.gravityPoints += lb * (GRAVITY_POINTS[gpKey] || 0);

      // "grain" tracking (exclude sugar)
      if (key !== "sugar") out.totalGrainLb += lb;
    }

    // Volume-based (gal/gal) — Rum
    if (f.gal_per_gal !== undefined) {
      const gal = f.gal_per_gal * fillGal;

      out.fermentables[key] = { gal: round(gal, 2), type: f.type || null };

      // Convert gallons → pounds using 8.34 lb/gal
      // then apply GP constants
      out.gravityPoints += gal * 8.34 * (GRAVITY_POINTS[key.toUpperCase()] || 0);
    }
  }

  return out;
}

/* ============================================================
   ABV TARGETING (sugar-only)
   - Works only for mash definitions that include GRANULATED sugar
   - Grain stays fixed; sugar is recalculated from grain-only gravity
   ============================================================ */
function adjustGranulatedSugarForTargetABV({
  mash,
  fillGal,
  targetABV,
  base
}) {
  const MIN_ABV = 6.0;
  const MAX_ABV = 11.5;

  const clampedABV = Math.min(Math.max(targetABV, MIN_ABV), MAX_ABV);

  // Target OG and total GP
  const targetOG = 1 + clampedABV / 131;
  const targetTotalGP = (targetOG - 1) * 1000 * fillGal;

  // Compute grain-only GP (exclude sugar and any volume-based rum items)
  let grainGP = 0;

  for (const key in mash.fermentables) {
    if (key === "sugar") continue;

    const f = mash.fermentables[key];

    // Only count lb-based grain in grainGP
    if (f.lb_per_gal !== undefined) {
      const lb = f.lb_per_gal * fillGal;

      let gpKey = key.toUpperCase();
      grainGP += lb * (GRAVITY_POINTS[gpKey] || 0);
    }
  }

  // How much GP must sugar provide?
  const requiredSugarGP = targetTotalGP - grainGP;

  // If target is below grain-only contribution, sugar goes to 0
  const requiredSugarLb =
    requiredSugarGP <= 0
      ? 0
      : requiredSugarGP / GRAVITY_POINTS.GRANULATED_SUGAR;

  // Ensure sugar exists in base output
  if (!base.fermentables.sugar) base.fermentables.sugar = { lb: 0, type: "GRANULATED" };

  base.fermentables.sugar.lb = round(requiredSugarLb, 1);

  // Rebuild total GP from grain + sugar (do not include any previous sugar GP)
  base.gravityPoints =
    grainGP +
    requiredSugarLb * GRAVITY_POINTS.GRANULATED_SUGAR;

  return {
    clamped: clampedABV !== targetABV,
    targetABV: clampedABV
  };
}

/* ============================================================
   STRIPPING RUN ESTIMATE
   ============================================================ */
function calculateStripping({ fillGal, washABV }) {
  const recovery = 0.90;   // 90% alcohol recovery (strip)
  const lowWinesABV = 0.35; // 35% low wines

  const pureAlcohol = fillGal * (washABV / 100);
  const recovered = pureAlcohol * recovery;
  const lowWinesGal = recovered / lowWinesABV;

  return {
    recovery_percent: 90,
    low_wines_abv: 35,
    low_wines_gal: round(lowWinesGal, 2)
  };
}

/* ============================================================
   PUBLIC API
   ============================================================ */
export function scaleMash(mashId, fillGal, targetABV = null) {
  const mash = MASH_DEFINITIONS[mashId];
  if (!mash) throw new Error("Unknown mash");

  const scaled = {
    mashId,
    name: mash.name,
    family: mash.family,
    fillGal,
    fermentOnGrain: mash.fermentOnGrain,
    fermentables: {},
    enzymes: {},
    yeast: null,
    nutrients_g: 0,
    totals: {},
    stripping: null,
    abvAdjustment: null,
    warnings: []
  };

  // Base scale from definition
  const base = scaleBaseMash(mash, fillGal);

  // Apply ABV targeting only if:
  // - targetABV provided
  // - mash has granulated sugar field named "sugar" with lb_per_gal
  // (We do NOT auto-adjust rum L350/molasses here.)
  if (targetABV && mash.fermentables.sugar && mash.fermentables.sugar.lb_per_gal !== undefined) {
    scaled.abvAdjustment = adjustGranulatedSugarForTargetABV({
      mash,
      fillGal,
      targetABV,
      base
    });
  }

  // OG / ABV / Yield from updated gravity points
  const og = 1 + base.gravityPoints / fillGal / 1000;
  const washABV = (og - 1.0) * 131;
  const pureAlcoholGal = fillGal * washABV / 100;

  // Enzymes (grain only)
  if (mash.enzymes) {
    const cornLb = base.fermentables.corn?.lb || 0;

    if (mash.enzymes.amylo_300 && cornLb > 0) {
      scaled.enzymes.amylo_300_ml = round(
        cornLb * ENZYMES.AMYLO_300.dose_ml_per_lb_corn,
        1
      );
    }

    if (mash.enzymes.glucoamylase) {
      scaled.enzymes.glucoamylase_ml = round(
        base.totalGrainLb * ENZYMES.GLUCOAMYLASE.dose_ml_per_lb_grain,
        1
      );
    }
  }

  // Yeast
  scaled.yeast =
    mash.yeast_family === "RUM"
      ? { name: YEAST.RUM.name, grams: round(fillGal * YEAST.RUM.pitch_g_per_gal, 1) }
      : { name: YEAST.GRAIN.name, grams: round(fillGal * YEAST.GRAIN.pitch_g_per_gal, 1) };

  // Nutrients
  scaled.nutrients_g = mash.nutrients_required ? round(fillGal * 1.0, 1) : 0;

  // Fermentation guardrail warning (keep as warning, not a stop)
  if (og > FERMENTATION.og_limits.SUGAR_ASSIST_MAX) {
    scaled.warnings.push("OG exceeds clean fermentation limit");
  }

  // Still capacity warning (informational)
  if (mash.fermentOnGrain && fillGal > STILLS.ON_GRAIN.max_charge_gal) {
    scaled.warnings.push("Fill exceeds on-grain still charge capacity (you will strip in multiple charges)");
  }

  // Output
  scaled.fermentables = base.fermentables;

  scaled.totals = {
    gravityPoints: round(base.gravityPoints, 0),
    totalGrainLb: round(base.totalGrainLb, 1),
    og: round(og, 4),
    washABV_percent: round(washABV, 2),
    pureAlcohol_gal: round(pureAlcoholGal, 2)
  };

  scaled.stripping = calculateStripping({ fillGal, washABV });

  return scaled;
}

/* ============================================================
   STILL COMPATIBILITY CHECK (optional helper)
   ============================================================ */
export function checkStillCompatibility({ fermentOnGrain, chargeGal, stillType }) {
  if (stillType === "OFF_GRAIN") {
    if (fermentOnGrain) return { ok: false, reason: "Off-grain still cannot accept on-grain mash" };
    if (chargeGal > STILLS.OFF_GRAIN.max_charge_gal) return { ok: false, reason: "Charge exceeds off-grain still capacity" };
  }

  if (stillType === "ON_GRAIN") {
    if (chargeGal > STILLS.ON_GRAIN.max_charge_gal) return { ok: false, reason: "Charge exceeds on-grain still capacity" };
  }

  return { ok: true };
}
