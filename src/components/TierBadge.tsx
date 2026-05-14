import { cn } from '@/lib/utils';
import type { SalesforceTier } from '@/types/demo';

const TIER_STYLE: Record<SalesforceTier, { style: React.CSSProperties; className: string }> = {
  A: {
    style: { backgroundColor: '#D4A017', color: '#FFFFFF' },
    className: 'border-transparent',
  },
  B: {
    style: { backgroundColor: '#94A3B8', color: '#FFFFFF' },
    className: 'border-transparent',
  },
  C: {
    style: { backgroundColor: '#B87333', color: '#FFFFFF' },
    className: 'border-transparent',
  },
  D: {
    style: { backgroundColor: 'transparent', color: '#6B7280' },
    className: 'border border-[#9CA3AF]',
  },
};

const TIER_LABEL: Record<SalesforceTier, string> = {
  A: 'Tier A — first-name basis, top relationship',
  B: 'Tier B — strong, established relationship',
  C: 'Tier C — transactional, periodic contact',
  D: 'Tier D — minimal engagement',
};

interface TierBadgeProps {
  tier: SalesforceTier;
  size?: 'sm' | 'md';
  className?: string;
  /** When true, prefixes the circle with a small muted "Tier" label.
   *  Use everywhere the badge appears outside of a column already labeled
   *  "Tier" (e.g., the Explore table). */
  showLabel?: boolean;
}

export function TierBadge({ tier, size = 'sm', className, showLabel = false }: TierBadgeProps) {
  const meta = TIER_STYLE[tier];
  const dim = size === 'md' ? 'h-6 w-6 text-xs' : 'h-5 w-5 text-[11px]';
  const circle = (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold tabular-nums shrink-0',
        dim,
        meta.className,
        className,
      )}
      style={meta.style}
      title={TIER_LABEL[tier]}
      aria-label={TIER_LABEL[tier]}
    >
      {tier}
    </span>
  );
  if (!showLabel) return circle;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Tier</span>
      {circle}
    </span>
  );
}
