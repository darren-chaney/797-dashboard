/* ============================================================
   Monthly TTB Reports — Guided Pay.gov Assistant
   Form: 5110.40 (Production)
   READ-ONLY — Firestore source
   ============================================================ */

import { getFirestore, collection, query, where, getDocs } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { app } from "./firebase.js";

const db = getFirestore(app);

/* ------------------------------------------------------------
   Config: 5110.40 Field Map (Canonical)
------------------------------------------------------------ */

const PRODUCTION_FIELDS = [
  {
    line: "1",
    desc: "Produced by fermentation & distillation — Whiskey",
    paygov: "Whiskey Produced",
    instruction: "Enter this value",
    class: "enter",
    key: "whiskeyProduced"
  },
  {
    line: "1",
    desc: "Produced by fermentation & distillation — Rum",
    paygov: "Rum Produced",
    instruction: "Enter this value",
    class: "enter",
    key: "rumProduced"
  },
  {
    line: "1",
    desc: "Produced by fermentation & distillation — Vodka",
    paygov: "Vodka Produced",
    instruction: "Enter this value",
    class: "enter",
    key: "vodkaProduced"
  },
  {
    line: "1",
    desc: "Produced by fermentation & distillation — Gin",
    paygov: "Gin Produced",
    instruction: "Enter this value",
    class: "enter",
    key: "ginProduced"
  },
  {
    line: "2",
    desc: "Produced by redistillation",
    paygov: "Redistilled",
    instruction: "Enter 0 if none",
    class: "enter",
    key: "redistilled"
  },
  {
    line: "5",
    desc: "Transferred to Storage",
    paygov: "Transferred to Storage",
    instruction: "Enter this value",
    class: "enter",
    key: "toStorage"
  },
  {
    line: "Totals",
    desc: "Totals / Ending Inventory",
    paygov: "Calculated Totals",
    instruction: "Pay.gov calculates this",
    class: "auto",
    key: null
  }
];

/* ------------------------------------------------------------
   Helpers
------------------------------------------------------------ */

function copyValue(val){
  navigator.clipboard.writeText(val.toFixed(2));
}

function instructionSpan(text, cls){
  return `<span class="instruction ${cls}">${text}</span>`;
}

/* ------------------------------------------------------------
   Firestore Load
------------------------------------------------------------ */

async function loadProductionMonth(){
  // Select most recent locked month
  const q = query(
    collection(db, "complianceMonths"),
    where("locked","==",true)
  );

  const snap = await getDocs(q);
  let latest = null;

  snap.forEach(doc=>{
    if(!latest || doc.data().period > latest.data().period){
      latest = doc;
    }
  });

  if(!latest) return null;

  document.getElementById("filingMonthLabel").textContent =
    latest.data().label;

  return latest.data();
}

/* ------------------------------------------------------------
   Render
------------------------------------------------------------ */

function renderTable(data){
  const tbody = document.getElementById("productionTable");
  tbody.innerHTML = "";

  PRODUCTION_FIELDS.forEach(f=>{
    const val = f.key && data.productionTotals[f.key]
      ? data.productionTotals[f.key]
      : 0;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${f.line}</td>
      <td>${f.desc}</td>
      <td>${f.paygov}</td>
      <td>${instructionSpan(f.instruction, f.class)}</td>
      <td>${f.key ? val.toFixed(2) : "—"}</td>
      <td>
        ${f.key
          ? `<button class="copy-btn" onclick="copyValue(${val})">Copy</button>`
          : ""
        }
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ------------------------------------------------------------
   Init
------------------------------------------------------------ */

(async function init(){
  const monthData = await loadProductionMonth();
  if(!monthData) return;

  renderTable(monthData);
})();
