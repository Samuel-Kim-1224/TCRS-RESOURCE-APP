-- Allow HQ as a school-scoped account (same RLS model as I–IV).

alter table public.user_schools
  drop constraint if exists user_schools_school_check;
alter table public.user_schools
  add constraint user_schools_school_check
  check (school in ('I', 'II', 'III', 'IV', 'HQ'));

alter table public.conducts
  drop constraint if exists conducts_school_check;
alter table public.conducts
  add constraint conducts_school_check
  check (school in ('I', 'II', 'III', 'IV', 'HQ'));

alter table public.company_cwos
  drop constraint if exists company_cwos_school_check;
alter table public.company_cwos
  add constraint company_cwos_school_check
  check (school in ('I', 'II', 'III', 'IV', 'HQ'));

alter table public.notes
  drop constraint if exists notes_school_check;
alter table public.notes
  add constraint notes_school_check
  check (school in ('I', 'II', 'III', 'IV', 'HQ'));
