// Local desk: CSV upload -> review session (U3/U4).
import { postUpload } from "../../../../server/review/http.ts";
export const dynamic = "force-dynamic";
export function POST(request: Request): Promise<Response> { return postUpload(request); }
