import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { TopNav } from '@/components/TopNav';
import {
  contentService,
  householdsService,
  opportunitiesService,
  personasService,
} from '@/services';
import { usePersona } from '@/stores/personaStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { TierBadge } from '@/components/TierBadge';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  CalendarPlus,
  CheckSquare,
  Mail,
  FileText,
  Users,
  Flag,
  X,
} from 'lucide-react';
import type {
  ActionButton,
  DemoAction,
  DemoHousehold,
  EmailTemplate,
  Urgency,
} from '@/types/demo';
import { EmailTemplateModal } from '@/components/opportunity/EmailTemplateModal';

const URGENCY_META: Record<Urgency, { label: string; barClass: string; badgeClass: string }> = {
  act_now: {
    label: 'Act now',
    barClass: 'bg-[hsl(var(--urgency-act-now))]',
    badgeClass:
      'bg-[hsl(var(--urgency-act-now)/0.1)] text-[hsl(var(--urgency-act-now))] border-[hsl(var(--urgency-act-now)/0.2)]',
  },
  this_quarter: {
    label: 'This quarter',
    barClass: 'bg-[hsl(var(--urgency-this-quarter))]',
    badgeClass:
      'bg-[hsl(var(--urgency-this-quarter)/0.1)] text-[hsl(var(--urgency-this-quarter))] border-[hsl(var(--urgency-this-quarter)/0.2)]',
  },
  monitor: {
    label: 'Monitor',
    barClass: 'bg-[hsl(var(--urgency-monitor))]',
    badgeClass:
      'bg-[hsl(var(--urgency-monitor)/0.1)] text-[hsl(var(--urgency-monitor))] border-[hsl(var(--urgency-monitor)/0.2)]',
  },
};

const ACTION_META: Record<
  ActionButton,
  { label: string; icon: typeof CheckSquare; primary?: boolean }
> = {
  create_task: { label: 'Create task', icon: CheckSquare, primary: true },
  schedule_meeting: { label: 'Schedule meeting', icon: CalendarPlus, primary: true },
  draft_email: { label: 'Draft email', icon: Mail },
  use_template: { label: 'Use template', icon: FileText },
  delegate_to_team: { label: 'Delegate to team', icon: Users },
  flag_for_senior_review: { label: 'Flag for senior review', icon: Flag },
  not_now: { label: 'Not now', icon: X },
};

const fmtUsd = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `$${(n / 1_000).toFixed(0)}K`
    : `$${n.toLocaleString()}`;

const fmtDate = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function Opportunity() {
  const { actionId } = useParams<{ actionId: string }>();
  const navigate = useNavigate();
  const { personaId, incrementCompleted } = usePersona();

  const action = useMemo(
    () => (actionId ? opportunitiesService.get(actionId) : null),
    [actionId],
  );
  const otherActions = useMemo(
    () =>
      action
        ? opportunitiesService
            .listForHousehold(action.householdId)
            .filter((a) => a.id !== action.id)
        : [],
    [action],
  );

  const [household, setHousehold] = useState<DemoHousehold | null>(null);
  const [potentials, setPotentials] = useState<
    { memberName: string; label: string; rationale: string }[]
  >([]);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<EmailTemplate | null>(null);

  useEffect(() => {
    let alive = true;
    if (!action) {
      setHousehold(null);
      setPotentials([]);
      return;
    }
    if (action.householdId.startsWith('agent_household_')) {
      setHousehold({
        id: action.householdId,
        name: action.agentHousehold?.name ?? `${action.clientName} household`,
        primaryContact: action.clientName,
        members: [
          {
            name: action.clientName,
            age: action.clientAge ?? 0,
            segment: action.category,
            role: 'Primary client',
          },
        ],
        hhValue: 0,
        investableAssets: 0,
        policies: 0,
        activeTriggers: 1,
        triggerLabels: [action.trigger],
        wealthSegment: 'Agentflow recommendation',
        primaryWealthSegment: 'Develop',
        assetSegment: action.agentHousehold?.assetSegment ?? action.estimatedValue,
        lastContact: '',
        tags: action.agentHousehold?.tags ?? [],
        products: action.agentHousehold?.products ?? ['Agentflow recommendation'],
        notes: action.agentHousehold?.notes ?? action.whyItFired,
        salesforceTier: action.agentHousehold?.tier ?? 'B',
      });
      setPotentials([]);
      return () => {
        alive = false;
      };
    }
    householdsService.get(action.householdId).then((hh) => {
      if (alive) setHousehold(hh);
    });
    householdsService.potentialOpportunities(action.householdId).then((p) => {
      if (alive) setPotentials(p);
    });
    return () => {
      alive = false;
    };
  }, [action]);

  if (!action) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="p-8 max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold">Opportunity not found</h1>
          <p className="text-sm text-muted-foreground">
            This action no longer exists or the link is invalid.
          </p>
          <Button onClick={() => navigate('/')}>Back to Today</Button>
        </Card>
      </div>
    );
  }

  const meta = URGENCY_META[action.urgency];
  const persona = personasService.get(personaId);
  const isJunior = personaId === 'junior';

  const templateVars = useMemo(() => {
    const firstName = action.clientName?.split(' ')[0] ?? '';
    // Next Monday formatted "May 5"
    const today = new Date();
    const day = today.getDay(); // 0 Sun ... 6 Sat
    const daysUntilMon = ((1 - day + 7) % 7) || 7;
    const nextMon = new Date(today);
    nextMon.setDate(today.getDate() + daysUntilMon);
    const weekDate = nextMon.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    return {
      firstName,
      advisorName: persona?.advisorName ?? '',
      priorAdvisorName: 'Robert Bell',
      spouseName: 'your spouse',
      babyName: 'the baby',
      weekDate,
    };
  }, [action.clientName, persona?.advisorName]);

  const openTemplate = () => {
    const key = opportunitiesService.suggestedTemplateKey(action, household?.tags ?? []);
    const tpl = key ? contentService.emailTemplate(key) : null;
    if (!tpl) {
      toast('No template available for this action type yet');
      return;
    }
    setActiveTemplate(tpl);
    setTemplateOpen(true);
  };

  const handleAction = (kind: ActionButton) => {
    switch (kind) {
      case 'create_task':
        toast.success('Task created', { description: `${action.clientName} — ${action.category}` });
        incrementCompleted();
        break;
      case 'schedule_meeting':
        toast.success('Meeting scheduled', { description: `Hold placed on ${action.clientName}'s calendar` });
        incrementCompleted();
        break;
      case 'draft_email':
      case 'use_template':
        openTemplate();
        break;
      case 'delegate_to_team':
        toast('Delegated to team', { description: 'Assigned to next available team member' });
        break;
      case 'flag_for_senior_review':
        toast('Flagged for senior review');
        break;
      case 'not_now':
        toast('Snoozed', { description: 'Will resurface in 7 days' });
        break;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Today
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
          {/* LEFT */}
          <main className="min-w-0 space-y-6">
            <Card className="relative overflow-hidden">
              <div className={cn('absolute inset-y-0 left-0 w-1', meta.barClass)} aria-hidden />
              <div className="p-6 pl-7">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={cn('font-medium', meta.badgeClass)}>
                    {meta.label}
                  </Badge>
                  <Badge variant="secondary" className="font-normal">
                    {action.category}
                  </Badge>
                  {action.deadline && (
                    <span className="text-xs text-muted-foreground ml-1">
                      Due {fmtDate(action.deadline)}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-end justify-between gap-4 flex-wrap">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                      {action.clientName}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {household?.name ?? action.householdId}
                      {household && (
                        <span className="text-muted-foreground/70">
                          {' · '}
                          {household.members.length} {household.members.length === 1 ? 'member' : 'members'}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      Estimated value
                    </div>
                    <div className="text-lg font-semibold tabular-nums text-foreground">
                      {action.estimatedValue}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <div className="sticky top-2 z-10 -mx-1 px-1 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 rounded-md">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
                Actions
              </div>
              <div className="flex flex-wrap gap-2">
                {action.actions
                  .filter(
                    (kind) =>
                      kind !== 'use_template' ||
                      opportunitiesService.suggestedTemplateKey(action, household?.tags ?? []) !== null,
                  )
                  .map((kind) => {
                    const m = ACTION_META[kind];
                    const Icon = m.icon;
                    return (
                      <Button
                        key={kind}
                        variant={m.primary ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleAction(kind)}
                      >
                        <Icon className="h-4 w-4" />
                        {m.label}
                      </Button>
                    );
                  })}
              </div>
            </div>

            <Separator />

            <Card className="p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Why this fired
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Triggered by rule: <span className="text-foreground font-medium">{action.category}</span>
              </p>
              <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-0.5">Trigger</span>
                <span className="text-foreground leading-relaxed">{action.trigger}</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-0.5">Impact</span>
                <span className="text-foreground leading-relaxed">{action.impact}</span>
              </div>
            </Card>

            <div className="rounded-lg border-l-4 border-l-[hsl(var(--accent-blue))] bg-[hsl(var(--accent-blue)/0.05)] border-y border-r border-border p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--accent-blue))]">
                Suggested next step
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                {action.suggestedNextStep}
              </p>
            </div>

            <Card className="p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Talk track
              </h2>
              <ul className="space-y-2">
                {action.talkTrack.map((point, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span className="text-[hsl(var(--accent-blue))] font-semibold tabular-nums shrink-0">
                      {i + 1}.
                    </span>
                    <span className="text-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {isJunior && action.coachingNote && (
              <div className="rounded-lg border border-[hsl(var(--urgency-this-quarter)/0.3)] bg-[hsl(var(--urgency-this-quarter)/0.08)] p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--urgency-this-quarter))]">
                  Coaching note
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{action.coachingNote}</p>
              </div>
            )}

          </main>

          {/* RIGHT */}
          <aside className="space-y-4">
            {household ? (
              <Card className="p-5 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      Household
                    </div>
                    <h3 className="text-base font-semibold text-foreground mt-1">{household.name}</h3>
                    {household.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {household.tags.map((t) => (
                          <Badge key={t} variant="outline" className="text-xs font-normal">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <TierBadge tier={household.salesforceTier} size="md" showLabel />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Stat label="HH Value" value={fmtUsd(household.hhValue)} />
                  <Stat label="Investable" value={fmtUsd(household.investableAssets)} />
                  <Stat label="Policies" value={String(household.policies)} />
                  <Stat label="Active triggers" value={String(household.activeTriggers)} />
                </div>

                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
                    Members
                  </div>
                  <ul className="space-y-1.5">
                    {household.members.map((m) => (
                      <li key={m.name} className="flex items-baseline justify-between text-sm">
                        <div className="min-w-0">
                          <div className="text-foreground truncate">{m.name}</div>
                          {m.role && (
                            <div className="text-xs text-muted-foreground truncate">{m.role}</div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums ml-2 shrink-0">
                          age {m.age}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-1 border-t border-border">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">Last contact</span>
                    <span className="text-foreground tabular-nums">{fmtDate(household.lastContact)}</span>
                  </div>
                </div>

                {household.notes && (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">
                      Notes
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{household.notes}</p>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="p-5">
                <div className="text-sm text-muted-foreground">Loading household…</div>
              </Card>
            )}

            {otherActions.length > 0 ? (
              <Card className="p-5">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">
                  Other opportunities in this household
                </h3>
                <ul className="space-y-2">
                  {otherActions.map((a) => (
                    <li key={a.id}>
                      <Link
                        to={`/opportunity/${a.id}`}
                        className="block rounded-md border border-border p-3 hover:border-[hsl(var(--accent-blue))] hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn('h-2 w-2 rounded-full', URGENCY_META[a.urgency].barClass)}
                            aria-hidden
                          />
                          <span className="text-sm font-medium text-foreground truncate">
                            {a.category}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{a.estimatedValue}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : potentials.length > 0 ? (
              <Card className="p-5">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">
                  Other potential opportunities
                </h3>
                <ul className="space-y-2">
                  {potentials.map((p, i) => (
                    <li
                      key={i}
                      className="rounded-md border border-dashed border-border bg-muted/20 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                          Potential opportunity
                        </span>
                        <button
                          type="button"
                          onClick={() => toast('Review queued', { description: p.label })}
                          className="text-xs text-[hsl(var(--accent-blue))] hover:underline"
                        >
                          Review
                        </button>
                      </div>
                      <div className="text-sm font-medium text-foreground mt-1">{p.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {p.memberName} · {p.rationale}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : (
              <Card className="p-5">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">
                  Other opportunities in this household
                </h3>
                <p className="text-sm text-muted-foreground">No other open actions.</p>
              </Card>
            )}
          </aside>
        </div>
      </div>

      <EmailTemplateModal
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        template={activeTemplate}
        vars={templateVars}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums text-foreground mt-0.5">{value}</div>
    </div>
  );
}
