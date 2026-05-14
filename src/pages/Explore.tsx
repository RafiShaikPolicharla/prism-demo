import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CLIENT_SEGMENTS, WEALTH_SEGMENTS } from '@/services';
import { toast } from 'sonner';
import {
  askPrismService,
  contentService,
  householdsService,
  getThemeTriggerLabels,
  getHouseholdCountByTheme,
  opportunitiesService,
  personasService,
  servicesCache,
  strategyListsService,
  useAskPrismCache,
  useStrategyListsStore,
} from '@/services';
import type { StrategyList } from '@/services';
import { askAgentflow, type AgentflowAskMeta } from '@/services/agentflow';
import { usePersona } from '@/stores/personaStore';
import { TopNav } from '@/components/TopNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { TierBadge } from '@/components/TierBadge';
import {
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Download,
  Columns3,
  Star,
  Sparkles,
  Send,
  PanelLeftClose,
  PanelLeft,
  Zap,
  Pin,
  ArrowLeft,
  Lock,
  BookmarkPlus,
  Mail,
} from 'lucide-react';
import type {
  AskPrismQuestion,
  DemoHousehold,
  ExploreColumn,
  SavedView,
  SavedViewFilters,
  Tag,
} from '@/types/demo';

// =================== formatting helpers ===================

const fmtUsd = (n?: number | null) => {
  if (n == null || !Number.isFinite(n) || n === 0) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const daysSince = (iso?: string | null): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const ms = Date.now() - d.getTime();
  return Math.floor(ms / 86_400_000);
};

const TAG_BADGE_CLASS: Record<string, string> = {
  'Flight Risk':
    'bg-[hsl(var(--urgency-act-now)/0.1)] text-[hsl(var(--urgency-act-now))] border-[hsl(var(--urgency-act-now)/0.2)]',
  'Recently Transitioned':
    'bg-[hsl(var(--accent-blue)/0.1)] text-[hsl(var(--accent-blue))] border-[hsl(var(--accent-blue)/0.2)]',
  'Has Organization': 'bg-muted text-muted-foreground border-border',
  'New Parent':
    'bg-[hsl(var(--urgency-this-quarter)/0.1)] text-[hsl(var(--urgency-this-quarter))] border-[hsl(var(--urgency-this-quarter)/0.2)]',
  'Newly Married':
    'bg-[hsl(var(--urgency-this-quarter)/0.1)] text-[hsl(var(--urgency-this-quarter))] border-[hsl(var(--urgency-this-quarter)/0.2)]',
};

function triggerBadgeClass(n: number): string {
  if (n <= 2) return 'bg-muted text-muted-foreground border-border';
  if (n <= 5)
    return 'bg-[hsl(var(--accent-blue)/0.12)] text-[hsl(var(--accent-blue))] border-[hsl(var(--accent-blue)/0.25)]';
  return 'bg-[hsl(var(--urgency-act-now)/0.12)] text-[hsl(var(--urgency-act-now))] border-[hsl(var(--urgency-act-now)/0.3)]';
}

// =================== filter state ===================

interface ActiveFilters {
  wealthSegment: string[];
  clientSegment: string[];
  assetSegment: string[];
  triggers: string[];
  tags: string[];
  products: string[];
  salesforceTier: string[];
  theme: string[];
  reviewStatus: string[]; // 'reviewed' | 'not_reviewed'
  hhValueRange?: [number, number];
  ageRange?: [number, number];
  lastContactDaysAgoMin?: number;
}

const EMPTY_FILTERS: ActiveFilters = {
  wealthSegment: [],
  clientSegment: [],
  assetSegment: [],
  triggers: [],
  tags: [],
  products: [],
  salesforceTier: [],
  theme: [],
  reviewStatus: [],
};

const HH_VALUE_BOUNDS: [number, number] = [0, 25_000_000];
const AGE_BOUNDS: [number, number] = [18, 95];

function filtersFromSpec(v: SavedViewFilters | undefined): ActiveFilters {
  if (!v) return { ...EMPTY_FILTERS };
  const f: ActiveFilters = { ...EMPTY_FILTERS };
  if (v.tags?.length) f.tags = [...v.tags];
  if (v.ageRange) f.ageRange = [v.ageRange[0], v.ageRange[1]];
  if (v.hhValueMin != null) f.hhValueRange = [v.hhValueMin, HH_VALUE_BOUNDS[1]];
  if (v.lastContactDaysAgo?.min != null) f.lastContactDaysAgoMin = v.lastContactDaysAgo.min;
  if (v.hasOrganization) f.tags = Array.from(new Set([...f.tags, 'Has Organization']));
  if (v.hasChildren) f.tags = Array.from(new Set([...f.tags, 'New Parent']));
  if (v.triggers?.length) f.triggers = [...v.triggers];
  return f;
}

function filtersFromSavedView(view: SavedView | undefined): ActiveFilters {
  return filtersFromSpec(view?.filters);
}

function isFiltersEmpty(f: ActiveFilters): boolean {
  return (
    f.wealthSegment.length === 0 &&
    f.clientSegment.length === 0 &&
    f.assetSegment.length === 0 &&
    f.triggers.length === 0 &&
    f.tags.length === 0 &&
    f.products.length === 0 &&
    f.salesforceTier.length === 0 &&
    f.theme.length === 0 &&
    f.reviewStatus.length === 0 &&
    !f.hhValueRange &&
    !f.ageRange &&
    f.lastContactDaysAgoMin == null
  );
}

function householdClientSegment(hh: DemoHousehold): string {
  if (!hh.members.length) return '';
  const counts = new Map<string, number>();
  for (const m of hh.members) {
    if (!m.segment) continue;
    counts.set(m.segment, (counts.get(m.segment) ?? 0) + 1);
  }
  let best = '';
  let bestN = 0;
  for (const [seg, n] of counts) {
    if (n > bestN) {
      best = seg;
      bestN = n;
    }
  }
  return best;
}

function applyFilters(rows: DemoHousehold[], f: ActiveFilters): DemoHousehold[] {
  return rows.filter((hh) => {
    if (f.wealthSegment.length) {
      // Filter on the canonical primaryWealthSegment so counts agree with
      // Today sidebar and the Share-of-Wallet 2x2. The free-form
      // hh.wealthSegment can be a multi-value display string.
      if (!hh.primaryWealthSegment || !f.wealthSegment.includes(hh.primaryWealthSegment)) {
        return false;
      }
    }
    if (f.assetSegment.length && !f.assetSegment.includes(hh.assetSegment)) return false;
    if (f.salesforceTier.length && !f.salesforceTier.includes(hh.salesforceTier)) return false;
    if (f.clientSegment.length) {
      const seg = householdClientSegment(hh);
      if (!f.clientSegment.includes(seg)) return false;
    }
    if (f.tags.length) {
      const tagSet = new Set<string>(hh.tags);
      if (!f.tags.every((t) => tagSet.has(t as Tag))) return false;
    }
    if (f.triggers.length) {
      if (hh.topAction && f.triggers.includes(hh.topAction)) {
        // pass
      } else if (hh.activeTriggers === 0) {
        return false;
      }
    }
    if (f.theme.length) {
      // Book-level definition: a household is "in theme X" if it has at least
      // one underlying CSV trigger flag mapped to that theme. See
      // getThemeTriggerLabels in services/households for the mapping and the
      // long-form rationale on why this differs from the Today sidebar count.
      const hhTriggers = new Set(hh.triggerLabels ?? []);
      const ok = f.theme.some((t) => {
        const wanted = getThemeTriggerLabels(t);
        if (wanted.length === 0) {
          // Fallback for themes with no underlying trigger mapping yet
          // (Tax-Aware, Policy Review): substring-match topAction.
          const ta = (hh.topAction ?? '').toLowerCase();
          return ta.includes(t.toLowerCase());
        }
        return wanted.some((w) => hhTriggers.has(w));
      });
      if (!ok) return false;
    }
    if (f.products.length) {
      const prodSet = new Set(hh.products);
      if (!f.products.some((p) => prodSet.has(p))) return false;
    }
    if (f.reviewStatus.length) {
      const wantReviewed = f.reviewStatus.includes('reviewed');
      const wantNot = f.reviewStatus.includes('not_reviewed');
      const isR = !!hh.isReviewed;
      if (wantReviewed && wantNot) {
        // both selected = no filter
      } else if (wantReviewed && !isR) return false;
      else if (wantNot && isR) return false;
    }
    if (f.hhValueRange) {
      const [lo, hi] = f.hhValueRange;
      if (hh.hhValue < lo || hh.hhValue > hi) return false;
    }
    if (f.ageRange) {
      const [lo, hi] = f.ageRange;
      const age = hh.maxAge ?? 0;
      if (age < lo || age > hi) return false;
    }
    if (f.lastContactDaysAgoMin != null) {
      const d = daysSince(hh.lastContact);
      if (d == null || d < f.lastContactDaysAgoMin) return false;
    }
    return true;
  });
}

// =================== sort ===================

type SortDir = 'asc' | 'desc';
interface SortState {
  key: string;
  dir: SortDir;
}

function getCellValue(hh: DemoHousehold, key: string): unknown {
  switch (key) {
    case 'name': return hh.name;
    case 'primaryContact': return hh.primaryContact;
    case 'maxAge': return hh.maxAge ?? 0;
    case 'clientSegment': return householdClientSegment(hh);
    case 'wealthSegment': return hh.primaryWealthSegment ?? '';
    case 'assetSegment': return hh.assetSegment;
    case 'salesforceTier': return hh.salesforceTier;
    case 'hhValue': return hh.hhValue;
    case 'investableAssets': return hh.investableAssets;
    case 'policies': return hh.policies;
    case 'activeTriggers': return hh.activeTriggers;
    case 'topAction': return hh.topAction ?? '';
    case 'lastContact': return hh.lastContact ?? '';
    case 'tags': return hh.tags.join(', ');
    default: return '';
  }
}

function sortRows(rows: DemoHousehold[], sort: SortState | null): DemoHousehold[] {
  if (!sort) return rows;
  const out = [...rows];
  out.sort((a, b) => {
    const av = getCellValue(a, sort.key);
    const bv = getCellValue(b, sort.key);
    if (typeof av === 'number' && typeof bv === 'number') {
      return sort.dir === 'asc' ? av - bv : bv - av;
    }
    const as = String(av ?? '');
    const bs = String(bv ?? '');
    return sort.dir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
  });
  return out;
}

// =================== CSV export ===================

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToCsv(rows: DemoHousehold[], cols: ExploreColumn[]): string {
  const header = cols.map((c) => csvEscape(c.label)).join(',');
  const lines = rows.map((r) =>
    cols.map((c) => csvEscape(getCellValue(r, c.key))).join(','),
  );
  return [header, ...lines].join('\n');
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// =================== filter chip & dropdown UI ===================

type FilterCategory =
  | 'wealthSegment'
  | 'clientSegment'
  | 'assetSegment'
  | 'salesforceTier'
  | 'triggers'
  | 'tags'
  | 'products'
  | 'theme'
  | 'reviewStatus'
  | 'hhValueRange'
  | 'ageRange'
  | 'lastContactDaysAgoMin';

const CATEGORY_LABELS: Record<FilterCategory, string> = {
  wealthSegment: 'Wealth Segment',
  clientSegment: 'Client Segment',
  assetSegment: 'Asset Segment',
  salesforceTier: 'Client Tier',
  triggers: 'Active Triggers',
  tags: 'Tags',
  products: 'Has Product',
  theme: 'Theme',
  reviewStatus: 'Review Status',
  hhValueRange: 'HH Value Range',
  ageRange: 'Age Range',
  lastContactDaysAgoMin: 'Last Contact',
};

const REVIEW_STATUS_LABELS: Record<string, string> = {
  reviewed: 'Reviewed',
  not_reviewed: 'Not yet reviewed',
};

// Render summary text with **bold** markdown spans
function renderSummary(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? (
      <strong key={i} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

const ASK_PRISM_SUGGESTIONS = [
  'Where are my biggest rollover opportunities?',
  'Which families with kids have no life coverage?',
  'Show me clients turning 65 with no annuity',
  "High-value households I haven't contacted recently",
];

// =================== component ===================

export default function Explore() {
  const navigate = useNavigate();
  const { personaId } = usePersona();
  const [searchParams, setSearchParams] = useSearchParams();

  const [allHouseholds, setAllHouseholds] = useState<DemoHousehold[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const [appliedView, setAppliedView] = useState<SavedView | null>(null);
  const [sort, setSort] = useState<SortState | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    contentService.exploreColumns().default.map((c) => c.key),
  );
  const [openCategory, setOpenCategory] = useState<FilterCategory | null>(null);

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessionViews, setSessionViews] = useState<SavedView[]>([]);

  // Ask Prism
  const [askInput, setAskInput] = useState('');
  const [askMatch, setAskMatch] = useState<AskPrismQuestion | null>(null);
  const [askQuestion, setAskQuestion] = useState('');
  const [askAgentflowText, setAskAgentflowText] = useState('');
  const [askAgentflowMeta, setAskAgentflowMeta] = useState<AgentflowAskMeta | null>(null);
  const [askAgentflowError, setAskAgentflowError] = useState<string | null>(null);
  const [askMeta, setAskMeta] = useState<{
    fromCache: boolean;
    responseTime: number;
    hitCount: number;
  } | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [askFallback, setAskFallback] = useState(false);
  
  const [statsOpen, setStatsOpen] = useState(false);
  const cache = useAskPrismCache();

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Strategy Lists
  const strategyListsMap = useStrategyListsStore((s) => s.lists);
  const [activeStrategyListId, setActiveStrategyListId] = useState<string | null>(null);
  const [saveListModalOpen, setSaveListModalOpen] = useState(false);
  const [marketingModalOpen, setMarketingModalOpen] = useState(false);
  const [saveListName, setSaveListName] = useState('');
  const [saveListTrackProgress, setSaveListTrackProgress] = useState(true);
  const [saveListNotify, setSaveListNotify] = useState(false);

  const baseFilterOptions = useMemo(() => contentService.filterOptions(), []);
  const filterOptions = useMemo(() => {
    // Recompute wealthSegment + salesforceTier counts from live data using
    // the canonical primaryWealthSegment / salesforceTier fields, so the
    // dropdown counts match Today sidebar and Book Health quadrants.
    if (allHouseholds.length === 0) return baseFilterOptions;
    const wsCounts: Record<string, number> = { Protect: 0, Develop: 0, Manage: 0, Maintain: 0 };
    const tierCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const h of allHouseholds) {
      if (h.primaryWealthSegment) wsCounts[h.primaryWealthSegment] = (wsCounts[h.primaryWealthSegment] ?? 0) + 1;
      if (h.salesforceTier) tierCounts[h.salesforceTier] = (tierCounts[h.salesforceTier] ?? 0) + 1;
    }
    const reviewedCount = allHouseholds.filter((h) => h.isReviewed).length;
    const notReviewedCount = allHouseholds.length - reviewedCount;
    // Theme options use the SAME getHouseholdCountByTheme function as the
    // Gaps by Theme bar chart in Book Health, so popover counts and bar
    // counts always reconcile.
    const themeOptions = contentService.themes().map((t) => ({
      value: t.label,
      label: t.label,
      count:
        t.status === 'coming_soon'
          ? 0
          : getHouseholdCountByTheme(t.label, allHouseholds),
      disabled: t.status === 'coming_soon',
    }));
    return {
      ...baseFilterOptions,
      wealthSegment: baseFilterOptions.wealthSegment.map((o) => ({ ...o, count: wsCounts[o.value] ?? 0 })),
      salesforceTier: baseFilterOptions.salesforceTier.map((o) => ({ ...o, count: tierCounts[o.value] ?? 0 })),
      reviewStatus: [
        { value: 'reviewed', label: 'Reviewed', count: reviewedCount },
        { value: 'not_reviewed', label: 'Not yet reviewed', count: notReviewedCount },
      ],
      theme: themeOptions,
    };
  }, [baseFilterOptions, allHouseholds]);
  const allColumns = useMemo(() => {
    const c = contentService.exploreColumns();
    return { default: c.default, hidden: c.hidden };
  }, []);
  const columnByKey = useMemo(() => {
    const m = new Map<string, ExploreColumn>();
    for (const c of [...allColumns.default, ...allColumns.hidden]) m.set(c.key, c);
    return m;
  }, [allColumns]);

  const baseSavedViews = useMemo(() => contentService.savedViews(), []);
  const savedViews = useMemo(() => {
    const all = [...baseSavedViews, ...sessionViews];
    const starred = all.filter((v) => v.starred).sort((a, b) => a.name.localeCompare(b.name));
    const rest = all.filter((v) => !v.starred).sort((a, b) => a.name.localeCompare(b.name));
    return [...starred, ...rest];
  }, [baseSavedViews, sessionViews]);

  // Load households
  useEffect(() => {
    let alive = true;
    householdsService.getAll().then((rows) => {
      if (!alive) return;
      setAllHouseholds(rows);
      strategyListsService.ensureSeeded(rows);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  // Source AUM passed in via ?sourceAum=... when arriving from a Book Health
  // click (Share-of-Wallet quadrant or Households reviewed). Surfaces the
  // originating dollar figure in the subtitle so the user can visually
  // reconcile source bar/quadrant ↔ destination Explore filter.
  const [sourceAumLabel, setSourceAumLabel] = useState<string | null>(null);

  // Persona default view (skipped if URL has filter query params)
  useEffect(() => {
    const hasUrlFilters =
      searchParams.has('theme') ||
      searchParams.has('clientSegment') ||
      searchParams.has('wealthSegment') ||
      searchParams.has('tags') ||
      searchParams.has('sort') ||
      searchParams.has('reviewStatus');
    if (hasUrlFilters) return;
    const persona = personasService.get(personaId);
    if (!persona) return;
    const view = baseSavedViews.find((v) => v.id === persona.defaultSavedView);
    if (view) {
      setAppliedView(view);
      setFilters(filtersFromSavedView(view));
    } else {
      setAppliedView(null);
      setFilters(EMPTY_FILTERS);
    }
    setSelected(new Set());
  }, [personaId, baseSavedViews]);

  // Apply URL query params on first mount.
  useEffect(() => {
    const themeParam = searchParams.get('theme');
    const clientSegmentId = searchParams.get('clientSegment');
    const wealthSegmentId = searchParams.get('wealthSegment');
    const tagsParam = searchParams.get('tags');
    const sortParam = searchParams.get('sort');
    const reviewStatusParam = searchParams.get('reviewStatus');
    const sourceAumParam = searchParams.get('sourceAum');
    if (!themeParam && !clientSegmentId && !wealthSegmentId && !tagsParam && !sortParam && !reviewStatusParam) return;

    const next: ActiveFilters = { ...EMPTY_FILTERS };
    if (themeParam) {
      const label = themeParam.includes('_')
        ? themeParam.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : themeParam;
      next.theme = [label];
    }
    if (clientSegmentId) {
      const def = CLIENT_SEGMENTS.find((s) => s.id === clientSegmentId);
      if (def) next.clientSegment = [def.csvSegment];
    }
    if (wealthSegmentId) {
      const def = WEALTH_SEGMENTS.find((s) => s.id === wealthSegmentId);
      if (def) next.wealthSegment = [def.label];
    }
    if (tagsParam) {
      next.tags = tagsParam.split(',').map((t) => t.trim()).filter(Boolean);
    }
    if (reviewStatusParam) {
      next.reviewStatus = reviewStatusParam.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (sortParam === 'lastContactAsc') {
      setSort({ key: 'lastContact', dir: 'asc' });
    }
    if (sourceAumParam) setSourceAumLabel(sourceAumParam);
    setAppliedView(null);
    setFilters(next);
    setSelected(new Set());
    setSearchParams({}, { replace: true });
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps



  const activeStrategyList: StrategyList | null = activeStrategyListId
    ? strategyListsMap[activeStrategyListId] ?? null
    : null;

  const householdsById = useMemo(() => {
    const m = new Map<string, DemoHousehold>();
    for (const h of allHouseholds) m.set(h.id, h);
    return m;
  }, [allHouseholds]);

  const strategyListRows = useMemo<DemoHousehold[]>(() => {
    if (!activeStrategyList) return [];
    return activeStrategyList.householdIds
      .map((id) => householdsById.get(id))
      .filter((h): h is DemoHousehold => Boolean(h));
  }, [activeStrategyList, householdsById]);

  const sortedStrategyLists = useMemo(
    () => strategyListsService.sortByPersona(Object.values(strategyListsMap), personaId),
    [strategyListsMap, personaId],
  );

  const filtered = useMemo(() => {
    if (activeStrategyList) return sortRows(strategyListRows, sort);
    return sortRows(applyFilters(allHouseholds, filters), sort);
  }, [activeStrategyList, strategyListRows, allHouseholds, filters, sort]);

  // Prune selection to visible filtered rows
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(filtered.map((h) => h.id));
      const next = new Set<string>();
      for (const id of prev) if (visible.has(id)) next.add(id);
      return next.size === prev.size ? prev : next;
    });
  }, [filtered]);

  const renderedColumns = useMemo(
    () => visibleColumns.map((k) => columnByKey.get(k)).filter((c): c is ExploreColumn => Boolean(c)),
    [visibleColumns, columnByKey],
  );

  const totalHouseholds = allHouseholds.length || 116;

  // ---------- handlers ----------

  const toggleSort = (key: string) => {
    setSort((s) => {
      if (!s || s.key !== key) return { key, dir: 'asc' };
      if (s.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  const removeChip = (cat: FilterCategory, value?: string) => {
    setFilters((f) => {
      const next = { ...f };
      if (cat === 'hhValueRange') next.hhValueRange = undefined;
      else if (cat === 'ageRange') next.ageRange = undefined;
      else if (cat === 'lastContactDaysAgoMin') next.lastContactDaysAgoMin = undefined;
      else if (value != null) {
        next[cat] = (next[cat] as string[]).filter((x) => x !== value);
      }
      return next;
    });
    setAppliedView(null);
  };

  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedView(null);
  };

  const applySavedView = (view: SavedView) => {
    setActiveStrategyListId(null);
    setAppliedView(view);
    setFilters(filtersFromSavedView(view));
    setAskMatch(null);
    setAskFallback(false);
  };

  // ---------- Strategy List handlers ----------
  const openStrategyList = (id: string) => {
    setActiveStrategyListId(id);
    setAppliedView(null);
    setFilters(EMPTY_FILTERS);
    setSelected(new Set());
    setOpenCategory(null);
  };
  const exitStrategyList = () => setActiveStrategyListId(null);

  const suggestedListName = useMemo(() => {
    if (filters.tags.includes('New Parent') || filters.tags.includes('Newly Married')) {
      return 'Q2 Protection Push';
    }
    if (filters.salesforceTier.includes('A')) return 'Tier A Outreach';
    if (filters.tags.includes('Recently Transitioned')) return 'Transitioned Outreach';
    if (appliedView) return appliedView.name;
    return 'Working Strategy List';
  }, [filters, appliedView]);

  const openSaveListModal = () => {
    if (filtered.length === 0) {
      toast('Nothing to save — apply filters first');
      return;
    }
    setSaveListName(suggestedListName);
    setSaveListTrackProgress(true);
    setSaveListNotify(false);
    setSaveListModalOpen(true);
  };

  const confirmSaveList = () => {
    const name = saveListName.trim() || suggestedListName;
    const ids = filtered.map((h) => h.id);
    const created = strategyListsService.create(name, ids);
    setSaveListModalOpen(false);
    toast.success(`Saved ${ids.length} households to '${created.name}'. This list is now under My Strategy Lists.`);
  };

  const toggleContacted = (householdId: string) => {
    if (!activeStrategyList) return;
    const isContacted = activeStrategyList.contactedIds.includes(householdId);
    strategyListsService.markContacted(activeStrategyList.id, householdId, !isContacted);
  };

  const handleRowClick = (hh: DemoHousehold) => {
    const actions = opportunitiesService.listForHousehold(hh.id);
    if (actions.length) {
      const urgencyWeight = (u: string) =>
        u === 'act_now' ? 3 : u === 'this_quarter' ? 2 : 1;
      const top = [...actions].sort(
        (a, b) => urgencyWeight(b.urgency) - urgencyWeight(a.urgency),
      )[0];
      navigate(`/opportunity/${top.id}`);
    } else {
      navigate(`/household/${hh.id}`);
    }
  };

  const handleExport = () => {
    const csv = rowsToCsv(filtered, renderedColumns);
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`prism-export-${today}.csv`, csv);
  };

  const toggleColumn = (key: string) => {
    setVisibleColumns((vc) => (vc.includes(key) ? vc.filter((k) => k !== key) : [...vc, key]));
  };

  // Ask Prism — creates a fresh Agentflow session per question, then streams
  // the response through the Vercel API proxy. The old demo matcher remains as
  // a fallback when the API is unavailable.
  const submitAsk = async (text?: string) => {
    const q = (text ?? askInput).trim();
    if (!q) return;

    const startedAt = performance.now();
    setAskQuestion(q);
    setAskLoading(true);
    setAskMatch(null);
    setAskFallback(false);
    setAskMeta(null);
    setAskAgentflowText('');
    setAskAgentflowMeta(null);
    setAskAgentflowError(null);

    try {
      const result = await askAgentflow(q, {
        onText: setAskAgentflowText,
        onMeta: setAskAgentflowMeta,
      });

      if (!result.text.trim()) {
        throw new Error('Agentflow returned an empty response');
      }

      setAskAgentflowMeta({
        sessionId: result.sessionId,
        requestId: result.requestId,
      });
      setAskMeta({
        fromCache: false,
        responseTime: Math.max(1, Math.round(performance.now() - startedAt)),
        hitCount: 1,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Agentflow request failed';
      setAskAgentflowError(message);

      const cached = servicesCache.get(q);
      if (cached) {
        const match = askPrismService.match(q);
        if (match) {
          setAskMatch(match);
          setAskFallback(false);
          setAskMeta({ fromCache: true, responseTime: 12, hitCount: cached.hitCount });
        }
        return;
      }

      const match = askPrismService.match(q);
      if (match) {
        servicesCache.set(q, match.response);
        setAskMatch(match);
        setAskFallback(false);
        setAskMeta({
          fromCache: false,
          responseTime: Math.max(1, Math.round(performance.now() - startedAt)),
          hitCount: 1,
        });
        return;
      }

      setAskMatch(null);
      setAskMeta(null);
      setAskFallback(true);
    } finally {
      setAskLoading(false);
    }
  };

  const dismissAsk = () => {
    setAskMatch(null);
    setAskFallback(false);
    setAskInput('');
    setAskQuestion('');
    setAskAgentflowText('');
    setAskAgentflowMeta(null);
    setAskAgentflowError(null);
    setAskMeta(null);
    setAskLoading(false);
  };

  const handleAskCta = (label: string) => {
    if (!askMatch) return;
    const r = askMatch.response;
    if (label.startsWith('Open as filtered')) {
      setFilters(filtersFromSpec(r.filterToApply));
      setAppliedView(null);
      dismissAsk();
    } else if (label.startsWith('Save')) {
      const newView: SavedView = {
        id: `session_${Date.now()}`,
        name: r.saveAsName,
        description: 'Saved this session',
        count: r.topResults.length,
        starred: false,
        filters: r.filterToApply,
        persona: 'all',
      };
      setSessionViews((vs) => [...vs, newView]);
      toast.success(`Saved as '${r.saveAsName}'`);
    } else if (label.startsWith('Export')) {
      const subset = applyFilters(allHouseholds, filtersFromSpec(r.filterToApply));
      downloadCsv(
        `prism-ask-${new Date().toISOString().slice(0, 10)}.csv`,
        rowsToCsv(subset, renderedColumns),
      );
    } else if (label.startsWith('Schedule')) {
      toast('Outreach campaign drafted — coming in pilot');
    }
  };

  // Bulk
  const allVisibleSelected = filtered.length > 0 && filtered.every((h) => selected.has(h.id));
  const someVisibleSelected = !allVisibleSelected && filtered.some((h) => selected.has(h.id));

  const toggleSelectAll = () => {
    setSelected((prev) => {
      if (allVisibleSelected) return new Set();
      const next = new Set(prev);
      for (const h of filtered) next.add(h.id);
      return next;
    });
  };
  const toggleSelectOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const exportSelection = () => {
    const subset = filtered.filter((h) => selected.has(h.id));
    downloadCsv(
      `prism-selection-${new Date().toISOString().slice(0, 10)}.csv`,
      rowsToCsv(subset, renderedColumns),
    );
  };

  const filteredAumTotal = useMemo(
    () => filtered.reduce((s, h) => s + (h.hhValue || 0), 0),
    [filtered],
  );

  const contactedCount = activeStrategyList?.contactedIds.length ?? 0;
  const subtitle = loading
    ? 'Loading…'
    : activeStrategyList
      ? `Strategy List · ${contactedCount} of ${activeStrategyList.householdIds.length} contacted`
      : appliedView
        ? `Showing ${appliedView.name} · ${filtered.length} households`
        : sourceAumLabel
          ? `${filtered.length} of ${totalHouseholds} households · ${fmtUsd(filteredAumTotal)} AUM`
          : `${filtered.length} of ${totalHouseholds} households`;

  // ---------- render ----------

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <div className="flex min-h-[calc(100vh-3rem)]">
        {/* ===== LEFT SIDEBAR ===== */}
        {sidebarOpen ? (
          <aside className="w-[250px] shrink-0 border-r border-border bg-card/30 flex flex-col">
            <div className="px-4 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">My Lists</h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
              {/* ===== STRATEGY LISTS ===== */}
              <div>
                <div className="px-2 pt-1 pb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    My Strategy Lists
                  </span>
                </div>
                <div className="space-y-1">
                  {sortedStrategyLists.map((sl) => {
                    const isActive = activeStrategyListId === sl.id;
                    const total = sl.householdIds.length;
                    const done = sl.contactedIds.length;
                    const pct = total ? Math.round((done / total) * 100) : 0;
                    return (
                      <button
                        key={sl.id}
                        type="button"
                        onClick={() => openStrategyList(sl.id)}
                        className={cn(
                          'w-full text-left rounded-md px-2.5 py-2 transition-colors flex gap-2 items-start',
                          isActive
                            ? 'bg-[hsl(var(--accent-blue)/0.12)] border-l-2 border-[hsl(var(--accent-blue))] pl-2'
                            : 'hover:bg-muted/60 border-l-2 border-transparent pl-2',
                        )}
                      >
                        <Pin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[hsl(var(--accent-blue))]" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-foreground truncate">{sl.name}</div>
                          <div className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                            {done} / {total} contacted
                          </div>
                          <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-[hsl(var(--accent-blue))] transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-muted-foreground/70 mt-1">
                            Created {fmtDate(sl.createdOn)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ===== SAVED VIEWS ===== */}
              <div>
                <div className="px-2 pt-1 pb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Saved Views
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-[11px]"
                    onClick={() => toast('Saved view creation coming in pilot')}
                  >
                    <Plus className="h-3 w-3" /> New
                  </Button>
                </div>
                <div className="space-y-1">
                  {savedViews.map((v) => {
                    const active = !activeStrategyListId && appliedView?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => applySavedView(v)}
                        className={cn(
                          'w-full text-left rounded-md px-2.5 py-2 transition-colors flex gap-2 items-start group',
                          active
                            ? 'bg-[hsl(var(--accent-blue)/0.12)] border-l-2 border-[hsl(var(--accent-blue))] pl-2'
                            : 'hover:bg-muted/60 border-l-2 border-transparent pl-2',
                        )}
                      >
                        <Star
                          className={cn(
                            'h-3.5 w-3.5 mt-0.5 shrink-0',
                            v.starred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/50',
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="text-xs font-semibold truncate text-foreground">
                              {v.name}
                            </div>
                            <span className="text-[10px] tabular-nums text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                              {v.count}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                            {v.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>
        ) : (
          <div className="border-r border-border bg-card/30 flex flex-col items-center pt-4 px-1">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-muted"
              aria-label="Open saved views"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ===== TABLE AREA ===== */}
        <div className="flex-1 min-w-0">
          {/* Sticky toolbar */}
          <div className="border-b border-border bg-background sticky top-12 z-20">
            <div className="px-4 lg:px-8 py-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Explore</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Columns3 className="h-4 w-4" /> Show columns
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-96 overflow-y-auto w-64">
                    <DropdownMenuLabel>Default columns</DropdownMenuLabel>
                    {allColumns.default.map((c) => (
                      <DropdownMenuCheckboxItem
                        key={c.key}
                        checked={visibleColumns.includes(c.key)}
                        onCheckedChange={() => toggleColumn(c.key)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {c.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Additional</DropdownMenuLabel>
                    {allColumns.hidden.map((c) => (
                      <DropdownMenuCheckboxItem
                        key={c.key}
                        checked={visibleColumns.includes(c.key)}
                        onCheckedChange={() => toggleColumn(c.key)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {c.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4" /> Export to Excel
                </Button>
                {!activeStrategyList && (
                  <Button variant="outline" size="sm" onClick={openSaveListModal}>
                    <BookmarkPlus className="h-4 w-4" /> Save as Strategy List
                  </Button>
                )}
              </div>
            </div>

            {/* Ask Prism */}
            <div className="px-4 lg:px-8 pb-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--accent-blue))]" />
                <span>Ask Prism</span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitAsk();
                }}
                className="flex items-center gap-2"
              >
                <Input
                  value={askInput}
                  onChange={(e) => setAskInput(e.target.value)}
                  placeholder="Ask Prism a question about your book..."
                  className="h-9 text-sm"
                />
                <Button type="submit" size="sm" className="h-9">
                  <Send className="h-3.5 w-3.5" />
                  Ask
                </Button>
              </form>

              {/* Suggestion chips — visible only when input is empty */}
              {askInput.trim() === '' && !askLoading && !askMatch && !askFallback && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ASK_PRISM_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setAskInput(s)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground hover:border-[hsl(var(--accent-blue))] hover:text-[hsl(var(--accent-blue))] hover:bg-[hsl(var(--accent-blue)/0.05)] transition-colors"
                    >
                      <Sparkles className="h-3 w-3" />
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Loading state — simulated LLM latency */}
              {askLoading && (
                <div className="mt-3 rounded-lg border border-[hsl(var(--accent-blue)/0.3)] bg-[hsl(var(--accent-blue)/0.05)] p-4 shadow-sm flex items-center gap-3 animate-pulse">
                  <Sparkles className="h-4 w-4 text-[hsl(var(--accent-blue))]" />
                  <span className="text-sm text-muted-foreground">
                    {askAgentflowText ? 'Streaming Agentflow response...' : 'Creating Agentflow session...'}
                  </span>
                </div>
              )}

              {/* Response card */}
              {askAgentflowText && (
                <AgentflowAskCard
                  question={askQuestion}
                  answer={askAgentflowText}
                  meta={askMeta}
                  agentflowMeta={askAgentflowMeta}
                  warning={askAgentflowError}
                  onDismiss={dismissAsk}
                />
              )}
              {askMatch && !askLoading && (
                <AskPrismCard
                  question={askMatch}
                  onCta={handleAskCta}
                  onDismiss={dismissAsk}
                  meta={askMeta}
                />
              )}
              {askFallback && !askMatch && (
                <AskPrismFallbackCard
                  onPick={(q) => {
                    setAskInput(q);
                    submitAsk(q);
                  }}
                  onDismiss={dismissAsk}
                />
              )}

              {/* Cache stats link */}
              {(cache.stats.totalCached > 0 || cache.stats.totalHits > 0) && (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStatsOpen(true)}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cache: {cache.stats.totalCached} question{cache.stats.totalCached === 1 ? '' : 's'} · {cache.stats.totalHits} hit{cache.stats.totalHits === 1 ? '' : 's'}
                  </button>
                </div>
              )}
            </div>

            {/* Filter chip bar (or strategy-list toolbar) */}
            {activeStrategyList ? (
              <div className="px-4 lg:px-8 pb-3 flex items-center gap-3 flex-wrap text-xs">
                <button
                  type="button"
                  onClick={exitStrategyList}
                  className="inline-flex items-center gap-1 text-[hsl(var(--accent-blue))] hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Explore
                </button>
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <Pin className="h-3.5 w-3.5 text-[hsl(var(--accent-blue))]" />
                  <span className="font-semibold">Strategy List: {activeStrategyList.name}</span>
                  <span className="text-muted-foreground">
                    · Created {fmtDate(activeStrategyList.createdOn)} · Membership locked, data refreshes daily
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground italic">
                  <Lock className="h-3 w-3" /> Filters disabled — strategy list membership is locked
                </span>
                <div className="ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setMarketingModalOpen(true)}
                  >
                    <Mail className="h-3.5 w-3.5" /> Send to Marketing Suite campaign
                  </Button>
                </div>
              </div>
            ) : (
              <div className="px-4 lg:px-8 pb-3 flex items-start gap-2 flex-wrap">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      <Plus className="h-3.5 w-3.5" /> Add filter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {(Object.keys(CATEGORY_LABELS) as FilterCategory[]).map((cat) => (
                      <DropdownMenuItem
                        key={cat}
                        onSelect={(e) => {
                          e.preventDefault();
                          setOpenCategory(cat);
                        }}
                      >
                        {CATEGORY_LABELS[cat]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {renderChips(filters, removeChip)}

                {!isFiltersEmpty(filters) && (
                  <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={clearAll}>
                    Clear all
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Strategy list info banner */}
          {activeStrategyList && (
            <div className="px-4 lg:px-8 pt-4">
              <div className="rounded-md border border-[hsl(var(--accent-blue)/0.3)] bg-[hsl(var(--accent-blue)/0.07)] px-4 py-2.5 text-xs text-foreground">
                This is a strategy list. Household membership stays consistent.
                Progress updates as you contact households; data refreshes daily.
              </div>
            </div>
          )}

          {openCategory && (
            <FilterEditorPanel
              category={openCategory}
              filters={filters}
              options={filterOptions}
              onChange={setFilters}
              onClose={() => setOpenCategory(null)}
              onUserEdit={() => setAppliedView(null)}
            />
          )}

          {/* Table */}
          <div className="px-4 lg:px-8 py-4 pb-24">
            {filtered.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-12 text-center">
                <p className="text-sm text-muted-foreground">No households match your filters.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={clearAll}>
                  Clear all filters
                </Button>
              </div>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="w-24 px-3 py-2 border-b border-border text-left font-medium text-muted-foreground text-xs">
                          {activeStrategyList ? (
                            <span className="inline-flex items-center gap-1">
                              <Pin className="h-3 w-3 text-[hsl(var(--accent-blue))]" /> Contacted
                            </span>
                          ) : (
                            <Checkbox
                              checked={
                                allVisibleSelected
                                  ? true
                                  : someVisibleSelected
                                    ? 'indeterminate'
                                    : false
                              }
                              onCheckedChange={toggleSelectAll}
                              aria-label="Select all"
                            />
                          )}
                        </th>
                        {renderedColumns.map((c) => (
                          <th
                            key={c.key}
                            style={{ width: c.width, minWidth: c.width }}
                            className="text-left font-medium text-muted-foreground px-3 py-2 border-b border-border whitespace-nowrap"
                          >
                            <button
                              type="button"
                              onClick={() => toggleSort(c.key)}
                              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                              {c.label}
                              {sort?.key === c.key ? (
                                sort.dir === 'asc' ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )
                              ) : (
                                <ChevronsUpDown className="h-3 w-3 opacity-40" />
                              )}
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((hh) => {
                        const isSel = selected.has(hh.id);
                        return (
                          <tr
                            key={hh.id}
                            className={cn(
                              'border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer',
                              isSel && 'bg-[hsl(var(--accent-blue)/0.05)]',
                            )}
                            onClick={() => handleRowClick(hh)}
                          >
                            <td
                              className="w-24 px-3 py-2 align-middle"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {activeStrategyList ? (
                                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground">
                                  <Checkbox
                                    checked={activeStrategyList.contactedIds.includes(hh.id)}
                                    onCheckedChange={() => toggleContacted(hh.id)}
                                    aria-label={`Mark ${hh.name} contacted`}
                                  />
                                  {activeStrategyList.contactedIds.includes(hh.id) && (
                                    <span className="text-[hsl(var(--accent-blue))]">✓</span>
                                  )}
                                </label>
                              ) : (
                                <Checkbox
                                  checked={isSel}
                                  onCheckedChange={() => toggleSelectOne(hh.id)}
                                  aria-label={`Select ${hh.name}`}
                                />
                              )}
                            </td>
                            {renderedColumns.map((c) => (
                              <td
                                key={c.key}
                                className="px-3 py-2 align-middle whitespace-nowrap text-foreground"
                                style={{ width: c.width, minWidth: c.width }}
                              >
                                {renderCell(hh, c)}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== CACHE STATS DIALOG ===== */}
      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-[hsl(var(--accent-blue))]" />
              Ask Prism cache
            </DialogTitle>
            <DialogDescription>
              In-session response cache. Resets when the demo resets.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border border-border p-3">
              <div className="text-xs text-muted-foreground">Questions cached</div>
              <div className="text-xl font-semibold tabular-nums">{cache.stats.totalCached}</div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs text-muted-foreground">Cache hits</div>
              <div className="text-xl font-semibold tabular-nums">{cache.stats.totalHits}</div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs text-muted-foreground">Tokens saved</div>
              <div className="text-xl font-semibold tabular-nums">
                {cache.stats.tokensSaved.toLocaleString()}
              </div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs text-muted-foreground">Est. cost saved</div>
              <div className="text-xl font-semibold tabular-nums">
                {cache.stats.costSavedUsd.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                })}
              </div>
            </div>
          </div>
          {cache.stats.mostAsked.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Top 3 most-asked
              </div>
              <ol className="space-y-1.5">
                {cache.stats.mostAsked.map((q, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-foreground line-clamp-1">{q.question}</span>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {q.hitCount}×
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                servicesCache.clear();
                toast.success('Cache cleared');
              }}
            >
              Clear cache
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== SAVE STRATEGY LIST DIALOG ===== */}
      <Dialog open={saveListModalOpen} onOpenChange={setSaveListModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save Working Strategy List</DialogTitle>
            <DialogDescription>
              Prism will keep this list of {filtered.length} households intact even
              as underlying data changes. Only progress markers update.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">List name</label>
              <Input
                value={saveListName}
                onChange={(e) => setSaveListName(e.target.value)}
                placeholder={suggestedListName}
                className="mt-1.5"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={saveListTrackProgress}
                  onCheckedChange={(v) => setSaveListTrackProgress(Boolean(v))}
                />
                <span>Track progress per household</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={saveListNotify}
                  onCheckedChange={(v) => setSaveListNotify(Boolean(v))}
                />
                <span>Notify me when households are no longer eligible</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setSaveListModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={confirmSaveList}>
              Save Strategy List
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== SEND TO MARKETING SUITE DIALOG ===== */}
      <Dialog open={marketingModalOpen} onOpenChange={setMarketingModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send strategy list to Marketing Suite?</DialogTitle>
            <DialogDescription>
              {activeStrategyList
                ? `This adds the ${activeStrategyList.householdIds.length} households in '${activeStrategyList.name}' as a campaign audience in Salesforce. Your firm's Marketing Suite team will pick up the list for outreach.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Note: contacted-state and progress tracking remain in Prism. Marketing Suite handles the email send.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setMarketingModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[hsl(var(--prism-gold,38_75%_52%))] text-white hover:opacity-90"
              style={{ backgroundColor: 'hsl(var(--prism-gold, 38 75% 52%))' }}
              onClick={() => {
                if (!activeStrategyList) return;
                const result = strategyListsService.sendToMarketingSuite(activeStrategyList.id);
                setMarketingModalOpen(false);
                toast.success(
                  `List sent — ${result.householdCount} households queued for ${activeStrategyList.name} campaign in Marketing Suite`,
                  { duration: 5000 },
                );
              }}
            >
              Send to Marketing Suite
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== BULK ACTION BAR ===== */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 rounded-full bg-[hsl(var(--prism-navy,222_40%_15%))] bg-foreground text-background shadow-2xl px-4 py-2.5 text-sm">
            <span className="font-medium tabular-nums pr-2 border-r border-background/20">
              {selected.size} household{selected.size === 1 ? '' : 's'} selected
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-background hover:bg-background/15 hover:text-background"
              onClick={() => toast.success(`Added ${selected.size} households to Outreach List`)}
            >
              Add to Outreach List
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-background hover:bg-background/15 hover:text-background"
              onClick={() => toast.success(`Tagged ${selected.size} households`)}
            >
              Tag selection
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-background hover:bg-background/15 hover:text-background"
              onClick={() => toast.success(`Note added to ${selected.size} households`)}
            >
              Add personal note
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-background hover:bg-background/15 hover:text-background"
              onClick={exportSelection}
            >
              Export selection to Excel
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-background hover:bg-background/15 hover:text-background"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// =================== Ask Prism cards ===================

function cleanAgentflowAnswer(answer: string): string {
  const trimmed = answer.trim();
  const match = trimmed.match(/^\{\s*['"]response['"]\s*:\s*(['"])([\s\S]*)\1\s*\}$/);
  if (!match) return trimmed;

  return match[2]
    .replace(/\\n/g, '\n')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .trim();
}

function renderAgentflowMarkdown(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

function parseAgentflowAnswer(answer: string): {
  summary: string;
  topResults: Array<string | { name?: string; value?: string | number; ages?: string; note?: string }>;
  remainder: string[];
} {
  const cleaned = cleanAgentflowAnswer(answer);

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object') {
      const record = parsed as {
        summary?: unknown;
        topResults?: unknown;
      };

      return {
        summary: typeof record.summary === 'string' ? record.summary : '',
        topResults: Array.isArray(record.topResults) ? record.topResults : [],
        remainder: [],
      };
    }
  } catch {
    // Fall through to markdown-ish parsing.
  }

  const lines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const topResultsIndex = lines.findIndex((line) =>
    line.replace(/\*/g, '').toLowerCase().startsWith('top results:'),
  );

  const summaryLines = (topResultsIndex >= 0 ? lines.slice(0, topResultsIndex) : lines)
    .map((line) => line.replace(/^\*\*Summary:\*\*\s*/i, '').trim())
    .filter(Boolean);
  const afterTopResults = topResultsIndex >= 0 ? lines.slice(topResultsIndex + 1) : [];
  const topResults = afterTopResults
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^- /, '').trim());
  const remainder = afterTopResults.filter((line) => !line.startsWith('- '));

  return {
    summary: summaryLines.join(' '),
    topResults,
    remainder,
  };
}

function renderAgentflowTopResult(
  row: string | { name?: string; value?: string | number; ages?: string; note?: string },
  index: number,
) {
  if (typeof row === 'string') {
    return (
      <div key={index} className="px-3 py-2 text-sm text-foreground leading-relaxed">
        {renderAgentflowMarkdown(row)}
      </div>
    );
  }

  return (
    <div key={index} className="px-3 py-2 flex items-center justify-between gap-3 text-sm">
      <div className="font-medium text-foreground">{row.name ?? 'Household'}</div>
      {row.ages && (
        <div className="text-xs text-muted-foreground tabular-nums">{row.ages}</div>
      )}
      {row.value != null && (
        <div className="text-xs tabular-nums text-foreground font-medium">{row.value}</div>
      )}
      {row.note && (
        <div className="text-xs text-muted-foreground flex-1 text-right truncate">{row.note}</div>
      )}
    </div>
  );
}

function AgentflowAskCard({
  question,
  answer,
  meta,
  agentflowMeta,
  warning,
  onDismiss,
}: {
  question: string;
  answer: string;
  meta: { fromCache: boolean; responseTime: number; hitCount: number } | null;
  agentflowMeta: AgentflowAskMeta | null;
  warning: string | null;
  onDismiss: () => void;
}) {
  const formatted = parseAgentflowAnswer(answer);

  return (
    <div className="mt-3 rounded-lg border border-[hsl(var(--accent-blue)/0.3)] bg-[hsl(var(--accent-blue)/0.05)] p-4 shadow-sm relative animate-in fade-in slide-in-from-top-2 duration-300">
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground p-1"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-2 pr-6">
        <Sparkles className="h-4 w-4 text-[hsl(var(--accent-blue))] mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          {question && (
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              {question}
            </div>
          )}
          {formatted.summary && (
            <p className="text-sm text-foreground leading-relaxed">
              {renderAgentflowMarkdown(formatted.summary)}
            </p>
          )}
        </div>
      </div>
      {formatted.topResults.length > 0 && (
        <div className="mt-3 ml-6">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Top results
          </div>
          <div className="rounded-md border border-border bg-background/60 divide-y divide-border">
            {formatted.topResults.map((row, i) => (
              renderAgentflowTopResult(row, i)
            ))}
          </div>
        </div>
      )}
      {formatted.remainder.length > 0 && (
        <div className="mt-3 ml-6 space-y-1 text-sm text-muted-foreground">
          {formatted.remainder.map((line, i) => (
            <p key={i}>{renderAgentflowMarkdown(line)}</p>
          ))}
        </div>
      )}
      <div className="mt-3 ml-6 flex gap-2 flex-wrap items-center text-[12px] text-muted-foreground">
        {agentflowMeta?.sessionId && (
          <span className="rounded-full border border-border bg-background/60 px-2 py-0.5">
            Session {agentflowMeta.sessionId.slice(0, 8)}
          </span>
        )}
        {agentflowMeta?.requestId && (
          <span className="rounded-full border border-border bg-background/60 px-2 py-0.5">
            Request {agentflowMeta.requestId.slice(0, 8)}
          </span>
        )}
        {warning && (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-200">
            {warning}
          </span>
        )}
        {meta && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#78350F] px-2 py-0.5 font-medium text-[#FED7AA]">
            <Sparkles className="h-3 w-3" />
            Agentflow · {meta.responseTime}ms
          </span>
        )}
      </div>
    </div>
  );
}

function AskPrismCard({
  question,
  onCta,
  onDismiss,
  meta,
}: {
  question: AskPrismQuestion;
  onCta: (label: string) => void;
  onDismiss: () => void;
  meta: { fromCache: boolean; responseTime: number; hitCount: number } | null;
}) {
  const r = question.response;
  return (
    <div className="mt-3 rounded-lg border border-[hsl(var(--accent-blue)/0.3)] bg-[hsl(var(--accent-blue)/0.05)] p-4 shadow-sm relative animate-in fade-in slide-in-from-top-2 duration-300">
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground p-1"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-2 pr-6">
        <Sparkles className="h-4 w-4 text-[hsl(var(--accent-blue))] mt-0.5 shrink-0" />
        <p className="text-sm text-foreground leading-relaxed">{renderSummary(r.summary)}</p>
      </div>
      <div className="mt-3 ml-6">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
          Top results
        </div>
        <div className="rounded-md border border-border bg-background/60 divide-y divide-border">
          {r.topResults.map((row, i) => (
            <div key={i} className="px-3 py-2 flex items-center justify-between gap-3 text-sm">
              <div className="font-medium text-foreground">{row.name}</div>
              <div className="text-xs text-muted-foreground tabular-nums">ages {row.ages}</div>
              <div className="text-xs tabular-nums text-foreground font-medium">{fmtUsd(row.value)}</div>
              <div className="text-xs text-muted-foreground flex-1 text-right truncate">{row.note}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 ml-6 flex gap-2 flex-wrap items-center">
        {r.cta.map((label) => (
          <Button
            key={label}
            size="sm"
            variant={label.startsWith('Open') ? 'default' : 'outline'}
            className="h-8 text-xs"
            onClick={() => onCta(label)}
          >
            {label}
          </Button>
        ))}
        {meta && (
          <span
            className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium"
            style={
              meta.fromCache
                ? { backgroundColor: '#064E3B', color: '#6EE7B7' }
                : { backgroundColor: '#78350F', color: '#FED7AA' }
            }
          >
            {meta.fromCache ? (
              <>
                <Zap className="h-3 w-3" />
                Cached · {meta.responseTime}ms · Asked {meta.hitCount} time{meta.hitCount === 1 ? '' : 's'}
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" />
                Generated · {meta.responseTime}ms · First time asked
              </>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

function AskPrismFallbackCard({
  onPick,
  onDismiss,
}: {
  onPick: (q: string) => void;
  onDismiss: () => void;
}) {
  const fb = askPrismService.fallback();
  return (
    <div className="mt-3 rounded-lg border border-[hsl(var(--accent-blue)/0.3)] bg-[hsl(var(--accent-blue)/0.05)] p-4 shadow-sm relative animate-in fade-in slide-in-from-top-2 duration-300">
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground p-1"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-2 pr-6">
        <Sparkles className="h-4 w-4 text-[hsl(var(--accent-blue))] mt-0.5 shrink-0" />
        <p className="text-sm text-foreground">{fb.message}</p>
      </div>
      <div className="mt-3 ml-6 flex flex-wrap gap-2">
        {fb.suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="text-xs rounded-full bg-background border border-border px-3 py-1.5 hover:border-[hsl(var(--accent-blue))] hover:text-[hsl(var(--accent-blue))] transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// =================== chip rendering ===================

function renderChips(
  f: ActiveFilters,
  remove: (cat: FilterCategory, v?: string) => void,
) {
  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  const pushMulti = (
    cat: 'wealthSegment' | 'clientSegment' | 'assetSegment' | 'triggers' | 'tags' | 'products' | 'salesforceTier' | 'theme',
  ) => {
    for (const v of f[cat]) {
      chips.push({
        key: `${cat}:${v}`,
        label: `${CATEGORY_LABELS[cat]}: ${v}`,
        onRemove: () => remove(cat, v),
      });
    }
  };
  pushMulti('wealthSegment');
  pushMulti('clientSegment');
  pushMulti('assetSegment');
  pushMulti('salesforceTier');
  pushMulti('triggers');
  pushMulti('tags');
  pushMulti('products');
  pushMulti('theme');
  for (const v of f.reviewStatus) {
    chips.push({
      key: `reviewStatus:${v}`,
      label: `Review Status: ${REVIEW_STATUS_LABELS[v] ?? v}`,
      onRemove: () => remove('reviewStatus', v),
    });
  }
  if (f.hhValueRange) {
    chips.push({
      key: 'hhValueRange',
      label: `HH Value: ${fmtUsd(f.hhValueRange[0])}–${fmtUsd(f.hhValueRange[1])}`,
      onRemove: () => remove('hhValueRange'),
    });
  }
  if (f.ageRange) {
    chips.push({
      key: 'ageRange',
      label: `Age: ${f.ageRange[0]}–${f.ageRange[1]}`,
      onRemove: () => remove('ageRange'),
    });
  }
  if (f.lastContactDaysAgoMin != null) {
    chips.push({
      key: 'lastContact',
      label: `Last contact > ${f.lastContactDaysAgoMin}d ago`,
      onRemove: () => remove('lastContactDaysAgoMin'),
    });
  }
  return chips.map((c) => (
    <span
      key={c.key}
      className="inline-flex items-center gap-1 rounded-full bg-muted text-foreground text-xs px-2.5 py-1 h-8 border border-border"
    >
      {c.label}
      <button
        type="button"
        onClick={c.onRemove}
        className="ml-0.5 rounded-full hover:bg-background/60 p-0.5"
        aria-label="Remove filter"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  ));
}

// =================== cell rendering ===================

function renderCell(hh: DemoHousehold, c: ExploreColumn) {
  if (c.key === 'salesforceTier') {
    return <TierBadge tier={hh.salesforceTier} />;
  }
  if (c.key === 'tags') {
    if (!hh.tags.length) return <span className="text-muted-foreground">—</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {hh.tags.map((t) => (
          <Badge
            key={t}
            variant="outline"
            className={cn('text-[10px] font-normal px-1.5 py-0', TAG_BADGE_CLASS[t] ?? '')}
          >
            {t}
          </Badge>
        ))}
      </div>
    );
  }
  if (c.key === 'activeTriggers') {
    const n = hh.activeTriggers ?? 0;
    return (
      <Badge variant="outline" className={cn('font-medium tabular-nums', triggerBadgeClass(n))}>
        {n}
      </Badge>
    );
  }
  const v = getCellValue(hh, c.key);
  if (c.format === 'currency') return <span className="tabular-nums">{fmtUsd(v as number)}</span>;
  if (c.format === 'date') return <span className="tabular-nums">{fmtDate(v as string)}</span>;
  if (c.format === 'boolean') return <span>{v ? 'Yes' : 'No'}</span>;
  if (v == null || v === '') return <span className="text-muted-foreground">—</span>;
  return <span>{String(v)}</span>;
}

// =================== filter editor panel ===================

interface FilterEditorPanelProps {
  category: FilterCategory;
  filters: ActiveFilters;
  options: ReturnType<typeof contentService.filterOptions>;
  onChange: (f: ActiveFilters) => void;
  onClose: () => void;
  onUserEdit: () => void;
}

function FilterEditorPanel({
  category,
  filters,
  options,
  onChange,
  onClose,
  onUserEdit,
}: FilterEditorPanelProps) {
  const update = (next: ActiveFilters) => {
    onUserEdit();
    onChange(next);
  };

  const renderMulti = (
    cat: 'wealthSegment' | 'clientSegment' | 'assetSegment' | 'triggers' | 'tags' | 'products' | 'salesforceTier' | 'theme',
    items: { value: string; label?: string; count: number; disabled?: boolean }[],
  ) => {
    const selected = new Set(filters[cat]);
    return (
      <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
        {items.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              'flex items-center gap-2 text-sm',
              opt.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            )}
          >
            <Checkbox
              checked={selected.has(opt.value)}
              disabled={opt.disabled}
              onCheckedChange={() => {
                if (opt.disabled) return;
                const arr = filters[cat];
                const next = arr.includes(opt.value)
                  ? arr.filter((x) => x !== opt.value)
                  : [...arr, opt.value];
                update({ ...filters, [cat]: next });
              }}
            />
            <span className="flex-1 text-foreground">{opt.label ?? opt.value}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{opt.count}</span>
          </label>
        ))}
      </div>
    );
  };

  let body: React.ReactNode = null;
  switch (category) {
    case 'wealthSegment': body = renderMulti('wealthSegment', options.wealthSegment); break;
    case 'clientSegment': body = renderMulti('clientSegment', options.clientSegment); break;
    case 'assetSegment': body = renderMulti('assetSegment', options.assetSegment); break;
    case 'triggers': body = renderMulti('triggers', options.triggers); break;
    case 'tags': body = renderMulti('tags', options.tags); break;
    case 'products': body = renderMulti('products', options.products); break;
    case 'salesforceTier': body = renderMulti('salesforceTier', options.salesforceTier); break;
    case 'theme': body = renderMulti('theme', (options as any).theme ?? []); break;
    case 'reviewStatus': {
      const items = options.reviewStatus ?? [];
      const selected = new Set(filters.reviewStatus);
      body = (
        <div className="space-y-2">
          {items.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={selected.has(opt.value)}
                onCheckedChange={() => {
                  const arr = filters.reviewStatus;
                  const next = arr.includes(opt.value)
                    ? arr.filter((x) => x !== opt.value)
                    : [...arr, opt.value];
                  update({ ...filters, reviewStatus: next });
                }}
              />
              <span className="flex-1 text-foreground">{opt.label ?? opt.value}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{opt.count}</span>
            </label>
          ))}
        </div>
      );
      break;
    }
    case 'hhValueRange': {
      const cur = filters.hhValueRange ?? HH_VALUE_BOUNDS;
      body = (
        <div className="space-y-3">
          <Slider
            min={HH_VALUE_BOUNDS[0]}
            max={HH_VALUE_BOUNDS[1]}
            step={50_000}
            value={cur}
            onValueChange={(v) => update({ ...filters, hhValueRange: [v[0], v[1]] as [number, number] })}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
            <span>{fmtUsd(cur[0])}</span>
            <span>{fmtUsd(cur[1])}</span>
          </div>
        </div>
      );
      break;
    }
    case 'ageRange': {
      const cur = filters.ageRange ?? AGE_BOUNDS;
      body = (
        <div className="space-y-3">
          <Slider
            min={AGE_BOUNDS[0]}
            max={AGE_BOUNDS[1]}
            step={1}
            value={cur}
            onValueChange={(v) => update({ ...filters, ageRange: [v[0], v[1]] as [number, number] })}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
            <span>{cur[0]} yrs</span>
            <span>{cur[1]} yrs</span>
          </div>
        </div>
      );
      break;
    }
    case 'lastContactDaysAgoMin': {
      body = (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">More than X days ago</label>
          <Input
            type="number"
            min={0}
            value={filters.lastContactDaysAgoMin ?? ''}
            onChange={(e) => {
              const v = e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value, 10));
              update({ ...filters, lastContactDaysAgoMin: v });
            }}
            placeholder="e.g. 60"
          />
        </div>
      );
      break;
    }
  }

  return (
    <div className="px-4 lg:px-8 pt-2">
      <div className="rounded-md border border-border bg-card shadow-sm p-4 w-full max-w-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">{CATEGORY_LABELS[category]}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {body}
        <div className="mt-4 flex justify-end">
          <Button size="sm" variant="outline" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}
