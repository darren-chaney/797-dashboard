/* ============================================================
   5110-28.js — TTB 5110.28 (Processing)
   COMPLETE: multi-line, deterministic
   ============================================================ */

(function () {

  const BODY_ID = "ttb5110_28_processing_body";

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
     Line Definitions (Pay.gov)
     =============================== */
  const LINES = [
    { line: 1, label: "Spirits Dumped for Processing", eventType: "processing_dump" },
    { line: 2, label: "Spirits Bottled", eventType: "bottling" },
    { line: 3, label: "Spirits Transferred to Storage", eventType: "processing_to_storage" },
    { line: 4, label: "Processing Losses", eventType: "processing_loss" }
  ];

  const EMPTY_TOTALS = () => ({
    whiskey: 0,
    rum: 0,
    vodka: 0,
    spirits_over_190: 0,
    spirits_under_190: 0
  });

  /* ===============================
     Data
     =============================== */
  async function getTotals(db, monthId, eventType) {
    const totals = EMPTY_TOTALS();

    const snap = await db
      .collection("compliance_events")
      .where("eventType", "==", eventType)
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
    return `<td>
      ${fmt(v)}
      <button class="copy-btn"
        onclick="navigator.clipboard.writeText('${fmt(v)}')">
        Copy
      </button>
    </td>`;
  }

  function render(body, rows) {
    body.innerHTML = "";

    rows.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.line}</td>
        <td>${r.label}</td>
        ${cell(r.totals.whiskey)}
        ${cell(r.totals.rum)}
        ${cell(r.totals.vodka)}
        ${cell(r.totals.spirits_over_190)}
        ${cell(r.totals.spirits_under_190)}
      `;
      body.appendChild(tr);
    });
  }

  /* ===============================
     Render Controller
     =============================== */
  async function renderForMonth(monthId) {
    waitForBody(async body => {
      const db = getDB();
      if (!db || !monthId) {
        render(body, LINES.map(l => ({
          ...l,
          totals: EMPTY_TOTALS()
        })));
        return;
      }

      const rows = [];
      for (const l of LINES) {
        const totals = await getTotals(db, monthId, l.eventType);
        rows.push({ ...l, totals });
      }

      render(body, rows);
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
