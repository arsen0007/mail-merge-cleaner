// app/api/templates/[id]/route.test.js
// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { PUT, DELETE } from './route';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

vi.mock('@/lib/supabaseAdmin', () => ({
  getSupabaseAdmin: vi.fn(),
}));

function makePutRequest(body) {
  return new Request('http://localhost/api/templates/1', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest() {
  return new Request('http://localhost/api/templates/1', { method: 'DELETE' });
}

function mockSupabase({ existing, updateResult, deleteResult }) {
  const lookupSingle = vi.fn().mockResolvedValue({ data: existing });
  const lookupEq = vi.fn().mockReturnValue({ single: lookupSingle });
  const select = vi.fn().mockReturnValue({ eq: lookupEq });

  const updateSingle = vi.fn().mockResolvedValue(updateResult ?? { data: null, error: null });
  const updateSelect = vi.fn().mockReturnValue({ single: updateSingle });
  const updateEq = vi.fn().mockReturnValue({ select: updateSelect });
  const update = vi.fn().mockReturnValue({ eq: updateEq });

  const deleteEq = vi.fn().mockResolvedValue(deleteResult ?? { error: null });
  const del = vi.fn().mockReturnValue({ eq: deleteEq });

  return { from: vi.fn(() => ({ select, update, delete: del })), update };
}

describe('PUT /api/templates/[id]', () => {
  it('rejects updating a default template with 403 and never calls update', async () => {
    const admin = mockSupabase({ existing: { id: 1, is_default: true } });
    getSupabaseAdmin.mockReturnValue(admin);

    const response = await PUT(makePutRequest({ title: 'x', subject: 'x', body: 'x' }), { params: { id: '1' } });

    expect(response.status).toBe(403);
    expect(admin.update).not.toHaveBeenCalled();
  });

  it('updates a non-default template successfully', async () => {
    getSupabaseAdmin.mockReturnValue(mockSupabase({
      existing: { id: 2, is_default: false },
      updateResult: { data: { id: 2, title: 'New', subject: 'New', body: 'New' }, error: null },
    }));

    const response = await PUT(makePutRequest({ title: 'New', subject: 'New', body: 'New' }), { params: { id: '2' } });

    expect(response.status).toBe(200);
  });
});

describe('DELETE /api/templates/[id]', () => {
  it('rejects deleting a default template with 403', async () => {
    getSupabaseAdmin.mockReturnValue(mockSupabase({ existing: { id: 1, is_default: true } }));

    const response = await DELETE(makeDeleteRequest(), { params: { id: '1' } });

    expect(response.status).toBe(403);
  });

  it('deletes a non-default template successfully', async () => {
    getSupabaseAdmin.mockReturnValue(mockSupabase({ existing: { id: 2, is_default: false } }));

    const response = await DELETE(makeDeleteRequest(), { params: { id: '2' } });

    expect(response.status).toBe(204);
  });
});
