// Lightweight persona + weekly-counter store using React context.
// Lives at the App root so it survives route changes.
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { PersonaId } from '@/types/demo';
import { strategyListsService } from '@/services/strategyLists';

export interface TodayFilterState {
  themeId: string | null;
  clientSegmentId: string | null;
  wealthSegmentId: string | null;
  tierId: string | null;
}

const EMPTY_FILTERS: TodayFilterState = {
  themeId: null,
  clientSegmentId: null,
  wealthSegmentId: null,
  tierId: null,
};

type FiltersByPersona = Record<PersonaId, TodayFilterState>;

const INITIAL_FILTERS: FiltersByPersona = {
  senior: { ...EMPTY_FILTERS },
  junior: { ...EMPTY_FILTERS },
  acquired: { ...EMPTY_FILTERS },
};

export interface PushedMoment {
  id: string;
  type: 'weekly_goal' | 'standing_coaching';
  content: string;
  pushedAt: Date;
}

export type PushTarget = Exclude<PersonaId, 'senior'>;

type PushedByPersona = Record<PushTarget, PushedMoment[]>;

const INITIAL_PUSHED: PushedByPersona = { junior: [], acquired: [] };

interface PersonaCtx {
  personaId: PersonaId;
  setPersonaId: (id: PersonaId) => void;
  completedThisWeek: number;
  incrementCompleted: () => void;
  todayFilters: TodayFilterState;
  setTodayFilters: (
    updater: TodayFilterState | ((prev: TodayFilterState) => TodayFilterState),
  ) => void;
  pushedCoachableMoments: PushedByPersona;
  pushCoachableMoment: (target: PushTarget, moment: Omit<PushedMoment, 'id' | 'pushedAt'>) => void;
  resetDemo: () => void;
}

const Ctx = createContext<PersonaCtx | null>(null);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [personaId, setPersonaIdRaw] = useState<PersonaId>('senior');
  const [completedThisWeek, setCompleted] = useState(0);
  const [filtersByPersona, setFiltersByPersona] =
    useState<FiltersByPersona>(INITIAL_FILTERS);
  const [pushedCoachableMoments, setPushed] = useState<PushedByPersona>(INITIAL_PUSHED);

  const incrementCompleted = useCallback(() => setCompleted((n) => n + 1), []);

  const setPersonaId = useCallback((id: PersonaId) => {
    setFiltersByPersona((prev) => ({ ...prev, [id]: { ...EMPTY_FILTERS } }));
    setPersonaIdRaw(id);
  }, []);

  const setTodayFilters = useCallback(
    (updater: TodayFilterState | ((prev: TodayFilterState) => TodayFilterState)) => {
      setFiltersByPersona((prev) => {
        const current = prev[personaId] ?? EMPTY_FILTERS;
        const next = typeof updater === 'function' ? (updater as (p: TodayFilterState) => TodayFilterState)(current) : updater;
        return { ...prev, [personaId]: next };
      });
    },
    [personaId],
  );

  const pushCoachableMoment = useCallback(
    (target: PushTarget, moment: Omit<PushedMoment, 'id' | 'pushedAt'>) => {
      setPushed((prev) => ({
        ...prev,
        [target]: [
          ...prev[target],
          { ...moment, id: `pm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, pushedAt: new Date() },
        ],
      }));
    },
    [],
  );

  const resetDemo = useCallback(() => {
    setPersonaIdRaw('senior');
    setCompleted(0);
    setFiltersByPersona(INITIAL_FILTERS);
    setPushed(INITIAL_PUSHED);
    strategyListsService.reset();
  }, []);

  return (
    <Ctx.Provider
      value={{
        personaId,
        setPersonaId,
        completedThisWeek,
        incrementCompleted,
        todayFilters: filtersByPersona[personaId] ?? EMPTY_FILTERS,
        setTodayFilters,
        pushedCoachableMoments,
        pushCoachableMoment,
        resetDemo,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function usePersona() {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePersona must be used within PersonaProvider');
  return v;
}
