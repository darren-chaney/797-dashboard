/* ============================================================
   5110-40.js — TTB 5110.40 (Production)
   SAFE DOM-TIMING VERSION
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
   WAIT FOR MODULE HTML
   ============================================================ */

function waitForBody(id, cb) {
  const el = document.getElementById(id);
  if (el) return cb(el);

  setTimeout(() => waitForBody(id, cb), 50);
}

/* ============================================================
   DATA
   ============================================================ */

async function getLockedMonth() {
  const snap = await getDocs(collection(db, "compliance_months"));
  const months = [];
  snap.forEach(d => months.push({ id: d.id, ...d.data() }));
  months.sort((a, b) => a.id.localeCompare(b.id));
  const locked = months.filter(m => m.status === "locked");
  return locked.length ? locked[locked.length - 1] : null;
}

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
    const pg = d.proofGallons || 0;

    switch (d.spiritClass) {
      case "whiskey_under_160": totals.Produced_WhiskeyUnder += pg; break;
      case "whiskey_over_160":  totals.Produced_WhiskeyOver  += pg; break;
      case "brandy_under_170":  totals.Produced_BrandyUnder  += pg; break;
      case "brandy_over_170":   totals.Produced_BrandyOver   += pg; break;
      case "rum":               totals.Produced_Rum          += pg; break;
      case "vodka":             totals.Produced_Vodka        += pg; break;
      case "spirits_over_190":  totals.Produced_SpiritsOver  += pg; break;
      case "spirits_under_190": totals.Produced_SpiritsUnder += pg; break;
    }
  });

  return totals;
}

/* ============================================================
   RENDER
   ============================================================ */

function render(body, values) {
  body.innerHTML = "";

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>1</td>
    <td>Produced</td>
    ${LINE_1_COLUMNS.map(c => `
      <td>
        ${fmt(values[c.key])}
        <button class="copy-btn"
          onclick="navigator.clipboard.writeText('${fmt(values[c.key])}')">
          Copy
        </button>
      </td>
    `).join("")}
  `;

  body.appendChild(tr);
}

/* ============================================================
   INIT
   ============================================================ */

(async function init5110_40() {
  const month = await getLockedMonth();
  if (!month) return;

  const totals = await getProductionTotals(month.id);

  waitForBody("ttb5110_40_production_body", body => {
    render(body, totals);
  });
})();
