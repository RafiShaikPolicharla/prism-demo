// Branch Overview service. Demo mode reads the in-memory fixture; live
// mode would join Salesforce advisor team data with Prism's coaching
// signals. All UI components consume this service and never import the
// fixture directly.

import {
  BRANCH_ADVISORS,
  BRANCH_HEALTH,
  COACHING_OPPORTUNITIES,
  type BranchAdvisor,
  type BranchHealth,
  type CoachingOpportunity,
} from '@/data/branchFixture';
import { DEMO_MODE } from './config';

export const branchService = {
  listAdvisors(): BranchAdvisor[] {
    if (!DEMO_MODE)
      throw new Error(
        'Branch Overview requires Salesforce advisor team integration — Phase 1 capability',
      );
    return BRANCH_ADVISORS;
  },

  getAdvisor(id: string): BranchAdvisor | null {
    return BRANCH_ADVISORS.find((a) => a.id === id) ?? null;
  },

  listCoachingOpportunities(advisorId?: string | null): CoachingOpportunity[] {
    if (!DEMO_MODE)
      throw new Error(
        'Branch Overview requires Salesforce advisor team integration — Phase 1 capability',
      );
    if (!advisorId) return COACHING_OPPORTUNITIES;
    // When an advisor is selected, show branch-aggregate (null) plus that
    // advisor's specific items.
    return COACHING_OPPORTUNITIES.filter(
      (c) => c.targetAdvisorId === null || c.targetAdvisorId === advisorId,
    );
  },

  getBranchHealth(): BranchHealth {
    if (!DEMO_MODE)
      throw new Error(
        'Branch Overview requires Salesforce advisor team integration — Phase 1 capability',
      );
    return BRANCH_HEALTH;
  },
};
