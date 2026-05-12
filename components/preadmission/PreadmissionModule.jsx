'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

// ==================== REFERRAL SOURCES ====================
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

// ==================== CONFIRMATION MODAL ====================
function ConfirmModal({ isOpen, onClose, onConfirm, title, message, loading }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Icons.AlertTriangle size={32} className="text-red-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-center text-gray-800 mb-2">
              {title}
            </h3>
            <p className="text-gray-600 text-center mb-6">{message}</p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Icons.Loader2 size={18} className="animate-spin" />{' '}
                    Deleting...
                  </>
                ) : (
                  <>
                    <Icons.Trash2 size={18} /> Delete
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ==================== STUDENT CARD ====================
function StudentCard({
  preadmission,
  departments,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onStatusChange,
}) {
  const referral = REFERRAL_SOURCES.find(
    (r) => r.value === preadmission.referralSource
  );
  const status = STATUS_OPTIONS.find((s) => s.value === preadmission.status);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDepartmentNames = () => {
    if (!preadmission.departments?.length) return 'No departments';
    return preadmission.departments
      .map((d) => d.department?.name || `Dept ${d.departmentId}`)
      .join(', ');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-gray-900 truncate">
                {preadmission.studentName}
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${status?.color} border`}
              >
                {status?.label}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mt-1">
              <span className="flex items-center gap-1">
                <Icons.Phone size={14} className="text-gray-400" />{' '}
                {preadmission.phone}
              </span>
              {preadmission.email && (
                <span className="flex items-center gap-1">
                  <Icons.Mail size={14} className="text-gray-400" />{' '}
                  {preadmission.email}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Icons.Calendar size={14} className="text-gray-400" />{' '}
                {formatDate(preadmission.date)}
              </span>
            </div>

            {/* Departments */}
            <div className="flex flex-wrap gap-1 mt-2">
              {preadmission.departments?.map((d) => (
                <span
                  key={d.departmentId}
                  className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200"
                >
                  {d.department?.name || `Dept ${d.departmentId}`}
                </span>
              )) || (
                <span className="text-xs text-gray-400">No departments</span>
              )}
            </div>

            {/* Referral */}
            {referral && (
              <div className="flex items-center gap-1.5 mt-2 text-xs">
                <div className={`p-1 rounded ${referral.color}`}>
                  {React.createElement(Icons[referral.icon], { size: 12 })}
                </div>
                <span className="text-gray-500">
                  via <span className="font-medium">{referral.label}</span>
                </span>
                {preadmission.referralName && (
                  <span className="text-gray-400">
                    - {preadmission.referralName}
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onToggle}
            className="p-1.5 hover:bg-gray-100 rounded-lg ml-2 flex-shrink-0"
          >
            {isExpanded ? (
              <Icons.ChevronUp size={18} />
            ) : (
              <Icons.ChevronDown size={18} />
            )}
          </button>
        </div>

        {/* Expanded Details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                {preadmission.address && (
                  <div className="flex items-start gap-2">
                    <Icons.MapPin size={14} className="text-gray-400 mt-0.5" />
                    <span className="text-gray-600">
                      {preadmission.address}
                    </span>
                  </div>
                )}
                {preadmission.notes && (
                  <div className="bg-gray-50 rounded-lg p-2.5 text-gray-600 border border-gray-100">
                    <span className="text-xs font-semibold text-gray-500">
                      Notes:
                    </span>
                    <br />
                    {preadmission.notes}
                  </div>
                )}
                <div className="flex justify-between text-xs text-gray-400 pt-1">
                  <span>Created: {formatDate(preadmission.createdAt)}</span>
                  {preadmission.counselor && (
                    <span>By: {preadmission.counselor.name}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={onEdit}
                    className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                  >
                    <Icons.Edit2 size={12} /> Edit
                  </button>
                  <button
                    onClick={onDelete}
                    className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1"
                  >
                    <Icons.Trash2 size={12} /> Delete
                  </button>
                  <select
                    value={preadmission.status}
                    onChange={(e) =>
                      onStatusChange(preadmission.id, e.target.value)
                    }
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ==================== FORM MODAL ====================
function PreadmissionFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  departments,
  loading,
}) {
  const [form, setForm] = useState({
    studentName: '',
    phone: '',
    address: '',
    email: '',
    date: new Date().toISOString().split('T')[0],
    referralSource: '',
    referralName: '',
    notes: '',
    departmentIds: [],
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setForm({
        studentName: initialData.studentName || '',
        phone: initialData.phone || '',
        address: initialData.address || '',
        email: initialData.email || '',
        date: initialData.date
          ? new Date(initialData.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        referralSource: initialData.referralSource || '',
        referralName: initialData.referralName || '',
        notes: initialData.notes || '',
        departmentIds:
          initialData.departments?.map((d) => d.departmentId) || [],
      });
    } else {
      setForm({
        studentName: '',
        phone: '',
        address: '',
        email: '',
        date: new Date().toISOString().split('T')[0],
        referralSource: '',
        referralName: '',
        notes: '',
        departmentIds: [],
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

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
    onSubmit(form);
  };

  const toggleDepartment = (deptId) => {
    setForm((prev) => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(deptId)
        ? prev.departmentIds.filter((id) => id !== deptId)
        : [...prev.departmentIds, deptId],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 mx-4"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Icons.UserPlus size={20} className="text-indigo-600" />
            {initialData ? 'Edit Student' : 'Add New Student'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Icons.X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Student Name */}
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
              placeholder="Enter full name"
              className={`w-full rounded-lg border px-3 py-2 text-sm ${
                errors.studentName ? 'border-red-500' : 'border-gray-300'
              } focus:ring-2 focus:ring-indigo-500`}
            />
            {errors.studentName && (
              <p className="text-xs text-red-500 mt-1">{errors.studentName}</p>
            )}
          </div>

          {/* Phone & Email */}
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
                } focus:ring-2 focus:ring-indigo-500`}
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
                placeholder="student@email.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold mb-1">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Enter address"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Departments */}
          <div>
            <label className="block text-xs font-semibold mb-2">
              Departments *
              {form.departmentIds.length > 0 && (
                <span className="text-indigo-600 ml-1">
                  ({form.departmentIds.length} selected)
                </span>
              )}
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => toggleDepartment(dept.id)}
                  className={`p-2.5 rounded-lg border text-sm text-left transition-colors ${
                    form.departmentIds.includes(dept.id)
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-medium'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        form.departmentIds.includes(dept.id)
                          ? 'bg-indigo-600 border-indigo-600'
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

          {/* Referral Source */}
          <div>
            <label className="block text-xs font-semibold mb-2">
              How did you know about ACHS?
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
                          source.value === form.referralSource
                            ? ''
                            : source.value,
                      })
                    }
                    className={`p-2 rounded-lg border text-xs text-center transition-colors ${
                      form.referralSource === source.value
                        ? 'bg-indigo-50 border-indigo-500 font-medium'
                        : 'bg-white border-gray-300 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <IconComp
                        size={16}
                        className={source.color.split(' ')[0]}
                      />
                      <span className="text-gray-700">{source.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Referred By Name */}
          {form.referralSource === 'referred_by' && (
            <div>
              <label className="block text-xs font-semibold mb-1">
                Referred By (Name)
              </label>
              <input
                type="text"
                value={form.referralName}
                onChange={(e) =>
                  setForm({ ...form, referralName: e.target.value })
                }
                placeholder="Enter name of person who referred"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any additional notes..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Buttons */}
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
              className="px-6 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <Icons.Loader2 size={14} className="animate-spin" />
              ) : (
                <Icons.Save size={14} />
              )}
              {initialData ? 'Update' : 'Save Student'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ==================== STATS CARDS ====================
function StatsCards({ stats }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {[
        {
          icon: Icons.Users,
          color: 'bg-indigo-100 text-indigo-600',
          label: 'Total Inquiries',
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
      ].map((s, i) => (
        <div
          key={i}
          className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
        >
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
  );
}

// ==================== MAIN MODULE ====================
export default function PreadmissionModule({ isOpen, onClose }) {
  const [preadmissions, setPreadmissions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments || []);
      }
    } catch (e) {
      console.error('Error fetching departments:', e);
    }
  }, []);

  const fetchPreadmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (departmentFilter) params.append('departmentId', departmentFilter);

      const res = await fetch(`/api/preadmissions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPreadmissions(data.preadmissions || []);
        setPagination(data.pagination);
      }
    } catch (e) {
      console.error('Error fetching:', e);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, departmentFilter]);

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
    }
  }, [isOpen, fetchDepartments]);
  useEffect(() => {
    if (isOpen) {
      fetchPreadmissions();
    }
  }, [isOpen, fetchPreadmissions]);

  const showMsg = (msg, type = 'success') => {
    if (type === 'success') {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleSubmit = async (formData) => {
    setSaving(true);
    try {
      const url = editingData
        ? `/api/preadmissions/${editingData.id}`
        : '/api/preadmissions';
      const res = await fetch(url, {
        method: editingData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        showMsg(
          editingData ? 'Updated successfully!' : 'Student added successfully!'
        );
        setShowForm(false);
        setEditingData(null);
        fetchPreadmissions();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }
    } catch (e) {
      showMsg(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await fetch(`/api/preadmissions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchPreadmissions();
    } catch (e) {
      console.error('Status update error:', e);
    }
  };

  const openDeleteModal = (id) => setDeleteModal({ isOpen: true, id });
  const closeDeleteModal = () => {
    if (!isDeleting) setDeleteModal({ isOpen: false, id: null });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/preadmissions/${deleteModal.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showMsg('Deleted successfully!');
        setDeleteModal({ isOpen: false, id: null });
        fetchPreadmissions();
      } else throw new Error('Failed to delete');
    } catch (e) {
      showMsg(e.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Compute stats
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      total: pagination.total || preadmissions.length,
      pending: preadmissions.filter((p) => p.status === 'pending').length,
      enrolled: preadmissions.filter((p) => p.status === 'enrolled').length,
      thisMonth: preadmissions.filter((p) => new Date(p.date) >= thisMonth)
        .length,
    };
  }, [preadmissions, pagination]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute inset-4 md:inset-8 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2"
            >
              <Icons.X size={20} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Icons.UserPlus size={24} /> Preadmission Module
              </h2>
              <p className="text-white/70 text-sm">
                Manage student inquiries and registrations
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingData(null);
              setShowForm(true);
            }}
            className="px-4 py-2 bg-white text-emerald-700 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-emerald-50"
          >
            <Icons.Plus size={16} /> Add New Student
          </button>
        </div>

        {/* Messages */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="absolute top-20 right-6 z-50 bg-green-50 border-l-4 border-green-500 text-green-800 px-4 py-3 rounded-lg shadow-lg"
            >
              <Icons.CheckCircle size={18} className="inline mr-2" />
              {successMessage}
            </motion.div>
          )}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="absolute top-20 right-6 z-50 bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-lg shadow-lg"
            >
              <Icons.AlertCircle size={18} className="inline mr-2" />
              {errorMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Stats */}
          <div className="px-6 pt-4">
            <StatsCards stats={stats} />
          </div>

          {/* Search & Filters */}
          <div className="px-6 py-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Icons.Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Search by name, phone, email..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  setEditingData(null);
                  setShowForm(true);
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-emerald-700"
              >
                <Icons.Plus size={16} /> New Student
              </button>
            </div>
          </div>

          {/* Student List */}
          <div className="px-6 pb-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Icons.Loader2
                  size={40}
                  className="animate-spin text-emerald-600"
                />
              </div>
            ) : preadmissions.length === 0 ? (
              <div className="text-center py-20">
                <Icons.Users size={64} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  No preadmission records found
                </p>
                <button
                  onClick={() => {
                    setEditingData(null);
                    setShowForm(true);
                  }}
                  className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
                >
                  Add First Student
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {preadmissions.map((p) => (
                  <StudentCard
                    key={p.id}
                    preadmission={p}
                    departments={departments}
                    isExpanded={expandedIds.has(p.id)}
                    onToggle={() => toggleExpand(p.id)}
                    onEdit={() => {
                      setEditingData(p);
                      setShowForm(true);
                    }}
                    onDelete={() => openDeleteModal(p.id)}
                    onStatusChange={handleStatusChange}
                  />
                ))}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <span className="text-sm text-gray-500">
                      Showing {(page - 1) * 20 + 1}-
                      {Math.min(page * 20, pagination.total)} of{' '}
                      {pagination.total}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50"
                      >
                        Previous
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
        </div>
      </motion.div>

      {/* Form Modal */}
      <PreadmissionFormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingData(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingData}
        departments={departments}
        loading={saving}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title="Delete Record"
        message="This action cannot be undone. All data will be permanently removed."
        loading={isDeleting}
      />
    </div>
  );
}
