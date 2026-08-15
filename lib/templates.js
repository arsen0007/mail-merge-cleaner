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
