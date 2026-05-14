// Barrel exports for the services layer. Components import from '@/services'
// and never touch @/data/* or @/integrations/supabase/* directly.

export { DEMO_MODE } from './config';
export { personasService } from './personas';
export { householdsService, getThemeTriggerLabels, getHouseholdCountByTheme } from './households';
export { opportunitiesService, CLIENT_SEGMENTS, WEALTH_SEGMENTS } from './opportunities';
export type { TodayFilters, HouseholdMeta, ClientSegmentDef, WealthSegmentDef } from './opportunities';
export { contentService } from './content';
export { askPrismService } from './askPrism';
export { servicesCache, useAskPrismCache } from './cache';
export { strategyListsService, useStrategyListsStore } from './strategyLists';
export type { StrategyList } from './strategyLists';
export type { CachedEntry, CacheStats } from './cache';
