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
