/* ============================================================
   797 DISTILLERY — MASH UI
   Phase 1 Mash Log linking
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
let activeMashLogId = null;

/* =========================
   Mode selector
   ========================= */
const modeSelect = document.createElement("select");
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

  const actions = document.querySelector(".actions");

  const startLogBtn = document.createElement("button");
  startLogBtn.textContent = "Start Mash Log";

  const viewLogBtn = document.createElement("button");
  viewLogBtn.textContent = "View Mash Log";
  viewLogBtn.disabled = true;

  actions.appendChild(startLogBtn);
  actions.appendChild(viewLogBtn);

  /* =========================
     Start Mash Log
     ========================= */
  startLogBtn.onclick = () => {
    if (!currentMash) return alert("Build a mash first.");

    const log = window.createMashLog({
      mashId: currentMash.mashId,
      mashName: currentMash.name,
      mode: currentMash.mode,
      fillGal: currentMash.fillGal
    });

    activeMashLogId = window.saveMashLog(log);
    viewLogBtn.disabled = false;

    alert(`Mash Log started\nLog ID: ${activeMashLogId}`);
  };

  /* =========================
     View Mash Log (Phase 1)
     ========================= */
  viewLogBtn.onclick = () => {
    if (!activeMashLogId) return;

    const log = window.getMashLog(activeMashLogId);
    if (!log) return alert("Mash log not found.");

    const meta = log.meta;

    alert(
      `Mash Log\n\n` +
      `Mash: ${meta.mashName}\n` +
      `Mode: ${meta.mode}\n` +
      `Fill: ${meta.fillGal} gal\n` +
      `Started: ${log.created_at}\n\n` +
      `Entries coming in Phase 2`
    );
  };
})();

/* =========================
   Helpers
   ========================= */
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
   Build Mash
   ========================= */
btnBuildMash.onclick = () => {
  const mashId = mashSelect.value;
  const fillGal = Number(fillGalInput.value);
  const mode = modeSelect.value;
  const t = targetABVInput.value === "" ? null : Number(targetABVInput.value);

  if (!mode) return alert("Please select a mode.");

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
