// ─── Milk-protein allergy: dairy-free wording for general advice ───────────
// Products are filtered in the plan; this rewrites the few tips that suggest
// cheese, milk or yoghurt so a person with the allergy never sees them.
export const milkAllergic = (profile) => [].concat(profile?.fu?.allergy?.v || []).includes("milk");

const SWAPS = [
  [/Finish a meal with cheese or milk — they help neutralise acid\./g, "Finish a meal with sugar-free gum or a drink of water to help clear acid."],
  [/Choose cheese, plain yoghurt or crackers between meals\./g, "Choose crackers, vegetables or nuts between meals."],
  [/,? (and )?finish with sugar-free gum or a piece of cheese/g, ", and finish with sugar-free gum"],
  [/, chew sugar-free gum, or finish with cheese or milk\./g, ", or chew sugar-free gum."],
  [/yoghurt, custard, /g, ""],
  [/ for water or milk,/g, " for water,"],
];
export function milkFree(text) {
  return SWAPS.reduce((t, [re, to]) => t.replace(re, to), text);
}
