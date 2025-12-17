/* ============================================================
   797 DISTILLERY — MASH TOP-UP ENGINE
   Additive mash logic for partial draws
   ============================================================ */

import { ENZYMES } from "./mash-rules.js";
import { scaleMash } from "./mash-engine.js";

/* =========================
   UTILITY
   ========================= */
function round(value, decimals = 2) {
  return Number(value.toFixed(decimals));
}

/* ============================================================
   BUILD TOP-UP MASH
   ============================================================ */
/*
  Inputs:
    - mashId            : ID from mash-definitions.js
    - targetFillGal     : desired fermenter fill (e.g. 235)
    - currentVolumeGal  : volume remaining after pull (e.g. 85)
    - estimatedABV      : current wash ABV (decimal or % ok)

  Output:
    - topUp mash bill (ingredients + enzymes)
    - alcohol accounting (carryover vs new)
*/
export function buildTopUpMash({
  mashId,
  targetFillGal,
  currentVolumeGal,
  estimatedABV
}) {
  if (currentVolumeGal >= targetFillGal) {
    throw new Error("Current volume already meets or exceeds target fill");
  }

  const topUpGal = round(targetFillGal - currentVolumeGal, 1);

  /* -------- Scale additive mash ONLY -------- */
  const topUpMash = scaleMash(mashId, topUpGal);

  /* -------- Enzyme correction (new grain only) -------- */
  // scaleMash already calculates enzymes based on its own grain,
  // which in a top-up context == NEW grain. No changes needed.
  const enzymes = {
    amylo_300_ml: topUpMash.enzymes?.amylo_300_ml || 0,
    glucoamylase_ml: topUpMash.enzymes?.glucoamylase_ml || 0
  };

  /* -------- Alcohol Accounting -------- */
  const abvDecimal =
    estimatedABV > 1 ? estimatedABV / 100 : estimatedABV;

  const carryoverAlcoholGal = round(
    currentVolumeGal * abvDecimal,
    2
  );

  const newAlcoholGal = round(
    topUpMash.totals.pureAlcohol_gal,
    2
  );

  const projectedTotalAlcoholGal = round(
    carryoverAlcoholGal + newAlcoholGal,
    2
  );

  /* -------- Output -------- */
  return {
    context: {
      mashId,
      targetFillGal,
      currentVolumeGal,
      topUpGal
    },

    topUpMash: {
      fermentables: topUpMash.fermentables,
      enzymes,
      yeast: {
        reused: true,
        added: false
      },
      nutrients_g: topUpMash.nutrients_g
    },

    alcoholAccounting: {
      carryover_alcohol_gal: carryoverAlcoholGal,
      new_alcohol_gal: newAlcoholGal,
      projected_total_alcohol_gal: projectedTotalAlcoholGal
    },

    warnings: topUpMash.warnings || []
  };
}

/* =========================
   END OF TOP-UP ENGINE
   ========================= */

