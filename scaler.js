/* =========================================================
   797 Distillery – Recipe Scaling Engine
   File: scaler.js
   Version: 1.0.0
   Author: 797 Distillery
   ========================================================= */

/* =========================
   CONFIG
   ========================= */

// Toggle sugar volume displacement
// 1 lb granulated sugar ≈ 0.083 gal displacement
const INCLUDE_SUGAR_VOLUME = false;
const SUGAR_GAL_PER_LB = 0.083;

/* =========================
   PRODUCT DEFINITIONS
   ========================= */

const PRODUCTS = {
  moonshine: {
    key: "moonshine",
    name: "Moonshine – White Dog",
    baseProof: 190,
    defaultTargetProof: 100,
    allowsSugar: false
  },

  vodka: {
    key: "vodka",
    name: "Vodka – Neutral",
    baseProof: 190,
    defaultTargetProof: 80,
    allowsSugar: false
  },

  rum: {
    key: "rum",
    name: "White Rum",
    baseProof: 190,
    defaultTargetProof: 80,
    allowsSugar: true
  },

  whiskey: {
    key: "whiskey",
    name: "Whiskey – New Make",
    baseProof: 125,
    defaultTargetProof: 125,
    allowsSugar: false
  }
};

/* =========================
   CORE MATH
   ========================= */

function proofGallons(volumeGal, proof) {
  return volumeGal * (proof / 100);
}

function alcoholVolume(requiredPG, baseProof) {
  return requiredPG / (baseProof / 100);
}

function sugarVolume(sugarLbs) {
  if (!INCLUDE_SUGAR_VOLUME) return 0;
  return sugarLbs * SUGAR_GAL_PER_LB;
}

function waterVolume(targetVolume, alcoholVol, otherLiquids = 0) {
  return targetVolume - alcoholVol - otherLiquids;
}

/* =========================
   MAIN SCALER
   ========================= */

function scaleRecipe({
  productKey,
  targetVolumeGal,
  targetProof,
  sugarLbs = 0
}) {
  const product = PRODUCTS[productKey];
  if (!product) {
    throw new Error(`Unknown product key: ${productKey}`);
  }

  const finalTargetProof =
    targetProof || product.defaultTargetProof;

  const requiredPG = proofGallons(
    targetVolumeGal,
    finalTargetProof
  );

  const alcoholGal = alcoholVolume(
    requiredPG,
    product.baseProof
  );

  const sugarGal =
    product.allowsSugar ? sugarVolume(sugarLbs) : 0;

  const waterGal = waterVolume(
    targetVolumeGal,
    alcoholGal,
    sugarGal
  );

  return {
    product: product.name,
    targetVolumeGal,
    targetProof: finalTargetProof,
    baseProof: product.baseProof,
    proofGallons: round(requiredPG),
    alcoholGallons: round(alcoholGal),
    waterGallons: round(waterGal),
    sugarGallons: round(sugarGal),
    sugarLbs,
    includeSugarVolume: INCLUDE_SUGAR_VOLUME
  };
}

/* =========================
   UTILITIES
   ========================= */

function round(value, decimals = 2) {
  return Number(value.toFixed(decimals));
}

/* =========================
   EXPORTS (GLOBAL SAFE)
   ========================= */

window.Scaler = {
  PRODUCTS,
  scaleRecipe
};
