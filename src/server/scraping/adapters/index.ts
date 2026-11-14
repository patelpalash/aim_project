/** Registry of implemented provider adapters. A provider without an entry has no working adapter. */
import type { ProviderAdapter } from "../runner.ts";
import { aimAdapter } from "./aim.ts";
import { experimentaAdapter } from "./experimenta.ts";
import { hdfAdapter } from "./hdf.ts";
import { ipaiAdapter } from "./ipai.ts";

export const ADAPTERS: Record<string, ProviderAdapter> = {
  aim: aimAdapter,
  experimenta: experimentaAdapter,
  "haus-der-familie": hdfAdapter,
  ipai: ipaiAdapter,
};

export function adapterFor(providerId: string): ProviderAdapter {
  const adapter = ADAPTERS[providerId];
  if (!adapter) throw new Error(`No adapter implemented for provider "${providerId}"`);
  return adapter;
}
