import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "@/styles/tokens.css";
import "@/styles/motion.css";
import "@/styles/base.css";
import "@/components/atlas/atlas.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Interest Atlas",
  description: "Lernangebote in Heilbronn entdecken: KI, Coding und Gaming für Familien."
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#090d1a" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="de" className={`${bricolage.variable} ${inter.variable}`}><body>{children}</body></html>;
}
