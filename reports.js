/* ============================================================
   Monthly TTB Reports — Guided Pay.gov Assistant
   Form: 5110.40 (Production)
   READ-ONLY — GitHub Pages safe
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
   Firebase init (MATCHES compliance.js)
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

const el = id => document.getElementById(id);

const banner = el("reportMonthBanner");
const label  = el("filingMonthLabel");

/* ===============================
   Load most recent LOCKED month
   =============================== */

async function getMostRecentLockedMonth() {
  const snap = await getDocs(collection(db, "compliance_months"));
  const months = [];

  snap.forEach(doc => {
    months.push({ id: doc.id, ...doc.data() });
  });

  if (!months.length) return null;

  // locked = anything NOT open
  const locked = months.filter(m => m.status !== "open");
  if (!locked.length) return null;

  locked.sort((a, b) => a.id.localeCompare(b.id));
  return locked[locked.length - 1];
}

/* ===============================
   Production totals for month
   =============================== */

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

/* ===============================
   Render table
   =============================== */

const FIELDS = [
  ["1", "Produced — Whiskey", "Whiskey Produced", "whiskeyProduced"],
  ["1", "Produced — Rum", "Rum Produced", "rumProduced"],
  ["1", "Produced — Vodka", "Vodka Produced", "vodkaProduced"],
  ["1", "Produced — Gin", "Gin Produced", "ginProduced"],
  ["2", "Produced by Redistillation", "Redistilled", "redistilled"],
  ["5", "Transferred to Storage", "Transferred to Storage", "toStorage"]
];

function renderTable(totals) {
  const tbody = el("productionTable");
  tbody.innerHTML = "";

  FIELDS.forEach(([line, desc, paygov, key]) => {
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

/* ===============================
   Init
   =============================== */

(async function init() {
  try {
    const month = await getMostRecentLockedMonth();

    if (!month) {
      banner.classList.add("error");
      label.textContent = "NO LOCKED MONTH FOUND";
      return;
    }

    banner.classList.remove("warning", "error");
    banner.classList.add("success");
    label.textContent = month.id;

    const totals = await loadProductionTotals(month.id);
    renderTable(totals);

  } catch (err) {
    console.error(err);
    banner.classList.add("error");
    label.textContent = "ERROR LOADING MONTH";
  }
})();
