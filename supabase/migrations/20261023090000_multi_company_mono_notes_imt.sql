-- Multi-company troop lift, persistent MONO setting, IMT, and note titles/remarks.

alter table public.conducts
  add column if not exists following_company_codes text[] not null default '{}';

alter table public.conducts
  drop constraint if exists conducts_conduct_key_check;

alter table public.conducts
  add constraint conducts_conduct_key_check
  check (
    conduct_key in (
      'SOC', 'RM', 'ER', 'TEMPO', 'CC', 'BTP', 'DAC', 'WP',
      'BPK', 'IPPT', 'BIC', 'ISAD', 'HG', 'IFC', 'IMT',
      'RE_IFC', 'RE_SIT', 'RE_IPPT'
    )
  );

alter table public.company_cwos
  add column if not exists is_mono boolean not null default false;

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

-- Make the newly-added note fields available immediately through PostgREST.
notify pgrst, 'reload schema';
