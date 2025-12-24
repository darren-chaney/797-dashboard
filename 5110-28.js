/* ============================================================
   5110-28.js — TTB 5110.28 (Processing)
   FIXED: initial + reactive render
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

  function getDB() {
    if (!window.firebase || !firebase.firestore) return null;
    return firebase.firestore();
  }

  async function getTotals(db, monthId) {
    const totals = { whiskey: 0, rum: 0, vodka: 0, spirits_over_190: 0, spirits_under_190: 0 };

    const snap = await db
      .collection("compliance_events")
      .where("eventType", "==", "processing")
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

  function cell(v) {
    return `<td>${fmt(v)} <button class="copy-btn"
      onclick="navigator.clipboard.writeText('${fmt(v)}')">Copy</button></td>`;
  }

  function render(body, t) {
    body.innerHTML = `
      <tr>
        <td>1</td>
        <td>Spirits Dumped for Processing</td>
        ${cell(t.whiskey)}
        ${cell(t.rum)}
        ${cell(t.vodka)}
        ${cell(t.spirits_over_190)}
        ${cell(t.spirits_under_190)}
      </tr>
    `;
  }

  async function renderForMonth(monthId) {
    waitForBody(async body => {
      const db = getDB();
      if (!db || !monthId) return render(body, {});
      const totals = await getTotals(db, monthId);
      render(body, totals);
    });
  }

  renderForMonth(window.REPORTING_MONTH);

  document.addEventListener("reporting-month-changed", e => {
    renderForMonth(e.detail.monthId);
  });

})();
