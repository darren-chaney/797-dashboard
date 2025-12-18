/* ============================================================
   797 DISTILLERY — MASH ENGINE (LOCKED TO YOUR PROCESS)
   - Moonshine ABV target adjusts granulated sugar UP only
   - Rum ABV target disabled (never changes L350/molasses)
   - Stripping: FULL STRIP, NO CUTS, collect everything
   - Low wines estimated @ 40% ABV (matches your reality better)
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

function round(v, d = 2) {
  return Number(v.toFixed(d));
}

export const ENGINE_VERSION =
  "mash-engine v1.3.0 (PPG-fixed, ABV-safe, charge-based strip)";

/* =========================
   REAL-WORLD EFFICIENCY (planning)
   ========================= */
const EFF = {
  // Your “180°F water + soak” method is not 100% theoretical conversion.
  // This keeps the engine from thinking the mash is stronger than it will be.
  GRAIN_GRAVITY: 0.65,

  // Granulated sugar: planning efficiency tuned to YOUR ground truth.
  // Goal: 55 gal moonshine base (66/15/100) lands ~8% wash ABV.
  // (Prevents “textbook” ABV claims.)
  SUGAR_GRAVITY: 0.345,

  // Rum inputs are mostly fermentable, but molasses is not perfectly so
  RUM_GRAVITY: 0.90
};

/* =========================
   STRIP MODEL (your process)
   ========================= */
const STRIP = {
  STYLE: "FULL_STRIP_NO_CUTS",
  RECOVERY: 0.90,
  LOW_WINES_ABV: 0.40
};

// Allow 0.08 or 8 input for ABV field
function normalizeAbvPct(v){
  const n = Number(v);
  if (!isFinite(n)) return null;
  if (n > 0 && n < 1) return n * 100;
  return n;
}

/* =========================
   BASE SCALE (track GP buckets)
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

      const gp = lb * (GRAVITY_POINTS[gpKey] || 0); // points*gal

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

      // Convert gallons -> lb (8.34 lb/gal) then apply “PPG-ish” points
      const gp = gal * 8.34 * (GRAVITY_POINTS[key.toUpperCase()] || 0); // points*gal
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

  const abvIn = normalizeAbvPct(targetABV);
  const clampedABV = Math.min(Math.max(abvIn, MIN_ABV), MAX_ABV);

  // Base recipe sugar (hard minimum)
  const baseSugarLb = mash.fermentables.sugar.lb_per_gal * fillGal;

  // Target GP (EXPECTED) from ABV
  const targetOG = 1 + clampedABV / 131;
  const targetTotalGP_expected = (targetOG - 1) * 1000 * fillGal; // points*gal

  // Fixed expected GP = grain + rum buckets (no sugar)
  const grain_expected = base.gp_grain_theoretical * EFF.GRAIN_GRAVITY;
  const rum_expected   = base.gp_rum_theoretical   * EFF.RUM_GRAVITY;

  const fixedExpectedGP = grain_expected + rum_expected;

  // Required expected sugar GP
  const requiredSugarGP_expected = targetTotalGP_expected - fixedExpectedGP;

  // Convert expected sugar GP → theoretical sugar GP (undo planning efficiency)
  const requiredSugarGP_theoretical = requiredSugarGP_expected / EFF.SUGAR_GRAVITY;

  let requiredSugarLb =
    requiredSugarGP_theoretical <= 0
      ? 0
      : requiredSugarGP_theoretical / GRAVITY_POINTS.GRANULATED_SUGAR;

  // 🔒 HARD RULE: NEVER allow ABV targeting to reduce sugar for moonshine
  requiredSugarLb = Math.max(baseSugarLb, requiredSugarLb);

  base.fermentables.sugar.lb = round(requiredSugarLb, 1);
  base.gp_sugar_theoretical = requiredSugarLb * GRAVITY_POINTS.GRANULATED_SUGAR;

  return {
    clamped: (abvIn == null) ? true : (clampedABV !== abvIn),
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
    wash_charged_gal: washChargedGal,
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
  if (!mash) throw new Error("Unknown mash");

  const base = scaleBaseMash(mash, fillGal);

  let warnings = [];
  let abvAdjustment = null;

  // ABV targeting rules
  if (targetABV !== null && targetABV !== undefined && targetABV !== "") {
    if (mash.family === "RUM") {
      warnings.push(
        "Target Wash ABV is disabled for Rum (does not auto-adjust L350/molasses)."
      );
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
  const washABV = (og - 1) * 131;
  const pureAlcoholGal = fillGal * washABV / 100;

  // Enzymes
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

  const nutrients_g = mash.nutrients_required ? round(fillGal * 1.0, 1) : 0;

  // Warning only
  if (og > FERMENTATION.og_limits.SUGAR_ASSIST_MAX) {
    warnings.push("OG exceeds clean fermentation limit");
  }

  // Strip based on still charge (53 off-grain)
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

    stripping: calculateStrip({ washChargedGal, washABV }),

    abvAdjustment,
    warnings
  };
}
