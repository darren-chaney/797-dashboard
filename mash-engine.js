/* ============================================================
   797 DISTILLERY — MASH ENGINE
   - Target Wash ABV adjusts GRANULATED SUGAR UP only (never down)
   - Rum ignores Target Wash ABV (does not auto-adjust L350/molasses)
   - Still selection controls strip charge size
   ============================================================ */

export const ENGINE_VERSION = "mash-engine v3.3.3 (ABV->SUGAR RESTORED + STILL)";

function round(v, d = 2) {
  return Number(Number(v).toFixed(d));
}

const RULES = window.MASH_RULES;
if (!RULES) throw new Error("MASH_RULES not loaded");

/* =========================
   Planning efficiencies (your process)
   ========================= */
const EFF = {
  GRAIN_GRAVITY: 0.65,
  SUGAR_GRAVITY: 1.00,
  RUM_GRAVITY: 0.90
};

/* =========================
   Strip model (your process)
   ========================= */
const STRIP = {
  STYLE: "FULL_STRIP_NO_CUTS",
  RECOVERY: 0.68,
  LOW_WINES_ABV: 0.35
};

/* =========================
   NORMALIZE mash-definitions.js format -> engine format
   ========================= */
function normalizeMash(def){
  if (!def) return null;

  const fermentables = {};
  const isRum = def.kind === "rum";

  if (Array.isArray(def.grains)) {
    def.grains.forEach(g => {
      fermentables[g.key] = { lb_per_gal: g.lb / def.baseVolumeGal };
    });
  }

  if (def.sugarLb) {
    fermentables.sugar = { lb_per_gal: def.sugarLb / def.baseVolumeGal };
  }

  if (def.l350Gal) {
    fermentables.l350 = { gal_per_gal: def.l350Gal / def.baseVolumeGal };
  }

  if (def.molassesGal) {
    fermentables.molasses = { gal_per_gal: def.molassesGal / def.baseVolumeGal };
  }

  return {
    id: def.id,
    name: def.label,
    family: isRum ? "RUM" : "MOONSHINE",
    fermentables,
    fermentOnGrain: !isRum
  };
}

/* =========================
   Scale base mash into real amounts + theoretical GP buckets
   GP here = points-gallons (lb * PPG)
   ========================= */
function scaleBaseMash(mash, fillGal) {
  const out = {
    fermentables: {},
    gp_grain_theoretical: 0,
    gp_sugar_theoretical: 0,
    gp_rum_theoretical: 0
  };

  for (const key in mash.fermentables) {
    const f = mash.fermentables[key];

    // grain + granulated sugar
    if (f.lb_per_gal !== undefined) {
      const lb = f.lb_per_gal * fillGal;
      out.fermentables[key] = { lb: round(lb, 1) };

      const gpKey = (key === "sugar") ? "GRANULATED_SUGAR" : key.toUpperCase();
      const gp = lb * (RULES.GRAVITY_POINTS[gpKey] || 0);

      if (key === "sugar") out.gp_sugar_theoretical += gp;
      else out.gp_grain_theoretical += gp;
    }

    // rum inputs (gallons -> pounds -> GP)
    if (f.gal_per_gal !== undefined) {
      const gal = f.gal_per_gal * fillGal;
      out.fermentables[key] = { gal: round(gal, 2) };

      const lb = gal * 8.34;
      out.gp_rum_theoretical += lb * (RULES.GRAVITY_POINTS[key.toUpperCase()] || 0);
    }
  }

  return out;
}

function expectedTotalGP(base){
  const grain = base.gp_grain_theoretical * EFF.GRAIN_GRAVITY;
  const sugar = base.gp_sugar_theoretical * EFF.SUGAR_GRAVITY;
  const rum   = base.gp_rum_theoretical   * EFF.RUM_GRAVITY;
  return grain + sugar + rum;
}

/* =========================
   ABV targeting (Moonshine only)
   - Adjusts granulated sugar UP only
   - Never reduces below baseline sugar for this fill
   ========================= */
function adjustSugarForTargetABV({ base, fillGal, targetABV, baselineSugarLb }) {
  const MIN_ABV = 6.0;
  const MAX_ABV = 11.5;
  const t = Number(targetABV);
  const clampedABV = Math.min(Math.max(t, MIN_ABV), MAX_ABV);

  // target OG approximation
  const targetOG = 1 + (clampedABV / 131);

  // total expected GP needed
  const targetTotalGP_expected = (targetOG - 1) * 1000 * fillGal;

  // fixed expected GP from grain + rum (no sugar)
  const grain_expected = base.gp_grain_theoretical * EFF.GRAIN_GRAVITY;
  const rum_expected   = base.gp_rum_theoretical   * EFF.RUM_GRAVITY;
  const fixedExpectedGP = grain_expected + rum_expected;

  // expected GP needed from sugar
  const requiredSugarGP_expected = targetTotalGP_expected - fixedExpectedGP;

  // convert expected -> theoretical (sugar eff is 1.0 but keep formula explicit)
  const requiredSugarGP_theoretical = requiredSugarGP_expected / EFF.SUGAR_GRAVITY;

  let requiredSugarLb =
    requiredSugarGP_theoretical <= 0
      ? 0
      : requiredSugarGP_theoretical / (RULES.GRAVITY_POINTS.GRANULATED_SUGAR || 46);

  // HARD RULE: never reduce below baseline
  requiredSugarLb = Math.max(baselineSugarLb, requiredSugarLb);

  // write adjusted sugar back into fermentables + GP bucket
  base.fermentables.sugar.lb = round(requiredSugarLb, 1);
  base.gp_sugar_theoretical = requiredSugarLb * (RULES.GRAVITY_POINTS.GRANULATED_SUGAR || 46);

  return {
    clamped: clampedABV !== t,
    targetABV: round(clampedABV, 2),
    baselineSugarLb: round(baselineSugarLb, 1),
    finalSugarLb: round(requiredSugarLb, 1)
  };
}

/* =========================
   Stripping (still-based charge)
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
  if (!DEFS || !DEFS.RECIPES) throw new Error("MASH_DEFS not loaded");

  const mash = normalizeMash(DEFS.RECIPES[mashId]);
  if (!mash) throw new Error("Unknown mashId: " + mashId);

  const fill = Number(fillGal);
  if (!isFinite(fill) || fill <= 0) throw new Error("Invalid fillGal");

  // scale baseline
  const base = scaleBaseMash(mash, fill);

  // baseline sugar at this fill (hard minimum)
  const baselineSugarLb = base.fermentables.sugar?.lb || 0;

  let warnings = [];
  let abvAdjustment = null;

  // Apply ABV targeting (moonshine only)
  if (targetABV !== null && String(targetABV).trim() !== "") {
    if (mash.family === "RUM") {
      warnings.push("Target Wash ABV is disabled for Rum (does not auto-adjust L350/molasses).");
    } else if (base.fermentables.sugar) {
      abvAdjustment = adjustSugarForTargetABV({
        base,
        fillGal: fill,
        targetABV,
        baselineSugarLb
      });
    }
  }

  // totals AFTER adjustment
  const totalGP_expected = expectedTotalGP(base);
  const og = 1 + totalGP_expected / fill / 1000;
  const washABV = (og - 1) * 131;

  if (og > RULES.FERMENTATION.og_limits.SUGAR_ASSIST_MAX) {
    warnings.push("OG exceeds clean fermentation limit");
  }

  // still resolution
  const still =
    (DEFS.STILLS && DEFS.STILLS[stillId]) ? DEFS.STILLS[stillId] : RULES.STILLS.OFF_GRAIN;

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
