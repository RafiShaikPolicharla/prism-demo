-- ============================ ENUMS ============================
CREATE TYPE prism_life_stage          AS ENUM ('accumulator','pre_retiree','retiree','wealth_transfer','early_career');
CREATE TYPE prism_segment             AS ENUM ('mass_affluent','affluent','high_net_worth','ultra_high_net_worth');
CREATE TYPE prism_retention_risk_tier AS ENUM ('low','medium','high','critical');
CREATE TYPE prism_sentiment           AS ENUM ('positive','neutral','negative','mixed','unknown');
CREATE TYPE prism_advisor_persona     AS ENUM ('senior','junior','acquired');
-- prism_advisor_persona will be attached to prism_gold_advisor in a later migration.

-- ============================ DROP + RECREATE ============================
DROP TABLE IF EXISTS public.prism_gold_client_360 CASCADE;

CREATE TABLE public.prism_gold_client_360 (
  -- snapshot meta
  client_360_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id               UUID NOT NULL REFERENCES public.prism_gold_household(household_id) ON DELETE CASCADE,
  individual_id              UUID,
  snapshot_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_current                 BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- identity & book
  advisor_id                 UUID REFERENCES public.prism_gold_advisor(advisor_id),
  segment                    prism_segment,
  life_stage                 prism_life_stage,
  household_size             INTEGER,
  primary_state              TEXT,
  tenure_years               NUMERIC(5,2),

  -- financial summary
  total_assets_usd           NUMERIC(18,2),
  total_liabilities_usd      NUMERIC(18,2),
  net_worth_usd              NUMERIC(18,2),
  investable_assets_usd      NUMERIC(18,2),
  aum_usd                    NUMERIC(18,2),
  held_away_assets_usd       NUMERIC(18,2),
  idle_cash_usd              NUMERIC(18,2),
  idle_cash_pct              NUMERIC(5,2),
  annual_income_usd          NUMERIC(18,2),

  -- asset mix
  equity_pct                 NUMERIC(5,2),
  fixed_income_pct           NUMERIC(5,2),
  cash_pct                   NUMERIC(5,2),
  alternatives_pct           NUMERIC(5,2),
  concentrated_position_pct  NUMERIC(5,2),
  holds_concentrated_position BOOLEAN,
  allocation_drift_pct       NUMERIC(5,2),

  -- insurance & protection
  has_life_insurance         BOOLEAN,
  has_disability_insurance   BOOLEAN,
  has_ltc_insurance          BOOLEAN,
  life_coverage_usd          NUMERIC(18,2),
  beneficiaries_current_on   DATE,

  -- product holdings
  holds_managed_account      BOOLEAN,
  holds_income_annuity       BOOLEAN,
  holds_accumulation_annuity BOOLEAN,
  holds_brokerage            BOOLEAN,
  holds_education_savings    BOOLEAN,

  -- planning state
  has_estate_plan            BOOLEAN,
  estate_plan_updated_on     DATE,
  has_will                   BOOLEAN,
  has_trust                  BOOLEAN,
  retirement_target_on       DATE,

  -- engagement
  last_meeting_on            DATE,
  next_meeting_on            DATE,
  last_contact_on            DATE,
  meetings_ttm_count         INTEGER,
  sentiment_last_meeting     prism_sentiment,

  -- risk
  retention_risk_tier        prism_retention_risk_tier,
  retention_risk_score       NUMERIC(5,2),
  risk_tolerance_score       NUMERIC(5,2),

  -- opportunity rollups
  opportunity_count_open           INTEGER,
  opportunity_count_acted_90d      INTEGER,
  opportunity_count_dismissed_90d  INTEGER,

  -- variable-shape escape hatches
  goals                      JSONB,
  data_quality               JSONB
);

COMMENT ON TABLE public.prism_gold_client_360 IS
  'Unified household/individual snapshot for rules and LLM grounding. Target: Unity Catalog GOLD.
   Snapshot pattern: insert new row + flip is_current; never update typed columns in place.
   advisor_id is DENORMALIZED from prism_gold_household.primary_advisor_id at snapshot time
   to enable single-table Today-view queries on (advisor_id, is_current). Tradeoff: if a
   household is reassigned to a new advisor, existing is_current snapshots will show the prior
   advisor until the next snapshot is written. Reconciliation is the snapshot writer''s
   responsibility.';

-- ============================ INDEXES ============================
CREATE INDEX prism_gold_client_360_household_idx       ON public.prism_gold_client_360(household_id);
CREATE INDEX prism_gold_client_360_current_idx         ON public.prism_gold_client_360(household_id) WHERE is_current;
CREATE INDEX prism_gold_client_360_snapshot_idx        ON public.prism_gold_client_360(snapshot_at DESC);
CREATE INDEX prism_gold_client_360_advisor_current_idx ON public.prism_gold_client_360(advisor_id, is_current);
CREATE INDEX prism_gold_client_360_advisor_risk_idx    ON public.prism_gold_client_360(advisor_id, retention_risk_tier) WHERE is_current;
CREATE INDEX prism_gold_client_360_idle_cash_idx       ON public.prism_gold_client_360(idle_cash_usd DESC) WHERE is_current;
CREATE INDEX prism_gold_client_360_last_meeting_idx    ON public.prism_gold_client_360(last_meeting_on) WHERE is_current;
CREATE INDEX prism_gold_client_360_risk_tier_idx       ON public.prism_gold_client_360(retention_risk_tier) WHERE is_current;
CREATE INDEX prism_gold_client_360_life_stage_idx      ON public.prism_gold_client_360(life_stage) WHERE is_current;
CREATE INDEX prism_gold_client_360_total_assets_idx    ON public.prism_gold_client_360(total_assets_usd DESC) WHERE is_current;

ALTER TABLE public.prism_gold_client_360 ENABLE ROW LEVEL SECURITY;