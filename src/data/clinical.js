// ─── Treatments ────────────────────────────────────────────────────────────
// The mouth problem a patient faces depends on the treatment, not the cancer.
export const TREATMENTS = [
  {
    id: "chemo",
    label: "Chemotherapy",
    hint: "Drips or tablets, including at home",
    feverRisk: true,
  },
  {
    id: "rt_hn",
    label: "Radiotherapy to the head or neck",
    hint: "Including mouth, throat, salivary glands or jaw",
  },
  {
    id: "rt_other",
    label: "Radiotherapy somewhere else",
    hint: "Breast, chest, pelvis, brain and so on",
  },
  {
    id: "immuno",
    label: "Immunotherapy",
    hint: "For example pembrolizumab (Keytruda), nivolumab (Opdivo)",
  },
  {
    id: "targeted",
    label: "Targeted therapy",
    hint: "For example everolimus, or a tablet that blocks a growth signal",
  },
  {
    id: "transplant",
    label: "Stem cell or bone marrow transplant",
    hint: "Including high-dose chemotherapy before it",
    feverRisk: true,
  },
  {
    id: "bone",
    label: "Bone-strengthening injections",
    hint: "Zoledronic acid (Zometa) or denosumab (Xgeva, Prolia)",
  },
];

export const PHASES = [
  { id: "before", label: "Not started yet" },
  { id: "during", label: "Having treatment now" },
  { id: "after", label: "Finished treatment" },
];

// ─── GC SIP-SCORE ──────────────────────────────────────────────────────────
// Five items of the validated shortened Xerostomia Inventory. Never add to
// this list: an extra item makes the score no longer comparable.
export const SIP_QUESTIONS = [
  "My mouth feels dry when eating a meal",
  "I have difficulty in eating dry foods",
  "I have difficulties swallowing certain foods",
  "My lips feel dry",
  "My mouth feels dry",
];
export const SIP_OPTIONS = [
  { v: 1, label: "Never", hint: "This doesn't happen to me" },
  { v: 2, label: "Sometimes", hint: "It happens now and then" },
  { v: 3, label: "Often", hint: "It happens most of the time" },
];
export const SIP_BANDS = [
  { lo: 5, hi: 7, label: "Minimal", full: "No or minimal dry mouth", color: "#4C9A6A", t0: 0, t1: 0.25 },
  { lo: 8, hi: 10, label: "Mild to moderate", full: "Mild to moderate dry mouth", color: "#C9A21A", t0: 0.25, t1: 0.55 },
  { lo: 11, hi: 13, label: "Moderate to severe", full: "Moderate to severe dry mouth", color: "#DD7622", t0: 0.55, t1: 0.85 },
  { lo: 14, hi: 15, label: "Severe", full: "Severe dry mouth", color: "#BE332A", t0: 0.85, t1: 1 },
];
export const sipBand = (s) => SIP_BANDS.find((b) => s >= b.lo && s <= b.hi) || SIP_BANDS[0];
// The SIP items ask about the last fortnight, so that's the cadence.
export const SIP_INTERVAL_DAYS = 14;

// ─── Saliva pH ─────────────────────────────────────────────────────────────
export const PH_VALUES = Array.from({ length: 15 }, (_, i) => Math.round((5 + i * 0.2) * 10) / 10);
const PH_COLORS = ["#E02B20", "#E53A1E", "#EA4A1C", "#EE5C19", "#F16E16", "#F38214", "#F59A14",
  "#F5B417", "#F2D01D", "#D4D02A", "#B7CD36", "#A0C73F", "#8DC04A", "#6FB07B", "#5FA98B"];
export const phColor = (v) => PH_COLORS[PH_VALUES.indexOf(v)] || "#8A9A96";
export const phBand = (v) => (v == null ? null : v < 6.8 ? "Acidic" : v <= 7.4 ? "Healthy range" : "Alkaline");
// Exposed root surfaces start to dissolve well above enamel's ~5.5.
export const PH_ROOT_CRITICAL = 6.4;

// ─── Daily check-in ────────────────────────────────────────────────────────
export const EATING = [
  { id: "normal", label: "Eating normally" },
  { id: "soft", label: "Soft foods only" },
  { id: "liquids", label: "Liquids only" },
  { id: "none", label: "Can't eat or drink enough" },
];

export const SYMPTOMS = [
  { id: "sores", label: "Mouth sores or ulcers" },
  { id: "white", label: "White patches or red sore areas" },
  { id: "corners", label: "Sore or cracked corners of the mouth" },
  { id: "taste", label: "Taste has changed" },
  { id: "swallow", label: "Swallowing is hard or painful" },
  { id: "opening", label: "Can't open my mouth as wide" },
  { id: "jaw", label: "Jaw pain or swelling" },
  { id: "bone", label: "Bone showing in my mouth" },
  { id: "denture", label: "Dentures rubbing or loose" },
];

// First question after fever. Plain, everyday problems first; the two
// emergencies last. Bleeding gets a follow-up (does it stop with pressure?).
export const DANGER_SIGNS = [
  { id: "gum_bleed", label: "My gums bleed" },
  { id: "sensitive", label: "My teeth are sensitive" },
  { id: "toothache", label: "I have a toothache" },
  { id: "broken", label: "I have a broken tooth or filling" },
  { id: "cant_swallow_saliva", label: "Can't swallow my own saliva, or trouble breathing" },
  { id: "swelling_spreading", label: "Face or neck swelling that is spreading" },
];
// Answers on that screen that end the check-in at once.
export const EMERGENCY_SIGNS = ["cant_swallow_saliva", "swelling_spreading", "bleed_wont_stop"];
// Labels for answers older entries may hold.
export const OLD_LABELS = { bleeding: "Bleeding gums or mouth", toothache: "Toothache or a broken tooth", bleed_wont_stop: "Bleeding that won't stop" };

// ─── Regions ───────────────────────────────────────────────────────────────
export const REGIONS = {
  AU: {
    name: "Australia",
    emergency: "000",
    nurseLine: { name: "healthdirect", number: "1800 022 222" },
    cancerLine: { name: "Cancer Council", number: "13 11 20" },
  },
  NZ: {
    name: "New Zealand",
    emergency: "111",
    nurseLine: { name: "Healthline", number: "0800 611 116" },
    cancerLine: { name: "Cancer Society", number: "0800 226 237" },
  },
};
export const telHref = (n) => `tel:${String(n).replace(/[^0-9+]/g, "")}`;

// ─── Carer-observed signs ──────────────────────────────────────────────────
// Shown only in carer mode: things a helper sees that a patient may not say.
export const CARER_SIGNS = [
  { id: "c_refuse", label: "Refusing food or eating very slowly" },
  { id: "c_choke", label: "Coughing or choking when eating or drinking" },
  { id: "c_denture", label: "Won't wear their dentures" },
  { id: "c_speech", label: "Speech changed, or more withdrawn or irritable" },
  { id: "c_water", label: "Drinking a lot with meals, or waking for water" },
];

// ─── Weekly measures ───────────────────────────────────────────────────────
// Three-finger test: stacked index, middle and ring fingers between the
// front teeth approximates the ~35 mm below which mouth opening counts as
// restricted (trismus).
export const OPENING = [
  { v: 3, label: "Three fingers fit", hint: "Normal opening" },
  { v: 2, label: "Only two fingers", hint: "Somewhat restricted" },
  { v: 1, label: "One finger or less", hint: "Clearly restricted" },
];
export const WEEKLY_INTERVAL_DAYS = 7;

// ─── Questions people find useful to ask ───────────────────────────────────
export const QUESTIONS = [
  { id: "q1", when: "before", who: "dentist", text: "Do any of my teeth need treating or removing before my cancer treatment starts?" },
  { id: "q2", when: "before", who: "dentist", text: "Should I use a high-fluoride toothpaste or fluoride trays, and from when?" },
  { id: "q3", when: "before", who: "team", text: "How is my treatment likely to affect my mouth, and when?" },
  { id: "q4", when: "before", who: "team", text: "Who do I call if my mouth gets sore or I get a temperature, day or night?" },
  { id: "q5", when: "during", who: "team", text: "What can I take for mouth pain, and when should I take it?" },
  { id: "q6", when: "during", who: "team", text: "Would a mouthwash such as benzydamine, or light therapy, help in my case?", for: ["rt_hn"] },
  { id: "q7", when: "during", who: "team", text: "Can I see a dietitian or speech pathologist about eating and swallowing?" },
  { id: "q8", when: "during", who: "team", text: "Should I use ice chips during my chemotherapy infusion?", for: ["chemo", "transplant"] },
  { id: "q9", when: "during", who: "team", text: "Is a steroid mouthwash right for me to prevent ulcers?", for: ["targeted"] },
  { id: "q10", when: "after", who: "dentist", text: "How often should I see you now, and what should I use every day to protect my teeth?" },
  { id: "q11", when: "after", who: "team", text: "Could a medicine such as pilocarpine help my dry mouth?", for: ["rt_hn"] },
  { id: "q12", when: "after", who: "dentist", text: "What do you need to know before taking out a tooth, given my treatment?", for: ["rt_hn", "bone"] },
];
