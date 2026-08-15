import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

async function getTemplate(supabaseAdmin, id) {
  const { data } = await supabaseAdmin.from('templates').select('id, is_default').eq('id', id).single();
  return data;
}

export async function PUT(request, { params }) {
  const { id } = await params;
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
  const { id } = await params;
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
