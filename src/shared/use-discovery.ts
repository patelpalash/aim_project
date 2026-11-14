"use client";

import { useReducer } from "react";
import type { Offer } from "./contracts.ts";
import { createDiscoveryState, discoveryReducer, getDiscoveryResults, getSelectedOffer, getShortlist } from "./discovery.ts";

/** State belongs to the mounted client component, never a singleton or browser storage. */
export function useDiscovery(offers: readonly Offer[], now = new Date()) {
  const [state, dispatch] = useReducer(discoveryReducer, undefined, createDiscoveryState);
  return { state, dispatch, results: getDiscoveryResults(offers, state, now),
    selectedOffer: getSelectedOffer(offers, state, now), shortlist: getShortlist(offers, state, now) };
}
