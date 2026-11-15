import test from "node:test";
import assert from "node:assert/strict";
import { bridgeStock, canPlaceBrick, challengeFor, checkBridge, checkCity, checkSorting, eventPageUrl, routeBoard, runRoute, shapeBin, specimens, type Brick, type Command } from "../src/components/atlas/challenge.ts";

test("event tasters match LEGO, robot, world-building, data and coding topics", () => {
  const offer = (title: string, topics = ["coding"], interests: string[] = []) => ({ title: { de: title, en: title }, topics, interests });
  assert.equal(challengeFor(offer("First Lego League Challenge")), "building");
  assert.equal(challengeFor(offer("Robotik zum Anfassen")), "robot");
  assert.equal(challengeFor(offer("Craft Your City", ["gaming"])), "city");
  assert.equal(challengeFor(offer("Data Literacy for Kids", ["ai"])), "ai");
  assert.equal(challengeFor(offer("Code your Chat")), "coding");
  assert.equal(challengeFor(offer("A poetry workshop", [])), null);
});

test("each route and loop level has a real, executable solution", () => {
  const solutions: Command[][] = [["repeat", "forward", "left", "repeat", "forward"], ["right", "repeat", "repeat", "left", "repeat", "repeat"]];
  for (const harder of [false, true]) for (const coding of [false, true]) {
    const board = routeBoard(harder, coding);
    const result = runRoute(board, solutions[harder ? 1 : 0]);
    assert.equal(result.solved, true);
    const end = result.trace.at(-1)!;
    assert.deepEqual([end.x, end.y], board.goal);
    assert.ok(result.trace.every(p => !board.rocks.includes(p.y * board.size + p.x)));
  }
});

test("robot movement detects edges, rocks, incomplete routes and code limits", () => {
  const easy = routeBoard(false, false);
  assert.equal(runRoute(easy, ["right", "forward"]).reason, "edge");
  assert.equal(runRoute(easy, ["forward", "forward", "left", "forward"]).reason, "rock");
  assert.equal(runRoute(easy, ["forward"]).reason, "short");
  assert.equal(runRoute(routeBoard(false, true), Array(6).fill("forward")).reason, "limit");
  assert.equal(runRoute({ ...easy, loop: true }, ["forward", "forward", "forward", "left", "forward", "forward", "forward"]).reason, "loop");
  assert.deepEqual(easy.start, { x: 0, y: 3, direction: 1 });
});

test("route playback maps both loop moves to one command and records the final turn", () => {
  const result = runRoute(routeBoard(false, true), ["repeat", "forward", "left", "repeat", "forward"]);
  assert.equal(result.solved, true);
  assert.equal(result.trace.length, result.commandIndices.length);
  assert.deepEqual(result.commandIndices, [-1, 0, 0, 1, 2, 3, 3, 4]);
  assert.equal(result.trace[4].direction, 0);
  assert.equal(result.trace.at(-1)!.direction, 0);
});

test("bridge placement prevents overlaps, overhangs and unlimited bricks", () => {
  const placed: Brick[] = [{ row: 0, start: 0, length: 4 }];
  assert.equal(canPlaceBrick(placed, { row: 0, start: 3, length: 2 }, 6, bridgeStock(false)), false);
  assert.equal(canPlaceBrick([], { row: 0, start: 5, length: 2 }, 6, bridgeStock(false)), false);
  assert.equal(canPlaceBrick([{ row: 0, start: 0, length: 2 }, { row: 1, start: 0, length: 2 }], { row: 0, start: 2, length: 2 }, 6, bridgeStock(false)), false);
  assert.equal(canPlaceBrick(placed, { row: 0, start: 4, length: 2 }, 6, bridgeStock(false)), true);
});

test("bridge requires two complete rows with staggered joints, on both levels", () => {
  assert.equal(checkBridge([], false), "gap");
  const aligned = [0, 1].flatMap(row => [{ row, start: 0, length: 4 }, { row, start: 4, length: 2 }]);
  assert.equal(checkBridge(aligned, false), "seam");
  assert.equal(checkBridge([{ row: 0, start: 0, length: 4 }, { row: 0, start: 4, length: 2 }, { row: 1, start: 0, length: 2 }, { row: 1, start: 2, length: 4 }], false), "solved");
  assert.equal(checkBridge([{ row: 0, start: 0, length: 2 }, { row: 0, start: 2, length: 4 }, { row: 0, start: 6, length: 2 }, { row: 1, start: 0, length: 4 }, { row: 1, start: 4, length: 4 }], true), "solved");
});

test("sorting checks every shape, ignores colour and reports missing/misplaced tiles", () => {
  for (const harder of [false, true]) {
    const bins = specimens.slice(0, harder ? 8 : 6).map(item => shapeBin(item.shape, harder));
    assert.deepEqual(checkSorting(bins, harder), []);
    bins[0] = 1 - bins[0];
    assert.deepEqual(checkSorting(bins, harder), [0]);
  }
  assert.equal(checkSorting([], false).length, 6);
});

test("city requires balanced tiles and a non-diagonal park for every house", () => {
  assert.equal(checkCity({}), "missing");
  assert.equal(checkCity({ 1: "park", 3: "park", 5: "park", 7: "water" }), "balance");
  assert.equal(checkCity({ 1: "park", 3: "park", 5: "solar", 7: "water" }), "parks");
  assert.equal(checkCity({ 1: "park", 7: "park", 3: "solar", 5: "water" }), "solved");
  assert.equal(checkCity({ 3: "park", 5: "park", 1: "solar", 7: "water" }), "solved");
});

test("only reviewed real event pages may open; demos and unsafe URLs never do", () => {
  const real = { reviewStatus: "approved" as const, source: { kind: "verified" as const, url: "https://example.org/events/lego-123?lang=de", fetchedAt: null, verifiedAt: null } };
  assert.equal(eventPageUrl(real), real.source.url);
  assert.equal(eventPageUrl({ ...real, reviewStatus: "pending" }), null);
  assert.equal(eventPageUrl({ ...real, source: { ...real.source, kind: "demo" } }), null);
  for (const url of [null, "javascript:alert(1)", "file:///C:/test", "https://user:password@example.org", "broken"]) {
    assert.equal(eventPageUrl({ ...real, source: { ...real.source, url } }), null);
  }
});
