'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, BookOpen, Loader2 } from 'lucide-react';

export default function TerminalExamConfigModal({
  isOpen,
  onClose,
  onSave,
  batchId,
}) {
  const [termCount, setTermCount] = useState(2);
  const [termWeeks, setTermWeeks] = useState([7, 12]);
  const [examDays, setExamDays] = useState(5);
  const [semesterDuration, setSemesterDuration] = useState(16);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && batchId) {
      fetchConfig();
    }
  }, [isOpen, batchId]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/terminal-config?batchId=${batchId}`);
      if (res.ok) {
        const data = await res.json();
        const c = data.config;
        if (c && !c.isDefault) {
          setTermCount(c.termCount || 2);
          setTermWeeks(
            Array.isArray(c.termWeeks)
              ? c.termWeeks
              : typeof c.termWeeks === 'string'
              ? JSON.parse(c.termWeeks)
              : [7, 12]
          );
          setExamDays(c.examDays || 5);
          setSemesterDuration(c.semesterDuration || 16);
        }
      }
    } catch (e) {
      console.error('Error fetching terminal config:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleTermWeekChange = (index, value) => {
    const newWeeks = [...termWeeks];
    newWeeks[index] = parseInt(value) || 0;
    setTermWeeks(newWeeks);
  };

  const handleSave = async () => {
    if (!batchId) {
      console.error('No batchId provided');
      return;
    }
    setSaving(true);
    try {
      const validWeeks = termWeeks.slice(0, termCount).filter((w) => w > 0);
      const config = {
        termCount,
        termWeeks: validWeeks,
        examDays,
        semesterDuration,
      };

      // Save to API
      const res = await fetch('/api/terminal-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: parseInt(batchId), ...config }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log('Config saved successfully:', data);
        // Pass config back to parent (without regenerating)
        onSave({ ...config, termWeeks: validWeeks });
        onClose(); // Close modal after saving
      } else {
        const error = await res
          .json()
          .catch(() => ({ error: 'Unknown error' }));
        console.error('Save failed:', error);
        alert('Failed to save: ' + (error.error || 'Unknown error'));
      }
    } catch (e) {
      console.error('Error saving terminal config:', e);
      alert('Error saving configuration: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 mx-4"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <BookOpen size={20} /> Terminal Exam Configuration
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <Loader2
              size={32}
              className="animate-spin text-indigo-600 mx-auto mb-2"
            />
            <p className="text-sm text-gray-500">Loading configuration...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1">
                Semester Duration (weeks)
              </label>
              <input
                type="number"
                value={semesterDuration}
                onChange={(e) =>
                  setSemesterDuration(parseInt(e.target.value) || 16)
                }
                min={8}
                max={24}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Number of Terminal Exams
              </label>
              <select
                value={termCount}
                onChange={(e) => {
                  const count = parseInt(e.target.value);
                  setTermCount(count);
                  const newWeeks = [...termWeeks];
                  while (newWeeks.length < count)
                    newWeeks.push(
                      newWeeks.length > 0
                        ? newWeeks[newWeeks.length - 1] + 5
                        : 7
                    );
                  setTermWeeks(newWeeks.slice(0, count));
                }}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} Terminal{n > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Exam Days per Terminal (Sun-Fri)
              </label>
              <select
                value={examDays}
                onChange={(e) => setExamDays(parseInt(e.target.value))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} Day{n > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2">
                Terminal Exam Starting Weeks
              </label>
              <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                {Array.from({ length: termCount }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                    <span className="text-xs text-gray-600 w-20">
                      Terminal {i + 1}
                    </span>
                    <span className="text-xs text-gray-400">Week</span>
                    <input
                      type="number"
                      value={termWeeks[i] || ''}
                      onChange={(e) => handleTermWeekChange(i, e.target.value)}
                      min={1}
                      max={semesterDuration - 2}
                      className="w-20 rounded-lg border px-3 py-2 text-sm text-center"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
              <h4 className="text-xs font-semibold text-indigo-800 mb-2">
                Summary
              </h4>
              <div className="space-y-1 text-[11px] text-indigo-700">
                <p>• {semesterDuration} weeks semester</p>
                <p>
                  • {termCount} terminal{termCount > 1 ? 's' : ''} with{' '}
                  {examDays} day{examDays > 1 ? 's' : ''} each
                </p>
                <p>
                  • Weeks:{' '}
                  {termWeeks
                    .slice(0, termCount)
                    .filter((w) => w > 0)
                    .join(', ') || 'Not set'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Save Configuration
          </button>
        </div>
      </motion.div>
    </div>
  );
}
