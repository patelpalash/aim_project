/**
 * Manual source refresh (staging only, nothing is published):
 *   node src/server/scraping/cli.ts --provider aim [--window-days 180] [--dry-run]
 * Requires Node 24+. Only configured providers are accepted; URLs cannot be passed in.
 */
import { fileURLToPath } from "node:url";
import { runAim, saveRun } from "./runner.ts";

const args = process.argv.slice(2);
const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const provider = flag("provider") ?? "aim";
const windowDays = flag("window-days") ? Number(flag("window-days")) : undefined;
if (windowDays !== undefined && (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 366)) {
  console.error("--window-days must be an integer between 1 and 366");
  process.exit(2);
}
if (provider !== "aim") {
  console.error(`Adapter for "${provider}" is not implemented yet (U2). Implemented: aim.`);
  process.exit(2);
}

const result = await runAim({ windowDays });
console.log(`${result.runId}: ${result.status} – ${result.message}`);
console.log(`pages ${result.pages.length}/${result.pageCap}, counts ${JSON.stringify(result.counts)}`);
for (const c of result.candidates)
  console.log(`  [${c.state}/${c.timing}] ${c.offer.id} ${c.offer.startsAt ?? "undated"} ${c.offer.title.de}` +
    (c.issues.length ? `\n      issues: ${c.issues.map(i => `${i.path}: ${i.message}`).join("; ")}` : ""));
if (!args.includes("--dry-run")) console.log(`saved ${fileURLToPath(saveRun(result))}`);
if (result.status === "failed") process.exitCode = 1;
