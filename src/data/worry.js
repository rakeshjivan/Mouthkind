// ─── When to worry: what needs help, and how fast ────────────────────────────
// Three levels, matching the symptom log's triage: call 000 now, contact the team or a
// dentist today, and book in soon. Cancer care: Cancer Council Australia (2025), eviQ-style
// red flags as used in the daily log. Everyone: NICE NG12 (mouth ulcer over 3 weeks, lump,
// red or white patch).

export function worryList({ cancer = false, chemo = false, rtOrBone = false } = {}) {
  const team = cancer ? "your cancer team" : "a dentist or doctor";
  return [
    { level: "now", title: "Call 000", items: [
      "Swelling of the face or neck that is spreading, or it's hard to breathe",
      "You can't swallow your own saliva",
    ] },
    { level: "today", title: cancer ? "Call your cancer team now" : "See a dentist or doctor today", items: [
      ...(chemo ? ["A temperature of 38°C or more, or you feel shivery and unwell"] : []),
      "You can't eat or drink",
      "Pain relief isn't keeping the pain bearable",
      "Bleeding in your mouth that won't stop",
      "A tooth or gum that's swollen, or a bad taste that could be an infection",
      ...(cancer ? ["White patches or a coating that won't wipe off"] : []),
      ...(rtOrBone ? ["Bone showing in your mouth"] : []),
    ] },
    { level: "soon", title: cancer ? "Tell your team or dentist this week" : "Book in with your dentist", items: [
      "Toothache, or a broken tooth or filling",
      "Dentures that rub or no longer fit",
      "A mouth ulcer that hasn't healed in 3 weeks, a lump, or a red or white patch",
      "Dryness or soreness that is getting worse week on week",
    ] },
  ].map((g) => ({ ...g, who: team }));
}

export const WORRY_REFS = ["ccaMouth2025", "niceNG12", "elad2020"];
