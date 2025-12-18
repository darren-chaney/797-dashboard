/* ============================================================
   797 DISTILLERY — MASH UI (yesterday layout, fixed + stamped)
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

const mashSelect = document.getElementById("mashSelect");
const fillGalInput = document.getElementById("fillGal");
const targetABVInput = document.getElementById("targetABV");

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

function setStamp(extra = ""){
  if (!engineStamp) return;
  engineStamp.textContent =
    "ENGINE VERSION: " + ENGINE_VERSION + (extra ? ` — ${extra}` : "");
}

function titleCase(s){
  return String(s).replace(/_/g, " ");
}

/* =========================
   POPULATE SELECT (retry-safe)
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
  updateHint();
}

/* retry until definitions exist */
const defsWait = setInterval(() => {
  if (getDefs()) {
    clearInterval(defsWait);
    populateMashSelect();
  }
}, 250);

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

  if (!mashId) return alert("Select a mash type.");
  if (!fillGal || fillGal <= 0) return alert("Enter a valid fill volume.");

  currentMash = scaleMash(mashId, fillGal, targetABV);

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
