"use client";
import { useLocale } from "./i18n";

export function BrandLogo() {
  const { locale } = useLocale();
  return <a className="brand-logo" href="/" aria-label="Interest Atlas"><img src="/brand/atlas-mark.svg" width="44" height="44" alt="" /><span>Interest Atlas<small>{locale === "de" ? "Deine nächste Entdeckung." : "Your next discovery."}</small></span></a>;
}
