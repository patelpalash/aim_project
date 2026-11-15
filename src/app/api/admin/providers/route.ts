// Local desk: source configuration (U5). New sources are CSV-only until an adapter exists.
import { getAdminProviders, postAdminProvider } from "../../../../server/review/http.ts";
export const dynamic = "force-dynamic";
export function GET(request: Request): Promise<Response> { return getAdminProviders(request); }
export function POST(request: Request): Promise<Response> { return postAdminProvider(request); }
