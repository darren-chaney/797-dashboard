/* ============================================================
   797 DISTILLERY — MASH STORAGE (localStorage)
   ============================================================ */

const LS_RUNS = "mash_runs_v1";
const LS_LOGS = "mash_logs_v1";

function readJSON(key, fallback){
  try{
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  }catch(e){
    return fallback;
  }
}

function writeJSON(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

export function saveMashRun(run){
  const arr = readJSON(LS_RUNS, []);
  arr.unshift({
    saved_at: new Date().toISOString(),
    run
  });
  writeJSON(LS_RUNS, arr);
}

export function saveMashLog(log){
  const arr = readJSON(LS_LOGS, []);
  arr.unshift(log);
  writeJSON(LS_LOGS, arr);
}

export function listMashRuns(){
  return readJSON(LS_RUNS, []);
}

export function listMashLogs(){
  return readJSON(LS_LOGS, []);
}
