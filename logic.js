/* ============================================================
   Sample Builder (R&D) — Logic (NO production scaler code)
   Locked Flavor Ranges v1.0
   ============================================================ */

/* ------------------------------
   Bench Proofing Math (R&D ONLY)
   ------------------------------ */
function calculateProofingForFinalVolume(finalMl, baseProof, targetProof, additiveMl = 0){
  if (!finalMl || !baseProof || !targetProof) {
    return { baseSpiritMl: 0, waterMl: 0, spiritWaterMl: 0, warnings: ["Missing proof inputs."] };
  }

  const warnings = [];

  const Vfinal = Number(finalMl);
  const Vadd = Math.max(0, Number(additiveMl || 0));
  const VspiritWater = Math.max(0, Vfinal - Vadd);

  const alcoholNeededMl = Vfinal * (targetProof / 200);
  const baseSpiritMl = alcoholNeededMl / (baseProof / 200);
  const waterMl = VspiritWater - baseSpiritMl;

  if (Vadd > Vfinal){
    warnings.push("Additives exceed final sample size.");
  }

  if (waterMl < 0){
    warnings.push(
      "Not enough room for water at this proof after additives."
    );
  }

  return {
    baseSpiritMl: Number(Math.max(0, baseSpiritMl).toFixed(1)),
    waterMl: Number(Math.max(0, waterMl).toFixed(1)),
    spiritWaterMl: VspiritWater,
    warnings
  };
}

const SB_LOCKED_RANGES_VERSION = "v1.0";
const HFCS42_DENSITY_G_PER_ML = 1.30;
const ALLOWED_SAMPLE_SIZES_ML = [100, 250, 375];

const FLAVOR_RANGES = {
  Fruit:   { low: 0.60, typical: 1.00, high: 1.40 },
  Cream:   { low: 0.15, typical: 0.30, high: 0.50 },
  Vanilla: { low: 0.10, typical: 0.25, high: 0.40 },
  Citrus:  { low: 0.20, typical: 0.40, high: 0.60 },
  Dessert: { low: 0.40, typical: 0.75, high: 1.10 },
  Spice:   { low: 0.05, typical: 0.10, high: 0.20 },
  Heat:    { low: 0.01, typical: 0.03, high: 0.06 }
};

function sbNowISO(){ return new Date().toISOString(); }
function sbUuid(prefix){
  const d = new Date();
  const p = n=>String(n).padStart(2,"0");
  return `${prefix}-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${Math.floor(Math.random()*900+100)}`;
}
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

function normalizeText(s){
  return (s||"").toLowerCase().replace(/[^\w\s-]/g," ").replace(/\s+/g," ").trim();
}

function detectCategory(token){
  const t = normalizeText(token);
  for (const r of KEYWORDS){
    for (const k of r.k){
      if (t.includes(k)) return r.cat;
    }
  }
  return "Dessert";
}

function parseFlavorConcept(concept){
  const raw = (concept||"").trim();
  const cleaned = normalizeText(raw);
  if (!cleaned) return { ok:false, error:"Enter a flavor concept." };

  const words = cleaned.split(" ");
  const seen = new Set();
  const comps = [];

  for (const w of words){
    const cat = detectCategory(w);
    if (!seen.has(cat)){
      comps.push({ name: titleCase(w), category: cat });
      seen.add(cat);
    }
    if (comps.length >= 3) break;
  }

  return { ok:true, raw, components: comps };
}

function titleCase(s){
  return (s||"").split(" ").map(w=>w[0]?.toUpperCase()+w.slice(1)).join(" ");
}

function strengthValue(range, strength){
  if (strength === "Strong") return range.typical;
  if (strength === "Mild") return range.low + (range.typical - range.low) * 0.7;
  return range.typical + (range.high - range.typical) * 0.88;
}

function applySpiritBias(category, amount, spirit){
  if (spirit === "Rum" && (category === "Cream" || category === "Vanilla")){
    return amount * 0.9;
  }
  return amount;
}

/* ============================================================
   Generate Sample Draft (FIXED)
   ============================================================ */

function generateSample({
  sampleSizeMl,
  baseSpiritType,
  flavorConcept,
  flavorStrength,
  sweetnessPercent,
  baseProof,
  targetProof
}) {

  if (!ALLOWED_SAMPLE_SIZES_ML.includes(sampleSizeMl)){
    return { ok:false, error:"Sample size must be 100, 250, or 375 mL." };
  }

  const parsed = parseFlavorConcept(flavorConcept);
  if (!parsed.ok) return parsed;

  const scaleFactor = sampleSizeMl / 250;

  // --- FLAVORS ---
  const flavors = [];
  let flavorTotalMl = 0;

  for (const c of parsed.components){
    const range = FLAVOR_RANGES[c.category] || FLAVOR_RANGES.Dessert;
    let per250 = strengthValue(range, flavorStrength);
    per250 = applySpiritBias(c.category, per250, baseSpiritType);
    per250 = clamp(per250, range.low, range.high);

    const amt = Number((per250 * scaleFactor).toFixed(2));
    flavorTotalMl += amt;

    flavors.push({
      name: `${c.name} Flavor`,
      category: c.category,
      amountMl: amt,
      amountMlPer250: Number(per250.toFixed(3))
    });
  }

  // --- SWEETENER ---
  let sweetener = null;
  let sweetenerMl = 0;

  if (typeof sweetnessPercent === "number"){
    sweetenerMl = Number((sampleSizeMl * sweetnessPercent / 100).toFixed(1));
    sweetener = {
      enabled: true,
      type: "HFCS42",
      targetPercent: sweetnessPercent,
      amountMl: sweetenerMl
    };
  }

  const additiveMl = flavorTotalMl + sweetenerMl;

  // --- PROOFING ---
  const proofing = calculateProofingForFinalVolume(
    sampleSizeMl,
    baseProof,
    targetProof,
    additiveMl
  );

  const draft = {
    sampleId: sbUuid("SB"),
    status: "draft",
    createdAt: sbNowISO(),
    lockedFlavorRanges: SB_LOCKED_RANGES_VERSION,

    sampleDefinition: {
      sampleSizeMl,
      baseSpiritType,
      baseProof,
      targetProof,
      flavorConcept: parsed.raw,
      flavorStrength
    },

    ingredients: {
      baseSpirit: {
        amountMl: proofing.baseSpiritMl,
        proof: baseProof
      },
      water: {
        amountMl: proofing.waterMl,
        targetProof
      },
      flavors,
      sweetener,
      acids: []
    },

    warnings: proofing.warnings,
    promotion: {
      eligible: sampleSizeMl === 375,
      candidateOnly: true
    }
  };

  return { ok:true, draft };
}
