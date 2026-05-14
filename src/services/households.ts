// Households service.
//
// In DEMO_MODE: parses src/data/equitable_refined_v24.csv (300 client rows
// across 116 households), aggregates row-level fields up to household grain,
// derives activeTriggers/tags/topAction so non-fixture households render
// consistently in the Explore table, then overlays the 9 hand-crafted
// fixtures from demoData.HOUSEHOLDS for IDs that match.
//
// Adapter: toClientThreeSixty(demoHh) projects a UI household into the gold
// ClientThreeSixty shape so callers that already speak gold (LLM context
// builder, eventual Today view services) can consume it without a second path.

import Papa from 'papaparse';
import csvUrl from '@/data/equitable_refined_v24.csv?url';
import { HOUSEHOLDS as FIXTURE_HOUSEHOLDS, ACTIONS } from '@/data/demoData';
import type { DemoHousehold, SalesforceTier, Tag } from '@/types/demo';
import type { ClientThreeSixty } from '@/types/clientThreeSixty';
import { DEMO_MODE } from './config';

// ---------- CSV row shape (subset we actually use) ----------

interface CsvRow {
  'Mining Diamond HH Number': string;
  'Client Last Name': string;
  'Client First Name': string;
  'Client Age': string;
  'Client Segment': string;
  'Asset Segment': string;
  'Wealth Segment': string;
  'Presence of Children': string;
  'New Parent': string;
  'Newly Married': string;
  'Business/Trust Policy': string;
  'Last Contibution Date': string; // typo preserved from source CSV
  'Household Investable Asset': string;
  'Account Value': string;
  'Coverage Amount': string;
  'HH Brokerage Account Value': string;
  'HH Annuity Account Value': string;
  'HH Life Coverage Amount': string;
  'Household Account Value': string;
  'HH Policy Count': string;
  'Recently Transitioned': string;
  'Client Flight Risk (Retention)': string;
  'Term Conversion': string;
  'New Parent Family Protection': string;
  'Newly Married Family Protection': string;
  'RMD Maximization': string;
  'Asset Management': string;
  'Business/Trust Insur Policy Audit': string;
  'Asset Allocation Review': string;
  '(Raise) Increase Contibution': string; // typo preserved
  '(Rollover) New Retirement Client Asset': string;
  'Product Group': string;
}

// Trigger column → label used in PLANNING_THEMES + FILTER_OPTIONS.triggers
const TRIGGER_COLS: { col: keyof CsvRow; label: string }[] = [
  { col: 'Asset Allocation Review', label: 'Asset Allocation Review' },
  { col: 'New Parent Family Protection', label: 'New Parent Family Protection' },
  { col: 'Business/Trust Insur Policy Audit', label: 'Business/Trust Insurance Audit' },
  { col: 'Newly Married Family Protection', label: 'Newly Married Family Protection' },
  { col: 'Asset Management', label: 'Asset Management' },
  { col: 'Term Conversion', label: 'Term Conversion' },
  { col: 'RMD Maximization', label: 'RMD Maximization' },
  { col: '(Raise) Increase Contibution', label: 'Increase Contribution' },
  { col: 'Client Flight Risk (Retention)', label: 'Flight Risk' },
  { col: '(Rollover) New Retirement Client Asset', label: 'Rollover Opportunity' },
];

const isYes = (v: string | undefined) => typeof v === 'string' && v.trim().toUpperCase() === 'Y';
const num = (v: string | undefined) => {
  const n = parseFloat(v ?? '');
  return Number.isFinite(n) ? n : 0;
};

// Aggregate raw client rows into household rows with derived UI fields.
function aggregate(rows: CsvRow[]): DemoHousehold[] {
  const byId = new Map<string, CsvRow[]>();
  for (const r of rows) {
    const id = r['Mining Diamond HH Number'];
    if (!id) continue;
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id)!.push(r);
  }

  const out: DemoHousehold[] = [];
  for (const [id, group] of byId) {
    const first = group[0];
    const triggers = new Set<string>();
    const tags = new Set<Tag>();

    for (const row of group) {
      for (const { col, label } of TRIGGER_COLS) {
        if (isYes(row[col])) triggers.add(label);
      }
      if (isYes(row['Recently Transitioned'])) tags.add('Recently Transitioned');
      if (isYes(row['Client Flight Risk (Retention)'])) tags.add('Flight Risk');
      if (isYes(row['New Parent'])) tags.add('New Parent');
      if (isYes(row['Newly Married'])) tags.add('Newly Married');
      if (isYes(row['Business/Trust Policy'])) tags.add('Has Organization');
    }

    const ages = group.map(r => parseInt(r['Client Age'], 10)).filter(Number.isFinite);
    const lastContact = group
      .map(r => r['Last Contibution Date'])
      .filter(Boolean)
      .sort()
      .pop() ?? '';

    const products = Array.from(new Set(group.map(r => r['Product Group']).filter(Boolean)));
    const lastName = first['Client Last Name'];

    // primaryWealthSegment: pick the highest-age member's individual (single-value)
    // wealth segment from the CSV. The household-level Wealth Segment string can
    // be a multi-value summary ("Multi (Protect / Manage)") which causes
    // substring-based filters to double-count. Hero fixtures override this in
    // the overlay step below.
    const oldest = group.reduce((acc, r) => {
      const a = parseInt(r['Client Age'], 10);
      if (!Number.isFinite(a)) return acc;
      if (!acc || a > acc.age) return { row: r, age: a };
      return acc;
    }, null as { row: CsvRow; age: number } | null);
    const primaryWealthSegment = canonicalWealthSegment(
      oldest?.row['Wealth Segment'] ?? first['Wealth Segment'],
    );

    out.push({
      id: `hh_${id}`,
      name: `${lastName} family`,
      primaryContact: `${first['Client First Name']} ${lastName}`,
      members: group.map(r => ({
        name: `${r['Client First Name']} ${r['Client Last Name']}`,
        age: parseInt(r['Client Age'], 10) || 0,
        segment: r['Client Segment'] ?? '',
        role: '',
      })),
      hhValue: num(first['Household Account Value']),
      investableAssets: num(first['Household Investable Asset']),
      policies: parseInt(first['HH Policy Count'], 10) || 0,
      activeTriggers: triggers.size,
      triggerLabels: Array.from(triggers),
      wealthSegment: first['Wealth Segment'] ?? '',
      primaryWealthSegment,
      assetSegment: first['Asset Segment'] ?? '',
      lastContact,
      tags: Array.from(tags),
      products,
      notes: '',
      salesforceTier: 'C', // overwritten by assignTiers() once all rows known
      maxAge: ages.length ? Math.max(...ages) : undefined,
      topAction: undefined, // filled below
    });
  }
  return out;
}

// Pick a single canonical bucket from a CSV "Wealth Segment" cell. CSV
// member-level rows are single-value; the first match wins. Defaults to
// 'Maintain' if nothing parses (kept stable so quadrant counts always sum).
function canonicalWealthSegment(raw: string | undefined): 'Protect' | 'Develop' | 'Manage' | 'Maintain' {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('protect')) return 'Protect';
  if (s.includes('develop')) return 'Develop';
  if (s.includes('manage')) return 'Manage';
  if (s.includes('maintain')) return 'Maintain';
  return 'Maintain';
}

// Hand-curated primary-segment overrides for hero fixture households whose
// member rows would otherwise resolve ambiguously (multi-segment families).
const HERO_PRIMARY_WEALTH_SEGMENT: Record<string, 'Protect' | 'Develop' | 'Manage' | 'Maintain'> = {
  hh_80011: 'Protect',  // Richardson
  hh_80048: 'Maintain', // Rogers
  hh_80076: 'Maintain', // Rivera
  hh_80051: 'Protect',  // Jimenez
  hh_80007: 'Protect',  // Mendoza
  hh_80015: 'Protect',  // Morales
  hh_80059: 'Protect',  // Hamilton
  hh_80062: 'Develop',  // Russell
  hh_80099: 'Develop',  // Bailey
};

// Deterministic tier assignment for CSV-only households. Roughly
// A=15%, B=30%, C=35%, D=20% across the book. Higher hhValue biases toward
// A/B but we add a small id-based jitter so it isn't purely asset-based —
// per Stephen, this is subjective advisor categorization.
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function assignTiers(households: DemoHousehold[], fixtureIds: Set<string>): void {
  const candidates = households.filter((h) => !fixtureIds.has(h.id));
  // Sort by a composite score: hhValue rank + jitter from id hash
  const ranked = [...candidates]
    .map((h) => ({
      h,
      score: h.hhValue + (hashId(h.id) % 500_000) - 250_000,
    }))
    .sort((a, b) => b.score - a.score);

  const n = ranked.length;
  const aCut = Math.round(n * 0.15);
  const bCut = aCut + Math.round(n * 0.30);
  const cCut = bCut + Math.round(n * 0.35);
  ranked.forEach((r, i) => {
    let tier: SalesforceTier;
    if (i < aCut) tier = 'A';
    else if (i < bCut) tier = 'B';
    else if (i < cCut) tier = 'C';
    else tier = 'D';
    r.h.salesforceTier = tier;
  });
}

// Derive topAction from ACTIONS fixture (fixture households) or from the
// first detected trigger label (CSV-only households).
function fillTopAction(hh: DemoHousehold): DemoHousehold {
  const actionForHh = Object.values(ACTIONS).find(a => a.householdId === hh.id);
  if (actionForHh) return { ...hh, topAction: actionForHh.category };
  // Fall back to the first trigger label embedded as a tag-adjacent signal.
  // We don't track per-household trigger labels in aggregate output; for
  // CSV-only rows show the count or a generic label.
  return { ...hh, topAction: hh.activeTriggers > 0 ? `${hh.activeTriggers} triggers active` : '—' };
}

// Deterministic isReviewed assignment. Tier A + B all reviewed; fill with
// the highest-hhValue Tier C households until we hit REVIEWED_TARGET. Any
// remaining households (Tier C bottom + all Tier D) are unreviewed.
//
// Single source of truth: Book Health "Households reviewed" and the Explore
// "Review status" filter both read from the resulting `isReviewed` flag.
export const REVIEWED_TARGET = 67;

function assignReviewed(households: DemoHousehold[]): void {
  for (const h of households) h.isReviewed = false;
  // Sort by tier rank (A < B < C < D), then hhValue desc within tier.
  // Take the top REVIEWED_TARGET. Guarantees exactly REVIEWED_TARGET reviewed
  // households (assuming households.length >= REVIEWED_TARGET).
  const ranked = [...households].sort((a, b) => {
    const t = TIER_RANK[a.salesforceTier] - TIER_RANK[b.salesforceTier];
    return t !== 0 ? t : (b.hhValue || 0) - (a.hhValue || 0);
  });
  for (let i = 0; i < Math.min(REVIEWED_TARGET, ranked.length); i++) {
    ranked[i].isReviewed = true;
  }
}

// ---------- Cache + loader ----------

let cache: Promise<Map<string, DemoHousehold>> | null = null;

async function loadAll(): Promise<Map<string, DemoHousehold>> {
  if (!DEMO_MODE) {
    // Pulled from Salesforce CRM tiering field (advisor-assigned, refreshed daily)
    // alongside the gold household snapshot.
    throw new Error('householdsService: live mode not implemented');
  }
  if (cache) return cache;

  cache = (async () => {
    const csvText = await fetch(csvUrl).then(r => r.text());
    const parsed = Papa.parse<CsvRow>(csvText, { header: true, skipEmptyLines: true });
    const aggregated = aggregate(parsed.data);

    const fixtureIds = new Set(Object.values(FIXTURE_HOUSEHOLDS).map((f) => f.id));
    // Tier the CSV-only households first so fixture overlays win.
    assignTiers(aggregated, fixtureIds);

    const byId = new Map<string, DemoHousehold>();
    for (const hh of aggregated) byId.set(hh.id, hh);

    // Overlay fixtures — preserve derived maxAge if fixture omits it.
    // Fixture objects don't carry primaryWealthSegment, so apply the curated
    // hero override (or fall back to the canonical parse of the fixture's
    // free-form wealthSegment string).
    for (const fix of Object.values(FIXTURE_HOUSEHOLDS)) {
      const existing = byId.get(fix.id);
      const merged: DemoHousehold = {
        ...fix,
        maxAge: fix.members.length
          ? Math.max(...fix.members.map(m => m.age))
          : existing?.maxAge,
        primaryWealthSegment:
          HERO_PRIMARY_WEALTH_SEGMENT[fix.id]
          ?? existing?.primaryWealthSegment
          ?? canonicalWealthSegment(fix.wealthSegment),
        triggerLabels: fix.triggerLabels ?? existing?.triggerLabels ?? [],
      };
      byId.set(fix.id, merged);
    }

    // Fill topAction last so fixtures and CSV rows go through the same path.
    for (const [id, hh] of byId) byId.set(id, fillTopAction(hh));

    // Assign isReviewed across the fully merged set so counts include fixtures.
    assignReviewed(Array.from(byId.values()));
    return byId;
  })();

  return cache;
}

// ---------- Adapter: UI household → gold ClientThreeSixty ----------

function toClientThreeSixty(hh: DemoHousehold): Partial<ClientThreeSixty> {
  // Partial — fixtures don't carry every gold field. The eventual live
  // Supabase implementation will return full ClientThreeSixty rows.
  return {
    householdId: hh.id,
    totalAssetsUsd: hh.hhValue,
    investableAssetsUsd: hh.investableAssets,
    aumUsd: hh.hhValue,
    opportunityCountOpen: hh.activeTriggers,
    lastContactOn: hh.lastContact || null,
    isCurrent: true,
  };
}

// ---------- Potential opportunities (heuristic, member-level) ----------

export interface PotentialOpportunity {
  memberName: string;
  label: string;
  rationale: string;
}

function derivePotentialForMember(m: { name: string; age: number; segment: string }): PotentialOpportunity | null {
  const seg = (m.segment ?? '').toLowerCase();
  if (m.age >= 70) {
    return {
      memberName: m.name,
      label: 'RMD planning review',
      rationale: `Age ${m.age} — required minimum distributions apply`,
    };
  }
  if (seg.includes('pre-retire') || seg.includes('pre retire')) {
    return {
      memberName: m.name,
      label: 'Retirement income planning conversation',
      rationale: `${m.segment} segment — income strategy window`,
    };
  }
  if (m.age >= 50 && m.age <= 55) {
    return {
      memberName: m.name,
      label: 'Catch-up contribution eligibility',
      rationale: `Age ${m.age} — eligible for 401(k)/IRA catch-up`,
    };
  }
  if (seg.includes('career starter') || seg.includes('career-starter')) {
    return {
      memberName: m.name,
      label: 'Contribution rate review',
      rationale: `${m.segment} — opportunity to set savings cadence`,
    };
  }
  return null;
}

// ---------- AUM rollups ----------

export interface BookAumOptions {
  /** When set, "reviewed" is sum of hhValue of top N households ordered
   *  by Salesforce tier (A>B>C>D) then by hhValue desc. */
  reviewedCount?: number;
  /** When set, "contacted" is sum of hhValue of top N households by hhValue desc. */
  contactedCount?: number;
}

export interface BookAum {
  total: number;
  reviewed: number;
  contacted: number;
  flightRisk: number;
  outside: number;
}

const TIER_RANK: Record<SalesforceTier, number> = { A: 0, B: 1, C: 2, D: 3 };

export function computeBookAum(
  households: DemoHousehold[],
  opts: BookAumOptions = {},
): BookAum {
  const total = households.reduce((s, h) => s + (h.hhValue || 0), 0);
  const outside = households.reduce(
    (s, h) => s + Math.max((h.investableAssets || 0) - (h.hhValue || 0), 0),
    0,
  );
  const flightRisk = households
    .filter((h) => h.tags.includes('Flight Risk'))
    .reduce((s, h) => s + (h.hhValue || 0), 0);

  let reviewed = 0;
  if (opts.reviewedCount && opts.reviewedCount > 0) {
    const ranked = [...households].sort((a, b) => {
      const t = TIER_RANK[a.salesforceTier] - TIER_RANK[b.salesforceTier];
      return t !== 0 ? t : (b.hhValue || 0) - (a.hhValue || 0);
    });
    reviewed = ranked.slice(0, opts.reviewedCount).reduce((s, h) => s + (h.hhValue || 0), 0);
  }

  let contacted = 0;
  if (opts.contactedCount && opts.contactedCount > 0) {
    const ranked = [...households].sort((a, b) => (b.hhValue || 0) - (a.hhValue || 0));
    contacted = ranked.slice(0, opts.contactedCount).reduce((s, h) => s + (h.hhValue || 0), 0);
  }

  return { total, reviewed, contacted, flightRisk, outside };
}

// ---------- Theme → trigger-column mapping ----------
//
// IMPORTANT: there are TWO definitions of "households in theme X" in this app.
// Do not conflate them.
//
//   1) BOOK-LEVEL TRIGGER PRESENCE — "how many households in the book have at
//      least one underlying trigger flag mapped to this theme?"  This is what
//      Book Health > Gaps by Theme reports and what the Explore Theme filter
//      should match.  Implemented via getThemeTriggerLabels() + a household's
//      `triggerLabels` array.
//
//   2) CURATED ACTION THEME — "how many actions in the curated Today queue
//      have action.theme === X?"  This is what the Today sidebar Theme filter
//      uses.  Numbers are small by design because the queue is curated.
//
// Both are correct at their own level of abstraction. The Today sidebar count
// (#2) and the Gaps by Theme count (#1) being different is NOT a bug.

const THEME_TRIGGER_MAP: Record<string, string[]> = {
  retirement: ['RMD Maximization'],
  protection: ['Term Conversion', 'New Parent Family Protection'],
  wealth_transfer: ['Business/Trust Insurance Audit'],
  portfolio_hygiene: ['Asset Allocation Review', 'Asset Management'],
  retention: ['Flight Risk'],
  tax_aware: [],
  growth: ['Increase Contribution', 'Rollover Opportunity'],
  newly_married: ['Newly Married Family Protection'],
  policy_review: [],
};

/** Returns the canonical trigger labels (matching TRIGGER_COLS labels) that
 *  a household must have at least one of to be considered "in" the given
 *  theme at the BOOK level. Accepts either a planning-theme slug/label
 *  ('newly_married', 'Newly Married', 'Protection') or one of the Gaps by
 *  Theme bar labels ('Asset Allocation', 'RMD', 'Business/Trust', etc.). */
export function getThemeTriggerLabels(themeIdOrLabel: string): string[] {
  const slug = themeIdOrLabel
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  if (THEME_TRIGGER_MAP[slug]) return THEME_TRIGGER_MAP[slug];

  // Gaps by Theme bar labels are abbreviated trigger names. Match by
  // substring against the canonical TRIGGER_COLS labels.
  const allTriggerLabels = TRIGGER_COLS.map((t) => t.label);
  const needle = themeIdOrLabel.toLowerCase().split('/')[0].trim();
  const matched = allTriggerLabels.filter((label) => {
    const l = label.toLowerCase();
    return l.includes(needle) || needle.includes(l.split(' ')[0]);
  });
  return matched;
}

/** Book-level count: number of households with at least one trigger flag
 *  mapped to the given theme. This is the SAME logic used by the Explore
 *  Theme filter (see Explore.tsx) — keep them in lockstep so Gaps by Theme
 *  bar counts always reconcile with Explore's "X of N" subtitle. */
export function getHouseholdCountByTheme(
  themeIdOrLabel: string,
  households: DemoHousehold[],
): number {
  const wanted = getThemeTriggerLabels(themeIdOrLabel);
  if (wanted.length === 0) {
    // Fallback parity with Explore: substring-match against topAction.
    const needle = themeIdOrLabel.toLowerCase();
    return households.filter((h) => (h.topAction ?? '').toLowerCase().includes(needle)).length;
  }
  const wantedSet = new Set(wanted);
  return households.filter((h) =>
    (h.triggerLabels ?? []).some((t) => wantedSet.has(t)),
  ).length;
}


export const householdsService = {
  computeBookAum,
  async getAll(): Promise<DemoHousehold[]> {
    const m = await loadAll();
    return Array.from(m.values());
  },

  async get(id: string): Promise<DemoHousehold | null> {
    const m = await loadAll();
    return m.get(id) ?? null;
  },

  async getClient360(id: string): Promise<Partial<ClientThreeSixty> | null> {
    const hh = await this.get(id);
    return hh ? toClientThreeSixty(hh) : null;
  },

  toClientThreeSixty,

  async potentialOpportunities(id: string): Promise<PotentialOpportunity[]> {
    const hh = await this.get(id);
    if (!hh) return [];
    return hh.members
      .map(derivePotentialForMember)
      .filter((p): p is PotentialOpportunity => p !== null);
  },
};
