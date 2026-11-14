import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Interest Atlas",
  description: "Lernangebote in Heilbronn entdecken: KI, Coding und Gaming für Familien."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="de"><body>{children}</body></html>;
}
