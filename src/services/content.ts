// Content service — themes, saved views, explore columns, filter options,
// and email templates. These are presentation-layer config in DEMO_MODE;
// in live mode they'll come from prism_silver_theme / prism_silver_content.

import {
  PLANNING_THEMES,
  SAVED_VIEWS,
  EXPLORE_COLUMNS,
  FILTER_OPTIONS,
  EMAIL_TEMPLATES,
} from '@/data/demoData';
import type {
  PlanningTheme,
  SavedView,
  ExploreColumnsConfig,
  FilterOptionsConfig,
  EmailTemplate,
} from '@/types/demo';
import { DEMO_MODE } from './config';

function guard<T>(v: T): T {
  if (!DEMO_MODE) throw new Error('contentService: live mode not implemented');
  return v;
}

export const contentService = {
  themes(): PlanningTheme[] {
    return guard(PLANNING_THEMES);
  },

  savedViews(): SavedView[] {
    return guard(SAVED_VIEWS);
  },

  exploreColumns(): ExploreColumnsConfig {
    return guard(EXPLORE_COLUMNS);
  },

  filterOptions(): FilterOptionsConfig {
    return guard(FILTER_OPTIONS);
  },

  emailTemplates(): Record<string, EmailTemplate> {
    return guard(EMAIL_TEMPLATES);
  },

  emailTemplate(key: string): EmailTemplate | null {
    return guard(EMAIL_TEMPLATES[key] ?? null);
  },
};
