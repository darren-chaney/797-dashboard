/* ============================================================
   5110-11.js — TTB 5110.11 (Storage)
   FINAL — Beginning + End of Month (matches Pay.gov entry)
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

  function getPrevMonthId(monthId) {
    const [y, m] = monthId.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  /* ===============================
     Data fetch
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
      if (totals[d.spiritClass] !== undefined) {
        totals[d.spiritClass] += d.proofGallons || 0;
      }
    });

    return totals;
  }

  /* ===============================
     Render helpers
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

  function render(body, bom, eom) {
    body.innerHTML = `
      <tr>
        <td>1</td>
        <td>Beginning of Month — On Hand</td>
        ${cell(bom.whiskey_under_160)}
        ${cell(bom.rum)}
        ${cell(bom.vodka)}
        ${cell(bom.spirits_under_190)}
      </tr>

      <tr>
        <td>2</td>
        <td>End of Month — On Hand</td>
        ${cell(eom.whiskey_under_160)}
        ${cell(eom.rum)}
        ${cell(eom.vodka)}
        ${cell(eom.spirits_under_190)}
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
        render(body,
          { whiskey_under_160: 0, rum: 0, vodka: 0, spirits_under_190: 0 },
          { whiskey_under_160: 0, rum: 0, vodka: 0, spirits_under_190: 0 }
        );
        return;
      }

      const eom = await getTotals(db, monthId);
      const bom = await getTotals(db, getPrevMonthId(monthId));

      render(body, bom, eom);
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
