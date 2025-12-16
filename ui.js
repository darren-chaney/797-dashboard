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
  n = Number(n || 0);
  if (n < 1) return n.toFixed(2);
  if (n < 10) return n.toFixed(2);
  return n.toFixed(1);
}
function formatL(n){ return (Number(n||0)).toFixed(3); }

/* ------------------------------
   Inputs
   ------------------------------ */
function getInputs(){
  const sampleSizeMl = Number(readRad("sampleSize"));
  const baseSpiritType = el("baseSpiritType")?.value || "Moonshine";
  const flavorConcept = el("flavorConcept")?.value || "";
  const flavorStrength = readRad("strength") || "Strong";

  const sweet = readRad("sweetness");
  const sweetnessPercent =
    (sweet === "none" || sweet == null) ? null : Number(sweet);

  const baseProof = Number(el("baseProof")?.value || 155);
  const targetProof = Number(el("targetProof")?.value || 60);

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
    const size = d?.sampleDefinition?.sampleSizeMl ?? "?";
    const name = d?.sampleDefinition?.flavorConcept ?? "Untitled";
    const when = d?.createdAt ? new Date(d.createdAt).toLocaleString() : "";
    return `
      <div style="padding:8px 0; border-bottom:1px solid #334155;">
        <b>${escapeHtml(d.sampleId || "SB-?")}</b> • ${escapeHtml(String(size))} mL<br>
        <span class="muted">${escapeHtml(name)}</span><br>
        <span class="muted" style="font-size:.85rem;">${escapeHtml(when)}</span><br>
        <button data-load="${escapeHtml(d.sampleId || "")}">Load</button>
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
   Output rendering (ADJUSTABLE FLAVORS)
   ------------------------------ */
function showOutputFromDraft(draft){
  currentDraft = draft;

  const outputPanel = el("outputPanel");
  if (!outputPanel) return;
  outputPanel.style.display = "block";

  const btnSaveDraft = el("btnSaveDraft");
  const btnExportDraft = el("btnExportDraft");
  const btnDuplicate = el("btnDuplicate");
  const btnPromote = el("btnPromote");

  if (btnSaveDraft) btnSaveDraft.disabled = false;
  if (btnExportDraft) btnExportDraft.disabled = false;
  if (btnDuplicate) btnDuplicate.disabled = false;
  if (btnPromote) btnPromote.disabled = (draft?.sampleDefinition?.sampleSizeMl !== 375);

  const meta = el("sampleMeta");
  if (meta){
    meta.textContent =
      `${draft.sampleId} • ${draft.sampleDefinition.sampleSizeMl} mL • ${draft.sampleDefinition.baseSpiritType}`;
  }

  const ingredientTable = el("ingredientTable");
  if (!ingredientTable) return;

  const tbody = ingredientTable.querySelector("tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  // Rows we display
  const rows = [];

  // Base spirit (fixed)
  rows.push({
    type:"fixed",
    name:`Base Spirit (${draft?.ingredients?.baseSpirit?.proof ?? "?"} proof)`,
    ml:Number(draft?.ingredients?.baseSpirit?.amountMl || 0),
    notes:"R&D base"
  });

  // Water (fixed)
  if (draft?.ingredients?.water){
    rows.push({
      type:"fixed",
      name:`Water (to ${draft.ingredients.water.targetProof} proof)`,
      ml:Number(draft.ingredients.water.amountMl || 0),
      notes:"Bench proofing"
    });
  }

  // Flavors (editable)
  const flavors = (draft?.ingredients?.flavors || []);
  flavors.forEach((f, i)=>{
    if (f.adjustedMl == null) f.adjustedMl = Number(f.amountMl || 0);
    rows.push({
      type:"flavor",
      flavorIndex:i,
      name:f.name,
      suggested:Number(f.amountMl || 0),
      adjusted:Number(f.adjustedMl || 0),
      notes:"Taste-adjusted"
    });
  });

  // Sweetener (fixed for now)
  if (draft?.ingredients?.sweetener?.enabled){
    rows.push({
      type:"fixed",
      name:"HFCS-42",
      ml:Number(draft.ingredients.sweetener.amountMl || 0),
      notes:`${draft.ingredients.sweetener.targetPercent}% sweetness`
    });
  }

  // Render rows
  rows.forEach(r=>{
    const tr = document.createElement("tr");

    if (r.type === "fixed"){
      const ml = Number(r.ml || 0);
      tr.innerHTML = `
        <td><b>${escapeHtml(r.name)}</b></td>
        <td>${formatMl(ml)}</td>
        <td>${formatL(mlToL(ml))}</td>
        <td class="muted">—</td>
        <td class="muted">${escapeHtml(r.notes || "Fixed")}</td>
      `;
    } else {
      const delta = (r.adjusted - r.suggested);
      tr.innerHTML = `
        <td><b>${escapeHtml(r.name)}</b></td>
        <td>${formatMl(r.suggested)}</td>
        <td>
          <input
            type="number"
            step="0.01"
            value="${String(r.adjusted)}"
            data-flavor-index="${String(r.flavorIndex)}"
            class="adjust-input"
            style="width:110px;"
          />
        </td>
        <td class="muted">${delta === 0 ? "—" : delta.toFixed(2)}</td>
        <td class="muted">${escapeHtml(r.notes || "")}</td>
      `;
    }

    tbody.appendChild(tr);
  });
}

/* ------------------------------
   Adjustment listener (delegated)
   ------------------------------ */
document.addEventListener("input", (e)=>{
  const t = e.target;
  if (!t || !t.classList || !t.classList.contains("adjust-input")) return;
  if (!currentDraft) return;

  const idx = Number(t.dataset.flavorIndex);
  if (!Number.isFinite(idx)) return;

  const val = Number(t.value);
  if (!Number.isFinite(val)) return;

  const flavor = currentDraft?.ingredients?.flavors?.[idx];
  if (!flavor) return;

  flavor.adjustedMl = val;

  // enable saving
  const btnSaveDraft = el("btnSaveDraft");
  if (btnSaveDraft) btnSaveDraft.disabled = false;
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
  setRad("sampleSize", String(d?.sampleDefinition?.sampleSizeMl ?? 250));
  if (el("baseSpiritType")) el("baseSpiritType").value = d?.sampleDefinition?.baseSpiritType ?? "Moonshine";
  if (el("flavorConcept")) el("flavorConcept").value = d?.sampleDefinition?.flavorConcept ?? "";
  setRad("strength", d?.sampleDefinition?.flavorStrength ?? "Strong");

  if (el("baseProof")) el("baseProof").value = d?.sampleDefinition?.baseProof ?? 155;
  if (el("targetProof")) el("targetProof").value = d?.sampleDefinition?.targetProof ?? 60;

  // Sweetness radios
  if (d?.ingredients?.sweetener?.enabled){
    setRad("sweetness", String(d.ingredients.sweetener.targetPercent ?? 12));
  } else {
    setRad("sweetness", "none");
  }
}

/* ------------------------------
   Init (GUARDED)
   ------------------------------ */
function init(){
  renderDraftList();

  const btnGenerate = el("btnGenerate");
  if (btnGenerate){
    btnGenerate.onclick = ()=>{
      const res = generateSample(getInputs());
      if (!res || !res.ok) {
        alert(res?.error || "Generate failed.");
        return;
      }
      showOutputFromDraft(res.draft);
      saveJSON(LS_LAST_KEY, res.draft);
    };
  }

  const btnSaveDraft = el("btnSaveDraft");
  if (btnSaveDraft){
    btnSaveDraft.onclick = ()=>{
      if (currentDraft) saveDraft(currentDraft);
    };
  }

  const btnLoadLast = el("btnLoadLast");
  if (btnLoadLast){
    btnLoadLast.onclick = ()=>{
      const last = loadJSON(LS_LAST_KEY, null);
      if (!last) return;
      loadDraftIntoUI(last);
      showOutputFromDraft(last);
    };
  }

  const btnExportDraft = el("btnExportDraft");
  if (btnExportDraft){
    btnExportDraft.onclick = ()=>{
      if (currentDraft){
        downloadJSON(`${currentDraft.sampleId}.json`, currentDraft);
      }
    };
  }

  // Optional: keep your clear button if it exists
  const btnClear = el("btnClear");
  if (btnClear){
    btnClear.onclick = ()=>{
      if (el("flavorConcept")) el("flavorConcept").value = "";
      setRad("sampleSize", "250");
      setRad("strength", "Strong");
      setRad("sweetness", "12");
      if (el("baseSpiritType")) el("baseSpiritType").value = "Moonshine";
      if (el("baseProof")) el("baseProof").value = 155;
      if (el("targetProof")) el("targetProof").value = 60;

      currentDraft = null;
      const op = el("outputPanel");
      if (op) op.style.display = "none";

      if (btnSaveDraft) btnSaveDraft.disabled = true;
      const ed = el("btnExportDraft"); if (ed) ed.disabled = true;
      const du = el("btnDuplicate"); if (du) du.disabled = true;
      const pr = el("btnPromote"); if (pr) pr.disabled = true;
    };
  }
}

document.addEventListener("DOMContentLoaded", init);
