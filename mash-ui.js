(function(){

  var UI_VERSION = "mash-ui v2.2.0 (restore-layout)";

  function $(id){ return document.getElementById(id); }

  function fmt(v, d){
    d = (d === undefined) ? 2 : d;
    if (!isFinite(v)) return "—";
    var p = Math.pow(10, d);
    var r = Math.round((v + 1e-12) * p) / p;
    return r.toLocaleString(undefined, { minimumFractionDigits:d, maximumFractionDigits:d });
  }

  function kv(k, v){
    return '<div class="kv"><div class="k">'+k+'</div><div class="v">'+v+'</div></div>';
  }

  function fatal(msg){
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
    var ev = (window.MASH_ENGINE && window.MASH_ENGINE.ENGINE_VERSION) ? window.MASH_ENGINE.ENGINE_VERSION : "MISSING";
    $("engineStamp").textContent = "ENGINE VERSION: " + ev + "   |   UI: " + UI_VERSION;
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
    $("rumAdjustMode").checked = !!d.rumAdjustMode;

    updateHint();
  }

  function updateHint(){
    var defs = window.MASH_DEFS;
    var r = defs.RECIPES[$("mashSelect").value];
    var hint = $("targetHint");
    if (!hint) return;

    if (r.kind === "moonshine"){
      hint.textContent = "Moonshine: raising Target ABV increases sugar only (never decreases). Grain stays fixed.";
    } else {
      hint.textContent = $("rumAdjustMode").checked
        ? "Rum: adjust mode ON — engine can increase L350 only (never decreases)."
        : "Rum: Target ABV ignored by default (rule).";
    }
  }

  function applyTankFill(){
    var defs = window.MASH_DEFS;
    var t = defs.TANKS.filter(function(x){ return x.id === $("tankSelect").value; })[0];
    if (t) $("fillGal").value = t.workingFillGal;
  }

  function inputs(){
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
    // Baseline
    var b = res.baseline;
    var g = res.guidance;
    var baseline = "";

    baseline += kv("Wash ABV", fmt(b.washAbvPct,1) + " %");
    baseline += kv("Pure Alcohol", fmt(b.pureAlcoholGal,2) + " gal");

    if (b.kind === "moonshine"){
      baseline += kv("Corn", fmt(b.ingredients.cornLb,1) + " lb");
      baseline += kv("Malted barley", fmt(b.ingredients.maltLb,1) + " lb");
      baseline += kv("Sugar", fmt(b.ingredients.sugarLb,1) + " lb");
    } else {
      baseline += kv("L350", fmt(b.ingredients.l350Gal,2) + " gal");
      baseline += kv("Molasses", fmt(b.ingredients.molassesGal,2) + " gal");
    }

    baseline += '<div class="small"><b>Yeast:</b> ' + fmt(g.yeastG,0) + ' g (recommended)<br>' +
                '<b>Nutrients:</b> ' + fmt(g.nutrientsG,0) + ' g<br>' +
                '<b>Target pH:</b> ' + g.targetPhRange + ' (nominal ' + fmt(g.targetPhNominal,1) + ')</div>';

    $("baselineBlock").innerHTML = baseline;

    // Scenario
    var s = res.scenario;
    var scenario = "";
    scenario += kv("Scenario Target ABV", fmt(res.input.targetAbvPct,1) + " %");
    scenario += kv("Projected Wash ABV", fmt(s.washAbvPct,1) + " %");
    scenario += kv("Projected Pure Alcohol", fmt(s.pureAlcoholGal,2) + " gal");
    scenario += kv("Δ Pure Alcohol", fmt(s.pureAlcoholGal - b.pureAlcoholGal,2) + " gal");

    if (s.kind === "moonshine"){
      scenario += kv("Sugar (projected)", fmt(s.ingredients.sugarLb,1) + " lb");
      scenario += kv("Δ Sugar", fmt(s.deltas.sugarLb,1) + ' lb <span class="badge">increase-only</span>');
    } else {
      scenario += kv("L350 (projected)", fmt(s.ingredients.l350Gal,2) + " gal");
      scenario += kv("Δ L350", fmt(s.deltas.l350Gal,2) + ' gal <span class="badge">increase-only</span>');
      scenario += kv("Molasses", fmt(s.ingredients.molassesGal,2) + " gal");
    }

    if (s.notes && s.notes.length){
      scenario += '<div class="small">' + s.notes.map(function(x){ return "• " + x; }).join("<br>") + "</div>";
    }

    $("scenarioBlock").innerHTML = scenario;

    // Strip
    var st = res.strip;
    var strip = "";
    strip += kv("Still", res.still.name);
    strip += kv("Planned charge", fmt(st.plannedCharge,2) + " gal");
    strip += kv("Charge used", fmt(st.chargeUsed,2) + ' gal <span class="badge">charge-based</span>');
    strip += kv("Wash ABV (scenario)", fmt(st.washAbvPct,1) + " %");
    strip += kv("Ethanol in charge (theoretical)", fmt(st.ethanolInChargeTheo,2) + " gal");
    strip += kv("Strip recovery efficiency", fmt(st.stripRecoveryEff * 100,0) + " %");
    strip += kv("Ethanol recovered (estimated)", fmt(st.ethanolRecovered,2) + " gal");
    strip += kv("Low wines (no cuts)", fmt(st.lowWinesGal,2) + " gal @ " + fmt(st.lowWinesAbvPct,1) + "%");

    $("stripBlock").innerHTML = strip;

    // Rules
    var notes = window.MASH_RULES.ruleNotesFor(res.recipe.kind, res.input.rumAdjustMode);
    $("ruleNotes").innerHTML = notes.map(function(x){ return "<div>• " + x + "</div>"; }).join("");
  }

  function recalc(){
    clearFatal();
    setEngineStamp();
    updateHint();

    try{
      var res = window.MASH_ENGINE.computeBatch(inputs());
      render(res);
    }catch(e){
      fatal("Mash Builder error:\n" + (e && e.stack ? e.stack : String(e)));
    }
  }

  function wire(){
    $("btnRecalc").onclick = recalc;
    $("btnReset").onclick = function(){ applyDefaults(); recalc(); };

    $("mashSelect").addEventListener("change", function(){ updateHint(); recalc(); });
    $("tankSelect").addEventListener("change", function(){ applyTankFill(); recalc(); });
    $("stillSelect").addEventListener("change", recalc);

    ["fillGal","targetAbv","stripProof","chargeFillPct"].forEach(function(id){
      $(id).addEventListener("input", recalc);
    });

    $("rumAdjustMode").addEventListener("change", function(){ updateHint(); recalc(); });
  }

  function init(){
    setEngineStamp();

    try{
      if (!window.MASH_DEFS) throw new Error("MASH_DEFS missing");
      if (!window.MASH_RULES) throw new Error("MASH_RULES missing");
      if (!window.MASH_ENGINE) throw new Error("MASH_ENGINE missing");

      populate();
      applyDefaults();
      wire();
      recalc();
    }catch(e){
      fatal("Mash Builder failed to initialize:\n" + (e && e.stack ? e.stack : String(e)));
    }
  }

  window.addEventListener("DOMContentLoaded", init);

})();
