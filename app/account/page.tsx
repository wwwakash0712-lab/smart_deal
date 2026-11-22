"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import CustomerNav from "../components/CustomerNav";

const TRICHY_AREAS = [
  "Allithurai", "Ariyamangalam", "Airport", "Anna Nagar", "Cantonment", "Chatram Bus Stand",
  "Crawford", "Edamalaipatti Pudur", "KK Nagar", "Kattur", "Kumaran Nagar", "Palakarai",
  "Puthur", "Srirangam", "Subramaniapuram", "Samayapuram", "Tennur", "Thillai Nagar",
  "Thiruvanaikoil", "Thiruverumbur", "TVS Tollgate", "Woraiyur",
];

type AccountUser = {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; phone?: string; area?: string };
};

export default function CustomerAccountPage() {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [user, setUser] = useState<AccountUser | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        const current = data.session?.user as AccountUser | undefined;
        setUser(current ?? null);
        if (current) {
          setFullName(current.user_metadata?.full_name ?? "");
          setPhone(current.user_metadata?.phone ?? "");
          setArea(current.user_metadata?.area ?? "");
        }
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const current = session?.user as AccountUser | undefined;
      setUser(current ?? null);
      if (current) {
        setFullName(current.user_metadata?.full_name ?? "");
        setPhone(current.user_metadata?.phone ?? "");
        setArea(current.user_metadata?.area ?? "");
      }
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
        options: { data: { full_name: fullName.trim(), phone: phone.trim(), area: area.trim() } },
      });
      if (authError) {
        setError(authError.message);
      } else if (data.session) {
        setUser(data.session.user as AccountUser);
        setNotice("Your Smart Deal account is ready. Your profile details are saved.");
        setPassword("");
      } else {
        setNotice("Signup successful. Check your email for the confirmation link, then log in.");
        setMode("login");
        setPassword("");
      }
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (authError) setError("Login failed. Check your email and password.");
      else {
        setNotice("Login successful. Welcome back!");
        setPassword("");
      }
    }
    setBusy(false);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const { data, error: updateError } = await supabase.auth.updateUser({
      data: { full_name: fullName.trim(), phone: phone.trim(), area: area.trim() },
    });
    setBusy(false);
    if (updateError) setError("Could not update your profile. Please try again.");
    else {
      setUser(data.user as AccountUser);
      setNotice("Your profile has been updated successfully.");
    }
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
          <h1>{user ? "Your profile" : mode === "signup" ? "Create your account" : "Welcome back"}</h1>
          <p>{user ? "Manage your details and keep your shopping experience connected." : "Create an account to save your shopping list and find better local deals."}</p>
        </div>

        <div className="account-card">
          {user ? (
            <>
              <div className="account-signed-in">
                <div className="account-avatar">{(fullName.trim()[0] || user.email?.[0] || "✓").toUpperCase()}</div>
                <h2>Customer profile</h2>
                <p className="account-email">{user.email}</p>
              </div>
              <form className="account-form" onSubmit={saveProfile}>
                <label>Full name
                  <input name="full_name" autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter your full name" required />
                </label>
                <label>Mobile number
                  <input name="phone" type="tel" autoComplete="tel" inputMode="tel" pattern="[0-9+() -]{8,18}" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Enter mobile number" />
                </label>
                <label>Your area
                  <select name="area" value={TRICHY_AREAS.includes(area) ? area : area ? "Other" : ""} onChange={e => setArea(e.target.value === "Other" ? "" : e.target.value)}>
                    <option value="">Select your area</option>
                    {TRICHY_AREAS.map(item => <option key={item} value={item}>{item}</option>)}
                    <option value="Other">Other area</option>
                  </select>
                  {!TRICHY_AREAS.includes(area) && <input name="custom_area" autoComplete="address-level2" value={area} onChange={e => setArea(e.target.value)} placeholder="Type your area / locality" />}
                </label>
                {notice && <p className="admin-success" role="status">{notice}</p>}
                {error && <p className="admin-error" role="alert">{error}</p>}
                <button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving..." : "Save profile"}</button>
              </form>
              <div className="account-actions">
                <Link className="primary-button" href="/shopping-list">Open my shopping list</Link>
                <button className="outline-button" type="button" onClick={handleLogout} disabled={busy}>{busy ? "Please wait..." : "Log out"}</button>
              </div>
            </>
          ) : (
            <>
              <div className="account-tabs">
                <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(""); setNotice(""); }}>Sign up</button>
                <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); setNotice(""); }}>Log in</button>
              </div>
              <form className="account-form" onSubmit={handleSubmit}>
                {mode === "signup" && <>
                  <label>Full name
                    <input name="full_name" autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter your full name" required />
                  </label>
                  <label>Mobile number
                    <input name="phone" type="tel" autoComplete="tel" inputMode="tel" pattern="[0-9+() -]{8,18}" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Enter mobile number" />
                  </label>
                  <label>Your area
                    <select name="area" value={TRICHY_AREAS.includes(area) ? area : area ? "Other" : ""} onChange={e => setArea(e.target.value === "Other" ? "" : e.target.value)}>
                    <option value="">Select your area</option>
                    {TRICHY_AREAS.map(item => <option key={item} value={item}>{item}</option>)}
                    <option value="Other">Other area</option>
                  </select>
                  {!TRICHY_AREAS.includes(area) && <input name="custom_area" autoComplete="address-level2" value={area} onChange={e => setArea(e.target.value)} placeholder="Type your area / locality" />}
                  </label>
                </>}
                <label>Email address
                  <input type="email" name="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </label>
                <label>Password
                  <input type="password" name="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} value={password} onChange={e => setPassword(e.target.value)} required />
                </label>
                {mode === "signup" && <p className="account-hint">Your name, mobile number and area will be saved in your Smart Deal profile. Use at least 6 characters for your password.</p>}
                {error && <p className="admin-error" role="alert">{error}</p>}
                {notice && <p className="admin-success" role="status">{notice}</p>}
                <button className="primary-button" type="submit" disabled={busy}>{busy ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}</button>
              </form>
              <p className="account-switch">{mode === "signup" ? "Already have an account?" : "New to Smart Deal?"} <button type="button" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); setNotice(""); }}>{mode === "signup" ? "Log in" : "Create account"}</button></p>
            </>
          )}
        </div>
      </section>
      <footer><Link className="brand footer-brand" href="/"><span className="brand-mark">S</span> Smart Deal</Link><span>Made for smarter shopping in Trichy.</span><span>© 2026 Smart Deal</span></footer>
    </main>
  );
}
