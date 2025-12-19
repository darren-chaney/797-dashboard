/* ============================================================
   797 DISTILLERY — MASH UI
   Step 3: Restore yeast + nutrients display (no redesign)
   ============================================================ */

import { scaleMash, ENGINE_VERSION } from "./mash-engine.js";

/* =========================
   GLOBAL DEFINITIONS
   ========================= */
const MASH_DEFS = window.MASH_DEFS;
if (!MASH_DEFS || !MASH_DEFS.RECIPES) {
  throw new Error("MASH_DEFS not loaded — mash-definitions.js missing");
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

/* =========================
   Mode selector (already approved)
   ========================= */
const modeSelect = document.createElement("select");
modeSelect.id = "modeSelect";
modeSelect.innerHTML = `
  <option value="production">Production (Locked)</option>
  <option value="planning">Planning / Experiment</option>
`;

/* Insert Mode first */
(function injectModeSelector(){
  const mashGrid = document.querySelector(".mash-grid");
  if (!mashGrid) return;

  const wrapper = document.createElement("div");
  const label = document.createElement("label");
  label.setAttribute("for", "modeSelect");
  label.textContent = "Mode";

  wrapper.appendChild(label);
  wrapper.appendChild(modeSelect);

  mashGrid.insertBefore(wrapper, mashGrid.firstChild);
})();

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
  Object.keys(MASH_DEFS.RECIPES).forEach(id => {
    const m = MASH_DEFS.RECIPES[id];
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = m.label;
    mashSelect.appendChild(opt);
  });
}

function updateHint(){
  const mashId = mashSelect.value;
  if (!mashId || !targetHint) {
    targetHint.textContent = "";
    return;
  }

  const def = MASH_DEFS.RECIPES[mashId];
  targetHint.textContent =
    def.kind === "rum"
      ? "Rum: Target Wash ABV behavior depends on selected mode."
      : "Moonshine: Target Wash ABV behavior depends on selected mode.";
}

populateMashSelect();
setStamp("loaded");
updateHint();

mashSelect.addEventListener("change", updateHint);

btnBuildMash.onclick = () => {
  setStamp("build");

  const mashId = mashSelect.value;
  const fillGal = Number(fillGalInput.value);
  const mode = modeSelect.value;

  const tRaw = String(targetABVInput.value ?? "").trim();
  const targetABV = tRaw === "" ? null : Number(tRaw);

  if (!mashId) return alert("Select a mash type.");
  if (!fillGal || fillGal <= 0) return alert("Enter a valid fill volume.");

  currentMash = scaleMash(mashId, fillGal, targetABV, mode);

  renderMash(currentMash);
  resultsPanel.hidden = false;
  btnStartMash.disabled = false;

  setStamp(mode);
};

btnStartMash.onclick = () => {
  if (!currentMash) return;

  if (!window.createMashLog || !window.saveMashRun || !window.saveMashLog) {
    alert("Mash logging functions not loaded.");
    return;
  }

  const def = MASH_DEFS.RECIPES[currentMash.mashId];

  const log = window.createMashLog({
    mashId: currentMash.mashId,
    mashName: currentMash.name,
    family: def.kind,
    fillGal: currentMash.fillGal,
    fermentOnGrain: currentMash.fermentOnGrain,
    mode: modeSelect.value
  });

  window.saveMashRun(currentMash);
  window.saveMashLog(log);

  renderLog(log);
  logPanel.hidden = false;
  btnStartMash.disabled = true;
};

function renderMash(mash){
  const f = mash.fermentables;

  let html = `
    <p><strong>${mash.name}</strong></p>
    <p>Mode: <strong>${mash.mode}</strong></p>
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

  /* ✅ RESTORED SECTION */
  html += `
    <h3>Yeast & Nutrients</h3>
    <ul>
      <li>Yeast: ${mash.yeast.name} — ${mash.yeast.grams} g</li>
      <li>Nutrients: ${mash.nutrients_g} g</li>
    </ul>
  `;

  html += `
    <h3>Fermentation Estimates</h3>
    <ul>
      <li>OG: ${mash.totals.og}</li>
      <li>Wash ABV: ${mash.totals.washABV_percent}%</li>
    </ul>
  `;

  mashResults.innerHTML = html;
}

function renderLog(log){
  let html = `
    <p><strong>${log.meta.mashName}</strong></p>
    <p>Created: ${log.meta.created_at}</p>
    <p>Mode: ${log.meta.mode}</p>
    <h3>Checkpoints</h3>
    <ul>
  `;

  log.checkpoints.forEach(c => {
    html += `<li>${c.checkpoint}</li>`;
  });

  html += `</ul>`;
  logView.innerHTML = html;
}
