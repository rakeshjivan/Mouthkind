// ─── Where "Shop" goes ─────────────────────────────────────────────────────
// The main "Buy online" link, and a link per product. Chemist Warehouse
// (Australia). A product without a link shows no Buy button.
export const SHOP_URL = "https://www.chemistwarehouse.com.au/search?query=tooth%20mousse&contexts=default";

export const SHOP_LINKS = {
  "gc-tmp": "https://www.chemistwarehouse.com.au/search?query=tooth%20mousse&contexts=default",
  "gc-tm": "https://www.chemistwarehouse.com.au/search?query=tooth%20mousse&contexts=default",
  "gc-dmg": "https://www.chemistwarehouse.com.au/search?query=gc%20dry%20mouth%20gel&contexts=default",
};

// The products shown on the Shop screen, in this order (ids from products.js).
export const SHOP_PRODUCTS = ["gc-dmg", "gc-tmp", "gc-tm"];
