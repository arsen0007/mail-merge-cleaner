// lib/templates.test.js
import { describe, it, expect, vi } from 'vitest';
import { createTemplate, updateTemplate } from './templates';

describe('updateTemplate', () => {
  it('throws the server error message on a 403 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'This is a built-in template and cannot be changed.' }),
    }));

    await expect(updateTemplate(1, { title: 'a', subject: 'b', body: 'c' }))
      .rejects.toThrow('This is a built-in template and cannot be changed.');
  });
});

describe('createTemplate', () => {
  it('returns the created template on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 5, title: 'New' }),
    }));

    const result = await createTemplate({ title: 'New', subject: 'S', body: 'B' });
    expect(result).toEqual({ id: 5, title: 'New' });
  });
});
