import { shopItem } from "../data/shop.js";

// A product photo (in the chosen flavour), or a quiet placeholder tile with the product's short name.
export function ProductImage({ product, size = "md", flavour }) {
  const { img, flavour: f } = shopItem(product.id, flavour);
  if (img) return <img className={`pimg ${size}`} src={`${import.meta.env.BASE_URL}${img}`} alt={f ? `${product.name}, ${f.name}` : product.name} loading="lazy" />;
  const short = product.name.replace(/^(GC|Colgate)\s+/, "").replace(/\s+(Toothpaste|Sensitive)$/, "");
  return (
    <span className={`pimg ph-tile ${size} ${product.gc ? "gc" : "other"}`} aria-hidden="true">
      <span>{short}</span>
    </span>
  );
}
