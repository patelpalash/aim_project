// Hosted demo sign-in: shared password -> signed HttpOnly SameSite=Strict cookie (8 h).
import { login } from "../../../../server/admin-auth.ts";
export const dynamic = "force-dynamic";
export function POST(request: Request): Promise<Response> { return login(request); }
