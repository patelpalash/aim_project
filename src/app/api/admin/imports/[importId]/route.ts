// Local desk: current review session (U4).
import { getImport } from "../../../../../server/review/http.ts";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ importId: string }> }): Promise<Response> {
  const { importId } = await context.params;
  return getImport(importId, _request);
}
