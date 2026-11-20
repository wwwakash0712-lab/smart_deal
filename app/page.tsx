"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const categories = [
  "All",
  "Home Groceries",
  "Cooking Oil",
  "Rice",
  "Vegetables",
  "Home Needs",
];

const products = [
  { id: 1, name: "Ponni Rice", category: "Rice", unit: "5 kg", price: 320, shop: "Demo Supermarket", tag: "Popular" },
  { id: 2, name: "Sunflower Oil", category: "Cooking Oil", unit: "1 litre", price: 145, shop: "Demo Supermarket", tag: "Value deal" },
  { id: 3, name: "Toor Dal", category: "Home Groceries", unit: "1 kg", price: 60, shop: "Sri Stores", tag: "Daily essential" },
  { id: 4, name: "Tomato", category: "Vegetables", unit: "1 kg", price: 35, shop: "Fresh Market", tag: "Fresh pick" },
  { id: 5, name: "Bath Soap", category: "Home Needs", unit: "1 pack", price: 60, shop: "Sri Stores", tag: "Household" },
  { id: 6, name: "Idli Rice", category: "Rice", unit: "1 kg", price: 58, shop: "Fresh Market", tag: "Everyday value" },
];

type ApprovedShop = {
  id: string;
  shop_name: string;
  area: string;
  products: string | null;
  created_at: string;
};

export default function Home() {
  const [approvedShops, setApprovedShops] = useState<ApprovedShop[]>([]);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [shopsError, setShopsError] = useState("");

  useEffect(() => {
    async function loadApprovedShops() {
      const { data, error } = await supabase
        .from("shops")
        .select("id, shop_name, area, products, created_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) {
        setShopsError("Approved shops are temporarily unavailable.");
      } else {
        setApprovedShops((data ?? []) as ApprovedShop[]);
      }
      setShopsLoading(false);
    }

    loadApprovedShops();
  }, []);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = activeCategory === "All" || product.category === activeCategory;
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.shop.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory]);

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark">S</span> Smart Deal</a>
        <nav><a href="#deals">Explore deals</a><a href="#shops">For shop owners</a></nav>
        <a className="outline-button" href="#shops">List your shop</a>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">YOUR LOCAL PRICE FINDER</span>
          <h1>Shop smart.<br /><span>Save more.</span></h1>
          <p>Compare everyday prices from local shops in Trichy — all in one place.</p>
          <a className="primary-button" href="#deals">Explore products <span>→</span></a>
          <div className="hero-note"><span className="live-dot" /> Starting in Tiruchirappalli</div>
        </div>
        <div className="hero-art" aria-label="Shopping bags illustration">
          <div className="sun-shape" />
          <div className="bag bag-back"><span>fresh</span></div>
          <div className="bag bag-front"><span>smart<br />choice</span></div>
          <div className="hero-sticker">GOOD<br />DEALS<br />NEAR YOU</div>
          <div className="floating-leaf">✳</div>
        </div>
      </section>

      <section className="approved-shops-section" id="approved-shops">
        <div className="section-heading">
          <div><span className="eyebrow">VERIFIED LOCAL STORES</span><h2>Approved shops in Trichy</h2></div>
          <span className="location-pill">Shop listings</span>
        </div>
        {shopsLoading ? (
          <p className="shops-status">Loading approved shops...</p>
        ) : shopsError ? (
          <p className="shops-status">{shopsError}</p>
        ) : approvedShops.length === 0 ? (
          <p className="shops-status">No approved shops yet. Local shop listings will appear here after approval.</p>
        ) : (
          <div className="approved-shop-grid">
            {approvedShops.map((shop) => (
              <article className="approved-shop-card" key={shop.id}>
                <div className="approved-shop-icon">🏪</div>
                <div className="approved-shop-copy">
                  <span className="approved-label">APPROVED SHOP</span>
                  <h3>{shop.shop_name}</h3>
                  <p className="approved-shop-area">{shop.area}, Tiruchirappalli</p>
                  <p className="approved-shop-products"><strong>Products:</strong> {shop.products || "Details not provided"}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="content-section" id="deals">
        <div className="section-heading">
          <div><span className="eyebrow">FIND WHAT YOU NEED</span><h2>Explore local deals</h2></div>
          <span className="location-pill">⌖ Tiruchirappalli</span>
        </div>

        <label className="search-box">
          <span>⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search rice, oil, vegetables, shops..."
            aria-label="Search products and shops"
          />
          {search && <button onClick={() => setSearch("")} aria-label="Clear search">×</button>}
        </label>

        <div className="category-list" aria-label="Product categories">
          {categories.map((category) => (
            <button
              key={category}
              className={activeCategory === category ? "category-chip active" : "category-chip"}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="product-grid">
          {filteredProducts.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-visual"><span className="product-symbol">{product.category === "Vegetables" ? "🥬" : product.category === "Rice" ? "🌾" : product.category === "Cooking Oil" ? "🫒" : product.category === "Home Needs" ? "🧼" : "🛒"}</span><span className="product-tag">{product.tag}</span></div>
              <div className="product-info">
                <span className="product-category">{product.category}</span>
                <h3>{product.name}</h3>
                <p>{product.unit} · {product.shop}</p>
                <div className="product-bottom"><strong>₹{product.price}</strong><span className="demo-label">Demo price</span></div>
              </div>
            </article>
          ))}
          {filteredProducts.length === 0 && (
            <div className="empty-state"><span>⌕</span><h3>No products found</h3><p>Try another search or choose a different category.</p></div>
          )}
        </div>
        <p className="demo-disclaimer">Prices shown are sample demo data for the first version of Smart Deal.</p>
      </section>

      <section className="shop-cta" id="shops">
        <div><span className="eyebrow">FOR LOCAL BUSINESSES</span><h2>Own a shop in Trichy?</h2><p>Help nearby customers discover your store and compare your latest prices.</p></div>
        <a className="light-button" href="/shop-register">Register your shop <span>→</span></a>
      </section>

      <footer><a className="brand footer-brand" href="#"><span className="brand-mark">S</span> Smart Deal</a><span>Made for smarter shopping in Trichy.</span><span>© 2026 Smart Deal</span></footer>
    </main>
  );
}