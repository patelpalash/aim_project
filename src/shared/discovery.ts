import type { Interest, Offer, SearchFilters } from "./contracts.ts";
import { assertSearchFilters, filterOffers, recommendOffers } from "./catalog.ts";
import { getScheduleStatus, scheduleSortTime } from "./schedule.ts";
import { getQuizChoice } from "./quiz.ts";
import { getPuzzleDefinition } from "./puzzles.ts";

export type AudienceMode = "child" | "teen" | "parent";
export type DiscoverySort = "recommended" | "soonest" | "title";
export interface DiscoveryState {
  audienceMode: AudienceMode;
  sort: DiscoverySort;
  filters: SearchFilters;
  selectedOfferId: string | null;
  savedOfferIds: string[];
  quizAnswers: Record<string, string>;
  completedPuzzleIds: string[];
}
export type DiscoveryAction =
  | { type: "set-audience-mode"; mode: AudienceMode }
  | { type: "set-sort"; sort: DiscoverySort }
  | { type: "set-filters"; patch: Partial<SearchFilters> }
  | { type: "toggle-interest"; id: Interest }
  | { type: "select-offer"; id: string | null }
  | { type: "toggle-saved"; id: string }
  | { type: "set-quiz-answer"; questionId: string; choiceId: string | null }
  | { type: "complete-puzzle"; id: string }
  | { type: "clear-filters" }
  | { type: "reset" };

export function createDiscoveryState(): DiscoveryState {
  return { audienceMode: "child", sort: "recommended", filters: { audience: "family", schedule: "upcoming" },
    selectedOfferId: null, savedOfferIds: [], quizAnswers: {}, completedPuzzleIds: [] };
}
function id(value: string) { if (typeof value !== "string" || !value.trim() || value.length > 160) throw new RangeError("Invalid selected ID"); }
function copyFilters(filters: SearchFilters): SearchFilters {
  const copy = { ...filters };
  if (copy.topics) copy.topics = [...new Set(copy.topics)];
  if (copy.interests) copy.interests = [...new Set(copy.interests)];
  assertSearchFilters(copy);
  return copy;
}

/** Pure session state. Presentation changes never silently change the activity audience. */
export function discoveryReducer(state: DiscoveryState, action: DiscoveryAction): DiscoveryState {
  switch (action.type) {
    case "set-audience-mode":
      if (!["child", "teen", "parent"].includes(action.mode)) throw new RangeError("Invalid presentation mode");
      return { ...state, audienceMode: action.mode };
    case "set-sort":
      if (!["recommended", "soonest", "title"].includes(action.sort)) throw new RangeError("Invalid sort order");
      return { ...state, sort: action.sort };
    case "set-filters": return { ...state, filters: copyFilters({ ...state.filters, ...action.patch }) };
    case "toggle-interest": {
      id(action.id);
      const selected = state.filters.interests ?? [];
      return { ...state, filters: copyFilters({ ...state.filters, interests: selected.includes(action.id) ? selected.filter(value => value !== action.id) : [...selected, action.id] }) };
    }
    case "select-offer":
      if (action.id !== null) id(action.id);
      return { ...state, selectedOfferId: action.id };
    case "toggle-saved":
      id(action.id);
      return { ...state, savedOfferIds: state.savedOfferIds.includes(action.id) ? state.savedOfferIds.filter(value => value !== action.id) : [...state.savedOfferIds, action.id] };
    case "set-quiz-answer": {
      if (action.choiceId !== null && !getQuizChoice(action.questionId, action.choiceId)) throw new RangeError("Unknown quiz choice");
      const quizAnswers = { ...state.quizAnswers };
      if (action.choiceId === null) delete quizAnswers[action.questionId];
      else quizAnswers[action.questionId] = action.choiceId;
      return { ...state, quizAnswers };
    }
    case "complete-puzzle":
      if (!getPuzzleDefinition(action.id)) throw new RangeError("Unknown puzzle");
      return state.completedPuzzleIds.includes(action.id) ? state : { ...state, completedPuzzleIds: [...state.completedPuzzleIds, action.id] };
    case "clear-filters": return { ...state, filters: createDiscoveryState().filters };
    case "reset": return createDiscoveryState();
  }
}

export function getDiscoveryResults(offers: readonly Offer[], state: DiscoveryState, now = new Date()) {
  const matches = filterOffers(offers, state.filters, now);
  const recommendations = recommendOffers(offers, state.filters, now);
  const ranks = new Map(recommendations.map((item, index) => [item.offer.id, index]));
  matches.sort((a, b) => {
    if (state.sort === "title") return a.title.de.localeCompare(b.title.de, "de") || a.id.localeCompare(b.id, "en");
    if (state.sort === "recommended") {
      const difference = (ranks.get(a.id) ?? Infinity) - (ranks.get(b.id) ?? Infinity);
      if (Number.isFinite(difference) && difference !== 0) return difference;
      if (ranks.has(a.id) !== ranks.has(b.id)) return ranks.has(a.id) ? -1 : 1;
    }
    return scheduleSortTime(a) - scheduleSortTime(b) || a.id.localeCompare(b.id, "en");
  });
  return { matches, recommendations, total: matches.length };
}

function visible(offer: Offer, now: Date) { return offer.reviewStatus === "approved" && offer.availability !== "cancelled" && getScheduleStatus(offer, now) !== "past"; }
export function getSelectedOffer(offers: readonly Offer[], state: DiscoveryState, now = new Date()): Offer | null {
  return offers.find(offer => offer.id === state.selectedOfferId && visible(offer, now)) ?? null;
}
export function getShortlist(offers: readonly Offer[], state: DiscoveryState, now = new Date()) {
  const byId = new Map(offers.filter(offer => visible(offer, now)).map(offer => [offer.id, offer]));
  return { offers: state.savedOfferIds.flatMap(id => byId.has(id) ? [byId.get(id)!] : []), unavailableIds: state.savedOfferIds.filter(id => !byId.has(id)) };
}
