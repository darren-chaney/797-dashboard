/* ============================================================
   797 DISTILLERY — MASH ENGINE (LOCKED TO YOUR PROCESS)
   ============================================================ */

import {
  GRAVITY_POINTS,
  ENZYMES,
  YEAST,
  STILLS,
  FERMENTATION
} from "./mash-rules.js";

export const ENGINE_VERSION = "mash-engine v3.2.2 (DEFS-LATE-BIND)";

function round(v, d = 2) {
  return Number(Number(v).toFixed(d));
}

/* =========================
   NORMALIZE DEFINITIONS
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
      out.fermentables[key] = { lb: round(lb, 1) };

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
      out.fermentables[key] = { gal: round(gal, 2) };

      const lb = gal * 8.34;
      out.gp_rum_theoretical +=
        lb * (GRAVITY_POINTS[key.toUpperCase()] || 0);
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
   STRIP
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

  const DEFS = window.MASH_DEFS;
  if (!DEFS || !DEFS.RECIPES) {
    throw new Error("Mash definitions not available yet");
  }

  const raw = DEFS.RECIPES[mashId];
  const mash = normalizeMash(raw);
  if (!mash) throw new Error("Unknown mashId: " + mashId);

  const fill = Number(fillGal);
  const base = scaleBaseMash(mash, fill);

  const totalGP = expectedTotalGP(base);
  const og = 1 + totalGP / fill / 1000;
  const washABV = (og - 1) * 131;

  const washChargedGal = Math.min(fill, STILLS.OFF_GRAIN.max_charge_gal);

  return {
    engineVersion: ENGINE_VERSION,
    mashId,
    name: mash.name,
    family: mash.family,
    fillGal: round(fill, 2),
    fermentOnGrain: mash.fermentOnGrain,
    fermentables: base.fermentables,
    totals: {
      og: round(og, 4),
      washABV_percent: round(washABV, 2)
    },
    stripping: calculateStrip({ washChargedGal, washABV }),
    warnings: []
  };
}
