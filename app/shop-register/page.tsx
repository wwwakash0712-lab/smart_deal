"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function ShopRegisterPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
              <span className="eyebrow">REGISTRATION DEMO</span>
              <h2>Details received on this screen</h2>
              <p>This is a preview only. Your details have not been saved or sent to WhatsApp yet. Server storage, admin review and WhatsApp notification will be connected in the next development step.</p>
              <button className="primary-button" onClick={() => setSubmitted(false)}>Back to form</button>
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
                <button className="primary-button submit-registration" type="submit">Submit registration <span>→</span></button>
                <p className="privacy-note">Submitting this demo form does not yet send or store your information.</p>
              </form>
            </>
          )}
        </div>
      </section>
      <footer><Link className="brand footer-brand" href="/"><span className="brand-mark">S</span> Smart Deal</Link><span>Made for smarter shopping in Trichy.</span><span>© 2026 Smart Deal</span></footer>
    </main>
  );
}
