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
    <div className="grid grid-cols-3 gap-4 text-center max-w-2xl mx-auto">
      <StatTile label="Files cleaned" value={totals.files_cleaned} />
      <StatTile label="Rows processed" value={totals.rows_processed} />
      <StatTile label="Sessions recorded" value={totals.sessions} />
    </div>
  );
}

function StatTile({ label, value }) {
  return (
    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
      <div className="text-3xl font-bold text-white">{value?.toLocaleString()}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}
