// Local desk: CSV template download (U3).
import { getImportTemplate } from "../../../../server/review/http.ts";
export const dynamic = "force-dynamic";
export function GET(): Promise<Response> { return getImportTemplate(); }
