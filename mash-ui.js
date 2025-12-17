/* ============================================================
   797 DISTILLERY — MASH UI
   UI glue layer ONLY
   ============================================================ */

import { scaleMash } from "./mash-engine.js";
import { buildTopUpMash } from "./mash-topup.js";
import { createMashLog } from "./mash-log.js";
import { saveMashRun, saveMashLog } from "./mash-storage.js";
import { MASH_DEFINITIONS } from "./mash-definitions.js";

/* =========================
   ELEMENTS
   ========================= */
const mashSelect = document.getElementById("mashSelect");
const fillGalInput = document.getElementById("fillGal");
const btnBuildMash = document.getElementById("btnBuildMash");
const btnStartMash = document.getElementById("btnStartMash");

const resultsPanel = document.getElementById("resultsPanel");
const mashResults = document.getElementById("mashResults");

const logPanel = document.getElementById("logPanel");
const logView = document.getElementById("logView");

/* =========================
   STATE
   ========================= */
let currentMash = null;

/* =========================
   BUILD MASH
   ========================= */
btnBuildMash.onclick = () => {
  const mashId = mashSelect.value;
  const fillGal = Number(fillGalInput.value);

  if (!mashId || !fillGal) {
    alert("Select a mash and enter fill volume");
    return;
  }

  try {
    currentMash = scaleMash(mashId, fillGal);
    renderMash(currentMash);
    resultsPanel.hidden = false;
  } catch (err) {
    alert(err.message);
  }
};

/* =========================
   START MASH (LOCK)
   ========================= */
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

  btnStartMash.disabled = true;
  mashSelect.disabled = true;
  fillGalInput.disabled = true;

  logPanel.hidden = false;
};

/* =========================
   RENDER MASH
   ========================= */
function renderMash(mash) {
  const f = mash.fermentables;

  let html = `
    <p><strong>${mash.name}</strong></p>
    <p>Fill Volume: <strong>${mash.fillGal} gal</strong></p>

    <h3>Fermentables</h3>
    <ul>
  `;

  for (const k in f) {
    html += `<li>${k}: ${f[k].lb} lb</li>`;
  }

  html += `
    </ul>

    <h3>Enzymes</h3>
    <ul>
  `;

  if (mash.enzymes.amylo_300_ml) {
    html += `<li>Amylo 300: ${mash.enzymes.amylo_300_ml} mL</li>`;
  }

  if (mash.enzymes.glucoamylase_ml) {
    html += `<li>Glucoamylase: ${mash.enzymes.glucoamylase_ml} mL</li>`;
  }

  html += `
    </ul>

    <h3>Yeast & Nutrients</h3>
    <ul>
      <li>Yeast: ${mash.yeast.name} — ${mash.yeast.grams} g</li>
      <li>Nutrients: ${mash.nutrients_g} g</li>
    </ul>

    <h3>Estimates</h3>
    <ul>
      <li>OG: ${mash.totals.og}</li>
      <li>Wash ABV: ${mash.totals.washABV_percent}%</li>
      <li>Pure Alcohol: ${mash.totals.pureAlcohol_gal} gal</li>
    </ul>
  `;

  if (mash.warnings.length) {
    html += `
      <h3>Warnings</h3>
      <ul>
        ${mash.warnings.map(w => `<li>${w}</li>`).join("")}
      </ul>
    `;
  }

  mashResults.innerHTML = html;
}

/* =========================
   RENDER LOG
   ========================= */
function renderLog(log) {
  let html = `
    <p><strong>Production Log</strong></p>
    <p>Mash: ${log.meta.mashName}</p>
    <p>Created: ${log.meta.created_at}</p>

    <h3>Checkpoints</h3>
    <ul>
  `;

  log.checkpoints.forEach(c => {
    html += `<li>${c.checkpoint}</li>`;
  });

  html += `
    </ul>
  `;

  logView.innerHTML = html;
}

/* =========================
   END OF UI
   ========================= */

