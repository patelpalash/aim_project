import type { AgeEvidenceKind, Issue, Offer } from "./contracts.ts";
import { isRecord, nonempty } from "./validation.ts";

export function getAgeEvidenceKind(offer: Pick<Offer, "minAge" | "maxAge" | "ageEvidence">): AgeEvidenceKind {
  return offer.ageEvidence?.kind ?? (offer.minAge !== null && offer.maxAge !== null ? "range" : "unknown");
}

export function ageEvidenceIssues(input: Record<string, unknown>): Issue[] {
  if (input.ageEvidence === undefined) return [];
  const evidence = input.ageEvidence;
  if (!isRecord(evidence)) return [{ path: "ageEvidence", message: "Expected age evidence object" }];
  const issues: Issue[] = [];
  const min = input.minAge, max = input.maxAge;
  const kinds = ["range", "minimum-only", "maximum-only", "all-ages", "unknown"];
  if (!kinds.includes(String(evidence.kind))) issues.push({ path: "ageEvidence.kind", message: "Unknown age evidence kind" });
  else {
    const valid = evidence.kind === "range" ? typeof min === "number" && typeof max === "number" :
      evidence.kind === "minimum-only" ? typeof min === "number" && max === null :
      evidence.kind === "maximum-only" ? min === null && typeof max === "number" : min === null && max === null;
    if (!valid) issues.push({ path: "ageEvidence", message: "Published bounds must agree with evidence kind" });
  }
  if (evidence.text !== undefined && (!nonempty(evidence.text) || String(evidence.text).length > 500))
    issues.push({ path: "ageEvidence.text", message: "Expected concise original age wording" });
  return issues;
}

/** Unknown bounds never become an inferred age range. */
export function getAgeSuitability(offer: Pick<Offer, "minAge" | "maxAge" | "ageEvidence">, age: number): "suitable" | "outside-range" | "unknown" {
  if (!Number.isInteger(age) || age < 0 || age > 120) throw new RangeError("Invalid age");
  const kind = getAgeEvidenceKind(offer);
  if (kind === "unknown") return "unknown";
  if (kind === "all-ages") return "suitable";
  if (offer.minAge !== null && age < offer.minAge) return "outside-range";
  if (offer.maxAge !== null && age > offer.maxAge) return "outside-range";
  return "suitable";
}
