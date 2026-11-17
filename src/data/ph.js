// ─── Resting saliva pH ─────────────────────────────────────────────────────
// Zones follow GC Saliva-Check BUFFER: 5.0–5.8 highly acidic (red),
// 6.0–6.6 moderately acidic (yellow), 6.8–7.8 healthy (green).
// Saliva that stays acidic lets acid-loving bacteria thrive and teeth lose
// mineral — a risk for decay even when saliva flow is normal.

export const PH_ZONES = [
  { id: "high", lo: 5.0, hi: 5.8, label: "Highly acidic", tone: "red" },
  { id: "mod", lo: 6.0, hi: 6.6, label: "Moderately acidic", tone: "amber" },
  { id: "ok", lo: 6.8, hi: 7.8, label: "Healthy", tone: "good" },
];
export const phZone = (v) => (v == null ? null : v <= 5.8 ? PH_ZONES[0] : v <= 6.6 ? PH_ZONES[1] : PH_ZONES[2]);
export const isAcidic = (v) => v != null && v <= 6.6;

// How many of the latest results count, and how many acidic ones make a pattern.
export const PH_WINDOW = 5;
export const PH_ACID_COUNT = 3;
export const PH_HIGH_COUNT = 2;

/**
 * Looks at the latest results (newest last) and says what they add up to.
 * level: "none" (no results) · "ok" · "watch" (some acidic) · "flag" (consistently acidic)
 */
export function phPattern(readings) {
  const recent = readings.slice(-PH_WINDOW);
  if (!recent.length) return { level: "none", recent };
  const acid = recent.filter((r) => isAcidic(r.ph)).length;
  const high = recent.filter((r) => r.ph <= 5.8).length;
  const flag = (recent.length >= PH_ACID_COUNT && acid >= PH_ACID_COUNT) || high >= PH_HIGH_COUNT;
  return { level: flag ? "flag" : acid ? "watch" : "ok", acid, high, n: recent.length, recent };
}

export const PH_STEPS = [
  "Wait at least 1 hour after eating, drinking, smoking, brushing or using mouthwash.",
  "Sit upright. Let saliva pool in your mouth, then spit it into a clean cup.",
  "Dip the strip in the saliva for 10 seconds.",
  "Match the colour straight away and tap the closest one.",
  "Test at about the same time each day — saliva changes through the day.",
];
