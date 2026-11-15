// Desk access status: mode (local/password/disabled), whether this browser is signed in, storage kind.
import { sessionStatus } from "../../../../server/admin-auth.ts";
export const dynamic = "force-dynamic";
export function GET(request: Request): Response { return sessionStatus(request); }
