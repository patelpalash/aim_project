import type { Locale, LocalizedText } from "./contracts.ts";

export const LOCALES: readonly Locale[] = ["de", "en"];
export const DEFAULT_LOCALE: Locale = "de";
export const LOCALE_NAME: Record<Locale, string> = { de: "Deutsch", en: "English" };

/** Picks the requested language of a localized record, falling back to German (the source language). */
export function pick(text: LocalizedText | undefined | null, locale: Locale): string {
  if (!text) return "";
  const value = locale === "en" ? text.en : text.de;
  return (value && value.trim()) || text.de || "";
}

export function isLocale(value: unknown): value is Locale {
  return value === "de" || value === "en";
}
