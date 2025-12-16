/* ============================================================
   Sample Builder (R&D) — UI + Storage + Adjustment
   Uses localStorage only. No production code touched.
   ============================================================ */

const LS_DRAFTS_KEY  = "sb_drafts_v1";
const LS_LAST_KEY    = "sb_last_draft_v1";
const LS_RECIPES_KEY = "sb_base_recipes_v1";

const el = id => document.getElementById(id);

/* ------------------------------
   Helpers
   ------------------------------ */
function readRad(name){
  const n = document.querySelector(`input[name="${name}"]:checked`);
  return n ? n.value : null;
}
function setRad(name, value){
  const n = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (n) n.checked = true;
}
function escapeHtml(s){
  return (s||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function mlToL(ml){ return ml / 1000; }
function formatMl(n){
  if (n < 1) return n.toFixed(2);
  if (n < 10) return n.toFixed(2);
  return n.toFixed(1);
}
function formatL(n){ return n.toFixed(3); }

/* ------------------------------
   Inputs
   ------------------------------ */
function getInputs(){
  const sampleSizeMl = Number(readRad("sampleSize"));
  const baseSpiritType = el("baseSpiritType").value;
  const flavorConcept = el("flavorConcept").value || "";
  const flavorStrength = readRad("strength") || "Strong";

  const sweet = readRad("sweetness");
  const sweetnessPercent =
    (sweet === "none" || sweet == null) ? null : Number(sweet);

  const baseProof = Number(el("baseProof").value || 155);
  const targetProof = Number(el("targetProof").value || 60);

  return {
    sampleSizeMl,
    baseSpiritType,
    flavorConcept,
    flavorStrength,
    sweetnessPercent,
    baseProof,
    targetProof
  };
}

/* ------------------------------
   Storage
   ------------------------------ */
function loadJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch{
    return fallback;
  }
}
function saveJSON(key, value){
  localStorage.setItem(key, JSON.stringify(value, null, 2));
}
function downloadJSON(filename, obj){
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
}

/* ------------------------------
   Draft list
   ------------------------------ */
function renderDraftList(){
  const drafts = loadJSON(LS_DRAFTS_KEY, []);
  const box = el("draftList");
  if (!box) return;

  if (!drafts.length){
    box.textContent = "No drafts yet.";
    return;
  }

  box.innerHTML = drafts.slice().reverse().slice(0,8).map(d=>{
    const size = d.sampleDefinition.sampleSizeMl;
    const name = d.sampleDefinition.flavorConcept || "Untitled";
    const when = new Date(d.createdAt).toLocaleString();
    return `
      <div style="padding:8px 0; border-bottom:1px solid #334155;">
        <b>${d.sampleId}</b> • ${size} mL<br>
        <span class="muted">${escapeHtml(name)}</span><br>
        <button data-load="${d.sampleId}">Load</button>
      </div>
    `;
  }).join("");

  box.querySelectorAll("button[data-load]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.dataset.load;
      const all = loadJSON(LS_DRAFTS_KEY, []);
      const found = all.find(x=>x.sampleId===id);
      if (found){
        loadDraftIntoUI(found);
        showOutputFromDraft(found);
        saveJSON(LS_LAST_KEY, found);
      }
    });
  });
}

/* ------------------------------
   UI state
   ------------------------------ */
let currentDraft = null;

/* ------------------------------
   Output rendering (ADJUSTABLE)
   ------------------------------ */
function showOutputFromDraft(draft){
  currentDraft = draft;

  el("outputPanel").style.display = "block";
  el("btnSaveDraft").disabled = false;
  el("btnExportDraft").disabled = false;
  el("btnDuplicate").disabled = false;
  el("btnPromote").disabled =
    draft.sampleDefinition.sampleSizeMl !== 375;

  el("sampleMeta").textContent =
    `${draft.sampleId} • ${draft.sampleDefinition.sampleSizeMl} mL • ${draft.sampleDefinition.baseSpiritType}`;

  const tbody = el("ingredientTable").querySelector("tbody");
  tbody.innerHTML = "";

  const rows = [];

  rows.push({
    name:`Base Spirit (${draft.ingredients.baseSpirit.proof} proof)`,
    suggested:draft.ingredients.baseSpirit.amountMl,
    fixed:true
  });

  rows.push({
    name:`Water (to ${draft.ingredients.water.targetProof} proof)`,
    suggested:draft.ingredients.water.amountMl,
    fixed:true
  });

  draft.ingredients.flavors.forEach(f=>{
    if (f.adjustedMl == null) f.adjustedMl = f.amountMl;
    rows.push({
      name:f.name,
      suggested:f.amountMl,
      adjusted:f.adjustedMl,
      flavorRef:f
    });
  });

  if (draft.ingredients.sweetener?.enabled){
    rows.push({
      name:"HFCS-42",
      suggested:draft.ingredients.sweetener.amountMl,
      fixed:true
    });
  }

  rows.forEach((r,idx)=>{
    const tr = document.createElement("tr");
    if (r.fixed){
      tr.innerHTML = `
        <td><b>${r.name}</b></td>
        <td>${formatMl(r.suggested)}</td>
        <td>${formatMl(r.suggested)}</td>
        <td class="muted">—</td>
        <td class="muted">Fixed</td>
      `;
    }else{
      const delta = r.adjusted - r.suggested;
      tr.innerHTML = `
        <td><b>${r.name}</b></td>
        <td>${formatMl(r.suggested)}</td>
        <td>
          <input type="number"
                 step="0.01"
                 value="${r.adjusted}"
                 data-idx="${idx}"
                 class="adjust-input">
        </td>
        <td class="muted">${delta===0?"—":delta.toFixed(2)}</td>
        <td class="muted">Taste-adjusted</td>
      `;
    }
    tbody.appendChild(tr);
  });
}

/* ------------------------------
   Adjustment listener
   ------------------------------ */
document.addEventListener("input", e=>{
  if (!e.target.classList.contains("adjust-input")) return;
  if (!currentDraft) return;

  const rowIdx = Number(e.target.dataset.idx);
  const val = Number(e.target.value);

  const flavor = currentDraft.ingredients.flavors[rowIdx-2];
  if (!flavor) return;

  flavor.adjustedMl = val;
  el("btnSaveDraft").disabled = false;
});

/* ------------------------------
   Draft save / load
   ------------------------------ */
function saveDraft(d){
  const drafts = loadJSON(LS_DRAFTS_KEY, []);
  const i = drafts.findIndex(x=>x.sampleId===d.sampleId);
  if (i>=0) drafts[i]=d;
  else drafts.push(d);
  saveJSON(LS_DRAFTS_KEY, drafts);
  saveJSON(LS_LAST_KEY, d);
  renderDraftList();
}
function loadDraftIntoUI(d){
  setRad("sampleSize", String(d.sampleDefinition.sampleSizeMl));
  el("baseSpiritType").value = d.sampleDefinition.baseSpiritType;
  el("flavorConcept").value = d.sampleDefinition.flavorConcept;
  setRad("strength", d.sampleDefinition.flavorStrength);
  setRad("sweetness", d.ingredients.sweetener?.enabled
    ? String(d.ingredients.sweetener.targetPercent)
    : "none");
  el("baseProof").value = d.sampleDefinition.baseProof;
  el("targetProof").value = d.sampleDefinition.targetProof;
}

/* ------------------------------
   Init
   ------------------------------ */
function init(){
  renderDraftList();

  el("btnGenerate").onclick = ()=>{
    const res = generateSample(getInputs());
    if (!res.ok) return alert(res.error);
    showOutputFromDraft(res.draft);
    saveJSON(LS_LAST_KEY, res.draft);
  };

  el("btnSaveDraft").onclick = ()=>{
    if (currentDraft) saveDraft(currentDraft);
  };

  el("btnLoadLast").onclick = ()=>{
    const last = loadJSON(LS_LAST_KEY,null);
    if (last){
      loadDraftIntoUI(last);
      showOutputFromDraft(last);
    }
  };

  el("btnExportDraft").onclick = ()=>{
    if (currentDraft)
      downloadJSON(`${currentDraft.sampleId}.json`, currentDraft);
  };
}

document.addEventListener("DOMContentLoaded", init);
