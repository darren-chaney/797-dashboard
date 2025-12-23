import {
  getFirestore,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { app } from "./firebase.js";

const db = getFirestore(app);

const banner = document.getElementById("reportMonthBanner");
const label  = document.getElementById("filingMonthLabel");

/* ------------------------------------------------------------
   Load most recent locked month
------------------------------------------------------------ */

async function loadLockedMonth() {
  const q = query(
    collection(db, "complianceMonths"),
    where("locked", "==", true)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    banner.classList.add("error");
    label.textContent = "NO LOCKED MONTH FOUND";
    return null;
  }

  let latest = null;

  snap.forEach(doc => {
    const d = doc.data();
    if (!latest || d.period > latest.period) {
      latest = d;
    }
  });

  banner.classList.remove("warning");
  banner.classList.remove("error");
  banner.classList.add("success");

  label.textContent = latest.label || `${latest.period}`;

  return latest;
}

/* ------------------------------------------------------------
   Init
------------------------------------------------------------ */

(async function init() {
  const monthData = await loadLockedMonth();
  if (!monthData) return;

  // production rendering already handled elsewhere
})();
