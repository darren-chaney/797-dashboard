/* ============================================================
   mash-log.js
   Google Sheets–backed Mash Logs (GET-only, CORS-safe)
   ============================================================ */

(function () {

  const API_URL =
    "https://script.google.com/macros/s/AKfycbwj_zabLQh8nYUQwozds6rDY2yKgofgo2cQ6N6JrAs1H_jSJkkE4KqyiJlK5zjt8kus/exec";

  /* =========================
     Utilities
     ========================= */

  function uid(prefix) {
    return prefix + "_" + Date.now().toString(36);
  }

  async function apiGet(params) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}?${query}`);
    return res.json();
  }

  function send(action, payload) {
    return apiGet({
      action,
      payload: JSON.stringify(payload)
    });
  }

  /* =========================
     Create Mash Log
     ========================= */

  window.createMashLog = function (meta) {
    return {
      log_id: uid("log"),
      mash_name: meta.mashName,
      mode: meta.mode,
      fill_gal: meta.fillGal,
      mash_started_at: new Date(),
      mash_dumped_at: "",
      status: "active",
      sour_mash: false,
      sour_source_log_id: "",
      app_version: "",
      notes: ""
    };
  };

  /* =========================
     Save Mash Log
     ========================= */

  window.saveMashLog = async function (log) {
    const res = await send("createLog", log);
    return res.log_id;
  };

  /* =========================
     Get All Mash Logs
     ========================= */

  window.getAllMashLogs = async function () {
    return apiGet({ action: "logs" });
  };

  /* =========================
     Get Single Mash Log
     ========================= */

  window.getMashLog = async function (logId) {
    const logs = await apiGet({ action: "logs" });
    return logs.find(l => l.log_id === logId) || null;
  };

  /* =========================
     Get Mash Log Entries
     ========================= */

  window.getMashLogEntries = async function (logId) {
    return apiGet({
      action: "entries",
      log_id: logId
    });
  };

  /* =========================
     Add Mash Log Entry
     ========================= */

  window.addMashLogEntry = async function (logId, entry) {
    return send("addEntry", {
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
    });
  };

})();
