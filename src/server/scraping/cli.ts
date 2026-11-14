/**
 * Manual source refresh (staging only, nothing is published):
 *   node src/server/scraping/cli.ts --provider aim|experimenta|haus-der-familie|ipai|all [--window-days 180] [--dry-run]
 * Requires Node 24+. Only configured providers are accepted; URLs cannot be passed in.
 */
import { fileURLToPath } from "node:url";
import { ADAPTERS } from "./adapters/index.ts";
import { loadProviders } from "./providers.ts";
import { runProvider, saveRun } from "./runner.ts";

const args = process.argv.slice(2);
const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const requested = flag("provider") ?? "all";
const windowDays = flag("window-days") ? Number(flag("window-days")) : undefined;
if (windowDays !== undefined && (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 366)) {
  console.error("--window-days must be an integer between 1 and 366");
  process.exit(2);
}
const enabled = loadProviders().filter(p => p.enabled).map(p => p.id);
const ids = requested === "all" ? enabled : [requested];
for (const id of ids) {
  if (!enabled.includes(id)) { console.error(`Unknown or disabled provider "${id}". Configured: ${enabled.join(", ")}`); process.exit(2); }
  if (!ADAPTERS[id]) { console.error(`No adapter implemented for "${id}".`); process.exit(2); }
}

let failed = 0;
for (const id of ids) {
  const result = await runProvider(ADAPTERS[id], { windowDays });
  console.log(`\n${result.runId}: ${result.status} – ${result.message}`);
  console.log(`pages ${result.pages.length}/${result.pageCap}, counts ${JSON.stringify(result.counts)}`);
  for (const c of result.candidates)
    console.log(`  [${c.state}/${c.timing}] ${c.offer.id} ${c.offer.startsAt ?? "undated"} ${c.offer.title.de}` +
      (c.issues.length ? `\n      issues: ${c.issues.map(i => `${i.path}: ${i.message}`).join("; ")}` : ""));
  if (!args.includes("--dry-run")) {
    const saved = saveRun(result);
    console.log(saved.latest ? `saved ${fileURLToPath(saved.latest)}` : `run failed; previous ${id}-latest.json kept (attempt logged in ${fileURLToPath(saved.attempt)})`);
  }
  if (result.status === "failed") failed++;
}
if (failed) process.exitCode = 1;
