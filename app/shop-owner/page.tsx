"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Product = { id: string; product_name: string; category: string; unit: string; price: number; updated_at: string };
type Shop = { id: string; shop_name: string; area: string };

export default function ShopOwnerDashboard() {
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Groceries");
  const [unit, setUnit] = useState("1 kg");
  const [price, setPrice] = useState("");

  const loadData = useCallback(async () => {
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/shop-owner/login"); return; }

    const { data: assignment, error: assignmentError } = await supabase
      .from("shop_owner_users").select("shop_id").eq("user_id", user.id).maybeSingle();
    if (assignmentError || !assignment) {
      setError("This login is not linked to a shop yet. Please contact Smart Deal admin.");
      setLoading(false);
      return;
    }

    const { data: shopData, error: shopError } = await supabase
      .from("shops").select("id, shop_name, area").eq("id", assignment.shop_id).maybeSingle();
    if (shopError || !shopData) {
      setError("Your approved shop could not be loaded. Please contact admin.");
      setLoading(false);
      return;
    }
    setShop(shopData as Shop);

    const { data: productData, error: productError } = await supabase
      .from("shop_products").select("id, product_name, category, unit, price, updated_at")
      .eq("shop_id", assignment.shop_id).order("updated_at", { ascending: false });
    if (productError) setError("Could not load your prices. Please check the database setup.");
    else setProducts((productData ?? []) as Product[]);
    setLoading(false);
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  function startEdit(product: Product) {
    setEditingId(product.id);
    setName(product.product_name);
    setCategory(product.category);
    setUnit(product.unit);
    setPrice(String(product.price));
    setNotice("");
  }

  function resetForm() {
    setEditingId(""); setName(""); setCategory("Groceries"); setUnit("1 kg"); setPrice("");
  }

  async function savePrice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shop) return;
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setError("Enter a valid price greater than zero."); return;
    }
    setBusy(true); setError(""); setNotice("");
    const values = { product_name: name.trim(), category, unit: unit.trim(), price: numericPrice, updated_at: new Date().toISOString() };
    const result = editingId
      ? await supabase.from("shop_products").update(values).eq("id", editingId).eq("shop_id", shop.id)
      : await supabase.from("shop_products").insert({ ...values, shop_id: shop.id });
    setBusy(false);
    if (result.error) { setError(result.error.message); return; }
    setNotice(editingId ? "Price updated successfully." : "Product price added successfully.");
    resetForm();
    await loadData();
  }

  async function deletePrice(id: string) {
    if (!window.confirm("Delete this product price?")) return;
    setError(""); setNotice("");
    const { error: deleteError } = await supabase.from("shop_products").delete().eq("id", id);
    if (deleteError) setError(deleteError.message);
    else { setNotice("Product price deleted."); await loadData(); }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/shop-owner/login");
  }

  if (loading) return <main className="admin-page"><div className="admin-card"><p>Loading your shop...</p></div></main>;

  return (
    <main className="admin-page">
      <header className="admin-header"><Link className="brand" href="/"><span className="brand-mark">S</span> Smart Deal</Link><button className="outline-button" onClick={signOut}>Sign out</button></header>
      <section className="owner-content">
        <span className="eyebrow">SHOP OWNER PORTAL</span>
        <h1>{shop?.shop_name ?? "Your shop"}</h1>
        {shop && <p className="admin-subtitle">{shop.area}, Tiruchirappalli · Manage your product prices</p>}
        {error && <p className="admin-error" role="alert">{error}</p>}
        {notice && <p className="admin-success" role="status">{notice}</p>}
        {shop && <>
          <div className="owner-panel">
            <h2>{editingId ? "Update product price" : "Add a product price"}</h2>
            <form className="owner-price-form" onSubmit={savePrice}>
              <label>Product name<input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ponni rice" required /></label>
              <label>Category<select value={category} onChange={e => setCategory(e.target.value)}><option>Groceries</option><option>Rice</option><option>Cooking Oil</option><option>Dal and Pulses</option><option>Vegetables</option><option>Fruits</option><option>Home Needs</option><option>Other</option></select></label>
              <label>Unit / quantity<input value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g. 1 kg, 1 litre, 500 g" required /></label>
              <label>Price (₹)<input type="number" min="0.01" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 75" required /></label>
              <div className="owner-form-actions"><button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving..." : editingId ? "Save changes" : "Add price"}</button>{editingId && <button className="admin-reject" type="button" onClick={resetForm}>Cancel</button>}</div>
            </form>
          </div>
          <div className="owner-list-heading"><h2>Your listed prices</h2><span>{products.length} products</span></div>
          {products.length === 0 ? <div className="admin-empty">No prices added yet. Add your first product above.</div> : <div className="owner-product-list">
            {products.map(product => <article className="owner-product-row" key={product.id}>
              <div><strong>{product.product_name}</strong><p>{product.category} · {product.unit} · Updated {new Date(product.updated_at).toLocaleDateString("en-IN")}</p></div>
              <div className="owner-product-actions"><strong>₹{Number(product.price).toFixed(2)}</strong><button onClick={() => startEdit(product)}>Edit</button><button className="delete-price" onClick={() => deletePrice(product.id)}>Delete</button></div>
            </article>)}
          </div>}
        </>}
      </section>
    </main>
  );
}
