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

  it('treats emails as duplicates case-insensitively, keeping the first occurrence as-typed', () => {
    // Found via a real 452-row production file: the same address appeared as
    // both "Josh@Johnsonschneider.com" and "josh@johnsonschneider.com" and
    // both rows survived the (previously case-sensitive) dedupe.
    const rows = [
      { Name: 'Josh', Email: 'Josh@Johnsonschneider.com' },
      { Name: 'Josh Duplicate', Email: 'josh@johnsonschneider.com' },
    ];

    const result = cleanRows(rows, 'Email');

    expect(result.metrics).toEqual({ originalRows: 2, finalRows: 1, removedCount: 1 });
    expect(result.cleanedRows).toEqual([{ Name: 'Josh', Email: 'Josh@Johnsonschneider.com' }]);
  });

  it('splits multiple emails in one cell on commas as well as semicolons', () => {
    // Found via a real production file: a cell with
    // "cmdouglas@wd-law.net, seanderson@wd-law.net" was left as a single
    // (invalid) recipient because the splitter only recognized semicolons.
    const rows = [{ Name: 'Pair', Email: 'a@x.com, b@x.com' }];

    const result = cleanRows(rows, 'Email');

    expect(result.metrics.finalRows).toBe(2);
    expect(result.cleanedRows).toEqual([
      { Name: 'Pair', Email: 'a@x.com' },
      { Name: 'Pair', Email: 'b@x.com' },
    ]);
  });
});
