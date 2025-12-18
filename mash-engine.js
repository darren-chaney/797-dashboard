/* ============================================================
   mash-engine.js
   Solid engine (ABV normalized once, rules enforced, charge-based strip)
   ============================================================ */

(function(){

  const ENGINE_VERSION = "mash-engine v3.1.0 (SOLID)";

  // Realistic yield calibration (not textbook)
  const ETHANOL_GAL_PER_LB_SUGAR = 0.062;

  // Conservative grain contribution (sugarhead is sugar-driven)
  const CORN_SUGAR_EQ_PER_LB = 0.10;
  const MALT_SUGAR_EQ_PER_LB = 0.18;

  // Rum fermentable equivalents (lb sugar-eq per gallon)
  const L350_SUGAR_EQ_PER_GAL = 6.0;
  const MOLASSES_SUGAR_EQ_PER_GAL = 5.0;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const isNum = (v) => typeof v === "number" && isFinite(v);

  // THE fix: normalize input ABV to percent (8 means 8%, 0.08 becomes 8%)
  function normalizeAbvPct(v){
    const n = Number(v);
    if (!isFinite(n)) return 0;
    if (n > 0 && n < 1) return n * 100;  // 0.08 -> 8
    return n;                             // 8 -> 8
  }

  function scale(base, baseVol, targetVol){
    return baseVol > 0 ? base * (targetVol / baseVol) : 0;
  }

  function ethanolFromSugarLb(lb){
    return lb * ETHANOL_GAL_PER_LB_SUGAR;
  }

  function washAbvPct(volumeGal, ethanolGal){
    return volumeGal > 0 ? (ethanolGal / volumeGal) * 100 : 0;
  }

  function buildMoonshine(recipe, fillGal, targetAbvPctInput){
    const baseVol = recipe.baseVolumeGal;

    const cornLb = scale(recipe.grains.find(g=>g.key==="corn")?.lb || 66, baseVol, fillGal);
    const maltLb = scale(recipe.grains.find(g=>g.key==="malt")?.lb || 15, baseVol, fillGal);

    const grainSugarEq =
      (cornLb * CORN_SUGAR_EQ_PER_LB) +
      (maltLb * MALT_SUGAR_EQ_PER_LB);

    const grainEthanol = ethanolFromSugarLb(grainSugarEq);

    const baselineSugarLb = scale(recipe.sugarLb, baseVol, fillGal);
    const baselineEthanol = grainEthanol + ethanolFromSugarLb(baselineSugarLb);
    const baselineAbv = washAbvPct(fillGal, baselineEthanol);

    // Enforce rules:
    // - target ABV can only increase sugar (never decrease)
    // - clamp to sane max
    const rawTarget = normalizeAbvPct(targetAbvPctInput);
    const target = clamp(rawTarget, baselineAbv, window.MASH_RULES.RULES.MOONSHINE.maxWashAbvPct);

    const ethanolNeeded = (fillGal * target) / 100;
    const sugarEthanolNeeded = Math.max(ethanolFromSugarLb(baselineSugarLb), ethanolNeeded - grainEthanol);
    const finalSugarLb = sugarEthanolNeeded / ETHANOL_GAL_PER_LB_SUGAR;

    const finalEthanol = grainEthanol + ethanolFromSugarLb(finalSugarLb);
    const finalAbv = washAbvPct(fillGal, finalEthanol);

    return {
      kind:"moonshine",
      fillGal,
      baselineAbvPct: baselineAbv,
      targetAbvPct: target,
      washAbvPct: finalAbv,
      ingredients: {
        cornLb,
        maltLb,
        sugarLb: finalSugarLb
      },
      meta: {
        yeast: recipe.yeast,
        notes: recipe.notes
      }
    };
  }

  function buildRum(recipe, fillGal){
    const baseVol = recipe.baseVolumeGal;

    const l350Gal = scale(recipe.l350Gal, baseVol, fillGal);
    const molassesGal = scale(recipe.molassesGal, baseVol, fillGal);

    const sugarEq =
      (l350Gal * L350_SUGAR_EQ_PER_GAL) +
      (molassesGal * MOLASSES_SUGAR_EQ_PER_GAL);

    const ethanol = ethanolFromSugarLb(sugarEq);
    const abv = washAbvPct(fillGal, ethanol);

    return {
      kind:"rum",
      fillGal,
      washAbvPct: abv,
      ingredients: { l350Gal, molassesGal },
      meta: { yeast: recipe.yeast, notes: recipe.notes }
    };
  }

  function estimateStrip({ washAbvPct, fermenterFillGal, stillCapacityGal, chargeFillPct, lowWinesAbvPct }){
    const fillPct = clamp(Number(chargeFillPct || 90), 50, 98) / 100;
    const plannedCharge = stillCapacityGal * fillPct;

    // Rule: based on charge size, not fermenter size
    const chargeUsed = Math.min(plannedCharge, fermenterFillGal);

    const lwAbv = clamp(Number(lowWinesAbvPct || 35), 15, 60);

    const ethanolInCharge = chargeUsed * (washAbvPct / 100);
    const lowWinesGal = ethanolInCharge / (lwAbv / 100);

    return { plannedCharge, chargeUsed, lowWinesGal, lowWinesAbvPct: lwAbv };
  }

  function computeBatch(input){
    const defs = window.MASH_DEFS;
    if (!defs) throw new Error("MASH_DEFS not loaded");

    const recipe = defs.RECIPES[input.mashId];
    if (!recipe) throw new Error("Unknown mashId: " + input.mashId);

    const still = defs.STILLS.find(s => s.id === input.stillId) || defs.STILLS[0];

    const fillGal = clamp(Number(input.fillGal || 0), 1, 1000);

    let batch;
    if (recipe.kind === "moonshine"){
      batch = buildMoonshine(recipe, fillGal, input.targetAbvPct);
    } else if (recipe.kind === "rum"){
      batch = buildRum(recipe, fillGal);
    } else {
      throw new Error("Unsupported recipe kind: " + recipe.kind);
    }

    const strip = estimateStrip({
      washAbvPct: batch.washAbvPct,
      fermenterFillGal: fillGal,
      stillCapacityGal: still.capacityGal,
      chargeFillPct: input.chargeFillPct,
      lowWinesAbvPct: input.stripLowWinesAbvPct
    });

    return { engineVersion: ENGINE_VERSION, batch, still, strip };
  }

  window.MASH_ENGINE = { ENGINE_VERSION, computeBatch };
})();
