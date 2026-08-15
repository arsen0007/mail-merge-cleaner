// app/clean/page.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CleanPage from './page';
import { parseFile } from '@/lib/parseFile';
import { cleanRows } from '@/lib/cleanEmails';
import { getOrCreateSessionId, recordEvent } from '@/lib/metrics';

vi.mock('@/lib/parseFile', () => ({ parseFile: vi.fn() }));
vi.mock('@/lib/cleanEmails', () => ({ cleanRows: vi.fn() }));
vi.mock('@/lib/metrics', () => ({ getOrCreateSessionId: vi.fn(), recordEvent: vi.fn() }));

describe('CleanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() });
  });

  it('shows the column selector with parsed headers after a file is selected', async () => {
    parseFile.mockResolvedValue({ headers: ['Name', 'Email'], rows: [{ Name: 'A', Email: 'a@x.com' }] });

    render(<CleanPage />);

    const input = document.querySelector('input[type="file"]');
    const file = new File(['Name,Email\nA,a@x.com'], 'list.csv', { type: 'text/csv' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText('Select Email Column')).toBeInTheDocument());
    expect(screen.getByRole('option', { name: 'Email' })).toBeInTheDocument();
  });

  it('renders cleaning metrics after Analyze My List is clicked', async () => {
    parseFile.mockResolvedValue({ headers: ['Email'], rows: [{ Email: 'a@x.com' }] });
    cleanRows.mockReturnValue({
      cleanedRows: [{ Email: 'a@x.com' }],
      headers: ['Email'],
      metrics: { originalRows: 2, finalRows: 1, removedCount: 1 },
      removedDuplicates: ['a@x.com'],
    });

    render(<CleanPage />);
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [new File(['x'], 'list.csv', { type: 'text/csv' })] } });
    await waitFor(() => expect(screen.getByText('Select Email Column')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Analyze My List'));

    await waitFor(() => expect(screen.getByText('Original Rows')).toBeInTheDocument());
    expect(screen.getByText('Original Rows').closest('div').previousSibling).toHaveTextContent('2');
    expect(screen.getByText('Duplicates Removed').closest('div').previousSibling).toHaveTextContent('1');
    expect(screen.getByText('Final Recipients').closest('div').previousSibling).toHaveTextContent('1');
  });

  it('records a file_cleaned metrics event with the final row count on download', async () => {
    parseFile.mockResolvedValue({ headers: ['Email'], rows: [{ Email: 'a@x.com' }] });
    cleanRows.mockReturnValue({
      cleanedRows: [{ Email: 'a@x.com' }],
      headers: ['Email'],
      metrics: { originalRows: 1, finalRows: 1, removedCount: 0 },
      removedDuplicates: [],
    });
    getOrCreateSessionId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    render(<CleanPage />);
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [new File(['x'], 'list.csv', { type: 'text/csv' })] } });
    await waitFor(() => expect(screen.getByText('Select Email Column')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Analyze My List'));
    await waitFor(() => expect(screen.getByText('Download Cleaned List (.csv)')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Download Cleaned List (.csv)'));

    expect(recordEvent).toHaveBeenCalledWith({
      tool: 'clean',
      event_type: 'file_cleaned',
      rows_processed: 1,
      session_id: '11111111-1111-1111-1111-111111111111',
    });
  });
});
