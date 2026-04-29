// components/classroom/AcademicCalendar3D.jsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Globe,
} from 'lucide-react';

// Nepali Calendar Data (Bikram Sambat)
const NEPALI_MONTHS = [
  'Baisakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
];
const ENGLISH_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ENGLISH_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const NEPALI_MONTH_DAYS = [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 30];
const BS_START_YEAR = 2081;
const BS_START_ENGLISH = new Date(2024, 3, 14);

const englishToNepali = (englishDate) => {
  const date = new Date(englishDate);
  const diffTime = date.getTime() - BS_START_ENGLISH.getTime();
  let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  let bsYear = BS_START_YEAR,
    bsMonth = 0,
    bsDay = 1;

  while (diffDays > 0) {
    const dim = NEPALI_MONTH_DAYS[bsMonth];
    if (diffDays + bsDay - 1 < dim) {
      bsDay += diffDays;
      diffDays = 0;
    } else {
      diffDays -= dim - bsDay + 1;
      bsDay = 1;
      bsMonth++;
      if (bsMonth >= 12) {
        bsMonth = 0;
        bsYear++;
      }
    }
  }

  while (diffDays < 0) {
    if (bsDay + diffDays >= 1) {
      bsDay += diffDays;
      diffDays = 0;
    } else {
      bsMonth--;
      if (bsMonth < 0) {
        bsMonth = 11;
        bsYear--;
      }
      diffDays += bsDay;
      bsDay = NEPALI_MONTH_DAYS[bsMonth];
    }
  }

  return {
    year: bsYear,
    month: bsMonth,
    day: bsDay,
    monthName: NEPALI_MONTHS[bsMonth],
    dayName: ENGLISH_DAYS[date.getDay()],
  };
};

const nepaliToEnglish = (bsYear, bsMonth, bsDay) => {
  let totalDays = 0;

  if (bsYear >= BS_START_YEAR) {
    for (let y = BS_START_YEAR; y < bsYear; y++)
      for (let m = 0; m < 12; m++) totalDays += NEPALI_MONTH_DAYS[m];
    for (let m = 0; m < bsMonth; m++) totalDays += NEPALI_MONTH_DAYS[m];
    totalDays += bsDay - 1;
  } else {
    for (let y = bsYear; y < BS_START_YEAR; y++)
      for (let m = 0; m < 12; m++) totalDays -= NEPALI_MONTH_DAYS[m];
    for (let m = bsMonth; m < 12; m++) totalDays -= NEPALI_MONTH_DAYS[m];
    totalDays += bsDay - 1;
  }

  const englishDate = new Date(BS_START_ENGLISH);
  englishDate.setDate(englishDate.getDate() + totalDays);
  return englishDate;
};

// Check if a date is Saturday
const isSaturday = (date) => {
  const d = new Date(date);
  return d.getDay() === 6;
};

// Get default holiday description for Saturday
const getSaturdayHolidayName = (date) => {
  const d = new Date(date);
  const nepaliDate = englishToNepali(d);
  return `Saturday (${nepaliDate.day} ${nepaliDate.monthName})`;
};

const EVENT_TYPES = [
  {
    value: 'semester_start',
    label: 'Semester Start',
    color: 'from-green-500 to-emerald-600',
    Icon: Play,
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    dotColor: 'bg-green-500',
    shortLabel: 'Sem Start',
  },
  {
    value: 'semester_end',
    label: 'Semester End',
    color: 'from-red-500 to-rose-600',
    Icon: StopCircle,
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    dotColor: 'bg-red-500',
    shortLabel: 'Sem End',
  },
  {
    value: 'holiday',
    label: 'Holiday',
    color: 'from-orange-500 to-amber-600',
    Icon: Sun,
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    dotColor: 'bg-orange-500',
    shortLabel: 'Holiday',
  },
  {
    value: 'first_term_start',
    label: 'First Term',
    color: 'from-blue-500 to-cyan-600',
    Icon: BookOpen,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    dotColor: 'bg-blue-500',
    shortLabel: 'Term 1',
  },
  {
    value: 'second_term_start',
    label: 'Second Term',
    color: 'from-indigo-500 to-blue-600',
    Icon: BookOpen,
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-800',
    dotColor: 'bg-indigo-500',
    shortLabel: 'Term 2',
  },
  {
    value: 'exam_start',
    label: 'Exam Start',
    color: 'from-purple-500 to-violet-600',
    Icon: FileText,
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    dotColor: 'bg-purple-500',
    shortLabel: 'Exam',
  },
  {
    value: 'exam_end',
    label: 'Exam End',
    color: 'from-violet-500 to-purple-600',
    Icon: FileCheck,
    bgColor: 'bg-violet-100',
    textColor: 'text-violet-800',
    dotColor: 'bg-violet-500',
    shortLabel: 'Exam End',
  },
  {
    value: 'result_publication',
    label: 'Results',
    color: 'from-pink-500 to-rose-600',
    Icon: Award,
    bgColor: 'bg-pink-100',
    textColor: 'text-pink-800',
    dotColor: 'bg-pink-500',
    shortLabel: 'Results',
  },
  {
    value: 'meeting',
    label: 'Meeting',
    color: 'from-gray-500 to-slate-600',
    Icon: Users,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    dotColor: 'bg-gray-500',
    shortLabel: 'Meeting',
  },
  {
    value: 'other',
    label: 'Other',
    color: 'from-teal-500 to-cyan-600',
    Icon: Circle,
    bgColor: 'bg-teal-100',
    textColor: 'text-teal-800',
    dotColor: 'bg-teal-500',
    shortLabel: 'Other',
  },
];

const formatDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;

const formatShortDate = (date) =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

export default function AcademicCalendar3D({
  classroomId,
  batchId,
  isOpen,
  onClose,
}) {
  const [currentNepaliYear, setCurrentNepaliYear] = useState(2082);
  const [currentNepaliMonth, setCurrentNepaliMonth] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState({});
  const [viewMode, setViewMode] = useState('calendar');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const printRef = useRef(null);

  const [batchInfo, setBatchInfo] = useState(null);
  const [calendarMonths, setCalendarMonths] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [semesterStartDate, setSemesterStartDate] = useState(null);
  const [semesterEndDate, setSemesterEndDate] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const isGlobalCalendar = !batchId;
  const isBatchCalendar = !!batchId;

  const [eventForm, setEventForm] = useState({
    id: null,
    date: '',
    eventType: 'other',
    description: '',
    semester: '',
    batchId: batchId || '',
  });

  // Initialize with current Nepali date
  useEffect(() => {
    const today = new Date();
    const nd = englishToNepali(today);
    setCurrentNepaliYear(nd.year);
    setCurrentNepaliMonth(nd.month);
  }, []);

  // Fetch batch info when calendar opens
  const fetchBatchInfo = useCallback(async () => {
    if (!batchId) {
      setDataLoaded(true);
      return;
    }
    try {
      const res = await fetch(`/api/batches/${batchId}`);
      if (res.ok) {
        const data = await res.json();
        const batch = data.batch || data;
        setBatchInfo(batch);
      } else {
        setBatchInfo({ name: 'Batch #' + batchId });
      }
    } catch (e) {
      setBatchInfo({ name: 'Batch #' + batchId });
    }
  }, [batchId]);

  // Calculate calendar months from events - Only show from semester start to semester end
  const calculateCalendarMonths = useCallback(async () => {
    if (!isBatchCalendar) {
      setDataLoaded(true);
      return;
    }
    try {
      // Fetch BOTH global and batch events
      const [batchRes, globalRes] = await Promise.all([
        fetch(`/api/academic-calendar?batchId=${batchId}`),
        fetch('/api/academic-calendar'), // Get global events (batchId = null)
      ]);

      let batchEvents = [];
      let globalEvents = [];

      if (batchRes.ok) {
        batchEvents = (await batchRes.json()).events || [];
      }
      if (globalRes.ok) {
        // Get only global events (batchId is null)
        globalEvents = (await globalRes.json()).events || [];
        globalEvents = globalEvents.filter((e) => e.batchId === null);
      }

      // Merge batch and global events
      const allCalendarEvents = [...batchEvents, ...globalEvents];

      // Remove duplicates (prefer batch events over global)
      const eventMap = new Map();
      allCalendarEvents.forEach((event) => {
        const key = `${formatDateKey(new Date(event.date))}-${event.eventType}`;
        if (
          !eventMap.has(key) ||
          (event.batchId && !eventMap.get(key).batchId)
        ) {
          eventMap.set(key, event);
        }
      });

      const mergedEvents = Array.from(eventMap.values());
      setAllEvents(mergedEvents);

      const semesterStart = mergedEvents.find(
        (e) => e.eventType === 'semester_start'
      );
      const semesterEnd = mergedEvents.find(
        (e) => e.eventType === 'semester_end'
      );

      if (semesterStart) {
        const startEngDate = new Date(semesterStart.date);
        const startNepaliDate = englishToNepali(startEngDate);
        setSemesterStartDate(startEngDate);
        if (semesterEnd) setSemesterEndDate(new Date(semesterEnd.date));

        const endNepaliDate = semesterEnd
          ? englishToNepali(new Date(semesterEnd.date))
          : null;
        const months = [];
        let bsYear = startNepaliDate.year;
        let bsMonth = startNepaliDate.month;

        // If semester end exists, only show months up to end month
        if (endNepaliDate) {
          while (
            bsYear < endNepaliDate.year ||
            (bsYear === endNepaliDate.year && bsMonth <= endNepaliDate.month)
          ) {
            const firstDayEng = nepaliToEnglish(bsYear, bsMonth, 1);
            const monthEvents = mergedEvents
              .filter((e) => {
                const nd = englishToNepali(new Date(e.date));
                return nd.year === bsYear && nd.month === bsMonth;
              })
              .sort((a, b) => new Date(a.date) - new Date(b.date));

            months.push({
              nepaliMonthName: NEPALI_MONTHS[bsMonth],
              nepaliYear: bsYear,
              daysInMonth: NEPALI_MONTH_DAYS[bsMonth],
              firstDayOfWeek: firstDayEng.getDay(),
              events: monthEvents,
              isCurrentMonth:
                bsYear === englishToNepali(new Date()).year &&
                bsMonth === englishToNepali(new Date()).month,
            });

            bsMonth++;
            if (bsMonth >= 12) {
              bsMonth = 0;
              bsYear++;
            }
          }
        } else {
          // If no semester end, show 12 months from start
          let count = 0;
          while (count < 12) {
            const firstDayEng = nepaliToEnglish(bsYear, bsMonth, 1);
            const monthEvents = mergedEvents
              .filter((e) => {
                const nd = englishToNepali(new Date(e.date));
                return nd.year === bsYear && nd.month === bsMonth;
              })
              .sort((a, b) => new Date(a.date) - new Date(b.date));

            months.push({
              nepaliMonthName: NEPALI_MONTHS[bsMonth],
              nepaliYear: bsYear,
              daysInMonth: NEPALI_MONTH_DAYS[bsMonth],
              firstDayOfWeek: firstDayEng.getDay(),
              events: monthEvents,
              isCurrentMonth:
                bsYear === englishToNepali(new Date()).year &&
                bsMonth === englishToNepali(new Date()).month,
            });

            bsMonth++;
            if (bsMonth >= 12) {
              bsMonth = 0;
              bsYear++;
            }
            count++;
          }
        }
        setCalendarMonths(months);
      }
      setDataLoaded(true);
    } catch (e) {
      console.error('Error calculating months:', e);
      setDataLoaded(true);
    }
  }, [batchId, isBatchCalendar]);

  useEffect(() => {
    if (isOpen) {
      setDataLoaded(false);
      setLoading(true);
      fetchBatchInfo();
    }
  }, [isOpen, fetchBatchInfo]);

  useEffect(() => {
    if (batchInfo !== null) calculateCalendarMonths();
  }, [batchInfo, calculateCalendarMonths]);

  // Generate Saturday events for current month
  const generateSaturdayEvents = useCallback((year, month) => {
    const saturdayEvents = {};
    const daysInMonth = NEPALI_MONTH_DAYS[month];

    for (let day = 1; day <= daysInMonth; day++) {
      const engDate = nepaliToEnglish(year, month, day);
      if (isSaturday(engDate)) {
        const dateKey = formatDateKey(engDate);
        saturdayEvents[dateKey] = [
          {
            id: `saturday-${dateKey}`,
            date: dateKey,
            eventType: 'holiday',
            description: getSaturdayHolidayName(engDate),
            semester: '',
            batchId: null,
            isAutoGenerated: true,
          },
        ];
      }
    }
    return saturdayEvents;
  }, []);

  // Fetch events for current month view - FIXED to properly handle global events
  const fetchEvents = useCallback(async () => {
    try {
      const monthStart = nepaliToEnglish(
        currentNepaliYear,
        currentNepaliMonth,
        1
      );
      const nextM = currentNepaliMonth + 1 >= 12 ? 0 : currentNepaliMonth + 1;
      const nextY =
        currentNepaliMonth + 1 >= 12
          ? currentNepaliYear + 1
          : currentNepaliYear;
      const monthEnd = nepaliToEnglish(nextY, nextM, 1);
      monthEnd.setDate(monthEnd.getDate() - 1);

      // Fetch both global and batch events if it's a batch calendar
      let apiEvents = [];

      if (isBatchCalendar) {
        // For batch calendar, get both batch-specific and global events
        const [batchRes, globalRes] = await Promise.all([
          fetch(
            `/api/academic-calendar?startDate=${formatDateKey(
              monthStart
            )}&endDate=${formatDateKey(monthEnd)}&batchId=${batchId}`
          ),
          fetch(
            `/api/academic-calendar?startDate=${formatDateKey(
              monthStart
            )}&endDate=${formatDateKey(monthEnd)}`
          ),
        ]);

        const batchData = batchRes.ok
          ? (await batchRes.json()).events || []
          : [];
        const globalData = globalRes.ok
          ? (await globalRes.json()).events || []
          : [];

        // Filter global events to only those without batchId
        const pureGlobalEvents = globalData.filter((e) => e.batchId === null);

        // Merge events, preferring batch events if duplicate date+type
        const eventMap = new Map();
        [...batchData, ...pureGlobalEvents].forEach((event) => {
          const key = `${formatDateKey(new Date(event.date))}-${
            event.eventType
          }`;
          if (
            !eventMap.has(key) ||
            (event.batchId && !eventMap.get(key).batchId)
          ) {
            eventMap.set(key, event);
          }
        });

        apiEvents = Array.from(eventMap.values());
      } else {
        // For global calendar, only get global events (no batchId)
        const res = await fetch(
          `/api/academic-calendar?startDate=${formatDateKey(
            monthStart
          )}&endDate=${formatDateKey(monthEnd)}`
        );
        if (res.ok) {
          const data = await res.json();
          apiEvents = (data.events || []).filter((e) => !e.batchId);
        }
      }

      const em = {};

      // Process API events
      apiEvents.forEach((e) => {
        const dk = formatDateKey(new Date(e.date));
        if (!em[dk]) em[dk] = [];
        em[dk].push(e);
      });

      // Generate Saturday events for the current month
      const saturdayEvents = generateSaturdayEvents(
        currentNepaliYear,
        currentNepaliMonth
      );

      // Merge Saturday events with API events (API events take priority)
      Object.keys(saturdayEvents).forEach((dateKey) => {
        if (!em[dateKey]) {
          // No events on this Saturday, add the auto-generated one
          em[dateKey] = saturdayEvents[dateKey];
        } else {
          // Check if there's already a holiday event on this Saturday
          const hasHoliday = em[dateKey].some((e) => e.eventType === 'holiday');
          if (!hasHoliday) {
            // Add Saturday holiday if no holiday event exists
            em[dateKey] = [...em[dateKey], ...saturdayEvents[dateKey]];
          }
        }
      });

      setEvents(em);
      console.log(
        'Events loaded:',
        Object.keys(em).length,
        'dates with events'
      );
    } catch (e) {
      console.error('Error fetching events:', e);
    } finally {
      setLoading(false);
    }
  }, [
    currentNepaliYear,
    currentNepaliMonth,
    batchId,
    isGlobalCalendar,
    isBatchCalendar,
    generateSaturdayEvents,
  ]);

  useEffect(() => {
    if (isOpen && dataLoaded) {
      setLoading(true);
      fetchEvents();
    }
  }, [isOpen, dataLoaded, fetchEvents]);

  const prevMonth = () => {
    if (currentNepaliMonth === 0) {
      setCurrentNepaliMonth(11);
      setCurrentNepaliYear(currentNepaliYear - 1);
    } else {
      setCurrentNepaliMonth(currentNepaliMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentNepaliMonth === 11) {
      setCurrentNepaliMonth(0);
      setCurrentNepaliYear(currentNepaliYear + 1);
    } else {
      setCurrentNepaliMonth(currentNepaliMonth + 1);
    }
  };

  const goToToday = () => {
    const nd = englishToNepali(new Date());
    setCurrentNepaliYear(nd.year);
    setCurrentNepaliMonth(nd.month);
  };

  const daysInMonth = NEPALI_MONTH_DAYS[currentNepaliMonth];
  const firstDayOfWeek = nepaliToEnglish(
    currentNepaliYear,
    currentNepaliMonth,
    1
  ).getDay();

  const handleDateClick = (day) => {
    const ed = nepaliToEnglish(currentNepaliYear, currentNepaliMonth, day);
    setSelectedDate(formatDateKey(ed));
  };

  const handleDateDoubleClick = (day) => {
    const ed = nepaliToEnglish(currentNepaliYear, currentNepaliMonth, day);
    const dk = formatDateKey(ed);
    setSelectedDate(dk);
    setEventForm({
      id: null,
      date: dk,
      eventType: 'other',
      description: '',
      semester: '',
      batchId: batchId || '',
    });
    setShowEventModal(true);
  };

  const getEventsForDate = (day) => {
    const ed = nepaliToEnglish(currentNepaliYear, currentNepaliMonth, day);
    return events[formatDateKey(ed)] || [];
  };

  const getEventTypeDetails = (et) =>
    EVENT_TYPES.find((e) => e.value === et) || EVENT_TYPES[9];

  const selectedDateEvents = selectedDate ? events[selectedDate] || [] : [];

  const getEventsForMonthDay = (bsYear, bsMonth, day) => {
    const ed = nepaliToEnglish(bsYear, bsMonth, day);
    const dateKey = formatDateKey(ed);

    // Get API events (includes both global and batch events)
    const apiEvents = allEvents.filter(
      (e) => formatDateKey(new Date(e.date)) === dateKey
    );

    // Add Saturday holiday if applicable
    if (isSaturday(ed) && !apiEvents.some((e) => e.eventType === 'holiday')) {
      const saturdayEvent = {
        id: `saturday-${dateKey}`,
        date: dateKey,
        eventType: 'holiday',
        description: getSaturdayHolidayName(ed),
        semester: '',
        batchId: null,
        isAutoGenerated: true,
      };
      return [...apiEvents, saturdayEvent];
    }

    return apiEvents;
  };

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
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccessMessage(eventForm.id ? 'Updated!' : 'Created!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowEventModal(false);
      fetchEvents();
      calculateCalendarMonths();
    } catch (e) {
      setErrorMessage(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditEvent = (event) => {
    if (event.isAutoGenerated) {
      // For auto-generated Saturday events, pre-fill the form
      setEventForm({
        id: null,
        date: event.date,
        eventType: 'holiday',
        description: event.description,
        semester: '',
        batchId: batchId || '',
      });
    } else {
      setEventForm({
        id: event.id,
        date: formatDateKey(new Date(event.date)),
        eventType: event.eventType,
        description: event.description,
        semester: event.semester || '',
        batchId: event.batchId || batchId || '',
      });
    }
    setShowEventModal(true);
  };

  const handleEditDate = (bsYear, bsMonth, bsDay) => {
    const ed = nepaliToEnglish(bsYear, bsMonth, bsDay);
    setEventForm({
      id: null,
      date: formatDateKey(ed),
      eventType: 'other',
      description: '',
      semester: '',
      batchId: batchId || '',
    });
    setShowEventModal(true);
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm('Delete this event?')) return;
    try {
      await fetch(`/api/academic-calendar?id=${id}`, { method: 'DELETE' });
      setSuccessMessage('Deleted!');
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchEvents();
      calculateCalendarMonths();
    } catch (e) {
      console.error('Error deleting event:', e);
    }
  };

  const handlePrint = () => window.print();

  if (!isOpen) return null;

  const todayNepali = englishToNepali(new Date());

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
              className="text-white/80 hover:text-white p-2"
            >
              <X size={20} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white">
                <CalendarDays size={24} className="inline mr-2" />
                Academic Calendar {currentNepaliYear} BS
              </h2>
              <p className="text-white/70 text-sm">
                {batchInfo
                  ? `Batch: ${batchInfo.name}`
                  : isGlobalCalendar
                  ? 'Global Calendar'
                  : 'Loading batch...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white/10 rounded-lg p-1 flex">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
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
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    viewMode === 'report'
                      ? 'bg-white text-indigo-600'
                      : 'text-white/70'
                  }`}
                >
                  Report
                </button>
              )}
            </div>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white/20 text-white rounded-lg text-sm flex items-center gap-1"
            >
              <Printer size={14} /> Print
            </button>
          </div>
        </div>

        {/* Print header */}
        <div className="hidden print:block text-center py-2 border-b-2 border-gray-700 px-6">
          <h1 className="text-lg font-bold text-gray-900">
            Asian College of Higher Studies
          </h1>
          {batchInfo && (
            <p className="text-sm font-semibold text-gray-700">
              {batchInfo.name}
              {batchInfo.department?.name && ` - ${batchInfo.department.name}`}
            </p>
          )}
          <h2 className="text-base font-bold text-gray-800">
            Academic Calendar {currentNepaliYear} BS
          </h2>
          <p className="text-xs text-gray-600">
            Semester:{' '}
            {semesterStartDate ? formatShortDate(semesterStartDate) : 'N/A'} -{' '}
            {semesterEndDate ? formatShortDate(semesterEndDate) : 'N/A'}
          </p>
        </div>

        {/* Success/Error messages */}
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

        {/* Loading state */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2
                size={48}
                className="animate-spin text-indigo-600 mx-auto mb-4"
              />
              <p className="text-gray-500">Loading academic calendar...</p>
            </div>
          </div>
        ) : viewMode === 'report' && isBatchCalendar ? (
          /* Report View - Shows only from semester start to end, events in single comma-separated lines */
          <div ref={printRef} className="flex-1 overflow-y-auto p-4">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4 print:bg-gray-100 print:border-gray-300 print:p-2">
              <div className="flex flex-wrap gap-3 text-xs">
                <div>
                  <span className="text-gray-600">Batch:</span>{' '}
                  <span className="font-semibold">
                    {batchInfo?.name || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Start:</span>{' '}
                  <span className="font-semibold text-green-600">
                    {semesterStartDate
                      ? formatShortDate(semesterStartDate)
                      : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">End:</span>{' '}
                  <span className="font-semibold text-red-600">
                    {semesterEndDate ? formatShortDate(semesterEndDate) : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Months:</span>{' '}
                  <span className="font-semibold">{calendarMonths.length}</span>
                </div>
              </div>
            </div>

            {calendarMonths.length === 0 ? (
              <div className="text-center py-12">
                <Info size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  No semester data. Add "Semester Start" event first.
                </p>
              </div>
            ) : (
              <div className="space-y-2 print:space-y-0">
                {calendarMonths.map((month, mIdx) => (
                  <div
                    key={mIdx}
                    className={`print-page bg-white border rounded-lg shadow-sm overflow-hidden print:shadow-none print:border-gray-400 ${
                      month.isCurrentMonth ? 'ring-2 ring-indigo-500' : ''
                    }`}
                  >
                    <div
                      className={`px-3 py-1.5 flex items-center justify-between ${
                        month.isCurrentMonth
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                      } print:bg-gray-200 print:text-black print:py-1`}
                    >
                      <h3 className="text-base font-bold print:text-sm">
                        {month.nepaliMonthName} {month.nepaliYear} BS
                      </h3>
                      <span className="text-xs opacity-80">
                        {month.events.length} event
                        {month.events.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex">
                      {/* Calendar grid */}
                      <div className="w-[45%] p-2 border-r print:border-r-gray-300 print:p-1">
                        <div className="grid grid-cols-7 gap-px mb-px">
                          {ENGLISH_DAYS.map((d, i) => (
                            <div
                              key={d}
                              className={`text-center text-[7px] font-semibold py-0.5 print:text-[6px] ${
                                i === 6 ? 'text-orange-600' : 'text-gray-500'
                              }`}
                            >
                              {d.substring(0, 2)}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-px">
                          {Array.from({ length: month.firstDayOfWeek }).map(
                            (_, i) => (
                              <div
                                key={`e-${i}`}
                                className="min-h-[28px] print:min-h-[22px]"
                              />
                            )
                          )}
                          {Array.from({ length: month.daysInMonth }).map(
                            (_, i) => {
                              const day = i + 1;
                              const engDate = nepaliToEnglish(
                                month.nepaliYear,
                                NEPALI_MONTHS.indexOf(month.nepaliMonthName),
                                day
                              );
                              const isSat = isSaturday(engDate);
                              const dayEvents = getEventsForMonthDay(
                                month.nepaliYear,
                                NEPALI_MONTHS.indexOf(month.nepaliMonthName),
                                day
                              );
                              const hasEvent = dayEvents.length > 0;

                              return (
                                <div
                                  key={day}
                                  className={`min-h-[28px] text-center rounded-sm print:min-h-[22px] ${
                                    isSat
                                      ? 'bg-orange-100 text-orange-700 font-semibold'
                                      : 'bg-white text-gray-700'
                                  } ${
                                    hasEvent
                                      ? 'ring-1 ring-indigo-400 font-bold'
                                      : 'border border-gray-100'
                                  }`}
                                >
                                  <div className="text-[8px] font-medium print:text-[7px]">
                                    {day}
                                    {isSat && (
                                      <span className="text-[6px] ml-0.5">
                                        (H)
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[6px] text-gray-500 print:text-[5px]">
                                    {engDate.getDate()}{' '}
                                    {ENGLISH_MONTHS[engDate.getMonth()]}
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>

                      {/* Events list - Single comma-separated line per event */}
                      <div className="w-[55%] p-2 print:p-1">
                        <h4 className="text-[9px] font-semibold text-gray-600 uppercase mb-1 print:text-[8px]">
                          Activities
                        </h4>
                        {month.events.length === 0 ? (
                          <p className="text-[9px] text-gray-400 italic">
                            No events
                          </p>
                        ) : (
                          <div className="space-y-0.5 max-h-[250px] overflow-y-auto print:max-h-none">
                            {month.events.map((event, ei) => {
                              const et = getEventTypeDetails(event.eventType);
                              const ed = new Date(event.date);
                              const nd = englishToNepali(ed);
                              const isGlobalEvent =
                                !event.batchId && !event.isAutoGenerated;

                              return (
                                <div
                                  key={ei}
                                  className="text-[8px] py-0.5 print:text-[7px] border-b border-gray-100 last:border-b-0"
                                >
                                  <span className="font-bold text-gray-700">
                                    {nd.day} {nd.monthName.substring(0, 3)}
                                  </span>
                                  <span className="text-gray-400">, </span>
                                  <span
                                    className={`font-medium ${et.textColor}`}
                                  >
                                    {et.shortLabel}
                                  </span>
                                  <span className="text-gray-400">, </span>
                                  <span className="text-gray-600">
                                    {event.description}
                                  </span>
                                  {isGlobalEvent && (
                                    <>
                                      <span className="text-gray-400">, </span>
                                      <Globe
                                        size={8}
                                        className="text-blue-500 inline"
                                      />
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Calendar View */
          <div className="flex-1 flex overflow-hidden">
            {/* Main calendar area */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-4">
                  <button
                    onClick={prevMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {NEPALI_MONTHS[currentNepaliMonth]} {currentNepaliYear}{' '}
                      <span className="text-sm font-normal text-gray-500">
                        BS
                      </span>
                    </h3>
                  </div>
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={goToToday}
                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg flex items-center gap-1"
                  >
                    <Calendar size={14} /> Today
                  </button>
                  <button
                    onClick={() => {
                      const ed = nepaliToEnglish(
                        currentNepaliYear,
                        currentNepaliMonth,
                        todayNepali.day || 1
                      );
                      setSelectedDate(formatDateKey(ed));
                      setEventForm({
                        id: null,
                        date: formatDateKey(ed),
                        eventType: 'other',
                        description: '',
                        semester: '',
                        batchId: batchId || '',
                      });
                      setShowEventModal(true);
                    }}
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg flex items-center gap-1"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>

              {/* Day headers - English days only */}
              <div className="grid grid-cols-7 mb-1">
                {ENGLISH_DAYS.map((d, i) => (
                  <div
                    key={d}
                    className={`px-1 py-2 text-center text-xs font-semibold uppercase border-y ${
                      i === 6
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-50 text-gray-500'
                    }`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div
                    key={`e-${i}`}
                    className="min-h-[100px] bg-gray-50/50 rounded-lg"
                  />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const engDate = nepaliToEnglish(
                    currentNepaliYear,
                    currentNepaliMonth,
                    day
                  );
                  const dayEvents = getEventsForDate(day);
                  const isSelected = selectedDate === formatDateKey(engDate);
                  const isTodayDate =
                    todayNepali.year === currentNepaliYear &&
                    todayNepali.month === currentNepaliMonth &&
                    todayNepali.day === day;
                  const isSat = isSaturday(engDate);

                  return (
                    <motion.div
                      key={day}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => handleDateClick(day)}
                      onDoubleClick={() => handleDateDoubleClick(day)}
                      className={`min-h-[100px] p-2 rounded-lg cursor-pointer relative ${
                        isSelected
                          ? 'ring-2 ring-indigo-500 shadow-lg bg-indigo-50'
                          : isTodayDate
                          ? 'bg-yellow-50 border border-yellow-200'
                          : isSat
                          ? 'bg-orange-50 border-2 border-orange-300'
                          : 'bg-white border border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-sm font-bold ${
                            isTodayDate
                              ? 'bg-indigo-600 text-white w-7 h-7 rounded-full flex items-center justify-center'
                              : isSat
                              ? 'text-orange-600'
                              : 'text-gray-700'
                          }`}
                        >
                          {day}
                          {isSat && (
                            <span className="text-[8px] ml-0.5">H</span>
                          )}
                        </span>
                        <span className="text-[9px] text-gray-400">
                          {engDate.getDate()}{' '}
                          {ENGLISH_MONTHS[engDate.getMonth()]}
                        </span>
                      </div>

                      {/* Event indicators */}
                      {dayEvents.slice(0, 3).map((event, idx) => {
                        const et = getEventTypeDetails(event.eventType);
                        const isGlobalEvent =
                          !event.batchId && !event.isAutoGenerated;

                        return (
                          <div
                            key={idx}
                            className={`text-[10px] px-1.5 py-0.5 rounded-md truncate bg-gradient-to-r ${et.color} text-white mt-0.5 flex items-center gap-1`}
                          >
                            {isGlobalEvent && <Globe size={8} />}
                            {event.description.substring(0, 12)}
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
            <div className="w-80 border-l border-gray-200 bg-gray-50 overflow-y-auto">
              <div className="p-4">
                <h3 className="text-sm font-semibold mb-3">
                  <Info size={14} className="inline mr-1" />
                  {selectedDate
                    ? `${
                        englishToNepali(new Date(selectedDate + 'T00:00:00'))
                          .day
                      } ${
                        englishToNepali(new Date(selectedDate + 'T00:00:00'))
                          .monthName
                      } ${
                        englishToNepali(new Date(selectedDate + 'T00:00:00'))
                          .year
                      } BS`
                    : 'Select Date'}
                </h3>
                {selectedDate && (
                  <div className="text-xs text-gray-500 mb-3">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString(
                      'en-US',
                      {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      }
                    )}
                  </div>
                )}

                {selectedDate &&
                  selectedDateEvents.map((event, i) => {
                    const et = getEventTypeDetails(event.eventType);
                    const isGlobalEvent =
                      !event.batchId && !event.isAutoGenerated;

                    return (
                      <div
                        key={i}
                        className={`${et.bgColor} rounded-lg p-3 border mb-2`}
                      >
                        <div className="flex items-center gap-2">
                          <et.Icon size={14} className={et.textColor} />
                          <span
                            className={`text-xs font-medium ${et.textColor}`}
                          >
                            {et.label}
                          </span>
                          {isGlobalEvent && (
                            <Globe
                              size={12}
                              className="text-blue-500"
                              title="Global Event"
                            />
                          )}
                          {event.batchId && (
                            <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1 rounded">
                              Batch
                            </span>
                          )}
                        </div>
                        <p className="text-sm mt-1">{event.description}</p>
                        {!event.isAutoGenerated && (
                          <div className="flex gap-1 mt-2">
                            <button
                              onClick={() => handleEditEvent(event)}
                              className="text-xs text-gray-500 hover:text-blue-600"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(event.id)}
                              className="text-xs text-gray-500 hover:text-red-600"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                        {event.isAutoGenerated && (
                          <button
                            onClick={() => handleEditEvent(event)}
                            className="text-xs text-indigo-600 hover:text-indigo-700 mt-2"
                          >
                            + Add custom event
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </motion.div>

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
                <label className="block text-xs font-medium mb-1">Type *</label>
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
                <label className="block text-xs font-medium mb-1">
                  Description *
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, description: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEventModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEvent}
                disabled={saving || !eventForm.description.trim()}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                {eventForm.id ? 'Update' : 'Save'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
          .print\\:block {
            display: block !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print-page {
            page-break-after: always;
            margin-bottom: 4mm;
          }
          .print-page:last-child {
            page-break-after: avoid;
          }
          @page {
            size: A4;
            margin: 6mm;
          }
        }
      `}</style>
    </div>
  );
}
