# Mail Merge Cleaner v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the mail-merge email cleaner as a single Next.js app with three independent tools (Email Cleaner, Template Builder, Tutorial) sharing a public live-metrics counter, replacing v1's linear Flask+React wizard.

**Architecture:** One Next.js (App Router, JavaScript) project on Vercel. All file cleaning/parsing/.docx generation runs client-side in the browser — no file ever reaches a server. Supabase (Postgres + Realtime) holds the shared template library and usage metrics; Next.js API routes handle all writes via the service-role key, while reads and the live counter subscribe directly from the browser via the anon key.

**Tech Stack:** Next.js (App Router, JS, no TypeScript), Tailwind CSS, framer-motion, Supabase (`@supabase/supabase-js`), papaparse, xlsx, docx, Vitest + @testing-library/react + jsdom.

**Spec:** docs/superpowers/specs/2026-08-15-mail-merge-v2-design.md

## Global Constraints

- No user accounts / login — the whole site stays public, zero-friction, matching v1.
- No file (CSV/XLSX) ever leaves the visitor's browser — all cleaning/parsing/.docx generation is client-side.
- All Supabase writes go through server-side Next.js API routes using the service-role key; the anon key (used directly by the browser) only ever has `select` access per RLS.
- The 6 seeded v1 templates have `is_default = true` and are protected from edit/delete (403 `"This is a built-in template and cannot be changed."`) — everything else stays fully public and editable, no auth gate.
- Metrics events are validated server-side: `event_type` must be `'file_cleaned'` or `'session_started'`; `rows_processed` must be an integer in `[0, 1000000]`; `session_id` must be a valid UUID. A duplicate `session_started` for the same `session_id` is treated as a harmless no-op (Postgres unique-violation code `23505`), never a 500.
- The public counter is labeled "Sessions recorded" (not "people using the site") — it's a cumulative count of distinct browser-storage IDs, not live active users.
- JavaScript only, no TypeScript. No `src/` directory — App Router files live directly under `app/`. Import alias `@/*` resolves to the repo root in both Next.js and Vitest.

---

### Task 1: Project scaffold & tooling

**Files:**
- Modify: repo root (remove stray `package-lock.json`)
- Create: entire Next.js scaffold (`app/`, `package.json`, `next.config.js`, `tailwind.config.js`, `postcss.config.js`, `jsconfig.json`, `.gitignore` merge)
- Create: `vitest.config.js`
- Create: `vitest.setup.js`
- Modify: `app/globals.css`
- Create: `lib/__sanity.test.js`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: a working `npm run dev` / `npm test` toolchain that every later task builds on. The `@/*` import alias resolves to the repo root for both Next.js and Vitest.

- [ ] **Step 1: Remove the stray orphaned root `package-lock.json`**

It has no corresponding root `package.json` (leftover from an old experiment) and its presence makes `create-next-app` refuse to scaffold into a "non-empty" directory.

```bash
git rm package-lock.json
git commit -m "chore: remove orphaned root package-lock.json before v2 scaffold"
```

- [ ] **Step 2: Scaffold the Next.js app**

```bash
npx create-next-app@latest . --js --tailwind --eslint --app --no-src-dir --import-alias "@/*"
```

Answer any remaining interactive prompts by accepting defaults (the flags above should make it non-interactive, but if prompted, confirm "Yes" to any "install in current directory" question).

- [ ] **Step 3: Install runtime dependencies**

```bash
npm install @supabase/supabase-js papaparse xlsx docx framer-motion
```

- [ ] **Step 4: Install test dependencies**

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 5: Create the Vitest config**

Create `vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

Create `vitest.setup.js`:

```js
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 6: Add test scripts to `package.json`**

Add to the `"scripts"` block:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 7: Fix v1's dead blob-animation CSS**

Overwrite `app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@keyframes blob {
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
}
.animate-blob {
  animation: blob 7s infinite;
}
.animation-delay-4000 {
  animation-delay: 4s;
}
```

v1's `App.jsx` used the `animate-blob` and `animation-delay-4000` class names on its background decoration, but never defined the keyframes anywhere — Tailwind silently ignored the unknown utility classes, so the blob animation never actually animated. This defines them for real.

- [ ] **Step 8: Write a toolchain sanity test**

Create `lib/__sanity.test.js`:

```js
import { describe, it, expect } from 'vitest';

describe('toolchain sanity', () => {
  it('runs a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 9: Run the test suite and verify it passes**

Run: `npm test`
Expected: 1 test file, 1 test, PASS.

- [ ] **Step 10: Verify the dev server boots**

Run: `npm run dev` (in the background or a separate terminal)
Verify: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` returns `200`, or the terminal shows "Ready in ...ms".
Stop the dev server afterward (Ctrl+C, or kill the background process).

- [ ] **Step 11: Commit**

```bash
git add app package.json package-lock.json next.config.js tailwind.config.js postcss.config.js jsconfig.json vitest.config.js vitest.setup.js lib/__sanity.test.js .gitignore
git commit -m "$(cat <<'EOF'
feat: scaffold v2 as a Next.js app with Vitest toolchain

Replaces the v1 split (Vite/React frontend + Flask backend) with a single
Next.js project. Also fixes a v1 bug where the background blob animation's
CSS keyframes were never defined.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Supabase project, schema, RLS, and seed data

**Files:**
- Create: `supabase/schema.sql`
- Create: `.env.local.example`
- Create (not committed): `.env.local`

**Interfaces:**
- Consumes: nothing new (independent of Task 1's code, but both are prerequisites for every later task)
- Produces: a live Supabase Postgres database with `templates` (6 rows, `is_default = true`), `metrics_events`, and `metrics_totals` (1 row, all zero) tables, RLS enabled with public-read-only policies, and Realtime enabled on `metrics_totals`. Later tasks read `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` from the environment.

> Reminder: this project has no auth and is public/no-login. All Supabase **writes** must go through server-side API routes using the service-role key — the anon key (used directly by the browser) must only ever have `select` access, enforced by the RLS policies below.

- [ ] **Step 1: Create a Supabase project**

Go to supabase.com/dashboard → New Project. Once it's provisioned, go to Settings → API and note down: the **Project URL**, the **anon public** key, and the **service_role** key (keep the service_role key secret — it bypasses RLS entirely).

- [ ] **Step 2: Write the schema SQL to the repo**

Create `supabase/schema.sql`:

```sql
create table templates (
  id bigint generated always as identity primary key,
  title text not null,
  subject text not null,
  body text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table metrics_events (
  id bigint generated always as identity primary key,
  tool text not null,
  event_type text not null check (event_type in ('file_cleaned', 'session_started')),
  rows_processed bigint check (rows_processed is null or (rows_processed >= 0 and rows_processed <= 1000000)),
  session_id uuid not null,
  created_at timestamptz not null default now()
);

create unique index metrics_events_session_started_uidx
  on metrics_events (session_id)
  where event_type = 'session_started';

create table metrics_totals (
  id boolean primary key default true check (id),
  files_cleaned bigint not null default 0,
  rows_processed bigint not null default 0,
  sessions bigint not null default 0
);
insert into metrics_totals (id) values (true);

create function bump_metrics_totals() returns trigger as $trigger$
begin
  if new.event_type = 'file_cleaned' then
    update metrics_totals set files_cleaned = files_cleaned + 1,
      rows_processed = rows_processed + coalesce(new.rows_processed, 0);
  elsif new.event_type = 'session_started' then
    update metrics_totals set sessions = sessions + 1;
  end if;
  return new;
end;
$trigger$ language plpgsql;

create trigger metrics_events_bump
  after insert on metrics_events
  for each row execute function bump_metrics_totals();

alter table templates enable row level security;
alter table metrics_totals enable row level security;
alter table metrics_events enable row level security;

create policy templates_public_read on templates for select using (true);
create policy metrics_totals_public_read on metrics_totals for select using (true);
```

(Note: the trigger function body is delimited with `$trigger$` instead of bare `$$` purely so it doesn't collide with the `$$`-delimited seed values in Step 3 if you paste both into the same SQL Editor session — functionally identical.)

- [ ] **Step 3: Run the schema, then seed the 6 default templates**

Paste `supabase/schema.sql` into the Supabase SQL Editor and run it.

Then run a seed statement in the same SQL Editor that transcribes the 6 default templates verbatim from `mail-merge-backend/api.py`'s `default_templates` list, with `is_default = true`. Use Postgres dollar-quoting (`$body$...$body$` for the body text, `$t$...$t$` for titles/subjects) instead of single-quote escaping, since the source text mixes straight and curly apostrophes inconsistently — dollar-quoting means none of them need escaping. Read the exact 6 title/subject/body values from `mail-merge-backend/api.py` (do not paraphrase or shorten them) and build:

```sql
insert into templates (title, subject, body, is_default) values
($t$Version 1: Formal & Thorough$t$, $t$...subject from api.py...$t$, $body$...full body text from api.py, verbatim...$body$, true),
($t$Alternate Version 1A: Formal & Thorough$t$, $t$...$t$, $body$...$body$, true),
($t$Version 2: Friendly & Concise$t$, $t$...$t$, $body$...$body$, true),
($t$Alternate Version 2A: Friendly & Concise$t$, $t$...$t$, $body$...$body$, true),
($t$Version 3: Neutral & Direct$t$, $t$...$t$, $body$...$body$, true),
($t$Alternate Version 3A: Neutral & Direct$t$, $t$...$t$, $body$...$body$, true);
```

- [ ] **Step 4: Enable Realtime on `metrics_totals`**

In the Supabase dashboard: Database → Replication → find the `metrics_totals` table → toggle it on.

- [ ] **Step 5: Document the required env vars**

Create `.env.local.example`:

```
# Safe to expose to the browser (used by lib/supabaseClient.js)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# Server-only — NEVER prefix with NEXT_PUBLIC_, never ship to the client (used by lib/supabaseAdmin.js)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] **Step 6: Create your real local env file**

```bash
cp .env.local.example .env.local
```

Fill in the four real values from Step 1. Confirm `.env.local` is gitignored — create-next-app's default `.gitignore` already excludes `.env*.local`; run `git check-ignore .env.local` and confirm it prints the filename (meaning it's correctly ignored) before proceeding.

- [ ] **Step 7: Verify the seed data manually**

Run (substituting your real project URL and anon key):

```bash
curl -s "https://your-project.supabase.co/rest/v1/templates?select=title,is_default" \
  -H "apikey: your-anon-public-key" \
  -H "Authorization: Bearer your-anon-public-key"
```

Expected: a JSON array of 6 objects, all with `"is_default": true`.

- [ ] **Step 8: Commit**

```bash
git add supabase/schema.sql .env.local.example
git commit -m "$(cat <<'EOF'
feat: add Supabase schema, RLS policies, and seed the 6 default templates

templates and metrics_totals are public-read via RLS; all writes are
reserved for server-side routes using the service-role key. The 6 v1
templates are seeded with is_default=true so they can't be edited/deleted
by the public template API (enforced in a later task).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Email cleaning logic — `lib/cleanEmails.js`

**Files:**
- Create: `lib/cleanEmails.js`
- Test: `lib/cleanEmails.test.js`

**Interfaces:**
- Consumes: nothing (pure JS, zero dependencies)
- Produces: `cleanRows(rows, emailColumn)` from `lib/cleanEmails.js` — `rows: Array<Object>`, `emailColumn: string` → `{ cleanedRows: Array<Object>, headers: Array<string>, metrics: { originalRows: number, finalRows: number, removedCount: number }, removedDuplicates: Array<string> }`. Later tasks (the `/clean` page) call this directly on parsed file rows.

- [ ] **Step 1: Write the failing test**

```js
// lib/cleanEmails.test.js
import { describe, it, expect } from 'vitest';
import { cleanRows } from './cleanEmails';

describe('cleanRows', () => {
  it('removes exact duplicate emails, keeping the first occurrence', () => {
    const rows = [
      { Name: 'Alice', Email: 'a@x.com' },
      { Name: 'Alice Duplicate', Email: 'a@x.com' },
      { Name: 'Bob', Email: 'b@x.com' },
    ];

    const result = cleanRows(rows, 'Email');

    expect(result.metrics).toEqual({ originalRows: 3, finalRows: 2, removedCount: 1 });
    expect(result.removedDuplicates).toEqual(['a@x.com']);
    expect(result.cleanedRows.map((r) => r.Name)).toEqual(['Alice', 'Bob']);
  });

  it('splits multiple emails in one cell on semicolons and explodes into separate rows', () => {
    const rows = [{ Name: 'Team', Email: 'a@x.com;b@x.com' }];

    const result = cleanRows(rows, 'Email');

    expect(result.metrics.finalRows).toBe(2);
    expect(result.cleanedRows).toEqual([
      { Name: 'Team', Email: 'a@x.com' },
      { Name: 'Team', Email: 'b@x.com' },
    ]);
  });

  it('trims whitespace and drops empty values, including a cell that is just a semicolon or null', () => {
    const rows = [
      { Name: 'Spacey', Email: ' a@x.com ; ; b@x.com ' },
      { Name: 'JustSemicolon', Email: ';' },
      { Name: 'NullEmail', Email: null },
      { Name: 'EmptyEmail', Email: '' },
    ];

    const result = cleanRows(rows, 'Email');

    expect(result.metrics.originalRows).toBe(4);
    expect(result.cleanedRows.map((r) => r.Email)).toEqual(['a@x.com', 'b@x.com']);
  });

  it('reports zero removed duplicates when every email is unique', () => {
    const rows = [{ Email: 'a@x.com' }, { Email: 'b@x.com' }];

    const result = cleanRows(rows, 'Email');

    expect(result.metrics.removedCount).toBe(0);
    expect(result.removedDuplicates).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/cleanEmails.test.js`
Expected: FAIL — Vitest cannot resolve `./cleanEmails` because `lib/cleanEmails.js` doesn't exist yet.

- [ ] **Step 3: Write minimal implementation**

```js
// lib/cleanEmails.js
export function cleanRows(rows, emailColumn) {
  const originalRows = rows.length;
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  const exploded = [];
  for (const row of rows) {
    const rawValue = row[emailColumn];
    if (rawValue === null || rawValue === undefined || rawValue === '') continue;
    const parts = String(rawValue).split(';');
    for (const part of parts) {
      const email = part.trim();
      if (email === '') continue;
      exploded.push({ ...row, [emailColumn]: email });
    }
  }

  const counts = new Map();
  for (const row of exploded) {
    const email = row[emailColumn];
    counts.set(email, (counts.get(email) || 0) + 1);
  }
  const removedDuplicates = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([email]) => email)
    .sort();

  const seen = new Set();
  const cleanedRows = [];
  for (const row of exploded) {
    const email = row[emailColumn];
    if (seen.has(email)) continue;
    seen.add(email);
    cleanedRows.push(row);
  }

  return {
    cleanedRows,
    headers,
    metrics: {
      originalRows,
      finalRows: cleanedRows.length,
      removedCount: removedDuplicates.length,
    },
    removedDuplicates,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/cleanEmails.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/cleanEmails.js lib/cleanEmails.test.js
git commit -m "feat: add client-side email cleaning logic (port of v1 pandas dedupe)"
```

---

### Task 4: File parsing — `lib/parseFile.js`

**Files:**
- Create: `lib/parseFile.js`
- Test: `lib/parseFile.test.js`

**Interfaces:**
- Consumes: `papaparse` (default export `Papa`), `xlsx` (`import * as XLSX from 'xlsx'`) — both already installed as dependencies.
- Produces: `parseCSV(text)` → `{ headers: Array<string>, rows: Array<Object> }`; `parseXLSXBuffer(arrayBuffer)` → `{ headers: Array<string>, rows: Array<Object> }`; `parseFile(file)` (async) → `Promise<{ headers, rows }>` — all from `lib/parseFile.js`. Later tasks (the `/clean` page) call `parseFile` with a browser `File` and feed `rows`/`headers` into `cleanRows` from Task 3.

- [ ] **Step 1: Write the failing test**

```js
// lib/parseFile.test.js
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseCSV, parseXLSXBuffer } from './parseFile';

// parseFile() itself just dispatches on a browser File's .text()/.arrayBuffer()
// methods to parseCSV/parseXLSXBuffer below. Mocking the File API here would
// add no real coverage, so it's intentionally left to browser/component-level
// testing in a later task rather than unit-tested in isolation.

describe('parseCSV', () => {
  it('parses headers and rows from CSV text', () => {
    const csv = 'Name,Email\nAlice,a@x.com\nBob,b@x.com';

    const result = parseCSV(csv);

    expect(result.headers).toEqual(['Name', 'Email']);
    expect(result.rows).toEqual([
      { Name: 'Alice', Email: 'a@x.com' },
      { Name: 'Bob', Email: 'b@x.com' },
    ]);
  });
});

describe('parseXLSXBuffer', () => {
  it('parses headers and rows from a real XLSX workbook buffer (round-trip)', () => {
    const worksheet = XLSX.utils.json_to_sheet([
      { Name: 'Alice', Email: 'a@x.com' },
      { Name: 'Bob', Email: 'b@x.com' },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

    const result = parseXLSXBuffer(buffer);

    expect(result.headers).toEqual(['Name', 'Email']);
    expect(result.rows).toEqual([
      { Name: 'Alice', Email: 'a@x.com' },
      { Name: 'Bob', Email: 'b@x.com' },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/parseFile.test.js`
Expected: FAIL — Vitest cannot resolve `./parseFile` because `lib/parseFile.js` doesn't exist yet.

- [ ] **Step 3: Write minimal implementation**

```js
// lib/parseFile.js
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export function parseCSV(text) {
  const { data, meta } = Papa.parse(text, { header: true, skipEmptyLines: true });
  return { headers: meta.fields || [], rows: data };
}

export function parseXLSXBuffer(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

export async function parseFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    const text = await file.text();
    return parseCSV(text);
  }
  if (name.endsWith('.xlsx')) {
    const buffer = await file.arrayBuffer();
    return parseXLSXBuffer(buffer);
  }
  throw new Error('Unsupported file type. Please use CSV or XLSX.');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/parseFile.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/parseFile.js lib/parseFile.test.js
git commit -m "feat: add client-side CSV/XLSX parsing (papaparse + xlsx)"
```

---

### Task 5: Word document generation — `lib/generateDocx.js`

**Files:**
- Create: `lib/generateDocx.js`
- Test: `lib/generateDocx.test.js`

**Interfaces:**
- Consumes: `docx` package (`Document`, `Packer`, `Paragraph`) — already installed as a dependency.
- Produces: `createTemplateDocxBlob(body)` (async) → `Promise<Blob>`, from `lib/generateDocx.js`. Later tasks (the `/templates` page, Task 15) call this with a template's body text and pass the returned Blob straight to a download helper.

> **Fix applied during plan self-review:** the original draft of this task used `Packer.toBuffer(doc)`, which returns a Node.js `Buffer`. That would work in this task's own test (Vitest still runs inside a real Node process even under the `jsdom` test environment, so `Buffer` is available there) but would silently crash with "Buffer is not defined" the first time this function actually ran in a real browser via Task 15's client component — Next.js does not polyfill Node's `Buffer` on the client. `Packer.toBlob()` is the browser-safe equivalent and is used below instead.

- [ ] **Step 1: Write the failing test**

```js
// lib/generateDocx.test.js
import { describe, it, expect } from 'vitest';
import { createTemplateDocxBlob } from './generateDocx';

describe('createTemplateDocxBlob', () => {
  // A full docx-schema validation is overkill for this project's scale.
  // A .docx file is a ZIP archive, so asserting the blob is non-empty
  // and starts with the ZIP magic bytes ("PK") is a pragmatic smoke test
  // that catches "the generator is completely broken" without needing
  // to unzip and parse document.xml.
  it('produces a non-empty blob starting with the ZIP magic bytes', async () => {
    const blob = await createTemplateDocxBlob("Dear [Attorney's Name],\n\nHello.");

    expect(blob.size).toBeGreaterThan(0);

    const buffer = new Uint8Array(await blob.arrayBuffer());
    expect(buffer[0]).toBe(0x50); // 'P'
    expect(buffer[1]).toBe(0x4b); // 'K'
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/generateDocx.test.js`
Expected: FAIL — Vitest cannot resolve `./generateDocx` because `lib/generateDocx.js` doesn't exist yet.

- [ ] **Step 3: Write minimal implementation**

```js
// lib/generateDocx.js
import { Document, Packer, Paragraph } from 'docx';

export async function createTemplateDocxBlob(body) {
  const doc = new Document({
    sections: [{ children: [new Paragraph(body)] }],
  });
  return Packer.toBlob(doc);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/generateDocx.test.js`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add lib/generateDocx.js lib/generateDocx.test.js
git commit -m "feat: add client-side .docx generation for mail merge templates"
```

---

### Task 6: Supabase client wrappers — `lib/supabaseClient.js` and `lib/supabaseAdmin.js`

**Files:**
- Create: `lib/supabaseClient.js`
- Create: `lib/supabaseAdmin.js`

**Interfaces:**
- Produces: `supabase` (named export, browser-safe Supabase client, read-only per RLS) from `lib/supabaseClient.js`; `getSupabaseAdmin()` (named export, factory returning a service-role Supabase client) from `lib/supabaseAdmin.js`. Later tasks (7, 9, 10, 11) import these directly.

- [ ] **Step 1: Create the browser-safe client**

```js
// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
```

- [ ] **Step 2: Create the server-only admin client factory**

```js
// lib/supabaseAdmin.js
import { createClient } from '@supabase/supabase-js';

// Bypasses Row Level Security entirely via the service-role key.
// Import this ONLY in app/api/**/route.js files — never in any file
// that ships to the browser.
export function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}
```

- [ ] **Step 3: No dedicated automated test for this task**

This is trivial factory/wiring code with no branching logic of its own — it's exercised indirectly through the mocked tests in Tasks 8, 9, and 10, which mock `getSupabaseAdmin`/`supabase` rather than hitting real Supabase. This is a deliberate scope decision, not a placeholder.

- [ ] **Step 4: Manually verify no import errors**

Run: `npm run dev`
Expected: server starts cleanly with no module-resolution or import errors printed to the terminal. Load `http://localhost:3000` in a browser and check the console for errors — there should be none related to these two files (the app doesn't use them yet, so this just confirms they parse and resolve).

- [ ] **Step 5: Commit**

```bash
git add lib/supabaseClient.js lib/supabaseAdmin.js
git commit -m "feat: add Supabase browser and admin client wrappers"
```

---

### Task 7: Metrics client helpers — `lib/metrics.js` (session id + event recording)

**Files:**
- Create: `lib/metrics.js`
- Test: `lib/metrics.test.js`

**Interfaces:**
- Consumes: none.
- Produces: `getOrCreateSessionId()` and `recordEvent(payload)` (named exports). Task 9 appends `fetchMetricsTotals()`/`subscribeMetricsTotals()` to this same file. Task 12's `SessionTracker` and the `/clean` page (Task 14) call `getOrCreateSessionId()`/`recordEvent()`.

- [ ] **Step 1: Write the failing tests**

```js
// lib/metrics.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOrCreateSessionId, recordEvent } from './metrics';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('getOrCreateSessionId', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('generates and persists a session id on first call', () => {
    const id = getOrCreateSessionId();
    expect(id).toMatch(UUID_RE);
    expect(window.localStorage.getItem('mmc_session_id')).toBe(id);
  });

  it('returns the same id on subsequent calls', () => {
    const first = getOrCreateSessionId();
    const second = getOrCreateSessionId();
    expect(second).toBe(first);
  });
});

describe('recordEvent', () => {
  it('POSTs the payload to /api/metrics/record', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await recordEvent({ event_type: 'file_cleaned', rows_processed: 5, session_id: 'abc' });

    expect(fetchMock).toHaveBeenCalledWith('/api/metrics/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'file_cleaned', rows_processed: 5, session_id: 'abc' }),
    });
  });

  it('swallows fetch errors without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    await expect(
      recordEvent({ event_type: 'session_started', session_id: 'abc' })
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/metrics.test.js`
Expected: FAIL with "Failed to resolve import './metrics'" or similar (the module doesn't exist yet).

- [ ] **Step 3: Write the implementation**

```js
// lib/metrics.js
const SESSION_STORAGE_KEY = 'mmc_session_id';

export function getOrCreateSessionId() {
  if (typeof window === 'undefined') return null;
  let id = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(SESSION_STORAGE_KEY, id);
  }
  return id;
}

export async function recordEvent(payload) {
  try {
    await fetch('/api/metrics/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('metrics recordEvent failed (ignored):', err);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/metrics.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/metrics.js lib/metrics.test.js
git commit -m "feat: add session id and event recording metrics helpers"
```

---

### Task 8: Metrics recording API route — `app/api/metrics/record/route.js`

**Files:**
- Create: `app/api/metrics/record/route.js`
- Test: `app/api/metrics/record/route.test.js`

**Interfaces:**
- Consumes: `getSupabaseAdmin()` from `@/lib/supabaseAdmin` (Task 6).
- Produces: `POST` handler at `/api/metrics/record`, called by `recordEvent()` (Task 7) from the browser.

- [ ] **Step 1: Write the failing tests**

```js
// app/api/metrics/record/route.test.js
// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { POST } from './route';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

vi.mock('@/lib/supabaseAdmin', () => ({
  getSupabaseAdmin: vi.fn(),
}));

function makeRequest(body) {
  return new Request('http://localhost/api/metrics/record', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/metrics/record', () => {
  it('inserts a valid file_cleaned event and returns 200', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    getSupabaseAdmin.mockReturnValue({ from: () => ({ insert }) });

    const response = await POST(makeRequest({
      tool: 'clean',
      event_type: 'file_cleaned',
      rows_processed: 42,
      session_id: '11111111-1111-1111-1111-111111111111',
    }));

    expect(response.status).toBe(200);
    expect(insert).toHaveBeenCalledWith({
      tool: 'clean',
      event_type: 'file_cleaned',
      rows_processed: 42,
      session_id: '11111111-1111-1111-1111-111111111111',
    });
  });

  it('rejects an unknown event_type with 400', async () => {
    const response = await POST(makeRequest({
      event_type: 'bogus',
      session_id: '11111111-1111-1111-1111-111111111111',
    }));
    expect(response.status).toBe(400);
  });

  it('rejects an out-of-range rows_processed with 400', async () => {
    const response = await POST(makeRequest({
      event_type: 'file_cleaned',
      rows_processed: -1,
      session_id: '11111111-1111-1111-1111-111111111111',
    }));
    expect(response.status).toBe(400);
  });

  it('rejects a malformed session_id with 400', async () => {
    const response = await POST(makeRequest({
      event_type: 'session_started',
      session_id: 'not-a-uuid',
    }));
    expect(response.status).toBe(400);
  });

  it('treats a duplicate session_started unique violation as success', async () => {
    const insert = vi.fn().mockResolvedValue({ error: { code: '23505' } });
    getSupabaseAdmin.mockReturnValue({ from: () => ({ insert }) });

    const response = await POST(makeRequest({
      event_type: 'session_started',
      session_id: '11111111-1111-1111-1111-111111111111',
    }));
    expect(response.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/api/metrics/record/route.test.js`
Expected: FAIL (`route.js` doesn't exist yet)

- [ ] **Step 3: Write the implementation**

```js
// app/api/metrics/record/route.js
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const ALLOWED_EVENT_TYPES = ['file_cleaned', 'session_started'];
const MAX_ROWS_PROCESSED = 1000000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { event_type, rows_processed, session_id, tool } = body;

  if (!ALLOWED_EVENT_TYPES.includes(event_type)) {
    return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 });
  }
  if (typeof session_id !== 'string' || !UUID_REGEX.test(session_id)) {
    return NextResponse.json({ error: 'Invalid session_id' }, { status: 400 });
  }
  if (
    rows_processed !== undefined &&
    rows_processed !== null &&
    (!Number.isInteger(rows_processed) || rows_processed < 0 || rows_processed > MAX_ROWS_PROCESSED)
  ) {
    return NextResponse.json({ error: 'rows_processed out of range' }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from('metrics_events').insert({
    tool: tool ?? null,
    event_type,
    rows_processed: rows_processed ?? null,
    session_id,
  });

  if (error && error.code !== '23505') {
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app/api/metrics/record/route.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/metrics/record/route.js app/api/metrics/record/route.test.js
git commit -m "feat: add metrics recording API route with validation"
```

---

### Task 9: Public totals + live counter — `lib/metrics.js` additions and `components/LiveStatsBanner.jsx`

**Files:**
- Modify: `lib/metrics.js` (append to the file from Task 7)
- Create: `components/LiveStatsBanner.jsx`
- Test: `components/LiveStatsBanner.test.jsx`

**Interfaces:**
- Consumes: `supabase` from `@/lib/supabaseClient` (Task 6).
- Produces: `fetchMetricsTotals()`, `subscribeMetricsTotals(onChange)` added to `lib/metrics.js`; default export `LiveStatsBanner` component, used by the hub homepage (Task 13).

- [ ] **Step 1: Append the totals functions to `lib/metrics.js`**

```js
// lib/metrics.js — add this import at the top and these two functions at the bottom
import { supabase } from './supabaseClient';

export async function fetchMetricsTotals() {
  const { data, error } = await supabase
    .from('metrics_totals')
    .select('files_cleaned, rows_processed, sessions')
    .single();
  if (error) throw error;
  return data;
}

export function subscribeMetricsTotals(onChange) {
  const channel = supabase
    .channel('metrics_totals_changes')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'metrics_totals' },
      (payload) => onChange(payload.new)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
```

No new tests are added to `lib/metrics.test.js` for these two functions — they are one-line delegations to a Supabase client with no branching logic of their own; their behavior is verified through the `LiveStatsBanner` component tests below, which mock them directly. This is a deliberate scope decision.

- [ ] **Step 2: Write the failing component tests**

```jsx
// components/LiveStatsBanner.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import LiveStatsBanner from './LiveStatsBanner';
import * as metrics from '@/lib/metrics';

vi.mock('@/lib/metrics', () => ({
  fetchMetricsTotals: vi.fn(),
  subscribeMetricsTotals: vi.fn(),
}));

describe('LiveStatsBanner', () => {
  it('renders the initially fetched totals', async () => {
    metrics.fetchMetricsTotals.mockResolvedValue({ files_cleaned: 3, rows_processed: 40, sessions: 2 });
    metrics.subscribeMetricsTotals.mockReturnValue(() => {});

    render(<LiveStatsBanner />);

    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Sessions recorded')).toBeInTheDocument();
  });

  it('updates when the realtime subscription fires', async () => {
    metrics.fetchMetricsTotals.mockResolvedValue({ files_cleaned: 3, rows_processed: 40, sessions: 2 });
    let capturedCallback;
    metrics.subscribeMetricsTotals.mockImplementation((cb) => {
      capturedCallback = cb;
      return () => {};
    });

    render(<LiveStatsBanner />);
    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());

    capturedCallback({ files_cleaned: 4, rows_processed: 55, sessions: 2 });

    await waitFor(() => expect(screen.getByText('4')).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run components/LiveStatsBanner.test.jsx`
Expected: FAIL (`LiveStatsBanner.jsx` doesn't exist yet)

- [ ] **Step 4: Write the component**

```jsx
// components/LiveStatsBanner.jsx
'use client';
import { useEffect, useState } from 'react';
import { fetchMetricsTotals, subscribeMetricsTotals } from '@/lib/metrics';

export default function LiveStatsBanner() {
  const [totals, setTotals] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchMetricsTotals()
      .then((data) => { if (!cancelled) setTotals(data); })
      .catch(() => {});
    const unsubscribe = subscribeMetricsTotals((data) => setTotals(data));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (!totals) return null;

  return (
    <div className="grid grid-cols-3 gap-4 text-center max-w-2xl mx-auto">
      <StatTile label="Files cleaned" value={totals.files_cleaned} />
      <StatTile label="Rows processed" value={totals.rows_processed} />
      <StatTile label="Sessions recorded" value={totals.sessions} />
    </div>
  );
}

function StatTile({ label, value }) {
  return (
    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
      <div className="text-3xl font-bold text-white">{value?.toLocaleString()}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run components/LiveStatsBanner.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/metrics.js components/LiveStatsBanner.jsx components/LiveStatsBanner.test.jsx
git commit -m "feat: add public live stats counter with realtime updates"
```

---

### Task 10: Templates API routes with default-template protection — `app/api/templates/route.js` and `app/api/templates/[id]/route.js`

**Files:**
- Create: `app/api/templates/route.js`
- Create: `app/api/templates/[id]/route.js`
- Test: `app/api/templates/route.test.js`
- Test: `app/api/templates/[id]/route.test.js`

**Interfaces:**
- Consumes: `getSupabaseAdmin()` from `@/lib/supabaseAdmin` (Task 6).
- Produces: `POST /api/templates`, `PUT /api/templates/[id]`, `DELETE /api/templates/[id]`, called by `lib/templates.js` (Task 11).

- [ ] **Step 1: Write the failing tests for `POST /api/templates`**

```js
// app/api/templates/route.test.js
// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { POST } from './route';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

vi.mock('@/lib/supabaseAdmin', () => ({
  getSupabaseAdmin: vi.fn(),
}));

function makeRequest(body) {
  return new Request('http://localhost/api/templates', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/templates', () => {
  it('creates a template and returns 201', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 7, title: 'New', subject: 'S', body: 'B' },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    getSupabaseAdmin.mockReturnValue({ from: () => ({ insert }) });

    const response = await POST(makeRequest({ title: 'New', subject: 'S', body: 'B' }));

    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledWith({ title: 'New', subject: 'S', body: 'B' });
  });

  it('rejects a request missing required fields with 400', async () => {
    const response = await POST(makeRequest({ title: 'New' }));
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/api/templates/route.test.js`
Expected: FAIL (`route.js` doesn't exist yet)

- [ ] **Step 3: Implement `app/api/templates/route.js`**

```js
// app/api/templates/route.js
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body || !body.title || !body.subject || !body.body) {
    return NextResponse.json({ error: 'title, subject, and body are required' }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('templates')
    .insert({ title: body.title, subject: body.subject, body: body.body })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app/api/templates/route.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the failing tests for `PUT`/`DELETE /api/templates/[id]`**

```js
// app/api/templates/[id]/route.test.js
// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { PUT, DELETE } from './route';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

vi.mock('@/lib/supabaseAdmin', () => ({
  getSupabaseAdmin: vi.fn(),
}));

function makePutRequest(body) {
  return new Request('http://localhost/api/templates/1', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest() {
  return new Request('http://localhost/api/templates/1', { method: 'DELETE' });
}

function mockSupabase({ existing, updateResult, deleteResult }) {
  const lookupSingle = vi.fn().mockResolvedValue({ data: existing });
  const lookupEq = vi.fn().mockReturnValue({ single: lookupSingle });
  const select = vi.fn().mockReturnValue({ eq: lookupEq });

  const updateSingle = vi.fn().mockResolvedValue(updateResult ?? { data: null, error: null });
  const updateSelect = vi.fn().mockReturnValue({ single: updateSingle });
  const updateEq = vi.fn().mockReturnValue({ select: updateSelect });
  const update = vi.fn().mockReturnValue({ eq: updateEq });

  const deleteEq = vi.fn().mockResolvedValue(deleteResult ?? { error: null });
  const del = vi.fn().mockReturnValue({ eq: deleteEq });

  return { from: vi.fn(() => ({ select, update, delete: del })), update };
}

describe('PUT /api/templates/[id]', () => {
  it('rejects updating a default template with 403 and never calls update', async () => {
    const admin = mockSupabase({ existing: { id: 1, is_default: true } });
    getSupabaseAdmin.mockReturnValue(admin);

    const response = await PUT(makePutRequest({ title: 'x', subject: 'x', body: 'x' }), { params: { id: '1' } });

    expect(response.status).toBe(403);
    expect(admin.update).not.toHaveBeenCalled();
  });

  it('updates a non-default template successfully', async () => {
    getSupabaseAdmin.mockReturnValue(mockSupabase({
      existing: { id: 2, is_default: false },
      updateResult: { data: { id: 2, title: 'New', subject: 'New', body: 'New' }, error: null },
    }));

    const response = await PUT(makePutRequest({ title: 'New', subject: 'New', body: 'New' }), { params: { id: '2' } });

    expect(response.status).toBe(200);
  });
});

describe('DELETE /api/templates/[id]', () => {
  it('rejects deleting a default template with 403', async () => {
    getSupabaseAdmin.mockReturnValue(mockSupabase({ existing: { id: 1, is_default: true } }));

    const response = await DELETE(makeDeleteRequest(), { params: { id: '1' } });

    expect(response.status).toBe(403);
  });

  it('deletes a non-default template successfully', async () => {
    getSupabaseAdmin.mockReturnValue(mockSupabase({ existing: { id: 2, is_default: false } }));

    const response = await DELETE(makeDeleteRequest(), { params: { id: '2' } });

    expect(response.status).toBe(204);
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npx vitest run "app/api/templates/[id]/route.test.js"`
Expected: FAIL (`route.js` doesn't exist yet)

- [ ] **Step 7: Implement `app/api/templates/[id]/route.js`**

```js
// app/api/templates/[id]/route.js
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

async function getTemplate(supabaseAdmin, id) {
  const { data } = await supabaseAdmin.from('templates').select('id, is_default').eq('id', id).single();
  return data;
}

export async function PUT(request, { params }) {
  const { id } = params;
  const body = await request.json().catch(() => null);
  if (!body || !body.title || !body.subject || !body.body) {
    return NextResponse.json({ error: 'title, subject, and body are required' }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const existing = await getTemplate(supabaseAdmin, id);
  if (!existing) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }
  if (existing.is_default) {
    return NextResponse.json({ error: 'This is a built-in template and cannot be changed.' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('templates')
    .update({ title: body.title, subject: body.subject, body: body.body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(request, { params }) {
  const { id } = params;
  const supabaseAdmin = getSupabaseAdmin();
  const existing = await getTemplate(supabaseAdmin, id);
  if (!existing) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }
  if (existing.is_default) {
    return NextResponse.json({ error: 'This is a built-in template and cannot be changed.' }, { status: 403 });
  }

  const { error } = await supabaseAdmin.from('templates').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run "app/api/templates/[id]/route.test.js"`
Expected: PASS (4 tests)

- [ ] **Step 9: Commit**

```bash
git add app/api/templates/route.js app/api/templates/route.test.js "app/api/templates/[id]/route.js" "app/api/templates/[id]/route.test.js"
git commit -m "feat: add template write API routes with default-template protection"
```

---

### Task 11: Templates client library — `lib/templates.js`

**Files:**
- Create: `lib/templates.js`
- Test: `lib/templates.test.js`

**Interfaces:**
- Consumes: `supabase` from `@/lib/supabaseClient` (Task 6); `/api/templates` and `/api/templates/[id]` routes (Task 10).
- Produces: `fetchTemplates()`, `createTemplate()`, `updateTemplate()`, `deleteTemplate()` (named exports), used by the `/templates` page (Task 15).

- [ ] **Step 1: Write the failing tests**

```js
// lib/templates.test.js
import { describe, it, expect, vi } from 'vitest';
import { createTemplate, updateTemplate } from './templates';

describe('updateTemplate', () => {
  it('throws the server error message on a 403 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'This is a built-in template and cannot be changed.' }),
    }));

    await expect(updateTemplate(1, { title: 'a', subject: 'b', body: 'c' }))
      .rejects.toThrow('This is a built-in template and cannot be changed.');
  });
});

describe('createTemplate', () => {
  it('returns the created template on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 5, title: 'New' }),
    }));

    const result = await createTemplate({ title: 'New', subject: 'S', body: 'B' });
    expect(result).toEqual({ id: 5, title: 'New' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/templates.test.js`
Expected: FAIL (`templates.js` doesn't exist yet)

- [ ] **Step 3: Write the implementation**

```js
// lib/templates.js
import { supabase } from './supabaseClient';

async function throwOnError(response) {
  const err = await response.json().catch(() => ({}));
  throw new Error(err.error || `Request failed with status ${response.status}`);
}

export async function fetchTemplates() {
  const { data, error } = await supabase.from('templates').select('*').order('id');
  if (error) throw error;
  return data;
}

export async function createTemplate({ title, subject, body }) {
  const response = await fetch('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, subject, body }),
  });
  if (!response.ok) await throwOnError(response);
  return response.json();
}

export async function updateTemplate(id, { title, subject, body }) {
  const response = await fetch(`/api/templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, subject, body }),
  });
  if (!response.ok) await throwOnError(response);
  return response.json();
}

export async function deleteTemplate(id) {
  const response = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
  if (!response.ok) await throwOnError(response);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/templates.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/templates.js lib/templates.test.js
git commit -m "feat: add templates client library"
```

---

### Task 12: Shared UI atoms, root layout, nav, and session tracking

**Files:**
- Create: `components/icons.jsx`
- Create: `components/ui.jsx`
- Create: `components/Nav.jsx`
- Create: `components/SessionTracker.jsx`
- Test: `components/SessionTracker.test.jsx`
- Modify: `app/layout.jsx`

**Interfaces:**
- Consumes: `lib/metrics.js` → `getOrCreateSessionId()`, `recordEvent(payload)` (Task 7).
- Produces: `components/icons.jsx` → named exports `UploadCloudIcon`, `FileIcon`, `DownloadIcon`, `PlusIcon`, `EditIcon`, `TrashIcon`, `XIcon` (each `(props) => <svg ...>`). `components/ui.jsx` → named exports `LoadingSpinner`, `PrimaryButton({onClick, isLoading, text, loadingText, icon, className, disabled})`, `ErrorDisplay({message})`, `Metric({label, value})`, `ToolCard({href, title, description, icon})`. `components/Nav.jsx` → default export, no props. `components/SessionTracker.jsx` → default export, no props, renders `null`. Tasks 13–16 import all of these by these exact names.

- [ ] **Step 1: Write the failing test for SessionTracker**

```jsx
// components/SessionTracker.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import SessionTracker from './SessionTracker';
import { getOrCreateSessionId, recordEvent } from '@/lib/metrics';

vi.mock('@/lib/metrics', () => ({
  getOrCreateSessionId: vi.fn(),
  recordEvent: vi.fn(),
}));

describe('SessionTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records a session_started event with the generated session id on mount', () => {
    getOrCreateSessionId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    render(<SessionTracker />);

    expect(getOrCreateSessionId).toHaveBeenCalled();
    expect(recordEvent).toHaveBeenCalledWith({
      event_type: 'session_started',
      session_id: '11111111-1111-1111-1111-111111111111',
    });
  });

  it('does not record an event when no session id is available', () => {
    getOrCreateSessionId.mockReturnValue(null);

    render(<SessionTracker />);

    expect(recordEvent).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/SessionTracker.test.jsx`
Expected: FAIL — `./SessionTracker` does not exist yet.

- [ ] **Step 3: Create `components/icons.jsx`**

```jsx
export const UploadCloudIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>;
export const FileIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>;
export const DownloadIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>;
export const PlusIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
export const EditIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>;
export const TrashIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
export const XIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
```

- [ ] **Step 4: Create `components/ui.jsx`**

```jsx
'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';

export const LoadingSpinner = () => (
  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export const PrimaryButton = ({ onClick, isLoading, text, loadingText, icon = null, className = 'bg-blue-600 hover:bg-blue-700', disabled = false }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    disabled={isLoading || disabled}
    className={`w-full mt-4 py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center disabled:bg-gray-600 disabled:cursor-not-allowed ${className}`}
  >
    {isLoading ? <><LoadingSpinner /> {loadingText}</> : <>{icon}{text}</>}
  </motion.button>
);

export const ErrorDisplay = ({ message }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-4 text-center text-red-400 bg-red-900/50 border border-red-800 rounded-lg whitespace-pre-wrap">
    {message}
  </motion.div>
);

export const Metric = ({ label, value }) => (
  <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
    <div className="text-3xl font-bold text-white">{value}</div>
    <div className="text-sm text-gray-400">{label}</div>
  </div>
);

export const ToolCard = ({ href, title, description, icon }) => (
  <Link href={href} className="block h-full">
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-800 shadow-2xl shadow-black/30 hover:border-blue-500 transition-colors h-full"
    >
      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </motion.div>
  </Link>
);
```

- [ ] **Step 5: Create `components/Nav.jsx`**

```jsx
'use client';
import Link from 'next/link';

export default function Nav() {
  return (
    <nav className="relative z-10 bg-slate-900/70 backdrop-blur border-b border-slate-800">
      <div className="container mx-auto max-w-4xl px-4 md:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="text-white font-bold text-lg">Mail Merge Pro</Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/clean" className="text-gray-300 hover:text-white transition-colors">Email Cleaner</Link>
          <Link href="/templates" className="text-gray-300 hover:text-white transition-colors">Templates</Link>
          <Link href="/tutorial" className="text-gray-300 hover:text-white transition-colors">Tutorial</Link>
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 6: Create `components/SessionTracker.jsx`**

```jsx
'use client';
import { useEffect } from 'react';
import { getOrCreateSessionId, recordEvent } from '@/lib/metrics';

export default function SessionTracker() {
  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    if (sessionId) {
      recordEvent({ event_type: 'session_started', session_id: sessionId });
    }
  }, []);

  return null;
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run components/SessionTracker.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 8: Replace `app/layout.jsx`**

```jsx
import './globals.css';
import Nav from '@/components/Nav';
import SessionTracker from '@/components/SessionTracker';

export const metadata = {
  title: 'Mail Merge Pro',
  description: 'A smarter, guided workflow for your mail merge campaigns.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen w-full bg-gray-900 text-gray-200 font-sans antialiased relative overflow-x-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-slate-900 to-blue-900/50"></div>
          <div className="absolute top-0 left-0 h-96 w-96 bg-blue-500/30 rounded-full filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute bottom-0 right-0 h-96 w-96 bg-purple-500/30 rounded-full filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
        <Nav />
        <SessionTracker />
        <div className="relative z-10 container mx-auto max-w-4xl p-4 md:p-8">
          {children}
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 9: Manually verify the layout**

Run: `npm run dev`, open `http://localhost:3000`. Confirm the nav bar, gradient/blob background, and page content wrapper all render with no console errors.

- [ ] **Step 10: Commit**

```bash
git add components/icons.jsx components/ui.jsx components/Nav.jsx components/SessionTracker.jsx components/SessionTracker.test.jsx app/layout.jsx
git commit -m "feat: add shared UI atoms, nav, root layout, and session tracking"
```

---

### Task 13: Hub homepage — `app/page.jsx`

**Files:**
- Create: `app/page.jsx`

**Interfaces:**
- Consumes: `components/LiveStatsBanner.jsx` (default export, no props — Task 9), `components/ui.jsx` → `ToolCard` (Task 12), `components/icons.jsx` → `UploadCloudIcon`, `FileIcon`, `DownloadIcon` (Task 12).
- Produces: nothing consumed by later tasks (leaf page).

- [ ] **Step 1: Create `app/page.jsx`**

```jsx
import LiveStatsBanner from '@/components/LiveStatsBanner';
import { ToolCard } from '@/components/ui';
import { UploadCloudIcon, FileIcon, DownloadIcon } from '@/components/icons';

export default function HomePage() {
  return (
    <div className="space-y-12">
      <header className="text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">Mail Merge Pro</h1>
        <p className="text-gray-400 mt-2">A smarter, guided workflow for your mail merge campaigns.</p>
      </header>

      <LiveStatsBanner />

      <div className="grid gap-6 md:grid-cols-3">
        <ToolCard
          href="/clean"
          title="Email Cleaner"
          description="Upload a list, dedupe emails, download a clean CSV."
          icon={<UploadCloudIcon className="w-5 h-5" />}
        />
        <ToolCard
          href="/templates"
          title="Template Builder"
          description="Manage your mail-merge email templates and export as Word docs."
          icon={<FileIcon className="w-5 h-5" />}
        />
        <ToolCard
          href="/tutorial"
          title="Tutorial"
          description="Step-by-step guide to running the mail merge in Outlook."
          icon={<DownloadIcon className="w-5 h-5" />}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manually verify**

Run: `npm run dev`, open `http://localhost:3000/`. Confirm the header, live stats banner (even showing zeros), and all three tool cards render and link to the correct routes.

- [ ] **Step 3: Commit**

```bash
git add app/page.jsx
git commit -m "feat: add hub homepage with tool cards and live stats banner"
```

---

### Task 14: Email Cleaner tool page — `app/clean/page.jsx`

**Files:**
- Create: `app/clean/page.jsx`
- Test: `app/clean/page.test.jsx`

**Interfaces:**
- Consumes: `lib/parseFile.js` → `parseFile(file)` async → `{headers, rows}` (Task 4); `lib/cleanEmails.js` → `cleanRows(rows, emailColumn)` sync → `{cleanedRows, headers, metrics:{originalRows, finalRows, removedCount}, removedDuplicates}` (Task 3); `lib/metrics.js` → `getOrCreateSessionId()`, `recordEvent(payload)` (Task 7); `components/ui.jsx` → `PrimaryButton`, `ErrorDisplay`, `Metric` (Task 12); `components/icons.jsx` → `UploadCloudIcon`, `FileIcon`, `DownloadIcon` (Task 12).
- Produces: nothing consumed by later tasks (leaf page).

- [ ] **Step 1: Write the failing test**

```jsx
// app/clean/page.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CleanPage from './page';
import { parseFile } from '@/lib/parseFile';
import { cleanRows } from '@/lib/cleanEmails';
import { getOrCreateSessionId, recordEvent } from '@/lib/metrics';

vi.mock('@/lib/parseFile', () => ({ parseFile: vi.fn() }));
vi.mock('@/lib/cleanEmails', () => ({ cleanRows: vi.fn() }));
vi.mock('@/lib/metrics', () => ({ getOrCreateSessionId: vi.fn(), recordEvent: vi.fn() }));

describe('CleanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() });
  });

  it('shows the column selector with parsed headers after a file is selected', async () => {
    parseFile.mockResolvedValue({ headers: ['Name', 'Email'], rows: [{ Name: 'A', Email: 'a@x.com' }] });

    render(<CleanPage />);

    const input = document.querySelector('input[type="file"]');
    const file = new File(['Name,Email\nA,a@x.com'], 'list.csv', { type: 'text/csv' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText('Select Email Column')).toBeInTheDocument());
    expect(screen.getByRole('option', { name: 'Email' })).toBeInTheDocument();
  });

  it('renders cleaning metrics after Analyze My List is clicked', async () => {
    parseFile.mockResolvedValue({ headers: ['Email'], rows: [{ Email: 'a@x.com' }] });
    cleanRows.mockReturnValue({
      cleanedRows: [{ Email: 'a@x.com' }],
      headers: ['Email'],
      metrics: { originalRows: 2, finalRows: 1, removedCount: 1 },
      removedDuplicates: ['a@x.com'],
    });

    render(<CleanPage />);
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [new File(['x'], 'list.csv', { type: 'text/csv' })] } });
    await waitFor(() => expect(screen.getByText('Select Email Column')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Analyze My List'));

    await waitFor(() => expect(screen.getByText('Original Rows')).toBeInTheDocument());
    expect(screen.getByText('Original Rows').closest('div').previousSibling).toHaveTextContent('2');
    expect(screen.getByText('Duplicates Removed').closest('div').previousSibling).toHaveTextContent('1');
    expect(screen.getByText('Final Recipients').closest('div').previousSibling).toHaveTextContent('1');
  });

  it('records a file_cleaned metrics event with the final row count on download', async () => {
    parseFile.mockResolvedValue({ headers: ['Email'], rows: [{ Email: 'a@x.com' }] });
    cleanRows.mockReturnValue({
      cleanedRows: [{ Email: 'a@x.com' }],
      headers: ['Email'],
      metrics: { originalRows: 1, finalRows: 1, removedCount: 0 },
      removedDuplicates: [],
    });
    getOrCreateSessionId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    render(<CleanPage />);
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [new File(['x'], 'list.csv', { type: 'text/csv' })] } });
    await waitFor(() => expect(screen.getByText('Select Email Column')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Analyze My List'));
    await waitFor(() => expect(screen.getByText('Download Cleaned List (.csv)')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Download Cleaned List (.csv)'));

    expect(recordEvent).toHaveBeenCalledWith({
      tool: 'clean',
      event_type: 'file_cleaned',
      rows_processed: 1,
      session_id: '11111111-1111-1111-1111-111111111111',
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/clean/page.test.jsx`
Expected: FAIL — `./page` does not exist yet.

- [ ] **Step 3: Create `app/clean/page.jsx`**

```jsx
'use client';
import { useState, useRef } from 'react';
import { parseFile } from '@/lib/parseFile';
import { cleanRows } from '@/lib/cleanEmails';
import { getOrCreateSessionId, recordEvent } from '@/lib/metrics';
import { PrimaryButton, ErrorDisplay, Metric } from '@/components/ui';
import { UploadCloudIcon, FileIcon, DownloadIcon } from '@/components/icons';

const triggerDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowsToCsv(rows, headers) {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  return lines.join('\n');
}

export default function CleanPage() {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [selectedEmailColumn, setSelectedEmailColumn] = useState('');
  const [cleaningResult, setCleaningResult] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const resultsRef = useRef(null);

  const resetState = () => {
    setFile(null);
    setParsedData(null);
    setSelectedEmailColumn('');
    setCleaningResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return;
    resetState();
    setFile(selectedFile);
    try {
      const data = await parseFile(selectedFile);
      setParsedData(data);
      setSelectedEmailColumn(data.headers[0] || '');
    } catch (err) {
      setError(err.message);
      setFile(null);
    }
  };

  const handleAnalyze = () => {
    if (!parsedData || !selectedEmailColumn) return;
    try {
      const result = cleanRows(parsedData.rows, selectedEmailColumn);
      setCleaningResult(result);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDownload = () => {
    if (!cleaningResult) return;
    const csv = rowsToCsv(cleaningResult.cleanedRows, parsedData.headers);
    const blob = new Blob([csv], { type: 'text/csv' });
    const filename = `cleaned_${(file?.name || 'list').split('.')[0]}.csv`;
    triggerDownload(blob, filename);

    recordEvent({
      tool: 'clean',
      event_type: 'file_cleaned',
      rows_processed: cleaningResult.metrics.finalRows,
      session_id: getOrCreateSessionId(),
    });
  };

  return (
    <div className="space-y-8">
      <div className="bg-slate-900/50 backdrop-blur-xl p-6 md:p-8 rounded-2xl border border-slate-800 shadow-2xl shadow-black/30 space-y-6">
        <h2 className="text-2xl font-bold text-white">Email Cleaner</h2>

        <div
          className="relative p-8 border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-xl text-center cursor-pointer transition-colors duration-300"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files[0]); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center text-gray-400">
            <UploadCloudIcon className="w-12 h-12 mb-4" />
            <p className="font-semibold"><span className="text-blue-400">Click to upload</span> or drag and drop</p>
            <p className="text-sm">CSV or XLSX files supported</p>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileSelect(e.target.files[0])}
            className="hidden"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
          />
        </div>

        {file && (
          <div className="p-4 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileIcon className="w-6 h-6 text-gray-400" />
              <span className="font-medium text-white">{file.name}</span>
            </div>
            <button onClick={resetState} className="text-sm text-red-400 hover:text-red-300">Start Over</button>
          </div>
        )}

        {parsedData && parsedData.headers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Select Email Column</label>
            <select
              value={selectedEmailColumn}
              onChange={(e) => setSelectedEmailColumn(e.target.value)}
              className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              {parsedData.headers.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <PrimaryButton onClick={handleAnalyze} isLoading={false} text="Analyze My List" loadingText="Analyzing..." />
          </div>
        )}

        {error && <ErrorDisplay message={error} />}
      </div>

      {cleaningResult && (
        <div ref={resultsRef} className="bg-slate-900/50 backdrop-blur-xl p-6 md:p-8 rounded-2xl border border-slate-800 shadow-2xl shadow-black/30 space-y-6">
          <h2 className="text-2xl font-bold text-white">Review Cleaning Results</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <Metric label="Original Rows" value={cleaningResult.metrics.originalRows} />
            <Metric label="Duplicates Removed" value={cleaningResult.metrics.removedCount} />
            <Metric label="Final Recipients" value={cleaningResult.metrics.finalRows} />
          </div>
          {cleaningResult.removedDuplicates.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer font-medium text-blue-400 hover:text-blue-300">View Removed Duplicates Report</summary>
              <div className="mt-2 p-4 h-48 overflow-y-auto rounded-lg bg-gray-900/50 border border-gray-700 text-sm text-gray-400">
                <ul>{cleaningResult.removedDuplicates.map((email) => <li key={email}>{email}</li>)}</ul>
              </div>
            </details>
          )}
          <PrimaryButton
            onClick={handleDownload}
            isLoading={false}
            text="Download Cleaned List (.csv)"
            loadingText="Downloading..."
            icon={<DownloadIcon className="w-5 h-5 mr-2" />}
            className="bg-green-600 hover:bg-green-700"
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run app/clean/page.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/clean/page.jsx app/clean/page.test.jsx
git commit -m "feat: add client-side Email Cleaner tool page"
```

---

### Task 15: Template Builder tool page — `app/templates/page.jsx`, `components/TemplateModal.jsx`, `components/ConfirmationModal.jsx`

**Files:**
- Create: `components/TemplateModal.jsx`
- Create: `components/ConfirmationModal.jsx`
- Create: `app/templates/page.jsx`
- Test: `app/templates/page.test.jsx`

**Interfaces:**
- Consumes: `lib/templates.js` → `fetchTemplates()`, `createTemplate({title,subject,body})`, `updateTemplate(id,{title,subject,body})`, `deleteTemplate(id)` (Task 11, all async, all throw `Error(serverMessage)` on failure); `lib/generateDocx.js` → `createTemplateDocxBlob(body)` async → `Blob` (Task 5); `components/ui.jsx` → `PrimaryButton`, `ErrorDisplay`, `LoadingSpinner` (Task 12); `components/icons.jsx` → `PlusIcon`, `EditIcon`, `TrashIcon`, `DownloadIcon` (Task 12).
- Produces: `components/TemplateModal.jsx` → default export `({templateToEdit, onSave, onClose})`. `components/ConfirmationModal.jsx` → default export `({title, message, onConfirm, onCancel})`. Neither is consumed outside this task.

> **Note on `triggerDownload` duplication:** this task defines its own copy of the `triggerDownload(blob, filename)` helper, identical to the one in Task 14's `app/clean/page.jsx`. That's intentional, not an oversight — both pages are meant to be fully independent leaf pages per the spec, so neither imports from the other. A future cleanup could extract this into a shared `lib/download.js`, but that's out of scope for this plan.

- [ ] **Step 1: Write the failing test**

```jsx
// app/templates/page.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TemplatesPage from './page';
import { fetchTemplates, createTemplate, updateTemplate, deleteTemplate } from '@/lib/templates';
import { createTemplateDocxBlob } from '@/lib/generateDocx';

vi.mock('@/lib/templates', () => ({
  fetchTemplates: vi.fn(),
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
}));
vi.mock('@/lib/generateDocx', () => ({ createTemplateDocxBlob: vi.fn() }));

const DEFAULT_TEMPLATE = { id: 1, title: 'Default One', subject: 'S1', body: 'B1', is_default: true };
const CUSTOM_TEMPLATE = { id: 2, title: 'Custom One', subject: 'S2', body: 'B2', is_default: false };

describe('TemplatesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() });
  });

  it('disables edit/delete for the default template', async () => {
    fetchTemplates.mockResolvedValue([DEFAULT_TEMPLATE, CUSTOM_TEMPLATE]);

    render(<TemplatesPage />);

    await waitFor(() => expect(screen.getByText('Default One')).toBeInTheDocument());
    expect(screen.getByLabelText('Edit template')).toBeDisabled();
    expect(screen.getByLabelText('Delete template')).toBeDisabled();
  });

  it('creates a new template and refetches the list', async () => {
    fetchTemplates.mockResolvedValue([CUSTOM_TEMPLATE]);
    createTemplate.mockResolvedValue({ id: 3, title: 'New', subject: 'NS', body: 'NB', is_default: false });

    render(<TemplatesPage />);
    await waitFor(() => expect(screen.getByText('Custom One')).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('Create new template'));
    await waitFor(() => expect(screen.getByLabelText('Title')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New' } });
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'NS' } });
    fireEvent.change(screen.getByLabelText('Body'), { target: { value: 'NB' } });
    fireEvent.click(screen.getByText('Save Template'));

    await waitFor(() => expect(createTemplate).toHaveBeenCalledWith({ id: undefined, title: 'New', subject: 'NS', body: 'NB' }));
    expect(fetchTemplates).toHaveBeenCalledTimes(2);
  });

  it('generates a docx from the active template body on download', async () => {
    fetchTemplates.mockResolvedValue([CUSTOM_TEMPLATE]);
    createTemplateDocxBlob.mockResolvedValue(new Blob(['fake']));

    render(<TemplatesPage />);
    await waitFor(() => expect(screen.getByText('Custom One')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Download as Word Document (.docx)'));

    await waitFor(() => expect(createTemplateDocxBlob).toHaveBeenCalledWith('B2'));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/templates/page.test.jsx`
Expected: FAIL — `./page` does not exist yet.

- [ ] **Step 3: Create `components/TemplateModal.jsx`**

```jsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function TemplateModal({ templateToEdit, onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const bodyRef = useRef(null);

  useEffect(() => {
    setTitle(templateToEdit?.title || '');
    setSubject(templateToEdit?.subject || '');
    setBody(templateToEdit?.body || '');
  }, [templateToEdit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ id: templateToEdit?.id, title, subject, body });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-slate-800 rounded-xl p-8 w-full max-w-2xl border border-slate-700 max-h-full overflow-y-auto">
        <h3 className="text-xl font-bold mb-6">{templateToEdit ? 'Edit Template' : 'Create New Template'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="template-title" className="block text-sm font-medium text-gray-400 mb-1">Title</label>
            <input id="template-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg" />
          </div>
          <div>
            <label htmlFor="template-subject" className="block text-sm font-medium text-gray-400 mb-1">Subject</label>
            <input id="template-subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} required className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg" />
          </div>
          <div>
            <label htmlFor="template-body" className="block text-sm font-medium text-gray-400 mb-1">Body</label>
            <textarea id="template-body" ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} required rows="8" className="w-full p-2 bg-gray-900 border border-gray-600 rounded-lg font-mono text-sm" />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600">Cancel</motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700">Save Template</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
```

- [ ] **Step 4: Create `components/ConfirmationModal.jsx`**

```jsx
'use client';
import { motion } from 'framer-motion';

export default function ConfirmationModal({ title, message, onConfirm, onCancel }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-slate-800 rounded-xl p-8 w-full max-w-md border border-slate-700">
        <h3 className="text-xl font-bold mb-4">{title}</h3>
        <p className="text-gray-400 mb-6">{message}</p>
        <div className="flex justify-end gap-4">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600">Cancel</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700">Confirm</motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
```

- [ ] **Step 5: Create `app/templates/page.jsx`**

```jsx
'use client';
import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { fetchTemplates, createTemplate, updateTemplate, deleteTemplate } from '@/lib/templates';
import { createTemplateDocxBlob } from '@/lib/generateDocx';
import { PrimaryButton, ErrorDisplay, LoadingSpinner } from '@/components/ui';
import { PlusIcon, EditIcon, TrashIcon, DownloadIcon } from '@/components/icons';
import TemplateModal from '@/components/TemplateModal';
import ConfirmationModal from '@/components/ConfirmationModal';

// See the note above the Files block: this helper is intentionally
// duplicated from app/clean/page.jsx so each tool page stays independent.
const triggerDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await fetchTemplates();
      setTemplates(data);
      if (data.length > 0) {
        const currentActiveId = activeTemplate?.id ?? templateToEdit?.id ?? null;
        const currentActive = data.find((t) => t.id === currentActiveId);
        setActiveTemplate(currentActive || data[0]);
      } else {
        setActiveTemplate(null);
      }
    } catch (err) {
      setError('Failed to load templates.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTemplate = async (templateData) => {
    try {
      const saved = templateData.id
        ? await updateTemplate(templateData.id, templateData)
        : await createTemplate(templateData);
      await loadTemplates();
      setActiveTemplate(saved);
      setIsModalOpen(false);
      setTemplateToEdit(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTemplate = (id) => {
    if (!id) return;
    setTemplateToDelete(templates.find((t) => t.id === id));
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;
    try {
      await deleteTemplate(templateToDelete.id);
      setActiveTemplate(null);
      await loadTemplates();
    } catch (err) {
      alert(err.message);
    } finally {
      setShowDeleteConfirm(false);
      setTemplateToDelete(null);
    }
  };

  const handleDownloadWordDoc = async () => {
    if (!activeTemplate) return;
    setIsDownloading(true);
    setError(null);
    try {
      const blob = await createTemplateDocxBlob(activeTemplate.body);
      triggerDownload(blob, 'mail_merge_template.docx');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) return <div className="text-center p-8"><LoadingSpinner /></div>;

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl p-6 md:p-8 rounded-2xl border border-slate-800 shadow-2xl shadow-black/30 space-y-6">
      <h2 className="text-2xl font-bold text-white">Template Builder</h2>

      <div className="flex items-center justify-between gap-4">
        <select
          value={activeTemplate?.id || ''}
          onChange={(e) => setActiveTemplate(templates.find((t) => t.id === parseInt(e.target.value, 10)))}
          className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
        >
          {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button aria-label="Create new template" onClick={() => { setTemplateToEdit(null); setIsModalOpen(true); }} className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700">
            <PlusIcon />
          </button>
          <button
            aria-label="Edit template"
            onClick={() => { if (activeTemplate) { setTemplateToEdit(activeTemplate); setIsModalOpen(true); } }}
            disabled={!activeTemplate || activeTemplate.is_default}
            title={activeTemplate?.is_default ? 'Built-in template — cannot be edited' : undefined}
            className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed"
          >
            <EditIcon />
          </button>
          <button
            aria-label="Delete template"
            onClick={() => handleDeleteTemplate(activeTemplate?.id)}
            disabled={!activeTemplate || activeTemplate.is_default}
            title={activeTemplate?.is_default ? 'Built-in template — cannot be edited' : undefined}
            className="p-2 bg-red-800 rounded-lg hover:bg-red-700 disabled:bg-gray-800 disabled:cursor-not-allowed"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {activeTemplate ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Subject</label>
            <div className="w-full p-3 bg-gray-900/50 border border-gray-700 rounded-lg">{activeTemplate.subject}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Body</label>
            <div className="w-full p-3 h-48 overflow-y-auto bg-gray-900/50 border border-gray-700 rounded-lg font-mono text-sm whitespace-pre-wrap">{activeTemplate.body}</div>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 p-8">No template selected. Please create one.</div>
      )}

      <PrimaryButton
        onClick={handleDownloadWordDoc}
        isLoading={isDownloading}
        text="Download as Word Document (.docx)"
        loadingText="Creating Document..."
        icon={<DownloadIcon className="w-5 h-5 mr-2" />}
        className="bg-green-600 hover:bg-green-700"
        disabled={!activeTemplate}
      />

      {error && <ErrorDisplay message={error} />}

      <AnimatePresence>
        {isModalOpen && (
          <TemplateModal templateToEdit={templateToEdit} onSave={handleSaveTemplate} onClose={() => setIsModalOpen(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDeleteConfirm && (
          <ConfirmationModal
            title="Delete Template"
            message={`Are you sure you want to delete "${templateToDelete?.title}"? This action cannot be undone.`}
            onConfirm={confirmDelete}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run app/templates/page.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
git add components/TemplateModal.jsx components/ConfirmationModal.jsx app/templates/page.jsx app/templates/page.test.jsx
git commit -m "feat: add Template Builder tool page with default-template protection"
```

---

### Task 16: Tutorial page — `app/tutorial/page.jsx`

**Files:**
- Create: `app/tutorial/page.jsx`
- Create: `public/images/tutorial_step_1.png` through `public/images/tutorial_step_8.png` (copied)
- Create: `public/images/Step 6.mp4` (copied)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed by later tasks (leaf page).

- [ ] **Step 1: Copy the tutorial assets from v1**

```bash
mkdir -p public/images
cp "mail-merge-frontend/public/images/tutorial_step_1.png" public/images/
cp "mail-merge-frontend/public/images/tutorial_step_2.png" public/images/
cp "mail-merge-frontend/public/images/tutorial_step_3.png" public/images/
cp "mail-merge-frontend/public/images/tutorial_step_4.png" public/images/
cp "mail-merge-frontend/public/images/tutorial_step_5.png" public/images/
cp "mail-merge-frontend/public/images/tutorial_step_6.png" public/images/
cp "mail-merge-frontend/public/images/tutorial_step_7.png" public/images/
cp "mail-merge-frontend/public/images/tutorial_step_8.png" public/images/
cp "mail-merge-frontend/public/images/Step 6.mp4" "public/images/Step 6.mp4"
```

(The video is kept as an asset for a possible future embed on this page — not wired in yet; that's out of scope for this task.)

- [ ] **Step 2: Create `app/tutorial/page.jsx`**

```jsx
const steps = [
  { title: "Open Outlook", description: "Open the classic desktop app version of Outlook.", image: "/images/tutorial_step_1.png" },
  { title: "Prepare Your Spreadsheet", description: "Get your contact list ready in a CSV or XLSX file. If you're starting from scratch, use the 'Download Template Spreadsheet' button on our website to get a file with the correct headers. Add your data to it and save.", image: "/images/tutorial_step_2.png" },
  { title: "Upload and Clean Your List", description: "On our website, upload your spreadsheet in the 'Upload Your List' section. After it's analyzed, click 'Download Cleaned List' and save the new `cleaned_...` file.", image: "/images/tutorial_step_3.png" },
  { title: "Download Your Word Template", description: "Go to the 'Prepare Your Template' section on our website. Choose a template from the list and click 'Download as Word Document'.", image: "/images/tutorial_step_4.png" },
  { title: "Connect Your List in Word", description: "Open the downloaded Word document. Go to the 'Mailings' tab and click 'Select Recipients' > 'Use an Existing List...'. Find and select the `cleaned_...` file you just downloaded.", image: "/images/tutorial_step_5.png" },
  { title: "Insert Merge Fields", description: "In your Word document, click where you want personalized info (e.g., after 'Dear '). On the 'Mailings' tab, click 'Insert Merge Field' and choose a column name from your list (e.g., `First_Name`).", image: "/images/tutorial_step_6.png" },
  { title: "Finish & Merge", description: "Click 'Finish & Merge' and select 'Send Email Messages...'.", image: "/images/tutorial_step_7.png" },
  { title: "Send Your Emails", description: "In the final pop-up, set the 'To:' dropdown to your email column (e.g., `BCRI_Email_`). Add your subject line and click OK to send.", image: "/images/tutorial_step_8.png" },
];

export default function TutorialPage() {
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl p-6 md:p-8 rounded-2xl border border-slate-800 shadow-2xl shadow-black/30 space-y-10">
      <h2 className="text-2xl font-bold text-white">Mail Merge Tutorial</h2>
      {steps.map((step, index) => (
        <div key={index} className="flex flex-col md:flex-row items-start gap-6">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-600/30">{index + 1}</div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-white mb-1">{step.title}</h3>
            <p className="text-gray-400 mb-4">{step.description}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={step.image} alt={`Tutorial for ${step.title}`} className="w-full h-auto object-cover bg-gray-900/50 border border-gray-700 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Manually verify**

Run: `npm run dev`, open `http://localhost:3000/tutorial`. Confirm all 8 numbered steps render with their images loading (no broken-image icons).

- [ ] **Step 4: Commit**

```bash
git add app/tutorial/page.jsx public/images
git commit -m "feat: add standalone Tutorial page with v1 walkthrough assets"
```

---

### Task 17: Deploy to Vercel and retire v1

**Files:**
- Modify: Vercel project settings (external, no repo file — Framework Preset, Root Directory, Environment Variables)
- Delete: `mail-merge-frontend/`, `mail-merge-backend/`, `unsued/`, root `app.py`, root `backend commands.txt`

**Interfaces:**
- Consumes: everything from Tasks 1-16 — this is the final integration and cleanup task.
- Produces: a live, working v2 deployment; a repo with v1 fully removed, resolving the spec's open question in favor of "replace in place."

- [ ] **Step 1: Fix the Vercel project's build settings**

In the Vercel dashboard for the existing "mail-merge-cleaner" project (Settings → General → Build & Development Settings): confirm **Framework Preset** is set to "Next.js" and **Root Directory** is blank/the repo root — v1's setup may have pointed this at the `mail-merge-frontend` subfolder, which would break the v2 build since the Next.js app now lives at the repo root.

- [ ] **Step 2: Add the Supabase environment variables**

In Settings → Environment Variables, add all four (for both Production and Preview environments), using the real values from your `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

- [ ] **Step 3: Deploy**

Push the current branch (or run `vercel --prod` if using the Vercel CLI locally) and wait for the deployment to finish building.

- [ ] **Step 4: Manual QA pass on the live URL**

Work through this checklist on the actual deployed site (not localhost):
- Homepage loads, and the live stats banner shows real numbers (not stuck on nothing — confirms Supabase env vars and RLS are wired correctly in production).
- `/clean` — upload a real CSV with some duplicate emails, verify the dedupe metrics look right, download the cleaned CSV and open it to confirm the duplicates are actually gone.
- `/templates` — confirm all 6 seeded templates appear with Edit/Delete disabled; create a new template, edit it, delete it (all should work); download a `.docx` and open it in Word or LibreOffice to confirm it opens without a "repair" prompt (this specifically verifies the `Packer.toBlob()` fix from Task 5 works correctly in a real browser).
- `/tutorial` — confirm all 8 steps and their images render.
- Reload the homepage and confirm "Files cleaned" and "Rows processed" ticked up from the `/clean` action performed above — this proves the realtime counter works end-to-end in production, not just in local dev.

- [ ] **Step 5: Remove v1's leftovers**

Only after the QA pass above is green — v1's code and assets are no longer needed:

```bash
git rm -r mail-merge-frontend mail-merge-backend unsued
git rm app.py "backend commands.txt"
```

- [ ] **Step 6: Commit and push**

```bash
git commit -m "$(cat <<'EOF'
chore: remove v1 (Flask backend + Vite frontend) now that v2 is live

v2 (this Next.js app) fully replaces the old split repo layout. Verified
working in production first: cleaning, templates with default-template
protection, tutorial, and the live Supabase-backed stats counter.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
git push
```
