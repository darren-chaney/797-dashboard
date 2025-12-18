/* ============================================================
   797 DISTILLERY — MASH UI (yesterday layout, fixed + stamped)
   ============================================================ */

import { scaleMash, ENGINE_VERSION } from "./mash-engine.js";
import { MASH_DEFINITIONS } from "./mash-definitions.js";
import { saveMashRun, saveMashLog } from "./mash-storage.js";

/* =========================
   GLOBAL LOG API (yesterday behavior)
   ========================= */
const createMashLog = window.createMashLog;
if (typeof createMashLog !== "function") {
  throw new Error("createMashLog not found on window (mash-log.js not loaded)");
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

mashSelect.addEventListener("change", () => {
  updateHint();
});

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
  `;

  html += `<h3>Fermentables</h3><ul>`;
  Object.keys(f).forEach(key => {
    if (f[key].lb !== undefined)
      html += `<li>${titleCase(key)}: ${f[key].lb} lb</li>`;
    else if (f[key].gal !== undefined)
      html += `<li>${titleCase(key)}: ${f[key].gal} gal</li>`;
  });
  html += `</ul>`;

  html += `<h3>Enzymes</h3><ul>`;
  if (mash.enzymes?.amylo_300_ml)
    html += `<li>Amylo 300: ${mash.enzymes.amylo_300_ml} mL</li>`;
  if (mash.enzymes?.glucoamylase_ml)
    html += `<li>Glucoamylase: ${mash.enzymes.glucoamylase_ml} mL</li>`;
  if (!mash.enzymes?.amylo_300_ml && !mash.enzymes?.glucoamylase_ml)
    html += `<li>None</li>`;
  html += `</ul>`;

  html += `
    <h3>Yeast & Nutrients</h3>
    <ul>
      <li>Yeast: ${mash.yeast.name} — ${mash.yeast.grams} g</li>
      <li>Nutrients: ${mash.nutrients_g} g</li>
    </ul>

    <h3>Fermentation Estimates</h3>
    <ul>
      <li>OG: ${mash.totals.og}</li>
      <li>Wash ABV: ${mash.totals.washABV_percent}%</li>
      <li>Pure Alcohol: ${mash.totals.pureAlcohol_gal} gal</li>
    </ul>

    <h3>Stripping Run (Estimated — NO CUTS)</h3>
    <ul>
      <li>Style: ${mash.stripping.strip_style}</li>
      <li>Wash Charged: ${mash.stripping.wash_charged_gal} gal</li>
      <li>Recovery: ${mash.stripping.recovery_percent}%</li>
      <li>Low Wines Avg: ${mash.stripping.low_wines_abv}%</li>
      <li><strong>Low Wines: ${mash.stripping.low_wines_gal} gal</strong></li>
    </ul>
  `;

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
