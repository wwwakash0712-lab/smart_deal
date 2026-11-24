import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Deal | Trichy",
  description: "Compare grocery and daily-essentials prices from approved local shops in Tiruchirappalli. Find better deals and plan your shopping basket.",
  applicationName: "Smart Deal",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}