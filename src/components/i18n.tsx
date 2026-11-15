"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Locale } from "@/shared/contracts";
import { DEFAULT_LOCALE, LOCALE_NAME, LOCALES, isLocale } from "@/shared/i18n";
import { STRINGS, type StringKey } from "./strings";

const STORAGE_KEY = "atlas.locale";

export type Translate = (key: StringKey, vars?: Record<string, string | number>) => string;

interface LocaleValue { locale: Locale; setLocale: (next: Locale) => void; t: Translate }

const LocaleContext = createContext<LocaleValue | null>(null);

function format(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (all, name: string) => (name in vars ? String(vars[name]) : all));
}

/**
 * Language context for the whole site (German and English). German is the source language and the
 * fallback: a string without an English translation shows its German text rather than a key.
 * The choice is a per-visitor preference, kept in this browser only, like every other session state.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const explicitlyChosen = useRef(false);

  useEffect(() => {
    if (explicitlyChosen.current) return;
    let stored: string | null = null;
    try { stored = window.localStorage.getItem(STORAGE_KEY); } catch { stored = null; }
    if (isLocale(stored)) { setLocaleState(stored); return; }
    const browser = window.navigator.language?.slice(0, 2).toLowerCase();
    if (browser === "en") setLocaleState("en");
  }, []);

  useEffect(() => { document.documentElement.lang = locale; }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    explicitlyChosen.current = true;
    document.documentElement.lang = next;
    setLocaleState(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* a blocked store only loses the preference */ }
  }, []);

  const value = useMemo<LocaleValue>(() => ({
    locale,
    setLocale,
    t: (key, vars) => format(STRINGS[key]?.[locale] ?? STRINGS[key]?.de ?? key, vars)
  }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Locale and translator. Outside a provider it answers in German, so a component never crashes. */
export function useLocale(): LocaleValue {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;
  return {
    locale: DEFAULT_LOCALE,
    setLocale: () => undefined,
    t: (key, vars) => format(STRINGS[key]?.de ?? key, vars)
  };
}

/** Language switch. Two explicit buttons, so the current language is always visible. */
export function LanguageSwitch({ className = "dz-view dz-lang" }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();
  return (
    <div className={className} role="group" aria-label={t("lang.label")}>
      {LOCALES.map(l => (
        <button key={l} type="button" aria-pressed={locale === l} lang={l}
          title={LOCALE_NAME[l]} onClick={() => setLocale(l)}>
          {l === "de" ? "DE" : "EN"}
        </button>
      ))}
    </div>
  );
}
