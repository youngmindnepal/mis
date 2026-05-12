import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';

export const loadModels = async () => {
  try {
    console.log('📥 Loading models...');

    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    console.log('✅ TinyFaceDetector loaded');

    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    console.log('✅ FaceRecognition loaded');

    console.log('✅ All models ready');
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    return false;
  }
};

export const detectFace = async (video) => {
  if (!video || video.readyState < 2) return null;

  try {
    // Use the task-based API that works with all versions
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 128,
      scoreThreshold: 0.3,
    });

    // Method: detect with landmarks first
    const result = await faceapi
      .detectSingleFace(video, options)
      .withFaceLandmarks()
      .withFaceDescriptor()
      .run();

    if (result) {
      console.log('✅ Face detected');
      return result;
    }

    console.log('😐 No face found');
    return null;
  } catch (error) {
    console.error('Detection error:', error.message);

    // Fallback: try simpler detection
    try {
      console.log('Trying fallback detection...');
      const result = await faceapi.detectSingleFace(video).run();
      if (result) {
        console.log('✅ Face detected (fallback)');
        return result;
      }
    } catch (e2) {
      console.error('Fallback failed:', e2.message);
    }

    return null;
  }
};

export const detectAllFaces = async (video) => {
  const detection = await detectFace(video);
  return detection ? [detection] : [];
};

export const matchEmployee = (descriptor, employees) => {
  let best = null,
    high = 0;

  for (const emp of employees) {
    if (!emp.faceDescriptor) continue;
    try {
      const stored = emp.faceDescriptor;
      const current = descriptor;

      const d1 = new Float32Array(Object.values(stored));
      const d2 = new Float32Array(Object.values(current));
      const dist = faceapi.euclideanDistance(d1, d2);
      const score = Math.max(0, Math.min(100, Math.round((1 - dist) * 100)));

      if (score > high && score >= 35) {
        high = score;
        best = { ...emp, confidence: score };
      }
    } catch (e) {
      console.error('Match error:', e.message);
    }
  }

  if (best) console.log(`✅ Match: ${best.name} (${best.confidence}%)`);
  return best;
};

export const captureFace = (video, detection) => {
  try {
    const canvas = document.createElement('canvas');
    const box = detection.detection.box;
    canvas.width = box.width + 40;
    canvas.height = box.height + 40;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      video,
      Math.max(0, box.x - 20),
      Math.max(0, box.y - 20),
      box.width + 40,
      box.height + 40,
      0,
      0,
      canvas.width,
      canvas.height
    );
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch {
    return null;
  }
};
