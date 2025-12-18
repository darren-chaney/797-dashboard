/* ============================================================
   mash-rules.js
   Non-negotiable rules + guidance values (pH, yeast, nutrients)
   ============================================================ */

(function(){
  const RULES_VERSION = "mash-rules v1.2.0";

  const RULES = {
    MOONSHINE: {
      sugarNeverDecreases: true,
      grainBillFixed: true,
      maxWashAbvPct: 15.0,
      // guidance
      targetPh: { nominal: 5.3, range: "5.2–5.6" },
      yeastGPerGal: 1.0,
      nutrientsGPerGal: 1.0
    },
    RUM: {
      ignoreTargetAbvByDefault: true,
      // dedicated mode exists; only adjusts L350 and only upward
      adjustModeAllowsIncreaseOnly: true,
      // guidance
      targetPh: { nominal: 5.0, range: "4.8–5.2" },
      yeastGPerGal: 1.0,
      nutrientsGPerGal: 1.0
    },
    DISTILLATION: {
      strippingNoCuts: true,
      lowWinesBasedOnCharge: true
    }
  };

  function ruleNotesFor(kind, rumAdjustMode){
    if (kind === "moonshine"){
      return [
        "Moonshine: Target Wash ABV can ONLY increase sugar (never decrease).",
        "Moonshine: Grain bill stays fixed (scales only with volume)."
      ];
    }
    if (kind === "rum"){
      const notes = [
        "Rum: By default Target Wash ABV is ignored (no auto-adjust).",
        "Rum: L350 + molasses are in gallons (scaled by volume)."
      ];
      if (rumAdjustMode){
        notes.push("Rum adjust mode ON: engine increases L350 only (never decreases) to hit Target ABV.");
      }
      return notes;
    }
    return [];
  }

  window.MASH_RULES = { RULES_VERSION, RULES, ruleNotesFor };
})();
