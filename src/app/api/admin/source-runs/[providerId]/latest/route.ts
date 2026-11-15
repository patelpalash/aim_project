// Local review desk read (U1): staged source candidates. 404 unless INTEREST_ATLAS_LOCAL_DESK=1.
import { getLatestSourceRun } from "../../../../../../server/catalog/read.ts";

export async function GET(_request: Request, context: { params: Promise<{ providerId: string }> }): Promise<Response> {
  const { providerId } = await context.params;
  return getLatestSourceRun(providerId, undefined, _request);
}
