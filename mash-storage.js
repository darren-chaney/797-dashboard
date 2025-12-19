/* ============================================================
   797 DISTILLERY — MASH STORAGE
   Save & reload mash bills (snapshots)
   ============================================================ */

(function(){
  const STORAGE_KEY = "mash_saved_bills_v1";

  function readAll(){
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function writeAll(list){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function uid(){
    return "mash_" + Date.now().toString(36);
  }

  /* =========================
     Save mash bill snapshot
     ========================= */
  window.saveMashBill = function(mash){
    const list = readAll();

    const record = {
      id: uid(),
      saved_at: new Date().toISOString(),
      mashId: mash.mashId,
      name: mash.name,
      mode: mash.mode,
      fillGal: mash.fillGal,
      targetABV: mash.abvAdjustment ? mash.totals.washABV_percent : null,
      data: mash
    };

    list.unshift(record);
    writeAll(list);
    return record.id;
  };

  /* =========================
     Load list (for dropdown)
     ========================= */
  window.loadMashBills = function(){
    return readAll();
  };

  /* =========================
     Get single bill
     ========================= */
  window.getMashBill = function(id){
    return readAll().find(b => b.id === id) || null;
  };
})();
