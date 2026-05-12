// app/preadmission/page.jsx
'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

const REFERRAL_SOURCES = [
  {
    value: 'facebook',
    label: 'Facebook',
    icon: 'Facebook',
    color: 'text-blue-600 bg-blue-50',
  },
  {
    value: 'instagram',
    label: 'Instagram',
    icon: 'Instagram',
    color: 'text-pink-600 bg-pink-50',
  },
  {
    value: 'youtube',
    label: 'YouTube',
    icon: 'Youtube',
    color: 'text-red-600 bg-red-50',
  },
  {
    value: 'students',
    label: 'Students',
    icon: 'Users',
    color: 'text-green-600 bg-green-50',
  },
  {
    value: 'website',
    label: 'Website',
    icon: 'Globe',
    color: 'text-purple-600 bg-purple-50',
  },
  {
    value: 'newspaper',
    label: 'Newspaper',
    icon: 'Newspaper',
    color: 'text-amber-600 bg-amber-50',
  },
  {
    value: 'referred_by',
    label: 'Referred By',
    icon: 'UserPlus',
    color: 'text-indigo-600 bg-indigo-50',
  },
  {
    value: 'agent',
    label: 'Agent',
    icon: 'Briefcase',
    color: 'text-teal-600 bg-teal-50',
  },
  {
    value: 'other',
    label: 'Other',
    icon: 'MessageCircle',
    color: 'text-gray-600 bg-gray-50',
  },
];

const STATUS_OPTIONS = [
  {
    value: 'pending',
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800',
  },
  {
    value: 'contacted',
    label: 'Contacted',
    color: 'bg-blue-100 text-blue-800',
  },
  {
    value: 'follow_up',
    label: 'Follow Up',
    color: 'bg-orange-100 text-orange-800',
  },
  {
    value: 'enrolled',
    label: 'Enrolled',
    color: 'bg-green-100 text-green-800',
  },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
];

function LoadingState() {
  return (
    <div className="p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 rounded w-1/4" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

// ==================== IMPORT/EXPORT BAR ====================
function ImportExportBar({
  onExport,
  onImport,
  onDownloadTemplate,
  importing,
}) {
  const fileInputRef = useRef(null);
  return (
    <>
      <button
        onClick={onDownloadTemplate}
        className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1"
        title="Download Excel template"
      >
        <Icons.FileDown size={14} /> Template
      </button>
      <button
        onClick={onExport}
        className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
        title="Export to Excel"
      >
        <Icons.Download size={14} /> Export
      </button>
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={importing}
        className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
        title="Import from Excel"
      >
        {importing ? (
          <Icons.Loader2 size={14} className="animate-spin" />
        ) : (
          <Icons.Upload size={14} />
        )}{' '}
        Import
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={onImport}
        className="hidden"
      />
    </>
  );
}

// ==================== IMPORT RESULT MODAL ====================
function ImportResultModal({ isOpen, onClose, result }) {
  if (!isOpen || !result) return null;
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
          <h3 className="text-lg font-bold">Import Results</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Icons.X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-gray-900">{result.total}</p>
              <p className="text-xs text-gray-500">Total Rows</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-green-600">
                {result.imported}
              </p>
              <p className="text-xs text-gray-500">Imported</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-yellow-600">
                {result.skipped}
              </p>
              <p className="text-xs text-gray-500">Skipped</p>
            </div>
          </div>
          {result.errors?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Errors:
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {result.errors.map((err, i) => (
                  <p
                    key={i}
                    className="text-xs text-red-600 bg-red-50 rounded p-2"
                  >
                    {err}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Close
        </button>
      </motion.div>
    </div>
  );
}

// ==================== VIEW DETAIL MODAL ====================
function ViewDetailModal({ isOpen, onClose, preadmission }) {
  if (!isOpen || !preadmission) return null;
  const referral = REFERRAL_SOURCES.find(
    (r) => r.value === preadmission.referralSource
  );
  const status = STATUS_OPTIONS.find((s) => s.value === preadmission.status);
  const RefIcon = referral ? Icons[referral.icon] : null;
  const fd = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'N/A';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 mx-4"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Icons.Eye size={20} className="text-teal-600" />
            Student Details
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Icons.X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <div className="bg-teal-50 rounded-xl p-4">
            <h2 className="text-xl font-bold text-teal-900">
              {preadmission.studentName}
            </h2>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-2 ${status?.color}`}
            >
              {status?.label}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase font-semibold">
                Phone
              </p>
              <p className="text-sm font-medium flex items-center gap-1 mt-1">
                <Icons.Phone size={14} className="text-gray-400" />
                {preadmission.phone}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase font-semibold">
                Email
              </p>
              <p className="text-sm font-medium flex items-center gap-1 mt-1">
                <Icons.Mail size={14} className="text-gray-400" />
                {preadmission.email || 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase font-semibold">
                Address
              </p>
              <p className="text-sm font-medium flex items-center gap-1 mt-1">
                <Icons.MapPin size={14} className="text-gray-400" />
                {preadmission.address || 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase font-semibold">
                Inquiry Date
              </p>
              <p className="text-sm font-medium flex items-center gap-1 mt-1">
                <Icons.Calendar size={14} className="text-gray-400" />
                {fd(preadmission.date)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase font-semibold">
                Previous College
              </p>
              <p className="text-sm font-medium mt-1">
                {preadmission.previousCollege || 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase font-semibold">
                GPA
              </p>
              <p className="text-sm font-medium mt-1">
                {preadmission.gpa != null ? preadmission.gpa : 'N/A'}
              </p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-2">
              Departments
            </p>
            <div className="flex flex-wrap gap-1">
              {preadmission.departments?.map((d) => (
                <span
                  key={d.departmentId}
                  className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full"
                >
                  {d.department?.name}
                </span>
              ))}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-2">
              Referral
            </p>
            <div className="flex items-center gap-2">
              {RefIcon && (
                <RefIcon size={16} className={referral?.color.split(' ')[0]} />
              )}
              <span className="text-sm font-medium">
                {referral?.label || 'None'}
              </span>
              {preadmission.referralName && (
                <span className="text-sm text-gray-500">
                  - {preadmission.referralName}
                </span>
              )}
            </div>
            {preadmission.agent && (
              <div className="mt-2 p-2 bg-teal-50 rounded-lg border border-teal-200">
                <p className="text-sm font-semibold text-teal-800">
                  Agent: {preadmission.agent.name}
                </p>
                {preadmission.agent.company && (
                  <p className="text-xs text-teal-600">
                    {preadmission.agent.company}
                  </p>
                )}
              </div>
            )}
          </div>
          {preadmission.notes && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                Notes
              </p>
              <p className="text-sm">{preadmission.notes}</p>
            </div>
          )}
          <p className="text-xs text-gray-400">
            Created: {fd(preadmission.createdAt)} | Counselor:{' '}
            {preadmission.counselor?.name || 'N/A'}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ==================== FOLLOW-UP LIST MODAL (with inline form) ====================
function FollowUpListModal({
  isOpen,
  onClose,
  preadmissionId,
  preadmissionName,
  onFollowUpCreated,
}) {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    followUpDate: new Date().toISOString().split('T')[0],
    notes: '',
    outcome: '',
  });
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchFollowUps = useCallback(() => {
    if (!preadmissionId) return;
    setLoading(true);
    fetch(`/api/followups?preadmissionId=${preadmissionId}`)
      .then((r) => r.json())
      .then((d) => setFollowUps(d.followUps || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [preadmissionId]);

  useEffect(() => {
    if (isOpen) {
      fetchFollowUps();
      setShowForm(false);
      setForm({
        followUpDate: new Date().toISOString().split('T')[0],
        notes: '',
        outcome: '',
      });
    }
  }, [isOpen, fetchFollowUps]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, preadmissionId }),
      });
      if (res.ok) {
        setSuccessMsg('Follow-up scheduled!');
        setTimeout(() => setSuccessMsg(null), 3000);
        setShowForm(false);
        setForm({
          followUpDate: new Date().toISOString().split('T')[0],
          notes: '',
          outcome: '',
        });
        fetchFollowUps();
        if (onFollowUpCreated) onFollowUpCreated();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed');
        setTimeout(() => setErrorMsg(null), 3000);
      }
    } catch (e) {
      setErrorMsg(e.message);
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;
  const fd = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'N/A';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden p-6 mx-4 flex flex-col"
      >
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-green-50 border border-green-300 text-green-800 px-4 py-2 rounded-lg shadow-lg text-sm"
            >
              <Icons.CheckCircle size={14} className="inline mr-1" />
              {successMsg}
            </motion.div>
          )}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-red-50 border border-red-300 text-red-800 px-4 py-2 rounded-lg shadow-lg text-sm"
            >
              <Icons.AlertCircle size={14} className="inline mr-1" />
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Icons.CalendarClock size={20} className="text-blue-600" />
            Follow-Ups: {preadmissionName}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowForm(!showForm)}
              className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 transition-colors ${
                showForm
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Icons.Plus size={14} />
              {showForm ? 'Cancel' : 'Schedule'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Icons.X size={18} />
            </button>
          </div>
        </div>
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden flex-shrink-0"
            >
              <form
                onSubmit={handleSubmit}
                className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-200 space-y-3"
              >
                <p className="text-sm font-semibold text-blue-900">
                  Schedule New Follow-Up
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Follow-Up Date *
                    </label>
                    <input
                      type="date"
                      value={form.followUpDate}
                      onChange={(e) =>
                        setForm({ ...form, followUpDate: e.target.value })
                      }
                      className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Outcome
                    </label>
                    <select
                      value={form.outcome}
                      onChange={(e) =>
                        setForm({ ...form, outcome: e.target.value })
                      }
                      className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm bg-white"
                    >
                      <option value="">Select outcome...</option>
                      <option value="interested">Interested</option>
                      <option value="not_interested">Not Interested</option>
                      <option value="will_think">Will Think About It</option>
                      <option value="enrolled">Enrolled</option>
                      <option value="no_answer">No Answer</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    placeholder="Follow-up notes..."
                    rows={2}
                    className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? (
                      <Icons.Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Icons.Save size={14} />
                    )}
                    Save Follow-Up
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Icons.Loader2 size={32} className="animate-spin text-blue-600" />
            </div>
          ) : followUps.length === 0 && !showForm ? (
            <div className="text-center py-8 text-gray-500">
              <Icons.CalendarClock
                size={48}
                className="text-gray-300 mx-auto mb-3"
              />
              <p>No follow-ups yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
              >
                Schedule First Follow-Up
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {followUps.map((fu) => (
                <div
                  key={fu.id}
                  className={`p-3 rounded-lg border ${
                    fu.status === 'completed'
                      ? 'bg-green-50 border-green-200'
                      : fu.status === 'cancelled'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold">
                        {new Date(fu.followUpDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      {fu.outcome && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            fu.outcome === 'enrolled'
                              ? 'bg-green-200 text-green-800'
                              : fu.outcome === 'interested'
                              ? 'bg-blue-200 text-blue-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {fu.outcome.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        fu.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : fu.status === 'cancelled'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {fu.status}
                    </span>
                  </div>
                  {fu.notes && (
                    <p className="text-xs text-gray-600 mt-2">{fu.notes}</p>
                  )}
                  {fu.counselor && (
                    <p className="text-xs text-gray-400 mt-1">
                      By: {fu.counselor.name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ==================== MAIN PAGE ====================
export default function PreadmissionPage() {
  const { can, isLoading: permLoading } = usePermissions();
  const [preadmissions, setPreadmissions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [referralFilter, setReferralFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewStudent, setViewStudent] = useState(null);
  const [showFollowUpList, setShowFollowUpList] = useState(false);
  const [followUpListData, setFollowUpListData] = useState({
    id: null,
    name: '',
  });
  const [showAgentList, setShowAgentList] = useState(false);
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [agentSaving, setAgentSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showImportResult, setShowImportResult] = useState(false);

  const hasRead = can('admission', 'read');
  const hasCreate = can('admission', 'create');

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (res.ok) setAgents((await res.json()).agents || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchData = useCallback(async () => {
    const [dRes] = await Promise.all([
      fetch('/api/departments'),
      fetchAgents(),
    ]);
    if (dRes.ok) setDepartments((await dRes.json()).departments || []);
  }, [fetchAgents]);

  const fetchPreadmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (departmentFilter) params.append('departmentId', departmentFilter);
      if (agentFilter) params.append('agentId', agentFilter);
      if (referralFilter) params.append('referralSource', referralFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      const res = await fetch(`/api/preadmissions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPreadmissions(data.preadmissions || []);
        setPagination(data.pagination);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    search,
    statusFilter,
    departmentFilter,
    agentFilter,
    referralFilter,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  useEffect(() => {
    if (hasRead) fetchPreadmissions();
  }, [hasRead, fetchPreadmissions]);

  const showMsg = (m, t = 'success') => {
    if (t === 'success') {
      setSuccessMsg(m);
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(m);
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  const handleSubmit = async (fd) => {
    setSaving(true);
    try {
      const url = editingData
        ? `/api/preadmissions/${editingData.id}`
        : '/api/preadmissions';
      const res = await fetch(url, {
        method: editingData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fd),
      });
      if (res.ok) {
        showMsg(editingData ? 'Updated!' : 'Student added!');
        setShowForm(false);
        setEditingData(null);
        fetchPreadmissions();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
    } catch (e) {
      showMsg(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/preadmissions/${deleteModal.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showMsg('Deleted!');
        setDeleteModal({ isOpen: false, id: null });
        fetchPreadmissions();
      } else throw new Error('Failed');
    } catch (e) {
      showMsg(e.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFollowUpClick = (preadmission) => {
    setFollowUpListData({
      id: preadmission.id,
      name: preadmission.studentName,
    });
    setShowFollowUpList(true);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setDepartmentFilter('');
    setAgentFilter('');
    setReferralFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const fd = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'N/A';
  const stats = useMemo(
    () => ({
      total: pagination.total || 0,
      pending: preadmissions.filter((p) => p.status === 'pending').length,
      enrolled: preadmissions.filter((p) => p.status === 'enrolled').length,
      agents: agents.filter((a) => a.status === 'active').length,
    }),
    [preadmissions, pagination, agents]
  );

  const handleAgentSubmit = async (fd) => {
    setAgentSaving(true);
    try {
      const url = editingAgent
        ? `/api/agents/${editingAgent.id}`
        : '/api/agents';
      const res = await fetch(url, {
        method: editingAgent ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fd),
      });
      if (res.ok) {
        showMsg(editingAgent ? 'Agent updated!' : 'Agent added!');
        setShowAgentForm(false);
        setEditingAgent(null);
        fetchAgents();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
    } catch (e) {
      showMsg(e.message, 'error');
    } finally {
      setAgentSaving(false);
    }
  };

  const handleAgentDelete = async (agentId) => {
    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' });
      if (res.ok) {
        showMsg('Agent deleted!');
        fetchAgents();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
    } catch (e) {
      showMsg(e.message, 'error');
    }
  };

  // ==================== EXCEL HANDLERS ====================
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (departmentFilter) params.append('departmentId', departmentFilter);
      if (agentFilter) params.append('agentId', agentFilter);
      if (referralFilter) params.append('referralSource', referralFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      const res = await fetch(`/api/preadmissions/export?${params}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `preadmissions_${
          new Date().toISOString().split('T')[0]
        }.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showMsg('Exported successfully!');
      } else showMsg('Export failed', 'error');
    } catch (e) {
      showMsg('Export failed: ' + e.message, 'error');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/preadmissions/import', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (res.ok) {
        setImportResult(result);
        setShowImportResult(true);
        fetchPreadmissions();
        fetchAgents();
      } else showMsg(result.error || 'Import failed', 'error');
    } catch (e) {
      showMsg('Import failed: ' + e.message, 'error');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/preadmissions/template');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'preadmission_template.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (e) {
      showMsg('Template download failed', 'error');
    }
  };

  const hasActiveFilters =
    search ||
    statusFilter ||
    departmentFilter ||
    agentFilter ||
    referralFilter ||
    dateFrom ||
    dateTo;

  if (permLoading)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          <LoadingState />
        </div>
      </div>
    );
  if (!hasRead)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center max-w-md">
          <Icons.Lock size={32} className="text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-800">Access Denied</h2>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed top-20 right-6 z-50 bg-green-50 border-l-4 border-green-500 text-green-800 px-4 py-3 rounded-lg shadow-lg min-w-[280px]"
          >
            <div className="flex items-center gap-2">
              <Icons.CheckCircle size={20} className="text-green-500" />
              <span>{successMsg}</span>
              <button onClick={() => setSuccessMsg(null)} className="ml-auto">
                <Icons.X size={16} />
              </button>
            </div>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed top-20 right-6 z-50 bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-lg shadow-lg min-w-[280px]"
          >
            <div className="flex items-center gap-2">
              <Icons.AlertCircle size={20} className="text-red-500" />
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="ml-auto">
                <Icons.X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span>🏠</span>
            <span>/</span>
            <span className="text-gray-900">Preadmission</span>
          </div>
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Preadmission Management
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {stats.total} inquiries • {stats.agents} agents
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <ImportExportBar
                onExport={handleExport}
                onImport={handleImport}
                onDownloadTemplate={handleDownloadTemplate}
                importing={importing}
              />
              <button
                onClick={() => {
                  setEditingAgent(null);
                  setShowAgentList(true);
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2"
              >
                <Icons.Briefcase size={18} />
                Agents ({stats.agents})
              </button>
              <button
                onClick={fetchPreadmissions}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                <Icons.RefreshCw size={18} />
                Refresh
              </button>
              {hasCreate && (
                <button
                  onClick={() => {
                    setEditingData(null);
                    setShowForm(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg hover:from-teal-700 hover:to-emerald-700 flex items-center gap-2"
                >
                  <Icons.Plus size={18} />
                  Add Student
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              icon: Icons.Users,
              color: 'bg-teal-100 text-teal-600',
              label: 'Total',
              value: stats.total,
            },
            {
              icon: Icons.Clock,
              color: 'bg-yellow-100 text-yellow-600',
              label: 'Pending',
              value: stats.pending,
            },
            {
              icon: Icons.CheckCircle,
              color: 'bg-green-100 text-green-600',
              label: 'Enrolled',
              value: stats.enrolled,
            },
            {
              icon: Icons.Briefcase,
              color: 'bg-amber-100 text-amber-600',
              label: 'Agents',
              value: stats.agents,
            },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 ${
                    s.color.split(' ')[0]
                  } rounded-lg flex items-center justify-center`}
                >
                  <s.icon size={20} className={s.color.split(' ')[1]} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="text-lg font-bold text-gray-900">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Icons.Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Search name, phone, email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10 pr-4 py-2 border rounded-lg w-full focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border rounded-lg text-sm bg-white"
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border rounded-lg text-sm bg-white"
            >
              <option value="">All Depts</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              value={agentFilter}
              onChange={(e) => {
                setAgentFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border rounded-lg text-sm bg-white"
            >
              <option value="">All Agents</option>
              {agents
                .filter((a) => a.status === 'active')
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.company ? ` (${a.company})` : ''}
                  </option>
                ))}
            </select>
            <select
              value={referralFilter}
              onChange={(e) => {
                setReferralFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border rounded-lg text-sm bg-white"
            >
              <option value="">All Sources</option>
              {REFERRAL_SOURCES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <Icons.Calendar size={14} className="text-gray-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border rounded-lg text-sm w-36 focus:ring-2 focus:ring-teal-500"
                placeholder="From"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border rounded-lg text-sm w-36 focus:ring-2 focus:ring-teal-500"
                placeholder="To"
              />
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1"
              >
                <Icons.X size={14} />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        {loading ? (
          <LoadingState />
        ) : preadmissions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border">
            <Icons.Users size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {hasActiveFilters
                ? 'No records match your filters'
                : 'No records found'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg"
              >
                Clear Filters
              </button>
            ) : (
              hasCreate && (
                <button
                  onClick={() => {
                    setEditingData(null);
                    setShowForm(true);
                  }}
                  className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg"
                >
                  Add First Student
                </button>
              )
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 w-12">
                      S.No
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Student
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Phone
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Depts
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Referral
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Follow-Ups
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preadmissions.map((p, idx) => {
                    const referral = REFERRAL_SOURCES.find(
                      (r) => r.value === p.referralSource
                    );
                    const status = STATUS_OPTIONS.find(
                      (s) => s.value === p.status
                    );
                    const RefIcon = referral ? Icons[referral.icon] : null;
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {(page - 1) * 20 + idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900">
                            {p.studentName}
                          </p>
                          {p.gpa != null && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                              GPA: {p.gpa}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {p.phone}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <Icons.Calendar
                              size={12}
                              className="text-gray-400"
                            />
                            {fd(p.date)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {p.departments?.slice(0, 2).map((d) => (
                              <span
                                key={d.departmentId}
                                className="text-xs bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded"
                              >
                                {d.department?.name}
                              </span>
                            ))}
                            {p.departments?.length > 2 && (
                              <span className="text-xs text-gray-400">
                                +{p.departments.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            {RefIcon && (
                              <RefIcon
                                size={14}
                                className={referral?.color.split(' ')[0]}
                              />
                            )}
                            <span className="text-xs text-gray-600">
                              {referral?.label || 'None'}
                            </span>
                            {p.agent && (
                              <Icons.Briefcase
                                size={12}
                                className="text-teal-500"
                                title={`Agent: ${p.agent.name}`}
                              />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${status?.color}`}
                          >
                            {status?.label || p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleFollowUpClick(p)}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1.5 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                          >
                            <Icons.CalendarClock size={14} />
                            View Follow-Ups
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setViewStudent(p)}
                              className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg"
                              title="View"
                            >
                              <Icons.Eye size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingData(p);
                                setShowForm(true);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit"
                            >
                              <Icons.Edit2 size={16} />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteModal({ isOpen: true, id: p.id })
                              }
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete"
                            >
                              <Icons.Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                <span className="text-sm text-gray-500">
                  Showing {(page - 1) * 20 + 1}-
                  {Math.min(page * 20, pagination.total)} of {pagination.total}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(pagination.totalPages, p + 1))
                    }
                    disabled={page === pagination.totalPages}
                    className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ViewDetailModal
        isOpen={!!viewStudent}
        onClose={() => setViewStudent(null)}
        preadmission={viewStudent}
      />
      <FollowUpListModal
        isOpen={showFollowUpList}
        onClose={() => setShowFollowUpList(false)}
        preadmissionId={followUpListData.id}
        preadmissionName={followUpListData.name}
        onFollowUpCreated={() => fetchPreadmissions()}
      />
      <ImportResultModal
        isOpen={showImportResult}
        onClose={() => {
          setShowImportResult(false);
          setImportResult(null);
        }}
        result={importResult}
      />

      {/* Agent List Modal */}
      {showAgentList && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowAgentList(false)}
          />
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 mx-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Icons.Briefcase size={20} className="text-teal-600" />
                Manage Agents
              </h3>
              <button
                onClick={() => setShowAgentList(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Icons.X size={18} />
              </button>
            </div>
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2"
              >
                <div>
                  <span className="font-medium">{agent.name}</span>
                  <span
                    className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                      agent.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {agent.status}
                  </span>
                  <div className="text-xs text-gray-500">
                    {agent.company} {agent.phone && `• ${agent.phone}`}{' '}
                    {agent.commission != null && `• ${agent.commission}%`}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditingAgent(agent);
                      setShowAgentForm(true);
                    }}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Icons.Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleAgentDelete(agent.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Icons.Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                setEditingAgent(null);
                setShowAgentForm(true);
              }}
              className="w-full mt-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm flex items-center justify-center gap-2"
            >
              <Icons.Plus size={14} />
              Add Agent
            </button>
          </motion.div>
        </div>
      )}

      {/* Agent Form Modal */}
      {showAgentForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => {
              setShowAgentForm(false);
              setEditingAgent(null);
            }}
          />
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 mx-4"
          >
            <h3 className="text-lg font-bold mb-4">
              {editingAgent ? 'Edit' : 'Add'} Agent
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAgentSubmit({
                  name: e.target.name.value,
                  phone: e.target.phone.value,
                  email: e.target.email.value,
                  address: e.target.address.value,
                  company: e.target.company.value,
                  commission: e.target.commission.value || null,
                  notes: e.target.notes.value,
                });
              }}
              className="space-y-3"
            >
              <input
                name="name"
                defaultValue={editingAgent?.name || ''}
                placeholder="Name *"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="phone"
                  defaultValue={editingAgent?.phone || ''}
                  placeholder="Phone"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                <input
                  name="email"
                  defaultValue={editingAgent?.email || ''}
                  placeholder="Email"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <input
                name="address"
                defaultValue={editingAgent?.address || ''}
                placeholder="Address"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="company"
                  defaultValue={editingAgent?.company || ''}
                  placeholder="Company"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                <input
                  name="commission"
                  type="number"
                  step="0.1"
                  defaultValue={editingAgent?.commission || ''}
                  placeholder="Commission %"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <textarea
                name="notes"
                defaultValue={editingAgent?.notes || ''}
                placeholder="Notes"
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAgentForm(false);
                    setEditingAgent(null);
                  }}
                  className="px-4 py-2 border rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={agentSaving}
                  className="px-6 py-2 bg-teal-600 text-white rounded-lg text-sm flex items-center gap-2"
                >
                  {agentSaving ? (
                    <Icons.Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Icons.Save size={14} />
                  )}
                  Save Agent
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setDeleteModal({ isOpen: false, id: null })}
          />
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 mx-4"
          >
            <h3 className="text-lg font-bold mb-2">Delete Record?</h3>
            <p className="text-gray-600 mb-4">This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ isOpen: false, id: null })}
                className="flex-1 px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <Icons.Loader2 size={18} className="animate-spin" />
                ) : (
                  <Icons.Trash2 size={18} />
                )}
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
