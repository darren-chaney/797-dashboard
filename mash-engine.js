/* ============================================================
   797 DISTILLERY — MASH ENGINE
   Scaling, yield, ABV targeting, stripping estimates
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
   CORE SCALER
   ========================= */
function scaleBaseMash(mash, fillGal) {
  const out = {
    fermentables: {},
    totalGrainLb: 0,
    gravityPoints: 0
  };

  for (const key in mash.fermentables) {
    const f = mash.fermentables[key];

    if (f.lb_per_gal !== undefined) {
      const lb = f.lb_per_gal * fillGal;
      out.fermentables[key] = { lb: round(lb, 1), type: f.type || null };

      let gpKey = key.toUpperCase();
      if (gpKey === "SUGAR") gpKey = "GRANULATED_SUGAR";

      out.gravityPoints += lb * (GRAVITY_POINTS[gpKey] || 0);

      if (!["sugar"].includes(key)) {
        out.totalGrainLb += lb;
      }
    }

    if (f.gal_per_gal !== undefined) {
      const gal = f.gal_per_gal * fillGal;
      out.fermentables[key] = { gal: round(gal, 2), type: f.type || null };

      out.gravityPoints += gal * 8.34 * (GRAVITY_POINTS[key.toUpperCase()] || 0);
    }
  }

  return out;
}

/* =========================
   TARGET ABV ADJUSTMENT
   ========================= */
function adjustSugarForTargetABV({
  mash,
  fillGal,
  targetABV,
  base
}) {
  const MIN_ABV = 6.0;
  const MAX_ABV = 11.5;

  const clampedABV = Math.min(Math.max(targetABV, MIN_ABV), MAX_ABV);

  const targetOG = 1 + clampedABV / 131;
  const targetGP = (targetOG - 1) * 1000 * fillGal;

  const grainGP = base.gravityPoints -
    (base.fermentables.sugar?.lb || 0) * GRAVITY_POINTS.GRANULATED_SUGAR;

  const neededSugarGP = targetGP - grainGP;
  const neededSugarLb = neededSugarGP / GRAVITY_POINTS.GRANULATED_SUGAR;

  base.fermentables.sugar.lb = round(neededSugarLb, 1);
  base.gravityPoints = grainGP + neededSugarLb * GRAVITY_POINTS.GRANULATED_SUGAR;

  return {
    clamped: clampedABV !== targetABV,
    targetABV: clampedABV
  };
}

/* =========================
   STRIPPING RUN ESTIMATE
   ========================= */
function calculateStripping({ fillGal, washABV }) {
  const recovery = 0.90;
  const lowWinesABV = 0.35;

  const pureAlcohol = fillGal * (washABV / 100);
  const recovered = pureAlcohol * recovery;
  const lowWinesGal = recovered / lowWinesABV;

  return {
    recovery_percent: 90,
    low_wines_abv: 35,
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

  let abvAdjust = null;
  if (targetABV && mash.fermentables.sugar) {
    abvAdjust = adjustSugarForTargetABV({
      mash,
      fillGal,
      targetABV,
      base
    });
  }

  const og = 1 + base.gravityPoints / fillGal / 1000;
  const washABV = (og - 1) * 131;
  const pureAlcohol = fillGal * washABV / 100;

  const enzymes = {};
  if (mash.enzymes) {
    if (mash.enzymes.amylo_300 && base.fermentables.corn) {
      enzymes.amylo_300_ml = round(
        base.fermentables.corn.lb *
          ENZYMES.AMYLO_300.dose_ml_per_lb_corn,
        1
      );
    }

    if (mash.enzymes.glucoamylase) {
      enzymes.glucoamylase_ml = round(
        base.totalGrainLb *
          ENZYMES.GLUCOAMYLASE.dose_ml_per_lb_grain,
        1
      );
    }
  }

  const yeast =
    mash.yeast_family === "RUM"
      ? {
          name: YEAST.RUM.name,
          grams: round(fillGal * YEAST.RUM.pitch_g_per_gal, 1)
        }
      : {
          name: YEAST.GRAIN.name,
          grams: round(fillGal * YEAST.GRAIN.pitch_g_per_gal, 1)
        };

  return {
    mashId,
    name: mash.name,
    fillGal,
    fermentables: base.fermentables,
    enzymes,
    yeast,
    nutrients_g: mash.nutrients_required ? round(fillGal, 1) : 0,

    totals: {
      og: round(og, 4),
      washABV_percent: round(washABV, 2),
      pureAlcohol_gal: round(pureAlcohol, 2)
    },

    stripping: calculateStripping({ fillGal, washABV }),

    abvAdjustment: abvAdjust
  };
}
