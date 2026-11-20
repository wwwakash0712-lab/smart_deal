"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ShopRegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    setIsSubmitting(true);
    setErrorMessage("");

    const shop = {
      shop_name: String(formData.get("shopName") ?? "").trim(),
      owner_name: String(formData.get("ownerName") ?? "").trim(),
      mobile: String(formData.get("mobile") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
      area: String(formData.get("area") ?? "").trim(),
      products: String(formData.get("products") ?? "").trim(),
      status: "pending",
    };

    const { error } = await supabase.from("shops").insert(shop);

    setIsSubmitting(false);

    if (error) {
      setErrorMessage("Registration could not be saved. Please check your connection and try again.");
      console.error("Shop registration error:", error.message);
      return;
    }

    formElement.reset();
    setSubmitted(true);
  }

  return (
    <main className="register-page">
      <header className="topbar register-topbar">
        <Link className="brand" href="/"><span className="brand-mark">S</span> Smart Deal</Link>
        <Link className="outline-button" href="/">Back to home</Link>
      </header>

      <section className="register-shell">
        <div className="register-intro">
          <span className="eyebrow">SMART DEAL PARTNER SHOPS</span>
          <h1>Bring your shop<br /><span>online in Trichy.</span></h1>
          <p>Register your store so nearby customers can discover your shop and compare everyday prices.</p>
          <div className="approval-steps">
            <div><span>1</span><p><strong>Submit shop details</strong><small>Share your store information</small></p></div>
            <div><span>2</span><p><strong>Admin review</strong><small>We verify your registration</small></p></div>
            <div><span>3</span><p><strong>Shop goes live</strong><small>After approval, customers can find you</small></p></div>
          </div>
        </div>

        <div className="register-card">
          {submitted ? (
            <div className="register-success" role="status">
              <div className="success-icon">✓</div>
              <span className="eyebrow">REGISTRATION RECEIVED</span>
              <h2>Thank you for registering!</h2>
              <p>Your shop details have been saved and are waiting for admin approval. Your shop will appear publicly only after it is approved.</p>
              <button className="primary-button" onClick={() => setSubmitted(false)}>Register another shop</button>
            </div>
          ) : (
            <>
              <span className="eyebrow">GET STARTED</span>
              <h2>Register your shop</h2>
              <p className="form-subtitle">Fill in your basic shop details.</p>
              <form className="shop-register-form" onSubmit={handleSubmit}>
                <label>Shop name<input name="shopName" placeholder="e.g. Sri Murugan Stores" required /></label>
                <label>Owner name<input name="ownerName" placeholder="Your full name" required /></label>
                <label>Mobile number<input name="mobile" type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} placeholder="10-digit mobile number" required /></label>
                <label>Shop address<textarea name="address" rows={3} placeholder="Door no, street and nearby landmark" required /></label>
                <label>Area in Trichy<input name="area" placeholder="e.g. Srirangam, Thillai Nagar" required /></label>
                <label>Products you sell<input name="products" placeholder="e.g. Rice, oil, groceries, vegetables" required /></label>
                {errorMessage && <p className="privacy-note" role="alert">{errorMessage}</p>}
                <button className="primary-button submit-registration" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit registration"} <span>→</span>
                </button>
                <p className="privacy-note">Your details are stored securely for review. They are not displayed publicly before approval.</p>
              </form>
            </>
          )}
        </div>
      </section>
      <footer><Link className="brand footer-brand" href="/"><span className="brand-mark">S</span> Smart Deal</Link><span>Made for smarter shopping in Trichy.</span><span>© 2026 Smart Deal</span></footer>
    </main>
  );
}
