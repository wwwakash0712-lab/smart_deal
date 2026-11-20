"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMessage("Login failed. Check your email and password.");
      return;
    }

    router.replace("/admin");
  }

  return (
    <main className="admin-page">
      <div className="admin-card">
        <Link className="brand" href="/"><span className="brand-mark">S</span> Smart Deal</Link>
        <span className="eyebrow">SECURE ADMIN AREA</span>
        <h1>Admin login</h1>
        <p>Sign in with the admin account created in Supabase.</p>
        <form className="admin-form" onSubmit={handleSubmit}>
          <label>Email address<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          {errorMessage && <p className="admin-error" role="alert">{errorMessage}</p>}
          <button className="primary-button" type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in securely"}</button>
        </form>
        <p className="admin-footnote">Only an account explicitly added to the Smart Deal admin list can access shop approvals.</p>
      </div>
    </main>
  );
}
