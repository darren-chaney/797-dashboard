/* ============================================================
   mash-ui.js
   Modular UI — MATCHES mash-engine v3.1.0 (SOLID)
   No scenarios. No redesign. No guessing.
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

  function setEngineStamp(v){
    const e = el("engineStamp");
    if (e) e.textContent = "ENGINE VERSION: " + v;
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
    h.textContent =
      kind === "rum"
        ? "Rum: Target Wash ABV ignored (rule)."
        : "Moonshine: raising Target ABV increases sugar only.";
  }

  function render(res){
    setEngineStamp(res.engineVersion);

    const b = res.batch;
    const s = res.strip;

    updateTargetHint(b.kind);

    /* MODULE: Fermentables */
    if (b.kind === "moonshine"){
      el("ingredients").innerHTML = `
        Corn: ${fmt(b.ingredients.cornLb,1)} lb<br>
        Malted Barley: ${fmt(b.ingredients.maltLb,1)} lb<br>
        Sugar: <b>${fmt(b.ingredients.sugarLb,1)} lb</b>
      `;
    } else {
      el("ingredients").innerHTML = `
        L350: ${fmt(b.ingredients.l350Gal,2)} gal<br>
        Molasses: ${fmt(b.ingredients.molassesGal,2)} gal
      `;
    }

    /* MODULE: Wash */
    el("washBlock").innerHTML = `
      Wash ABV: <b>${fmt(b.washAbvPct,1)}%</b>
    `;

    /* MODULE: Strip */
    el("stripBlock").innerHTML = `
      Still: ${res.still.name}<br>
      Planned Charge: ${fmt(s.plannedCharge,1)} gal<br>
      Charge Used: ${fmt(s.chargeUsed,1)} gal<br>
      Low Wines: <b>${fmt(s.lowWinesGal,2)} gal @ ${fmt(s.lowWinesAbvPct,1)}%</b>
    `;
  }

  function recalc(){
    clearFatal();

    try{
      const res = window.MASH_ENGINE.computeBatch({
        mashId: el("mashSelect").value,
        fillGal: Number(el("fillGal").value),
        targetAbvPct: Number(el("targetAbv").value),
        stillId: el("stillSelect").value,
        chargeFillPct: Number(el("chargeFillPct").value),
        stripLowWinesAbvPct: Number(el("stripProof").value)
      });

      render(res);
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
      el(id).addEventListener("change", recalc);
      el(id).addEventListener("input", recalc);
    });
  }

  function init(){
    try{
      if (!window.MASH_ENGINE) throw new Error("MASH_ENGINE missing");
      if (!window.MASH_DEFS) throw new Error("MASH_DEFS missing");

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
