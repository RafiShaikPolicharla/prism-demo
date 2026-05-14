import { useEffect, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { TopNav } from '@/components/TopNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { householdsService, opportunitiesService } from '@/services';
import { TierBadge } from '@/components/TierBadge';
import type { DemoHousehold } from '@/types/demo';

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

export default function Household() {
  const { householdId } = useParams<{ householdId: string }>();
  const [hh, setHh] = useState<DemoHousehold | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    householdsService.getAll().then((all) => {
      if (!alive) return;
      setHh(all.find((h) => h.id === householdId) ?? null);
    });
    return () => { alive = false; };
  }, [householdId]);

  // Direct-URL access: if this household has any opportunity, route to its top one.
  if (householdId) {
    const actions = opportunitiesService.listForHousehold(householdId);
    if (actions.length) {
      const urgencyWeight = (u: string) =>
        u === 'act_now' ? 3 : u === 'this_quarter' ? 2 : 1;
      const top = [...actions].sort(
        (a, b) => urgencyWeight(b.urgency) - urgencyWeight(a.urgency),
      )[0];
      return <Navigate to={`/opportunity/${top.id}`} replace />;
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="mx-auto max-w-[1100px] px-4 lg:px-8 py-8">
        <Link
          to="/explore"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Explore
        </Link>

        {hh === undefined && (
          <Card className="p-10 text-center text-sm text-muted-foreground">Loading…</Card>
        )}

        {hh === null && (
          <Card className="p-10 text-center space-y-3">
            <h1 className="text-xl font-semibold text-foreground">Household not found</h1>
            <p className="text-sm text-muted-foreground">No record for {householdId}.</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/explore">Back to Explore</Link>
            </Button>
          </Card>
        )}

        {hh && (
          <div className="space-y-6">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                  {hh.name}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {hh.primaryContact}
                </p>
              </div>
              <TierBadge tier={hh.salesforceTier} />
            </header>

            <Card className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <Stat label="HH Value" value={fmtUsd(hh.hhValue)} />
                <Stat label="Investable Assets" value={fmtUsd(hh.investableAssets)} />
                <Stat label="Wealth Segment" value={hh.wealthSegment || '—'} />
                <Stat label="Asset Segment" value={hh.assetSegment || '—'} />
                <Stat label="Policies" value={String(hh.policies)} />
                <Stat label="Active Triggers" value={String(hh.activeTriggers)} />
                <Stat
                  label="Last Contact"
                  value={hh.lastContact ? new Date(hh.lastContact).toLocaleDateString() : '—'}
                />
                <Stat label="Tier" value={`Tier ${hh.salesforceTier}`} />
              </div>

              {hh.tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-1.5">
                  {hh.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </Card>

            {hh.members.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
                  Members
                </h2>
                <ul className="divide-y divide-border">
                  {hh.members.map((m, i) => (
                    <li key={i} className="py-2.5 flex items-baseline justify-between text-sm">
                      <div>
                        <span className="font-medium text-foreground">{m.name}</span>
                        {m.role && (
                          <span className="ml-2 text-xs text-muted-foreground">{m.role}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {Number.isFinite(m.age) && m.age > 0 ? `Age ${m.age}` : '—'}
                        {m.segment ? ` · ${m.segment}` : ''}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card className="p-6 border-dashed">
              <p className="text-sm text-foreground">
                <span className="font-medium">No active opportunities for this household.</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                This household isn't currently in your priority queue. View this household
                in the BoB engine for full detail.
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
