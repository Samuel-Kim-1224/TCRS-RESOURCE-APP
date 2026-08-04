-- Expand company_code to cover Schools I–IV companies.

alter table public.company_cwos
  drop constraint if exists company_cwos_company_code_check;

alter table public.company_cwos
  add constraint company_cwos_company_code_check
  check (
    company_code in (
      'A', 'B', 'C', 'D', 'E', 'F', 'REC',
      'J', 'K', 'L', 'M', 'N', 'O',
      'P', 'R', 'S', 'T', 'U', 'V', 'W',
      '1st', '2nd', '3rd', '4th', '5th', '6th', '7th'
    )
  );

alter table public.conducts
  drop constraint if exists conducts_company_code_check;

alter table public.conducts
  add constraint conducts_company_code_check
  check (
    company_code in (
      'A', 'B', 'C', 'D', 'E', 'F', 'REC',
      'J', 'K', 'L', 'M', 'N', 'O',
      'P', 'R', 'S', 'T', 'U', 'V', 'W',
      '1st', '2nd', '3rd', '4th', '5th', '6th', '7th'
    )
  );
