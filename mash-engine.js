/* ============================================================
   mash-engine.js
   SOLID, LOCKED engine for Mash Builder
   ============================================================ */

(function(){

  const ENGINE_VERSION = "mash-engine v3.0.0 (ABV-LOCKED)";

  /* ============================
     CONSTANTS (REALITY-BASED)
     ============================ */

  // Ethanol yield (real world, calibrated to Darren’s data)
  // ~0.062 gal pure ethanol per lb fermentable sugar
  const ETHANOL_GAL_PER_LB_SUGAR = 0.062;

  // Grain contribution (conservative; sugar drives ABV)
  const CORN_SUGAR_EQ_PER_LB = 0.10;
  const MALT_SUGAR_EQ_PER_LB = 0.18;

  // Rum sugar equivalents (lb fermentable per gallon)
  const L350_SUGAR_EQ_PER_GAL = 6.0;
  const MOLASSES_SUGAR_EQ_PER_GAL = 5.0;

  // Safety bounds
  const MAX_MOONSHINE_ABV = 15.0;

  /* ============================
     UTILITIES
     ============================ */

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function normalizeAbvPct(v){
    if (!isFinite(v)) return 0;

    // If user entered 0.08 → assume 8%
    if (v > 0 && v < 1) return v * 100;

    return clamp(v, 0, 20);
  }

  function scale(base, baseVol, targetVol){
    return base * (targetVol / baseVol);
  }

  function ethanolFromSugar(lbSugar){
    return lbSugar * ETHANOL_GAL_PER_LB_SUGAR;
  }

  function washAbv(volumeGal, ethanolGal){
    return volumeGal > 0 ? (ethanolGal / volumeGal) * 100 : 0;
  }

  /* ============================
     MOONSHINE ENGINE
     ============================ */

  function buildMoonshine(recipe, volumeGal, targetAbvInput){
    const baseVol = recipe.baseVolumeGal;

    // Fixed grain bill (scaled by volume ONLY)
    const cornLb = scale(66, baseVol, volumeGal);
    const maltLb = scale(15, baseVol, volumeGal);

    // Grain ethanol (minor contributor)
    const grainSugarEq =
      cornLb * CORN_SUGAR_EQ_PER_LB +
      maltLb * MALT_SUGAR_EQ_PER_LB;

    const grainEthanol = ethanolFromSugar(grainSugarEq);

    // Baseline sugar (scaled recipe)
    const baselineSugarLb = scale(100, baseVol, volumeGal);
    const baselineSugarEthanol = ethanolFromSugar(baselineSugarLb);

    const baselineEthanol = grainEthanol + baselineSugarEthanol;
    const baselineAbv = washAbv(volumeGal, baselineEthanol);

    // Normalize + clamp target ABV
    const targetAbv = clamp(
      normalizeAbvPct(targetAbvInput),
      baselineAbv,
      MAX_MOONSHINE_ABV
    );

    // Ethanol required for target ABV
    const ethanolRequired = (volumeGal * targetAbv) / 100;

    // Sugar ethanol required after grain contribution
    const sugarEthanolRequired = Math.max(
      baselineSugarEthanol,
      ethanolRequired - grainEthanol
    );

    // Convert ethanol → sugar
    const finalSugarLb = sugarEthanolRequired / ETHANOL_GAL_PER_LB_SUGAR;

    const finalEthanol =
      grainEthanol + ethanolFromSugar(finalSugarLb);

    return {
      kind: "moonshine",
      volumeGal,
      grains: {
        cornLb,
        maltLb
      },
      sugarLb: finalSugarLb,
      washAbv: washAbv(volumeGal, finalEthanol),
      notes: [
        "Grain bill fixed (scaled by volume only)",
        "Sugar never decreases below recipe baseline",
        "Target ABV normalized and clamped"
      ]
    };
  }

  /* ============================
     RUM ENGINE
     ============================ */

  function buildRum(recipe, volumeGal){
    const baseVol = recipe.baseVolumeGal;

    const l350Gal = scale(14, baseVol, volumeGal);
    const molassesGal = scale(1, baseVol, volumeGal);

    const sugarEq =
      l350Gal * L350_SUGAR_EQ_PER_GAL +
      molassesGal * MOLASSES_SUGAR_EQ_PER_GAL;

    const ethanol = ethanolFromSugar(sugarEq);
    const abv = washAbv(volumeGal, ethanol);

    return {
      kind: "rum",
      volumeGal,
      l350Gal,
      molassesGal,
      washAbv: abv,
      notes: [
        "Target Wash ABV ignored for rum",
        "Wash ABV derived from L350 + molasses only"
      ]
    };
  }

  /* ============================
     STRIPPING RUN
     ============================ */

  function estimateStrip({
    washAbv,
    fermenterVol,
    stillCapacity,
    chargeFillPct,
    stripAbv
  }){
    const chargePlanned = stillCapacity * (chargeFillPct / 100);
    const chargeUsed = Math.min(chargePlanned, fermenterVol);

    const ethanol = chargeUsed * (washAbv / 100);
    const lowWines = ethanol / (stripAbv / 100);

    return {
      chargeUsed,
      lowWines,
      stripAbv
    };
  }

  /* ============================
     PUBLIC API
     ============================ */

  function compute(input){
    const defs = window.MASH_DEFS;
    const recipe = defs.RECIPES[input.mashId];
    const still = defs.STILLS.find(s => s.id === input.stillId);

    let batch;

    if (recipe.kind === "moonshine"){
      batch = buildMoonshine(
        recipe,
        input.fillGal,
        input.targetAbvPct
      );
    } else {
      batch = buildRum(
        recipe,
        input.fillGal
      );
    }

    const strip = estimateStrip({
      washAbv: batch.washAbv,
      fermenterVol: input.fillGal,
      stillCapacity: still.capacityGal,
      chargeFillPct: input.chargeFillPct,
      stripAbv: input.stripLowWinesAbvPct
    });

    return {
      engineVersion: ENGINE_VERSION,
      batch,
      strip,
      still
    };
  }

  window.MASH_ENGINE = {
    ENGINE_VERSION,
    compute
  };

})();
