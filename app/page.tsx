"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ApprovedShop = {
  id: string;
  shop_name: string;
  area: string;
  products: string | null;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
};

type PublicPrice = {
  id: string;
  shop_id: string;
  product_name: string;
  category: string;
  unit: string;
  price: number;
  updated_at: string;
  shop_name: string;
  area: string;
};

export default function Home() {
  const [approvedShops, setApprovedShops] = useState<ApprovedShop[]>([]);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [shopsError, setShopsError] = useState("");
  const [livePrices, setLivePrices] = useState<PublicPrice[]>([]);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [compareSearch, setCompareSearch] = useState("");
  const [compareArea, setCompareArea] = useState("All areas");
  const [compareCategory, setCompareCategory] = useState("All categories");
  const [selectedShopArea, setSelectedShopArea] = useState("All areas");
  const [customerPosition, setCustomerPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [shoppingList, setShoppingList] = useState<Record<string, { name: string; unit: string; quantity: number }>>({});
  const [shoppingListReady, setShoppingListReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("smart-deal-shopping-list");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) setShoppingList(parsed);
      }
    } catch {
      window.localStorage.removeItem("smart-deal-shopping-list");
    } finally {
      setShoppingListReady(true);
    }
  }, []);

  useEffect(() => {
    if (!shoppingListReady) return;
    try {
      window.localStorage.setItem("smart-deal-shopping-list", JSON.stringify(shoppingList));
    } catch {
      // The shopping list remains usable if browser storage is unavailable.
    }
  }, [shoppingList, shoppingListReady]);

  useEffect(() => {
    async function loadApprovedShops() {
      const { data, error } = await supabase
        .from("approved_shops")
        .select("id, shop_name, area, products, created_at, latitude, longitude")
        
        .order("created_at", { ascending: false });

      if (error) {
        setShopsError(`Database error: ${error.message}${error.code ? ` (code: ${error.code})` : ""}`);
      } else {
        setApprovedShops((data ?? []) as ApprovedShop[]);
      }
      setShopsLoading(false);
    }

    loadApprovedShops();

    async function loadPublicPrices() {
      const { data, error } = await supabase
        .from("public_shop_prices")
        .select("id, shop_id, product_name, category, unit, price, updated_at, shop_name, area")
        .order("updated_at", { ascending: false });
      if (!error) setLivePrices((data ?? []) as PublicPrice[]);
      setPricesLoading(false);
    }
    loadPublicPrices();
  }, []);

  // Keep common launch areas selectable even before/while shop data finishes loading.
  const shopAreas = useMemo(() => {
    const available = approvedShops.map((shop) => shop.area.trim()).filter(Boolean);
    const commonTrichyAreas = [
      "Ariyamangalam", "Airport", "Anna Nagar", "Bheema Nagar", "BHEL Township",
      "Cantonment", "Chathiram", "Chatram Bus Stand", "Crawford", "Edamalaipatti Pudur",
      "Golden Rock", "K.K. Nagar", "Kattur", "Karumandapam", "Khajamalai",
      "Palakarai", "Panjappur", "Puthur", "Srirangam", "Thennur",
      "Thillai Nagar", "Thiruverumbur", "Tiruvanaikoil", "TVS Tollgate",
      "Vayalur Road", "Woraiyur", "Uyyakondan Thirumalai", "Ponmalai",
      "Manachanallur", "Samayapuram", "Lalgudi Road", "Navalpattu"
    ];
    return ["All areas", ...Array.from(new Set([...commonTrichyAreas, ...available])).sort((a, b) => a.localeCompare(b))];
  }, [approvedShops]);

  const filteredApprovedShops = useMemo(() => {
    const filtered = approvedShops.filter((shop) =>
      selectedShopArea === "All areas" ||
      shop.area.trim().toLocaleLowerCase() === selectedShopArea.trim().toLocaleLowerCase()
    );
    if (!customerPosition) return filtered;
    const distance = (shop: ApprovedShop) => {
      if (shop.latitude == null || shop.longitude == null) return Number.POSITIVE_INFINITY;
      const toRad = (value: number) => (value * Math.PI) / 180;
      const dLat = toRad(Number(shop.latitude) - customerPosition.latitude);
      const dLon = toRad(Number(shop.longitude) - customerPosition.longitude);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(customerPosition.latitude)) * Math.cos(toRad(Number(shop.latitude))) * Math.sin(dLon / 2) ** 2;
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };
    return [...filtered].sort((a, b) => distance(a) - distance(b));
  }, [approvedShops, selectedShopArea, customerPosition]);

  function findNearbyShops() {
    if (!("geolocation" in navigator)) {
      setLocationStatus("This browser does not support location. Please choose your area manually.");
      return;
    }
    setLocationLoading(true);
    setLocationStatus("Requesting your location permission...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCustomerPosition({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocationStatus("Your location is active. Shops with saved GPS coordinates are sorted by distance.");
        setLocationLoading(false);
      },
      (error) => {
        const message = error.code === 1
          ? "Location permission was denied. Allow location access in your browser, or choose your area manually."
          : error.code === 2
            ? "Your location could not be determined. Check device location settings and try again."
            : "Location request timed out. Please try again.";
        setLocationStatus(message);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }

  function shopDistanceLabel(shop: ApprovedShop) {
    if (!customerPosition || shop.latitude == null || shop.longitude == null) return "";
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(Number(shop.latitude) - customerPosition.latitude);
    const dLon = toRad(Number(shop.longitude) - customerPosition.longitude);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(customerPosition.latitude)) * Math.cos(toRad(Number(shop.latitude))) * Math.sin(dLon / 2) ** 2;
    const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return km < 1 ? Math.round(km * 1000) + " m away" : km.toFixed(1) + " km away";
  }

  const comparisonAreas = useMemo(
    () => ["All areas", ...Array.from(new Set(livePrices.map((item) => item.area))).sort()],
    [livePrices]
  );

  const comparisonCategories = useMemo(
    () => ["All categories", ...Array.from(new Set(livePrices.map((item) => item.category.trim()).filter(Boolean))).sort()],
    [livePrices]
  );

  const comparisonGroups = useMemo(() => {
    const term = compareSearch.trim().toLowerCase();
    const matchingPrices = livePrices.filter((item) => {
      const matchesArea = compareArea === "All areas" || item.area === compareArea;
      const matchesCategory = compareCategory === "All categories" || item.category === compareCategory;
      const matchesSearch =
        !term ||
        item.product_name.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        item.shop_name.toLowerCase().includes(term) ||
        item.area.toLowerCase().includes(term);
      return matchesArea && matchesCategory && matchesSearch;
    });

    const groups = new Map<string, PublicPrice[]>();
    matchingPrices.forEach((item) => {
      const key = `${item.product_name.trim().toLowerCase()}__${item.unit.trim().toLowerCase()}`;
      const group = groups.get(key) ?? [];
      group.push(item);
      groups.set(key, group);
    });

    return Array.from(groups.values()).map((items) =>
      items.sort((a, b) => Number(a.price) - Number(b.price))
    ).sort((a, b) => a[0].product_name.localeCompare(b[0].product_name));
  }, [livePrices, compareSearch, compareArea, compareCategory]);

  const shoppingItems = Object.entries(shoppingList);
  const basketComparisons = useMemo(() => {
    const shops = new Map<string, { shopName: string; area: string; total: number; available: number }>();
    const basket = Object.entries(shoppingList);
    livePrices.forEach((price) => {
      const shop = shops.get(price.shop_id) ?? { shopName: price.shop_name, area: price.area, total: 0, available: 0 };
      const key = price.product_name.trim().toLowerCase() + "__" + price.unit.trim().toLowerCase();
      const requested = shoppingList[key];
      if (requested) { shop.total += Number(price.price) * requested.quantity; shop.available += 1; }
      shops.set(price.shop_id, shop);
    });
    return Array.from(shops.entries()).map(([id, shop]) => ({ id, ...shop, complete: shop.available === basket.length }))
      .sort((a, b) => a.complete !== b.complete ? (a.complete ? -1 : 1) : a.total - b.total);
  }, [livePrices, shoppingList]);

  function addToShoppingList(item: PublicPrice) {
    const key = item.product_name.trim().toLowerCase() + "__" + item.unit.trim().toLowerCase();
    setShoppingList((current) => ({ ...current, [key]: { name: item.product_name, unit: item.unit, quantity: current[key]?.quantity ?? 1 } }));
  }

  function updateShoppingQuantity(key: string, quantity: number) {
    setShoppingList((current) => ({ ...current, [key]: { ...current[key], quantity: Math.max(1, Math.min(99, quantity)) } }));
  }

  function removeShoppingItem(key: string) {
    setShoppingList((current) => { const next = { ...current }; delete next[key]; return next; });
  }
  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark">S</span> Smart Deal</a>
        <nav><a href="#live-prices">Compare prices</a><a href="#shops">For shop owners</a></nav>
        <a className="outline-button" href="#shops">List your shop</a>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">YOUR LOCAL PRICE FINDER</span>
          <h1>Shop smart.<br /><span>Save more.</span></h1>
          <p>Compare everyday prices from local shops in Trichy — all in one place.</p>
          <a className="primary-button" href="#live-prices">Compare prices <span>→</span></a>
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
          <div><span className="eyebrow">FIND SHOPS IN YOUR AREA</span><h2>Nearby approved shops</h2></div>
          <span className="location-pill">Choose your area</span>
        </div>
        <div className="shop-area-filter">
          <button className="primary-button nearby-location-button" type="button" onClick={findNearbyShops} disabled={locationLoading}>
            {locationLoading ? "Finding location..." : customerPosition ? "Refresh my location" : "Use my current location"}
          </button>
          <label htmlFor="shop-area-select">Or choose your area manually</label>
          <select id="shop-area-select" value={selectedShopArea} onChange={(event) => setSelectedShopArea(event.target.value)}>
            {shopAreas.map((area) => <option key={area} value={area}>{area}</option>)}
          </select>
          <span>{selectedShopArea === "All areas" ? "Showing shops across all listed areas" : "Showing approved shops in " + selectedShopArea}</span>
          {locationStatus && <p className="shop-location-status" role="status">{locationStatus}</p>}
        </div>
        {shopsLoading ? (
          <p className="shops-status">Loading approved shops...</p>
        ) : shopsError ? (
          <p className="shops-status">{shopsError}</p>
        ) : approvedShops.length === 0 ? (
          <p className="shops-status">No approved shops yet. Local shop listings will appear here after approval.</p>
        ) : filteredApprovedShops.length === 0 ? (
          <p className="shops-status">No approved shops listed in this area yet. Choose another area to explore nearby stores.</p>
        ) : (
          <div className="approved-shop-grid">
            {filteredApprovedShops.map((shop) => (
              <article className="approved-shop-card" key={shop.id}>
                <div className="approved-shop-icon">🏪</div>
                <div className="approved-shop-copy">
                  <span className="approved-label">APPROVED SHOP</span>
                  <h3>{shop.shop_name}</h3>
                  <p className="approved-shop-area">{shop.area}, Tiruchirappalli</p>
                  {customerPosition && <p className="approved-shop-distance">{shopDistanceLabel(shop) || "Shop GPS location not added yet"}</p>}
                  <p className="approved-shop-products"><strong>Products:</strong> {shop.products || "Details not provided"}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="content-section live-prices-section" id="live-prices">
        <div className="section-heading">
          <div><span className="eyebrow">COMPARE BEFORE YOU BUY</span><h2>Compare shop prices</h2></div>
          <span className="location-pill">Live prices from local shops</span>
        </div>
        <div className="comparison-controls">
          <label className="search-box comparison-search">
            <span>⌕</span>
            <input
              value={compareSearch}
              onChange={(event) => setCompareSearch(event.target.value)}
              placeholder="Search product, shop or area..."
              aria-label="Search live prices"
            />
            {compareSearch && <button onClick={() => setCompareSearch("")} aria-label="Clear comparison search">×</button>}
          </label>
          <label className="comparison-area-label">
            <span>Choose area</span>
            <select value={compareArea} onChange={(event) => setCompareArea(event.target.value)}>
              {comparisonAreas.map((area) => <option key={area} value={area}>{area}</option>)}
            </select>
          </label>
          <label className="comparison-area-label">
            <span>Product category</span>
            <select value={compareCategory} onChange={(event) => setCompareCategory(event.target.value)}>
              {comparisonCategories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
        </div>
        {pricesLoading ? <p className="shops-status">Loading shop prices...</p> : livePrices.length === 0 ? (
          <p className="shops-status">No shop prices have been published yet. Approved shop owners can add prices from their owner portal.</p>
        ) : comparisonGroups.length === 0 ? (
          <p className="shops-status">No matching prices found. Try another product or area.</p>
        ) : (
          <div className="comparison-grid">
            {comparisonGroups.map((items) => {
              const lowest = Number(items[0].price);
              const highest = Number(items[items.length - 1].price);
              return (
                <article className="comparison-card" key={items[0].id}>
                  <div className="comparison-card-heading">
                    <div><span className="product-category">{items[0].category}</span><h3>{items[0].product_name}</h3><p>{items[0].unit}</p></div>
                    {items.length > 1 && <span className="comparison-savings">Save up to ₹{(highest - lowest).toFixed(2)}</span>}
                  </div>
                  <button className="add-shopping-item" onClick={() => addToShoppingList(items[0])}>
                    {shoppingList[items[0].product_name.trim().toLowerCase() + "__" + items[0].unit.trim().toLowerCase()] ? "✓ Added to shopping list" : "+ Add to shopping list"}
                  </button>
                  <div className="comparison-shop-list">
                    {items.map((item, index) => (
                      <div className={index === 0 ? "comparison-shop best-price" : "comparison-shop"} key={item.id}>
                        <div><strong>{item.shop_name}</strong><span>{item.area}{index === 0 ? " · Lowest price" : ""}</span></div>
                        <strong className="comparison-price">₹{Number(item.price).toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>
                  <p className="comparison-updated">Prices last updated by shops · {new Date(items[0].updated_at).toLocaleDateString("en-IN")}</p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="content-section shopping-list-section" id="shopping-list">
        <div className="section-heading">
          <div><span className="eyebrow">PLAN YOUR PURCHASE</span><h2>My shopping list</h2></div>
          <span className="location-pill">{shoppingItems.length} {shoppingItems.length === 1 ? "item" : "items"}</span>
        </div>
        {!shoppingListReady ? (
          <p className="shops-status">Loading your saved shopping list...</p>
        ) : shoppingItems.length === 0 ? (
          <p className="shops-status">Your list is empty. Add products using the “Add to shopping list” button in the price comparison section.</p>
        ) : (
          <>
            <div className="shopping-list-items">
              {shoppingItems.map(([key, item]) => (
                <div className="shopping-list-item" key={key}>
                  <div><strong>{item.name}</strong><span>{item.unit}</span></div>
                  <label>Qty<input type="number" min="1" max="99" value={item.quantity} onChange={(event) => updateShoppingQuantity(key, Number(event.target.value) || 1)} /></label>
                  <button onClick={() => removeShoppingItem(key)} aria-label={"Remove " + item.name}>Remove</button>
                </div>
              ))}
            </div>
            <div className="basket-results">
              <h3>Shop-wise basket total</h3>
              <p className="basket-help">Totals are shown only when that shop has a price for every item in your list.</p>
              {basketComparisons.length === 0 ? <p className="shops-status">No shop prices are available for this list yet.</p> : basketComparisons.map((shop) => (
                <div className={shop.complete ? "basket-shop complete" : "basket-shop"} key={shop.id}>
                  <div><strong>{shop.shopName}</strong><span>{shop.area} · {shop.available}/{shoppingItems.length} items priced</span></div>
                  {shop.complete ? <strong className="basket-total">₹{shop.total.toFixed(2)}</strong> : <span className="basket-missing">Incomplete basket</span>}
                </div>
              ))}
              {basketComparisons.some((shop) => shop.complete) && <p className="basket-footnote">Lowest complete-basket total is listed first. Prices may change when shops update them.</p>}
            </div>
            <button className="clear-shopping-list" onClick={() => setShoppingList({})}>Clear shopping list</button>
          </>
        )}
      </section>

      <section className="shop-cta" id="shops">
        <div><span className="eyebrow">FOR LOCAL BUSINESSES</span><h2>Own a shop in Trichy?</h2><p>Help nearby customers discover your store and compare your latest prices.</p></div>
        <div className="shop-cta-actions"><a className="light-button" href="/shop-register">Register your shop <span>→</span></a><a className="light-button" href="/shop-owner/login">Shop owner login</a></div>
      </section>

      <footer><a className="brand footer-brand" href="#"><span className="brand-mark">S</span> Smart Deal</a><span>Made for smarter shopping in Trichy.</span><span>© 2026 Smart Deal</span></footer>
    </main>
  );
}