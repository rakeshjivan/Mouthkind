// ─── Clinician codes ───────────────────────────────────────────────────────
// The sponsor checks a professional on the AHPRA public register, then issues them a code
// signed with the sponsor's private key (tools/clinician-code.mjs). The app holds only the
// public key, so it can check a code offline, with no server, and a made-up or edited code
// fails. A code carries the professional's name, profession, AHPRA number and an expiry
// date; numbers on REVOKED stop working at the next release.
//
// Format: MK1.<payload>.<signature>, both base64url. Payload = compact JSON
// {"a":AHPRA,"n":name,"p":profession index,"e":"YYYY-MM-DD"}; signature = ECDSA P-256 over
// SHA-256 of the payload bytes, 64 bytes raw (r‖s), as WebCrypto makes and checks it.
import { AHPRA } from "./findings.js";
import { CLIN_PUBLIC_KEYS, REVOKED } from "./clinKeys.js";

export const PROFESSIONS = ["Dentist", "Dental specialist", "Oral health therapist, dental hygienist or therapist", "Medical practitioner", "Nurse practitioner or registered nurse", "Pharmacist", "Other registered health professional"];

const subtle = () => globalThis.crypto?.subtle;
export const b64u = {
  enc: (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  dec: (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0)),
};
const ALG = { name: "ECDSA", namedCurve: "P-256" };
const SIGN = { name: "ECDSA", hash: "SHA-256" };

/** Sign a payload with a private CryptoKey (used by the issuing tool and the tests). */
export async function signCode(payload, privateKey) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const sig = await subtle().sign(SIGN, privateKey, bytes);
  return `MK1.${b64u.enc(bytes)}.${b64u.enc(sig)}`;
}

const today = (now) => new Date(now).toISOString().slice(0, 10);

/**
 * Check a code. Returns { ok: true, by: {name, profession, ahpra}, expires } or
 * { ok: false, reason } with a reason a person can act on.
 */
export async function verifyCode(code, { keys = CLIN_PUBLIC_KEYS, revoked = REVOKED, now = Date.now() } = {}) {
  const parts = String(code || "").trim().replace(/\s+/g, "").split(".");
  if (parts.length !== 3 || parts[0] !== "MK1") return { ok: false, reason: "That isn't a Mouthkind clinician code." };
  let bytes, sig, p;
  try { bytes = b64u.dec(parts[1]); sig = b64u.dec(parts[2]); p = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { return { ok: false, reason: "That code is incomplete. Check it was copied in full." }; }
  if (!subtle()) return { ok: false, reason: "This browser can't check codes." };
  let good = false;
  for (const k of keys) {
    try {
      const key = await subtle().importKey("raw", b64u.dec(k), ALG, false, ["verify"]);
      if (await subtle().verify(SIGN, key, sig, bytes)) { good = true; break; }
    } catch { /* a malformed key or signature: try the next key */ }
  }
  if (!good) return { ok: false, reason: "That code wasn't issued for Mouthkind." };
  if (!AHPRA.test(p.a || "") || !p.n || !p.e) return { ok: false, reason: "That code is incomplete." };
  if (revoked.includes(p.a)) return { ok: false, reason: "That code has been withdrawn." };
  if (p.e < today(now)) return { ok: false, reason: `That code expired on ${p.e}. Ask for a new one.` };
  return { ok: true, by: { name: p.n, profession: PROFESSIONS[p.p] || PROFESSIONS.at(-1), ahpra: p.a }, expires: p.e };
}
