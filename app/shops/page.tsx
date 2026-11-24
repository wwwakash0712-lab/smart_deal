"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import CustomerNav from "../components/CustomerNav";

type Shop = {
  id: string;
  shop_name: string;
  area: string;
  products: string | null;
  latitude: number | null;
  longitude: number | null;
};
type Price = { shop_id: string; product_name: string; category: string };

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("All areas");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: approved, error } = await supabase
        .from("approved_shops")
        .select("id,shop_name,area,products,latitude,longitude")
        .order("shop_name");
      if (error || !approved?.length) {
        if (active) {
          setShops([]);
          setPrices([]);
          setLoading(false);
        }
        return;
      }

      const approvedShops = approved as Shop[];
      const approvedIds = approvedShops.map((shop) => shop.id);
      const { data: publishedPrices } = await supabase
        .from("public_shop_prices")
        .select("shop_id,product_name,category")
        .in("shop_id", approvedIds);

      if (active) {
        setShops(approvedShops);
        setPrices((publishedPrices ?? []) as Price[]);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const areas = useMemo(
    () => ["All areas", ...Array.from(new Set(shops.map((shop) => shop.area).filter(Boolean))).sort()],
    [shops]
  );

  const filtered = shops.filter((shop) => {
    const shopPrices = prices.filter((price) => price.shop_id === shop.id);
    const matchesArea = area === "All areas" || shop.area === area;
    const matchesSearch =
      !search.trim() ||
      [shop.shop_name, shop.area, shop.products ?? "", ...shopPrices.flatMap((price) => [price.product_name, price.category])]
        .join(" ")
        .toLowerCase()
        .includes(search.trim().toLowerCase());
    return matchesArea && matchesSearch;
  });

  return (
    <main className="customer-page">
      <CustomerNav />
      <section className="page-shell">
        <div className="page-heading">
          <span className="eyebrow">DISCOVER LOCAL STORES</span>
          <h1>Find approved shops</h1>
          <p>Choose a shop to see its products, prices, ratings and directions.</p>
        </div>
        <div className="page-filters">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search shop, product or area..." aria-label="Search shops" />
          <select value={area} onChange={(event) => setArea(event.target.value)}>{areas.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        {loading ? (
          <p className="shops-status">Loading approved shops...</p>
        ) : filtered.length === 0 ? (
          <p className="shops-status">No matching approved shops found.</p>
        ) : (
          <div className="approved-shop-grid">
            {filtered.map((shop) => {
              const count = prices.filter((price) => price.shop_id === shop.id).length;
              return (
                <article className="approved-shop-card" key={shop.id}>
                  <div className="approved-shop-icon">🏪</div>
                  <div className="approved-shop-copy">
                    <span className="approved-label">✓ APPROVED SHOP</span>
                    <h3>{shop.shop_name}</h3>
                    <p className="approved-shop-area">{shop.area}, Tiruchirappalli</p>
                    <p className="approved-shop-products"><strong>Products:</strong> {shop.products || "Details not provided"}</p>
                    <p className="shop-product-count">{count} published price {count === 1 ? "entry" : "entries"}</p>
                    <Link className="primary-button shop-open-button" href={"/shops/" + shop.id}>View shop details →</Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <footer>
        <Link className="brand footer-brand" href="/"><span className="brand-mark">S</span> Smart Deal</Link>
        <span>Made for smarter shopping in Trichy.</span>
        <span>© 2026 Smart Deal</span>
      </footer>
    </main>
  );
}
