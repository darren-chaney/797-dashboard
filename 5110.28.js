/* ============================================================
   5110-28.js — TTB 5110.28 (Processing)
   SCRIPT-LOADED, FIRESTORE VERSION
   ============================================================ */

(function () {

  const BODY_ID = "ttb5110_28_processing_body";

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

  async function getProcessingTotals(db, monthId) {
    const totals = {
      whiskey: 0,
      rum: 0,
      vodka: 0,
      spirits_over_190: 0,
      spirits_under_190: 0
    };

    const snap = await db
      .collection("compliance_events")
      .where("eventType", "==", "processing")
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

  function cell(val) {
    return `
      <td>
        ${fmt(val)}
        <button class="copy-btn"
          onclick="navigator.clipboard.writeText('${fmt(val)}')">
          Copy
        </button>
      </td>
    `;
  }

  function render(body, t) {
    body.innerHTML = "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>1</td>
      <td>Spirits Dumped for Processing</td>
      ${cell(t.whiskey)}
      ${cell(t.rum)}
      ${cell(t.vodka)}
      ${cell(t.spirits_over_190)}
      ${cell(t.spirits_under_190)}
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

    const totals = await getProcessingTotals(db, month.id);
    render(body, totals);
  });

})();
