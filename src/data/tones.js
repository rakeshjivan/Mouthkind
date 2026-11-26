// ─── Colours ───────────────────────────────────────────────────────────────
// One pastel per subject, the same wherever it appears (Today, Records, Learn, My plan):
// blue saliva and pH, green easing dryness, amber food and medicines, peach teeth and
// check-ups, lilac sleep and habits, rose sore mouths and life stages. Red stays for urgent.
export const TOPIC_TONE = {
  saliva: "blue", water: "blue", thrush: "blue",
  products: "green", clean: "green",
  diet: "amber", medicines: "amber", eating: "amber", taste: "amber",
  teeth: "peach", dentist: "peach", rtlife: "peach",
  sleep: "lilac", habits: "lilac", swallow: "lilac",
  acid: "rose", sore: "rose", pregnancy: "rose", menopause: "rose",
  help: "red",
};
const TONES = ["blue", "green", "amber", "peach", "lilac", "rose"];
export const topicTone = (id, i = 0) => TOPIC_TONE[id] || TONES[i % TONES.length];

/** A plan item's colour, from what it's about; otherwise the next colour in turn. */
export function itemTone(it = {}, i = 0) {
  const s = `${it.id || ""} ${it.title || ""}`.toLowerCase();
  if (/fluoride|dental|dentist|teeth|tooth|decay|varnish|mousse|denture/.test(s)) return "peach";
  if (/\bph\b|phretest|phtiming|acid|reflux|vomit/.test(s)) return "blue";
  if (/medicine|pharmac|riseMed|inhaler/i.test(s)) return "amber";
  if (/rinse|sore|pain|mucos|thrush/.test(s)) return "rose";
  if (/sleep|cpap|night|splint|snor/.test(s)) return "lilac";
  if (/gel|dry|saliva|water|drink|spray/.test(s)) return "green";
  return TONES[i % TONES.length];
}
