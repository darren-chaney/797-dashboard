/* ============================================================
   Monthly TTB Reports — Guided Assistant (Read-only)
   - GitHub Pages safe (module imports from gstatic)
   - Uses Firestore compliance_months + compliance_events
   - Auto-selects MOST RECENT LOCKED MONTH
   - Renders Production / Processing / Storage tables
   - Copy buttons for values
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
   DOM helpers
   =============================== */

const el = (id) => document.getElementById(id);

function fmt2(n) {
  const x = Number(n || 0);
  return x.toFixed(2);
}

/* ============================================================
   MONTH SELECTION (MOST RECENT LOCKED)
   ============================================================ */

async function getMostRecentLockedMonth() {
  const snap = await getDocs(collection(db, "compliance_months"));
  const months = [];
  snap.forEach(doc => months.push({ id: doc.id, ...doc.data() }));

  // Ensure chronological order (YYYY-MM sorts correctly lexicographically)
  months.sort((a, b) => a.id.localeCompare(b.id));

  // Your rule: the month being filed is the most recent "locked" month
  const locked = months.filter(m => (m.status || "").toLowerCase() === "locked");
  if (locked.length) return locked[locked.length - 1];

  return null; // handled by UI banner
}

function setMonthBanner(monthObj) {
  const banner = el("reportMonthBanner");
  const label = el("filingMonthLabel");

  if (!banner || !label) return;

  if (!monthObj) {
    banner.classList.remove("good");
    banner.classList.add("warning");
    label.textContent = "NO LOCKED MONTH FOUND";
    return;
  }

  banner.classList.remove("warning");
  banner.classList.add("good");
  label.textContent = monthObj.id;
}

/* ============================================================
   DATA ACCESS (READ-ONLY)
   ============================================================ */

/**
 * Pull compliance events for a month.
 * We only read. We do not write.
 */
async function loadEventsForMonth(monthId) {
  const snap = await getDocs(
    query(
      collection(db, "compliance_events"),
      where("reportingMonth", "==", monthId)
    )
  );

  const events = [];
  snap.forEach(d => events.push({ id: d.id, ...d.data() }));
  return events;
}

/* ============================================================
   CALCULATION PLACEHOLDERS (NO RE-DESIGN)
   ------------------------------------------------------------
   IMPORTANT:
   You said you don't have real data in the DB yet.
   So we wire the pipeline now and return 0s until events exist.
   When you start entering December (2025-12), these will populate.
   ============================================================ */

/**
 * Production (5110.40) calculations from ledger events.
 * Replace the internals here when you finalize eventType schemas.
 */
function calcProduction511040(events) {
  // Filter events by type if you use eventType fields.
  // Example placeholders:
  // const productionEvents = events.filter(e => e.eventType === "production");

  return {
    // Line 1 breakdown (example categories you showed)
    producedWhiskey: 0,
    producedRum: 0,
    producedVodka: 0,
    producedGin: 0,

    // Line 2
    producedByRedistillation: 0,

    // Line 5
    transferredToStorage: 0,

    // Example “Pay.gov calculated” style value (not entered)
    producedTotal: 0
  };
}

/**
 * Processing (5110.28) calculations.
 * Your Pay.gov saved export includes values like SPIRITS_RECEIVED, SPIRITS_BOTTLED, etc.
 * We will mirror those fields as we implement the complete map.
 */
function calcProcessing511028(events) {
  return {
    spiritsReceived: 0,     // e.g., SPIRITS_RECEIVED
    spiritsBottled: 0,      // e.g., SPIRITS_BOTTLED
    packagedOnHandFOM: 0,   // e.g., PACKAGED_ONHANDFOM (carried)
    packagedOnHandEOM: 0,   // e.g., PACKAGED_ONHANDEOM (calculated)
    packagedTotal1: 0       // e.g., PACKAGED_TOTAL1 (Pay.gov)
  };
}

/**
 * Storage (5110.11) calculations.
 * Your saved Pay.gov export shows real totals like TOTAL_ONHAND, UNDER160_ONHAND, VODKA_ONHAND, etc.
 */
function calcStorage511011(events) {
  return {
    under160OnHand: 0,       // UNDER160_ONHAND
    rumOnHand: 0,            // RUM_ONHAND
    vodkaOnHand: 0,          // VODKA_ONHAND
    under190OnHand: 0,       // UNDER190_ONHAND
    totalOnHand: 0,          // TOTAL_ONHAND

    // Example “Pay.gov calculated” style value
    totalEOM: 0              // TOTAL_ONHAND_EOM (Pay.gov)
  };
}

/* ============================================================
   RENDERING (TABLE ROWS + COPY)
   ============================================================ */

function attachCopyHandlers(tbodyEl) {
  // Delegate click for copy buttons
  tbodyEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-copy]");
    if (!btn) return;

    const value = btn.getAttribute("data-copy") || "";
    try {
      await navigator.clipboard.writeText(value);
      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = "Copy"), 900);
    } catch (err) {
      console.error(err);
      btn.textContent = "Copy failed";
      setTimeout(() => (btn.textContent = "Copy"), 1200);
    }
  });
}

/**
 * Render a table from a row spec.
 * Each row: { line, desc, payLabel, instruction, value, copyable }
 */
function renderRows(tbodyId, rows) {
  const tbody = el(tbodyId);
  if (!tbody) return;

  tbody.innerHTML = rows.map(r => {
    const val = (r.value === null || r.value === undefined) ? "" : String(r.value);
    const copyBtn = r.copyable
      ? `<button class="copy-btn" type="button" data-copy="${val}">Copy</button>`
      : `<span class="muted">—</span>`;

    return `
      <tr>
        <td>${r.line}</td>
        <td>${r.desc}</td>
        <td class="muted">${r.payLabel}</td>
        <td>${r.instruction}</td>
        <td class="value-cell">${val}</td>
        <td class="copy-cell">${copyBtn}</td>
      </tr>
    `;
  }).join("");

  // Make copy buttons work
  attachCopyHandlers(tbody);
}

/* ============================================================
   FIELD MAP (MINIMAL NOW, EXPANDS NEXT)
   ------------------------------------------------------------
   You asked: some Pay.gov forms have different columns.
   Correct — and we will map each required Pay.gov field explicitly.
   This is the scaffold; we expand it using your HTML exports.
   ============================================================ */

function buildProductionRows(calc) {
  return [
    {
      line: "1",
      desc: "Produced — Whiskey",
      payLabel: "Whiskey Produced",
      instruction: "Enter this value",
      value: fmt2(calc.producedWhiskey),
      copyable: true
    },
    {
      line: "1",
      desc: "Produced — Rum",
      payLabel: "Rum Produced",
      instruction: "Enter this value",
      value: fmt2(calc.producedRum),
      copyable: true
    },
    {
      line: "1",
      desc: "Produced — Vodka",
      payLabel: "Vodka Produced",
      instruction: "Enter this value",
      value: fmt2(calc.producedVodka),
      copyable: true
    },
    {
      line: "1",
      desc: "Produced — Gin",
      payLabel: "Gin Produced",
      instruction: "Enter this value",
      value: fmt2(calc.producedGin),
      copyable: true
    },
    {
      line: "2",
      desc: "Produced by Redistillation",
      payLabel: "Redistilled",
      instruction: "Enter this value",
      value: fmt2(calc.producedByRedistillation),
      copyable: true
    },
    {
      line: "5",
      desc: "Transferred to Storage",
      payLabel: "Transferred to Storage",
      instruction: "Enter this value",
      value: fmt2(calc.transferredToStorage),
      copyable: true
    },
    {
      line: "—",
      desc: "Total Produced (check)",
      payLabel: "Produced Total",
      instruction: "Pay.gov auto-calculates this (use as a check)",
      value: fmt2(calc.producedTotal),
      copyable: false
    }
  ];
}

function buildProcessingRows(calc) {
  return [
    {
      line: "1",
      desc: "Spirits Received (Processing)",
      payLabel: "SPIRITS_RECEIVED",
      instruction: "Enter this value",
      value: fmt2(calc.spiritsReceived),
      copyable: true
    },
    {
      line: "2",
      desc: "Spirits Bottled",
      payLabel: "SPIRITS_BOTTLED",
      instruction: "Enter this value",
      value: fmt2(calc.spiritsBottled),
      copyable: true
    },
    {
      line: "—",
      desc: "Packaged Total (check)",
      payLabel: "PACKAGED_TOTAL1",
      instruction: "Pay.gov auto-calculates this (use as a check)",
      value: fmt2(calc.packagedTotal1),
      copyable: false
    }
  ];
}

function buildStorageRows(calc) {
  return [
    {
      line: "1",
      desc: "On hand at beginning — Under 160 proof",
      payLabel: "UNDER160_ONHAND",
      instruction: "Enter this value",
      value: fmt2(calc.under160OnHand),
      copyable: true
    },
    {
      line: "1",
      desc: "On hand at beginning — Rum",
      payLabel: "RUM_ONHAND",
      instruction: "Enter this value",
      value: fmt2(calc.rumOnHand),
      copyable: true
    },
    {
      line: "2",
      desc: "On hand at beginning — Vodka",
      payLabel: "VODKA_ONHAND",
      instruction: "Enter this value",
      value: fmt2(calc.vodkaOnHand),
      copyable: true
    },
    {
      line: "2",
      desc: "On hand at beginning — Under 190 proof",
      payLabel: "UNDER190_ONHAND",
      instruction: "Enter this value",
      value: fmt2(calc.under190OnHand),
      copyable: true
    },
    {
      line: "—",
      desc: "Total on hand (check)",
      payLabel: "TOTAL_ONHAND",
      instruction: "Pay.gov auto-calculates this (use as a check)",
      value: fmt2(calc.totalOnHand),
      copyable: false
    },
    {
      line: "—",
      desc: "Total on hand EOM (check)",
      payLabel: "TOTAL_ONHAND_EOM",
      instruction: "Pay.gov auto-calculates this (use as a check)",
      value: fmt2(calc.totalEOM),
      copyable: false
    }
  ];
}

/* ============================================================
   INIT
   ============================================================ */

(async function initReports() {
  try {
    // 1) Determine filing month (most recent LOCKED)
    const lockedMonth = await getMostRecentLockedMonth();
    setMonthBanner(lockedMonth);

    // If no locked month, still render tables with 0s (readable), but user can’t file yet
    const monthId = lockedMonth ? lockedMonth.id : null;

    // 2) Load month events (if month exists)
    const events = monthId ? await loadEventsForMonth(monthId) : [];

    // 3) Calculate each form
    const prodCalc = calcProduction511040(events);
    const procCalc = calcProcessing511028(events);
    const storCalc = calcStorage511011(events);

    // 4) Render
    renderRows("productionTable", buildProductionRows(prodCalc));
    renderRows("processingTable", buildProcessingRows(procCalc));
    renderRows("storageTable", buildStorageRows(storCalc));

  } catch (err) {
    console.error(err);

    // Fail-safe banner (do not crash page)
    const banner = el("reportMonthBanner");
    const label = el("filingMonthLabel");
    if (banner && label) {
      banner.classList.remove("good");
      banner.classList.add("warning");
      label.textContent = "ERROR LOADING MONTH";
    }

    // Render empty tables instead of leaving blank / broken UI
    renderRows("productionTable", buildProductionRows(calcProduction511040([])));
    renderRows("processingTable", buildProcessingRows(calcProcessing511028([])));
    renderRows("storageTable", buildStorageRows(calcStorage511011([])));
  }
})();
