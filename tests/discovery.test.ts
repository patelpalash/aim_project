import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { Offer } from "../src/shared/contracts.ts";
import { createDiscoveryState, discoveryReducer, getDiscoveryResults, getSelectedOffer, getShortlist } from "../src/shared/discovery.ts";
import { getQuizChoice, getQuizSuggestions, QUIZ_QUESTIONS } from "../src/shared/quiz.ts";
import { evaluatePatternPuzzle, evaluateSequencePuzzle, getPuzzleDefinition } from "../src/shared/puzzles.ts";
import { CatalogLoadError, createDemoCatalogBundle, loadCatalog } from "../src/shared/catalog-client.ts";
import { DEFAULT_TAXONOMY } from "../src/shared/taxonomy.ts";
import { getRecommendationReasons } from "../src/shared/catalog.ts";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { useDiscovery } from "../src/shared/use-discovery.ts";

const offers: Offer[] = JSON.parse(readFileSync(new URL("../data/demo-offers.json", import.meta.url), "utf8"));
const catalogExample = JSON.parse(readFileSync(new URL("../examples/catalog-response.json", import.meta.url), "utf8"));
const providersExample = JSON.parse(readFileSync(new URL("../examples/providers-response.json", import.meta.url), "utf8"));
const now = new Date("2026-11-14T10:00:00Z");

test("presentation switches preserve activity audience, filters, shortlist and selected event", () => {
  let state = createDiscoveryState();
  state = discoveryReducer(state, { type: "set-filters", patch: { age: 12, maxPriceEur: 10 } });
  state = discoveryReducer(state, { type: "select-offer", id: offers[0].id });
  state = discoveryReducer(state, { type: "toggle-saved", id: offers[0].id });
  const adult = discoveryReducer(state, { type: "set-audience-mode", mode: "parent" });
  assert.equal(adult.filters.audience, "family");
  assert.equal(adult.filters.age, 12);
  assert.equal(adult.selectedOfferId, offers[0].id);
  assert.deepEqual(adult.savedOfferIds, [offers[0].id]);
  assert.equal(getSelectedOffer(offers, adult, now)?.id, offers[0].id);
});

test("interests change real results and filter arrays cannot mutate state after dispatch", () => {
  let state = createDiscoveryState();
  const topics = ["gaming"];
  state = discoveryReducer(state, { type: "set-filters", patch: { topics } });
  topics.push("ai");
  assert.deepEqual(state.filters.topics, ["gaming"]);
  state = discoveryReducer(state, { type: "toggle-interest", id: "build-games" });
  const results = getDiscoveryResults(offers, state, now);
  assert.ok(results.total > 0);
  assert.ok(results.matches.every(offer => offer.topics.includes("gaming") && offer.interests.includes("build-games")));
  state = discoveryReducer(state, { type: "toggle-interest", id: "build-games" });
  assert.deepEqual(state.filters.interests, []);
});

test("full activities remain searchable but not immediate recommendations", () => {
  const state = createDiscoveryState();
  const results = getDiscoveryResults(offers, state, now);
  assert.ok(results.matches.some(offer => offer.availability === "full"));
  assert.ok(results.recommendations.every(value => value.offer.availability !== "full"));
  assert.ok(results.matches[0].availability !== "full");
});

test("shortlist toggles without duplicates and identifies unavailable records without leaking pending data", () => {
  let state = createDiscoveryState();
  state = discoveryReducer(state, { type: "toggle-saved", id: offers[0].id });
  state = discoveryReducer(state, { type: "toggle-saved", id: "missing" });
  assert.deepEqual(getShortlist(offers, state, now).unavailableIds, ["missing"]);
  const changed = structuredClone(offers); changed[0].reviewStatus = "pending";
  assert.equal(getShortlist(changed, state, now).offers.length, 0);
  state = discoveryReducer(state, { type: "toggle-saved", id: offers[0].id });
  assert.deepEqual(state.savedOfferIds, ["missing"]);
});

test("quiz answers and puzzle completion never silently change event eligibility or interests", () => {
  let state = createDiscoveryState();
  state = discoveryReducer(state, { type: "set-quiz-answer", questionId: "project", choiceId: "robot" });
  state = discoveryReducer(state, { type: "complete-puzzle", id: "pattern-alternating" });
  assert.equal(state.filters.interests, undefined);
  assert.equal(state.filters.age, undefined);
  const repeated = discoveryReducer(state, { type: "complete-puzzle", id: "pattern-alternating" });
  assert.deepEqual(repeated.completedPuzzleIds, ["pattern-alternating"]);
});

test("reset clears all session data and new sessions share no mutable state", () => {
  let state = createDiscoveryState();
  state = discoveryReducer(state, { type: "set-filters", patch: { query: "robots", age: 12 } });
  state = discoveryReducer(state, { type: "toggle-saved", id: offers[0].id });
  state = discoveryReducer(state, { type: "set-quiz-answer", questionId: "project", choiceId: "game" });
  state = discoveryReducer(state, { type: "complete-puzzle", id: "sequence-path" });
  state = discoveryReducer(state, { type: "reset" });
  assert.deepEqual(state, createDiscoveryState());
  state.savedOfferIds.push("local-only");
  assert.deepEqual(createDiscoveryState().savedOfferIds, []);
});

test("invalid filter updates fail before mutating existing state", () => {
  const state = createDiscoveryState(), before = JSON.stringify(state);
  assert.throws(() => discoveryReducer(state, { type: "set-filters", patch: { age: -1 } }), RangeError);
  assert.equal(JSON.stringify(state), before);
  assert.throws(() => discoveryReducer(state, { type: "set-quiz-answer", questionId: "bad", choiceId: "bad" }), RangeError);
});

test("sort and parent-audience selection remain explicit", () => {
  let state = createDiscoveryState();
  state = discoveryReducer(state, { type: "set-sort", sort: "title" });
  const titles = getDiscoveryResults(offers, state, now).matches.map(offer => offer.title.de);
  assert.deepEqual(titles, [...titles].sort((a, b) => a.localeCompare(b, "de")));
  state = discoveryReducer(state, { type: "set-filters", patch: { audience: "parent" } });
  assert.ok(getDiscoveryResults(offers, state, now).matches.some(offer => offer.audiences.includes("parents")));
});

test("three-question preference suggestions are deterministic, editable and skippable", () => {
  assert.equal(QUIZ_QUESTIONS.length, 3);
  assert.deepEqual(getQuizSuggestions({}).interestIds, []);
  const answers = { project: "robot", activity: "puzzle", next: "commands" };
  const result = getQuizSuggestions(answers);
  assert.equal(result.answeredCount, 3);
  assert.ok(result.interestIds.includes("robots"));
  assert.deepEqual(getQuizSuggestions(answers), result);
  assert.ok(getQuizChoice("project", "game"));
  assert.throws(() => getQuizSuggestions({ project: "not-a-choice" }), RangeError);
});

test("disabled configured interests are not returned by quiz suggestions", () => {
  const taxonomy = structuredClone(DEFAULT_TAXONOMY);
  taxonomy.interests.find(value => value.id === "robots")!.enabled = false;
  assert.ok(!getQuizSuggestions({ project: "robot" }, taxonomy).interestIds.includes("robots"));
});

test("recommendation copy explains actual interests without displaying a confidence score", () => {
  const state = discoveryReducer(createDiscoveryState(), { type: "toggle-interest", id: "build-games" });
  const recommendation = getDiscoveryResults(offers, state, now).recommendations[0];
  const reasons = getRecommendationReasons(recommendation);
  assert.ok(reasons.some(reason => reason.includes("Spiele bauen")));
  assert.ok(reasons.every(reason => !reason.includes("%")));
});

test("pattern puzzle evaluates choices, explains mistakes and keeps exploration available", () => {
  assert.equal(evaluatePatternPuzzle("pattern-alternating", null).status, "incomplete");
  assert.equal(evaluatePatternPuzzle("pattern-alternating", "circle").status, "correct");
  const wrong = evaluatePatternPuzzle("pattern-alternating", "square");
  assert.equal(wrong.status, "try-again");
  assert.ok(wrong.message.de.length > 0 && wrong.suggestedInterests.includes("solve-puzzles"));
  assert.equal(evaluatePatternPuzzle("pattern-pairs", "square").status, "correct");
  assert.equal(evaluatePatternPuzzle("pattern-alternating", "unknown").status, "invalid");
});

test("sequence evaluation actually executes the completed program and records steps", () => {
  const commands = ["forward", "forward", "right", "forward"] as const;
  const result = evaluateSequencePuzzle("sequence-path", commands);
  assert.equal(result.status, "correct");
  assert.equal(result.trace?.length, 5);
  assert.deepEqual(result.trace?.at(-1), { step: 4, x: 2, y: 1, heading: "south", command: "forward" });
  assert.deepEqual(commands, ["forward", "forward", "right", "forward"]);
});

test("sequence failures identify obstacles, boundaries, incomplete programs and invalid commands", () => {
  assert.equal(evaluateSequencePuzzle("sequence-path", ["right", "forward", "left", "forward"]).failure, "obstacle");
  assert.equal(evaluateSequencePuzzle("sequence-path", ["left", "forward"]).failure, "boundary");
  assert.equal(evaluateSequencePuzzle("sequence-path", ["forward", null]).status, "incomplete");
  assert.equal(evaluateSequencePuzzle("sequence-path", []).status, "incomplete");
  assert.equal(evaluateSequencePuzzle("sequence-path", Array(13).fill("forward")).status, "invalid");
  assert.equal(evaluateSequencePuzzle("sequence-path", ["forward"]).failure, "not-at-goal");
  assert.equal(getPuzzleDefinition("sequence-path")?.kind, "sequence");
});

test("demo mode is explicit, produces copies and rejects real-source records", () => {
  const bundle = createDemoCatalogBundle(offers, now);
  assert.equal(bundle.catalog.mode, "demo");
  bundle.catalog.offers[0].priceEur = 99;
  assert.notEqual(offers[0].priceEur, 99);
  const real = structuredClone(offers[0]); real.source.kind = "verified";
  assert.throws(() => createDemoCatalogBundle([real], now), RangeError);
});

test("the React discovery hook mounts with the actual renderer and shared catalog", () => {
  function TestConsumer() {
    const discovery = useDiscovery(offers, now);
    return createElement("output", null, `${discovery.state.audienceMode}:${discovery.results.total}`);
  }
  const rendered = renderToString(createElement(TestConsumer));
  assert.match(rendered, /child:[1-9]\d*/);
});

test("catalog client validates a real local HTTP response and sends no visitor preference payload", async () => {
  const requests: { path: string; method: string; body: string }[] = [];
  const server = createServer((request, response) => {
    let body = "";
    request.on("data", chunk => { body += chunk; });
    request.on("end", () => {
      requests.push({ path: request.url!, method: request.method!, body });
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(request.url === "/api/offers" ? catalogExample : request.url === "/api/providers" ? providersExample : DEFAULT_TAXONOMY));
    });
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const bundle = await loadCatalog({ fetchImpl: (input, init) => fetch(new URL(String(input), origin), init) });
    assert.equal(bundle.catalog.offers.length, catalogExample.offers.length);
    assert.deepEqual(requests.map(request => request.path).sort(), ["/api/offers", "/api/providers", "/api/taxonomy"]);
    assert.equal(bundle.providers.length, 4);
    assert.ok(requests.every(request => request.method === "GET" && request.body === ""));
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test("a failed real service never silently substitutes demo activities", async () => {
  await assert.rejects(loadCatalog({ fetchImpl: async () => new Response("Not found", { status: 404 }) }),
    error => error instanceof CatalogLoadError && error.code === "http" && error.status === 404);
});

test("invalid taxonomy and malformed successful response are explicit errors", async () => {
  await assert.rejects(loadCatalog({ fetchImpl: async input => Response.json(String(input) === "/api/offers" ? catalogExample : {}) }),
    error => error instanceof CatalogLoadError && error.code === "invalid-taxonomy");
  await assert.rejects(loadCatalog({ fetchImpl: async () => new Response("<html>wrong response</html>") }),
    error => error instanceof CatalogLoadError && ["invalid-catalog", "invalid-taxonomy", "invalid-providers"].includes(error.code));
});

test("catalog loading rejects missing or malformed provider identities", async () => {
  const emptyProviders = { schemaVersion: 1, providers: [] };
  await assert.rejects(loadCatalog({ fetchImpl: async input => Response.json(String(input) === "/api/offers" ? catalogExample : String(input) === "/api/providers" ? emptyProviders : DEFAULT_TAXONOMY) }),
    error => error instanceof CatalogLoadError && error.code === "invalid-catalog");
  await assert.rejects(loadCatalog({ fetchImpl: async input => Response.json(String(input) === "/api/offers" ? catalogExample : String(input) === "/api/providers" ? {} : DEFAULT_TAXONOMY) }),
    error => error instanceof CatalogLoadError && error.code === "invalid-providers");
});

test("catalog loading supports cancellation before any network request", async () => {
  const controller = new AbortController(); controller.abort();
  let requests = 0;
  await assert.rejects(loadCatalog({ signal: controller.signal, fetchImpl: async () => { requests++; return Response.json({}); } }),
    error => error instanceof DOMException && error.name === "AbortError");
  assert.equal(requests, 0);
});

test("catalog timeout aborts pending reads and returns a recoverable timeout error", async () => {
  const fetchImpl: typeof fetch = async (_input, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  });
  await assert.rejects(loadCatalog({ fetchImpl, timeoutMs: 10 }), error => error instanceof CatalogLoadError && error.code === "timeout");
});
