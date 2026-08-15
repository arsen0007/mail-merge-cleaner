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
