/* ============================================================
   reports.js — Monthly TTB Reports (Pay.gov Guided Assistant)
   - READ ONLY (no writes)
   - Uses Firestore compliance ledger (read-only queries)
   - Renders line-by-line guidance + Copy buttons

   IMPORTANT:
   - Fixes "firebase.js 404" by using official gstatic module imports
   - Fixes "Unexpected EOF" by being a complete module file
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
   Firebase init (same as compliance.js)
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

function fmt2(n) {
  const num = Number(n || 0);
  return Number.isFinite(num) ? num.toFixed(2) : "0.00";
}

/* ===============================
   Clipboard helper (Copy button)
   =============================== */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(String(text));
    return true;
  } catch (e) {
    // Fallback for older browsers
    try {
      const ta = document.createElement("textarea");
      ta.value = String(text);
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch (err) {
      return false;
    }
  }
}

/* ============================================================
   MONTH SELECTION RULE
   - Default to MOST RECENT LOCKED month (what’s being filed)
   - If none locked, show banner "No locked month found"
   ============================================================ */
async function getMostRecentLockedMonth() {
  const snap = await getDocs(collection(db, "compliance_months"));
  const months = [];
  snap.forEach((d) => months.push({ id: d.id, ...d.data() }));

  months.sort((a, b) => a.id.localeCompare(b.id));

  const locked = months.filter((m) => (m.status || "").toLowerCase() === "locked");
  if (locked.length) return locked[locked.length - 1];

  return null;
}

/* ============================================================
   EVENT QUERY HELPERS
   NOTE: These are the ONLY places you should change queries
         if collection/field names change later.
   ============================================================ */
async function getEventsForMonth(monthId) {
  // This grabs all events for that reportingMonth (any eventType)
  const snap = await getDocs(
    query(
      collection(db, "compliance_events"),
      where("reportingMonth", "==", monthId)
    )
  );

  const events = [];
  snap.forEach((d) => events.push({ id: d.id, ...d.data() }));
  return events;
}

/* ============================================================
   CALCULATION LAYER (where YOUR real logic will go)
   ------------------------------------------------------------
   RIGHT NOW:
   - returns zeros / placeholders (because you said you don't
     have production data in the ledger yet)
   LATER:
   - you will replace the internals of these functions
     with real ledger computations.
   ============================================================ */

/* -------------------------------
   Production (TTB 5110.40) calc
   ------------------------------- */
function calcProductionValues(events) {
  // TODO (YOU): compute these from events (eventType === "production", etc.)
  // Return object keys that match report line items used below.
  return {
    Produced_WhiskeyUnder: 0,
    Produced_Rum: 0,
    Produced_Vodka: 0,
    Produced_Gin: 0,

    Redistallation_Total: 0,

    StorageAccount_Total: 0,

    // Example "Pay.gov calculates this" field to show user expected total:
    Produced_Total: 0
  };
}

/* -------------------------------
   Processing (TTB 5110.28) calc
   ------------------------------- */
function calcProcessingValues(events) {
  // TODO (YOU): compute from events (eventType === "bottling"/"processing", etc.)
  return {
    SPIRITS_RECEIVED: 0,
    SPIRITS_BOTTLED: 0,

    // Example "Pay.gov calculates this" total field to display:
    SPIRITS_TOTAL1: 0
  };
}

/* -------------------------------
   Storage (TTB 5110.11) calc
   ------------------------------- */
function calcStorageValues(events) {
  // TODO (YOU): compute from events (eventType === "storage")
  return {
    // Example on-hand totals and the grand total that Pay.gov calculates
    TOTAL_ONHAND_EOM: 0,

    // If you want category totals later, add them here:
    UNDER160_ONHAND_EOM: 0,
    RUM_ONHAND_EOM: 0,
    VODKA_ONHAND_EOM: 0
  };
}

/* ============================================================
   REPORT LINE DEFINITIONS
   - This is the "UI map" for what shows on the page.
   - Each row can be:
       type: "entry"  -> user enters value into Pay.gov (Copy button shown)
       type: "calc"   -> Pay.gov calculates; we display expected value (Copy button optional)
   - key: is the Pay.gov data key (from your HTML exports)
   ============================================================ */

/* ===============================
   5110.40 Production rows
   =============================== */
const PRODUCTION_ROWS = [
  // Line 1 - Produced (selected categories you called out)
  {
    line: "1",
    desc: "Produced — Whiskey",
    paygovLabel: "Whiskey Produced",
    instruction: "Enter this value",
    key: "Produced_WhiskeyUnder",
    type: "entry"
  },
  {
    line: "1",
    desc: "Produced — Rum",
    paygovLabel: "Rum Produced",
    instruction: "Enter this value",
    key: "Produced_Rum",
    type: "entry"
  },
  {
    line: "1",
    desc: "Produced — Vodka",
    paygovLabel: "Vodka Produced",
    instruction: "Enter this value",
    key: "Produced_Vodka",
    type: "entry"
  },
  {
    line: "1",
    desc: "Produced — Gin",
    paygovLabel: "Gin Produced",
    instruction: "Enter this value",
    key: "Produced_Gin",
    type: "entry"
  },

  // Line 2 - Produced by redistillation
  {
    line: "2",
    desc: "Produced by Redistillation",
    paygovLabel: "Redistilled",
    instruction: "Enter this value",
    key: "Redistallation_Total",
    type: "entry"
  },

  // Line 5 - Transferred to storage
  {
    line: "5",
    desc: "Transferred to Storage",
    paygovLabel: "Transferred to Storage",
    instruction: "Enter this value",
    key: "StorageAccount_Total",
    type: "entry"
  },

  // Example Pay.gov-calculated total (helpful “what the total should be”)
  {
    line: "1 (Total)",
    desc: "Total Produced (all categories)",
    paygovLabel: "Produced Total",
    instruction: "Pay.gov auto-calculates this (use as a check)",
    key: "Produced_Total",
    type: "calc"
  }
];

/* ===============================
   5110.28 Processing rows
   =============================== */
const PROCESSING_ROWS = [
  {
    line: "1",
    desc: "Spirits Received",
    paygovLabel: "Spirits Received",
    instruction: "Enter this value",
    key: "SPIRITS_RECEIVED",
    type: "entry"
  },
  {
    line: "2",
    desc: "Spirits Bottled",
    paygovLabel: "Spirits Bottled",
    instruction: "Enter this value",
    key: "SPIRITS_BOTTLED",
    type: "entry"
  },
  {
    line: "1 (Total)",
    desc: "Total Spirits (check value)",
    paygovLabel: "Spirits Total (auto)",
    instruction: "Pay.gov auto-calculates this (use as a check)",
    key: "SPIRITS_TOTAL1",
    type: "calc"
  }
];

/* ===============================
   5110.11 Storage rows
   =============================== */
const STORAGE_ROWS = [
  {
    line: "23",
    desc: "On hand end of month — TOTAL",
    paygovLabel: "TOTAL_ONHAND_EOM",
    instruction: "Pay.gov auto-calculates this (use as a check)",
    key: "TOTAL_ONHAND_EOM",
    type: "calc"
  },

  // Optional: show a couple category lines as examples (can expand later)
  {
    line: "23",
    desc: "On hand end of month — Under 160 proof",
    paygovLabel: "UNDER160_ONHAND_EOM",
    instruction: "Enter this value",
    key: "UNDER160_ONHAND_EOM",
    type: "entry"
  },
  {
    line: "23",
    desc: "On hand end of month — Rum",
    paygovLabel: "RUM_ONHAND_EOM",
    instruction: "Enter this value",
    key: "RUM_ONHAND_EOM",
    type: "entry"
  },
  {
    line: "23",
    desc: "On hand end of month — Vodka",
    paygovLabel: "VODKA_ONHAND_EOM",
    instruction: "Enter this value",
    key: "VODKA_ONHAND_EOM",
    type: "entry"
  }
];

/* ============================================================
   RENDERING
   ============================================================ */
function renderTableRows(tbodyEl, rows, valuesObj) {
  tbodyEl.innerHTML = "";

  rows.forEach((row) => {
    const value = fmt2(valuesObj[row.key]);

    const tr = document.createElement("tr");

    // Line
    const tdLine = document.createElement("td");
    tdLine.textContent = row.line;
    tr.appendChild(tdLine);

    // Description
    const tdDesc = document.createElement("td");
    tdDesc.textContent = row.desc;
    tr.appendChild(tdDesc);

    // Pay.gov label
    const tdLabel = document.createElement("td");
    tdLabel.textContent = row.paygovLabel;
    tr.appendChild(tdLabel);

    // Instruction
    const tdInstr = document.createElement("td");
    tdInstr.textContent = row.instruction;
    tr.appendChild(tdInstr);

    // Value
    const tdVal = document.createElement("td");
    tdVal.textContent = value;
    tr.appendChild(tdVal);

    // Copy button
    const tdBtn = document.createElement("td");

    // We show Copy for both entry and calc by default (because users like copying totals too)
    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.type = "button";
    btn.textContent = "Copy";
    btn.addEventListener("click", async () => {
      const ok = await copyText(value);
      btn.textContent = ok ? "Copied" : "Copy failed";
      setTimeout(() => (btn.textContent = "Copy"), 900);
    });

    tdBtn.appendChild(btn);
    tr.appendChild(tdBtn);

    tbodyEl.appendChild(tr);
  });
}

/* ============================================================
   MAIN INIT
   ============================================================ */
(async function initReports() {
  const bannerLabel = el("filingMonthLabel");
  const statusEl = el("reportsStatus");

  const productionTbody = el("productionTable");
  const processingTbody = el("processingTable");
  const storageTbody = el("storageTable");

  try {
    // 1) Determine which month we are filing (most recent LOCKED)
    const filingMonth = await getMostRecentLockedMonth();

    if (!filingMonth) {
      bannerLabel.textContent = "NO LOCKED MONTH FOUND";
      statusEl.textContent = "Lock a month first, then this page will guide filing.";
      // Render tables with zeros so layout stays stable
      renderTableRows(productionTbody, PRODUCTION_ROWS, calcProductionValues([]));
      renderTableRows(processingTbody, PROCESSING_ROWS, calcProcessingValues([]));
      renderTableRows(storageTbody, STORAGE_ROWS, calcStorageValues([]));
      return;
    }

    bannerLabel.textContent = filingMonth.id;
    statusEl.textContent = `Using locked month "${filingMonth.id}" (filing due: ${filingMonth.filingDueDate || "—"})`;

    // 2) Pull ledger events for that month (read-only)
    const events = await getEventsForMonth(filingMonth.id);

    // 3) Compute report values (currently placeholders, replace internals later)
    const productionValues = calcProductionValues(events);
    const processingValues = calcProcessingValues(events);
    const storageValues = calcStorageValues(events);

    // 4) Render tables
    renderTableRows(productionTbody, PRODUCTION_ROWS, productionValues);
    renderTableRows(processingTbody, PROCESSING_ROWS, processingValues);
    renderTableRows(storageTbody, STORAGE_ROWS, storageValues);

  } catch (err) {
    console.error(err);
    bannerLabel.textContent = "ERROR";
    statusEl.textContent = "Error loading monthly report data. Check console for details.";

    // Keep the UI stable even on error
    renderTableRows(productionTbody, PRODUCTION_ROWS, calcProductionValues([]));
    renderTableRows(processingTbody, PROCESSING_ROWS, calcProcessingValues([]));
    renderTableRows(storageTbody, STORAGE_ROWS, calcStorageValues([]));
  }
})();
