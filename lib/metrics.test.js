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
