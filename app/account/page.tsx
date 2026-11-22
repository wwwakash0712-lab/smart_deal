"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import CustomerNav from "../components/CustomerNav";

type AccountUser = { email?: string };

export default function CustomerAccountPage() {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [user, setUser] = useState<AccountUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setUser(data.session?.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const cleanEmail = email.trim().toLowerCase();

    if (mode === "signup") {
      const { data, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });
      if (authError) {
        setError(authError.message);
      } else if (data.session) {
        setNotice("Your Smart Deal account is ready. You are signed in.");
        setPassword("");
      } else {
        setNotice("Signup successful. Check your email for the confirmation link, then log in.");
        setMode("login");
        setPassword("");
      }
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (authError) setError("Login failed. Check your email and password.");
      else {
        setNotice("Login successful. Welcome back!");
        setPassword("");
      }
    }
    setBusy(false);
  }

  async function handleLogout() {
    setBusy(true);
    const { error: authError } = await supabase.auth.signOut();
    setBusy(false);
    if (authError) setError("Could not log out. Please try again.");
    else setNotice("You have been logged out.");
  }

  return (
    <main className="customer-page">
      <CustomerNav />
      <section className="page-shell account-shell">
        <div className="page-heading">
          <span className="eyebrow">YOUR SMART DEAL ACCOUNT</span>
          <h1>{user ? "Your account" : mode === "signup" ? "Create your account" : "Welcome back"}</h1>
          <p>Sign in to Smart Deal to keep your shopping experience connected.</p>
        </div>

        <div className="account-card">
          {user ? (
            <div className="account-signed-in">
              <div className="account-avatar">✓</div>
              <h2>You are signed in</h2>
              <p className="account-email">{user.email}</p>
              <p>Your customer account is active.</p>
              <div className="account-actions">
                <Link className="primary-button" href="/shopping-list">Open my shopping list</Link>
                <button className="outline-button" type="button" onClick={handleLogout} disabled={busy}>{busy ? "Logging out..." : "Log out"}</button>
              </div>
            </div>
          ) : (
            <>
              <div className="account-tabs">
                <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(""); setNotice(""); }}>Sign up</button>
                <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); setNotice(""); }}>Log in</button>
              </div>
              <form className="account-form" onSubmit={handleSubmit}>
                <label>Email address
                  <input type="email" name="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </label>
                <label>Password
                  <input type="password" name="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} value={password} onChange={e => setPassword(e.target.value)} required />
                </label>
                {mode === "signup" && <p className="account-hint">Use at least 6 characters. If email confirmation is enabled, check your inbox after signup.</p>}
                {error && <p className="admin-error" role="alert">{error}</p>}
                {notice && <p className="admin-success" role="status">{notice}</p>}
                <button className="primary-button" type="submit" disabled={busy}>{busy ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}</button>
              </form>
              <p className="account-switch">{mode === "signup" ? "Already have an account?" : "New to Smart Deal?"} <button type="button" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); setNotice(""); }}>{mode === "signup" ? "Log in" : "Create account"}</button></p>
            </>
          )}
          {notice && user && <p className="admin-success" role="status">{notice}</p>}
          {error && user && <p className="admin-error" role="alert">{error}</p>}
        </div>
      </section>
      <footer><Link className="brand footer-brand" href="/"><span className="brand-mark">S</span> Smart Deal</Link><span>Made for smarter shopping in Trichy.</span><span>© 2026 Smart Deal</span></footer>
    </main>
  );
}
