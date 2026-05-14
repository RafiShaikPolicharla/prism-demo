
-- =========================================================================
-- PRISM SCHEMA — empty tables, medallion-aware
-- Convention: snake_case, *_id identifiers, *_at timestamps, *_on dates,
-- is_/has_ booleans. UUIDs everywhere except rule_id and theme_id (slugs).
-- Production target noted per table (Unity Catalog layer).
-- =========================================================================

-- ============================ SILVER LAYER ============================

-- Rule catalog. Production target: Unity Catalog SILVER (curated reference).
-- Stable slug PK so rules can be referenced from code, configs, and content.
CREATE TABLE public.prism_silver_rule_definition (
  rule_id            TEXT PRIMARY KEY,                      -- e.g. 'rule_beneficiary_review'
  name               TEXT NOT NULL,
  description        TEXT,
  theme_id           TEXT,                                  -- FK added below
  category           TEXT,
  severity           TEXT,                                  -- 'info' | 'low' | 'med' | 'high'
  logic_expression   JSONB,                                 -- declarative rule body
  required_inputs    JSONB,
  output_schema      JSONB,
  version            INTEGER NOT NULL DEFAULT 1,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from_on  DATE,
  effective_to_on    DATE,
  owner              TEXT,
  tags               TEXT[],
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.prism_silver_rule_definition IS
  'Catalog of advisory rules (e.g. beneficiary review, RMD due). Slug PK for stable cross-system references. Target: Unity Catalog SILVER.';

-- Themes. Production target: Unity Catalog SILVER.
CREATE TABLE public.prism_silver_theme (
  theme_id      TEXT PRIMARY KEY,                           -- e.g. 'theme_protection'
  name          TEXT NOT NULL,
  description   TEXT,
  parent_theme_id TEXT REFERENCES public.prism_silver_theme(theme_id),
  display_order INTEGER,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.prism_silver_theme IS
  'Advisory themes (protection, growth, legacy, etc.) used to group rules, content, and opportunities. Target: Unity Catalog SILVER.';

-- Now we can add the rule -> theme FK
ALTER TABLE public.prism_silver_rule_definition
  ADD CONSTRAINT prism_silver_rule_definition_theme_id_fkey
  FOREIGN KEY (theme_id) REFERENCES public.prism_silver_theme(theme_id);

-- Personas. Production target: Unity Catalog SILVER.
CREATE TABLE public.prism_silver_persona (
  persona_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT NOT NULL UNIQUE,                        -- short code: 'pre_retiree_affluent'
  name         TEXT NOT NULL,
  description  TEXT,
  attributes   JSONB,                                       -- demographic / behavioral signals
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.prism_silver_persona IS
  'Client persona archetypes used for segmentation and content targeting. Target: Unity Catalog SILVER.';

-- Content library. Production target: Unity Catalog SILVER.
CREATE TABLE public.prism_silver_content (
  content_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  source          TEXT,                                     -- internal | provider | regulatory
  source_url      TEXT,
  content_type    TEXT,                                     -- 'article' | 'product_sheet' | 'policy' | 'script'
  theme_id        TEXT REFERENCES public.prism_silver_theme(theme_id),
  persona_ids     UUID[],
  body            TEXT,
  summary         TEXT,
  language        TEXT NOT NULL DEFAULT 'en',
  version         INTEGER NOT NULL DEFAULT 1,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  published_on    DATE,
  expires_on      DATE,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.prism_silver_content IS
  'Curated content items shown to advisors / used in LLM grounding. Target: Unity Catalog SILVER.';

CREATE INDEX prism_silver_content_theme_idx ON public.prism_silver_content(theme_id);
CREATE INDEX prism_silver_content_active_idx ON public.prism_silver_content(is_active);

-- Content chunks for retrieval. Production target: Unity Catalog SILVER.
CREATE TABLE public.prism_silver_content_chunk (
  chunk_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id    UUID NOT NULL REFERENCES public.prism_silver_content(content_id) ON DELETE CASCADE,
  chunk_index   INTEGER NOT NULL,
  text          TEXT NOT NULL,
  token_count   INTEGER,
  embedding     JSONB,                                      -- placeholder; pgvector can replace later
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.prism_silver_content_chunk IS
  'Chunked content for retrieval/RAG. Embedding stored as JSONB for now; swap to pgvector later. Target: Unity Catalog SILVER.';

CREATE INDEX prism_silver_content_chunk_content_idx ON public.prism_silver_content_chunk(content_id);
CREATE UNIQUE INDEX prism_silver_content_chunk_unique_idx
  ON public.prism_silver_content_chunk(content_id, chunk_index);

-- Eval runs. Production target: Unity Catalog SILVER.
CREATE TABLE public.prism_silver_eval_run (
  eval_run_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_name       TEXT NOT NULL,
  target_kind    TEXT NOT NULL,                             -- 'rule' | 'llm_prompt' | 'pipeline'
  target_ref     TEXT,                                      -- rule_id, prompt name, etc.
  dataset_ref    TEXT,
  metrics        JSONB,
  status         TEXT NOT NULL DEFAULT 'pending',           -- pending | running | passed | failed
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.prism_silver_eval_run IS
  'Evaluation runs for rules, prompts, and pipelines. Target: Unity Catalog SILVER.';

CREATE INDEX prism_silver_eval_run_target_idx ON public.prism_silver_eval_run(target_kind, target_ref);
CREATE INDEX prism_silver_eval_run_started_idx ON public.prism_silver_eval_run(started_at DESC);

-- Guardrail events. Production target: Unity Catalog SILVER.
CREATE TABLE public.prism_silver_guardrail_event (
  guardrail_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type     TEXT NOT NULL,                             -- 'pii_block' | 'policy_violation' | 'hallucination_flag' ...
  severity       TEXT NOT NULL,                             -- 'info' | 'warn' | 'block'
  source         TEXT,                                      -- which surface (chat, opportunity_gen, etc.)
  llm_log_id     UUID,                                      -- soft link to bronze llm log
  advisor_id     UUID,
  household_id   UUID,
  details        JSONB,
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.prism_silver_guardrail_event IS
  'Guardrail / safety triggers from LLM and rule layers. Target: Unity Catalog SILVER.';

CREATE INDEX prism_silver_guardrail_event_type_idx ON public.prism_silver_guardrail_event(event_type);
CREATE INDEX prism_silver_guardrail_event_occurred_idx ON public.prism_silver_guardrail_event(occurred_at DESC);

-- ============================ GOLD LAYER ============================

-- Advisors. Production target: Unity Catalog GOLD.
CREATE TABLE public.prism_gold_advisor (
  advisor_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_ref   TEXT UNIQUE,                               -- upstream system id
  full_name      TEXT NOT NULL,
  email          TEXT,
  team_id        UUID,
  region         TEXT,
  role           TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  hired_on       DATE,
  metadata       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.prism_gold_advisor IS
  'Advisor master record. Target: Unity Catalog GOLD.';

CREATE INDEX prism_gold_advisor_team_idx ON public.prism_gold_advisor(team_id);

-- Households. Production target: Unity Catalog GOLD.
CREATE TABLE public.prism_gold_household (
  household_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_ref     TEXT UNIQUE,
  display_name     TEXT NOT NULL,
  primary_advisor_id UUID REFERENCES public.prism_gold_advisor(advisor_id),
  segment          TEXT,
  persona_id       UUID REFERENCES public.prism_silver_persona(persona_id),
  total_aum        NUMERIC(18,2),
  household_size   INTEGER,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  onboarded_on     DATE,
  metadata         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.prism_gold_household IS
  'Household master record (the unit of advisory engagement). Target: Unity Catalog GOLD.';

CREATE INDEX prism_gold_household_advisor_idx ON public.prism_gold_household(primary_advisor_id);
CREATE INDEX prism_gold_household_persona_idx ON public.prism_gold_household(persona_id);

-- Client 360. Production target: Unity Catalog GOLD.
CREATE TABLE public.prism_gold_client_360 (
  client_360_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id       UUID NOT NULL REFERENCES public.prism_gold_household(household_id) ON DELETE CASCADE,
  individual_id      UUID,                                  -- optional; null = household-level snapshot
  snapshot_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  demographics       JSONB,
  financials         JSONB,
  goals              JSONB,
  holdings           JSONB,
  liabilities        JSONB,
  insurance          JSONB,
  risk_profile       JSONB,
  engagement         JSONB,
  derived_signals    JSONB,
  data_quality       JSONB,
  is_current         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.prism_gold_client_360 IS
  'Unified household / individual snapshot used by rules and LLM grounding. Target: Unity Catalog GOLD.';

CREATE INDEX prism_gold_client_360_household_idx ON public.prism_gold_client_360(household_id);
CREATE INDEX prism_gold_client_360_current_idx ON public.prism_gold_client_360(household_id) WHERE is_current;
CREATE INDEX prism_gold_client_360_snapshot_idx ON public.prism_gold_client_360(snapshot_at DESC);

-- Opportunities. Production target: Unity Catalog GOLD.
CREATE TABLE public.prism_gold_opportunity (
  opportunity_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id     UUID NOT NULL REFERENCES public.prism_gold_household(household_id) ON DELETE CASCADE,
  advisor_id       UUID REFERENCES public.prism_gold_advisor(advisor_id),
  rule_id          TEXT REFERENCES public.prism_silver_rule_definition(rule_id),
  theme_id         TEXT REFERENCES public.prism_silver_theme(theme_id),
  title            TEXT NOT NULL,
  rationale        TEXT,
  evidence         JSONB,                                   -- supporting facts from client_360
  recommended_action JSONB,
  priority_score   NUMERIC(6,3),
  estimated_value  NUMERIC(18,2),
  status           TEXT NOT NULL DEFAULT 'open',            -- open | snoozed | dismissed | actioned | expired
  surfaced_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_on           DATE,
  resolved_at      TIMESTAMPTZ,
  resolution_note  TEXT,
  metadata         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.prism_gold_opportunity IS
  'Surfaced opportunities tied to a household, generated by rules and/or LLM. Target: Unity Catalog GOLD.';

CREATE INDEX prism_gold_opportunity_household_idx ON public.prism_gold_opportunity(household_id);
CREATE INDEX prism_gold_opportunity_advisor_idx ON public.prism_gold_opportunity(advisor_id);
CREATE INDEX prism_gold_opportunity_rule_idx ON public.prism_gold_opportunity(rule_id);
CREATE INDEX prism_gold_opportunity_status_idx ON public.prism_gold_opportunity(status);
CREATE INDEX prism_gold_opportunity_surfaced_idx ON public.prism_gold_opportunity(surfaced_at DESC);

-- Book health. Production target: Unity Catalog GOLD.
CREATE TABLE public.prism_gold_book_health (
  book_health_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id       UUID NOT NULL REFERENCES public.prism_gold_advisor(advisor_id) ON DELETE CASCADE,
  as_of_on         DATE NOT NULL,
  households_count INTEGER,
  active_opportunities INTEGER,
  overdue_opportunities INTEGER,
  coverage_score   NUMERIC(6,3),
  engagement_score NUMERIC(6,3),
  risk_score       NUMERIC(6,3),
  metrics          JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.prism_gold_book_health IS
  'Daily/periodic snapshot of an advisor''s book of business. Target: Unity Catalog GOLD.';

CREATE UNIQUE INDEX prism_gold_book_health_advisor_date_idx
  ON public.prism_gold_book_health(advisor_id, as_of_on);
CREATE INDEX prism_gold_book_health_as_of_idx ON public.prism_gold_book_health(as_of_on DESC);

-- ============================ BRONZE LAYER ============================

-- Action log. Production target: Unity Catalog BRONZE.
CREATE TABLE public.prism_bronze_action_log (
  action_log_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id       UUID,                                    -- soft FK; bronze stays loose
  household_id     UUID,
  opportunity_id   UUID,
  action_type      TEXT NOT NULL,                           -- 'view' | 'snooze' | 'dismiss' | 'complete' | 'note' ...
  surface          TEXT,                                    -- 'opportunity_card' | 'client_page' | 'chat' ...
  payload          JSONB,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ingested_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.prism_bronze_action_log IS
  'Raw advisor action events. Append-only. Target: Unity Catalog BRONZE.';

CREATE INDEX prism_bronze_action_log_advisor_idx ON public.prism_bronze_action_log(advisor_id);
CREATE INDEX prism_bronze_action_log_household_idx ON public.prism_bronze_action_log(household_id);
CREATE INDEX prism_bronze_action_log_opportunity_idx ON public.prism_bronze_action_log(opportunity_id);
CREATE INDEX prism_bronze_action_log_occurred_idx ON public.prism_bronze_action_log(occurred_at DESC);

-- LLM log. Production target: Unity Catalog BRONZE.
CREATE TABLE public.prism_bronze_llm_log (
  llm_log_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id       TEXT,
  advisor_id       UUID,
  household_id     UUID,
  opportunity_id   UUID,
  surface          TEXT,                                    -- 'chat' | 'opportunity_gen' | 'summary' ...
  provider         TEXT NOT NULL DEFAULT 'anthropic',
  model            TEXT,
  prompt_name      TEXT,
  prompt_version   TEXT,
  system_prompt    TEXT,
  user_input       JSONB,
  response         JSONB,
  tool_calls       JSONB,
  latency_ms       INTEGER,
  input_tokens     INTEGER,
  output_tokens    INTEGER,
  cost_usd         NUMERIC(10,6),
  status           TEXT,                                    -- 'ok' | 'error' | 'blocked'
  error_message    TEXT,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ingested_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.prism_bronze_llm_log IS
  'Raw LLM call logs (prompt, response, usage, cost). Append-only. Target: Unity Catalog BRONZE.';

CREATE INDEX prism_bronze_llm_log_advisor_idx ON public.prism_bronze_llm_log(advisor_id);
CREATE INDEX prism_bronze_llm_log_household_idx ON public.prism_bronze_llm_log(household_id);
CREATE INDEX prism_bronze_llm_log_surface_idx ON public.prism_bronze_llm_log(surface);
CREATE INDEX prism_bronze_llm_log_occurred_idx ON public.prism_bronze_llm_log(occurred_at DESC);

-- Outcomes. Production target: Unity Catalog BRONZE.
CREATE TABLE public.prism_bronze_outcome (
  outcome_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id   UUID,                                    -- soft FK
  action_log_id    UUID,                                    -- soft FK
  household_id     UUID,
  advisor_id       UUID,
  outcome_type     TEXT NOT NULL,                           -- 'meeting_booked' | 'product_sold' | 'aum_change' ...
  outcome_value    NUMERIC(18,2),
  outcome_currency TEXT DEFAULT 'USD',
  attribution      JSONB,
  details          JSONB,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ingested_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.prism_bronze_outcome IS
  'Raw outcome events tied to opportunities/actions for attribution and ROI. Target: Unity Catalog BRONZE.';

CREATE INDEX prism_bronze_outcome_opportunity_idx ON public.prism_bronze_outcome(opportunity_id);
CREATE INDEX prism_bronze_outcome_household_idx ON public.prism_bronze_outcome(household_id);
CREATE INDEX prism_bronze_outcome_advisor_idx ON public.prism_bronze_outcome(advisor_id);
CREATE INDEX prism_bronze_outcome_occurred_idx ON public.prism_bronze_outcome(occurred_at DESC);

-- ============================ RLS ============================
-- Enable RLS on every table. No policies yet — locked down by default.
-- Auth + role-based policies come in a later step once we wire advisors -> auth.users.

ALTER TABLE public.prism_silver_rule_definition  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prism_silver_theme            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prism_silver_persona          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prism_silver_content          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prism_silver_content_chunk    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prism_silver_eval_run         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prism_silver_guardrail_event  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.prism_gold_advisor            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prism_gold_household          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prism_gold_client_360         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prism_gold_opportunity        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prism_gold_book_health        ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.prism_bronze_action_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prism_bronze_llm_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prism_bronze_outcome          ENABLE ROW LEVEL SECURITY;
