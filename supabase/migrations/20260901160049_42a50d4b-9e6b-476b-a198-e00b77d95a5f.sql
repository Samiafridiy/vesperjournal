CREATE TABLE public.calendar_events (
  event_key text PRIMARY KEY,
  title text NOT NULL,
  country text NOT NULL DEFAULT '',
  event_date timestamptz NOT NULL,
  impact text NOT NULL DEFAULT 'LOW',
  forecast text NOT NULL DEFAULT '',
  previous text NOT NULL DEFAULT '',
  actual text NOT NULL DEFAULT '',
  released_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.calendar_events TO anon;
GRANT SELECT ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read calendar events" ON public.calendar_events FOR SELECT USING (true);
CREATE INDEX calendar_events_date_idx ON public.calendar_events (event_date);

CREATE TABLE public.calendar_sync_state (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_checked_at timestamptz,
  last_changed_at timestamptz,
  last_status text NOT NULL DEFAULT 'ok',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.calendar_sync_state TO anon;
GRANT SELECT ON public.calendar_sync_state TO authenticated;
GRANT ALL ON public.calendar_sync_state TO service_role;
ALTER TABLE public.calendar_sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read calendar sync state" ON public.calendar_sync_state FOR SELECT USING (true);
INSERT INTO public.calendar_sync_state (id) VALUES (1);

ALTER TABLE public.calendar_events REPLICA IDENTITY FULL;
ALTER TABLE public.calendar_sync_state REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_sync_state;