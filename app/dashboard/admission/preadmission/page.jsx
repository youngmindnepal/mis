// app/preadmission/page.jsx
'use client';

import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
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
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  {
    value: 'contacted',
    label: 'Contacted',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  {
    value: 'follow_up',
    label: 'Follow Up',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  {
    value: 'enrolled',
    label: 'Enrolled',
    color: 'bg-green-100 text-green-800 border-green-300',
  },
  {
    value: 'rejected',
    label: 'Rejected',
    color: 'bg-red-100 text-red-800 border-red-300',
  },
];

const OUTCOME_OPTIONS = [
  'interested',
  'not_interested',
  'will_think',
  'enrolled',
  'no_answer',
];

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(d.getDate()).padStart(2, '0')}`;
};

function LoadingSkeleton() {
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

function StudentFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  departments,
  agents,
  loading,
}) {
  const [form, setForm] = useState({
    studentName: '',
    phone: '',
    address: '',
    email: '',
    date: '',
    referralSource: '',
    referralName: '',
    agentId: '',
    previousCollege: '',
    gpa: '',
    notes: '',
    departmentIds: [],
  });
  const [errors, setErrors] = useState({});
  useEffect(() => {
    if (isOpen) {
      const today = getTodayStr();
      setForm(
        initialData
          ? {
              studentName: initialData.studentName || '',
              phone: initialData.phone || '',
              address: initialData.address || '',
              email: initialData.email || '',
              date: initialData.date
                ? new Date(initialData.date).toISOString().split('T')[0]
                : today,
              referralSource: initialData.referralSource || '',
              referralName: initialData.referralName || '',
              agentId: initialData.agentId || '',
              previousCollege: initialData.previousCollege || '',
              gpa: initialData.gpa != null ? String(initialData.gpa) : '',
              notes: initialData.notes || '',
              departmentIds:
                initialData.departments?.map((d) => d.departmentId) || [],
            }
          : {
              studentName: '',
              phone: '',
              address: '',
              email: '',
              date: today,
              referralSource: '',
              referralName: '',
              agentId: '',
              previousCollege: '',
              gpa: '',
              notes: '',
              departmentIds: [],
            }
      );
      setErrors({});
    }
  }, [isOpen, initialData]);
  const validate = () => {
    const errs = {};
    if (!form.studentName.trim()) errs.studentName = 'Required';
    if (!form.phone.trim()) errs.phone = 'Required';
    if (form.departmentIds.length === 0)
      errs.departmentIds = 'Select at least one';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ ...form, gpa: form.gpa ? parseFloat(form.gpa) : null });
  };
  const toggleDept = (id) =>
    setForm((prev) => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(id)
        ? prev.departmentIds.filter((i) => i !== id)
        : [...prev.departmentIds, id],
    }));
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Icons.UserPlus size={20} className="text-teal-600" />
            {initialData ? 'Edit Student' : 'Add New Student'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Icons.X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">
              Student Name *
            </label>
            <input
              type="text"
              value={form.studentName}
              onChange={(e) =>
                setForm({ ...form, studentName: e.target.value })
              }
              placeholder="Full name"
              className={`w-full rounded-lg border px-3 py-2 text-sm ${
                errors.studentName ? 'border-red-500' : 'border-gray-300'
              } focus:ring-2 focus:ring-teal-500 focus:outline-none`}
            />
            {errors.studentName && (
              <p className="text-xs text-red-500 mt-1">{errors.studentName}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">
                Phone *
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="9841xxxxxx"
                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                } focus:ring-2 focus:ring-teal-500 focus:outline-none`}
              />
              {errors.phone && (
                <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Address"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Prev College
              </label>
              <input
                type="text"
                value={form.previousCollege}
                onChange={(e) =>
                  setForm({ ...form, previousCollege: e.target.value })
                }
                placeholder="College"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">GPA</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="4"
                value={form.gpa}
                onChange={(e) => setForm({ ...form, gpa: e.target.value })}
                placeholder="3.5"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Agent</label>
            <select
              value={form.agentId}
              onChange={(e) => setForm({ ...form, agentId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">No Agent</option>
              {agents
                .filter((a) => a.status === 'active')
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.company ? ` (${a.company})` : ''}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2">
              Departments *{' '}
              {form.departmentIds.length > 0 && (
                <span className="text-teal-600">
                  ({form.departmentIds.length})
                </span>
              )}
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => toggleDept(dept.id)}
                  className={`p-2.5 rounded-lg border text-sm text-left transition-colors ${
                    form.departmentIds.includes(dept.id)
                      ? 'bg-teal-50 border-teal-500 text-teal-700 font-medium'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-teal-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        form.departmentIds.includes(dept.id)
                          ? 'bg-teal-600 border-teal-600'
                          : 'border-gray-400'
                      }`}
                    >
                      {form.departmentIds.includes(dept.id) && (
                        <Icons.Check size={10} className="text-white" />
                      )}
                    </div>
                    <span className="truncate">{dept.name}</span>
                  </div>
                </button>
              ))}
            </div>
            {errors.departmentIds && (
              <p className="text-xs text-red-500 mt-1">
                {errors.departmentIds}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2">
              Referral Source
            </label>
            <div className="grid grid-cols-3 gap-2">
              {REFERRAL_SOURCES.map((source) => {
                const IconComp = Icons[source.icon];
                return (
                  <button
                    key={source.value}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        referralSource:
                          form.referralSource === source.value
                            ? ''
                            : source.value,
                      })
                    }
                    className={`p-2 rounded-lg border text-xs text-center transition-colors ${
                      form.referralSource === source.value
                        ? 'bg-teal-50 border-teal-500 font-medium'
                        : 'bg-white border-gray-300 hover:border-teal-300'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {IconComp && (
                        <IconComp
                          size={16}
                          className={source.color.split(' ')[0]}
                        />
                      )}
                      <span className="text-gray-700">{source.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          {form.referralSource === 'referred_by' && (
            <div>
              <label className="block text-xs font-semibold mb-1">
                Referred By
              </label>
              <input
                type="text"
                value={form.referralName}
                onChange={(e) =>
                  setForm({ ...form, referralName: e.target.value })
                }
                placeholder="Person's name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any additional notes..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <Icons.Loader2 size={14} className="animate-spin" />
              ) : (
                <Icons.Save size={14} />
              )}
              {initialData ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ==================== FOLLOW-UP FORM MODAL ====================
function FollowUpFormModal({
  isOpen,
  onClose,
  onSubmit,
  studentName,
  loading,
}) {
  const [form, setForm] = useState({
    followUpDate: getTodayStr(),
    outcome: '',
    notes: '',
  });
  useEffect(() => {
    if (isOpen)
      setForm({ followUpDate: getTodayStr(), outcome: '', notes: '' });
  }, [isOpen]);
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.followUpDate) return;
    onSubmit(form);
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Icons.CalendarClock size={20} className="text-blue-600" /> Add
            Follow-up
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Icons.X size={18} />
          </button>
        </div>
        {studentName && (
          <p className="text-sm text-gray-500 mb-4">
            For: <strong>{studentName}</strong>
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Date *</label>
            <input
              type="date"
              value={form.followUpDate}
              onChange={(e) =>
                setForm({ ...form, followUpDate: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Outcome</label>
            <select
              value={form.outcome}
              onChange={(e) => setForm({ ...form, outcome: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">Select...</option>
              {OUTCOME_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">
              Notes / Remarks
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Follow-up notes..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <Icons.Loader2 size={14} className="animate-spin" />
              ) : (
                <Icons.Save size={14} />
              )}{' '}
              Save Follow-up
            </button>
          </div>
        </form>
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
  const [showForm, setShowForm] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [allFollowUps, setAllFollowUps] = useState([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [showFollowUpPanel, setShowFollowUpPanel] = useState(false);
  const [activeFollowUpRow, setActiveFollowUpRow] = useState(null);
  const [followUpForm, setFollowUpForm] = useState({
    followUpDate: getTodayStr(),
    outcome: '',
    notes: '',
  });
  const [followUpSaving, setFollowUpSaving] = useState(null);
  const [followUpDeleting, setFollowUpDeleting] = useState(null);
  const [panelCounsellorFilter, setPanelCounsellorFilter] = useState('');
  const [panelDateFrom, setPanelDateFrom] = useState('');
  const [panelDateTo, setPanelDateTo] = useState('');

  // ✅ Separate modal for follow-up from panel
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpModalData, setFollowUpModalData] = useState({
    preadmissionId: null,
    studentName: '',
  });

  const hasRead = can('admission', 'read'),
    hasCreate = can('admission', 'create'),
    hasUpdate = can('admission', 'update'),
    hasDelete = can('admission', 'delete');

  const fetchAgents = useCallback(async () => {
    try {
      const r = await fetch('/api/agents');
      if (r.ok) setAgents((await r.json()).agents || []);
    } catch (e) {
      console.error(e);
    }
  }, []);
  const fetchDepartments = useCallback(async () => {
    try {
      const r = await fetch('/api/departments');
      if (r.ok) setDepartments((await r.json()).departments || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchPreadmissions = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: '1000' });
      if (search) p.append('search', search);
      if (statusFilter) p.append('status', statusFilter);
      if (departmentFilter) p.append('departmentId', departmentFilter);
      if (dateFrom) p.append('dateFrom', dateFrom);
      if (dateTo) p.append('dateTo', dateTo);
      const r = await fetch(`/api/preadmissions?${p}`);
      if (r.ok) setPreadmissions((await r.json()).preadmissions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, departmentFilter, dateFrom, dateTo]);

  const fetchAllFollowUps = useCallback(async () => {
    setFollowUpsLoading(true);
    try {
      const r = await fetch('/api/followups?limit=1000');
      if (r.ok) {
        const data = await r.json();
        setAllFollowUps(data.followUps || data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFollowUpsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
    fetchAgents();
  }, [fetchDepartments, fetchAgents]);
  useEffect(() => {
    if (hasRead) {
      fetchPreadmissions();
      fetchAllFollowUps();
    }
  }, [hasRead, fetchPreadmissions, fetchAllFollowUps]);

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
      const r = await fetch(url, {
        method: editingData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fd),
      });
      if (r.ok) {
        showMsg(editingData ? 'Updated!' : 'Added!');
        setShowForm(false);
        setEditingData(null);
        fetchPreadmissions();
      } else throw new Error((await r.json()).error || 'Failed');
    } catch (e) {
      showMsg(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const r = await fetch(`/api/preadmissions/${deleteId}`, {
        method: 'DELETE',
      });
      if (r.ok) {
        showMsg('Deleted!');
        setDeleteId(null);
        fetchPreadmissions();
      } else throw new Error((await r.json()).error || 'Failed');
    } catch (e) {
      showMsg(e.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // ✅ Submit follow-up from modal (panel)
  const handleFollowUpModalSubmit = async (formData) => {
    if (!followUpModalData.preadmissionId) return;
    setFollowUpSaving(followUpModalData.preadmissionId);
    try {
      const r = await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          preadmissionId: followUpModalData.preadmissionId,
        }),
      });
      const data = await r.json();
      if (r.ok) {
        showMsg('Follow-up added!');
        setShowFollowUpModal(false);
        setFollowUpModalData({ preadmissionId: null, studentName: '' });
        fetchAllFollowUps();
        fetchPreadmissions();
        await fetch(`/api/preadmissions/${followUpModalData.preadmissionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'follow_up' }),
        });
        fetchPreadmissions();
      } else {
        showMsg(data.error || data.message || 'Failed', 'error');
      }
    } catch (e) {
      showMsg(e.message, 'error');
    } finally {
      setFollowUpSaving(null);
    }
  };

  // ✅ Submit follow-up from inline form (main table)
  const handleAddFollowUp = async (preadmissionId) => {
    if (!followUpForm.followUpDate) return;
    setFollowUpSaving(preadmissionId);
    try {
      const r = await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...followUpForm, preadmissionId }),
      });
      const data = await r.json();
      if (r.ok) {
        showMsg('Follow-up added!');
        setActiveFollowUpRow(null);
        setFollowUpForm({
          followUpDate: getTodayStr(),
          outcome: '',
          notes: '',
        });
        fetchAllFollowUps();
        fetchPreadmissions();
        await fetch(`/api/preadmissions/${preadmissionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'follow_up' }),
        });
        fetchPreadmissions();
      } else {
        showMsg(data.error || data.message || 'Failed', 'error');
      }
    } catch (e) {
      showMsg(e.message, 'error');
    } finally {
      setFollowUpSaving(null);
    }
  };

  const handleFollowUpDelete = async (followUpId) => {
    if (!confirm('Delete this follow-up?')) return;
    setFollowUpDeleting(followUpId);
    try {
      const r = await fetch(`/api/followups/${followUpId}`, {
        method: 'DELETE',
      });
      if (r.ok) {
        showMsg('Follow-up deleted!');
        fetchAllFollowUps();
        fetchPreadmissions();
      }
    } catch (e) {
      showMsg(e.message, 'error');
    } finally {
      setFollowUpDeleting(null);
    }
  };
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setDepartmentFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const stats = useMemo(
    () => ({
      total: preadmissions.length,
      pending: preadmissions.filter((p) => p.status === 'pending').length,
      enrolled: preadmissions.filter((p) => p.status === 'enrolled').length,
      thisMonth: preadmissions.filter((p) => {
        const d = new Date(p.date),
          n = new Date();
        return (
          d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
        );
      }).length,
    }),
    [preadmissions]
  );

  const allCounsellors = useMemo(() => {
    const names = new Set();
    allFollowUps.forEach((fu) => {
      if (fu.counselor?.name) names.add(fu.counselor.name);
    });
    return [...names].sort();
  }, [allFollowUps]);

  const filteredFollowUps = useMemo(
    () =>
      allFollowUps.filter((fu) => {
        if (
          panelCounsellorFilter &&
          fu.counselor?.name !== panelCounsellorFilter
        )
          return false;
        if (
          panelDateFrom &&
          new Date(fu.followUpDate) < new Date(panelDateFrom)
        )
          return false;
        if (
          panelDateTo &&
          new Date(fu.followUpDate) > new Date(panelDateTo + 'T23:59:59')
        )
          return false;
        return true;
      }),
    [allFollowUps, panelCounsellorFilter, panelDateFrom, panelDateTo]
  );

  const counsellorStats = useMemo(() => {
    const st = {};
    filteredFollowUps.forEach((fu) => {
      const name = fu.counselor?.name || 'Unknown';
      const dk = new Date(fu.followUpDate).toISOString().split('T')[0];
      if (!st[name]) st[name] = { name, total: 0, dates: {} };
      st[name].total++;
      st[name].dates[dk] = (st[name].dates[dk] || 0) + 1;
    });
    return Object.values(st).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredFollowUps]);

  const allDates = useMemo(() => {
    const d = new Set();
    filteredFollowUps.forEach((fu) =>
      d.add(new Date(fu.followUpDate).toISOString().split('T')[0])
    );
    return [...d].sort();
  }, [filteredFollowUps]);

  const panelFollowUpsByStudent = useMemo(() => {
    const m = {};
    filteredFollowUps.forEach((fu) => {
      if (!m[fu.preadmissionId]) m[fu.preadmissionId] = [];
      m[fu.preadmissionId].push(fu);
    });
    return m;
  }, [filteredFollowUps]);

  const sortedPanelStudentIds = useMemo(
    () =>
      Object.keys(panelFollowUpsByStudent).sort((a, b) => {
        const sa = preadmissions.find((p) => p.id === parseInt(a));
        const sb = preadmissions.find((p) => p.id === parseInt(b));
        return (sa?.studentName || '').localeCompare(sb?.studentName || '');
      }),
    [panelFollowUpsByStudent, preadmissions]
  );

  const mainFollowUpsByStudent = useMemo(() => {
    const m = {};
    allFollowUps.forEach((fu) => {
      if (!m[fu.preadmissionId]) m[fu.preadmissionId] = [];
      m[fu.preadmissionId].push(fu);
    });
    return m;
  }, [allFollowUps]);

  const sortedPreadmissions = useMemo(
    () =>
      [...preadmissions].sort((a, b) => {
        const aHas = (mainFollowUpsByStudent[a.id]?.length || 0) > 0;
        const bHas = (mainFollowUpsByStudent[b.id]?.length || 0) > 0;
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        return (a.studentName || '').localeCompare(b.studentName || '');
      }),
    [preadmissions, mainFollowUpsByStudent]
  );

  const hasActiveFilters =
    search || statusFilter || departmentFilter || dateFrom || dateTo;
  const fd = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'N/A';

  // ✅ Open follow-up modal from panel
  const openFollowUpModal = (studentId) => {
    const student = preadmissions.find((p) => p.id === parseInt(studentId));
    setFollowUpModalData({
      preadmissionId: studentId,
      studentName: student?.studentName || '',
    });
    setShowFollowUpModal(true);
  };

  // ✅ Open inline follow-up form from main table
  const openFollowUpInline = (studentId) => {
    setFollowUpForm({ followUpDate: getTodayStr(), outcome: '', notes: '' });
    setActiveFollowUpRow(activeFollowUpRow === studentId ? null : studentId);
  };

  if (permLoading)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          <LoadingSkeleton />
        </div>
      </div>
    );
  if (!hasRead)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center max-w-md">
          <Icons.Lock size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-800 mb-2">Access Denied</h2>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-[100] bg-green-50 border-l-4 border-green-500 text-green-800 px-4 py-3 rounded-lg shadow-lg min-w-[280px]"
          >
            <div className="flex items-center gap-2">
              <Icons.CheckCircle size={20} className="text-green-500" />
              <span className="flex-1">{successMsg}</span>
              <button onClick={() => setSuccessMsg(null)} className="p-1">
                <Icons.X size={16} />
              </button>
            </div>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-[100] bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-lg shadow-lg min-w-[280px]"
          >
            <div className="flex items-center gap-2">
              <Icons.AlertCircle size={20} className="text-red-500" />
              <span className="flex-1">{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="p-1">
                <Icons.X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Icons.Home size={14} /> <span>/</span>{' '}
            <span className="text-gray-900 font-medium">Preadmission</span>
          </div>
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Preadmission Management
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {stats.total} inquiries • {allFollowUps.length} follow-ups
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowFollowUpPanel(!showFollowUpPanel)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium ${
                  showFollowUpPanel
                    ? 'bg-purple-600 text-white'
                    : 'bg-white border border-purple-300 text-purple-700 hover:bg-purple-50'
                }`}
              >
                <Icons.LayoutGrid size={16} />{' '}
                {showFollowUpPanel ? 'Hide Panel' : 'Follow-up Panel'}
              </button>
              <button
                onClick={() => {
                  fetchPreadmissions();
                  fetchAllFollowUps();
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 text-sm"
              >
                <Icons.RefreshCw size={16} /> Refresh
              </button>
              {hasCreate && (
                <button
                  onClick={() => {
                    setEditingData(null);
                    setShowForm(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg hover:from-teal-700 hover:to-emerald-700 flex items-center gap-2 text-sm font-medium"
                >
                  <Icons.Plus size={16} /> Add Student
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
              icon: Icons.Calendar,
              color: 'bg-blue-100 text-blue-600',
              label: 'This Month',
              value: stats.thisMonth,
            },
            {
              icon: Icons.CalendarClock,
              color: 'bg-purple-100 text-purple-600',
              label: 'Follow-ups',
              value: allFollowUps.length,
            },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 ${
                    s.color.split(' ')[0]
                  } rounded-xl flex items-center justify-center`}
                >
                  <s.icon size={22} className={s.color.split(' ')[1]} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Icons.Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Search name, phone, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg w-full text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white min-w-[130px]"
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
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white min-w-[150px]"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm w-36"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm w-36"
              />
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1 border border-red-200"
              >
                <Icons.X size={14} /> Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Follow-up Panel */}
      <AnimatePresence>
        {showFollowUpPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 overflow-hidden"
          >
            <div className="bg-white rounded-xl shadow-sm border p-4 space-y-4">
              {/* Panel Filters */}
              <div className="flex items-center gap-3 flex-wrap bg-purple-50 rounded-lg p-3 border border-purple-200">
                <Icons.Filter size={16} className="text-purple-600" />
                <select
                  value={panelCounsellorFilter}
                  onChange={(e) => setPanelCounsellorFilter(e.target.value)}
                  className="px-3 py-2 border border-purple-300 rounded-lg text-sm bg-white min-w-[160px]"
                >
                  <option value="">All Counsellors</option>
                  {allCounsellors.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={panelDateFrom}
                  onChange={(e) => setPanelDateFrom(e.target.value)}
                  className="px-3 py-2 border border-purple-300 rounded-lg text-sm w-36"
                  placeholder="From"
                />
                <span className="text-purple-400 text-xs">to</span>
                <input
                  type="date"
                  value={panelDateTo}
                  onChange={(e) => setPanelDateTo(e.target.value)}
                  className="px-3 py-2 border border-purple-300 rounded-lg text-sm w-36"
                  placeholder="To"
                />
                {(panelCounsellorFilter || panelDateFrom || panelDateTo) && (
                  <button
                    onClick={() => {
                      setPanelCounsellorFilter('');
                      setPanelDateFrom('');
                      setPanelDateTo('');
                    }}
                    className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200"
                  >
                    <Icons.X size={14} /> Clear
                  </button>
                )}
                <span className="text-xs text-purple-600 ml-auto">
                  {filteredFollowUps.length} follow-up(s)
                </span>
              </div>

              {/* Counsellor-wise Stats */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Icons.Users size={16} className="text-teal-600" />{' '}
                  Counsellor-wise Follow-up Count
                </h3>
                {counsellorStats.length === 0 ? (
                  <p className="text-center text-gray-400 py-4 text-sm">
                    No follow-ups match filter
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left py-2 px-3 font-semibold text-gray-600 uppercase border-b">
                            Counsellor
                          </th>
                          <th className="text-center py-2 px-3 font-semibold text-gray-600 uppercase border-b w-14">
                            Total
                          </th>
                          {allDates.map((date) => (
                            <th
                              key={date}
                              className="text-center py-2 px-2 font-semibold text-gray-600 uppercase border-b min-w-[70px]"
                            >
                              {new Date(date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {counsellorStats.map((cs) => (
                          <tr key={cs.name} className="hover:bg-gray-50">
                            <td className="py-2 px-3 font-medium text-gray-900 border-b">
                              {cs.name}
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-teal-600 border-b">
                              {cs.total}
                            </td>
                            {allDates.map((date) => (
                              <td
                                key={date}
                                className="py-2 px-2 text-center border-b"
                              >
                                {cs.dates[date] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-semibold">
                          <td className="py-2 px-3 text-gray-700 border-b">
                            Total
                          </td>
                          <td className="py-2 px-3 text-center text-teal-700 border-b">
                            {filteredFollowUps.length}
                          </td>
                          {allDates.map((date) => {
                            const total = counsellorStats.reduce(
                              (sum, cs) => sum + (cs.dates[date] || 0),
                              0
                            );
                            return (
                              <td
                                key={date}
                                className="py-2 px-2 text-center border-b text-gray-700"
                              >
                                {total || '-'}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Student-wise Follow-ups */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Icons.LayoutGrid size={16} className="text-purple-600" />{' '}
                  Student-wise Follow-ups
                </h3>
                {followUpsLoading ? (
                  <div className="flex justify-center py-8">
                    <Icons.Loader2
                      size={24}
                      className="animate-spin text-purple-600"
                    />
                  </div>
                ) : sortedPanelStudentIds.length === 0 ? (
                  <p className="text-center text-gray-400 py-4 text-sm">
                    No follow-ups match filter
                  </p>
                ) : (
                  <div
                    className="overflow-x-auto"
                    style={{ maxHeight: '350px' }}
                  >
                    <table className="w-full border-collapse text-xs">
                      <thead className="sticky top-0 z-0">
                        <tr className="bg-gray-50">
                          <th className="sticky left-0 bg-gray-50 text-left py-2 px-3 font-semibold text-gray-600 uppercase border-b z-20 min-w-[150px]">
                            Student
                          </th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-600 uppercase border-b bg-gray-50">
                            Phone
                          </th>
                          {allDates.map((date) => (
                            <th
                              key={date}
                              className="text-center py-2 px-2 font-semibold text-gray-600 uppercase border-b bg-gray-50 min-w-[100px]"
                            >
                              {new Date(date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </th>
                          ))}
                          <th className="text-center py-2 px-2 font-semibold text-gray-600 uppercase border-b bg-gray-50">
                            +
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sortedPanelStudentIds.map((id) => {
                          const fus = panelFollowUpsByStudent[id] || [];
                          const student = preadmissions.find(
                            (p) => p.id === parseInt(id)
                          );
                          const name = student?.studentName || `ID:${id}`;
                          const phone = student?.phone || '';
                          const fuMap = {};
                          fus.forEach((fu) => {
                            const dk = new Date(fu.followUpDate)
                              .toISOString()
                              .split('T')[0];
                            if (!fuMap[dk]) fuMap[dk] = [];
                            fuMap[dk].push(fu);
                          });
                          return (
                            <tr key={id} className="hover:bg-gray-50">
                              <td className="sticky left-0 bg-white py-2 px-3 font-medium text-gray-900 border-b z-0">
                                {name}
                              </td>
                              <td className="py-2 px-3 text-gray-600 border-b whitespace-nowrap">
                                {phone}
                              </td>
                              {allDates.map((date) => {
                                const fusOnDate = fuMap[date] || [];
                                return (
                                  <td
                                    key={date}
                                    className="py-1 px-1 border-b align-top"
                                  >
                                    {fusOnDate.length > 0 ? (
                                      <div className="space-y-1">
                                        {fusOnDate.map((fu, i) => (
                                          <div
                                            key={fu.id || i}
                                            className="relative group"
                                          >
                                            <div
                                              className={`px-1.5 py-0.5 rounded text-xs font-medium text-center ${
                                                fu.outcome === 'enrolled'
                                                  ? 'bg-green-100 text-green-700'
                                                  : fu.outcome === 'interested'
                                                  ? 'bg-blue-100 text-blue-700'
                                                  : fu.outcome ===
                                                    'not_interested'
                                                  ? 'bg-red-100 text-red-700'
                                                  : fu.outcome === 'will_think'
                                                  ? 'bg-yellow-100 text-yellow-700'
                                                  : 'bg-gray-100 text-gray-700'
                                              }`}
                                            >
                                              {fu.outcome
                                                ? fu.outcome.replace('_', ' ')
                                                : 'Called'}
                                            </div>
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50">
                                              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg w-48">
                                                <p className="font-semibold">
                                                  {fd(fu.followUpDate)}
                                                </p>
                                                <p className="mt-1">
                                                  <strong>Outcome:</strong>{' '}
                                                  {fu.outcome
                                                    ? fu.outcome.replace(
                                                        '_',
                                                        ' '
                                                      )
                                                    : 'Called'}
                                                </p>
                                                {fu.notes && (
                                                  <p className="text-gray-300 mt-1">
                                                    <strong>Notes:</strong>{' '}
                                                    {fu.notes}
                                                  </p>
                                                )}
                                                <p className="text-gray-400 mt-1">
                                                  <strong>By:</strong>{' '}
                                                  {fu.counselor?.name || 'N/A'}
                                                </p>
                                                <p className="text-gray-500">
                                                  <strong>Status:</strong>{' '}
                                                  {fu.status}
                                                </p>
                                              </div>
                                              <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
                                            </div>
                                            <button
                                              onClick={() =>
                                                handleFollowUpDelete(fu.id)
                                              }
                                              disabled={
                                                followUpDeleting === fu.id
                                              }
                                              className="absolute -top-1.5 -right-1.5 hidden group-hover:flex p-0.5 bg-red-500 text-white rounded-full z-20"
                                            >
                                              {followUpDeleting === fu.id ? (
                                                <Icons.Loader2
                                                  size={8}
                                                  className="animate-spin"
                                                />
                                              ) : (
                                                <Icons.X size={8} />
                                              )}
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-gray-300">-</span>
                                    )}
                                  </td>
                                );
                              })}
                              {/* ✅ + button opens follow-up modal */}
                              <td className="py-2 px-2 text-center border-b">
                                <button
                                  onClick={() => openFollowUpModal(id)}
                                  className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                                  title="Add follow-up for this student"
                                >
                                  <Icons.Plus size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {loading ? (
          <LoadingSkeleton />
        ) : sortedPreadmissions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <Icons.Users size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {hasActiveFilters
                ? 'No matching records'
                : 'No preadmission records'}
            </h3>
            <p className="text-gray-500 mb-4">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'Get started by adding your first student'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
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
                  className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  Add First Student
                </button>
              )
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div
              className="overflow-x-auto"
              style={{ maxHeight: 'calc(100vh - 300px)' }}
            >
              <table className="w-full">
                <thead className="sticky top-0 z-0">
                  <tr className="bg-gray-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase border-b bg-gray-50">
                      #
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase border-b bg-gray-50">
                      Student
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase border-b bg-gray-50">
                      Contact
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase border-b bg-gray-50">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase border-b bg-gray-50">
                      Depts
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase border-b bg-gray-50">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase border-b bg-gray-50">
                      Follow-ups
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase border-b bg-gray-50">
                      Add
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase border-b bg-gray-50">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedPreadmissions.map((p, idx) => {
                    const status = STATUS_OPTIONS.find(
                      (s) => s.value === p.status
                    );
                    const studentFollowUps = mainFollowUpsByStudent[p.id] || [];
                    const isActive = activeFollowUpRow === p.id;
                    const hasFollowUp = studentFollowUps.length > 0;
                    return (
                      <React.Fragment key={p.id}>
                        <tr
                          className={`hover:bg-gray-50 transition-colors ${
                            isActive ? 'bg-blue-50/30' : ''
                          } ${
                            hasFollowUp ? 'border-l-4 border-l-purple-400' : ''
                          }`}
                        >
                          <td className="py-3 px-4 text-sm text-gray-500">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">
                                {p.studentName}
                              </p>
                              {hasFollowUp && (
                                <span className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">
                                  <Icons.CalendarClock size={10} />{' '}
                                  {studentFollowUps.length}
                                </span>
                              )}
                            </div>
                            {p.gpa != null && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                                GPA: {p.gpa}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <p className="text-gray-700">{p.phone}</p>
                            {p.email && (
                              <p className="text-gray-400 text-xs">{p.email}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                            {fd(p.date)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {p.departments?.slice(0, 2).map((d) => (
                                <span
                                  key={d.departmentId}
                                  className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full"
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
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${
                                status?.color ||
                                'bg-gray-100 text-gray-800 border-gray-300'
                              }`}
                            >
                              {status?.label || p.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {studentFollowUps.length > 0 ? (
                              <div className="space-y-1">
                                {studentFollowUps.map((fu) => (
                                  <div
                                    key={fu.id}
                                    className="flex items-center gap-2 text-xs group relative"
                                  >
                                    <span className="text-gray-600 whitespace-nowrap">
                                      {fd(fu.followUpDate)}
                                    </span>
                                    {fu.outcome && (
                                      <span
                                        className={`px-1.5 py-0.5 rounded-full text-xs ${
                                          fu.outcome === 'enrolled'
                                            ? 'bg-green-100 text-green-700'
                                            : fu.outcome === 'interested'
                                            ? 'bg-blue-100 text-blue-700'
                                            : fu.outcome === 'not_interested'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-yellow-100 text-yellow-700'
                                        }`}
                                      >
                                        {fu.outcome.replace('_', ' ')}
                                      </span>
                                    )}
                                    {fu.notes && (
                                      <span
                                        className="text-gray-400 italic truncate max-w-[80px]"
                                        title={fu.notes}
                                      >
                                        {fu.notes}
                                      </span>
                                    )}
                                    {fu.counselor && (
                                      <span className="text-gray-400 text-xs">
                                        by {fu.counselor.name}
                                      </span>
                                    )}
                                    <button
                                      onClick={() =>
                                        handleFollowUpDelete(fu.id)
                                      }
                                      disabled={followUpDeleting === fu.id}
                                      className="hidden group-hover:block p-0.5 text-red-400 hover:text-red-600 ml-auto"
                                    >
                                      {followUpDeleting === fu.id ? (
                                        <Icons.Loader2
                                          size={10}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <Icons.X size={10} />
                                      )}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => openFollowUpInline(p.id)}
                              className={`p-2 rounded-lg transition-colors ${
                                isActive
                                  ? 'bg-blue-600 text-white'
                                  : 'text-blue-600 hover:bg-blue-50'
                              }`}
                            >
                              <Icons.Plus size={16} />
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1">
                              {hasUpdate && (
                                <button
                                  onClick={() => {
                                    setEditingData(p);
                                    setShowForm(true);
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                >
                                  <Icons.Edit2 size={16} />
                                </button>
                              )}
                              {hasDelete && (
                                <button
                                  onClick={() => setDeleteId(p.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                  <Icons.Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isActive && (
                          <tr>
                            <td colSpan={9} className="bg-blue-50/50 p-3">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-sm font-medium text-blue-900">
                                  Add Follow-up for{' '}
                                  <strong>{p.studentName}</strong>:
                                </span>
                                <input
                                  type="date"
                                  value={followUpForm.followUpDate}
                                  onChange={(e) =>
                                    setFollowUpForm({
                                      ...followUpForm,
                                      followUpDate: e.target.value,
                                    })
                                  }
                                  className="px-3 py-2 border border-blue-300 rounded-lg text-sm w-36"
                                />
                                <select
                                  value={followUpForm.outcome}
                                  onChange={(e) =>
                                    setFollowUpForm({
                                      ...followUpForm,
                                      outcome: e.target.value,
                                    })
                                  }
                                  className="px-3 py-2 border border-blue-300 rounded-lg text-sm w-36"
                                >
                                  <option value="">Outcome</option>
                                  {OUTCOME_OPTIONS.map((o) => (
                                    <option key={o} value={o}>
                                      {o.replace('_', ' ')}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  value={followUpForm.notes}
                                  onChange={(e) =>
                                    setFollowUpForm({
                                      ...followUpForm,
                                      notes: e.target.value,
                                    })
                                  }
                                  placeholder="Remarks / Notes"
                                  className="px-3 py-2 border border-blue-300 rounded-lg text-sm flex-1 min-w-[200px]"
                                />
                                <button
                                  onClick={() => handleAddFollowUp(p.id)}
                                  disabled={followUpSaving === p.id}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center gap-1"
                                >
                                  {followUpSaving === p.id ? (
                                    <Icons.Loader2
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Icons.Save size={14} />
                                  )}{' '}
                                  Save
                                </button>
                                <button
                                  onClick={() => setActiveFollowUpRow(null)}
                                  className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-200 rounded-lg"
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-6 py-3 border-t bg-gray-50">
              <p className="text-sm text-gray-600">
                Showing{' '}
                <span className="font-medium">
                  {sortedPreadmissions.length}
                </span>{' '}
                record{sortedPreadmissions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Student Form Modal */}
      <StudentFormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingData(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingData}
        departments={departments}
        agents={agents}
        loading={saving}
      />

      {/* ✅ Follow-up Form Modal (from panel) */}
      <FollowUpFormModal
        isOpen={showFollowUpModal}
        onClose={() => {
          setShowFollowUpModal(false);
          setFollowUpModalData({ preadmissionId: null, studentName: '' });
        }}
        onSubmit={handleFollowUpModalSubmit}
        studentName={followUpModalData.studentName}
        loading={followUpSaving === followUpModalData.preadmissionId}
      />

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50"
            onClick={() => !isDeleting && setDeleteId(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icons.AlertTriangle size={32} className="text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Delete Record?
                </h3>
                <p className="text-gray-600">This action cannot be undone.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 border rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <Icons.Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Icons.Trash2 size={18} />
                  )}
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
