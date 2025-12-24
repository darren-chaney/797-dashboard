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
   PRODUCTION — ONE ROW PER PAY.GOV LINE
   ============================================================ */

const PRODUCTION_LINES = [
  {
    line: "1",
    desc: "Produced (All Spirits)",
    instruction: "Enter each value into its matching Pay.gov column",
    fields: [
      { label:"Whiskey ≤160", key:"Produced_WhiskeyUnder" },
      { label:"Whiskey >160", key:"Produced_WhiskeyOver" },
      { label:"Brandy ≤170",  key:"Produced_BrandyUnder" },
      { label:"Brandy >170",  key:"Produced_BrandyOver" },
      { label:"Rum",          key:"Produced_Rum" },
      { label:"Vodka",        key:"Produced_Vodka" },
      { label:"Spirits ≥190", key:"Produced_SpiritsOver" },
      { label:"Spirits <190", key:"Produced_SpiritsUnder" }
    ]
  },
  {
    line: "2",
    desc: "Produced by Redistillation",
    instruction: "Enter this total on Pay.gov",
    fields: [
      { label:"Total", key:"Redistallation_Total" }
    ]
  },
  {
    line: "5",
    desc: "Transferred to Storage",
    instruction: "Enter this total on Pay.gov",
    fields: [
      { label:"Total", key:"StorageAccount_Total" }
    ]
  }
];

/* ============================================================
   PROCESSING & STORAGE (already correct model)
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

  PRODUCTION_LINES.forEach(row=>{
    const tr = document.createElement("tr");

    const dest = row.fields.map(f=>`
      <div class="value-cell">
        <strong>${f.label}:</strong> ${fmt(0)}
        <button class="copy-btn"
          onclick="navigator.clipboard.writeText('${fmt(0)}')">Copy</button>
      </div>
    `).join("");

    tr.innerHTML = `
      <td>${row.line}</td>
      <td>${row.desc}</td>
      <td>${dest}</td>
      <td>${row.instruction}</td>
    `;
    tbody.appendChild(tr);
  });
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
