import { askAgentflow } from './agentflow';
import { registerAgentActions } from './opportunities';
import type { DemoAction, Urgency } from '@/types/demo';

const DEFAULT_TODAY_QUERY = 'What investment plans can be recommended for C020';

interface AgentTodayRecommendation {
  customer_name?: string;
  age?: string | number;
  risk_profile?: string;
  income_stability?: string;
  card_description?: string;
  detailed_description?: string;
}

function unwrapResponse(raw: string): string {
  const trimmed = raw.trim();

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed?.response === 'string') return parsed.response;
    return trimmed;
  } catch {
    // Continue to Python-dict style wrapper support.
  }

  const match = trimmed.match(/^\{\s*['"]response['"]\s*:\s*(['"])([\s\S]*)\1\s*\}$/);
  if (!match) return trimmed;

  return match[2]
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\n(?=\s*[\[{])/g, '')
    .replace(/\\n(?=\s*[\]}])/g, '')
    .replace(/\\n(?=\s*,)/g, '')
    .replace(/\\n\s+/g, ' ')
    .trim();
}

function parseRecommendations(raw: string): AgentTodayRecommendation[] {
  const unwrapped = unwrapResponse(raw);

  try {
    const parsed = JSON.parse(unwrapped);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') return [parsed as AgentTodayRecommendation];
    return [];
  } catch {
    return [];
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

function toDemoAction(item: AgentTodayRecommendation, index: number): DemoAction {
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
  async listTodayActions(): Promise<DemoAction[]> {
    const query = import.meta.env.VITE_TODAY_AGENTFLOW_QUERY || DEFAULT_TODAY_QUERY;
    const result = await askAgentflow(query, {
      target: 'today',
      onText: () => undefined,
    });

    const recommendations = parseRecommendations(result.text);
    const actions = recommendations.map(toDemoAction);
    registerAgentActions(actions);
    return actions;
  },
};
