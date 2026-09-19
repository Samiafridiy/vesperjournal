-- Calendar event metadata for freshness / revisions
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'forexfactory',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS previous_revised boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS previous_original text,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS calendar_events_date_idx ON public.calendar_events (event_date);

-- Trader's own research thesis (private)
CREATE TABLE IF NOT EXISTS public.market_thesis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.market_thesis TO authenticated;
GRANT ALL ON public.market_thesis TO service_role;

ALTER TABLE public.market_thesis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own thesis" ON public.market_thesis;
CREATE POLICY "Users manage own thesis"
  ON public.market_thesis
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS market_thesis_user_idx ON public.market_thesis (user_id, updated_at DESC);