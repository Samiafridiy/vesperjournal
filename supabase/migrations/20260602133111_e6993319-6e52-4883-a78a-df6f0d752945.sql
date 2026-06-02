ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS followed_plan boolean,
  ADD COLUMN IF NOT EXISTS confidence integer,
  ADD COLUMN IF NOT EXISTS behavior_flags text[] NOT NULL DEFAULT '{}'::text[];