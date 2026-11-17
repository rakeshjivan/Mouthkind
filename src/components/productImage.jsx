import { SHOP_IMAGES } from "../data/shop.js";

// A product photo, or a quiet placeholder tile with the product's short name.
export function ProductImage({ product, size = "md" }) {
  const src = SHOP_IMAGES[product.id];
  if (src) return <img className={`pimg ${size}`} src={`${import.meta.env.BASE_URL}${src}`} alt={product.name} loading="lazy" />;
  const short = product.name.replace(/^(GC|Colgate)\s+/, "").replace(/\s+(Toothpaste|Sensitive)$/, "");
  return (
    <span className={`pimg ph-tile ${size} ${product.gc ? "gc" : "other"}`} aria-hidden="true">
      <span>{short}</span>
    </span>
  );
}
