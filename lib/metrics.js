import { supabase } from './supabaseClient';

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
