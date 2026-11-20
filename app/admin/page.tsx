"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Shop = {
  id: string;
  shop_name: string;
  owner_name: string;
  mobile: string;
  address: string;
  area: string;
  products: string | null;
  status: string;
  created_at: string;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadPendingShops = useCallback(async () => {
    setErrorMessage("");
    const { data, error } = await supabase
      .from("shops")
      .select("id, shop_name, owner_name, mobile, address, area, products, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage("Could not load registrations. Check the admin database setup.");
      return;
    }

    setShops((data ?? []) as Shop[]);
  }, []);

  useEffect(() => {
    let active = true;

    async function initialise() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const { data: adminRecord, error: adminError } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;

      if (adminError || !adminRecord) {
        await supabase.auth.signOut();
        router.replace("/admin/login?unauthorized=1");
        return;
      }

      await loadPendingShops();
      if (active) setLoading(false);
    }

    initialise();
    return () => { active = false; };
  }, [router, loadPendingShops]);

  async function reviewShop(shopId: string, status: "approved" | "rejected") {
    setBusyId(shopId);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("admin_review_shop", {
      p_shop_id: shopId,
      p_status: status,
    });

    setBusyId("");
    if (error) {
      setErrorMessage("Could not update this shop. Please check your admin permission.");
      return;
    }

    setMessage(status === "approved" ? "Shop approved successfully." : "Shop rejected.");
    await loadPendingShops();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  if (loading) {
    return <main className="admin-page"><div className="admin-card"><p>Checking admin access...</p></div></main>;
  }

  return (
    <main className="admin-page admin-dashboard">
      <header className="admin-header">
        <Link className="brand" href="/"><span className="brand-mark">S</span> Smart Deal</Link>
        <button className="outline-button" onClick={signOut}>Sign out</button>
      </header>
      <section className="admin-content">
        <span className="eyebrow">SMART DEAL CONTROL PANEL</span>
        <h1>Shop approvals</h1>
        <p className="admin-subtitle">Review new shop registrations before they appear to customers.</p>
        {message && <p className="admin-success" role="status">{message}</p>}
        {errorMessage && <p className="admin-error" role="alert">{errorMessage}</p>}
        <div className="admin-list-heading"><h2>Pending registrations</h2><span>{shops.length} waiting</span></div>
        {shops.length === 0 ? (
          <div className="admin-empty">No pending shop registrations right now.</div>
        ) : (
          <div className="admin-shop-list">
            {shops.map((shop) => (
              <article className="admin-shop-card" key={shop.id}>
                <div className="admin-shop-top"><div><span className="eyebrow">SHOP REGISTRATION</span><h3>{shop.shop_name}</h3></div><span className="admin-pending">{shop.status}</span></div>
                <div className="admin-shop-details">
                  <p><strong>Owner:</strong> {shop.owner_name}</p>
                  <p><strong>Mobile:</strong> {shop.mobile}</p>
                  <p><strong>Address:</strong> {shop.address}, {shop.area}</p>
                  <p><strong>Products:</strong> {shop.products || "Not provided"}</p>
                  <p><strong>Submitted:</strong> {new Date(shop.created_at).toLocaleString("en-IN")}</p>
                </div>
                <div className="admin-actions">
                  <button className="admin-approve" disabled={busyId === shop.id} onClick={() => reviewShop(shop.id, "approved")}>{busyId === shop.id ? "Please wait..." : "Approve shop"}</button>
                  <button className="admin-reject" disabled={busyId === shop.id} onClick={() => reviewShop(shop.id, "rejected")}>Reject</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
