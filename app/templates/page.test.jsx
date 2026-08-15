// app/templates/page.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TemplatesPage from './page';
import { fetchTemplates, createTemplate, updateTemplate, deleteTemplate } from '@/lib/templates';
import { createTemplateDocxBlob } from '@/lib/generateDocx';

vi.mock('@/lib/templates', () => ({
  fetchTemplates: vi.fn(),
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
}));
vi.mock('@/lib/generateDocx', () => ({ createTemplateDocxBlob: vi.fn() }));

const DEFAULT_TEMPLATE = { id: 1, title: 'Default One', subject: 'S1', body: 'B1', is_default: true };
const CUSTOM_TEMPLATE = { id: 2, title: 'Custom One', subject: 'S2', body: 'B2', is_default: false };

describe('TemplatesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() });
  });

  it('disables edit/delete for the default template', async () => {
    fetchTemplates.mockResolvedValue([DEFAULT_TEMPLATE, CUSTOM_TEMPLATE]);

    render(<TemplatesPage />);

    await waitFor(() => expect(screen.getByText('Default One')).toBeInTheDocument());
    expect(screen.getByLabelText('Edit template')).toBeDisabled();
    expect(screen.getByLabelText('Delete template')).toBeDisabled();
  });

  it('creates a new template and refetches the list', async () => {
    fetchTemplates.mockResolvedValue([CUSTOM_TEMPLATE]);
    createTemplate.mockResolvedValue({ id: 3, title: 'New', subject: 'NS', body: 'NB', is_default: false });

    render(<TemplatesPage />);
    await waitFor(() => expect(screen.getByText('Custom One')).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('Create new template'));
    await waitFor(() => expect(screen.getByLabelText('Title')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New' } });
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'NS' } });
    fireEvent.change(screen.getByLabelText('Body'), { target: { value: 'NB' } });
    fireEvent.click(screen.getByText('Save Template'));

    await waitFor(() => expect(createTemplate).toHaveBeenCalledWith({ id: undefined, title: 'New', subject: 'NS', body: 'NB' }));
    expect(fetchTemplates).toHaveBeenCalledTimes(2);
  });

  it('generates a docx from the active template body on download', async () => {
    fetchTemplates.mockResolvedValue([CUSTOM_TEMPLATE]);
    createTemplateDocxBlob.mockResolvedValue(new Blob(['fake']));

    render(<TemplatesPage />);
    await waitFor(() => expect(screen.getByText('Custom One')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Download as Word Document (.docx)'));

    await waitFor(() => expect(createTemplateDocxBlob).toHaveBeenCalledWith('B2'));
  });
});
