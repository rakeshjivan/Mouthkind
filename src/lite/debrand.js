// ─── General information, without brands ───────────────────────────────────
// The compliant edition describes products by what they are, never by brand, and never
// says where to buy them, so its information isn't advertising for any therapeutic good.
// Longest names first, so "GC Tooth Mousse™ Plus" is replaced before "GC Tooth Mousse™".
const SWAPS = [
  [/GC Tooth Mousse™ Plus|GC Tooth Mousse Plus|Tooth Mousse™ Plus|Tooth Mousse Plus/g, "a calcium and phosphate crème with fluoride"],
  [/GC Tooth Mousse™ or GC Tooth Mousse™ Plus|GC Tooth Mousse™ or Tooth Mousse™ Plus/g, "a calcium and phosphate crème, with or without fluoride"],
  [/GC Tooth Mousse™|GC Tooth Mousse|Tooth Mousse™|Tooth Mousse/g, "a calcium and phosphate crème"],
  [/GC Dry Mouth Gel/g, "a saliva substitute gel"],
  [/GC Saliva-Check BUFFER|GC Saliva-Check/g, "a saliva pH test"],
  [/GC SIP-SCORE/g, "SIP-SCORE"],
  [/Colgate NeutraFluor 5000( Sensitive)?|NeutraFluor/g, "a high-fluoride toothpaste"],
  [/OraNurse( Unflavoured Toothpaste)?/g, "an unflavoured, SLS-free toothpaste"],
  [/Recaldent Gum|Recaldent™? gum/gi, "sugar-free gum"],
  [/GC Ruscello OP toothbrush/g, "an ultra-soft toothbrush"],
];

export const debrand = (s) => SWAPS.reduce((t, [re, to]) => t.replace(re, to), s)
  // "add a calcium…" reads fine; tidy "use a a" style doubles from swaps after articles.
  .replace(/\b(a|an) (a|an) /g, "$2 ");

/** Debrand every string in a data structure, in place, and drop product lists. */
export function debrandAll(x) {
  if (Array.isArray(x)) { x.forEach((v, i) => { if (typeof v === "string") x[i] = debrand(v); else debrandAll(v); }); return x; }
  if (x && typeof x === "object") {
    delete x.products;
    for (const k of Object.keys(x)) {
      if (typeof x[k] === "string") x[k] = debrand(x[k]);
      else if (typeof x[k] === "object") debrandAll(x[k]);
    }
  }
  return x;
}
