# Workshop RSVP (`/book`)

Eventbrite-like workshop series RSVP for [delpach.com/book](https://delpach.com/book). Admins run a series roster through capacity-limited sessions until everyone has said Yes.

Product decisions live in [`SCOPE.md`](../SCOPE.md) at the repo root (SW### register). Timezone for display and scheduling is **Australia/Perth**.

## Stack

| Layer | Choice |
|-------|--------|
| Frontend | Static HTML/CSS/JS under `book/` |
| Hosting | GitHub Pages (`delpach.com` → this repo; app at `/book`) |
| Data | Supabase Postgres (`delpach-book`) — RLS on tables; admin/guest access via `SECURITY DEFINER` RPCs |
| Email | Resend, called from Edge Function `send-workshop-invites` |

Client config: `book/js/config.js` (Supabase URL, anon key, timezone, functions URL). Schema and RPCs: `supabase/migrations/`.

## Routes

| Path | Role |
|------|------|
| `/book/` | Landing / how-it-works |
| `/book/a/?k=…` | Secret admin UI (`admin_token`) |
| `/book/w/?t=…` | Guest RSVP (`workshop.public_token`) |

## Main flow

1. **Series** — admin creates a series (Eventbrite-style event container).
2. **CSV import** — roster of `name,email` into the series.
3. **Workshop** — create session (date/time, duration, capacity); title is auto-set to `{Series} - Workshop N`.
4. **Email attendees** — Edge Function emails people who have not yet said Yes in the series (skips missing emails).
5. **Guest RSVP** — open workshop link, pick name, Yes/No. Repeat workshops until the roster is complete.

Admin can also delete a series (roster, workshops, RSVPs cascade).

## Email (`send-workshop-invites`)

- Invoked from admin with `admin_token` + `workshop_id`.
- Loads invitees via RPC `admin_list_invitees`, then sends through Resend.
- Default from: `Workshop Bookings <bookings@mail.delpach.com>` (overridable).

**Edge Function secrets** (Supabase → Edge Functions → Secrets; not in repo):

- `RESEND_API_KEY`
- `RESEND_FROM` (optional; defaults as above)

## Secrets & local-only paths

- **`admin_token`** — stored in DB (`app_settings`); passed as `?k=` to admin. Not committed.
- **`RESEND_*`** — Edge Function secrets only.
- **`book/.admin-secret`**, **`private/`** — gitignored; never commit.
- Do not commit `.cursor/` or other local tooling noise.

Anon key in `config.js` is expected for the static client; authorization is enforced by token-checked RPCs and RLS.
