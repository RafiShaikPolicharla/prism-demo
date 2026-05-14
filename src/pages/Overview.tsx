import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BarChart3, X } from 'lucide-react';
import { toast } from 'sonner';
import { TopNav } from '@/components/TopNav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { usePersona, type PushTarget } from '@/stores/personaStore';
import { personasService } from '@/services';
import { branchService } from '@/services/branch';
import type {
  BranchAdvisor,
  CoachingOpportunity,
  CoachingOpportunityUrgency,
} from '@/data/branchFixture';

// ----------------------------------------------------------------- helpers

function formatUsd(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const URGENCY_META: Record<
  CoachingOpportunityUrgency,
  { label: string; barClass: string; badgeClass: string }
> = {
  this_week: {
    label: 'This week',
    barClass: 'bg-[hsl(var(--urgency-this-quarter))]',
    badgeClass:
      'bg-[hsl(var(--urgency-this-quarter)/0.1)] text-[hsl(var(--urgency-this-quarter))] border-[hsl(var(--urgency-this-quarter)/0.2)]',
  },
  watch: {
    label: 'Watch',
    barClass: 'bg-[hsl(var(--urgency-monitor))]',
    badgeClass:
      'bg-[hsl(var(--urgency-monitor)/0.1)] text-[hsl(var(--urgency-monitor))] border-[hsl(var(--urgency-monitor)/0.2)]',
  },
  this_quarter: {
    label: 'This quarter',
    barClass: 'bg-[hsl(var(--urgency-act-now))]',
    badgeClass:
      'bg-[hsl(var(--urgency-act-now)/0.1)] text-[hsl(var(--urgency-act-now))] border-[hsl(var(--urgency-act-now)/0.2)]',
  },
};

// Map advisors to their persona target so push moments land in the right
// persona's Coach Mode panel.
const ADVISOR_TO_PERSONA: Record<string, PushTarget> = {
  adv_marcus: 'junior',
  adv_sara: 'junior', // Sara also surfaces in junior persona panel
  adv_lauren: 'acquired',
};

// =============================================================================
// PAGE
// =============================================================================

export default function Overview() {
  const { personaId } = usePersona();

  if (personaId !== 'senior') {
    return <ComingSoon />;
  }

  return <BranchOverview />;
}

// =============================================================================
// COMING SOON
// =============================================================================

function ComingSoon() {
  const { personaId } = usePersona();
  const persona = personasService.get(personaId);
  if (!persona) return null;

  const detail =
    personaId === 'junior'
      ? {
          focus: 'personal goal pacing and mentor activity',
          ctaLabel: 'Open Coach Mode',
          ctaHref: '/',
        }
      : {
          focus: 'transition timeline and retention progress',
          ctaLabel: '← Back to Today',
          ctaHref: '/',
        };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="mx-auto max-w-[720px] px-6 py-24">
        <Card className="p-10 text-center space-y-4">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Branch Overview</h1>
            <p className="text-sm text-muted-foreground mt-1">Coming in pilot</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Designed for senior advisors and branch managers to surface coaching
            opportunities across their team. {persona.advisorName}'s view will
            focus on {detail.focus}.
          </p>
          <div>
            <Link to={detail.ctaHref}>
              <Button variant="outline" size="sm">{detail.ctaLabel}</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================
// BRANCH OVERVIEW
// =============================================================================

interface PushModalState {
  advisor: BranchAdvisor;
  draft: string;
}

interface DelegateModalState {
  segmentLabel: 'Manage' | 'Maintain';
  count: number;
}

function BranchOverview() {
  const { pushCoachableMoment } = usePersona();
  const advisors = useMemo(() => branchService.listAdvisors(), []);
  const branchHealth = useMemo(() => branchService.getBranchHealth(), []);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string | null>(null);
  const [pushModal, setPushModal] = useState<PushModalState | null>(null);
  const [pushType, setPushType] = useState<'weekly_goal' | 'standing_coaching'>('weekly_goal');
  const [delegateModal, setDelegateModal] = useState<DelegateModalState | null>(null);
  const [delegateAdvisorId, setDelegateAdvisorId] = useState<string>('adv_marcus');

  const selectedAdvisor = selectedAdvisorId
    ? advisors.find((a) => a.id === selectedAdvisorId) ?? null
    : null;

  const opportunities = useMemo(
    () => branchService.listCoachingOpportunities(selectedAdvisorId),
    [selectedAdvisorId],
  );

  const openPushModal = (advisor: BranchAdvisor, draft: string) => {
    setPushType('weekly_goal');
    setPushModal({ advisor, draft });
  };

  const handlePushSubmit = () => {
    if (!pushModal) return;
    const target = ADVISOR_TO_PERSONA[pushModal.advisor.id];
    if (target) {
      pushCoachableMoment(target, { type: pushType, content: pushModal.draft });
    }
    toast.success(`Coachable moment pushed to ${pushModal.advisor.name}`, { duration: 5000 });
    setPushModal(null);
  };

  const juniorAdvisors = advisors.filter((a) => a.role === 'junior');

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="mx-auto max-w-[1600px] px-4 lg:px-8 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Branch Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Coaching across your advisor team
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_340px] gap-6">
          {/* ---------------- LEFT RAIL: BRANCH ROSTER ---------------- */}
          <aside className="space-y-3">
            <PaneHeader title="Branch Roster" subtitle="Advisors you manage" />
            <ul className="space-y-2">
              {advisors.map((a) => {
                const isSelected = a.id === selectedAdvisorId;
                const showWarning = a.weeklyActionRate < 60;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedAdvisorId(isSelected ? null : a.id)}
                      className={cn(
                        'w-full text-left rounded-md border border-border bg-card p-3 transition-all',
                        'hover:bg-muted/60',
                        isSelected && 'border-l-4 border-l-[#D4A017] bg-[#1F2937] dark:bg-[#1F2937]',
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="h-8 w-8 shrink-0 rounded-full bg-muted text-foreground inline-flex items-center justify-center text-xs font-semibold">
                          {initials(a.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-foreground truncate">
                            {a.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {a.roleLabel} · {a.households} hh
                          </div>
                        </div>
                      </div>
                      <dl className="mt-2.5 space-y-1 text-[11px]">
                        <RosterRow label="AUM" value={formatUsd(a.aumUsd)} />
                        <RosterRow label="Active opportunities" value={a.activeOpportunities.toString()} />
                        <RosterRow
                          label="Weekly action rate"
                          value={
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              {a.weeklyActionRate}%
                              {showWarning && (
                                <AlertTriangle className="h-3 w-3 text-[hsl(var(--urgency-act-now))]" />
                              )}
                            </span>
                          }
                        />
                      </dl>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* ---------------- CENTER: COACHING OPPORTUNITIES ---------------- */}
          <main className="min-w-0">
            <div className="mb-4">
              <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
                Coaching Opportunities
              </h2>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                {selectedAdvisor
                  ? `Coaching opportunities for ${selectedAdvisor.name}`
                  : 'Where your advisors need support'}
              </p>
            </div>

            {selectedAdvisor && (
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">Showing for:</span>
                <button
                  onClick={() => setSelectedAdvisorId(null)}
                  className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--accent-blue)/0.3)] bg-[hsl(var(--accent-blue)/0.08)] px-2 py-0.5 text-[hsl(var(--accent-blue))] hover:bg-[hsl(var(--accent-blue)/0.15)]"
                >
                  {selectedAdvisor.name}
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            <div className="space-y-3">
              {opportunities.map((co) => (
                <CoachingOpportunityCard
                  key={co.id}
                  opportunity={co}
                  advisors={advisors}
                  onPush={(advisor, draft) => openPushModal(advisor, draft)}
                />
              ))}
            </div>
          </main>

          {/* ---------------- RIGHT RAIL: BRANCH HEALTH ---------------- */}
          <aside>
            <PaneHeader title="Branch Health" subtitle="Aggregate across your advisors" />
            <div className="mt-3 space-y-5">
              <Card className="p-5 space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    Total Branch AUM
                  </div>
                  <div className="text-2xl font-bold tabular-nums text-foreground leading-none mt-1">
                    {formatUsd(branchHealth.totalAumUsd)}
                  </div>
                  <div className="mt-2 flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">AUM reviewed</span>
                    <span className="tabular-nums">
                      <span className="font-semibold text-foreground">
                        {formatUsd(branchHealth.reviewedAumUsd)}
                      </span>{' '}
                      <span className="text-muted-foreground">
                        ({branchHealth.reviewedAumPct}%)
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">Households reviewed</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {branchHealth.householdsReviewed} / {branchHealth.householdsTotal}
                    </span>
                  </div>
                </div>

                <div className="border-t border-border" />

                <BranchShareOfWallet
                  data={branchHealth.shareOfWallet}
                  onDelegate={(seg, count) => {
                    setDelegateAdvisorId('adv_marcus');
                    setDelegateModal({ segmentLabel: seg, count });
                  }}
                />

                <div className="border-t border-border" />

                <BranchGapsByTheme data={branchHealth.gapsByTheme} />
              </Card>
            </div>
          </aside>
        </div>
      </div>

      {/* ---------------- PUSH MODAL ---------------- */}
      <Dialog open={!!pushModal} onOpenChange={(o) => !o && setPushModal(null)}>
        <DialogContent>
          {pushModal && (
            <>
              <DialogHeader>
                <DialogTitle>Push coachable moment to {pushModal.advisor.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Type
                  </Label>
                  <RadioGroup
                    value={pushType}
                    onValueChange={(v) => setPushType(v as typeof pushType)}
                    className="mt-2 flex gap-4"
                  >
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <RadioGroupItem value="weekly_goal" id="pt-weekly" />
                      <span>Weekly goal</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <RadioGroupItem value="standing_coaching" id="pt-standing" />
                      <span>Standing coaching</span>
                    </label>
                  </RadioGroup>
                </div>
                <div>
                  <Label htmlFor="push-content" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Content
                  </Label>
                  <Textarea
                    id="push-content"
                    value={pushModal.draft}
                    onChange={(e) => setPushModal({ ...pushModal, draft: e.target.value })}
                    rows={5}
                    className="mt-2"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPushModal(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handlePushSubmit}
                  className="bg-[#D4A017] text-black hover:bg-[#B8890F]"
                >
                  Push to {pushModal.advisor.name}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ---------------- DELEGATE MODAL ---------------- */}
      <Dialog open={!!delegateModal} onOpenChange={(o) => !o && setDelegateModal(null)}>
        <DialogContent>
          {delegateModal && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Delegate {delegateModal.count} {delegateModal.segmentLabel} households to a junior advisor
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  These are lower-risk relationships, ideal for{' '}
                  {advisors.find((a) => a.id === delegateAdvisorId)?.name.split(' ')[0] ?? 'a junior advisor'}{' '}
                  to gain experience.
                </p>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Delegate to...
                  </Label>
                  <Select value={delegateAdvisorId} onValueChange={setDelegateAdvisorId}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {juniorAdvisors.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDelegateModal(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const adv = advisors.find((a) => a.id === delegateAdvisorId);
                    toast.success(
                      `${delegateModal.count} ${delegateModal.segmentLabel} households delegated to ${adv?.name ?? 'advisor'}`,
                    );
                    setDelegateModal(null);
                  }}
                >
                  Delegate
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ----------------------------------------------------------------- subcomponents

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

function RosterRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{label}:</dt>
      <dd className="font-semibold text-foreground tabular-nums">{value}</dd>
    </div>
  );
}

function CoachingOpportunityCard({
  opportunity,
  advisors,
  onPush,
}: {
  opportunity: CoachingOpportunity;
  advisors: BranchAdvisor[];
  onPush: (advisor: BranchAdvisor, draft: string) => void;
}) {
  const meta = URGENCY_META[opportunity.urgency];
  const targetAdvisor = opportunity.targetAdvisorId
    ? advisors.find((a) => a.id === opportunity.targetAdvisorId)
    : null;

  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
      <div className={cn('absolute inset-y-0 left-0 w-1', meta.barClass)} aria-hidden />
      <div className="pl-5 pr-5 py-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cn('font-medium', meta.badgeClass)}>
            {meta.label}
          </Badge>
          <Badge variant="secondary" className="font-normal">
            {opportunity.typeChip}
          </Badge>
        </div>
        <h3 className="mt-2 text-base font-semibold text-foreground leading-tight">
          {opportunity.title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
          {opportunity.subtitle}
        </p>

        <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-0.5">
            Why fired
          </span>
          <span className="text-foreground">{opportunity.whyFired}</span>
          {opportunity.estimatedValue && (
            <>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-0.5">
                Value
              </span>
              <span className="text-foreground font-semibold">{opportunity.estimatedValue}</span>
            </>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {opportunity.actions.map((a, i) => {
            if (a.kind === 'toast') {
              return (
                <Button
                  key={i}
                  size="sm"
                  variant={a.primary ? (a.variant ?? 'default') : 'outline'}
                  onClick={() => toast(a.toast)}
                >
                  {a.label}
                </Button>
              );
            }
            // push
            return (
              <Button
                key={i}
                size="sm"
                variant={a.primary ? 'default' : 'outline'}
                onClick={() => {
                  if (targetAdvisor) {
                    onPush(targetAdvisor, opportunity.pushDraft ?? '');
                  } else {
                    toast('Select an advisor to push to');
                  }
                }}
              >
                {a.label}
              </Button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function BranchShareOfWallet({
  data,
  onDelegate,
}: {
  data: {
    develop: { count: number; valueUsd: number };
    protect: { count: number; valueUsd: number };
    manage: { count: number; valueUsd: number };
    maintain: { count: number; valueUsd: number };
  };
  onDelegate: (seg: 'Manage' | 'Maintain', count: number) => void;
}) {
  const cell = (
    label: string,
    bg: string,
    q: { count: number; valueUsd: number },
    delegateLabel?: 'Manage' | 'Maintain',
  ) => (
    <div className="rounded-md p-2.5" style={{ backgroundColor: bg }}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-white/90">
        {label}
      </div>
      <div className="text-xl font-bold tabular-nums text-white mt-0.5 leading-tight">
        {q.count}
      </div>
      <div className="text-[11px] text-white/70 tabular-nums">{formatUsd(q.valueUsd)}</div>
      {delegateLabel && (
        <button
          type="button"
          onClick={() => onDelegate(delegateLabel, q.count)}
          className="mt-1.5 text-[10px] text-white/90 underline-offset-2 hover:underline"
        >
          Delegate to junior →
        </button>
      )}
    </div>
  );

  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
        Share of Wallet
      </div>
      <div className="text-[11px] text-muted-foreground mt-0.5 mb-3">By strategic zone</div>
      <div className="grid grid-cols-2 gap-1.5">
        {cell('Develop', '#1E3A8A', data.develop)}
        {cell('Protect', '#7F1D1D', data.protect)}
        {cell('Manage', '#14532D', data.manage, 'Manage')}
        {cell('Maintain', '#374151', data.maintain, 'Maintain')}
      </div>
    </div>
  );
}

function BranchGapsByTheme({ data }: { data: Record<string, number> }) {
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
            <li key={label} className="flex items-center gap-2">
              <span className="text-xs text-foreground w-32 shrink-0 truncate">{label}</span>
              <span className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <span
                  className="block h-full bg-[hsl(var(--accent-blue))]"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="text-xs font-medium tabular-nums text-muted-foreground w-8 text-right">
                {count}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
