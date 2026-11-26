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
    // Shop and Learn wording follows GC's IFU and indications for use (Advertising Code s 8(2)).
    benefits: [
      "Relieves the symptoms of a dry mouth by moisturising the lining of the mouth.",
      "Lubricates and moistens the mouth for up to 4 hours.",
      "Neutral pH.",
      "Sugar-free.",
      "Use as often as needed, day or night.",
      "A range of flavours, including citrus flavours that help stimulate saliva flow.",
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
    // Wording from the IFU, GC Tooth Mousse Plus 30002423, Rev. 07/2026.
    use: "Use twice a day, morning and night, after brushing, or as your dentist recommends. Squeeze a pea-sized amount onto a clean finger and apply it to all your teeth, using your tongue to spread it. For between the teeth, use an interdental brush or floss coated with it. Leave it on for at least 3 minutes without spitting or swallowing, and hold it in your mouth for another 1 to 2 minutes if you can: saliva makes it work better. Spit out the excess, don't rinse, and don't eat or drink for 30 minutes. At night, apply it after brushing and don't eat or drink before bed.",
    cautions: ["Not if you are allergic to milk protein (casein).", "Not for children under 6."],
    evidence: "In a 24-person trial during head and neck radiotherapy, adding CPP-ACP crème to fluoride cut new decay on tooth crowns by about half. Use it with fluoride toothpaste, not instead of it.",
    refs: ["sim2019", "agarwal2022"],
    flavours: "Mint, strawberry, vanilla",
    benefits: [
      "Calcium and phosphate, the minerals that make up enamel, in a soluble form (RECALDENT™, CPP-ACP), with fluoride (900 ppm), for additional protection for teeth.",
      "Neutralises acids from plaque bacteria and reflux, and protects teeth from acidic foods and drinks.",
      "Helps prevent mineral loss and promotes remineralisation, including white spot lesions.",
      "Reduces tooth sensitivity.",
      "Supports the growth of beneficial oral bacteria, helping keep a healthy balance for teeth and gums.",
      "For a dry mouth (xerostomia, Sjögren's syndrome), exposed roots, chalky teeth (molar hypomineralisation), people prone to decay or gum disease, during and after orthodontic treatment, and before and after tooth whitening.",
    ],
    details: "Crème with RECALDENT™ (CPP-ACP, 5–15%, from milk) and sodium fluoride (900 ppm fluoride). Also contains water, glycerine, sorbitol, carboxymethyl cellulose, propylene glycol, silicon dioxide, titanium dioxide, xylitol, flavour, paraben, phosphoric acid and sodium saccharin. Contains milk protein; lactose under 0.05% w/w. 40 g (35 mL) tube. Store at 4–25°C.",
    warnings: ["Don't use if you have, or may have, a milk protein (casein) allergy, or a sensitivity or allergy to parabens, soy products or flavourings.", "Not for children under 6. Overnight use isn't recommended for children under 12: use GC Tooth Mousse™ instead.", "Always use under adult supervision. Don't swallow.", "If you get any swelling or allergy symptoms, stop and see a doctor.", "If it gets in your eyes, rinse with water straight away and seek medical attention.", "Stop using it if the smell, taste or look changes after opening."],
    ifu: "https://www.gc.dental/australasia/sites/australasia.gc.dental/files/products/downloads/gctoothmousseplus/ifu/ifu-tooth-mousse-plus.pdf",
  },
  {
    id: "gc-tm", gc: true, name: "GC Tooth Mousse™", job: "protect",
    form: "Crème with CPP-ACP", regions: { AU: "yes", NZ: "yes" },
    why: "Calcium and phosphate (CPP-ACP) without added fluoride — for children 6 and under, people who'd rather avoid fluoride, and anyone likely to swallow it.",
    // Wording from the IFU, GC Tooth Mousse 30002422, Rev. 08/2026.
    use: "Use day and night after brushing, as your dentist recommends. Squeeze a pea-sized amount onto a clean finger and apply it to all your teeth, using your tongue to spread it. For between the teeth, use an interdental brush or floss coated with it. Leave it on for at least 3 minutes, then spread the rest around your mouth with your tongue and hold it for another 1 to 2 minutes if you can: saliva makes it work better. Spit out the excess, don't rinse, and don't eat or drink for 30 minutes. At night, apply it after brushing and don't eat or drink before bed.",
    cautions: ["Not if you are allergic to milk protein (casein)."],
    refs: ["sim2019"],
    flavours: "Tutti-frutti, strawberry, melon, mint, vanilla",
    benefits: [
      "Calcium and phosphate, the minerals that make up enamel, in a soluble form (RECALDENT™, CPP-ACP), for additional protection for teeth. Fluoride-free.",
      "Neutralises acids from plaque bacteria and reflux, and protects teeth from acidic foods and drinks.",
      "Helps prevent mineral loss and promotes remineralisation, including white spot lesions.",
      "Reduces tooth sensitivity.",
      "Supports the growth of beneficial oral bacteria, helping keep a healthy balance for teeth and gums.",
      "For all ages, with an adult supervising, including a dry mouth (xerostomia, Sjögren's syndrome), exposed roots, chalky teeth (molar hypomineralisation), during and after orthodontic treatment, and before and after tooth whitening.",
    ],
    details: "Fluoride-free crème with RECALDENT™ (CPP-ACP, 5–15%, from milk). Also contains water, glycerin, sorbitol, carboxymethyl cellulose, propylene glycol, silicon dioxide, titanium dioxide, xylitol, flavour, guar gum, magnesium oxide, paraben, phosphoric acid, sodium saccharin and zinc oxide. Contains milk protein; lactose under 0.05% w/w. 40 g (35 mL) tube. Store at 4–25°C.",
    warnings: ["Don't use if you have, or may have, a milk protein (casein) allergy, or a sensitivity or allergy to paraben preservatives or soy products.", "Always use under adult supervision.", "If you get any swelling or allergy symptoms, stop and see a doctor.", "If it gets in your eyes, rinse with water straight away and seek medical attention.", "Stop using it if the smell, taste or look changes after opening."],
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
    id: "neutrafluor-plus", name: "Colgate NeutraFluor 5000 Plus", job: "protect",
    form: "High-fluoride toothpaste (5,000 ppm), Freshmint · Pharmacist Only", regions: { AU: "yes" },
    why: "Sodium fluoride 11.05 mg/g (5,000 ppm fluoride), a dental caries preventive for people at high risk of tooth decay.",
    // From the pack (AUST R 71490). Where Chemist Warehouse's page differs (it says 6 years and over), the pack is followed.
    use: "Adults and children 10 years and older: use every day in place of your regular toothpaste, or as your dentist or doctor directs. Put a thin ribbon on a soft toothbrush and brush thoroughly for two minutes. Spit out the excess, and don't eat, drink or rinse for 30 minutes. Children 10 to 16 should use it with an adult supervising.",
    cautions: ["Pharmacist Only medicine: the pharmacist will check it suits you.", "Don't swallow. Keep out of reach of children."],
    refs: ["agarwal2022"],
    benefits: [
      "A dental caries preventive for people at high risk of tooth decay, as recommended by a dentist or doctor.",
      "5,000 ppm fluoride: a professional-strength toothpaste used in place of your regular one.",
      "Freshmint flavour.",
    ],
    details: "Toothpaste, Freshmint. Sodium fluoride 11.05 mg/g (5,000 ppm fluoride). Contains benzoates and saccharin. 56 g. Pharmacist Only Medicine. AUST R 71490. Colgate-Palmolive.",
    warnings: ["Children under 10 years should not use it.", "Do not swallow.", "Keep out of reach of infants and children.", "Read the enclosed leaflet before use.", "Allergic reactions to fluoride toothpastes have rarely been reported. Stop and see your dentist or doctor if you notice any unwanted effect.", "Store below 25°C."],
    pharmacist: true,
  },
  {
    id: "sensodyne-brush", name: "Sensodyne Daily Care Soft Toothbrush", job: "clean",
    form: "Soft toothbrush · 3 pack", regions: { AU: "yes" },
    why: "A soft toothbrush with round-ended bristles and a small, dome-shaped head, designed to clean gently.",
    use: "Brush gently for 2 minutes, morning and night. Replace your toothbrush every 3 months.",
    refs: [],
    benefits: [
      "Soft, round-ended bristles, designed to clean gently and be gentle on gums.",
      "A small, dome-shaped head for better access to the back teeth.",
      "A non-slip handle for a secure hold and good control.",
      "Designed by dental professionals, for people with sensitive teeth.",
    ],
    details: "Manual toothbrush, soft. 3 pack. Haleon.",
    cautions: ["Replace toothbrushes every 3 months."],
  },
  {
    id: "colgate-slimsoft", name: "Colgate SlimSoft Charcoal Toothbrush", job: "clean",
    form: "Ultra-soft toothbrush · 1 pack", regions: { AU: "yes" },
    why: "An ultra-soft toothbrush with slim-tip bristles that reach along the gumline and into narrow gaps.",
    use: "Brush gently for 2 minutes, morning and night. Clean the brush after each use, and replace it every 3 months.",
    refs: [],
    benefits: [
      "Ultra-soft, slim-tip bristles (tips under 0.01 mm) that reach along the gumline and into narrow gaps between teeth.",
      "Charcoal-infused bristles that help stop bacteria building up on the bristles. They don't kill bacteria in your mouth or protect against disease.",
      "Handle made from 50% recycled plastic.",
    ],
    details: "Manual toothbrush, ultra soft, charcoal-infused bristles. 1 pack; colours vary. For adults. Colgate-Palmolive.",
    cautions: ["The bristles don't kill bacteria in your mouth or protect you against disease.", "Clean the brush after each use.", "Replace toothbrushes every 3 months."],
  },
  {
    id: "colgate-gentle", name: "Colgate Gentle Gum Care Toothbrush", job: "clean",
    form: "Soft toothbrush · 2 pack", regions: { AU: "yes" },
    why: "A soft toothbrush with feather-soft, high-density bristles for gentle cleaning along the gumline.",
    use: "Brush gently for 2 minutes, morning and night. Replace your toothbrush every 3 months.",
    refs: [],
    benefits: [
      "Feather-soft, high-density bristles: more than 5,000 bristles to reduce pressure on the gums while brushing.",
      "Slim bristle tips, designed for gentle, effective cleaning along the gumline.",
    ],
    details: "Manual toothbrush, soft. 2 pack; colours vary. Colgate-Palmolive.",
    cautions: ["Replace toothbrushes every 3 months."],
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
