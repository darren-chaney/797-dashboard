/* ============================================================
   mash-engine.js
   ES5-safe, scenario-enabled engine
   ============================================================ */

(function(){

  var ENGINE_VERSION = "mash-engine v4.0.1 (SCENARIOS-ES5)";

  // Realistic yield calibration
  var ETHANOL_GAL_PER_LB_SUGAR = 0.062;

  // Grain contribution
  var CORN_SUGAR_EQ_PER_LB = 0.10;
  var MALT_SUGAR_EQ_PER_LB = 0.18;

  // Rum equivalents
  var L350_SUGAR_EQ_PER_GAL = 6.0;
  var MOLASSES_SUGAR_EQ_PER_GAL = 5.0;

  function clamp(v, a, b){
    return Math.max(a, Math.min(b, v));
  }

  function normalizeAbvPct(v){
    var n = Number(v);
    if (!isFinite(n)) return 0;
    if (n > 0 && n < 1) return n * 100;
    return n;
  }

  function scale(base, baseVol, targetVol){
    if (!baseVol) return 0;
    return base * (targetVol / baseVol);
  }

  function ethanolFromSugarLb(lb){
    return lb * ETHANOL_GAL_PER_LB_SUGAR;
  }

  function washAbvPct(volumeGal, ethanolGal){
    if (!volumeGal) return 0;
    return (ethanolGal / volumeGal) * 100;
  }

  function guidanceFor(kind, volumeGal){
    var rules = window.MASH_RULES.RULES;
    var g = (kind === "rum") ? rules.RUM : rules.MOONSHINE;
    return {
      targetPhRange: g.targetPh.range,
      targetPhNominal: g.targetPh.nominal,
      yeastG: volumeGal * g.yeastGPerGal,
      nutrientsG: volumeGal * g.nutrientsGPerGal
    };
  }

  /* -------------------------
     Baseline builders
  ------------------------- */

  function baselineMoonshine(recipe, fillGal){
    var baseVol = recipe.baseVolumeGal;

    var cornLb = scale(66, baseVol, fillGal);
    var maltLb = scale(15, baseVol, fillGal);
    var sugarLb = scale(recipe.sugarLb, baseVol, fillGal);

    var grainSugarEq =
      (cornLb * CORN_SUGAR_EQ_PER_LB) +
      (maltLb * MALT_SUGAR_EQ_PER_LB);

    var ethanol =
      ethanolFromSugarLb(grainSugarEq) +
      ethanolFromSugarLb(sugarLb);

    return {
      kind:"moonshine",
      fillGal: fillGal,
      ingredients: { cornLb: cornLb, maltLb: maltLb, sugarLb: sugarLb },
      washAbvPct: washAbvPct(fillGal, ethanol),
      pureAlcoholGal: ethanol
    };
  }

  function baselineRum(recipe, fillGal){
    var baseVol = recipe.baseVolumeGal;

    var l350Gal = scale(recipe.l350Gal, baseVol, fillGal);
    var molassesGal = scale(recipe.molassesGal, baseVol, fillGal);

    var sugarEq =
      (l350Gal * L350_SUGAR_EQ_PER_GAL) +
      (molassesGal * MOLASSES_SUGAR_EQ_PER_GAL);

    var ethanol = ethanolFromSugarLb(sugarEq);

    return {
      kind:"rum",
      fillGal: fillGal,
      ingredients: { l350Gal: l350Gal, molassesGal: molassesGal },
      washAbvPct: washAbvPct(fillGal, ethanol),
      pureAlcoholGal: ethanol
    };
  }

  /* -------------------------
     Scenario projections
  ------------------------- */

  function scenarioMoonshine(recipe, fillGal, targetAbvInput){
    var rules = window.MASH_RULES.RULES.MOONSHINE;

    var base = baselineMoonshine(recipe, fillGal);
    var baselineAbv = base.washAbvPct;

    var rawTarget = normalizeAbvPct(targetAbvInput);
    var targetAbv = clamp(rawTarget, baselineAbv, rules.maxWashAbvPct);

    var ethanolNeeded = (fillGal * targetAbv) / 100;

    var grainSugarEq =
      (base.ingredients.cornLb * CORN_SUGAR_EQ_PER_LB) +
      (base.ingredients.maltLb * MALT_SUGAR_EQ_PER_LB);

    var grainEthanol = ethanolFromSugarLb(grainSugarEq);
    var baselineSugarEthanol = ethanolFromSugarLb(base.ingredients.sugarLb);

    var sugarEthanolNeeded = Math.max(baselineSugarEthanol, ethanolNeeded - grainEthanol);
    var sugarLb = sugarEthanolNeeded / ETHANOL_GAL_PER_LB_SUGAR;

    var ethanol =
      grainEthanol + ethanolFromSugarLb(sugarLb);

    return {
      kind:"moonshine",
      fillGal: fillGal,
      targetAbvPct: targetAbv,
      ingredients: {
        cornLb: base.ingredients.cornLb,
        maltLb: base.ingredients.maltLb,
        sugarLb: sugarLb
      },
      washAbvPct: washAbvPct(fillGal, ethanol),
      pureAlcoholGal: ethanol,
      deltas: {
        sugarLb: sugarLb - base.ingredients.sugarLb
      },
      notes: []
    };
  }

  function scenarioRum(recipe, fillGal, targetAbvInput, rumAdjustMode){
    var base = baselineRum(recipe, fillGal);

    var rawTarget = normalizeAbvPct(targetAbvInput);
    var targetAbv = clamp(rawTarget, 0, 20);

    if (!rumAdjustMode){
      return {
        kind:"rum",
        fillGal: fillGal,
        targetAbvPct: targetAbv,
        ingredients: base.ingredients,
        washAbvPct: base.washAbvPct,
        pureAlcoholGal: base.pureAlcoholGal,
        deltas: { l350Gal: 0, molassesGal: 0 },
        notes: ["Target Wash ABV ignored for rum (rule)."]
      };
    }

    var baselineAbv = base.washAbvPct;
    var effectiveTarget = Math.max(targetAbv, baselineAbv);

    var ethanolNeeded = (fillGal * effectiveTarget) / 100;
    var sugarEqNeededLb = ethanolNeeded / ETHANOL_GAL_PER_LB_SUGAR;

    var molSugarEq = base.ingredients.molassesGal * MOLASSES_SUGAR_EQ_PER_GAL;
    var remainingSugarEq = Math.max(0, sugarEqNeededLb - molSugarEq);

    var requiredL350Gal = remainingSugarEq / L350_SUGAR_EQ_PER_GAL;
    var l350Gal = Math.max(base.ingredients.l350Gal, requiredL350Gal);

    var totalSugarEq =
      (l350Gal * L350_SUGAR_EQ_PER_GAL) +
      (base.ingredients.molassesGal * MOLASSES_SUGAR_EQ_PER_GAL);

    var ethanol = ethanolFromSugarLb(totalSugarEq);
    var abv = washAbvPct(fillGal, ethanol);

    return {
      kind:"rum",
      fillGal: fillGal,
      targetAbvPct: effectiveTarget,
      ingredients: {
        l350Gal: l350Gal,
        molassesGal: base.ingredients.molassesGal
      },
      washAbvPct: abv,
      pureAlcoholGal: ethanol,
      deltas: {
        l350Gal: l350Gal - base.ingredients.l350Gal,
        molassesGal: 0
      },
      notes: []
    };
  }

  function estimateStrip(cfg){
    var fillPct = clamp(Number(cfg.chargeFillPct || 90), 50, 98) / 100;
    var plannedCharge = cfg.stillCapacityGal * fillPct;
    var chargeUsed = Math.min(plannedCharge, cfg.fermenterFillGal);

    var lwAbv = clamp(Number(cfg.lowWinesAbvPct || 35), 15, 60);
    var ethanolInCharge = chargeUsed * (cfg.washAbvPct / 100);
    var lowWinesGal = ethanolInCharge / (lwAbv / 100);

    return {
      plannedCharge: plannedCharge,
      chargeUsed: chargeUsed,
      lowWinesGal: lowWinesGal,
      lowWinesAbvPct: lwAbv,
      ethanolInCharge: ethanolInCharge
    };
  }

  function computeBatch(input){
    var defs = window.MASH_DEFS;
    var recipe = defs.RECIPES[input.mashId];
    var still = null;

    for (var i=0;i<defs.STILLS.length;i++){
      if (defs.STILLS[i].id === input.stillId){
        still = defs.STILLS[i];
        break;
      }
    }
    if (!still) still = defs.STILLS[0];

    var fillGal = clamp(Number(input.fillGal || 0), 1, 1000);

    var baseline =
      (recipe.kind === "moonshine")
        ? baselineMoonshine(recipe, fillGal)
        : baselineRum(recipe, fillGal);

    var scenario =
      (recipe.kind === "moonshine")
        ? scenarioMoonshine(recipe, fillGal, input.targetAbvPct)
        : scenarioRum(recipe, fillGal, input.targetAbvPct, input.rumAdjustMode);

    var guide = guidanceFor(recipe.kind, fillGal);

    var strip = estimateStrip({
      washAbvPct: scenario.washAbvPct,
      fermenterFillGal: fillGal,
      stillCapacityGal: still.capacityGal,
      chargeFillPct: input.chargeFillPct,
      lowWinesAbvPct: input.stripLowWinesAbvPct
    });

    return {
      engineVersion: ENGINE_VERSION,
      recipe: recipe,
      still: still,
      baseline: baseline,
      scenario: scenario,
      guidance: guide,
      strip: strip
    };
  }

  window.MASH_ENGINE = {
    ENGINE_VERSION: ENGINE_VERSION,
    computeBatch: computeBatch
  };

})();
