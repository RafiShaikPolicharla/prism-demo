export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      prism_bronze_action_log: {
        Row: {
          action_log_id: string
          action_type: string
          advisor_id: string | null
          household_id: string | null
          ingested_at: string
          occurred_at: string
          opportunity_id: string | null
          payload: Json | null
          surface: string | null
        }
        Insert: {
          action_log_id?: string
          action_type: string
          advisor_id?: string | null
          household_id?: string | null
          ingested_at?: string
          occurred_at?: string
          opportunity_id?: string | null
          payload?: Json | null
          surface?: string | null
        }
        Update: {
          action_log_id?: string
          action_type?: string
          advisor_id?: string | null
          household_id?: string | null
          ingested_at?: string
          occurred_at?: string
          opportunity_id?: string | null
          payload?: Json | null
          surface?: string | null
        }
        Relationships: []
      }
      prism_bronze_llm_log: {
        Row: {
          advisor_id: string | null
          cost_usd: number | null
          error_message: string | null
          household_id: string | null
          ingested_at: string
          input_tokens: number | null
          latency_ms: number | null
          llm_log_id: string
          model: string | null
          occurred_at: string
          opportunity_id: string | null
          output_tokens: number | null
          prompt_name: string | null
          prompt_version: string | null
          provider: string
          request_id: string | null
          response: Json | null
          status: string | null
          surface: string | null
          system_prompt: string | null
          tool_calls: Json | null
          user_input: Json | null
        }
        Insert: {
          advisor_id?: string | null
          cost_usd?: number | null
          error_message?: string | null
          household_id?: string | null
          ingested_at?: string
          input_tokens?: number | null
          latency_ms?: number | null
          llm_log_id?: string
          model?: string | null
          occurred_at?: string
          opportunity_id?: string | null
          output_tokens?: number | null
          prompt_name?: string | null
          prompt_version?: string | null
          provider?: string
          request_id?: string | null
          response?: Json | null
          status?: string | null
          surface?: string | null
          system_prompt?: string | null
          tool_calls?: Json | null
          user_input?: Json | null
        }
        Update: {
          advisor_id?: string | null
          cost_usd?: number | null
          error_message?: string | null
          household_id?: string | null
          ingested_at?: string
          input_tokens?: number | null
          latency_ms?: number | null
          llm_log_id?: string
          model?: string | null
          occurred_at?: string
          opportunity_id?: string | null
          output_tokens?: number | null
          prompt_name?: string | null
          prompt_version?: string | null
          provider?: string
          request_id?: string | null
          response?: Json | null
          status?: string | null
          surface?: string | null
          system_prompt?: string | null
          tool_calls?: Json | null
          user_input?: Json | null
        }
        Relationships: []
      }
      prism_bronze_outcome: {
        Row: {
          action_log_id: string | null
          advisor_id: string | null
          attribution: Json | null
          details: Json | null
          household_id: string | null
          ingested_at: string
          occurred_at: string
          opportunity_id: string | null
          outcome_currency: string | null
          outcome_id: string
          outcome_type: string
          outcome_value: number | null
        }
        Insert: {
          action_log_id?: string | null
          advisor_id?: string | null
          attribution?: Json | null
          details?: Json | null
          household_id?: string | null
          ingested_at?: string
          occurred_at?: string
          opportunity_id?: string | null
          outcome_currency?: string | null
          outcome_id?: string
          outcome_type: string
          outcome_value?: number | null
        }
        Update: {
          action_log_id?: string | null
          advisor_id?: string | null
          attribution?: Json | null
          details?: Json | null
          household_id?: string | null
          ingested_at?: string
          occurred_at?: string
          opportunity_id?: string | null
          outcome_currency?: string | null
          outcome_id?: string
          outcome_type?: string
          outcome_value?: number | null
        }
        Relationships: []
      }
      prism_gold_advisor: {
        Row: {
          advisor_id: string
          created_at: string
          email: string | null
          external_ref: string | null
          full_name: string
          hired_on: string | null
          is_active: boolean
          metadata: Json | null
          region: string | null
          role: string | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          advisor_id?: string
          created_at?: string
          email?: string | null
          external_ref?: string | null
          full_name: string
          hired_on?: string | null
          is_active?: boolean
          metadata?: Json | null
          region?: string | null
          role?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          created_at?: string
          email?: string | null
          external_ref?: string | null
          full_name?: string
          hired_on?: string | null
          is_active?: boolean
          metadata?: Json | null
          region?: string | null
          role?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      prism_gold_book_health: {
        Row: {
          active_opportunities: number | null
          advisor_id: string
          as_of_on: string
          book_health_id: string
          coverage_score: number | null
          created_at: string
          engagement_score: number | null
          households_count: number | null
          metrics: Json | null
          overdue_opportunities: number | null
          risk_score: number | null
        }
        Insert: {
          active_opportunities?: number | null
          advisor_id: string
          as_of_on: string
          book_health_id?: string
          coverage_score?: number | null
          created_at?: string
          engagement_score?: number | null
          households_count?: number | null
          metrics?: Json | null
          overdue_opportunities?: number | null
          risk_score?: number | null
        }
        Update: {
          active_opportunities?: number | null
          advisor_id?: string
          as_of_on?: string
          book_health_id?: string
          coverage_score?: number | null
          created_at?: string
          engagement_score?: number | null
          households_count?: number | null
          metrics?: Json | null
          overdue_opportunities?: number | null
          risk_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prism_gold_book_health_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "prism_gold_advisor"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      prism_gold_client_360: {
        Row: {
          advisor_id: string | null
          allocation_drift_pct: number | null
          alternatives_pct: number | null
          annual_income_usd: number | null
          aum_usd: number | null
          beneficiaries_current_on: string | null
          cash_pct: number | null
          client_360_id: string
          concentrated_position_pct: number | null
          created_at: string
          data_quality: Json | null
          equity_pct: number | null
          estate_plan_updated_on: string | null
          fixed_income_pct: number | null
          goals: Json | null
          has_disability_insurance: boolean | null
          has_estate_plan: boolean | null
          has_life_insurance: boolean | null
          has_ltc_insurance: boolean | null
          has_trust: boolean | null
          has_will: boolean | null
          held_away_assets_usd: number | null
          holds_accumulation_annuity: boolean | null
          holds_brokerage: boolean | null
          holds_concentrated_position: boolean | null
          holds_education_savings: boolean | null
          holds_income_annuity: boolean | null
          holds_managed_account: boolean | null
          household_id: string
          household_size: number | null
          idle_cash_pct: number | null
          idle_cash_usd: number | null
          individual_id: string | null
          investable_assets_usd: number | null
          is_current: boolean
          last_contact_on: string | null
          last_meeting_on: string | null
          life_coverage_usd: number | null
          life_stage: Database["public"]["Enums"]["prism_life_stage"] | null
          meetings_ttm_count: number | null
          net_worth_usd: number | null
          next_meeting_on: string | null
          opportunity_count_acted_90d: number | null
          opportunity_count_dismissed_90d: number | null
          opportunity_count_open: number | null
          primary_state: string | null
          retention_risk_score: number | null
          retention_risk_tier:
            | Database["public"]["Enums"]["prism_retention_risk_tier"]
            | null
          retirement_target_on: string | null
          risk_tolerance_score: number | null
          segment: Database["public"]["Enums"]["prism_segment"] | null
          sentiment_last_meeting:
            | Database["public"]["Enums"]["prism_sentiment"]
            | null
          snapshot_at: string
          tenure_years: number | null
          total_assets_usd: number | null
          total_liabilities_usd: number | null
        }
        Insert: {
          advisor_id?: string | null
          allocation_drift_pct?: number | null
          alternatives_pct?: number | null
          annual_income_usd?: number | null
          aum_usd?: number | null
          beneficiaries_current_on?: string | null
          cash_pct?: number | null
          client_360_id?: string
          concentrated_position_pct?: number | null
          created_at?: string
          data_quality?: Json | null
          equity_pct?: number | null
          estate_plan_updated_on?: string | null
          fixed_income_pct?: number | null
          goals?: Json | null
          has_disability_insurance?: boolean | null
          has_estate_plan?: boolean | null
          has_life_insurance?: boolean | null
          has_ltc_insurance?: boolean | null
          has_trust?: boolean | null
          has_will?: boolean | null
          held_away_assets_usd?: number | null
          holds_accumulation_annuity?: boolean | null
          holds_brokerage?: boolean | null
          holds_concentrated_position?: boolean | null
          holds_education_savings?: boolean | null
          holds_income_annuity?: boolean | null
          holds_managed_account?: boolean | null
          household_id: string
          household_size?: number | null
          idle_cash_pct?: number | null
          idle_cash_usd?: number | null
          individual_id?: string | null
          investable_assets_usd?: number | null
          is_current?: boolean
          last_contact_on?: string | null
          last_meeting_on?: string | null
          life_coverage_usd?: number | null
          life_stage?: Database["public"]["Enums"]["prism_life_stage"] | null
          meetings_ttm_count?: number | null
          net_worth_usd?: number | null
          next_meeting_on?: string | null
          opportunity_count_acted_90d?: number | null
          opportunity_count_dismissed_90d?: number | null
          opportunity_count_open?: number | null
          primary_state?: string | null
          retention_risk_score?: number | null
          retention_risk_tier?:
            | Database["public"]["Enums"]["prism_retention_risk_tier"]
            | null
          retirement_target_on?: string | null
          risk_tolerance_score?: number | null
          segment?: Database["public"]["Enums"]["prism_segment"] | null
          sentiment_last_meeting?:
            | Database["public"]["Enums"]["prism_sentiment"]
            | null
          snapshot_at?: string
          tenure_years?: number | null
          total_assets_usd?: number | null
          total_liabilities_usd?: number | null
        }
        Update: {
          advisor_id?: string | null
          allocation_drift_pct?: number | null
          alternatives_pct?: number | null
          annual_income_usd?: number | null
          aum_usd?: number | null
          beneficiaries_current_on?: string | null
          cash_pct?: number | null
          client_360_id?: string
          concentrated_position_pct?: number | null
          created_at?: string
          data_quality?: Json | null
          equity_pct?: number | null
          estate_plan_updated_on?: string | null
          fixed_income_pct?: number | null
          goals?: Json | null
          has_disability_insurance?: boolean | null
          has_estate_plan?: boolean | null
          has_life_insurance?: boolean | null
          has_ltc_insurance?: boolean | null
          has_trust?: boolean | null
          has_will?: boolean | null
          held_away_assets_usd?: number | null
          holds_accumulation_annuity?: boolean | null
          holds_brokerage?: boolean | null
          holds_concentrated_position?: boolean | null
          holds_education_savings?: boolean | null
          holds_income_annuity?: boolean | null
          holds_managed_account?: boolean | null
          household_id?: string
          household_size?: number | null
          idle_cash_pct?: number | null
          idle_cash_usd?: number | null
          individual_id?: string | null
          investable_assets_usd?: number | null
          is_current?: boolean
          last_contact_on?: string | null
          last_meeting_on?: string | null
          life_coverage_usd?: number | null
          life_stage?: Database["public"]["Enums"]["prism_life_stage"] | null
          meetings_ttm_count?: number | null
          net_worth_usd?: number | null
          next_meeting_on?: string | null
          opportunity_count_acted_90d?: number | null
          opportunity_count_dismissed_90d?: number | null
          opportunity_count_open?: number | null
          primary_state?: string | null
          retention_risk_score?: number | null
          retention_risk_tier?:
            | Database["public"]["Enums"]["prism_retention_risk_tier"]
            | null
          retirement_target_on?: string | null
          risk_tolerance_score?: number | null
          segment?: Database["public"]["Enums"]["prism_segment"] | null
          sentiment_last_meeting?:
            | Database["public"]["Enums"]["prism_sentiment"]
            | null
          snapshot_at?: string
          tenure_years?: number | null
          total_assets_usd?: number | null
          total_liabilities_usd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prism_gold_client_360_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "prism_gold_advisor"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "prism_gold_client_360_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "prism_gold_household"
            referencedColumns: ["household_id"]
          },
        ]
      }
      prism_gold_household: {
        Row: {
          created_at: string
          display_name: string
          external_ref: string | null
          household_id: string
          household_size: number | null
          is_active: boolean
          metadata: Json | null
          onboarded_on: string | null
          persona_id: string | null
          primary_advisor_id: string | null
          segment: string | null
          total_aum: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          external_ref?: string | null
          household_id?: string
          household_size?: number | null
          is_active?: boolean
          metadata?: Json | null
          onboarded_on?: string | null
          persona_id?: string | null
          primary_advisor_id?: string | null
          segment?: string | null
          total_aum?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          external_ref?: string | null
          household_id?: string
          household_size?: number | null
          is_active?: boolean
          metadata?: Json | null
          onboarded_on?: string | null
          persona_id?: string | null
          primary_advisor_id?: string | null
          segment?: string | null
          total_aum?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prism_gold_household_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "prism_silver_persona"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "prism_gold_household_primary_advisor_id_fkey"
            columns: ["primary_advisor_id"]
            isOneToOne: false
            referencedRelation: "prism_gold_advisor"
            referencedColumns: ["advisor_id"]
          },
        ]
      }
      prism_gold_opportunity: {
        Row: {
          advisor_id: string | null
          created_at: string
          due_on: string | null
          estimated_value: number | null
          evidence: Json | null
          household_id: string
          metadata: Json | null
          opportunity_id: string
          priority_score: number | null
          rationale: string | null
          recommended_action: Json | null
          resolution_note: string | null
          resolved_at: string | null
          rule_id: string | null
          status: string
          surfaced_at: string
          theme_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          advisor_id?: string | null
          created_at?: string
          due_on?: string | null
          estimated_value?: number | null
          evidence?: Json | null
          household_id: string
          metadata?: Json | null
          opportunity_id?: string
          priority_score?: number | null
          rationale?: string | null
          recommended_action?: Json | null
          resolution_note?: string | null
          resolved_at?: string | null
          rule_id?: string | null
          status?: string
          surfaced_at?: string
          theme_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          advisor_id?: string | null
          created_at?: string
          due_on?: string | null
          estimated_value?: number | null
          evidence?: Json | null
          household_id?: string
          metadata?: Json | null
          opportunity_id?: string
          priority_score?: number | null
          rationale?: string | null
          recommended_action?: Json | null
          resolution_note?: string | null
          resolved_at?: string | null
          rule_id?: string | null
          status?: string
          surfaced_at?: string
          theme_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prism_gold_opportunity_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "prism_gold_advisor"
            referencedColumns: ["advisor_id"]
          },
          {
            foreignKeyName: "prism_gold_opportunity_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "prism_gold_household"
            referencedColumns: ["household_id"]
          },
          {
            foreignKeyName: "prism_gold_opportunity_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "prism_silver_rule_definition"
            referencedColumns: ["rule_id"]
          },
          {
            foreignKeyName: "prism_gold_opportunity_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "prism_silver_theme"
            referencedColumns: ["theme_id"]
          },
        ]
      }
      prism_silver_content: {
        Row: {
          body: string | null
          content_id: string
          content_type: string | null
          created_at: string
          expires_on: string | null
          is_active: boolean
          language: string
          metadata: Json | null
          persona_ids: string[] | null
          published_on: string | null
          source: string | null
          source_url: string | null
          summary: string | null
          theme_id: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          body?: string | null
          content_id?: string
          content_type?: string | null
          created_at?: string
          expires_on?: string | null
          is_active?: boolean
          language?: string
          metadata?: Json | null
          persona_ids?: string[] | null
          published_on?: string | null
          source?: string | null
          source_url?: string | null
          summary?: string | null
          theme_id?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          body?: string | null
          content_id?: string
          content_type?: string | null
          created_at?: string
          expires_on?: string | null
          is_active?: boolean
          language?: string
          metadata?: Json | null
          persona_ids?: string[] | null
          published_on?: string | null
          source?: string | null
          source_url?: string | null
          summary?: string | null
          theme_id?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "prism_silver_content_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "prism_silver_theme"
            referencedColumns: ["theme_id"]
          },
        ]
      }
      prism_silver_content_chunk: {
        Row: {
          chunk_id: string
          chunk_index: number
          content_id: string
          created_at: string
          embedding: Json | null
          metadata: Json | null
          text: string
          token_count: number | null
        }
        Insert: {
          chunk_id?: string
          chunk_index: number
          content_id: string
          created_at?: string
          embedding?: Json | null
          metadata?: Json | null
          text: string
          token_count?: number | null
        }
        Update: {
          chunk_id?: string
          chunk_index?: number
          content_id?: string
          created_at?: string
          embedding?: Json | null
          metadata?: Json | null
          text?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prism_silver_content_chunk_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "prism_silver_content"
            referencedColumns: ["content_id"]
          },
        ]
      }
      prism_silver_eval_run: {
        Row: {
          completed_at: string | null
          created_at: string
          dataset_ref: string | null
          eval_run_id: string
          metrics: Json | null
          notes: string | null
          run_name: string
          started_at: string | null
          status: string
          target_kind: string
          target_ref: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          dataset_ref?: string | null
          eval_run_id?: string
          metrics?: Json | null
          notes?: string | null
          run_name: string
          started_at?: string | null
          status?: string
          target_kind: string
          target_ref?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          dataset_ref?: string | null
          eval_run_id?: string
          metrics?: Json | null
          notes?: string | null
          run_name?: string
          started_at?: string | null
          status?: string
          target_kind?: string
          target_ref?: string | null
        }
        Relationships: []
      }
      prism_silver_guardrail_event: {
        Row: {
          advisor_id: string | null
          created_at: string
          details: Json | null
          event_type: string
          guardrail_event_id: string
          household_id: string | null
          llm_log_id: string | null
          occurred_at: string
          severity: string
          source: string | null
        }
        Insert: {
          advisor_id?: string | null
          created_at?: string
          details?: Json | null
          event_type: string
          guardrail_event_id?: string
          household_id?: string | null
          llm_log_id?: string | null
          occurred_at?: string
          severity: string
          source?: string | null
        }
        Update: {
          advisor_id?: string | null
          created_at?: string
          details?: Json | null
          event_type?: string
          guardrail_event_id?: string
          household_id?: string | null
          llm_log_id?: string | null
          occurred_at?: string
          severity?: string
          source?: string | null
        }
        Relationships: []
      }
      prism_silver_persona: {
        Row: {
          attributes: Json | null
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          name: string
          persona_id: string
          updated_at: string
        }
        Insert: {
          attributes?: Json | null
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          name: string
          persona_id?: string
          updated_at?: string
        }
        Update: {
          attributes?: Json | null
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          name?: string
          persona_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      prism_silver_rule_definition: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          effective_from_on: string | null
          effective_to_on: string | null
          is_active: boolean
          logic_expression: Json | null
          name: string
          output_schema: Json | null
          owner: string | null
          required_inputs: Json | null
          rule_id: string
          severity: string | null
          tags: string[] | null
          theme_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          effective_from_on?: string | null
          effective_to_on?: string | null
          is_active?: boolean
          logic_expression?: Json | null
          name: string
          output_schema?: Json | null
          owner?: string | null
          required_inputs?: Json | null
          rule_id: string
          severity?: string | null
          tags?: string[] | null
          theme_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          effective_from_on?: string | null
          effective_to_on?: string | null
          is_active?: boolean
          logic_expression?: Json | null
          name?: string
          output_schema?: Json | null
          owner?: string | null
          required_inputs?: Json | null
          rule_id?: string
          severity?: string | null
          tags?: string[] | null
          theme_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "prism_silver_rule_definition_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "prism_silver_theme"
            referencedColumns: ["theme_id"]
          },
        ]
      }
      prism_silver_theme: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          is_active: boolean
          name: string
          parent_theme_id: string | null
          theme_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          is_active?: boolean
          name: string
          parent_theme_id?: string | null
          theme_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          is_active?: boolean
          name?: string
          parent_theme_id?: string | null
          theme_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prism_silver_theme_parent_theme_id_fkey"
            columns: ["parent_theme_id"]
            isOneToOne: false
            referencedRelation: "prism_silver_theme"
            referencedColumns: ["theme_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      prism_advisor_persona: "senior" | "junior" | "acquired"
      prism_life_stage:
        | "accumulator"
        | "pre_retiree"
        | "retiree"
        | "wealth_transfer"
        | "early_career"
      prism_retention_risk_tier: "low" | "medium" | "high" | "critical"
      prism_segment:
        | "mass_affluent"
        | "affluent"
        | "high_net_worth"
        | "ultra_high_net_worth"
      prism_sentiment: "positive" | "neutral" | "negative" | "mixed" | "unknown"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      prism_advisor_persona: ["senior", "junior", "acquired"],
      prism_life_stage: [
        "accumulator",
        "pre_retiree",
        "retiree",
        "wealth_transfer",
        "early_career",
      ],
      prism_retention_risk_tier: ["low", "medium", "high", "critical"],
      prism_segment: [
        "mass_affluent",
        "affluent",
        "high_net_worth",
        "ultra_high_net_worth",
      ],
      prism_sentiment: ["positive", "neutral", "negative", "mixed", "unknown"],
    },
  },
} as const
