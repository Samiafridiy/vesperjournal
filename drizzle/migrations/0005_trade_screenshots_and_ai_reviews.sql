CREATE TABLE public.trade_screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  path text NOT NULL,
  timeframe text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  position smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX trade_screenshots_trade_idx ON public.trade_screenshots(trade_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trade_screenshots TO authenticated;
GRANT ALL ON public.trade_screenshots TO service_role;
ALTER TABLE public.trade_screenshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own screenshots" ON public.trade_screenshots FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own screenshots" ON public.trade_screenshots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.trades t WHERE t.id = trade_id AND t.user_id = auth.uid()));
CREATE POLICY "Users update own screenshots" ON public.trade_screenshots FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own screenshots" ON public.trade_screenshots FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.trade_ai_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  input_hash text NOT NULL,
  review jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX trade_ai_reviews_trade_idx ON public.trade_ai_reviews(trade_id, created_at DESC);
CREATE INDEX trade_ai_reviews_user_day_idx ON public.trade_ai_reviews(user_id, created_at);
GRANT SELECT, INSERT ON public.trade_ai_reviews TO authenticated;
GRANT ALL ON public.trade_ai_reviews TO service_role;
ALTER TABLE public.trade_ai_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own reviews" ON public.trade_ai_reviews FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own reviews" ON public.trade_ai_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.trades t WHERE t.id = trade_id AND t.user_id = auth.uid()));