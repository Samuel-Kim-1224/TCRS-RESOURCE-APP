-- Store each school's manually generated indent summary by month.

create table if not exists public.manual_indent_summaries (
  school text not null check (school in ('I', 'II', 'III', 'IV', 'HQ')),
  month_key text not null check (month_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  sources jsonb not null default '{}'::jsonb,
  summaries jsonb not null default '[]'::jsonb,
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (school, month_key)
);

create index if not exists manual_indent_summaries_month_idx
  on public.manual_indent_summaries (month_key);

drop trigger if exists manual_indent_summaries_set_updated_at
  on public.manual_indent_summaries;
create trigger manual_indent_summaries_set_updated_at
before update on public.manual_indent_summaries
for each row execute function public.set_updated_at();

alter table public.manual_indent_summaries enable row level security;

drop policy if exists "Users can read own-school manual indent summaries"
  on public.manual_indent_summaries;
create policy "Users can read own-school manual indent summaries"
on public.manual_indent_summaries for select to authenticated
using (school = public.current_user_school());

drop policy if exists "Users can insert own-school manual indent summaries"
  on public.manual_indent_summaries;
create policy "Users can insert own-school manual indent summaries"
on public.manual_indent_summaries for insert to authenticated
with check (school = public.current_user_school());

drop policy if exists "Users can update own-school manual indent summaries"
  on public.manual_indent_summaries;
create policy "Users can update own-school manual indent summaries"
on public.manual_indent_summaries for update to authenticated
using (school = public.current_user_school())
with check (school = public.current_user_school());

grant select, insert, update on public.manual_indent_summaries to authenticated;
revoke all on public.manual_indent_summaries from anon;

notify pgrst, 'reload schema';
