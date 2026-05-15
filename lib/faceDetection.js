// lib/faceDetection.js
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

let faceDetector = null;
let modelsLoaded = false;
let loadPromise = null;

export async function loadModels() {
  if (modelsLoaded) return true;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      faceDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
      });

      modelsLoaded = true;
      console.log('MediaPipe Face Detector ready!');
      return true;
    } catch (error) {
      console.error('Failed to load models:', error);
      loadPromise = null;
      return false;
    }
  })();

  return loadPromise;
}

export function isReady() {
  return modelsLoaded;
}

export async function detectFace(video) {
  if (!modelsLoaded || !video || video.readyState < 2) return null;

  try {
    const detections = faceDetector.detectForVideo(video, performance.now());

    if (detections.detections && detections.detections.length > 0) {
      const detection = detections.detections[0];
      const box = detection.boundingBox;

      return {
        box: {
          x: box.originX,
          y: box.originY,
          width: box.width,
          height: box.height,
        },
        score: detection.categories[0]?.score || 0,
        keypoints: detection.keypoints || [],
        timestamp: Date.now(),
      };
    }

    return null;
  } catch (error) {
    console.error('Detection error:', error);
    return null;
  }
}

export async function detectAllFaces(video) {
  if (!modelsLoaded || !video || video.readyState < 2) return [];

  try {
    const detections = faceDetector.detectForVideo(video, performance.now());

    if (detections.detections && detections.detections.length > 0) {
      return detections.detections.map((detection) => ({
        box: {
          x: detection.boundingBox.originX,
          y: detection.boundingBox.originY,
          width: detection.boundingBox.width,
          height: detection.boundingBox.height,
        },
        score: detection.categories[0]?.score || 0,
        keypoints: detection.keypoints || [],
        timestamp: Date.now(),
      }));
    }

    return [];
  } catch (error) {
    console.error('Multi-face error:', error);
    return [];
  }
}

export function extractFaceEmbedding(detection, video) {
  if (!detection || !video) return null;

  try {
    const canvas = document.createElement('canvas');
    const box = detection.box;
    const padding = 20;

    canvas.width = 128;
    canvas.height = 128;

    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      video,
      Math.max(0, box.x - padding),
      Math.max(0, box.y - padding),
      box.width + padding * 2,
      box.height + padding * 2,
      0,
      0,
      128,
      128
    );

    const imageData = ctx.getImageData(0, 0, 128, 128);
    const pixels = imageData.data;

    const embedding = [];
    const step = 8;

    for (let i = 0; i < pixels.length; i += step * 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const avg = (r + g + b) / 3;
      embedding.push(avg / 255);
    }

    const targetLength = 128;
    while (embedding.length < targetLength) embedding.push(0);

    return new Float32Array(embedding.slice(0, targetLength));
  } catch (error) {
    console.error('Embedding error:', error);
    return null;
  }
}

// Capture 30 frames for training
export async function captureTrainingFrames(
  video,
  numFrames = 40,
  onProgress = null
) {
  const embeddings = [];
  const images = [];
  const qualities = [];

  for (let i = 0; i < numFrames; i++) {
    await new Promise((r) => setTimeout(r, 100)); // 100ms between frames = ~3 seconds total

    const detection = await detectFace(video);

    if (detection) {
      const embedding = extractFaceEmbedding(detection, video);
      if (embedding) {
        embeddings.push(embedding);

        // Capture image every 5th frame
        if (i % 5 === 0) {
          const image = captureFaceImage(video, detection);
          if (image) images.push(image);
        }

        qualities.push({
          score: detection.score,
          boxSize: detection.box.width * detection.box.height,
          timestamp: detection.timestamp,
        });
      }
    }

    // Report progress
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: numFrames,
        captured: embeddings.length,
        percentage: Math.round(((i + 1) / numFrames) * 100),
        lastDetection: detection,
      });
    }
  }

  // Calculate quality metrics
  const avgScore =
    qualities.length > 0
      ? qualities.reduce((sum, q) => sum + q.score, 0) / qualities.length
      : 0;

  const avgBoxSize =
    qualities.length > 0
      ? qualities.reduce((sum, q) => sum + q.boxSize, 0) / qualities.length
      : 0;

  return {
    embeddings,
    images,
    frameCount: embeddings.length,
    totalFrames: numFrames,
    quality: {
      averageScore: Math.round(avgScore * 100),
      averageBoxSize: Math.round(avgBoxSize),
      captureRate: Math.round((embeddings.length / numFrames) * 100),
    },
  };
}

// Average multiple embeddings
export function averageEmbeddings(embeddings) {
  if (!embeddings || embeddings.length === 0) return null;

  const length = embeddings[0].length;
  const averaged = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (const emb of embeddings) {
      sum += emb[i];
    }
    averaged[i] = sum / embeddings.length;
  }

  return averaged;
}

// Create median embedding (more robust than average)
export function medianEmbeddings(embeddings) {
  if (!embeddings || embeddings.length === 0) return null;

  const length = embeddings[0].length;
  const median = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const values = embeddings.map((emb) => emb[i]).sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    median[i] =
      values.length % 2 === 0
        ? (values[mid - 1] + values[mid]) / 2
        : values[mid];
  }

  return median;
}

// Match with multiple frames
export function matchDescriptor(descriptor, employees, threshold = 0.75) {
  if (!descriptor || !employees?.length) return null;

  let bestMatch = null;
  let bestSimilarity = -Infinity;

  for (const emp of employees) {
    if (!emp.faceDescriptor) continue;

    try {
      let storedDescriptor;

      if (emp.faceDescriptor instanceof Float32Array) {
        storedDescriptor = emp.faceDescriptor;
      } else if (Array.isArray(emp.faceDescriptor)) {
        storedDescriptor = new Float32Array(emp.faceDescriptor);
      } else if (typeof emp.faceDescriptor === 'object') {
        storedDescriptor = new Float32Array(Object.values(emp.faceDescriptor));
      } else {
        continue;
      }

      if (storedDescriptor.length === 0) continue;

      const similarity = cosineSimilarity(descriptor, storedDescriptor);
      const confidence = Math.round(similarity * 100);

      if (similarity > threshold && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = { ...emp, similarity, confidence };
      }
    } catch (e) {
      console.error(`Match error for ${emp.name}:`, e);
    }
  }

  return bestMatch;
}

export function matchWithMultipleFrames(
  embeddings,
  employees,
  threshold = 0.7
) {
  if (!embeddings || embeddings.length === 0 || !employees?.length) return null;

  const matchScores = new Map();

  for (const embedding of embeddings) {
    for (const emp of employees) {
      if (!emp.faceDescriptor) continue;

      try {
        let storedDescriptor;
        if (Array.isArray(emp.faceDescriptor)) {
          storedDescriptor = new Float32Array(emp.faceDescriptor);
        } else if (emp.faceDescriptor instanceof Float32Array) {
          storedDescriptor = emp.faceDescriptor;
        } else if (typeof emp.faceDescriptor === 'object') {
          storedDescriptor = new Float32Array(
            Object.values(emp.faceDescriptor)
          );
        } else {
          continue;
        }

        const similarity = cosineSimilarity(embedding, storedDescriptor);

        if (similarity > threshold) {
          const key = emp.id;
          if (!matchScores.has(key)) {
            matchScores.set(key, {
              emp,
              scores: [],
              totalSimilarity: 0,
              count: 0,
            });
          }
          const record = matchScores.get(key);
          record.scores.push(similarity);
          record.totalSimilarity += similarity;
          record.count++;
        }
      } catch (e) {
        continue;
      }
    }
  }

  let bestMatch = null;
  let bestAvgSimilarity = -Infinity;

  for (const [key, record] of matchScores) {
    const avgSimilarity = record.totalSimilarity / record.count;
    const confidence = Math.round(avgSimilarity * 100);

    if (avgSimilarity > bestAvgSimilarity && record.count >= 3) {
      bestAvgSimilarity = avgSimilarity;
      bestMatch = {
        ...record.emp,
        similarity: avgSimilarity,
        confidence,
        frameMatches: record.count,
        totalFrames: embeddings.length,
      };
    }
  }

  return bestMatch;
}

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (normA * normB);
}

export function captureFaceImage(video, detection) {
  if (!video || !detection) return null;

  try {
    const canvas = document.createElement('canvas');
    const box = detection.box;
    const padding = 30;

    canvas.width = box.width + padding * 2;
    canvas.height = box.height + padding * 2;

    const ctx = canvas.getContext('2d');

    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(
      video,
      Math.max(0, box.x - padding),
      Math.max(0, box.y - padding),
      box.width + padding * 2,
      box.height + padding * 2,
      0,
      0,
      canvas.width,
      canvas.height
    );
    ctx.restore();

    return canvas.toDataURL('image/jpeg', 0.8);
  } catch (error) {
    console.error('Capture error:', error);
    return null;
  }
}
