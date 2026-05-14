// Opportunities service. In DEMO_MODE returns the demoData ACTIONS, optionally
// filtered to the current persona's todayActionIds.

import { ACTIONS, PERSONAS } from '@/data/demoData';
import type { DemoAction, PersonaId } from '@/types/demo';
import { DEMO_MODE } from './config';

// Filter taxonomies used by the Today sidebar. Exported so components and
// the Explore route can share id/label/CSV mappings.
export interface ClientSegmentDef {
  id: string;
  label: string;
  csvSegment: string; // matches household.members[].segment strings
}
export const CLIENT_SEGMENTS: ClientSegmentDef[] = [
  { id: 'career_starter', label: 'Career Starter (<30)', csvSegment: '<30: Career Starter' },
  { id: 'life_builder',   label: 'Life Builder (30-40)', csvSegment: '30-40: Life Builder' },
  { id: 'wealth_builder', label: 'Wealth Builder (40-52)', csvSegment: '40-52: Wealth Builder' },
  { id: 'pre_retire',     label: 'Pre-Retire (53-64)', csvSegment: '53-64: Pre-Retire' },
  { id: 'next_chapters',  label: 'Next Chapters (65-79)', csvSegment: '65-79: Next Chapters' },
  { id: 'legacy',         label: 'Legacy (80+)', csvSegment: '80+: Legacy' },
];

export interface WealthSegmentDef { id: string; label: string }
export const WEALTH_SEGMENTS: WealthSegmentDef[] = [
  { id: 'protect',  label: 'Protect' },
  { id: 'develop',  label: 'Develop' },
  { id: 'manage',   label: 'Manage' },
  { id: 'maintain', label: 'Maintain' },
];

export interface TodayFilters {
  themeId?: string | null;
  clientSegmentId?: string | null;
  wealthSegmentId?: string | null;
}

export interface HouseholdMeta {
  clientSegment?: string; // raw "65-79: Next Chapters" etc. (primary contact)
  wealthSegment?: string; // raw "Multi (Protect / Manage / Maintain)" etc. (display only)
  primaryWealthSegment?: 'Protect' | 'Develop' | 'Manage' | 'Maintain';
}

function actionMatchesTheme(action: DemoAction, themeId: string): boolean {
  // PLANNING_THEMES.label is what action.theme stores. Compare slug-ish.
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '');
  return slug(action.theme || '') === themeId
      || slug(action.theme || '').startsWith(themeId);
}

function householdMatchesClientSegment(meta: HouseholdMeta | undefined, segmentId: string): boolean {
  const def = CLIENT_SEGMENTS.find(s => s.id === segmentId);
  if (!def || !meta?.clientSegment) return false;
  return meta.clientSegment === def.csvSegment;
}

// Match on the canonical primaryWealthSegment so each household belongs to
// exactly one bucket. The free-form wealthSegment string is multi-value for
// some fixtures and would double-count if matched on substring inclusion.
function householdMatchesWealthSegment(meta: HouseholdMeta | undefined, segmentId: string): boolean {
  const def = WEALTH_SEGMENTS.find(s => s.id === segmentId);
  if (!def || !meta?.primaryWealthSegment) return false;
  return meta.primaryWealthSegment === def.label;
}

// Resolve an EMAIL_TEMPLATES key for a given action, using category and
// (optionally) household tags. Returns null if no template fits.
function resolveTemplateKey(action: DemoAction, householdTags: string[] = []): string | null {
  const cat = action.category ?? '';
  if (cat === 'RMD Maximization') return 'rmd_outreach';
  if (cat.includes('New Parent')) return 'new_parent';
  if (cat.includes('Newly Married')) return 'newly_married';
  if (householdTags.includes('Recently Transitioned') || cat === 'Retention Risk') {
    return 'transitioned_intro';
  }
  return null;
}

const agentActions = new Map<string, DemoAction>();

export function registerAgentActions(actions: DemoAction[]): void {
  agentActions.clear();
  for (const action of actions) {
    agentActions.set(action.id, action);
  }
}

export const opportunitiesService = {
  list(): DemoAction[] {
    if (!DEMO_MODE) throw new Error('opportunitiesService.list: live mode not implemented');
    return [...Object.values(ACTIONS), ...agentActions.values()];
  },

  get(id: string): DemoAction | null {
    if (!DEMO_MODE) throw new Error('opportunitiesService.get: live mode not implemented');
    return agentActions.get(id) ?? ACTIONS[id] ?? null;
  },

  /** Today queue for a given persona — uses the persona's curated todayActionIds. */
  listForPersonaToday(
    personaId: PersonaId,
    filters?: TodayFilters,
    metaByHouseholdId?: Map<string, HouseholdMeta>,
  ): DemoAction[] {
    if (!DEMO_MODE) throw new Error('opportunitiesService.listForPersonaToday: live mode not implemented');
    const persona = PERSONAS[personaId];
    if (!persona) return [];
    const base = persona.todayActionIds
      .map(id => ACTIONS[id])
      .filter((a): a is DemoAction => Boolean(a));
    if (!filters) return base;
    return base.filter((a) => {
      if (filters.themeId && !actionMatchesTheme(a, filters.themeId)) return false;
      const meta = metaByHouseholdId?.get(a.householdId);
      if (filters.clientSegmentId && !householdMatchesClientSegment(meta, filters.clientSegmentId)) return false;
      if (filters.wealthSegmentId && !householdMatchesWealthSegment(meta, filters.wealthSegmentId)) return false;
      return true;
    });
  },

  /** Per-group counts for the Today sidebar, scoped to the current persona. */
  countsForPersonaToday(
    personaId: PersonaId,
    metaByHouseholdId?: Map<string, HouseholdMeta>,
  ): {
    themes: Record<string, number>;
    clientSegments: Record<string, number>;
    wealthSegments: Record<string, number>;
  } {
    const base = this.listForPersonaToday(personaId);
    const themes: Record<string, number> = {};
    const clientSegments: Record<string, number> = Object.fromEntries(CLIENT_SEGMENTS.map(s => [s.id, 0]));
    const wealthSegments: Record<string, number> = Object.fromEntries(WEALTH_SEGMENTS.map(s => [s.id, 0]));
    for (const a of base) {
      const slug = (a.theme || '').toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '');
      themes[slug] = (themes[slug] ?? 0) + 1;
      const meta = metaByHouseholdId?.get(a.householdId);
      for (const s of CLIENT_SEGMENTS) if (householdMatchesClientSegment(meta, s.id)) clientSegments[s.id]++;
      for (const s of WEALTH_SEGMENTS) if (householdMatchesWealthSegment(meta, s.id)) wealthSegments[s.id]++;
    }
    return { themes, clientSegments, wealthSegments };
  },

  listForHousehold(householdId: string): DemoAction[] {
    if (!DEMO_MODE) throw new Error('opportunitiesService.listForHousehold: live mode not implemented');
    return [...Object.values(ACTIONS), ...agentActions.values()].filter(a => a.householdId === householdId);
  },

  /**
   * Top-N clients to reach out first. Ranks every action by a composite score:
   * urgency weight (act_now=3, this_quarter=2, monitor=1) × revenue (USD).
   * If a household appears in multiple actions, only the highest-scoring one
   * is kept so the list shows distinct clients.
   */
  topPriorityClients(limit = 10): Array<DemoAction & { _score: number; _revenueUsd: number }> {
    if (!DEMO_MODE) throw new Error('opportunitiesService.topPriorityClients: live mode not implemented');
    const urgencyWeight = (u: string) =>
      u === 'act_now' ? 3 : u === 'this_quarter' ? 2 : 1;
    const scored = Object.values(ACTIONS).map((a) => {
      const rev = parseRevenueUsd(a.estimatedValue);
      const score = urgencyWeight(a.urgency) * Math.max(rev, 1);
      return { ...a, _score: score, _revenueUsd: rev };
    });
    scored.sort((a, b) => b._score - a._score);
    const seen = new Set<string>();
    const out: typeof scored = [];
    for (const a of scored) {
      if (seen.has(a.householdId)) continue;
      seen.add(a.householdId);
      out.push(a);
      if (out.length >= limit) break;
    }
    return out;
  },

  /**
   * Same scoring as topPriorityClients but restricted to households whose
   * primary contact age falls in [minAge, maxAge]. ageByHouseholdId is a
   * lookup the caller assembles from householdsService (kept here so the
   * service stays free of household-fetch concerns).
   */
  topPriorityClientsInAgeBand(
    ageByHouseholdId: Map<string, number | undefined>,
    minAge: number,
    maxAge: number,
    limit = 10,
  ): Array<DemoAction & { _score: number; _revenueUsd: number; _age: number }> {
    if (!DEMO_MODE) throw new Error('opportunitiesService.topPriorityClientsInAgeBand: live mode not implemented');
    const urgencyWeight = (u: string) =>
      u === 'act_now' ? 3 : u === 'this_quarter' ? 2 : 1;
    const scored = Object.values(ACTIONS)
      .map((a) => {
        const age = a.clientAge ?? ageByHouseholdId.get(a.householdId) ?? null;
        if (age == null || age < minAge || age > maxAge) return null;
        const rev = parseRevenueUsd(a.estimatedValue);
        return { ...a, _score: urgencyWeight(a.urgency) * Math.max(rev, 1), _revenueUsd: rev, _age: age };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    scored.sort((a, b) => b._score - a._score);
    const seen = new Set<string>();
    const out: typeof scored = [];
    for (const a of scored) {
      if (seen.has(a.householdId)) continue;
      seen.add(a.householdId);
      out.push(a);
      if (out.length >= limit) break;
    }
    return out;
  },

  /** All opportunities tagged with a given theme label, sorted by parsed revenue desc. */
  listForTheme(themeLabel: string): DemoAction[] {
    if (!DEMO_MODE) throw new Error('opportunitiesService.listForTheme: live mode not implemented');
    const target = themeLabel.toLowerCase();
    return Object.values(ACTIONS)
      .filter(a => (a.theme || '').toLowerCase() === target)
      .sort((a, b) => parseRevenueUsd(b.estimatedValue) - parseRevenueUsd(a.estimatedValue));
  },

  /** Suggest an email template key for a given action, if one applies. */
  suggestedTemplateKey(action: DemoAction, householdTags: string[] = []): string | null {
    return resolveTemplateKey(action, householdTags);
  },

  /**
   * Aggregate opportunities by theme label. Returns one row per theme with
   * the opportunity count, the sum of parsed revenue from estimatedValue,
   * and a breakdown by urgency. Used by the advisor portfolio overview.
   */
  aggregateByTheme(): Array<{
    theme: string;
    count: number;
    revenueUsd: number;
    byUrgency: { actNow: number; thisQuarter: number; monitor: number };
  }> {
    if (!DEMO_MODE) throw new Error('opportunitiesService.aggregateByTheme: live mode not implemented');
    const acc = new Map<string, { count: number; revenueUsd: number; byUrgency: { actNow: number; thisQuarter: number; monitor: number } }>();
    for (const a of Object.values(ACTIONS)) {
      const key = a.theme || 'Other';
      const row = acc.get(key) ?? { count: 0, revenueUsd: 0, byUrgency: { actNow: 0, thisQuarter: 0, monitor: 0 } };
      row.count += 1;
      row.revenueUsd += parseRevenueUsd(a.estimatedValue);
      const u = (a.urgency || '').toLowerCase();
      if (u.includes('act')) row.byUrgency.actNow += 1;
      else if (u.includes('quarter')) row.byUrgency.thisQuarter += 1;
      else row.byUrgency.monitor += 1;
      acc.set(key, row);
    }
    return Array.from(acc.entries())
      .map(([theme, v]) => ({ theme, ...v }))
      .sort((a, b) => b.revenueUsd - a.revenueUsd || b.count - a.count);
  },
};

/**
 * Parse strings like "$12K revenue opportunity", "$25K+ revenue opportunity",
 * "$2.6M HH at risk", "$180K AUA potential" into a USD number. Non-revenue
 * phrasing ("Retention + growth", "TBD") returns 0.
 */
function parseRevenueUsd(raw: string): number {
  if (!raw) return 0;
  const m = raw.match(/\$\s*([\d.]+)\s*([KMB])?/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return 0;
  const unit = (m[2] || '').toUpperCase();
  const mult = unit === 'B' ? 1_000_000_000 : unit === 'M' ? 1_000_000 : unit === 'K' ? 1_000 : 1;
  return n * mult;
}
