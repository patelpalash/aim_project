// Local desk: publish selected eligible rows (U4).
import { postApprove } from "../../../../../../server/review/http.ts";
export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ importId: string }> }): Promise<Response> {
  const { importId } = await context.params;
  return postApprove(request, importId);
}
