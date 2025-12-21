/* ============================================================
   797 DISTILLERY — MASH UI
   RESTORED: Save/Load Mash + Phase 1 Mash Log
   ============================================================ */

import { scaleMash, ENGINE_VERSION } from "./mash-engine.js";

const DEFS = window.MASH_DEFS;
if (!DEFS || !DEFS.RECIPES) {
  throw new Error("MASH_DEFS not loaded");
}

/* =========================
   DOM
   ========================= */
const mashSelect     = document.getElementById("mashSelect");
const fillGalInput   = document.getElementById("fillGal");
const targetABVInput = document.getElementById("targetABV");
const btnBuildMash   = document.getElementById("btnBuildMash");
const resultsPanel   = document.getElementById("resultsPanel");
const mashResults    = document.getElementById("mashResults");
const engineStamp    = document.getElementById("engineStamp");

let currentMash = null;
let activeMashLogId = null;

/* =========================
   Mode selector
   ========================= */
const modeSelect = document.createElement("select");
modeSelect.innerHTML = `
  <option value="" disabled selected>Please select</option>
  <option value="production">Production</option>
  <option value="planning">Planning / Experiment</option>
`;

/* =========================
   Inject controls
   ========================= */
(function(){
  const grid = document.querySelector(".mash-grid");
  const actions = document.querySelector(".actions");
  if (!grid || !actions) return;

  /* Mode */
  const modeWrap = document.createElement("div");
  modeWrap.innerHTML = `<label>Mode</label>`;
  modeWrap.appendChild(modeSelect);
  grid.insertBefore(modeWrap, grid.firstChild);

  /* Buttons */
  const btnSaveMash = document.createElement("button");
  btnSaveMash.textContent = "Save Mash Bill";

  const savedSelect = document.createElement("select");
  const btnLoadMash = document.createElement("button");
  btnLoadMash.textContent = "Load Mash Bill";

  const btnStartLog = document.createElement("button");
  btnStartLog.textContent = "Start Mash Log";

  const btnViewLog = document.createElement("button");
  btnViewLog.textContent = "View Mash Log";
  btnViewLog.disabled = true;

  actions.append(
    btnSaveMash,
    savedSelect,
    btnLoadMash,
    btnStartLog,
    btnViewLog
  );

  /* =========================
     Saved mash helpers
     ========================= */
  function refreshSaved(){
    savedSelect.innerHTML = `<option value="">Saved mash bills…</option>`;
    (window.loadMashBills?.() || []).forEach(b => {
      const o = document.createElement("option");
      o.value = b.id;
      o.textContent = `${b.name} — ${b.fillGal} gal`;
      savedSelect.appendChild(o);
    });
  }

  refreshSaved();

  btnSaveMash.onclick = () => {
    if (!currentMash) return alert("Build a mash first.");
    window.saveMashBill(currentMash);
    refreshSaved();
    alert("Mash bill saved.");
  };

  btnLoadMash.onclick = () => {
    const id = savedSelect.value;
    if (!id) return alert("Select a saved mash.");
    const rec = window.getMashBill(id);
    if (!rec) return alert("Mash not found.");

    mashSelect.value   = rec.mashId;
    fillGalInput.value = rec.fillGal;
    modeSelect.value   = rec.mode;

    currentMash = rec.data;
    renderMash(currentMash);
    resultsPanel.hidden = false;
  };

  /* =========================
     Mash Log (Phase 1 → Phase 2 navigation)
     ========================= */
  btnStartLog.onclick = async () => {
  if (!currentMash) return alert("Build a mash first.");

  const log = window.createMashLog({
    mashName: currentMash.name,
    mode: currentMash.mode,
    fillGal: currentMash.fillGal
  });

  activeMashLogId = await window.saveMashLog(log);
  btnViewLog.disabled = false;

  alert("Mash Log started.");
};

  /* 🔹 ONLY CHANGE IS HERE 🔹 */
  btnViewLog.onclick = () => {
    if (!activeMashLogId) return alert("No active mash log.");

    // Navigate to standalone Mash Log page
    window.location.href = `mash-log.html?log=${activeMashLogId}`;
  };
  /* 🔹 END CHANGE 🔹 */

})();

/* =========================
   Init
   ========================= */
function setStamp(extra=""){
  engineStamp.textContent =
    `ENGINE VERSION: ${ENGINE_VERSION}${extra ? " — " + extra : ""}`;
}

function populateMashSelect(){
  mashSelect.innerHTML = `<option value="">Select mash…</option>`;
  Object.keys(DEFS.RECIPES).forEach(id => {
    const m = DEFS.RECIPES[id];
    const o = document.createElement("option");
    o.value = id;
    o.textContent = m.label;
    mashSelect.appendChild(o);
  });
}

populateMashSelect();
setStamp("loaded");

/* =========================
   Build mash
   ========================= */
btnBuildMash.onclick = () => {
  const mashId = mashSelect.value;
  const fillGal = Number(fillGalInput.value);
  const mode = modeSelect.value;
  const t = targetABVInput.value === "" ? null : Number(targetABVInput.value);

  if (!mashId) return alert("Select a mash.");
  if (!mode) return alert("Select a mode.");

  currentMash = scaleMash(mashId, fillGal, t, mode);
  renderMash(currentMash);
  resultsPanel.hidden = false;
};

/* =========================
   Render
   ========================= */
function renderMash(m){
  let html = `
    <p><strong>${m.name}</strong></p>
    <p>Mode: ${m.mode}</p>
    <p>Fill: ${m.fillGal} gal</p>

    <h3>Fermentables</h3><ul>
  `;
  Object.keys(m.fermentables).forEach(k=>{
    const f = m.fermentables[k];
    html += `<li>${k.replace(/_/g," ")}: ${f.lb ?? f.gal}</li>`;
  });
  html += `
    </ul>
    <h3>Yeast & Nutrients</h3>
    <ul>
      <li>${m.yeast.name}: ${m.yeast.grams} g</li>
      <li>Nutrients: ${m.nutrients_g} g</li>
    </ul>

    <h3>Fermentation Guidance</h3>
    <ul>
      <li>Temp: ${m.fermentation.temp_range_f}</li>
      <li>Time: ${m.fermentation.estimated_days}</li>
    </ul>
  `;
  mashResults.innerHTML = html;
}
