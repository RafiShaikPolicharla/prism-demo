// Runtime config flags. When DEMO_MODE is true, services read from
// src/data/demoData.ts and the bundled CSV. When false, they read from
// the Supabase prism_gold_* / prism_silver_* tables via @/integrations/supabase/client.
//
// Single switch — every service in this folder respects it.

export const DEMO_MODE = true;
