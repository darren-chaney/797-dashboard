/* ============================================================
   reports.js — Reports Shell Controller
   PURPOSE:
   - Load Pay.gov form modules
   - Control filing month selection
   - DOES NOT touch module Firestore queries
   ============================================================ */

/* ===============================
   DOM helpers
   =============================== */
const el = id => document.getElementById(id);

/* ===============================
   Global reporting month
   =============================== */
window.REPORTING_MONTH = null;

/* ===============================
   Include loader (HTML modules)
   =============================== */
async function loadIncludes() {
  const nodes = document.querySelectorAll("[data-include]");

  for (const node of nodes) {
    const url = node.dataset.include;
    try {
      const html = await fetch(url).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      });
      node.innerHTML = html;
    } catch (err) {
      node.innerHTML = `<div class="module-error">
        Failed to load ${url}
      </div>`;
      console.error(err);
    }
  }
}

/* ===============================
   Script loader (non-module JS)
   =============================== */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src + "?v=" + Date.now();
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });
}

/* ===============================
   Firestore (global SDK)
   =============================== */
function getDB() {
  if (!window.firebase || !firebase.firestore) return null;
  return firebase.firestore();
}

/* ===============================
   Helpers
   =============================== */
function getPreviousMonthId() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(id) {
  const [year, month] = id.split("-");
  return new Date(year, month - 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric"
  });
}

/* ===============================
   Filing Month Selector
   =============================== */
async function initFilingMonthSelector() {
  const db = getDB();
  const select = el("filingMonthSelect");
  const statusEl = el("filingMonthStatus");

  if (!db || !select || !statusEl) {
    console.warn("Filing month selector unavailable");
    return;
  }

  const snap = await db.collection("compliance_months").get();
  const months = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  months.sort((a, b) => a.id.localeCompare(b.id));

  if (!months.length) {
    statusEl.textContent = "No months found";
    return;
  }

  /* Build dropdown */
  select.innerHTML = "";
  months.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent =
      `${monthLabel(m.id)}${m.status === "locked" ? " 🔒" : ""}`;
    select.appendChild(opt);
  });

  /* Choose default month
     1. Latest locked month
     2. Otherwise previous calendar month
     3. Otherwise last available
  */
  const locked = months.filter(m => m.status === "locked");
  let defaultMonth;

  if (locked.length) {
    defaultMonth = locked[locked.length - 1];
  } else {
    const prevId = getPreviousMonthId();
    defaultMonth =
      months.find(m => m.id === prevId) ||
      months[months.length - 1];
  }

  select.value = defaultMonth.id;
  window.REPORTING_MONTH = defaultMonth.id;

  statusEl.textContent =
    defaultMonth.status === "locked"
      ? "(Locked)"
      : "(Open)";

  /* React to user changes */
  select.onchange = () => {
    const selected = months.find(m => m.id === select.value);
    if (!selected) return;

    window.REPORTING_MONTH = selected.id;

    const prevId = getPreviousMonthId();

    if (selected.id > prevId) {
      statusEl.textContent =
        "⚠️ Pay.gov reports are usually filed for the previous month";
      statusEl.classList.add("warn");
    } else {
      statusEl.textContent =
        selected.status === "locked" ? "(Locked)" : "(Open)";
      statusEl.classList.remove("warn");
    }

    /* Notify modules */
    document.dispatchEvent(
      new CustomEvent("reporting-month-changed", {
        detail: { monthId: selected.id }
      })
    );
  };
}

/* ===============================
   INIT
   =============================== */
(async function initReportsShell() {

  /* Load HTML modules */
  await loadIncludes();

  /* Init filing month selector */
  await initFilingMonthSelector();

  /* Load report logic */
  await loadScript("5110-40.js");
  await loadScript("5110-28.js");
  await loadScript("5110-11.js");

})();
