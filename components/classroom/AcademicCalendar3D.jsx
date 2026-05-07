'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TerminalExamConfigModal from './TerminalExamConfigModal';
import {
  X,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  Edit2,
  Trash2,
  FileText,
  Printer,
  Calendar,
  Play,
  StopCircle,
  Sun,
  BookOpen,
  FileCheck,
  Award,
  Users,
  Circle,
  AlertTriangle,
  Settings,
} from 'lucide-react';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatDateKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(d.getDate()).padStart(2, '0')}`;
};
const formatDisplayDate = (date) =>
  new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
const formatShortDate = (date) =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

// Nepal weekend: Friday(5) and Saturday(6)
const isWeekend = (date) => [6].includes(new Date(date).getDay());
const addDays = (date, days) => {
  const r = new Date(date);
  r.setDate(r.getDate() + days);
  return r;
};
const addWeeks = (date, weeks) => addDays(date, weeks * 7);

// Get Sunday of the week containing the given date
const getSunday = (date) => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
};

const EVENT_TYPES = [
  {
    value: 'semester_start',
    label: 'Semester Start',
    color: 'from-green-500 to-emerald-600',
    Icon: Play,
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    shortLabel: 'Sem Start',
  },
  {
    value: 'semester_end',
    label: 'Semester End',
    color: 'from-red-500 to-rose-600',
    Icon: StopCircle,
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    shortLabel: 'Sem End',
  },
  {
    value: 'holiday',
    label: 'Holiday',
    color: 'from-orange-500 to-amber-600',
    Icon: Sun,
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    shortLabel: 'Holiday',
  },
  {
    value: 'first_term_start',
    label: 'First Term',
    color: 'from-blue-500 to-cyan-600',
    Icon: BookOpen,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    shortLabel: 'Term 1',
  },
  {
    value: 'second_term_start',
    label: 'Second Term',
    color: 'from-indigo-500 to-blue-600',
    Icon: BookOpen,
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-800',
    shortLabel: 'Term 2',
  },
  {
    value: 'exam_start',
    label: 'Terminal Exam',
    color: 'from-purple-500 to-violet-600',
    Icon: FileText,
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    shortLabel: 'Exam',
  },
  {
    value: 'exam_end',
    label: 'Exam End',
    color: 'from-violet-500 to-purple-600',
    Icon: FileCheck,
    bgColor: 'bg-violet-100',
    textColor: 'text-violet-800',
    shortLabel: 'Exam End',
  },
  {
    value: 'result_publication',
    label: 'Results',
    color: 'from-pink-500 to-rose-600',
    Icon: Award,
    bgColor: 'bg-pink-100',
    textColor: 'text-pink-800',
    shortLabel: 'Results',
  },
  {
    value: 'meeting',
    label: 'Meeting',
    color: 'from-gray-500 to-slate-600',
    Icon: Users,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    shortLabel: 'Meeting',
  },
  {
    value: 'other',
    label: 'Other',
    color: 'from-teal-500 to-cyan-600',
    Icon: Circle,
    bgColor: 'bg-teal-100',
    textColor: 'text-teal-800',
    shortLabel: 'Other',
  },
];

export default function AcademicCalendar3D({
  classroomId,
  batchId,
  isOpen,
  onClose,
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState({});
  const [viewMode, setViewMode] = useState('calendar');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteTargetType, setDeleteTargetType] = useState(null);
  const [batchInfo, setBatchInfo] = useState(null);
  const [allEvents, setAllEvents] = useState([]);
  const [semesterStartDate, setSemesterStartDate] = useState(null);
  const [semesterEndDate, setSemesterEndDate] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showTerminalConfig, setShowTerminalConfig] = useState(false);
  const [terminalConfig, setTerminalConfig] = useState({
    termCount: 2,
    termWeeks: [7, 12],
    examDays: 5,
    semesterDuration: 16,
  });
  const [eventForm, setEventForm] = useState({
    id: null,
    date: '',
    eventType: 'other',
    description: '',
    batchId: batchId || '',
  });

  const isGlobalCalendar = !batchId;
  const isBatchCalendar = !!batchId;
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // ==================== FETCH TERMINAL CONFIG ====================
  const fetchTerminalConfig = useCallback(async () => {
    if (!batchId) return;
    try {
      const res = await fetch(`/api/terminal-config?batchId=${batchId}`);
      if (res.ok) {
        const data = await res.json();
        const c = data.config;
        if (c) {
          setTerminalConfig({
            termCount: c.termCount || 2,
            termWeeks: Array.isArray(c.termWeeks)
              ? c.termWeeks
              : typeof c.termWeeks === 'string'
              ? JSON.parse(c.termWeeks)
              : [7, 12],
            examDays: c.examDays || 5,
            semesterDuration: c.semesterDuration || 16,
          });
        }
      }
    } catch (e) {
      console.error('Error fetching terminal config:', e);
    }
  }, [batchId]);

  // ==================== DATA FETCHING ====================
  const fetchBatchInfo = useCallback(async () => {
    if (!batchId) {
      setDataLoaded(true);
      return;
    }
    try {
      const r = await fetch(`/api/batches/${batchId}`);
      if (r.ok) {
        const d = await r.json();
        setBatchInfo(d.batch || d);
      } else setBatchInfo({ name: 'Batch #' + batchId });
    } catch {
      setBatchInfo({ name: 'Batch #' + batchId });
    }
  }, [batchId]);

  const fetchAllEvents = useCallback(async () => {
    try {
      const [bR, gR] = await Promise.all([
        isBatchCalendar
          ? fetch(`/api/academic-calendar?batchId=${batchId}&limit=500`)
          : null,
        fetch('/api/academic-calendar?limit=500'),
      ]);
      let bE = [],
        gE = [];
      if (bR?.ok) bE = (await bR.json()).events || [];
      if (gR.ok)
        gE = ((await gR.json()).events || []).filter((e) => !e.batchId);
      const map = new Map();
      [...bE, ...gE].forEach((e) => {
        const k = `${formatDateKey(new Date(e.date))}-${e.eventType}`;
        if (!map.has(k) || (e.batchId && !map.get(k).batchId)) map.set(k, e);
      });
      const merged = Array.from(map.values());
      setAllEvents(merged);
      const ss = merged.find((e) => e.eventType === 'semester_start');
      const se = merged.find((e) => e.eventType === 'semester_end');
      if (ss) setSemesterStartDate(new Date(ss.date));
      if (se) setSemesterEndDate(new Date(se.date));
      return merged;
    } catch {
      return [];
    }
  }, [batchId, isBatchCalendar]);

  const fetchEvents = useCallback(async () => {
    try {
      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0);
      const startStr = formatDateKey(monthStart);
      const endStr = formatDateKey(monthEnd);
      let apiEvents = [];
      if (isBatchCalendar) {
        const [bR, gR] = await Promise.all([
          fetch(
            `/api/academic-calendar?startDate=${startStr}&endDate=${endStr}&batchId=${batchId}`
          ),
          fetch(
            `/api/academic-calendar?startDate=${startStr}&endDate=${endStr}`
          ),
        ]);
        const bD = bR.ok ? (await bR.json()).events || [] : [];
        const gD = gR.ok
          ? ((await gR.json()).events || []).filter((e) => !e.batchId)
          : [];
        const map = new Map();
        [...bD, ...gD].forEach((e) => {
          const k = `${formatDateKey(new Date(e.date))}-${e.eventType}`;
          if (!map.has(k) || (e.batchId && !map.get(k).batchId)) map.set(k, e);
        });
        apiEvents = Array.from(map.values());
      } else {
        const r = await fetch(
          `/api/academic-calendar?startDate=${startStr}&endDate=${endStr}`
        );
        if (r.ok)
          apiEvents = ((await r.json()).events || []).filter((e) => !e.batchId);
      }
      const em = {};
      apiEvents.forEach((e) => {
        const dk = formatDateKey(new Date(e.date));
        if (!em[dk]) em[dk] = [];
        em[dk].push(e);
      });
      setEvents(em);
    } catch (e) {
      console.error('fetchEvents error:', e);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth, batchId, isBatchCalendar]);

  useEffect(() => {
    if (isOpen) {
      setDataLoaded(false);
      setLoading(true);
      fetchBatchInfo();
      fetchTerminalConfig();
    }
  }, [isOpen, fetchBatchInfo, fetchTerminalConfig]);
  useEffect(() => {
    if (batchInfo !== null) {
      (async () => {
        await fetchAllEvents();
        setDataLoaded(true);
      })();
    }
  }, [batchInfo, fetchAllEvents]);
  useEffect(() => {
    if (isOpen && dataLoaded) {
      setLoading(true);
      fetchEvents();
    }
  }, [isOpen, dataLoaded, fetchEvents]);

  // ==================== HELPER: Check if a date is a holiday ====================
  const isHolidayDate = useCallback(
    (date) => {
      const dk = formatDateKey(date);
      // Check allEvents for holidays on this date
      return allEvents.some((e) => {
        const edk = formatDateKey(new Date(e.date));
        return edk === dk && e.eventType === 'holiday';
      });
    },
    [allEvents]
  );

  // ==================== AUTO-GENERATE ====================
  const autoGenerateSemesterDates = useCallback(
    async (semesterStartEvent) => {
      if (!batchId || !semesterStartEvent) return false;
      setAutoGenerating(true);
      try {
        const startDate = new Date(semesterStartEvent.date);
        startDate.setHours(0, 0, 0, 0);
        const semesterEndDate = addWeeks(
          startDate,
          terminalConfig.semesterDuration
        );

        console.log('=== GENERATING EVENTS ===');
        console.log('Semester Start:', formatDateKey(startDate));
        console.log('Semester End:', formatDateKey(semesterEndDate));
        console.log('Config:', terminalConfig);

        const eventsToCreate = [];

        // 1. Semester End
        eventsToCreate.push({
          date: formatDateKey(semesterEndDate),
          eventType: 'semester_end',
          description: `Semester End (${terminalConfig.semesterDuration} weeks)`,
          batchId: parseInt(batchId),
          isAutoGenerated: true,
        });

        // 2. Terminal Exams
        for (let t = 0; t < terminalConfig.termCount; t++) {
          const weekNum = terminalConfig.termWeeks[t] || 7 + t * 5;
          // Get the Sunday of that week number from semester start
          const termWeekStart = addWeeks(startDate, weekNum);
          const termSunday = getSunday(termWeekStart);

          console.log(
            `Terminal ${t + 1}: Week ${weekNum}, Sunday: ${formatDateKey(
              termSunday
            )}`
          );

          const termEventType =
            t === 0
              ? 'first_term_start'
              : t === 1
              ? 'second_term_start'
              : 'exam_start';

          // Add terminal start on Sunday
          eventsToCreate.push({
            date: formatDateKey(termSunday),
            eventType: termEventType,
            description: `Terminal ${t + 1} Exam (Week ${weekNum})`,
            batchId: parseInt(batchId),
            isAutoGenerated: true,
          });

          // Generate exam days starting from Sunday, skipping holidays and weekends
          let examDayCount = 0;
          let dayOffset = 0;
          const maxDaysToCheck = 30; // Safety limit

          while (
            examDayCount < terminalConfig.examDays &&
            dayOffset < maxDaysToCheck
          ) {
            const examDate = addDays(termSunday, dayOffset);
            const dayOfWeek = examDate.getDay();
            const dayNames = [
              'Sunday',
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
              'Friday',
              'Saturday',
            ];

            // Check if it's a working day (Sunday-Thursday) AND not a holiday
            const isWorkingDay = dayOfWeek >= 0 && dayOfWeek <= 4;
            const isHoliday = isHolidayDate(examDate);

            if (isWorkingDay && !isHoliday) {
              eventsToCreate.push({
                date: formatDateKey(examDate),
                eventType: 'exam_start',
                description: `Terminal ${t + 1} - ${dayNames[dayOfWeek]} (Day ${
                  examDayCount + 1
                })`,
                batchId: parseInt(batchId),
                isAutoGenerated: true,
                isTermExam: true,
              });
              examDayCount++;
              console.log(
                `  Exam Day ${examDayCount}: ${
                  dayNames[dayOfWeek]
                } ${formatDateKey(examDate)}`
              );
            } else {
              console.log(
                `  Skipping ${dayNames[dayOfWeek]} ${formatDateKey(
                  examDate
                )}: ${isHoliday ? 'Holiday' : 'Weekend'}`
              );
            }
            dayOffset++;
          }

          // Add exam end (on last exam day)
          const lastExam = [...eventsToCreate]
            .reverse()
            .find(
              (e) => e.isTermExam && e.description.includes(`Terminal ${t + 1}`)
            );
          if (lastExam) {
            eventsToCreate.push({
              date: lastExam.date,
              eventType: 'exam_end',
              description: `Terminal ${t + 1} Exam End`,
              batchId: parseInt(batchId),
              isAutoGenerated: true,
            });
          }
        }

        console.log(`\nCreating ${eventsToCreate.length} events...\n`);

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < eventsToCreate.length; i++) {
          const event = eventsToCreate[i];
          console.log(
            `[${i + 1}/${eventsToCreate.length}] ${event.eventType}: ${
              event.date
            }`
          );

          try {
            const response = await fetch('/api/academic-calendar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(event),
            });
            const result = await response.json();

            if (response.ok && result.success) {
              successCount++;
              console.log(`  ✅ Created`);
            } else {
              failCount++;
              console.error(
                `  ❌ Failed:`,
                result.error || response.statusText
              );
              if (response.status === 409)
                console.log(`  (Duplicate, continuing...)`);
            }
          } catch (e) {
            failCount++;
            console.error(`  ❌ Error:`, e.message);
          }

          await new Promise((r) => setTimeout(r, 50));
        }

        console.log(
          `\n=== DONE: ${successCount} created, ${failCount} failed ===`
        );

        if (failCount > 0) {
          setErrorMessage(`${failCount} event(s) failed to create`);
          setTimeout(() => setErrorMessage(null), 4000);
        }

        return successCount > 0;
      } catch (e) {
        console.error('Auto-gen error:', e);
        setErrorMessage('Generation failed: ' + e.message);
        return false;
      } finally {
        setAutoGenerating(false);
      }
    },
    [batchId, terminalConfig, isHolidayDate]
  );

  // ==================== DELETE & REGENERATE ====================
  const deleteAllEventsForBatch = async () => {
    if (!batchId) return false;
    try {
      const res = await fetch(
        `/api/academic-calendar?batchId=${batchId}&limit=500`
      );
      if (!res.ok) return false;
      const data = await res.json();
      const allBatchEvents = (data.events || []).filter(
        (e) => e.batchId === parseInt(batchId)
      );
      const semStart = allBatchEvents.find(
        (e) => e.eventType === 'semester_start'
      );
      if (!semStart) return false;

      const startDt = new Date(semStart.date);
      startDt.setHours(0, 0, 0, 0);
      const endDt = addWeeks(startDt, terminalConfig.semesterDuration);

      const toDelete = allBatchEvents.filter((e) => {
        if (e.eventType === 'semester_start') return false;
        if (!e.isAutoGenerated) return false;
        const ed = new Date(e.date);
        return ed >= startDt && ed <= endDt;
      });

      console.log(`Deleting ${toDelete.length} events...`);
      for (const e of toDelete) {
        await fetch(`/api/academic-calendar?id=${e.id}`, { method: 'DELETE' });
      }
      return true;
    } catch (e) {
      console.error('Delete error:', e);
      return false;
    }
  };

  const regenerateAllEvents = useCallback(async () => {
    if (!batchId) return;
    const semStart = allEvents.find(
      (e) => e.eventType === 'semester_start' && e.batchId === parseInt(batchId)
    );
    if (!semStart) {
      setErrorMessage('Add Semester Start first.');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    setAutoGenerating(true);
    try {
      await deleteAllEventsForBatch();
      await new Promise((r) => setTimeout(r, 500));
      await autoGenerateSemesterDates(semStart);
      await new Promise((r) => setTimeout(r, 500));
      await fetchAllEvents();
      await fetchEvents();
      setSuccessMessage('Events regenerated!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e) {
      setErrorMessage('Failed: ' + e.message);
      setTimeout(() => setErrorMessage(null), 3000);
    } finally {
      setAutoGenerating(false);
    }
  }, [
    batchId,
    allEvents,
    terminalConfig,
    autoGenerateSemesterDates,
    fetchAllEvents,
    fetchEvents,
  ]);

  // ==================== NAVIGATION ====================
  const prevMonth = () =>
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const nextMonth = () =>
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  const goToToday = () =>
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const handleDateClick = (day) =>
    setSelectedDate(formatDateKey(new Date(currentYear, currentMonth, day)));
  const handleDateDoubleClick = (day) => {
    const dk = formatDateKey(new Date(currentYear, currentMonth, day));
    setSelectedDate(dk);
    setEventForm({
      id: null,
      date: dk,
      eventType: 'other',
      description: '',
      batchId: batchId || '',
    });
    setShowEventModal(true);
  };

  const getEventsForDate = (day) =>
    events[formatDateKey(new Date(currentYear, currentMonth, day))] || [];
  const getEventTypeDetails = (et) =>
    EVENT_TYPES.find((e) => e.value === et) || EVENT_TYPES[9];
  const selectedDateEvents = selectedDate ? events[selectedDate] || [] : [];

  // ==================== EVENT HANDLERS ====================
  const handleSaveEvent = async () => {
    if (!eventForm.description.trim()) {
      setErrorMessage('Enter description');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...eventForm,
        date: eventForm.date,
        batchId: isGlobalCalendar ? null : batchId ? parseInt(batchId) : null,
      };
      const res = await fetch('/api/academic-calendar', {
        method: eventForm.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          eventForm.id ? { ...body, id: eventForm.id } : body
        ),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed');
      }
      setShowEventModal(false);
      const saved = await res.json();
      const savedData = saved.event || saved;

      if (
        !eventForm.id &&
        eventForm.eventType === 'semester_start' &&
        isBatchCalendar &&
        savedData
      ) {
        setSuccessMessage('Generating schedule...');
        setTimeout(() => setSuccessMessage(null), 2000);
        await autoGenerateSemesterDates(savedData);
        await fetchAllEvents();
        fetchEvents();
        setSuccessMessage('Semester & exams generated!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setSuccessMessage(eventForm.id ? 'Updated!' : 'Created!');
        setTimeout(() => setSuccessMessage(null), 3000);
        await fetchAllEvents();
        fetchEvents();
      }
    } catch (e) {
      setErrorMessage(e.message);
      setTimeout(() => setErrorMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleEditEvent = (event) => {
    setEventForm({
      id: event.id,
      date: formatDateKey(new Date(event.date)),
      eventType: event.eventType,
      description: event.description,
      batchId: event.batchId || batchId || '',
    });
    setShowEventModal(true);
  };

  const handleDeleteEvent = (id) => {
    const event = allEvents.find((e) => e.id === id);
    setDeleteTargetId(id);
    setDeleteTargetType(
      event?.eventType === 'semester_start' && isBatchCalendar
        ? 'semester_start'
        : 'single'
    );
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    if (!deleteTargetId) return;
    try {
      if (deleteTargetType === 'semester_start') {
        const autoEvents = allEvents.filter(
          (e) => e.isAutoGenerated && e.batchId === parseInt(batchId)
        );
        for (const e of autoEvents)
          await fetch(`/api/academic-calendar?id=${e.id}`, {
            method: 'DELETE',
          });
        await fetch(`/api/academic-calendar?id=${deleteTargetId}`, {
          method: 'DELETE',
        });
        setSuccessMessage(`Deleted ${autoEvents.length + 1} events!`);
      } else {
        await fetch(`/api/academic-calendar?id=${deleteTargetId}`, {
          method: 'DELETE',
        });
        setSuccessMessage('Event deleted!');
      }
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchAllEvents();
      fetchEvents();
    } catch (e) {
      setErrorMessage('Delete failed');
      setTimeout(() => setErrorMessage(null), 3000);
    }
    setDeleteTargetId(null);
    setDeleteTargetType(null);
  };

  const handlePrint = () => window.print();
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
        <div
          className={`px-6 py-4 flex items-center justify-between flex-shrink-0 print:hidden ${
            isGlobalCalendar
              ? 'bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700'
              : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600'
          }`}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 cursor-pointer"
            >
              <X size={20} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white">
                <CalendarDays size={24} className="inline mr-2" />
                Academic Calendar {currentYear}
              </h2>
              <p className="text-white/70 text-sm">
                {batchInfo
                  ? `Batch: ${batchInfo.name}`
                  : isGlobalCalendar
                  ? 'Global Calendar'
                  : 'Loading...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white/10 rounded-lg p-1 flex">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-white text-indigo-600'
                    : 'text-white/70'
                }`}
              >
                Month
              </button>
              {isBatchCalendar && (
                <button
                  onClick={() => setViewMode('report')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer ${
                    viewMode === 'report'
                      ? 'bg-white text-indigo-600'
                      : 'text-white/70'
                  }`}
                >
                  Semester View
                </button>
              )}
            </div>
            {isBatchCalendar && (
              <button
                onClick={() => setShowTerminalConfig(true)}
                className="px-3 py-1.5 bg-white/20 text-white rounded-lg text-sm flex items-center gap-1 cursor-pointer"
              >
                <Settings size={14} /> Terminals
              </button>
            )}
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white/20 text-white rounded-lg text-sm flex items-center gap-1 cursor-pointer"
            >
              <Printer size={14} /> Print
            </button>
          </div>
        </div>
        {/* Messages */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-20 right-6 z-50 bg-green-50 border-l-4 border-green-500 text-green-800 px-4 py-3 rounded-lg shadow-lg print:hidden"
            >
              <CheckCircle size={18} className="inline mr-2" />
              {successMessage}
            </motion.div>
          )}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-20 right-6 z-50 bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-lg shadow-lg print:hidden"
            >
              <AlertCircle size={18} className="inline mr-2" />
              {errorMessage}
            </motion.div>
          )}
        </AnimatePresence>
        {autoGenerating && (
          <div className="absolute inset-0 bg-white/80 z-40 flex items-center justify-center">
            <div className="text-center">
              <Loader2
                size={48}
                className="animate-spin text-indigo-600 mx-auto mb-4"
              />
              <p className="text-gray-700 font-medium">
                Regenerating schedule...
              </p>
            </div>
          </div>
        )}
        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={48} className="animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-4">
                  <button
                    onClick={prevMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <h3 className="text-xl font-bold text-gray-900">
                    {MONTHS[currentMonth]} {currentYear}
                  </h3>
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={goToToday}
                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Calendar size={14} /> Today
                  </button>
                  <button
                    onClick={() => {
                      const dk = formatDateKey(today);
                      setSelectedDate(dk);
                      setEventForm({
                        id: null,
                        date: dk,
                        eventType: 'other',
                        description: '',
                        batchId: batchId || '',
                      });
                      setShowEventModal(true);
                    }}
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map((d, i) => (
                  <div
                    key={d}
                    className={`px-1 py-2 text-center text-xs font-semibold uppercase border-y ${
                      i === 5 || i === 6
                        ? 'bg-gray-100 text-red-500'
                        : 'bg-gray-50 text-gray-500'
                    }`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div
                    key={`e-${i}`}
                    className="min-h-[100px] bg-gray-50/30 rounded-lg"
                  />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateObj = new Date(currentYear, currentMonth, day);
                  const dayEvents = getEventsForDate(day);
                  const isSelected = selectedDate === formatDateKey(dateObj);
                  const isToday =
                    formatDateKey(dateObj) === formatDateKey(today);
                  const isWknd = isWeekend(dateObj);
                  const hasHoliday = dayEvents.some(
                    (e) => e.eventType === 'holiday'
                  );
                  const hasExam = dayEvents.some(
                    (e) => e.eventType === 'exam_start'
                  );
                  return (
                    <motion.div
                      key={day}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => handleDateClick(day)}
                      onDoubleClick={() => handleDateDoubleClick(day)}
                      className={`min-h-[100px] p-2 rounded-lg cursor-pointer relative ${
                        isSelected
                          ? 'ring-2 ring-indigo-500 shadow-lg bg-indigo-50'
                          : hasHoliday
                          ? 'bg-orange-100 border-2 border-orange-400'
                          : isToday
                          ? 'bg-yellow-50 border-2 border-yellow-400'
                          : hasExam
                          ? 'bg-purple-50 border-2 border-purple-400'
                          : isWknd
                          ? 'bg-red-50 border border-red-200'
                          : 'bg-white border border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <span
                        className={`text-sm font-bold ${
                          isToday
                            ? 'bg-indigo-600 text-white w-7 h-7 rounded-full flex items-center justify-center'
                            : isWknd
                            ? 'text-red-500'
                            : 'text-gray-700'
                        }`}
                      >
                        {day}
                        {hasHoliday && (
                          <span className="text-[8px] ml-0.5">🏖</span>
                        )}
                        {hasExam && (
                          <span className="text-[8px] ml-0.5">📝</span>
                        )}
                      </span>
                      {dayEvents.slice(0, 3).map((event, idx) => {
                        const et = getEventTypeDetails(event.eventType);
                        return (
                          <div
                            key={idx}
                            className={`text-[10px] px-1.5 py-0.5 rounded-md truncate bg-gradient-to-r ${et.color} text-white mt-0.5`}
                          >
                            {event.description.substring(0, 14)}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-gray-500 mt-1">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-80 border-l border-gray-200 bg-gray-50 overflow-y-auto p-4 print:hidden">
              <h3 className="text-sm font-semibold mb-3">
                <Info size={14} className="inline mr-1" />
                {selectedDate
                  ? formatDisplayDate(new Date(selectedDate + 'T00:00:00'))
                  : 'Select a date'}
              </h3>
              {selectedDate &&
                selectedDateEvents.map((event, i) => {
                  const et = getEventTypeDetails(event.eventType);
                  return (
                    <div
                      key={i}
                      className={`${et.bgColor} rounded-lg p-3 border mb-2`}
                    >
                      <div className="flex items-center gap-2">
                        <et.Icon size={14} className={et.textColor} />
                        <span className={`text-xs font-medium ${et.textColor}`}>
                          {et.label}
                        </span>
                        {event.isAutoGenerated && (
                          <span className="text-[10px] bg-amber-100 text-amber-600 px-1 rounded">
                            Auto
                          </span>
                        )}
                        {event.isTermExam && (
                          <span className="text-[10px] bg-purple-100 text-purple-600 px-1 rounded">
                            Exam
                          </span>
                        )}
                      </div>
                      <p className="text-sm mt-1">{event.description}</p>
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={() => handleEditEvent(event)}
                          className="text-xs text-gray-500 hover:text-blue-600 cursor-pointer"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="text-xs text-gray-500 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
        {/* Event Modal */}
        {showEventModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center print:hidden">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setShowEventModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 mx-4"
            >
              <h3 className="text-lg font-bold mb-4">
                {eventForm.id ? 'Edit' : 'Add'} Event
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Type</label>
                  <select
                    value={eventForm.eventType}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, eventType: e.target.value })
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    {EVENT_TYPES.map((et) => (
                      <option key={et.value} value={et.value}>
                        {et.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, date: e.target.value })
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Description
                  </label>
                  <textarea
                    value={eventForm.description}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                {eventForm.eventType === 'semester_start' &&
                  isBatchCalendar && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-700">
                        <Info size={12} className="inline mr-1" />
                        Auto-generates terminal exams and semester end based on
                        config.
                      </p>
                    </div>
                  )}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEvent}
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {/* Delete Confirm */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteTargetId(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 mx-4"
            >
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle size={32} className="text-red-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-center text-gray-800 mb-2">
                {deleteTargetType === 'semester_start'
                  ? 'Delete All?'
                  : 'Delete Event?'}
              </h3>
              <p className="text-gray-600 text-center mb-6">
                {deleteTargetType === 'semester_start'
                  ? 'Deletes Semester Start and ALL auto-generated events.'
                  : 'This cannot be undone.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteTargetId(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 size={18} />
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        <TerminalExamConfigModal
          isOpen={showTerminalConfig}
          onClose={() => setShowTerminalConfig(false)}
          onSave={async (config) => {
            // CHANGE THIS - just save config, don't regenerate
            setTerminalConfig(config);
            // Remove: await regenerateAllEvents();
          }}
          batchId={batchId}
        />
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .fixed.inset-0.z-50 {
              visibility: visible;
              position: absolute;
              inset: 0 !important;
            }
            .fixed.inset-0.z-50 * {
              visibility: visible;
            }
            .print\\:hidden {
              display: none !important;
            }
          }
        `}</style>
      </motion.div>
    </div>
  );
}
