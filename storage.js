/* ============================================================
   Storage Events — Bulk + Barrel
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
   Firebase init (GitHub Pages safe)
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

const form = el("storageForm");
const dateEl = el("storageDate");
const typeEl = el("storageType");
const tankSelect = el("tankSelect");
const barrelWrap = el("barrelWrap");
const tankWrap = el("tankWrap");
const barrelIdEl = el("barrelId");
const proofEl = el("proof");
const pgEl = el("proofGallons");
const monthStatusEl = el("monthStatus");
const entriesList = el("entriesList");

/* ===============================
   Utilities
   =============================== */

function monthFromDate(d){
  return d.slice(0,7);
}

async function getMonth(monthId){
  const snap = await getDocs(
    query(collection(db, "compliance_months"), where("__name__", "==", monthId))
  );
  let m = null;
  snap.forEach(doc => m = { id: doc.id, ...doc.data() });
  return m;
}

/* ===============================
   Tanks
   =============================== */

async function loadTanks(){
  const snap = await getDocs(collection(db, "tanks"));
  tankSelect.innerHTML = `<option value="">Select tank…</option>`;

  snap.forEach(doc => {
    const opt = document.createElement("option");
    opt.value = doc.id;
    opt.textContent = doc.data().name;
    tankSelect.appendChild(opt);
  });
}

/* ===============================
   Month awareness
   =============================== */

async function updateMonth(){
  if (!dateEl.value) return;

  const monthId = monthFromDate(dateEl.value);
  const m = await getMonth(monthId);

  if (!m){
    monthStatusEl.textContent = `Month ${monthId} does not exist`;
    form.querySelector("button").disabled = true;
    return;
  }

  monthStatusEl.innerHTML =
  `<strong>${m.id}</strong> — <span class="${m.status}">${m.status.toUpperCase()}</span>`;


  form.querySelector("button").disabled = (m.status !== "open");

  if (m.status === "open"){
    loadEntries(monthId);
  }
}

/* ===============================
   Load entries
   =============================== */

async function loadEntries(monthId){
  entriesList.textContent = "Loading…";

  const snap = await getDocs(
    query(
      collection(db, "compliance_events"),
      where("eventType", "==", "storage"),
      where("reportingMonth", "==", monthId)
    )
  );

  entriesList.innerHTML = "";

  snap.forEach(doc => {
    const d = doc.data();
    const div = document.createElement("div");
    div.className = "entry-card";

    if (d.storageType === "bulk"){
      div.textContent =
        `${d.date} · BULK → ${d.destination.tankName} · ${d.proofGallons.toFixed(2)} pg`;
    } else {
      div.textContent =
        `${d.date} · BARREL → ${d.destination.barrelId} · ${d.proofGallons.toFixed(2)} pg`;
    }

    entriesList.appendChild(div);
  });

  if (!entriesList.children.length){
    entriesList.textContent = "No storage events yet.";
  }
}

/* ===============================
   Storage type toggle
   =============================== */

typeEl.onchange = () => {
  if (typeEl.value === "barrel"){
    barrelWrap.style.display = "block";
    tankWrap.style.display = "none";
  } else {
    barrelWrap.style.display = "none";
    tankWrap.style.display = "block";
  }
};

/* ===============================
   Save
   =============================== */

form.addEventListener("submit", async e => {
  e.preventDefault();

  const monthId = monthFromDate(dateEl.value);
  const m = await getMonth(monthId);
  if (!m || m.status !== "open"){
    alert("Month is locked");
    return;
  }

  const proof = parseFloat(proofEl.value);
  const pg = parseFloat(pgEl.value);

  if (!proof || !pg) return alert("Enter proof and proof gallons");

  const data = {
    eventType: "storage",
    reportingMonth: monthId,
    date: dateEl.value,
    storageType: typeEl.value,
    proof,
    proofGallons: pg,
    createdAt: new Date().toISOString(),
    createdBy: "dev"
  };

  if (typeEl.value === "bulk"){
    if (!tankSelect.value) return alert("Select a tank");
    data.destination = {
      type: "tank",
      tankId: tankSelect.value,
      tankName: tankSelect.options[tankSelect.selectedIndex].text
    };
  } else {
    if (!barrelIdEl.value.trim()) return alert("Enter barrel ID");
    data.destination = {
      type: "barrel",
      barrelId: barrelIdEl.value.trim()
    };
  }

  await addDoc(collection(db, "compliance_events"), data);

  form.reset();
  await loadEntries(monthId);
  updateMonth();
});

/* ===============================
   Init
   =============================== */

(async function init(){
  dateEl.value = new Date().toISOString().slice(0,10);
  await loadTanks();
  updateMonth();
  dateEl.onchange = updateMonth;
})();
