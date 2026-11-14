// Local desk: source refresh status (U5).
import { getScrapeRun } from "../../../../../server/review/http.ts";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ runId: string }> }): Promise<Response> {
  const { runId } = await context.params;
  return getScrapeRun(runId);
}
