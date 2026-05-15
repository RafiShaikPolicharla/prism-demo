import { askAgentflow } from './agentflow';
import { registerAgentActions } from './opportunities';
import type { DemoAction, PersonaId, SalesforceTier, Tag, Urgency } from '@/types/demo';

const DEFAULT_TODAY_QUERY_BY_PERSONA: Record<PersonaId, string> = {
  senior: 'Sync the dashboard for Patricia',
  junior: 'Sync the dashboard for Marcus',
  acquired: 'Sync the dashboard for Jordan',
};

interface AgentTodayRecommendation {
  customer_name?: string;
  age?: string | number;
  risk_profile?: string;
  income_stability?: string;
  card_description?: string;
  detailed_description?: string;
}

interface AgentDashboardPriority {
  id?: string;
  householdName?: string;
  tier?: SalesforceTier;
  urgency?: Urgency;
  category?: string;
  title?: string;
  rationale?: string;
  estimatedValue?: string;
  pushDraft?: string;
}

export interface AgentDashboardSummary {
  totalAum?: number;
  reviewedPct?: number;
  gapsByTheme?: Record<string, number>;
}

export interface TodayAgentflowResult {
  actions: DemoAction[];
  summary: AgentDashboardSummary | null;
  cached?: boolean;
  cachedAt?: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<PersonaId, { result: TodayAgentflowResult; cachedAt: number }>();

function unwrapField(raw: string, keys: string[]): string {
  const trimmed = raw.trim();

  try {
    const parsed = JSON.parse(trimmed);
    for (const key of keys) {
      if (typeof parsed?.[key] === 'string') return parsed[key];
    }
    return trimmed;
  } catch {
    // Continue to Python-dict style wrapper support.
  }

  const keyPattern = keys.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const match = trimmed.match(new RegExp(`^\\{\\s*['"](${keyPattern})['"]\\s*:\\s*(['"])([\\s\\S]*)\\2\\s*\\}$`));
  if (!match) return trimmed;

  return match[3]
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\n(?=\s*[\[{])/g, '')
    .replace(/\\n(?=\s*[\]}])/g, '')
    .replace(/\\n(?=\s*,)/g, '')
    .replace(/\\n\s+/g, ' ')
    .trim();
}

function parseJsonPayload(raw: string): unknown {
  const unwrapped = unwrapField(raw, ['dashboard_data', 'response']);

  try {
    return JSON.parse(unwrapped);
  } catch {
    return null;
  }
}

function urgencyForRisk(riskProfile: string | undefined): Urgency {
  const risk = (riskProfile ?? '').toLowerCase();
  if (risk.includes('high')) return 'act_now';
  if (risk.includes('moderate')) return 'this_quarter';
  return 'monitor';
}

function splitDetailedDescription(text: string | undefined): string[] {
  const value = (text ?? '').trim();
  if (!value) return ['Review the Agentflow recommendation and prepare a client-ready investment plan.'];

  return value
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function extractNextStep(text: string | undefined): string {
  const fallback = 'Review the recommended allocation, confirm client suitability, and schedule an investment planning conversation.';
  if (!text) return fallback;

  const nextActions = text.match(/Next Actions for RM:\s*([\s\S]*)$/i)?.[1]?.trim();
  return nextActions || fallback;
}

function householdIdFromPriorityId(id: string | undefined, index: number): string {
  const householdNumber = id?.match(/\d+/)?.[0];
  return householdNumber ? `hh_${householdNumber}` : `agent_household_${index}`;
}

function ageFromPriority(item: AgentDashboardPriority): number | null {
  const age = item.rationale?.match(/Client\s*\((\d+)\)/i)?.[1];
  if (!age) return null;
  const n = Number.parseInt(age, 10);
  return Number.isFinite(n) ? n : null;
}

function toDemoActionFromPriority(item: AgentDashboardPriority, index: number): DemoAction {
  const householdName = item.householdName?.trim() || `Household ${index + 1}`;
  const title = item.title?.trim() || item.category?.trim() || 'Agentflow priority';
  const rationale = item.rationale?.trim() || 'Agentflow identified a priority for this household.';
  const pushDraft = item.pushDraft?.trim() || 'Advisor follow-up';

  return {
    id: `agent_today_${item.id ?? index}`,
    householdId: `agent_household_${item.id ?? index}`,
    clientName: `${householdName} family`,
    clientAge: ageFromPriority(item),
    category: item.category?.trim() || title,
    theme: item.category?.trim() || 'Growth',
    urgency: item.urgency ?? 'monitor',
    estimatedValue: item.estimatedValue?.trim() || 'Review required',
    deadline: null,
    whyItFired: rationale,
    trigger: title,
    impact: rationale,
    suggestedNextStep: `Prepare ${pushDraft} outreach for the ${householdName} family.`,
    talkTrack: [
      rationale,
      `Recommended playbook: ${pushDraft}.`,
    ],
    actions: ['create_task', 'schedule_meeting', 'draft_email'],
    coachingNote: `Use the ${pushDraft} playbook and validate next steps before client outreach.`,
    agentHousehold: {
      name: `${householdName} family`,
      tier: item.tier ?? 'B',
      notes: rationale,
      tags: item.category === 'Retention' ? ['Flight Risk'] as Tag[] : [],
      assetSegment: item.estimatedValue?.trim() || 'Agentflow priority',
      products: [pushDraft],
    },
  };
}

function toDemoActionFromRecommendation(item: AgentTodayRecommendation, index: number): DemoAction {
  const clientName = item.customer_name?.trim() || `Recommended client ${index + 1}`;
  const age = Number.parseInt(String(item.age ?? ''), 10);
  const riskProfile = item.risk_profile?.trim() || 'Investment Recommendation';
  const incomeStability = item.income_stability?.trim() || 'Review required';
  const cardDescription = item.card_description?.trim() || 'Agentflow identified an investment planning opportunity.';
  const detailedDescription = item.detailed_description?.trim() || cardDescription;

  return {
    id: `agent_today_${index}_${clientName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`,
    householdId: `agent_household_${index}`,
    clientName,
    clientAge: Number.isFinite(age) ? age : null,
    category: riskProfile,
    theme: 'Growth',
    urgency: urgencyForRisk(riskProfile),
    estimatedValue: incomeStability,
    deadline: null,
    whyItFired: cardDescription,
    trigger: 'Agentflow wealth recommendation',
    impact: cardDescription,
    suggestedNextStep: extractNextStep(detailedDescription),
    talkTrack: splitDetailedDescription(detailedDescription),
    actions: ['create_task', 'schedule_meeting', 'draft_email'],
    coachingNote: 'Use the Agentflow recommendation as a starting point and validate suitability before client outreach.',
  };
}

export const todayAgentflowService = {
  async getTodayDashboard(personaId: PersonaId, options?: { forceRefresh?: boolean }): Promise<TodayAgentflowResult> {
    const cached = cache.get(personaId);
    if (!options?.forceRefresh && cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      registerAgentActions(cached.result.actions);
      return { ...cached.result, cached: true, cachedAt: cached.cachedAt };
    }

    const query =
      personaId === 'senior'
        ? import.meta.env.VITE_TODAY_PATRICIA_QUERY || import.meta.env.VITE_TODAY_AGENTFLOW_QUERY || DEFAULT_TODAY_QUERY_BY_PERSONA.senior
        : personaId === 'junior'
          ? import.meta.env.VITE_TODAY_MARCUS_QUERY || import.meta.env.VITE_TODAY_AGENTFLOW_QUERY || DEFAULT_TODAY_QUERY_BY_PERSONA.junior
          : import.meta.env.VITE_TODAY_JORDAN_QUERY || import.meta.env.VITE_TODAY_AGENTFLOW_QUERY || DEFAULT_TODAY_QUERY_BY_PERSONA.acquired;
    const result = await askAgentflow(query, {
      target: 'today',
      nodeNameIncludes: ['parse sql'],
      onText: () => undefined,
    });

    const payload = parseJsonPayload(result.text);
    const priorities =
      payload && typeof payload === 'object' && Array.isArray((payload as { priorities?: unknown }).priorities)
        ? (payload as { priorities: AgentDashboardPriority[] }).priorities
        : null;
    const summary =
      payload && typeof payload === 'object' && (payload as { summary?: unknown }).summary && typeof (payload as { summary?: unknown }).summary === 'object'
        ? (payload as { summary: AgentDashboardSummary }).summary
        : null;
    const recommendations = Array.isArray(payload)
      ? payload as AgentTodayRecommendation[]
      : payload && typeof payload === 'object' && !priorities
        ? [payload as AgentTodayRecommendation]
        : [];
    const actions = priorities
      ? priorities.map(toDemoActionFromPriority)
      : recommendations.map(toDemoActionFromRecommendation);
    const dashboardResult = { actions, summary };
    cache.set(personaId, { result: dashboardResult, cachedAt: Date.now() });
    registerAgentActions(actions);
    return dashboardResult;
  },

  async listTodayActions(personaId: PersonaId): Promise<DemoAction[]> {
    const result = await this.getTodayDashboard(personaId);
    return result.actions;
  },

  clearCache(personaId?: PersonaId): void {
    if (personaId) cache.delete(personaId);
    else cache.clear();
  },
};
