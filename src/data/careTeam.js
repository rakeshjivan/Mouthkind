// ─── My care team: who to contact, in one place ────────────────────────────
// Kept on the profile. The older fields (team.name, team.phone24, dentist.phone)
// are still read and written, so earlier data carries over.
import { inCancerCare } from "./journey.js";

/** The contact slots this person sees, in the order they'd need them. */
export function contactRoles(profile = {}) {
  const cancer = inCancerCare(profile);
  return [
    cancer && { id: "line24", role: "24-hour treatment line", hint: "The number your cancer team gave you for urgent problems", urgent: true },
    { id: "specialist", role: "My specialist", hint: cancer ? "Your oncologist, radiation oncologist or haematologist" : "e.g. rheumatologist, ENT or oral medicine" },
    cancer && { id: "nurse", role: "Cancer care nurse", hint: "Your nurse coordinator or clinic nurse" },
    { id: "dentist", role: "My dentist", find: "dentist" },
    { id: "pharmacy", role: "My pharmacy", find: "pharmacy", hint: "For high-fluoride toothpaste, saliva gels, thrush treatment and medicine reviews" },
    { id: "gp", role: "My GP" },
    // Anyone else the person adds (a dietitian, speech pathologist, social worker…).
    ...(profile.extraContacts || []).map((x) => ({ id: x.id, role: x.role?.trim() || "Other contact", extra: true })),
  ].filter(Boolean);
}

/** Add an empty extra contact; returns the new profile. */
export const addExtraContact = (profile = {}, id = `x_${Date.now()}`) =>
  ({ ...profile, extraContacts: [...(profile.extraContacts || []), { id, role: "", name: "", phone: "" }] });
/** Remove an extra contact. */
export const removeExtraContact = (profile = {}, id) =>
  ({ ...profile, extraContacts: (profile.extraContacts || []).filter((x) => x.id !== id) });

/** Read one contact as { name, phone }. */
export function getContact(profile = {}, id) {
  if (id === "line24") return { name: profile.team?.name || "", phone: profile.team?.phone24 || "" };
  if (id === "dentist") return { name: profile.dentist?.name || "", phone: profile.dentist?.phone || "" };
  const x = (profile.extraContacts || []).find((c) => c.id === id);
  if (x) return { name: x.name || "", phone: x.phone || "", role: x.role || "" };
  return { name: profile.contacts?.[id]?.name || "", phone: profile.contacts?.[id]?.phone || "" };
}

/** A new profile with one contact changed. */
export function setContact(profile = {}, id, patch) {
  if (id === "line24") {
    const t = { ...profile.team };
    if ("name" in patch) t.name = patch.name;
    if ("phone" in patch) t.phone24 = patch.phone;
    return { ...profile, team: t };
  }
  if (id === "dentist") return { ...profile, dentist: { ...profile.dentist, ...patch } };
  if ((profile.extraContacts || []).some((c) => c.id === id))
    return { ...profile, extraContacts: profile.extraContacts.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
  return { ...profile, contacts: { ...profile.contacts, [id]: { ...profile.contacts?.[id], ...patch } } };
}

/** The contacts that have a number, ready to call. */
export function careContacts(profile = {}) {
  return contactRoles(profile).map((r) => { const { role, ...c } = getContact(profile, r.id); return { ...r, ...c }; }).filter((c) => c.phone.trim());
}

export const telHref = (phone) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** Questions still to ask, for the Home box. */
export const openQuestionCount = (profile = {}) => (profile.ownQuestions || []).filter((q) => !(profile.asked || []).includes(q)).length;

/** "your specialist, nurse, dentist, pharmacy and GP" — the roles this person sees. */
export function rolesText(profile = {}) {
  const names = contactRoles(profile).filter((r) => r.id !== "line24").map((r) => r.role.replace(/^My /, "").replace(/^Cancer care nurse$/, "nurse"));
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
}

/** Australian state or territory from a postcode, for the public dental service link. */
export function stateFromPostcode(pc = "") {
  const n = Number(String(pc).trim());
  if (!/^\d{4}$/.test(String(pc).trim())) return null;
  if ((n >= 2600 && n <= 2618) || (n >= 2900 && n <= 2920)) return "ACT";
  if (n >= 2000 && n <= 2999) return "NSW";
  if (n >= 3000 && n <= 3999) return "VIC";
  if (n >= 4000 && n <= 4999) return "QLD";
  if (n >= 5000 && n <= 5999) return "SA";
  if (n >= 6000 && n <= 6999) return "WA";
  if (n >= 7000 && n <= 7999) return "TAS";
  if (n >= 800 && n <= 999) return "NT";
  return null;
}

/** A Maps search near a postcode. Opens the phone's maps app; nothing is sent until tapped. */
export const findNearHref = (what, pc) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${what} near ${String(pc).trim()} Australia`)}`;
export const PUBLIC_DENTAL_URL = "https://teeth.org.au/government-dental-care";
