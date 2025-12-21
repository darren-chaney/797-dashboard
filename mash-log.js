/* ============================================================
   mash-log.js — FINAL (GET ONLY, API-MATCHED)
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

  // Create in-memory log object
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

  // Save log (Sheets)
  window.saveMashLog = function(log){
    return call("createLog", {
      payload: JSON.stringify(log)
    }).then(() => log.log_id);
  };

  // Get all logs (dropdown)
  window.getAllMashLogs = function(){
    return call("listLogs");
  };

  // 🔧 FIXED: fetch single log correctly
  window.getMashLog = function(logId){
    return call("getLog", { log_id: logId });
  };

  // Add entry
  window.addMashLogEntry = function(logId, data){
    const entry = {
      entry_id: uid("entry"),
      log_id: logId,
      ph: data.ph ?? "",
      sg: data.sg ?? "",
      temp_f: data.temp ?? "",
      notes: data.notes ?? "",
      yn_product: data.yn_product ?? "",
      yn_amount: data.yn_amount ?? "",
      yn_unit: data.yn_unit ?? "",
      yn_type: data.yn_type ?? "",
      ph_action: data.ph_action ?? "",
      ph_product: data.ph_product ?? "",
      ph_amount: data.ph_amount ?? "",
      ph_unit: data.ph_unit ?? ""
    };

    return call("addEntry", {
      payload: JSON.stringify(entry)
    });
  };

})();
