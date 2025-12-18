/* ============================================================
   mash-rules.js
   Non-negotiable rule enforcement notes
   ============================================================ */

(function(){
  const RULES_VERSION = "mash-rules v1.1.0";

  const RULES = {
    MOONSHINE: {
      sugarNeverDecreases: true,
      grainBillFixed: true,
      maxWashAbvPct: 15
    },
    RUM: {
      ignoreTargetAbv: true
    },
    DISTILLATION: {
      strippingNoCuts: true,
      lowWinesBasedOnCharge: true
    }
  };

  function ruleNotesFor(kind){
    if (kind === "moonshine"){
      return [
        "Moonshine: Target Wash ABV can ONLY increase sugar (never decrease).",
        "Moonshine: Grain bill stays fixed (scales only with volume)."
      ];
    }
    if (kind === "rum"){
      return [
        "Rum: Target Wash ABV is ignored (no auto-adjust).",
        "Rum: L350 + molasses remain in gallons (scale only with volume)."
      ];
    }
    return [];
  }

  window.MASH_RULES = { RULES_VERSION, RULES, ruleNotesFor };
})();
