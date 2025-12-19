/* ============================================================
   797 DISTILLERY — MASH ENGINE
   Step 3: Restore yeast + nutrients (scaled by fill volume)
   ============================================================ */

export const ENGINE_VERSION = "mash-engine v3.5.0 (YEAST+NUTRIENTS)";

function round(v, d = 2) {
  return Number(Number(v).toFixed(d));
}

/* =========================
   REQUIRED GLOBALS
   ========================= */
const RULES = window.MASH_RULES;
if (!RULES) throw new Error("MASH_RULES not loaded");

const DEFS = window.MASH_DEFS;
if (!DEFS || !DEFS.RECIPES) {
  throw new Error("MASH_DEFS not loaded");
}

/* =========================
   Process efficiencies
   ========================= */
const EFF = {
  GRAIN: 0.65,
  SUGAR: 1.00,
  RUM: 0.90
};

/* =========================
   Normalize mash definition
   ========================= */
function normalizeMash(def) {
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
   Scale base mash
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

      const gpKey = key === "sugar"
        ? "GRANULATED_SUGAR"
        : key.toUpperCase();

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
   Expected gravity
   ========================= */
function expectedTotalGP(base) {
  return (
    base.gp_grain * EFF.GRAIN +
    base.gp_sugar * EFF.SUGAR +
    base.gp_rum * EFF.RUM
  );
}

/* =========================
   ABV → sugar logic
   ========================= */
function adjustSugarForTargetABV({
  base,
  fillGal,
  targetABV,
  baselineSugarLb,
  mode
}) {
  const targetOG = 1 + (targetABV / 131);
  const targetGP = (targetOG - 1) * 1000 * fillGal;

  const fixedGP =
    base.gp_grain * EFF.GRAIN +
    base.gp_rum * EFF.RUM;

  const neededSugarGP = targetGP - fixedGP;
  const neededSugarLb =
    neededSugarGP / (RULES.GRAVITY_POINTS.GRANULATED_SUGAR || 46);

  let finalSugarLb = neededSugarLb;

  if (mode === "production") {
    finalSugarLb = Math.max(baselineSugarLb, neededSugarLb);
  }

  base.fermentables.sugar.lb = round(finalSugarLb, 1);
  base.gp_sugar =
    finalSugarLb * (RULES.GRAVITY_POINTS.GRANULATED_SUGAR || 46);

  return {
    baselineSugarLb: round(baselineSugarLb, 1),
    finalSugarLb: round(finalSugarLb, 1),
    mode
  };
}

/* =========================
   PUBLIC API
   ========================= */
export function scaleMash(
  mashId,
  fillGal,
  targetABV = null,
  mode = "production"
) {
  const mashDef = DEFS.RECIPES[mashId];
  if (!mashDef) throw new Error("Unknown mashId");

  const mash = normalizeMash(mashDef);
  const fill = Number(fillGal);

  const base = scaleBaseMash(mash, fill);

  const baselineSugarLb =
    base.fermentables.sugar?.lb || 0;

  let abvAdjustment = null;

  if (
    targetABV !== null &&
    mash.family !== "RUM" &&
    base.fermentables.sugar
  ) {
    abvAdjustment = adjustSugarForTargetABV({
      base,
      fillGal: fill,
      targetABV,
      baselineSugarLb,
      mode
    });
  }

  const totalGP = expectedTotalGP(base);
  const og = 1 + totalGP / fill / 1000;
  const washABV = (og - 1) * 131;

  /* =========================
     Yeast (scaled by fill)
     ========================= */
  const yeastRule =
    mash.family === "RUM"
      ? RULES.YEAST.RUM
      : RULES.YEAST.GRAIN;

  const yeast = {
    name: yeastRule.name,
    grams: round(fill * yeastRule.pitch_g_per_gal, 1)
  };

  /* =========================
     Nutrients (scaled by fill)
     ========================= */
  const nutrients_g = round(fill * 1.0, 1); // 1 g / gal planning value

  return {
    engineVersion: ENGINE_VERSION,
    mashId,
    name: mash.name,
    mode,
    fillGal: round(fill, 2),

    fermentables: base.fermentables,

    yeast,
    nutrients_g,

    totals: {
      og: round(og, 4),
      washABV_percent: round(washABV, 2)
    },

    abvAdjustment
  };
}
