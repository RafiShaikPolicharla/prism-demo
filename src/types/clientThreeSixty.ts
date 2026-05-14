// Camel-cased view of prism_gold_client_360 at the React/services boundary.
// snake_case ↔ camelCase mapping happens in services/clients.ts.
//
// Naming rule: numeric segments in column names keep their digits in camelCase
// (e.g., client_360_id → client360Id). Lock this convention in for any future
// column with a numeric segment.

// ============================ ENUM UNIONS ============================
// Mirror the Postgres enums declared in supabase/migrations.

export type LifeStage =
  | 'accumulator'
  | 'pre_retiree'
  | 'retiree'
  | 'wealth_transfer'
  | 'early_career';

export type Segment =
  | 'mass_affluent'
  | 'affluent'
  | 'high_net_worth'
  | 'ultra_high_net_worth';

export type RetentionRiskTier = 'low' | 'medium' | 'high' | 'critical';

export type Sentiment =
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'mixed'
  | 'unknown';

export type AdvisorPersona = 'senior' | 'junior' | 'acquired';

// ============================ CLIENT 360 ============================

export interface ClientThreeSixty {
  // snapshot meta
  client360Id: string;
  householdId: string;
  individualId: string | null;
  snapshotAt: string; // ISO timestamp
  isCurrent: boolean;
  createdAt: string;

  // identity & book
  advisorId: string | null; // denormalized from household.primaryAdvisorId at snapshot time
  segment: Segment | null;
  lifeStage: LifeStage | null;
  householdSize: number | null;
  primaryState: string | null;
  tenureYears: number | null;

  // financial summary
  totalAssetsUsd: number | null;
  totalLiabilitiesUsd: number | null;
  netWorthUsd: number | null;
  investableAssetsUsd: number | null;
  aumUsd: number | null;
  heldAwayAssetsUsd: number | null;
  idleCashUsd: number | null;
  idleCashPct: number | null;
  annualIncomeUsd: number | null;

  // asset mix
  equityPct: number | null;
  fixedIncomePct: number | null;
  cashPct: number | null;
  alternativesPct: number | null;
  concentratedPositionPct: number | null;
  holdsConcentratedPosition: boolean | null;
  allocationDriftPct: number | null;

  // insurance & protection
  hasLifeInsurance: boolean | null;
  hasDisabilityInsurance: boolean | null;
  hasLtcInsurance: boolean | null;
  lifeCoverageUsd: number | null;
  beneficiariesCurrentOn: string | null; // ISO date

  // product holdings
  holdsManagedAccount: boolean | null;
  holdsIncomeAnnuity: boolean | null;
  holdsAccumulationAnnuity: boolean | null;
  holdsBrokerage: boolean | null;
  holdsEducationSavings: boolean | null;

  // planning state
  hasEstatePlan: boolean | null;
  estatePlanUpdatedOn: string | null;
  hasWill: boolean | null;
  hasTrust: boolean | null;
  retirementTargetOn: string | null;

  // engagement
  lastMeetingOn: string | null;
  nextMeetingOn: string | null;
  lastContactOn: string | null;
  meetingsTtmCount: number | null;
  sentimentLastMeeting: Sentiment | null;

  // risk
  retentionRiskTier: RetentionRiskTier | null;
  retentionRiskScore: number | null;
  riskToleranceScore: number | null;

  // opportunity rollups
  opportunityCountOpen: number | null;
  opportunityCountActed90d: number | null;
  opportunityCountDismissed90d: number | null;

  // variable-shape escape hatches — narrow in services layer when shape stabilizes
  goals: unknown;
  dataQuality: unknown;
}

/**
 * Narrowed view returned by the default getClient360(householdId) accessor.
 * Snapshot-history accessors (getClient360History) return ClientThreeSixty[].
 */
export type CurrentClientThreeSixty = ClientThreeSixty & { isCurrent: true };
