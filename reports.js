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
   SCRIPT LOADER (BULLETPROOF)
   =============================== */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src + "?v=" + Date.now(); // cache bust
    s.defer = true;

    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));

    document.body.appendChild(s);
  });
}

/* ===============================
   INIT
   =============================== */
(async function initReportsShell() {

  el("filingMonthLabel").textContent = "NOT SET";

  // 1. Load all module HTML
  await loadIncludes();

  // 2. Load module logic AFTER HTML exists
   await loadScript("5110-40.js");
   await loadScript("5110-28.js");
   await loadScript("5110-11.js");

})();
