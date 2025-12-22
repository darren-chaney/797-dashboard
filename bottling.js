/* ============================================================
   Bottling Log — Auto Month + Guardrails
   Reporting month = month of run date (canonical rule)
   GitHub Pages safe
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  initializeFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ===============================
   Firebase init
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

const form = el("bottlingForm");
const bottleRows = el("bottleRows");
const totalsEl = el("calculatedTotals");
const entriesList = el("entriesList");
const monthStatusEl = el("monthStatus");
const runDateEl = el("bottlingDate");

/* ===============================
   Month utilities
   =============================== */

function monthFromDate(dateStr) {
  return dateStr.slice(0, 7); // YYYY-MM
}

async function getMonthById(monthId) {
  const snap = await getDocs(
    query(
      collection(db, "compliance_months"),
      where("__name__", "==", monthId)
    )
  );

  let month = null;
  snap.forEach(doc => {
    month = { id: doc.id, ...doc.data() };
  });

  return month;
}

/* ===============================
   Bottle row helpers
   =============================== */

function addBottleRow(size = "", count = "") {
  const row = document.createElement("div");
  row.className = "bottle-row";

  row.innerHTML = `
    <select class="bottle-size">
      <option value="">Size</option>
      <option value="750">750 mL</option>
      <option value="375">375 mL</option>
    </select>
    <input type="number" class="bottle-count" min="1" placeholder="Qty" />
    <button type="button">✕</button>
  `;

  row.querySelector("button").onclick = () => {
    row.remove();
    recalcTotals();
  };

  row.querySelectorAll("select,input").forEach(i => {
    i.addEventListener("input", recalcTotals);
  });

  row.querySelector(".bottle-size").value = size;
  row.querySelector(".bottle-count").value = count;

  bottleRows.appendChild(row);
}

/* ===============================
   Calculations
   =============================== */

function recalcTotals() {
  const proof = parseFloat(el("proof").value);
  if (!proof) {
    totalsEl.textContent = "Enter proof and bottles";
    return;
  }

  let totalLiters = 0;

  bottleRows.querySelectorAll(".bottle-row").forEach(row => {
    const size = parseFloat(row.querySelector(".bottle-size").value);
    const count = parseFloat(row.querySelector(".bottle-count").value);
    if (size && count) {
      totalLiters += (size / 1000) * count;
    }
  });

  const proofGallons = (totalLiters * (proof / 100)) / 3.78541;

  totalsEl.textContent =
    `${totalLiters.toFixed(2)} L · ${proofGallons.toFixed(2)} proof gal`;
}

/* ===============================
   Load entries for a month
   =============================== */

async function loadEntries(monthId) {
  entriesList.textContent = "Loading…";

  const snap = await getDocs(
    query(
      collection(db, "compliance_events"),
      where("eventType", "==", "bottling"),
      where("reportingMonth", "==", monthId)
    )
  );

  entriesList.innerHTML = "";

  snap.forEach(doc => {
    const d = doc.data();
    const div = document.createElement("div");
    div.className = "entry-card";
    div.textContent =
      `${d.date} · ${d.productName} · ${d.derived.proofGallons.toFixed(2)} pg`;
    entriesList.appendChild(div);
  });

  if (!entriesList.children.length) {
    entriesList.textContent = "No entries yet.";
  }
}

/* ===============================
   Month awareness
   =============================== */

async function updateMonthAwareness() {
  const dateStr = runDateEl.value;
  if (!dateStr) return;

  const reportingMonthId = monthFromDate(dateStr);
  const month = await getMonthById(reportingMonthId);

  if (!month) {
    monthStatusEl.innerHTML =
      `This run would fall under <strong>${reportingMonthId}</strong>, which does not exist.`;
    form.querySelector("button.primary").disabled = true;
    return;
  }

  monthStatusEl.innerHTML = `
    <strong>Reporting month:</strong> ${month.id}<br>
    <strong>Status:</strong>
      <span class="${month.status === "open" ? "good" : "warn"}">
        ${month.status.toUpperCase()}
      </span>
  `;

  if (month.status !== "open") {
    form.querySelector("button.primary").disabled = true;
    totalsEl.textContent = "Month is locked — entries disabled.";
  } else {
    form.querySelector("button.primary").disabled = false;
    loadEntries(month.id);
  }

  return month;
}

/* ===============================
   Save entry
   =============================== */

async function handleSubmit(e) {
  e.preventDefault();

  const dateStr = runDateEl.value;
  if (!dateStr) return alert("Run date required");

  const reportingMonthId = monthFromDate(dateStr);
  const month = await getMonthById(reportingMonthId);

  if (!month || month.status !== "open") {
    alert("This compliance month is locked. Entry not allowed.");
    return;
  }

  const proof = parseFloat(el("proof").value);
  if (!proof) return alert("Proof required");

  let bottles = [];
  let totalLiters = 0;

  bottleRows.querySelectorAll(".bottle-row").forEach(row => {
    const size = parseFloat(row.querySelector(".bottle-size").value);
    const count = parseFloat(row.querySelector(".bottle-count").value);
    if (size && count) {
      bottles.push({ size_ml: size, count });
      totalLiters += (size / 1000) * count;
    }
  });

  if (!bottles.length) return alert("Enter at least one bottle size");

  const proofGallons =
    (totalLiters * (proof / 100)) / 3.78541;

  await addDoc(collection(db, "compliance_events"), {
    eventType: "bottling",
    reportingMonth: reportingMonthId,
    date: dateStr,
    productName: el("productName").value.trim(),
    productType: el("productType").value,
    proof,
    bottles,
    derived: {
      liters: totalLiters,
      proofGallons
    },
    createdAt: new Date().toISOString(),
    createdBy: "dev"
  });

  form.reset();
  bottleRows.innerHTML = "";
  addBottleRow();
  totalsEl.textContent = "Saved";

  updateMonthAwareness();
}

/* ===============================
   Init
   =============================== */

(function init() {
  addBottleRow();

  // Default run date = today
  runDateEl.value = new Date().toISOString().slice(0, 10);

  runDateEl.addEventListener("change", updateMonthAwareness);
  form.addEventListener("submit", handleSubmit);

  updateMonthAwareness();
})();
