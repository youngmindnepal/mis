// components/classroom/RoutineManager3D.jsx
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Clock,
  Plus,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Edit2,
  Trash2,
  Printer,
  BookOpen,
  AlertTriangle,
  User,
  Combine,
  Search,
  Home,
  ChevronRight,
  Coffee,
  ChevronDown,
} from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const TIME_SLOTS = [
  { id: 0, display: '07:01-07:30' },
  { id: 1, display: '07:31-08:00' },
  { id: 2, display: '08:01-08:30' },
  { id: 3, display: '08:31-09:00' },
  { id: 4, display: '09:01-09:30' },
  { id: 5, display: '09:31-10:00' },
  { id: 6, display: '10:01-10:30' },
  { id: 7, display: '10:31-11:00' },
  { id: 8, display: '11:01-11:30' },
  { id: 9, display: '11:31-12:00' },
  { id: 10, display: '12:01-12:30' },
  { id: 11, display: '12:31-01:00' },
  { id: 12, display: '01:01-01:30' },
  { id: 13, display: '01:31-02:00' },
];

const STATUS_STYLES = {
  active: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-300',
    dot: 'bg-green-500',
    printBg: '#dcfce7',
  },
  cancelled: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
    dot: 'bg-red-500',
    printBg: '#fee2e2',
  },
  makeup: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-300',
    dot: 'bg-yellow-500',
    printBg: '#fef9c3',
  },
  break: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-300',
    dot: 'bg-blue-500',
    printBg: '#dbeafe',
  },
};

const STATUS_LABELS = {
  active: 'Active',
  cancelled: 'Cancelled',
  makeup: 'Makeup',
  break: 'Break',
};

const CONFLICT_TYPES = {
  faculty: {
    label: 'Faculty Conflict',
    bg: 'bg-red-50',
    border: 'border-red-300',
    iconBg: 'bg-red-200',
    icon: User,
    iconColor: 'text-red-600',
    badge: 'bg-red-200 text-red-800',
  },
  room: {
    label: 'Room Conflict',
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    iconBg: 'bg-orange-200',
    icon: BookOpen,
    iconColor: 'text-orange-600',
    badge: 'bg-orange-200 text-orange-800',
  },
  roomNumber: {
    label: 'Room # Conflict',
    bg: 'bg-purple-50',
    border: 'border-purple-300',
    iconBg: 'bg-purple-200',
    icon: Home,
    iconColor: 'text-purple-600',
    badge: 'bg-purple-200 text-purple-800',
  },
};

// ==================== COURSE COLOR PALETTE ====================
const COURSE_COLORS = [
  {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-300',
    printBg: '#dbeafe',
    printText: '#1e40af',
  },
  {
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    printBg: '#d1fae5',
    printText: '#065f46',
  },
  {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-300',
    printBg: '#ede9fe',
    printText: '#5b21b6',
  },
  {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-300',
    printBg: '#fef3c7',
    printText: '#92400e',
  },
  {
    bg: 'bg-rose-100',
    text: 'text-rose-800',
    border: 'border-rose-300',
    printBg: '#ffe4e6',
    printText: '#9f1239',
  },
  {
    bg: 'bg-cyan-100',
    text: 'text-cyan-800',
    border: 'border-cyan-300',
    printBg: '#cffafe',
    printText: '#155e75',
  },
  {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-300',
    printBg: '#ffedd5',
    printText: '#9a3412',
  },
  {
    bg: 'bg-teal-100',
    text: 'text-teal-800',
    border: 'border-teal-300',
    printBg: '#ccfbf1',
    printText: '#115e59',
  },
  {
    bg: 'bg-pink-100',
    text: 'text-pink-800',
    border: 'border-pink-300',
    printBg: '#fce7f3',
    printText: '#9d174d',
  },
  {
    bg: 'bg-lime-100',
    text: 'text-lime-800',
    border: 'border-lime-300',
    printBg: '#ecfccb',
    printText: '#3f6212',
  },
  {
    bg: 'bg-indigo-100',
    text: 'text-indigo-800',
    border: 'border-indigo-300',
    printBg: '#e0e7ff',
    printText: '#3730a3',
  },
  {
    bg: 'bg-fuchsia-100',
    text: 'text-fuchsia-800',
    border: 'border-fuchsia-300',
    printBg: '#fae8ff',
    printText: '#86198f',
  },
  {
    bg: 'bg-violet-100',
    text: 'text-violet-800',
    border: 'border-violet-300',
    printBg: '#ede9fe',
    printText: '#5b21b6',
  },
  {
    bg: 'bg-sky-100',
    text: 'text-sky-800',
    border: 'border-sky-300',
    printBg: '#e0f2fe',
    printText: '#075985',
  },
  {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
    printBg: '#fee2e2',
    printText: '#991b1b',
  },
  {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-300',
    printBg: '#dcfce7',
    printText: '#166534',
  },
];

// Hash function for consistent color assignment
const getCourseColor = (subject) => {
  if (!subject) return COURSE_COLORS[0];
  let hash = 0;
  for (let i = 0; i < subject.length; i++)
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  return COURSE_COLORS[Math.abs(hash) % COURSE_COLORS.length];
};

// ==================== SEARCHABLE DROPDOWN ====================
function SearchableDropdown({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  labelKey = 'name',
  valueKey = 'id',
  required,
  extraKey,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  const selected = options.find((o) => String(o[valueKey]) === String(value));
  const filtered = options.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o[labelKey]?.toLowerCase().includes(s) ||
      o.email?.toLowerCase().includes(s) ||
      o.code?.toLowerCase().includes(s) ||
      o.designation?.toLowerCase().includes(s) ||
      (extraKey && o[extraKey]?.toLowerCase().includes(s))
    );
  });
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        disabled={disabled}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-left flex items-center justify-between ${
          disabled
            ? 'bg-gray-100 cursor-not-allowed'
            : 'hover:border-indigo-400'
        } ${!value && required ? 'border-red-300' : 'border-gray-300'}`}
      >
        <span className={selected ? 'text-gray-900 truncate' : 'text-gray-400'}>
          {selected ? selected[labelKey] : placeholder || 'Select...'}
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-400 flex-shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b sticky top-0 bg-white">
            <div className="relative">
              <Search
                className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
                size={14}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                onClick={(e) => e.stopPropagation()}
                className="pl-8 pr-3 py-1.5 w-full border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-indigo-400"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-48">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                No results
              </div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o[valueKey]}
                  type="button"
                  onClick={() => {
                    onChange(String(o[valueKey]));
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 transition-colors ${
                    String(o[valueKey]) === String(value)
                      ? 'bg-indigo-100 font-medium'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate">{o[labelKey]}</span>
                    {o.designation && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        ({o.designation})
                      </span>
                    )}
                    {o.code && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        - {o.code}
                      </span>
                    )}
                    {o.email && (
                      <span className="text-xs text-gray-400 ml-auto truncate max-w-[100px]">
                        {o.email}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== MAIN COMPONENT ====================
export default function RoutineManager3D({
  classroomId,
  batchId,
  isOpen,
  onClose,
}) {
  const [routines, setRoutines] = useState([]);
  const [allActiveRoutines, setAllActiveRoutines] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [batches, setBatches] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [filteredClassrooms, setFilteredClassrooms] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('multipleBatches');
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [facultySearch, setFacultySearch] = useState('');
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelections, setMergeSelections] = useState([]);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [expandedBatchSections, setExpandedBatchSections] = useState({});
  const [form, setForm] = useState({
    facultyId: '',
    batchId: batchId || '',
    classroomId: classroomId || '',
    roomNumber: '',
    subject: '',
    day: 0,
    startSlot: 0,
    endSlot: 0,
    status: 'active',
    notes: '',
  });

  const roomDisplay = (r) =>
    [r?.classroom?.name, r?.roomNumber ? `(Rm ${r.roomNumber})` : '']
      .filter(Boolean)
      .join(' ') || '-';
  const isBatchView = !!(batchId || classroomId);
  const printDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const routinesByBatch = useMemo(() => {
    const g = {};
    allActiveRoutines.forEach((r) => {
      const k = r.batchId || 'unassigned';
      if (!g[k])
        g[k] = {
          batch: r.batch || { id: 'unassigned', name: 'Unassigned' },
          routines: [],
        };
      g[k].routines.push(r);
    });
    return Object.values(g).sort((a, b) =>
      (a.batch?.name || '').localeCompare(b.batch?.name || '')
    );
  }, [allActiveRoutines]);
  const facultyRoutines = useMemo(
    () =>
      selectedFaculty
        ? allActiveRoutines.filter(
            (r) => r.facultyId === parseInt(selectedFaculty)
          )
        : [],
    [allActiveRoutines, selectedFaculty]
  );
  const facultyInfo = useMemo(
    () => faculties.find((f) => f.id === parseInt(selectedFaculty)),
    [faculties, selectedFaculty]
  );
  const filteredFacultyList = useMemo(() => {
    const t = facultySearch.toLowerCase();
    return t
      ? faculties.filter(
          (f) =>
            f.name?.toLowerCase().includes(t) ||
            f.email?.toLowerCase().includes(t) ||
            f.designation?.toLowerCase().includes(t)
        )
      : faculties;
  }, [faculties, facultySearch]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const batchUrl = isBatchView
        ? `/api/routines?${
            batchId ? `batchId=${batchId}` : `classroomId=${classroomId}`
          }`
        : null;
      const [bRes, aRes] = await Promise.all([
        batchUrl
          ? fetch(batchUrl)
          : Promise.resolve({ ok: true, json: () => ({ routines: [] }) }),
        fetch('/api/routines?limit=10000'),
      ]);
      if (bRes.ok) setRoutines((await bRes.json()).routines || []);
      if (aRes.ok) setAllActiveRoutines((await aRes.json()).routines || []);
      try {
        const r = await fetch('/api/faculty?limit=1000');
        if (r.ok) {
          const d = await r.json();
          setFaculties(
            (d.faculty || d.faculties || []).sort((a, b) =>
              (a.name || '').localeCompare(b.name || '')
            )
          );
        }
      } catch {}
      try {
        const r = await fetch('/api/batches?limit=100');
        if (r.ok) {
          const bl = (await r.json()).batches || [];
          setBatches(Array.isArray(bl) ? bl : []);
          if (batchId) {
            const f = bl.find((b) => b.id === parseInt(batchId));
            if (f) setSelectedBatch(f);
          }
        }
      } catch {}
      try {
        let u = '/api/classrooms?limit=200';
        if (batchId) u += `&batchId=${batchId}`;
        const r = await fetch(u);
        if (r.ok) {
          const a = (await r.json()).classrooms || [];
          setClassrooms(a);
          setFilteredClassrooms(
            batchId ? a.filter((c) => c.batchId === parseInt(batchId)) : a
          );
        }
      } catch {}
    } catch {
    } finally {
      setLoading(false);
    }
  }, [classroomId, batchId, isBatchView]);

  useEffect(() => {
    if (isOpen) {
      setViewMode(isBatchView ? 'classroom' : 'multipleBatches');
      fetchData();
    }
  }, [isOpen, fetchData, isBatchView]);

  const displayRoutines = isBatchView ? routines : allActiveRoutines;
  const getRoutinesAt = (d, s, arr = displayRoutines) =>
    arr.filter((r) => r.day === d && r.timeSlot === s);
  const findMergedRoutine = (d, s, arr = displayRoutines) =>
    arr.find(
      (r) =>
        r.day === d && r.timeSlotEnd && r.timeSlot <= s && r.timeSlotEnd >= s
    );
  const isMergeSelected = (d, s) =>
    mergeSelections.some((x) => x.day === d && x.slotId === s);

  const checkConflicts = (fid, cid, rn, d, ss, se, ex = null) => {
    const c = [],
      all = allActiveRoutines.filter((r) => r.status !== 'break');
    for (let s = ss; s <= se; s++)
      all.forEach((r) => {
        if (r.id === ex) return;
        const re = r.timeSlotEnd ?? r.timeSlot;
        if (r.day !== d || r.timeSlot > s || re < s) return;
        if (
          fid &&
          r.facultyId === parseInt(fid) &&
          !c.find((x) => x.routine.id === r.id && x.type === 'faculty')
        )
          c.push({
            type: 'faculty',
            routine: r,
            message: `${r.faculty?.name || 'Faculty'} busy`,
            detail: `${DAYS[d]} • ${TIME_SLOTS[s]?.display}`,
            subject: r.subject || 'N/A',
            room: roomDisplay(r),
            batch: r.batch?.name || 'N/A',
          });
        if (
          cid &&
          r.classroomId === parseInt(cid) &&
          !c.find((x) => x.routine.id === r.id && x.type === 'room')
        )
          c.push({
            type: 'room',
            routine: r,
            message: `${r.classroom?.name || 'Room'} occupied`,
            detail: `${DAYS[d]} • ${TIME_SLOTS[s]?.display}`,
            subject: r.subject || 'N/A',
            faculty: r.faculty?.name || 'N/A',
            batch: r.batch?.name || 'N/A',
          });
        if (
          rn &&
          rn.trim() &&
          r.roomNumber &&
          r.roomNumber.trim().toLowerCase() === rn.trim().toLowerCase() &&
          (!cid || r.classroomId !== parseInt(cid)) &&
          !c.find((x) => x.routine.id === r.id && x.type === 'roomNumber')
        )
          c.push({
            type: 'roomNumber',
            routine: r,
            message: `Room "${rn}" in use`,
            detail: `${DAYS[d]} • ${TIME_SLOTS[s]?.display}`,
            subject: r.subject || 'N/A',
            faculty: r.faculty?.name || 'N/A',
            room: roomDisplay(r),
            batch: r.batch?.name || 'N/A',
          });
      });
    return c;
  };

  const toggleMerge = (d, s) =>
    setMergeSelections((p) => {
      const e = p.find((x) => x.day === d && x.slotId === s);
      if (e) return p.filter((x) => !(x.day === d && x.slotId === s));
      if (p.length > 0 && p[0].day !== d) return [{ day: d, slotId: s }];
      return [...p, { day: d, slotId: s }];
    });
  const confirmMerge = () => {
    if (mergeSelections.length < 2) {
      setErrorMsg('Select 2+ slots');
      return;
    }
    const d = mergeSelections[0].day;
    if (!mergeSelections.every((x) => x.day === d)) {
      setErrorMsg('Same day only');
      return;
    }
    const sl = mergeSelections.map((x) => x.slotId).sort((a, b) => a - b);
    for (let i = 1; i < sl.length; i++)
      if (sl[i] !== sl[i - 1] + 1) {
        setErrorMsg('Consecutive only');
        return;
      }
    setEditingRoutine(null);
    setForm((p) => ({
      ...p,
      facultyId: '',
      subject: '',
      day: d,
      startSlot: sl[0],
      endSlot: sl[sl.length - 1],
      status: 'active',
      notes: '',
    }));
    setMergeMode(false);
    setMergeSelections([]);
    setShowRoutineModal(true);
  };

  const handleSlotClick = (d, s, arr = displayRoutines) => {
    if (mergeMode) {
      toggleMerge(d, s);
      return;
    }
    const ex = getRoutinesAt(d, s, arr);
    if (ex.length > 0 && isBatchView) {
      setDeleteTarget({ day: d, slotId: s, routines: ex });
      setShowDeleteConfirm(true);
      return;
    }
    if (isBatchView) {
      setEditingRoutine(null);
      setForm((p) => ({
        ...p,
        facultyId: '',
        subject: '',
        day: d,
        startSlot: s,
        endSlot: s,
        status: 'active',
        notes: '',
      }));
      setShowRoutineModal(true);
    }
  };
  const handleEdit = (r, e) => {
    e?.stopPropagation();
    setEditingRoutine(r);
    setForm({
      facultyId: r.facultyId?.toString() || '',
      batchId: r.batchId?.toString() || batchId || '',
      classroomId: r.classroomId?.toString() || classroomId || '',
      roomNumber: r.roomNumber || '',
      subject: r.subject || '',
      day: r.day,
      startSlot: r.timeSlot,
      endSlot: r.timeSlotEnd || r.timeSlot,
      status: r.status || 'active',
      notes: r.notes || '',
    });
    setShowRoutineModal(true);
  };
  const deleteSingle = async (id) => {
    try {
      await fetch(`/api/routines?id=${id}`, { method: 'DELETE' });
      setSuccessMsg('Deleted!');
      setTimeout(() => setSuccessMsg(null), 3000);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      fetchData();
    } catch {
      setErrorMsg('Failed');
    }
  };
  const deleteSlot = async () => {
    if (!deleteTarget) return;
    try {
      for (const r of deleteTarget.routines)
        await fetch(`/api/routines?id=${r.id}`, { method: 'DELETE' });
      setSuccessMsg('Deleted!');
      setTimeout(() => setSuccessMsg(null), 3000);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      fetchData();
    } catch {
      setErrorMsg('Failed');
    }
  };

  const saveRoutine = async (force = false) => {
    if (form.status === 'break') {
      form.facultyId = '';
      form.classroomId = '';
      form.roomNumber = '';
      form.subject = 'Break';
    }
    if (!form.facultyId && form.status !== 'break') {
      setErrorMsg('Faculty required');
      return;
    }
    if (!form.batchId) {
      setErrorMsg('Batch required');
      return;
    }
    if (form.endSlot < form.startSlot) {
      setErrorMsg('Invalid range');
      return;
    }
    if (!force && form.status === 'active') {
      const c = checkConflicts(
        form.facultyId,
        form.classroomId,
        form.roomNumber,
        parseInt(form.day),
        parseInt(form.startSlot),
        parseInt(form.endSlot),
        editingRoutine?.id
      );
      if (c.length > 0) {
        setConflicts(c);
        setShowConflictModal(true);
        return;
      }
    }
    setSaving(true);
    try {
      const p = {
        facultyId: form.facultyId ? parseInt(form.facultyId) : undefined,
        batchId: parseInt(form.batchId),
        classroomId: form.classroomId ? parseInt(form.classroomId) : undefined,
        roomNumber: form.roomNumber || undefined,
        subject: form.subject || undefined,
        day: parseInt(form.day),
        timeSlot: parseInt(form.startSlot),
        timeSlotEnd:
          form.endSlot > form.startSlot ? parseInt(form.endSlot) : undefined,
        status: form.status,
        notes: form.notes || undefined,
      };
      if (editingRoutine) p.id = editingRoutine.id;
      Object.keys(p).forEach((k) => {
        if (p[k] === undefined) delete p[k];
      });
      const r = await fetch('/api/routines', {
        method: editingRoutine ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Save failed');
      setSuccessMsg(editingRoutine ? 'Updated!' : 'Added!');
      setTimeout(() => setSuccessMsg(null), 3000);
      setShowRoutineModal(false);
      setShowConflictModal(false);
      setEditingRoutine(null);
      fetchData();
    } catch (e) {
      setErrorMsg(e.message);
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const toggleBatch = (bid) =>
    setExpandedBatchSections((p) => ({ ...p, [bid]: !p[bid] }));

  // ==================== RENDER CELL WITH COURSE COLORS ====================
  const getCellStyle = (dr) => {
    if (!dr)
      return { bg: 'bg-white', border: 'border-gray-100', printBg: '#ffffff' };
    if (dr.status === 'break')
      return {
        bg: STATUS_STYLES.break.bg,
        border: STATUS_STYLES.break.border,
        printBg: STATUS_STYLES.break.printBg,
      };
    const cc = getCourseColor(dr.subject);
    return {
      bg:
        dr.status === 'cancelled'
          ? `${STATUS_STYLES.cancelled.bg} opacity-60`
          : dr.status === 'makeup'
          ? STATUS_STYLES.makeup.bg
          : cc.bg,
      border:
        dr.status === 'cancelled'
          ? STATUS_STYLES.cancelled.border
          : dr.status === 'makeup'
          ? STATUS_STYLES.makeup.border
          : cc.border,
      printBg:
        dr.status === 'cancelled'
          ? STATUS_STYLES.cancelled.printBg
          : dr.status === 'makeup'
          ? STATUS_STYLES.makeup.printBg
          : cc.printBg,
    };
  };

  const renderCell = (d, s, list, merged, prefix = '', showAdd = false) => {
    if (merged && merged.timeSlot !== s) return null;
    const dr = merged || list[0],
      rem = list.length > 1 ? list.length - 1 : 0;
    const cs = dr?.timeSlotEnd ? dr.timeSlotEnd - dr.timeSlot + 1 : 1;
    const sel = isMergeSelected(d, s);
    const style = getCellStyle(dr);
    return (
      <td
        key={prefix + s}
        className={`border p-0.5 align-top print:border-black ${
          sel ? 'bg-yellow-200 ring-2 ring-yellow-500 ring-inset' : ''
        }`}
        colSpan={cs}
        onClick={() => handleSlotClick(d, s, list)}
      >
        <div className="min-h-[40px] print:min-h-full">
          {dr ? (
            <div
              className={`text-[8px] p-1 rounded border cursor-pointer h-full print:text-[10px] print:shadow-none print:flex print:flex-col print:items-center print:justify-center print:text-center print:h-full print:border print:border-gray-400 relative group ${style.bg} ${style.border}`}
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(dr, e);
              }}
            >
              {dr.status === 'break' ? (
                <Coffee size={14} className="mx-auto text-blue-600" />
              ) : (
                <>
                  <div className="font-bold truncate print:text-[11px] print:font-extrabold print:mb-0.5">
                    {dr.faculty?.name || 'N/A'}
                  </div>
                  <div className="text-gray-600 truncate print:text-[10px] print:font-semibold print:mb-0.5">
                    {dr.subject || ''}
                  </div>
                  <div className="text-[7px] text-indigo-500 truncate print:text-[8px] font-medium">
                    {dr.batch?.name || ''}
                  </div>
                </>
              )}
              <div className="text-gray-500 truncate print:text-[9px]">
                {dr.status === 'break' ? 'BREAK' : roomDisplay(dr)}
              </div>
              {rem > 0 && (
                <div className="text-[7px] text-indigo-600 font-bold mt-0.5">
                  +{rem} more
                </div>
              )}
              {showAdd && (
                <div className="hidden group-hover:flex print:hidden absolute top-0 right-0 gap-0.5">
                  <button
                    onClick={(e) => handleEdit(dr, e)}
                    className="p-0.5 bg-blue-500 text-white rounded"
                  >
                    <Edit2 size={8} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSingle(dr.id);
                    }}
                    className="p-0.5 bg-red-500 text-white rounded"
                  >
                    <Trash2 size={8} />
                  </button>
                </div>
              )}
            </div>
          ) : showAdd ? (
            <button className="w-full h-full min-h-[40px] print:min-h-[28px] text-[9px] text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded flex items-center justify-center print:hidden">
              <Plus size={10} className="mr-0.5" />
              {mergeMode ? 'Select' : 'Add Routine'}
            </button>
          ) : (
            <div className="min-h-[40px]" />
          )}
        </div>
      </td>
    );
  };

  const renderTable = (arr, prefix = '', showAdd = false) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth: '1200px' }}>
        <thead>
          <tr>
            <th className="border p-1 bg-gray-100 text-xs font-semibold w-16 sticky left-0 bg-gray-100 z-10">
              Day
            </th>
            {TIME_SLOTS.map((s) => (
              <th
                key={prefix + s.id}
                className="border p-1 bg-gray-100 text-[8px] font-medium text-gray-600"
              >
                {s.display}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day, di) => (
            <tr key={prefix + di}>
              <td
                className={`border p-1 text-xs font-semibold sticky left-0 z-10 ${
                  mergeMode && mergeSelections.some((x) => x.day === di)
                    ? 'bg-yellow-100'
                    : 'bg-gray-50'
                }`}
                onClick={() =>
                  mergeMode &&
                  setMergeSelections(
                    TIME_SLOTS.map((s) => ({ day: di, slotId: s.id }))
                  )
                }
              >
                {day.substring(0, 3)}
              </td>
              {TIME_SLOTS.map((slot) => {
                const here = getRoutinesAt(di, slot.id, arr);
                const merged = findMergedRoutine(di, slot.id, arr);
                return renderCell(di, slot.id, here, merged, prefix, showAdd);
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ==================== PRINT CELL WITH COURSE COLORS ====================
  const renderPrintCell = (dr, cs) => {
    const style = getCellStyle(dr);
    return (
      <td
        className="border border-black p-0.5 align-middle text-center"
        colSpan={cs}
        style={{ backgroundColor: dr ? style.printBg : 'transparent' }}
      >
        {dr && (
          <div className="flex flex-col items-center justify-center h-full gap-0">
            {dr.status === 'break' ? (
              <span className="font-extrabold text-[8px] uppercase text-blue-700 leading-tight">
                BREAK
              </span>
            ) : (
              <>
                <div className="font-extrabold text-[7px] uppercase leading-tight truncate max-w-full">
                  {dr.faculty?.name || ''}
                </div>
                <div className="font-bold text-[6px] leading-tight truncate max-w-full">
                  {dr.subject || ''}
                </div>
                <div className="font-medium text-[6px] text-indigo-600 leading-tight truncate max-w-full">
                  {dr.batch?.name || ''}
                </div>
              </>
            )}
            <div className="font-medium text-[6px] text-gray-600 leading-tight truncate max-w-full">
              {dr.status === 'break' ? '' : roomDisplay(dr)}
            </div>
          </div>
        )}
      </td>
    );
  };

  // ==================== MULTI BATCH VIEW ====================
  const renderMultiBatchView = () => {
    const withContent = routinesByBatch.filter(
      (b) =>
        b.routines.filter((r) => r.status === 'active' || r.status === 'break')
          .length > 0
    );
    return (
      <div className="flex-1 overflow-auto">
        <div className="bg-indigo-50 border-b px-4 py-2 flex items-center justify-between text-sm print:hidden">
          <span className="font-medium text-indigo-800">
            <BookOpen size={14} className="inline mr-1" />
            All Batches •{' '}
            {allActiveRoutines.filter((r) => r.status === 'active').length}{' '}
            routines • {withContent.length} batches
          </span>
          <button
            onClick={() => window.print()}
            className="px-3 py-1 bg-white border rounded-lg text-xs flex items-center gap-1 hover:bg-gray-50"
          >
            <Printer size={12} />
            Print All
          </button>
        </div>
        <div className="p-2 space-y-3 print:hidden">
          {withContent.map(({ batch, routines: br }) => {
            const exp = expandedBatchSections[batch.id] !== false;
            const cnt = br.filter(
              (r) => r.status === 'active' || r.status === 'break'
            ).length;
            return (
              <div
                key={batch.id}
                className="bg-white rounded-lg border shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => toggleBatch(batch.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <motion.div animate={{ rotate: exp ? 90 : 0 }}>
                      <ChevronRight size={18} className="text-gray-500" />
                    </motion.div>
                    <div className="text-left">
                      <h3 className="text-base font-bold">
                        {batch.name || 'Unassigned'}
                        {batch.department?.name
                          ? ` (${batch.department.name})`
                          : ''}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {cnt} routine{cnt !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      batch.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100'
                    }`}
                  >
                    {batch.status || 'active'}
                  </span>
                </button>
                <AnimatePresence>
                  {exp && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t p-2">
                        {renderTable(br, `b${batch.id}-`, false)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
        <div className="hidden print:block">
          {withContent.map(({ batch, routines: br }, idx) => (
            <div key={batch.id} className="print-page">
              <div className="text-center py-1 border-b border-black">
                <h1 className="text-[12px] font-bold uppercase">
                  Asian College of Higher Studies
                </h1>
                <h2 className="text-[10px] font-semibold">
                  Weekly Class Routine
                </h2>
              </div>
              <div className="flex justify-between px-2 py-0.5 text-[7px] border-b border-gray-400">
                <div>
                  <b>Batch: </b>
                  {batch.name || 'Unassigned'}
                  {batch.department?.name ? ` (${batch.department.name})` : ''}
                </div>
                <div>
                  <b>Date: </b>
                  {printDate}
                </div>
                <div>
                  <b>Time: </b>7:01 AM – 2:00 PM
                </div>
              </div>
              <table
                className="w-full border-collapse"
                style={{ tableLayout: 'fixed' }}
              >
                <thead>
                  <tr>
                    <th
                      className="border border-black bg-gray-300 text-[7px] font-bold p-0.5 text-center"
                      style={{ width: '4%' }}
                    >
                      Day
                    </th>
                    {TIME_SLOTS.map((s) => (
                      <th
                        key={s.id}
                        className="border border-black bg-gray-300 text-[6px] font-bold p-0.5 text-center leading-tight"
                        style={{ width: `${96 / 14}%` }}
                      >
                        {s.display}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day, di) => (
                    <tr key={di} style={{ height: `${100 / 6}%` }}>
                      <td className="border border-black bg-gray-200 text-[7px] font-bold text-center p-0.5">
                        {day.substring(0, 3)}
                      </td>
                      {TIME_SLOTS.map((slot) => {
                        const here = br.filter(
                          (r) => r.day === di && r.timeSlot === slot.id
                        );
                        const merged = findMergedRoutine(di, slot.id, br);
                        if (merged && merged.timeSlot !== slot.id) return null;
                        const dr = merged || here[0];
                        const cs = dr?.timeSlotEnd
                          ? dr.timeSlotEnd - dr.timeSlot + 1
                          : 1;
                        return renderPrintCell(dr, cs);
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-[6px] text-gray-500 text-center mt-0.5">
                Page {idx + 1}/{withContent.length} | {printDate}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ==================== FACULTY VIEW ====================
  const renderFacultyView = () => (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-80 border-r border-gray-200 bg-gray-50 overflow-y-auto flex-shrink-0 print:hidden">
        <div className="p-4">
          <h3 className="text-sm font-semibold mb-3">
            Faculties ({faculties.length})
          </h3>
          <div className="relative mb-3">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={14}
            />
            <input
              type="text"
              placeholder="Search faculty..."
              value={facultySearch}
              onChange={(e) => setFacultySearch(e.target.value)}
              className="pl-9 pr-3 py-2 border rounded-lg w-full text-sm"
            />
          </div>
          <div className="space-y-1 max-h-[calc(100vh-350px)] overflow-y-auto">
            {filteredFacultyList.map((f) => {
              const cnt = allActiveRoutines.filter(
                (r) => r.facultyId === f.id && r.status === 'active'
              ).length;
              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedFaculty(f.id.toString())}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm ${
                    selectedFaculty === f.id.toString()
                      ? 'bg-indigo-100 font-medium'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        cnt > 0 ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                    <div>
                      <span className="block font-medium">{f.name}</span>
                      <span className="text-xs text-gray-500">
                        {f.designation || 'Faculty'}
                        {cnt > 0
                          ? ` • ${cnt} class${cnt !== 1 ? 'es' : ''}`
                          : ''}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {selectedFaculty && facultyInfo ? (
          <>
            <div className="p-4 print:hidden">
              <h3 className="text-lg font-bold mb-2">
                {facultyInfo.name}'s Schedule
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {facultyRoutines.filter((r) => r.status === 'active').length}{' '}
                classes across{' '}
                {new Set(facultyRoutines.map((r) => r.batch?.name)).size}{' '}
                batches
              </p>
              {renderTable(facultyRoutines, 'fac', false)}
              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-2">Summary</h4>
                <table className="w-full text-sm border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left text-xs">Day</th>
                      <th className="border p-2 text-left text-xs">Time</th>
                      <th className="border p-2 text-left text-xs">Subject</th>
                      <th className="border p-2 text-left text-xs">Batch</th>
                      <th className="border p-2 text-left text-xs">Room</th>
                      <th className="border p-2 text-left text-xs">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facultyRoutines
                      .sort((a, b) => a.day - b.day || a.timeSlot - b.timeSlot)
                      .map((r, i) => (
                        <tr key={i}>
                          <td className="border p-2 text-xs">{DAYS[r.day]}</td>
                          <td className="border p-2 text-xs">
                            {TIME_SLOTS[r.timeSlot]?.display}
                            {r.timeSlotEnd
                              ? `-${TIME_SLOTS[r.timeSlotEnd]?.display}`
                              : ''}
                          </td>
                          <td className="border p-2 text-xs font-medium">
                            {r.subject ||
                              (r.status === 'break' ? 'BREAK' : 'N/A')}
                          </td>
                          <td className="border p-2 text-xs font-medium text-indigo-600">
                            {r.batch?.name || 'N/A'}
                          </td>
                          <td className="border p-2 text-xs">
                            {roomDisplay(r)}
                          </td>
                          <td className="border p-2 text-xs">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] ${
                                STATUS_STYLES[r.status]?.bg
                              } ${STATUS_STYLES[r.status]?.text}`}
                            >
                              {STATUS_LABELS[r.status] || r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="hidden print:block p-1">
              <div className="text-center py-0.5 border-b border-black">
                <h1 className="text-[11px] font-bold uppercase">
                  Asian College of Higher Studies
                </h1>
                <h2 className="text-[9px]">
                  Faculty Routine - {facultyInfo.name}
                </h2>
                <p className="text-[7px]">
                  {facultyInfo.designation || 'Faculty'} |{' '}
                  {facultyRoutines.filter((r) => r.status === 'active').length}{' '}
                  Classes
                </p>
              </div>
              <div className="flex justify-between px-2 py-0.5 text-[7px] border-b border-gray-400">
                <div>
                  <b>Date: </b>
                  {printDate}
                </div>
                <div>
                  <b>Time: </b>7:01 AM – 2:00 PM
                </div>
              </div>
              <table
                className="w-full border-collapse"
                style={{ tableLayout: 'fixed' }}
              >
                <thead>
                  <tr>
                    <th
                      className="border border-black bg-gray-300 text-[7px] font-bold p-0.5 text-center"
                      style={{ width: '4%' }}
                    >
                      Day
                    </th>
                    {TIME_SLOTS.map((s) => (
                      <th
                        key={s.id}
                        className="border border-black bg-gray-300 text-[6px] font-bold p-0.5 text-center leading-tight"
                        style={{ width: `${96 / 14}%` }}
                      >
                        {s.display}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day, di) => (
                    <tr key={di} style={{ height: `${100 / 6}%` }}>
                      <td className="border border-black bg-gray-200 text-[7px] font-bold text-center p-0.5">
                        {day.substring(0, 3)}
                      </td>
                      {TIME_SLOTS.map((slot) => {
                        const here = facultyRoutines.filter(
                          (r) => r.day === di && r.timeSlot === slot.id
                        );
                        const merged = facultyRoutines.find(
                          (r) =>
                            r.day === di &&
                            r.timeSlotEnd &&
                            r.timeSlot <= slot.id &&
                            r.timeSlotEnd >= slot.id
                        );
                        if (merged && merged.timeSlot !== slot.id) return null;
                        const dr = merged || here[0];
                        const cs = dr?.timeSlotEnd
                          ? dr.timeSlotEnd - dr.timeSlot + 1
                          : 1;
                        return renderPrintCell(dr, cs);
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2">
                <h4 className="text-[8px] font-bold border-b border-black pb-0.5">
                  Summary
                </h4>
                <table className="w-full text-[7px] border-collapse">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border border-black p-0.5">Day</th>
                      <th className="border border-black p-0.5">Time</th>
                      <th className="border border-black p-0.5">Subject</th>
                      <th className="border border-black p-0.5">Batch</th>
                      <th className="border border-black p-0.5">Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facultyRoutines
                      .filter((r) => r.status === 'active')
                      .sort((a, b) => a.day - b.day || a.timeSlot - b.timeSlot)
                      .map((r, i) => (
                        <tr key={i}>
                          <td className="border border-black p-0.5">
                            {DAYS[r.day]}
                          </td>
                          <td className="border border-black p-0.5">
                            {TIME_SLOTS[r.timeSlot]?.display}
                            {r.timeSlotEnd
                              ? `-${TIME_SLOTS[r.timeSlotEnd]?.display}`
                              : ''}
                          </td>
                          <td className="border border-black p-0.5">
                            {r.subject || 'N/A'}
                          </td>
                          <td className="border border-black p-0.5 font-medium text-indigo-700">
                            {r.batch?.name || 'N/A'}
                          </td>
                          <td className="border border-black p-0.5">
                            {roomDisplay(r)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="text-[6px] text-gray-500 text-center mt-0.5">
                {printDate}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 print:hidden">
            <div className="text-center">
              <User size={64} className="mx-auto mb-4 opacity-30" />
              <p>Select a faculty</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!isOpen) return null;
  const headerBatchName =
    selectedBatch?.name || (batchId ? `Batch #${batchId}` : 'All Batches');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden print:overflow-visible">
      <div
        className="absolute inset-0 bg-black/50 print:hidden"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute inset-2 md:inset-4 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden print:inset-0 print:rounded-none print:shadow-none print:fixed print:w-full print:h-full"
      >
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-4 py-3 flex-shrink-0 print:hidden">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white p-1.5 rounded-lg"
              >
                <X size={18} />
              </button>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock size={20} />
                  Routine Manager
                </h2>
                <p className="text-white/70 text-xs">
                  <span className="font-medium text-white">
                    {headerBatchName}
                  </span>
                  {selectedBatch?.department?.name && (
                    <span> • {selectedBatch.department.name}</span>
                  )}
                  <span>
                    {' '}
                    •{' '}
                    {
                      allActiveRoutines.filter((r) => r.status === 'active')
                        .length
                    }{' '}
                    routines
                  </span>
                  <span> • 7:01 AM – 2:00 PM</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isBatchView && (
                <button
                  onClick={() => {
                    setViewMode('classroom');
                    setMergeMode(false);
                    setSelectedFaculty(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                    viewMode === 'classroom'
                      ? 'bg-white text-indigo-600'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  <BookOpen size={12} className="inline mr-1" />
                  Grid
                </button>
              )}
              <button
                onClick={() => {
                  setViewMode('faculty');
                  setMergeMode(false);
                  setSelectedFaculty(null);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  viewMode === 'faculty'
                    ? 'bg-white text-indigo-600'
                    : 'bg-white/20 text-white'
                }`}
              >
                <User size={12} className="inline mr-1" />
                Faculty
              </button>
              {!isBatchView && (
                <button
                  onClick={() => setViewMode('multipleBatches')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                    viewMode === 'multipleBatches'
                      ? 'bg-white text-indigo-600'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  <BookOpen size={12} className="inline mr-1" />
                  All Batches
                </button>
              )}
              {isBatchView && viewMode === 'classroom' && (
                <button
                  onClick={() => setMergeMode(!mergeMode)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${
                    mergeMode
                      ? 'bg-yellow-500 text-white'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  <Combine size={12} />
                  {mergeMode ? 'Cancel' : 'Merge'}
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="px-2.5 py-1 bg-white/20 text-white rounded-lg text-xs flex items-center gap-1"
              >
                <Printer size={12} />
                Print
              </button>
            </div>
          </div>
        </div>
        <div className="hidden print:block w-full flex-shrink-0">
          <div className="text-center py-1 border-b border-black">
            <h1 className="text-[12px] font-bold uppercase">
              Asian College of Higher Studies
            </h1>
            <h2 className="text-[10px] font-semibold">Weekly Class Routine</h2>
          </div>
          <div className="flex justify-between items-center px-3 py-1 text-[7px] border-b border-gray-500">
            <div>
              <b>Batch: </b>
              {selectedBatch?.name || batchId || 'All'}
              {selectedBatch?.department?.name
                ? ` (${selectedBatch.department.name})`
                : ''}
            </div>
            <div>
              <b>Date: </b>
              {printDate}
            </div>
            <div>
              <b>Time: </b>7:01 AM – 2:00 PM
            </div>
          </div>
        </div>
        {mergeMode && (
          <div className="bg-yellow-50 border-b px-4 py-1.5 flex items-center justify-between flex-shrink-0 print:hidden">
            <span className="text-xs">
              <Combine size={12} className="inline mr-1" />
              Select consecutive slots
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs">
                {mergeSelections.length} slot
                {mergeSelections.length !== 1 ? 's' : ''}
              </span>
              {mergeSelections.length >= 2 && (
                <button
                  onClick={confirmMerge}
                  className="px-3 py-1 bg-yellow-600 text-white rounded text-xs"
                >
                  Merge
                </button>
              )}
            </div>
          </div>
        )}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-20 right-6 z-50 bg-green-50 border-l-4 border-green-500 text-green-800 px-4 py-2 rounded-lg shadow-lg print:hidden text-sm"
            >
              <CheckCircle size={16} className="inline mr-1" />
              {successMsg}
            </motion.div>
          )}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-20 right-6 z-50 bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-2 rounded-lg shadow-lg print:hidden text-sm"
            >
              <AlertCircle size={16} className="inline mr-1" />
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={40} className="animate-spin text-indigo-600" />
          </div>
        ) : viewMode === 'faculty' ? (
          renderFacultyView()
        ) : viewMode === 'multipleBatches' || !isBatchView ? (
          renderMultiBatchView()
        ) : (
          <div className="flex-1 overflow-auto print:overflow-visible">
            <div className="hidden print:block w-full h-full">
              <table
                className="w-full h-full border-collapse"
                style={{ tableLayout: 'fixed' }}
              >
                <thead>
                  <tr>
                    <th
                      className="border border-black bg-gray-300 text-[7px] font-bold p-0.5 text-center"
                      style={{ width: '4%' }}
                    >
                      Day
                    </th>
                    {TIME_SLOTS.map((s) => (
                      <th
                        key={s.id}
                        className="border border-black bg-gray-300 text-[6px] font-bold p-0.5 text-center leading-tight"
                        style={{ width: `${96 / 14}%` }}
                      >
                        {s.display}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day, di) => (
                    <tr key={di} style={{ height: `${100 / 6}%` }}>
                      <td className="border border-black bg-gray-200 text-[7px] font-bold text-center p-0.5">
                        {day}
                      </td>
                      {TIME_SLOTS.map((slot) => {
                        const here = displayRoutines.filter(
                          (r) => r.day === di && r.timeSlot === slot.id
                        );
                        const merged = findMergedRoutine(di, slot.id);
                        if (merged && merged.timeSlot !== slot.id) return null;
                        const dr = merged || here[0];
                        const cs = dr?.timeSlotEnd
                          ? dr.timeSlotEnd - dr.timeSlot + 1
                          : 1;
                        return renderPrintCell(dr, cs);
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-[6px] text-gray-500 text-center mt-0.5">
                Generated: {printDate}
              </div>
            </div>
            {renderTable(displayRoutines, '', isBatchView)}
          </div>
        )}
      </motion.div>

      {/* Routine Modal */}
      <AnimatePresence>
        {showRoutineModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center print:hidden">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setShowRoutineModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 mx-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold">
                    {editingRoutine ? 'Edit' : 'Add'} Routine
                  </h3>
                  <p className="text-sm text-gray-500">
                    {DAYS[form.day]} • {TIME_SLOTS[form.startSlot]?.display}
                    {form.endSlot > form.startSlot
                      ? ` – ${TIME_SLOTS[form.endSlot]?.display}`
                      : ''}
                  </p>
                </div>
                <button
                  onClick={() => setShowRoutineModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => {
                      const ns = e.target.value;
                      setForm((p) => ({
                        ...p,
                        status: ns,
                        facultyId: ns === 'break' ? '' : p.facultyId,
                        classroomId: ns === 'break' ? '' : p.classroomId,
                        roomNumber: ns === 'break' ? '' : p.roomNumber,
                        subject: ns === 'break' ? 'Break' : p.subject,
                      }));
                    }}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    {Object.entries(STATUS_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                {form.status !== 'break' ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Faculty *
                      </label>
                      <SearchableDropdown
                        value={form.facultyId}
                        onChange={(v) => setForm({ ...form, facultyId: v })}
                        options={faculties}
                        placeholder="Search faculty..."
                        labelKey="name"
                        valueKey="id"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Batch *
                      </label>
                      <SearchableDropdown
                        value={form.batchId}
                        onChange={(v) => setForm({ ...form, batchId: v })}
                        options={batches}
                        placeholder="Search batch..."
                        labelKey="name"
                        valueKey="id"
                        disabled={!!batchId}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Classroom
                      </label>
                      <SearchableDropdown
                        value={form.classroomId}
                        onChange={(v) => setForm({ ...form, classroomId: v })}
                        options={form.batchId ? filteredClassrooms : classrooms}
                        placeholder="Search classroom..."
                        labelKey="name"
                        valueKey="id"
                        disabled={!!classroomId}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Room Number
                      </label>
                      <input
                        type="text"
                        value={form.roomNumber}
                        onChange={(e) =>
                          setForm({ ...form, roomNumber: e.target.value })
                        }
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        placeholder="e.g., Room 101"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Subject *
                      </label>
                      <input
                        type="text"
                        value={form.subject}
                        onChange={(e) =>
                          setForm({ ...form, subject: e.target.value })
                        }
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        placeholder="e.g., Mathematics"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Batch *
                      </label>
                      <SearchableDropdown
                        value={form.batchId}
                        onChange={(v) => setForm({ ...form, batchId: v })}
                        options={batches}
                        placeholder="Search batch..."
                        labelKey="name"
                        valueKey="id"
                        disabled={!!batchId}
                        required
                      />
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                      <Coffee
                        size={32}
                        className="mx-auto text-blue-500 mb-2"
                      />
                      <p className="text-sm font-medium text-blue-800">
                        Break Time
                      </p>
                      <p className="text-xs text-blue-600">
                        No faculty or classroom needed
                      </p>
                    </div>
                  </>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Start
                    </label>
                    <select
                      value={form.startSlot}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        setForm({
                          ...form,
                          startSlot: v,
                          endSlot: Math.max(v, form.endSlot),
                        });
                      }}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    >
                      {TIME_SLOTS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.display}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      End
                    </label>
                    <select
                      value={form.endSlot}
                      onChange={(e) =>
                        setForm({ ...form, endSlot: parseInt(e.target.value) })
                      }
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    >
                      {TIME_SLOTS.filter((s) => s.id >= form.startSlot).map(
                        (s) => (
                          <option key={s.id} value={s.id}>
                            {s.display}
                          </option>
                        )
                      )}
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
                    rows={2}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="Optional..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowRoutineModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveRoutine()}
                  disabled={
                    saving ||
                    (!form.facultyId && form.status !== 'break') ||
                    !form.batchId
                  }
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  {editingRoutine ? 'Update' : 'Save'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteConfirm && deleteTarget && (
          <div className="fixed inset-0 z-[65] flex items-center justify-center print:hidden">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteTarget(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 mx-4"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    Delete Routine{deleteTarget.routines.length > 1 ? 's' : ''}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {DAYS[deleteTarget.day]} •{' '}
                    {TIME_SLOTS[deleteTarget.slotId]?.display}
                  </p>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                {deleteTarget.routines.map((r, i) => (
                  <div key={i} className="bg-gray-50 border rounded-lg p-3">
                    <p className="font-medium text-sm">
                      {r.status === 'break'
                        ? 'BREAK'
                        : r.faculty?.name || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {r.subject || 'N/A'} • {roomDisplay(r)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteTarget(null);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteSlot}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Conflict Modal */}
      <AnimatePresence>
        {showConflictModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center print:hidden">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setShowConflictModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 mx-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle size={24} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Schedule Conflicts</h3>
                  <p className="text-sm text-gray-500">
                    {conflicts.filter((c) => c.type === 'faculty').length}{' '}
                    faculty •{' '}
                    {conflicts.filter((c) => c.type === 'room').length} room •{' '}
                    {conflicts.filter((c) => c.type === 'roomNumber').length}{' '}
                    room#
                  </p>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                {conflicts.map((c, i) => {
                  const ct = CONFLICT_TYPES[c.type] || CONFLICT_TYPES.faculty;
                  const CIcon = ct.icon;
                  return (
                    <div
                      key={i}
                      className={`border-2 rounded-lg p-4 ${ct.bg} ${ct.border}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${ct.iconBg}`}
                        >
                          <CIcon size={14} className={ct.iconColor} />
                        </div>
                        <div className="flex-1">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ct.badge}`}
                          >
                            {ct.label}
                          </span>
                          <p className="text-sm font-bold text-gray-800 mt-1">
                            {c.message}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {c.detail}
                          </p>
                          <div className="mt-2 p-2 bg-white rounded border border-gray-200 space-y-1">
                            <p className="text-xs">
                              <b>Subject:</b> {c.subject}
                            </p>
                            {c.type === 'faculty' ? (
                              <p className="text-xs">
                                <b>Room:</b> {c.room}
                                {c.routine?.roomNumber
                                  ? ` (Rm ${c.routine.roomNumber})`
                                  : ''}
                              </p>
                            ) : c.type === 'room' ? (
                              <p className="text-xs">
                                <b>Faculty:</b> {c.faculty}
                              </p>
                            ) : (
                              <>
                                <p className="text-xs">
                                  <b>Faculty:</b> {c.faculty}
                                </p>
                                <p className="text-xs">
                                  <b>Room:</b> {c.room}
                                </p>
                              </>
                            )}
                            <p className="text-xs">
                              <b>Batch:</b> {c.batch}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConflictModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Go Back
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 3mm;
          }
          html,
          body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body * {
            visibility: hidden;
          }
          .fixed.inset-0.z-50,
          .fixed.inset-0.z-50 * {
            visibility: visible;
          }
          .fixed.inset-0.z-50 {
            position: fixed !important;
            inset: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            overflow: hidden !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print-page {
            page-break-after: always;
            page-break-inside: avoid;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .print-page:last-child {
            page-break-after: avoid;
          }
          thead {
            display: table-header-group;
          }
          tr {
            page-break-inside: avoid;
          }
          td {
            vertical-align: middle !important;
          }
          table {
            table-layout: fixed !important;
            width: 100% !important;
          }
          th,
          td {
            padding: 1px !important;
            font-size: 7px !important;
            line-height: 1.1 !important;
            word-break: break-word !important;
            overflow: hidden !important;
          }
          th:first-child,
          td:first-child {
            width: 4% !important;
          }
          h1 {
            font-size: 12px !important;
          }
          h2 {
            font-size: 10px !important;
          }
          h3 {
            font-size: 9px !important;
          }
          p,
          div {
            font-size: 7px !important;
          }
          .border-b-2 {
            border-bottom-width: 1px !important;
          }
          .border-2 {
            border-width: 1px !important;
          }
        }
      `}</style>
    </div>
  );
}
