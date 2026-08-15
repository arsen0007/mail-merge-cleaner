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

-- search_path is pinned to 'public' (rather than left mutable) per Supabase's
-- security linter: an unset search_path on a function is a hijacking vector
-- if a caller's session search_path is manipulated.
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
$trigger$ language plpgsql
set search_path = 'public';

create trigger metrics_events_bump
  after insert on metrics_events
  for each row execute function bump_metrics_totals();

alter table templates enable row level security;
alter table metrics_totals enable row level security;
alter table metrics_events enable row level security;

create policy templates_public_read on templates for select using (true);
create policy metrics_totals_public_read on metrics_totals for select using (true);

-- Enables Realtime replication for metrics_totals (equivalent to the
-- Database → Replication toggle in the Supabase dashboard).
alter publication supabase_realtime add table metrics_totals;

-- Seed the 6 default templates, transcribed verbatim from
-- mail-merge-backend/api.py's `default_templates` list (v1's SQLite seed).
-- These are the only rows with is_default = true, protected from
-- edit/delete by the /api/templates/[id] route (Task 10).
insert into templates (title, subject, body, is_default) values
($t$Version 1: Formal & Thorough$t$, $t$Recredentialing Request – Updated Information Needed$t$, $body$Dear [Attorney’s Name],

I hope this message finds you well. I’m reaching out on behalf of the Legal Provider Network at Workplace Options as part of our recredentialing efforts for participating attorneys.

To help us maintain accurate and up-to-date records, we kindly ask that you confirm or provide the following:
- A copy of your current professional liability insurance policy (declarations page is sufficient)
- Confirmation of your current contact information (email, phone, mailing address)
- Any updates regarding your practice areas or changes in staff involved in client intake and scheduling.

Your cooperation helps ensure continuity in referrals and supports our compliance standards. Please reply at your earliest convenience with the requested details, or reach out if you have any questions.$body$, true),
($t$Alternate Version 1A: Formal & Thorough$t$, $t$Request for Updated Credentials – Legal Network Profile$t$, $body$Dear [Attorney’s Name],

I hope this message finds you in good health and high spirits. I’m contacting you on behalf of the Workplace Options Legal Network as part of our periodic recredentialing process.

To ensure your profile remains active and up to date, we kindly ask you to review and share the following:
- A valid copy of your current professional liability insurance (declarations page is acceptable)
- A confirmation of your preferred contact details (email, phone number, mailing address)
- Any recent modifications to your practice areas or changes in staff involved in client scheduling or intake

This information allows us to maintain the integrity and reliability of our provider network. Your cooperation is appreciated, and we’re happy to assist with any questions you may have.$body$, true),
($t$Version 2: Friendly & Concise$t$, $t$Quick Check-In – Help Us Update Your Profile$t$, $body$Hi [Attorney’s Name],

Hope you're doing well! We're currently updating provider profiles for our legal network and just need a few quick items from you:
- A copy of your current liability insurance (declarations page is fine)
- Confirmation of your preferred contact information
- Any updates to your practice focus or support staff you'd like us to know about

Feel free to respond directly to this email. Let us know if you have any questions—we’re happy to help.$body$, true),
($t$Alternate Version 2A: Friendly & Concise$t$, $t$Just a Quick Update for Your Profile$t$, $body$Hi [Attorney’s Name],

I hope all’s going well with you! We’re refreshing our records and wanted to touch base to make sure we have the latest information on your profile.

Could you send us:
- A current copy of your liability insurance
- Your preferred contact information
- Any updates to your practice areas or team members who assist with calls or scheduling

It’ll only take a moment, and you can reply directly to this email.$body$, true),
($t$Version 3: Neutral & Direct$t$, $t$Follow-Up – Recredentialing Information Needed$t$, $body$Dear [Attorney’s Name],

We are following up regarding our request for updated information as part of our attorney network recredentialing.

To complete your profile review, we kindly need:
- A copy of your professional liability insurance policy
- Updated contact details
- Any changes to your practice areas or staff we should be aware of

Please respond at your earliest convenience. If we don’t receive a response after 3 attempts, we may need to temporarily pause referrals until your profile is complete.$body$, true),
($t$Alternate Version 3A: Neutral & Direct$t$, $t$Reminder: Information Needed to Complete Recredentialing$t$, $body$Dear [Attorney’s Name],

This is a quick reminder as part of our recredentialing project to ensure all provider records are accurate and current.

To finalize your profile, we still need the following:
- Updated professional liability insurance documentation
- Verified contact information
- Any revisions to your legal focus areas or office staff assisting with clients

If you’ve already submitted this, feel free to disregard. Otherwise, we’d appreciate your reply at your earliest convenience. After three outreach attempts, we may need to pause referrals until we can verify your information.$body$, true);
