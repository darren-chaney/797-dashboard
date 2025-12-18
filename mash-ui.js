/* ============================================================
   797 DISTILLERY — MASH UI (still selection restored)
   ============================================================ */

import { scaleMash, ENGINE_VERSION } from "./mash-engine.js";

/* =========================
   GLOBAL ACCESS (late bind)
   ========================= */
function getDefs(){
  return window.MASH_DEFS && window.MASH_DEFS.RECIPES
    ? window.MASH_DEFS
    : null;
}

function getLogAPI(){
  return {
    createMashLog: window.createMashLog,
    saveMashRun:   window.saveMashRun,
    saveMashLog:   window.saveMashLog
  };
}

/* =========================
   ELEMENTS
   ========================= */
const mashSelect = document.getElementById("mashSelect");
const fillGalInput = document.getElementById("fillGal");
const targetABVInput = document.getElementById("targetABV");

/* NEW: still selector (already in layout historically) */
let stillSelect = null;

const btnBuildMash = document.getElementById("btnBuildMash");
const btnStartMash = document.getElementById("btnStartMash");

const resultsPanel = document.getElementById("resultsPanel");
const mashResults = document.getElementById("mashResults");

const logPanel = document.getElementById("logPanel");
const logView = document.getElementById("logView");

const engineStamp = document.getElementById("engineStamp");
const targetHint = document.getElementById("targetHint");

let currentMash = null;
let mashSelectPopulated = false;

/* =========================
   HELPERS
   ========================= */
function setStamp(extra = ""){
  if (!engineStamp) return;
  engineStamp.textContent =
    "ENGINE VERSION: " + ENGINE_VERSION + (extra ? ` — ${extra}` : "");
}

function titleCase(s){
  return String(s).replace(/_/g, " ");
}

/* =========================
   POPULATE MASH SELECT
   ========================= */
function populateMashSelect(){
  if (mashSelectPopulated) return;
  const defs = getDefs();
  if (!defs) return;

  mashSelect.innerHTML = `<option value="">Select mash...</option>`;
  Object.keys(defs.RECIPES).forEach(id => {
    const m = defs.RECIPES[id];
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = m.label;
    mashSelect.appendChild(opt);
  });

  mashSelectPopulated = true;
}

/* =========================
   POPULATE STILL SELECT
   ========================= */
function ensureStillSelect(){
  if (stillSelect) return;

  const defs = getDefs();
  if (!defs || !defs.STILLS) return;

  // Create selector (same panel, no layout changes)
  stillSelect = document.createElement("select");
  stillSelect.id = "stillSelect";

  Object.keys(defs.STILLS).forEach(key => {
    const s = defs.STILLS[key];
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = s.name;
    stillSelect.appendChild(opt);
  });

  // Default to off-grain 53 gal
  stillSelect.value = "OFF_GRAIN";

  // Insert after Fill Volume field
  const fillField = fillGalInput.parentElement;
  fillField.after(stillSelect);
}

/* =========================
   HINT
   ========================= */
function updateHint(){
  const defs = getDefs();
  if (!defs || !targetHint) return;

  const mashId = mashSelect.value;
  if (!mashId) {
    targetHint.textContent = "";
    return;
  }

  const def = defs.RECIPES[mashId];
  if (def.kind === "rum") {
    targetHint.textContent = "Rum: Target Wash ABV is ignored (rule).";
  } else {
    targetHint.textContent =
      "Moonshine: raising Target ABV increases sugar only (never decreases).";
  }
}

/* =========================
   WAIT FOR DEFINITIONS
   ========================= */
const defsWait = setInterval(() => {
  if (getDefs()) {
    clearInterval(defsWait);
    populateMashSelect();
    ensureStillSelect();
    updateHint();
  }
}, 200);

/* =========================
   INIT
   ========================= */
setStamp("loaded");
mashSelect.addEventListener("change", updateHint);

/* =========================
   BUILD
   ========================= */
btnBuildMash.onclick = () => {
  const defs = getDefs();
  if (!defs) return alert("Mash definitions not loaded yet.");

  setStamp("build");

  const mashId = mashSelect.value;
  const fillGal = Number(fillGalInput.value);

  const tRaw = String(targetABVInput.value ?? "").trim();
  const targetABV = tRaw === "" ? null : Number(tRaw);

  const stillId = stillSelect ? stillSelect.value : "OFF_GRAIN";

  if (!mashId) return alert("Select a mash type.");
  if (!fillGal || fillGal <= 0) return alert("Enter a valid fill volume.");

  currentMash = scaleMash(mashId, fillGal, targetABV, stillId);

  renderMash(currentMash);
  resultsPanel.hidden = false;
  btnStartMash.disabled = false;

  setStamp("ok");
};

/* =========================
   START MASH
   ========================= */
btnStartMash.onclick = () => {
  if (!currentMash) return;

  const defs = getDefs();
  const api = getLogAPI();
  if (!defs || !api.createMashLog) {
    return alert("Storage/log system not loaded.");
  }

  const def = defs.RECIPES[currentMash.mashId];

  const log = api.createMashLog({
    mashId: currentMash.mashId,
    mashName: def.label,
    family: def.kind?.toUpperCase(),
    fillGal: currentMash.fillGal,
    fermentOnGrain: currentMash.fermentOnGrain
  });

  api.saveMashRun(currentMash);
  api.saveMashLog(log);

  renderLog(log);
  logPanel.hidden = false;
  btnStartMash.disabled = true;
};

/* =========================
   RENDER
   ========================= */
function renderMash(mash){
  const f = mash.fermentables;

  let html = `
    <p><strong>${mash.name}</strong></p>
    <p>Fill Volume: <strong>${mash.fillGal} gal</strong></p>
    <p>Still: <strong>${mash.stillName || "53 gal Off-Grain"}</strong></p>
    <h3>Fermentables</h3>
    <ul>
  `;

  Object.keys(f).forEach(key => {
    if (f[key].lb !== undefined)
      html += `<li>${titleCase(key)}: ${f[key].lb} lb</li>`;
    else if (f[key].gal !== undefined)
      html += `<li>${titleCase(key)}: ${f[key].gal} gal</li>`;
  });

  html += `</ul>`;
  mashResults.innerHTML = html;
}

function renderLog(log){
  let html = `
    <p><strong>${log.meta.mashName}</strong></p>
    <p>Created: ${log.meta.created_at}</p>
    <h3>Checkpoints</h3>
    <ul>
  `;
  log.checkpoints.forEach(c => {
    html += `<li>${c.checkpoint}</li>`;
  });
  html += `</ul>`;
  logView.innerHTML = html;
}
