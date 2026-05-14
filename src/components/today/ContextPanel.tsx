import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, AlertTriangle, ArrowUpRight, Sparkles, Target, Quote } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { CoachItemSource, Persona, ShareOfWalletQuadrant } from '@/types/demo';
import type { PushedMoment } from '@/stores/personaStore';

type WealthSegmentId = 'protect' | 'develop' | 'manage' | 'maintain';

export interface AumSummary {
  total: number;
  highlighted: number;     // reviewed (senior) or contacted (acquired)
  highlightedPct: number;  // 0-100
  flightRisk?: number;     // acquired only
  outside?: number;        // senior only
}

export function ContextPanel({
  persona,
  onWealthSegmentClick,
  onThemeClick,
  onReviewCoverageClick,
  onRetentionRiskClick,
  bookAum,
  inheritedAum,
  pushedMoments,
}: {
  persona: Persona;
  onWealthSegmentClick?: (segmentId: WealthSegmentId) => void;
  onThemeClick?: (themeLabel: string) => void;
  onReviewCoverageClick?: () => void;
  onRetentionRiskClick?: () => void;
  bookAum?: AumSummary;
  inheritedAum?: AumSummary;
  pushedMoments?: PushedMoment[];
}) {
  if (persona.contextPanel === 'bookHealth' && persona.bookHealth) {
    return (
      <div className="space-y-3">
        <PaneHeader title="Book Health" subtitle="Coverage and concentration" />
        <BookHealthCard
          data={persona.bookHealth}
          aum={bookAum}
          onWealthSegmentClick={onWealthSegmentClick}
          onThemeClick={onThemeClick}
          onReviewCoverageClick={onReviewCoverageClick}
        />
      </div>
    );
  }
  if (persona.contextPanel === 'coachMode' && persona.coachMode) {
    return (
      <div className="space-y-3">
        <PaneHeader title="Coach Mode" subtitle="Your book at a glance" />
        <CoachModeCard data={persona.coachMode} pushedMoments={pushedMoments} />
      </div>
    );
  }
  if (persona.contextPanel === 'ninetyDayTracker' && persona.ninetyDayTracker) {
    return (
      <div className="space-y-3">
        <PaneHeader title="90-Day Tracker" subtitle="Your book at a glance" />
        <NinetyDayCard data={persona.ninetyDayTracker} aum={inheritedAum} onRetentionRiskClick={onRetentionRiskClick} />
      </div>
    );
  }
  return null;
}

function PaneHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="px-1">
      <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
        {title}
      </h2>
      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{subtitle}</p>
    </div>
  );
}

function PanelHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
        {eyebrow}
      </div>
      <h3 className="text-base font-semibold text-foreground mt-1">{title}</h3>
    </div>
  );
}

function formatUsdCompact(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

function BookHealthCard({
  data,
  aum,
  onWealthSegmentClick,
  onThemeClick,
  onReviewCoverageClick,
}: {
  data: NonNullable<Persona['bookHealth']>;
  aum?: AumSummary;
  onWealthSegmentClick?: (segmentId: WealthSegmentId) => void;
  onThemeClick?: (themeLabel: string) => void;
  onReviewCoverageClick?: () => void;
}) {
  const pct = Math.round((data.householdsReviewed / data.reviewedTarget) * 100);

  return (
    <Card className="p-0">
      <div className="bg-card p-5 pb-4 border-b border-border space-y-4">
        {aum && <TotalAumSection aum={aum} />}
        <h3 className="text-base font-semibold text-foreground">Review coverage</h3>
        <button
          type="button"
          onClick={onReviewCoverageClick}
          className="w-full text-left rounded-sm hover:bg-muted/50 -mx-1 px-1 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent-blue))] group"
        >
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm text-muted-foreground inline-flex items-center gap-1">
              Households reviewed
              <ArrowUpRight className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
            </span>
            <span className="text-sm font-medium tabular-nums">
              {data.householdsReviewed} / {data.reviewedTarget}
            </span>
          </div>
          <Progress value={pct} className="h-2" />
        </button>
      </div>

      <div className="p-5 pt-4 space-y-5">
        <ShareOfWalletMatrix
          data={data.shareOfWallet}
          onSegmentClick={onWealthSegmentClick}
        />

        {data.gapsByTheme && (
          <GapsByTheme data={data.gapsByTheme} onThemeClick={onThemeClick} />
        )}

        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
            Team
          </div>
          <ul className="space-y-1.5">
            {data.teamMembers.map((m) => (
              <li key={m.name} className="flex items-center justify-between text-sm">
                <div>
                  <div className="text-foreground">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.role}</div>
                </div>
                <Badge variant="outline" className="capitalize">{m.availability}</Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

function GapsByTheme({
  data,
  onThemeClick,
}: {
  data: Record<string, number>;
  onThemeClick?: (themeLabel: string) => void;
}) {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] ?? 1;
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">
        Gaps by Theme
      </div>
      <ul className="space-y-1.5">
        {sorted.map(([label, count]) => {
          const pct = Math.round((count / max) * 100);
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => onThemeClick?.(label)}
                className="group w-full flex items-center gap-2 text-left rounded-sm px-1 py-0.5 hover:bg-muted/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent-blue))]"
              >
                <span className="text-xs text-foreground w-32 shrink-0 truncate">{label}</span>
                <span className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <span
                    className="block h-full bg-[hsl(var(--accent-blue))] group-hover:brightness-110 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="text-xs font-medium tabular-nums text-muted-foreground w-8 text-right">
                  {count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ShareOfWalletMatrix({
  data,
  onSegmentClick,
}: {
  data: NonNullable<Persona['bookHealth']>['shareOfWallet'];
  onSegmentClick?: (segmentId: WealthSegmentId) => void;
}) {
  const cell = (
    segmentId: WealthSegmentId,
    label: string,
    bg: string,
    q: ShareOfWalletQuadrant,
  ) => (
    <button
      type="button"
      onClick={() => onSegmentClick?.(segmentId)}
      className={cn(
        'group rounded-md p-2.5 text-left transition-all',
        'hover:brightness-125 hover:shadow-sm cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent-blue))]',
      )}
      style={{ backgroundColor: bg }}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-white/90">
        {label}
      </div>
      <div className="text-xl font-bold tabular-nums text-white mt-0.5 leading-tight">
        {q.count}
      </div>
      <div className="text-[11px] text-white/70 tabular-nums">
        {formatUsdCompact(q.valueUsd)}
      </div>
    </button>
  );

  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
        Share of Wallet
      </div>
      <div className="text-[11px] text-muted-foreground mt-0.5 mb-3">
        By strategic zone
      </div>

      <div className="flex gap-2">
        <div className="flex flex-col items-center justify-center py-1">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70 [writing-mode:vertical-rl] rotate-180 whitespace-nowrap">
            Outside Assets · low → high
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-2 gap-1.5">
            {cell('develop', 'Develop', '#1E3A8A', data.develop)}
            {cell('protect', 'Protect', '#7F1D1D', data.protect)}
            {cell('manage', 'Manage', '#14532D', data.manage)}
            {cell('maintain', 'Maintain', '#374151', data.maintain)}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground/70 text-center mt-1.5">
            Share of Wallet · low → high
          </div>
        </div>
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: CoachItemSource }) {
  if (source === 'mentor') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-[#F3F4F6] text-[#1E3A5F] border border-[#475569]/40 dark:bg-[#1F2937] dark:text-[#F9FAFB] dark:border-[#475569] whitespace-nowrap">
        <span className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full bg-[#1E3A5F] text-[8px] font-semibold text-white dark:bg-[#475569]">
          PC
        </span>
        From Patricia
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-[#FEF3C7] text-[#92400E] dark:bg-[#78532A] dark:text-[#FCD34D] whitespace-nowrap">
      <Sparkles className="h-2.5 w-2.5" />
      Suggested by Prism
    </span>
  );
}

function CoachSubhead({
  label,
  source,
  icon,
}: {
  label: string;
  source: CoachItemSource;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2">
      <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground font-medium">
        {icon}
        {label}
      </span>
      <SourceBadge source={source} />
    </div>
  );
}

function CoachModeCard({
  data,
  pushedMoments = [],
}: {
  data: NonNullable<Persona['coachMode']>;
  pushedMoments?: PushedMoment[];
}) {
  const { fromPatricia, prismSuggestion, mentor } = data;
  const { weeklyGoal, standingCoaching } = fromPatricia;
  const goalPct = Math.round((weeklyGoal.completed / weeklyGoal.target) * 100);
  const goalDateline = [
    weeklyGoal.setOn && `Set by Patricia, ${weeklyGoal.setOn}`,
    weeklyGoal.completesOn && `completes ${weeklyGoal.completesOn}`,
  ]
    .filter(Boolean)
    .join(' — ');
  return (
    <Card className="p-5 space-y-5">
      <div>
        <CoachSubhead
          label="From Patricia"
          source="mentor"
          icon={<Target className="h-3 w-3" />}
        />
        {weeklyGoal.delegationLead && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            {weeklyGoal.delegationLead}
          </p>
        )}
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <span className="text-sm text-foreground">{weeklyGoal.label}</span>
          <span className="text-sm font-medium tabular-nums">
            {weeklyGoal.completed} of {weeklyGoal.target}
          </span>
        </div>
        <Progress value={goalPct} className="h-2" />
        {goalDateline && (
          <div className="mt-1.5 text-[11px] text-muted-foreground italic">
            {goalDateline}
          </div>
        )}
      </div>

      <div className="border-t-2 border-border" />

      <div>
        <CoachSubhead
          label="Patricia's Coaching"
          source="mentor"
          icon={<Quote className="h-3 w-3" />}
        />
        <p className="text-sm text-foreground italic leading-relaxed">
          “{standingCoaching.text}”
        </p>
      </div>

      <div className="border-t border-border" />

      <div>
        <CoachSubhead label="Prism Suggestion" source="system" />
        <p className="text-sm text-foreground leading-relaxed">{prismSuggestion.text}</p>
      </div>

      {pushedMoments.map((m) => (
        <div key={m.id}>
          <div className="border-t-2 border-border mb-5" />
          <CoachSubhead
            label={m.type === 'weekly_goal' ? 'From Patricia' : "Patricia's Coaching"}
            source="mentor"
            icon={m.type === 'weekly_goal' ? <Target className="h-3 w-3" /> : <Quote className="h-3 w-3" />}
          />
          <p className={cn('text-sm leading-relaxed', m.type === 'standing_coaching' ? 'text-foreground italic' : 'text-foreground')}>
            {m.type === 'standing_coaching' ? `“${m.content}”` : m.content}
          </p>
          <div className="mt-1.5 text-[11px] text-[hsl(var(--accent-blue))] italic">
            Just pushed by Patricia
          </div>
        </div>
      ))}

      <div className="pt-2 border-t border-border">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Mentor
        </div>
        <div className="text-sm text-foreground mt-1">{mentor.name}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Last check-in: {mentor.lastCheckIn}
        </div>
      </div>
    </Card>
  );
}

function NinetyDayCard({ data, aum, onRetentionRiskClick }: { data: NonNullable<Persona['ninetyDayTracker']>; aum?: AumSummary; onRetentionRiskClick?: () => void }) {
  const pct = Math.round((data.daysIn / data.totalDays) * 100);
  const relPct = Math.round((data.topRelationshipsContacted / data.topRelationshipsTotal) * 100);
  return (
    <Card className="p-5 space-y-5">
      {aum && (
        <>
          <InheritedAumSection aum={aum} onRetentionRiskClick={onRetentionRiskClick} />
          <div className="border-t border-border" />
        </>
      )}
      <PanelHeader eyebrow="90-Day Tracker" title={`Day ${data.daysIn} of ${data.totalDays}`} />
      <Progress value={pct} className="h-2" />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-muted/50 p-3">
          <div className="text-xs text-muted-foreground">Inherited households</div>
          <div className="text-lg font-semibold tabular-nums mt-1">
            {data.topRelationshipsContacted}<span className="text-muted-foreground text-sm">/{data.topRelationshipsTotal}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">contacted ({relPct}%)</div>
        </div>
        <div className="rounded-md bg-muted/50 p-3">
          <div className="text-xs text-muted-foreground">Retention risks</div>
          <div className="text-lg font-semibold tabular-nums mt-1 text-[hsl(var(--urgency-act-now))]">
            {data.retentionRiskCount}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{data.dataGapsCount} data gaps</div>
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
          Milestones
        </div>
        <ul className="space-y-2">
          {data.milestones.map((m) => (
            <li key={m.day} className="flex items-start gap-2 text-sm">
              {m.complete ? (
                <CheckCircle2 className="h-4 w-4 text-[hsl(var(--accent-blue))] mt-0.5 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              )}
              <div className="min-w-0">
                <div className={m.complete ? 'text-muted-foreground line-through' : 'text-foreground'}>
                  {m.label}
                </div>
                <div className="text-xs text-muted-foreground">Day {m.day}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

// ---------- AUM sections ----------

function formatAum(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

// Display rule: if rounded percentage is 100% but the underlying value is
// strictly less than the total (some households remain uncontacted /
// unreviewed), cap the displayed percentage at 99% to avoid the visual
// contradiction "21/25 contacted · 100% AUM".
function displayPct(aum: AumSummary): number {
  if (aum.highlightedPct >= 100 && aum.highlighted < aum.total) return 99;
  return aum.highlightedPct;
}

function TotalAumSection({ aum }: { aum: AumSummary }) {
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
        Total AUM
      </div>
      <div className="text-2xl font-bold tabular-nums text-foreground leading-none">
        {formatAum(aum.total)}
      </div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">AUM reviewed</span>
        <span className="tabular-nums">
          <span className="font-semibold text-foreground">{formatAum(aum.highlighted)}</span>{' '}
          <span className="text-muted-foreground">({displayPct(aum)}%)</span>
        </span>
      </div>
    </div>
  );
}

function InheritedAumSection({ aum, onRetentionRiskClick }: { aum: AumSummary; onRetentionRiskClick?: () => void }) {
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
        Inherited AUM
      </div>
      <div className="text-2xl font-bold tabular-nums text-foreground leading-none">
        {formatAum(aum.total)}
      </div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">AUM contacted</span>
        <span className="tabular-nums">
          <span className="font-semibold text-foreground">{formatAum(aum.highlighted)}</span>{' '}
          <span className="text-muted-foreground">({displayPct(aum)}%)</span>
        </span>
      </div>
      {aum.flightRisk !== undefined && (
        <button
          type="button"
          onClick={onRetentionRiskClick}
          className="w-full flex items-baseline justify-between text-sm rounded-sm hover:bg-amber-500/10 -mx-1 px-1 py-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 group"
        >
          <span className="text-amber-400 inline-flex items-center gap-1">
            AUM at retention risk
            <ArrowUpRight className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
          </span>
          <span className="tabular-nums font-semibold text-amber-400 inline-flex items-center gap-1">
            {formatAum(aum.flightRisk)}
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </button>
      )}
    </div>
  );
}
