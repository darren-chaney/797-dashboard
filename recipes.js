/* =========================================================
   797 Distillery – Master Recipe Book
   File: recipes.js
   Version: 1.0.0
   Notes:
   - Canonical recipes only
   - Do NOT put math or UI logic here
   ========================================================= */

window.RECIPES = {
  margarita: {
    name: "Margarita Moonshine",
    base: { gallons: 4, proof: 164 },
    final: { proof: 60 },
    ingredients: [
      { name:"HFCS 42", type:"percent_vv", percent:0.14, densityKgPerL:1.613 },
      { name:"Apex Margarita Flavor", type:"liquid", amount:232, unit:"mL" },
      { name:"Apex Orange Extract", type:"liquid", amount:39, unit:"mL" },
      { name:"Citric Acid", type:"solid", amount:27, unit:"g" },
      { name:"Malic Acid", type:"solid", amount:8, unit:"g" }
    ]
  },

  spicy_pineapple: {
    name: "Spicy Pineapple Moonshine",
    base: { gallons: 5, proof: 155 },
    final: { proof: 60 },
    ingredients: [
      { name:"HFCS 42", type:"percent_vv", percent:0.12, densityKgPerL:1.613 },
      { name:"Apex Pineapple Flavor", type:"liquid", amount:420, unit:"mL" },
      { name:"Apex Capsicum Extract", type:"liquid", amount:12, unit:"mL" },
      { name:"Citric Acid", type:"solid", amount:27, unit:"g" },
      { name:"Malic Acid", type:"solid", amount:8, unit:"g" }
    ]
  }

  // ← Add more recipes below
};
