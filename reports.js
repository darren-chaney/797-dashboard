/* ============================================================
   reports.js
   Monthly TTB Reports — Pay.gov Guided Assistant (Read-only)

   Critical rules:
   - Reads Firestore only (no writes)
   - Shows line-by-line guidance
   - Copy buttons for values
   - Includes Pay.gov auto-calculated reference rows
     (so the user can confirm totals match Pay.gov)

   Notes:
   - Fixes your 404: we DO NOT load "./firebase.js"
     We load Firebase modules from gstatic, same as compliance.js.
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

/* ===============================
   UI state
   =============================== */

let months = [];          // compliance_months docs
let selectedMonthId = ""; // YYYY-MM
let selectedForm = "production";

/* ===============================
   Month loading + default selection
   =============================== */

async function loadMonths() {
  const snap = await getDocs(collection(db, "compliance_months"));
  const list = [];
  snap.forEach(d => list.push({ id: d.id, ...d.data() }));

  // Sort YYYY-MM ascending
  list.sort((a, b) => a.id.localeCompare(b.id));
  months = list;
}

function getMostRecentLockedMonth() {
  const locked = months.filter(m => m.status === "locked");
  if (!locked.length) return null;
  return locked[locked.length - 1];
}

function populateMonthSelect() {
  const sel = el("reportMonth");
  sel.innerHTML = "";

  // Only show locked months here (filing months)
  const locked = months.filter(m => m.status === "locked");

  if (!locked.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No locked months found";
    sel.appendChild(opt);
    return;
  }

  locked.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.id;
    sel.appendChild(opt);
  });

  // Default: most recent locked
  const mostRecentLocked = locked[locked.length - 1];
  selectedMonthId = mostRecentLocked.id;
  sel.value = selectedMonthId;
}

function renderLockedMonthBanner() {
  const banner = el("lockedMonthBanner");
  const m = months.find(x => x.id === selectedMonthId);

  if (!m) {
    banner.classList.add("hidden");
    return;
  }

  // Banner is about filing month (locked)
  banner.classList.remove("hidden");
  banner.innerHTML = `
    <strong>Filing month:</strong> ${m.id}
    <span class="dot"></span>
    <strong>Status:</strong> ${String(m.status || "").toUpperCase()}
    ${m.filingDueDate ? `<span class="dot"></span><strong>Due:</strong> ${m.filingDueDate}` : ""}
  `;
}

/* ===============================
   Firestore reading (events -> totals)
   =============================== */

/**
 * Pull compliance events for a month.
 * You already use compliance_events for bottling/production/storage.
 */
async function getEventsForMonth(monthId) {
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

/* ===============================
   Formatting + copy
   =============================== */

function fmt2(n) {
  const x = Number(n || 0);
  if (!Number.isFinite(x)) return "0.00";
  return x.toFixed(2);
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(String(text));
  } catch (e) {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = String(text);
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

/* ===============================
   Row rendering
   =============================== */

/**
 * Row model:
 * {
 *   line: "1",
 *   desc: "Produced — Whiskey",
 *   paygovLabel: "Whiskey Produced",
 *   instruction: "Enter this value",
 *   value: 0.00,
 *   copyValue: "0.00",
 *   isAuto: false
 * }
 */
function renderRows(rows) {
  const tbody = el("reportRows");
  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="muted">No rows configured.</td></tr>`;
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement("tr");

    const v = fmt2(r.value);
    const copyVal = (r.copyValue != null) ? String(r.copyValue) : v;

    tr.innerHTML = `
      <td class="mono">${r.line}</td>
      <td>${r.desc}</td>
      <td class="muted">${r.paygovLabel || ""}</td>
      <td class="${r.isAuto ? "muted" : ""}">
        ${r.instruction || ""}
      </td>
      <td class="mono" style="text-align:right;">${v}</td>
      <td>
        <button class="copy-btn" type="button" data-copy="${copyVal}">
          Copy
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Bind copy handlers
  tbody.querySelectorAll("button.copy-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const val = btn.getAttribute("data-copy") || "0.00";
      await copyToClipboard(val);
      btn.textContent = "Copied";
      setTimeout(() => (btn.textContent = "Copy"), 800);
    });
  });
}

/* ===============================
   FORM: Production (TTB 5110.40)
   =============================== */

/**
 * IMPORTANT:
 * These keys exist in your Pay.gov HTML form definition and show
 * what Pay.gov will auto-calculate.
 *
 * Example: Produced_Total is computed from component parts in Pay.gov.
 * (We show it as a reference row to help the user verify totals.)
 *
 * Source: Pay.gov 5110.40 HTML includes calculateValue for Produced_Total.
 */
function buildProductionRowsFromEvents(/* events */) {
  // For now you said there’s no real data yet, so zeros are fine.
  // When you start entering December events, we’ll map them correctly.

  const producedWhiskey = 0;
  const producedRum = 0;
  const producedVodka = 0;
  const producedGin = 0;
  const redistilled = 0;

  // Our reference total (mirrors Pay.gov “Produced_Total” behavior)
  // Pay.gov key: Produced_Total :contentReference[oaicite:5]{index=5}
  const producedTotal =
    producedWhiskey +
    producedRum +
    producedVodka +
    producedGin;

  // Transferred to storage (placeholder until we wire to storage events)
  const transferredToStorage = 0;

  return [
    {
      line: "1",
      desc: "Produced — Whiskey",
      paygovLabel: "Whiskey Produced",
      instruction: "Enter this value",
      value: producedWhiskey
    },
    {
      line: "1",
      desc: "Produced — Rum",
      paygovLabel: "Rum Produced",
      instruction: "Enter this value",
      value: producedRum
    },
    {
      line: "1",
      desc: "Produced — Vodka",
      paygovLabel: "Vodka Produced",
      instruction: "Enter this value",
      value: producedVodka
    },
    {
      line: "1",
      desc: "Produced — Gin",
      paygovLabel: "Gin Produced",
      instruction: "Enter this value",
      value: producedGin
    },

    // Pay.gov auto-calculated reference row
    {
      line: "13",
      desc: "Produced — TOTAL (Reference)",
      paygovLabel: "Produced (Total Lines 1 through 13) — Total (Produced_Total)",
      instruction: "Pay.gov auto-calculates this (use to verify your entries)",
      value: producedTotal,
      isAuto: true
    },

    {
      line: "2",
      desc: "Produced by Redistillation",
      paygovLabel: "Redistilled",
      instruction: "Enter this value",
      value: redistilled
    },
    {
      line: "5",
      desc: "Transferred to Storage",
      paygovLabel: "Transferred to Storage",
      instruction: "Enter this value",
      value: transferredToStorage
    }
  ];
}

/* ===============================
   FORM: Storage (TTB 5110.11)
   =============================== */

/**
 * Storage Pay.gov HTML has lots of totals + validations.
 * We MUST include at least one Pay.gov auto-total row.
 *
 * Example: TOTAL_5 = total of all “Line 5” columns in storage.
 * Pay.gov key: TOTAL_5 :contentReference[oaicite:6]{index=6}
 */
function buildStorageRowsFromEvents(/* events */) {
  // Placeholder zeros until you start entering storage events
  const line5_total_allClasses = 0; // This corresponds to Pay.gov TOTAL_5 concept

  return [
    {
      line: "1",
      desc: "On hand beginning of month (All classes)",
      paygovLabel: "On hand beginning of month",
      instruction: "Enter this value",
      value: 0
    },
    {
      line: "2",
      desc: "Deposited in bond (All classes)",
      paygovLabel: "Deposited in bond",
      instruction: "Enter this value",
      value: 0
    },
    {
      line: "3",
      desc: "Received in bond (All classes)",
      paygovLabel: "Received in bond",
      instruction: "Enter this value",
      value: 0
    },
    {
      line: "4",
      desc: "Returned to bond (All classes)",
      paygovLabel: "Returned to bond",
      instruction: "Enter this value",
      value: 0
    },

    // Pay.gov auto-calculated reference row
    {
      line: "5",
      desc: "TOTAL (Lines 1–4) — Reference (Pay.gov TOTAL_5)",
      paygovLabel: "TOTAL (Lines 1 through 5) — Total column (TOTAL_5)",
      instruction: "Pay.gov auto-calculates this (use to verify your entries)",
      value: line5_total_allClasses,
      isAuto: true
    }
  ];
}

/* ===============================
   FORM: Processing (TTB 5110.28) — scaffold only for now
   =============================== */

function buildProcessingRowsScaffold() {
  return [
    {
      line: "—",
      desc: "Processing form scaffold",
      paygovLabel: "TTB 5110.28 (Pay.gov HTML keys exist; implementing next)",
      instruction: "Leave blank (not yet implemented)",
      value: 0,
      isAuto: true
    }
  ];
}

/* ===============================
   Main render for selected form
   =============================== */

async function render() {
  const title = el("sectionTitle");
  const subtitle = el("sectionSubtitle");
  const notes = el("notes");

  title.textContent = "Loading…";
  subtitle.textContent = "";
  notes.textContent = "";

  // If no locked months exist
  if (!selectedMonthId) {
    title.textContent = "No locked month found";
    subtitle.textContent = "Lock a month before filing.";
    renderRows([]);
    return;
  }

  // Pull events once per render (we’ll wire mapping later)
  const events = await getEventsForMonth(selectedMonthId);

  if (selectedForm === "production") {
    title.textContent = "TTB 5110.40 — Monthly Report of Production Operations";
    subtitle.textContent = "Read-only values + copy buttons for Pay.gov entry.";
    renderRows(buildProductionRowsFromEvents(events));
    notes.innerHTML = `
      <strong>Note:</strong> Values are read-only and meant to be copied into Pay.gov.
      The “TOTAL (Reference)” row mirrors Pay.gov auto-calculations (e.g., Produced_Total).
    `;
    return;
  }

  if (selectedForm === "storage") {
    title.textContent = "TTB 5110.11 — Monthly Report of Storage Operations";
    subtitle.textContent = "Read-only values + copy buttons for Pay.gov entry.";
    renderRows(buildStorageRowsFromEvents(events));
    notes.innerHTML = `
      <strong>Note:</strong> Storage contains Pay.gov auto-calculated totals/validations.
      We show at least one reference total row (e.g., TOTAL_5) so Rashelle can confirm the math matches Pay.gov.
    `;
    return;
  }

  // processing
  title.textContent = "TTB 5110.28 — Monthly Report of Processing Operations";
  subtitle.textContent = "Scaffold — implementing next.";
  renderRows(buildProcessingRowsScaffold());
  notes.textContent = "Next step: implement the required Processing sections using the Pay.gov HTML field keys.";
}

/* ===============================
   Init + event handlers
   =============================== */

(async function init() {
  // Bind selector changes
  el("reportMonth").addEventListener("change", async (e) => {
    selectedMonthId = e.target.value;
    renderLockedMonthBanner();
    await render();
  });

  el("reportType").addEventListener("change", async (e) => {
    selectedForm = e.target.value;
    await render();
  });

  try {
    await loadMonths();
    populateMonthSelect();

    // Also set default form selection
    selectedForm = el("reportType").value;

    // Show banner right away
    renderLockedMonthBanner();

    // Render first view
    await render();

  } catch (err) {
    console.error(err);
    el("sectionTitle").textContent = "Error loading reports.";
    el("sectionSubtitle").textContent = "Check console for details.";
    el("notes").textContent = "";
    renderRows([]);
  }
})();
