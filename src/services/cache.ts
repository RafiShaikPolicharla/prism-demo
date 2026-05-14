// Ask Prism caching layer.
//
// Demonstrates the production caching pattern: hash the user's question,
// memoize the LLM response, and serve subsequent identical questions
// instantly. In live mode this would be backed by a Postgres / Redis
// table keyed by (advisor_id, question_hash) with a TTL — here we use
// an in-memory Zustand store scoped to the browser session.
//
// Components must consume this through `servicesCache` (the hook re-export
// below), never by importing the underlying Zustand store. This keeps the
// services-layer architecture rule intact for the eventual Databricks /
// edge-function migration.

import { create } from 'zustand';
import type { AskPrismResponse, AskPrismQuestion } from '@/types/demo';
import { ASK_PRISM_QUESTIONS } from '@/data/demoData';

// Flip to true for stage demos where we want to show cache hits without
// any warmup. Keep false for booth demos so advisors can watch the cache
// fill in real time.
const PREWARM = false;

const TOKENS_PER_RESPONSE = 800;
const COST_PER_1K_TOKENS_USD = 0.015;

export interface CachedEntry {
  question: string;
  response: AskPrismResponse;
  firstGenerated: Date;
  hitCount: number;
  lastAccessed: Date;
}

export interface CacheStats {
  totalCached: number;
  totalHits: number;
  mostAsked: { question: string; hitCount: number }[];
  tokensSaved: number;
  costSavedUsd: number;
}

// ---------- helpers ----------

function normalize(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

// djb2 — simple, deterministic, no crypto needed.
function hash(q: string): string {
  const norm = normalize(q);
  let h = 5381;
  for (let i = 0; i < norm.length; i++) {
    h = ((h << 5) + h + norm.charCodeAt(i)) | 0;
  }
  return `q_${(h >>> 0).toString(36)}`;
}

// ---------- store ----------

interface CacheState {
  entries: Map<string, CachedEntry>;
  bump: number; // force re-render after mutating the Map in place
  _touch: () => void;
}

const useCacheStore = create<CacheState>((set) => ({
  entries: new Map(),
  bump: 0,
  _touch: () => set((s) => ({ bump: s.bump + 1 })),
}));

function prewarm() {
  const { entries, _touch } = useCacheStore.getState();
  if (entries.size > 0) return;
  for (const q of ASK_PRISM_QUESTIONS) {
    const key = hash(q.exampleQuery);
    const hits = 3 + Math.floor(Math.random() * 10); // 3..12
    entries.set(key, {
      question: q.exampleQuery,
      response: q.response,
      firstGenerated: new Date(Date.now() - 1000 * 60 * 60 * 6),
      hitCount: hits,
      lastAccessed: new Date(),
    });
  }
  _touch();
}

if (PREWARM) prewarm();

// ---------- public service API ----------

export const servicesCache = {
  get(question: string): CachedEntry | null {
    const { entries, _touch } = useCacheStore.getState();
    const key = hash(question);
    const entry = entries.get(key);
    if (!entry) return null;
    entry.hitCount += 1;
    entry.lastAccessed = new Date();
    _touch();
    return entry;
  },

  set(question: string, response: AskPrismResponse): CachedEntry {
    const { entries, _touch } = useCacheStore.getState();
    const key = hash(question);
    const now = new Date();
    const entry: CachedEntry = {
      question,
      response,
      firstGenerated: now,
      hitCount: 1,
      lastAccessed: now,
    };
    entries.set(key, entry);
    _touch();
    return entry;
  },

  getStats(): CacheStats {
    const { entries } = useCacheStore.getState();
    const list = Array.from(entries.values());
    const totalHits = list.reduce((sum, e) => sum + e.hitCount, 0);
    // "Saved" means hits beyond the first generation.
    const savedHits = list.reduce((sum, e) => sum + Math.max(0, e.hitCount - 1), 0);
    const tokensSaved = savedHits * TOKENS_PER_RESPONSE;
    const costSavedUsd = (tokensSaved / 1000) * COST_PER_1K_TOKENS_USD;
    const mostAsked = [...list]
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, 3)
      .map((e) => ({ question: e.question, hitCount: e.hitCount }));
    return {
      totalCached: list.length,
      totalHits,
      mostAsked,
      tokensSaved,
      costSavedUsd,
    };
  },

  clear(): void {
    const { entries, _touch } = useCacheStore.getState();
    entries.clear();
    if (PREWARM) prewarm();
    _touch();
  },
};

// React hook — components subscribe to `bump` so the UI reacts to
// mutations on the underlying Map. Returns the service API plus
// pre-computed stats for convenience.
export function useAskPrismCache() {
  // Subscribe; value itself is unused.
  useCacheStore((s) => s.bump);
  return {
    get: servicesCache.get,
    set: servicesCache.set,
    clear: servicesCache.clear,
    stats: servicesCache.getStats(),
  };
}

// Optional helper for matching — components shouldn't import demoData
// directly when they want to look up a canned response.
export function findCannedResponse(question: string): AskPrismQuestion | null {
  // Re-exported for convenience; thin wrapper kept here so the cache file
  // is self-contained for component consumers.
  // (Actual matching still lives in askPrismService.)
  return null;
}
