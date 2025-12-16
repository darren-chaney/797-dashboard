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

  // Alcohol needed in the FINAL sample volume
  const alcoholNeededMl = Vfinal * (targetProof / 200);

  // Base spirit required to supply that alcohol
  const baseSpiritMl = alcoholNeededMl / (baseProof / 200);

  // Remaining room for water after base spirit (inside spirit+water bucket)
  const waterMl = VspiritWater - baseSpiritMl;

  if (Vadd > Vfinal){
    warnings.push("Additives exceed final sample size. Reduce flavors/sweetener or increase sample size.");
  }

  if (waterMl < 0){
    warnings.push(
      "Not enough room for water at this proof/size after additives. Lower target proof, raise sample size, reduce additives, or use higher-proof base."
    );
  }

  return {
    baseSpiritMl: Math.max(0, baseSpiritMl),
    waterMl: Math.max(0, waterMl),
    spiritWaterMl: VspiritWater,
    warnings
  };
}

const SB_LOCKED_RANGES_VERSION = "v1.0";

// Density assumption for HFCS-42 (for weight conversion)
const HFCS42_DENSITY_G_PER_ML = 1.30;

// Allowed sample sizes (hard cap at 375 mL)
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

// Adjustment increments (per 250 mL)
const ADJUST_INCREMENTS = {
  Fruit: 0.20,
  Cream: 0.10,
  Vanilla: 0.10,
  Citrus: 0.10,
  Dessert: 0.15,
  Spice: 0.05,
  Heat: 0.01
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

function sbNowISO(){ return new Date().toISOString(); }

function sbUuid(prefix){
  const d = new Date();
  const pad = n => String(n).padStart(2,"0");
  return `${prefix}-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${Math.floor(Math.random()*900+100)}`;
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

  if (!ALLOWED_SAMPLE_SIZES_ML.includes(sampleSizeMl)){
    return { ok:false, error:"Sample size must be 100, 250, or 375 mL." };
  }

  const parsed = parseFlavorConcept(flavorConcept);
  if (!parsed.ok) return parsed;

  const scaleFactor = sampleSizeMl / 250;

  const waterToAddMl = calculateWaterForProof(
    sampleSizeMl,
    baseProof,
    targetProof
  );

  const flavors = [];
  const explain = [];
  const warnings = [];

  for (const c of parsed.components){
    const range = FLAVOR_RANGES[c.category] || FLAVOR_RANGES.Dessert;
    let per250 = strengthValue(range, flavorStrength);
    per250 = applySpiritBias(c.category, per250, baseSpiritType);
    per250 = clamp(per250, range.low, range.high);

    flavors.push({
      name: `${c.name} Flavor`,
      category: c.category,
      amountMl: Number((per250 * scaleFactor).toFixed(3)),
      amountMlPer250: Number(per250.toFixed(3))
    });

    explain.push(`${c.name} → ${c.category}`);
  }

  const sweetener = (typeof sweetnessPercent === "number")
    ? {
        enabled: true,
        type: "HFCS42",
        targetPercent: sweetnessPercent,
        amountMl: Number((sampleSizeMl * sweetnessPercent / 100).toFixed(2))
      }
    : null;

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
        amountMl: sampleSizeMl,
        proof: baseProof
      },
      water: {
        amountMl: Number(waterToAddMl.toFixed(1)),
        targetProof
      },
      flavors,
      sweetener,
      acids: []
    },

    promotion: {
      eligible: sampleSizeMl === 375,
      candidateOnly: true
    }
  };

  return { ok:true, draft, explain, warnings };
}
