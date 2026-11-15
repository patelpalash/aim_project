/** Configured provider access (exact host allowlist). Source fetching never accepts arbitrary URLs. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dataRoot } from "../data-root.ts";

export interface ProviderConfig {
  id: string;
  name: string;
  discoveryUrl: string;
  allowedHosts: string[];
  enabled: boolean;
  scraping?: {
    implementationStatus: string;
    permissionStatus: string;
    strategy: string;
    seedUrls: string[];
    windowDays: number;
    maxPagesPerRun: number;
    minRequestIntervalMs: number;
  };
}

/** Resolved from the project root (npm scripts, `next start`); bundlers rewrite import.meta.url URLs. */
export function loadProviders(file: URL | string = join(/*turbopackIgnore: true*/ dataRoot(), "providers.json")): ProviderConfig[] {
  return JSON.parse(readFileSync(/*turbopackIgnore: true*/ file, "utf8")) as ProviderConfig[];
}

export function getProvider(id: string, providers = loadProviders()): ProviderConfig {
  const provider = providers.find(p => p.id === id);
  if (!provider) throw new Error(`Unknown provider "${id}"`);
  if (!provider.enabled) throw new Error(`Provider "${id}" is disabled`);
  return provider;
}

/** True only for HTTPS URLs on one of the provider's exact allowed hosts, without credentials. */
export function isAllowedUrl(provider: ProviderConfig, url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !u.username && !u.password && u.port === "" &&
      provider.allowedHosts.includes(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}
