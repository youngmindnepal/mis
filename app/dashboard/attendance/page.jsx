'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import {
  loadModels,
  detectFace,
  detectAllFaces,
  matchEmployee,
  captureFace,
} from '@/lib/faceDetection';

export default function AttendancePage() {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [date, setDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [camOn, setCamOn] = useState(false);
  const [modelsOk, setModelsOk] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [showReg, setShowReg] = useState(false);
  const [regStep, setRegStep] = useState(1);
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    employeeId: '',
  });
  const [face, setFace] = useState(null);
  const [saving, setSaving] = useState(false);
  const [scanCountdown, setScanCountdown] = useState(0);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const autoStopRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    loadModels().then((ok) => setModelsOk(ok));
    return () => {
      stopCam();
      clearTimers();
    };
  }, []);
  useEffect(() => {
    if (mounted) fetchData();
  }, [date, mounted]);

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
  };

  const fetchData = async () => {
    try {
      const [e, a] = await Promise.all([
        fetch('/api/employees'),
        fetch(`/api/attendance?date=${date}`),
      ]);
      if (e.ok) setEmployees((await e.json()).employees || []);
      if (a.ok) setAttendance((await a.json()).attendances || []);
    } catch {}
  };

  const toastMsg = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const startCam = async () => {
    try {
      stopCam();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
        setCamOn(true);
        return true;
      }
      return false;
    } catch (e) {
      toastMsg('Camera: ' + e.message, 'error');
      return false;
    }
  };

  const stopCam = () => {
    stopScan();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamOn(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const drawBox = (det, color = '#10b981', label = '') => {
    if (!canvasRef.current || !videoRef.current) return;
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    c.width = videoRef.current.videoWidth || 640;
    c.height = videoRef.current.videoHeight || 480;
    ctx.clearRect(0, 0, c.width, c.height);
    const b = det.detection.box;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(b.x, b.y, b.width, b.height);
    if (label) {
      ctx.fillStyle = color;
      ctx.font = '16px sans-serif';
      ctx.fillText(label, b.x + 8, b.y - 10);
    }
  };

  const startScan = () => {
    if (!modelsOk || !camOn) {
      toastMsg(modelsOk ? 'Start camera' : 'Loading...', 'warning');
      return;
    }
    clearTimers();
    setScanning(true);
    setResult(null);
    setScanCountdown(12);
    countdownRef.current = setInterval(() => {
      setScanCountdown((prev) => {
        if (prev <= 1) {
          stopScan();
          toastMsg('No match', 'warning');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    autoStopRef.current = setTimeout(() => {
      if (scanning) stopScan();
    }, 12000);

    const scan = async () => {
      if (!videoRef.current) return;
      const dets = await detectAllFaces(videoRef.current);
      if (dets.length > 0) {
        if (canvasRef.current) {
          const c = canvasRef.current;
          const ctx = c.getContext('2d');
          c.width = videoRef.current.videoWidth || 640;
          c.height = videoRef.current.videoHeight || 480;
          ctx.clearRect(0, 0, c.width, c.height);
          dets.forEach((d) => {
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 3;
            ctx.strokeRect(
              d.detection.box.x,
              d.detection.box.y,
              d.detection.box.width,
              d.detection.box.height
            );
          });
        }
        for (const d of dets) {
          const match = matchEmployee(d.descriptor, employees);
          if (match) {
            stopScan();
            drawBox(d, '#10b981', match.name);
            await markAtt(match);
            return;
          }
        }
      }
    };
    scan();
    timerRef.current = setInterval(scan, 800);
  };

  const stopScan = () => {
    clearTimers();
    setScanning(false);
    setScanCountdown(0);
  };

  const markAtt = async (match) => {
    try {
      const r = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: match.id,
          confidence: match.confidence,
        }),
      });
      const d = await r.json();
      if (d.success) {
        setResult({ name: match.name, msg: d.message });
        toastMsg(d.message, 'success');
        fetchData();
        autoStopRef.current = setTimeout(() => {
          stopCam();
          setResult(null);
        }, 3000);
      } else {
        toastMsg(d.message, 'warning');
        setTimeout(() => {
          if (camOn) startScan();
        }, 1500);
      }
    } catch {
      toastMsg('Failed', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/delete-attendance?id=${deleteModal}`, {
        method: 'DELETE',
      });
      const data = await r.json();
      if (r.ok) {
        toastMsg('Deleted', 'success');
        fetchData();
      } else toastMsg(data.error || 'Failed', 'error');
    } catch (e) {
      toastMsg('Error', 'error');
    } finally {
      setDeleting(false);
      setDeleteModal(null);
    }
  };

  const openReg = async () => {
    setShowReg(true);
    setRegStep(1);
    setRegForm({
      name: '',
      email: '',
      phone: '',
      department: '',
      designation: '',
      employeeId: '',
    });
    setFace(null);
    if (!camOn) await startCam();
  };
  const captureReg = async () => {
    if (!camOn) {
      await startCam();
      await new Promise((r) => setTimeout(r, 1000));
    }
    const d = await detectFace(videoRef.current);
    if (!d) {
      toastMsg('No face', 'warning');
      return;
    }
    drawBox(d, '#3b82f6', 'Captured');
    setFace({
      descriptor: Object.values(d.descriptor),
      image: captureFace(videoRef.current, d),
    });
    setRegStep(3);
    toastMsg('Captured!', 'success');
  };
  const saveReg = async () => {
    if (!regForm.name || !regForm.employeeId) {
      toastMsg('Required', 'warning');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...regForm,
          faceDescriptor: face?.descriptor || null,
          faceImage: face?.image || null,
        }),
      });
      if (r.ok) {
        toastMsg('Registered!', 'success');
        setShowReg(false);
        fetchData();
      } else {
        const e = await r.json();
        toastMsg(e.error || 'Failed', 'error');
      }
    } catch {
      toastMsg('Failed', 'error');
    } finally {
      setSaving(false);
    }
  };
  const updateFace = async (emp) => {
    if (!camOn) {
      await startCam();
      await new Promise((r) => setTimeout(r, 1000));
    }
    const d = await detectFace(videoRef.current);
    if (!d) {
      toastMsg('No face', 'warning');
      return;
    }
    try {
      const r = await fetch(`/api/employees/${emp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faceDescriptor: Object.values(d.descriptor),
          faceImage: captureFace(videoRef.current, d),
        }),
      });
      if (r.ok) {
        toastMsg('Updated!', 'success');
        fetchData();
      } else toastMsg('Failed', 'error');
    } catch {
      toastMsg('Error', 'error');
    }
  };

  const ft = (d) =>
    d
      ? new Date(d).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '--:--';

  if (!mounted)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded w-1/4 mb-4" />
            <div className="h-96 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50" suppressHydrationWarning>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-lg text-white font-bold ${
              toast.type === 'success'
                ? 'bg-green-500'
                : toast.type === 'error'
                ? 'bg-red-500'
                : toast.type === 'warning'
                ? 'bg-yellow-500'
                : 'bg-blue-500'
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {deleteModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteModal(null);
          }}
        >
          <div className="absolute inset-0 bg-black/60" />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative bg-white rounded-2xl max-w-md w-full p-6 mx-4 shadow-2xl"
          >
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Icons.AlertTriangle size={32} className="text-red-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-center mb-2">
              Delete Attendance?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                disabled={deleting}
                className="flex-1 px-4 py-3 border rounded-xl hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Icons.Loader2 size={18} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Icons.Trash2 size={18} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold">Face Attendance</h1>
              <p className="text-sm text-gray-500">
                {modelsOk === null
                  ? '⏳ Loading...'
                  : modelsOk
                  ? '✅ Ready'
                  : '❌ Failed'}
              </p>
            </div>
            <div className="flex gap-3">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              />
              <button
                onClick={fetchData}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg"
              >
                <Icons.RefreshCw size={18} />
              </button>
              <button
                onClick={openReg}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg"
              >
                <Icons.UserPlus size={18} />
                Register
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold flex justify-between">
                <span>
                  <Icons.Camera size={20} className="inline mr-2" />
                  Camera
                </span>
                <span
                  className={`w-3 h-3 rounded-full ${
                    camOn ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                  }`}
                />
              </div>
              <div className="p-4">
                <div
                  className="relative bg-black rounded-xl overflow-hidden"
                  style={{ minHeight: '360px' }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full"
                    style={{ minHeight: '360px', transform: 'scaleX(-1)' }}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  {!camOn && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                      <button
                        onClick={startCam}
                        className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold"
                      >
                        <Icons.Video size={24} />
                        Start Camera
                      </button>
                    </div>
                  )}
                  {result && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-4 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl font-bold text-white bg-green-500 shadow-xl"
                    >
                      <p className="text-2xl">{result.name}</p>
                      <p className="text-sm">{result.msg}</p>
                    </motion.div>
                  )}
                  {scanning && scanCountdown > 0 && (
                    <div className="absolute top-4 right-4 bg-black/60 text-white px-4 py-2 rounded-full font-bold">
                      {scanCountdown}s
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-4">
                  {!camOn ? (
                    <button
                      onClick={startCam}
                      className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-xl font-bold"
                    >
                      <Icons.Video size={22} />
                      Start Camera
                    </button>
                  ) : !scanning ? (
                    <button
                      onClick={startScan}
                      className="flex-1 px-6 py-4 bg-green-600 text-white rounded-xl font-bold animate-pulse"
                    >
                      <Icons.ScanFace size={22} />
                      Start Attendance (12s)
                    </button>
                  ) : (
                    <button
                      onClick={stopScan}
                      className="flex-1 px-6 py-4 bg-red-600 text-white rounded-xl font-bold"
                    >
                      <Icons.StopCircle size={22} />
                      Stop
                    </button>
                  )}
                  {camOn && (
                    <button
                      onClick={stopCam}
                      className="px-4 py-3 bg-gray-600 text-white rounded-xl"
                    >
                      <Icons.CameraOff size={20} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold">
                <span>
                  <Icons.ClipboardCheck size={20} className="inline mr-2" />
                  Today ({attendance.length})
                </span>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold">
                      Employee
                    </th>
                    <th className="text-center py-3 px-4 text-sm">In</th>
                    <th className="text-center py-3 px-4 text-sm">Out</th>
                    <th className="text-center py-3 px-4 text-sm">Status</th>
                    <th className="text-center py-3 px-4 text-sm w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {attendance.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-12 text-gray-400"
                      >
                        No records
                      </td>
                    </tr>
                  ) : (
                    attendance.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <p className="font-medium">{a.employee?.name}</p>
                        </td>
                        <td className="text-center text-sm">{ft(a.checkIn)}</td>
                        <td className="text-center text-sm">
                          {ft(a.checkOut)}
                        </td>
                        <td className="text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              a.status === 'present'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td className="text-center">
                          <button
                            onClick={() => setDeleteModal(a.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Icons.Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold">
              <span>
                <Icons.Users size={20} className="inline mr-2" />
                Employees ({employees.length})
              </span>
            </div>
            <div className="divide-y max-h-[700px] overflow-y-auto">
              {employees.map((e) => (
                <div
                  key={e.id}
                  className="p-4 hover:bg-gray-50 flex justify-between items-start"
                >
                  <div>
                    <p className="font-semibold">{e.name}</p>
                    <p className="text-xs text-gray-500">
                      {e.employeeId} • {e.department || 'N/A'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={() => updateFace(e)}
                      className={`text-xs px-2 py-1 rounded-full ${
                        e.faceDescriptor
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {e.faceDescriptor ? '🔄 Update' : '📸 Register'}
                    </button>
                    {e.attendances?.[0] ? (
                      <span className="text-xs text-blue-600">✅ In</span>
                    ) : (
                      <span className="text-xs text-gray-400">Not In</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showReg && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setShowReg(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 mx-4"
            >
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-bold">Register</h3>
                <button onClick={() => setShowReg(false)}>
                  <Icons.X size={18} />
                </button>
              </div>
              <div className="flex items-center gap-2 mb-6">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center gap-2 flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        regStep >= s ? 'bg-blue-600 text-white' : 'bg-gray-200'
                      } ${regStep > s ? 'bg-green-500' : ''}`}
                    >
                      {regStep > s ? <Icons.Check size={16} /> : s}
                    </div>
                    {s < 3 && (
                      <div
                        className={`flex-1 h-1 rounded ${
                          regStep > s ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              {regStep === 1 && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setRegStep(2);
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="text-xs font-semibold">Name *</label>
                    <input
                      type="text"
                      value={regForm.name}
                      onChange={(e) =>
                        setRegForm({ ...regForm, name: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold">ID *</label>
                      <input
                        type="text"
                        value={regForm.employeeId}
                        onChange={(e) =>
                          setRegForm({ ...regForm, employeeId: e.target.value })
                        }
                        className="w-full border rounded px-3 py-2 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold">Email</label>
                      <input
                        type="email"
                        value={regForm.email}
                        onChange={(e) =>
                          setRegForm({ ...regForm, email: e.target.value })
                        }
                        className="w-full border rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold">Phone</label>
                      <input
                        type="tel"
                        value={regForm.phone}
                        onChange={(e) =>
                          setRegForm({ ...regForm, phone: e.target.value })
                        }
                        className="w-full border rounded px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold">Dept</label>
                      <input
                        type="text"
                        value={regForm.department}
                        onChange={(e) =>
                          setRegForm({ ...regForm, department: e.target.value })
                        }
                        className="w-full border rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold">Designation</label>
                    <input
                      type="text"
                      value={regForm.designation}
                      onChange={(e) =>
                        setRegForm({ ...regForm, designation: e.target.value })
                      }
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowReg(false)}
                      className="px-4 py-2 border rounded text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white rounded text-sm"
                    >
                      Next
                    </button>
                  </div>
                </form>
              )}
              {regStep === 2 && (
                <div className="text-center space-y-4">
                  <div
                    className={`rounded-xl p-6 ${
                      camOn ? 'bg-green-50' : 'bg-yellow-50'
                    }`}
                  >
                    <Icons.Camera
                      size={48}
                      className={`mx-auto mb-3 ${
                        camOn ? 'text-green-600' : 'text-yellow-600'
                      }`}
                    />
                    <p className="font-semibold">Capture Face</p>
                    <p className="text-sm text-gray-500">
                      {camOn ? '✅ Camera active' : '⚠️ Start camera'}
                    </p>
                    {!camOn && (
                      <button
                        onClick={startCam}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl"
                      >
                        Start Camera
                      </button>
                    )}
                  </div>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => setRegStep(1)}
                      className="px-4 py-2 border rounded text-sm"
                    >
                      Back
                    </button>
                    <button
                      onClick={captureReg}
                      disabled={!camOn}
                      className="px-6 py-2 bg-green-600 text-white rounded text-sm disabled:opacity-50"
                    >
                      Capture
                    </button>
                  </div>
                </div>
              )}
              {regStep === 3 && face && (
                <div className="text-center space-y-4">
                  <p className="text-green-600 font-semibold">✅ Captured!</p>
                  {face.image && (
                    <img
                      src={face.image}
                      alt="Face"
                      className="w-32 h-32 mx-auto rounded-xl border-4 border-green-500 object-cover"
                    />
                  )}
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setFace(null);
                        setRegStep(2);
                      }}
                      className="px-4 py-2 border rounded text-sm"
                    >
                      Retake
                    </button>
                    <button
                      onClick={() => setRegStep(1)}
                      className="px-4 py-2 border rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={saveReg}
                      disabled={saving}
                      className="px-6 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
                    >
                      {saving ? (
                        <Icons.Loader2 size={14} className="animate-spin" />
                      ) : (
                        'Register'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
