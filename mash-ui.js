/* ============================================================
   mash-ui.js — SCENARIO BASELINE UI (MATCHES GRID + SCENARIOS)
   - Compatible with baseline HTML you confirmed
   - Uses baselineBlock / scenarioBlock / stripBlock
   - Uses rumAdjustMode (NOT lockToRecipe)
   - Supports scenario save/load/export
   ============================================================ */

(function(){

  const UI_VERSION = "mash-ui scenario-baseline v1.0.0";
  const $ = (id) => document.getElementById(id);

  /* ---------- helpers ---------- */

  function fmt(v, d=2){
    if (!isFinite(v)) return "—";
    const p = Math.pow(10, d);
    const r = Math.round((v + Number.EPSILON) * p) / p;
    return r.toLocaleString(undefined,{
      minimumFractionDigits:d,
      maximumFractionDigits:d
    });
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

  function setEngineStamp(extra=""){
    const stamp = $("engineStamp");
    if (!stamp) return;

    const ev =
      (window.MASH_ENGINE && window.MASH_ENGINE.ENGINE_VERSION)
        ? window.MASH_ENGINE.ENGINE_VERSION
        : "MISSING";

    stamp.textContent =
      "ENGINE VERSION: " + ev + (extra ? "  |  UI: " + UI_VERSION : "");
  }

  /* ---------- populate + defaults ---------- */

  function populate(){
    const defs = window.MASH_DEFS;
    if (!defs) throw new Error("MASH_DEFS missing");

    const mashSel  = $("mashSelect");
    const tankSel  = $("tankSelect");
    const stillSel = $("stillSelect");

    mashSel.innerHTML = "";
    Object.values(defs.RECIPES).forEach(r=>{
      mashSel.appendChild(new Option(r.label, r.id));
    });

    tankSel.innerHTML = "";
    defs.TANKS.forEach(t=>{
      tankSel.appendChild(new Option(t.name, t.id));
    });

    stillSel.innerHTML = "";
    defs.STILLS.forEach(s=>{
      stillSel.appendChild(new Option(s.name, s.id));
    });
  }

  function applyDefaults(){
    const d = window.MASH_DEFS.DEFAULTS;

    $("mashSelect").value  = d.mashId;
    $("tankSelect").value  = d.tankId;
    $("stillSelect").value = d.stillId;

    $("fillGal").value        = d.fillGal;
    $("targetAbv").value      = d.targetWashAbvPct;
    $("stripProof").value     = d.stripLowWinesAbvPct;
    $("chargeFillPct").value  = d.chargeFillPct;
    $("rumAdjustMode").checked = !!d.rumAdjustMode;

    updateTargetHint();
    refreshScenarioList();
    $("scenarioName").value = "";
    setStatus("");
  }

  function updateTargetHint(){
    const r = window.MASH_DEFS.RECIPES[$("mashSelect").value];
    const h = $("targetHint");
    if (!h) return;

    if (r.kind === "rum"){
      h.textContent = $("rumAdjustMode").checked
        ? "Rum: Adjust mode ON — L350 may increase only (never decrease)."
        : "Rum: Target ABV ignored by default (rule).";
    } else {
      h.textContent =
        "Moonshine: raising Target ABV increases sugar only (never decreases).";
    }
  }

  function applyTankWorkingFill(){
    const tankId = $("tankSelect").value;
    const t = window.MASH_DEFS.TANKS.find(x=>x.id===tankId);
    if (t) $("fillGal").value = t.workingFillGal;
  }

  /* ---------- scenarios ---------- */

  function refreshScenarioList(){
    const sel = $("savedScenarioSelect");
    sel.innerHTML = "";
    const list = window.MASH_STORAGE.list();

    sel.appendChild(new Option(
      list.length ? "Select saved scenario…" : "(none saved)",
      ""
    ));

    list.forEach(s=>{
      const label =
        (s.name || "Unnamed") +
        " — " +
        new Date(s.savedAt).toLocaleString();
      sel.appendChild(new Option(label, s.id));
    });
  }

  function setStatus(msg){
    $("scenarioStatus").textContent = msg || "";
  }

  /* ---------- inputs ---------- */

  function readInputs(){
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

  /* ---------- render ---------- */

  function render(res){
    setEngineStamp(true);

    const b = res.baseline;
    const s = res.scenario;
    const g = res.guidance;

    /* baseline */
    let baseHTML = "";
    baseHTML += kv("Wash ABV", fmt(b.washAbvPct,1) + " %");
    baseHTML += kv("Pure Alcohol", fmt(b.pureAlcoholGal,2) + " gal");

    if (b.kind === "moonshine"){
      baseHTML += kv("Corn", fmt(b.ingredients.cornLb,1) + " lb");
      baseHTML += kv("Malted barley", fmt(b.ingredients.maltLb,1) + " lb");
      baseHTML += kv("Sugar", fmt(b.ingredients.sugarLb,1) + " lb");
    } else {
      baseHTML += kv("L350", fmt(b.ingredients.l350Gal,2) + " gal");
      baseHTML += kv("Molasses", fmt(b.ingredients.molassesGal,2) + " gal");
    }

    baseHTML += `
      <div class="small">
        <b>Yeast:</b> ${fmt(g.yeastG,0)} g<br>
        <b>Nutrients:</b> ${fmt(g.nutrientsG,0)} g<br>
        <b>Target pH:</b> ${g.targetPhRange} (nom ${fmt(g.targetPhNominal,1)})
      </div>
    `;

    $("baselineBlock").innerHTML = baseHTML;

    /* scenario */
    let scenHTML = "";
    scenHTML += kv("Scenario Target ABV", fmt(res.input.targetAbvPct,1) + " %");
    scenHTML += kv("Projected Wash ABV", fmt(s.washAbvPct,1) + " %");
    scenHTML += kv("Projected Pure Alcohol", fmt(s.pureAlcoholGal,2) + " gal");
    scenHTML += kv(
      "Δ Pure Alcohol",
      fmt(s.pureAlcoholGal - b.pureAlcoholGal,2) + " gal"
    );

    if (s.kind === "moonshine"){
      scenHTML += kv("Sugar (projected)", fmt(s.ingredients.sugarLb,1) + " lb");
      scenHTML += kv(
        "Δ Sugar",
        fmt(s.deltas.sugarLb,1) + " lb"
      );
    } else {
      scenHTML += kv("L350 (projected)", fmt(s.ingredients.l350Gal,2) + " gal");
      scenHTML += kv(
        "Δ L350",
        fmt(s.deltas.l350Gal,2) + " gal"
      );
    }

    $("scenarioBlock").innerHTML = scenHTML;

    /* strip */
    const st = res.strip;
    let stripHTML = "";
    stripHTML += kv("Still", res.still.name);
    stripHTML += kv("Planned charge", fmt(st.plannedCharge,2) + " gal");
    stripHTML += kv(
      "Charge used",
      fmt(st.chargeUsed,2) + " gal (charge-based)"
    );
    stripHTML += kv(
      "Low wines (NO CUTS)",
      fmt(st.lowWinesGal,2) + " gal @ " + fmt(st.lowWinesAbvPct,1) + "%"
    );

    $("stripBlock").innerHTML = stripHTML;

    /* rules */
    const notes = window.MASH_RULES.ruleNotesFor(
      res.recipe.kind,
      res.input.rumAdjustMode
    );
    $("ruleBlock").style.display = "";
    $("ruleNotes").innerHTML =
      notes.map(x=>`<div>• ${x}</div>`).join("");
  }

  /* ---------- compute ---------- */

  function recalc(){
    clearFatal();
    updateTargetHint();

    try{
      const input = readInputs();
      const res = window.MASH_ENGINE.computeBatch(input);
      render(res);
    }catch(err){
      setFatal(
        "Mash Builder error:\n" +
        (err && err.stack ? err.stack : String(err))
      );
    }
  }

  /* ---------- wire ---------- */

  function wire(){
    $("btnRecalc").onclick = recalc;
    $("btnReset").onclick = ()=>{ applyDefaults(); recalc(); };

    $("mashSelect").addEventListener("change", recalc);
    $("tankSelect").addEventListener("change", ()=>{ applyTankWorkingFill(); recalc(); });
    $("stillSelect").addEventListener("change", recalc);

    ["fillGal","targetAbv","stripProof","chargeFillPct"]
      .forEach(id=>$(id).addEventListener("input", recalc));

    $("rumAdjustMode").addEventListener("change", recalc);

    $("btnSaveScenario").onclick = ()=>{
      const name = ($("scenarioName").value || "").trim() || "Unnamed scenario";
      const snap = window.MASH_ENGINE.computeBatch(readInputs());
      window.MASH_STORAGE.save({
        name,
        inputs: readInputs(),
        snapshot: snap,
        savedAt: Date.now()
      });
      refreshScenarioList();
      setStatus("Scenario saved.");
    };

    $("btnLoadScenario").onclick = ()=>{
      const id = $("savedScenarioSelect").value;
      if (!id) return;
      const rec = window.MASH_STORAGE.get(id);
      if (!rec) return;

      $("mashSelect").value = rec.inputs.mashId;
      $("fillGal").value = rec.inputs.fillGal;
      $("targetAbv").value = rec.inputs.targetAbvPct;
      $("stillSelect").value = rec.inputs.stillId;
      $("stripProof").value = rec.inputs.stripLowWinesAbvPct;
      $("chargeFillPct").value = rec.inputs.chargeFillPct;
      $("rumAdjustMode").checked = !!rec.inputs.rumAdjustMode;
      $("scenarioName").value = rec.name || "";

      recalc();
      setStatus("Scenario loaded.");
    };

    $("btnDeleteScenario").onclick = ()=>{
      const id = $("savedScenarioSelect").value;
      if (!id) return;
      window.MASH_STORAGE.remove(id);
      refreshScenarioList();
      setStatus("Scenario deleted.");
    };

    $("btnExportScenario").onclick = ()=>{
      const data = window.MASH_ENGINE.computeBatch(readInputs());
      const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "mash-scenario.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setStatus("Scenario exported.");
    };
  }

  /* ---------- init ---------- */

  function init(){
    try{
      setEngineStamp();
      if (!window.MASH_DEFS) throw new Error("MASH_DEFS missing");
      if (!window.MASH_ENGINE) throw new Error("MASH_ENGINE missing");
      if (!window.MASH_RULES) throw new Error("MASH_RULES missing");
      if (!window.MASH_STORAGE) throw new Error("MASH_STORAGE missing");

      populate();
      applyDefaults();
      wire();
      recalc();
    }catch(err){
      setEngineStamp();
      setFatal(
        "Mash Builder failed to initialize:\n" +
        (err && err.stack ? err.stack : String(err))
      );
    }
  }

  window.addEventListener("DOMContentLoaded", init);
})();
