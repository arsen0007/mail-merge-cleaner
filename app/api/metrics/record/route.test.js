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
