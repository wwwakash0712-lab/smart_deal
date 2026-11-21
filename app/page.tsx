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

type PriceHistory = { id: string; shop_id: string; product_name: string; unit: string; price: number; recorded_at: string; shop_name: string; area: string };
type ShopReview = { id: string; shop_id: string; customer_name: string; rating: number; review: string; created_at: string };

type PublicPrice = {
  id: string;
  shop_id: string;
  product_name: string;
  category: string;
  unit: string;
  price: number;
  stock_status: "in_stock" | "low_stock" | "out_of_stock";
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
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [expandedHistoryKey, setExpandedHistoryKey] = useState("");
  const [compareSearch, setCompareSearch] = useState("");
  const [compareArea, setCompareArea] = useState("All areas");
  const [compareCategory, setCompareCategory] = useState("All categories");
  const [selectedShopArea, setSelectedShopArea] = useState("All areas");
  const [shopSearch, setShopSearch] = useState("");
  const [customerPosition, setCustomerPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [shoppingList, setShoppingList] = useState<Record<string, { name: string; unit: string; quantity: number }>>({});
  const [shoppingListReady, setShoppingListReady] = useState(false);
  const [reportNotice, setReportNotice] = useState("");
  const [reportTarget, setReportTarget] = useState<PublicPrice | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [shopReviews, setShopReviews] = useState<ShopReview[]>([]);
  const [reviewTarget, setReviewTarget] = useState("");
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewNotice, setReviewNotice] = useState<Record<string, string>>({});

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
        .select("id, shop_id, product_name, category, unit, price, stock_status, updated_at, shop_name, area")
        .order("updated_at", { ascending: false });
      if (!error) setLivePrices((data ?? []) as PublicPrice[]);
      setPricesLoading(false);
    }
    loadPublicPrices();

    async function loadPriceHistory() {
      const { data, error } = await supabase
        .from("public_price_history")
        .select("id, shop_id, product_name, unit, price, recorded_at, shop_name, area")
        .order("recorded_at", { ascending: true });
      if (!error) setPriceHistory((data ?? []) as PriceHistory[]);
    }
    loadPriceHistory();

    async function loadShopReviews() {
      const { data, error } = await supabase.from("shop_reviews")
        .select("id, shop_id, customer_name, rating, review, created_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (!error) setShopReviews((data ?? []) as ShopReview[]);
    }
    loadShopReviews();
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
    const normalize = (value: string) => value.normalize("NFKD").toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const term = normalize(shopSearch);
    const filtered = approvedShops.filter((shop) => {
      const matchesArea = selectedShopArea === "All areas" ||
        normalize(shop.area) === normalize(selectedShopArea);
      const shopPrices = livePrices.filter((price) => price.shop_id === shop.id);
      const searchableText = normalize([
        shop.shop_name, shop.area, shop.products ?? "",
        ...shopPrices.flatMap((price) => [price.product_name, price.category])
      ].join(" "));
      const matchesSearch = !term || searchableText.includes(term);
      return matchesArea && matchesSearch;
    });
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
  }, [approvedShops, livePrices, selectedShopArea, shopSearch, customerPosition]);

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
    const shops = new Map<string, { shopName: string; area: string; total: number; pricedKeys: Set<string> }>(
      approvedShops.map((shop) => [shop.id, {
        shopName: shop.shop_name, area: shop.area, total: 0, pricedKeys: new Set<string>(),
      }])
    );
    const basket = Object.entries(shoppingList);
    livePrices.forEach((price) => {
      const shop = shops.get(price.shop_id) ?? {
        shopName: price.shop_name, area: price.area, total: 0, pricedKeys: new Set<string>(),
      };
      const key = price.product_name.trim().toLowerCase() + "__" + price.unit.trim().toLowerCase();
      const requested = shoppingList[key];
      if (requested && !shop.pricedKeys.has(key)) {
        shop.total += Number(price.price) * requested.quantity;
        shop.pricedKeys.add(key);
      }
      shops.set(price.shop_id, shop);
    });
    return Array.from(shops.entries()).map(([id, shop]) => {
      const missingItems = basket.filter(([key]) => !shop.pricedKeys.has(key)).map(([, item]) => item.name);
      return {
        id, shopName: shop.shopName, area: shop.area, total: shop.total,
        available: shop.pricedKeys.size, complete: missingItems.length === 0, missingItems,
      };
    }).sort((a, b) => a.complete !== b.complete ? (a.complete ? -1 : 1) : a.total - b.total);
  }, [approvedShops, livePrices, shoppingList]);
  const cheapestCompleteBasket = basketComparisons.find((shop) => shop.complete);
  const basketSavings = cheapestCompleteBasket
    ? Math.max(0, ...basketComparisons.filter((shop) => shop.complete).map((shop) => shop.total)) - cheapestCompleteBasket.total
    : 0;

  function priceFreshness(updatedAt: string) {
    const ageDays = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000);
    if (!Number.isFinite(ageDays) || ageDays < 0) return { label: "Update date unavailable", stale: false };
    if (ageDays > 7) return { label: "Price may be outdated · " + ageDays + " days ago", stale: true };
    if (ageDays <= 1) return { label: "Recently updated", stale: false };
    return { label: "Updated " + ageDays + " days ago", stale: false };
  }

  function addToShoppingList(item: PublicPrice) {
    const key = item.product_name.trim().toLowerCase() + "__" + item.unit.trim().toLowerCase();
    setShoppingList((current) => ({ ...current, [key]: { name: item.product_name, unit: item.unit, quantity: current[key]?.quantity ?? 1 } }));
  }

  function reportPriceIssue(item: PublicPrice) {
    setReportTarget(item);
    setReportReason("");
    setReportNotice("");
  }

  async function submitPriceReport() {
    if (!reportTarget || !reportReason.trim() || reportSubmitting) return;
    setReportSubmitting(true);
    const { error } = await supabase.from("price_issue_reports").insert({
      shop_id: reportTarget.shop_id, shop_name: reportTarget.shop_name,
      product_name: reportTarget.product_name, category: reportTarget.category,
      unit: reportTarget.unit, displayed_price: Number(reportTarget.price),
      report_reason: reportReason.trim().slice(0, 500),
    });
    setReportSubmitting(false);
    setReportTarget(null);
    setReportReason("");
    setReportNotice(error ? "Could not submit report. Please try again later." : "Thanks — your price report was sent to the Smart Deal admin.");
  }

  async function submitShopReview(shopId: string) {
    if (!reviewName.trim() || reviewName.trim().length < 2 || !reviewText.trim() || reviewText.trim().length < 5 || reviewSubmitting) return;
    setReviewSubmitting(true);
    const { error } = await supabase.from("shop_reviews").insert({
      shop_id: shopId,
      customer_name: reviewName.trim().slice(0, 60),
      rating: reviewRating,
      review: reviewText.trim().slice(0, 500),
      status: "pending",
    });
    setReviewSubmitting(false);
    if (error) {
      setReviewNotice((current) => ({ ...current, [shopId]: "Could not submit review. Please try again." }));
      return;
    }
    setReviewName("");
    setReviewRating(5);
    setReviewText("");
    setReviewTarget("");
    setReviewNotice((current) => ({ ...current, [shopId]: "Thanks! Your review was submitted for admin approval." }));
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
          <input className="shop-search-input" value={shopSearch} onChange={(event) => setShopSearch(event.target.value)} placeholder="Search shop name or product..." aria-label="Search approved shops" />
          <label htmlFor="shop-area-select">Or choose your area manually</label>
          <select id="shop-area-select" value={selectedShopArea} onChange={(event) => setSelectedShopArea(event.target.value)}>
            {shopAreas.map((area) => <option key={area} value={area}>{area}</option>)}
          </select>
          <span>Showing {filteredApprovedShops.length} approved shop{filteredApprovedShops.length === 1 ? "" : "s"}{selectedShopArea === "All areas" ? " across all areas" : " in " + selectedShopArea}</span>
          {locationStatus && <p className="shop-location-status" role="status">{locationStatus}</p>}
        </div>
        {shopsLoading ? (
          <p className="shops-status">Loading approved shops...</p>
        ) : shopsError ? (
          <p className="shops-status">{shopsError}</p>
        ) : approvedShops.length === 0 ? (
          <p className="shops-status">No approved shops yet. Local shop listings will appear here after approval.</p>
        ) : filteredApprovedShops.length === 0 ? (
          <p className="shops-status">No matching approved shops. Try another shop name, product, or area.</p>
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
                  <div className="shop-rating-summary">
                    <strong>{shopReviews.filter((review) => review.shop_id === shop.id).length ? "★ " + (shopReviews.filter((review) => review.shop_id === shop.id).reduce((sum, review) => sum + Number(review.rating), 0) / shopReviews.filter((review) => review.shop_id === shop.id).length).toFixed(1) : "No ratings yet"}</strong>
                    <span>({shopReviews.filter((review) => review.shop_id === shop.id).length} reviews)</span>
                    <button type="button" onClick={() => { setReviewTarget(reviewTarget === shop.id ? "" : shop.id); setReviewNotice((current) => ({ ...current, [shop.id]: "" })); }}>Write a review</button>
                  </div>
                  {shopReviews.filter((review) => review.shop_id === shop.id).slice(0, 2).map((review) => (
                    <div className="shop-public-review" key={review.id}>
                      <div><strong>{review.customer_name}</strong><span>{"★".repeat(Number(review.rating))}</span></div>
                      <p>{review.review}</p>
                      <small>{new Date(review.created_at).toLocaleDateString("en-IN")}</small>
                    </div>
                  ))}
                  {reviewTarget === shop.id && (
                    <div className="shop-review-form">
                      <label>Your name<input value={reviewName} onChange={(event) => setReviewName(event.target.value)} maxLength={60} placeholder="Enter your name" /></label>
                      <label>Rating<select value={reviewRating} onChange={(event) => setReviewRating(Number(event.target.value))}>{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} star{value === 1 ? "" : "s"}</option>)}</select></label>
                      <label>Your review<textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} maxLength={500} rows={3} placeholder="Share your experience (at least 5 characters)" /></label>
                      <button type="button" disabled={reviewSubmitting || reviewName.trim().length < 2 || reviewText.trim().length < 5} onClick={() => submitShopReview(shop.id)}>{reviewSubmitting ? "Submitting..." : "Submit review"}</button>
                    </div>
                  )}
                  {reviewNotice[shop.id] && <p className="shop-review-notice">{reviewNotice[shop.id]}</p>}
                  {shop.latitude != null && shop.longitude != null && <a className="shop-directions" href={`https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}${customerPosition ? `&origin=${customerPosition.latitude},${customerPosition.longitude}` : ""}`} target="_blank" rel="noreferrer">Get directions ↗</a>}
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
                        <div><strong>{item.shop_name}</strong><span>{item.area}{index === 0 ? " · Lowest price" : ""}</span><span className={"stock-status " + item.stock_status}>{item.stock_status === "out_of_stock" ? "Check with Store" : item.stock_status === "low_stock" ? "Buy Quickly!" : "Available"}</span><span className={priceFreshness(item.updated_at).stale ? "price-freshness stale" : "price-freshness"}>{priceFreshness(item.updated_at).label}</span></div>
                        <strong className="comparison-price">₹{Number(item.price).toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>
                  <p className="comparison-updated">Each shop shows its own price update status.</p>
                  {(() => {
                    const historyKey = items[0].product_name.trim().toLowerCase() + "__" + items[0].unit.trim().toLowerCase();
                    const historyItems = priceHistory.filter((entry) => entry.product_name.trim().toLowerCase() + "__" + entry.unit.trim().toLowerCase() === historyKey);
                    const trendGroups = new Map<string, PriceHistory[]>();
                    historyItems.forEach((entry) => {
                      const group = trendGroups.get(entry.shop_id) ?? [];
                      group.push(entry);
                      trendGroups.set(entry.shop_id, group);
                    });
                    return (
                      <div className="price-history-panel">
                        <button type="button" className="price-history-toggle" onClick={() => setExpandedHistoryKey(expandedHistoryKey === historyKey ? "" : historyKey)}>
                          {expandedHistoryKey === historyKey ? "Hide price history" : "View price history"} ({historyItems.length} updates)
                        </button>
                        {expandedHistoryKey === historyKey && (
                          <div className="price-history-list">
                            {historyItems.length === 0 ? <p>No price history recorded yet. New price changes will appear here.</p> : (
                              <>
                                <div className="price-trend-charts">
                                  {Array.from(trendGroups.entries()).map(([shopId, entries]) => {
                                    const sorted = [...entries].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
                                    const values = sorted.map((entry) => Number(entry.price));
                                    const minPrice = Math.min(...values);
                                    const maxPrice = Math.max(...values);
                                    const range = maxPrice - minPrice || 1;
                                    const coordinates = values.map((value, index) => ({
                                      x: sorted.length === 1 ? 160 : 12 + (index / (sorted.length - 1)) * 296,
                                      y: 82 - ((value - minPrice) / range) * 64,
                                    }));
                                    return (
                                      <div className="price-trend-card" key={shopId}>
                                        <div className="price-trend-heading"><strong>{sorted[0].shop_name}</strong><span>{sorted.length} recorded prices</span></div>
                                        <svg viewBox="0 0 320 100" role="img" aria-label={sorted[0].shop_name + " price trend chart"}>
                                          {coordinates.length > 1 && <polyline points={coordinates.map((point) => point.x + "," + point.y).join(" ")} fill="none" stroke="#23734f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
                                          {coordinates.map((point, index) => <circle key={sorted[index].id} cx={point.x} cy={point.y} r="4" fill="#23734f" />)}
                                        </svg>
                                        <div className="price-trend-values"><span>₹{minPrice.toFixed(2)} low</span><strong>₹{Number(sorted[sorted.length - 1].price).toFixed(2)} latest</strong><span>₹{maxPrice.toFixed(2)} high</span></div>
                                        <small className="price-trend-dates">{new Date(sorted[0].recorded_at).toLocaleDateString("en-IN")} – {new Date(sorted[sorted.length - 1].recorded_at).toLocaleDateString("en-IN")}</small>
                                      </div>
                                    );
                                  })}
                                </div>
                                {historyItems.map((entry) => (
                                  <div className="price-history-row" key={entry.id}>
                                    <span><strong>{entry.shop_name}</strong><small>{new Date(entry.recorded_at).toLocaleDateString("en-IN")}</small></span>
                                    <strong>₹{Number(entry.price).toFixed(2)}</strong>
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <div className="price-report-actions">{items.map((item) => <button key={item.id} type="button" onClick={() => reportPriceIssue(item)}>Report wrong price · {item.shop_name}</button>)}</div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {reportTarget && (
        <section className="price-report-notice" aria-label="Report a price issue">
          <h3>Report wrong price</h3>
          <p>{reportTarget.product_name} · {reportTarget.shop_name} · ₹{Number(reportTarget.price).toFixed(2)}</p>
          <label htmlFor="price-report-reason">What is wrong with this price?</label>
          <textarea id="price-report-reason" value={reportReason} onChange={(event) => setReportReason(event.target.value)} maxLength={500} rows={3} placeholder="Explain the price issue..." />
          <button type="button" disabled={!reportReason.trim() || reportSubmitting} onClick={submitPriceReport}>{reportSubmitting ? "Submitting..." : "Submit report"}</button>
          <button type="button" onClick={() => setReportTarget(null)} disabled={reportSubmitting}>Cancel</button>
        </section>
      )}
      {reportNotice && <p className="price-report-notice" role="status">{reportNotice}</p>}
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
                <div className={shop.id === cheapestCompleteBasket?.id ? "basket-shop complete cheapest-basket" : shop.complete ? "basket-shop complete" : "basket-shop"} key={shop.id}>
                  <div>
                    <strong>{shop.shopName} {shop.id === cheapestCompleteBasket?.id && <span className="basket-best-label">LOWEST TOTAL</span>}</strong>
                    <span>{shop.area} · {shop.available}/{shoppingItems.length} items priced</span>
                    {!shop.complete && <small className="basket-missing">Missing: {shop.missingItems.join(", ")}</small>}
                  </div>
                  {shop.complete ? <strong className="basket-total">₹{shop.total.toFixed(2)}</strong> : <span className="basket-missing">Incomplete basket</span>}
                </div>
              ))}
              {cheapestCompleteBasket && (
                <p className="basket-footnote">
                  Lowest complete basket: {cheapestCompleteBasket.shopName} at ₹{cheapestCompleteBasket.total.toFixed(2)}.
                  {basketSavings > 0 ? ` You save ₹${basketSavings.toFixed(2)} compared with the highest complete basket.` : " Prices are currently equal across complete baskets."}
                  {" "}Prices may change when shops update them.
                </p>
              )}
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