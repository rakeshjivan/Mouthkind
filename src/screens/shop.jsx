import { useState } from "react";
import { Icon } from "../components/ui.jsx";
import { PRODUCTS } from "../data/products.js";
import { SHOP_FLAVOURS, SHOP_PRODUCTS, SHOP_SELLER, SHOP_URL, shopItem } from "../data/shop.js";
import { externalClick } from "../lib/external.js";
import { ProductImage } from "../components/productImage.jsx";

export function ShopItem({ p }) {
  const flavours = SHOP_FLAVOURS[p.id];
  const [fl, setFl] = useState(flavours?.[0].id);
  const { url, flavour } = shopItem(p.id, fl);
  return (
    <section className="shop-item">
      <div className="shop-top">
        <ProductImage product={p} flavour={fl} />
        <div><h2>{p.name}</h2><p className="shop-form">{p.form}</p></div>
      </div>
      {p.benefits ? <ul className="pcard-list">{p.benefits.map((b) => <li key={b}>{b}</li>)}</ul> : <p>{p.why}</p>}
      <p className="prod-use"><b>How to use:</b> {p.use}</p>
      {p.cautions?.length > 0 && <p className="shop-caution">{p.cautions.join(" ")}</p>}
      {flavours && (
        <div className="flavours" role="radiogroup" aria-label={`${p.name} flavour`}>
          {flavours.map((f) => (
            <button key={f.id} role="radio" aria-checked={fl === f.id} className={`flav${fl === f.id ? " on" : ""}`} onClick={() => setFl(f.id)}>{f.name}</button>
          ))}
        </div>
      )}
      {url && (<>
        <a className="btn primary" href={url} target="_blank" rel="noopener noreferrer" onClick={externalClick(url)}>
          <Icon name="cart" size={18} /> {flavour ? `Buy ${flavour.name}` : "Buy now"}</a>
        <p className="shop-seller">Opens {SHOP_SELLER[p.id] || "Chemist Warehouse"}</p>
      </>)}
    </section>
  );
}

/** Products to buy. Each button opens the seller's page for that product.
 *  Products in the person's plan come first, under "Recommended for you". */
export function Shop({ forYou = [] }) {
  const items = SHOP_PRODUCTS.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean);
  const mine = items.filter((p) => forYou.includes(p.id));
  const rest = items.filter((p) => !forYou.includes(p.id));
  return (
    <div className="screen">
      <header className="hero"><h1 className="display">Shop</h1>
        <p className="lede">Products that help a dry or acidic mouth and protect your teeth.</p>
        <p className="soft-note">GC products are made by GC Australasia, where the app's author works. Other brands are shown where they're the right choice.</p></header>
      {SHOP_URL ? (
        <p className="soft-note shop-soon">Available in Australia. Each button opens the seller's website.</p>
      ) : (
        <p className="soft-note shop-soon">Online ordering is coming soon. In the meantime, ask your pharmacy or dentist for these products.</p>
      )}
      {mine.length > 0 && <h2 className="list-h first">Recommended for you</h2>}
      {mine.map((p) => <ShopItem key={p.id} p={p} />)}
      {mine.length > 0 && rest.length > 0 && <h2 className="list-h">Other products</h2>}
      {rest.map((p) => <ShopItem key={p.id} p={p} />)}
    </div>
  );
}
