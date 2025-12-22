import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs
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
const db = getFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false
});



/* ===============================
   State
   =============================== */

const currentMonth = "2026-01"; // later derived automatically
const bottleRowsEl = document.getElementById("bottleRows");
const totalsEl = document.getElementById("calculatedTotals");

/* ===============================
   Bottle rows
   =============================== */

function addBottleRow(size = "", count = "") {
  const row = document.createElement("div");
  row.className = "bottle-row";

  row.innerHTML = `
    <input type="number" placeholder="mL" value="${size}" class="size" />
    <input type="number" placeholder="Count" value="${count}" class="count" />
    <button type="button" class="remove">✕</button>
  `;

  row.querySelector(".remove").onclick = () => {
    row.remove();
    calculateTotals();
  };

  row.querySelectorAll("input").forEach(i =>
    i.addEventListener("input", calculateTotals)
  );

  bottleRowsEl.appendChild(row);
}

document.getElementById("addBottleRow").onclick = () => addBottleRow();

/* ===============================
   Calculations
   =============================== */

function calculateTotals() {
  const proof = parseFloat(document.getElementById("proof").value);
  if (!proof) return;

  let totalMl = 0;
  let totalBottles = 0;

  document.querySelectorAll(".bottle-row").forEach(row => {
    const size = parseFloat(row.querySelector(".size").value);
    const count = parseFloat(row.querySelector(".count").value);
    if (size && count) {
      totalMl += size * count;
      totalBottles += count;
    }
  });

  if (!totalMl) return;

  const liters = totalMl / 1000;
  const wineGallons = liters / 3.78541;
  const proofGallons = wineGallons * (proof / 100);

  totalsEl.innerHTML = `
    Bottles (internal): ${totalBottles}<br>
    Wine gallons: ${wineGallons.toFixed(2)}<br>
    Proof gallons (TTB): ${proofGallons.toFixed(2)}
  `;
}

/* ===============================
   Save event
   =============================== */

document.getElementById("bottlingForm").onsubmit = async e => {
  e.preventDefault();

  const bottles = [];
  document.querySelectorAll(".bottle-row").forEach(row => {
    const size = parseFloat(row.querySelector(".size").value);
    const count = parseFloat(row.querySelector(".count").value);
    if (size && count) bottles.push({ sizeMl: size, count });
  });

  if (!bottles.length) {
    alert("Add at least one bottle size");
    return;
  }

  const proof = parseFloat(document.getElementById("proof").value);
  let totalMl = bottles.reduce((s, b) => s + b.sizeMl * b.count, 0);
  let liters = totalMl / 1000;
  let wineGallons = liters / 3.78541;
  let proofGallons = wineGallons * (proof / 100);

  await addDoc(collection(db, "compliance_events"), {
    eventType: "bottling",
    reportingMonth: currentMonth,
    eventDate: document.getElementById("bottlingDate").value,
    productName: document.getElementById("productName").value,
    productType: document.getElementById("productType").value,
    proof,
    bottles,
    derived: {
      totalBottles: bottles.reduce((s, b) => s + b.count, 0),
      wineGallons,
      proofGallons
    },
    notes: document.getElementById("notes").value,
    createdAt: new Date(),
    createdBy: "dev"
  });

  location.reload();
};

/* ===============================
   Load entries
   =============================== */

async function loadEntries() {
  const q = query(
    collection(db, "compliance_events"),
    where("eventType", "==", "bottling"),
    where("reportingMonth", "==", currentMonth)
  );

  const snap = await getDocs(q);
  const list = document.getElementById("entriesList");

  snap.forEach(doc => {
    const d = doc.data();
    const card = document.createElement("div");
    card.className = "entry-card";
    card.innerHTML = `
      <strong>${d.productName}</strong><br>
      ${d.proof} proof · ${d.derived.totalBottles} bottles<br>
      Proof gallons: ${d.derived.proofGallons.toFixed(2)}
    `;
    list.appendChild(card);
  });
}

loadEntries();
