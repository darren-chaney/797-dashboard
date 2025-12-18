/* ============================================================
   mash-ui.js
   UI wiring that cannot silently fail:
   - populates selects
   - sets ENGINE VERSION immediately
   - shows fatal error box if anything breaks
   ============================================================ */

(function(){

  const $ = (id) => document.getElementById(id);

  function fmt(v, d=2){
    if (!isFinite(v)) return "—";
    const p = Math.pow(10, d);
    const r = Math.round((v + Number.EPSILON)*p)/p;
    return r.toLocaleString(undefined,{ minimumFractionDigits:d, maximumFractionDigits:d });
  }

  function kv(k, v){
    return `<div class="kv"><div class="k">${k}</div><div class="v">${v}</div></div>`;
  }

  function setFatal(msg){
    const box = $("fatalError");
    if (!box) return;
    box.style.display = "";
    box.textContent = msg;
  }

  function clearFatal(){
    const box = $("fatalError");
    if (!box) return;
    box.style.display = "none";
    box.textContent = "";
  }

  function setEngineStamp(){
    const stamp = $("engineStamp");
    if (!stamp) return;
    const v =
      (window.MASH_ENGINE && window.MASH_ENGINE.ENGINE_VERSION) ?
        window.MASH_ENGINE.ENGINE_VERSION :
        "MISSING (JS not loaded)";
    stamp.textContent = "ENGINE VERSION: " + v;
  }

  function populate(){
    const defs = window.MASH_DEFS;
    if (!defs) throw new Error("MASH_DEFS missing");

    const mashSelect = $("mashSelect");
    const tankSelect = $("tankSelect");
    const stillSelect = $("stillSelect");

    mashSelect.innerHTML = "";
    Object.values(defs.RECIPES).forEach(r=>{
      mashSelect.appendChild(new Option(r.label, r.id));
    });

    tankSelect.innerHTML = "";
    defs.TANKS.forEach(t=>{
      tankSelect.appendChild(new Option(t.name, t.id));
    });

    stillSelect.innerHTML = "";
    defs.STILLS.forEach(s=>{
      stillSelect.appendChild(new Option(s.name, s.id));
    });
  }

  function applyDefaults(){
    const defs = window.MASH_DEFS;

    $("mashSelect").value = defs.DEFAULTS.mashId;
    $("tankSelect").value = defs.DEFAULTS.tankId;
    $("stillSelect").value = defs.DEFAULTS.stillId;

    $("fillGal").value = defs.DEFAULTS.fillGal;
    $("targetAbv").value = defs.DEFAULTS.targetWashAbvPct;
    $("stripProof").value = defs.DEFAULTS.stripLowWinesAbvPct;
    $("chargeFillPct").value = defs.DEFAULTS.chargeFillPct;

    $("lockToRecipe").checked = true;

    updateTargetHint();
  }

  function updateTargetHint(){
    const defs = window.MASH_DEFS;
    const mashId = $("mashSelect").value;
    const r = defs.RECIPES[mashId];
    const hint = $("targetHint");
    if (!hint) return;

    if (r.kind === "rum"){
      hint.textContent = "Rum: Target Wash ABV is ignored (rule).";
    } else {
      hint.textContent = "Moonshine: raising Target ABV only increases sugar (never decreases).";
    }
  }

  function applyTankWorkingFill(){
    const defs = window.MASH_DEFS;
    const tankId = $("tankSelect").value;
    const t = defs.TANKS.find(x=>x.id===tankId);
    if (t) $("fillGal").value = t.workingFillGal;
  }

  function render(res){
    const { batch, strip, still } = res;

    // Ingredients
    if (batch.kind === "moonshine"){
      $("ingredients").innerHTML = `
        ${kv("Corn", `${fmt(batch.ingredients.cornLb,1)} lb`)}
        ${kv("Malted barley", `${fmt(batch.ingredients.maltLb,1)} lb`)}
        ${kv("Sugar", `${fmt(batch.ingredients.sugarLb,1)} lb <span class="badge">only increases</span>`)}
      `;
    } else {
      $("ingredients").innerHTML = `
        ${kv("L350", `${fmt(batch.ingredients.l350Gal,2)} gal <span class="badge">locked</span>`)}
        ${kv("Molasses", `${fmt(batch.ingredients.molassesGal,2)} gal <span class="badge">locked</span>`)}
      `;
    }

    // Wash
    const washLines = [];
    washLines.push(kv("Wash ABV (engine)", `${fmt(batch.washAbvPct,1)} %`));

    if (batch.kind === "moonshine"){
      washLines.push(kv("Baseline ABV (recipe)", `${fmt(batch.baselineAbvPct,1)} %`));
      washLines.push(kv("Target ABV (clamped)", `${fmt(batch.targetAbvPct,1)} %`));
    } else {
      washLines.push(kv("Target ABV input", `${fmt(Number($("targetAbv").value),1)} % <span class="badge">ignored</span>`));
    }
    washLines.push(`<div class="small" style="margin-top:10px">${batch.meta.notes}</div>`);
    $("washBlock").innerHTML = washLines.join("");

    // Strip
    $("stripBlock").innerHTML = `
      ${kv("Still", still.name)}
      ${kv("Planned charge", `${fmt(strip.plannedCharge,2)} gal`)}
      ${kv("Charge used", `${fmt(strip.chargeUsed,2)} gal <span class="badge">charge-based</span>`)}
      ${kv("Low wines", `${fmt(strip.lowWinesGal,2)} gal @ ${fmt(strip.lowWinesAbvPct,1)}% <span class="badge">NO CUTS</span>`)}
      <div class="small" style="margin-top:10px">
        Per-run estimate based on still charge size (not fermenter size). For multiple charges, run multiple times.
      </div>
    `;

    // Rules
    const notes = window.MASH_RULES.ruleNotesFor(batch.kind);
    const rb = $("ruleBlock");
    const rn = $("ruleNotes");
    rb.style.display = "";
    rn.innerHTML = notes.map(s=>`<div>• ${s}</div>`).join("");
  }

  function recalc(){
    clearFatal();
    setEngineStamp();

    const defs = window.MASH_DEFS;
    const mashId = $("mashSelect").value;
    const recipe = defs.RECIPES[mashId];
    updateTargetHint();

    const input = {
      mashId,
      fillGal: Number($("fillGal").value || 0),
      targetAbvPct: Number($("targetAbv").value || 0),
      stillId: $("stillSelect").value,
      stripLowWinesAbvPct: Number($("stripProof").value || 35),
      chargeFillPct: Number($("chargeFillPct").value || 90),
      lockToRecipe: $("lockToRecipe").checked
    };

    // Rum ignores target ABV by design; we keep the field visible.
    try{
      const res = window.MASH_ENGINE.computeBatch(input);
      $("engineStamp").textContent = "ENGINE VERSION: " + res.engineVersion;
      render(res);
    }catch(err){
      setFatal("Mash Builder error:\n" + (err && err.stack ? err.stack : String(err)));
    }
  }

  function wire(){
    $("btnRecalc").onclick = recalc;
    $("btnReset").onclick = () => { applyDefaults(); recalc(); };

    $("mashSelect").addEventListener("change", recalc);
    $("tankSelect").addEventListener("change", () => { applyTankWorkingFill(); recalc(); });
    $("stillSelect").addEventListener("change", recalc);

    ["fillGal","targetAbv","stripProof","chargeFillPct"].forEach(id=>{
      $(id).addEventListener("input", recalc);
    });

    $("lockToRecipe").addEventListener("change", recalc);
  }

  function init(){
    try{
      setEngineStamp(); // show something even before populate
      if (!window.MASH_DEFS) throw new Error("MASH_DEFS not loaded (mash-definitions.js missing or failing)");
      if (!window.MASH_ENGINE) throw new Error("MASH_ENGINE not loaded (mash-engine.js missing or failing)");
      if (!window.MASH_RULES) throw new Error("MASH_RULES not loaded (mash-rules.js missing or failing)");

      populate();
      applyDefaults();
      wire();
      recalc();
    }catch(err){
      setEngineStamp();
      setFatal("Mash Builder failed to initialize:\n" + (err && err.stack ? err.stack : String(err)));
    }
  }

  window.addEventListener("DOMContentLoaded", init);
})();
