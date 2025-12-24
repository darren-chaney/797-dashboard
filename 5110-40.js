/* ============================================================
   forms/5110-40.js — TTB 5110.40 (Production)
   Scope:
   - Production ONLY
   - Read-only
   - One row = Pay.gov Line
   ============================================================ */

/* ===============================
   Helpers (local to this module)
   =============================== */
const fmt = n => Number(n || 0).toFixed(2);

/* ============================================================
   FIELD MAP — EXACTLY WHAT 797 USES
   (NO Gin)
   ============================================================ */

const LINE_1_COLUMNS = [
  { key: "Produced_WhiskeyUnder", label: "Whiskey ≤160" },
  { key: "Produced_WhiskeyOver",  label: "Whiskey >160" },
  { key: "Produced_BrandyUnder",  label: "Brandy ≤170" },
  { key: "Produced_BrandyOver",   label: "Brandy >170" },
  { key: "Produced_Rum",          label: "Rum" },
  { key: "Produced_Vodka",        label: "Vodka" },
  { key: "Produced_SpiritsOver",  label: "≥190" },
  { key: "Produced_SpiritsUnder", label: "<190" }
];

/* ============================================================
   DATA SOURCE (SAFE DEFAULTS)
   NOTE:
   - Ledger wiring happens later
   - This module must render with NO DATA
   ============================================================ */

function getProductionValuesForMonth(/* monthId */) {
  const out = {};
  LINE_1_COLUMNS.forEach(c => out[c.key] = 0);
  return out;
}

/* ============================================================
   RENDERING
   ============================================================ */

function renderProductionLine1(values) {
  const tbody = document.getElementById("ttb5110_40_production_body");
  if (!tbody) return;

  tbody.innerHTML = "";

  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>1</td>
    <td>Produced</td>
    ${LINE_1_COLUMNS.map(col => `
      <td>
        <div class="value">
          ${fmt(values[col.key])}
          <button class="copy-btn"
            title="Copy"
            onclick="navigator.clipboard.writeText('${fmt(values[col.key])}')">
            📋
          </button>
        </div>
      </td>
    `).join("")}
  `;

  tbody.appendChild(tr);
}

/* ============================================================
   INIT
   ============================================================ */

(function init5110_40() {

  // month is handled by reports.js (shell)
  // this module does NOT care if month exists yet
  const values = getProductionValuesForMonth();
  renderProductionLine1(values);

})();
