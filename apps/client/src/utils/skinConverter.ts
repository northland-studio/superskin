import { Color, getPixel, setPixel, adjustBrightness, isTransparent } from './colorUtils';
import {
  detectBoundingBox,
  detectBoundingBoxWithAI,
  removeBackground,
  detectBodyParts,
  detectBodyPartsWithAI,
  extractRegion,
  resizeRegion,
  createEmptySkin,
  copyRegionToSkin,
  flipHorizontal,
  BoundingBox,
} from './imageProcessor';
import { SKIN_WIDTH, SKIN_HEIGHT, SkinTemplate, MINECRAFT_SKIN_TEMPLATE } from './skinTemplate';

export interface ConversionOptions {
  removeBackground: boolean;
  backgroundColor?: Color;
  backgroundTolerance: number;
  autoDetectParts: boolean;
  useAI: boolean;
  template: SkinTemplate;
  brightness: number;
  contrast: number;
  saturation: number;
}

export interface ConversionResult {
  skinData: ImageData;
  skinUrl: string;
  previewUrl: string;
  bodyParts: Map<string, BoundingBox>;
  boundingBox: BoundingBox;
}

export const DEFAULT_OPTIONS: ConversionOptions = {
  removeBackground: true,
  backgroundTolerance: 50,
  autoDetectParts: true,
  useAI: true,
  template: MINECRAFT_SKIN_TEMPLATE,
  brightness: 1.0,
  contrast: 1.0,
  saturation: 1.0,
};

export class SkinConverter {
  private canvas: HTMLCanvasElement;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = SKIN_WIDTH;
    this.canvas.height = SKIN_HEIGHT;
  }

  async convert(imageSource: string | HTMLImageElement, options: Partial<ConversionOptions> = {}): Promise<ConversionResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    const img = await this.loadImage(imageSource);
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(img, 0, 0);
    
    let imageData = tempCtx.getImageData(0, 0, img.width, img.height);
    
    if (opts.removeBackground) {
      imageData = removeBackground(imageData, opts.backgroundColor, opts.backgroundTolerance);
    }
    
    imageData = this.applyFilters(imageData, opts);
    
    let boundingBox: BoundingBox;
    let bodyParts: Map<string, BoundingBox>;
    
    if (opts.useAI && opts.autoDetectParts) {
      try {
        boundingBox = await detectBoundingBoxWithAI(imageData);
        bodyParts = await detectBodyPartsWithAI(imageData, boundingBox);
      } catch (error) {
        console.warn('AI detection failed, using traditional method:', error);
        boundingBox = detectBoundingBox(imageData);
        bodyParts = detectBodyParts(imageData, boundingBox);
      }
    } else if (opts.autoDetectParts) {
      boundingBox = detectBoundingBox(imageData);
      bodyParts = detectBodyParts(imageData, boundingBox);
    } else {
      boundingBox = { x: 0, y: 0, width: imageData.width, height: imageData.height };
      bodyParts = this.getDefaultBodyParts(boundingBox);
    }
    
    const skinData = this.generateSkin(imageData, bodyParts, opts);
    
    const skinUrl = this.imageDataToUrl(skinData);
    const previewUrl = await this.generatePreview(skinData);
    
    return {
      skinData,
      skinUrl,
      previewUrl,
      bodyParts,
      boundingBox,
    };
  }

  private async loadImage(source: string | HTMLImageElement): Promise<HTMLImageElement> {
    if (source instanceof HTMLImageElement) {
      return source;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = source;
    });
  }

  private applyFilters(imageData: ImageData, options: ConversionOptions): ImageData {
    const result = new ImageData(imageData.width, imageData.height);
    
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        let pixel = getPixel(imageData, x, y);
        
        if (!isTransparent(pixel)) {
          if (options.brightness !== 1.0) {
            pixel = adjustBrightness(pixel, options.brightness);
          }
          
          if (options.saturation !== 1.0) {
            pixel = this.adjustSaturation(pixel, options.saturation);
          }
          
          if (options.contrast !== 1.0) {
            pixel = this.adjustContrast(pixel, options.contrast);
          }
        }
        
        setPixel(result, x, y, pixel);
      }
    }
    
    return result;
  }

  private adjustSaturation(color: Color, factor: number): Color {
    const gray = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
    
    return {
      r: Math.min(255, Math.max(0, Math.round(gray + factor * (color.r - gray)))),
      g: Math.min(255, Math.max(0, Math.round(gray + factor * (color.g - gray)))),
      b: Math.min(255, Math.max(0, Math.round(gray + factor * (color.b - gray)))),
      a: color.a,
    };
  }

  private adjustContrast(color: Color, factor: number): Color {
    const contrast = (factor - 1) * 128;
    
    return {
      r: Math.min(255, Math.max(0, Math.round((color.r - 128) * factor + 128 + contrast))),
      g: Math.min(255, Math.max(0, Math.round((color.g - 128) * factor + 128 + contrast))),
      b: Math.min(255, Math.max(0, Math.round((color.b - 128) * factor + 128 + contrast))),
      a: color.a,
    };
  }

  private generateSkin(imageData: ImageData, bodyParts: Map<string, BoundingBox>, _options: ConversionOptions): ImageData {
    const skin = createEmptySkin();
    
    const headPart = bodyParts.get('head');
    if (headPart) {
      const headData = extractRegion(imageData, headPart);
      const resizedHead = resizeRegion(headData, 8, 8);
      
      copyRegionToSkin(skin, resizedHead, 8, 8);
      copyRegionToSkin(skin, flipHorizontal(resizedHead), 24, 8);
      copyRegionToSkin(skin, resizedHead, 8, 0);
      copyRegionToSkin(skin, resizedHead, 16, 0);
      copyRegionToSkin(skin, resizedHead, 0, 8);
      copyRegionToSkin(skin, flipHorizontal(resizedHead), 16, 8);
    }
    
    const bodyPart = bodyParts.get('body');
    if (bodyPart) {
      const bodyData = extractRegion(imageData, bodyPart);
      
      const frontBody = resizeRegion(bodyData, 4, 6);
      copyRegionToSkin(skin, frontBody, 20, 20);
      copyRegionToSkin(skin, flipHorizontal(frontBody), 32, 20);
      
      const topBody = resizeRegion(bodyData, 4, 2);
      copyRegionToSkin(skin, topBody, 20, 16);
      copyRegionToSkin(skin, topBody, 20, 26);
      
      const rightSide = resizeRegion(bodyData, 2, 6);
      copyRegionToSkin(skin, rightSide, 16, 20);
      copyRegionToSkin(skin, flipHorizontal(rightSide), 28, 20);
    }
    
    const rightArmPart = bodyParts.get('rightArm');
    if (rightArmPart) {
      const armData = extractRegion(imageData, rightArmPart);
      const resizedArm = resizeRegion(armData, 4, 6);
      
      copyRegionToSkin(skin, resizedArm, 44, 20);
      copyRegionToSkin(skin, flipHorizontal(resizedArm), 52, 20);
      
      const topArm = resizeRegion(armData, 4, 2);
      copyRegionToSkin(skin, topArm, 44, 16);
      copyRegionToSkin(skin, topArm, 48, 16);
      
      const outerArm = resizeRegion(armData, 2, 6);
      copyRegionToSkin(skin, outerArm, 40, 20);
      copyRegionToSkin(skin, flipHorizontal(outerArm), 48, 20);
    }
    
    const leftArmPart = bodyParts.get('leftArm');
    if (leftArmPart) {
      const armData = extractRegion(imageData, leftArmPart);
      const resizedArm = resizeRegion(armData, 4, 6);
      
      copyRegionToSkin(skin, resizedArm, 36, 52);
      copyRegionToSkin(skin, flipHorizontal(resizedArm), 44, 52);
      
      const topArm = resizeRegion(armData, 4, 2);
      copyRegionToSkin(skin, topArm, 36, 48);
      copyRegionToSkin(skin, topArm, 40, 48);
      
      const innerArm = resizeRegion(armData, 2, 6);
      copyRegionToSkin(skin, innerArm, 32, 52);
      copyRegionToSkin(skin, flipHorizontal(innerArm), 40, 52);
    }
    
    const rightLegPart = bodyParts.get('rightLeg');
    if (rightLegPart) {
      const legData = extractRegion(imageData, rightLegPart);
      const resizedLeg = resizeRegion(legData, 4, 6);
      
      copyRegionToSkin(skin, resizedLeg, 4, 20);
      copyRegionToSkin(skin, flipHorizontal(resizedLeg), 12, 20);
      
      const topLeg = resizeRegion(legData, 4, 2);
      copyRegionToSkin(skin, topLeg, 4, 16);
      copyRegionToSkin(skin, topLeg, 8, 16);
      
      const outerLeg = resizeRegion(legData, 2, 6);
      copyRegionToSkin(skin, outerLeg, 0, 20);
      copyRegionToSkin(skin, flipHorizontal(outerLeg), 8, 20);
    }
    
    const leftLegPart = bodyParts.get('leftLeg');
    if (leftLegPart) {
      const legData = extractRegion(imageData, leftLegPart);
      const resizedLeg = resizeRegion(legData, 4, 6);
      
      copyRegionToSkin(skin, resizedLeg, 20, 52);
      copyRegionToSkin(skin, flipHorizontal(resizedLeg), 28, 52);
      
      const topLeg = resizeRegion(legData, 4, 2);
      copyRegionToSkin(skin, topLeg, 20, 48);
      copyRegionToSkin(skin, topLeg, 24, 48);
      
      const innerLeg = resizeRegion(legData, 2, 6);
      copyRegionToSkin(skin, innerLeg, 16, 52);
      copyRegionToSkin(skin, flipHorizontal(innerLeg), 24, 52);
    }
    
    return skin;
  }

  private getDefaultBodyParts(boundingBox: BoundingBox): Map<string, BoundingBox> {
    return detectBodyParts(new ImageData(1, 1), boundingBox);
  }

  private imageDataToUrl(imageData: ImageData): string {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }

  private async generatePreview(skinData: ImageData): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    ctx.imageSmoothingEnabled = false;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = skinData.width;
    tempCanvas.height = skinData.height;
    tempCanvas.getContext('2d')!.putImageData(skinData, 0, 0);
    
    ctx.drawImage(tempCanvas, 0, 0, 256, 256);
    
    return canvas.toDataURL('image/png');
  }

  dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  async downloadSkin(skinUrl: string, filename: string = 'superskin_skin.png'): Promise<void> {
    const link = document.createElement('a');
    link.download = filename;
    link.href = skinUrl;
    link.click();
  }
}

export const skinConverter = new SkinConverter();
