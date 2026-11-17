import { Icon } from "../components/ui.jsx";
import { PRODUCTS } from "../data/products.js";
import { SHOP_LINKS, SHOP_PRODUCTS, SHOP_SELLER, SHOP_URL } from "../data/shop.js";
import { externalClick } from "../lib/external.js";
import { ProductImage } from "../components/productImage.jsx";

/** Products to buy. Opens the online shop when a link is set. */
export function Shop() {
  const items = SHOP_PRODUCTS.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean);
  return (
    <div className="screen">
      <header className="hero"><h1 className="display">Shop</h1>
        <p className="lede">Products that help a dry or acidic mouth and protect your teeth.</p></header>
      {SHOP_URL ? (
        <p className="soft-note shop-soon">Available in Australia. Each button opens the seller's website.</p>
      ) : (
        <p className="soft-note shop-soon">Online ordering is coming soon. In the meantime, ask your pharmacy or dentist for these products.</p>
      )}
      {items.map((p) => (
        <section key={p.id} className="shop-item">
          <div className="shop-top">
            <ProductImage product={p} />
            <div><h2>{p.name}</h2><p className="shop-form">{p.form}</p></div>
          </div>
          <p>{p.why}</p>
          <p className="prod-use"><b>How to use:</b> {p.use}</p>
          {p.cautions?.length > 0 && <p className="shop-caution">{p.cautions.join(" ")}</p>}
          {SHOP_LINKS[p.id] && <a className="btn primary" href={SHOP_LINKS[p.id]} target="_blank" rel="noopener noreferrer" onClick={externalClick(SHOP_LINKS[p.id])}><Icon name="cart" size={18} /> Buy {SHOP_SELLER[p.id] ? `from ${SHOP_SELLER[p.id]}` : "at Chemist Warehouse"}</a>}
        </section>
      ))}
    </div>
  );
}
