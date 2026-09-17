CREATE TABLE public.coach_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  pattern_key text not null,
  pattern_label text not null,
  first_flagged_at timestamptz not null default now(),
  last_updated_at timestamptz not null default now(),
  last_shown_at timestamptz,
  times_shown integer not null default 0,
  first_occurrences integer not null default 0,
  last_occurrences integer not null default 0,
  first_impact numeric not null default 0,
  last_impact numeric not null default 0,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, pattern_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_memory TO authenticated;
GRANT ALL ON public.coach_memory TO service_role;

ALTER TABLE public.coach_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own coach memory" ON public.coach_memory FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own coach memory" ON public.coach_memory FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own coach memory" ON public.coach_memory FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own coach memory" ON public.coach_memory FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER coach_memory_updated_at BEFORE UPDATE ON public.coach_memory
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();