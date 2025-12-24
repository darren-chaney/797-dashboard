/* ============================================================
   deriveSpiritClass.js
   Canonical spirit classification for TTB reports
   ============================================================ */

export function deriveSpiritClass(event) {

  const proof = Number(event.proof || 0);
  const runType = event.runType || "";
  const productType = event.productType || "";
  const notes = (event.notes || "").toLowerCase();

  // Explicit product types first (most reliable)
  if (productType === "rum") return "rum";
  if (productType === "vodka") return "vodka";

  // Whiskey (only valid ≤160)
  if (productType === "whiskey" && proof <= 160) {
    return "whiskey_under_160";
  }

  // Moonshine / neutral / spirit runs under 190
  if (proof < 190) {
    return "spirits_under_190";
  }

  // ≥190 proof spirits (not used today, but future-safe)
  return "spirits_over_190";
}
