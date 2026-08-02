CREATE TABLE public.calendar_event_analysis (
  event_key text PRIMARY KEY,
  title text NOT NULL,
  country text NOT NULL,
  event_date timestamptz NOT NULL,
  impact text NOT NULL DEFAULT 'LOW',
  forecast text NOT NULL DEFAULT '',
  previous text NOT NULL DEFAULT '',
  actual text NOT NULL DEFAULT '',
  short_term text NOT NULL DEFAULT '',
  long_term text NOT NULL DEFAULT '',
  above text NOT NULL DEFAULT '',
  on_forecast text NOT NULL DEFAULT '',
  below text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.calendar_event_analysis TO authenticated;
GRANT SELECT ON public.calendar_event_analysis TO anon;
GRANT ALL ON public.calendar_event_analysis TO service_role;

ALTER TABLE public.calendar_event_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read calendar analysis"
ON public.calendar_event_analysis
FOR SELECT
USING (true);

CREATE INDEX idx_calendar_event_analysis_date ON public.calendar_event_analysis (event_date);

CREATE TRIGGER calendar_event_analysis_updated_at
BEFORE UPDATE ON public.calendar_event_analysis
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();