# Workshop RSVP (/book) — Scope Register

Live product scope for `delpach.com/book`. IDs are stable; supersede by editing the same SW###.

## Locked decisions

| ID | Summary |
|----|---------|
| SW001 | App under `/book` |
| SW002 / SW013 | Admin via secret URL (not guessable `/admin`) |
| SW003 | CSV name import into series roster |
| SW004 | Workshop date, time, duration (minutes) |
| SW005 | Shareable workshop URL; manual copy |
| SW006 | Guest: name dropdown + Yes/No RSVP |
| SW007 | Follow-up = anyone who has not said Yes in the series |
| SW008 | Multiple workshops per series until all Yes |
| SW009 | Email out of scope |
| SW010 | Persistence in Supabase |
| SW011 | GitHub Pages + Supabase (no Vercel) |
| SW012 | Supabase agent skills installed |
| SW014 | Guest dropdown = remaining non-Yes (+ current workshop Yes for edits) |
| SW015 | `delpach.com` is this Pages site |
| SW016 | Supabase project `delpach-book` created at build |
| SW017 | Workshop capacity limit |
| SW018 | Series ≈ Eventbrite Event |
| SW019 | Eventbrite-inspired UX (no payments/tickets/email) |
| SW020 | Series complete when all roster have Yes; then new series |
| SW021 | Email attendees via Resend (Edge Function); targets not-yet-Yes; CSV `name,email` |

## Defaults

- Timezone: Australia/Perth
- Capacity full: block further Yes; No still allowed
- Workshop guest URL: `/book/w/?t={public_token}`
- Admin URL: `/book/a/?k={admin_token}`
