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

/* ============================================================
   🔧 NEW: Normalize flavor objects (backward compatible)
   ============================================================ */
function normalizeFlavors(draft){
  if (!draft?.ingredients?.flavors) return;

  draft.ingredients.flavors = draft.ingredients.flavors.map(f => ({
    id: f.id || sbUuid(f.source === "manual" ? "manual" : "gen"),
    name: f.name || "",
    category: f.category || null,
    suggestedMl: Number(f.suggestedMl ?? f.amountMl ?? 0),
    appliedMl: Number(f.appliedMl ?? f.adjustedMl ?? f.amountMl ?? 0),
    source: f.source || "generated"
  }));
}

/* ------------------------------
   Output rendering (FLAVORS EXTENDED)
   ------------------------------ */
function showOutputFromDraft(draft){
  currentDraft = draft;

  // 🔧 Normalize flavors ONCE per render
  normalizeFlavors(draft);

  const outputPanel = el("outputPanel");
  if (!outputPanel) return;
  outputPanel.style.display = "block";

  const btnSaveDraft = el("btnSaveDraft");
  if (btnSaveDraft) btnSaveDraft.disabled = false;

  const meta = el("sampleMeta");
  if (meta){
    meta.textContent =
      `${draft.sampleId} • ${draft.sampleDefinition.sampleSizeMl} mL • ${draft.sampleDefinition.baseSpiritType}`;
  }

  const tbody = el("ingredientTable")?.querySelector("tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  /* ---------- FIXED ROWS ---------- */

  const base = draft.ingredients.baseSpirit;
  tbody.insertAdjacentHTML("beforeend", `
    <tr>
      <td><b>Base Spirit (${base.proof} proof)</b></td>
      <td>${formatMl(base.amountMl)}</td>
      <td>${formatL(mlToL(base.amountMl))}</td>
      <td class="muted">—</td>
      <td class="muted">R&D base</td>
    </tr>
  `);

  const water = draft.ingredients.water;
  if (water){
    tbody.insertAdjacentHTML("beforeend", `
      <tr>
        <td><b>Water (to ${water.targetProof} proof)</b></td>
        <td>${formatMl(water.amountMl)}</td>
        <td>${formatL(mlToL(water.amountMl))}</td>
        <td class="muted">—</td>
        <td class="muted">Bench proofing</td>
      </tr>
    `);
  }

  /* ---------- FLAVOR ROWS (DYNAMIC) ---------- */

  draft.ingredients.flavors.forEach(f=>{
    const delta = f.appliedMl - f.suggestedMl;

    tbody.insertAdjacentHTML("beforeend", `
      <tr>
        <td>
          ${
            f.source === "manual"
              ? `<input type="text" value="${escapeHtml(f.name)}"
                   data-name="${f.id}" placeholder="Flavor name" />`
              : `<b>${escapeHtml(f.name)}</b>`
          }
        </td>
        <td>${formatMl(f.suggestedMl)}</td>
        <td>
          <input type="number" step="0.01"
            value="${f.appliedMl}"
            data-ml="${f.id}"
            class="adjust-input"
            style="width:110px;" />
        </td>
        <td class="muted">${delta === 0 ? "—" : delta.toFixed(2)}</td>
        <td class="muted">
           ${f.source === "manual" ? "Manual" : "Generated"}
           • <button data-del="${f.id}" title="Remove flavor">✕</button>
         </td>
      </tr>
    `);
  });

  /* ---------- ADD FLAVOR BUTTON ---------- */
  tbody.insertAdjacentHTML("beforeend", `
    <tr>
      <td colspan="5">
        <button id="btnAddFlavor">+ Add Flavor</button>
      </td>
    </tr>
  `);

  el("btnAddFlavor").onclick = ()=>{
    currentDraft.ingredients.flavors.push({
      id: sbUuid("manual"),
      name: "",
      category: null,
      suggestedMl: 0,
      appliedMl: 0,
      source: "manual"
    });
    showOutputFromDraft(currentDraft);
  };
}

/* ------------------------------
   Delegated flavor edits
   ------------------------------ */
document.addEventListener("input", e=>{
  if (!currentDraft) return;

  // Adjust mL
  if (e.target.matches("[data-ml]")){
    const f = currentDraft.ingredients.flavors.find(x=>x.id===e.target.dataset.ml);
    if (f) f.appliedMl = Number(e.target.value) || 0;
  }

  // Rename manual flavor
  if (e.target.matches("[data-name]")){
    const f = currentDraft.ingredients.flavors.find(x=>x.id===e.target.dataset.name);
    if (f && f.source==="manual") f.name = e.target.value;
  }
});

/* ------------------------------
   Delete manual flavor
   ------------------------------ */
document.addEventListener("click", e=>{
  if (!currentDraft) return;
  if (!e.target.matches("[data-del]")) return;

  const id = e.target.dataset.del;
  currentDraft.ingredients.flavors =
    currentDraft.ingredients.flavors.filter(f=>f.id!==id);

  showOutputFromDraft(currentDraft);
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

  if (d?.ingredients?.sweetener?.enabled){
    setRad("sweetness", String(d.ingredients.sweetener.targetPercent ?? 12));
  } else {
    setRad("sweetness", "none");
  }
}

/* ------------------------------
   Init
   ------------------------------ */
function init(){
  renderDraftList();

  el("btnGenerate").onclick = ()=>{
    const res = generateSample(getInputs());
    if (!res || !res.ok){
      alert(res?.error || "Generate failed.");
      return;
    }
    showOutputFromDraft(res.draft);
    saveJSON(LS_LAST_KEY, res.draft);
  };

  el("btnSaveDraft").onclick = ()=>{
    if (currentDraft) saveDraft(currentDraft);
  };

  el("btnLoadLast").onclick = ()=>{
    const last = loadJSON(LS_LAST_KEY, null);
    if (!last) return;
    loadDraftIntoUI(last);
    showOutputFromDraft(last);
  };
}

document.addEventListener("DOMContentLoaded", init);
