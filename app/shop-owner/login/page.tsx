"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ShopOwnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      setError("Login failed. Check your email and password, or ask Smart Deal admin to create your owner account.");
      setBusy(false);
      return;
    }
    router.replace("/shop-owner");
  }

  return (
    <main className="admin-page">
      <div className="admin-card">
        <Link className="brand" href="/"><span className="brand-mark">S</span> Smart Deal</Link>
        <span className="eyebrow">SHOP PARTNER PORTAL</span>
        <h1>Shop owner login</h1>
        <p>Sign in to add and update prices for your approved shop.</p>
        <form className="admin-form" onSubmit={handleLogin}>
          <label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
          <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></label>
          {error && <p className="admin-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={busy}>{busy ? "Signing in..." : "Login"}</button>
        </form>
        <p className="admin-footnote">Owner accounts are created by Smart Deal admin after shop verification.</p>
      </div>
    </main>
  );
}
