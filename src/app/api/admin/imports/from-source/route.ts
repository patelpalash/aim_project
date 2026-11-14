// Local desk: stage the latest stored source run into a review session (U4).
import { postImportFromSource } from "../../../../../server/review/http.ts";
export const dynamic = "force-dynamic";
export function POST(request: Request): Promise<Response> { return postImportFromSource(request); }
