import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/i18n";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "@/styles/tokens.css";
import "@/styles/motion.css";
import "@/styles/base.css";
import "@/components/atlas/atlas.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  other: { google: "notranslate" },
  title: "Interest Atlas",
  description: "Lernangebote in Heilbronn entdecken: KI, Coding und Gaming für Familien. — Discover learning activities in Heilbronn: AI, coding and gaming for families."
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#fbf7ef" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // `lang` starts at the source language and is set to the visitor's choice by LocaleProvider.
  return <html lang="de" translate="no" className={`${jakarta.variable} ${inter.variable}`}><body><LocaleProvider>{children}</LocaleProvider></body></html>;
}
