/* ============================================================
   Bottling Log — FINAL
   - Auto month from run date
   - Month lock guardrails
   - Multiple bottle sizes (375 / 750 / custom mL)
   - Append-only ledger
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
const addRowBtn = el("addBottleRow");

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
   Bottle rows
   =============================== */

function addBottleRow(size = "", count = "") {
  const row = document.createElement("div");
  row.className = "bottle-row";

  row.innerHTML = `
    <select class="bottle-size">
      <option value="">Size</option>
      <option value="375">375 mL</option>
      <option value="750">750 mL</option>
      <option value="custom">Custom</option>
    </select>
    <input type="number" class="bottle-custom" min="1" placeholder="mL" style="display:none;" />
    <input type="number" class="bottle-count" min="1" placeholder="Qty" />
    <button type="button">✕</button>
  `;

  const sizeSel = row.querySelector(".bottle-size");
  const customInput = row.querySelector(".bottle-custom");
  const countInput = row.querySelector(".bottle-count");

  sizeSel.onchange = () => {
    customInput.style.display = sizeSel.value === "custom" ? "inline-block" : "none";
    recalcTotals();
  };

  row.querySelector("button").onclick = () => {
    row.remove();
    recalcTotals();
  };

  [sizeSel, customInput, countInput].forEach(i =>
    i.addEventListener("input", recalcTotals)
  );

  bottleRows.appendChild(row);
}

/* ===============================
   Calculations
   =============================== */

function recalcTotals() {
  const proof = parseFloat(el("proof").value);
  if (!proof || proof <= 0 || proof > 200) {
    totalsEl.textContent = "Enter a valid proof (1–200)";
    return;
  }

  let totalLiters = 0;

  bottleRows.querySelectorAll(".bottle-row").forEach(row => {
    const sizeSel = row.querySelector(".bottle-size").value;
    const customML = parseFloat(row.querySelector(".bottle-custom").value);
    const count = parseFloat(row.querySelector(".bottle-count").value);

    let sizeML = 0;
    if (sizeSel === "375") sizeML = 375;
    else if (sizeSel === "750") sizeML = 750;
    else if (sizeSel === "custom" && customML > 0) sizeML = customML;

    if (sizeML > 0 && count > 0) {
      totalLiters += (sizeML / 1000) * count;
    }
  });

  if (!totalLiters) {
    totalsEl.textContent = "Enter bottles";
    return;
  }

  const wineGallons = totalLiters / 3.78541;
  const proofGallons = wineGallons * (proof / 100);

  totalsEl.textContent =
    `${totalLiters.toFixed(2)} L · ${wineGallons.toFixed(2)} wine gal · ${proofGallons.toFixed(2)} proof gal`;
}

/* ===============================
   Load entries
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

  const proof = parseFloat(el("proof").value);
  if (!proof || proof <= 0 || proof > 200) {
    alert("Invalid proof");
    return;
  }

  let bottles = [];
  let totalLiters = 0;

  bottleRows.querySelectorAll(".bottle-row").forEach(row => {
    const sizeSel = row.querySelector(".bottle-size").value;
    const customML = parseFloat(row.querySelector(".bottle-custom").value);
    const count = parseFloat(row.querySelector(".bottle-count").value);

    let sizeML = 0;
    if (sizeSel === "375") sizeML = 375;
    else if (sizeSel === "750") sizeML = 750;
    else if (sizeSel === "custom" && customML > 0) sizeML = customML;

    if (sizeML > 0 && count > 0) {
      bottles.push({ size_ml: sizeML, count });
      totalLiters += (sizeML / 1000) * count;
    }
  });

  if (!bottles.length) {
    alert("Enter at least one bottle row");
    return;
  }

  const wineGallons = totalLiters / 3.78541;
  const proofGallons = wineGallons * (proof / 100);

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
      wineGallons,
      proofGallons
    },
    createdAt: new Date().toISOString(),
    createdBy: "dev"
  });

  form.reset();
   bottleRows.innerHTML = "";
   addBottleRow();
   totalsEl.textContent = `Saved to ${reportingMonthId}`;
   await loadEntries(reportingMonthId);
   updateMonthAwareness();
}

/* ===============================
   Init
   =============================== */

(function init() {
  runDateEl.value = new Date().toISOString().slice(0, 10);
  addBottleRow();

  addRowBtn.onclick = () => addBottleRow();
  runDateEl.onchange = updateMonthAwareness;
  el("proof").oninput = recalcTotals;

  form.addEventListener("submit", handleSubmit);
  updateMonthAwareness();
})();
