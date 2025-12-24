/* ============================================================
   5110-28.js — TTB 5110.28 (Processing)
   Scope:
   - Processing ONLY
   - Read-only
   - One row = one Pay.gov entry
   ============================================================ */

/* ===============================
   Helpers
   =============================== */
const fmt = n => Number(n || 0).toFixed(2);

/* ============================================================
   FIELD MAP — ONLY WHAT 797 USES
   ============================================================ */

const PROCESSING_ROWS = [
  {
    line: "1",
    desc: "Spirits Received",
    paygov: "Spirits Received",
    instruction: "Enter this value",
    key: "SPIRITS_RECEIVED"
  },
  {
    line: "7",
    desc: "Spirits Bottled",
    paygov: "Spirits Bottled",
    instruction: "Enter this value",
    key: "SPIRITS_BOTTLED"
  }
];

/* ============================================================
   DATA SOURCE (SAFE DEFAULTS)
   ============================================================ */

function getProcessingValuesForMonth() {
  const values = {};
  PROCESSING_ROWS.forEach(r => values[r.key] = 0);
  return values;
}

/* ============================================================
   RENDERING
   ============================================================ */

function renderProcessing(values) {
  const tbody = document.getElementById("ttb5110_28_processing_body");
  if (!tbody) return;

  tbody.innerHTML = "";

  PROCESSING_ROWS.forEach(row => {
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

(function init5110_28() {
  // Month selection handled by reports.js
  const values = getProcessingValuesForMonth();
  renderProcessing(values);
})();
