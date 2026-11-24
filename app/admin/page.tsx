"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type PriceReport = { id: string; shop_id: string; shop_name: string; product_name: string; category: string; unit: string; displayed_price: number; report_reason: string; status: string; created_at: string; has_notification?: boolean; };
type ShopReview = { id: string; shop_id: string; shop: { shop_name: string }[] | null; customer_name: string; rating: number; review: string; status: string; created_at: string; };

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
  const [priceReports, setPriceReports] = useState<PriceReport[]>([]);
  const [shopReviews, setShopReviews] = useState<ShopReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadPriceReports = useCallback(async () => {
    const { data, error } = await supabase.from("price_issue_reports").select("id, shop_id, shop_name, product_name, category, unit, displayed_price, report_reason, status, created_at").order("created_at", { ascending: false });
    if (error) {
      setErrorMessage("Could not load customer price reports: " + error.message);
      return;
    }
    const { data: notificationData } = await supabase.from("shop_owner_notifications").select("report_id");
    const notifiedReportIds = new Set((notificationData ?? []).map((item: { report_id: string }) => item.report_id));
    setPriceReports(((data ?? []) as PriceReport[]).map((report) => ({ ...report, has_notification: notifiedReportIds.has(report.id) })));
  }, []);

  async function notifyShopOwner(report: PriceReport) {
    setBusyId(report.id);
    setErrorMessage("");
    setMessage("");
    const { error } = await supabase.from("shop_owner_notifications").insert({
      shop_id: report.shop_id,
      report_id: report.id,
      message: "Please check the reported price for " + report.product_name + " (" + report.unit + "). Customer report: " + report.report_reason,
    });
    setBusyId("");
    if (error) {
      setErrorMessage("Could not notify shop owner: " + error.message);
      return;
    }
    setMessage("Correction request sent to " + report.shop_name + ".");
    await supabase.from("price_issue_reports").update({ status: "reviewed" }).eq("id", report.id);
    await loadPriceReports();
  }

  const loadShopReviews = useCallback(async () => {
    const { data, error } = await supabase.from("shop_reviews")
      .select("id, shop_id, shop:shops(shop_name), customer_name, rating, review, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) {
      setErrorMessage("Could not load customer reviews: " + error.message);
      return;
    }
    setShopReviews((data ?? []) as ShopReview[]);
  }, []);

  async function moderateShopReview(reviewId: string, status: "approved" | "rejected") {
    setBusyId(reviewId);
    setMessage("");
    setErrorMessage("");
    const { error } = await supabase.from("shop_reviews").update({ status }).eq("id", reviewId);
    setBusyId("");
    if (error) {
      setErrorMessage("Could not update review: " + error.message);
      return;
    }
    setMessage(status === "approved" ? "Customer review approved." : "Customer review rejected.");
    await loadShopReviews();
  }

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
      await loadPriceReports();
      await loadShopReviews();
      if (active) setLoading(false);
    }

    initialise();
    return () => { active = false; };
  }, [router, loadPendingShops, loadPriceReports, loadShopReviews]);

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
        <div className="admin-list-heading"><h2>Customer price reports</h2><span>{priceReports.filter((report) => report.status === "pending").length} pending</span></div>
        {priceReports.length === 0 ? (
          <div className="admin-empty">No customer price reports yet.</div>
        ) : (
          <div className="admin-shop-list">
            {priceReports.map((report) => (
              <article className="admin-shop-card" key={report.id}>
                <div className="admin-shop-top">
                  <div><span className="eyebrow">PRICE ISSUE REPORT</span><h3>{report.product_name} · {report.shop_name}</h3></div>
                  <span className={report.status === "pending" ? "admin-pending" : "admin-approved"}>{report.status}</span>
                </div>
                <div className="admin-shop-details">
                  <p><strong>Displayed price:</strong> ₹{Number(report.displayed_price).toFixed(2)} / {report.unit}</p>
                  <p><strong>Category:</strong> {report.category}</p>
                  <p><strong>Customer reason:</strong> {report.report_reason}</p>
                  <p><strong>Reported:</strong> {new Date(report.created_at).toLocaleString("en-IN")}</p>
                </div>
                {!report.has_notification && <div className="admin-actions"><button className="admin-approve" disabled={busyId === report.id} onClick={() => notifyShopOwner(report)}>{busyId === report.id ? "Sending..." : "Notify shop owner"}</button></div>}
                {report.has_notification && <p className="admin-success">Shop owner has been notified.</p>}
              </article>
            ))}
          </div>
        )}
        <div className="admin-list-heading"><h2>Customer reviews</h2><span>{shopReviews.length} waiting</span></div>
        {shopReviews.length === 0 ? (
          <div className="admin-empty">No customer reviews waiting for approval.</div>
        ) : (
          <div className="admin-shop-list">
            {shopReviews.map((review) => (
              <article className="admin-shop-card" key={review.id}>
                <div className="admin-shop-top"><div><span className="eyebrow">CUSTOMER REVIEW</span><h3>{review.customer_name} · {"★".repeat(Number(review.rating))}</h3></div><span className="admin-pending">pending</span></div>
                <div className="admin-shop-details">
                  <p><strong>Shop name:</strong> {review.shop?.[0]?.shop_name || "Shop name unavailable"}</p>
                  <p><strong>Review:</strong> {review.review}</p>
                  <p><strong>Submitted:</strong> {new Date(review.created_at).toLocaleString("en-IN")}</p>
                </div>
                <div className="admin-actions">
                  <button className="admin-approve" disabled={busyId === review.id} onClick={() => moderateShopReview(review.id, "approved")}>Approve review</button>
                  <button className="admin-reject" disabled={busyId === review.id} onClick={() => moderateShopReview(review.id, "rejected")}>Reject</button>
                </div>
              </article>
            ))}
          </div>
        )}
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
