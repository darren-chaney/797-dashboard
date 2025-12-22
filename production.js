/* ============================================================
   Production Runs — FINAL
   - One run = one event
   - Volume in liters
   - Proof per event
   - Auto month from run date
   - Month lock guardrails
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

const form = el("productionForm");
const entriesList = el("entriesList");
const monthStatusEl = el("monthStatus");
const runDateEl = el("runDate");
const totalsEl = el("calculatedTotals");
const tankSelect = el("tankSelect");

/* ===============================
   Utilities
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
  snap.forEach(doc => month = { id: doc.id, ...doc.data() });
  return month;
}

/* ===============================
   Tanks (simple named list)
   =============================== */

async function loadTanks() {
  const snap = await getDocs(collection(db, "tanks"));
  tankSelect.innerHTML = `<option value="">Select tank…</option>`;

  snap.forEach(doc => {
    const t = doc.data();
    const opt = document.createElement("option");
    opt.value = doc.id;
    opt.textContent = t.name;
    tankSelect.appendChild(opt);
  });
}

/* ===============================
   Calculations
   =============================== */

function recalcTotals() {
  const liters = parseFloat(el("volumeLiters").value);
  const proof = parseFloat(el("proof").value);

  if (!liters || !proof) {
    totalsEl.textContent = "Enter volume and proof";
    return;
  }

  const wineGallons = liters / 3.78541;
  const proofGallons = wineGallons * (proof / 100);

  totalsEl.textContent =
    `${wineGallons.toFixed(2)} wine gal · ${proofGallons.toFixed(2)} proof gal`;
}

/* ===============================
   Load entries
   =============================== */

async function loadEntries(monthId) {
  entriesList.textContent = "Loading…";

  const snap = await getDocs(
    query(
      collection(db, "compliance_events"),
      where("eventType", "==", "production"),
      where("reportingMonth", "==", monthId)
    )
  );

  entriesList.innerHTML = "";

  snap.forEach(doc => {
    const d = doc.data();
    const div = document.createElement("div");
    div.className = "entry-card";
    div.textContent =
      `${d.date} · ${d.runType} · ${d.derived.proofGallons.toFixed(2)} pg → ${d.destination.tankName}`;
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
      `This run would record under <strong>${reportingMonthId}</strong>, which does not exist.`;
    form.querySelector("button.primary").disabled = true;
    return;
  }

  monthStatusEl.innerHTML = `
    <strong>Recorded under:</strong> ${month.id}<br>
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
}

/* ===============================
   Save
   =============================== */

async function handleSubmit(e) {
  e.preventDefault();

  const dateStr = runDateEl.value;
  const reportingMonthId = monthFromDate(dateStr);
  const month = await getMonthById(reportingMonthId);

  if (!month || month.status !== "open") {
    alert("This compliance month is locked.");
    return;
  }

  const liters = parseFloat(el("volumeLiters").value);
  const proof = parseFloat(el("proof").value);

  if (!liters || liters <= 0) return alert("Invalid volume");
  if (!proof || proof <= 0 || proof > 200) return alert("Invalid proof");

  const wineGallons = liters / 3.78541;
  const proofGallons = wineGallons * (proof / 100);

  const tankId = tankSelect.value;
  const tankName = tankSelect.options[tankSelect.selectedIndex]?.text;

  await addDoc(collection(db, "compliance_events"), {
    eventType: "production",
    reportingMonth: reportingMonthId,
    date: dateStr,
    runType: el("runType").value,
    proof,
    volumeLiters: liters,
    derived: {
      wineGallons,
      proofGallons
    },
    destination: {
      type: "tank",
      tankId,
      tankName
    },
    notes: el("notes").value.trim(),
    createdAt: new Date().toISOString(),
    createdBy: "dev"
  });

  form.reset();
  totalsEl.textContent = "Saved";
  await loadEntries(reportingMonthId);
  updateMonthAwareness();
}

/* ===============================
   Init
   =============================== */

(async function init() {
  runDateEl.value = new Date().toISOString().slice(0, 10);

  await loadTanks();

  runDateEl.onchange = updateMonthAwareness;
  el("volumeLiters").oninput = recalcTotals;
  el("proof").oninput = recalcTotals;

  form.addEventListener("submit", handleSubmit);

  updateMonthAwareness();
})();
