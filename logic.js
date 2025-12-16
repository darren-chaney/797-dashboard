/* ============================================================
   Sample Builder (R&D) — Logic (NO production scaler code)
   Locked Flavor Ranges v1.0
   ============================================================ */

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

// Keyword → category mapping (simple & explainable)
const KEYWORDS = [
  // Heat / spice first
  { k: ["capsicum","chili","chile","habanero","jalapeno","pepper","heat","spicy"], cat: "Heat" },
  { k: ["cinnamon","clove","nutmeg","spice","ginger"], cat: "Spice" },

  // Citrus
  { k: ["lemon","lime","orange","tangerine","citrus","grapefruit"], cat: "Citrus" },

  // Vanilla / cream
  { k: ["vanilla","french vanilla","bourbon vanilla"], cat: "Vanilla" },
  { k: ["cream","whipped","sweet cream","milk","dairy"], cat: "Cream" },

  // Dessert / composite
  { k: ["pie","cobbler","cake","cheesecake","cookie","dessert","frosting","donut","brownie"], cat: "Dessert" },

  // Fruit last (broad)
  { k: ["strawberry","peach","blue","raz","raspberry","watermelon","pineapple","apple","blackberry","cherry","mango","banana","grape","berry"], cat: "Fruit" }
];

function sbNowISO(){
  return new Date().toISOString();
}

function sbUuid(prefix){
  // simple stable-ish id: PREFIX-YYYYMMDD-HHMMSS-rand
  const d = new Date();
  const pad = (n)=> String(n).padStart(2,"0");
  const y = d.getFullYear();
  const m = pad(d.getMonth()+1);
  const da = pad(d.getDate());
  const h = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  const r = Math.floor(Math.random()*900+100);
  return `${prefix}-${y}${m}${da}-${h}${mi}${s}-${r}`;
}

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function mlToL(ml){ return ml / 1000; }
function formatMl(n){
  // show 2 decimals when small
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
   Parsing & Categorization
   ------------------------------------------------------------ */

function normalizeText(s){
  return (s || "").toLowerCase().replace(/[^\w\s-]/g," ").replace(/\s+/g," ").trim();
}

function detectCategory(token){
  const t = normalizeText(token);
  for (const rule of KEYWORDS){
    for (const kw of rule.k){
      if (t.includes(normalizeText(kw))) return rule.cat;
    }
  }
  return "Dessert"; // safe default
}

function parseFlavorConcept(concept){
  const raw = (concept || "").trim();
  const cleaned = normalizeText(raw);
  if (!cleaned) return { ok:false, error:"Enter a flavor concept (e.g., Strawberry Cream)." };

  // Heuristic: keep up to 3 meaningful parts by splitting on spaces and common separators
  // But also allow phrases by scanning keywords.
  const words = cleaned.split(" ").filter(Boolean);

  // Build components by finding unique category hits, in the order they appear.
  const comps = [];
  const seenCats = new Set();

  for (let i=0; i<words.length; i++){
    const w = words[i];
    const cat = detectCategory(w);
    // keep up to 3 components; allow duplicate cats only if clearly different words (rare)
    if (!seenCats.has(cat)){
      comps.push({ name: titleCase(w), category: cat, source: w });
      seenCats.add(cat);
    }
    if (comps.length >= 3) break;
  }

  // If everything collapsed into Dessert due to unknown words, keep first word as Dessert
  if (comps.length === 1 && comps[0].category === "Dessert"){
    comps[0].name = titleCase(raw);
    comps[0].source = raw;
  }

  if (comps.length === 0) return { ok:false, error:"Could not parse the concept. Try a simpler phrase (max 3 components)." };

  return { ok:true, raw, components: comps };
}

function titleCase(s){
  return (s||"").split(" ").map(w => w ? w[0].toUpperCase()+w.slice(1) : "").join(" ");
}

/* ------------------------------------------------------------
   Strength Bias Mapping (inside locked ranges)
   ------------------------------------------------------------ */

function strengthValue(range, strength){
  const low = range.low, typ = range.typical, high = range.high;

  if (strength === "Strong") return typ;

  if (strength === "Mild"){
    // 65–75% from Low → Typical (use 70% fixed)
    const p = 0.70;
    return low + (typ - low) * p;
  }

  // Extreme: 85–90% from Typical → High (use 88% fixed)
  const p = 0.88;
  return typ + (high - typ) * p;
}

/* ------------------------------------------------------------
   Spirit bias rules (deterministic, conservative)
   ------------------------------------------------------------ */
function applySpiritBias(category, amountPer250, spiritType){
  let amt = amountPer250;

  if (spiritType === "Rum"){
    // reduce cream/vanilla slightly in rum
    if (category === "Cream" || category === "Vanilla"){
      amt *= 0.90;
    }
  }

  return amt;
}

/* ------------------------------------------------------------
   Generate Sample Draft (deterministic)
   ------------------------------------------------------------ */

function generateSample({
  sampleSizeMl,
  baseSpiritType,
  flavorConcept,
  flavorStrength,
  sweetnessPercent // number | null
}){
  // Validate sample size
  if (!ALLOWED_SAMPLE_SIZES_ML.includes(sampleSizeMl)){
    return { ok:false, error:"Sample size must be 100, 250, or 375 mL (max 375)." };
  }

  const parsed = parseFlavorConcept(flavorConcept);
  if (!parsed.ok) return { ok:false, error: parsed.error };

  const scaleFactor = sampleSizeMl / 250;

  const warnings = [];
  const notes = [];

  if (flavorStrength === "Extreme"){
    warnings.push("Extreme strength selected — starting near the upper allowed range.");
  }

  const components = parsed.components;

  // Create flavors list
  const flavors = [];
  const explain = [];

  for (const c of components){
    const range = FLAVOR_RANGES[c.category] || FLAVOR_RANGES.Dessert;

    let per250 = strengthValue(range, flavorStrength);

    // Spirit bias
    const biased = applySpiritBias(c.category, per250, baseSpiritType);
    if (biased !== per250){
      explain.push(`Applied ${baseSpiritType} bias: ${c.category} reduced by 10%.`);
    }
    per250 = biased;

    // Never exceed high
    per250 = clamp(per250, range.low, range.high);

    // Scale to sample size
    const amountMl = per250 * scaleFactor;

    // Name resolution (keep simple — can be improved later by vendor selectors)
    const displayName = c.category === "Vanilla" ? "Vanilla Flavor"
                      : c.category === "Cream" ? "Cream Flavor"
                      : c.category === "Citrus" ? `${c.name} Flavor`
                      : c.category === "Dessert" ? `${c.name} Flavor`
                      : c.category === "Spice" ? `${c.name} (Spice) Flavor`
                      : c.category === "Heat" ? `${c.name} (Heat) Extract`
                      : `${c.name} Flavor`;

    // Warn on spice/heat + extreme
    if ((c.category === "Spice" || c.category === "Heat") && flavorStrength === "Extreme"){
      warnings.push(`High-impact category: ${c.category}. Use caution and taste incrementally.`);
    }

    flavors.push({
      name: displayName,
      category: c.category,
      amountMl: Number(amountMl.toFixed(3)),
      amountMlPer250: Number(per250.toFixed(3)),
      rangeUsed: flavorStrength === "Strong" ? "Typical"
              : flavorStrength === "Mild" ? "Low→Typical"
              : "Typical→High"
    });

    explain.push(`"${c.name}" classified as ${c.category} → starting point set by strength (${flavorStrength}) within locked range v1.0.`);
  }

  // Sweetness: HFCS as % of finished sample volume (simple and predictable)
  let sweetener = null;
  if (typeof sweetnessPercent === "number"){
    const hfcsMl = sampleSizeMl * (sweetnessPercent / 100);
    sweetener = {
      enabled: true,
      type: "HFCS42",
      targetPercent: sweetnessPercent,
      amountMl: Number(hfcsMl.toFixed(2))
    };

    // Spirit bias note: moonshine gets slight sweetness bias recommendation (but we do not auto-change)
    if (baseSpiritType === "Moonshine" && sweetnessPercent < 12){
      notes.push("Moonshine often benefits from 12% sweetness as a starting point.");
    }
  }

  // Acids are opt-in only; we only suggest them, do not auto-add.
  const acids = []; // empty by default

  // Adjustment guidance
  const guidance = [];
  for (const f of flavors){
    const incPer250 = ADJUST_INCREMENTS[f.category] ?? 0.10;
    const inc = incPer250 * scaleFactor;

    const prettyInc = inc < 0.1 ? inc.toFixed(2) : inc.toFixed(1);
    const cond =
      f.category === "Fruit" ? `${f.name} feels thin`
      : f.category === "Cream" ? `Finish needs more softness`
      : f.category === "Vanilla" ? `Finish feels flat`
      : f.category === "Citrus" ? `Needs more brightness`
      : f.category === "Dessert" ? `Dessert note feels light`
      : f.category === "Spice" ? `Spice is missing`
      : `Heat is too mild`;

    guidance.push({
      condition: cond,
      action: `Add +${prettyInc} mL`
    });
  }

  // Build draft object
  const draft = {
    sampleId: sbUuid("SB"),
    status: "draft",
    createdAt: sbNowISO(),
    createdBy: "user",
    version: "1.0",
    generator: "SampleBuilder",
    lockedFlavorRanges: SB_LOCKED_RANGES_VERSION,

    sampleDefinition: {
      sampleSizeMl,
      baseSpiritType,
      assumedProof: 60,
      flavorConcept: parsed.raw,
      flavorStrength,
      sweetness: (sweetener ? {
        enabled: true,
        type: "HFCS42",
        targetPercent: sweetener.targetPercent
      } : { enabled:false })
    },

    aiInterpretation: {
      parsedComponents: components.map(c => ({ name: c.name, category: c.category })),
      warnings,
      notes
    },

    ingredients: {
      baseSpirit: { amountMl: sampleSizeMl, notes: "R&D sample base" },
      flavors,
      sweetener,
      acids
    },

    adjustmentGuidance: guidance,
    iteration: { parentSampleId: null, iterationNotes: "" },
    promotion: { eligible: (sampleSizeMl === 375), promotedAt: null, baseRecipeId: null, approvedBy: null }
  };

  return { ok:true, draft, explain };
}
