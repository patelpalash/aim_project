// Local desk: theme/interest maintenance (U5). IDs are never deleted; disable instead.
import { getTopics, postTopic } from "../../../../server/review/http.ts";
export const dynamic = "force-dynamic";
export function GET(): Promise<Response> { return getTopics(); }
export function POST(request: Request): Promise<Response> { return postTopic(request); }
