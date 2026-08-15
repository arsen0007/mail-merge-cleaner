export function cleanRows(rows, emailColumn) {
  const originalRows = rows.length;
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  const exploded = [];
  for (const row of rows) {
    const rawValue = row[emailColumn];
    if (rawValue === null || rawValue === undefined || rawValue === '') continue;
    const parts = String(rawValue).split(';');
    for (const part of parts) {
      const email = part.trim();
      if (email === '') continue;
      exploded.push({ ...row, [emailColumn]: email });
    }
  }

  const counts = new Map();
  for (const row of exploded) {
    const email = row[emailColumn];
    counts.set(email, (counts.get(email) || 0) + 1);
  }
  const removedDuplicates = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([email]) => email)
    .sort();

  const seen = new Set();
  const cleanedRows = [];
  for (const row of exploded) {
    const email = row[emailColumn];
    if (seen.has(email)) continue;
    seen.add(email);
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
