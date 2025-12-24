/* ============================================================
   reports.js — Reports Shell Controller
   PURPOSE:
   - Load Pay.gov form modules
   - DOES NOT touch Firestore
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
   MODULE LOADER (DETERMINISTIC)
   =============================== */
async function loadModule(src) {
  // cache-bust to avoid Safari module caching issues
  await import(`./${src}?v=${Date.now()}`);
}

/* ===============================
   INIT
   =============================== */
(async function initReportsShell() {

  // Filing month placeholder for now
  el("filingMonthLabel").textContent = "NOT SET";

  // Load Pay.gov form modules (HTML)
  await loadIncludes();

  // Load module logic AFTER HTML exists
  await loadModule("5110-40.js");

})();
