// components/SessionTracker.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import SessionTracker from './SessionTracker';
import { getOrCreateSessionId, recordEvent } from '@/lib/metrics';

vi.mock('@/lib/metrics', () => ({
  getOrCreateSessionId: vi.fn(),
  recordEvent: vi.fn(),
}));

describe('SessionTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records a session_started event with the generated session id on mount', () => {
    getOrCreateSessionId.mockReturnValue('11111111-1111-1111-1111-111111111111');

    render(<SessionTracker />);

    expect(getOrCreateSessionId).toHaveBeenCalled();
    expect(recordEvent).toHaveBeenCalledWith({
      event_type: 'session_started',
      session_id: '11111111-1111-1111-1111-111111111111',
    });
  });

  it('does not record an event when no session id is available', () => {
    getOrCreateSessionId.mockReturnValue(null);

    render(<SessionTracker />);

    expect(recordEvent).not.toHaveBeenCalled();
  });
});
