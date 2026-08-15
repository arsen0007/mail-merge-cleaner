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
