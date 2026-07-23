-- Applied remotely via Supabase MCP as book_workshop_rsvp_schema
-- Project: delpach-book (dlbjuosvisjjowlwophz)

create extension if not exists pgcrypto;

create table public.app_settings (
  key text primary key,
  value text not null
);

create table public.series (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now()
);

create table public.roster_people (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.series(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (series_id, name)
);

create table public.workshops (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.series(id) on delete cascade,
  public_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  starts_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  capacity integer not null check (capacity > 0),
  created_at timestamptz not null default now()
);

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  person_id uuid not null references public.roster_people(id) on delete cascade,
  attending boolean not null,
  updated_at timestamptz not null default now(),
  unique (workshop_id, person_id)
);
