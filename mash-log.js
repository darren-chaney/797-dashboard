/* ============================================================
   mash-log.js
   Phase 1 + Phase 2 Mash Log
   Phase 2: Entry system (pH / SG / Temp / Notes)
   ============================================================ */

(function(){

  const LOGS_KEY = "mash_logs_v1";

  function readLogs(){
    try {
      return JSON.parse(localStorage.getItem(LOGS_KEY)) || [];
    } catch {
      return [];
    }
  }

  function writeLogs(list){
    localStorage.setItem(LOGS_KEY, JSON.stringify(list));
  }

  function uid(){
    return "log_" + Date.now().toString(36);
  }

  /* =========================
     Create Mash Log
     (Phase 1 – unchanged)
     ========================= */
  window.createMashLog = function(meta){
    return {
      id: uid(),
      created_at: new Date().toISOString(),
      meta: meta || {},
      entries: [] // Phase 2 appends here
    };
  };

  /* =========================
     Save Mash Log
     (Phase 1 – unchanged)
     ========================= */
  window.saveMashLog = function(log){
    const logs = readLogs();
    logs.unshift(log);
    writeLogs(logs);
    return log.id;
  };

  /* =========================
     Get Mash Log
     (Phase 1 – unchanged)
     ========================= */
  window.getMashLog = function(id){
    return readLogs().find(l => l.id === id) || null;
  };

  /* ============================================================
     Phase 2 — INTERNAL UPDATE HELPER
     Safely updates an existing log in storage
     ============================================================ */
  function updateMashLog(updatedLog){
    const logs = readLogs();
    const idx = logs.findIndex(l => l.id === updatedLog.id);
    if (idx === -1) return false;
    logs[idx] = updatedLog;
    writeLogs(logs);
    return true;
  }

  /* ============================================================
     Phase 2 — ADD MASH LOG ENTRY (append-only)
     ============================================================ */
  window.addMashLogEntry = function(logId, data){
    const log = window.getMashLog(logId);
    if (!log) return null;

    // Ensure meta exists and is future-safe (non-breaking)
    log.meta = log.meta || {};
    if (!log.meta.logVersion) log.meta.logVersion = "1.0";
    if (!log.meta.appVersion) log.meta.appVersion = "unknown";

    const entry = {
      ts: new Date().toISOString(),
      ph: data?.ph ?? null,
      sg: data?.sg ?? null,
      temp: data?.temp ?? null,
      notes: data?.notes || ""
    };

    log.entries = log.entries || [];
    log.entries.push(entry);

    updateMashLog(log);
    return entry;
  };

})();
