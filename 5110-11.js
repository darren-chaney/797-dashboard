/* ============================================================
   forms/5110-11.js — TTB 5110.11 (Storage)
   Scope:
   - Storage ONLY
   - Read-only
   - One row = one Pay.gov entry
   ============================================================ */

/* ===============================
   Helpers (local to this module)
   =============================== */
const fmt = n => Number(n || 0).toFixed(2);

/* ============================================================
   FIELD MAP — EXACTLY WHAT 797 USES
   ============================================================ */

const STORAGE_ROWS = [
  // ---- Beginning of Month (Line 1) ----
  {
    line: "1",
    desc: "On Hand (Beginning of Month) — Under 160",
    paygov: "Under 160 Proof",
    instruction: "Enter this value",
    key: "UNDER160_ONHAND"
  },
  {
    line: "1",
    desc: "On Hand (Beginning of Month) — Under 190",
    paygov: "Under 190 Proof",
    instruction: "Enter this value",
    key: "UNDER190_ONHAND"
  },
  {
    line: "1",
    desc: "On Hand (Beginning of Month) — Rum",
    paygov: "Rum",
    instruction: "Enter this value",
    key: "RUM_ONHAND"
  },
  {
    line: "1",
    desc: "On Hand (Beginning of Month) — Vodka",
    paygov: "Vodka",
    instruction: "Enter this value",
    key: "VODKA_ONHAND"
  },

  // ---- End of Month (Line 25) ----
  {
    line: "25",
    desc: "On Hand (End of Month) — Under 160",
    paygov: "Under 160 Proof",
    instruction: "Enter this value",
    key: "UNDER160_ONHAND_EOM"
  },
  {
    line: "25",
    desc: "On Hand (End of Month) — Under 190",
    paygov: "Under 190 Proof",
    instruction: "Enter this value",
    key: "UNDER190_ONHAND_EOM"
  },
  {
    line: "25",
    desc: "On Hand (End of Month) — Rum",
    paygov: "Rum",
    instruction: "Enter this value",
    key: "RUM_ONHAND_EOM"
  },
  {
    line: "25",
    desc: "On Hand (End of Month) — Vodka",
    paygov: "Vodka",
    instruction: "Enter this value",
    key: "VODKA_ONHAND_EOM"
  }
];

/* ============================================================
   DATA SOURCE (SAFE DEFAULTS)
   NOTE:
   - Ledger wiring happens later
   - This module must render with NO DATA
   ============================================================ */

function getStorageValuesForMonth(/* monthId */) {
  const out = {};
  STORAGE_ROWS.forEach(r => out[r.key] = 0);
  return out;
}

/* ============================================================
   RENDERING
   ============================================================ */

function renderStorage(values) {
  const tbody = document.getElementById("ttb5110_11_storage_body");
  if (!tbody) return;

  tbody.innerHTML = "";

  STORAGE_ROWS.forEach(row => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${row.line}</td>
      <td>${row.desc}</td>
      <td>${row.paygov}</td>
      <td>${row.instruction}</td>
      <td class="value-cell">${fmt(values[row.key])}</td>
      <td>
        <button class="copy-btn"
          title="Copy"
          onclick="navigator.clipboard.writeText('${fmt(values[row.key])}')">
          Copy
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* ============================================================
   INIT
   ============================================================ */

(function init5110_11() {
  // Month selection is handled by reports.js (shell)
  // This module renders independently and safely
  const values = getStorageValuesForMonth();
  renderStorage(values);
})();
