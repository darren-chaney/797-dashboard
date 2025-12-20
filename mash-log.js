/* ============================================================
   mash-log.js
   SAFE stub — global, non-module
   Provides compatibility functions for UI
   ============================================================ */

(function(){

  /* =====================================
     Internal log store (stub)
     ===================================== */
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

  /* =====================================
     Existing namespace (kept)
     ===================================== */
  window.MASH_LOG = {
    start: function(){},
    add: function(){}
  };

  /* =====================================
     REQUIRED UI COMPATIBILITY FUNCTIONS
     ===================================== */

  /**
   * Create a mash log snapshot (immutable record)
   */
  window.createMashLog = function(meta){
    return {
      id: uid(),
      created_at: new Date().toISOString(),
      meta,
      notes: []
    };
  };

  /**
   * Save mash log
   */
  window.saveMashLog = function(log){
    const logs = readLogs();
    logs.unshift(log);
    writeLogs(logs);
    return log.id;
  };

})();
