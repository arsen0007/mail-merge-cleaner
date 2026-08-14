# Mail Merge Cleaner v2 — Design Spec

## Background

v1 was a learning project: a single linear wizard (upload → analyze → template → tutorial modal) backed by a Flask + pandas + SQLite server, deployed to PythonAnywhere (currently offline, credentials lost) with the React frontend on Vercel. Everything — cleaning, templates, tutorial — was mixed into one flow and one 380-line component.

v2 goal: turn the same three capabilities into independent, multi-purpose tools, add usage metrics visible to visitors in real time, and stop depending on a separate Python host that can silently go dark.

## Goals

- Decouple cleaning, template building, and the tutorial into independent tools usable in any order, on their own routes.
- Show live, public usage numbers: files cleaned, total rows/emails processed, people/sessions using the site.
- Single deployable unit (no separate backend host to forget about).
- No file ever leaves the visitor's browser.

## Non-goals (explicitly out of scope for v2)

- User accounts / login / per-user template ownership.
- A fourth tool beyond the existing three (cleaning, templates, tutorial) — future tools get their own spec later.
- Server-side file storage of any kind.
- Duplicate-count and template-download metrics on the public counter (only files cleaned, rows processed, and people/sessions are shown — see Data Model).

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

- `/` — Hub homepage. Cards linking to each tool. Public live stats banner (files cleaned, rows processed, people/sessions).
- `/clean` — Email Cleaner. Upload CSV/XLSX → pick the email column → see cleaning results (original/duplicate/final counts, duplicate list) → download cleaned CSV. Fully self-contained; does not require visiting any other route first.
- `/templates` — Template Builder. CRUD over a shared, global template library (same "no auth, shared for everyone" model as v1) + download active template as `.docx`.
- `/tutorial` — The existing 8-step Outlook mail-merge walkthrough (currently a modal in v1), promoted to its own page with the same step images.

A shared nav/layout lets visitors jump between tools freely. No tool depends on state produced by another.

## Data model (Supabase / Postgres)

```sql
-- Shared template library (same shape as v1's SQLite table)
create table templates (
  id bigint generated always as identity primary key,
  title text not null,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Append-only raw event log
create table metrics_events (
  id bigint generated always as identity primary key,
  tool text not null,               -- e.g. 'clean'
  event_type text not null,         -- e.g. 'file_cleaned', 'session_started'
  rows_processed int,               -- null for non-cleaning events
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
```

**Row Level Security**: `templates` and `metrics_totals` allow public `select`. No public `insert`/`update`/`delete` on any table via the anon key — all writes go through Next.js API routes using the Supabase **service-role key** (server-side env var only, never shipped to the client). `metrics_events` has no public access at all (write-only via server route).

**Realtime**: enabled on `metrics_totals`. The homepage subscribes to that single row and updates the counter the instant any visitor's action changes it — no polling.

## Event flow

**Cleaning a file** (`/clean`):
1. File is parsed client-side (`papaparse` for CSV, `xlsx` for Excel) the moment it's selected — headers appear immediately, no network call.
2. User picks the email column; a client-side JS port of the v1 pandas logic runs (split each cell on `;`, explode into one row per address, trim, drop empty/duplicate values) and results render instantly.
3. On "Download Cleaned CSV," the CSV is generated and downloaded client-side, and a fire-and-forget `POST /api/metrics/record { tool: 'clean', event_type: 'file_cleaned', rows_processed: N }` is sent. If this call fails, the download still succeeds — metrics recording must never block the actual feature.

**Session counting** (any page, on first interaction):
1. On first load, the client checks `localStorage` for an existing session UUID; if absent, it generates one and stores it.
2. It calls `POST /api/metrics/record { event_type: 'session_started', session_id }` once. The unique index on `metrics_events` (scoped to `session_started`) means a retried or duplicate call is a harmless no-op — repeat visits from the same browser don't inflate the "people" count.

**Templates** (`/templates`):
- Reads (`GET`) go straight from the client to Supabase using the anon key (RLS allows public select).
- Writes (create/update/delete) go through Next.js API routes (`/api/templates`, `/api/templates/[id]`) using the service-role key, mirroring v1's endpoint shapes but backed by Supabase instead of SQLite.
- `.docx` generation happens client-side via the `docx` package when "Download as Word Document" is clicked — no server round-trip needed.

## Error handling

- Client-side processing means file/format/column errors surface directly as inline UI messages — no more parsing a fetch response's `content-type` to guess JSON vs. HTML error pages (that whole `handleFetchError` pattern from v1 goes away for the cleaning flow).
- Metrics pings are best-effort and silent on failure (logged to console in dev, swallowed in prod) — never surfaced to the user, never block a download.
- Template CRUD errors (network/Supabase failures) surface the same way v1 did: inline error banners / alert on save failure.

## Testing

- Cleaning logic (split/explode/trim/dedupe) becomes pure, dependency-free JS functions — unit-testable with Vitest without a running server.
- `.docx` and CSV generation get a smoke test (produces a valid file, correct row/paragraph count).
- Each tool page gets manual browser QA (existing `/qa` workflow) covering: upload → analyze → download (cleaning), CRUD round-trip (templates), and that the live counter updates after a cleaning run.

## Migration notes

- v1's PythonAnywhere backend and SQLite `templates.db` are retired; the 6 seed templates get carried over as a one-time seed script/migration into the new `templates` Supabase table so the template library isn't empty on launch.
- v1's `mail-merge-frontend` / `mail-merge-backend` folder split goes away in favor of a single Next.js project (naming/repo layout to be finalized in the implementation plan).

## Open questions for the implementation plan

- Exact Next.js project structure (single repo replacing both v1 folders, or new repo) — recommend replacing in place, but this should be confirmed when the plan is written.
- Whether the `unsued/` legacy Streamlit prototype files should be deleted as part of this work (they are unrelated to any live path already).
