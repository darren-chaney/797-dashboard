/* ============================================================
   797 DISTILLERY — MASH ENGINE (CALIBRATED)
   - Uses efficiency-adjusted estimates (so targets behave correctly)
   - ABV targeting adjusts GRANULATED SUGAR only (grain fixed)
   - ABV targeting is DISABLED for RUM (no more weird L350 changes)
   - Stripping = FULL STRIP, NO CUTS, collect everything
   - Low wines modeled at 40% (matches “collect everything” reality better)
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
   797 CALIBRATION CONSTANTS
   ============================================================ */

// Efficiency applied to gravity contribution (NOT to volume)
// This is the missing “real world” factor that makes targets act sane.
const EFF = {
  // Grain conversion on your soak/cook method is not 100% theoretical.
  // This is why your target ABV logic looked inverted.
  GRAIN_GRAVITY: 0.65,

  // Granulated sugar ferments essentially fully (close enough for planning).
  SUGAR_GRAVITY: 1.00,

  // Rum sugars are close to full, but molasses is not perfectly fermentable.
  // Keep slightly below 1.00.
  RUM_GRAVITY: 0.90
};

// Stripping model for your process: NO CUTS, collect everything
// Low wines proof tends to be higher than “35% with cuts assumptions”
const STRIP = {
  RECOVERY: 0.90,
  LOW_WINES_ABV: 0.40
};

/* ============================================================
   BASE SCALE (and split gravity buckets so we can apply efficiency)
   ============================================================ */
function scaleBaseMash(mash, fillGal) {
  const out = {
    fermentables: {},
    totalGrainLb: 0,

    gp_grain_theoretical: 0,
    gp_sugar_theoretical: 0,
    gp_rum_theoretical: 0
  };

  for (const key in mash.fermentables) {
    const f = mash.fermentables[key];

    // Weight-based (lb/gal)
    if (f.lb_per_gal !== undefined) {
      const lb = f.lb_per_gal * fillGal;
      out.fermentables[key] = { lb: round(lb, 1), type: f.type || null };

      let gpKey = key.toUpperCase();
      if (gpKey === "SUGAR") gpKey = "GRANULATED_SUGAR";

      const gp = lb * (GRAVITY_POINTS[gpKey] || 0);

      if (key === "sugar") {
        out.gp_sugar_theoretical += gp;
      } else {
        out.gp_grain_theoretical += gp;
        out.totalGrainLb += lb;
      }
    }

    // Volume-based (gal/gal) — Rum
    if (f.gal_per_gal !== undefined) {
      const gal = f.gal_per_gal * fillGal;
      out.fermentables[key] = { gal: round(gal, 2), type: f.type || null };

      // Convert gallons → pounds (8.34 lb/gal), then apply GP/lb constant.
      const gp = gal * 8.34 * (GRAVITY_POINTS[key.toUpperCase()] || 0);
      out.gp_rum_theoretical += gp;
    }
  }

  return out;
}

/* ============================================================
   Convert theoretical GP buckets to EXPECTED total GP (efficiency adjusted)
   ============================================================ */
function expectedTotalGP(base) {
  const grain = base.gp_grain_theoretical * EFF.GRAIN_GRAVITY;
  const sugar = base.gp_sugar_theoretical * EFF.SUGAR_GRAVITY;
  const rum   = base.gp_rum_theoretical   * EFF.RUM_GRAVITY;
  return grain + sugar + rum;
}

/* ============================================================
   ABV TARGETING (GRANULATED SUGAR ONLY)
   - Grain fixed
   - Uses EXPECTED GP (efficiency-adjusted) so target behavior is correct
   ============================================================ */
function adjustGranulatedSugarForTargetABV({ mash, fillGal, targetABV, base }) {
  const MIN_ABV = 6.0;
  const MAX_ABV = 11.5;

  const clampedABV = Math.min(Math.max(targetABV, MIN_ABV), MAX_ABV);

  // Target total GP (EXPECTED) from desired ABV
  const targetOG = 1 + clampedABV / 131;
  const targetTotalGP_expected = (targetOG - 1) * 1000 * fillGal;

  // Expected grain contribution (exclude sugar)
  const grainGP_expected = base.gp_grain_theoretical * EFF.GRAIN_GRAVITY;

  // Rum bucket is not part of sugarhead targeting; if present, keep it fixed
  const rumGP_expected = base.gp_rum_theoretical * EFF.RUM_GRAVITY;

  const fixedExpectedGP = grainGP_expected + rumGP_expected;

  // Required expected sugar GP
  const requiredSugarGP_expected = targetTotalGP_expected - fixedExpectedGP;

  // Convert expected GP back to theoretical sugar pounds
  // sugar_expected = sugar_theoretical * EFF.SUGAR_GRAVITY
  // sugar_theoretical = sugar_expected / EFF.SUGAR_GRAVITY
  const requiredSugarGP_theoretical = requiredSugarGP_expected / EFF.SUGAR_GRAVITY;

  const requiredSugarLb =
    requiredSugarGP_theoretical <= 0
      ? 0
      : requiredSugarGP_theoretical / GRAVITY_POINTS.GRANULATED_SUGAR;

  if (!base.fermentables.sugar) {
    base.fermentables.sugar = { lb: 0, type: "GRANULATED" };
  }

  base.fermentables.sugar.lb = round(requiredSugarLb, 1);

  // Update the sugar GP bucket (theoretical) to match new sugar
  base.gp_sugar_theoretical = requiredSugarLb * GRAVITY_POINTS.GRANULATED_SUGAR;

  return { clamped: clampedABV !== targetABV, targetABV: clampedABV };
}

/* ============================================================
   STRIPPING — FULL STRIP, NO CUTS (collect everything)
   IMPORTANT: uses STILL CHARGE size (not fermenter size)
   ============================================================ */
function calculateFullStrip({ washChargedGal, washABV }) {
  const pureAlcohol = washChargedGal * (washABV / 100);
  const recoveredAlcohol = pureAlcohol * STRIP.RECOVERY;
  const lowWinesGal = recoveredAlcohol / STRIP.LOW_WINES_ABV;

  return {
    strip_style: "FULL_STRIP_NO_CUTS",
    wash_charged_gal: washChargedGal,
    recovery_percent: Math.round(STRIP.RECOVERY * 100),
    low_wines_abv: Math.round(STRIP.LOW_WINES_ABV * 100),
    low_wines_gal: round(lowWinesGal, 2)
  };
}

/* ============================================================
   PUBLIC API
   ============================================================ */
export function scaleMash(mashId, fillGal, targetABV = null) {
  const mash = MASH_DEFINITIONS[mashId];
  if (!mash) throw new Error("Unknown mash");

  const base = scaleBaseMash(mash, fillGal);

  // ABV targeting:
  // - ONLY adjusts granulated sugar
  // - DISABLED for rum (prevents “lowering sugar” / changing L350 behavior)
  let abvAdjustment = null;
  let warnings = [];

  if (targetABV) {
    if (mash.family === "RUM") {
      warnings.push("Target ABV adjustment is disabled for Rum (does not auto-adjust L350/molasses).");
    } else if (mash.fermentables.sugar?.lb_per_gal !== undefined) {
      abvAdjustment = adjustGranulatedSugarForTargetABV({
        mash,
        fillGal,
        targetABV,
        base
      });
    }
  }

  // Expected totals (efficiency-adjusted)
  const totalGP_expected = expectedTotalGP(base);

  const og = 1 + totalGP_expected / fillGal / 1000;
  const washABV = (og - 1.0) * 131;
  const pureAlcoholGal = fillGal * washABV / 100;

  // Enzymes (grain only)
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

  // Yeast
  const yeast =
    mash.yeast_family === "RUM"
      ? { name: YEAST.RUM.name, grams: round(fillGal * YEAST.RUM.pitch_g_per_gal, 1) }
      : { name: YEAST.GRAIN.name, grams: round(fillGal * YEAST.GRAIN.pitch_g_per_gal, 1) };

  // Nutrients
  const nutrients_g = mash.nutrients_required ? round(fillGal * 1.0, 1) : 0;

  // Fermentation guardrails (warning only)
  if (og > FERMENTATION.og_limits.SUGAR_ASSIST_MAX) {
    warnings.push("OG exceeds clean fermentation limit");
  }

  // Stripping: off-grain still charge size
  // (We’ll later add multi-charge summary; for now: one charge estimate)
  const washChargedGal = Math.min(fillGal, STILLS.OFF_GRAIN.max_charge_gal);

  return {
    mashId,
    name: mash.name,
    family: mash.family,
    fillGal,
    fermentOnGrain: mash.fermentOnGrain,

    fermentables: base.fermentables,
    enzymes,
    yeast,
    nutrients_g,

    totals: {
      og: round(og, 4),
      washABV_percent: round(washABV, 2),
      pureAlcohol_gal: round(pureAlcoholGal, 2)
    },

    stripping: calculateFullStrip({ washChargedGal, washABV }),

    abvAdjustment,
    warnings
  };
}
