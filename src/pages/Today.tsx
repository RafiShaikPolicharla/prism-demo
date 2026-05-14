import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  householdsService,
  opportunitiesService,
  personasService,
  strategyListsService,
  CLIENT_SEGMENTS,
  WEALTH_SEGMENTS,
  type HouseholdMeta,
  type TodayFilters,
} from '@/services';
import { getHouseholdCountByTheme } from '@/services/households';
import { usePersona } from '@/stores/personaStore';
import { PersonaSwitcher } from '@/components/today/PersonaSwitcher';
import { ActionCard } from '@/components/today/ActionCard';
import { ContextPanel } from '@/components/today/ContextPanel';
import { TopNav } from '@/components/TopNav';
import { Button } from '@/components/ui/button';
import { contentService } from '@/services';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import type { DemoHousehold } from '@/types/demo';

function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

import type { TodayFilterState } from '@/stores/personaStore';

type FilterState = TodayFilterState;

const EMPTY: FilterState = { themeId: null, clientSegmentId: null, wealthSegmentId: null, tierId: null };

const TIERS: { id: 'A' | 'B' | 'C' | 'D'; label: string }[] = [
  { id: 'A', label: 'Tier A' },
  { id: 'B', label: 'Tier B' },
  { id: 'C', label: 'Tier C' },
  { id: 'D', label: 'Tier D' },
];

function getPrimarySegment(hh: DemoHousehold): string | undefined {
  return hh.members[0]?.segment || undefined;
}

export default function Today() {
  const navigate = useNavigate();
  const { personaId, completedThisWeek, incrementCompleted, todayFilters: filters, setTodayFilters: setFilters, pushedCoachableMoments } = usePersona();
  const persona = personasService.get(personaId);
  const themes = useMemo(() => contentService.themes(), []);
  const [households, setHouseholds] = useState<Map<string, DemoHousehold>>(new Map());

  // Filters now live in PersonaProvider so they survive Today → drill-down →
  // Today round-trips. PersonaProvider resets them on persona switch.

  useEffect(() => {
    let alive = true;
    householdsService.getAll().then((all) => {
      if (!alive) return;
      const m = new Map<string, DemoHousehold>();
      for (const hh of all) m.set(hh.id, hh);
      setHouseholds(m);
    });
    return () => { alive = false; };
  }, []);

  const metaByHouseholdId = useMemo(() => {
    const m = new Map<string, HouseholdMeta>();
    for (const [id, hh] of households) {
      m.set(id, {
        clientSegment: getPrimarySegment(hh),
        wealthSegment: hh.wealthSegment,
        primaryWealthSegment: hh.primaryWealthSegment,
      });
    }
    return m;
  }, [households]);

  // Senior persona: AUM rollups across the whole book. "Reviewed" households
  // are sourced from the canonical isReviewed flag (set in householdsService),
  // so this count and the Explore "Review status: Reviewed" filter always
  // reconcile. AUM reviewed = sum(hhValue where isReviewed === true).
  const bookAum = useMemo(() => {
    if (personaId !== 'senior' || !persona.bookHealth) return undefined;
    const all = Array.from(households.values());
    if (all.length === 0) return undefined;
    const total = all.reduce((s, h) => s + (h.hhValue || 0), 0);
    const reviewed = all
      .filter((h) => h.isReviewed)
      .reduce((s, h) => s + (h.hhValue || 0), 0);
    const outside = all.reduce(
      (s, h) => s + Math.max((h.investableAssets || 0) - (h.hhValue || 0), 0),
      0,
    );
    return {
      total,
      highlighted: reviewed,
      highlightedPct: total > 0 ? Math.round((reviewed / total) * 100) : 0,
      outside,
    };
  }, [personaId, persona, households]);

  // Reviewed household count (canonical, from isReviewed).
  const reviewedCount = useMemo(() => {
    if (personaId !== 'senior') return 0;
    return Array.from(households.values()).filter((h) => h.isReviewed).length;
  }, [personaId, households]);

  // Compute Gaps by Theme dynamically from household trigger data so the
  // counts stay in lockstep with the Explore Theme filter. Sorted desc.
  const gapsByTheme = useMemo<Record<string, number> | undefined>(() => {
    if (personaId !== 'senior' || !persona?.bookHealth) return undefined;
    const all = Array.from(households.values());
    if (all.length === 0) return undefined;
    const entries = themes
      .filter((t) => t.status !== 'coming_soon')
      .map((t) => [t.label, getHouseholdCountByTheme(t.label, all)] as const)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1]);
    return Object.fromEntries(entries);
  }, [personaId, persona, households, themes]);

  // Compute Share of Wallet quadrant counts AND dollar values dynamically
  // from primaryWealthSegment / hhValue, so both reconcile with the Explore
  // Wealth Segment filter (same field, same numbers, same AUM).
  const shareOfWallet = useMemo(() => {
    if (personaId !== 'senior' || !persona?.bookHealth) return undefined;
    const all = Array.from(households.values());
    if (all.length === 0) return undefined;
    const sums: Record<'Protect' | 'Develop' | 'Manage' | 'Maintain', { count: number; valueUsd: number }> = {
      Protect:  { count: 0, valueUsd: 0 },
      Develop:  { count: 0, valueUsd: 0 },
      Manage:   { count: 0, valueUsd: 0 },
      Maintain: { count: 0, valueUsd: 0 },
    };
    for (const hh of all) {
      const seg = hh.primaryWealthSegment;
      if (seg && seg in sums) {
        sums[seg].count += 1;
        sums[seg].valueUsd += hh.hhValue ?? 0;
      }
    }
    return {
      protect:  sums.Protect,
      develop:  sums.Develop,
      maintain: sums.Maintain,
      manage:   sums.Manage,
    };
  }, [personaId, persona, households]);

  const personaForPanel = useMemo(() => {
    if (!persona?.bookHealth && !persona?.ninetyDayTracker) return persona;
    const next = { ...persona };
    if (persona.bookHealth) {
      const bh = { ...persona.bookHealth };
      if (gapsByTheme) bh.gapsByTheme = gapsByTheme;
      if (shareOfWallet) bh.shareOfWallet = shareOfWallet;
      if (reviewedCount != null && reviewedCount > 0) bh.householdsReviewed = reviewedCount;
      next.bookHealth = bh;
    }
    // Acquired: derive transitioned-household contacted ratio from the
    // Newly Transitioned Outreach strategy list (canonical source). This
    // keeps the 90-Day Tracker line in lockstep with the Explore sidebar
    // count and the AUM contacted %.
    if (personaId === 'acquired' && persona.ninetyDayTracker && households.size > 0) {
      const all = Array.from(households.values());
      strategyListsService.ensureSeeded(all);
      const list = strategyListsService.getById('sl_newly_transitioned');
      if (list) {
        next.ninetyDayTracker = {
          ...persona.ninetyDayTracker,
          topRelationshipsContacted: list.contactedIds.length,
          topRelationshipsTotal: list.householdIds.length,
        };
      }
    }
    return next;
  }, [persona, personaId, gapsByTheme, shareOfWallet, reviewedCount, households]);

  // Acquired persona: AUM rollups across the 25 Recently Transitioned
  // households. "Contacted" is sourced from the Newly Transitioned Outreach
  // strategy list's contactedIds — the same list shown in the Explore
  // sidebar (e.g. "18 / 25 contacted"). This guarantees the 90-Day Tracker
  // AUM contacted % reconciles with the strategy list count and with the
  // narrative that high-AUM retention-risk households (Jimenez, Mendoza,
  // Morales) remain uncontacted.
  const inheritedAum = useMemo(() => {
    if (personaId !== 'acquired' || !persona.ninetyDayTracker) return undefined;
    const all = Array.from(households.values());
    const transitioned = all.filter((h) => h.tags.includes('Recently Transitioned'));
    if (transitioned.length === 0) return undefined;
    strategyListsService.ensureSeeded(all);
    const list = strategyListsService.getById('sl_newly_transitioned');
    const contactedSet = new Set(list?.contactedIds ?? []);
    const total = transitioned.reduce((s, h) => s + (h.hhValue || 0), 0);
    const contacted = transitioned
      .filter((h) => contactedSet.has(h.id))
      .reduce((s, h) => s + (h.hhValue || 0), 0);
    const flightRisk = transitioned
      .filter((h) => h.tags.includes('Flight Risk'))
      .reduce((s, h) => s + (h.hhValue || 0), 0);
    return {
      total,
      highlighted: contacted,
      highlightedPct: total > 0 ? Math.round((contacted / total) * 100) : 0,
      flightRisk,
    };
  }, [personaId, persona, households]);

  const todayFilters: TodayFilters = {
    themeId: filters.themeId,
    clientSegmentId: filters.clientSegmentId,
    wealthSegmentId: filters.wealthSegmentId,
  };

  const baseActions = useMemo(
    () => opportunitiesService.listForPersonaToday(personaId),
    [personaId],
  );
  const filteredByService = useMemo(
    () => opportunitiesService.listForPersonaToday(personaId, todayFilters, metaByHouseholdId),
    [personaId, filters, metaByHouseholdId],
  );
  const actions = useMemo(
    () =>
      filters.tierId
        ? filteredByService.filter((a) => households.get(a.householdId)?.salesforceTier === filters.tierId)
        : filteredByService,
    [filteredByService, filters.tierId, households],
  );
  const counts = useMemo(
    () => opportunitiesService.countsForPersonaToday(personaId, metaByHouseholdId),
    [personaId, metaByHouseholdId],
  );
  const tierCounts = useMemo(() => {
    const c: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const a of baseActions) {
      const t = households.get(a.householdId)?.salesforceTier;
      if (t) c[t] = (c[t] ?? 0) + 1;
    }
    return c;
  }, [baseActions, households]);

  if (!persona) return null;

  const themeSlug = (label: string) =>
    label.toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '');

  const toggle = (key: keyof FilterState, value: string) =>
    setFilters((f) => ({ ...f, [key]: f[key] === value ? null : value }));

  const activeChips: { key: keyof FilterState; label: string }[] = [];
  if (filters.themeId) {
    const t = themes.find(t => themeSlug(t.label) === filters.themeId || t.id === filters.themeId);
    activeChips.push({ key: 'themeId', label: t?.label ?? filters.themeId });
  }
  if (filters.clientSegmentId) {
    const s = CLIENT_SEGMENTS.find(s => s.id === filters.clientSegmentId);
    activeChips.push({ key: 'clientSegmentId', label: s?.label ?? filters.clientSegmentId });
  }
  if (filters.wealthSegmentId) {
    const s = WEALTH_SEGMENTS.find(s => s.id === filters.wealthSegmentId);
    activeChips.push({ key: 'wealthSegmentId', label: s?.label ?? filters.wealthSegmentId });
  }
  if (filters.tierId) {
    activeChips.push({ key: 'tierId', label: `Tier ${filters.tierId}` });
  }

  const openInExplore = () => {
    const params = new URLSearchParams();
    if (filters.themeId) params.set('theme', filters.themeId);
    if (filters.clientSegmentId) params.set('clientSegment', filters.clientSegmentId);
    if (filters.wealthSegmentId) params.set('wealthSegment', filters.wealthSegmentId);
    navigate(`/explore${params.toString() ? `?${params}` : ''}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="mx-auto max-w-[1600px] px-4 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)_320px] gap-6">
          <aside className="space-y-6">
            <PersonaSwitcher />

            <PaneHeader title="Filter your priorities" subtitle="Narrow today's actions" />

            <FilterGroup
              header="Planning Themes"
              items={themes.map((t) => {
                const id = themeSlug(t.label);
                return {
                  id,
                  label: t.label,
                  count: counts.themes[id] ?? 0,
                  icon: t.icon,
                  status: t.status,
                  comingSoonTooltip:
                    t.id === 'succession'
                      ? 'Succession Planning views for advisors approaching retirement — coming in pilot'
                      : undefined,
                };
              })}
              activeId={filters.themeId}
              onToggle={(id) => toggle('themeId', id)}
            />

            <FilterGroup
              header="Client Tier"
              items={TIERS.map((t) => ({
                id: t.id,
                label: t.label,
                count: tierCounts[t.id] ?? 0,
              }))}
              activeId={filters.tierId}
              onToggle={(id) => toggle('tierId', id)}
            />

            <FilterGroup
              header="Client Segment"
              items={CLIENT_SEGMENTS.map((s) => ({
                id: s.id, label: s.label, count: counts.clientSegments[s.id] ?? 0,
              }))}
              activeId={filters.clientSegmentId}
              onToggle={(id) => toggle('clientSegmentId', id)}
            />

            <FilterGroup
              header="Wealth Segment"
              items={WEALTH_SEGMENTS.map((s) => ({
                id: s.id, label: s.label, count: counts.wealthSegments[s.id] ?? 0,
              }))}
              activeId={filters.wealthSegmentId}
              onToggle={(id) => toggle('wealthSegmentId', id)}
            />
          </aside>

          <main className="min-w-0">
            <header className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                  {greetingFor()}, {persona.advisorName.split(' ')[0]}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">{persona.tagline}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-semibold tabular-nums text-foreground">
                  {completedThisWeek}
                </div>
                <div className="text-xs text-muted-foreground">
                  actions completed this week
                </div>
              </div>
            </header>

            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
                Today's Priorities
              </h2>
            </div>

            {activeChips.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">Filtered by:</span>
                {activeChips.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setFilters((f) => ({ ...f, [c.key]: null }))}
                    className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--accent-blue)/0.3)] bg-[hsl(var(--accent-blue)/0.08)] px-2 py-0.5 text-[hsl(var(--accent-blue))] hover:bg-[hsl(var(--accent-blue)/0.15)]"
                  >
                    {c.label}
                    <X className="h-3 w-3" />
                  </button>
                ))}
                <span className="text-muted-foreground">
                  Showing {actions.length} of {baseActions.length} actions
                </span>
                {activeChips.length >= 2 && (
                  <button
                    onClick={() => setFilters(EMPTY)}
                    className="ml-1 text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
            )}

            <div className="space-y-3">
              {actions.map((a) => (
                <ActionCard
                  key={a.id}
                  action={a}
                  householdName={households.get(a.householdId)?.name ?? a.householdId}
                  tier={households.get(a.householdId)?.salesforceTier}
                  onActionTaken={incrementCompleted}
                />
              ))}
              {actions.length === 0 && baseActions.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No priorities for today.
                </div>
              )}
              {actions.length === 0 && baseActions.length > 0 && (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground space-y-3">
                  <p>
                    No actions match these filters today. Try adjusting your filters
                    or check Explore for more opportunities.
                  </p>
                  <Button variant="outline" size="sm" onClick={openInExplore}>
                    Open in Explore
                  </Button>
                </div>
              )}
            </div>
          </main>

          <aside>
            <ContextPanel
              persona={personaForPanel}
              bookAum={bookAum}
              inheritedAum={inheritedAum}
              pushedMoments={personaId === 'junior' || personaId === 'acquired' ? pushedCoachableMoments[personaId] : undefined}
              onWealthSegmentClick={(id) => navigate(`/explore?wealthSegment=${id}&sourceAum=1`)}
              onThemeClick={(label) => navigate(`/explore?theme=${encodeURIComponent(label)}`)}
              onReviewCoverageClick={() => navigate(`/explore?reviewStatus=reviewed&sourceAum=1`)}
              onRetentionRiskClick={() =>
                navigate(`/explore?tags=${encodeURIComponent('Flight Risk,Recently Transitioned')}`)
              }
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

interface FilterItem {
  id: string;
  label: string;
  count: number;
  icon?: string;
  status?: 'coming_soon';
  comingSoonTooltip?: string;
}

function PaneHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="px-2">
      <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
        {title}
      </h2>
      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{subtitle}</p>
    </div>
  );
}

function FilterGroup({
  header, items, activeId, onToggle,
}: {
  header: string;
  items: FilterItem[];
  activeId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <h3 className="px-2 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {header}
      </h3>
      <ul className="flex flex-col gap-0.5">
        {items.map((it) => {
          const isActive = it.id === activeId;
          const isComingSoon = it.status === 'coming_soon';
          const disabled = isComingSoon || (it.count === 0 && !isActive);
          return (
            <li key={it.id}>
              <button
                onClick={() => !disabled && onToggle(it.id)}
                disabled={disabled}
                title={isComingSoon ? it.comingSoonTooltip : undefined}
                className={cn(
                  'w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors border-l-2',
                  isActive
                    ? 'bg-[hsl(var(--accent-blue)/0.1)] text-[hsl(var(--accent-blue))] font-semibold border-[hsl(var(--accent-blue))]'
                    : isComingSoon
                      ? 'text-foreground border-transparent opacity-50 cursor-not-allowed'
                      : disabled
                        ? 'text-muted-foreground/40 border-transparent cursor-not-allowed'
                        : 'text-foreground hover:bg-muted border-transparent',
                )}
              >
                <span className="flex items-center gap-2 truncate">
                  {it.icon && <span aria-hidden className="text-base leading-none">{it.icon}</span>}
                  <span className="truncate">{it.label}</span>
                </span>
                {isComingSoon ? (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground italic">
                    Coming soon
                  </span>
                ) : (
                  <span className={cn(
                    'text-xs tabular-nums',
                    isActive ? 'text-[hsl(var(--accent-blue))]' : 'text-muted-foreground',
                  )}>
                    {it.count}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
