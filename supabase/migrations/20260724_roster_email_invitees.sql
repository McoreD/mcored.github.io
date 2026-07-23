-- Applied remotely: roster_email_and_invitees
alter table public.roster_people add column if not exists email text;
