// ─── Support directory ─────────────────────────────────────────────────────
// Every number and website below was checked against the organisation's own
// page (or the Cancer Council / healthpoint listing) in November 2026.
// Re-check before each release — helplines change numbers and hours.
//
// `for` lists the treatments that make a group most relevant; it only changes
// the order, never hides anyone.

export const SUPPORT = [
  // Australia
  {
    id: "cancer-council", region: "AU", name: "Cancer Council",
    what: "Information and support for any cancer, for you and your family.",
    phone: "13 11 20", web: "https://www.cancer.org.au", hours: "Mon–Fri, business hours",
  },
  {
    id: "hanca", region: "AU", name: "Head and Neck Cancer Australia", for: ["rt_hn"],
    what: "Support for mouth, throat, thyroid and other head and neck cancers — including eating, swallowing and speech after treatment.",
    phone: "1300 424 848", web: "https://www.headandneckcancer.org.au", hours: "Mon–Fri, 9am–5pm",
  },
  {
    id: "lymphoma-au", region: "AU", name: "Lymphoma Australia", for: ["chemo", "transplant", "immuno", "targeted"],
    what: "Specialist lymphoma nurses you can call or email.",
    phone: "1800 953 081", web: "https://www.lymphoma.org.au", email: "nurse@lymphoma.org.au",
  },
  {
    id: "leukaemia-foundation", region: "AU", name: "Leukaemia Foundation", for: ["chemo", "transplant", "targeted"],
    what: "Blood Cancer Support Line for leukaemia, lymphoma, myeloma and other blood cancers. Also help with travel and somewhere to stay near treatment.",
    phone: "1800 620 420", web: "https://www.leukaemia.org.au", hours: "Mon–Fri, 9am–4pm AEST",
  },
  {
    id: "bcna", region: "AU", name: "Breast Cancer Network Australia", for: ["chemo", "bone", "targeted"],
    what: "Free, confidential helpline for anyone affected by breast cancer.",
    phone: "1800 500 258", web: "https://www.bcna.org.au",
  },
  {
    id: "rare-cancers", region: "AU", name: "Rare Cancers Australia",
    what: "Help finding your way through treatment for rare and less common cancers.",
    phone: "1800 257 600", web: "https://www.rarecancers.org.au",
  },
  // New Zealand
  {
    id: "cancer-society-nz", region: "NZ", name: "Cancer Society",
    what: "Information and support for any cancer, for you and your whānau.",
    phone: "0800 226 237", web: "https://www.cancer.org.nz",
  },
  {
    id: "blood-cancer-nz", region: "NZ", name: "Blood Cancer NZ", for: ["chemo", "transplant", "targeted"],
    what: "Support and information for leukaemia, lymphoma, myeloma and other blood cancers.",
    phone: "0800 15 10 15", web: "https://www.bloodcancer.org.nz", hours: "Mon–Fri, 8:30am–5pm",
  },
];

export const supportFor = (region = "AU", treatments = []) => {
  const mine = (s) => (s.for || []).some((t) => treatments.includes(t));
  const here = SUPPORT.filter((s) => s.region === region);
  return [...here.filter(mine), ...here.filter((s) => !mine(s))];
};

export const host = (url) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
