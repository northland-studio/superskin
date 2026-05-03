import { Color, getPixel, setPixel, colorDistance, isTransparent } from './colorUtils';
import { SKIN_WIDTH, SKIN_HEIGHT } from './skinTemplate';
import { detectPose, getBodyPartsFromKeypoints } from './poseDetector';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function detectBoundingBoxWithAI(imageData: ImageData): Promise<BoundingBox> {
  const pose = await detectPose(imageData);
  if (pose) {
    return pose.bbox;
  }
  return detectBoundingBox(imageData);
}

export function detectBoundingBox(imageData: ImageData, backgroundColor?: Color): BoundingBox {
  let minX = imageData.width;
  let minY = imageData.height;
  let maxX = 0;
  let maxY = 0;
  
  const bgColor = backgroundColor || detectBackgroundColor(imageData);
  
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const pixel = getPixel(imageData, x, y);
      
      if (!isTransparent(pixel) && colorDistance(pixel, bgColor) > 30) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  
  if (minX > maxX || minY > maxY) {
    return { x: 0, y: 0, width: imageData.width, height: imageData.height };
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

export function detectBackgroundColor(imageData: ImageData): Color {
  const corners = [
    getPixel(imageData, 0, 0),
    getPixel(imageData, imageData.width - 1, 0),
    getPixel(imageData, 0, imageData.height - 1),
    getPixel(imageData, imageData.width - 1, imageData.height - 1),
  ];
  
  const colorCounts = new Map<string, number>();
  
  for (const color of corners) {
    const key = `${color.r},${color.g},${color.b}`;
    colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
  }
  
  const mostCommon = Array.from(colorCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const [r, g, b] = mostCommon[0].split(',').map(Number);
  
  return { r, g, b, a: 255 };
}

export function removeBackground(imageData: ImageData, bgColor?: Color, tolerance: number = 50): ImageData {
  const result = new ImageData(imageData.width, imageData.height);
  const background = bgColor || detectBackgroundColor(imageData);
  
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const pixel = getPixel(imageData, x, y);
      
      if (colorDistance(pixel, background) <= tolerance) {
        setPixel(result, x, y, { r: 0, g: 0, b: 0, a: 0 });
      } else {
        setPixel(result, x, y, pixel);
      }
    }
  }
  
  return result;
}

export async function detectBodyPartsWithAI(imageData: ImageData, boundingBox: BoundingBox): Promise<Map<string, BoundingBox>> {
  try {
    const pose = await detectPose(imageData);
    if (pose && pose.keypoints.length > 0) {
      const aiParts = getBodyPartsFromKeypoints(pose.keypoints, imageData);
      if (aiParts.size > 0) {
        return aiParts;
      }
    }
  } catch (error) {
    console.warn('AI pose detection failed, falling back to traditional method:', error);
  }
  
  return detectBodyParts(imageData, boundingBox);
}

function analyzeRowDensity(imageData: ImageData, y: number, boundingBox: BoundingBox): number {
  let nonTransparent = 0;
  const startX = boundingBox.x;
  const endX = boundingBox.x + boundingBox.width;
  
  for (let x = startX; x < endX; x++) {
    const pixel = getPixel(imageData, x, y);
    if (!isTransparent(pixel)) {
      nonTransparent++;
    }
  }
  
  return nonTransparent / boundingBox.width;
}

function findHeadTop(imageData: ImageData, boundingBox: BoundingBox): number {
  const { y, height } = boundingBox;
  const maxHeadHeight = Math.floor(height * 0.4);
  
  for (let row = y; row < y + maxHeadHeight; row++) {
    const density = analyzeRowDensity(imageData, row, boundingBox);
    if (density > 0.1) {
      return row;
    }
  }
  return y;
}

function findNeck(imageData: ImageData, boundingBox: BoundingBox, headTop: number): number {
  const { y, height } = boundingBox;
  const maxHeadHeight = Math.floor(height * 0.4);
  
  for (let row = headTop + 1; row < headTop + maxHeadHeight; row++) {
    const leftDensity = analyzeColumnDensity(imageData, boundingBox.x + Math.floor(boundingBox.width * 0.3), boundingBox);
    const rightDensity = analyzeColumnDensity(imageData, boundingBox.x + Math.floor(boundingBox.width * 0.7), boundingBox);
    const centerDensity = analyzeColumnDensity(imageData, boundingBox.x + Math.floor(boundingBox.width * 0.5), boundingBox);
    
    if (centerDensity > 0.5 && (leftDensity < 0.3 || rightDensity < 0.3)) {
      return row;
    }
  }
  
  return headTop + Math.floor(height * 0.25);
}

function analyzeColumnDensity(imageData: ImageData, x: number, boundingBox: BoundingBox): number {
  let nonTransparent = 0;
  const startY = boundingBox.y;
  const endY = boundingBox.y + boundingBox.height;
  
  for (let y = startY; y < endY; y++) {
    const pixel = getPixel(imageData, x, y);
    if (!isTransparent(pixel)) {
      nonTransparent++;
    }
  }
  
  return nonTransparent / boundingBox.height;
}

function findShoulders(imageData: ImageData, boundingBox: BoundingBox, neckY: number): { left: number; right: number; y: number } {
  const { x, y, width, height } = boundingBox;
  const maxSearch = Math.floor(height * 0.15);
  
  let leftShoulder = x;
  let rightShoulder = x + width;
  let shoulderY = neckY;
  
  for (let row = neckY; row < neckY + maxSearch; row++) {
    let leftmost = x + width;
    let rightmost = x;
    
    for (let col = x; col < x + width; col++) {
      const pixel = getPixel(imageData, col, row);
      if (!isTransparent(pixel)) {
        leftmost = Math.min(leftmost, col);
        rightmost = Math.max(rightmost, col);
      }
    }
    
    if (rightmost - leftmost > width * 0.8) {
      leftShoulder = leftmost;
      rightShoulder = rightmost;
      shoulderY = row;
      break;
    }
  }
  
  return { left: leftShoulder, right: rightShoulder, y: shoulderY };
}

function findWaist(imageData: ImageData, boundingBox: BoundingBox, shoulderY: number): number {
  const { x, y, width, height } = boundingBox;
  const minWaistY = shoulderY + Math.floor(height * 0.15);
  const maxWaistY = shoulderY + Math.floor(height * 0.35);
  
  let minWidth = width;
  let waistY = shoulderY + Math.floor(height * 0.25);
  
  for (let row = minWaistY; row < maxWaistY; row++) {
    let leftmost = x + width;
    let rightmost = x;
    
    for (let col = x; col < x + width; col++) {
      const pixel = getPixel(imageData, col, row);
      if (!isTransparent(pixel)) {
        leftmost = Math.min(leftmost, col);
        rightmost = Math.max(rightmost, col);
      }
    }
    
    const currentWidth = rightmost - leftmost;
    if (currentWidth < minWidth) {
      minWidth = currentWidth;
      waistY = row;
    }
  }
  
  return waistY;
}

function findLegs(imageData: ImageData, boundingBox: BoundingBox, waistY: number): { left: BoundingBox; right: BoundingBox } {
  const { x, y, width, height } = boundingBox;
  const legTop = waistY + Math.floor((height - (waistY - y)) * 0.1);
  const legBottom = y + height;
  const centerX = x + Math.floor(width / 2);
  
  let legGapX = centerX;
  for (let col = centerX - Math.floor(width * 0.1); col <= centerX + Math.floor(width * 0.1); col++) {
    let emptyCount = 0;
    for (let row = legTop; row < legTop + Math.floor((legBottom - legTop) * 0.3); row++) {
      const pixel = getPixel(imageData, col, row);
      if (isTransparent(pixel)) {
        emptyCount++;
      }
    }
    if (emptyCount > (legBottom - legTop) * 0.15) {
      legGapX = col;
      break;
    }
  }
  
  const legWidth = Math.floor(width * 0.25);
  const legHeight = legBottom - legTop;
  
  return {
    left: {
      x: legGapX - legWidth,
      y: legTop,
      width: legWidth,
      height: legHeight,
    },
    right: {
      x: legGapX,
      y: legTop,
      width: legWidth,
      height: legHeight,
    },
  };
}

export function detectBodyParts(imageData: ImageData, boundingBox: BoundingBox): Map<string, BoundingBox> {
  const parts = new Map<string, BoundingBox>();
  const { x, y, width, height } = boundingBox;
  
  if (width < 10 || height < 10) {
    return getDefaultBodyParts(boundingBox);
  }
  
  try {
    const headTop = findHeadTop(imageData, boundingBox);
    const neckY = findNeck(imageData, boundingBox, headTop);
    const shoulders = findShoulders(imageData, boundingBox, neckY);
    const waistY = findWaist(imageData, boundingBox, shoulders.y);
    
    const headHeight = neckY - headTop;
    const headWidth = Math.floor(width * 0.5);
    const headCenterX = x + Math.floor(width / 2);
    
    parts.set('head', {
      x: headCenterX - Math.floor(headWidth / 2),
      y: headTop,
      width: headWidth,
      height: Math.max(headHeight, Math.floor(height * 0.2)),
    });
    
    const bodyHeight = waistY - neckY;
    const bodyWidth = shoulders.right - shoulders.left;
    
    parts.set('body', {
      x: shoulders.left,
      y: neckY,
      width: bodyWidth,
      height: Math.max(bodyHeight, Math.floor(height * 0.2)),
    });
    
    const armWidth = Math.floor(width * 0.15);
    const armHeight = Math.floor(height * 0.35);
    
    parts.set('leftArm', {
      x: shoulders.left - armWidth,
      y: neckY,
      width: armWidth,
      height: armHeight,
    });
    
    parts.set('rightArm', {
      x: shoulders.right,
      y: neckY,
      width: armWidth,
      height: armHeight,
    });
    
    const legs = findLegs(imageData, boundingBox, waistY);
    parts.set('leftLeg', legs.left);
    parts.set('rightLeg', legs.right);
    
  } catch (error) {
    console.warn('Body part detection failed, using defaults:', error);
    return getDefaultBodyParts(boundingBox);
  }
  
  return parts;
}

function getDefaultBodyParts(boundingBox: BoundingBox): Map<string, BoundingBox> {
  const parts = new Map<string, BoundingBox>();
  const { x, y, width, height } = boundingBox;
  
  const headHeight = Math.round(height * 0.3);
  const bodyHeight = Math.round(height * 0.25);
  const legHeight = height - headHeight - bodyHeight;
  const armWidth = Math.round(width * 0.15);
  const bodyWidth = width - armWidth * 2;
  
  parts.set('head', {
    x: x + armWidth,
    y: y,
    width: bodyWidth,
    height: headHeight,
  });
  
  parts.set('body', {
    x: x + armWidth,
    y: y + headHeight,
    width: bodyWidth,
    height: bodyHeight,
  });
  
  parts.set('leftArm', {
    x: x,
    y: y + headHeight,
    width: armWidth,
    height: bodyHeight + Math.round(legHeight * 0.3),
  });
  
  parts.set('rightArm', {
    x: x + width - armWidth,
    y: y + headHeight,
    width: armWidth,
    height: bodyHeight + Math.round(legHeight * 0.3),
  });
  
  const legWidth = Math.round(width * 0.25);
  const legGap = Math.round(width * 0.1);
  
  parts.set('leftLeg', {
    x: x + Math.round((width - legWidth * 2 - legGap) / 2),
    y: y + headHeight + bodyHeight,
    width: legWidth,
    height: legHeight,
  });
  
  parts.set('rightLeg', {
    x: x + Math.round((width - legWidth * 2 - legGap) / 2) + legWidth + legGap,
    y: y + headHeight + bodyHeight,
    width: legWidth,
    height: legHeight,
  });
  
  return parts;
}

export function extractRegion(imageData: ImageData, region: BoundingBox): ImageData {
  const result = new ImageData(region.width, region.height);
  
  for (let y = 0; y < region.height; y++) {
    for (let x = 0; x < region.width; x++) {
      const srcX = region.x + x;
      const srcY = region.y + y;
      
      if (srcX < imageData.width && srcY < imageData.height) {
        const pixel = getPixel(imageData, srcX, srcY);
        setPixel(result, x, y, pixel);
      }
    }
  }
  
  return result;
}

export function resizeRegion(sourceData: ImageData, targetWidth: number, targetHeight: number): ImageData {
  const result = new ImageData(targetWidth, targetHeight);
  
  const xRatio = sourceData.width / targetWidth;
  const yRatio = sourceData.height / targetHeight;
  
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.floor(x * xRatio);
      const srcY = Math.floor(y * yRatio);
      
      const pixel = getPixel(sourceData, srcX, srcY);
      setPixel(result, x, y, pixel);
    }
  }
  
  return result;
}

export function createEmptySkin(): ImageData {
  return new ImageData(SKIN_WIDTH, SKIN_HEIGHT);
}

export function copyRegionToSkin(
  skinData: ImageData,
  regionData: ImageData,
  targetX: number,
  targetY: number,
  mirror: boolean = false
): void {
  for (let y = 0; y < regionData.height; y++) {
    for (let x = 0; x < regionData.width; x++) {
      const srcX = mirror ? regionData.width - 1 - x : x;
      const pixel = getPixel(regionData, srcX, y);
      
      const destX = targetX + x;
      const destY = targetY + y;
      
      if (destX < SKIN_WIDTH && destY < SKIN_HEIGHT) {
        setPixel(skinData, destX, destY, pixel);
      }
    }
  }
}

export function flipHorizontal(imageData: ImageData): ImageData {
  const result = new ImageData(imageData.width, imageData.height);
  
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const pixel = getPixel(imageData, x, y);
      setPixel(result, imageData.width - 1 - x, y, pixel);
    }
  }
  
  return result;
}
