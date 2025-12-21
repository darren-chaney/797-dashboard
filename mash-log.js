/* ============================================================
   mash-log.js — FINAL (GET ONLY, API-MATCHED, DEFENSIVE)
   ============================================================ */

(function(){

  const API_URL =
    "https://script.google.com/macros/s/AKfycbzKoSaK8srIvqeBj1y2N-5czcnYVnsxT9zy3GsDzrYxnEaH-AQgCClNyoNBIiCqVWw/exec";

  /* =========================
     UTIL
     ========================= */
  function uid(prefix){
    return `${prefix}_${Date.now().toString(36)}`;
  }

  function call(action, params = {}){
    const qs = new URLSearchParams({ action });

    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null) {
        qs.append(k, params[k]);
      }
    });

    return fetch(`${API_URL}?${qs.toString()}`)
      .then(r => r.json());
  }

  /* ============================================================
     PUBLIC API — REQUIRED BY MASH BUILDER / MASH LOG
     ============================================================ */

  window.createMashLog = function(meta){
    return {
      log_id: uid("log"),
      mash_name: meta.mashName || "Unnamed Mash",
      mode: meta.mode || "",
      fill_gal: meta.fillGal || "",
      mash_started_at: new Date().toISOString(),
      mash_dumped_at: "",
      sour_mash: false,
      sour_source_log_id: "",
      app_version: "mash-builder",
      notes: ""
    };
  };

  window.saveMashLog = function(log){
    return call("createLog", {
      payload: JSON.stringify(log)
    }).then(() => log.log_id);
  };

  window.getAllMashLogs = function(){
    return call("listLogs");
  };

  window.getMashLog = function(logId){
    return call("getLog", { log_id: logId });
  };

  window.getMashLogEntries = function(logId){
    return call("getLog", { log_id: logId })
      .then(log => log && log.entries ? log.entries : []);
  };

  /* =========================
     ENTRY SAVE (FIXED)
     ========================= */
  window.addMashLogEntry = function(logId, data){
    const entry = {
      entry_id: uid("entry"),
      log_id: logId,

      // core readings
      ph: data.ph ?? "",
      sg: data.sg ?? "",
      temp_f: data.temp ?? data.temp_f ?? "",
      notes: data.notes ?? "",

      // yeast / nutrient (defensive)
      yn_type: data.yn_type ?? data.ynType ?? "",
      yn_product: data.yn_product ?? data.ynProduct ?? "",
      yn_amount: data.yn_amount ?? data.ynAmount ?? "",
      yn_unit: data.yn_unit ?? data.ynUnit ?? "",

      // pH adjustment (defensive)
      ph_action: data.ph_action ?? data.phAction ?? "",
      ph_product: data.ph_product ?? data.phProduct ?? "",
      ph_amount: data.ph_amount ?? data.phAmount ?? "",
      ph_unit: data.ph_unit ?? data.phUnit ?? ""
    };

    return call("addEntry", {
      payload: JSON.stringify(entry)
    });
  };

})();
