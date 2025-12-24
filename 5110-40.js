/* ============================================================
   5110-40.js — TTB 5110.40 (Production)
   WIRED VERSION
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  initializeFirestore,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ===============================
   Firebase init (READ ONLY)
   =============================== */
const firebaseConfig = {
  apiKey: "AIzaSyDlubP6d8tR1x_ArJJRWvNxqhAGV720Vas",
  authDomain: "distillery-app-b4aaa.firebaseapp.com",
  projectId: "distillery-app-b4aaa"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});

/* ===============================
   Helpers
   =============================== */
const fmt = n => Number(n || 0).toFixed(2);

/* ============================================================
   COLUMN MAP — PAY.GOV LINE 1
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
   MONTH RESOLUTION
   ============================================================ */

async function getLockedMonth() {
  const snap = await getDocs(collection(db, "compliance_months"));
  const months = [];

  snap.forEach(d => months.push({ id: d.id, ...d.data() }));
  months.sort((a, b) => a.id.localeCompare(b.id));

  const locked = months.filter(m => m.status === "locked");
  return locked.length ? locked[locked.length - 1] : null;
}

/* ============================================================
   PRODUCTION AGGREGATION
   ============================================================ */

async function getProductionTotals(monthId) {
  const totals = {};
  LINE_1_COLUMNS.forEach(c => totals[c.key] = 0);

  const snap = await getDocs(
    query(
      collection(db, "compliance_events"),
      where("eventType", "==", "production"),
      where("reportingMonth", "==", monthId)
    )
  );

  snap.forEach(doc => {
    const d = doc.data();

    // Expecting: d.class + d.proofGallons
    switch (d.spiritClass) {
      case "whiskey_under_160":
        totals.Produced_WhiskeyUnder += d.proofGallons || 0;
        break;

      case "whiskey_over_160":
        totals.Produced_WhiskeyOver += d.proofGallons || 0;
        break;

      case "brandy_under_170":
        totals.Produced_BrandyUnder += d.proofGallons || 0;
        break;

      case "brandy_over_170":
        totals.Produced_BrandyOver += d.proofGallons || 0;
        break;

      case "rum":
        totals.Produced_Rum += d.proofGallons || 0;
        break;

      case "vodka":
        totals.Produced_Vodka += d.proofGallons || 0;
        break;

      case "spirits_over_190":
        totals.Produced_SpiritsOver += d.proofGallons || 0;
        break;

      case "spirits_under_190":
        totals.Produced_SpiritsUnder += d.proofGallons || 0;
        break;
    }
  });

  return totals;
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
            Copy
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

(async function init5110_40() {

  const month = await getLockedMonth();
  if (!month) {
    console.warn("5110-40: No locked month found");
    return;
  }

  const totals = await getProductionTotals(month.id);
  renderProductionLine1(totals);

})();
