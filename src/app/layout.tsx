import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { PRODUCT } from "@/lib/product";
import "./globals.css";

// Figtree — теплий гуманістичний гротеск (DESIGN.md, розділ 3); час і дати — його табличні цифри (tabular-nums).
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: PRODUCT.name,
  description: PRODUCT.tagline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
