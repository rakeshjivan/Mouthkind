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
    { id: "dentist", role: "My dentist" },
    { id: "gp", role: "My GP" },
  ].filter(Boolean);
}

/** Read one contact as { name, phone }. */
export function getContact(profile = {}, id) {
  if (id === "line24") return { name: profile.team?.name || "", phone: profile.team?.phone24 || "" };
  if (id === "dentist") return { name: profile.dentist?.name || "", phone: profile.dentist?.phone || "" };
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
  return { ...profile, contacts: { ...profile.contacts, [id]: { ...profile.contacts?.[id], ...patch } } };
}

/** The contacts that have a number, ready to call. */
export function careContacts(profile = {}) {
  return contactRoles(profile).map((r) => ({ ...r, ...getContact(profile, r.id) })).filter((c) => c.phone.trim());
}

export const telHref = (phone) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** Questions still to ask, for the Home box. */
export const openQuestionCount = (profile = {}) => (profile.ownQuestions || []).filter((q) => !(profile.asked || []).includes(q)).length;
