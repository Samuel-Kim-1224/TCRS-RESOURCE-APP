create table public.company_cwos (
  company_code text primary key
    check (company_code in ('J', 'K', 'L', 'M', 'N', 'O')),
  cwo_name text not null,
  cwo_number text not null,
  updated_at timestamptz not null default now()
);

create table public.conducts (
  id uuid primary key default gen_random_uuid(),
  company_code text not null
    check (company_code in ('J', 'K', 'L', 'M', 'N', 'O')),
  conduct_key text not null
    check (
      conduct_key in (
        'SOC', 'RM', 'ER', 'TEMPO', 'CC', 'BTP', 'DAC', 'WP',
        'BPK', 'IPPT', 'BIC', 'ISAD', 'HG', 'IFC',
        'RE_IFC', 'RE_SIT', 'RE_IPPT'
      )
    ),
  start_date date not null,
  end_date date not null,
  period text check (period in ('AM', 'PM')),
  status text not null default 'conducting'
    check (status in ('conducting', 'not conducting')),
  pes text check (pes in ('Combat fit', 'B3/4')),
  rm_km text,
  rm_pes text,
  er_number text,
  tempo_number text,
  ippt_number text,
  cc_number text,
  soc_pes text,
  venue text,
  btp_range text,
  fc_site text,
  sit_test_site text,
  created_by uuid default auth.uid()
    references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conducts_valid_date_range check (end_date >= start_date)
);

create index conducts_start_date_idx on public.conducts (start_date);
create index conducts_end_date_idx on public.conducts (end_date);
create index conducts_company_code_idx on public.conducts (company_code);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger company_cwos_set_updated_at
before update on public.company_cwos
for each row execute function public.set_updated_at();

create trigger conducts_set_updated_at
before update on public.conducts
for each row execute function public.set_updated_at();

alter table public.company_cwos enable row level security;
alter table public.conducts enable row level security;

create policy "Authenticated users can manage CWO records"
on public.company_cwos
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated users can manage conducts"
on public.conducts
for all
to authenticated
using (true)
with check (true);

revoke all on public.company_cwos from anon;
revoke all on public.conducts from anon;
grant select, insert, update, delete on public.company_cwos to authenticated;
grant select, insert, update, delete on public.conducts to authenticated;

revoke execute on function public.set_updated_at() from public;
grant execute on function public.set_updated_at() to postgres;
