import * as ort from 'onnxruntime-web';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import { logger } from './logger';

export interface Keypoint {
  x: number;
  y: number;
  confidence: number;
  name: string;
}

export interface PoseResult {
  keypoints: Keypoint[];
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  segmentationMask?: ImageData;
  confidence: number;
}

const KEYPOINT_NAMES = [
  'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
  'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
  'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
];

const YOLOV8S_MODEL_URL = 'https://huggingface.co/pinto0309/yolov8s-pose/resolve/main/yolov8s-pose.onnx';

let yoloSession: ort.InferenceSession | null = null;
let selfieSegmentation: SelfieSegmentation | null = null;

export type ProgressCallback = (stage: string, progress: number) => void;

async function loadYOLOModel(): Promise<ort.InferenceSession> {
  if (yoloSession) return yoloSession;
  
  logger.info('Loading YOLOv8s-pose model...');
  
  ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
  ort.env.wasm.simd = true;
  
  yoloSession = await ort.InferenceSession.create(YOLOV8S_MODEL_URL, {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  });
  
  logger.info('YOLOv8s-pose model loaded successfully');
  return yoloSession;
}

async function loadSelfieSegmentation(): Promise<SelfieSegmentation> {
  if (selfieSegmentation) return selfieSegmentation;
  
  logger.info('Loading MediaPipe Selfie Segmentation...');
  
  return new Promise((resolve, reject) => {
    const segmentation = new SelfieSegmentation({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
      },
    });
    
    segmentation.setOptions({
      modelSelection: 1,
      selfieMode: true,
    });
    
    segmentation.onResults(() => {
      selfieSegmentation = segmentation;
      logger.info('MediaPipe Selfie Segmentation loaded successfully');
      resolve(segmentation);
    });
    
    segmentation.initialize().then(() => {
      selfieSegmentation = segmentation;
      logger.info('MediaPipe Selfie Segmentation initialized');
      resolve(segmentation);
    }).catch(reject);
  });
}

function preprocessImageForYOLO(imageData: ImageData): Float32Array {
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
  return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
}

async function detectWithYOLO(imageData: ImageData, onProgress?: ProgressCallback): Promise<PoseResult | null> {
  try {
    onProgress?.('加载YOLO模型', 10);
    const model = await loadYOLOModel();
    
    onProgress?.('预处理图像', 20);
    const input = preprocessImageForYOLO(imageData);
    
    onProgress?.('运行姿态检测', 40);
    const tensor = new ort.Tensor('float32', input, [1, 3, 640, 640]);
    const results = await model.run({ images: tensor });
    
    onProgress?.('解析检测结果', 60);
    const output = results[Object.keys(results)[0]];
    const data = output.data as Float32Array;
    const [numDetections, attributes] = output.dims as [number, number];
    
    let bestDetection: { score: number; index: number } = { score: 0, index: -1 };
    
    for (let i = 0; i < numDetections; i++) {
      const score = sigmoid(data[i * attributes + 4]);
      if (score > bestDetection.score) {
        bestDetection = { score, index: i };
      }
    }
    
    if (bestDetection.index === -1 || bestDetection.score < 0.3) {
      logger.warn('No valid pose detected', { bestScore: bestDetection.score });
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
        x: Math.max(0, Math.min(imageData.width, (kx - offsetX) / scale)),
        y: Math.max(0, Math.min(imageData.height, (ky - offsetY) / scale)),
        confidence,
        name: KEYPOINT_NAMES[k],
      });
    }
    
    logger.info('YOLO pose detected', { confidence: bestDetection.score, keypointsFound: keypoints.filter(k => k.confidence > 0.5).length });
    
    return { keypoints, bbox, confidence: bestDetection.score };
  } catch (error) {
    logger.error('YOLO detection error', error);
    return null;
  }
}

async function getSegmentationMask(imageData: ImageData, onProgress?: ProgressCallback): Promise<ImageData | null> {
  try {
    onProgress?.('加载分割模型', 30);
    const segmentation = await loadSelfieSegmentation();
    
    onProgress?.('运行图像分割', 50);
    
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
    
    return new Promise((resolve) => {
      segmentation.onResults((results) => {
        if (results.segmentationMask) {
          const maskCanvas = document.createElement('canvas');
          maskCanvas.width = imageData.width;
          maskCanvas.height = imageData.height;
          const maskCtx = maskCanvas.getContext('2d')!;
          maskCtx.drawImage(results.segmentationMask, 0, 0, imageData.width, imageData.height);
          const maskData = maskCtx.getImageData(0, 0, imageData.width, imageData.height);
          logger.info('Segmentation mask generated');
          resolve(maskData);
        } else {
          logger.warn('No segmentation mask generated');
          resolve(null);
        }
      });
      
      segmentation.send({ image: canvas });
    });
  } catch (error) {
    logger.error('Segmentation error', error);
    return null;
  }
}

export async function detectPose(
  imageData: ImageData,
  onProgress?: ProgressCallback
): Promise<PoseResult | null> {
  logger.info('Starting hybrid pose detection', { width: imageData.width, height: imageData.height });
  
  try {
    const yoloResult = await detectWithYOLO(imageData, onProgress);
    
    if (!yoloResult) {
      logger.warn('YOLO detection failed, returning null');
      return null;
    }
    
    onProgress?.('生成分割蒙版', 70);
    const segmentationMask = await getSegmentationMask(imageData, onProgress);
    
    onProgress?.('完成检测', 100);
    
    return {
      ...yoloResult,
      segmentationMask: segmentationMask || undefined,
    };
  } catch (error) {
    logger.error('Hybrid pose detection error', error);
    return null;
  }
}

export function getBodyPartsFromKeypoints(
  keypoints: Keypoint[],
  imageData: ImageData
): Map<string, { x: number; y: number; width: number; height: number }> {
  const parts = new Map<string, { x: number; y: number; width: number; height: number }>();
  
  const getKeypoint = (name: string): Keypoint | undefined => {
    return keypoints.find(k => k.name === name);
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
  
  if (nose && (leftEar || rightEar)) {
    const ears = [leftEar, rightEar].filter(Boolean) as Keypoint[];
    const validEars = ears.filter(e => e.confidence > 0.3);
    
    if (validEars.length > 0 || nose.confidence > 0.3) {
      const allX = [nose.x, ...validEars.map(e => e.x)];
      const allY = [nose.y, ...validEars.map(e => e.y)];
      
      const headLeft = Math.min(...allX) - 20;
      const headRight = Math.max(...allX) + 20;
      const headTop = Math.min(...allY) - 30;
      const headBottom = Math.max(...allY) + 15;
      
      parts.set('head', {
        x: Math.max(0, headLeft),
        y: Math.max(0, headTop),
        width: Math.min(imageData.width, headRight - headLeft),
        height: Math.min(imageData.height, headBottom - headTop),
      });
    }
  }
  
  if (leftShoulder && rightShoulder && leftHip && rightHip) {
    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipY = (leftHip.y + rightHip.y) / 2;
    const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
    
    const bodyX = Math.min(leftShoulder.x, rightShoulder.x) - shoulderWidth * 0.1;
    const bodyWidth = shoulderWidth * 1.2;
    
    parts.set('body', {
      x: Math.max(0, bodyX),
      y: Math.max(0, shoulderY),
      width: Math.min(imageData.width, bodyWidth),
      height: Math.min(imageData.height, Math.max(10, hipY - shoulderY)),
    });
  }
  
  if (leftShoulder && leftElbow) {
    const armX = Math.min(leftShoulder.x, leftElbow.x) - 15;
    const armX2 = Math.max(leftShoulder.x, leftElbow.x) + 15;
    const armY = Math.min(leftShoulder.y, leftElbow.y) - 10;
    const armY2 = Math.max(leftShoulder.y, leftElbow.y) + 10;
    
    parts.set('leftArm', {
      x: Math.max(0, armX),
      y: Math.max(0, armY),
      width: Math.min(imageData.width, armX2 - armX),
      height: Math.min(imageData.height, armY2 - armY),
    });
  }
  
  if (rightShoulder && rightElbow) {
    const armX = Math.min(rightShoulder.x, rightElbow.x) - 15;
    const armX2 = Math.max(rightShoulder.x, rightElbow.x) + 15;
    const armY = Math.min(rightShoulder.y, rightElbow.y) - 10;
    const armY2 = Math.max(rightShoulder.y, rightElbow.y) + 10;
    
    parts.set('rightArm', {
      x: Math.max(0, armX),
      y: Math.max(0, armY),
      width: Math.min(imageData.width, armX2 - armX),
      height: Math.min(imageData.height, armY2 - armY),
    });
  }
  
  if (leftHip && leftKnee) {
    const legX = Math.min(leftHip.x, leftKnee.x) - 15;
    const legX2 = Math.max(leftHip.x, leftKnee.x) + 15;
    const legY = Math.min(leftHip.y, leftKnee.y) - 5;
    const legY2 = leftAnkle ? Math.max(leftKnee.y, leftAnkle.y) + 10 : leftKnee.y + 30;
    
    parts.set('leftLeg', {
      x: Math.max(0, legX),
      y: Math.max(0, legY),
      width: Math.min(imageData.width, legX2 - legX),
      height: Math.min(imageData.height, legY2 - legY),
    });
  }
  
  if (rightHip && rightKnee) {
    const legX = Math.min(rightHip.x, rightKnee.x) - 15;
    const legX2 = Math.max(rightHip.x, rightKnee.x) + 15;
    const legY = Math.min(rightHip.y, rightKnee.y) - 5;
    const legY2 = rightAnkle ? Math.max(rightKnee.y, rightAnkle.y) + 10 : rightKnee.y + 30;
    
    parts.set('rightLeg', {
      x: Math.max(0, legX),
      y: Math.max(0, legY),
      width: Math.min(imageData.width, legX2 - legX),
      height: Math.min(imageData.height, legY2 - legY),
    });
  }
  
  logger.info('Body parts extracted from keypoints', { partsCount: parts.size });
  
  return parts;
}

export function applySegmentationMask(
  imageData: ImageData,
  mask: ImageData,
  threshold: number = 0.5
): ImageData {
  const result = new ImageData(imageData.width, imageData.height);
  
  for (let i = 0; i < mask.data.length; i += 4) {
    const maskValue = mask.data[i] / 255;
    
    if (maskValue > threshold) {
      result.data[i] = imageData.data[i];
      result.data[i + 1] = imageData.data[i + 1];
      result.data[i + 2] = imageData.data[i + 2];
      result.data[i + 3] = imageData.data[i + 3];
    } else {
      result.data[i] = 0;
      result.data[i + 1] = 0;
      result.data[i + 2] = 0;
      result.data[i + 3] = 0;
    }
  }
  
  return result;
}

export const poseDetector = {
  detectPose,
  getBodyPartsFromKeypoints,
  loadYOLOModel,
  loadSelfieSegmentation,
  applySegmentationMask,
};

export default poseDetector;
