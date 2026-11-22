"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/shops", label: "Find shops" },
  { href: "/compare", label: "Compare prices" },
  { href: "/shopping-list", label: "My list" },
  { href: "/account", label: "Account" },
];

export default function CustomerNav() {
  const pathname = usePathname();
  return (
    <header className="topbar customer-topbar">
      <Link className="brand" href="/"><span className="brand-mark">S</span> Smart Deal</Link>
      <nav className="customer-nav">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={pathname === link.href || (link.href === "/account" && pathname.startsWith("/account")) ? "active" : ""}>{link.label}</Link>
        ))}
      </nav>
    </header>
  );
}
