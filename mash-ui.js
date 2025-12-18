/* ============================================================
   mash-ui.js
   Locked UI wiring (ABV-safe)
   ============================================================ */

(function(){

  const el = id => document.getElementById(id);

  function fmt(v, d=2){
    return Number(v).toLocaleString(undefined,{
      minimumFractionDigits:d,
      maximumFractionDigits:d
    });
  }

  function init(){
    const defs = window.MASH_DEFS;

    // Populate selects
    Object.values(defs.RECIPES).forEach(r=>{
      mashSelect.add(new Option(r.label, r.id));
    });

    defs.STILLS.forEach(s=>{
      stillSelect.add(new Option(s.name, s.id));
    });

    mashSelect.value = defs.DEFAULTS.mashId;
    stillSelect.value = defs.DEFAULTS.stillId;

    fillGal.value = 55;
    targetAbv.value = 8;
    chargeFillPct.value = 90;
    stripProof.value = 40;

    engineStamp.textContent =
      "ENGINE VERSION: " + window.MASH_ENGINE.ENGINE_VERSION;

    recalc();
  }

  function recalc(){
    const res = window.MASH_ENGINE.compute({
      mashId: mashSelect.value,
      fillGal: Number(fillGal.value),
      targetAbvPct: Number(targetAbv.value),
      stillId: stillSelect.value,
      chargeFillPct: Number(chargeFillPct.value),
      stripLowWinesAbvPct: Number(stripProof.value)
    });

    engineStamp.textContent =
      "ENGINE VERSION: " + res.engineVersion;

    if (res.batch.kind === "moonshine"){
      ingredients.innerHTML = `
        Corn: ${fmt(res.batch.grains.cornLb,1)} lb<br>
        Malted Barley: ${fmt(res.batch.grains.maltLb,1)} lb<br>
        Sugar: <b>${fmt(res.batch.sugarLb,1)} lb</b>
      `;
    } else {
      ingredients.innerHTML = `
        L350: ${fmt(res.batch.l350Gal,2)} gal<br>
        Molasses: ${fmt(res.batch.molassesGal,2)} gal
      `;
    }

    washBlock.innerHTML = `
      Wash ABV: <b>${fmt(res.batch.washAbv,1)}%</b>
    `;

    stripBlock.innerHTML = `
      Charge Used: ${fmt(res.strip.chargeUsed,1)} gal<br>
      Low Wines: <b>${fmt(res.strip.lowWines,2)} gal @ ${fmt(res.strip.stripAbv,1)}%</b>
    `;
  }

  document.addEventListener("DOMContentLoaded", init);
  btnRecalc.onclick = recalc;

})();
