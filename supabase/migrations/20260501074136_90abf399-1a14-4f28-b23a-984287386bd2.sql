ALTER TABLE public.risk_presets
  ADD COLUMN IF NOT EXISTS funded_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS profit_target numeric,
  ADD COLUMN IF NOT EXISTS max_drawdown_amount numeric,
  ADD COLUMN IF NOT EXISTS daily_loss_limit numeric,
  ADD COLUMN IF NOT EXISTS min_trading_days integer,
  ADD COLUMN IF NOT EXISTS challenge_deadline date,
  ADD COLUMN IF NOT EXISTS starting_balance numeric;

ALTER TABLE public.risk_presets
  DROP CONSTRAINT IF EXISTS risk_presets_account_type_check;

ALTER TABLE public.risk_presets
  ADD CONSTRAINT risk_presets_account_type_check
  CHECK (account_type IN ('personal', 'challenge_p1', 'challenge_p2', 'funded_live'));