/* ============================================================
   797 DISTILLERY — MASH ENGINE (DIAGNOSTIC)
   PURPOSE: Verify Target ABV is actually reaching the engine
   ============================================================ */

export const ENGINE_VERSION = "mash-engine v3.3.2 (ABV-DIAG)";

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
   PUBLIC API (DIAGNOSTIC)
   ========================= */
export function scaleMash(
  mashId,
  fillGal,
  targetABV = null,
  stillId = "OFF_GRAIN"
) {

  // 🔍 DIAGNOSTIC — THIS IS THE TRUTH SOURCE
  console.log(
    "[ABV DEBUG] scaleMash called with:",
    "targetABV =", targetABV,
    "| typeof =", typeof targetABV
  );

  const DEFS = window.MASH_DEFS;
  if (!DEFS) throw new Error("MASH_DEFS not loaded");

  const mash = normalizeMash(DEFS.RECIPES[mashId]);
  if (!mash) throw new Error("Unknown mash");

  const fill = Number(fillGal);
  const base = scaleBaseMash(mash, fill);

  // NOTE: NO ABV LOGIC YET — THIS IS A PURE TRACE BUILD

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
    stripping: {
      wash_charged_gal: washChargedGal
    }
  };
}
