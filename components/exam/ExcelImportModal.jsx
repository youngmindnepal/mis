// components/exam/ExcelImportModal.jsx
'use client';

import { useState, useRef } from 'react';
import * as Icons from 'lucide-react';

export default function ExcelImportModal({
  isOpen,
  onClose,
  batchId,
  semester,
  examCategory = 'regular',
  attempt = null,
  resultDate,
  onSuccess,
}) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const validateFile = (file) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some((ext) =>
      fileName.endsWith(ext)
    );

    if (!hasValidExtension) {
      setError('Please upload a valid Excel file (.xlsx, .xls, or .csv)');
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size should be less than 10MB');
      return false;
    }

    setError(null);
    return true;
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    if (!batchId || !semester) {
      setError('Batch and Semester are required');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('batchId', batchId);
      formData.append('semester', semester);
      formData.append('examCategory', examCategory);
      if (attempt) formData.append('attempt', attempt);
      if (resultDate) formData.append('resultDate', resultDate);

      const response = await fetch('/api/results/import-excel', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import');
      }

      setResult(data);

      if (data.savedCount > 0) {
        onSuccess?.();
      }
    } catch (err) {
      console.error('Import error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(
        `/api/results/export-template?batchId=${batchId}&semester=${semester}`
      );

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `marks_template_${semester}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Template download error:', err);
      setError('Failed to download template');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Icons.FileSpreadsheet size={24} className="text-green-600" />
                Import Marks from Excel
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Upload an Excel file with student marks
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <Icons.X size={20} />
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              Excel Format Instructions:
            </h4>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li>
                First column should contain <strong>Roll Number</strong> or{' '}
                <strong>Enrollment Number</strong>
              </li>
              <li>
                Remaining columns should have <strong>Course Codes</strong> as
                headers
              </li>
              <li>Each row represents a student's marks</li>
              <li>
                GPA values should be between <strong>0.0 and 4.0</strong>
              </li>
              <li>Leave cells empty for no marks</li>
            </ul>
          </div>

          {/* Template Download */}
          <div className="mb-6">
            <button
              onClick={handleDownloadTemplate}
              className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
            >
              <Icons.Download size={14} />
              Download Excel Template
            </button>
          </div>

          {/* File Upload Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : file
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            {file ? (
              <div>
                <Icons.FileCheck
                  size={40}
                  className="mx-auto text-green-500 mb-3"
                />
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                <button
                  onClick={() => setFile(null)}
                  className="text-xs text-red-600 hover:text-red-800 mt-2 underline"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div>
                <Icons.Upload
                  size={40}
                  className="mx-auto text-gray-400 mb-3"
                />
                <p className="text-sm text-gray-600">
                  Drag and drop your Excel file here, or{' '}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    browse
                  </button>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Supports .xlsx, .xls, .csv (Max 10MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm flex items-center gap-2">
                <Icons.AlertCircle size={16} />
                {error}
              </p>
            </div>
          )}

          {/* Import Result */}
          {result && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                result.errorCount > 0
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-green-50 border border-green-200'
              }`}
            >
              <h4 className="font-medium text-gray-900 mb-2">
                Import Results:
              </h4>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-white rounded p-2 text-center">
                  <p className="text-green-600 font-bold text-lg">
                    {result.savedCount}
                  </p>
                  <p className="text-xs text-gray-500">Saved</p>
                </div>
                <div className="bg-white rounded p-2 text-center">
                  <p className="text-yellow-600 font-bold text-lg">
                    {result.skipCount}
                  </p>
                  <p className="text-xs text-gray-500">Skipped</p>
                </div>
                <div className="bg-white rounded p-2 text-center">
                  <p className="text-red-600 font-bold text-lg">
                    {result.errorCount}
                  </p>
                  <p className="text-xs text-gray-500">Errors</p>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="mt-3 max-h-40 overflow-y-auto">
                  <p className="text-xs font-medium text-red-700 mb-1">
                    Errors:
                  </p>
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600">
                      {err}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {result ? 'Close' : 'Cancel'}
            </button>
            {!result && (
              <button
                onClick={handleImport}
                disabled={!file || loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Icons.Loader2 size={16} className="animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Icons.Upload size={16} />
                    Import Marks
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
