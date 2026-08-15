'use client';
import { useEffect } from 'react';
import { getOrCreateSessionId, recordEvent } from '@/lib/metrics';

export default function SessionTracker() {
  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    if (sessionId) {
      recordEvent({ event_type: 'session_started', session_id: sessionId });
    }
  }, []);

  return null;
}
