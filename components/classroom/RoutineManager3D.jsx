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
const SEMESTER_MAP = {
  semester1: '1st Semester',
  semester2: '2nd Semester',
  semester3: '3rd Semester',
  semester4: '4th Semester',
  semester5: '5th Semester',
  semester6: '6th Semester',
  semester7: '7th Semester',
  semester8: '8th Semester',
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
  const [batchSemester, setBatchSemester] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const printRef = useRef(null);
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

  const getSemesterDisplay = (s) => SEMESTER_MAP[s] || s || '';
  const roomDisplay = (r) =>
    [r?.classroom?.name, r?.roomNumber ? `(Rm ${r.roomNumber})` : '']
      .filter(Boolean)
      .join(' ') || '-';
  const isBatchView = !!(batchId || classroomId);

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
      if (bRes.ok) {
        const d = await bRes.json();
        setRoutines(d.routines || []);
        for (const r of d.routines || []) {
          if (r.classroom?.course?.semester) {
            setBatchSemester(r.classroom.course.semester);
            break;
          }
        }
      }
      if (aRes.ok) {
        const d = await aRes.json();
        setAllActiveRoutines(d.routines || []);
      }
      let f = [];
      try {
        const r = await fetch('/api/faculty?limit=1000');
        if (r.ok)
          f = (await r.json()).faculty || (await r.json()).faculties || [];
      } catch {
        try {
          const r = await fetch('/api/faculties?limit=1000');
          if (r.ok) f = (await r.json()).faculties || [];
        } catch {}
      }
      setFaculties(
        (Array.isArray(f) ? f : []).sort((a, b) =>
          (a.name || '').localeCompare(b.name || '')
        )
      );
      try {
        const r = await fetch('/api/batches?limit=100');
        if (r.ok) {
          const l = (await r.json()).batches || [];
          setBatches(Array.isArray(l) ? l : []);
          if (batchId) {
            const x = l.find((b) => b.id === parseInt(batchId));
            if (x) setSelectedBatch(x);
          }
        }
      } catch {}
      try {
        let u = '/api/classrooms?include=course&limit=200';
        if (batchId) u += `&batchId=${batchId}`;
        const r = await fetch(u);
        if (r.ok) {
          const l = (await r.json()).classrooms || [];
          const a = Array.isArray(l) ? l : [];
          const fl = batchId
            ? a.filter((c) => c.batchId === parseInt(batchId))
            : a;
          setClassrooms(a);
          setFilteredClassrooms(fl.length > 0 ? fl : a);
          if (classroomId) {
            const x = a.find((c) => c.id === parseInt(classroomId));
            if (x?.course?.semester) setBatchSemester(x.course.semester);
          }
        }
      } catch {}
      if (!batchSemester && batchId) {
        try {
          const r = await fetch(
            `/api/course-lists?batchId=${batchId}&isActive=true`
          );
          if (r.ok) {
            const l = (await r.json()).courseLists || [];
            if (l.length > 0 && l[0].semester) setBatchSemester(l[0].semester);
          }
        } catch {}
      }
    } catch {
      setErrorMsg('Failed to load');
      setTimeout(() => setErrorMsg(null), 3000);
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

  const selectedFacultyRoutines = useMemo(
    () =>
      selectedFaculty
        ? allActiveRoutines.filter(
            (r) => r.facultyId === parseInt(selectedFaculty)
          )
        : [],
    [allActiveRoutines, selectedFaculty]
  );
  const selectedFacultyInfo = useMemo(
    () => faculties.find((f) => f.id === parseInt(selectedFaculty)),
    [faculties, selectedFaculty]
  );
  const filteredFaculties = useMemo(() => {
    const t = facultySearch.toLowerCase();
    return t
      ? faculties.filter(
          (f) =>
            f.name?.toLowerCase().includes(t) ||
            (f.email && f.email.toLowerCase().includes(t)) ||
            (f.designation && f.designation.toLowerCase().includes(t))
        )
      : faculties;
  }, [faculties, facultySearch]);

  const checkAllConflicts = (fid, cid, roomNum, d, ss, se, ex = null) => {
    const c = [],
      ch = allActiveRoutines.filter((r) => r.status !== 'break');
    for (let s = ss; s <= se; s++)
      ch.forEach((r) => {
        if (r.id === ex) return;
        const re = r.timeSlotEnd ?? r.timeSlot;
        if (r.day !== d || r.timeSlot > s || re < s) return;
        if (
          fid &&
          r.facultyId &&
          r.facultyId === parseInt(fid) &&
          !c.find((x) => x.routine.id === r.id && x.type === 'faculty')
        )
          c.push({
            type: 'faculty',
            routine: r,
            message: `${r.faculty?.name || 'Faculty'} already assigned`,
            detail: `${DAYS[d]} • ${TIME_SLOTS[s]?.display}`,
            subject: r.subject || 'N/A',
            room: r.classroom?.name || r.roomNumber || 'N/A',
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
            message: `${r.classroom?.name || 'Room'} already occupied`,
            detail: `${DAYS[d]} • ${TIME_SLOTS[s]?.display}`,
            subject: r.subject || 'N/A',
            faculty: r.faculty?.name || 'N/A',
            batch: r.batch?.name || 'N/A',
          });
        if (
          roomNum &&
          roomNum.trim() !== '' &&
          r.roomNumber &&
          r.roomNumber.trim().toLowerCase() === roomNum.trim().toLowerCase() &&
          (!cid || r.classroomId !== parseInt(cid)) &&
          !c.find((x) => x.routine.id === r.id && x.type === 'roomNumber')
        )
          c.push({
            type: 'roomNumber',
            routine: r,
            message: `Room Number "${roomNum}" in use`,
            detail: `${DAYS[d]} • ${TIME_SLOTS[s]?.display}`,
            subject: r.subject || 'N/A',
            faculty: r.faculty?.name || 'N/A',
            room: `${r.classroom?.name || 'N/A'} (Rm ${r.roomNumber})`,
            batch: r.batch?.name || 'N/A',
          });
      });
    return c;
  };

  const toggleMergeSlot = (d, s) => {
    setMergeSelections((p) => {
      const e = p.find((x) => x.day === d && x.slotId === s);
      if (e) return p.filter((x) => !(x.day === d && x.slotId === s));
      if (p.length > 0 && p[0].day !== d) return [{ day: d, slotId: s }];
      return [...p, { day: d, slotId: s }];
    });
  };
  const handleMergeConfirm = () => {
    if (mergeSelections.length < 2) {
      setErrorMsg('Select 2+ slots');
      return;
    }
    const d = mergeSelections[0].day;
    if (!mergeSelections.every((x) => x.day === d)) {
      setErrorMsg('Same day');
      return;
    }
    const sl = mergeSelections.map((x) => x.slotId).sort((a, b) => a - b);
    for (let i = 1; i < sl.length; i++) {
      if (sl[i] !== sl[i - 1] + 1) {
        setErrorMsg('Consecutive');
        return;
      }
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
  const handleSelectAllDaySlots = (d) =>
    setMergeSelections(TIME_SLOTS.map((s) => ({ day: d, slotId: s.id })));
  const handleSlotClick = (d, s, arr = displayRoutines) => {
    if (mergeMode) {
      toggleMergeSlot(d, s);
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
    if (e) e.stopPropagation();
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
  const handleDeleteRoutine = async (id) => {
    try {
      await fetch(`/api/routines?id=${id}`, { method: 'DELETE' });
      setSuccessMsg('Deleted!');
      setTimeout(() => setSuccessMsg(null), 3000);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      fetchData();
    } catch {
      setErrorMsg('Delete failed');
    }
  };
  const handleDeleteAllInSlot = async () => {
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
      setErrorMsg('Delete failed');
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
      const c = checkAllConflicts(
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
      const payload = {
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
      if (editingRoutine) payload.id = editingRoutine.id;
      Object.keys(payload).forEach((k) => {
        if (payload[k] === undefined) delete payload[k];
      });
      const r = await fetch('/api/routines', {
        method: editingRoutine ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const rd = await r.json();
      if (!r.ok) throw new Error(rd.error || rd.details || 'Save failed');
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

  const toggleBatchSection = (bid) =>
    setExpandedBatchSections((p) => ({ ...p, [bid]: !p[bid] }));

  const renderCell = (d, s, list, merged, prefix = '', showAdd = false) => {
    if (merged && merged.timeSlot !== s) return null;
    const dr = merged || list[0],
      rem = list.length > 1 ? list.length - 1 : 0,
      cs = dr?.timeSlotEnd ? dr.timeSlotEnd - dr.timeSlot + 1 : 1,
      sel = isMergeSelected(d, s),
      st = STATUS_STYLES[dr?.status] || STATUS_STYLES.active;
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
              className={`text-[8px] p-1 rounded border cursor-pointer h-full print:text-[10px] print:shadow-none print:flex print:flex-col print:items-center print:justify-center print:text-center print:h-full print:border print:border-gray-400 relative group ${
                st.bg
              } ${st.border} ${dr.status === 'cancelled' ? 'opacity-60' : ''}`}
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
                      handleDeleteRoutine(dr.id);
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
                onClick={() => mergeMode && handleSelectAllDaySlots(di)}
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

  const renderPrintCell = (dr, cs) => {
    const st = STATUS_STYLES[dr?.status] || STATUS_STYLES.active;
    return (
      <td
        className="border-2 border-black p-1 align-middle text-center"
        colSpan={cs}
        style={{ backgroundColor: dr ? st.printBg : 'transparent' }}
      >
        {dr && (
          <div className="flex flex-col items-center justify-center h-full gap-0.5">
            {dr.status === 'break' ? (
              <span className="font-extrabold text-[11px] uppercase text-blue-700">
                BREAK
              </span>
            ) : (
              <>
                <div className="font-extrabold text-[11px] uppercase">
                  {dr.faculty?.name || ''}
                </div>
                <div className="font-bold text-[10px]">{dr.subject || ''}</div>
              </>
            )}
            <div className="font-medium text-[9px] text-gray-600">
              {dr.status === 'break' ? '' : roomDisplay(dr)}
            </div>
          </div>
        )}
      </td>
    );
  };

  const printDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // ─── VIEW: Multiple Batches ──────────────────────────────────
  const renderMultipleBatchesView = () => {
    const batchesWithContent = routinesByBatch.filter(
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
            routines • {batchesWithContent.length} batches
          </span>
          <button
            onClick={() => window.print()}
            className="px-3 py-1 bg-white border rounded-lg text-xs flex items-center gap-1 hover:bg-gray-50"
          >
            <Printer size={12} />
            Print All
          </button>
        </div>
        {/* SCREEN */}
        <div className="p-2 space-y-3 print:hidden">
          {batchesWithContent.map(({ batch, routines: br }) => {
            const isExpanded = expandedBatchSections[batch.id] !== false;
            const count = br.filter(
              (r) => r.status === 'active' || r.status === 'break'
            ).length;
            return (
              <div
                key={batch.id}
                className="bg-white rounded-lg border shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => toggleBatchSection(batch.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
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
                        {count} routine{count !== 1 ? 's' : ''}
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
                  {isExpanded && (
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
        {/* PRINT - Each batch on fresh page */}
        <div className="hidden print:block">
          {batchesWithContent.map(({ batch, routines: br }, idx) => (
            <div key={batch.id} className="print-page">
              <div className="text-center py-2 border-b-2 border-black">
                <h1 className="text-lg font-bold uppercase">
                  Asian College of Higher Studies
                </h1>
                <h2 className="text-base font-semibold">
                  Weekly Class Routine
                </h2>
              </div>
              <div className="flex justify-between px-2 py-1 text-[10px] border-b border-gray-400">
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
                      className="border-2 border-black bg-gray-300 text-[10px] font-bold p-1 text-center"
                      style={{ width: '5%' }}
                    >
                      Day
                    </th>
                    {TIME_SLOTS.map((s) => (
                      <th
                        key={s.id}
                        className="border-2 border-black bg-gray-300 text-[8px] font-bold p-1 text-center"
                        style={{ width: `${95 / 14}%` }}
                      >
                        {s.display}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day, di) => (
                    <tr key={di} style={{ height: `${100 / 6}%` }}>
                      <td className="border-2 border-black bg-gray-200 text-[10px] font-bold text-center p-1">
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
              <div className="text-[8px] text-gray-500 text-center mt-1">
                Page {idx + 1}/{batchesWithContent.length} | {printDate}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── VIEW: Faculty ───────────────────────────────────────────
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
              placeholder="Search..."
              value={facultySearch}
              onChange={(e) => setFacultySearch(e.target.value)}
              className="pl-9 pr-3 py-2 border rounded-lg w-full text-sm"
            />
          </div>
          <div className="space-y-1 max-h-[calc(100vh-350px)] overflow-y-auto">
            {filteredFaculties.map((f) => {
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
        {selectedFaculty && selectedFacultyInfo ? (
          <>
            <div className="p-4 print:hidden">
              <h3 className="text-lg font-bold mb-2">
                {selectedFacultyInfo.name}'s Schedule
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {
                  selectedFacultyRoutines.filter((r) => r.status === 'active')
                    .length
                }{' '}
                classes across{' '}
                {
                  new Set(selectedFacultyRoutines.map((r) => r.batch?.name))
                    .size
                }{' '}
                batches
              </p>
              {renderTable(selectedFacultyRoutines, 'fac', false)}
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
                    {selectedFacultyRoutines
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
                          <td className="border p-2 text-xs">
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
            {/* PRINT - Single page */}
            <div className="hidden print:block p-2">
              <div className="text-center py-1 border-b-2 border-black">
                <h1 className="text-base font-bold uppercase">
                  Asian College of Higher Studies
                </h1>
                <h2 className="text-sm">
                  Faculty Routine - {selectedFacultyInfo.name}
                </h2>
                <p className="text-xs">
                  {selectedFacultyInfo.designation || 'Faculty'} |{' '}
                  {
                    selectedFacultyRoutines.filter((r) => r.status === 'active')
                      .length
                  }{' '}
                  Classes
                </p>
              </div>
              <div className="flex justify-between px-2 py-0.5 text-[9px] border-b border-gray-400">
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
                      className="border-2 border-black bg-gray-300 text-[9px] font-bold p-0.5 text-center"
                      style={{ width: '5%' }}
                    >
                      Day
                    </th>
                    {TIME_SLOTS.map((s) => (
                      <th
                        key={s.id}
                        className="border-2 border-black bg-gray-300 text-[7px] font-bold p-0.5 text-center"
                        style={{ width: `${95 / 14}%` }}
                      >
                        {s.display}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day, di) => (
                    <tr key={di} style={{ height: `${100 / 6}%` }}>
                      <td className="border-2 border-black bg-gray-200 text-[9px] font-bold text-center p-0.5">
                        {day.substring(0, 3)}
                      </td>
                      {TIME_SLOTS.map((slot) => {
                        const here = selectedFacultyRoutines.filter(
                          (r) => r.day === di && r.timeSlot === slot.id
                        );
                        const merged = selectedFacultyRoutines.find(
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
              <div className="mt-3">
                <h4 className="text-[10px] font-bold border-b border-black pb-0.5">
                  Summary
                </h4>
                <table className="w-full text-[8px] border-collapse">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border border-black p-1 text-left">Day</th>
                      <th className="border border-black p-1 text-left">
                        Time
                      </th>
                      <th className="border border-black p-1 text-left">
                        Subject
                      </th>
                      <th className="border border-black p-1 text-left">
                        Batch
                      </th>
                      <th className="border border-black p-1 text-left">
                        Room
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedFacultyRoutines
                      .filter((r) => r.status === 'active')
                      .sort((a, b) => a.day - b.day || a.timeSlot - b.timeSlot)
                      .map((r, i) => (
                        <tr key={i}>
                          <td className="border border-black p-1">
                            {DAYS[r.day]}
                          </td>
                          <td className="border border-black p-1">
                            {TIME_SLOTS[r.timeSlot]?.display}
                            {r.timeSlotEnd
                              ? `-${TIME_SLOTS[r.timeSlotEnd]?.display}`
                              : ''}
                          </td>
                          <td className="border border-black p-1">
                            {r.subject || 'N/A'}
                          </td>
                          <td className="border border-black p-1">
                            {r.batch?.name || 'N/A'}
                          </td>
                          <td className="border border-black p-1">
                            {roomDisplay(r)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="text-[7px] text-gray-500 text-center mt-1">
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
  const semesterDisplay = getSemesterDisplay(batchSemester);

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
                  {!isBatchView
                    ? `All Batches (${
                        allActiveRoutines.filter((r) => r.status === 'active')
                          .length
                      })`
                    : viewMode === 'faculty'
                    ? 'Faculty Schedules'
                    : selectedBatch
                    ? `Batch: ${selectedBatch.name}`
                    : `Batch #${batchId}`}
                  {semesterDisplay && isBatchView
                    ? ` • ${semesterDisplay}`
                    : ''}{' '}
                  • 7:01 AM – 2:00 PM
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
          <div className="text-center py-2 border-b-2 border-black">
            <h1 className="text-lg font-bold uppercase">
              Asian College of Higher Studies
            </h1>
            <h2 className="text-base font-semibold">Weekly Class Routine</h2>
            {semesterDisplay && isBatchView && (
              <h3 className="text-sm font-bold">{semesterDisplay}</h3>
            )}
          </div>
          <div className="flex justify-between items-center px-3 py-1.5 text-xs border-b border-gray-500">
            <div>
              <b>Batch: </b>
              {selectedBatch?.name || `#${batchId}` || 'All'}
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
                  onClick={handleMergeConfirm}
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
          renderMultipleBatchesView()
        ) : (
          <div
            ref={printRef}
            className="flex-1 overflow-auto print:overflow-visible"
          >
            <div className="hidden print:block w-full h-full">
              <table
                className="w-full h-full border-collapse"
                style={{ tableLayout: 'fixed' }}
              >
                <thead>
                  <tr>
                    <th
                      className="border-2 border-black bg-gray-300 text-xs font-bold p-1 text-center"
                      style={{ width: '5%' }}
                    >
                      Day
                    </th>
                    {TIME_SLOTS.map((s) => (
                      <th
                        key={s.id}
                        className="border-2 border-black bg-gray-300 text-[10px] font-bold p-1 text-center"
                        style={{ width: `${95 / 14}%` }}
                      >
                        {s.display}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day, di) => (
                    <tr key={di} style={{ height: `${100 / 6}%` }}>
                      <td className="border-2 border-black bg-gray-200 text-xs font-bold text-center p-1 align-middle">
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
              <div className="text-[9px] text-gray-500 text-center mt-2">
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
                {form.status !== 'break' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Faculty *
                      </label>
                      <select
                        value={form.facultyId}
                        onChange={(e) =>
                          setForm({ ...form, facultyId: e.target.value })
                        }
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      >
                        <option value="">Select</option>
                        {faculties.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Batch *
                      </label>
                      <select
                        value={form.batchId}
                        onChange={(e) =>
                          setForm({ ...form, batchId: e.target.value })
                        }
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        disabled={!!batchId}
                      >
                        <option value="">Select</option>
                        {batches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Classroom
                      </label>
                      <select
                        value={form.classroomId}
                        onChange={(e) =>
                          setForm({ ...form, classroomId: e.target.value })
                        }
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        disabled={!!classroomId}
                      >
                        <option value="">Select</option>
                        {(form.batchId ? filteredClassrooms : classrooms).map(
                          (c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          )
                        )}
                      </select>
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
                )}
                {form.status === 'break' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Batch *
                      </label>
                      <select
                        value={form.batchId}
                        onChange={(e) =>
                          setForm({ ...form, batchId: e.target.value })
                        }
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        disabled={!!batchId}
                      >
                        <option value="">Select</option>
                        {batches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
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
                  onClick={handleDeleteAllInSlot}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
            margin: 4mm;
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
          .print\\:block {
            display: block !important;
          }
          .print\\:flex {
            display: flex !important;
          }
          .print\\:flex-col {
            flex-direction: column !important;
          }
          .print\\:items-center {
            align-items: center !important;
          }
          .print\\:justify-center {
            justify-content: center !important;
          }
          .print\\:text-center {
            text-align: center !important;
          }
          .print\\:overflow-visible {
            overflow: visible !important;
          }
          .print-page {
            page-break-after: always;
            page-break-inside: avoid;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }
          .print-page:last-child {
            page-break-after: avoid;
          }
          thead {
            display: table-header-group;
          }
          tbody {
            display: table-row-group;
          }
          tr {
            page-break-inside: avoid;
          }
          td {
            vertical-align: middle !important;
          }
        }
      `}</style>
    </div>
  );
}
