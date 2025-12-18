/* ============================================================
   mash-engine.js
   ES5-safe, scenario-enabled engine (calibrated to Darren)
   - Strip recovery efficiency (real-world): 68%
   - Sugarhead grain contribution reduced (so ABV target increases sugar)
   ============================================================ */

(function(){

  var ENGINE_VERSION = "mash-engine v4.1.0 (CALIBRATED-68)";

  // Realistic yield calibration
  // NOTE: This is a tuning knob. We keep it stable and calibrate via strip efficiency.
  var ETHANOL_GAL_PER_LB_SUGAR = 0.062;

  // Sugarhead reality: grain contributes LITTLE ethanol for Darren’s process
  // (corn soak + enzymes; mostly flavor/texture, not high conversion like a true mash)
  var CORN_SUGAR_EQ_PER_LB = 0.02;
  var MALT_SUGAR_EQ_PER_LB = 0.04;

  // Rum equivalents (kept as-is; rum target ignored unless dedicated mode)
  var L350_SUGAR_EQ_PER_GAL = 6.0;
  var MOLASSES_SUGAR_EQ_PER_GAL = 5.0;

  // Real-world strip recovery (NO CUTS) — Darren calibration
  // This captures ethanol left behind / inefficiencies / practical collection endpoint
  var STRIP_RECOVERY_EFF = 0.68;

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

    // Moonshine rule: never reduce sugar => target ABV cannot go below baseline
    var rawTarget = normalizeAbvPct(targetAbvInput);
    var targetAbv = clamp(rawTarget, baselineAbv, rules.maxWashAbvPct);

    var ethanolNeeded = (fillGal * targetAbv) / 100;

    // Ethanol from grain is fixed (low contribution in sugarhead)
    var grainSugarEq =
      base.ingredients.cornLb * CORN_SUGAR_EQ_PER_LB +
      base.ingredients.maltLb * MALT_SUGAR_EQ_PER_LB;

    var grainEthanol = ethanolFromSugarLb(grainSugarEq);
    var baselineSugarEthanol = ethanolFromSugarLb(base.ingredients.sugarLb);

    // Sugar ethanol required (never below baseline sugar ethanol)
    var sugarEthanolNeeded = Math.max(baselineSugarEthanol, ethanolNeeded - grainEthanol);
    var sugarLb = sugarEthanolNeeded / ETHANOL_GAL_PER_LB_SUGAR;

    var ethanol = grainEthanol + ethanolFromSugarLb(sugarLb);

    var notes = [];
    if (rawTarget < baselineAbv){
      notes.push("Target ABV below baseline; sugar not reduced (rule).");
    }
    if (rawTarget > rules.maxWashAbvPct){
      notes.push("Target ABV clamped to safety max.");
    }

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
      deltas:{ sugarLb: sugarLb - base.ingredients.sugarLb },
      notes: notes
    };
  }

  function scenarioRum(recipe, fillGal, targetAbvInput, rumAdjustMode){
    var base = baselineRum(recipe, fillGal);
    var rawTarget = normalizeAbvPct(targetAbvInput);
    var targetAbv = clamp(rawTarget, 0, 20);

    // Default rule: ignore target ABV for rum unless dedicated mode ON
    if (!rumAdjustMode){
      return {
        kind:"rum",
        fillGal: fillGal,
        targetAbvPct: targetAbv,
        ingredients: base.ingredients,
        washAbvPct: base.washAbvPct,
        pureAlcoholGal: base.pureAlcoholGal,
        deltas:{ l350Gal:0 },
        notes:["Target Wash ABV ignored for rum (rule). Enable adjust mode to increase L350 only."]
      };
    }

    // Dedicated mode: increase-only L350 to hit target ABV (never decrease)
    var baselineAbv = base.washAbvPct;
    var effectiveTarget = Math.max(targetAbv, baselineAbv);

    var ethanolNeeded = (fillGal * effectiveTarget) / 100;
    var sugarEqNeededLb = ethanolNeeded / ETHANOL_GAL_PER_LB_SUGAR;

    var molEq = base.ingredients.molassesGal * MOLASSES_SUGAR_EQ_PER_GAL;
    var remainingEq = Math.max(0, sugarEqNeededLb - molEq);

    var requiredL350 = remainingEq / L350_SUGAR_EQ_PER_GAL;
    var l350Gal = Math.max(base.ingredients.l350Gal, requiredL350);

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
      deltas:{ l350Gal: l350Gal - base.ingredients.l350Gal },
      notes:[]
    };
  }

  /* ---------- STRIP ESTIMATE (charge-based + efficiency) ---------- */

  function estimateStrip(cfg){
    var chargeFillPct = clamp(Number(cfg.chargeFillPct || 90), 50, 98);
    var plannedCharge = cfg.stillCapacityGal * (chargeFillPct / 100);
    var chargeUsed = Math.min(plannedCharge, cfg.fermenterFillGal);

    var lowWinesAbvPct = clamp(Number(cfg.lowWinesAbvPct || 35), 15, 60);

    // Theoretical ethanol in the charged wash
    var ethanolInChargeTheo = chargeUsed * (cfg.washAbvPct / 100);

    // Real-world recovered ethanol (Darren-calibrated)
    var ethanolRecovered = ethanolInChargeTheo * STRIP_RECOVERY_EFF;

    // Low wines volume at chosen avg strip ABV
    var lowWinesGal = ethanolRecovered / (lowWinesAbvPct / 100);

    return {
      plannedCharge: plannedCharge,
      chargeUsed: chargeUsed,
      chargeFillPct: chargeFillPct,
      lowWinesAbvPct: lowWinesAbvPct,
      washAbvPct: cfg.washAbvPct,

      ethanolInChargeTheo: ethanolInChargeTheo,
      stripRecoveryEff: STRIP_RECOVERY_EFF,
      ethanolRecovered: ethanolRecovered,

      lowWinesGal: lowWinesGal
    };
  }

  function computeBatch(input){
    var defs = window.MASH_DEFS;
    var recipe = defs.RECIPES[input.mashId];
    var still = defs.STILLS.filter(function(s){ return s.id === input.stillId; })[0] || defs.STILLS[0];

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
