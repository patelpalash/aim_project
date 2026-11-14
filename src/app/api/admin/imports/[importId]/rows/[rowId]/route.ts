// Local desk: inline correction of one row (U4).
import { patchImportRow } from "../../../../../../../server/review/http.ts";
export const dynamic = "force-dynamic";
export async function PATCH(request: Request, context: { params: Promise<{ importId: string; rowId: string }> }): Promise<Response> {
  const { importId, rowId } = await context.params;
  return patchImportRow(request, importId, rowId);
}
