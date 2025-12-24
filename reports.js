/* ============================================================
   reports.js — Human-Guided Pay.gov Assistant
   One row = one filing decision
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { initializeFirestore, collection, getDocs } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ===============================
   Firebase init
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
const el = id => document.getElementById(id);
const fmt = n => Number(n || 0).toFixed(2);

async function getLockedMonth(){
  const snap = await getDocs(collection(db, "compliance_months"));
  const months = [];
  snap.forEach(d => months.push({ id: d.id, ...d.data() }));
  months.sort((a,b)=>a.id.localeCompare(b.id));
  const locked = months.filter(m=>m.status==="locked");
  return locked.length ? locked[locked.length-1] : null;
}

/* ============================================================
   PRODUCTION — CORRECTED COMPACT COLUMN MODEL
   ============================================================ */

const PRODUCTION_COLUMNS = [
  { label:"Whiskey ≤160", key:"Produced_WhiskeyUnder" },
  { label:"Whiskey >160", key:"Produced_WhiskeyOver" },
  { label:"Brandy ≤170",  key:"Produced_BrandyUnder" },
  { label:"Brandy >170",  key:"Produced_BrandyOver" },
  { label:"Rum",          key:"Produced_Rum" },
  { label:"Vodka",        key:"Produced_Vodka" },
  { label:"Spirits ≥190", key:"Produced_SpiritsOver" },
  { label:"Spirits <190", key:"Produced_SpiritsUnder" }
];

/* ============================================================
   PROCESSING & STORAGE (UNCHANGED)
   ============================================================ */

const PROCESSING_FIELDS = [
  { line:"1", desc:"Spirits Received", key:"SPIRITS_RECEIVED" },
  { line:"7", desc:"Spirits Bottled",  key:"SPIRITS_BOTTLED" }
];

const STORAGE_FIELDS = [
  { line:"1", desc:"On Hand (BOM) — Under 160", key:"UNDER160_ONHAND" },
  { line:"1", desc:"On Hand (BOM) — Under 190", key:"UNDER190_ONHAND" },
  { line:"1", desc:"On Hand (BOM) — Rum",       key:"RUM_ONHAND" },
  { line:"1", desc:"On Hand (BOM) — Vodka",     key:"VODKA_ONHAND" },
  { line:"25",desc:"On Hand (EOM) — Under 160", key:"UNDER160_ONHAND_EOM" },
  { line:"25",desc:"On Hand (EOM) — Under 190", key:"UNDER190_ONHAND_EOM" },
  { line:"25",desc:"On Hand (EOM) — Rum",       key:"RUM_ONHAND_EOM" },
  { line:"25",desc:"On Hand (EOM) — Vodka",     key:"VODKA_ONHAND_EOM" }
];

/* ============================================================
   Rendering
   ============================================================ */

function renderProduction(){
  const tbody = el("productionTable");
  tbody.innerHTML = "";

  // Header row already exists in HTML
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>1</td>
    <td>Produced</td>
    ${PRODUCTION_COLUMNS.map(col => `
      <td>
        <div class="value">
          ${fmt(0)}
          <button class="copy-btn"
            onclick="navigator.clipboard.writeText('${fmt(0)}')">📋</button>
        </div>
      </td>
    `).join("")}
  `;

  tbody.appendChild(tr);

  // Line 2 — Produced by Redistillation (total only)
  const tr2 = document.createElement("tr");
  tr2.innerHTML = `
    <td>2</td>
    <td>Produced by Redistillation</td>
    <td colspan="${PRODUCTION_COLUMNS.length}">
      <div class="value" style="justify-content:flex-start">
        ${fmt(0)}
        <button class="copy-btn"
          onclick="navigator.clipboard.writeText('${fmt(0)}')">📋</button>
      </div>
    </td>
  `;
  tbody.appendChild(tr2);

  // Line 5 — Transferred to Storage (total only)
  const tr5 = document.createElement("tr");
  tr5.innerHTML = `
    <td>5</td>
    <td>Transferred to Storage</td>
    <td colspan="${PRODUCTION_COLUMNS.length}">
      <div class="value" style="justify-content:flex-start">
        ${fmt(0)}
        <button class="copy-btn"
          onclick="navigator.clipboard.writeText('${fmt(0)}')">📋</button>
      </div>
    </td>
  `;
  tbody.appendChild(tr5);
}

function renderSimple(tbodyId, fields){
  const tbody = el(tbodyId);
  tbody.innerHTML = "";

  fields.forEach(f=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${f.line}</td>
      <td>${f.desc}</td>
      <td>${f.key}</td>
      <td>Enter this value</td>
      <td>${fmt(0)}</td>
      <td>
        <button class="copy-btn"
          onclick="navigator.clipboard.writeText('${fmt(0)}')">Copy</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
   INIT
   ============================================================ */

(async function init(){
  const m = await getLockedMonth();
  el("filingMonthLabel").textContent = m ? m.id : "NO LOCKED MONTH";

  renderProduction();
  renderSimple("processingTable", PROCESSING_FIELDS);
  renderSimple("storageTable", STORAGE_FIELDS);
})();
