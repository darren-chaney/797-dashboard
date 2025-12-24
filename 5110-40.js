/* ============================================================
   5110-40.js — TTB 5110.40 (Production)
   NON-MODULE, SCRIPT-LOADED VERSION
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

  function render(body) {
    body.innerHTML = "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>1</td>
      <td>Produced (Test)</td>
      <td>${fmt(10)}</td>
      <td>${fmt(0)}</td>
      <td>${fmt(0)}</td>
      <td>${fmt(0)}</td>
      <td>${fmt(5)}</td>
      <td>${fmt(0)}</td>
      <td>${fmt(0)}</td>
      <td>${fmt(0)}</td>
    `;

    body.appendChild(tr);
    console.log("5110.40: test row rendered");
  }

  // INIT
  waitForBody(render);

})();
