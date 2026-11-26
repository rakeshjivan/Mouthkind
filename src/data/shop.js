// ─── Where "Shop" goes ─────────────────────────────────────────────────────
// The main "Buy online" link, and a link per product. Chemist Warehouse
// (Australia) unless SHOP_SELLER names another seller. A product without a
// link shows no Buy button.
export const SHOP_URL = "https://www.chemistwarehouse.com.au/search?query=tooth%20mousse&contexts=default";

export const SHOP_LINKS = {
  "oranurse": "https://oranurseaustralia.com.au/product/unflavoured-toothpaste/",
  "neutrafluor": "https://www.chemistwarehouse.com.au/buy/69127/colgate-toothpaste-neutrafluor-5000-sensitive-115g-fluoride-potassium-s3",
  "neutrafluor-plus": "https://www.chemistwarehouse.com.au/buy/39917/colgate-toothpaste-neutrafluor-5000-plus-56g-fluoride-s3",
};

// Products that come in flavours: each flavour has its own photo and page.
// The first flavour is shown by default.
const CW = "https://www.chemistwarehouse.com.au/buy/";
export const SHOP_FLAVOURS = {
  "gc-tm": [
    { id: "mint", name: "Mint", url: CW + "98655/gc-tooth-mousse-mint-40g", img: "products/gc-tm-mint.webp" },
    { id: "strawberry", name: "Strawberry", url: CW + "98657/gc-tooth-mousse-strawberry-40g", img: "products/gc-tm-strawberry.webp" },
    { id: "melon", name: "Melon", url: CW + "154959/gc-tooth-mousse-melon-40g", img: "products/gc-tm-melon.webp" },
    { id: "tutti", name: "Tutti-Frutti", url: CW + "154960/gc-tooth-mousse-tutti-frutti-40g", img: "products/gc-tm-tutti.webp" },
    { id: "milkshake", name: "Milkshake", url: CW + "150795/gc-tooth-mousse-milkshake-40g", img: "products/gc-tm-milkshake.webp" },
  ],
  "gc-tmp": [
    { id: "mint", name: "Mint", url: CW + "108768/gc-tooth-mousse-plus-mint-40g", img: "products/gc-tmp-mint.webp" },
    { id: "strawberry", name: "Strawberry", url: CW + "108769/gc-tooth-mousse-plus-strawberry-40g", img: "products/gc-tmp-strawberry.webp" },
    { id: "vanilla", name: "Vanilla", url: CW + "108770/gc-tooth-mousse-plus-vanilla-40g", img: "products/gc-tmp-vanilla.webp" },
  ],
  "gc-dmg": [
    { id: "raspberry", name: "Raspberry", url: CW + "120343/gc-dry-mouth-gel-raspberry-40g", img: "products/gc-dmg.webp" },
    { id: "mint", name: "Mint", url: CW + "144837/gc-dry-mouth-gel-mint-40g", img: "products/gc-dmg.webp" },
  ],
};

// The products shown on the Shop screen, in this order (ids from products.js).
export const SHOP_PRODUCTS = ["gc-dmg", "gc-tmp", "gc-tm", "neutrafluor", "neutrafluor-plus", "oranurse"];
// What each product has from Learn's "What to look for" lists, in the same words, so the
// general information and the Shop line up without Learn naming a brand. Keep these to what
// the product's own label or IFU states.
export const SHOP_MEETS = {
  "gc-dmg": ["Gel", "Close to neutral pH", "Sugar-free", "Range of flavours"],
  "gc-tmp": ["Calcium and phosphate", "Fluoride (900 ppm)", "Buffers plaque acid"],
  "gc-tm": ["Calcium and phosphate", "Buffers plaque acid", "No added fluoride"],
  "neutrafluor": ["High fluoride (5,000 ppm)"],
  "neutrafluor-plus": ["High fluoride (5,000 ppm)"],
  "oranurse": ["Unflavoured", "SLS-free", "Fluoride"],
};
// Who sells each product, for the button label.
export const SHOP_SELLER = { oranurse: "OraNurse" };

// Product photos, in public/products/. Add a file and its name here; until
// then the app shows a plain placeholder tile.
export const SHOP_IMAGES = {
  "neutrafluor": "products/neutrafluor.webp",
  "neutrafluor-plus": "products/neutrafluor-plus.webp",
  "oranurse": "products/oranurse.webp",
};

/** The buy link and photo for a product, in a chosen flavour (default: first). */
export function shopItem(id, flavourId) {
  const fl = SHOP_FLAVOURS[id];
  if (fl) { const f = fl.find((x) => x.id === flavourId) || fl[0]; return { url: f.url, img: f.img, flavour: f }; }
  return { url: SHOP_LINKS[id] || null, img: SHOP_IMAGES[id] || null, flavour: null };
}
