import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "@/styles/tokens.css";
import "@/styles/motion.css";
import "@/styles/base.css";
import "@/components/atlas/atlas.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Interest Atlas",
  description: "Lernangebote in Heilbronn entdecken: KI, Coding und Gaming für Familien."
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="de" className={`${jakarta.variable} ${inter.variable}`}><body>{children}</body></html>;
}
