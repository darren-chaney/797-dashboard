/* ============================================================
   mash-log.js
   Phase 1 Mash Log — standalone, read-only
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
      meta,
      entries: [] // Phase 2 will append here
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

})();
