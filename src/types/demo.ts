// UI-shaped types for the demo fixtures in src/data/demoData.ts.
// These are intentionally separate from gold-schema types (ClientThreeSixty,
// Opportunity) — fixtures describe what the UI needs; adapters in services/
// translate to/from gold shapes when we wire the real backend.

// ============================ UNIONS ============================

export type PersonaId = 'senior' | 'junior' | 'acquired';

export type ThemeId =
  | 'retirement'
  | 'protection'
  | 'wealth_transfer'
  | 'portfolio_hygiene'
  | 'retention'
  | 'tax_aware'
  | 'growth';

export type Urgency = 'act_now' | 'this_quarter' | 'monitor';

export type ActionButton =
  | 'create_task'
  | 'schedule_meeting'
  | 'draft_email'
  | 'use_template'
  | 'delegate_to_team'
  | 'flag_for_senior_review'
  | 'not_now';

export type Tag =
  | 'Flight Risk'
  | 'Recently Transitioned'
  | 'Has Organization'
  | 'New Parent'
  | 'Newly Married';

export type ContextPanel = 'bookHealth' | 'coachMode' | 'ninetyDayTracker';

// ============================ PERSONA ============================

export interface TeamMember {
  name: string;
  role: string;
  availability: 'available' | 'busy' | 'out';
}

export interface ShareOfWalletQuadrant {
  count: number;
  valueUsd: number;
}

export interface ShareOfWalletPanel {
  protect: ShareOfWalletQuadrant;  // high outside assets, low SoW
  develop: ShareOfWalletQuadrant;  // high outside assets, high SoW
  maintain: ShareOfWalletQuadrant; // low outside assets, low SoW
  manage: ShareOfWalletQuadrant;   // low outside assets, high SoW
}

export interface BookHealthPanel {
  householdsReviewed: number;
  reviewedTarget: number;
  /** @deprecated kept commented out in fixture; replaced by shareOfWallet. */
  gapsByTheme?: Record<string, number>;
  shareOfWallet: ShareOfWalletPanel;
  teamMembers: TeamMember[];
}

export type CoachItemSource = 'mentor' | 'system';

export interface CoachModePanel {
  fromPatricia: {
    weeklyGoal: {
      target: number;
      completed: number;
      label: string;
      delegationLead?: string; // e.g. "Patricia delegated protection conversations to you for 5 of her clients"
      setOn?: string;       // e.g. "week of May 4"
      completesOn?: string; // e.g. "May 11"
    };
    standingCoaching: {
      text: string;
    };
  };
  prismSuggestion: {
    text: string;
  };
  mentor: {
    name: string;
    lastCheckIn: string;
  };
}

export interface NinetyDayTrackerPanel {
  daysIn: number;
  totalDays: number;
  topRelationshipsContacted: number;
  topRelationshipsTotal: number;
  retentionRiskCount: number;
  dataGapsCount: number;
  milestones: { day: number; label: string; complete: boolean }[];
}

export interface Persona {
  id: PersonaId;
  label: string;
  advisorName: string;
  bookSize: number;
  tagline: string;
  contextPanel: ContextPanel;
  todayActionIds: string[];
  defaultSavedView: string;
  daysSinceTransition?: number;
  bookHealth?: BookHealthPanel;
  coachMode?: CoachModePanel;
  ninetyDayTracker?: NinetyDayTrackerPanel;
}

// ============================ HOUSEHOLD (UI shape) ============================

export interface HouseholdMember {
  name: string;
  age: number;
  segment: string;
  role: string;
}

export type SalesforceTier = 'A' | 'B' | 'C' | 'D';

export interface DemoHousehold {
  id: string;
  name: string;
  primaryContact: string;
  members: HouseholdMember[];
  hhValue: number;
  investableAssets: number;
  policies: number;
  activeTriggers: number;
  /** Canonical trigger labels active for this household (matches TRIGGER_COLS labels in householdsService). Used by theme-based filters that need to ask "does this household have any trigger in theme X?" — the book-level definition, not the curated-action definition. */
  triggerLabels?: string[];
  wealthSegment: string;
  /**
   * Single canonical wealth segment ('Protect' | 'Develop' | 'Manage' | 'Maintain').
   * Derived in householdsService from the highest-age member's CSV row, with
   * explicit overrides for hero fixtures. Use this for any logic that needs
   * to bucket a household into exactly one quadrant (Share-of-Wallet matrix,
   * Today wealth-segment filter). The free-form `wealthSegment` string above
   * is preserved for display in the household summary card where the
   * multi-value form ("Multi (Protect / Manage / Maintain)") is informative.
   */
  primaryWealthSegment?: 'Protect' | 'Develop' | 'Manage' | 'Maintain';
  assetSegment: string;
  lastContact: string; // ISO date
  tags: Tag[];
  products: string[];
  notes: string;
  /**
   * Salesforce client tier — advisor-assigned subjective relationship rating.
   * A: first-name basis, top relationship.
   * B: strong, established relationship.
   * C: transactional, periodic contact.
   * D: minimal engagement.
   */
  salesforceTier: SalesforceTier;
  /**
   * Has the advisor formally reviewed this household within the current
   * review cycle? Drives Book Health's "Households reviewed" metric and the
   * Explore "Review status" filter — same field, both surfaces, always
   * reconciles. Assigned deterministically in householdsService:
   * Tier A + Tier B always reviewed; enough top-hhValue Tier C to reach
   * the persona's reviewedTarget (67 in the Senior fixture).
   */
  isReviewed?: boolean;
  // Derived for table rendering — populated by householdsService
  topAction?: string;
  maxAge?: number;
}

// ============================ ACTION ============================

export interface DemoAction {
  id: string;
  householdId: string;
  clientName: string;
  clientAge: number | null;
  category: string;
  theme: string;
  urgency: Urgency;
  estimatedValue: string;
  deadline: string | null;
  whyItFired: string;
  trigger: string;
  impact: string;
  suggestedNextStep: string;
  talkTrack: string[];
  actions: ActionButton[];
  coachingNote?: string;
  agentHousehold?: {
    name: string;
    tier: SalesforceTier;
    notes: string;
    tags: Tag[];
    assetSegment: string;
    products: string[];
  };
}

// ============================ THEME ============================

export interface PlanningTheme {
  id: string;
  label: string;
  count: number | null;
  icon: string;
  status?: 'coming_soon';
}

// ============================ SAVED VIEW ============================

export interface SavedViewFilters {
  ageRange?: [number, number];
  lastContactDaysAgo?: { min?: number; max?: number };
  tags?: string[];
  hhValueMin?: number;
  hasChildren?: boolean;
  hasLifePolicy?: boolean;
  hasAnnuity?: boolean;
  hasOrganization?: boolean;
  triggers?: string[];
}

export interface SavedView {
  id: string;
  name: string;
  description: string;
  count: number;
  starred: boolean;
  filters: SavedViewFilters;
  persona: PersonaId | 'all';
}

// ============================ EXPLORE ============================

export interface ExploreColumn {
  key: string;
  label: string;
  width?: number;
  format?: 'currency' | 'date' | 'badge' | 'tags' | 'boolean';
}

export interface ExploreColumnsConfig {
  default: ExploreColumn[];
  hidden: ExploreColumn[];
}

export interface FilterOption {
  value: string;
  label?: string;
  count: number;
}

export interface FilterOptionsConfig {
  wealthSegment: FilterOption[];
  clientSegment: FilterOption[];
  assetSegment: FilterOption[];
  triggers: FilterOption[];
  tags: FilterOption[];
  products: FilterOption[];
  salesforceTier: FilterOption[];
  reviewStatus?: FilterOption[];
}

// ============================ ASK PRISM ============================

export interface AskPrismResult {
  name: string;
  value: number;
  ages: string;
  note: string;
}

export interface AskPrismResponse {
  summary: string;
  topResults: AskPrismResult[];
  filterToApply: SavedViewFilters;
  saveAsName: string;
  cta: string[];
}

export interface AskPrismQuestion {
  id: string;
  keywords: string[];
  matchScore: number;
  exampleQuery: string;
  response: AskPrismResponse;
}

export interface AskPrismFallback {
  message: string;
  suggestions: string[];
}

// ============================ EMAIL TEMPLATE ============================

export interface EmailTemplate {
  name: string;
  subject: string;
  body: string;
}
