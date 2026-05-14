// Branch Overview demo fixture — advisors managed by Patricia, coaching
// opportunities surfaced for her as branch manager, and aggregate branch
// health rollups for the right rail. All numbers are self-consistent:
// branch AUM = sum of advisors[].aumUsd; protection gap totals (87) match
// Card 1 + Gaps by Theme; coaching opportunity cards target specific
// advisors via `targetAdvisorId` so the center pane can filter when an
// advisor is selected in the left rail.

export type BranchAdvisorRole =
  | 'junior'
  | 'senior_near_retirement'
  | 'acquired';

export interface BranchAdvisor {
  id: string;
  name: string;
  role: BranchAdvisorRole;
  roleLabel: string;
  households: number;
  aumUsd: number;
  activeOpportunities: number;
  weeklyActionRate: number; // 0-100
}

export type CoachingOpportunityUrgency = 'this_week' | 'watch' | 'this_quarter';

export interface CoachingOpportunity {
  id: string;
  /** null = branch-aggregate (always visible) */
  targetAdvisorId: string | null;
  urgency: CoachingOpportunityUrgency;
  typeChip: string;
  title: string;
  subtitle: string;
  whyFired: string;
  estimatedValue?: string;
  /** Buttons render in order. The "primary" prop drives styling. */
  actions: CoachingOpportunityAction[];
  /** When pushable, this is the pre-filled draft for the push modal. */
  pushDraft?: string;
}

export type CoachingOpportunityAction =
  | { kind: 'toast'; label: string; toast: string; primary?: boolean; variant?: 'outline' }
  | { kind: 'push'; label: string; primary?: boolean };

export interface BranchHealth {
  totalAumUsd: number;
  reviewedAumUsd: number;
  reviewedAumPct: number;
  householdsReviewed: number;
  householdsTotal: number;
  shareOfWallet: {
    develop: { count: number; valueUsd: number };
    protect: { count: number; valueUsd: number };
    manage: { count: number; valueUsd: number };
    maintain: { count: number; valueUsd: number };
  };
  gapsByTheme: Record<string, number>;
}

export const BRANCH_ADVISORS: BranchAdvisor[] = [
  {
    id: 'adv_marcus',
    name: 'Marcus Reid',
    role: 'junior',
    roleLabel: 'Junior advisor',
    households: 45,
    aumUsd: 18_400_000,
    activeOpportunities: 7,
    weeklyActionRate: 64,
  },
  {
    id: 'adv_sara',
    name: 'Sara Patel',
    role: 'junior',
    roleLabel: 'Junior advisor',
    households: 38,
    aumUsd: 14_200_000,
    activeOpportunities: 5,
    weeklyActionRate: 42,
  },
  {
    id: 'adv_david',
    name: 'David Kim',
    role: 'senior_near_retirement',
    roleLabel: 'Senior advisor · near retirement',
    households: 89,
    aumUsd: 94_700_000,
    activeOpportunities: 11,
    weeklyActionRate: 71,
  },
  {
    id: 'adv_lauren',
    name: 'Lauren Chen',
    role: 'acquired',
    roleLabel: 'Acquired advisor · day 60 of 90',
    households: 25,
    aumUsd: 33_600_000,
    activeOpportunities: 9,
    weeklyActionRate: 58,
  },
];

export const COACHING_OPPORTUNITIES: CoachingOpportunity[] = [
  {
    id: 'co_branch_protection',
    targetAdvisorId: null,
    urgency: 'this_week',
    typeChip: 'Coaching gap',
    title: 'Branch-wide protection gap',
    subtitle: '87 households across 3 advisors with unaddressed protection conversations',
    whyFired: 'Marcus has 14, Sara has 22, David has 51',
    estimatedValue: '$340K combined revenue opportunity',
    actions: [
      { kind: 'toast', label: 'View affected households', toast: 'Branch-wide household drill-in coming in pilot', primary: true, variant: 'outline' },
      { kind: 'toast', label: 'Suggest as branch focus', toast: 'Branch focus suggested' },
    ],
  },
  {
    id: 'co_marcus_newparent',
    targetAdvisorId: 'adv_marcus',
    urgency: 'this_week',
    typeChip: 'Delegation opportunity',
    title: 'Marcus has 14 unaddressed New Parent triggers',
    subtitle:
      "Marcus's queue is heavy on protection. New Parent conversations are a strong fit for his junior-level practice.",
    whyFired: '12 of 14 households have HH value > $300K and age-of-children < 18 months',
    actions: [
      { kind: 'push', label: 'Push coachable moment', primary: true },
      { kind: 'toast', label: "View Marcus's queue", toast: 'Coming in pilot' },
    ],
    pushDraft:
      'Marcus, lead the New Parent conversations this week. Aim for 5 of the 14 unaddressed households. Lead with the family — premiums and policy details can come later.',
  },
  {
    id: 'co_sara_dip',
    targetAdvisorId: 'adv_sara',
    urgency: 'watch',
    typeChip: 'Performance dip',
    title: "Sara's weekly action rate dropped to 42%",
    subtitle: 'Down from 71% last month. Worth a 1:1 to understand what changed.',
    whyFired: 'Sara completed 12 of 28 actions in the past 7 days',
    actions: [
      { kind: 'push', label: 'Push coachable moment', primary: true },
      { kind: 'toast', label: 'Schedule 1:1', toast: 'Scheduled 1:1 with Sara' },
    ],
    pushDraft:
      "Sara, let's reset this week. Pick 3 high-confidence households from your queue and work them to completion before the end of Friday.",
  },
  {
    id: 'co_david_succession',
    targetAdvisorId: 'adv_david',
    urgency: 'this_quarter',
    typeChip: 'Succession opportunity',
    title: "David's book represents $94.7M in transition risk",
    subtitle:
      'David is approaching retirement. Begin transitioning his Tier A relationships to acquired advisors over the next 12 months.',
    whyFired: 'David has 23 Tier A households averaging 12+ years tenure',
    actions: [
      { kind: 'toast', label: 'Plan transition', toast: 'Transition planning workflow coming in pilot', primary: true },
    ],
  },
  {
    id: 'co_lauren_onboarding',
    targetAdvisorId: 'adv_lauren',
    urgency: 'this_week',
    typeChip: 'Onboarding support',
    title: "Lauren's contacted rate is 58% at day 60",
    subtitle:
      'Behind pace for the 90-day onboarding milestone. Pair her with David for retention strategy review.',
    whyFired: 'Lauren has contacted 14 of 25 inherited households',
    actions: [
      { kind: 'toast', label: 'Pair with David', toast: 'Pairing scheduled', primary: true },
      { kind: 'push', label: 'Push coachable moment' },
    ],
    pushDraft:
      'Lauren, focus on the 11 uncontacted households this week. Start with the highest-AUM first to address retention risk fastest.',
  },
];

export const BRANCH_HEALTH: BranchHealth = {
  totalAumUsd: 160_900_000,
  reviewedAumUsd: 128_700_000,
  reviewedAumPct: 80,
  householdsReviewed: 142,
  householdsTotal: 197,
  shareOfWallet: {
    develop:  { count: 38, valueUsd: 24_600_000 },
    protect:  { count: 51, valueUsd: 89_400_000 },
    manage:   { count: 62, valueUsd: 32_100_000 },
    maintain: { count: 46, valueUsd: 14_800_000 },
  },
  gapsByTheme: {
    'Asset Allocation': 142,
    Protection: 87,
    'Business/Trust': 56,
    'Newly Married': 34,
    'Asset Management': 41,
    'Term Conversion': 28,
    RMD: 47,
    'Increase Contribution': 31,
    'Flight Risk': 19,
    Rollover: 14,
  },
};
