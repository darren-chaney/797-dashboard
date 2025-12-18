/* ============================================================
   mash-ui.js
   Baseline vs Scenario display + save/load scenarios
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
    box.style.display = "";
    box.textContent = msg;
  }

  function clearFatal(){
    const box = $("fatalError");
    box.style.display = "none";
    box.textContent = "";
  }

  function setEngineStamp(){
    const stamp = $("engineStamp");
    const v = (window.MASH_ENGINE && window.MASH_ENGINE.ENGINE_VERSION) ? window.MASH_ENGINE.ENGINE_VERSION : "MISSING";
    stamp.textContent = "ENGINE VERSION: " + v;
  }

  function populate(){
    const defs = window.MASH_DEFS;

    $("mashSelect").innerHTML = "";
    Object.values(defs.RECIPES).forEach(r => $("mashSelect").appendChild(new Option(r.label, r.id)));

    $("tankSelect").innerHTML = "";
    defs.TANKS.forEach(t => $("tankSelect").appendChild(new Option(t.name, t.id)));

    $("stillSelect").innerHTML = "";
    defs.STILLS.forEach(s => $("stillSelect").appendChild(new Option(s.name, s.id)));
  }

  function applyDefaults(){
    const d = window.MASH_DEFS.DEFAULTS;
    $("mashSelect").value = d.mashId;
    $("tankSelect").value = d.tankId;
    $("stillSelect").value = d.stillId;

    $("fillGal").value = d.fillGal;
    $("targetAbv").value = d.targetWashAbvPct;
    $("stripProof").value = d.stripLowWinesAbvPct;
    $("chargeFillPct").value = d.chargeFillPct;
    $("rumAdjustMode").checked = d.rumAdjustMode;

    $("scenarioName").value = "";
    setTargetHint();
    refreshScenarioList();
    setStatus("");
  }

  function setTargetHint(){
    const defs = window.MASH_DEFS;
    const recipe = defs.RECIPES[$("mashSelect").value];
    const h = $("targetHint");

    if (recipe.kind === "moonshine"){
      h.textContent = "Moonshine: Target ABV increases sugar only (never decreases). Grain fixed.";
    } else {
      h.textContent = $("rumAdjustMode").checked
        ? "Rum: Adjust mode ON — engine can increase L350 to hit Target ABV (never decreases)."
        : "Rum: Target ABV ignored by default (rule). Enable adjust mode to increase L350.";
    }
  }

  function applyTankWorkingFill(){
    const defs = window.MASH_DEFS;
    const t = defs.TANKS.find(x => x.id === $("tankSelect").value);
    if (t) $("fillGal").value = t.workingFillGal;
  }

  function setStatus(msg){
    $("scenarioStatus").textContent = msg || "";
  }

  function refreshScenarioList(){
    const sel = $("savedScenarioSelect");
    sel.innerHTML = "";
    const items = window.MASH_STORAGE.list();

    sel.appendChild(new Option(items.length ? "Select a saved scenario…" : "(none saved yet)", ""));
    items.forEach(s => {
      const label = `${s.name || "(unnamed)"} — ${new Date(s.savedAt).toLocaleString()}`;
      sel.appendChild(new Option(label, s.id));
    });
  }

  function currentInputs(){
    return {
      mashId: $("mashSelect").value,
      fillGal: Number($("fillGal").value || 0),
      targetAbvPct: Number($("targetAbv").value || 0),
      stillId: $("stillSelect").value,
      stripLowWinesAbvPct: Number($("stripProof").value || 35),
      chargeFillPct: Number($("chargeFillPct").value || 90),
      rumAdjustMode: $("rumAdjustMode").checked
    };
  }

  function render(res){
    $("engineStamp").textContent = "ENGINE VERSION: " + res.engineVersion;

    // Baseline block
    const b = res.baseline;
    const g = res.guidance;

    let baselineLines = [];
    baselineLines.push(kv("Wash ABV", `${fmt(b.washAbvPct,1)} %`));
    baselineLines.push(kv("Pure Alcohol", `${fmt(b.pureAlcoholGal,2)} gal`));

    if (b.kind === "moonshine"){
      baselineLines.push(kv("Corn", `${fmt(b.ingredients.cornLb,1)} lb`));
      baselineLines.push(kv("Malted barley", `${fmt(b.ingredients.maltLb,1)} lb`));
      baselineLines.push(kv("Sugar", `${fmt(b.ingredients.sugarLb,1)} lb`));
    } else {
      baselineLines.push(kv("L350", `${fmt(b.ingredients.l350Gal,2)} gal`));
      baselineLines.push(kv("Molasses", `${fmt(b.ingredients.molassesGal,2)} gal`));
    }

    baselineLines.push(`<div class="small" style="margin-top:10px">
      <b>Yeast:</b> ${fmt(g.yeastG,0)} g (recommended)<br>
      <b>Nutrients:</b> ${fmt(g.nutrientsG,0)} g<br>
      <b>Target pH:</b> ${g.targetPhRange} (nominal ${fmt(g.targetPhNominal,1)})
    </div>`);

    $("baselineBlock").innerHTML = baselineLines.join("");

    // Scenario block
    const s = res.scenario;
    let scenarioLines = [];

    scenarioLines.push(kv("Scenario Target ABV", `${fmt(res.input.targetAbvPct,1)} %`));
    scenarioLines.push(kv("Projected Wash ABV", `${fmt(s.washAbvPct,1)} %`));
    scenarioLines.push(kv("Projected Pure Alcohol", `${fmt(s.pureAlcoholGal,2)} gal`));
    scenarioLines.push(kv("Δ Pure Alcohol", `${fmt(s.pureAlcoholGal - b.pureAlcoholGal,2)} gal`));

    if (s.kind === "moonshine"){
      scenarioLines.push(kv("Sugar (projected)", `${fmt(s.ingredients.sugarLb,1)} lb`));
      scenarioLines.push(kv("Δ Sugar", `${fmt(s.deltas.sugarLb,1)} lb <span class="badge">increase-only</span>`));
    } else {
      scenarioLines.push(kv("L350 (projected)", `${fmt(s.ingredients.l350Gal,2)} gal`));
      scenarioLines.push(kv("Δ L350", `${fmt(s.deltas.l350Gal,2)} gal <span class="badge">increase-only</span>`));
      scenarioLines.push(kv("Molasses", `${fmt(s.ingredients.molassesGal,2)} gal`));
    }

    if (s.notes && s.notes.length){
      scenarioLines.push(`<div class="small" style="margin-top:10px">${s.notes.map(x=>"• "+x).join("<br>")}</div>`);
    }

    $("scenarioBlock").innerHTML = scenarioLines.join("");

    // Strip block (scenario-based)
    const st = res.strip;
    $("stripBlock").innerHTML = `
      ${kv("Still", res.still.name)}
      ${kv("Planned charge", `${fmt(st.plannedCharge,2)} gal`)}
      ${kv("Charge used", `${fmt(st.chargeUsed,2)} gal <span class="badge">charge-based</span>`)}
      ${kv("Ethanol in charge", `${fmt(st.ethanolInCharge,2)} gal`)}
      ${kv("Low wines (no cuts)", `${fmt(st.lowWinesGal,2)} gal @ ${fmt(st.lowWinesAbvPct,1)}% <span class="badge">NO CUTS</span>`)}
      <div class="small" style="margin-top:10px">
        Per-run estimate. For multiple charges from one tank, run multiple times.
      </div>
    `;

    // Rules
    const ruleLines = window.MASH_RULES.ruleNotesFor(res.recipe.kind, res.input.rumAdjustMode);
    $("ruleBlock").style.display = "";
    $("ruleNotes").innerHTML = ruleLines.map(s => `<div>• ${s}</div>`).join("");
  }

  function recalc(){
    clearFatal();
    setEngineStamp();
    setTargetHint();

    try{
      const res = window.MASH_ENGINE.computeBatch(currentInputs());
      render(res);
    }catch(err){
      setFatal("Mash Builder error:\n" + (err && err.stack ? err.stack : String(err)));
    }
  }

  function saveScenario(){
    const name = ($("scenarioName").value || "").trim() || "Unnamed scenario";
    const inputs = currentInputs();
    const snapshot = window.MASH_ENGINE.computeBatch(inputs);

    const record = {
      name,
      inputs,
      // store key result snapshot for quick review later
      results: {
        kind: snapshot.recipe.kind,
        baselineAbvPct: snapshot.baseline.washAbvPct,
        scenarioAbvPct: snapshot.scenario.washAbvPct,
        baselinePureAlcoholGal: snapshot.baseline.pureAlcoholGal,
        scenarioPureAlcoholGal: snapshot.scenario.pureAlcoholGal,
        deltaSugarLb: snapshot.scenario.deltas?.sugarLb ?? 0,
        deltaL350Gal: snapshot.scenario.deltas?.l350Gal ?? 0
      }
    };

    const saved = window.MASH_STORAGE.save(record);
    refreshScenarioList();
    $("savedScenarioSelect").value = saved.id;
    setStatus(`Saved: ${saved.name}`);
  }

  function loadScenario(){
    const id = $("savedScenarioSelect").value;
    if (!id) return;

    const rec = window.MASH_STORAGE.get(id);
    if (!rec) return;

    // apply inputs
    $("mashSelect").value = rec.inputs.mashId;
    $("fillGal").value = rec.inputs.fillGal;
    $("targetAbv").value = rec.inputs.targetAbvPct;
    $("stillSelect").value = rec.inputs.stillId;
    $("stripProof").value = rec.inputs.stripLowWinesAbvPct;
    $("chargeFillPct").value = rec.inputs.chargeFillPct;
    $("rumAdjustMode").checked = !!rec.inputs.rumAdjustMode;

    $("scenarioName").value = rec.name || "";

    setStatus(`Loaded: ${rec.name}`);
    recalc();
  }

  function deleteScenario(){
    const id = $("savedScenarioSelect").value;
    if (!id) return;
    window.MASH_STORAGE.remove(id);
    refreshScenarioList();
    $("scenarioName").value = "";
    setStatus("Deleted scenario.");
  }

  function exportScenario(){
    const name = ($("scenarioName").value || "").trim() || "scenario";
    const data = {
      name,
      exportedAt: new Date().toISOString(),
      inputs: currentInputs(),
      snapshot: window.MASH_ENGINE.computeBatch(currentInputs())
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name.replace(/[^\w\-]+/g,"_")}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setStatus("Exported JSON.");
  }

  function wire(){
    $("btnRecalc").onclick = recalc;
    $("btnReset").onclick = () => { applyDefaults(); recalc(); };

    $("mashSelect").addEventListener("change", () => { setTargetHint(); recalc(); });
    $("tankSelect").addEventListener("change", () => { applyTankWorkingFill(); recalc(); });
    $("stillSelect").addEventListener("change", recalc);

    ["fillGal","targetAbv","stripProof","chargeFillPct"].forEach(id => {
      $(id).addEventListener("input", recalc);
    });

    $("rumAdjustMode").addEventListener("change", () => { setTargetHint(); recalc(); });

    $("btnSaveScenario").onclick = saveScenario;
    $("btnLoadScenario").onclick = loadScenario;
    $("btnDeleteScenario").onclick = deleteScenario;
    $("btnExportScenario").onclick = exportScenario;

    $("savedScenarioSelect").addEventListener("change", ()=>{ /* no auto-load */ });
  }

  function init(){
    try{
      setEngineStamp();
      if (!window.MASH_DEFS) throw new Error("MASH_DEFS missing");
      if (!window.MASH_RULES) throw new Error("MASH_RULES missing");
      if (!window.MASH_ENGINE) throw new Error("MASH_ENGINE missing");
      if (!window.MASH_STORAGE) throw new Error("MASH_STORAGE missing");

      populate();
      applyDefaults();
      wire();
      recalc();
      setStatus("");
    }catch(err){
      setEngineStamp();
      setFatal("Mash Builder failed to initialize:\n" + (err && err.stack ? err.stack : String(err)));
    }
  }

  window.addEventListener("DOMContentLoaded", init);
})();
