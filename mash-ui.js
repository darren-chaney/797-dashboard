/* ============================================================
   797 DISTILLERY — MASH UI
   Step 7: Export / Import mash bills (cross-device)
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
const resultsPanel = document.getElementById("resultsPanel");
const mashResults = document.getElementById("mashResults");

const engineStamp = document.getElementById("engineStamp");

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

  // ACTION BUTTONS
  const actions = document.querySelector(".actions");

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";

  const exportBtn = document.createElement("button");
  exportBtn.textContent = "Export";

  const importBtn = document.createElement("button");
  importBtn.textContent = "Import";

  const loadSelect = document.createElement("select");
  const loadBtn = document.createElement("button");
  loadBtn.textContent = "Load";

  actions.appendChild(saveBtn);
  actions.appendChild(exportBtn);
  actions.appendChild(importBtn);
  actions.appendChild(loadSelect);
  actions.appendChild(loadBtn);

  /* =========================
     Hidden file input
     ========================= */
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".json";
  fileInput.style.display = "none";
  document.body.appendChild(fileInput);

  function refreshSaved(){
    loadSelect.innerHTML = `<option value="">Saved mash bills…</option>`;
    (window.loadMashBills?.() || []).forEach(b => {
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = `${b.name} — ${b.fillGal} gal (${b.mode})`;
      loadSelect.appendChild(opt);
    });
  }

  /* =========================
     SAVE
     ========================= */
  saveBtn.onclick = () => {
    if (!currentMash) return alert("Build a mash first.");
    window.saveMashBill(currentMash);
    refreshSaved();
    alert("Mash bill saved locally.");
  };

  /* =========================
     EXPORT
     ========================= */
  exportBtn.onclick = () => {
    if (!currentMash) return alert("Nothing to export.");

    const blob = new Blob(
      [JSON.stringify(currentMash, null, 2)],
      { type: "application/json" }
    );

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download =
      `${currentMash.name.replace(/\s+/g, "_")}_${Date.now()}.json`;

    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  };

  /* =========================
     IMPORT
     ========================= */
  importBtn.onclick = () => fileInput.click();

  fileInput.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const mash = JSON.parse(reader.result);

        // Restore inputs
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

  /* =========================
     LOAD (local)
     ========================= */
  loadBtn.onclick = () => {
    const id = loadSelect.value;
    if (!id) return;

    const rec = window.getMashBill(id);
    if (!rec) return;

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

/* =========================
   Build
   ========================= */
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
