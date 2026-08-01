import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Cozy Atelier | Handmade Crochet Goods",
    template: "%s | Cozy Atelier",
  },
  description:
    "Premium handmade crochet apparel, amigurumi toys, blankets, and decor made with natural fibers and gift-ready finishing.",
  keywords: ["handmade crochet", "crochet shop", "amigurumi", "crochet blankets", "artisan gifts"],
  openGraph: {
    title: "Cozy Atelier | Handmade Crochet Goods",
    description:
      "Small-batch crochet goods made with natural fibers, careful finishing, and a slower kind of luxury.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Nav />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
