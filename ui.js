/* ============================================================
   Sample Builder (R&D) — Logic (NO production scaler code)
   Locked Flavor Ranges v1.0

   IMPORTANT:
   - This tool reserves headroom for additives (flavors + HFCS) INSIDE the bottle.
   - It then proofs the remaining "spirit + water" portion to the TARGET proof
     so that portion should read correctly on the Snap 41 BEFORE additives are added.
   - After additives are added, final proof will read lower.

   This file adds:
   - predictedBenchProof (what the spirit+water portion SHOULD read)
   - exactVolumeCheck (sanity check totals)
   - rounding compensation so totals hit the intended volumes
   ============================================================ */

const SB_LOCKED_RANGES_VERSION = "v1.0";
const HFCS42_DENSITY_G_PER_ML = 1.30;
const ALLOWED_SAMPLE_SIZES_ML = [100, 250, 375];

// Locked ranges (per 250 mL)
const FLAVOR_RANGES = {
  Fruit:   { low: 0.60, typical: 1.00, high: 1.40 },
  Cream:   { low: 0.15, typical: 0.30, high: 0.50 },
  Vanilla: { low: 0.10, typical: 0.25, high: 0.40 },
  Citrus:  { low: 0.20, typical: 0.40, high: 0.60 },
  Dessert: { low: 0.40, typical: 0.75, high: 1.10 },
  Spice:   { low: 0.05, typical: 0.10, high: 0.20 },
  Heat:    { low: 0.01, typical: 0.03, high: 0.06 }
};

// Keyword → category mapping
const KEYWORDS = [
  { k: ["capsicum","chili","chile","habanero","jalapeno","pepper","heat","spicy"], cat: "Heat" },
  { k: ["cinnamon","clove","nutmeg","spice","ginger"], cat: "Spice" },
  { k: ["lemon","lime","orange","tangerine","citrus","grapefruit"], cat: "Citrus" },
  { k: ["vanilla","french vanilla","bourbon vanilla"], cat: "Vanilla" },
  { k: ["cream","whipped","sweet cream","milk","dairy"], cat: "Cream" },
  { k: ["pie","cobbler","cake","cheesecake","cookie","dessert","frosting","donut","brownie"], cat: "Dessert" },
  { k: ["strawberry","peach","blue","raz","raspberry","watermelon","pineapple","apple","blackberry","cherry","mango","banana","grape","berry"], cat: "Fruit" }
];

/* ------------------------------
   Small helpers
   ------------------------------ */
function sbNowISO(){ return new Date().toISOString(); }

function sbUuid(prefix){
  const d = new Date();
  const p = n=>String(n).padStart(2,"0");
  return `${prefix}-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${Math.floor(Math.random()*900+100)}`;
}

function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

function toNum(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function normalizeText(s){
  return (s||"").toLowerCase().replace(/[^\w\s-]/g," ").replace(/\s+/g," ").trim();
}

function titleCase(s){
  return (s||"")
    .split(" ")
    .filter(Boolean)
    .map(w=>w[0]?.toUpperCase()+w.slice(1))
    .join(" ");
}

/* ------------------------------
   Predict proof from volumes (ideal mixing, R&D)
   - baseProof is in "US proof" (2*ABV%)
   - returns predicted proof of the MIXTURE (spirit+water only)
   Note: ignores ethanol/water contraction; used as a diagnostic.
   ------------------------------ */
function predictedProofFromVolumes(baseSpiritMl, baseProof, waterMl){
  const bs = toNum(baseSpiritMl);
  const bp = toNum(baseProof);
  const w  = toNum(waterMl);

  if (!Number.isFinite(bs) || bs < 0) return NaN;
  if (!Number.isFinite(w)  || w  < 0) return NaN;
  if (!Number.isFinite(bp) || bp <= 0) return NaN;

  const total = bs + w;
  if (total <= 0) return NaN;

  const ethanolMl = bs * (bp / 200);
  const abv = ethanolMl / total;         // fraction
  const proof = abv * 200;
  return proof;
}

/* ============================================================
   Bench Proofing Math (R&D ONLY)

   WORKFLOW:
   - Reserve additives inside bottle (Vadd).
   - Proof the remaining "spirit+water" portion (VspiritWater) to targetProof.

   Returns volumes that satisfy:
   - baseSpiritMl + waterMl = VspiritWater (after rounding correction)
   - predicted bench proof ~ targetProof (ideal)
   ============================================================ */
function calculateBenchProofingWithHeadroom(finalMl, baseProof, targetProof, additiveMl = 0){
  const warnings = [];

  const Vfinal = toNum(finalMl);
  const bp = toNum(baseProof);
  const tp = toNum(targetProof);
  const Vadd = Math.max(0, toNum(additiveMl) || 0);

  if (!Number.isFinite(Vfinal) || Vfinal <= 0) {
    return { baseSpiritMl: 0, waterMl: 0, spiritWaterMl: 0, predictedBenchProof: NaN, warnings: ["Invalid final sample volume."] };
  }
  if (!Number.isFinite(bp) || bp <= 0) {
    return { baseSpiritMl: 0, waterMl: 0, spiritWaterMl: 0, predictedBenchProof: NaN, warnings: ["Invalid base proof."] };
  }
  if (!Number.isFinite(tp) || tp <= 0) {
    return { baseSpiritMl: 0, waterMl: 0, spiritWaterMl: 0, predictedBenchProof: NaN, warnings: ["Invalid target proof."] };
  }

  if (tp > bp){
    warnings.push("Target proof is higher than base proof — you cannot proof up with water.");
  }

  if (Vadd > Vfinal){
    warnings.push("Additives exceed final sample size. Reduce flavors/sweetener or increase sample size.");
  }

  // Headroom-reserved bench volume
  const VspiritWater = Math.max(0, Vfinal - Vadd);

  // Ideal ethanol needed in the bench portion
  const ethanolNeededMl = VspiritWater * (tp / 200);

  // Spirit volume to supply that ethanol
  let baseSpiritMl = ethanolNeededMl / (bp / 200);
  let waterMl = VspiritWater - baseSpiritMl;

  // Guard
  if (waterMl < -0.001){
    warnings.push("Not enough room for water at this proof after additives. Reduce additives, lower target proof, or use higher proof base.");
  }

  // ---- Rounding / exact-volume correction ----
  // We round to 0.1 mL for display & measuring, but ensure the sum still equals VspiritWater.
  baseSpiritMl = Number(Math.max(0, baseSpiritMl).toFixed(1));
  waterMl = Number(Math.max(0, waterMl).toFixed(1));

  // After rounding, compensate water to hit exact bench volume (keeps spirit amount stable).
  const drift = Number((VspiritWater - (baseSpiritMl + waterMl)).toFixed(1));
  if (Math.abs(drift) >= 0.1){
    waterMl = Number(Math.max(0, (waterMl + drift)).toFixed(1));
  }

  const predictedBenchProof = predictedProofFromVolumes(baseSpiritMl, bp, waterMl);

  if (Vadd > 0){
    warnings.push("Bench-proofing note: Spirit+water portion is at target proof before additives; final proof will read lower after flavors/HFCS.");
  }

  return {
    baseSpiritMl,
    waterMl,
    spiritWaterMl: Number(VspiritWater.toFixed(1)),
    predictedBenchProof: Number(Number.isFinite(predictedBenchProof) ? predictedBenchProof.toFixed(1) : NaN),
    warnings
  };
}

/* ------------------------------
   Categorization + Parsing
   ------------------------------ */
function detectCategory(token){
  const t = normalizeText(token);
  for (const r of KEYWORDS){
    for (const kw of r.k){
      if (t.includes(normalizeText(kw))) return r.cat;
    }
  }
  return "Dessert";
}

function parseFlavorConcept(concept){
  const raw = (concept||"").trim();
  const cleaned = normalizeText(raw);
  if (!cleaned) return { ok:false, error:"Enter a flavor concept." };

  const words = cleaned.split(" ").filter(Boolean);
  const seenCats = new Set();
  const comps = [];

  for (const w of words){
    const cat = detectCategory(w);
    if (!seenCats.has(cat)){
      comps.push({ name: titleCase(w), category: cat });
      seenCats.add(cat);
    }
    if (comps.length >= 3) break;
  }

  if (comps.length === 0){
    comps.push({ name: titleCase(raw), category: "Dessert" });
  } else if (comps.length === 1 && comps[0].category === "Dessert" && words.length > 1){
    comps[0].name = titleCase(raw);
  }

  return { ok:true, raw, components: comps };
}

/* ------------------------------
   Strength & Spirit bias
   ------------------------------ */
function strengthValue(range, strength){
  if (strength === "Strong") return range.typical;
  if (strength === "Mild") return range.low + (range.typical - range.low) * 0.7;
  return range.typical + (range.high - range.typical) * 0.88; // Extreme
}

function applySpiritBias(category, amount, spirit){
  if (spirit === "Rum" && (category === "Cream" || category === "Vanilla")){
    return amount * 0.9;
  }
  return amount;
}

/* ============================================================
   Generate Sample Draft
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

  const size = toNum(sampleSizeMl);
  if (!ALLOWED_SAMPLE_SIZES_ML.includes(size)){
    return { ok:false, error:"Sample size must be 100, 250, or 375 mL." };
  }

  const bp = toNum(baseProof);
  const tp = toNum(targetProof);

  if (!Number.isFinite(bp) || bp < 40 || bp > 200){
    return { ok:false, error:"Base proof must be a number between 40 and 200." };
  }
  if (!Number.isFinite(tp) || tp < 40 || tp > 120){
    return { ok:false, error:"Target proof must be a number between 40 and 120." };
  }

  const parsed = parseFlavorConcept(flavorConcept);
  if (!parsed.ok) return parsed;

  const scaleFactor = size / 250;

  const explain = [];
  const warnings = [];

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

    explain.push(`${c.name} → ${c.category} (${flavorStrength})`);
  }

  // --- SWEETENER ---
  let sweetener = null;
  let sweetenerMl = 0;

  const sp = toNum(sweetnessPercent);
  if (Number.isFinite(sp)){
    const spClamped = clamp(sp, 0, 25);
    sweetenerMl = Number((size * spClamped / 100).toFixed(1));
    sweetener = {
      enabled: true,
      type: "HFCS42",
      targetPercent: spClamped,
      amountMl: sweetenerMl
    };
    if (sp !== spClamped) warnings.push("Sweetness was clamped to a safe range.");
  }

  const additiveMl = Number((flavorTotalMl + sweetenerMl).toFixed(2));

  // --- PROOFING (bench portion to target, headroom reserved) ---
  const proofing = calculateBenchProofingWithHeadroom(
    size,
    bp,
    tp,
    additiveMl
  );

  warnings.push(...(proofing.warnings || []));

  // Exact-volume diagnostic
  const totalPlanned =
    Number((proofing.baseSpiritMl + proofing.waterMl + additiveMl).toFixed(1));
  const exactVolumeCheck = {
    plannedTotalMl: totalPlanned,
    targetFinalMl: Number(size.toFixed(1)),
    deltaMl: Number((totalPlanned - size).toFixed(1))
  };
  if (Math.abs(exactVolumeCheck.deltaMl) >= 0.2){
    warnings.push(`Volume check: planned total is off by ${exactVolumeCheck.deltaMl} mL (rounding).`);
  }

  const draft = {
    sampleId: sbUuid("SB"),
    status: "draft",
    createdAt: sbNowISO(),
    lockedFlavorRanges: SB_LOCKED_RANGES_VERSION,

    sampleDefinition: {
      sampleSizeMl: size,
      baseSpiritType,
      baseProof: bp,
      targetProof: tp,
      flavorConcept: parsed.raw,
      flavorStrength,
      sweetnessPercent: Number.isFinite(sp) ? (sweetener?.targetPercent ?? null) : null
    },

    // Diagnostics to compare with Snap 41
    diagnostics: {
      additiveMl,
      spiritWaterMl: proofing.spiritWaterMl,
      predictedBenchProof: proofing.predictedBenchProof,
      exactVolumeCheck
    },

    ingredients: {
      baseSpirit: { amountMl: proofing.baseSpiritMl, proof: bp },
      water: { amountMl: proofing.waterMl, targetProof: tp },
      flavors,
      sweetener,
      acids: []
    },

    explain,
    warnings,
    promotion: {
      eligible: size === 375,
      candidateOnly: true
    }
  };

  return { ok:true, draft, explain, warnings };
}
