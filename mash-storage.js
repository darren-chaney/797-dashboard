/* ============================================================
   mash-storage.js
   Scenario persistence (localStorage) — no modules/exports
   ============================================================ */

(function(){
  const KEY = "mash_scenarios_v1";

  function _read(){
    try{
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    }catch(_e){
      return [];
    }
  }

  function _write(arr){
    localStorage.setItem(KEY, JSON.stringify(arr));
  }

  function list(){
    return _read()
      .sort((a,b)=> (b.savedAt||0) - (a.savedAt||0));
  }

  function save(s){
    const arr = _read();
    const id = s.id || ("scn_" + Date.now() + "_" + Math.random().toString(16).slice(2));
    const saved = { ...s, id, savedAt: Date.now() };

    const idx = arr.findIndex(x => x.id === id);
    if (idx >= 0) arr[idx] = saved;
    else arr.push(saved);

    _write(arr);
    return saved;
  }

  function remove(id){
    const arr = _read().filter(x => x.id !== id);
    _write(arr);
    return true;
  }

  function get(id){
    return _read().find(x => x.id === id) || null;
  }

  window.MASH_STORAGE = { list, save, remove, get };
})();
