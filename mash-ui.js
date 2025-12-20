/* ============================================================
   797 DISTILLERY — MASH UI
   Layout polish: mode placeholder + guardrails
   ============================================================ */

import { scaleMash, ENGINE_VERSION } from "./mash-engine.js";

const MASH_DEFS = window.MASH_DEFS;
if (!MASH_DEFS || !MASH_DEFS.RECIPES) {
  throw new Error("MASH_DEFS not loaded");
}

const mashSelect = document.getElementById("mashSelect");
const fillGalInput = document.getElementById("fillGal");
const targetABVInput = document.getElementById("targetABV");

const btnBuildMash = document.getElementById("btnBuildMash");
const resultsPanel = document.getElementById("resultsPanel");
const mashResults = document.getElementById("mashResults");
const engineStamp = document.getElementById("engineStamp");

let currentMash = null;

/* =========================
   Mode selector (WITH placeholder)
   ========================= */
const modeSelect = document.createElement("select");
modeSelect.id = "modeSelect";
modeSelect.innerHTML = `
  <option value="" selected disabled>Please select mode…</option>
  <option value="production">Production</option>
  <option value="planning">Planning / Experiment</option>
`;

(function injectControls(){
  const mashGrid = document.querySelector(".mash-grid");
  if (!mashGrid) return;

  const modeWrap = document.createElement("div");
  modeWrap.innerHTML = `<label>Mode</label>`;
  modeWrap.appendChild(modeSelect);
  mashGrid.insertBefore(modeWrap, mashGrid.firstChild);
})();

function setStamp(extra = ""){
  engineStamp.textContent =
    "ENGINE VERSION: " + ENGINE_VERSION + (extra ? ` — ${extra}` : "");
}

function populateMashSelect(){
  mashSelect.innerHTML = `<option value="">Select mash...</option>`;
  Object.keys(MASH_DEFS.RECIPES).forEach(id => {
    const m = MASH_DEFS.RECIPES[id];
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = m.label;
    mashSelect.appendChild(opt);
  });
}

populateMashSelect();
setStamp("loaded");

/* =========================
   Build (guarded)
   ========================= */
btnBuildMash.onclick = () => {
  const mashId = mashSelect.value;
  const fillGal = Number(fillGalInput.value);
  const mode = modeSelect.value;
  const t = targetABVInput.value === "" ? null : Number(targetABVInput.value);

  if (!mode) return alert("Please select a mode.");
  if (!mashId) return alert("Select a mash type.");
  if (!fillGal || fillGal <= 0) return alert("Enter a valid fill volume.");

  currentMash = scaleMash(mashId, fillGal, t, mode);
  renderMash(currentMash);
  resultsPanel.hidden = false;
};

/* =========================
   Render
   ========================= */
function renderMash(mash){
  const f = mash.fermentables;
  const ferm = mash.fermentation;

  let html = `
    <p><strong>${mash.name}</strong></p>
    <p>Mode: ${mash.mode}</p>
    <p>Fill: ${mash.fillGal} gal</p>

    <h3>Fermentables</h3><ul>
  `;

  Object.keys(f).forEach(k => {
    html += `<li>${k.replace(/_/g," ")}: ${f[k].lb ?? f[k].gal}</li>`;
  });

  html += `
    </ul>
    <h3>Yeast & Nutrients</h3>
    <ul>
      <li>${mash.yeast.name}: ${mash.yeast.grams} g</li>
      <li>Nutrients: ${mash.nutrients_g} g</li>
    </ul>

    <h3>Fermentation Guidance</h3>
    <ul>
      <li>Temp: ${ferm.temp_range_f}</li>
      <li>Time: ${ferm.estimated_days}</li>
    </ul>
  `;

  mashResults.innerHTML = html;
}
