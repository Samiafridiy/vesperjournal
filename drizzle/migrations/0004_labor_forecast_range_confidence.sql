ALTER TABLE public.labor_forecasts
  ADD COLUMN IF NOT EXISTS range_low numeric,
  ADD COLUMN IF NOT EXISTS range_high numeric,
  ADD COLUMN IF NOT EXISTS confidence text;

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
     OR NEW.range_low IS DISTINCT FROM OLD.range_low
     OR NEW.range_high IS DISTINCT FROM OLD.range_high
     OR NEW.confidence IS DISTINCT FROM OLD.confidence
     OR NEW.target_period IS DISTINCT FROM OLD.target_period
     OR NEW.locked_at IS DISTINCT FROM OLD.locked_at
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Forecast is locked and cannot be changed';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END $$;