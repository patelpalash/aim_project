import seed from "../../data/taxonomy.json" with { type: "json" };
import type { Issue, Taxonomy } from "./contracts.ts";
import { isId, isRecord, nonempty } from "./validation.ts";

export function validateTaxonomy(input: unknown): { ok: true; taxonomy: Taxonomy } | { ok: false; issues: Issue[] } {
  const issues: Issue[] = [];
  if (!isRecord(input)) return { ok: false, issues: [{ path: "$", message: "Expected taxonomy configuration" }] };
  if (!Number.isSafeInteger(input.version) || Number(input.version) < 1) issues.push({ path: "version", message: "Expected positive configuration version" });
  const ids = { topics: new Set<string>(), interests: new Set<string>() };
  for (const key of ["topics", "interests"] as const) {
    const entries = input[key];
    if (!Array.isArray(entries) || !entries.length || entries.length > 100) {
      issues.push({ path: key, message: "Expected 1-100 definitions" });
      continue;
    }
    entries.forEach((entry, index) => {
      const path = `${key}[${index}]`;
      if (!isRecord(entry)) { issues.push({ path, message: "Expected definition object" }); return; }
      if (!isId(entry.id) || ids[key].has(entry.id)) issues.push({ path: `${path}.id`, message: "Expected unique lowercase ID" });
      else ids[key].add(entry.id);
      if (!isRecord(entry.label) || !nonempty(entry.label.de) || !nonempty(entry.label.en) ||
          String(entry.label.de).length > 160 || String(entry.label.en).length > 160)
        issues.push({ path: `${path}.label`, message: "Expected short German and English labels" });
      if (typeof entry.enabled !== "boolean") issues.push({ path: `${path}.enabled`, message: "Expected boolean" });
    });
  }
  if (Array.isArray(input.interests)) input.interests.forEach((entry, index) => {
    if (!isRecord(entry)) return;
    if (!Array.isArray(entry.topicIds) || !entry.topicIds.length || entry.topicIds.some(id => typeof id !== "string" || !ids.topics.has(id)) ||
        new Set(entry.topicIds).size !== entry.topicIds.length)
      issues.push({ path: `interests[${index}].topicIds`, message: "Expected unique configured topic IDs" });
  });
  return issues.length ? { ok: false, issues } : { ok: true, taxonomy: structuredClone(input) as unknown as Taxonomy };
}

const parsedSeed = validateTaxonomy(seed);
if (!parsedSeed.ok) throw new Error("Invalid default taxonomy configuration");
/** Static fallback only. Server changes pass their current configuration explicitly. */
export const DEFAULT_TAXONOMY: Taxonomy = parsedSeed.taxonomy;
export const getActiveTopics = (taxonomy = DEFAULT_TAXONOMY) => taxonomy.topics.filter(topic => topic.enabled);
export const getActiveInterests = (taxonomy = DEFAULT_TAXONOMY) => taxonomy.interests.filter(interest => interest.enabled);
