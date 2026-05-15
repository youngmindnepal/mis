// app/dashboard/attendance/page.jsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import {
  loadModels,
  detectAllFaces,
  extractFaceEmbedding,
  captureTrainingFrames,
  medianEmbeddings,
  matchDescriptor,
} from '@/lib/faceDetection';

export default function AttendancePage() {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [cameraOn, setCameraOn] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanAction, setScanAction] = useState('checkin');
  const [scanResult, setScanResult] = useState(null);
  const [notification, setNotification] = useState(null);
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
  const [capturedFace, setCapturedFace] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [frameCount, setFrameCount] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [matchedEmployees, setMatchedEmployees] = useState([]);
  const [matchHistory, setMatchHistory] = useState([]);
  const [trainProgress, setTrainProgress] = useState(null);
  const [availUsers, setAvailUsers] = useState([]);
  const [selUser, setSelUser] = useState(null);
  const [searchUser, setSearchUser] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanRef = useRef(null);
  const timerRef = useRef(null);
  const processingRef = useRef(false);
  const matchCountRef = useRef({});

  useEffect(() => {
    init();
    return cleanup;
  }, []);
  useEffect(() => {
    if (modelsReady) loadData();
  }, [date, modelsReady]);

  const init = async () => {
    const ok = await loadModels();
    setModelsReady(ok);
    setLoading(false);
    if (ok) loadData();
    else notify('Face detection failed to load', 'error');
  };

  const cleanup = () => {
    stopCamera();
    if (scanRef.current) clearInterval(scanRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const notify = (msg, type = 'info') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setNotification({ msg, type, id: Date.now() });
    timerRef.current = setTimeout(() => setNotification(null), 3000);
  };

  const loadData = async () => {
    try {
      const [eRes, aRes] = await Promise.all([
        fetch('/api/employees'),
        fetch(`/api/attendance?date=${date}`),
      ]);
      if (eRes.ok) setEmployees((await eRes.json()).employees || []);
      if (aRes.ok) setAttendance((await aRes.json()).attendances || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async (s = '') => {
    setLoadingUsers(true);
    try {
      const r = await fetch(
        `/api/employees/available-users?search=${encodeURIComponent(s)}`
      );
      if (r.ok) setAvailUsers((await r.json()).users || []);
    } catch (e) {
      console.error(e);
    }
    setLoadingUsers(false);
  };

  const startCamera = async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      await videoRef.current.play();
      setCameraOn(true);
      return true;
    } catch {
      notify('Camera access denied', 'error');
      return false;
    }
  };

  const stopCamera = () => {
    stopScan();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    clearCanvas();
    setTrainProgress(null);
  };

  const clearCanvas = () => {
    const c = canvasRef.current;
    if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
  };

  const drawBoxes = (dets, matches = []) => {
    const c = canvasRef.current,
      v = videoRef.current;
    if (!c || !v) return;
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    dets.forEach((det, i) => {
      const box = det.box;
      let color = '#6366f1',
        label = `Face ${i + 1}`;
      const m = matches.find((x) => x.index === i || x.faceIndex === i);
      if (m) {
        color = m.confidence >= 75 ? '#10b981' : '#f59e0b';
        label = `${m.name} ${m.confidence}%`;
      }
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.shadowBlur = 0;
      if (label) {
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = color + 'DD';
        ctx.fillRect(box.x, box.y - 28, tw + 16, 24);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(label, box.x + 8, box.y - 10);
      }
      if (det.score) {
        ctx.fillStyle = color;
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(
          `${Math.round(det.score * 100)}%`,
          box.x + box.width - 42,
          box.y - 8
        );
      }
    });
  };

  const startScan = async (action = 'checkin') => {
    if (!modelsReady) return notify('Models not ready', 'warning');
    if (!cameraOn) {
      if (!(await startCamera())) return;
    }
    setScanAction(action);
    setScanning(true);
    setScanResult(null);
    setFrameCount(0);
    setScanProgress(0);
    setMatchedEmployees([]);
    processingRef.current = false;
    matchCountRef.current = {};
    let fi = 0;
    const max = 20;
    scanRef.current = setInterval(async () => {
      if (processingRef.current) return;
      processingRef.current = true;
      try {
        const dets = await detectAllFaces(videoRef.current);
        if (dets.length > 0) {
          fi++;
          setFrameCount(fi);
          setScanProgress(Math.min(Math.round((fi / max) * 100), 100));
          const fm = [];
          for (let i = 0; i < dets.length; i++) {
            const emb = extractFaceEmbedding(dets[i], videoRef.current);
            if (emb) {
              const match = matchDescriptor(emb, employees, 0.7);
              if (match) {
                fm.push({ ...match, index: i, faceIndex: i });
                if (!matchCountRef.current[match.id])
                  matchCountRef.current[match.id] = {
                    count: 0,
                    match,
                    confs: [],
                  };
                matchCountRef.current[match.id].count++;
                matchCountRef.current[match.id].confs.push(match.confidence);
              }
            }
          }
          const ml = Object.entries(matchCountRef.current).map(([id, d]) => ({
            id: parseInt(id),
            name: d.match.name,
            employeeId: d.match.employeeId,
            count: d.count,
            avg: Math.round(
              d.confs.reduce((a, b) => a + b, 0) / d.confs.length
            ),
          }));
          setMatchedEmployees(ml);
          drawBoxes(dets, fm);
          if (ml.length > 0) {
            const best = ml.reduce((a, b) =>
              a.count * a.avg > b.count * b.avg ? a : b
            );
            if (best.count >= 5 && best.avg >= 75) {
              stopScan();
              await mark(best, action);
              processingRef.current = false;
              return;
            }
          }
          if (fi >= max) {
            stopScan();
            if (ml.length > 0)
              await mark(
                ml.reduce((a, b) =>
                  a.count * a.avg > b.count * b.avg ? a : b
                ),
                action
              );
            else {
              notify('No match found', 'warning');
              setTimeout(clearCanvas, 3000);
            }
            processingRef.current = false;
            return;
          }
        } else clearCanvas();
      } catch (e) {
        console.error(e);
      }
      processingRef.current = false;
    }, 200);
  };

  const stopScan = () => {
    if (scanRef.current) {
      clearInterval(scanRef.current);
      scanRef.current = null;
    }
    setScanning(false);
    setScanProgress(0);
  };

  const mark = async (match, action) => {
    try {
      const r = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: match.id,
          confidence: match.avg || match.confidence,
          action,
        }),
      });
      const d = await r.json();
      if (d.success) {
        setScanResult({
          name: match.name,
          msg: d.message,
          action: d.action || action,
          conf: match.avg || match.confidence,
          frames: match.count || 1,
        });
        setMatchHistory((prev) => [
          ...prev,
          {
            ...match,
            action,
            time: new Date(),
            conf: match.avg || match.confidence,
          },
        ]);
        notify(d.message, 'success');
        loadData();
        setTimeout(() => {
          setScanResult(null);
          clearCanvas();
        }, 5000);
      } else notify(d.message, 'warning');
    } catch {
      notify('Failed', 'error');
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
    setCapturedFace(null);
    setSelUser(null);
    setSearchUser('');
    setTrainProgress(null);
    if (!cameraOn) await startCamera();
    fetchUsers();
  };

  const selectUser = (u) => {
    setSelUser(u);
    setRegForm({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      department: u.department?.name || '',
      designation: '',
      employeeId: `EMP${u.id}`,
    });
  };

  const captureFace = async () => {
    if (!cameraOn) {
      await startCamera();
      await new Promise((r) => setTimeout(r, 500));
    }
    notify('Capturing 40 frames...', 'info');
    const result = await captureTrainingFrames(videoRef.current, 40, (p) => {
      setTrainProgress(p);
      if (p.lastDetection) drawBoxes([p.lastDetection], []);
    });
    setTrainProgress(null);
    if (result.embeddings.length < 10)
      return notify(
        `Only ${result.embeddings.length} frames. Need 10+.`,
        'warning'
      );
    const emb = medianEmbeddings(result.embeddings);
    setCapturedFace({
      desc: emb ? Array.from(emb) : null,
      img: result.images[0] || null,
      imgs: result.images,
      count: result.frameCount,
      total: result.totalFrames,
      quality: result.quality,
    });
    setRegStep(3);
    notify(
      `Trained! ${result.frameCount}/${result.totalFrames} frames`,
      'success'
    );
  };

  const saveEmp = async () => {
    if (!regForm.name || !regForm.employeeId)
      return notify('Name & ID required', 'warning');
    if (!capturedFace?.desc) return notify('Capture face first', 'warning');
    setSaving(true);
    try {
      const payload = {
        ...regForm,
        faceDescriptor: capturedFace.desc,
        faceImage: capturedFace.img,
      };
      if (selUser) payload.userId = selUser.id;
      const r = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        notify('Registered!', 'success');
        setShowReg(false);
        loadData();
      } else notify((await r.json()).error || 'Failed', 'error');
    } catch {
      notify('Failed', 'error');
    }
    setSaving(false);
  };

  const updateFace = async (emp) => {
    if (!cameraOn) {
      await startCamera();
      await new Promise((r) => setTimeout(r, 500));
    }
    const eid = emp.employeeRecordId || emp.id;
    setUpdatingId(emp.id);
    notify('Training 40 frames...', 'info');
    const result = await captureTrainingFrames(videoRef.current, 40, (p) => {
      setTrainProgress(p);
      if (p.lastDetection) drawBoxes([p.lastDetection], []);
    });
    setTrainProgress(null);
    if (result.embeddings.length < 10) {
      notify(`Only ${result.embeddings.length} frames.`, 'error');
      setUpdatingId(null);
      return;
    }
    const emb = medianEmbeddings(result.embeddings);
    if (!emb) {
      notify('Process failed', 'error');
      setUpdatingId(null);
      return;
    }
    try {
      const r = await fetch(`/api/employees/${eid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faceDescriptor: Array.from(emb),
          faceImage: result.images[0] || null,
        }),
      });
      if (r.ok) {
        notify(`Trained! ${result.frameCount} frames`, 'success');
        loadData();
        setTimeout(clearCanvas, 2000);
      } else notify((await r.json()).error || 'Failed', 'error');
    } catch {
      notify('Failed', 'error');
    }
    setUpdatingId(null);
  };

  const delAtt = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      if (
        (await fetch(`/api/attendance/${deleteId}`, { method: 'DELETE' })).ok
      ) {
        notify('Deleted', 'success');
        loadData();
      }
    } catch {
      notify('Failed', 'error');
    }
    setDeleting(false);
    setDeleteId(null);
  };

  const stats = {
    total: attendance.length,
    in: attendance.filter((a) => a.checkIn && !a.checkOut).length,
    out: attendance.filter((a) => a.checkOut).length,
  };
  const fmt = (d) =>
    d
      ? new Date(d).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      : '--:--';
  const sb = (s) =>
    ({
      present: 'bg-green-100 text-green-700',
      late: 'bg-yellow-100 text-yellow-700',
    }[s] || 'bg-gray-100 text-gray-700');
  const tb = (t) =>
    ({
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500',
    }[t] || 'bg-blue-500');

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icons.Loader2
            size={48}
            className="animate-spin text-blue-600 mx-auto mb-4"
          />
          <p className="text-gray-600">Loading face detection system...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification Toast - z-50 */}
      <AnimatePresence>
        {notification && (
          <motion.div
            key={notification.id}
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl text-white font-bold shadow-xl text-sm ${tb(
              notification.type
            )}`}
          >
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Modal - z-[9999] */}
      <AnimatePresence>
        {deleteId && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            onClick={() => !deleting && setDeleteId(null)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-2xl max-w-md w-full mx-4 p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icons.AlertTriangle size={32} className="text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  Delete Attendance?
                </h3>
                <p className="text-sm text-gray-500 mt-2">
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  disabled={deleting}
                  className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={delAtt}
                  disabled={deleting}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? (
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
          </div>
        )}
      </AnimatePresence>

      {/* Register Modal - z-[8888] */}
      <AnimatePresence>
        {showReg && (
          <div
            className="fixed inset-0 z-[8888] flex items-center justify-center"
            onClick={() => !saving && setShowReg(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-2xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Icons.UserPlus size={24} className="text-blue-600" />{' '}
                  Register Employee
                </h3>
                <button onClick={() => setShowReg(false)}>
                  <Icons.X size={20} />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-8">
                {['Details', 'Training', 'Done'].map((l, i) => (
                  <div key={i} className="flex-1 flex items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition ${
                        regStep > i + 1
                          ? 'bg-green-500 text-white'
                          : regStep === i + 1
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {regStep > i + 1 ? <Icons.Check size={18} /> : i + 1}
                    </div>
                    <span className="ml-2 text-xs font-medium text-gray-500 hidden sm:block">
                      {l}
                    </span>
                    {i < 2 && (
                      <div
                        className={`flex-1 h-1 mx-2 rounded ${
                          regStep > i + 1 ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {regStep === 1 && (
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <label className="text-sm font-semibold text-blue-700 mb-2 block">
                      Select from existing users (optional)
                    </label>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={searchUser}
                        onChange={(e) => {
                          setSearchUser(e.target.value);
                          fetchUsers(e.target.value);
                        }}
                        placeholder="Search users by name or email..."
                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => fetchUsers(searchUser)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                      >
                        <Icons.Search size={16} />
                      </button>
                    </div>
                    {loadingUsers ? (
                      <div className="text-center py-4">
                        <Icons.Loader2
                          size={20}
                          className="animate-spin mx-auto text-blue-600"
                        />
                      </div>
                    ) : availUsers.length > 0 ? (
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {availUsers.map((u) => (
                          <div
                            key={u.id}
                            onClick={() => selectUser(u)}
                            className={`p-2 rounded-lg cursor-pointer transition flex items-center justify-between ${
                              selUser?.id === u.id
                                ? 'bg-blue-100 border border-blue-300'
                                : 'hover:bg-gray-50 border border-transparent'
                            }`}
                          >
                            <div>
                              <p className="font-medium text-sm">{u.name}</p>
                              <p className="text-xs text-gray-500">{u.email}</p>
                            </div>
                            <div className="text-xs text-gray-400">
                              {u.department?.name && (
                                <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                                  {u.department.name}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 text-center py-2">
                        {searchUser ? 'No users found' : 'Type to search users'}
                      </p>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-semibold text-gray-600 mb-3">
                      Or enter manually
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ['Full Name *', 'name', 'text'],
                        ['Employee ID *', 'employeeId', 'text'],
                        ['Email', 'email', 'email'],
                        ['Phone', 'phone', 'tel'],
                        ['Department', 'department', 'text'],
                        ['Designation', 'designation', 'text'],
                      ].map(([l, k, t]) => (
                        <div key={k}>
                          <label className="text-xs font-semibold block mb-1">
                            {l}
                          </label>
                          <input
                            type={t}
                            value={regForm[k]}
                            onChange={(e) =>
                              setRegForm({ ...regForm, [k]: e.target.value })
                            }
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            required={l.includes('*')}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      onClick={() => setShowReg(false)}
                      className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() =>
                        regForm.name && regForm.employeeId
                          ? setRegStep(2)
                          : notify('Name & ID required', 'warning')
                      }
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}

              {regStep === 2 && (
                <div className="text-center space-y-4">
                  <div
                    className={`rounded-xl p-5 border-2 ${
                      cameraOn
                        ? 'bg-green-50 border-green-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <Icons.Camera
                      size={48}
                      className={`mx-auto mb-3 ${
                        cameraOn ? 'text-green-600' : 'text-yellow-600'
                      }`}
                    />
                    <p className="font-bold text-lg">Face Training</p>
                    <p className="text-sm text-gray-600 mt-2">
                      {cameraOn
                        ? '40 frames will be captured (~3 seconds). Keep still and look at camera.'
                        : 'Start camera first.'}
                    </p>
                    {!cameraOn && (
                      <button
                        onClick={startCamera}
                        className="mt-4 px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
                      >
                        Start Camera
                      </button>
                    )}
                  </div>

                  {trainProgress && (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-blue-700">
                          Training Progress
                        </span>
                        <span className="text-sm font-bold text-blue-700">
                          {trainProgress.percentage}%
                        </span>
                      </div>
                      <div className="bg-blue-200 rounded-full h-3 overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${trainProgress.percentage}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-blue-600">
                        <span>
                          Frame: {trainProgress.current}/{trainProgress.total}
                        </span>
                        <span>Captured: {trainProgress.captured} faces</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => setRegStep(1)}
                      className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={captureFace}
                      disabled={!cameraOn || trainProgress !== null}
                      className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition"
                    >
                      {trainProgress ? (
                        <>
                          <Icons.Loader2 size={18} className="animate-spin" />{' '}
                          Training... {trainProgress.percentage}%
                        </>
                      ) : (
                        <>
                          <Icons.Camera size={18} /> Start Training (40 Frames)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {regStep === 3 && capturedFace && (
                <div className="text-center space-y-4">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
                    <Icons.CheckCircle
                      size={48}
                      className="text-green-500 mx-auto mb-2"
                    />
                    <p className="text-green-700 font-bold text-lg">
                      Training Complete!
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      {capturedFace.count}/{capturedFace.total} frames captured
                    </p>
                  </div>
                  {capturedFace.quality && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm font-semibold text-gray-700 mb-3">
                        Training Quality
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-xs text-gray-500">Capture Rate</p>
                          <p className="text-xl font-bold text-green-600">
                            {capturedFace.quality.captureRate}%
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-xs text-gray-500">Avg Score</p>
                          <p className="text-xl font-bold text-blue-600">
                            {capturedFace.quality.averageScore}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {capturedFace.imgs?.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        Sample Captures
                      </p>
                      <div className="flex gap-2 justify-center flex-wrap">
                        {capturedFace.imgs.slice(0, 3).map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            alt={`Sample ${i + 1}`}
                            className="w-24 h-24 object-cover rounded-xl border-2 border-green-300 shadow-md"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2">
                    <p>
                      <strong>Name:</strong> {regForm.name}
                    </p>
                    <p>
                      <strong>Employee ID:</strong> {regForm.employeeId}
                    </p>
                    {regForm.department && (
                      <p>
                        <strong>Department:</strong> {regForm.department}
                      </p>
                    )}
                    {regForm.designation && (
                      <p>
                        <strong>Designation:</strong> {regForm.designation}
                      </p>
                    )}
                    {selUser && (
                      <p className="text-xs text-blue-600">
                        Linked to User ID: {selUser.id}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => {
                        setCapturedFace(null);
                        setRegStep(2);
                      }}
                      className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                    >
                      Retrain
                    </button>
                    <button
                      onClick={() => setRegStep(1)}
                      className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={saveEmp}
                      disabled={saving}
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-lg transition"
                    >
                      {saving ? (
                        <>
                          <Icons.Loader2 size={16} className="animate-spin" />{' '}
                          Saving...
                        </>
                      ) : (
                        <>
                          <Icons.Save size={16} /> Save Employee
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header - z-20 */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap gap-3 items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Face Attendance System
            </h1>
            <p className="text-sm mt-0.5">
              {modelsReady ? (
                <span className="text-green-600 font-medium">
                  ✅ Ready · {employees.length} employees · 40-frame training
                </span>
              ) : (
                <span className="text-yellow-600">
                  ⏳ Loading face detection...
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={loadData}
              className="p-2.5 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition"
              title="Refresh Data"
            >
              <Icons.RefreshCw size={18} />
            </button>
            <button
              onClick={openReg}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:from-blue-700 hover:to-indigo-700 transition flex items-center gap-2 shadow-lg"
            >
              <Icons.UserPlus size={18} /> Register Employee
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Camera */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold flex justify-between items-center text-sm">
                <span className="flex items-center gap-2">
                  <Icons.Camera size={18} /> Live Camera Feed
                </span>
                <span
                  className={`flex items-center gap-1.5 text-xs ${
                    cameraOn ? 'text-green-200' : 'text-red-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      cameraOn ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                    }`}
                  />
                  {cameraOn ? 'LIVE' : 'OFF'}
                </span>
              </div>
              <div className="p-4">
                <div
                  className="relative bg-black rounded-xl overflow-hidden"
                  style={{ minHeight: 400 }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full"
                    style={{ minHeight: 400, objectFit: 'cover' }}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  />
                  {scanning && (
                    <div className="absolute top-4 left-4 right-4 z-10">
                      <div className="bg-black/60 backdrop-blur-sm rounded-full h-2.5 overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${scanProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <p className="text-white text-xs">
                          {frameCount} frames
                        </p>
                        <p className="text-white text-xs">
                          {matchedEmployees.length} detected
                        </p>
                      </div>
                    </div>
                  )}
                  {trainProgress && (
                    <div className="absolute top-4 left-4 right-4 z-10">
                      <div className="bg-black/60 backdrop-blur-sm rounded-full h-2.5 overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${trainProgress.percentage}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <p className="text-white text-xs text-center mt-1.5">
                        Training: {trainProgress.current}/{trainProgress.total}
                      </p>
                    </div>
                  )}
                  {!cameraOn && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                      <button
                        onClick={startCamera}
                        className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition flex items-center gap-3 shadow-2xl"
                      >
                        <Icons.Video size={24} /> Start Camera
                      </button>
                    </div>
                  )}
                  <AnimatePresence>
                    {scanResult && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className={`absolute top-4 left-1/2 -translate-x-1/2 rounded-2xl px-8 py-5 text-center shadow-2xl z-20 ${
                          scanResult.action === 'checkin'
                            ? 'bg-green-500'
                            : 'bg-orange-500'
                        } text-white`}
                      >
                        <Icons.CheckCircle size={32} className="mx-auto mb-2" />
                        <p className="text-2xl font-bold">{scanResult.name}</p>
                        <p className="text-sm mt-1">{scanResult.msg}</p>
                        {scanResult.conf && (
                          <p className="text-xs mt-1 opacity-80">
                            {scanResult.conf}% confidence · {scanResult.frames}{' '}
                            frames
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex gap-3 mt-4">
                  {!cameraOn ? (
                    <button
                      onClick={startCamera}
                      className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                    >
                      <Icons.Video size={22} /> Start Camera
                    </button>
                  ) : !scanning && !trainProgress ? (
                    <>
                      <button
                        onClick={() => startScan('checkin')}
                        className="flex-1 py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition flex items-center justify-center gap-2 animate-pulse"
                      >
                        <Icons.LogIn size={22} /> CHECK IN
                      </button>
                      <button
                        onClick={() => startScan('checkout')}
                        className="flex-1 py-4 bg-orange-600 text-white rounded-xl font-bold text-lg hover:bg-orange-700 transition flex items-center justify-center gap-2 animate-pulse"
                      >
                        <Icons.LogOut size={22} /> CHECK OUT
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={scanning ? stopScan : undefined}
                      className="flex-1 py-4 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                    >
                      <Icons.StopCircle size={22} />
                      {scanning
                        ? `Stop (${frameCount} frames)`
                        : 'Processing...'}
                    </button>
                  )}
                  {cameraOn && (
                    <button
                      onClick={stopCamera}
                      className="px-4 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition"
                      title="Turn off camera"
                    >
                      <Icons.CameraOff size={22} />
                    </button>
                  )}
                </div>

                {scanning && matchedEmployees.length > 0 && (
                  <div className="mt-3 bg-gray-50 rounded-xl p-3 border">
                    <p className="text-xs font-semibold text-gray-600 mb-2">
                      Live Detection Results:
                    </p>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {matchedEmployees
                        .sort((a, b) => b.count * b.avg - a.count * a.avg)
                        .map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-2 shadow-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                                {m.name?.charAt(0)}
                              </span>
                              <span className="font-medium">{m.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-gray-500">
                                {m.count} frames
                              </span>
                              <span
                                className={`font-bold ${
                                  m.avg >= 75
                                    ? 'text-green-600'
                                    : 'text-yellow-600'
                                }`}
                              >
                                {m.avg}%
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* History */}
            {matchHistory.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="px-5 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm">
                  Recent Detection History ({matchHistory.length})
                </div>
                <div className="divide-y max-h-48 overflow-y-auto">
                  {matchHistory
                    .slice()
                    .reverse()
                    .map((m, i) => (
                      <div
                        key={i}
                        className="px-4 py-2.5 flex items-center justify-between text-sm hover:bg-gray-50 transition"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                            {m.name?.charAt(0)}
                          </div>
                          <div>
                            <span className="font-medium">{m.name}</span>
                            <span className="text-xs text-gray-400 ml-2">
                              {fmt(m.time)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              m.action === 'checkin'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            {m.action === 'checkin' ? 'IN' : 'OUT'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {m.conf}%
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="px-5 py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold text-sm flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <Icons.ClipboardCheck size={18} /> Today's Attendance (
                  {attendance.length})
                </span>
                <div className="flex gap-2 text-xs">
                  <span className="bg-white/20 px-2.5 py-1 rounded-full">
                    IN: {stats.in}
                  </span>
                  <span className="bg-white/20 px-2.5 py-1 rounded-full">
                    OUT: {stats.out}
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase border-b">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4 text-center">In</th>
                      <th className="py-3 px-4 text-center">Out</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Conf</th>
                      <th className="py-3 px-4 text-center w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {attendance.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-16">
                          <Icons.Calendar
                            size={40}
                            className="mx-auto mb-3 text-gray-300"
                          />
                          <p className="text-gray-400 font-medium">
                            No attendance records for today
                          </p>
                        </td>
                      </tr>
                    ) : (
                      attendance.map((a) => (
                        <tr key={a.id} className="hover:bg-gray-50 transition">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-gray-900">
                              {a.employee?.name || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {a.employee?.employeeId}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-green-600 font-medium text-xs">
                              {fmt(a.checkIn)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {a.checkOut ? (
                              <span className="text-orange-600 font-medium text-xs">
                                {fmt(a.checkOut)}
                              </span>
                            ) : (
                              <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${sb(
                                a.status
                              )}`}
                            >
                              {a.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-xs text-gray-500">
                            {a.confidence
                              ? `${Math.round(a.confidence)}%`
                              : '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setDeleteId(a.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                              title="Delete record"
                            >
                              <Icons.Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Employee List */}
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Icons.Users size={18} /> Employees
              </span>
              <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-xs">
                {employees.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[650px] divide-y divide-gray-100">
              {employees.length === 0 ? (
                <div className="text-center py-16">
                  <Icons.Users
                    size={48}
                    className="mx-auto mb-4 text-gray-300"
                  />
                  <p className="text-gray-500 font-medium">
                    No employees registered
                  </p>
                  <button
                    onClick={openReg}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
                  >
                    Register First Employee
                  </button>
                </div>
              ) : (
                employees.map((emp) => {
                  const ea = attendance.filter((a) => a.employeeId === emp.id);
                  const in_ = ea.some((a) => a.checkIn && !a.checkOut);
                  const hf =
                    emp.faceDescriptor &&
                    Array.isArray(emp.faceDescriptor) &&
                    emp.faceDescriptor.length > 0;
                  const cm = matchedEmployees.some((m) => m.id === emp.id);
                  return (
                    <div
                      key={emp.id}
                      className={`px-5 py-4 hover:bg-gray-50 transition flex items-start justify-between gap-3 ${
                        cm ? 'bg-green-50 border-l-4 border-green-500' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-md ${
                            cm ? 'ring-2 ring-green-500 ring-offset-2' : ''
                          }`}
                        >
                          {emp.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-gray-900 text-sm truncate">
                              {emp.name}
                            </p>
                            {in_ && (
                              <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 animate-pulse" />
                            )}
                            {cm && (
                              <span className="text-xs text-green-600 font-bold animate-pulse">
                                ✓ Detected
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {emp.employeeId}
                            {emp.department ? ` · ${emp.department}` : ''}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                hf
                                  ? 'bg-green-50 text-green-700'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {hf ? '✓ Face Trained' : '⚠ No Face Data'}
                            </span>
                            {ea.length > 0 && (
                              <span className="text-xs text-gray-500">
                                {ea.length} today
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => updateFace(emp)}
                        disabled={updatingId === emp.id}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex-shrink-0 ${
                          updatingId === emp.id
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : hf
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-red-50 text-red-700 hover:bg-red-100 animate-pulse'
                        }`}
                      >
                        {updatingId === emp.id ? (
                          <span className="flex items-center gap-1">
                            <Icons.Loader2 size={11} className="animate-spin" />{' '}
                            Training
                          </span>
                        ) : hf ? (
                          'Retrain'
                        ) : (
                          'Train Face'
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
