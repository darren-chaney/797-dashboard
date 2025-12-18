/* ============================================================
   797 DISTILLERY — MASH UI (yesterday layout, fixed + stamped)
   ============================================================ */

import { scaleMash, ENGINE_VERSION } from "./mash-engine.js";
import { MASH_DEFINITIONS } from "./mash-definitions.js";

/* =========================
   GLOBAL APIs (yesterday behavior)
   ========================= */
const createMashLog = window.createMashLog;
const saveMashRun   = window.saveMashRun;
const saveMashLog   = window.saveMashLog;

if (typeof createMashLog !== "function")
  throw new Error("createMashLog not found on window (mash-log.js not loaded)");
if (typeof saveMashRun !== "function")
  throw new Error("saveMashRun not found on window (mash-storage.js not loaded)");
if (typeof saveMashLog !== "function")
  throw new Error("saveMashLog not found on window (mash-storage.js not loaded)");

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

function setStamp(extra = ""){
  if (!engineStamp) return;
  engineStamp.textContent =
    "ENGINE VERSION: " + ENGINE_VERSION + (extra ? ` — ${extra}` : "");
}

function titleCase(s){
  return String(s).replace(/_/g, " ");
}

function populateMashSelect(){
  mashSelect.innerHTML = `<option value="">Select mash...</option>`;
  const ids = Object.keys(MASH_DEFINITIONS);
  ids.forEach(id => {
    const m = MASH_DEFINITIONS[id];
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = m.name;
    mashSelect.appendChild(opt);
  });
}

function updateHint(){
  const mashId = mashSelect.value;
  if (!mashId) {
    if (targetHint) targetHint.textContent = "";
    return;
  }
  const def = MASH_DEFINITIONS[mashId];
  if (!targetHint) return;

  if (def.family === "RUM"){
    targetHint.textContent = "Rum: Target Wash ABV is ignored (rule).";
  } else {
    targetHint.textContent =
      "Moonshine: raising Target ABV increases sugar only (never decreases).";
  }
}

populateMashSelect();
setStamp("loaded");
updateHint();

mashSelect.addEventListener("change", updateHint);

btnBuildMash.onclick = () => {
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

btnStartMash.onclick = () => {
  if (!currentMash) return;

  const def = MASH_DEFINITIONS[currentMash.mashId];

  const log = createMashLog({
    mashId: currentMash.mashId,
    mashName: currentMash.name,
    family: def.family,
    fillGal: currentMash.fillGal,
    fermentOnGrain: currentMash.fermentOnGrain
  });

  saveMashRun(currentMash);
  saveMashLog(log);

  renderLog(log);
  logPanel.hidden = false;

  btnStartMash.disabled = true;
};

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
