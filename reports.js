/* ============================================================
   reports.js — Reports Shell Controller
   PURPOSE:
   - Load Pay.gov form modules
   - Display filing month
   - DOES NOT touch module Firestore queries
   ============================================================ */

/* ===============================
   DOM helpers
   =============================== */
const el = id => document.getElementById(id);

/* ===============================
   Include loader
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
   SCRIPT LOADER
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
   FIRESTORE (GLOBAL SDK)
   =============================== */
function getDB() {
  if (!window.firebase || !firebase.firestore) return null;
  return firebase.firestore();
}

/* ===============================
   Filing Month Display
   =============================== */
async function setFilingMonthLabel() {
  const db = getDB();
  if (!db) {
    el("filingMonthLabel").textContent = "Unknown";
    return;
  }

  const snap = await db.collection("compliance_months").get();
  const months = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  months.sort((a, b) => a.id.localeCompare(b.id));

  const locked = months.filter(m => m.status === "locked");
  if (!locked.length) {
    el("filingMonthLabel").textContent = "None Locked";
    return;
  }

  const m = locked[locked.length - 1];

  // Expecting IDs like "2025-12"
  const [year, month] = m.id.split("-");
  const label = new Date(year, month - 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric"
  });

  el("filingMonthLabel").textContent =
    `${label} (Locked)`;
}


/* ===============================
   INIT
   =============================== */
(async function initReportsShell() {

  // Load module HTML
  await loadIncludes();

  // Set filing month label
  await setFilingMonthLabel();

  // Load module logic
  await loadScript("5110-40.js");
  await loadScript("5110-28.js");
  await loadScript("5110-11.js");

})();
