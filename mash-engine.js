/* ============================================================
   mash-engine.js
   ES5-safe, scenario-enabled engine (UI-compatible)
   ============================================================ */

(function(){

  var ENGINE_VERSION = "mash-engine v4.0.2 (SCENARIOS-ES5-FIXED)";

  var ETHANOL_GAL_PER_LB_SUGAR = 0.062;

  var CORN_SUGAR_EQ_PER_LB = 0.10;
  var MALT_SUGAR_EQ_PER_LB = 0.18;

  var L350_SUGAR_EQ_PER_GAL = 6.0;
  var MOLASSES_SUGAR_EQ_PER_GAL = 5.0;

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

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

  /* ---------- BASELINE ---------- */

  function baselineMoonshine(recipe, fillGal){
    var cornLb = scale(66, recipe.baseVolumeGal, fillGal);
    var maltLb = scale(15, recipe.baseVolumeGal, fillGal);
    var sugarLb = scale(recipe.sugarLb, recipe.baseVolumeGal, fillGal);

    var grainSugarEq =
      cornLb * CORN_SUGAR_EQ_PER_LB +
      maltLb * MALT_SUGAR_EQ_PER_LB;

    var ethanol =
      ethanolFromSugarLb(grainSugarEq) +
      ethanolFromSugarLb(sugarLb);

    return {
      kind:"moonshine",
      fillGal: fillGal,
      ingredients:{ cornLb:cornLb, maltLb:maltLb, sugarLb:sugarLb },
      washAbvPct: washAbvPct(fillGal, ethanol),
      pureAlcoholGal: ethanol
    };
  }

  function baselineRum(recipe, fillGal){
    var l350Gal = scale(recipe.l350Gal, recipe.baseVolumeGal, fillGal);
    var molassesGal = scale(recipe.molassesGal, recipe.baseVolumeGal, fillGal);

    var sugarEq =
      l350Gal * L350_SUGAR_EQ_PER_GAL +
      molassesGal * MOLASSES_SUGAR_EQ_PER_GAL;

    var ethanol = ethanolFromSugarLb(sugarEq);

    return {
      kind:"rum",
      fillGal: fillGal,
      ingredients:{ l350Gal:l350Gal, molassesGal:molassesGal },
      washAbvPct: washAbvPct(fillGal, ethanol),
      pureAlcoholGal: ethanol
    };
  }

  /* ---------- SCENARIO ---------- */

  function scenarioMoonshine(recipe, fillGal, targetAbvInput){
    var rules = window.MASH_RULES.RULES.MOONSHINE;
    var base = baselineMoonshine(recipe, fillGal);

    var baselineAbv = base.washAbvPct;
    var targetAbv = clamp(
      normalizeAbvPct(targetAbvInput),
      baselineAbv,
      rules.maxWashAbvPct
    );

    var ethanolNeeded = (fillGal * targetAbv) / 100;

    var grainSugarEq =
      base.ingredients.cornLb * CORN_SUGAR_EQ_PER_LB +
      base.ingredients.maltLb * MALT_SUGAR_EQ_PER_LB;

    var grainEthanol = ethanolFromSugarLb(grainSugarEq);
    var baselineSugarEthanol = ethanolFromSugarLb(base.ingredients.sugarLb);

    var sugarEthanolNeeded =
      Math.max(baselineSugarEthanol, ethanolNeeded - grainEthanol);

    var sugarLb = sugarEthanolNeeded / ETHANOL_GAL_PER_LB_SUGAR;
    var ethanol = grainEthanol + ethanolFromSugarLb(sugarLb);

    return {
      kind:"moonshine",
      fillGal: fillGal,
      targetAbvPct: targetAbv,
      ingredients:{
        cornLb: base.ingredients.cornLb,
        maltLb: base.ingredients.maltLb,
        sugarLb: sugarLb
      },
      washAbvPct: washAbvPct(fillGal, ethanol),
      pureAlcoholGal: ethanol,
      deltas:{ sugarLb: sugarLb - base.ingredients.sugarLb }
    };
  }

  function scenarioRum(recipe, fillGal, targetAbvInput, rumAdjustMode){
    var base = baselineRum(recipe, fillGal);
    var targetAbv = normalizeAbvPct(targetAbvInput);

    if (!rumAdjustMode){
      return {
        kind:"rum",
        fillGal: fillGal,
        targetAbvPct: targetAbv,
        ingredients: base.ingredients,
        washAbvPct: base.washAbvPct,
        pureAlcoholGal: base.pureAlcoholGal,
        deltas:{ l350Gal:0 }
      };
    }

    var baselineAbv = base.washAbvPct;
    var effectiveTarget = Math.max(targetAbv, baselineAbv);

    var ethanolNeeded = (fillGal * effectiveTarget) / 100;
    var sugarEqNeededLb = ethanolNeeded / ETHANOL_GAL_PER_LB_SUGAR;

    var molEq = base.ingredients.molassesGal * MOLASSES_SUGAR_EQ_PER_GAL;
    var remainingEq = Math.max(0, sugarEqNeededLb - molEq);

    var l350Gal = Math.max(
      base.ingredients.l350Gal,
      remainingEq / L350_SUGAR_EQ_PER_GAL
    );

    var totalSugarEq =
      l350Gal * L350_SUGAR_EQ_PER_GAL +
      base.ingredients.molassesGal * MOLASSES_SUGAR_EQ_PER_GAL;

    var ethanol = ethanolFromSugarLb(totalSugarEq);

    return {
      kind:"rum",
      fillGal: fillGal,
      targetAbvPct: effectiveTarget,
      ingredients:{ l350Gal:l350Gal, molassesGal:base.ingredients.molassesGal },
      washAbvPct: washAbvPct(fillGal, ethanol),
      pureAlcoholGal: ethanol,
      deltas:{ l350Gal: l350Gal - base.ingredients.l350Gal }
    };
  }

  function estimateStrip(cfg){
    var plannedCharge = cfg.stillCapacityGal * (cfg.chargeFillPct / 100);
    var chargeUsed = Math.min(plannedCharge, cfg.fermenterFillGal);
    var ethanolInCharge = chargeUsed * (cfg.washAbvPct / 100);
    var lowWinesGal = ethanolInCharge / (cfg.lowWinesAbvPct / 100);
    return {
      plannedCharge: plannedCharge,
      chargeUsed: chargeUsed,
      ethanolInCharge: ethanolInCharge,
      lowWinesGal: lowWinesGal,
      lowWinesAbvPct: cfg.lowWinesAbvPct
    };
  }

  function computeBatch(input){
    var defs = window.MASH_DEFS;
    var recipe = defs.RECIPES[input.mashId];
    var still = defs.STILLS.filter(function(s){
      return s.id === input.stillId;
    })[0] || defs.STILLS[0];

    var fillGal = clamp(Number(input.fillGal), 1, 1000);

    var baseline =
      recipe.kind === "moonshine"
        ? baselineMoonshine(recipe, fillGal)
        : baselineRum(recipe, fillGal);

    var scenario =
      recipe.kind === "moonshine"
        ? scenarioMoonshine(recipe, fillGal, input.targetAbvPct)
        : scenarioRum(recipe, fillGal, input.targetAbvPct, input.rumAdjustMode);

    var strip = estimateStrip({
      washAbvPct: scenario.washAbvPct,
      fermenterFillGal: fillGal,
      stillCapacityGal: still.capacityGal,
      chargeFillPct: input.chargeFillPct,
      lowWinesAbvPct: input.stripLowWinesAbvPct
    });

    return {
      engineVersion: ENGINE_VERSION,
      input: {
        mashId: input.mashId,
        fillGal: fillGal,
        targetAbvPct: normalizeAbvPct(input.targetAbvPct),
        rumAdjustMode: !!input.rumAdjustMode
      },
      recipe: recipe,
      still: still,
      baseline: baseline,
      scenario: scenario,
      guidance: guidanceFor(recipe.kind, fillGal),
      strip: strip
    };
  }

  window.MASH_ENGINE = {
    ENGINE_VERSION: ENGINE_VERSION,
    computeBatch: computeBatch
  };

})();
