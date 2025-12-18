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

export const ENGINE_VERSION = "mash-engine v3.2.1 (GLOBAL-DEFS FIX)";

function round(v, d = 2) {
  return Number(Number(v).toFixed(d));
}

/* =========================
   LOAD GLOBAL DEFINITIONS (RULE)
   ========================= */
const DEFS = window.MASH_DEFS;
if (!DEFS || !DEFS.RECIPES) {
  throw new Error("MASH_DEFS.RECIPES not found — mash-definitions.js not loaded");
}

/* =========================
   NORMALIZE DEFINITIONS
   (match yesterday’s engine contract)
   ========================= */
function normalizeMash(def){
  if (!def) return null;

  const fermentables = {};

  if (Array.isArray(def.grains)) {
    def.grains.forEach(g => {
      fermentables[g.key] = {
        lb_per_gal: g.lb / def.baseVolumeGal,
        type: "grain"
      };
    });
  }

  if (def.sugarLb) {
    fermentables.sugar = {
      lb_per_gal: def.sugarLb / def.baseVolumeGal,
      type: "sugar"
    };
  }

  if (def.l350Gal) {
    fermentables.l350 = {
      gal_per_gal: def.l350Gal / def.baseVolumeGal,
      type: "rum"
    };
  }

  if (def.molassesGal) {
    fermentables.molasses = {
      gal_per_gal: def.molassesGal / def.baseVolumeGal,
      type: "rum"
    };
  }

  const isRum = def.kind === "rum";

  return {
    id: def.id,
    name: def.label,
    family: isRum ? "RUM" : "MOONSHINE",
    fermentables,
    yeast_family: isRum ? "RUM" : "GRAIN",
    fermentOnGrain: !isRum,
    enzymes: !isRum
      ? { amylo_300:true, glucoamylase:true }
      : null,
    nutrients_required: !isRum
  };
}

/* =========================
   REAL-WORLD EFFICIENCY
   ========================= */
const EFF = {
  GRAIN_GRAVITY: 0.65,
  SUGAR_GRAVITY: 1.00,
  RUM_GRAVITY: 0.90
};

/* =========================
   STRIP MODEL (calibrated)
   ========================= */
const STRIP = {
  STYLE: "FULL_STRIP_NO_CUTS",
  RECOVERY: 0.68,
  LOW_WINES_ABV: 0.35
};

/* =========================
   BASE SCALE
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

    if (f.lb_per_gal !== undefined) {
      const lb = f.lb_per_gal * fillGal;
      out.fermentables[key] = { lb: round(lb, 1), type: f.type || null };

      let gpKey = key.toUpperCase();
      if (gpKey === "SUGAR") gpKey = "GRANULATED_SUGAR";

      const gp = lb * (GRAVITY_POINTS[gpKey] || 0);

      if (key === "sugar") out.gp_sugar_theoretical += gp;
      else {
        out.gp_grain_theoretical += gp;
        out.totalGrainLb += lb;
      }
    }

    if (f.gal_per_gal !== undefined) {
      const gal = f.gal_per_gal * fillGal;
      out.fermentables[key] = { gal: round(gal, 2), type: f.type || null };

      const lb = gal * 8.34;
      const gp = lb * (GRAVITY_POINTS[key.toUpperCase()] || 0);
      out.gp_rum_theoretical += gp;
    }
  }

  return out;
}

function expectedTotalGP(base) {
  return (
    base.gp_grain_theoretical * EFF.GRAIN_GRAVITY +
    base.gp_sugar_theoretical * EFF.SUGAR_GRAVITY +
    base.gp_rum_theoretical   * EFF.RUM_GRAVITY
  );
}

/* =========================
   ABV TARGETING (MOONSHINE)
   ========================= */
function adjustGranulatedSugarForTargetABV({ mash, fillGal, targetABV, base }) {
  const MIN_ABV = 6.0;
  const MAX_ABV = 11.5;
  const clampedABV = Math.min(Math.max(targetABV, MIN_ABV), MAX_ABV);

  const baseSugarLb =
    mash.fermentables.sugar?.lb_per_gal
      ? mash.fermentables.sugar.lb_per_gal * fillGal
      : 0;

  const targetOG = 1 + clampedABV / 131;
  const targetTotalGP_expected = (targetOG - 1) * 1000 * fillGal;

  const fixedExpectedGP =
    base.gp_grain_theoretical * EFF.GRAIN_GRAVITY +
    base.gp_rum_theoretical   * EFF.RUM_GRAVITY;

  const requiredSugarGP_expected = targetTotalGP_expected - fixedExpectedGP;
  const requiredSugarGP_theoretical =
    requiredSugarGP_expected / EFF.SUGAR_GRAVITY;

  let requiredSugarLb =
    requiredSugarGP_theoretical <= 0
      ? 0
      : requiredSugarGP_theoretical / GRAVITY_POINTS.GRANULATED_SUGAR;

  requiredSugarLb = Math.max(baseSugarLb, requiredSugarLb);

  base.fermentables.sugar.lb = round(requiredSugarLb, 1);
  base.gp_sugar_theoretical =
    requiredSugarLb * GRAVITY_POINTS.GRANULATED_SUGAR;

  return {
    clamped: clampedABV !== targetABV,
    targetABV: clampedABV
  };
}

/* =========================
   STRIP CALC
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
  const raw = DEFS.RECIPES[mashId];
  const mash = normalizeMash(raw);
  if (!mash) throw new Error("Unknown mashId: " + mashId);

  const fill = Number(fillGal);
  if (!isFinite(fill) || fill <= 0) throw new Error("Invalid fillGal");

  const base = scaleBaseMash(mash, fill);

  let warnings = [];
  let abvAdjustment = null;

  if (targetABV !== null && targetABV !== undefined && String(targetABV) !== "") {
    const t = Number(targetABV);
    if (isFinite(t)) {
      if (mash.family === "RUM") {
        warnings.push("Target Wash ABV is disabled for Rum.");
      } else if (mash.fermentables.sugar) {
        abvAdjustment = adjustGranulatedSugarForTargetABV({
          mash,
          fillGal: fill,
          targetABV: t,
          base
        });
      }
    }
  }

  const totalGP_expected = expectedTotalGP(base);
  const og = 1 + totalGP_expected / fill / 1000;
  const washABV = (og - 1) * 131;
  const pureAlcoholGal = fill * washABV / 100;

  const enzymes = {};
  if (mash.enzymes) {
    const cornLb = base.fermentables.corn?.lb || 0;
    if (cornLb > 0) {
      enzymes.amylo_300_ml =
        round(cornLb * ENZYMES.AMYLO_300.dose_ml_per_lb_corn, 1);
      enzymes.glucoamylase_ml =
        round(base.totalGrainLb * ENZYMES.GLUCOAMYLASE.dose_ml_per_lb_grain, 1);
    }
  }

  const yeast =
    mash.yeast_family === "RUM"
      ? { name: YEAST.RUM.name, grams: round(fill * YEAST.RUM.pitch_g_per_gal, 1) }
      : { name: YEAST.GRAIN.name, grams: round(fill * YEAST.GRAIN.pitch_g_per_gal, 1) };

  const nutrients_g = mash.nutrients_required ? round(fill * 1.0, 1) : 0;

  if (og > FERMENTATION.og_limits.SUGAR_ASSIST_MAX) {
    warnings.push("OG exceeds clean fermentation limit");
  }

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
