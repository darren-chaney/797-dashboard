/* ============================================================
   797 DISTILLERY — MASH ENGINE (LOCKED TO YOUR PROCESS)
   - Moonshine ABV target adjusts granulated sugar UP only
   - Rum ABV target disabled (never changes L350/molasses)
   - Stripping: FULL STRIP, NO CUTS, collect everything
   - Low wines based on STILL CHARGE (53 gal), not fermenter volume
   ============================================================ */

import {
  GRAVITY_POINTS,
  ENZYMES,
  YEAST,
  STILLS,
  FERMENTATION
} from "./mash-rules.js";

import { MASH_DEFINITIONS } from "./mash-definitions.js";

export const ENGINE_VERSION = "mash-engine v3.2.0 (PPG-FIX + CAL-68)";

function round(v, d = 2) {
  return Number(Number(v).toFixed(d));
}

/* =========================
   REAL-WORLD EFFICIENCY (planning)
   ========================= */
const EFF = {
  // Your “180°F water + soak” method isn't full conversion
  GRAIN_GRAVITY: 0.65,
  // Granulated sugar ferments essentially fully
  SUGAR_GRAVITY: 1.00,
  // Rum inputs mostly fermentable; molasses less so
  RUM_GRAVITY: 0.90
};

/* =========================
   STRIP MODEL (your process)
   ========================= */
const STRIP = {
  STYLE: "FULL_STRIP_NO_CUTS",
  // Calibrated to your stated reality
  RECOVERY: 0.68,     // ✅ Darren calibration
  LOW_WINES_ABV: 0.35 // ✅ default no-cuts avg
};

/* =========================
   BASE SCALE (track GP buckets)
   units:
   - "GP" here = points-gallons
   - OG points = totalGP / gallons
   ========================= */
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

    // lb/gal (grain + granulated sugar)
    if (f.lb_per_gal !== undefined) {
      const lb = f.lb_per_gal * fillGal;
      out.fermentables[key] = { lb: round(lb, 1), type: f.type || null };

      let gpKey = key.toUpperCase();
      if (gpKey === "SUGAR") gpKey = "GRANULATED_SUGAR";

      const gp = lb * (GRAVITY_POINTS[gpKey] || 0); // points-gallons

      if (key === "sugar") out.gp_sugar_theoretical += gp;
      else {
        out.gp_grain_theoretical += gp;
        out.totalGrainLb += lb;
      }
    }

    // gal/gal (rum)
    if (f.gal_per_gal !== undefined) {
      const gal = f.gal_per_gal * fillGal;
      out.fermentables[key] = { gal: round(gal, 2), type: f.type || null };

      // Convert gallons -> pounds (8.34 lb/gal), then apply PPG
      const lb = gal * 8.34;
      const gp = lb * (GRAVITY_POINTS[key.toUpperCase()] || 0);
      out.gp_rum_theoretical += gp;
    }
  }

  return out;
}

function expectedTotalGP(base) {
  const grain = base.gp_grain_theoretical * EFF.GRAIN_GRAVITY;
  const sugar = base.gp_sugar_theoretical * EFF.SUGAR_GRAVITY;
  const rum   = base.gp_rum_theoretical   * EFF.RUM_GRAVITY;
  return grain + sugar + rum;
}

/* =========================
   ABV TARGETING (Moonshine)
   - Adjusts granulated sugar only
   - HARD RULE: never reduce sugar below base recipe
   ========================= */
function adjustGranulatedSugarForTargetABV({ mash, fillGal, targetABV, base }) {
  const MIN_ABV = 6.0;
  const MAX_ABV = 11.5;
  const clampedABV = Math.min(Math.max(targetABV, MIN_ABV), MAX_ABV);

  // Base recipe sugar (hard minimum)
  const baseSugarLb = mash.fermentables.sugar.lb_per_gal * fillGal;

  // Target OG from ABV (planning)
  const targetOG = 1 + clampedABV / 131;

  // Total points-gallons required
  const targetTotalGP_expected = (targetOG - 1) * 1000 * fillGal;

  // Fixed expected GP from grain + rum (no sugar)
  const grain_expected = base.gp_grain_theoretical * EFF.GRAIN_GRAVITY;
  const rum_expected   = base.gp_rum_theoretical   * EFF.RUM_GRAVITY;
  const fixedExpectedGP = grain_expected + rum_expected;

  // Required expected sugar GP
  const requiredSugarGP_expected = targetTotalGP_expected - fixedExpectedGP;

  // Convert expected sugar GP -> theoretical sugar GP
  const requiredSugarGP_theoretical = requiredSugarGP_expected / EFF.SUGAR_GRAVITY;

  let requiredSugarLb =
    requiredSugarGP_theoretical <= 0
      ? 0
      : requiredSugarGP_theoretical / GRAVITY_POINTS.GRANULATED_SUGAR;

  // 🔒 HARD RULE: never reduce sugar below recipe baseline
  requiredSugarLb = Math.max(baseSugarLb, requiredSugarLb);

  base.fermentables.sugar.lb = round(requiredSugarLb, 1);
  base.gp_sugar_theoretical = requiredSugarLb * GRAVITY_POINTS.GRANULATED_SUGAR;

  return {
    clamped: clampedABV !== targetABV,
    targetABV: clampedABV
  };
}

/* =========================
   STRIPPING (full strip, no cuts)
   - Uses still charge size, not fermenter size
   ========================= */
function calculateStrip({ washChargedGal, washABV }) {
  const pureAlcohol = washChargedGal * (washABV / 100);
  const recoveredAlcohol = pureAlcohol * STRIP.RECOVERY;
  const lowWinesGal = recoveredAlcohol / STRIP.LOW_WINES_ABV;

  return {
    strip_style: STRIP.STYLE,
    wash_charged_gal: round(washChargedGal, 2),
    recovery_percent: Math.round(STRIP.RECOVERY * 100),
    low_wines_abv: Math.round(STRIP.LOW_WINES_ABV * 100),
    low_wines_gal: round(lowWinesGal, 2)
  };
}

/* =========================
   PUBLIC API
   ========================= */
export function scaleMash(mashId, fillGal, targetABV = null) {
  const mash = MASH_DEFINITIONS[mashId];
  if (!mash) throw new Error("Unknown mashId: " + mashId);

  const fill = Number(fillGal);
  if (!isFinite(fill) || fill <= 0) throw new Error("Invalid fillGal");

  const base = scaleBaseMash(mash, fill);

  let warnings = [];
  let abvAdjustment = null;

  // ABV targeting rules
  if (targetABV !== null && targetABV !== undefined && String(targetABV) !== "") {
    const t = Number(targetABV);
    if (isFinite(t)) {
      if (mash.family === "RUM") {
        warnings.push("Target Wash ABV is disabled for Rum (does not auto-adjust L350/molasses).");
      } else if (mash.fermentables.sugar?.lb_per_gal !== undefined) {
        abvAdjustment = adjustGranulatedSugarForTargetABV({
          mash,
          fillGal: fill,
          targetABV: t,
          base
        });
      }
    }
  }

  // Expected totals (efficiency-adjusted)
  const totalGP_expected = expectedTotalGP(base);
  const og = 1 + totalGP_expected / fill / 1000;
  const washABV = (og - 1) * 131;
  const pureAlcoholGal = fill * washABV / 100;

  // Enzymes
  const enzymes = {};
  if (mash.enzymes) {
    const cornLb = base.fermentables.corn?.lb || 0;

    if (mash.enzymes.amylo_300 && cornLb > 0) {
      enzymes.amylo_300_ml = round(cornLb * ENZYMES.AMYLO_300.dose_ml_per_lb_corn, 1);
    }
    if (mash.enzymes.glucoamylase) {
      enzymes.glucoamylase_ml = round(base.totalGrainLb * ENZYMES.GLUCOAMYLASE.dose_ml_per_lb_grain, 1);
    }
  }

  // Yeast
  const yeast =
    mash.yeast_family === "RUM"
      ? { name: YEAST.RUM.name, grams: round(fill * YEAST.RUM.pitch_g_per_gal, 1) }
      : { name: YEAST.GRAIN.name, grams: round(fill * YEAST.GRAIN.pitch_g_per_gal, 1) };

  const nutrients_g = mash.nutrients_required ? round(fill * 1.0, 1) : 0;

  // Guardrail warning
  if (og > FERMENTATION.og_limits.SUGAR_ASSIST_MAX) warnings.push("OG exceeds clean fermentation limit");

  // Strip based on still charge (OFF-GRAIN 53 for strip planning)
  const washChargedGal = Math.min(fill, STILLS.OFF_GRAIN.max_charge_gal);

  return {
    engineVersion: ENGINE_VERSION,
    mashId,
    name: mash.name,
    family: mash.family,
    fillGal: round(fill, 2),
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

    stripping: calculateStrip({ washChargedGal, washABV }),

    abvAdjustment,
    warnings
  };
}
