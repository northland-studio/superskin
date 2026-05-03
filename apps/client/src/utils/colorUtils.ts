export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface QuantizedColor {
  color: Color;
  count: number;
}

export function getPixel(imageData: ImageData, x: number, y: number): Color {
  const index = (y * imageData.width + x) * 4;
  return {
    r: imageData.data[index],
    g: imageData.data[index + 1],
    b: imageData.data[index + 2],
    a: imageData.data[index + 3],
  };
}

export function setPixel(imageData: ImageData, x: number, y: number, color: Color): void {
  const index = (y * imageData.width + x) * 4;
  imageData.data[index] = color.r;
  imageData.data[index + 1] = color.g;
  imageData.data[index + 2] = color.b;
  imageData.data[index + 3] = color.a;
}

export function colorDistance(c1: Color, c2: Color): number {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
}

export function colorsEqual(c1: Color, c2: Color, tolerance: number = 0): boolean {
  return colorDistance(c1, c2) <= tolerance;
}

export function quantizeColors(imageData: ImageData, maxColors: number = 256): QuantizedColor[] {
  const colorMap = new Map<string, number>();
  
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const color = getPixel(imageData, x, y);
      if (color.a < 128) continue;
      
      const key = `${Math.round(color.r / 16) * 16},${Math.round(color.g / 16) * 16},${Math.round(color.b / 16) * 16}`;
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }
  }
  
  const sortedColors = Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxColors);
  
  return sortedColors.map(([key, count]) => {
    const [r, g, b] = key.split(',').map(Number);
    return { color: { r, g, b, a: 255 }, count };
  });
}

export function findNearestColor(target: Color, palette: Color[]): Color {
  let minDistance = Infinity;
  let nearestColor = palette[0];
  
  for (const color of palette) {
    const distance = colorDistance(target, color);
    if (distance < minDistance) {
      minDistance = distance;
      nearestColor = color;
    }
  }
  
  return nearestColor;
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return [h * 360, s * 100, l * 100];
}

export function adjustBrightness(color: Color, factor: number): Color {
  return {
    r: Math.min(255, Math.max(0, Math.round(color.r * factor))),
    g: Math.min(255, Math.max(0, Math.round(color.g * factor))),
    b: Math.min(255, Math.max(0, Math.round(color.b * factor))),
    a: color.a,
  };
}

export function createTransparentColor(): Color {
  return { r: 0, g: 0, b: 0, a: 0 };
}

export function isTransparent(color: Color): boolean {
  return color.a < 128;
}

export function blendColors(base: Color, overlay: Color): Color {
  if (overlay.a === 255) return overlay;
  if (overlay.a === 0) return base;
  
  const alpha = overlay.a / 255;
  const invAlpha = 1 - alpha;
  
  return {
    r: Math.round(overlay.r * alpha + base.r * invAlpha),
    g: Math.round(overlay.g * alpha + base.g * invAlpha),
    b: Math.round(overlay.b * alpha + base.b * invAlpha),
    a: Math.min(255, Math.round(base.a + overlay.a * (1 - base.a / 255))),
  };
}

export function quantizeColor(color: Color, levels: number = 256): Color {
  if (levels <= 1) return color;
  
  const step = 255 / (levels - 1);
  
  return {
    r: Math.round(Math.round(color.r / step) * step),
    g: Math.round(Math.round(color.g / step) * step),
    b: Math.round(Math.round(color.b / step) * step),
    a: color.a,
  };
}
