/* ============================================================
   Sample Builder (R&D) — Logic (NO production scaler code)
   Locked Flavor Ranges v1.0

   IMPORTANT:
   Bench-proofing MUST match real instrument behavior (Snap 41).
   Ethanol + water volumes do NOT add linearly (contraction).
   So we use alcoholometric tables @ 20°C (density + ABV↔mass).

   Workflow we implement (Darren’s real process):
   1) Reserve space in the bottle for additives (HFCS + flavors).
   2) Bench-proof the remaining "spirit+water" portion to TARGET proof.
      (This is the portion you can read accurately on Snap 41.)
   3) Add flavors/HFCS afterwards (final proof will shift lower).

   Table source: "Dilution of ethanol" (density@20°C and ABV→mass conversion). :contentReference[oaicite:1]{index=1}
   ============================================================ */

const SB_LOCKED_RANGES_VERSION = "v1.0";
const HFCS42_DENSITY_G_PER_ML = 1.30;
const ALLOWED_SAMPLE_SIZES_ML = [100, 250, 375];

/* ============================================================
   Alcoholometric tables @ 20°C (integer % ABV: 0..100)

   density_g_per_L[abv] = density (g/L) at 20°C
   abw_percent[abv]     = ethanol strength by mass (m/m %) corresponding to ABV

   These are directly transcribed from the PDF tables. :contentReference[oaicite:2]{index=2}
   ============================================================ */

// Density (g/L) at 20°C for ethanol-water mixture by ABV (v/v)
const DENSITY_G_PER_L_20C = [
  998.20, 996.70, 995.73, 993.81, 992.41, 991.06, 989.73, 988.43, 987.16, 985.92,
  984.71, 983.52, 982.35, 981.21, 980.08, 978.97, 977.87, 976.79, 975.71, 974.63,
  973.56, 972.48, 971.40, 970.31, 969.21, 968.10, 966.97, 965.81, 964.64, 963.44,
  962.21, 960.95, 959.66, 958.34, 956.98, 955.59, 954.15, 952.69, 951.18, 949.63,
  948.05, 946.42, 944.76, 943.06, 941.32, 939.54, 937.73, 935.88, 934.00, 932.09,
  930.14, 928.16, 926.16, 924.12, 922.06, 919.96, 917.84, 915.70, 913.53, 911.33,
  909.11, 906.87, 904.60, 902.31, 899.99, 897.65, 895.28, 892.89, 890.48, 888.03,
  885.56, 883.06, 880.54, 877.99, 875.40, 872.79, 870.15, 867.48, 864.78, 862.04,
  859.27, 856.46, 853.62, 850.74, 847.82, 844.85, 841.84, 838.77, 835.64, 832.45,
  829.18, 825.83, 822.39, 818.85, 815.18, 811.38, 807.42, 803.27, 798.90, 794.25,
  789.24
];

// ABV (v/v) → ABW (m/m %) conversion
const ABW_PERCENT_FROM_ABV = [
  0.00, 0.79, 1.59, 2.38, 3.18, 3.98, 4.78, 5.59, 6.40, 7.20,
  8.01, 8.83, 9.64, 10.46, 11.27, 12.09, 12.91, 13.74, 14.56, 15.39,
  16.21, 17.04, 17.87, 18.71, 19.54, 20.38, 21.22, 22.06, 22.91, 23.76,
  24.61, 25.46, 26.32, 27.18, 28.04, 28.91, 29.78, 30.65, 31.53, 32.41,
  33.30, 34.19, 35.09, 35.99, 36.89, 37.80, 38.72, 39.64, 40.56, 41.49,
  42.43, 43.37, 44.31, 45.26, 46.22, 47.18, 48.15, 49.13, 50.11, 51.10,
  52.09, 53.09, 54.09, 55.11, 56.12, 57.05, 58.18, 59.22, 60.27, 61.32,
  62.39, 63.46, 64.53, 65.62, 66.72, 67.82, 68.93, 70.06, 71.19, 72.33,
  73.48, 74.64, 75.82, 77.00, 78.20, 79.40, 80.63, 81.86, 83.11, 84.38,
  85.66, 86.97, 88.29, 89.64, 91.01, 92.41, 93.84, 95.31, 96.81, 98.38,
  100.00
];

/* ------------------------------
   Locked ranges (per 250 mL)
   ------------------------------ */
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

/* ============================================================
   Table helpers (linear interpolation between integer ABV)
   ============================================================ */
function interpFromTable(table, abvPercent){
  const x = clamp(abvPercent, 0, 100);
  const lo = Math.floor(x);
  const hi = Math.min(100, lo + 1);
  const t = x - lo;
  const a = table[lo];
  const b = table[hi];
  return a + (b - a) * t;
}

function density_g_per_L_at20C(abvPercent){
  return interpFromTable(DENSITY_G_PER_L_20C, abvPercent);
}

function abw_fraction_from_abv(abvPercent){
  const abwPct = interpFromTable(ABW_PERCENT_FROM_ABV, abvPercent);
  return abwPct / 100;
}

/* ============================================================
   Bench proofing using mass + density tables @ 20°C

   We want a FINAL spirit+water portion volume = Vsw (mL)
   at a TARGET proof (tp) measured at 20°C basis.

   This gives us target mixture density + ethanol mass fraction.
   Then we compute how much of the base spirit (at bp) is needed
   to supply the correct ethanol mass, and how much pure water
   mass (→ volume) to add.

   This properly accounts for contraction because Vsw is the
   final contracted volume at that ABV.
   ============================================================ */
function calculateBenchProofedSpiritWater(Vsw_mL, baseProof, targetProof){
  const warnings = [];

  const Vsw = toNum(Vsw_mL);
  const bp = toNum(baseProof);
  const tp = toNum(targetProof);

  if (!Number.isFinite(Vsw) || Vsw <= 0) {
    return { baseSpiritMl: 0, waterMl: 0, spiritWaterMl: 0, warnings: ["Invalid spirit+water volume."] };
  }
  if (!Number.isFinite(bp) || bp <= 0) {
    return { baseSpiritMl: 0, waterMl: 0, spiritWaterMl: 0, warnings: ["Invalid base proof."] };
  }
  if (!Number.isFinite(tp) || tp <= 0) {
    return { baseSpiritMl: 0, waterMl: 0, spiritWaterMl: 0, warnings: ["Invalid target proof."] };
  }
  if (tp > bp){
    warnings.push("Target proof is higher than base proof — you cannot proof up with water.");
  }

  const abvBasePct   = clamp((bp / 2), 0, 100); // proof → %ABV
  const abvTargetPct = clamp((tp / 2), 0, 100);

  // Target mixture properties at 20°C
  const rhoTarget = density_g_per_L_at20C(abvTargetPct);     // g/L
  const wTarget   = abw_fraction_from_abv(abvTargetPct);     // ethanol mass fraction

  // Base spirit properties at 20°C
  const rhoBase = density_g_per_L_at20C(abvBasePct);         // g/L
  const wBase   = abw_fraction_from_abv(abvBasePct);         // ethanol mass fraction

  // Pure water density at 20°C (same as 0% ABV in the table)
  const rhoWater = DENSITY_G_PER_L_20C[0];                   // 998.20 g/L

  // Convert target volume to liters for mass computation
  const Vsw_L = Vsw / 1000;

  // Total mass of the target spirit+water portion
  const mTotalTarget_g = rhoTarget * Vsw_L;

  // Ethanol mass required in that portion
  const mEthanolTarget_g = mTotalTarget_g * wTarget;

  // Base spirit volume needed to supply that ethanol mass:
  // ethanol mass in base = (rhoBase * Vbase_L) * wBase
  const Vbase_L = mEthanolTarget_g / (rhoBase * wBase);

  const mBase_g = rhoBase * Vbase_L;

  // Remaining mass must be pure water mass
  const mWater_g = mTotalTarget_g - mBase_g;

  if (mWater_g < -0.01){
    warnings.push("Not enough room for water at this proof (base proof too low for the target).");
  }

  const Vwater_L = Math.max(0, mWater_g) / rhoWater;

  return {
    baseSpiritMl: Number((Vbase_L * 1000).toFixed(1)),
    waterMl: Number((Vwater_L * 1000).toFixed(1)),
    spiritWaterMl: Number(Vsw.toFixed(1)),
    warnings
  };
}

/* ============================================================
   Main proofing wrapper for the app (reserves additive space)
   ============================================================ */
function calculateProofingForFinalVolume(finalMl, baseProof, targetProof, additiveMl = 0){
  const warnings = [];

  const Vfinal = toNum(finalMl);
  const Vadd = Math.max(0, toNum(additiveMl) || 0);

  if (!Number.isFinite(Vfinal) || Vfinal <= 0) {
    return { baseSpiritMl: 0, waterMl: 0, spiritWaterMl: 0, warnings: ["Invalid final sample volume."] };
  }

  if (Vadd > Vfinal){
    warnings.push("Additives exceed final sample size. Reduce flavors/sweetener or increase sample size.");
  }

  // Reserve space for additives INSIDE the bottle
  const VspiritWater = Math.max(0, Vfinal - Vadd);

  // Bench-proof the spirit+water portion to the target proof
  const proofing = calculateBenchProofedSpiritWater(VspiritWater, baseProof, targetProof);

  // Add workflow note if additives exist
  if (Vadd > 0){
    warnings.push("Bench-proofing note: Spirit+water portion is at target proof before additives; final proof will read lower after flavors/HFCS.");
  }

  return {
    baseSpiritMl: proofing.baseSpiritMl,
    waterMl: proofing.waterMl,
    spiritWaterMl: proofing.spiritWaterMl,
    warnings: [...(proofing.warnings || []), ...warnings]
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

  const additiveMl = flavorTotalMl + sweetenerMl;

  if (additiveMl > size * 0.25){
    warnings.push("High additives for a small sample. Proofing water may be constrained; taste carefully.");
  }

  // --- PROOFING (reserve additive space, bench-proof spirit+water portion) ---
  const proofing = calculateProofingForFinalVolume(
    size,
    bp,
    tp,
    additiveMl
  );

  warnings.push(...(proofing.warnings || []));

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
