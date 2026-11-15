import type { SearchFilters } from "@/shared/contracts";
import { getBerlinDate } from "@/shared/schedule";

/** Time shortcuts. Local YYYY-MM-DD bounds cover the whole Berlin day (shared schedule rules). */
export type When = "soon" | "today" | "weekend" | "all";
export const WHENS: readonly When[] = ["soon", "today", "weekend", "all"];

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + n)).toISOString().slice(0, 10);
}

export function whenPatch(when: When, now = new Date()): Pick<SearchFilters, "schedule" | "dateFrom" | "dateTo"> {
  const today = getBerlinDate(now);
  if (when === "soon") return { schedule: "upcoming", dateFrom: undefined, dateTo: undefined };
  if (when === "all") return { schedule: "all", dateFrom: undefined, dateTo: undefined };
  if (when === "today") return { schedule: "all", dateFrom: today, dateTo: today };
  const [y, m, d] = today.split("-").map(Number);
  const dow = new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay(); // 0 = Sunday
  const from = dow === 0 || dow === 6 ? today : addDays(today, 6 - dow);
  const to = dow === 0 ? today : addDays(today, 7 - dow);
  return { schedule: "all", dateFrom: from, dateTo: to };
}
