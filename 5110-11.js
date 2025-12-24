/* ============================================================
   5110-11.js — TTB 5110.11 (Storage)
   FINAL — Matches Pay.gov canonical usage
   ============================================================ */

(function () {

  const BODY_ID = "ttb5110_11_storage_body";

  /* ===============================
     Helpers
     =============================== */
  function fmt(n) {
    return Number(n || 0).toFixed(2);
  }

  function waitForBody(cb) {
    const el = document.getElementById(BODY_ID);
    if (el) return cb(el);
    setTimeout(() => waitForBody(cb), 50);
  }

  function getDB() {
    if (!window.firebase || !firebase.firestore) return null;
    return firebase.firestore();
  }

  /* ===============================
     Data
     =============================== */
  async function getTotals(db, monthId) {
    const totals = {
      whiskey_under_160: 0,
      rum: 0,
      vodka: 0,
      spirits_under_190: 0
    };

    const snap = await db
      .collection("compliance_events")
      .where("eventType", "==", "storage")
      .where("reportingMonth", "==", monthId)
      .get();

    snap.forEach(doc => {
      const d = doc.data();
      if (totals[d.spiritClass] != null) {
        totals[d.spiritClass] += d.proofGallons || 0;
      }
    });

    return totals;
  }

  /* ===============================
     Render
     =============================== */
  function cell(v) {
    const val = fmt(v);
    return `<td>
      ${val}
      <button class="copy-btn"
        onclick="navigator.clipboard.writeText('${val}')">
        Copy
      </button>
    </td>`;
  }

  function render(body, t) {
    body.innerHTML = `
      <tr>
        <td>1</td>
        <td>End-of-Month Spirits on Hand</td>
        ${cell(t.whiskey_under_160)}
        ${cell(t.rum)}
        ${cell(t.vodka)}
        ${cell(t.spirits_under_190)}
      </tr>
    `;
  }

  /* ===============================
     Controller
     =============================== */
  async function renderForMonth(monthId) {
    waitForBody(async body => {
      const db = getDB();
      if (!db || !monthId) {
        render(body, {
          whiskey_under_160: 0,
          rum: 0,
          vodka: 0,
          spirits_under_190: 0
        });
        return;
      }

      const totals = await getTotals(db, monthId);
      render(body, totals);
    });
  }

  /* ===============================
     Init
     =============================== */
  renderForMonth(window.REPORTING_MONTH);

  document.addEventListener("reporting-month-changed", e => {
    renderForMonth(e.detail.monthId);
  });

})();
