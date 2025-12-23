/* ============================================================
   Monthly TTB Reports — Guided Pay.gov Assistant
   READ-ONLY • COPY-ONLY • GitHub Pages safe
   ============================================================ */

/* ============================================================
   FIREBASE IMPORTS (MATCH compliance.js EXACTLY)
   ============================================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  initializeFirestore,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ============================================================
   FIREBASE INITIALIZATION
   DO NOT DUPLICATE OR MODIFY WITHOUT CARE
   ============================================================ */
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

/* ============================================================
   DOM HELPERS
   ============================================================ */
const el = id => document.getElementById(id);

const banner = el("reportMonthBanner");
const label  = el("filingMonthLabel");

/* ============================================================
   DETERMINE REPORTING (FILING) MONTH
   - Prefer non-open months
   - Fallback to most recent month
   ============================================================ */
async function getMostRecentFilingMonth() {
  const snap = await getDocs(collection(db, "compliance_months"));
  const months = [];

  snap.forEach(doc => {
    months.push({ id: doc.id, ...doc.data() });
  });

  if (!months.length) return null;

  months.sort((a, b) => a.id.localeCompare(b.id));
  const nonOpen = months.filter(m => m.status !== "open");

  return nonOpen.length
    ? nonOpen[nonOpen.length - 1]
    : months[months.length - 1];
}

/* ============================================================
   5110.40 — PRODUCTION TOTALS
   ============================================================ */
async function loadProductionTotals(monthId) {
  const snap = await getDocs(
    query(
      collection(db, "compliance_events"),
      where("eventType", "==", "production"),
      where("reportingMonth", "==", monthId)
    )
  );

  const totals = {
    whiskeyProduced: 0,
    rumProduced: 0,
    vodkaProduced: 0,
    ginProduced: 0,
    redistilled: 0,
    toStorage: 0
  };

  snap.forEach(doc => {
    const d = doc.data().derived || {};
    totals.whiskeyProduced += d.whiskeyPG || 0;
    totals.rumProduced     += d.rumPG || 0;
    totals.vodkaProduced   += d.vodkaPG || 0;
    totals.ginProduced     += d.ginPG || 0;
    totals.redistilled     += d.redistilledPG || 0;
    totals.toStorage       += d.toStoragePG || 0;
  });

  return totals;
}

/* ============================================================
   5110.40 — PRODUCTION FIELD MAP
   ============================================================ */
const PRODUCTION_FIELDS = [
  ["1", "Produced — Whiskey", "Whiskey Produced", "whiskeyProduced"],
  ["1", "Produced — Rum", "Rum Produced", "rumProduced"],
  ["1", "Produced — Vodka", "Vodka Produced", "vodkaProduced"],
  ["1", "Produced — Gin", "Gin Produced", "ginProduced"],
  ["2", "Produced by Redistillation", "Redistilled", "redistilled"],
  ["5", "Transferred to Storage", "Transferred to Storage", "toStorage"]
];

/* ============================================================
   RENDER PRODUCTION TABLE
   ============================================================ */
function renderProductionTable(totals) {
  const tbody = el("productionTable");
  tbody.innerHTML = "";

  PRODUCTION_FIELDS.forEach(([line, desc, paygov, key]) => {
    const val = totals[key] || 0;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${line}</td>
      <td>${desc}</td>
      <td>${paygov}</td>
      <td><strong>Enter this value</strong></td>
      <td>${val.toFixed(2)}</td>
      <td>
        <button class="copy-btn"
          onclick="navigator.clipboard.writeText('${val.toFixed(2)}')">
          Copy
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
   5110.28 — PROCESSING TOTALS
   ============================================================ */
async function loadProcessingTotals(monthId) {
  const snap = await getDocs(
    query(
      collection(db, "compliance_events"),
      where("eventType", "==", "processing"),
      where("reportingMonth", "==", monthId)
    )
  );

  const totals = {
    toProcessing: 0,
    processed: 0,
    toStorage: 0,
    toBottling: 0
  };

  snap.forEach(doc => {
    const d = doc.data().derived || {};
    totals.toProcessing += d.toProcessingPG || 0;
    totals.processed    += d.processedPG || 0;
    totals.toStorage    += d.toStoragePG || 0;
    totals.toBottling   += d.toBottlingPG || 0;
  });

  return totals;
}

/* ============================================================
   5110.28 — PROCESSING FIELD MAP
   ============================================================ */
const PROCESSING_FIELDS = [
  ["1", "Received for Processing", "Spirits Received for Processing", "toProcessing"],
  ["2", "Processed", "Spirits Processed", "processed"],
  ["5", "Transferred to Storage", "Transferred to Storage", "toStorage"],
  ["6", "Transferred to Bottling", "Transferred to Bottling", "toBottling"]
];

/* ============================================================
   RENDER PROCESSING TABLE
   ============================================================ */
function renderProcessingTable(totals) {
  const tbody = el("processingTable");
  tbody.innerHTML = "";

  PROCESSING_FIELDS.forEach(([line, desc, paygov, key]) => {
    const val = totals[key] || 0;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${line}</td>
      <td>${desc}</td>
      <td>${paygov}</td>
      <td><strong>Enter this value</strong></td>
      <td>${val.toFixed(2)}</td>
      <td>
        <button class="copy-btn"
          onclick="navigator.clipboard.writeText('${val.toFixed(2)}')">
          Copy
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
   INIT — LOAD MONTH + RENDER ALL REPORT SECTIONS
   ============================================================ */
(async function init() {
  try {
    const month = await getMostRecentFilingMonth();

    if (!month) {
      banner.classList.add("error");
      label.textContent = "NO COMPLIANCE MONTHS FOUND";
      return;
    }

    banner.classList.remove("warning", "error");
    banner.classList.add("success");
    label.textContent = month.id;

    // --- Production ---
    const prodTotals = await loadProductionTotals(month.id);
    renderProductionTable(prodTotals);

    // --- Processing ---
    const procTotals = await loadProcessingTotals(month.id);
    renderProcessingTable(procTotals);

    // --- Storage (5110.11) will be wired here next ---

  } catch (err) {
    console.error(err);
    banner.classList.add("error");
    label.textContent = "ERROR LOADING REPORTS";
  }
})();
