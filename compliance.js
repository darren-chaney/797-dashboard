/* ============================================================
   Compliance Dashboard — Month-Aware + Due Countdown
   GitHub Pages safe
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

/* ===============================
   Month logic
   =============================== */

async function getCurrentOperationalMonth() {
  const snap = await getDocs(collection(db, "compliance_months"));
  const months = [];

  snap.forEach(doc => {
    months.push({ id: doc.id, ...doc.data() });
  });

  months.sort((a, b) => a.id.localeCompare(b.id));
  if (!months.length) return null;

  const openMonths = months.filter(m => m.status === "open");
  return openMonths.length
    ? openMonths[openMonths.length - 1]
    : months[months.length - 1];
}

/* ===============================
   Bottling totals
   =============================== */

async function bottledForMonth(monthId) {
  const snap = await getDocs(
    query(
      collection(db, "compliance_events"),
      where("eventType", "==", "bottling"),
      where("reportingMonth", "==", monthId)
    )
  );

  let total = 0;
  snap.forEach(doc => {
    total += doc.data().derived?.proofGallons || 0;
  });

  return total;
}

async function bottledYearToDate(year) {
  const snap = await getDocs(
    query(
      collection(db, "compliance_events"),
      where("eventType", "==", "bottling")
    )
  );

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
   Init dashboard
   =============================== */

(async function init() {

  const statusEl = el("monthStatus");
  const monthBottledEl = el("monthBottled");
  const ytdBottledEl = el("ytdBottled");

  try {
    const currentMonth = await getCurrentOperationalMonth();

    if (!currentMonth) {
      statusEl.textContent = "No compliance months defined.";
      monthBottledEl.textContent = "0.00";
      ytdBottledEl.textContent = "0.00";
      return;
    }

    const today = new Date();
    const dueDate = new Date(currentMonth.filingDueDate);

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysRemaining = Math.ceil((dueDate - today) / msPerDay);

    let dueMessage = "";
    let dueClass = "muted";

    if (daysRemaining < 0) {
      dueMessage = "⚠ Filing overdue";
      dueClass = "warn";
    } else if (daysRemaining <= 7) {
      dueMessage = `⚠ Filing due in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`;
      dueClass = "warn";
    } else {
      dueMessage = `${daysRemaining} days until filing due`;
    }

    /* ===============================
       Status block
       =============================== */

    statusEl.innerHTML = `
      <strong>Operational month:</strong> ${currentMonth.id}<br>
      <strong>Status:</strong>
        <span class="${currentMonth.status === "open" ? "good" : "warn"}">
          ${currentMonth.status.toUpperCase()}
        </span><br>
      <strong>Filing due:</strong> ${currentMonth.filingDueDate}<br>
      <span class="${dueClass}">${dueMessage}</span>
    `;

    /* ===============================
       Metrics
       =============================== */

    const monthTotal = await bottledForMonth(currentMonth.id);
    monthBottledEl.textContent = monthTotal.toFixed(2);

    const year = currentMonth.id.slice(0, 4);
    const ytdTotal = await bottledYearToDate(year);
    ytdBottledEl.textContent = ytdTotal.toFixed(2);

  } catch (err) {
    console.error(err);
    statusEl.textContent = "Error loading compliance data.";
    monthBottledEl.textContent = "—";
    ytdBottledEl.textContent = "—";
  }

})();
