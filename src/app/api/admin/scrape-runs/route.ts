// Local desk: start a bounded source refresh; poll /api/admin/scrape-runs/:runId (U5).
import { postScrapeRun } from "../../../../server/review/http.ts";
export const dynamic = "force-dynamic";
export function POST(request: Request): Promise<Response> { return postScrapeRun(request); }
