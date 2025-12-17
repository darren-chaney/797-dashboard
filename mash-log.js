/* ============================================================
   797 DISTILLERY — MASH LOG TEMPLATE
   ============================================================ */

export function createMashLog({ mashId, mashName, family, fillGal, fermentOnGrain }) {
  const now = new Date().toISOString();

  // Focused checkpoints (your request: guardrails, not what-ifs)
  const checkpoints = [
    { checkpoint: "Before grain/sugar: record water temp, volume" },
    { checkpoint: "After adding grain/sugar: record temp + stir notes" },
    { checkpoint: "Enzyme addition: note time + temp" },
    { checkpoint: "pH check (pre-yeast): target ~5.2–5.6" },
    { checkpoint: "Pitch yeast + nutrients: record time + temp" },
    { checkpoint: "12–18 hrs: pH + SG + temp" },
    { checkpoint: "Day 2: pH + SG + temp" },
    { checkpoint: "Daily: SG trend until stable" },
    { checkpoint: "Before distill: final SG + smell/taste check" }
  ];

  return {
    meta: {
      mashId,
      mashName,
      family,
      fillGal,
      fermentOnGrain,
      created_at: now
    },
    checkpoints
  };
}
