// Public provider list (PALASH-002): enabled configured providers only.
import { getProviders } from "../../../server/catalog/read.ts";

export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  return getProviders(request);
}
