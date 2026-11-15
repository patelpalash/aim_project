// Sign out of the hosted demo desk (clears the cookie).
import { logout } from "../../../../server/admin-auth.ts";
export const dynamic = "force-dynamic";
export function POST(request: Request): Response { return logout(request); }
