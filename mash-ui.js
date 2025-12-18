/* ============================================================
   mash-ui.js
   Modular UI wiring — simple & trusted
   ============================================================ */

(function(){

  const el = id => document.getElementById(id);

  function fmt(v, d=2){
    if (!isFinite(v)) return "—";
    return Number(v).toLocaleString(undefined,{
      minimumFractionDigits:d,
      maximumFractionDigits:d
    });
  }

  function setFatal(msg){
    const box = el("fatalError");
    if (!box) return;
    box.style.display = "";
    box.textContent = msg;
  }

  function clearFatal(){
    const box = el("fatalError");
    if (!box) return;
    box.style.display = "none";
    box.textContent = "";
  }

  function setEngineStamp(v){
    const stamp = el("engineStamp");
    if (!stamp) return;
    stamp.textContent = "ENGINE VERSION: " + v;
  }

  function populate(){
    const defs = window.MASH_DEFS;

    const mashSelect  = el("mashSelect");
    const stillSelect = el("stillSelect");

    mashSelect.innerHTML = "";
    Object.values(defs.RECIPES).forEach(r=>{
      mashSelect.add(new Option(r.label, r.id));
    });

    stillSelect.innerHTML = "";
    defs.STILLS.forEach(s=>{
      stillSelect.add(new Option(s.name, s.id));
    });

    mashSelect.value  = defs.DEFAULTS.mashId;
    stillSelect.value = defs.DEFAULTS.stillId;

    el("fillGal").value       = defs.DEFAULTS.fillGal;
    el("targetAbv").value     = defs.DEFAULTS.targetWashAbvPct;
    el("chargeFillPct").value = defs.DEFAULTS.chargeFillPct;
    el("stripProof").value    = defs.DEFAULTS.stripLowWinesAbvPct;
  }

  function updateTargetHint(kind){
    const h = el("targetHint");
    if (!h) return;

    if (kind === "rum"){
      h.textContent = "Rum: Target Wash ABV is ignored (rule).";
    } else {
      h.textContent = "Moonshine: raising Target ABV increases sugar only.";
    }
  }

  function recalc(){
    clearFatal();

    try{
      const input = {
        mashId: el("mashSelect").value,
        fillGal: Number(el("fillGal").value),
        targetAbvPct: Number(el("targetAbv").value),
        stillId: el("stillSelect").value,
        chargeFillPct: Number(el("chargeFillPct").value),
        stripLowWinesAbvPct: Number(el("stripProof").value)
      };

      const res = window.MASH_ENGINE.compute(input);

      setEngineStamp(res.engineVersion);
      updateTargetHint(res.batch.kind);

      /* Fermentables */
      if (res.batch.kind === "moonshine"){
        el("ingredients").innerHTML = `
          Corn: ${fmt(res.batch.grains.cornLb,1)} lb<br>
          Malted Barley: ${fmt(res.batch.grains.maltLb,1)} lb<br>
          Sugar: <b>${fmt(res.batch.sugarLb,1)} lb</b>
        `;
      } else {
        el("ingredients").innerHTML = `
          L350: ${fmt(res.batch.l350Gal,2)} gal<br>
          Molasses: ${fmt(res.batch.molassesGal,2)} gal
        `;
      }

      /* Fermentation */
      el("yeastBlock").textContent =
        fmt(res.fermentation.yeastG,0) + " g";

      el("nutrientBlock").textContent =
        fmt(res.fermentation.nutrientsG,0) + " g";

      el("phBlock").textContent =
        res.fermentation.targetPh;

      /* Wash */
      el("washBlock").innerHTML = `
        Wash ABV: <b>${fmt(res.batch.washAbv,1)}%</b><br>
        Pure Alcohol: ${fmt(res.batch.pureAlcoholGal,2)} gal
      `;

      /* Strip */
      el("stripBlock").innerHTML = `
        Planned Charge: ${fmt(res.strip.chargeUsed,1)} gal<br>
        Low Wines: <b>${fmt(res.strip.lowWines,2)} gal @ ${fmt(res.strip.stripAbv,1)}%</b>
      `;
    }catch(err){
      setFatal(
        "Mash Builder error:\n" +
        (err && err.stack ? err.stack : String(err))
      );
    }
  }

  function wire(){
    el("btnRecalc").onclick = recalc;

    [
      "mashSelect",
      "fillGal",
      "targetAbv",
      "stillSelect",
      "chargeFillPct",
      "stripProof"
    ].forEach(id=>{
      el(id).addEventListener("input", recalc);
      el(id).addEventListener("change", recalc);
    });
  }

  function init(){
    try{
      if (!window.MASH_DEFS) throw new Error("MASH_DEFS missing");
      if (!window.MASH_ENGINE) throw new Error("MASH_ENGINE missing");

      populate();
      wire();
      recalc();
    }catch(err){
      setFatal(
        "Mash Builder failed to initialize:\n" +
        (err && err.stack ? err.stack : String(err))
      );
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
