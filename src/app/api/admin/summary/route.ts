// Local desk: catalogue version, source statuses, synthetic demo gaps (U5).
import { getSummary } from "../../../../server/review/http.ts";
export const dynamic = "force-dynamic";
export function GET(): Promise<Response> { return getSummary(); }
