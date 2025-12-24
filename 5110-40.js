/* ============================================================
   5110-40.js — TTB 5110.40 (Production)
   SCRIPT-LOADED, FIRESTORE VERSION
   ============================================================ */

(function () {

  const BODY_ID = "ttb5110_40_production_body";

  function fmt(n) {
    return Number(n || 0).toFixed(2);
  }

  function waitForBody(cb) {
    const el = document.getElementById(BODY_ID);
    if (el) return cb(el);
    setTimeout(() => waitForBody(cb), 50);
  }

  /* ===============================
     FIRESTORE HELPERS (GLOBAL SDK)
     =============================== */

  function getDB() {
    if (!window.firebase || !firebase.firestore) {
      console.warn("Firestore not available — rendering zeros");
      return null;
    }
    return firebase.firestore();
  }

  async function getLockedMonth(db) {
    const snap = await db.collection("compliance_months").get();
    const months = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    months.sort((a, b) => a.id.localeCompare(b.id));
    const locked = months.filter(m => m.status === "locked");
    return locked.length ? locked[locked.length - 1] : null;
  }

  async function getProductionTotals(db, monthId) {
    const totals = {
      whiskey_under_160: 0,
      whiskey_over_160: 0,
      brandy_under_170: 0,
      brandy_over_170: 0,
      rum: 0,
      vodka: 0,
      spirits_over_190: 0,
      spirits_under_190: 0
    };

    const snap = await db
      .collection("compliance_events")
      .where("eventType", "==", "production")
      .where("reportingMonth", "==", monthId)
      .get();

    snap.forEach(doc => {
      const d = doc.data();
      const pg = d.proofGallons || 0;

      if (totals.hasOwnProperty(d.spiritClass)) {
        totals[d.spiritClass] += pg;
      }
    });

    return totals;
  }

  function render(body, t) {
    body.innerHTML = "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>1</td>
      <td>Produced</td>
      <td>${fmt(t.whiskey_under_160)}</td>
      <td>${fmt(t.whiskey_over_160)}</td>
      <td>${fmt(t.brandy_under_170)}</td>
      <td>${fmt(t.brandy_over_170)}</td>
      <td>${fmt(t.rum)}</td>
      <td>${fmt(t.vodka)}</td>
      <td>${fmt(t.spirits_over_190)}</td>
      <td>${fmt(t.spirits_under_190)}</td>
    `;

    body.appendChild(tr);
  }

  /* ===============================
     INIT
     =============================== */

  waitForBody(async body => {
    const db = getDB();
    if (!db) {
      render(body, {});
      return;
    }

    const month = await getLockedMonth(db);
    if (!month) {
      render(body, {});
      return;
    }

    const totals = await getProductionTotals(db, month.id);
    render(body, totals);
  });

})();
