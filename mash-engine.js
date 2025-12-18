/* ============================================================
   797 DISTILLERY — MASH ENGINE (LOCKED TO YOUR PROCESS)
   - Target Wash ABV adjusts GRANULATED SUGAR UP only (never down)
   - Rum ignores Target Wash ABV (does not auto-adjust L350/molasses)
   - Stripping uses SELECTED STILL charge size
   ============================================================ */

export const ENGINE_VERSION = "mash-engine v3.3.0 (ABV->SUGAR RESTORED + STILL)";

function round(v, d = 2) {
  return Number(Number(v).toFixed(d));
}

/* =========================
   LOAD GLOBAL RULES
   ========================= */
const RULES = window.MASH_RULES;
if (!RULES) throw new Error("MASH_RULES not loaded");

/* =========================
   EFFICIENCY + STRIP
   ========================= */
const EFF = {
  GRAIN_GRAVITY: 0.65,
  SUGAR_GRAVITY: 1.00,
  RUM_GRAVITY: 0.90
};

const STRIP = {
  STYLE: "FULL_STRIP_NO_CUTS",
  RECOVERY: 0.68,
  LOW_WINES_ABV: 0.35
};

/* =========================
   NORMALIZE DEFINITIONS (from mash-definitions.js format)
   ========================= */
function normalizeMash(def){
  if (!def) return null;

  const fermentables = {};

  // grains[] are absolute lbs at baseVolumeGal
  if (Array.isArray(def.grains)) {
    def.grains.forEach(g => {
      fermentables[g.key] = {
        lb_per_gal: g.lb / def.baseVolumeGal,
        type: "grain"
      };
    });
  }

  // granulated sugar absolute lbs at baseVolumeGal
  if (def.sugarLb) {
    fermentables.sugar = {
      lb_per_gal: def.sugarLb / def.baseVolumeGal,
      type: "sugar"
    };
  }

  // rum inputs are gallons at baseVolumeGal
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
    fermentOnGrain: !isRum
  };
}

/* =========================
   BASE SCALE (track GP buckets)
   - gp_*_theoretical are points-gallons (lb * PPG)
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

    // lb/gal fermentables (grain + granulated sugar)
    if (f.lb_per_gal !== undefined) {
      const lb = f.lb_per_gal * fillGal;
      out.fermentables[key] = { lb: round(lb, 1), type: f.type || null };

      let gpKey = key.toUpperCase();
      if (gpKey === "SUGAR") gpKey = "GRANULATED_SUGAR";

      const gp = lb * (RULES.GRAVITY_POINTS[gpKey] || 0);

      if (key === "sugar") out.gp_sugar_theoretical += gp;
      else {
        out.gp_grain_theoretical += gp;
        out.totalGrainLb += lb;
      }
    }

    // gal/gal rum fermentables (L350/molasses)
    if (f.gal_per_gal !== undefined) {
      const gal = f.gal_per_gal * fillGal;
      out.fermentables[key] = { gal: round(gal, 2), type: f.type || null };

      // Convert gallons -> pounds (8.34 lb/gal), then apply PPG
      const lb = gal * 8.34;
      const gp = lb * (RULES.GRAVITY_POINTS[key.toUpperCase()] || 0);
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
  const baseSugarLb =
    mash.fermentables.sugar && mash.fermentables.sugar.lb_per_gal !== undefined
      ? mash.fermentables.sugar.lb_per_gal * fillGal
      : 0;

  // Target OG from ABV (planning rule of thumb)
  const targetOG = 1 + (clampedABV / 131);

  // Total expected GP required for that OG
  const targetTotalGP_expected = (targetOG - 1) * 1000 * fillGal;

  // Fixed expected GP from grain + rum (no sugar)
  const grain_expected = base.gp_grain_theoretical * EFF.GRAIN_GRAVITY;
  const rum_expected   = base.gp_rum_theoretical   * EFF.RUM_GRAVITY;
  const fixedExpectedGP = grain_expected + rum_expected;

  // Expected GP needed from sugar
  const requiredSugarGP_expected = targetTotalGP_expected - fixedExpectedGP;

  // Convert expected sugar GP -> theoretical sugar GP
  const requiredSugarGP_theoretical = requiredSugarGP_expected / EFF.SUGAR_GRAVITY;

  let requiredSugarLb =
    requiredSugarGP_theoretical <= 0
      ? 0
      : requiredSugarGP_theoretical / (RULES.GRAVITY_POINTS.GRANULATED_SUGAR || 46);

  // HARD RULE: never reduce sugar below recipe baseline
  requiredSugarLb = Math.max(baseSugarLb, requiredSugarLb);

  base.fermentables.sugar = base.fermentables.sugar || {};
  base.fermentables.sugar.lb = round(requiredSugarLb, 1);
  base.fermentables.sugar.type = "sugar";

  base.gp_sugar_theoretical = requiredSugarLb * (RULES.GRAVITY_POINTS.GRANULATED_SUGAR || 46);

  return {
    clamped: clampedABV !== targetABV,
    targetABV: clampedABV,
    baseSugarLb: round(baseSugarLb, 1),
    finalSugarLb: round(requiredSugarLb, 1)
  };
}

/* =========================
   STRIP (full strip, no cuts)
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
export function scaleMash(mashId, fillGal, targetABV = null, stillId = "OFF_GRAIN") {

  const DEFS = window.MASH_DEFS;
  if (!DEFS || !DEFS.RECIPES) throw new Error("Mash definitions not available");

  const raw = DEFS.RECIPES[mashId];
  const mash = normalizeMash(raw);
  if (!mash) throw new Error("Unknown mashId: " + mashId);

  const fill = Number(fillGal);
  if (!isFinite(fill) || fill <= 0) throw new Error("Invalid fillGal");

  const base = scaleBaseMash(mash, fill);

  let warnings = [];
  let abvAdjustment = null;

  // Apply ABV->sugar adjustment for non-rum mashes that have granulated sugar
  if (targetABV !== null && targetABV !== undefined && String(targetABV).trim() !== "") {
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

  // Totals after possible sugar adjustment
  const totalGP_expected = expectedTotalGP(base);
  const og = 1 + totalGP_expected / fill / 1000;
  const washABV = (og - 1) * 131;

  // Guardrail warning
  if (og > RULES.FERMENTATION.og_limits.SUGAR_ASSIST_MAX) {
    warnings.push("OG exceeds clean fermentation limit");
  }

  // Still resolution (selected still drives charge size)
  const still =
    DEFS.STILLS && DEFS.STILLS[stillId]
      ? DEFS.STILLS[stillId]
      : RULES.STILLS.OFF_GRAIN;

  const washChargedGal = Math.min(fill, still.max_charge_gal);

  return {
    engineVersion: ENGINE_VERSION,

    mashId,
    name: mash.name,
    family: mash.family,
    fillGal: round(fill, 2),

    stillId,
    stillName: still.name,

    fermentOnGrain: mash.fermentOnGrain,
    fermentables: base.fermentables,

    totals: {
      og: round(og, 4),
      washABV_percent: round(washABV, 2)
    },

    stripping: calculateStrip({ washChargedGal, washABV }),

    abvAdjustment,
    warnings
  };
}
