/* ============================================================
   Bottling Log — Compliance
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

const bottleRows = el("bottleRows");
const addBottleRowBtn = el("addBottleRow");
const form = el("bottlingForm");
const totalsEl = el("calculatedTotals");
const entriesList = el("entriesList");

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

  const removeBtn = row.querySelector("button");
  removeBtn.onclick = () => {
    row.remove();
    recalcTotals();
  };

  row.querySelector(".bottle-size").value = size;
  row.querySelector(".bottle-count").value = count;

  row.querySelectorAll("select,input").forEach(i => {
    i.addEventListener("input", recalcTotals);
  });

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
   Save entry
   =============================== */

form.addEventListener("submit", async e => {
  e.preventDefault();

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

  const reportingMonth = el("bottlingDate").value.slice(0, 7);

  await addDoc(collection(db, "compliance_events"), {
    eventType: "bottling",
    reportingMonth,
    date: el("bottlingDate").value,
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

  loadEntries();
});

/* ===============================
   Load entries
   =============================== */

async function loadEntries() {
  entriesList.textContent = "Loading…";

  const snap = await getDocs(
    query(
      collection(db, "compliance_events"),
      where("eventType", "==", "bottling")
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
   Init
   =============================== */

addBottleRow();
loadEntries();
