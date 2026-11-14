import { test } from "node:test";
import assert from "node:assert/strict";
import { loadBundle } from "../src/components/atlas/catalog-data.ts";
import { AdminApiError, ServiceMissingError, fetchSession, fetchScrapeRun } from "../src/components/organizer/api.ts";
import { postReset, postTopic, postAdminProvider } from "../src/server/review/http.ts";

test("discovery reports missing/failed APIs without substituting fictional offers", async () => {
  for (const status of [404, 500]) {
    const result = await loadBundle(undefined, async () => new Response("Unavailable", { status }));
    assert.equal(result.phase, "error");
    assert.ok(!("bundle" in result));
  }
  const result = await loadBundle(undefined, async () => { throw new TypeError("offline"); });
  assert.equal(result.phase, "error");
});

test("organizer renders the backend error message as text and keeps stale-session status", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ error: { code: "STALE_REVIEW", message: "Reload this changed review." } }, { status: 409 }));
  await assert.rejects(fetchSession("example"), error => error instanceof AdminApiError && error.status === 409 && error.message === "Reload this changed review.");
});

test("an expired session does not masquerade as a missing maintenance service", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ error: { code: "EXPIRED", message: "Review expired; upload again." } }, { status: 404 }));
  await assert.rejects(fetchSession("expired"), error => error instanceof AdminApiError && !(error instanceof ServiceMissingError) && error.message.includes("expired"));
});

test("disabled desk has a distinct client state", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ error: { code: "DESK_DISABLED", message: "Not available." } }, { status: 404 }));
  await assert.rejects(fetchSession("unavailable"), ServiceMissingError);
});

test("source polling validates the requested run identity", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ runId: "another", status: "done", results: [] }));
  await assert.rejects(fetchScrapeRun("current"), AdminApiError);
});

test("local maintenance rejects cross-site origins and nonlocal destinations before actions", async () => {
  const previous = process.env.INTEREST_ATLAS_LOCAL_DESK;
  process.env.INTEREST_ATLAS_LOCAL_DESK = "1";
  try {
    for (const [url, headers] of [
      ["http://localhost/api/admin/reset", { origin: "https://other.example" }],
      ["http://localhost/api/admin/reset", { origin: "null" }],
      ["https://public.example/api/admin/reset", {}],
      ["http://localhost/api/admin/reset", { host: "public.example" }],
      ["http://localhost/api/admin/reset", { "sec-fetch-site": "cross-site" }],
    ] as const) {
      for (const handler of [postReset, postTopic, postAdminProvider]) {
        const result = await handler(new Request(url, { method: "POST", headers, body: "{}" }));
        assert.equal(result.status, 403);
        assert.equal((await result.json()).error.code, "LOCAL_ONLY");
      }
    }
    assert.equal((await postReset(new Request("http://localhost/api/admin/reset", { method: "POST", headers: { origin: "http://localhost" }, body: "{}" }))).status, 400);
  } finally {
    if (previous === undefined) delete process.env.INTEREST_ATLAS_LOCAL_DESK;
    else process.env.INTEREST_ATLAS_LOCAL_DESK = previous;
  }
});
