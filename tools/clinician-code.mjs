#!/usr/bin/env node
// Issue Mouthkind clinician codes. Run on the sponsor's own computer, never in CI.
//
//   node tools/clinician-code.mjs keygen
//       Makes the signing key pair. The private key is saved OUTSIDE this repository, at
//       ~/.mouthkind/clinician-key.json (or $MOUTHKIND_KEY). Keep it safe and backed up:
//       anyone holding it can issue codes. Paste the printed public key into
//       src/clin/clinKeys.js and release.
//
//   node tools/clinician-code.mjs issue --name "Dr Jane Smith" --profession 0 \
//        --ahpra DEN0001234567 [--months 12] [--png code.png]
//       Before issuing, look the person up on the AHPRA public register
//       (https://www.ahpra.gov.au/Registration/Registers-of-Practitioners.aspx) and check the
//       name, profession and that registration is current. Prints the code, and saves a QR
//       code image the professional keeps on their phone or prints.
//       Professions: 0 Dentist, 1 Dental specialist, 2 Oral health therapist, dental
//       hygienist or therapist, 3 Medical practitioner, 4 Nurse practitioner or registered
//       nurse, 5 Pharmacist, 6 Other registered health professional.
//
// Keep a register of every code issued (name, AHPRA number, date, expiry). To withdraw
// one, add the AHPRA number to REVOKED in src/clin/clinKeys.js and release.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { signCode, b64u, PROFESSIONS } from "../src/clin/codes.js";
import { AHPRA } from "../src/clin/findings.js";

const KEY = process.env.MOUTHKIND_KEY || join(homedir(), ".mouthkind", "clinician-key.json");
const ALG = { name: "ECDSA", namedCurve: "P-256" };
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };

if (args[0] === "keygen") {
  if (existsSync(KEY)) { console.error(`A key already exists at ${KEY}. Move it first if you mean to replace it.`); process.exit(1); }
  const pair = await crypto.subtle.generateKey(ALG, true, ["sign", "verify"]);
  const priv = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const pub = b64u.enc(await crypto.subtle.exportKey("raw", pair.publicKey));
  mkdirSync(dirname(KEY), { recursive: true });
  writeFileSync(KEY, JSON.stringify({ priv, pub }, null, 2), { mode: 0o600 });
  console.log(`Private key saved to ${KEY}\nPublic key (add to src/clin/clinKeys.js):\n${pub}`);
} else if (args[0] === "issue") {
  const name = opt("name"), ahpra = (opt("ahpra") || "").toUpperCase(), p = Number(opt("profession", 0)), months = Number(opt("months", 12));
  if (!name || !AHPRA.test(ahpra) || !(p >= 0 && p < PROFESSIONS.length) || !(months > 0 && months <= 24)) {
    console.error("Need --name, --ahpra (3 letters + 10 digits), --profession 0-6 and --months 1-24."); process.exit(1);
  }
  const { priv } = JSON.parse(readFileSync(KEY, "utf8"));
  const key = await crypto.subtle.importKey("jwk", priv, ALG, false, ["sign"]);
  const d = new Date(); d.setMonth(d.getMonth() + months);
  const code = await signCode({ a: ahpra, n: name, p, e: d.toISOString().slice(0, 10) }, key);
  console.log(`${name}, ${PROFESSIONS[p]}, ${ahpra}, valid until ${d.toISOString().slice(0, 10)}\n\n${code}\n`);
  const png = opt("png");
  if (png) {
    const QR = (await import("qrcode")).default;
    await QR.toFile(png, code, { errorCorrectionLevel: "M", margin: 2, width: 600 });
    console.log(`QR code saved to ${png}`);
  }
} else {
  console.log("Usage: node tools/clinician-code.mjs keygen | issue --name … --profession 0-6 --ahpra … [--months 12] [--png file.png]");
}
