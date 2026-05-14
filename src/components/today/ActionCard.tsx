import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DemoAction, SalesforceTier, Urgency } from '@/types/demo';

const TIER_PILL: Record<SalesforceTier, { style: React.CSSProperties; className: string }> = {
  A: { style: { backgroundColor: '#78532A', color: '#FCD34D' }, className: 'border-transparent' },
  B: { style: { backgroundColor: '#374151', color: '#D1D5DB' }, className: 'border-transparent' },
  C: { style: { backgroundColor: '#5A2E10', color: '#FED7AA' }, className: 'border-transparent' },
  D: { style: { backgroundColor: 'transparent', color: '#9CA3AF' }, className: 'border-[#6B7280]' },
};

const URGENCY_META: Record<Urgency, { label: string; barClass: string; badgeClass: string }> = {
  act_now: {
    label: 'Act now',
    barClass: 'bg-[hsl(var(--urgency-act-now))]',
    badgeClass: 'bg-[hsl(var(--urgency-act-now)/0.1)] text-[hsl(var(--urgency-act-now))] border-[hsl(var(--urgency-act-now)/0.2)]',
  },
  this_quarter: {
    label: 'This quarter',
    barClass: 'bg-[hsl(var(--urgency-this-quarter))]',
    badgeClass: 'bg-[hsl(var(--urgency-this-quarter)/0.1)] text-[hsl(var(--urgency-this-quarter))] border-[hsl(var(--urgency-this-quarter)/0.2)]',
  },
  monitor: {
    label: 'Monitor',
    barClass: 'bg-[hsl(var(--urgency-monitor))]',
    badgeClass: 'bg-[hsl(var(--urgency-monitor)/0.1)] text-[hsl(var(--urgency-monitor))] border-[hsl(var(--urgency-monitor)/0.2)]',
  },
};

interface ActionCardProps {
  action: DemoAction;
  householdName: string;
  tier?: SalesforceTier;
  onActionTaken: () => void;
}

export function ActionCard({ action, householdName, tier, onActionTaken }: ActionCardProps) {
  const navigate = useNavigate();
  const meta = URGENCY_META[action.urgency];

  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
      <div className={cn('absolute inset-y-0 left-0 w-1', meta.barClass)} aria-hidden />
      <div className="pl-5 pr-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn('font-medium', meta.badgeClass)}>
                {meta.label}
              </Badge>
              <Badge variant="secondary" className="font-normal">
                {action.category}
              </Badge>
              {tier && (
                <Badge
                  variant="outline"
                  className={cn('font-medium', TIER_PILL[tier].className)}
                  style={TIER_PILL[tier].style}
                >
                  Tier {tier}
                </Badge>
              )}
            </div>
            <div className="mt-2">
              <div className="text-base font-semibold text-foreground leading-tight">
                {action.clientName}
              </div>
              <div className="text-sm text-muted-foreground leading-tight flex items-center gap-2">
                <span className="truncate">{householdName}</span>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 shrink-0">
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Estimated value
              </div>
              <div className="text-base font-semibold tabular-nums text-foreground mt-0.5">
                {action.estimatedValue}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-0.5">Trigger</span>
          <span className="text-foreground">{action.trigger}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-0.5">Impact</span>
          <span className="text-foreground">{action.impact}</span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onActionTaken}
            >
              Create task
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onActionTaken}
            >
              Schedule meeting
            </Button>
          </div>
          <Button size="sm" onClick={() => navigate(`/opportunity/${action.id}`)}>Open</Button>
        </div>
      </div>
    </Card>
  );
}
