'use client';
import { useState, useRef } from 'react';
import { parseFile } from '@/lib/parseFile';
import { cleanRows } from '@/lib/cleanEmails';
import { getOrCreateSessionId, recordEvent } from '@/lib/metrics';
import { PrimaryButton, ErrorDisplay, Metric } from '@/components/ui';
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
      <div className="bg-slate-900/50 backdrop-blur-xl p-6 md:p-8 rounded-2xl border border-slate-800 shadow-2xl shadow-black/30 space-y-6">
        <h2 className="text-2xl font-bold text-white">Email Cleaner</h2>

        <div
          className="relative p-8 border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-xl text-center cursor-pointer transition-colors duration-300"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files[0]); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center text-gray-400">
            <UploadCloudIcon className="w-12 h-12 mb-4" />
            <p className="font-semibold"><span className="text-blue-400">Click to upload</span> or drag and drop</p>
            <p className="text-sm">CSV or XLSX files supported</p>
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
          <div className="p-4 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileIcon className="w-6 h-6 text-gray-400" />
              <span className="font-medium text-white">{file.name}</span>
            </div>
            <button onClick={resetState} className="text-sm text-red-400 hover:text-red-300">Start Over</button>
          </div>
        )}

        {parsedData && parsedData.headers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Select Email Column</label>
            <select
              value={selectedEmailColumn}
              onChange={(e) => setSelectedEmailColumn(e.target.value)}
              className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              {parsedData.headers.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <PrimaryButton onClick={handleAnalyze} isLoading={false} text="Analyze My List" loadingText="Analyzing..." />
          </div>
        )}

        {error && <ErrorDisplay message={error} />}
      </div>

      {cleaningResult && (
        <div ref={resultsRef} className="bg-slate-900/50 backdrop-blur-xl p-6 md:p-8 rounded-2xl border border-slate-800 shadow-2xl shadow-black/30 space-y-6">
          <h2 className="text-2xl font-bold text-white">Review Cleaning Results</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <Metric label="Original Rows" value={cleaningResult.metrics.originalRows} />
            <Metric label="Duplicates Removed" value={cleaningResult.metrics.removedCount} />
            <Metric label="Final Recipients" value={cleaningResult.metrics.finalRows} />
          </div>
          {cleaningResult.removedDuplicates.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer font-medium text-blue-400 hover:text-blue-300">View Removed Duplicates Report</summary>
              <div className="mt-2 p-4 h-48 overflow-y-auto rounded-lg bg-gray-900/50 border border-gray-700 text-sm text-gray-400">
                <ul>{cleaningResult.removedDuplicates.map((email) => <li key={email}>{email}</li>)}</ul>
              </div>
            </details>
          )}
          <PrimaryButton
            onClick={handleDownload}
            isLoading={false}
            text="Download Cleaned List (.csv)"
            loadingText="Downloading..."
            icon={<DownloadIcon className="w-5 h-5 mr-2" />}
            className="bg-green-600 hover:bg-green-700"
          />
        </div>
      )}
    </div>
  );
}
