/* ============================================================
   reports.js — Monthly TTB Reports (Guided Pay.gov Assistant)
   STABLE — rows always render
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
   Firebase init (MATCH compliance.js)
   =============================== */
const firebaseConfig = {
  apiKey: "AIzaSyDlubP6d8tR1x_ArJJRWvNxqhAGV720Vas",
  authDomain: "distillery-app-b4aaa.firebaseapp.com",
  projectId: "distillery-app-b4aaa",
  storageBucket: "distillery-app-b4aaa.firebasestorage.app",
  messagingSenderId: "90276955618",
  appId: "1:90276955618:web:52e272ff59c4c29e3165bb"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false
});

/* ===============================
   Helpers
   =============================== */
const el = id => document.getElementById(id);
const fmt = n => Number(n || 0).toFixed(2);

/* ===============================
   Month logic — MOST RECENT LOCKED
   (never blocks rendering)
   =============================== */
async function getLockedMonth() {
  const snap = await getDocs(collection(db, "compliance_months"));
  const months = [];
  snap.forEach(d => months.push({ id: d.id, ...d.data() }));
  months.sort((a, b) => a.id.localeCompare(b.id));
  const locked = months.filter(m => m.status === "locked");
  return locked.length ? locked[locked.length - 1] : null;
}

/* ============================================================
   FIELD DEFINITIONS — FINAL & LOCKED
   ============================================================ */

/* -------------------------------
   5110.40 — PRODUCTION (NO GIN)
   ------------------------------- */
const PRODUCTION_FIELDS = [
  { line:"1", desc:"Produced — Whiskey ≤160", paygov:"Produced_WhiskeyUnder" },
  { line:"1", desc:"Produced — Whiskey >160", paygov:"Produced_WhiskeyOver" },
  { line:"1", desc:"Produced — Brandy ≤170",  paygov:"Produced_BrandyUnder" },
  { line:"1", desc:"Produced — Brandy >170",  paygov:"Produced_BrandyOver" },
  { line:"1", desc:"Produced — Rum",           paygov:"Produced_Rum" },
  { line:"1", desc:"Produced — Vodka",         paygov:"Produced_Vodka" },
  { line:"1", desc:"Produced — Spirits ≥190",  paygov:"Produced_SpiritsOver" },
  { line:"1", desc:"Produced — Spirits <190",  paygov:"Produced_SpiritsUnder" },

  { line:"2", desc:"Produced by Redistillation", paygov:"Redistallation_Total" },
  { line:"5", desc:"Transferred to Storage",     paygov:"StorageAccount_Total" },

  { line:"—", desc:"Total Produced (Pay.gov)", paygov:"Produced_Total", calc:true }
];

/* -------------------------------
   5110.28 — PROCESSING
   ------------------------------- */
const PROCESSING_FIELDS = [
  { line:"1", desc:"Spirits Received", paygov:"SPIRITS_RECEIVED" },
  { line:"7", desc:"Spirits Bottled",  paygov:"SPIRITS_BOTTLED" },
  { line:"—", desc:"Processing Total (Pay.gov)", paygov:"SPIRITS_TOTAL", calc:true }
];

/* -------------------------------
   5110.11 — STORAGE (ALL CLASSES)
   ------------------------------- */
const STORAGE_FIELDS = [
  { line:"1",  desc:"On Hand (BOM) — Under 160", paygov:"UNDER160_ONHAND" },
  { line:"1",  desc:"On Hand (BOM) — Under 190", paygov:"UNDER190_ONHAND" },
  { line:"1",  desc:"On Hand (BOM) — Rum",       paygov:"RUM_ONHAND" },
  { line:"1",  desc:"On Hand (BOM) — Vodka",     paygov:"VODKA_ONHAND" },

  { line:"—",  desc:"Total On Hand (BOM)", paygov:"TOTAL_ONHAND", calc:true },

  { line:"25", desc:"On Hand (EOM) — Under 160", paygov:"UNDER160_ONHAND_EOM" },
  { line:"25", desc:"On Hand (EOM) — Under 190", paygov:"UNDER190_ONHAND_EOM" },
  { line:"25", desc:"On Hand (EOM) — Rum",       paygov:"RUM_ONHAND_EOM" },
  { line:"25", desc:"On Hand (EOM) — Vodka",     paygov:"VODKA_ONHAND_EOM" },

  { line:"—",  desc:"Total On Hand (EOM)", paygov:"TOTAL_ONHAND_EOM", calc:true }
];

/* ============================================================
   VALUES — SAFE DEFAULTS (no data yet)
   ============================================================ */
function zeroValues(fields){
  const out = {};
  fields.forEach(f => out[f.paygov] = 0);
  return out;
}

/* ============================================================
   RENDERING
   ============================================================ */
function renderTable(tbodyId, fields, values){
  const tbody = el(tbodyId);
  tbody.innerHTML = "";

  fields.forEach(f => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${f.line}</td>
      <td>${f.desc}</td>
      <td>${f.paygov}</td>
      <td>${f.calc ? "Pay.gov auto-calculates" : "Enter this value"}</td>
      <td class="value-cell">${fmt(values[f.paygov])}</td>
      <td>
        ${f.calc ? "—" : `<button class="copy-btn">Copy</button>`}
      </td>
    `;

    if (!f.calc) {
      tr.querySelector("button").onclick = async () => {
        await navigator.clipboard.writeText(fmt(values[f.paygov]));
      };
    }

    tbody.appendChild(tr);
  });
}

/* ============================================================
   INIT — ALWAYS RENDERS TABLES
   ============================================================ */
(async function init(){
  const banner = el("filingMonthLabel");

  const month = await getLockedMonth();

  if (!month) {
    banner.textContent = "NO LOCKED MONTH";
  } else {
    banner.textContent = month.id;
  }

  // ALWAYS render tables (even with no month)
  renderTable("productionTable", PRODUCTION_FIELDS, zeroValues(PRODUCTION_FIELDS));
  renderTable("processingTable", PROCESSING_FIELDS, zeroValues(PROCESSING_FIELDS));
  renderTable("storageTable", STORAGE_FIELDS, zeroValues(STORAGE_FIELDS));
})();
