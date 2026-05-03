import * as ort from 'onnxruntime-web';

export interface Keypoint {
  x: number;
  y: number;
  confidence: number;
}

export interface PoseResult {
  keypoints: Keypoint[];
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const KEYPOINT_NAMES = [
  'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
  'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
  'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
];

const MODEL_URL = 'https://huggingface.co/pinto0309/yolov8n-pose/resolve/main/yolov8n-pose.onnx';

let session: ort.InferenceSession | null = null;

async function loadModel(): Promise<ort.InferenceSession> {
  if (session) return session;
  
  ort.env.wasm.numThreads = 4;
  ort.env.wasm.simd = true;
  
  session = await ort.InferenceSession.create(MODEL_URL, {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  });
  
  return session;
}

function preprocessImage(imageData: ImageData): Float32Array {
  const { width, height, data } = imageData;
  const targetSize = 640;
  
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d')!;
  
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  tempCanvas.getContext('2d')!.putImageData(imageData, 0, 0);
  
  const scale = Math.min(targetSize / width, targetSize / height);
  const newWidth = width * scale;
  const newHeight = height * scale;
  const offsetX = (targetSize - newWidth) / 2;
  const offsetY = (targetSize - newHeight) / 2;
  
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, targetSize, targetSize);
  ctx.drawImage(tempCanvas, offsetX, offsetY, newWidth, newHeight);
  
  const resizedData = ctx.getImageData(0, 0, targetSize, targetSize);
  
  const input = new Float32Array(1 * 3 * targetSize * targetSize);
  for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
      const srcIdx = (y * targetSize + x) * 4;
      const dstIdx = y * targetSize + x;
      
      input[0 * targetSize * targetSize + dstIdx] = resizedData.data[srcIdx] / 255;
      input[1 * targetSize * targetSize + dstIdx] = resizedData.data[srcIdx + 1] / 255;
      input[2 * targetSize * targetSize + dstIdx] = resizedData.data[srcIdx + 2] / 255;
    }
  }
  
  return input;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export async function detectPose(imageData: ImageData): Promise<PoseResult | null> {
  try {
    const model = await loadModel();
    const input = preprocessImage(imageData);
    
    const tensor = new ort.Tensor('float32', input, [1, 3, 640, 640]);
    const results = await model.run({ images: tensor });
    
    const output = results[Object.keys(results)[0]];
    const data = output.data as Float32Array;
    const [numDetections, attributes] = output.dims as [number, number];
    
    let bestDetection: { score: number; index: number } = { score: 0, index: -1 };
    
    for (let i = 0; i < numDetections; i++) {
      const score = data[i * attributes + 4];
      if (score > bestDetection.score) {
        bestDetection = { score, index: i };
      }
    }
    
    if (bestDetection.index === -1 || bestDetection.score < 0.5) {
      return null;
    }
    
    const idx = bestDetection.index * attributes;
    const centerX = data[idx + 0];
    const centerY = data[idx + 1];
    const width = data[idx + 2];
    const height = data[idx + 3];
    
    const scale = 640 / Math.max(imageData.width, imageData.height);
    const offsetX = (640 - imageData.width * scale) / 2;
    const offsetY = (640 - imageData.height * scale) / 2;
    
    const bbox = {
      x: Math.max(0, (centerX - width / 2 - offsetX) / scale),
      y: Math.max(0, (centerY - height / 2 - offsetY) / scale),
      width: Math.min(imageData.width, width / scale),
      height: Math.min(imageData.height, height / scale),
    };
    
    const keypoints: Keypoint[] = [];
    const keypointOffset = 5;
    
    for (let k = 0; k < 17; k++) {
      const kx = data[idx + keypointOffset + k * 3 + 0];
      const ky = data[idx + keypointOffset + k * 3 + 1];
      const confidence = sigmoid(data[idx + keypointOffset + k * 3 + 2]);
      
      keypoints.push({
        x: (kx - offsetX) / scale,
        y: (ky - offsetY) / scale,
        confidence,
      });
    }
    
    return { keypoints, bbox };
  } catch (error) {
    console.error('Pose detection error:', error);
    return null;
  }
}

export function getBodyPartsFromKeypoints(
  keypoints: Keypoint[],
  imageData: ImageData
): Map<string, { x: number; y: number; width: number; height: number }> {
  const parts = new Map<string, { x: number; y: number; width: number; height: number }>();
  
  const getKeypoint = (name: string): Keypoint | undefined => {
    const idx = KEYPOINT_NAMES.indexOf(name);
    return idx >= 0 ? keypoints[idx] : undefined;
  };
  
  const leftShoulder = getKeypoint('left_shoulder');
  const rightShoulder = getKeypoint('right_shoulder');
  const leftHip = getKeypoint('left_hip');
  const rightHip = getKeypoint('right_hip');
  const leftEar = getKeypoint('left_ear');
  const rightEar = getKeypoint('right_ear');
  const nose = getKeypoint('nose');
  const leftKnee = getKeypoint('left_knee');
  const rightKnee = getKeypoint('right_knee');
  const leftAnkle = getKeypoint('left_ankle');
  const rightAnkle = getKeypoint('right_ankle');
  const leftElbow = getKeypoint('left_elbow');
  const rightElbow = getKeypoint('right_elbow');
  const leftWrist = getKeypoint('left_wrist');
  const rightWrist = getKeypoint('right_wrist');
  
  if (nose && leftEar && rightEar) {
    const headTop = Math.min(leftEar.y, rightEar.y, nose.y) - 20;
    const headBottom = Math.max(leftEar.y, rightEar.y, nose.y) + 10;
    const headLeft = Math.min(leftEar.x, rightEar.x, nose.x) - 15;
    const headRight = Math.max(leftEar.x, rightEar.x, nose.x) + 15;
    
    parts.set('head', {
      x: Math.max(0, headLeft),
      y: Math.max(0, headTop),
      width: Math.min(imageData.width, headRight - headLeft),
      height: Math.min(imageData.height, headBottom - headTop),
    });
  }
  
  if (leftShoulder && rightShoulder && leftHip && rightHip) {
    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipY = (leftHip.y + rightHip.y) / 2;
    const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
    
    parts.set('body', {
      x: Math.max(0, (leftShoulder.x + rightShoulder.x) / 2 - shoulderWidth / 2),
      y: Math.max(0, shoulderY),
      width: Math.min(imageData.width, shoulderWidth * 1.2),
      height: Math.min(imageData.height, hipY - shoulderY),
    });
  }
  
  if (leftShoulder && leftElbow) {
    const armTop = Math.min(leftShoulder.y, leftElbow.y) - 10;
    const armBottom = Math.max(leftShoulder.y, leftElbow.y) + 10;
    const armLeft = Math.min(leftShoulder.x, leftElbow.x) - 10;
    const armRight = Math.max(leftShoulder.x, leftElbow.x) + 10;
    
    parts.set('leftArm', {
      x: Math.max(0, armLeft),
      y: Math.max(0, armTop),
      width: Math.min(imageData.width, armRight - armLeft),
      height: Math.min(imageData.height, armBottom - armTop),
    });
  }
  
  if (rightShoulder && rightElbow) {
    const armTop = Math.min(rightShoulder.y, rightElbow.y) - 10;
    const armBottom = Math.max(rightShoulder.y, rightElbow.y) + 10;
    const armLeft = Math.min(rightShoulder.x, rightElbow.x) - 10;
    const armRight = Math.max(rightShoulder.x, rightElbow.x) + 10;
    
    parts.set('rightArm', {
      x: Math.max(0, armLeft),
      y: Math.max(0, armTop),
      width: Math.min(imageData.width, armRight - armLeft),
      height: Math.min(imageData.height, armBottom - armTop),
    });
  }
  
  if (leftHip && leftKnee && leftAnkle) {
    const legTop = Math.min(leftHip.y, leftKnee.y);
    const legBottom = Math.max(leftKnee.y, leftAnkle.y);
    const legLeft = Math.min(leftHip.x, leftKnee.x, leftAnkle.x) - 10;
    const legRight = Math.max(leftHip.x, leftKnee.x, leftAnkle.x) + 10;
    
    parts.set('leftLeg', {
      x: Math.max(0, legLeft),
      y: Math.max(0, legTop),
      width: Math.min(imageData.width, legRight - legLeft),
      height: Math.min(imageData.height, legBottom - legTop),
    });
  }
  
  if (rightHip && rightKnee && rightAnkle) {
    const legTop = Math.min(rightHip.y, rightKnee.y);
    const legBottom = Math.max(rightKnee.y, rightAnkle.y);
    const legLeft = Math.min(rightHip.x, rightKnee.x, rightAnkle.x) - 10;
    const legRight = Math.max(rightHip.x, rightKnee.x, rightAnkle.x) + 10;
    
    parts.set('rightLeg', {
      x: Math.max(0, legLeft),
      y: Math.max(0, legTop),
      width: Math.min(imageData.width, legRight - legLeft),
      height: Math.min(imageData.height, legBottom - legTop),
    });
  }
  
  return parts;
}

export const poseDetector = {
  detectPose,
  getBodyPartsFromKeypoints,
  loadModel,
};

export default poseDetector;
