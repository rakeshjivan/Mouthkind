// ─── Product guide ─────────────────────────────────────────────────────────
// Listed by the job a product does, never as a treatment for cancer.
// GC products are named; everyday essentials GC doesn't make are described
// generically so patients know what to ask their pharmacist or dentist for.
//
// regions: "yes" = on retail shelves, "dental" = through a dental practice.

export const PRODUCTS = [
  // Ease dryness
  {
    id: "gc-dmg", gc: true, name: "GC Dry Mouth Gel", job: "moisten",
    form: "Saliva gel", regions: { AU: "yes", NZ: "yes" },
    why: "Sugar-free, near-neutral gel that coats and lubricates the mouth for longer than a spray. Good before meals and at bedtime.",
    use: "Spread a pea-sized amount over tongue, cheeks and gums with a clean finger. Use as often as you need.",
    cautions: ["Avoid if allergic to hydroxybenzoates."],
    evidence: "In people after head and neck radiotherapy, two months of use improved dryness, swallowing and nutrition scores, and reduced types of Candida.",
    refs: ["nuchit2020"],
    flavours: "Mint, raspberry, lemon, orange, fruit salad",
    // Benefits as stated in GC product information.
    benefits: [
      "Close to neutral pH, so it doesn't add acid to the mouth.",
      "Lubricates and moistens the mouth for up to 4 hours.",
      "Sugar-free.",
      "A range of flavours, including citrus flavours that help get saliva flowing.",
      "Can be used together with GC Tooth Mousse or Tooth Mousse Plus.",
    ],
  },
  // Protect teeth
  {
    id: "gc-tmp", gc: true, name: "GC Tooth Mousse Plus", job: "protect",
    form: "Crème with CPP-ACP and fluoride", regions: { AU: "yes", NZ: "yes" },
    why: "Adds calcium and phosphate (CPP-ACP) plus fluoride. With a dry mouth, saliva no longer supplies these, so teeth lose mineral faster.",
    use: "After brushing in the morning and at night, smear a pea-sized amount over the teeth. Don't rinse, eat or drink for 30 minutes.",
    cautions: ["Not if you are allergic to milk protein (casein).", "Not for children 6 or under."],
    evidence: "In a 24-person trial during head and neck radiotherapy, adding CPP-ACP crème to fluoride cut new decay on tooth crowns by about half. Use it with fluoride toothpaste, not instead of it.",
    refs: ["sim2019", "agarwal2022"],
    flavours: "Mint, strawberry, vanilla",
    benefits: [
      "Rapidly helps neutralise acids in the mouth.",
      "Delivers a high level of calcium and phosphate (CPP-ACP) to the teeth, plus fluoride.",
      "Lubricates a dry mouth.",
      "Comes in a range of flavours.",
      "Can be mixed with GC Dry Mouth Gel.",
    ],
  },
  {
    id: "gc-tm", gc: true, name: "GC Tooth Mousse", job: "protect",
    form: "Crème with CPP-ACP", regions: { AU: "yes", NZ: "yes" },
    why: "Calcium and phosphate (CPP-ACP) without added fluoride — for when your dentist wants that.",
    use: "Smear a pea-sized amount over the teeth, during the day or as your dentist directs. Don't rinse, eat or drink for 30 minutes.",
    cautions: ["Not if you are allergic to milk protein (casein)."],
    refs: ["sim2019"],
    flavours: "Tutti-frutti, strawberry, melon, mint, vanilla",
    benefits: [
      "Rapidly helps neutralise acids in the mouth.",
      "Delivers a high level of calcium and phosphate (CPP-ACP) to the teeth.",
      "Lubricates a dry mouth.",
      "No added fluoride, so it can go on during the day alongside a high-fluoride toothpaste.",
      "Comes in a range of flavours, and can be mixed with GC Dry Mouth Gel.",
    ],
  },
  {
    id: "neutrafluor", name: "Colgate NeutraFluor 5000 Sensitive", job: "protect",
    form: "High-fluoride toothpaste (5,000 ppm) · Pharmacist Only", regions: { AU: "yes" },
    why: "1.1% sodium fluoride (5,000 ppm, about three times a normal toothpaste) for stronger protection against decay when saliva is low or acidic, plus 5% potassium nitrate for sensitive teeth.",
    use: "Use as your dentist or pharmacist directs — usually instead of your normal toothpaste. Spit, don't rinse.",
    cautions: ["Pharmacist Only medicine: the pharmacist will check it suits you.", "Don't swallow. Keep out of reach of children."],
    refs: ["agarwal2022"],
  },
  {
    id: "hf-paste", name: "High-fluoride toothpaste (5,000 ppm)", job: "protect",
    form: "Ask your pharmacist or dentist", regions: { AU: "yes", NZ: "yes" },
    why: "The strongest everyday protection against decay when saliva is low. In Australia it's a Pharmacist Only medicine.",
    use: "Brush twice a day. Spit, don't rinse.",
    cautions: ["Adults and teenagers, unless a dentist advises otherwise."],
    refs: ["agarwal2022", "hong2024"],
  },
  {
    id: "f-rinse", name: "Alcohol-free fluoride mouth rinse", job: "protect",
    form: "Daily fluoride rinse", regions: { AU: "yes", NZ: "yes" },
    why: "Extra fluoride at bedtime, without alcohol to sting or dry the mouth.",
    use: "Once a day at bedtime after brushing. Spit, then nothing to eat or drink for 30 minutes.",
    cautions: ["Not for children under 6."],
    refs: ["agarwal2022"],
  },
  // Get saliva flowing
  {
    id: "recaldent", gc: true, name: "Recaldent Gum", job: "stimulate",
    form: "Sugar-free gum with CPP-ACP", regions: { AU: "dental", NZ: "dental" },
    why: "Chewing gets saliva flowing if your glands still work a little. The gum also carries CPP-ACP.",
    use: "Chew a piece after meals.",
    cautions: ["Not if allergic to milk protein or soy.", "Contains phenylalanine.", "Not if your jaw is sore or opening is limited."],
    refs: ["mercadante2021"],
  },
  // Keep it clean
  {
    id: "gc-ruscello", gc: true, name: "GC Ruscello OP toothbrush", job: "clean",
    form: "Small-head brush", regions: { AU: "dental", NZ: "dental" },
    why: "Very small head for when you can't open wide.",
    use: "Brush twice a day.",
    cautions: [],
    refs: ["wranicz2010"],
  },
  {
    id: "brush-ultrasoft", name: "Ultra-soft toothbrush", job: "clean",
    form: "Any ultra-soft or special-care brush", regions: { AU: "yes", NZ: "yes" },
    why: "Cleans plaque without scraping fragile gums. Brushing matters more during treatment, not less.",
    use: "Brush gently twice a day. Replace every 3 months, or after a mouth infection.",
    cautions: [],
    refs: ["hong2019", "ccaMouth"],
  },
  {
    id: "oranurse", name: "OraNurse Unflavoured Toothpaste", job: "clean",
    form: "Unflavoured, SLS-free fluoride toothpaste", regions: { AU: "yes" },
    why: "No flavour and no SLS foaming agent, with everyday fluoride (1,000 or 1,450 ppm). Gentle on a sore or sensitive mouth — made for people who find mint too strong, including after head and neck radiotherapy and with Sjögren's.",
    use: "Brush twice a day with a soft toothbrush. Spit, don't rinse.",
    cautions: [],
    refs: [],
  },
  {
    id: "paste-mild", name: "Mild, SLS-free fluoride toothpaste", job: "clean",
    form: "Unflavoured or mild flavour", regions: { AU: "yes", NZ: "yes" },
    why: "Strong mint and foaming agents (SLS) can sting a sore or dry mouth. A mild paste means you keep brushing.",
    use: "Brush twice a day. Spit, don't rinse.",
    cautions: [],
    refs: ["hong2024"],
  },
  // Soothe
  {
    id: "rinse-home", name: "Salt and bicarbonate rinse", job: "soothe",
    form: "Make it at home", regions: { AU: "yes", NZ: "yes" },
    why: "Cheap, bland, and keeps a sore mouth clean and comfortable.",
    use: "1 teaspoon salt and 1 teaspoon bicarbonate of soda in 1 litre of water. Keep in the fridge and throw out after 24 hours. Rinse after meals and before bed, then spit.",
    cautions: [],
    refs: ["csnzMouth", "elad2020"],
  },
  {
    id: "lip-balm", name: "Lanolin or beeswax lip balm", job: "soothe",
    form: "Lip balm", regions: { AU: "yes", NZ: "yes" },
    why: "Protects dry, cracked lips. Petroleum-jelly balms are best avoided.",
    use: "Apply often, and at bedtime.",
    cautions: [],
    refs: ["hong2024", "ccaMouth"],
  },
  // Ask your team (medicines — never a self-care recommendation)
  {
    id: "benzydamine", name: "Benzydamine mouthwash", job: "ask",
    form: "Pharmacy medicine", regions: { AU: "yes", NZ: "yes" },
    why: "Recommended to help prevent mucositis during head and neck radiotherapy. Ask your team before starting — some versions also contain chlorhexidine, which isn't recommended for this.",
    use: "Only as your team directs.",
    cautions: [],
    refs: ["elad2020"],
    onlyFor: ["rt_hn"],
  },
  {
    id: "dex-mouthwash", name: "Steroid mouthwash", job: "ask",
    form: "Prescription", regions: { AU: "yes", NZ: "yes" },
    why: "A dexamethasone mouthwash greatly reduced mouth ulcers on everolimus in a trial. Ask your oncologist if it suits you.",
    use: "Only as prescribed.",
    cautions: [],
    refs: ["rugo2017"],
    onlyFor: ["targeted"],
  },
];

export const JOBS = [
  { id: "moisten", label: "Ease dryness", blurb: "A gel coats the mouth for longer than water or sprays." },
  { id: "protect", label: "Protect your teeth", blurb: "Low saliva means teeth decay fast. Fluoride is the foundation; calcium and phosphate add to it." },
  { id: "stimulate", label: "Get saliva flowing", blurb: "Only works if your glands still produce some saliva." },
  { id: "clean", label: "Keep it clean", blurb: "Gentle brushing stops infection and decay." },
  { id: "soothe", label: "Soothe and comfort", blurb: "Bland rinses and lip care." },
  { id: "ask", label: "Ask your team about", blurb: "Medicines your doctor or pharmacist decides on." },
];

export const visibleProducts = (region = "AU", treatments = []) =>
  PRODUCTS
    .filter((p) => !p.onlyFor || p.onlyFor.some((t) => treatments.includes(t)))
    .filter((p) => { const r = p.regions?.[region]; return r && r !== "no"; })
    .sort((a, b) => (b.gc ? 1 : 0) - (a.gc ? 1 : 0)); // stable: GC first within each job
