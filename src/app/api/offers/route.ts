// Public catalogue read (U1). Approved, non-cancelled, not-ended offers only; no search params.
import { getOffers } from "../../../server/catalog/read.ts";

export function GET(request: Request): Response {
  return getOffers(request);
}
