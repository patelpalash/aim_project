// Public catalogue read (U1/PALASH-002). Approved, non-cancelled, not-past offers only; no search params.
import { getOffers } from "../../../server/catalog/read.ts";

export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  return getOffers(request);
}
