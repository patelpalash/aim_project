// Public taxonomy configuration (PALASH-002). Validated data/taxonomy.json.
import { getTaxonomy } from "../../../server/catalog/read.ts";

export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  return getTaxonomy(request);
}
