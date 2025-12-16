/* =========================================================
   797 Distillery – Master Recipe Book
   File: recipes.js
   Version: 1.0.1
   Notes:
   - Canonical production recipes only
   - No math, no UI logic
   - Percentages are v/v unless noted
   ========================================================= */

window.RECIPES = {

  /* =========================
     MOONSHINE – FRUIT / DESSERT
     ========================= */

  apple_pie: {
    name: "Apple Pie Moonshine (165 Proof Base)",
    base: { gallons: 5.000, proof: 165 },
    final: { proof: 60 },
    ingredients: [
      { name: "HFCS 42", type: "percent_vv", percent: 0.12, densityKgPerL: 1.613 },
      { name: "Apex Apple Pie Flavor", type: "liquid", amount: 460, unit: "mL" },
      { name: "Olive Nation Apple Flavor", type: "liquid", amount: 46, unit: "mL" },
      { name: "Citric Acid", type: "solid", amount: 0.75, unit: "g", optional: true }
    ]
  },

  pecan_pie: {
    name: "Pecan Pie Moonshine",
    base: { gallons: 5.000, proof: 154 },
    final: { proof: 60 },
    ingredients: [
      { name: "HFCS 42", type: "percent_vv", percent: 0.147, densityKgPerL: 1.613 },
      { name: "Apex Pecan Pie Flavor", type: "liquid", amount: 518, unit: "mL" },
      { name: "Apex Butter Pecan Flavor", type: "liquid", amount: 389, unit: "mL" },
      { name: "Apex Caramelized Sugar", type: "liquid", amount: 259, unit: "mL" },
      { name: "Caramel Color", type: "liquid", amount: 10, unit: "mL" }
    ]
  },

  peach_cobbler: {
    name: "Peach Cobbler Moonshine",
    base: { gallons: 5.000, proof: 160 },
    final: { proof: 60 },
    ingredients: [
      { name: "HFCS 42", type: "percent_vv", percent: 0.12, densityKgPerL: 1.613 },
      { name: "Mother Murphy Peach Cobbler", type: "liquid", amount: 300, unit: "mL" },
      { name: "Apex Peach Flavor", type: "liquid", amount: 20, unit: "mL" },
      { name: "Olive Nation Peach Flavor", type: "liquid", amount: 10, unit: "mL" },
      { name: "Caramel Coloring", type: "liquid", amount: 4, unit: "mL" }
    ]
  },

  blackberry_cobbler: {
    name: "Blackberry Cobbler Moonshine",
    base: { gallons: 5.000, proof: 153 },
    final: { proof: 60 },
    ingredients: [
      { name: "HFCS 42", type: "percent_vv", percent: 0.12, densityKgPerL: 1.613 },
      { name: "Blackberry Cobbler Flavor", type: "liquid", amount: 400, unit: "mL" },
      { name: "Blackberry Fresh Flavor", type: "liquid", amount: 160, unit: "mL" }
    ]
  },

  /* =========================
     MOONSHINE – FRUIT / SOUR
     ========================= */

  spicy_pineapple: {
    name: "Spicy Pineapple Moonshine",
    base: { gallons: 5.000, proof: 155 },
    final: { proof: 60 },
    ingredients: [
      { name: "HFCS 42", type: "percent_vv", percent: 0.14, densityKgPerL: 1.613 },
      { name: "Apex Pineapple Flavor", type: "liquid", amount: 420, unit: "mL" },
      { name: "Apex Capsicum Natural Extract", type: "liquid", amount: 12, unit: "mL" },
      { name: "Citric Acid", type: "solid", amount: 27, unit: "g" },
      { name: "Malic Acid", type: "solid", amount: 8, unit: "g" }
    ]
  },

  watermelon: {
    name: "Watermelon Moonshine",
    base: { gallons: 4.000, proof: 162 },
    final: { proof: 60 },
    ingredients: [
      { name: "HFCS 42", type: "percent_vv", percent: 0.12, densityKgPerL: 1.613 },
      { name: "Apex Watermelon Flavor", type: "liquid", amount: 580, unit: "mL" },
      { name: "Olive Nation Watermelon Flavor", type: "liquid", amount: 30, unit: "mL" },
      { name: "Mother Murphy Watermelon", type: "liquid", amount: 12, unit: "mL" }
    ]
  },

  sour_green_apple: {
    name: "Sour Green Apple Moonshine",
    base: { gallons: 4.000, proof: 164 },
    final: { proof: 60 },
    ingredients: [
      { name: "HFCS 42", type: "percent_vv", percent: 0.12, densityKgPerL: 1.613 },
      { name: "Apex Green Apple Flavor", type: "liquid", amount: 580, unit: "mL" },
      { name: "Olive Nation Apple Flavor", type: "liquid", amount: 145, unit: "mL" },
      { name: "Malic Acid", type: "solid", amount: 5, unit: "g" }
    ]
  },

  strawberry_lemonade: {
    name: "Strawberry Lemonade Moonshine",
    base: { gallons: 4.000, proof: 164 },
    final: { proof: 60 },
    ingredients: [
      { name: "HFCS 42", type: "percent_vv", percent: 0.12, densityKgPerL: 1.613 },
      { name: "Strawberry Fresh Flavor", type: "liquid", amount: 580, unit: "mL" },
      { name: "Liquid Citric Acid", type: "liquid", amount: 15, unit: "mL" }
    ]
  },

  blue_raspberry: {
    name: "Blue Raspberry Moonshine",
    base: { gallons: 4.000, proof: 164 },
    final: { proof: 60 },
    ingredients: [
      { name: "HFCS 42", type: "percent_vv", percent: 0.12, densityKgPerL: 1.613 },
      { name: "Mother Murphy Blue Raspberry", type: "liquid", amount: 629, unit: "mL" }
    ]
  },

  peanut_butter_cup: {
    name: "Peanut Butter Cup Moonshine",
    base: { gallons: 4.000, proof: 164 },
    final: { proof: 60 },
    ingredients: [
      { name: "HFCS 42", type: "percent_vv", percent: 0.12, densityKgPerL: 1.613 },
      { name: "Olive Nation Peanut Butter Cup Flavor", type: "liquid", amount: 375, unit: "mL" },
      { name: "Caramel Color", type: "liquid", amount: 6, unit: "mL" }
    ]
  },

  black_sweet_tea: {
    name: "Black Sweet Tea Moonshine",
    base: { gallons: 5.000, proof: 154 },
    final: { proof: 60 },
    ingredients: [
      { name: "HFCS 42", type: "percent_vv", percent: 0.144, densityKgPerL: 1.613 },
      { name: "Apex Black Tea Extract", type: "liquid", amount: 1360, unit: "mL" }
    ],
    notes: [
      "Do not re-proof after sugar addition; dissolved solids skew hydrometer readings."
    ]
  },

  /* =========================
     RUM & VODKA
     ========================= */

  coconut_rum: {
    name: "Coconut Flavored Rum",
    base: { gallons: 7.75, proof: 80 },
    final: { proof: 80 },
    ingredients: [
      { name: "HFCS 42", type: "percent_vv", percent: 0.046, densityKgPerL: 1.613 },
      { name: "Apex Coconut Flavor", type: "liquid", amount: 100, unit: "mL" },
      { name: "Olive Nation Vanilla Flavor", type: "liquid", amount: 100, unit: "mL" }
    ]
  },

  whipped_cream_vodka: {
    name: "Whipped Cream Vodka",
    base: { gallons: 6.000, proof: 192 },
    final: { proof: 70 },
    ingredients: [
      { name: "HFCS 42", type: "percent_vv", percent: 0.0945, densityKgPerL: 1.30 },
      { name: "Apex Whipped Cream Flavor", type: "liquid", amount: 596, unit: "mL" },
      { name: "Vanilla Flavor", type: "liquid", amount: 75, unit: "mL" }
    ]
  }

};
