# Mail Merge Cleaner v2 — Design Spec

## Background

v1 was a learning project: a single linear wizard (upload → analyze → template → tutorial modal) backed by a Flask + pandas + SQLite server, deployed to PythonAnywhere (currently offline, credentials lost) with the React frontend on Vercel. Everything — cleaning, templates, tutorial — was mixed into one flow and one 380-line component.

v2 goal: turn the same three capabilities into independent, multi-purpose tools, add usage metrics visible to visitors in real time, and stop depending on a separate Python host that can silently go dark.

## Goals

- Decouple cleaning, template building, and the tutorial into independent tools usable in any order, on their own routes.
- Show live, public usage numbers: files cleaned, total rows/emails processed, and browser sessions recorded (see labeling note under Data Model — this is a cumulative count, not live active users).
- Single deployable unit (no separate backend host to forget about).
- No file ever leaves the visitor's browser.

## Non-goals (explicitly out of scope for v2)

- User accounts / login / per-user template ownership.
- A fourth tool beyond the existing three (cleaning, templates, tutorial) — future tools get their own spec later.
- Server-side file storage of any kind.
- Duplicate-count and template-download metrics on the public counter (only files cleaned, rows processed, and sessions are shown — see Data Model).
- Real authentication/login for template writes. The `is_default` protection (see Data Model) is a data-flag check, not an auth system.

## Stack

| Concern | v1 | v2 |
|---|---|---|
| Frontend | React + Vite, Vercel | Next.js (App Router), Vercel |
| Backend | Flask + pandas, PythonAnywhere | Next.js API routes (metrics + template writes only) |
| File cleaning | Server-side (pandas) | Client-side (`papaparse`, `xlsx`) |
| .docx generation | Server-side (python-docx) | Client-side (`docx` npm package) |
| Templates storage | SQLite on the Flask host | Supabase Postgres |
| Metrics | None | Supabase Postgres + Realtime |
| Auth | None | None (unchanged) |

Rationale for each choice was worked through with the user directly (see conversation): Next.js consolidates to one Vercel deployment; Supabase was chosen specifically for built-in Realtime, which lets the public counter update via a live subscription instead of polling; client-side processing was chosen because no file needs to reach a server at all, avoiding upload/timeout/payload-size limits and keeping visitor data private.

## Site structure

- `/` — Hub homepage. Cards linking to each tool. Public live stats banner (files cleaned, rows processed, sessions recorded).
- `/clean` — Email Cleaner. Upload CSV/XLSX → pick the email column → see cleaning results (original/duplicate/final counts, duplicate list) → download cleaned CSV. Fully self-contained; does not require visiting any other route first.
- `/templates` — Template Builder. CRUD over a shared, global template library (same "no auth, shared for everyone" model as v1) + download active template as `.docx`.
- `/tutorial` — The existing 8-step Outlook mail-merge walkthrough (currently a modal in v1), promoted to its own page with the same step images.

A shared nav/layout lets visitors jump between tools freely. No tool depends on state produced by another.

## Data model (Supabase / Postgres)

```sql
-- Shared template library (same shape as v1's SQLite table, plus is_default)
create table templates (
  id bigint generated always as identity primary key,
  title text not null,
  subject text not null,
  body text not null,
  is_default boolean not null default false,  -- true for the 6 seeded v1 templates
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Append-only raw event log
create table metrics_events (
  id bigint generated always as identity primary key,
  tool text not null,               -- e.g. 'clean'
  event_type text not null check (event_type in ('file_cleaned', 'session_started')),
  rows_processed bigint check (rows_processed is null or (rows_processed >= 0 and rows_processed <= 1000000)),
  session_id uuid not null,
  created_at timestamptz not null default now()
);

-- Prevents the same browser session from being counted twice
create unique index metrics_events_session_started_uidx
  on metrics_events (session_id)
  where event_type = 'session_started';

-- Singleton row of running totals, kept in sync by trigger
create table metrics_totals (
  id boolean primary key default true check (id),  -- enforces exactly one row
  files_cleaned bigint not null default 0,
  rows_processed bigint not null default 0,
  sessions bigint not null default 0
);
insert into metrics_totals (id) values (true);

-- Trigger function: increments the right counter per event_type
create function bump_metrics_totals() returns trigger as $$
begin
  if new.event_type = 'file_cleaned' then
    update metrics_totals set files_cleaned = files_cleaned + 1,
      rows_processed = rows_processed + coalesce(new.rows_processed, 0);
  elsif new.event_type = 'session_started' then
    update metrics_totals set sessions = sessions + 1;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger metrics_events_bump
  after insert on metrics_events
  for each row execute function bump_metrics_totals();

-- RLS: public read-only on templates and metrics_totals; no public writes anywhere
alter table templates enable row level security;
alter table metrics_totals enable row level security;
alter table metrics_events enable row level security;

create policy templates_public_read on templates for select using (true);
create policy metrics_totals_public_read on metrics_totals for select using (true);
-- No insert/update/delete policies for the anon role on any table.
-- All writes happen via Next.js API routes using the service-role key,
-- which bypasses RLS by design (Supabase's standard server-write pattern).
```

**Row Level Security**: `templates` and `metrics_totals` allow public `select` only (policies above). No public `insert`/`update`/`delete` on any table via the anon key — all writes go through Next.js API routes using the Supabase **service-role key** (server-side env var only, never shipped to the client). `metrics_events` has no public access at all (write-only via server route).

**Template write protection**: the API route for `PUT`/`DELETE /api/templates/[id]` rejects the request (403) if the target row has `is_default = true`. The 6 seeded v1 templates are protected this way; everything else — creating new templates, or editing/deleting user-created ones — stays fully public with no gate, matching v1's zero-friction feel.

**Metrics endpoint validation**: `POST /api/metrics/record` rejects any `event_type` outside the two allowed values (enforced again at the DB via the `check` constraint above, belt-and-suspenders) and any `rows_processed` outside `0–1,000,000`. `session_id` must parse as a UUID. The session-start insert uses `insert ... on conflict (session_id) where event_type = 'session_started' do nothing` so a retried or duplicate call is a genuine no-op instead of a 500.

**Realtime**: enabled on `metrics_totals`. The homepage does an initial `select` on load to render the current numbers immediately, then subscribes to that single row for live updates as other visitors use the tools — avoids showing a stale/blank counter if a realtime event is missed on reconnect.

**Public counter labeling**: the UI copy says "browser sessions recorded," not "people using the site right now" — the number is a cumulative count of distinct browser-storage IDs seen, not a live active-user count, and the copy should say what it actually measures.

## Event flow

**Cleaning a file** (`/clean`):
1. File is parsed client-side (`papaparse` for CSV, `xlsx` for Excel) the moment it's selected — headers appear immediately, no network call.
2. User picks the email column; a client-side JS port of the v1 pandas logic runs (split each cell on `;`, explode into one row per address, trim, drop empty/duplicate values) and results render instantly.
3. On "Download Cleaned CSV," the CSV is generated and downloaded client-side, and a fire-and-forget `POST /api/metrics/record { tool: 'clean', event_type: 'file_cleaned', rows_processed: N }` is sent. If this call fails, the download still succeeds — metrics recording must never block the actual feature.

**Session counting** (any page, on first interaction):
1. On first load, the client checks `localStorage` for an existing session UUID; if absent, it generates one and stores it.
2. It calls `POST /api/metrics/record { event_type: 'session_started', session_id }` once. The route inserts with `on conflict ... do nothing`, so a retried or duplicate call is a genuine no-op — repeat visits from the same browser don't inflate the session count.

**Templates** (`/templates`):
- Reads (`GET`) go straight from the client to Supabase using the anon key (RLS allows public select).
- Writes (create/update/delete) go through Next.js API routes (`/api/templates`, `/api/templates/[id]`) using the service-role key, mirroring v1's endpoint shapes but backed by Supabase instead of SQLite. `PUT`/`DELETE` first check `is_default`; if true, return `403` with a message explaining the template is a protected default and can't be modified.
- `.docx` generation happens client-side via the `docx` package when "Download as Word Document" is clicked — no server round-trip needed.

## Error handling

- Client-side processing means file/format/column errors surface directly as inline UI messages — no more parsing a fetch response's `content-type` to guess JSON vs. HTML error pages (that whole `handleFetchError` pattern from v1 goes away for the cleaning flow).
- Metrics pings are best-effort and silent on failure (logged to console in dev, swallowed in prod) — never surfaced to the user, never block a download.
- Template CRUD errors (network/Supabase failures) surface the same way v1 did: inline error banners / alert on save failure. A `403` from editing/deleting a default template shows a specific "this is a built-in template and can't be changed" message rather than a generic error.
- The metrics API route returns `400` for invalid `event_type`/out-of-range `rows_processed`/unparseable `session_id`; the client ignores the response either way (fire-and-forget) so a bad request never surfaces to the user.

## Testing

- Cleaning logic (split/explode/trim/dedupe) becomes pure, dependency-free JS functions — unit-testable with Vitest without a running server.
- `.docx` and CSV generation get a smoke test (produces a valid file, correct row/paragraph count).
- Metrics route gets unit tests for: valid event accepted, invalid `event_type`/out-of-range `rows_processed` rejected, and a duplicate `session_started` call for the same `session_id` succeeding as a no-op rather than erroring.
- Template route gets a test confirming `PUT`/`DELETE` on an `is_default = true` row returns `403` and leaves the row unchanged.
- Each tool page gets manual browser QA (existing `/qa` workflow) covering: upload → analyze → download (cleaning), CRUD round-trip (templates), and that the live counter updates after a cleaning run.

## Migration notes

- v1's PythonAnywhere backend and SQLite `templates.db` are retired; the 6 seed templates get carried over as a one-time seed script/migration into the new `templates` Supabase table with `is_default = true`, so the template library isn't empty on launch and the defaults are protected from day one.
- v1's `mail-merge-frontend` / `mail-merge-backend` folder split goes away in favor of a single Next.js project (naming/repo layout to be finalized in the implementation plan).

## Open questions for the implementation plan

- Exact Next.js project structure (single repo replacing both v1 folders, or new repo) — recommend replacing in place, but this should be confirmed when the plan is written.
- Whether the `unsued/` legacy Streamlit prototype files should be deleted as part of this work (they are unrelated to any live path already).
