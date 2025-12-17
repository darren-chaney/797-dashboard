/* ============================================================
   797 DISTILLERY — MASH LOG
   Production record keeping ONLY
   No calculations, no UI
   ============================================================ */

import {
  LOG_CHECKPOINTS,
  PH_TARGETS,
  PH_CORRECTION
} from "./mash-rules.js";

/* =========================
   CREATE LOG FROM MASH
   ========================= */
export function createMashLog({
  mashId,
  mashName,
  family,
  fillGal,
  fermentOnGrain
}) {
  const timestamp = new Date().toISOString();

  return {
    meta: {
      mashId,
      mashName,
      family,
      fillGal,
      fermentOnGrain,
      created_at: timestamp,
      locked: true
    },

    checkpoints: LOG_CHECKPOINTS.map(cp => ({
      checkpoint: cp,
      recorded_at: null,
      temperature_f: null,
      ph: null,
      sg: null,
      notes: ""
    })),

    ph_targets: family === "RUM"
      ? PH_TARGETS.RUM
      : PH_TARGETS.GRAIN,

    corrections: [],

    completed: false
  };
}

/* =========================
   RECORD CHECKPOINT DATA
   ========================= */
export function recordCheckpoint({
  log,
  checkpoint,
  temperature_f,
  ph,
  sg,
  notes = ""
}) {
  const entry = log.checkpoints.find(c => c.checkpoint === checkpoint);
  if (!entry) throw new Error("Invalid checkpoint");

  entry.recorded_at = new Date().toISOString();
  entry.temperature_f = temperature_f ?? entry.temperature_f;
  entry.ph = ph ?? entry.ph;
  entry.sg = sg ?? entry.sg;
  entry.notes = notes;

  return log;
}

/* =========================
   RECORD pH CORRECTION
   ========================= */
export function recordPhCorrection({
  log,
  type,               // "ACID" or "BASE"
  amount_g,
  reason = ""
}) {
  if (!PH_CORRECTION[type]) {
    throw new Error("Invalid pH correction type");
  }

  log.corrections.push({
    type,
    agent: PH_CORRECTION[type].name,
    amount_g,
    reason,
    recorded_at: new Date().toISOString()
  });

  return log;
}

/* =========================
   FINALIZE LOG
   ========================= */
export function finalizeMashLog(log) {
  log.completed = true;
  log.completed_at = new Date().toISOString();
  return log;
}

/* =========================
   END OF MASH LOG
   ========================= */

