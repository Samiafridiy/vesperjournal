
create or replace function public.update_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists "Users view screenshots" on storage.objects;
create policy "Users view own screenshots" on storage.objects for select
  using (bucket_id = 'screenshots' and auth.uid()::text = (storage.foldername(name))[1]);

update storage.buckets set public = false where id = 'screenshots';
