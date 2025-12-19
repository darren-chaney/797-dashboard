/* ============================================================
   797 DISTILLERY — MASH UI
   Step 6: Save & Reload mash bills
   ============================================================ */

import { scaleMash, ENGINE_VERSION } from "./mash-engine.js";

/* =========================
   GLOBAL DEFINITIONS
   ========================= */
const MASH_DEFS = window.MASH_DEFS;
if (!MASH_DEFS || !MASH_DEFS.RECIPES) {
  throw new Error("MASH_DEFS not loaded");
}

const mashSelect = document.getElementById("mashSelect");
const fillGalInput = document.getElementById("fillGal");
const targetABVInput = document.getElementById("targetABV");

const btnBuildMash = document.getElementById("btnBuildMash");
const btnStartMash = document.getElementById("btnStartMash");

const resultsPanel = document.getElementById("resultsPanel");
const mashResults = document.getElementById("mashResults");

const engineStamp = document.getElementById("engineStamp");
const targetHint = document.getElementById("targetHint");

let currentMash = null;

/* =========================
   Mode selector
   ========================= */
const modeSelect = document.createElement("select");
modeSelect.innerHTML = `
  <option value="production">Production</option>
  <option value="planning">Planning</option>
`;

(function injectControls(){
  const mashGrid = document.querySelector(".mash-grid");
  if (!mashGrid) return;

  // MODE
  const modeWrap = document.createElement("div");
  modeWrap.innerHTML = `<label>Mode</label>`;
  modeWrap.appendChild(modeSelect);
  mashGrid.insertBefore(modeWrap, mashGrid.firstChild);

  // SAVE / LOAD
  const actions = document.querySelector(".actions");

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save Mash Bill";
  saveBtn.type = "button";

  const loadSelect = document.createElement("select");
  const loadBtn = document.createElement("button");
  loadBtn.textContent = "Load";

  actions.appendChild(saveBtn);
  actions.appendChild(loadSelect);
  actions.appendChild(loadBtn);

  function refreshSaved(){
    loadSelect.innerHTML = `<option value="">Saved mash bills…</option>`;
    (window.loadMashBills?.() || []).forEach(b => {
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent =
        `${b.name} — ${b.fillGal} gal (${b.mode})`;
      loadSelect.appendChild(opt);
    });
  }

  saveBtn.onclick = () => {
    if (!currentMash) return alert("Build a mash first.");
    window.saveMashBill(currentMash);
    refreshSaved();
    alert("Mash bill saved.");
  };

  loadBtn.onclick = () => {
    const id = loadSelect.value;
    if (!id) return;

    const rec = window.getMashBill(id);
    if (!rec) return;

    // Restore inputs
    mashSelect.value = rec.mashId;
    fillGalInput.value = rec.fillGal;
    modeSelect.value = rec.mode;

    currentMash = rec.data;
    renderMash(currentMash);
    resultsPanel.hidden = false;
  };

  refreshSaved();
})();

/* =========================
   Helpers
   ========================= */
function setStamp(extra = ""){
  engineStamp.textContent =
    "ENGINE VERSION: " + ENGINE_VERSION + (extra ? ` — ${extra}` : "");
}

function titleCase(s){
  return String(s).replace(/_/g, " ");
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

btnBuildMash.onclick = () => {
  const mashId = mashSelect.value;
  const fillGal = Number(fillGalInput.value);
  const mode = modeSelect.value;
  const t = targetABVInput.value === "" ? null : Number(targetABVInput.value);

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
    html += `<li>${titleCase(k)}: ${f[k].lb ?? f[k].gal}</li>`;
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
