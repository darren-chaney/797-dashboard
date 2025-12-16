/* ============================================================
   Sample Builder (R&D) — UI + Storage + Promotion
   Uses localStorage only. Does NOT touch production recipe.js.
   ============================================================ */

const LS_DRAFTS_KEY = "sb_drafts_v1";
const LS_LAST_KEY   = "sb_last_draft_v1";
const LS_RECIPES_KEY= "sb_base_recipes_v1";

const el = (id)=> document.getElementById(id);

function readRad(name){
  const n = document.querySelector(`input[name="${name}"]:checked`);
  return n ? n.value : null;
}

function setRad(name, value){
  const n = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (n) n.checked = true;
}

function getInputs(){
  const sampleSizeMl = Number(readRad("sampleSize"));
  const baseSpiritType = el("baseSpiritType").value;
  const flavorConcept = el("flavorConcept").value;
  const flavorStrength = readRad("strength") || "Strong";

  const sweet = readRad("sweetness");
  const sweetnessPercent = (sweet === "none" || sweet == null) ? null : Number(sweet);

  return { sampleSizeMl, baseSpiritType, flavorConcept, flavorStrength, sweetnessPercent };
}

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
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
}

function renderDraftList(){
  const drafts = loadJSON(LS_DRAFTS_KEY, []);
  const box = el("draftList");
  if (!drafts.length){
    box.textContent = "No drafts yet.";
    return;
  }
  const html = drafts.slice().reverse().slice(0, 8).map(d => {
    const size = d.sampleDefinition?.sampleSizeMl ?? "?";
    const concept = d.sampleDefinition?.flavorConcept ?? d.sampleDefinition?.flavorConceptRaw ?? "Untitled";
    const when = new Date(d.createdAt).toLocaleString();
    return `
      <div style="padding:10px 0; border-bottom:1px solid rgba(51,65,85,.6);">
        <div style="display:flex; justify-content:space-between; gap:10px;">
          <div>
            <div style="color:#e5e7eb;"><b>${d.sampleId}</b> <span class="muted">• ${size} mL</span></div>
            <div class="muted">${escapeHtml(concept)}</div>
            <div class="muted small">${when}</div>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
            <button data-load="${d.sampleId}" style="padding:8px 10px; font-size:.92rem;">Load</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  box.innerHTML = html;

  box.querySelectorAll("button[data-load]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-load");
      const draftsAll = loadJSON(LS_DRAFTS_KEY, []);
      const found = draftsAll.find(x=>x.sampleId === id);
      if (found) {
        loadDraftIntoUI(found);
        showOutputFromDraft(found, []);
        saveJSON(LS_LAST_KEY, found);
      }
    });
  });
}

function escapeHtml(s){
  return (s||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function clearOutput(){
  el("outputPanel").style.display = "none";
  el("btnSaveDraft").disabled = true;
  el("btnExportDraft").disabled = true;
  el("btnDuplicate").disabled = true;
  el("btnPromote").disabled = true;
}

function showInputWarning(text, type="muted"){
  const w = el("inputWarning");
  w.style.display = "inline-flex";
  w.className = `badge ${type}`;
  w.textContent = text;
}
function hideInputWarning(){
  const w = el("inputWarning");
  w.style.display = "none";
}

let currentDraft = null;
let currentExplain = [];

function showOutputFromDraft(draft, explainList){
  currentDraft = draft;
  currentExplain = explainList || [];

  el("outputPanel").style.display = "block";
  el("btnSaveDraft").disabled = false;
  el("btnExportDraft").disabled = false;
  el("btnDuplicate").disabled = false;

  // Promotion enabled only if 375 mL
  const eligible = (draft.sampleDefinition?.sampleSizeMl === 375);
  el("btnPromote").disabled = !eligible;

  const meta = `${draft.sampleId} • ${draft.sampleDefinition.sampleSizeMl} mL • ${draft.sampleDefinition.baseSpiritType} • Strength: ${draft.sampleDefinition.flavorStrength}`;
  el("sampleMeta").textContent = meta;

  // Warnings
  const warnings = draft.aiInterpretation?.warnings || [];
  const warnBlock = el("warningBlock");
  if (warnings.length){
    warnBlock.style.display = "block";
    warnBlock.innerHTML = warnings.map(w=>`⚠️ ${escapeHtml(w)}`).join("<br>");
  }else{
    warnBlock.style.display = "none";
    warnBlock.textContent = "";
  }

  // Table rows
  const tbody = el("ingredientTable").querySelector("tbody");
  tbody.innerHTML = "";

  const rows = [];

  // Base spirit
  rows.push({
    component: "Base Spirit",
    ml: draft.ingredients.baseSpirit.amountMl,
    notes: "R&D base"
  });

  // Flavors
  for (const f of (draft.ingredients.flavors || [])){
    rows.push({
      component: f.name,
      ml: f.amountMl,
      notes: `${f.category} • ${f.rangeUsed}`
    });
  }

  // Sweetener
  if (draft.ingredients.sweetener && draft.ingredients.sweetener.enabled){
    rows.push({
      component: "HFCS-42",
      ml: draft.ingredients.sweetener.amountMl,
      notes: `${draft.ingredients.sweetener.targetPercent}% sweetness`
    });
  }

  // Acids (none by default)
  for (const a of (draft.ingredients.acids || [])){
    rows.push({
      component: a.name || "Acid",
      ml: a.amountMl || 0,
      notes: "Optional"
    });
  }

  rows.forEach(r=>{
    const ml = Number(r.ml || 0);
    const L = mlToL(ml);

    let weightTxt = "—";
    if (r.component === "HFCS-42"){
      const w = hfcsWeightFromMl(ml);
      weightTxt = `${w.g.toFixed(0)} g / ${w.kg.toFixed(2)} kg`;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><b>${escapeHtml(r.component)}</b></td>
      <td>${formatMl(ml)}</td>
      <td>${formatL(L)}</td>
      <td>${weightTxt}</td>
      <td class="muted">${escapeHtml(r.notes || "")}</td>
    `;
    tbody.appendChild(tr);
  });

  // Adjustment guidance
  const ul = el("adjustmentList");
  ul.innerHTML = "";
  (draft.adjustmentGuidance || []).forEach((g, idx)=>{
    if (idx > 5) return; // keep it tight
    const li = document.createElement("li");
    li.innerHTML = `<b>${escapeHtml(g.condition)}</b> → ${escapeHtml(g.action)}`;
    ul.appendChild(li);
  });

  // Explain
  const explainUl = el("explainList");
  explainUl.innerHTML = "";
  const parsed = draft.aiInterpretation?.parsedComponents || [];
  parsed.forEach(p=>{
    const li = document.createElement("li");
    li.textContent = `${p.name} → ${p.category}`;
    explainUl.appendChild(li);
  });
  currentExplain.forEach(t=>{
    const li = document.createElement("li");
    li.textContent = t;
    explainUl.appendChild(li);
  });

  // Mandatory boundary statement is already on page; keep it.
}

function mlToL(ml){ return ml / 1000; }
function formatMl(n){
  if (n < 1) return n.toFixed(2);
  if (n < 10) return n.toFixed(2);
  return n.toFixed(1);
}
function formatL(n){ return n.toFixed(3); }
function hfcsWeightFromMl(ml){
  const g = ml * HFCS42_DENSITY_G_PER_ML;
  return { g, kg: g/1000 };
}

/* ------------------------------------------------------------
   Draft storage
   ------------------------------------------------------------ */
function saveDraft(draft){
  const drafts = loadJSON(LS_DRAFTS_KEY, []);
  const existsIdx = drafts.findIndex(d=>d.sampleId === draft.sampleId);
  if (existsIdx >= 0) drafts[existsIdx] = draft;
  else drafts.push(draft);
  saveJSON(LS_DRAFTS_KEY, drafts);
  saveJSON(LS_LAST_KEY, draft);
  renderDraftList();
}

function loadDraftIntoUI(draft){
  setRad("sampleSize", String(draft.sampleDefinition.sampleSizeMl));
  el("baseSpiritType").value = draft.sampleDefinition.baseSpiritType || "Moonshine";
  el("flavorConcept").value = draft.sampleDefinition.flavorConcept || "";
  setRad("strength", draft.sampleDefinition.flavorStrength || "Strong");

  const sw = draft.sampleDefinition.sweetness;
  if (sw && sw.enabled){
    setRad("sweetness", String(sw.targetPercent || 12));
  }else{
    setRad("sweetness", "none");
  }
}

/* ------------------------------------------------------------
   Promotion → Base Recipe
   ------------------------------------------------------------ */
function getRecipes(){
  return loadJSON(LS_RECIPES_KEY, []);
}
function saveRecipe(recipe){
  const list = getRecipes();
  list.push(recipe);
  saveJSON(LS_RECIPES_KEY, list);
}

function openPromoModal(){
  el("promoBackdrop").style.display = "flex";
  el("promoError").style.display = "none";
  el("promoError").textContent = "";
  el("promoRecipeName").value = "";
  el("promoNotes").value = "";
  el("chkTasted").checked = false;
  el("chkBalanced").checked = false;
  el("chkUnderstood").checked = false;

  const sid = currentDraft?.sampleId || "—";
  el("promoHint").textContent = `Promoting ${sid} will create a new Base Recipe (authority). This does not edit the sample draft.`;
}

function closePromoModal(){
  el("promoBackdrop").style.display = "none";
}

function promoError(msg){
  const box = el("promoError");
  box.style.display = "block";
  box.textContent = msg;
}

function buildBaseRecipeFromSample(sampleDraft, recipeName, notes){
  // Normalize flavors to per 250 mL reference
  const sizeMl = sampleDraft.sampleDefinition.sampleSizeMl;
  const factor = 250 / sizeMl;

  const flavors = (sampleDraft.ingredients.flavors || []).map(f => ({
    name: f.name,
    vendor: f.vendor || null,
    category: f.category,
    amountMlPer250: Number((f.amountMl * factor).toFixed(3))
  }));

  const sweetness = sampleDraft.sampleDefinition.sweetness;
  const sweetener = (sweetness && sweetness.enabled) ? {
    enabled: true,
    type: "HFCS42",
    percent: Number(sweetness.targetPercent)
  } : { enabled:false };

  // Base Recipe per your model v1.0
  return {
    baseRecipeId: sbUuid("BR"),
    status: "unapproved",
    version: "1.0",
    createdAt: new Date().toISOString(),
    createdBy: "user",
    origin: {
      type: "SampleBuilder",
      sourceSampleId: sampleDraft.sampleId
    },
    product: {
      productName: recipeName,
      productType: sampleDraft.sampleDefinition.baseSpiritType === "Moonshine" ? "Moonshine" :
                   sampleDraft.sampleDefinition.baseSpiritType === "Vodka" ? "Vodka" : "Rum",
      style: "Flavored Spirit",
      intendedMarket: "Retail",
      notes
    },
    alcoholBase: {
      baseSpiritType: sampleDraft.sampleDefinition.baseSpiritType,
      inputProof: null,
      defaultTargetProof: 60,
      dilutionMethod: "water",
      proofingNotes: "Proof down before flavoring"
    },
    ingredients: {
      flavors,
      sweetener,
      acids: []
    },
    scalingRules: {
      allowSweetnessOverride: false,
      allowProofOverride: false,
      minBatchSizeGallons: 1,
      maxBatchSizeGallons: null,
      notes: "Flavor ratios locked; scale linearly only"
    },
    compliance: {
      ttbFormulaRequired: true,
      ttbFormulaId: null,
      labelRequired: true,
      colaId: null,
      stateApprovalRequired: true,
      statusNotes: ""
    },
    readiness: {
      scalerEligible: true,
      labelEligible: false,
      productionEligible: false
    },
    revision: {
      parentRecipeId: null,
      changeReason: ""
    }
  };
}

/* ------------------------------------------------------------
   Wire up UI
   ------------------------------------------------------------ */
function init(){
  renderDraftList();
  hideInputWarning();

  // Generate
  el("btnGenerate").addEventListener("click", ()=>{
    hideInputWarning();

    const inputs = getInputs();
    const res = generateSample(inputs);
    if (!res.ok){
      showInputWarning(res.error, "warn");
      clearOutput();
      return;
    }

    showOutputFromDraft(res.draft, res.explain);
    saveJSON(LS_LAST_KEY, res.draft);
  });

  // Clear
  el("btnClear").addEventListener("click", ()=>{
    el("flavorConcept").value = "";
    setRad("sampleSize", "250");
    setRad("strength", "Strong");
    setRad("sweetness", "12");
    el("baseSpiritType").value = "Moonshine";
    hideInputWarning();
    currentDraft = null;
    clearOutput();
  });

  // Save draft
  el("btnSaveDraft").addEventListener("click", ()=>{
    if (!currentDraft) return;
    saveDraft(currentDraft);
    showInputWarning("Draft saved.", "good");
    setTimeout(hideInputWarning, 1400);
  });

  // Load last
  el("btnLoadLast").addEventListener("click", ()=>{
    const last = loadJSON(LS_LAST_KEY, null);
    if (!last){
      showInputWarning("No last draft found.", "warn");
      setTimeout(hideInputWarning, 1600);
      return;
    }
    loadDraftIntoUI(last);
    showOutputFromDraft(last, []);
  });

  // Export draft
  el("btnExportDraft").addEventListener("click", ()=>{
    if (!currentDraft) return;
    downloadJSON(`${currentDraft.sampleId}.json`, currentDraft);
  });

  // Export recipes
  el("btnExportRecipes").addEventListener("click", ()=>{
    const recipes = getRecipes();
    downloadJSON(`base-recipes.json`, recipes);
  });

  // Duplicate & adjust = keep inputs, make a new generated draft
  el("btnDuplicate").addEventListener("click", ()=>{
    if (!currentDraft) return;
    // Load current into inputs (already), just regenerate to create new sampleId
    const inputs = getInputs();
    const res = generateSample(inputs);
    if (res.ok){
      // Track iteration linkage
      res.draft.iteration.parentSampleId = currentDraft.sampleId;
      res.draft.status = "iterated";
      showOutputFromDraft(res.draft, res.explain);
      saveJSON(LS_LAST_KEY, res.draft);
      showInputWarning("Duplicated (new iteration).", "good");
      setTimeout(hideInputWarning, 1600);
    }
  });

  // Promote
  el("btnPromote").addEventListener("click", ()=>{
    if (!currentDraft) return;
    if ((currentDraft.sampleDefinition?.sampleSizeMl || 0) !== 375){
      showInputWarning("Promotion requires a 375 mL sample.", "warn");
      return;
    }
    openPromoModal();
  });

  el("btnCancelPromo").addEventListener("click", closePromoModal);
  el("promoBackdrop").addEventListener("click", (e)=>{
    if (e.target === el("promoBackdrop")) closePromoModal();
  });

  el("btnConfirmPromo").addEventListener("click", ()=>{
    if (!currentDraft) return;

    if (currentDraft.sampleDefinition.sampleSizeMl !== 375){
      promoError("Promotion is only allowed for 375 mL samples.");
      return;
    }

    const name = el("promoRecipeName").value.trim();
    const notes = el("promoNotes").value.trim();
    if (!name) { promoError("Base Recipe Name is required."); return; }
    if (!notes) { promoError("Internal Notes are required."); return; }

    if (!el("chkTasted").checked) { promoError("Confirm you tasted this sample at 375 mL."); return; }
    if (!el("chkBalanced").checked) { promoError("Confirm flavor balance is acceptable."); return; }
    if (!el("chkUnderstood").checked) { promoError("Confirm you understand this becomes a scalable base recipe."); return; }

    const recipe = buildBaseRecipeFromSample(currentDraft, name, notes);
    saveRecipe(recipe);

    // Mark draft as promoted (and persist if it’s in the drafts list)
    currentDraft.status = "promoted";
    currentDraft.promotion.eligible = true;
    currentDraft.promotion.promotedAt = new Date().toISOString();
    currentDraft.promotion.baseRecipeId = recipe.baseRecipeId;
    currentDraft.promotion.approvedBy = "user";

    saveDraft(currentDraft);

    closePromoModal();
    showInputWarning(`Promoted → ${recipe.baseRecipeId}`, "good");
    setTimeout(hideInputWarning, 2200);
  });
}

document.addEventListener("DOMContentLoaded", init);
