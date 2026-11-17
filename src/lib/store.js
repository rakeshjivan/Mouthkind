// ─── On-device storage ─────────────────────────────────────────────────────
// Everything lives in this browser / app only. Nothing is sent anywhere.
// localStorage is fine for the web build; the native builds should swap
// `driver` for Capacitor Preferences or SQLite without touching callers.

const PREFIX = "mc:";
const driver = {
  get(k) {
    try { const v = localStorage.getItem(PREFIX + k); return v == null ? null : JSON.parse(v); } catch { return null; }
  },
  set(k, v) {
    try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); return true; } catch { return false; }
  },
  del(k) {
    try { localStorage.removeItem(PREFIX + k); } catch { /* ignore */ }
  },
};

export const KEYS = ["profile", "entries", "prefs"];
export const load = (k, fallback) => driver.get(k) ?? fallback;
export const save = (k, v) => driver.set(k, v);
export const wipe = () => KEYS.forEach((k) => driver.del(k));

export const DEFAULT_PROFILE = {
  name: "", firstName: "", lastName: "", dob: "", gender: "", region: "AU", treatments: [], phase: "during", endDate: "",
  team: { name: "", phone24: "" }, dentist: { name: "", phone: "" },
  carer: false, phStrips: false, chemoDates: [], asked: [], ownQuestions: [],
  onboarded: false,
};
export const DEFAULT_PREFS = { theme: "auto", text: "m", sipEvery: null };

// ─── Encrypted backup ──────────────────────────────────────────────────────
// PBKDF2-SHA256 (250k) → AES-GCM-256. No recovery without the passphrase.
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function keyFrom(pass, salt) {
  const base = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function makeBackup(payload, pass) {
  if (!pass) return JSON.stringify({ format: "mouthkind-backup", v: 1, encrypted: false, data: payload }, null, 2);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await keyFrom(pass, salt), enc.encode(JSON.stringify(payload)));
  return JSON.stringify({ format: "mouthkind-backup", v: 1, encrypted: true, kdf: "PBKDF2-SHA256-250000",
    salt: b64(salt), iv: b64(iv), data: b64(ct) }, null, 2);
}

export async function readBackup(text, pass) {
  let f;
  try { f = JSON.parse(text); } catch { throw new Error("That file isn't a backup from this app."); }
  if (f.format !== "mouthkind-backup" && f.format !== "mouthcare-backup") throw new Error("That file isn't a backup from this app.");
  if (!f.encrypted) return f.data;
  if (!pass) throw new Error("This backup is locked. Enter the passphrase you used.");
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(f.iv) }, await keyFrom(pass, unb64(f.salt)), unb64(f.data));
    return JSON.parse(dec.decode(plain));
  } catch { throw new Error("Wrong passphrase, or the file is damaged."); }
}

export function downloadText(filename, text, mime = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

// ─── Dates ─────────────────────────────────────────────────────────────────
export const DAY = 86400000;
export const dayKey = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const fmtDate = (ts) => new Date(ts).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
export const fmtShort = (ts) => new Date(ts).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
export const fmtTime = (ts) => new Date(ts).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
