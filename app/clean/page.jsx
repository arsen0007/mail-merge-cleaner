'use client';
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { parseFile } from '@/lib/parseFile';
import { cleanRows } from '@/lib/cleanEmails';
import { getOrCreateSessionId, recordEvent } from '@/lib/metrics';
import { PrimaryButton, ErrorDisplay, Metric, Panel } from '@/components/ui';
import { UploadCloudIcon, FileIcon, DownloadIcon } from '@/components/icons';

const triggerDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowsToCsv(rows, headers) {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  return lines.join('\n');
}

export default function CleanPage() {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [selectedEmailColumn, setSelectedEmailColumn] = useState('');
  const [cleaningResult, setCleaningResult] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const resultsRef = useRef(null);

  const resetState = () => {
    setFile(null);
    setParsedData(null);
    setSelectedEmailColumn('');
    setCleaningResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return;
    resetState();
    setFile(selectedFile);
    try {
      const data = await parseFile(selectedFile);
      setParsedData(data);
      setSelectedEmailColumn(data.headers[0] || '');
    } catch (err) {
      setError(err.message);
      setFile(null);
    }
  };

  const handleAnalyze = () => {
    if (!parsedData || !selectedEmailColumn) return;
    try {
      const result = cleanRows(parsedData.rows, selectedEmailColumn);
      setCleaningResult(result);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDownload = () => {
    if (!cleaningResult) return;
    const csv = rowsToCsv(cleaningResult.cleanedRows, parsedData.headers);
    const blob = new Blob([csv], { type: 'text/csv' });
    const filename = `cleaned_${(file?.name || 'list').split('.')[0]}.csv`;
    triggerDownload(blob, filename);

    recordEvent({
      tool: 'clean',
      event_type: 'file_cleaned',
      rows_processed: cleaningResult.metrics.finalRows,
      session_id: getOrCreateSessionId(),
    });
  };

  return (
    <div className="space-y-8">
      <Panel label="Form 01 — Email Cleaner" className="space-y-6">
        <h2 className="text-xl font-mono font-bold text-ink">Email Cleaner</h2>

        <div
          className="relative p-8 border-2 border-dashed border-line hover:border-stamp rounded-sm text-center cursor-pointer transition-colors duration-300 bg-paper-sunken/40"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files[0]); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center text-ink-soft">
            <UploadCloudIcon className="w-10 h-10 mb-4 text-stamp-dark" />
            <p className="font-medium text-ink"><span className="text-stamp-dark underline decoration-dotted">Click to upload</span> or drag and drop</p>
            <p className="text-sm mt-1">CSV or XLSX files supported</p>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileSelect(e.target.files[0])}
            className="hidden"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
          />
        </div>

        {file && (
          <div className="p-4 rounded-sm bg-paper-sunken/60 border border-line flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileIcon className="w-5 h-5 text-ink-soft" />
              <span className="font-medium text-ink text-sm">{file.name}</span>
            </div>
            <button onClick={resetState} className="text-xs font-mono uppercase tracking-wider text-stamp-dark hover:text-stamp">Start Over</button>
          </div>
        )}

        {parsedData && parsedData.headers.length > 0 && (
          <div>
            <label className="block text-xs font-mono uppercase tracking-[0.15em] text-ink-soft mb-2">Select Email Column</label>
            <select
              value={selectedEmailColumn}
              onChange={(e) => setSelectedEmailColumn(e.target.value)}
              className="w-full p-3 bg-paper border border-line rounded-sm text-ink focus:ring-2 focus:ring-stamp/40 focus:border-stamp"
            >
              {parsedData.headers.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <PrimaryButton onClick={handleAnalyze} isLoading={false} text="Analyze My List" loadingText="Analyzing..." />
          </div>
        )}

        {error && <ErrorDisplay message={error} />}
      </Panel>

      {cleaningResult && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          ref={resultsRef}
        >
          <Panel label="Ledger" className="space-y-6">
            <h2 className="text-xl font-mono font-bold text-ink">Review Cleaning Results</h2>
            <div className="grid grid-cols-3 divide-x divide-line border border-line rounded-sm text-center">
              <Metric label="Original Rows" value={cleaningResult.metrics.originalRows} />
              <Metric label="Duplicates Removed" value={cleaningResult.metrics.removedCount} />
              <Metric label="Final Recipients" value={cleaningResult.metrics.finalRows} />
            </div>
            {cleaningResult.removedDuplicates.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium text-stamp-dark hover:text-stamp">View Removed Duplicates Report</summary>
                <div className="mt-2 p-4 h-48 overflow-y-auto rounded-sm bg-paper-sunken/50 border border-line text-sm text-ink-soft font-mono">
                  <ul>{cleaningResult.removedDuplicates.map((email) => <li key={email}>{email}</li>)}</ul>
                </div>
              </details>
            )}
            <PrimaryButton
              onClick={handleDownload}
              isLoading={false}
              text="Download Cleaned List (.csv)"
              loadingText="Downloading..."
              icon={<DownloadIcon className="w-5 h-5" />}
              className="bg-seal hover:bg-seal-dark"
            />
          </Panel>
        </motion.div>
      )}
    </div>
  );
}
