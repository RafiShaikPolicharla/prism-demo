// Strategy Lists service.
//
// Strategy List ≠ Saved View. A Saved View stores filter criteria and
// recomputes membership on every load. A Strategy List stores a *frozen*
// set of household IDs at creation time — the membership doesn't change
// when underlying data changes; only progress markers (which households
// have been contacted) update over time.
//
// Backed by a Zustand store so per-household contacted state survives
// route changes within a session. The three demo lists are seeded on
// first call to `ensureSeeded(allHouseholds)` from a deterministic
// computation against the loaded household data so we don't need to
// hardcode 25+ raw CSV ids in this file.
//
// In live mode this would be backed by a Supabase table:
//   strategy_list (id, advisor_id, name, created_at, settings)
//   strategy_list_member (list_id, household_id, contacted_at)
// — but Phase 1 of the integration depends on Salesforce as the source
// of truth for advisor lists, hence the live-path stub.

import { create } from 'zustand';
import type { DemoHousehold, PersonaId } from '@/types/demo';
import { DEMO_MODE } from './config';

export interface StrategyList {
  id: string;
  name: string;
  createdOn: string; // ISO date
  householdIds: string[];        // frozen membership
  contactedIds: string[];        // mutable progress
  trackProgress: boolean;
  notifyOnIneligible: boolean;
  // Persona used as the default sort hint — strategy lists are global
  // to the advisor but the list most relevant to the current persona
  // surfaces first in the sidebar.
  preferredPersona?: PersonaId;
}

interface StrategyListState {
  lists: Record<string, StrategyList>;
  seeded: boolean;
  seedSnapshots: Record<string, string[]>; // listId -> seed contactedIds
  seed: (households: DemoHousehold[]) => void;
  create: (name: string, householdIds: string[]) => StrategyList;
  markContacted: (listId: string, householdId: string, contacted: boolean) => void;
  reset: () => void;
}

// ---------- Seed helpers ----------

function pickQ2ProtectionPush(all: DemoHousehold[]): { ids: string[]; contacted: string[] } {
  const anchors = ['hh_80059', 'hh_80062', 'hh_80099', 'hh_80112']; // Hamilton, Russell, Bailey, Cooper
  const inBook = new Set(all.map((h) => h.id));
  const anchorIds = anchors.filter((id) => inBook.has(id));

  const protectionPool = all
    .filter((h) =>
      !anchorIds.includes(h.id) &&
      (h.tags.includes('New Parent') || h.tags.includes('Newly Married')),
    )
    .sort((a, b) => b.hhValue - a.hhValue);

  // 8 additional contacted, 2 not-yet-contacted → 14 total.
  const filler = protectionPool.slice(0, 10);
  const ids = [...anchorIds, ...filler.map((h) => h.id)];
  const contacted = [...anchorIds, ...filler.slice(0, 8).map((h) => h.id)];
  return { ids, contacted };
}

function pickHighValueTierA(all: DemoHousehold[]): { ids: string[]; contacted: string[] } {
  // Tier A households with hhValue > $1M, top 9 by hhValue. Heroes
  // (Richardson, Rogers, Rivera) are guaranteed Tier A in the fixtures
  // so they fall in naturally.
  const ranked = all
    .filter((h) => h.salesforceTier === 'A' && h.hhValue > 1_000_000)
    .sort((a, b) => b.hhValue - a.hhValue)
    .slice(0, 9);
  const ids = ranked.map((h) => h.id);
  // 7 contacted, 2 not — leave the lowest-value two as not-yet-contacted.
  const contacted = ids.slice(0, 7);
  return { ids, contacted };
}

function pickNewlyTransitioned(all: DemoHousehold[]): { ids: string[]; contacted: string[] } {
  const heroes = ['hh_80051', 'hh_80007', 'hh_80015']; // Jimenez, Mendoza, Morales
  const inBook = new Set(all.map((h) => h.id));
  const heroIds = heroes.filter((id) => inBook.has(id));

  const transitioned = all
    .filter((h) => h.tags.includes('Recently Transitioned') && !heroIds.includes(h.id))
    .sort((a, b) => b.hhValue - a.hhValue);

  // Target 25 total, 18 contacted, 7 not — heroes are in the not-contacted
  // bucket to align with the acquired-advisor narrative. Pad with the
  // available transitioned pool; if there aren't enough, just use all.
  const fillerNeed = Math.max(0, 25 - heroIds.length);
  const filler = transitioned.slice(0, fillerNeed);
  const ids = [...heroIds, ...filler.map((h) => h.id)];

  // 7 not-contacted: heroes first, then top up from the lowest-value filler
  // if we have more than 7 heroes (we don't, only 3) — so 4 more from filler.
  const notContactedNeed = 7;
  const additionalNotContacted = filler
    .slice()
    .reverse()
    .slice(0, Math.max(0, notContactedNeed - heroIds.length))
    .map((h) => h.id);
  const notContacted = new Set([...heroIds, ...additionalNotContacted]);
  const contacted = ids.filter((id) => !notContacted.has(id));
  return { ids, contacted };
}

// ---------- Store ----------

export const useStrategyListsStore = create<StrategyListState>((set, get) => ({
  lists: {},
  seeded: false,
  seedSnapshots: {},

  seed: (households) => {
    if (get().seeded || households.length === 0) return;
    const q2 = pickQ2ProtectionPush(households);
    const tierA = pickHighValueTierA(households);
    const transitioned = pickNewlyTransitioned(households);

    const lists: Record<string, StrategyList> = {
      sl_q2_protection: {
        id: 'sl_q2_protection',
        name: 'Q2 Protection Push',
        createdOn: '2026-04-08',
        householdIds: q2.ids,
        contactedIds: q2.contacted,
        trackProgress: true,
        notifyOnIneligible: false,
        preferredPersona: 'junior',
      },
      sl_tier_a_reviews: {
        id: 'sl_tier_a_reviews',
        name: 'High-Value Tier A Reviews',
        createdOn: '2026-04-01',
        householdIds: tierA.ids,
        contactedIds: tierA.contacted,
        trackProgress: true,
        notifyOnIneligible: false,
        preferredPersona: 'senior',
      },
      sl_newly_transitioned: {
        id: 'sl_newly_transitioned',
        name: 'Newly Transitioned Outreach',
        createdOn: '2026-03-27',
        householdIds: transitioned.ids,
        contactedIds: transitioned.contacted,
        trackProgress: true,
        notifyOnIneligible: false,
        preferredPersona: 'acquired',
      },
    };
    const seedSnapshots: Record<string, string[]> = {};
    for (const [id, l] of Object.entries(lists)) seedSnapshots[id] = [...l.contactedIds];
    set({ lists, seeded: true, seedSnapshots });
  },

  create: (name, householdIds) => {
    const id = `sl_session_${Date.now()}`;
    const list: StrategyList = {
      id,
      name,
      createdOn: new Date().toISOString().slice(0, 10),
      householdIds: [...householdIds],
      contactedIds: [],
      trackProgress: true,
      notifyOnIneligible: false,
    };
    set((s) => ({
      lists: { ...s.lists, [id]: list },
      seedSnapshots: { ...s.seedSnapshots, [id]: [] },
    }));
    return list;
  },

  markContacted: (listId, householdId, contacted) => {
    set((s) => {
      const list = s.lists[listId];
      if (!list) return s;
      const set2 = new Set(list.contactedIds);
      if (contacted) set2.add(householdId);
      else set2.delete(householdId);
      return {
        lists: {
          ...s.lists,
          [listId]: { ...list, contactedIds: Array.from(set2) },
        },
      };
    });
  },

  reset: () => {
    set((s) => {
      const lists: Record<string, StrategyList> = {};
      for (const [id, l] of Object.entries(s.lists)) {
        const seed = s.seedSnapshots[id] ?? [];
        lists[id] = { ...l, contactedIds: [...seed] };
      }
      return { lists };
    });
  },
}));

// ---------- Public service ----------

export const strategyListsService = {
  list(): StrategyList[] {
    if (!DEMO_MODE) {
      throw new Error(
        'Strategy List persistence requires Salesforce integration — Phase 1 capability',
      );
    }
    return Object.values(useStrategyListsStore.getState().lists);
  },
  getById(id: string): StrategyList | null {
    if (!DEMO_MODE) {
      throw new Error(
        'Strategy List persistence requires Salesforce integration — Phase 1 capability',
      );
    }
    return useStrategyListsStore.getState().lists[id] ?? null;
  },
  create(name: string, householdIds: string[]): StrategyList {
    if (!DEMO_MODE) {
      throw new Error(
        'Strategy List persistence requires Salesforce integration — Phase 1 capability',
      );
    }
    return useStrategyListsStore.getState().create(name, householdIds);
  },
  markContacted(listId: string, householdId: string, contacted: boolean): void {
    if (!DEMO_MODE) {
      throw new Error(
        'Strategy List persistence requires Salesforce integration — Phase 1 capability',
      );
    }
    useStrategyListsStore.getState().markContacted(listId, householdId, contacted);
  },
  /**
   * Phase 0 demonstration: pushes the strategy list to the firm's
   * Marketing Suite as a campaign audience. In demo mode this is a
   * no-op — the toast in the UI is the entire visible behavior. Real
   * integration depends on Salesforce campaign object plumbing.
   */
  sendToMarketingSuite(listId: string): { listId: string; householdCount: number } {
    if (!DEMO_MODE) {
      throw new Error(
        'Marketing Suite campaign push requires Salesforce campaign object integration — Phase 1 capability',
      );
    }
    const list = useStrategyListsStore.getState().lists[listId];
    if (!list) throw new Error(`Strategy list not found: ${listId}`);
    return { listId, householdCount: list.householdIds.length };
  },
  ensureSeeded(households: DemoHousehold[]): void {
    useStrategyListsStore.getState().seed(households);
  },
  reset(): void {
    useStrategyListsStore.getState().reset();
  },
  /**
   * Sort key used by the Explore sidebar so the list most relevant to
   * the current persona surfaces first. Strategy lists are global —
   * persona switching only re-orders, never hides.
   */
  sortByPersona(lists: StrategyList[], personaId: PersonaId): StrategyList[] {
    return [...lists].sort((a, b) => {
      const aMatch = a.preferredPersona === personaId ? 0 : 1;
      const bMatch = b.preferredPersona === personaId ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return b.createdOn.localeCompare(a.createdOn);
    });
  },
};
