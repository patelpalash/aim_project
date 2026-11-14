import type { Metadata } from "next";
import { StyleGuide } from "@/components/atlas/StyleGuide";

export const metadata: Metadata = { title: "Werkbank-Stil · Interest Atlas", robots: { index: false } };

/** Living style guide for task I1: tokens, components and motion in one place. */
export default function DesignPage() {
  return <StyleGuide />;
}
