// Local desk: repeatable demo reset (U5).
import { postReset } from "../../../../server/review/http.ts";
export const dynamic = "force-dynamic";
export function POST(request: Request): Promise<Response> { return postReset(request); }
