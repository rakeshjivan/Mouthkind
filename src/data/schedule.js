// ─── How often to check, and when the next check is due ────────────────────
import { DAY } from "../lib/store.js";

// The SIP-SCORE items carry no time frame of their own; the app adds one that
// matches how often the person checks.
export const FREQUENCIES = [
  { days: 1, label: "Every day", short: "daily", recall: "Today" },
  { days: 7, label: "Once a week", short: "weekly", recall: "Over the last week" },
  { days: 14, label: "Every two weeks", short: "fortnightly", recall: "Over the last two weeks", recommended: true },
];
export const freqFor = (days) => FREQUENCIES.find((f) => f.days === days) || FREQUENCIES[2];

const startOfDay = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** When the next check is due: { due: boolean, at: timestamp, days: whole days until due (0 = today) } */
export function nextCheck(lastTs, everyDays, now = Date.now()) {
  if (!lastTs) return { due: true, at: startOfDay(now), days: 0 };
  const at = startOfDay(lastTs) + everyDays * DAY;
  const days = Math.round((at - startOfDay(now)) / DAY);
  return { due: days <= 0, at, days: Math.max(0, days) };
}

export function dueWords(n) {
  if (n.due) return "Due today";
  if (n.days === 1) return "Due tomorrow";
  return `Next: ${new Date(n.at).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" })}`;
}

/**
 * A calendar file with a repeating reminder. Works now on any phone or
 * computer (open it to add to Calendar); the phone app will replace this with
 * its own notifications.
 */
export function reminderIcs(everyDays, hour = 9, from = Date.now()) {
  const d = new Date(from);
  d.setDate(d.getDate() + (d.getHours() >= hour ? 1 : 0));
  const pad = (n) => String(n).padStart(2, "0");
  const local = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(hour)}0000`;
  const rule = everyDays === 1 ? "FREQ=DAILY" : `FREQ=WEEKLY;INTERVAL=${everyDays / 7}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mouthkind//Dry mouth check//EN", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT", `UID:mouthkind-sip-${everyDays}@mouthkind`, `DTSTAMP:${stamp}`, `DTSTART:${local}`, "DURATION:PT5M",
    `RRULE:${rule}`, "SUMMARY:Mouthkind: dry mouth check", "DESCRIPTION:Five quick questions (SIP score), and a pH strip if you use them.",
    "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Time for your dry mouth check", "TRIGGER:PT0M", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
}
