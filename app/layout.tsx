import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Deal | Trichy",
  description: "Compare local shop prices for groceries and daily essentials in Trichy.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}