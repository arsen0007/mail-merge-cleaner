'use client';
import { useEffect, useState } from 'react';
import { fetchMetricsTotals, subscribeMetricsTotals } from '@/lib/metrics';

export default function LiveStatsBanner() {
  const [totals, setTotals] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchMetricsTotals()
      .then((data) => { if (!cancelled) setTotals(data); })
      .catch(() => {});
    const unsubscribe = subscribeMetricsTotals((data) => setTotals(data));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (!totals) return null;

  return (
    <div className="grid grid-cols-3 divide-x divide-line border border-line rounded-sm bg-paper-raised max-w-2xl">
      <StatTile label="Files cleaned" value={totals.files_cleaned} />
      <StatTile label="Rows processed" value={totals.rows_processed} />
      <StatTile label="Sessions recorded" value={totals.sessions} />
    </div>
  );
}

function StatTile({ label, value }) {
  return (
    <div className="p-4 text-center">
      <div className="text-2xl font-mono font-bold text-ink tabular-nums">{value?.toLocaleString()}</div>
      <div className="text-[11px] uppercase tracking-[0.12em] text-ink-soft mt-1">{label}</div>
    </div>
  );
}
