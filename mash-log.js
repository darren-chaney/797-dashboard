/* ============================================================
   mash-log.js
   Google Sheets–backed Mash Logs (FINAL)
   ============================================================ */

(function(){

  const API_URL =
    "https://script.google.com/macros/s/AKfycbwj_zabLQh8nYUQwozds6rDY2yKgofgo2cQ6N6JrAs1H_jSJkkE4KqyiJlK5zjt8kus/exec";

  /* =========================
     Utilities
     ========================= */

  function uid(prefix){
    return prefix + "_" + Date.now().toString(36);
  }

  async function apiGet(params){
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}?${q}`);
    return res.json();
  }

  async function apiPost(payload){
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return res.json();
  }

  /* =========================
     Create Mash Log
     ========================= */
  window.createMashLog = function(meta){
    return {
      log_id: uid("log"),
      mash_name: meta.mashName,
      mode: meta.mode,
      fill_gal: meta.fillGal,
      mash_started_at: new Date(),
      mash_dumped_at: "",
      status: "active",
      sour_mash: meta.sourMash || false,
      sour_source_log_id: meta.sourSourceLogId || "",
      app_version: meta.appVersion || "",
      notes: meta.notes || ""
    };
  };

  /* =========================
     Save Mash Log
     ========================= */
  window.saveMashLog = async function(log){
    const res = await apiPost({
      action: "createLog",
      log
    });
    return res.log_id;
  };

  /* =========================
     Get ALL Mash Logs
     ========================= */
  window.getAllMashLogs = async function(){
    return apiGet({ action: "logs" });
  };

  /* =========================
     Get Single Mash Log
     ========================= */
  window.getMashLog = async function(logId){
    const logs = await apiGet({ action: "logs" });
    return logs.find(l => l.log_id === logId) || null;
  };

  /* =========================
     Get Entries for Mash Log
     ========================= */
  window.getMashLogEntries = async function(logId){
    return apiGet({
      action: "entries",
      log_id: logId
    });
  };

  /* =========================
     Add Mash Log Entry
     ========================= */
  window.addMashLogEntry = async function(logId, entry){
    const payload = {
      action: "addEntry",
      entry: {
        log_id: logId,
        ph: entry.ph,
        sg: entry.sg,
        temp_f: entry.temp,
        notes: entry.notes || "",

        yn_type: entry.additions?.yn?.type || "",
        yn_product: entry.additions?.yn?.product || "",
        yn_amount: entry.additions?.yn?.amount || "",
        yn_unit: entry.additions?.yn?.unit || "",

        ph_action: entry.additions?.ph?.direction || "",
        ph_product: entry.additions?.ph?.product || "",
        ph_amount: entry.additions?.ph?.amount || "",
        ph_unit: entry.additions?.ph?.unit || ""
      }
    };

    return apiPost(payload);
  };

})();
