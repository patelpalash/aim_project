import type { Offer } from "../../shared/contracts.ts";

export type ChallengeKind = "building" | "robot" | "coding" | "ai" | "city";
type ChallengeOffer = Pick<Offer, "title" | "topics" | "interests">;

/** Editorial, optional tasters. They never modify a provider's programme or eligibility. */
export function challengeFor(offer: ChallengeOffer): ChallengeKind | null {
  const title = `${offer.title.de} ${offer.title.en}`.toLowerCase();
  if (/\blego\b/.test(title)) return "building";
  if (/robot/.test(title)) return "robot";
  if (/craft your city/.test(title) || offer.interests.includes("build-worlds")) return "city";
  if (/data literacy/.test(title)) return "ai";
  if (offer.topics.includes("coding")) return "coding";
  if (offer.topics.includes("ai")) return "ai";
  if (offer.topics.includes("gaming")) return "coding";
  return null;
}

/** Only the exact reviewed provider URL; demo entries never become booking links. */
export function eventPageUrl(offer: Pick<Offer, "source" | "reviewStatus">): string | null {
  if (offer.source.kind !== "verified" || offer.reviewStatus !== "approved" || !offer.source.url) return null;
  try {
    const url = new URL(offer.source.url);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export type Command = "forward" | "left" | "right" | "repeat";
export interface Pose { x: number; y: number; direction: number }
export interface RouteBoard { size: number; start: Pose; goal: [number, number]; rocks: number[]; limit: number; loop: boolean }
export function routeBoard(harder: boolean, coding: boolean): RouteBoard {
  return harder
    ? { size: 5, start: { x: 0, y: 4, direction: 0 }, goal: [4, 0], rocks: [10, 17, 7, 8], limit: coding ? 6 : 16, loop: coding }
    : { size: 4, start: { x: 0, y: 3, direction: 1 }, goal: [3, 0], rocks: [5, 10], limit: coding ? 5 : 14, loop: coding };
}
export interface RunResult { trace: Pose[]; solved: boolean; reason: "goal" | "edge" | "rock" | "short" | "loop" | "limit" }
export function runRoute(board: RouteBoard, commands: readonly Command[]): RunResult {
  let pose = { ...board.start };
  const trace = [pose];
  const fail = (reason: RunResult["reason"]): RunResult => ({ trace, solved: false, reason });
  if (commands.length > board.limit) return fail("limit");
  for (const command of commands) {
    if (command === "left" || command === "right") {
      pose = { ...pose, direction: (pose.direction + (command === "left" ? 3 : 1)) % 4 };
      trace.push(pose);
    } else {
      for (let n = 0; n < (command === "repeat" ? 2 : 1); n++) {
        const [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][pose.direction];
        const next = { ...pose, x: pose.x + dx, y: pose.y + dy };
        if (next.x < 0 || next.y < 0 || next.x >= board.size || next.y >= board.size) return fail("edge");
        if (board.rocks.includes(next.y * board.size + next.x)) return fail("rock");
        pose = next;
        trace.push(pose);
      }
    }
  }
  if (pose.x !== board.goal[0] || pose.y !== board.goal[1]) return fail("short");
  if (board.loop && !commands.includes("repeat")) return fail("loop");
  return { trace, solved: true, reason: "goal" };
}

export interface Brick { row: number; start: number; length: number }
export function bridgeStock(harder: boolean): number[] { return harder ? [2, 2, 4, 4, 4] : [2, 2, 4, 4]; }
export function canPlaceBrick(bricks: readonly Brick[], brick: Brick, width: number, stock: readonly number[]): boolean {
  return [0, 1].includes(brick.row) && Number.isInteger(brick.start) && brick.start >= 0 && brick.start + brick.length <= width
    && stock.filter(n => n === brick.length).length > bricks.filter(b => b.length === brick.length).length
    && !bricks.some(b => b.row === brick.row && brick.start < b.start + b.length && b.start < brick.start + brick.length);
}
export function checkBridge(bricks: readonly Brick[], harder: boolean): "gap" | "seam" | "solved" {
  const width = harder ? 8 : 6;
  const validated: Brick[] = [];
  for (const brick of bricks) {
    if (!canPlaceBrick(validated, brick, width, bridgeStock(harder))) return "gap";
    validated.push(brick);
  }
  const rows = [0, 1].map(row => bricks.filter(b => b.row === row).sort((a, b) => a.start - b.start));
  if (rows.some(row => row.reduce((n, b) => n + b.length, 0) !== width)) return "gap";
  const seams = rows.map(row => row.slice(1).map(b => b.start));
  return seams[0].some(n => seams[1].includes(n)) ? "seam" : "solved";
}

export type Shape = "circle" | "triangle" | "square";
export const specimens: readonly { shape: Shape; color: "orange" | "green" | "purple" }[] = [
  { shape: "triangle", color: "orange" }, { shape: "circle", color: "green" },
  { shape: "square", color: "purple" }, { shape: "circle", color: "orange" },
  { shape: "triangle", color: "green" }, { shape: "square", color: "orange" },
  { shape: "circle", color: "purple" }, { shape: "triangle", color: "purple" },
];
export function shapeBin(shape: Shape, harder: boolean): number { return (harder ? shape === "triangle" : shape === "circle") ? 0 : 1; }
export function checkSorting(bins: readonly (number | null)[], harder: boolean): number[] {
  return specimens.slice(0, harder ? 8 : 6).flatMap((item, i) => bins[i] === shapeBin(item.shape, harder) ? [] : [i]);
}

export type CityTile = "park" | "solar" | "water";
export const cityPlots = [1, 3, 5, 7] as const;
export function checkCity(tiles: Readonly<Record<number, CityTile | undefined>>): "missing" | "balance" | "parks" | "solved" {
  if (cityPlots.some(i => !tiles[i])) return "missing";
  const values = cityPlots.map(i => tiles[i]);
  if (values.filter(x => x === "park").length !== 2 || !values.includes("solar") || !values.includes("water")) return "balance";
  const neighbours = [[1, 3], [1, 5], [3, 7], [5, 7]];
  return neighbours.every(indices => indices.some(i => tiles[i] === "park")) ? "solved" : "parks";
}
