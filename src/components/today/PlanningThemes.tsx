import { useState } from 'react';
import { contentService } from '@/services';
import { cn } from '@/lib/utils';

const COMING_SOON_TOOLTIPS: Record<string, string> = {
  succession: 'Succession Planning views for advisors approaching retirement — coming in pilot',
};

export function PlanningThemes() {
  const themes = contentService.themes();
  const [active, setActive] = useState<string | null>(null);

  return (
    <div>
      <h3 className="px-2 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Planning Themes
      </h3>
      <ul className="flex flex-col gap-0.5">
        {themes.map((t) => {
          const isActive = t.id === active;
          const isComingSoon = t.status === 'coming_soon';
          return (
            <li key={t.id}>
              <button
                onClick={() => !isComingSoon && setActive(isActive ? null : t.id)}
                disabled={isComingSoon}
                title={isComingSoon ? COMING_SOON_TOOLTIPS[t.id] : undefined}
                className={cn(
                  'w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-[hsl(var(--accent-blue)/0.1)] text-[hsl(var(--accent-blue))] font-medium'
                    : isComingSoon
                      ? 'text-foreground opacity-50 cursor-not-allowed'
                      : 'text-foreground hover:bg-muted',
                )}
              >
                <span className="flex items-center gap-2 truncate">
                  <span aria-hidden className="text-base leading-none">{t.icon}</span>
                  <span className="truncate">{t.label}</span>
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
                    {t.count}
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
