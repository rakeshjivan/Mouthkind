// ─── Questions for my team: the shareable list ─────────────────────────────
/** The list as plain text: still to ask first, then the ones already asked. */
export function questionsText(profile) {
  const qs = profile.ownQuestions || [], asked = profile.asked || [];
  const name = [profile.firstName || profile.name, profile.lastName].filter(Boolean).join(" ");
  const who = profile.carer ? `${name || profile.carerFor || "the person I care for"}${profile.carerName ? ` (carer: ${profile.carerName})` : ""}` : name;
  const todo = qs.filter((q) => !asked.includes(q)), done = qs.filter((q) => asked.includes(q));
  return [
    `Questions for my treatment team${who ? ` — ${who}` : ""}`,
    new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }),
    "",
    ...(todo.length ? ["To ask:", ...todo.map((q, i) => `${i + 1}. ${q}`)] : []),
    ...(done.length ? ["", "Already asked:", ...done.map((q) => `✓ ${q}`)] : []),
    "",
    "From the Mouthkind app",
  ].join("\n");
}
