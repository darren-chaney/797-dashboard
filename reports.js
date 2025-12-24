/* ============================================================
   reports.js — Monthly TTB Reports (Pay.gov Guided Assistant)
   Read-only. GitHub Pages safe. Firebase via gstatic CDN imports.
   ============================================================ */

/* ===============================
   Firebase imports (NO local firebase.js)
   =============================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  initializeFirestore,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ===============================
   Firebase init (matches compliance.js pattern)
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
   DOM helpers
   =============================== */
const el = (id) => document.getElementById(id);

/* ===============================
   Month logic
   - Default to most recent LOCKED month
   - If none locked, fall back to most recent month
   =============================== */
async function getMostRecentLockedMonth() {
  const snap = await getDocs(collection(db, "compliance_months"));
  const months = [];

  snap.forEach(doc => months.push({ id: doc.id, ...doc.data() }));
  months.sort((a, b) => a.id.localeCompare(b.id));

  if (!months.length) return null;

  const locked = months.filter(m => m.status === "locked");
  return locked.length ? locked[locked.length - 1] : months[months.length - 1];
}

/* ===============================
   Clipboard helper (Copy buttons)
   =============================== */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(String(text ?? ""));
    return true;
  } catch {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = String(text ?? "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      document.body.removeChild(ta);
      return false;
    }
  }
}

/* ===============================
   Formatting helper
   =============================== */
function fmt2(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0.00";
  return x.toFixed(2);
}

/* ============================================================
   PAY.GOV — 5110.40 PRODUCTION (FULL CLASS COLUMNS)
   ------------------------------------------------------------
   These keys are from the Pay.gov HTML export and reflect the
   actual column structure (Whiskey under/over, Brandy under/over,
   Rum, Gin, Vodka, Spirits over/under 190, Other, Total).
   Example keys present in your export:
   - Produced_WhiskeyUnder, Produced_Rum, Produced_Total, etc.
   - TransBond_WhiskeyUnder ... TransBond_Total
   - StorageAccount_WhiskeyUnder ... StorageAccount_Total
   ------------------------------------------------------------
   Source of truth: Pay.gov HTML export fields/keys.
   ============================================================ */

/* -------------------------------
   Column definitions (table header order)
   ------------------------------- */
const PROD_CLASS_COLS = [
  { id: "WhiskeyUnder", label: "Whiskey ≤160" },
  { id: "WhiskeyOver",  label: "Whiskey >160" },
  { id: "BrandyUnder",  label: "Brandy ≤170" },
  { id: "BrandyOver",   label: "Brandy >170" },
  { id: "Rum",          label: "Rum" },
  { id: "Gin",          label: "Gin" },
  { id: "Vodka",        label: "Vodka" },
  { id: "SpiritsOver",  label: "Spirits ≥190" },
  { id: "SpiritsUnder", label: "Spirits <190" },
  { id: "Other",        label: "Other" },
  { id: "Total",        label: "Total" }
];

/* -------------------------------
   Production row map
   - Each row corresponds to a Pay.gov “line”/section label
   - Each row references the Pay.gov field keys for each class column
   ------------------------------- */
const PRODUCTION_ROWS = [
  {
    line: "1",
    desc: "Produced",
    paygovLabel: "Produced",
    instruction: "Enter this value",
    keyPrefix: "Produced_"
  },
  {
    line: "2",
    desc: "Produced by Redistillation",
    paygovLabel: "Produced by Redistillation",
    instruction: "Enter this value",
    keyPrefix: "Redistallation_" // NOTE: Pay.gov key spelling in export
  },
  {
    line: "10",
    desc: "Entered for Transfer in Bond",
    paygovLabel: "Entered for Transfer in Bond",
    instruction: "Enter this value",
    keyPrefix: "TransBond_"
  },
  {
    line: "11",
    desc: "Entered in Storage Account",
    paygovLabel: "Entered in Storage Account",
    instruction: "Enter this value",
    keyPrefix: "StorageAccount_"
  },
  {
    line: "12",
    desc: "Withdrawn for Research, Development, or Testing",
    paygovLabel: "Withdrawn for Research, Development, or Testing",
    instruction: "Enter this value",
    keyPrefix: "Research_"
  },
  {
    line: "13",
    desc: "Transactions / Adjustments (Line 13)",
    paygovLabel: "Line 13",
    instruction: "Enter this value (if applicable)",
    keyPrefix: "Line13_"
  }
];

/* ============================================================
   Data layer (READ-ONLY)
   ------------------------------------------------------------
   You said the DB is new and you’ll enter December later.
   For now: return zeros for every Pay.gov key.
   WHEN you start wiring real calculations, add them in
   computeProductionPayGovValues() — do not change the UI.
   ============================================================ */

/**
 * Build an object keyed by Pay.gov field key, value = number.
 * Example return:
 * {
 *   Produced_Rum: 12.34,
 *   Produced_Total: 12.34,
 *   ...
 * }
 */
async function computeProductionPayGovValues(reportingMonth) {
  // ==========================================================
  // TODO (WIRE-UP POINT):
  // Pull compliance_events for eventType = "production"
  // where reportingMonth == reportingMonth
  // and compute the proper proof-gallon values into the Pay.gov keys.
  //
  // This is where YOUR production ledger → Pay.gov mapping lives.
  // ==========================================================

  // Placeholder: all zeros
  const out = {};
  for (const row of PRODUCTION_ROWS) {
    for (const col of PROD_CLASS_COLS) {
      const key = `${row.keyPrefix}${col.id}`;
      out[key] = 0;
    }
  }
  return out;
}

/* ============================================================
   Render helpers
   ============================================================ */

function renderProductionTable(valuesByKey) {
  const tbody = el("productionTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  for (const row of PRODUCTION_ROWS) {
    const tr = document.createElement("tr");

    // Fixed columns
    tr.appendChild(tdText(row.line));
    tr.appendChild(tdText(row.desc));
    tr.appendChild(tdText(row.paygovLabel));
    tr.appendChild(tdText(row.instruction));

    // Class columns (each cell: value + Copy button)
    for (const col of PROD_CLASS_COLS) {
      const key = `${row.keyPrefix}${col.id}`;
      const v = fmt2(valuesByKey[key]);

      const td = document.createElement("td");
      td.className = "value-cell";

      const span = document.createElement("span");
      span.className = "value-text";
      span.textContent = v;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn";
      btn.textContent = "Copy";
      btn.onclick = async () => {
        const ok = await copyToClipboard(v);
        btn.textContent = ok ? "Copied" : "Copy";
        setTimeout(() => (btn.textContent = "Copy"), 900);
      };

      td.appendChild(span);
      td.appendChild(btn);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }
}

function tdText(text) {
  const td = document.createElement("td");
  td.textContent = text ?? "";
  return td;
}

/* ============================================================
   Processing + Storage placeholders (keep stable)
   - We will upgrade these next to full Pay.gov structures
   ============================================================ */

function renderSimpleRows(tbodyId, rows) {
  const tbody = el(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = "";

  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.appendChild(tdText(r.line));
    tr.appendChild(tdText(r.desc));
    tr.appendChild(tdText(r.paygovLabel));
    tr.appendChild(tdText(r.instruction));

    const v = fmt2(r.value || 0);
    tr.appendChild(tdText(v));

    const tdBtn = document.createElement("td");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-btn";
    btn.textContent = "Copy";
    btn.onclick = async () => {
      const ok = await copyToClipboard(v);
      btn.textContent = ok ? "Copied" : "Copy";
      setTimeout(() => (btn.textContent = "Copy"), 900);
    };
    tdBtn.appendChild(btn);
    tr.appendChild(tdBtn);

    tbody.appendChild(tr);
  });
}

/* ============================================================
   Init
   ============================================================ */

(async function initReports() {
  const banner = el("reportMonthBanner");
  const label = el("filingMonthLabel");

  try {
    const filingMonth = await getMostRecentLockedMonth();

    if (!filingMonth) {
      if (label) label.textContent = "NO MONTHS FOUND";
      if (banner) banner.classList.add("warning");
      return;
    }

    // Banner display
    if (label) label.textContent = filingMonth.id;

    // If no locked months exist, visually warn
    if (banner) {
      banner.classList.remove("warning");
      if (filingMonth.status !== "locked") banner.classList.add("warning");
    }

    // ==========================================================
    // 5110.40 — PRODUCTION (full classes)
    // ==========================================================
    const prodValues = await computeProductionPayGovValues(filingMonth.id);
    renderProductionTable(prodValues);

    // ==========================================================
    // 5110.28 — PROCESSING (placeholder rows for now)
    // ==========================================================
    renderSimpleRows("processingTable", [
      { line: "—", desc: "Processing mapping pending", paygovLabel: "—", instruction: "Leave blank for now", value: 0 }
    ]);

    // ==========================================================
    // 5110.11 — STORAGE (placeholder rows for now)
    // ==========================================================
    renderSimpleRows("storageTable", [
      { line: "—", desc: "Storage mapping pending", paygovLabel: "—", instruction: "Leave blank for now", value: 0 }
    ]);

  } catch (err) {
    console.error(err);
    if (label) label.textContent = "ERROR LOADING MONTH";
    if (banner) banner.classList.add("warning");
  }
})();

