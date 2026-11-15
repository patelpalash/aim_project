/**
 * U5: configuration maintenance for a nontechnical organizer (PDF expansion requirement).
 * - Themes/interests: add, relabel, enable/disable. Existing IDs are never deleted or renamed,
 *   so published offers keep validating. Every change bumps the taxonomy version.
 * - Sources: edit name/discovery link, enable/disable, or add a new institution as CSV-only.
 *   A new provider has no scraper ("no-adapter"): a new website structure needs development.
 *   Scraping scope (allowed hosts/seed URLs) of an existing provider cannot be widened here.
 * All writes are atomic, validated with the shared validators, and only via local desk routes.
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Issue, Taxonomy } from "../../shared/contracts.ts";
import { validateTaxonomy } from "../../shared/taxonomy.ts";
import { validateProvidersResponse } from "../../shared/api-contract.ts";
import type { ProviderConfig } from "../scraping/providers.ts";
import { dataRoot } from "../data-root.ts";

export class ConfigChangeError extends Error {
  readonly issues: Issue[];
  constructor(message: string, issues: Issue[] = []) { super(message); this.issues = issues; }
}

const dataDir = (dir?: string) => dir ?? dataRoot();
function writeAtomic(file: string, body: unknown) {
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(/*turbopackIgnore: true*/ tmp, `${JSON.stringify(body, null, 2)}\n`, "utf8");
  renameSync(/*turbopackIgnore: true*/ tmp, file);
}
const readJson = <T>(file: string): T => JSON.parse(readFileSync(/*turbopackIgnore: true*/ file, "utf8")) as T;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const label = (v: unknown): v is { de: string; en: string } =>
  !!v && typeof v === "object" && typeof (v as { de?: unknown }).de === "string" && typeof (v as { en?: unknown }).en === "string" &&
  (v as { de: string }).de.trim().length > 0 && (v as { en: string }).en.trim().length > 0 &&
  (v as { de: string }).de.length <= 160 && (v as { en: string }).en.length <= 160;

export interface TopicChange { kind: "topic" | "interest"; id: string; label?: { de: string; en: string }; enabled?: boolean; topicIds?: string[] }

export function changeTaxonomy(input: unknown, dir?: string): Taxonomy {
  const file = join(dataDir(dir), "taxonomy.json");
  const current = validateTaxonomy(readJson(file));
  if (!current.ok) throw new ConfigChangeError("Current taxonomy is invalid; fix data/taxonomy.json first.", current.issues);
  const c = input as Partial<TopicChange>;
  if (!c || (c.kind !== "topic" && c.kind !== "interest") || typeof c.id !== "string" || !ID.test(c.id) || c.id.length > 40)
    throw new ConfigChangeError("Expected { kind: \"topic\" | \"interest\", id: lowercase-id, ... }.");
  if (c.label !== undefined && !label(c.label)) throw new ConfigChangeError("Label needs short German and English text.");
  if (c.enabled !== undefined && typeof c.enabled !== "boolean") throw new ConfigChangeError("enabled must be true or false.");
  const next = structuredClone(current.taxonomy);
  if (c.kind === "topic") {
    const existing = next.topics.find(t => t.id === c.id);
    if (existing) { if (c.label) existing.label = c.label; if (c.enabled !== undefined) existing.enabled = c.enabled; }
    else {
      if (!c.label) throw new ConfigChangeError("A new theme needs a German and English label.");
      next.topics.push({ id: c.id, label: c.label, enabled: c.enabled ?? true });
    }
  } else {
    const existing = next.interests.find(t => t.id === c.id);
    if (c.topicIds !== undefined && (!Array.isArray(c.topicIds) || !c.topicIds.length || c.topicIds.some(t => typeof t !== "string")))
      throw new ConfigChangeError("topicIds must list at least one theme ID.");
    if (existing) {
      if (c.label) existing.label = c.label;
      if (c.enabled !== undefined) existing.enabled = c.enabled;
      if (c.topicIds) existing.topicIds = [...new Set(c.topicIds)];
    } else {
      if (!c.label || !c.topicIds) throw new ConfigChangeError("A new interest needs a label and at least one theme.");
      next.interests.push({ id: c.id, label: c.label, topicIds: [...new Set(c.topicIds)], enabled: c.enabled ?? true });
    }
  }
  next.version = current.taxonomy.version + 1;
  const valid = validateTaxonomy(next);
  if (!valid.ok) throw new ConfigChangeError("The change would make the taxonomy invalid.", valid.issues);
  writeAtomic(file, valid.taxonomy);
  return valid.taxonomy;
}

export interface ProviderView {
  id: string; name: string; discoveryUrl: string; enabled: boolean; allowedHosts: string[];
  importMode: string; adapter: "implemented" | "none"; permissionStatus: string | null; strategy: string | null;
}

export function providerViews(implemented: readonly string[], dir?: string): ProviderView[] {
  const list = readJson<(ProviderConfig & { importMode?: string })[]>(join(dataDir(dir), "providers.json"));
  return list.map(p => ({
    id: p.id, name: p.name, discoveryUrl: p.discoveryUrl, enabled: p.enabled, allowedHosts: p.allowedHosts,
    importMode: p.importMode ?? "csv-only", adapter: implemented.includes(p.id) ? "implemented" : "none",
    permissionStatus: p.scraping?.permissionStatus ?? null, strategy: p.scraping?.strategy ?? null,
  }));
}

export interface ProviderChange { id: string; name?: string; discoveryUrl?: string; enabled?: boolean; allowedHosts?: string[] }

export function changeProvider(input: unknown, dir?: string): { provider: ProviderView; created: boolean } {
  const file = join(dataDir(dir), "providers.json");
  const list = readJson<(ProviderConfig & { importMode?: string })[]>(file);
  const c = input as Partial<ProviderChange>;
  if (!c || typeof c.id !== "string" || !ID.test(c.id) || c.id.length > 40) throw new ConfigChangeError("Expected a lowercase provider id.");
  if (c.name !== undefined && (typeof c.name !== "string" || !c.name.trim() || c.name.length > 120)) throw new ConfigChangeError("Name must be 1–120 characters.");
  if (c.enabled !== undefined && typeof c.enabled !== "boolean") throw new ConfigChangeError("enabled must be true or false.");
  let url: URL | null = null;
  if (c.discoveryUrl !== undefined) {
    try { url = new URL(c.discoveryUrl); } catch { throw new ConfigChangeError("discoveryUrl must be a full https:// link."); }
    if (url.protocol !== "https:" || url.username || url.password || url.port) throw new ConfigChangeError("discoveryUrl must be a plain https:// link.");
  }
  const existing = list.find(p => p.id === c.id);
  let created = false;
  if (existing) {
    if (c.allowedHosts !== undefined && JSON.stringify([...c.allowedHosts].sort()) !== JSON.stringify([...existing.allowedHosts].sort()))
      throw new ConfigChangeError("Allowed hosts of an existing source cannot be changed here (that would change scraping scope).");
    if (url && !existing.allowedHosts.includes(url.hostname)) throw new ConfigChangeError(`The link must stay on ${existing.allowedHosts.join(" or ")}.`);
    if (c.name !== undefined) existing.name = c.name.trim();
    if (url) existing.discoveryUrl = url.toString();
    if (c.enabled !== undefined) existing.enabled = c.enabled;
  } else {
    if (!c.name || !url) throw new ConfigChangeError("A new source needs a name and an https:// discovery link.");
    const hosts = c.allowedHosts?.length ? c.allowedHosts : [url.hostname];
    if (hosts.some(h => typeof h !== "string" || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(h)) || !hosts.includes(url.hostname))
      throw new ConfigChangeError("allowedHosts must be plain host names and include the discovery link's host.");
    list.push({ id: c.id, name: c.name.trim(), discoveryUrl: url.toString(), allowedHosts: hosts, importMode: "csv-only", enabled: c.enabled ?? true } as ProviderConfig & { importMode: string });
    created = true;
  }
  const check = validateProvidersResponse({ schemaVersion: 1, providers: list.map(p => ({ id: p.id, name: p.name, discoveryUrl: p.discoveryUrl })) });
  if (!check.ok) throw new ConfigChangeError("The change would make the provider list invalid.", check.issues);
  writeAtomic(file, list);
  const view = providerViews([], dir).find(p => p.id === c.id)!;
  return { provider: view, created };
}

/** Synthetic demand examples per interest for the demo gap panel; never real counts. */
export function readDemoGapSeeds(dir?: string): Record<string, number> {
  const file = join(dataDir(dir), "demo-gap-requests.json");
  if (!existsSync(/*turbopackIgnore: true*/ file)) return {};
  const raw = readJson<{ synthetic: boolean; exampleRequests: Record<string, number> }>(file);
  return raw.synthetic === true ? raw.exampleRequests : {};
}
