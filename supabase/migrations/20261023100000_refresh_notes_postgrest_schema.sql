-- Ensure note fields are present and visible through PostgREST's schema cache.
alter table public.notes
  alter column company_code drop not null;

alter table public.notes
  add column if not exists title text not null default '',
  add column if not exists remarks text;

update public.notes
set remarks = coalesce(remarks, body)
where remarks is null;

alter table public.notes
  alter column remarks set not null;

notify pgrst, 'reload schema';
