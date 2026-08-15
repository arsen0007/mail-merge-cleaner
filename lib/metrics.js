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
