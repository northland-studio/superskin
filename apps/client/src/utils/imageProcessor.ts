import { Color, getPixel, setPixel, colorDistance, isTransparent } from './colorUtils';
import { SKIN_WIDTH, SKIN_HEIGHT } from './skinTemplate';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
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

export function detectBodyParts(imageData: ImageData, boundingBox: BoundingBox): Map<string, BoundingBox> {
  const parts = new Map<string, BoundingBox>();
  
  const { x, y, width, height } = boundingBox;
  
  const headHeight = Math.round(height * 0.35);
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
