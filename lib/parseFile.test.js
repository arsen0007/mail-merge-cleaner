// lib/parseFile.test.js
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseCSV, parseXLSXBuffer } from './parseFile';

// parseFile() itself just dispatches on a browser File's .text()/.arrayBuffer()
// methods to parseCSV/parseXLSXBuffer below. Mocking the File API here would
// add no real coverage, so it's intentionally left to browser/component-level
// testing in a later task rather than unit-tested in isolation.

describe('parseCSV', () => {
  it('parses headers and rows from CSV text', () => {
    const csv = 'Name,Email\nAlice,a@x.com\nBob,b@x.com';

    const result = parseCSV(csv);

    expect(result.headers).toEqual(['Name', 'Email']);
    expect(result.rows).toEqual([
      { Name: 'Alice', Email: 'a@x.com' },
      { Name: 'Bob', Email: 'b@x.com' },
    ]);
  });
});

describe('parseXLSXBuffer', () => {
  it('parses headers and rows from a real XLSX workbook buffer (round-trip)', () => {
    const worksheet = XLSX.utils.json_to_sheet([
      { Name: 'Alice', Email: 'a@x.com' },
      { Name: 'Bob', Email: 'b@x.com' },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

    const result = parseXLSXBuffer(buffer);

    expect(result.headers).toEqual(['Name', 'Email']);
    expect(result.rows).toEqual([
      { Name: 'Alice', Email: 'a@x.com' },
      { Name: 'Bob', Email: 'b@x.com' },
    ]);
  });
});
