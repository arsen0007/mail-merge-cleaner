import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export function parseCSV(text) {
  const { data, meta } = Papa.parse(text, { header: true, skipEmptyLines: true });
  return { headers: meta.fields || [], rows: data };
}

export function parseXLSXBuffer(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

export async function parseFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    const text = await file.text();
    return parseCSV(text);
  }
  if (name.endsWith('.xlsx')) {
    const buffer = await file.arrayBuffer();
    return parseXLSXBuffer(buffer);
  }
  throw new Error('Unsupported file type. Please use CSV or XLSX.');
}
