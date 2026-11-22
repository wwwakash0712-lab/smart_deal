"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import CustomerNav from "../components/CustomerNav";

type Price = { shop_id: string; product_name: string; unit: string; price: number; shop_name: string; area: string };
type Item = { name: string; unit: string; quantity: number };
type ItemMap = Record<string, Item>;

function readLocalList(): ItemMap {
  try {
    const saved = localStorage.getItem("smart-deal-shopping-list");
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as ItemMap : {};
  } catch {
    return {};
  }
}

export default function ShoppingListPage() {
  const [items, setItems] = useState<ItemMap>({});
  const [prices, setPrices] = useState<Price[]>([]);
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    let active = true;

    async function loadList() {
      const localItems = readLocalList();
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;

      setUserId(user?.id ?? null);
      const cloudItems = user?.user_metadata?.smart_deal_shopping_list;
      const hasCloudList = cloudItems && typeof cloudItems === "object" && !Array.isArray(cloudItems);
      const initialItems = hasCloudList ? cloudItems as ItemMap : localItems;

      setItems(initialItems);
      setReady(true);

      if (user && !hasCloudList && Object.keys(localItems).length > 0) {
        await supabase.auth.updateUser({ data: { smart_deal_shopping_list: localItems } });
      }
    }

    loadList();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("smart-deal-shopping-list", JSON.stringify(items));

    if (!userId) {
      setSaveStatus("");
      return;
    }

    setSaveStatus("Saving to your account...");
    const timer = window.setTimeout(async () => {
      const { error } = await supabase.auth.updateUser({
        data: { smart_deal_shopping_list: items },
      });
      setSaveStatus(error ? "Cloud save failed. Your list is saved on this device." : "Saved to your account");
    }, 600);

    return () => window.clearTimeout(timer);
  }, [items, ready, userId]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("public_shop_prices").select("shop_id,product_name,unit,price,shop_name,area");
      setPrices((data ?? []) as Price[]);
    })();
  }, []);

  const entries = Object.entries(items);
  const baskets = useMemo(() => {
    const map = new Map<string, { name: string; area: string; total: number; keys: Set<string> }>();
    prices.forEach((price) => {
      const key = price.product_name.trim().toLowerCase() + "__" + price.unit.trim().toLowerCase();
      const item = items[key];
      if (!item) return;
      const basket = map.get(price.shop_id) ?? {
        name: price.shop_name,
        area: price.area,
        total: 0,
        keys: new Set<string>(),
      };
      if (!basket.keys.has(key)) {
        basket.total += Number(price.price) * item.quantity;
        basket.keys.add(key);
      }
      map.set(price.shop_id, basket);
    });

    return Array.from(map.values()).map((basket) => ({
      ...basket,
      missing: entries.filter(([key]) => !basket.keys.has(key)).map(([, value]) => value.name),
      complete: basket.keys.size === entries.length,
    })).sort((a, b) => a.complete !== b.complete ? (a.complete ? -1 : 1) : a.total - b.total);
  }, [prices, items]);

  const lowest = baskets.find((basket) => basket.complete);

  function update(key: string, quantity: number) {
    setItems((current) => ({
      ...current,
      [key]: { ...current[key], quantity: Math.max(1, Math.min(99, quantity)) },
    }));
  }

  return (
    <main className="customer-page">
      <CustomerNav />
      <section className="page-shell">
        <div className="page-heading">
          <span className="eyebrow">PLAN YOUR PURCHASE</span>
          <h1>My shopping list</h1>
          <p>Build your basket and compare shop-wise totals.</p>
          {ready && <p className="basket-help">{userId ? saveStatus || "Your list is connected to your account." : "Log in to keep this list synced to your account."} {!userId && <Link href="/account">Log in</Link>}</p>}
        </div>

        {!ready ? (
          <p className="shops-status">Loading your saved list...</p>
        ) : entries.length === 0 ? (
          <div className="empty-page">
            <div className="empty-icon">🛒</div>
            <h2>Your shopping list is empty</h2>
            <p>Add products from price comparison to build your basket.</p>
            <Link className="primary-button" href="/compare">Browse prices →</Link>
          </div>
        ) : (
          <>
            <div className="shopping-list-items">
              {entries.map(([key, value]) => (
                <div className="shopping-list-item" key={key}>
                  <div><strong>{value.name}</strong><span>{value.unit}</span></div>
                  <label>Qty<input type="number" min="1" max="99" value={value.quantity} onChange={(event) => update(key, Number(event.target.value) || 1)} /></label>
                  <button onClick={() => setItems((current) => { const next = { ...current }; delete next[key]; return next; })}>Remove</button>
                </div>
              ))}
            </div>

            <div className="basket-results">
              <h2>Shop-wise basket total</h2>
              <p className="basket-help">Complete totals are shown only when a shop has a price for every item.</p>
              {baskets.map((basket, index) => (
                <div className={basket.complete ? (index === 0 ? "basket-shop complete cheapest-basket" : "basket-shop complete") : "basket-shop"} key={basket.name + basket.area}>
                  <div>
                    <strong>{basket.name} {index === 0 && basket.complete && <span className="basket-best-label">LOWEST TOTAL</span>}</strong>
                    <span>{basket.area} · {basket.keys.size}/{entries.length} items priced</span>
                    {!basket.complete && <small className="basket-missing">Missing: {basket.missing.join(", ")}</small>}
                  </div>
                  {basket.complete ? <strong className="basket-total">₹{basket.total.toFixed(2)}</strong> : <span className="basket-missing">Incomplete basket</span>}
                </div>
              ))}
              {lowest && <p className="basket-footnote">Lowest complete basket: {lowest.name} at ₹{lowest.total.toFixed(2)}. Prices may change when shops update them.</p>}
            </div>
            <button className="clear-shopping-list" onClick={() => setItems({})}>Clear shopping list</button>
          </>
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
