CREATE TABLE public.labor_observations (
  series_id text NOT NULL,
  period text NOT NULL,
  value numeric NOT NULL,
  initial_value numeric NOT NULL,
  revisions jsonb NOT NULL DEFAULT '[]'::jsonb,
  preliminary boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'BLS',
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (series_id, period)
);
GRANT SELECT ON public.labor_observations TO authenticated;
GRANT ALL ON public.labor_observations TO service_role;
ALTER TABLE public.labor_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read labor data" ON public.labor_observations FOR SELECT TO authenticated USING (true);

CREATE TABLE public.labor_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_period text NOT NULL,
  expected_nfp numeric,
  expected_unemployment numeric,
  expected_ahe_mom numeric,
  expected_ahe_yoy numeric,
  expected_reaction text NOT NULL DEFAULT '',
  main_scenario text NOT NULL DEFAULT 'neutral',
  reasoning text NOT NULL DEFAULT '',
  market_reaction text NOT NULL DEFAULT '',
  lesson text NOT NULL DEFAULT '',
  locked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_period)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.labor_forecasts TO authenticated;
GRANT ALL ON public.labor_forecasts TO service_role;
ALTER TABLE public.labor_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own forecasts" ON public.labor_forecasts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own forecasts" ON public.labor_forecasts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own forecasts" ON public.labor_forecasts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own forecasts" ON public.labor_forecasts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.lock_labor_forecast()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.expected_nfp IS DISTINCT FROM OLD.expected_nfp
     OR NEW.expected_unemployment IS DISTINCT FROM OLD.expected_unemployment
     OR NEW.expected_ahe_mom IS DISTINCT FROM OLD.expected_ahe_mom
     OR NEW.expected_ahe_yoy IS DISTINCT FROM OLD.expected_ahe_yoy
     OR NEW.expected_reaction IS DISTINCT FROM OLD.expected_reaction
     OR NEW.main_scenario IS DISTINCT FROM OLD.main_scenario
     OR NEW.reasoning IS DISTINCT FROM OLD.reasoning
     OR NEW.target_period IS DISTINCT FROM OLD.target_period
     OR NEW.locked_at IS DISTINCT FROM OLD.locked_at
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Forecast is locked and cannot be changed';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_lock_labor_forecast BEFORE UPDATE ON public.labor_forecasts FOR EACH ROW EXECUTE FUNCTION public.lock_labor_forecast();