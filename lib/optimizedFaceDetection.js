// lib/optimizedFaceDetection.js
import * as faceapi from 'face-api.js';

const CONFIG = {
  fast: { inputSize: 160, scoreThreshold: 0.4 },
  balanced: { inputSize: 224, scoreThreshold: 0.45 },
  accurate: { inputSize: 320, scoreThreshold: 0.5 },
};

let currentConfig = CONFIG.fast;
let isInitialized = false;
let loadPromise = null;

export async function loadOptimizedModels() {
  if (isInitialized) return true;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const MODEL_URL = '/models';
      console.time('[FaceAttend] Models');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.load(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.load(MODEL_URL),
        faceapi.nets.faceRecognitionNet.load(MODEL_URL),
      ]);
      console.timeEnd('[FaceAttend] Models');
      isInitialized = true;
      return true;
    } catch (err) {
      console.error('[FaceAttend] Model load failed:', err);
      loadPromise = null;
      return false;
    }
  })();

  return loadPromise;
}

export async function initializeDatabase() {
  return true;
}

export async function detectFaceFast(videoElement, config = currentConfig) {
  if (!isInitialized) return null;
  if (!videoElement) return null;
  if ((videoElement.readyState ?? 0) < 2) return null;
  if (!videoElement.videoWidth) return null;

  try {
    const result = await faceapi
      .detectSingleFace(
        videoElement,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: config.inputSize,
          scoreThreshold: config.scoreThreshold,
        })
      )
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (!result) return null;
    return {
      detection: result.detection,
      landmarks: result.landmarks,
      descriptor: result.descriptor,
      box: result.detection.box,
      score: result.detection.score,
    };
  } catch {
    return null;
  }
}

export async function detectAllFacesFast(videoElement, config = currentConfig) {
  if (!isInitialized || !videoElement) return [];
  if ((videoElement.readyState ?? 0) < 2) return [];
  try {
    const results = await faceapi
      .detectAllFaces(
        videoElement,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: config.inputSize,
          scoreThreshold: config.scoreThreshold,
        })
      )
      .withFaceLandmarks(true)
      .withFaceDescriptors();
    return results.map((r) => ({
      detection: r.detection,
      landmarks: r.landmarks,
      descriptor: r.descriptor,
      box: r.detection.box,
      score: r.detection.score,
    }));
  } catch {
    return [];
  }
}

export function getDescriptorSimilarity(d1, d2) {
  if (!d1 || !d2) return 1.0;
  try {
    return faceapi.euclideanDistance(d1, d2);
  } catch {
    return 1.0;
  }
}

export function matchEmployeeFast(descriptor, employees, threshold = 0.55) {
  if (!descriptor || !employees?.length) return null;
  let bestMatch = null,
    bestDist = Infinity;
  for (const emp of employees) {
    if (!emp.faceDescriptor || !Array.isArray(emp.faceDescriptor)) continue;
    try {
      const dist = faceapi.euclideanDistance(
        descriptor,
        new Float32Array(emp.faceDescriptor)
      );
      if (dist < threshold && dist < bestDist) {
        bestDist = dist;
        bestMatch = {
          ...emp,
          confidence: Math.round((1 - dist) * 100),
          distance: dist,
        };
      }
    } catch {
      continue;
    }
  }
  return bestMatch;
}

export function captureFace(videoElement, detection) {
  if (!videoElement || !detection) return null;
  try {
    const box = detection.box ?? detection.detection?.box;
    if (!box) return null;
    const padding = 30;
    const vw = videoElement.videoWidth || 640;
    const vh = videoElement.videoHeight || 480;
    const x = Math.max(0, box.x - padding);
    const y = Math.max(0, box.y - padding);
    const w = Math.min(vw - x, box.width + padding * 2);
    const h = Math.min(vh - y, box.height + padding * 2);
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(
      videoElement,
      x,
      y,
      w,
      h,
      -canvas.width,
      0,
      canvas.width,
      canvas.height
    );
    ctx.restore();
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return null;
  }
}

export function setPerformanceMode(mode) {
  if (CONFIG[mode]) {
    currentConfig = CONFIG[mode];
    return true;
  }
  return false;
}
export function getCurrentConfig() {
  return { ...currentConfig };
}
export function getIsInitialized() {
  return isInitialized;
}
