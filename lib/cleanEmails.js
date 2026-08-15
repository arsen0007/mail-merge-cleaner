export function cleanRows(rows, emailColumn) {
  const originalRows = rows.length;
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  const exploded = [];
  for (const row of rows) {
    const rawValue = row[emailColumn];
    if (rawValue === null || rawValue === undefined || rawValue === '') continue;
    const parts = String(rawValue).split(/[;,]/);
    for (const part of parts) {
      const email = part.trim();
      if (email === '') continue;
      exploded.push({ ...row, [emailColumn]: email });
    }
  }

  // Dedupe case-insensitively (email addresses are effectively
  // case-insensitive in practice) while keeping each row's original,
  // as-typed casing in the output.
  const counts = new Map();
  for (const row of exploded) {
    const key = row[emailColumn].toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const removedDuplicates = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([email]) => email)
    .sort();

  const seen = new Set();
  const cleanedRows = [];
  for (const row of exploded) {
    const key = row[emailColumn].toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleanedRows.push(row);
  }

  return {
    cleanedRows,
    headers,
    metrics: {
      originalRows,
      finalRows: cleanedRows.length,
      removedCount: removedDuplicates.length,
    },
    removedDuplicates,
  };
}
