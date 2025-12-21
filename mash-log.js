/* ============================================================
   mash-log.js
   Phase 2 Mash Log — append-only entries
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
     ========================= */
  window.createMashLog = function(meta){
    return {
      id: uid(),
      created_at: new Date().toISOString(),
      meta: {
        ...meta,
        logVersion: "1.0"
      },
      entries: []
    };
  };

  /* =========================
     Save Mash Log
     ========================= */
  window.saveMashLog = function(log){
    const logs = readLogs();
    logs.unshift(log);
    writeLogs(logs);
    return log.id;
  };

  /* =========================
     Get Mash Log
     ========================= */
  window.getMashLog = function(id){
    return readLogs().find(l => l.id === id) || null;
  };

  /* =========================
     Add Mash Log Entry
     ========================= */
  window.addMashLogEntry = function(logId, entry){
    const logs = readLogs();
    const idx = logs.findIndex(l => l.id === logId);
    if (idx === -1) return null;

    const log = logs[idx];

    // Normalize entry (append-only journal)
    const cleanEntry = {
      ts: new Date().toISOString(),
      ph: entry.ph ?? null,
      sg: entry.sg ?? null,
      temp: entry.temp ?? null,
      notes: entry.notes ?? "",
      additions: entry.additions && Object.keys(entry.additions).length
        ? entry.additions
        : null
    };

    log.entries.push(cleanEntry);

    logs[idx] = log;
    writeLogs(logs);

    return cleanEntry;
  };

})();
