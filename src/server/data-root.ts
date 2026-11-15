/**
 * One place that decides where the app's data files live.
 *
 * - Normally: `<project root>/data` (the committed files).
 * - Password-protected hosted demo on a read-only platform (Vercel): a writable copy in
 *   `/tmp/interest-atlas-data`, seeded once per server instance from the committed files.
 *   Changes there are temporary: they disappear on redeploy or when the instance is recycled,
 *   and separate instances do not share them. The organizer UI says so.
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export const TEMP_DATA_DIR = "/tmp/interest-atlas-data";

/** True when the admin desk runs as a hosted demo on a platform whose project files are read-only. */
export function usesTemporaryData(): boolean {
  return process.env.INTEREST_ATLAS_LOCAL_DESK !== "1" && !!adminPassword() && process.env.VERCEL === "1";
}

/** Shared admin password for the hosted demo; ignored unless it is at least 8 characters. */
export function adminPassword(): string | null {
  const value = process.env.INTEREST_ATLAS_ADMIN_PASSWORD ?? "";
  return value.length >= 8 ? value : null;
}

let seeded = false;

/** Absolute path of the data directory to read and write. */
export function dataRoot(): string {
  const committed = join(process.cwd(), "data");
  if (!usesTemporaryData()) return committed;
  if (!seeded) {
    if (!existsSync(/*turbopackIgnore: true*/ join(/*turbopackIgnore: true*/ TEMP_DATA_DIR, "providers.json"))) {
      mkdirSync(/*turbopackIgnore: true*/ TEMP_DATA_DIR, { recursive: true });
      cpSync(committed, /*turbopackIgnore: true*/ TEMP_DATA_DIR, { recursive: true });
    }
    seeded = true;
  }
  return TEMP_DATA_DIR;
}
