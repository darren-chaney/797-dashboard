/* ============================================================
   mash-storage.js (ES5) — Scenario storage in localStorage
   NO exports. NO modules.
   ============================================================ */

(function(){
  var KEY = "mash_scenarios_v1";

  function readAll(){
    try{
      var raw = localStorage.getItem(KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    }catch(e){
      return [];
    }
  }

  function writeAll(arr){
    localStorage.setItem(KEY, JSON.stringify(arr));
  }

  function uid(){
    return "sc_" + Math.random().toString(36).slice(2) + "_" + Date.now();
  }

  function list(){
    var arr = readAll();
    // newest first
    arr.sort(function(a,b){ return (b.savedAt||0) - (a.savedAt||0); });
    return arr.map(function(x){
      return { id:x.id, name:x.name, savedAt:x.savedAt };
    });
  }

  function get(id){
    var arr = readAll();
    for (var i=0;i<arr.length;i++){
      if (arr[i].id === id) return arr[i];
    }
    return null;
  }

  function save(record){
    var arr = readAll();
    var rec = record || {};
    if (!rec.id) rec.id = uid();
    if (!rec.savedAt) rec.savedAt = Date.now();

    // upsert
    var replaced = false;
    for (var i=0;i<arr.length;i++){
      if (arr[i].id === rec.id){
        arr[i] = rec;
        replaced = true;
        break;
      }
    }
    if (!replaced) arr.push(rec);

    writeAll(arr);
    return { id: rec.id, name: rec.name, savedAt: rec.savedAt };
  }

  function remove(id){
    var arr = readAll();
    arr = arr.filter(function(x){ return x.id !== id; });
    writeAll(arr);
  }

  window.MASH_STORAGE = { list:list, get:get, save:save, remove:remove };
})();
