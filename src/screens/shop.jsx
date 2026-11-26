import { useState } from "react";
import { Icon } from "../components/ui.jsx";
import { PRODUCTS } from "../data/products.js";
import { SHOP_FLAVOURS, SHOP_MEETS, SHOP_PRODUCTS, SHOP_SELLER, SHOP_URL, shopItem } from "../data/shop.js";
import { externalClick } from "../lib/external.js";
import { ProductImage } from "../components/productImage.jsx";

// Each product keeps one pastel, the same as its subject elsewhere in the app.
const SHOP_TONE = { "gc-dmg": "green", "gc-tmp": "peach", "gc-tm": "amber", neutrafluor: "blue", "neutrafluor-plus": "rose", oranurse: "lilac" };

/** One product, laid out to read top to bottom: what it is, choose and buy, what it does,
 *  the warnings (always open), then how to use and the full details folded away. */
export function ShopItem({ p }) {
  const flavours = SHOP_FLAVOURS[p.id];
  const [fl, setFl] = useState(flavours?.[0].id);
  const { url, flavour } = shopItem(p.id, fl);
  const warn = p.warnings?.length > 0 ? p.warnings.join(" ") : p.cautions?.length > 0 ? p.cautions.join(" ") : null;
  return (
    <section className={`shop-item tone-${SHOP_TONE[p.id] || "blue"}`} aria-label={p.name}>
      <div className="shop-top">
        <div className="shop-img"><ProductImage product={p} flavour={fl} /></div>
        <div><h2>{p.name}</h2><p className="shop-form">{p.form}</p></div>
      </div>
      {SHOP_MEETS[p.id] && <ul className="meets" aria-label="What to look for">{SHOP_MEETS[p.id].map((m) => <li key={m}><Icon name="check" size={14} stroke={3} />{m}</li>)}</ul>}

      <div className="shop-buy">
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
      </div>

      <details className="shop-sec">
        <summary>What it does<Icon name="chev" size={16} /></summary>
        {p.benefits ? <ul className="shop-list">{p.benefits.map((x) => <li key={x}><Icon name="check" size={16} stroke={3} /><span>{x}</span></li>)}</ul> : <p>{p.why}</p>}
      </details>
      {warn && <div className="shop-warn"><Icon name="alert" size={18} /><p><b>Warnings</b>{warn}</p></div>}
      <details className="shop-sec">
        <summary>How to use<Icon name="chev" size={16} /></summary>
        <p>{p.use}</p>
      </details>
      {(p.details || p.ifu) && (
        <details className="shop-sec">
          <summary>Product details<Icon name="chev" size={16} /></summary>
          {p.details && <p>{p.details}</p>}
          {p.ifu && <p className="shop-ifu"><a href={p.ifu} target="_blank" rel="noopener noreferrer" onClick={externalClick(p.ifu)}>Instructions for use (PDF)</a></p>}
        </details>
      )}
      {/* Mandatory statements, Therapeutic Goods Advertising Code: always shown, never folded. */}
      {p.pharmacist && <p className="shop-statement">ASK YOUR PHARMACIST – THEY MUST DECIDE IF THIS PRODUCT IS RIGHT FOR YOU.</p>}
      <p className="shop-statement">ALWAYS READ THE LABEL AND FOLLOW THE DIRECTIONS FOR USE.</p>
    </section>
  );
}

/** Products to buy. Each button opens the seller's page for that product.
 *  Products in the person's plan come first, under "Recommended for you". */
// `mineLabel`: the heading over the products in the person's plan.
export function Shop({ forYou = [], mineLabel = "Recommended for you" }) {
  const items = SHOP_PRODUCTS.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean);
  const mine = items.filter((p) => forYou.includes(p.id));
  const rest = items.filter((p) => !forYou.includes(p.id));
  return (
    <div className="screen">
      <header className="hero"><h1 className="display">Shop</h1>
        <p className="lede">Products that help a dry or acidic mouth and protect your teeth.</p>
        <p className="soft-note">GC products are made by GC Australasia, where the app's author works. Other brands are listed too.</p></header>
      {SHOP_URL ? (
        <p className="soft-note shop-soon">Available in Australia. Each button opens the seller's website.</p>
      ) : (
        <p className="soft-note shop-soon">Online ordering is coming soon. In the meantime, ask your pharmacy or dentist for these products.</p>
      )}
      {mine.length > 0 && <h2 className="list-h first">{mineLabel}</h2>}
      {mine.map((p) => <ShopItem key={p.id} p={p} />)}
      {mine.length > 0 && rest.length > 0 && <h2 className="list-h">Other products</h2>}
      {rest.map((p) => <ShopItem key={p.id} p={p} />)}
    </div>
  );
}
