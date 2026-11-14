import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Atkinson_Hyperlegible, Fredoka } from "next/font/google";
import "@/styles/tokens.css";
import "@/styles/motion.css";
import "@/styles/base.css";
import "@/components/atlas/atlas.css";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-fredoka", display: "swap" });
const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-atkinson", display: "swap" });

export const metadata: Metadata = {
  title: "Interest Atlas",
  description: "Lernangebote in Heilbronn entdecken: KI, Coding und Gaming für Familien."
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f4f7fb" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="de" className={`${fredoka.variable} ${atkinson.variable}`}><body>{children}</body></html>;
}
