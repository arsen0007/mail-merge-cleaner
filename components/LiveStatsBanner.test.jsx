// components/LiveStatsBanner.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import LiveStatsBanner from './LiveStatsBanner';
import * as metrics from '@/lib/metrics';

vi.mock('@/lib/metrics', () => ({
  fetchMetricsTotals: vi.fn(),
  subscribeMetricsTotals: vi.fn(),
}));

describe('LiveStatsBanner', () => {
  it('renders the initially fetched totals', async () => {
    metrics.fetchMetricsTotals.mockResolvedValue({ files_cleaned: 3, rows_processed: 40, sessions: 2 });
    metrics.subscribeMetricsTotals.mockReturnValue(() => {});

    render(<LiveStatsBanner />);

    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Sessions recorded')).toBeInTheDocument();
  });

  it('updates when the realtime subscription fires', async () => {
    metrics.fetchMetricsTotals.mockResolvedValue({ files_cleaned: 3, rows_processed: 40, sessions: 2 });
    let capturedCallback;
    metrics.subscribeMetricsTotals.mockImplementation((cb) => {
      capturedCallback = cb;
      return () => {};
    });

    render(<LiveStatsBanner />);
    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());

    capturedCallback({ files_cleaned: 4, rows_processed: 55, sessions: 2 });

    await waitFor(() => expect(screen.getByText('4')).toBeInTheDocument());
  });
});
