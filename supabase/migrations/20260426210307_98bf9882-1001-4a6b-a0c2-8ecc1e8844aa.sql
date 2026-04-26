
-- Profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Trades table
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pair text not null,
  direction text not null check (direction in ('buy','sell')),
  lot_size numeric not null,
  entry_price numeric not null,
  stop_loss numeric,
  take_profit numeric,
  close_price numeric,
  trade_date timestamptz not null default now(),
  session text check (session in ('London','New York','Asia','Sydney')),
  strategy text,
  notes text,
  screenshot_url text,
  emotion_before text check (emotion_before in ('Confident','Fear','Greed','Neutral')),
  emotion_after text check (emotion_after in ('Confident','Fear','Greed','Neutral','Satisfied','Frustrated')),
  mistakes text[] default '{}',
  pnl numeric,
  rr numeric,
  result text check (result in ('win','loss','breakeven')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trades enable row level security;

create policy "Users view own trades" on public.trades for select using (auth.uid() = user_id);
create policy "Users insert own trades" on public.trades for insert with check (auth.uid() = user_id);
create policy "Users update own trades" on public.trades for update using (auth.uid() = user_id);
create policy "Users delete own trades" on public.trades for delete using (auth.uid() = user_id);

create index trades_user_date_idx on public.trades(user_id, trade_date desc);

-- Auto-update timestamp
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trades_updated_at before update on public.trades
  for each row execute function public.update_updated_at();

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage bucket for screenshots
insert into storage.buckets (id, name, public) values ('screenshots','screenshots', true);

create policy "Users upload own screenshots" on storage.objects for insert
  with check (bucket_id = 'screenshots' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users view screenshots" on storage.objects for select
  using (bucket_id = 'screenshots');
create policy "Users delete own screenshots" on storage.objects for delete
  using (bucket_id = 'screenshots' and auth.uid()::text = (storage.foldername(name))[1]);
