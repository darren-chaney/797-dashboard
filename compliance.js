import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
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
const db = getFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false
});


/* ===============================
   Helpers
   =============================== */

function sortByMonth(a, b) {
  return a.id.localeCompare(b.id);
}

/* ===============================
   Load months
   =============================== */

async function loadMonths() {
  const snap = await getDocs(collection(db, "compliance_months"));
  const months = [];

  snap.forEach(doc => {
    months.push({ id: doc.id, ...doc.data() });
  });

  return months.sort(sortByMonth);
}

/* ===============================
   Bottling totals
   =============================== */

async function bottledForMonth(monthId) {
  const q = query(
    collection(db, "compliance_events"),
    where("eventType", "==", "bottling"),
    where("reportingMonth", "==", monthId)
  );

  const snap = await getDocs(q);
  let total = 0;

  snap.forEach(doc => {
    total += doc.data().derived?.proofGallons || 0;
  });

  return total;
}

async function bottledYTD(year) {
  const q = query(
    collection(db, "compliance_events"),
    where("eventType", "==", "bottling")
  );

  const snap = await getDocs(q);
  let total = 0;

  snap.forEach(doc => {
    const m = doc.data().reportingMonth;
    if (m && m.startsWith(year)) {
      total += doc.data().derived?.proofGallons || 0;
    }
  });

  return total;
}

/* ===============================
   Init
   =============================== */

(async function init() {

  const months = await loadMonths();
  if (!months.length) {
    document.getElementById("monthStatus").textContent =
      "No compliance months found.";
    return;
  }

  // current = latest OPEN month, otherwise last month
  const openMonths = months.filter(m => m.status === "open");
  const current = openMonths.length
    ? openMonths[openMonths.length - 1]
    : months[months.length - 1];

  // Status block
  document.getElementById("monthStatus").innerHTML = `
    <strong>Operational month:</strong> ${current.id}<br>
    <strong>Status:</strong> ${current.status}<br>
    <strong>Filing due:</strong> ${current.filingDueDate}
  `;

  // This month
  const monthTotal = await bottledForMonth(current.id);
  document.getElementById("monthBottled").textContent =
    monthTotal.toFixed(2);

  // Year to date
  const year = current.id.slice(0, 4);
  const ytdTotal = await bottledYTD(year);
  document.getElementById("ytdBottled").textContent =
    ytdTotal.toFixed(2);

})();
