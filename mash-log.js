/* ============================================================
   mash-log.js — FINAL (GET ONLY, CROSS-DEVICE)
   ============================================================ */

(function(){

  /* ============================================================
     CONFIG
     ============================================================ */
  const API_URL =
    "https://script.google.com/macros/s/AKfycbzKoSaK8srIvqeBj1y2N-5czcnYVnsxT9zy3GsDzrYxnEaH-AQgCClNyoNBIiCqVWw/exec";

  /* ============================================================
     UTIL
     ============================================================ */
  function uid(prefix){
    return `${prefix}_${Date.now().toString(36)}`;
  }

  function call(action, payload = null){
    let url = `${API_URL}?action=${action}`;
    if (payload) {
      url += `&payload=${encodeURIComponent(JSON.stringify(payload))}`;
    }
    return fetch(url).then(r => r.json());
  }

  /* ============================================================
     PUBLIC API — REQUIRED BY MASH BUILDER / MASH LOG
     (Do not rename these)
     ============================================================ */

  // Create an in-memory mash log object
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

  // Persist mash log to Google Sheets
  window.saveMashLog = function(log){
    return call("createLog", log).then(() => log.log_id);
  };

  // Fetch all mash logs (for dropdown selector)
  window.getAllMashLogs = function(){
    return call("listLogs");
  };

  // Fetch one mash log + its entries
  window.getMashLog = function(logId){
    return call("getLog", { log_id: logId });
  };

  // Append a mash log entry
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

    return call("addEntry", entry);
  };

})();
