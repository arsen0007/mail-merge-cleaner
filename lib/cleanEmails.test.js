// lib/cleanEmails.test.js
import { describe, it, expect } from 'vitest';
import { cleanRows } from './cleanEmails';

describe('cleanRows', () => {
  it('removes exact duplicate emails, keeping the first occurrence', () => {
    const rows = [
      { Name: 'Alice', Email: 'a@x.com' },
      { Name: 'Alice Duplicate', Email: 'a@x.com' },
      { Name: 'Bob', Email: 'b@x.com' },
    ];

    const result = cleanRows(rows, 'Email');

    expect(result.metrics).toEqual({ originalRows: 3, finalRows: 2, removedCount: 1 });
    expect(result.removedDuplicates).toEqual(['a@x.com']);
    expect(result.cleanedRows.map((r) => r.Name)).toEqual(['Alice', 'Bob']);
  });

  it('splits multiple emails in one cell on semicolons and explodes into separate rows', () => {
    const rows = [{ Name: 'Team', Email: 'a@x.com;b@x.com' }];

    const result = cleanRows(rows, 'Email');

    expect(result.metrics.finalRows).toBe(2);
    expect(result.cleanedRows).toEqual([
      { Name: 'Team', Email: 'a@x.com' },
      { Name: 'Team', Email: 'b@x.com' },
    ]);
  });

  it('trims whitespace and drops empty values, including a cell that is just a semicolon or null', () => {
    const rows = [
      { Name: 'Spacey', Email: ' a@x.com ; ; b@x.com ' },
      { Name: 'JustSemicolon', Email: ';' },
      { Name: 'NullEmail', Email: null },
      { Name: 'EmptyEmail', Email: '' },
    ];

    const result = cleanRows(rows, 'Email');

    expect(result.metrics.originalRows).toBe(4);
    expect(result.cleanedRows.map((r) => r.Email)).toEqual(['a@x.com', 'b@x.com']);
  });

  it('reports zero removed duplicates when every email is unique', () => {
    const rows = [{ Email: 'a@x.com' }, { Email: 'b@x.com' }];

    const result = cleanRows(rows, 'Email');

    expect(result.metrics.removedCount).toBe(0);
    expect(result.removedDuplicates).toEqual([]);
  });
});
