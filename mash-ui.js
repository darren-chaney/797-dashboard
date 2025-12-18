(function(){

  var UI_VERSION = "mash-ui v2.3.0 (scenarios-restored)";

  var $ = function(id){ return document.getElementById(id); };

  function fmt(v, d){
    if (d === undefined) d = 2;
    if (!isFinite(v)) return "—";
    var p = Math.pow(10, d);
    var r = Math.round((v + 1e-12) * p) / p;
    return r.toLocaleString(undefined,{ minimumFractionDigits:d, maximumFractionDigits:d });
  }

  function kv(k, v){
    return '<div class="kv"><div class="k">'+k+'</div><div class="v">'+v+'</div></div>';
  }

  function setFatal(msg){
    var box = $("fatalError");
    box.style.display = "";
    box.textContent = msg;
  }

  function clearFatal(){
    var box = $("fatalError");
    box.style.display = "none";
    box.textContent = "";
  }

  function setEngineStamp(){
    var v = (window.MASH_ENGINE && window.MASH_ENGINE.ENGINE_VERSION) ? window.MASH_ENGINE.ENGINE_VERSION : "MISSING";
    $("engineStamp").textContent = "ENGINE VERSION: " + v + "   |   UI: " + UI_VERSION;
  }

  function populate(){
    var defs = window.MASH_DEFS;

    $("mashSelect").innerHTML = "";
    Object.keys(defs.RECIPES).forEach(function(k){
      var r = defs.RECIPES[k];
      $("mashSelect").appendChild(new Option(r.label, r.id));
    });

    $("tankSelect").innerHTML = "";
    defs.TANKS.forEach(function(t){
      $("tankSelect").appendChild(new Option(t.name, t.id));
    });

    $("stillSelect").innerHTML = "";
    defs.STILLS.forEach(function(s){
      $("stillSelect").appendChild(new Option(s.name, s.id));
    });
  }

  function applyDefaults(){
    var d = window.MASH_DEFS.DEFAULTS;
    $("mashSelect").value = d.mashId;
    $("tankSelect").value = d.tankId;
    $("stillSelect").value = d.stillId;

    $("fillGal").value = d.fillGal;
    $("targetAbv").value = d.targetWashAbvPct;
    $("stripProof").value = d.stripLowWinesAbvPct;
    $("chargeFillPct").value = d.chargeFillPct;
    $("rumAdjustMode").checked = d.rumAdjustMode;

    $("scenarioName").value = "";
    refreshScenarioList();
    setTargetHint();
    setStatus("");
  }

  function setTargetHint(){
    var defs = window.MASH_DEFS;
    var recipe = defs.RECIPES[$("mashSelect").value];
    var h = $("targetHint");

    if (recipe.kind === "moonshine"){
      h.textContent = "Moonshine: Target ABV increases sugar only (never decreases). Grain fixed.";
    } else {
      h.textContent = $("rumAdjustMode").checked
        ? "Rum: Adjust mode ON — engine can increase L350 to hit Target ABV (never decreases)."
        : "Rum: Target ABV ignored by default (rule). Enable adjust mode to increase L350.";
    }
  }

  function applyTankWorkingFill(){
    var defs = window.MASH_DEFS;
    var t = defs.TANKS.filter(function(x){ return x.id === $("tankSelect").value; })[0];
    if (t) $("fillGal").value = t.workingFillGal;
  }

  function setStatus(msg){
    $("scenarioStatus").textContent = msg || "";
  }

  function refreshScenarioList(){
    var sel = $("savedScenarioSelect");
    sel.innerHTML = "";
    var items = window.MASH_STORAGE.list();
    sel.appendChild(new Option(items.length ? "Select a saved scenario…" : "(none saved yet)", ""));
    items.forEach(function(s){
      var label = (s.name || "(unnamed)") + " — " + new Date(s.savedAt).toLocaleString();
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
    setEngineStamp();

    var b = res.baseline;
    var s = res.scenario;
    var g = res.guidance;

    // Baseline
    var baselineLines = [];
    baselineLines.push(kv("Wash ABV", fmt(b.washAbvPct,1) + " %"));
    baselineLines.push(kv("Pure Alcohol", fmt(b.pureAlcoholGal,2) + " gal"));

    if (b.kind === "moonshine"){
      baselineLines.push(kv("Corn", fmt(b.ingredients.cornLb,1) + " lb"));
      baselineLines.push(kv("Malted barley", fmt(b.ingredients.maltLb,1) + " lb"));
      baselineLines.push(kv("Sugar", fmt(b.ingredients.sugarLb,1) + " lb"));
    } else {
      baselineLines.push(kv("L350", fmt(b.ingredients.l350Gal,2) + " gal"));
      baselineLines.push(kv("Molasses", fmt(b.ingredients.molassesGal,2) + " gal"));
    }

    baselineLines.push(
      '<div class="small">' +
      '<b>Yeast:</b> ' + fmt(g.yeastG,0) + ' g (recommended)<br>' +
      '<b>Nutrients:</b> ' + fmt(g.nutrientsG,0) + ' g<br>' +
      '<b>Target pH:</b> ' + g.targetPhRange + ' (nominal ' + fmt(g.targetPhNominal,1) + ')' +
      '</div>'
    );

    $("baselineBlock").innerHTML = baselineLines.join("");

    // Scenario
    var scenarioLines = [];
    scenarioLines.push(kv("Scenario Target ABV", fmt(res.input.targetAbvPct,1) + " %"));
    scenarioLines.push(kv("Projected Wash ABV", fmt(s.washAbvPct,1) + " %"));
    scenarioLines.push(kv("Projected Pure Alcohol", fmt(s.pureAlcoholGal,2) + " gal"));
    scenarioLines.push(kv("Δ Pure Alcohol", fmt(s.pureAlcoholGal - b.pureAlcoholGal,2) + " gal"));

    if (s.kind === "moonshine"){
      scenarioLines.push(kv("Sugar (projected)", fmt(s.ingredients.sugarLb,1) + " lb"));
      scenarioLines.push(kv("Δ Sugar", fmt(s.deltas.sugarLb,1) + ' lb <span class="badge">increase-only</span>'));
    } else {
      scenarioLines.push(kv("L350 (projected)", fmt(s.ingredients.l350Gal,2) + " gal"));
      scenarioLines.push(kv("Δ L350", fmt(s.deltas.l350Gal,2) + ' gal <span class="badge">increase-only</span>'));
      scenarioLines.push(kv("Molasses", fmt(s.ingredients.molassesGal,2) + " gal"));
    }

    if (s.notes && s.notes.length){
      scenarioLines.push('<div class="small">' + s.notes.map(function(x){ return "• " + x; }).join("<br>") + "</div>");
    }

    $("scenarioBlock").innerHTML = scenarioLines.join("");

    // Strip
    var st = res.strip;
    var stripLines = [];
    stripLines.push(kv("Still", res.still.name));
    stripLines.push(kv("Planned charge", fmt(st.plannedCharge,2) + " gal"));
    stripLines.push(kv("Charge used", fmt(st.chargeUsed,2) + ' gal <span class="badge">charge-based</span>'));
    stripLines.push(kv("Wash ABV (scenario)", fmt(st.washAbvPct,1) + " %"));
    stripLines.push(kv("Ethanol in charge (theoretical)", fmt(st.ethanolInChargeTheo,2) + " gal"));
    stripLines.push(kv("Strip recovery efficiency", fmt(st.stripRecoveryEff * 100,0) + " %"));
    stripLines.push(kv("Ethanol recovered (estimated)", fmt(st.ethanolRecovered,2) + " gal"));
    stripLines.push(kv("Low wines (no cuts)", fmt(st.lowWinesGal,2) + " gal @ " + fmt(st.lowWinesAbvPct,1) + "%"));

    $("stripBlock").innerHTML = stripLines.join("");

    // Rules
    var ruleLines = window.MASH_RULES.ruleNotesFor(res.recipe.kind, res.input.rumAdjustMode);
    $("ruleNotes").innerHTML = ruleLines.map(function(x){ return "<div>• " + x + "</div>"; }).join("");
  }

  function recalc(){
    clearFatal();
    setEngineStamp();
    setTargetHint();

    try{
      var res = window.MASH_ENGINE.computeBatch(currentInputs());
      render(res);
    }catch(err){
      setFatal("Mash Builder error:\n" + (err && err.stack ? err.stack : String(err)));
    }
  }

  function saveScenario(){
    var name = ($("scenarioName").value || "").trim() || "Unnamed scenario";
    var inputs = currentInputs();
    var snapshot = window.MASH_ENGINE.computeBatch(inputs);

    var record = {
      name: name,
      inputs: inputs,
      snapshot: snapshot,
      savedAt: Date.now()
    };

    var saved = window.MASH_STORAGE.save(record);
    refreshScenarioList();
    $("savedScenarioSelect").value = saved.id;
    setStatus("Saved: " + saved.name);
  }

  function loadScenario(){
    var id = $("savedScenarioSelect").value;
    if (!id) return;

    var rec = window.MASH_STORAGE.get(id);
    if (!rec) return;

    $("mashSelect").value = rec.inputs.mashId;
    $("fillGal").value = rec.inputs.fillGal;
    $("targetAbv").value = rec.inputs.targetAbvPct;
    $("stillSelect").value = rec.inputs.stillId;
    $("stripProof").value = rec.inputs.stripLowWinesAbvPct;
    $("chargeFillPct").value = rec.inputs.chargeFillPct;
    $("rumAdjustMode").checked = !!rec.inputs.rumAdjustMode;

    $("scenarioName").value = rec.name || "";
    setStatus("Loaded: " + rec.name);
    recalc();
  }

  function deleteScenario(){
    var id = $("savedScenarioSelect").value;
    if (!id) return;
    window.MASH_STORAGE.remove(id);
    refreshScenarioList();
    $("scenarioName").value = "";
    setStatus("Deleted scenario.");
  }

  function exportScenario(){
    var name = ($("scenarioName").value || "").trim() || "scenario";
    var data = {
      name: name,
      exportedAt: new Date().toISOString(),
      inputs: currentInputs(),
      snapshot: window.MASH_ENGINE.computeBatch(currentInputs())
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name.replace(/[^\w\-]+/g,"_") + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setStatus("Exported JSON.");
  }

  function wire(){
    $("btnRecalc").onclick = recalc;
    $("btnReset").onclick = function(){ applyDefaults(); recalc(); };

    $("mashSelect").addEventListener("change", function(){ setTargetHint(); recalc(); });
    $("tankSelect").addEventListener("change", function(){ applyTankWorkingFill(); recalc(); });
    $("stillSelect").addEventListener("change", recalc);

    ["fillGal","targetAbv","stripProof","chargeFillPct"].forEach(function(id){
      $(id).addEventListener("input", recalc);
    });

    $("rumAdjustMode").addEventListener("change", function(){ setTargetHint(); recalc(); });

    $("btnSaveScenario").onclick = saveScenario;
    $("btnLoadScenario").onclick = loadScenario;
    $("btnDeleteScenario").onclick = deleteScenario;
    $("btnExportScenario").onclick = exportScenario;
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
      setFatal("Mash Builder failed to initialize:\n" + (err && err.stack ? err.stack : String(err)));
    }
  }

  window.addEventListener("DOMContentLoaded", init);

})();
