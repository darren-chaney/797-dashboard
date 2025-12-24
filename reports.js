/* ============================================================
   reports.js — Reports Shell Controller
   PURPOSE:
   - Determine filing month
   - Load Pay.gov form modules
   - NOTHING ELSE
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  initializeFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ===============================
   Firebase init (shared)
   =============================== */
const firebaseConfig = {
  apiKey: "AIzaSyDlubP6d8tR1x_ArJJRWvNxqhAGV720Vas",
  authDomain: "distillery-app-b4aaa.firebaseapp.com",
  projectId: "distillery-app-b4aaa"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});

/* ===============================
   DOM helpers
   =============================== */
const el = id => document.getElementById(id);

/* ===============================
   Filing month logic
   =============================== */
async function getLockedMonth() {
  const snap = await getDocs(collection(db, "compliance_months"));
  const months = [];

  snap.forEach(doc => {
    months.push({ id: doc.id, ...doc.data() });
  });

  months.sort((a, b) => a.id.localeCompare(b.id));
  const locked = months.filter(m => m.status === "locked");

  return locked.length ? locked[locked.length - 1] : null;
}

/* ===============================
   Include loader
   =============================== */
async function loadIncludes() {
  const nodes = document.querySelectorAll("[data-include]");

  for (const node of nodes) {
    const url = node.dataset.include;
    try {
      const html = await fetch(url).then(r => r.text());
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
   INIT (ORDER MATTERS)
   =============================== */
(async function initReportsShell() {

  // 1. Determine filing month
  const month = await getLockedMonth();
  el("filingMonthLabel").textContent = month ? month.id : "NO LOCKED MONTH";

  // 2. Load Pay.gov form modules
  await loadIncludes();

})();
