// ─── My routine: chosen by the person, not by the app ─────────────────────
// The same list for everyone, in plain words and without brands. The person picks what
// they already do, or have been told to do, and can add their own. The app never
// chooses for them, so it gives no treatment advice of its own.
export const ROUTINE_LIBRARY = [
  { group: "Teeth and gums", items: [
    { key: "brush-am", slot: "morning", text: "Brush with fluoride toothpaste. Spit, don't rinse" },
    { key: "brush-pm", slot: "night", text: "Brush with fluoride toothpaste. Spit, don't rinse" },
    { key: "hf", slot: "night", text: "Brush with the high-fluoride toothpaste my dentist suggested" },
    { key: "creme-am", slot: "morning", text: "Calcium and phosphate crème after brushing" },
    { key: "creme-pm", slot: "night", text: "Calcium and phosphate crème after brushing" },
    { key: "floss", slot: "night", text: "Clean between my teeth" },
    { key: "trays", slot: "night", text: "Fluoride trays, as my dentist showed me" },
  ] },
  { group: "Dry mouth", items: [
    { key: "gel-meals", slot: "day", text: "Saliva gel before meals" },
    { key: "gel-bed", slot: "night", text: "Saliva gel at bedtime" },
    { key: "water", slot: "day", text: "Sip water through the day" },
    { key: "gum", slot: "day", text: "Sugar-free gum or sugar-free sweets" },
    { key: "lips", slot: "day", text: "Lip balm" },
  ] },
  { group: "Sore mouth", items: [
    { key: "rinse", slot: "day", text: "Bland rinse (salt or bicarbonate of soda in warm water)" },
    { key: "pain", slot: "day", text: "Pain relief before meals, as my team advised" },
    { key: "mouthwash", slot: "day", text: "Mouthwash my team prescribed" },
  ] },
  { group: "Dentures", items: [
    { key: "dent-clean", slot: "morning", text: "Clean my dentures" },
    { key: "dent-out", slot: "night", text: "Take my dentures out, clean them and leave them out overnight" },
  ] },
];

export const LIB = ROUTINE_LIBRARY.flatMap((g) => g.items);

/** The person's routine as routine items: { id, slot, text }. */
export function myRoutine(profile = {}) {
  return (profile.myRoutine || []).map((r) => ({ id: `${r.slot}.${r.key}`, slot: r.slot, text: r.text }));
}
