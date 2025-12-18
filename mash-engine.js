/* ============================================================
   797 DISTILLERY — MASH ENGINE
   ABV target ADJUSTS SUGAR UP (never down)
   ============================================================ */

export const ENGINE_VERSION = "mash-engine v3.3.1 (ABV-SUGAR-FIXED)";

function round(v, d = 2) {
  return Number(Number(v).toFixed(d));
}

const RULES = window.MASH_RULES;
if (!RULES) throw new Error("MASH_RULES not loaded");

/* =========================
   NORMALIZE DEFINITIONS
   ========================= */
function normalizeMash(def){
  if (!def) return null;

  const fermentables = {};
  const isRum = def.kind === "rum";

  if (Array.isArray(def.grains)) {
    def.grains.forEach(g => {
      fermentables[g.key] = {
        lb_per_gal: g.lb / def.baseVolumeGal
      };
    });
  }

  if (def.sugarLb) {
    fermentables.sugar = {
      lb_per_gal: def.sugarLb / def.baseVolumeGal
    };
  }

  if (def.l350Gal) {
    fermentables.l350 = {
      gal_per_gal: def.l350Gal / def.baseVolumeGal
    };
  }

  if (def.molassesGal) {
    fermentables.molasses = {
      gal_per_gal: def.molassesGal / def.baseVolumeGal
    };
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
   BASE SCALE
   ========================= */
function scaleBaseMash(mash, fillGal) {
  const out = {
    fermentables: {},
    gp_grain: 0,
    gp_sugar: 0,
    gp_rum: 0
  };

  for (const key in mash.fermentables) {
    const f = mash.fermentables[key];

    if (f.lb_per_gal !== undefined) {
      const lb = f.lb_per_gal * fillGal;
      out.fermentables[key] = { lb: round(lb, 1) };

      const gpKey = key === "sugar" ? "GRANULATED_SUGAR" : key.toUpperCase();
      const gp = lb * (RULES.GRAVITY_POINTS[gpKey] || 0);

      if (key === "sugar") out.gp_sugar += gp;
      else out.gp_grain += gp;
    }

    if (f.gal_per_gal !== undefined) {
      const gal = f.gal_per_gal * fillGal;
      out.fermentables[key] = { gal: round(gal, 2) };

      const lb = gal * 8.34;
      out.gp_rum += lb * (RULES.GRAVITY_POINTS[key.toUpperCase()] || 0);
    }
  }

  return out;
}

/* =========================
   ABV → SUGAR ADJUST
   ========================= */
function adjustSugarForABV(base, fillGal, targetABV, baselineSugarLb){
  const targetOG = 1 + targetABV / 131;
  const targetGP = (targetOG - 1) * 1000 * fillGal;

  const fixedGP =
    base.gp_grain * 0.65 +
    base.gp_rum   * 0.90;

  const neededSugarGP = Math.max(0, targetGP - fixedGP);
  const neededSugarLb = neededSugarGP / RULES.GRAVITY_POINTS.GRANULATED_SUGAR;

  const finalSugarLb = Math.max(baselineSugarLb, neededSugarLb);

  base.fermentables.sugar.lb = round(finalSugarLb, 1);
  base.gp_sugar = finalSugarLb * RULES.GRAVITY_POINTS.GRANULATED_SUGAR;

  return {
    baselineSugarLb: round(baselineSugarLb, 1),
    finalSugarLb: round(finalSugarLb, 1)
  };
}

/* =========================
   PUBLIC API
   ========================= */
export function scaleMash(mashId, fillGal, targetABV = null, stillId = "OFF_GRAIN") {

  const DEFS = window.MASH_DEFS;
  if (!DEFS) throw new Error("MASH_DEFS not loaded");

  const mash = normalizeMash(DEFS.RECIPES[mashId]);
  if (!mash) throw new Error("Unknown mash");

  const fill = Number(fillGal);
  const base = scaleBaseMash(mash, fill);

  const baselineSugarLb =
    base.fermentables.sugar?.lb || 0;

  let abvAdjustment = null;

  if (
    mash.family !== "RUM" &&
    targetABV &&
    base.fermentables.sugar
  ) {
    abvAdjustment = adjustSugarForABV(
      base,
      fill,
      Number(targetABV),
      baselineSugarLb
    );
  }

  const totalGP =
    base.gp_grain * 0.65 +
    base.gp_sugar * 1.0 +
    base.gp_rum   * 0.90;

  const og = 1 + totalGP / fill / 1000;
  const washABV = (og - 1) * 131;

  const still = DEFS.STILLS[stillId] || RULES.STILLS.OFF_GRAIN;
  const washChargedGal = Math.min(fill, still.max_charge_gal);

  return {
    engineVersion: ENGINE_VERSION,
    mashId,
    name: mash.name,
    fillGal: round(fill, 2),

    fermentables: base.fermentables,

    totals: {
      og: round(og, 4),
      washABV_percent: round(washABV, 2)
    },

    abvAdjustment,
    stripping: {
      wash_charged_gal: washChargedGal
    }
  };
}
