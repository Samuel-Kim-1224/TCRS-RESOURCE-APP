-- School scoping, notes, and school-aware company codes.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;
grant execute on function public.set_updated_at() to postgres;

-- ---------------------------------------------------------------------------
-- user_schools: maps auth users to I / II / III / IV
-- ---------------------------------------------------------------------------
create table if not exists public.user_schools (
  user_id uuid primary key references auth.users (id) on delete cascade,
  school text not null check (school in ('I', 'II', 'III', 'IV')),
  created_at timestamptz not null default now()
);

alter table public.user_schools enable row level security;

drop policy if exists "Authenticated users can read own school mapping" on public.user_schools;
create policy "Authenticated users can read own school mapping"
on public.user_schools
for select
to authenticated
using (auth.uid() = user_id);

revoke all on public.user_schools from anon;
grant select on public.user_schools to authenticated;

create or replace function public.current_user_school()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select school from public.user_schools where user_id = auth.uid();
$$;

revoke all on function public.current_user_school() from public;
grant execute on function public.current_user_school() to authenticated;

-- ---------------------------------------------------------------------------
-- Expand company codes (A–H; migrate REC → A)
-- ---------------------------------------------------------------------------
update public.conducts set company_code = 'A' where company_code = 'REC';

delete from public.company_cwos
where company_code = 'REC'
  and exists (select 1 from public.company_cwos c where c.company_code = 'A');

update public.company_cwos set company_code = 'A' where company_code = 'REC';

alter table public.company_cwos drop constraint if exists company_cwos_company_code_check;
alter table public.conducts drop constraint if exists conducts_company_code_check;

alter table public.company_cwos
  add constraint company_cwos_company_code_check
  check (
    company_code in (
      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
      'J', 'K', 'L', 'M', 'N', 'O',
      'P', 'R', 'S', 'T', 'U', 'V', 'W',
      '1st', '2nd', '3rd', '4th', '5th', '6th', '7th'
    )
  );

alter table public.conducts
  add constraint conducts_company_code_check
  check (
    company_code in (
      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
      'J', 'K', 'L', 'M', 'N', 'O',
      'P', 'R', 'S', 'T', 'U', 'V', 'W',
      '1st', '2nd', '3rd', '4th', '5th', '6th', '7th'
    )
  );

-- ---------------------------------------------------------------------------
-- school column on conducts / company_cwos
-- ---------------------------------------------------------------------------
alter table public.conducts
  add column if not exists school text;

alter table public.company_cwos
  add column if not exists school text;

update public.conducts set school = case
  when company_code in ('A','B','C','D','E','F','G','H') then 'I'
  when company_code in ('J','K','L','M','N','O') then 'II'
  when company_code in ('P','R','S','T','U','V','W') then 'III'
  when company_code in ('1st','2nd','3rd','4th','5th','6th','7th') then 'IV'
  else 'II'
end
where school is null;

update public.company_cwos set school = case
  when company_code in ('A','B','C','D','E','F','G','H') then 'I'
  when company_code in ('J','K','L','M','N','O') then 'II'
  when company_code in ('P','R','S','T','U','V','W') then 'III'
  when company_code in ('1st','2nd','3rd','4th','5th','6th','7th') then 'IV'
  else 'II'
end
where school is null;

alter table public.conducts
  alter column school set not null;

alter table public.company_cwos
  alter column school set not null;

alter table public.conducts
  drop constraint if exists conducts_school_check;
alter table public.conducts
  add constraint conducts_school_check check (school in ('I', 'II', 'III', 'IV'));

alter table public.company_cwos
  drop constraint if exists company_cwos_school_check;
alter table public.company_cwos
  add constraint company_cwos_school_check check (school in ('I', 'II', 'III', 'IV'));

create index if not exists conducts_school_idx on public.conducts (school);

-- ---------------------------------------------------------------------------
-- notes
-- ---------------------------------------------------------------------------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  school text not null check (school in ('I', 'II', 'III', 'IV')),
  company_code text not null
    check (
      company_code in (
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
        'J', 'K', 'L', 'M', 'N', 'O',
        'P', 'R', 'S', 'T', 'U', 'V', 'W',
        '1st', '2nd', '3rd', '4th', '5th', '6th', '7th'
      )
    ),
  body text not null,
  start_date date not null,
  end_date date not null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_valid_date_range check (end_date >= start_date)
);

create index if not exists notes_start_date_idx on public.notes (start_date);
create index if not exists notes_end_date_idx on public.notes (end_date);
create index if not exists notes_school_idx on public.notes (school);

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
before update on public.notes
for each row execute function public.set_updated_at();

alter table public.notes enable row level security;

-- ---------------------------------------------------------------------------
-- RLS: read all authenticated; write only own school
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated users can manage CWO records" on public.company_cwos;
drop policy if exists "Authenticated users manage CWO records" on public.company_cwos;
drop policy if exists "Authenticated users can manage conducts" on public.conducts;
drop policy if exists "Authenticated users manage conducts" on public.conducts;

drop policy if exists "Authenticated users can read CWOs" on public.company_cwos;
drop policy if exists "Users can insert own-school CWOs" on public.company_cwos;
drop policy if exists "Users can update own-school CWOs" on public.company_cwos;
drop policy if exists "Users can delete own-school CWOs" on public.company_cwos;

create policy "Authenticated users can read CWOs"
on public.company_cwos for select to authenticated
using (true);

create policy "Users can insert own-school CWOs"
on public.company_cwos for insert to authenticated
with check (school = public.current_user_school());

create policy "Users can update own-school CWOs"
on public.company_cwos for update to authenticated
using (school = public.current_user_school())
with check (school = public.current_user_school());

create policy "Users can delete own-school CWOs"
on public.company_cwos for delete to authenticated
using (school = public.current_user_school());

drop policy if exists "Authenticated users can read conducts" on public.conducts;
drop policy if exists "Users can insert own-school conducts" on public.conducts;
drop policy if exists "Users can update own-school conducts" on public.conducts;
drop policy if exists "Users can delete own-school conducts" on public.conducts;

create policy "Authenticated users can read conducts"
on public.conducts for select to authenticated
using (true);

create policy "Users can insert own-school conducts"
on public.conducts for insert to authenticated
with check (school = public.current_user_school());

create policy "Users can update own-school conducts"
on public.conducts for update to authenticated
using (school = public.current_user_school())
with check (school = public.current_user_school());

create policy "Users can delete own-school conducts"
on public.conducts for delete to authenticated
using (school = public.current_user_school());

drop policy if exists "Authenticated users can read notes" on public.notes;
drop policy if exists "Users can insert own-school notes" on public.notes;
drop policy if exists "Users can update own-school notes" on public.notes;
drop policy if exists "Users can delete own-school notes" on public.notes;

create policy "Authenticated users can read notes"
on public.notes for select to authenticated
using (true);

create policy "Users can insert own-school notes"
on public.notes for insert to authenticated
with check (school = public.current_user_school());

create policy "Users can update own-school notes"
on public.notes for update to authenticated
using (school = public.current_user_school())
with check (school = public.current_user_school());

create policy "Users can delete own-school notes"
on public.notes for delete to authenticated
using (school = public.current_user_school());

revoke all on public.notes from anon;
grant select, insert, update, delete on public.notes to authenticated;
