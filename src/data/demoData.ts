// =============================================================================
// PRISM DEMO DATA
// Single source of truth for the Lovable prototype.
// Consumed only by services/* under DEMO_MODE — components do not import this.
// =============================================================================

import type {
  Persona,
  PersonaId,
  DemoHousehold,
  DemoAction,
  PlanningTheme,
  SavedView,
  ExploreColumnsConfig,
  FilterOptionsConfig,
  AskPrismQuestion,
  AskPrismFallback,
  EmailTemplate,
} from '@/types/demo';

// -----------------------------------------------------------------------------
// PERSONAS
// -----------------------------------------------------------------------------
export const PERSONAS: Record<PersonaId, Persona> = {
  senior: {
    id: "senior",
    label: "Senior Advisor",
    advisorName: "Patricia Chen",
    bookSize: 116,
    tagline: "Leverage & delegate across a multi-generational book",
    contextPanel: "bookHealth",
    todayActionIds: ["a_richardson_rmd", "a_rogers_audit", "a_rivera_rollover", "a_allen_asset_alloc", "a_gomez_audit", "a_richardson_raise", "a_richardson_policy_review"],
    defaultSavedView: "pre_retirees_review",
    bookHealth: {
      householdsReviewed: 67,
      reviewedTarget: 116,
      // gapsByTheme is now computed dynamically at render time from
      // household trigger data — see Today.tsx + getHouseholdCountByTheme.
      // Keeping this hardcoded caused drift vs. the Explore Theme filter.
      shareOfWallet: {
        protect:  { count: 28, valueUsd:  42_500_000 }, // high outside, low SoW
        develop:  { count: 19, valueUsd:  61_200_000 }, // high outside, high SoW
        maintain: { count: 41, valueUsd:  18_700_000 }, // low outside, low SoW
        manage:   { count: 28, valueUsd:  73_900_000 }, // low outside, high SoW
      },
      teamMembers: [
        { name: "Marcus Reid", role: "Junior Advisor", availability: "available" },
        { name: "Sara Patel", role: "Client Service Associate", availability: "available" }
      ]
    }
  },
  junior: {
    id: "junior",
    label: "Junior Advisor",
    advisorName: "Marcus Reid",
    bookSize: 45,
    tagline: "Guided execution with built-in coaching",
    contextPanel: "coachMode",
    todayActionIds: ["a_hamilton_newparent", "a_russell_newparent", "a_bailey_married", "a_cooper_newparent", "a_hamilton_term"],
    defaultSavedView: "protection_gap_families",
    coachMode: {
      fromPatricia: {
        weeklyGoal: {
          target: 5,
          completed: 2,
          label: "Protection conversations scheduled",
          delegationLead: "Patricia delegated protection conversations to you for 5 of her clients",
          setOn: "week of May 4",
          completesOn: "May 11",
        },
        standingCoaching: {
          text: "Marcus, for the delegated protection conversations, lead with the families. Premiums and policy details can come later.",
        },
      },
      prismSuggestion: {
        text: "For the Hamilton call, the family is in the 12-18 month post-baby window. Equitable's playbook suggests opening with daycare cost planning rather than policy specifics — parents in this window are most receptive when the conversation starts with their immediate concerns.",
      },
      mentor: {
        name: "Patricia Chen",
        lastCheckIn: "3 days ago",
      },
    }
  },
  acquired: {
    id: "acquired",
    label: "Acquired Advisor",
    advisorName: "Jordan Patel",
    bookSize: 25,
    daysSinceTransition: 34,
    tagline: "First 90 days: triage retention, learn the book",
    contextPanel: "ninetyDayTracker",
    todayActionIds: ["a_jimenez_retention", "a_mendoza_retention", "a_morales_retention", "a_wright_audit", "a_gonzalez_biz", "a_morales_policy_review"],
    defaultSavedView: "transitioned_book",
    ninetyDayTracker: {
      daysIn: 34,
      totalDays: 90,
      topRelationshipsContacted: 18,
      topRelationshipsTotal: 30,
      retentionRiskCount: 14,
      dataGapsCount: 7,
      milestones: [
        { day: 7, label: "Top 10 households contacted", complete: true },
        { day: 30, label: "Full book reviewed", complete: true },
        { day: 60, label: "All flight risks addressed", complete: false },
        { day: 90, label: "Retention plan executed", complete: false }
      ]
    }
  }
};

// -----------------------------------------------------------------------------
// HOUSEHOLDS
// Subset of v24 for the demo (15 households shown). The full 116 can be loaded
// from CSV for the Explore view; this object holds rich detail for the ones
// the demo drills into.
// -----------------------------------------------------------------------------
export const HOUSEHOLDS: Record<string, DemoHousehold> = {
  // === SENIOR HERO ===
  hh_80011: {
    id: "hh_80011",
    name: "Richardson family",
    primaryContact: "Jerry Richardson",
    members: [
      { name: "Jerry Richardson", age: 74, segment: "65-79: Next Chapters", role: "Patriarch" },
      { name: "George Richardson", age: 66, segment: "65-79: Next Chapters", role: "Brother" },
      { name: "Diana Richardson", age: 42, segment: "40-52: Wealth Builder", role: "Daughter" },
      { name: "Madison Richardson", age: 23, segment: "<30: Career Starter", role: "Granddaughter" },
      { name: "Adam Richardson", age: 21, segment: "<30: Career Starter", role: "Grandson" }
    ],
    hhValue: 1918325,
    investableAssets: 2200000,
    policies: 5,
    activeTriggers: 9,
    wealthSegment: "Multi (Protect / Manage / Maintain)",
    assetSegment: "$1M+: Wealth",
    lastContact: "2026-03-04",
    tags: [],
    products: ["Equitable Network Life", "Mutual Fund", "Annuity (x2)", "Equitable Network Annuity"],
    notes: "Three-generation household. Jerry is patriarch; estate planning a likely conversation. Diana runs a small consulting LLC.",
    salesforceTier: "A"
  },

  // === JUNIOR HERO ===
  hh_80059: {
    id: "hh_80059",
    name: "Hamilton family",
    primaryContact: "Adam Hamilton",
    members: [
      { name: "Adam Hamilton", age: 45, segment: "40-52: Wealth Builder", role: "Spouse" },
      { name: "Alan Hamilton", age: 23, segment: "<30: Career Starter", role: "Son" }
    ],
    hhValue: 733505,
    investableAssets: 820000,
    policies: 2,
    activeTriggers: 4,
    wealthSegment: "Mixed (Protect / Maintain)",
    assetSegment: "$300K-$1M: Affluent",
    lastContact: "2026-04-12",
    tags: ["New Parent"],
    products: ["Equitable Network Life", "Mutual Fund"],
    notes: "Adam and spouse welcomed a baby in February. Term life on Adam expires in 18 months.",
    salesforceTier: "B"
  },

  // === ACQUIRED HERO ===
  hh_80051: {
    id: "hh_80051",
    name: "Jimenez family",
    primaryContact: "Keith Jimenez",
    members: [
      { name: "Keith Jimenez", age: 76, segment: "65-79: Next Chapters", role: "Patriarch" },
      { name: "Patricia Jimenez", age: 56, segment: "53-64: Pre-Retire", role: "Daughter" },
      { name: "James Jimenez", age: 51, segment: "40-52: Wealth Builder", role: "Son" },
      { name: "Jeremy Jimenez", age: 46, segment: "40-52: Wealth Builder", role: "Son" },
      { name: "Catherine Jimenez", age: 42, segment: "40-52: Wealth Builder", role: "Daughter-in-law" },
      { name: "Bobby Jimenez", age: 33, segment: "30-40: Life Builder", role: "Grandson" }
    ],
    hhValue: 2649355,
    investableAssets: 3100000,
    policies: 6,
    activeTriggers: 8,
    wealthSegment: "Multi (Protect / Manage / Develop / Maintain)",
    assetSegment: "$50K-$100K: Middle Core",
    lastContact: "2026-02-11",
    tags: ["Recently Transitioned", "Flight Risk"],
    products: ["Annuity (x4)", "Equitable Network Annuity"],
    notes: "Inherited from Advisor Bell's book on March 27. No advisor contact in 60+ days. Three generations, two adult sibling households under one HH ID. Tier inherited from Advisor Bell, pending review.",
    salesforceTier: "B"
  },

  // === Senior secondary heroes ===
  hh_80048: {
    id: "hh_80048",
    name: "Rogers family",
    primaryContact: "Eugene Rogers",
    members: [
      { name: "Eugene Rogers", age: 81, segment: "80+: Legacy", role: "Patriarch" },
      { name: "Frances Rogers", age: 76, segment: "65-79: Next Chapters", role: "Spouse" },
      { name: "Greg Rogers", age: 52, segment: "40-52: Wealth Builder", role: "Son" },
      { name: "Sandra Rogers", age: 48, segment: "40-52: Wealth Builder", role: "Daughter-in-law" },
      { name: "Tyler Rogers", age: 26, segment: "<30: Career Starter", role: "Grandson" }
    ],
    hhValue: 3445454,
    investableAssets: 3800000,
    policies: 5,
    activeTriggers: 6,
    wealthSegment: "Multi (Develop / Protect / Manage)",
    assetSegment: "$1M+: Wealth",
    lastContact: "2026-02-28",
    tags: [],
    products: ["Annuity", "Life", "Mutual Fund", "Brokerage"],
    notes: "Eugene runs a closely-held family business. Estate transfer conversation overdue.",
    salesforceTier: "A"
  },
  hh_80076: {
    id: "hh_80076",
    name: "Rivera family",
    primaryContact: "Walter Rivera",
    members: [
      { name: "Walter Rivera", age: 77, segment: "65-79: Next Chapters", role: "Patriarch" },
      { name: "Diane Rivera", age: 71, segment: "65-79: Next Chapters", role: "Spouse" },
      { name: "Carl Rivera", age: 49, segment: "40-52: Wealth Builder", role: "Son" },
      { name: "Joyce Rivera", age: 45, segment: "40-52: Wealth Builder", role: "Daughter-in-law" }
    ],
    hhValue: 2791566,
    investableAssets: 3000000,
    policies: 4,
    activeTriggers: 8,
    wealthSegment: "Multi (Maintain / Manage / Develop)",
    assetSegment: "$1M+: Wealth",
    lastContact: "2026-03-04",
    tags: [],
    products: ["Annuity", "Life", "Brokerage"],
    notes: "Carl has an old 401(k) from prior employer flagged for rollover.",
    salesforceTier: "A"
  },

  // === Junior secondary heroes ===
  hh_80062: {
    id: "hh_80062",
    name: "Russell family",
    primaryContact: "Brandon Russell",
    members: [
      { name: "Brandon Russell", age: 38, segment: "30-40: Life Builder", role: "Spouse" },
      { name: "Megan Russell", age: 36, segment: "30-40: Life Builder", role: "Spouse" },
      { name: "Walter Russell", age: 61, segment: "53-64: Pre-Retire", role: "Father" }
    ],
    hhValue: 855773,
    investableAssets: 950000,
    policies: 3,
    activeTriggers: 5,
    wealthSegment: "Mixed",
    assetSegment: "$300K-$1M: Affluent",
    lastContact: "2026-04-08",
    tags: ["New Parent"],
    products: ["Equitable Network Life", "Annuity"],
    notes: "New baby in March. Walter (Brandon's father) recently rolled into household for planning.",
    salesforceTier: "B"
  },
  hh_80099: {
    id: "hh_80099",
    name: "Bailey household",
    primaryContact: "Brittany Bailey",
    members: [
      { name: "Brittany Bailey", age: 31, segment: "30-40: Life Builder", role: "Primary" }
    ],
    hhValue: 10783,
    investableAssets: 12000,
    policies: 1,
    activeTriggers: 3,
    wealthSegment: "Develop",
    assetSegment: "$25K-$50K: Lower Core",
    lastContact: "2026-04-20",
    tags: ["Newly Married"],
    products: ["Term Life"],
    notes: "Married six months ago. Term policy needs beneficiary update and coverage increase conversation.",
    salesforceTier: "C"
  },

  // === Acquired secondary heroes ===
  hh_80007: {
    id: "hh_80007",
    name: "Mendoza family",
    primaryContact: "Henry Mendoza",
    members: [
      { name: "Henry Mendoza", age: 75, segment: "65-79: Next Chapters", role: "Patriarch" },
      { name: "Helen Mendoza", age: 72, segment: "65-79: Next Chapters", role: "Spouse" },
      { name: "Roy Mendoza", age: 48, segment: "40-52: Wealth Builder", role: "Son" },
      { name: "Catherine Mendoza", age: 45, segment: "40-52: Wealth Builder", role: "Daughter-in-law" },
      { name: "Logan Mendoza", age: 24, segment: "<30: Career Starter", role: "Grandson" },
      { name: "Madison Mendoza", age: 22, segment: "<30: Career Starter", role: "Granddaughter" }
    ],
    hhValue: 3154459,
    investableAssets: 3400000,
    policies: 6,
    activeTriggers: 6,
    wealthSegment: "Multi",
    assetSegment: "$100k-$300K: Upper Core",
    lastContact: "2026-02-15",
    tags: ["Recently Transitioned", "Flight Risk"],
    products: ["Annuity", "Life", "Brokerage"],
    notes: "Inherited from Advisor Bell's book on March 27. Henry triggered RMD this year — high urgency.",
    salesforceTier: "B"
  },
  hh_80015: {
    id: "hh_80015",
    name: "Morales family",
    primaryContact: "Aaron Morales",
    members: [
      { name: "Aaron Morales", age: 79, segment: "65-79: Next Chapters", role: "Patriarch" },
      { name: "Doris Morales", age: 76, segment: "65-79: Next Chapters", role: "Spouse" },
      { name: "Jeremy Morales", age: 54, segment: "53-64: Pre-Retire", role: "Son" },
      { name: "Theresa Morales", age: 51, segment: "40-52: Wealth Builder", role: "Daughter-in-law" },
      { name: "Aaron Morales Jr", age: 46, segment: "40-52: Wealth Builder", role: "Son" }
    ],
    hhValue: 2619608,
    investableAssets: 2800000,
    policies: 5,
    activeTriggers: 6,
    wealthSegment: "Mixed (Protect / Develop)",
    assetSegment: "$100k-$300K: Upper Core",
    lastContact: "2026-02-23",
    tags: ["Recently Transitioned", "Flight Risk"],
    products: ["Annuity", "Life", "Mutual Fund"],
    notes: "Inherited March 27. Aaron's RMD due Q4. High retention urgency.",
    salesforceTier: "B"
  }
};

// -----------------------------------------------------------------------------
// ACTIONS — The opportunity queue
// Each action references a household and a primary client member.
// -----------------------------------------------------------------------------
export const ACTIONS: Record<string, DemoAction> = {
  // ===== Senior persona actions =====
  a_richardson_rmd: {
    id: "a_richardson_rmd",
    householdId: "hh_80011",
    clientName: "Jerry Richardson",
    clientAge: 74,
    category: "RMD Maximization",
    theme: "Retirement",
    urgency: "act_now",
    estimatedValue: "$12K revenue opportunity",
    deadline: "2026-12-15",
    whyItFired: "Jerry is 74 and required minimum distributions are due by Dec 15. Current distribution strategy hasn't been reviewed in 18 months. With $409K in brokerage and additional retirement assets across the household, tax-aware sequencing could materially affect his bracket.",
    trigger: "RMD due Dec 15 · strategy not reviewed in 18 mo",
    impact: "$409K AUM · tax bracket exposure",
    suggestedNextStep: "Schedule 30-min RMD review with Jerry to align distribution timing with tax-aware withdrawal sequence. Bring household cash-flow context.",
    talkTrack: [
      "Confirm Jerry's 2026 RMD has been calculated and not yet taken",
      "Walk through tax-bracket implications of taking RMD in Dec vs. quarterly",
      "Discuss QCD opportunity if charitable giving is part of the plan",
      "Tee up estate-transfer conversation for follow-up meeting"
    ],
    actions: ["create_task", "schedule_meeting", "draft_email", "delegate_to_team", "not_now"]
  },
  a_rogers_audit: {
    id: "a_rogers_audit",
    householdId: "hh_80048",
    clientName: "Eugene Rogers",
    clientAge: 81,
    category: "Business/Trust Insurance Audit",
    theme: "Wealth Transfer",
    urgency: "this_quarter",
    estimatedValue: "$25K+ revenue opportunity",
    deadline: null,
    whyItFired: "Eugene runs a closely-held business and the household has not had a coordinated trust/insurance audit in 24 months. Three policies span different entities; coverage adequacy and ownership structure should be revisited as part of estate transfer planning.",
    trigger: "No trust/insurance audit in 24 mo · 3 policies across entities",
    impact: "$25K+ revenue · estate liquidity gap",
    suggestedNextStep: "Set up a 60-min discovery meeting with Eugene and his estate attorney. Pull current policy ownership and beneficiary structure ahead of meeting.",
    talkTrack: [
      "Open with Eugene's transition timeline for the business",
      "Review policy ownership across business and family entities",
      "Identify gaps between current coverage and projected estate liquidity needs",
      "Coordinate next steps with attorney on trust structure"
    ],
    actions: ["create_task", "schedule_meeting", "draft_email", "delegate_to_team", "not_now"]
  },
  a_rivera_rollover: {
    id: "a_rivera_rollover",
    householdId: "hh_80076",
    clientName: "Carl Rivera",
    clientAge: 49,
    category: "Rollover Opportunity",
    theme: "Retirement",
    urgency: "this_quarter",
    estimatedValue: "$180K AUA potential",
    deadline: null,
    whyItFired: "Carl has an outside 401(k) from a prior employer flagged in profile data. Estimated $180K in held-away assets eligible for rollover consolidation.",
    trigger: "Prior-employer 401(k) flagged · held-away",
    impact: "$180K AUA consolidation potential",
    suggestedNextStep: "Schedule consolidation conversation with Carl. Prepare comparison of current plan fees vs. Equitable IRA platform.",
    talkTrack: [
      "Confirm Carl's prior-employer plan is still active and not being contributed to",
      "Walk through fee and investment-option comparison",
      "Discuss tax implications of rollover vs. leave-in-place",
      "Pair with broader household asset allocation review"
    ],
    actions: ["create_task", "schedule_meeting", "draft_email", "delegate_to_team", "not_now"]
  },
  a_allen_asset_alloc: {
    id: "a_allen_asset_alloc",
    householdId: "hh_80013",
    clientName: "Allen family",
    clientAge: null,
    category: "Asset Allocation Review",
    theme: "Portfolio Hygiene",
    urgency: "this_quarter",
    estimatedValue: "Retention + growth",
    deadline: null,
    whyItFired: "Last allocation review was 14 months ago. Household includes a member approaching retirement (age 81) and significant equity concentration relative to age-appropriate benchmarks.",
    trigger: "No allocation review in 14 mo · age 81 member",
    impact: "Equity over-concentration · sequence-of-returns risk",
    suggestedNextStep: "Pull current allocation report. Schedule annual review with the senior household member.",
    talkTrack: [
      "Walk through current allocation vs. target",
      "Discuss sequence-of-returns risk given age",
      "Review any recent life events that change the plan"
    ],
    actions: ["create_task", "schedule_meeting", "draft_email", "delegate_to_team", "not_now"]
  },
  a_gomez_audit: {
    id: "a_gomez_audit",
    householdId: "hh_80033",
    clientName: "Gomez family",
    clientAge: null,
    category: "Business/Trust Insurance Audit",
    theme: "Wealth Transfer",
    urgency: "monitor",
    estimatedValue: "TBD",
    deadline: null,
    whyItFired: "Multi-generational household with multiple policies. Trust/audit review window approaching.",
    trigger: "Multi-gen household · audit window approaching",
    impact: "Beneficiary drift risk across policies",
    suggestedNextStep: "Add to Q3 review pipeline.",
    talkTrack: [
      "Review trust structure",
      "Confirm beneficiaries are current"
    ],
    actions: ["create_task", "schedule_meeting", "delegate_to_team", "not_now"]
  },
  a_richardson_raise: {
    id: "a_richardson_raise",
    householdId: "hh_80011",
    clientName: "Diana Richardson",
    clientAge: 42,
    category: "Increase Contribution",
    theme: "Retirement",
    urgency: "this_quarter",
    estimatedValue: "$3K annual revenue",
    deadline: null,
    whyItFired: "Diana is in peak earning years (Wealth Builder segment) and current 401(k) deferral rate is below the catch-up threshold she'll qualify for in 8 years. Increasing now sets up the trajectory.",
    trigger: "Peak earning years · deferral below catch-up trajectory",
    impact: "$3K annual revenue · 10-yr compounding upside",
    suggestedNextStep: "Draft contribution-increase email with personalized projection.",
    talkTrack: [
      "Review current deferral rate and employer match capture",
      "Show 10-year projection at current vs. 2% higher rate",
      "Discuss tax benefit of increased contribution"
    ],
    actions: ["create_task", "draft_email", "delegate_to_team", "not_now"]
  },

  // ===== Junior persona actions =====
  a_hamilton_newparent: {
    id: "a_hamilton_newparent",
    householdId: "hh_80059",
    clientName: "Adam Hamilton",
    clientAge: 45,
    category: "New Parent Family Protection",
    theme: "Protection",
    urgency: "act_now",
    estimatedValue: "$8K revenue opportunity",
    deadline: null,
    whyItFired: "Adam and spouse welcomed a baby in February. Current term life on Adam ($250K) is below the recommended 10-12x income guideline. New dependents materially change protection needs.",
    trigger: "New baby Feb · term coverage below 10–12× income",
    impact: "$8K revenue · family protection gap",
    suggestedNextStep: "Schedule a 30-min protection conversation with Adam. Use the New Parent template email to open the meeting.",
    talkTrack: [
      "Open with congratulations on the new baby",
      "Walk through current term life coverage on both spouses",
      "Introduce coverage adequacy framework (10-12x income guideline)",
      "Discuss riders for child future insurability",
      "Mention disability insurance as a follow-up topic"
    ],
    actions: ["create_task", "schedule_meeting", "draft_email", "use_template", "not_now"],
    coachingNote: "This is a textbook New Parent moment. Lead with the family — premiums and policy details come later. Your goal in this first call is to anchor the relationship around the baby's future, not to close coverage."
  },
  a_russell_newparent: {
    id: "a_russell_newparent",
    householdId: "hh_80062",
    clientName: "Brandon & Megan Russell",
    clientAge: 37,
    category: "New Parent Family Protection",
    theme: "Protection",
    urgency: "act_now",
    estimatedValue: "$10K revenue opportunity",
    deadline: null,
    whyItFired: "Russells welcomed baby in March. Both parents in 30s, dual income, no current life coverage on Megan. Asset Allocation Review also flagged.",
    trigger: "New baby Mar · spouse uninsured · allocation flagged",
    impact: "$10K revenue · two-policy household opportunity",
    suggestedNextStep: "Schedule joint protection meeting. Pair with allocation review for one combined conversation.",
    talkTrack: [
      "Congratulations on the new arrival",
      "Walk through coverage adequacy on both spouses",
      "Introduce 529 conversation for college savings",
      "Tee up allocation review as next month's follow-up"
    ],
    actions: ["create_task", "schedule_meeting", "draft_email", "use_template", "not_now"],
    coachingNote: "Two-meeting sequence works better here: protection first, allocation second. Don't try to combine — you'll lose the emotional anchor."
  },
  a_bailey_married: {
    id: "a_bailey_married",
    householdId: "hh_80099",
    clientName: "Brittany Bailey",
    clientAge: 31,
    category: "Newly Married Protection",
    theme: "Protection",
    urgency: "this_quarter",
    estimatedValue: "$2K revenue opportunity",
    deadline: null,
    whyItFired: "Married 6 months ago. Beneficiary on existing term policy not yet updated. Spouse is uninsured.",
    trigger: "Married 6 mo ago · beneficiary stale · spouse uninsured",
    impact: "$2K revenue · early-career relationship anchor",
    suggestedNextStep: "Send beneficiary-update reminder email. Schedule 20-min call to discuss spouse coverage.",
    talkTrack: [
      "Confirm beneficiary update is the priority today",
      "Ask about spouse's current coverage situation",
      "Introduce spousal protection conversation"
    ],
    actions: ["create_task", "schedule_meeting", "draft_email", "use_template", "not_now"],
    coachingNote: "Small household, but high-quality early-career relationship. Treat this as relationship-building, not revenue. Brittany will refer friends if you handle this well."
  },
  a_cooper_newparent: {
    id: "a_cooper_newparent",
    householdId: "hh_80112",
    clientName: "Cooper household",
    clientAge: 23,
    category: "New Parent Family Protection",
    theme: "Protection",
    urgency: "this_quarter",
    estimatedValue: "$1.5K revenue opportunity",
    deadline: null,
    whyItFired: "Career Starter with new baby. Term Conversion eligible.",
    trigger: "New baby · term conversion eligible",
    impact: "$1.5K revenue · lock in insurability",
    suggestedNextStep: "Send New Parent template. Don't push for in-person yet — phone call is enough.",
    talkTrack: [
      "Lead with the family conversation",
      "Introduce term conversion concept",
      "Don't overwhelm — one decision at a time"
    ],
    actions: ["create_task", "draft_email", "use_template", "not_now"],
    coachingNote: "Younger Career Starter clients respond to text-first outreach. Don't lead with a meeting request."
  },
  a_hamilton_term: {
    id: "a_hamilton_term",
    householdId: "hh_80059",
    clientName: "Alan Hamilton",
    clientAge: 23,
    category: "Term Conversion",
    theme: "Protection",
    urgency: "monitor",
    estimatedValue: "$3K revenue opportunity",
    deadline: null,
    whyItFired: "Alan's term policy convertible window closes in 11 months. Insurability is currently strong.",
    trigger: "Conversion window closes in 11 mo · strong insurability",
    impact: "$3K revenue · permanent coverage lock-in",
    suggestedNextStep: "Add to Q3 outreach list. Pair with broader Hamilton family review.",
    talkTrack: [
      "Educate on the conversion window",
      "Discuss why locking in insurability matters now"
    ],
    actions: ["create_task", "draft_email", "not_now"]
  },

  // ===== Acquired persona actions =====
  a_jimenez_retention: {
    id: "a_jimenez_retention",
    householdId: "hh_80051",
    clientName: "Jimenez family",
    clientAge: null,
    category: "Retention Risk + Multiple Triggers",
    theme: "Retention",
    urgency: "act_now",
    estimatedValue: "$2.6M HH at risk",
    deadline: "2026-05-15",
    whyItFired: "Multi-generational household, 6 members across three sub-units. Inherited from Advisor Bell on March 27 — no advisor contact in 60+ days. Eight active triggers indicate planning decisions in motion (rollover, business audit, new parent protection on Jeremy). High retention urgency: if you don't establish presence soon, decisions will be made without you.",
    trigger: "Inherited Mar 27 · no contact 60+ days · 8 active triggers",
    impact: "$2.6M household at retention risk",
    suggestedNextStep: "Send personalized introduction email TODAY. Schedule discovery call with Keith (patriarch, age 76) within 7 days. Review trigger details before the call.",
    talkTrack: [
      "Lead with continuity message: 'I want to make sure nothing falls through the cracks'",
      "Acknowledge the transition explicitly — don't pretend you've always been their advisor",
      "Ask about Keith's recent priorities and any decisions in flight",
      "Don't push products — first call is about relationship"
    ],
    actions: ["create_task", "schedule_meeting", "use_template", "flag_for_senior_review", "not_now"],
    coachingNote: "Highest-priority retention call in your book. The intro email template is calibrated for transitioned clients. Use it."
  },
  a_mendoza_retention: {
    id: "a_mendoza_retention",
    householdId: "hh_80007",
    clientName: "Mendoza family",
    clientAge: null,
    category: "Retention Risk + RMD",
    theme: "Retention",
    urgency: "act_now",
    estimatedValue: "$3.2M HH at risk + RMD deadline",
    deadline: "2026-12-15",
    whyItFired: "Inherited March 27. Henry (75) has RMD due Dec 15. No contact since transition. Combination of retention urgency and time-bound regulatory deadline.",
    trigger: "Inherited Mar 27 · RMD due Dec 15 · no contact since transition",
    impact: "$3.2M household at risk · RMD compliance",
    suggestedNextStep: "Call Henry within 48 hours. Lead with RMD as legitimate reason for outreach.",
    talkTrack: [
      "Use RMD as a natural opener: 'I want to make sure your distribution is handled correctly'",
      "Acknowledge transition",
      "Listen for unmet expectations from prior advisor"
    ],
    actions: ["create_task", "schedule_meeting", "use_template", "flag_for_senior_review", "not_now"],
    coachingNote: "RMD gives you permission to call. Use it. Don't make this about products."
  },
  a_morales_retention: {
    id: "a_morales_retention",
    householdId: "hh_80015",
    clientName: "Morales family",
    clientAge: null,
    category: "Retention Risk + RMD",
    theme: "Retention",
    urgency: "act_now",
    estimatedValue: "$2.6M HH at risk",
    deadline: "2026-12-15",
    whyItFired: "Inherited March 27. Aaron (79) has RMD due Q4. Three-generation household with mixed wealth segments. Last contact 2 months ago.",
    trigger: "Inherited Mar 27 · RMD due Q4 · last contact 2 mo ago",
    impact: "$2.6M household at risk · 3-gen relationship",
    suggestedNextStep: "Call Aaron within the week. Pair RMD with annual review.",
    talkTrack: [
      "Open with continuity message",
      "RMD as the natural agenda item",
      "Listen for satisfaction with prior advisor"
    ],
    actions: ["create_task", "schedule_meeting", "use_template", "flag_for_senior_review", "not_now"]
  },
  a_wright_audit: {
    id: "a_wright_audit",
    householdId: "hh_80037",
    clientName: "Wright family",
    clientAge: null,
    category: "Business/Trust Audit",
    theme: "Wealth Transfer",
    urgency: "this_quarter",
    estimatedValue: "$4.1M HH",
    deadline: null,
    whyItFired: "Largest household in transitioned book ($4.1M). No flight risk flag, but business audit overdue.",
    trigger: "Largest transitioned household · business audit overdue",
    impact: "$4.1M household · audit-led discovery",
    suggestedNextStep: "Schedule introduction + audit discovery in one meeting.",
    talkTrack: [
      "Combine intro and audit kickoff to respect their time",
      "Lead with discovery",
      "Bring trust/audit checklist"
    ],
    actions: ["create_task", "schedule_meeting", "use_template", "not_now"]
  },
  a_gonzalez_biz: {
    id: "a_gonzalez_biz",
    householdId: "hh_80077",
    clientName: "Gonzalez family",
    clientAge: null,
    category: "Multiple opportunities",
    theme: "Growth",
    urgency: "this_quarter",
    estimatedValue: "$3.2M HH, 7 triggers",
    deadline: null,
    whyItFired: "Transitioned, no flight risk, but 7 distinct triggers point to a household with significant unmet planning needs.",
    trigger: "Transitioned · 7 distinct planning triggers",
    impact: "$3.2M household · broad unmet planning needs",
    suggestedNextStep: "Schedule full planning discovery. Lead with introduction.",
    talkTrack: [
      "Intro + discovery in one meeting",
      "Don't try to address all 7 triggers at once",
      "Identify their top 2 priorities, work from there"
    ],
    actions: ["create_task", "schedule_meeting", "use_template", "not_now"]
  },
  a_richardson_policy_review: {
    id: "a_richardson_policy_review",
    householdId: "hh_80011",
    clientName: "George Richardson",
    clientAge: 66,
    category: "Policy Review",
    theme: "policy_review",
    urgency: "this_quarter",
    estimatedValue: "$15K revenue opportunity",
    deadline: null,
    whyItFired: "Whole life policy purchased 14 years ago has not been reviewed in 5 years. Current cash value performance and dividend options should be reassessed against alternatives.",
    trigger: "Whole life policy · 14 yrs old · 5 yrs since review",
    impact: "$15K revenue · policy optimization",
    suggestedNextStep: "Pull current policy ledger. Schedule annual policy review with George. Discuss policy options for next decade of coverage.",
    talkTrack: [
      "Confirm George's coverage needs have evolved since purchase",
      "Walk through current cash value performance",
      "Discuss dividend reinvestment vs. premium offset",
      "Review beneficiary designations"
    ],
    actions: ["create_task", "schedule_meeting", "draft_email", "not_now"]
  },
  a_rivera_policy_review: {
    id: "a_rivera_policy_review",
    householdId: "hh_80076",
    clientName: "Walter Rivera",
    clientAge: 77,
    category: "Policy Review",
    theme: "policy_review",
    urgency: "this_quarter",
    estimatedValue: "$12K revenue opportunity",
    deadline: null,
    whyItFired: "Policy on Walter is 18 years old. No new product placement with this household in 4 years. Worth a comprehensive review of all in-force coverage.",
    trigger: "18-yr-old policy · no placement in 4 yrs",
    impact: "$12K revenue · portfolio review",
    suggestedNextStep: "Schedule comprehensive review covering all household policies. Include Diane in the conversation.",
    talkTrack: [
      "Open by acknowledging the long relationship",
      "Walk through all in-force policies as a portfolio",
      "Identify any coverage gaps relative to current needs",
      "Discuss long-term care or hybrid product options"
    ],
    actions: ["create_task", "schedule_meeting", "draft_email", "not_now"]
  },
  a_morales_policy_review: {
    id: "a_morales_policy_review",
    householdId: "hh_80015",
    clientName: "Aaron Morales",
    clientAge: 79,
    category: "Policy Review",
    theme: "policy_review",
    urgency: "this_quarter",
    estimatedValue: "$10K revenue opportunity",
    deadline: null,
    whyItFired: "Inherited household with multiple aging policies. Last review by prior advisor was 7 years ago. Combine with introduction call.",
    trigger: "Inherited · multiple aging policies · 7 yrs since review",
    impact: "$10K revenue · intro + review",
    suggestedNextStep: "Combine policy review with introduction call to maximize Aaron's time.",
    talkTrack: [
      "Use policy review as a legitimate reason to introduce yourself",
      "Walk through what Equitable has on file",
      "Listen for any disconnects from Aaron's understanding"
    ],
    actions: ["create_task", "schedule_meeting", "use_template", "not_now"]
  }
};

// -----------------------------------------------------------------------------
// PLANNING THEMES — sidebar on Today view, also act as cross-cutting filters
// -----------------------------------------------------------------------------
export const PLANNING_THEMES: PlanningTheme[] = [
  { id: "retirement", label: "Retirement", count: 30, icon: "🎯" },
  { id: "protection", label: "Protection", count: 64, icon: "🛡️" },
  { id: "wealth_transfer", label: "Wealth Transfer", count: 47, icon: "🏛️" },
  { id: "portfolio_hygiene", label: "Portfolio Hygiene", count: 66, icon: "📊" },
  { id: "retention", label: "Retention", count: 14, icon: "⚠️" },
  { id: "tax_aware", label: "Tax-Aware Planning", count: 23, icon: "📋" },
  { id: "policy_review", label: "Policy Review", count: 31, icon: "📄" },
  { id: "growth", label: "Growth Opportunities", count: 32, icon: "📈" },
  { id: "succession", label: "Succession Planning", count: null, icon: "🎓", status: "coming_soon" }
];

// -----------------------------------------------------------------------------
// SAVED VIEWS — Explore sidebar
// In the demo these are hardcoded; clicking applies the filter set.
// -----------------------------------------------------------------------------
export const SAVED_VIEWS: SavedView[] = [
  {
    id: "pre_retirees_review",
    name: "My pre-retirees needing review",
    description: "Age 55-64, no contact in 60+ days",
    count: 17,
    starred: true,
    filters: { ageRange: [55, 64], lastContactDaysAgo: { min: 60 } },
    persona: "senior"
  },
  {
    id: "high_value_flight_risks",
    name: "High-value flight risks",
    description: "Flagged retention risk, HH value > $1M",
    count: 9,
    starred: true,
    filters: { tags: ["Flight Risk"], hhValueMin: 1000000 },
    persona: "all"
  },
  {
    id: "transitioned_book",
    name: "Newly transitioned book",
    description: "All households inherited from Advisor Bell (March 27)",
    count: 25,
    starred: true,
    filters: { tags: ["Recently Transitioned"] },
    persona: "acquired"
  },
  {
    id: "protection_gap_families",
    name: "Families with kids, no life coverage",
    description: "Has children present, no Equitable life policy on file",
    count: 68,
    starred: false,
    filters: { hasChildren: true, hasLifePolicy: false },
    persona: "junior"
  },
  {
    id: "preretirees_no_annuity",
    name: "Pre-retirees age 60-70 with no annuity",
    description: "Income-replacement conversation candidates",
    count: 9,
    starred: false,
    filters: { ageRange: [60, 70], hasAnnuity: false },
    persona: "all"
  },
  {
    id: "business_owners",
    name: "Business owners on my radar",
    description: "Households with associated business entity",
    count: 8,
    starred: false,
    filters: { hasOrganization: true },
    persona: "all"
  }
];

// -----------------------------------------------------------------------------
// EXPLORE COLUMNS — default + hidden
// -----------------------------------------------------------------------------
export const EXPLORE_COLUMNS: ExploreColumnsConfig = {
  default: [
    { key: "name", label: "Household", width: 200 },
    { key: "primaryContact", label: "Primary Contact", width: 160 },
    { key: "maxAge", label: "Age", width: 60 },
    { key: "clientSegment", label: "Client Segment", width: 160 },
    { key: "wealthSegment", label: "Wealth Segment", width: 130 },
    { key: "assetSegment", label: "Asset Segment", width: 150 },
    { key: "salesforceTier", label: "Tier", width: 70, format: "badge" },
    { key: "hhValue", label: "HH Value", width: 120, format: "currency" },
    { key: "policies", label: "Policies", width: 80 },
    { key: "activeTriggers", label: "Active Triggers", width: 110, format: "badge" },
    { key: "topAction", label: "Top Action", width: 200 },
    { key: "lastContact", label: "Last Contact", width: 120, format: "date" },
    { key: "tags", label: "Tags", width: 180, format: "tags" }
  ],
  hidden: [
    { key: "dateOfBirth", label: "Date of Birth" },
    { key: "state", label: "State" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "preferredContact", label: "Preferred Contact" },
    { key: "investableAssets", label: "Investable Assets", format: "currency" },
    { key: "cashValue", label: "Cash Value", format: "currency" },
    { key: "coverageAmount", label: "Coverage Amount", format: "currency" },
    { key: "incomeBand", label: "Income Band" },
    { key: "sowPercent", label: "SoW %" },
    { key: "hasAnnuity", label: "Has Annuity", format: "boolean" },
    { key: "hasLife", label: "Has Life", format: "boolean" },
    { key: "hasBrokerage", label: "Has Brokerage", format: "boolean" },
    { key: "newParent", label: "New Parent" },
    { key: "newlyMarried", label: "Newly Married" },
    { key: "hasChildren", label: "Has Children", format: "boolean" },
    { key: "homeowner", label: "Homeowner", format: "boolean" },
    { key: "rmdTriggered", label: "RMD" },
    { key: "termConversion", label: "Term Conv." },
    { key: "assetAllocReview", label: "Asset Alloc Review" },
    { key: "businessTrustAudit", label: "Biz/Trust Audit" },
    { key: "rollover", label: "Rollover" },
    { key: "increaseContrib", label: "Increase Contrib." },
    { key: "personalNotes", label: "Personal Notes" }
  ]
};

// -----------------------------------------------------------------------------
// FILTER OPTIONS — populated values for the filter chip dropdowns
// -----------------------------------------------------------------------------
export const FILTER_OPTIONS: FilterOptionsConfig = {
  wealthSegment: [
    { value: "Protect", label: "Protect", count: 64 },
    { value: "Develop", label: "Develop", count: 38 },
    { value: "Manage", label: "Manage", count: 30 },
    { value: "Maintain", label: "Maintain", count: 12 }
  ],
  clientSegment: [
    { value: "<30: Career Starter", label: "Career Starter (<30)", count: 42 },
    { value: "30-40: Life Builder", label: "Life Builder (30-40)", count: 40 },
    { value: "40-52: Wealth Builder", label: "Wealth Builder (40-52)", count: 64 },
    { value: "53-64: Pre-Retire", label: "Pre-Retire (53-64)", count: 53 },
    { value: "65-79: Next Chapters", label: "Next Chapters (65-79)", count: 72 },
    { value: "80+: Legacy", label: "Legacy (80+)", count: 7 }
  ],
  assetSegment: [
    { value: "$25K-$50K: Lower Core", label: "Lower Core ($25-50K)", count: 12 },
    { value: "$50K-$100K: Middle Core", label: "Middle Core ($50-100K)", count: 8 },
    { value: "$100k-$300K: Upper Core", label: "Upper Core ($100-300K)", count: 51 },
    { value: "$300K-$1M: Affluent", label: "Affluent ($300K-1M)", count: 20 },
    { value: "$1M+: Wealth", label: "Wealth ($1M+)", count: 25 }
  ],
  triggers: [
    { value: "Asset Allocation Review", count: 66 },
    { value: "New Parent Family Protection", count: 64 },
    { value: "Business/Trust Insurance Audit", count: 47 },
    { value: "Newly Married Family Protection", count: 41 },
    { value: "Asset Management", count: 32 },
    { value: "Term Conversion", count: 25 },
    { value: "RMD Maximization", count: 23 },
    { value: "Increase Contribution", count: 23 },
    { value: "Flight Risk", count: 14 },
    { value: "Rollover Opportunity", count: 7 }
  ],
  tags: [
    { value: "Flight Risk", count: 14 },
    { value: "Recently Transitioned", count: 25 },
    { value: "Has Organization", count: 8 },
    { value: "New Parent", count: 64 },
    { value: "Newly Married", count: 41 }
  ],
  products: [
    { value: "Annuity", count: 80 },
    { value: "Life", count: 35 },
    { value: "Brokerage", count: 53 },
    { value: "Mutual Fund", count: 41 }
  ],
  salesforceTier: [
    { value: "A", label: "Tier A", count: 17 },
    { value: "B", label: "Tier B", count: 35 },
    { value: "C", label: "Tier C", count: 41 },
    { value: "D", label: "Tier D", count: 23 }
  ]
};

// -----------------------------------------------------------------------------
// ASK PRISM — hardcoded NLQ responses
// Match by keywords in the user's input. Order matters — first match wins.
// -----------------------------------------------------------------------------
export const ASK_PRISM_QUESTIONS: AskPrismQuestion[] = [
  {
    id: "q_no_annuity",
    keywords: ["65", "annuity", "turning", "retire", "no annuity"],
    matchScore: 2, // require at least 2 keyword matches
    exampleQuery: "Show me clients turning 65 next year with no annuity",
    response: {
      summary: "I found **9 households** where the eldest member is age 60-70 and the household has no annuity product. Combined household value: **$11.4M**.",
      topResults: [
        { name: "Allen family", value: 3242312, ages: "27-81", note: "no annuity, RMD triggered ⚠️" },
        { name: "Wright family", value: 4059259, ages: "30-78", note: "no annuity, Asset Allocation triggered" },
        { name: "Mendoza family", value: 3154459, ages: "22-75", note: "flight risk + no annuity" }
      ],
      filterToApply: { ageRange: [60, 70], hasAnnuity: false },
      saveAsName: "Pre-retirees age 60-70 with no annuity",
      cta: ["Open as filtered list", "Save view", "Export to Excel"]
    }
  },
  {
    id: "q_high_value_no_contact",
    keywords: ["high-value", "high value", "haven't", "contacted", "recent", "recently", "contact"],
    matchScore: 2,
    exampleQuery: "Which of my high-value households haven't I contacted recently?",
    response: {
      summary: "I found **17 households** above $500K with no contact activity in the last 60 days. Combined value: **$24.8M**.",
      topResults: [
        { name: "Jimenez family", value: 2649355, ages: "33-76", note: "flight risk flagged, last contact Feb 11 ⚠️" },
        { name: "Morales family", value: 2619608, ages: "46-79", note: "flight risk flagged, last contact Feb 23 ⚠️" },
        { name: "Rivera family", value: 2791566, ages: "45-77", note: "last contact Mar 4" }
      ],
      filterToApply: { hhValueMin: 500000, lastContactDaysAgo: { min: 60 } },
      saveAsName: "High-value households needing outreach",
      cta: ["Open as filtered list", "Schedule outreach campaign", "Export to Excel"]
    }
  },
  {
    id: "q_rollovers",
    keywords: ["rollover", "rollovers", "401k", "401(k)", "biggest", "consolidation"],
    matchScore: 1,
    exampleQuery: "Where are my biggest rollover opportunities?",
    response: {
      summary: "I found **7 households** with active rollover triggers, representing roughly **$890K in potential consolidated assets**.",
      topResults: [
        { name: "Garcia family", value: 1703707, ages: "29-75", note: "John (75) has 401(k) outside Equitable" },
        { name: "Richardson family", value: 1918325, ages: "21-74", note: "Asset Mgmt + Rollover both triggered" },
        { name: "Rivera family", value: 2791566, ages: "45-77", note: "rollover paired with Term Conversion" }
      ],
      filterToApply: { triggers: ["Rollover Opportunity"] },
      saveAsName: "Active rollover opportunities",
      cta: ["Open as filtered list", "Save view", "Export to Excel"]
    }
  },
  {
    id: "q_protection_gap",
    keywords: ["children", "kids", "young", "families", "life insurance", "protection", "no life"],
    matchScore: 2,
    exampleQuery: "Which families with young children don't have life insurance?",
    response: {
      summary: "I found **68 households** with children present but no Equitable life policy on file. Of those, **22 are in the Protect wealth segment** — your highest-priority protection conversations.",
      topResults: [
        { name: "Hamilton family", value: 733505, ages: "23-45", note: "new parents, Term Conversion eligible" },
        { name: "Russell family", value: 855773, ages: "36-61", note: "New Parent + Asset Allocation triggers" },
        { name: "Cooper household", value: 11001, ages: "23", note: "Career Starter, new parent" }
      ],
      filterToApply: { hasChildren: true, hasLifePolicy: false },
      saveAsName: "Protection gap - families with children",
      cta: ["Open as filtered list", "Save as 'Protection gap - families'", "Export to Excel"]
    }
  }
];

export const ASK_PRISM_FALLBACK: AskPrismFallback = {
  message: "I'm still learning what to look for in your book. Try one of these to start:",
  suggestions: [
    "Show me clients turning 65 next year with no annuity",
    "Which of my high-value households haven't I contacted recently?",
    "Where are my biggest rollover opportunities?",
    "Which families with young children don't have life insurance?"
  ]
};

// -----------------------------------------------------------------------------
// EMAIL TEMPLATES — for the "draft email" / "use template" actions
// -----------------------------------------------------------------------------
export const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  new_parent: {
    name: "New Parent — first outreach",
    subject: "Congratulations on the new arrival",
    body: `Hi {{firstName}},

I just heard the news — congratulations to you and {{spouseName}} on welcoming {{babyName}} to the family.

I know the next few months are full of big and small changes. When things settle, I'd love to find 30 minutes to make sure your financial picture is set up to support everything that's about to happen — protection for your family, education planning down the road, and a quick look at how the new addition affects your overall plan.

No pressure on timing. Reply when you have a moment and we'll find something that works.

Warmly,
{{advisorName}}`
  },
  transitioned_intro: {
    name: "Transitioned client — introduction",
    subject: "Continuing your relationship with Equitable",
    body: `Dear {{firstName}},

I'm writing to introduce myself. I'm {{advisorName}}, and I'll be your primary point of contact at Equitable going forward following {{priorAdvisorName}}'s retirement.

My priority over the next few weeks is to make sure nothing falls through the cracks during this transition. I've reviewed your accounts and want to set up a brief call to introduce myself, listen to what's been working, and understand what's most important to you and your family right now.

Would the week of {{weekDate}} work for a 30-minute call? I'm happy to come to you, meet at our office, or jump on a video call — whatever's easiest.

Thank you for your continued trust in Equitable.

{{advisorName}}`
  },
  rmd_outreach: {
    name: "RMD reminder",
    subject: "Your 2026 required minimum distribution",
    body: `Hi {{firstName}},

A quick note as we head into the second half of the year. Your required minimum distribution for 2026 is due by December 15, and I want to make sure we get the timing and tax sequencing right.

Could we set aside 20-30 minutes in the next couple of weeks to walk through the options? There are a few decisions worth thinking through — quarterly vs. lump sum, charitable giving considerations, and how the RMD fits into your broader cash flow plan.

Let me know what works for your schedule.

Best,
{{advisorName}}`
  },
  newly_married: {
    name: "Newly married — beneficiary update",
    subject: "Quick update on your accounts now that you're married",
    body: `Hi {{firstName}},

Hope married life is treating you well. I wanted to follow up on something quick but important — making sure the beneficiaries on your existing policies and accounts reflect your new situation.

It's a 10-minute conversation but worth doing soon. While we're at it, I'd love to chat briefly about whether {{spouseName}} has coverage in place, since that's a common gap for newlyweds.

When's a good time to talk?

{{advisorName}}`
  }
};

// -----------------------------------------------------------------------------
// HELPER — find a matching question for Ask Prism
// -----------------------------------------------------------------------------
// Strong, distinctive keywords per canned answer. A query MUST contain at least
// one strong keyword from a question's set to match it. Generic nouns like
// "households", "clients", "policies", "tier", "segment" are intentionally
// excluded — they're too common and cause false-positive matches.
const ASK_PRISM_STRONG_KEYWORDS: Record<string, string[]> = {
  q_rollovers: ["rollover", "rollovers", "401k", "401(k)", "consolidate", "consolidation"],
  q_protection_gap: ["life insurance", "life coverage", "life policy", "kids", "children", "family protection"],
  q_no_annuity: ["turning 65", "annuity", "age 65", "medicare", "social security", " ss "],
  q_high_value_no_contact: ["haven't contacted", "have not contacted", "not contacted", "out of touch", "stale", "no contact", "haven't reached", "no outreach"],
};

export function findAskPrismMatch(userInput: string): AskPrismQuestion | null {
  const input = ` ${userInput.toLowerCase()} `;
  let bestMatch: AskPrismQuestion | null = null;
  let bestScore = 0;
  for (const q of ASK_PRISM_QUESTIONS) {
    const strong = ASK_PRISM_STRONG_KEYWORDS[q.id] ?? [];
    const hasStrong = strong.some(kw => input.includes(kw.toLowerCase()));
    if (!hasStrong) continue;
    const matches = q.keywords.filter(kw => input.includes(kw.toLowerCase())).length
      + strong.filter(kw => input.includes(kw.toLowerCase())).length;
    if (matches > bestScore) {
      bestMatch = q;
      bestScore = matches;
    }
  }
  return bestMatch;
}
