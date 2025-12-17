/* ============================================================
   797 DISTILLERY — MASH STORAGE
   localStorage persistence ONLY
   ============================================================ */

const LS_MASH_RUNS_KEY = "797_mash_runs_v1";
const LS_MASH_LOGS_KEY = "797_mash_logs_v1";

/* =========================
   INTERNAL HELPERS
   ========================= */
function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* =========================
   MASH RUNS
   ========================= */
export function getMashRuns() {
  return read(LS_MASH_RUNS_KEY);
}

export function saveMashRun(mashRun) {
  const runs = read(LS_MASH_RUNS_KEY);
  runs.push({
    ...mashRun,
    saved_at: new Date().toISOString()
  });
  write(LS_MASH_RUNS_KEY, runs);
}

export function getMashRunById(id) {
  return read(LS_MASH_RUNS_KEY).find(r => r.mashId === id);
}

/* =========================
   MASH LOGS
   ========================= */
export function getMashLogs() {
  return read(LS_MASH_LOGS_KEY);
}

export function saveMashLog(log) {
  const logs = read(LS_MASH_LOGS_KEY);
  logs.push(log);
  write(LS_MASH_LOGS_KEY, logs);
}

export function updateMashLog(updatedLog) {
  const logs = read(LS_MASH_LOGS_KEY).map(log =>
    log.meta.created_at === updatedLog.meta.created_at ? updatedLog : log
  );
  write(LS_MASH_LOGS_KEY, logs);
}

/* =========================
   CLEAR (DEV / RESET ONLY)
   ========================= */
export function clearAllMashData() {
  localStorage.removeItem(LS_MASH_RUNS_KEY);
  localStorage.removeItem(LS_MASH_LOGS_KEY);
}

/* =========================
   END OF STORAGE
   ========================= */

