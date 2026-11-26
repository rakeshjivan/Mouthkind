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
    // Shop and Learn wording follows the Instructions for Use (Advertising Code s 8(2)).
    benefits: [
      "Relieves the symptoms of a dry mouth by moisturising the lining of the mouth.",
      "Neutral pH.",
      "Sugar-free.",
      "Use as often as needed, day or night.",
      "A range of flavours.",
    ],
    details: "Gel. Polyglycerol (55–65%), water, carrageenan, carboxymethyl cellulose, flavour, paraben, sodium citrate. 40 g tube.",
    warnings: ["Don't use if you're allergic to parabens or flavourings.", "If you take prescription medicines, check with your doctor before using it.", "Stop and see a doctor if you get any swelling.", "Avoid contact with eyes."],
    ifu: "https://www.gc.dental/australasia/sites/australasia.gc.dental/files/products/downloads/gcdrymouthgel/ifu/GC%20DRY%20MOUTH%20GEL%20-%20IFU.pdf",
  },
  // Protect teeth
  {
    id: "gc-tmp", gc: true, name: "GC Tooth Mousse™ Plus", job: "protect",
    form: "Crème with CPP-ACP, fortified with 900 ppm fluoride", regions: { AU: "yes", NZ: "yes" },
    why: "Adds calcium and phosphate (CPP-ACP) plus fluoride, for additional protection in anyone over 6. With a dry mouth, saliva no longer supplies these, so teeth lose mineral faster.",
    use: "After brushing in the morning and at night, smear a pea-sized amount over the teeth. Don't rinse, eat or drink for 30 minutes.",
    cautions: ["Not if you are allergic to milk protein (casein).", "Not for children under 6."],
    evidence: "In a 24-person trial during head and neck radiotherapy, adding CPP-ACP crème to fluoride cut new decay on tooth crowns by about half. Use it with fluoride toothpaste, not instead of it.",
    refs: ["sim2019", "agarwal2022"],
    flavours: "Mint, strawberry, vanilla",
    benefits: [
      "Calcium and phosphate (CPP-ACP, RECALDENT™) with fluoride (900 ppm) to protect teeth.",
      "Helps buffer plaque acid and protect teeth from acidic foods and drinks.",
      "For sensitive teeth, and as a protective coating for teeth with erosion, a dry mouth (xerostomia) or Sjögren's syndrome.",
      "Suitable during orthodontic treatment.",
      "A range of flavours.",
    ],
    details: "Crème with CPP-ACP (RECALDENT™, from milk) and 0.2% w/w sodium fluoride (900 ppm fluoride). 40 g (35 mL) tube.",
    warnings: ["Don't use if you're allergic or sensitive to milk protein, benzoate preservatives or flavourings.", "Not for children under 6; overnight use not for children under 12.", "Stop and see a doctor if you get any swelling.", "Avoid contact with eyes."],
    ifu: null, // Australian IFU link to come from GC
  },
  {
    id: "gc-tm", gc: true, name: "GC Tooth Mousse™", job: "protect",
    form: "Crème with CPP-ACP", regions: { AU: "yes", NZ: "yes" },
    why: "Calcium and phosphate (CPP-ACP) without added fluoride — for children 6 and under, people who'd rather avoid fluoride, and anyone likely to swallow it.",
    use: "Smear a pea-sized amount over the teeth, during the day or as your dentist directs. Don't rinse, eat or drink for 30 minutes.",
    cautions: ["Not if you are allergic to milk protein (casein)."],
    refs: ["sim2019"],
    flavours: "Tutti-frutti, strawberry, melon, mint, vanilla",
    benefits: [
      "Calcium and phosphate (CPP-ACP, RECALDENT™) for extra protection for teeth.",
      "Helps buffer plaque acid and protect teeth from acidic foods and drinks.",
      "No added fluoride. For all ages, including children, with an adult supervising.",
      "A range of flavours.",
    ],
    details: "Crème with CPP-ACP (RECALDENT™, from milk). 40 g (35 mL) tube.",
    warnings: ["Don't use if you're allergic to milk protein, benzoate preservatives or soy.", "Always use with an adult supervising.", "Stop and see a doctor if you have an allergic reaction."],
    ifu: "https://www.gc.dental/australasia/sites/australasia.gc.dental/files/products/downloads/gctoothmousse/ifu/ifu-tooth-mousse.pdf",
  },
  {
    id: "neutrafluor", name: "Colgate NeutraFluor 5000 Sensitive", job: "protect",
    form: "High-fluoride toothpaste (5,000 ppm) · Pharmacist Only", regions: { AU: "yes" },
    why: "1.1% sodium fluoride (5,000 ppm, about three times a normal toothpaste) for stronger protection against decay when saliva is low or acidic, plus 5% potassium nitrate for sensitive teeth.",
    use: "Use as your dentist or pharmacist directs — usually instead of your normal toothpaste. Spit, don't rinse.",
    cautions: ["Pharmacist Only medicine: the pharmacist will check it suits you.", "Don't swallow. Keep out of reach of children."],
    refs: ["agarwal2022"],
    benefits: [
      "Relieves the pain of sensitive teeth and gives long-term protection.",
      "Helps prevent tooth decay in people at high risk, as part of a routine your dentist or doctor recommends.",
    ],
    details: "Toothpaste. 1.1% w/w sodium fluoride (5,000 ppm fluoride) and 5% w/w potassium nitrate. 115 g. Pharmacist Only Medicine.",
    warnings: ["Don't swallow.", "Keep out of reach of children.", "Allergic reactions to fluoride toothpaste have rarely been reported.", "Stop and see your dentist or doctor if you notice any unwanted effect."],
    pharmacist: true,
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
    why: "No flavour and no SLS foaming agent, with everyday fluoride (1,000 or 1,450 ppm). Gentle for people who find mint and foam too strong.",
    use: "Brush twice a day with a soft toothbrush. Spit, don't rinse.",
    cautions: [],
    refs: [],
    benefits: [
      "No flavour, no foaming agent (SLS-free) and no artificial colours.",
      "For mouths sensitive to strong flavours and textures.",
      "Fluoride for everyday protection from decay.",
    ],
    details: "Fluoride toothpaste, 1,450 ppm (also 1,000 ppm). 50 mL.",
    warnings: ["Check the label for the fluoride strength that suits your age."],
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
    why: "The MASCC/ISOO mucositis guidelines suggest it during head and neck radiotherapy. Ask your team before starting — some versions also contain chlorhexidine, which isn't recommended for this.",
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
