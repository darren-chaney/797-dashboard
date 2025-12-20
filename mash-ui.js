/* ============================================================
   797 DISTILLERY — MASH UI
   Restored Save Mash Log (stable)
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
   Mode selector (placeholder)
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

  /* Save Mash Bill */
  const saveBillBtn = document.createElement("button");
  saveBillBtn.textContent = "Save Mash Bill";

  /* Save Mash Log (RESTORED) */
  const saveLogBtn = document.createElement("button");
  saveLogBtn.textContent = "Save Mash Log";

  /* Export / Import */
  const exportBtn = document.createElement("button");
  exportBtn.textContent = "Export";

  const importBtn = document.createElement("button");
  importBtn.textContent = "Import";

  actions.appendChild(saveBillBtn);
  actions.appendChild(saveLogBtn);
  actions.appendChild(exportBtn);
  actions.appendChild(importBtn);

  /* =========================
     Save Mash Bill
     ========================= */
  saveBillBtn.onclick = () => {
    if (!currentMash) return alert("Build a mash first.");
    window.saveMashBill?.(currentMash);
    alert("Mash bill saved.");
  };

  /* =========================
     Save Mash Log (SAFE)
     ========================= */
  saveLogBtn.onclick = () => {
    if (!currentMash) return alert("Build a mash first.");

    if (
      typeof window.createMashLog !== "function" ||
      typeof window.saveMashLog !== "function"
    ) {
      return alert("Mash log system not available.");
    }

    const log = window.createMashLog({
      mashId: currentMash.mashId,
      mashName: currentMash.name,
      mode: currentMash.mode,
      fillGal: currentMash.fillGal
    });

    window.saveMashLog(log);
    alert("Mash log saved.");
  };

  /* =========================
     Export / Import
     ========================= */
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".json";
  fileInput.style.display = "none";
  document.body.appendChild(fileInput);

  exportBtn.onclick = () => {
    if (!currentMash) return alert("Nothing to export.");
    const blob = new Blob(
      [JSON.stringify(currentMash, null, 2)],
      { type: "application/json" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${currentMash.name.replace(/\s+/g,"_")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  importBtn.onclick = () => fileInput.click();

  fileInput.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const mash = JSON.parse(reader.result);
        mashSelect.value = mash.mashId;
        fillGalInput.value = mash.fillGal;
        modeSelect.value = mash.mode;
        currentMash = mash;
        renderMash(currentMash);
        resultsPanel.hidden = false;
      } catch {
        alert("Invalid mash file.");
      }
    };
    reader.readAsText(file);
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
   Build
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
