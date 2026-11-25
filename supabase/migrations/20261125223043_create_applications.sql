-- Applications: enums, table, constraints, updated_at trigger and indexes.
-- Row Level Security and policies are added in a separate migration.

create type public.application_status as enum (
  'enviada',
  'en_proceso',
  'entrevista',
  'oferta',
  'descartada',
  'rechazada_por_mi'
);

create type public.application_portal as enum (
  'linkedin',
  'infojobs',
  'tecnoempleo',
  'indeed',
  'web_empresa',
  'referido',
  'otro'
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company text not null,
  position text not null,
  offer_url text,
  portal public.application_portal not null default 'otro',
  applied_at date not null default current_date,
  salary_min integer,
  salary_max integer,
  status public.application_status not null default 'enviada',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint applications_company_length
    check (char_length(btrim(company)) >= 1 and char_length(company) <= 200),
  constraint applications_position_length
    check (char_length(btrim(position)) >= 1 and char_length(position) <= 200),
  constraint applications_offer_url_length
    check (char_length(offer_url) <= 2048),
  constraint applications_offer_url_format
    check (offer_url ~ '^https?://[^[:space:]]+$'),
  constraint applications_salary_min_range
    check (salary_min >= 0 and salary_min <= 10000000),
  constraint applications_salary_max_range
    check (salary_max >= 0 and salary_max <= 10000000),
  constraint applications_salary_order
    check (salary_min is null or salary_max is null or salary_min <= salary_max),
  constraint applications_notes_length
    check (char_length(notes) <= 5000)
);

comment on column public.applications.salary_min is 'Gross annual salary, minimum (EUR)';
comment on column public.applications.salary_max is 'Gross annual salary, maximum (EUR)';

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger applications_set_updated_at
  before update on public.applications
  for each row
  execute function public.set_updated_at();

-- Kanban and metrics filter by user and status. The leftmost column also
-- serves plain user_id lookups (RLS predicate and the on delete cascade),
-- so a separate (user_id) index would be redundant.
create index applications_user_id_status_idx
  on public.applications (user_id, status);

-- Default list ordering: newest applications first for the current user.
create index applications_user_id_applied_at_idx
  on public.applications (user_id, applied_at desc);
