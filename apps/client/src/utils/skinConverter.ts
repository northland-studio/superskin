import { Color, getPixel, setPixel, adjustBrightness, isTransparent, quantizeColor } from './colorUtils';
import {
  detectBoundingBox,
  removeBackground,
  detectBodyParts,
  extractRegion,
  resizeRegion,
  createEmptySkin,
  copyRegionToSkin,
  flipHorizontal,
  BoundingBox,
} from './imageProcessor';
import { detectPose, getBodyPartsFromKeypoints, applySegmentationMask, ProgressCallback } from './poseDetector';
import { SKIN_WIDTH, SKIN_HEIGHT, SkinTemplate, MINECRAFT_SKIN_TEMPLATE } from './skinTemplate';
import { logger } from './logger';
import { inpaintBackFace, inpaintSideFace } from '@/services/inpaintService';

export interface ConversionOptions {
  removeBackground: boolean;
  backgroundColor?: Color;
  backgroundTolerance: number;
  autoDetectParts: boolean;
  useAI: boolean;
  useSegmentation: boolean;
  template: SkinTemplate;
  brightness: number;
  contrast: number;
  saturation: number;
  preserveColors: boolean;
  colorQuantization: number;
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
  useSegmentation: true,
  template: MINECRAFT_SKIN_TEMPLATE,
  brightness: 1.0,
  contrast: 1.0,
  saturation: 1.0,
  preserveColors: true,
  colorQuantization: 256,
};

export class SkinConverter {
  private canvas: HTMLCanvasElement;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = SKIN_WIDTH;
    this.canvas.height = SKIN_HEIGHT;
  }

  async convert(
    imageSource: string | HTMLImageElement,
    options: Partial<ConversionOptions> = {},
    onProgress?: ProgressCallback
  ): Promise<ConversionResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    logger.info('Starting skin conversion', { options: opts });
    onProgress?.('加载图像', 5);

    const img = await this.loadImage(imageSource);
    
    onProgress?.('处理图像数据', 10);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(img, 0, 0);
    
    let imageData = tempCtx.getImageData(0, 0, img.width, img.height);
    logger.info('Image loaded', { width: img.width, height: img.height });
    
    if (opts.useAI && opts.useSegmentation) {
      onProgress?.('AI姿态检测', 15);
      const poseResult = await detectPose(imageData, (stage, progress) => {
        onProgress?.(`AI检测: ${stage}`, 15 + progress * 0.35);
      });
      
      if (poseResult) {
        logger.info('AI detection successful', { 
          confidence: poseResult.confidence,
          keypoints: poseResult.keypoints.length 
        });
        
        if (poseResult.segmentationMask && opts.removeBackground) {
          onProgress?.('应用分割蒙版', 55);
          imageData = applySegmentationMask(imageData, poseResult.segmentationMask, 0.5);
          logger.info('Applied segmentation mask');
        }
        
        onProgress?.('提取身体部位', 60);
        const aiParts = getBodyPartsFromKeypoints(poseResult.keypoints, imageData);
        if (aiParts.size > 0) {
          const skinData = this.generateSkinFromParts(imageData, aiParts, opts);
          
          onProgress?.('生成皮肤文件', 80);
          const skinUrl = this.imageDataToUrl(skinData);
          const previewUrl = await this.generatePreview(skinData);
          
          onProgress?.('完成', 100);
          logger.info('Skin conversion completed with AI');
          
          return {
            skinData,
            skinUrl,
            previewUrl,
            bodyParts: aiParts,
            boundingBox: poseResult.bbox,
          };
        }
      }
    }
    
    if (opts.removeBackground) {
      onProgress?.('去除背景', 20);
      imageData = removeBackground(imageData, opts.backgroundColor, opts.backgroundTolerance);
      logger.info('Background removed');
    }
    
    onProgress?.('应用滤镜', 30);
    imageData = this.applyFilters(imageData, opts);
    
    onProgress?.('检测边界', 40);
    let boundingBox: BoundingBox;
    let bodyParts: Map<string, BoundingBox>;
    
    if (opts.autoDetectParts) {
      onProgress?.('检测身体部位', 50);
      boundingBox = detectBoundingBox(imageData);
      bodyParts = detectBodyParts(imageData, boundingBox);
      logger.info('Body parts detected', { partsCount: bodyParts.size });
    } else {
      boundingBox = { x: 0, y: 0, width: imageData.width, height: imageData.height };
      bodyParts = this.getDefaultBodyParts(boundingBox);
    }
    
    onProgress?.('生成皮肤', 70);
    const skinData = this.generateSkinFromParts(imageData, bodyParts, opts);
    
    onProgress?.('导出皮肤', 90);
    const skinUrl = this.imageDataToUrl(skinData);
    const previewUrl = await this.generatePreview(skinData);
    
    onProgress?.('完成', 100);
    logger.info('Skin conversion completed');
    
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
      img.onerror = (e) => {
        logger.error('Failed to load image', e);
        reject(e);
      };
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
          
          if (options.preserveColors && options.colorQuantization > 0) {
            pixel = quantizeColor(pixel, options.colorQuantization);
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

  private generateSkinFromParts(
    imageData: ImageData,
    bodyParts: Map<string, BoundingBox>,
    _options: ConversionOptions
  ): ImageData {
    return SkinConverter.buildSkinFromParts(imageData, bodyParts, false);
  }

  public static buildSkinFromParts(
    imageData: ImageData,
    bodyParts: Map<string, BoundingBox>,
    useInpainting: boolean = false
  ): ImageData {
    const skin = createEmptySkin();
    
    const headPart = bodyParts.get('head');
    if (headPart) {
      const headData = extractRegion(imageData, headPart);
      const resizedHead = new SkinConverter().resizeWithAspectRatio(headData, 8, 8);
      
      copyRegionToSkin(skin, resizedHead, 8, 8);
      if (useInpainting) {
        const backHead = inpaintBackFace(resizedHead, 8, 8, 'head back');
        Promise.resolve(backHead).then((bh) => copyRegionToSkin(skin, bh as ImageData, 24, 8));
      } else {
        copyRegionToSkin(skin, flipHorizontal(resizedHead), 24, 8);
      }
      copyRegionToSkin(skin, resizedHead, 8, 0);
      copyRegionToSkin(skin, resizedHead, 16, 0);
      copyRegionToSkin(skin, resizedHead, 0, 8);
      copyRegionToSkin(skin, flipHorizontal(resizedHead), 16, 8);
    }
    
    const bodyPart = bodyParts.get('body');
    if (bodyPart) {
      const bodyData = extractRegion(imageData, bodyPart);
      
      const frontBody = new SkinConverter().resizeWithAspectRatio(bodyData, 4, 6);
      copyRegionToSkin(skin, frontBody, 20, 20);
      if (useInpainting) {
        const backBody = inpaintBackFace(frontBody, 4, 6, 'body back');
        Promise.resolve(backBody).then((bb) => copyRegionToSkin(skin, bb as ImageData, 32, 20));
      } else {
        copyRegionToSkin(skin, flipHorizontal(frontBody), 32, 20);
      }
      
      const topBody = new SkinConverter().resizeWithAspectRatio(bodyData, 4, 2);
      copyRegionToSkin(skin, topBody, 20, 16);
      copyRegionToSkin(skin, topBody, 20, 26);
      
      const rightSide = new SkinConverter().resizeWithAspectRatio(bodyData, 2, 6);
      copyRegionToSkin(skin, rightSide, 16, 20);
      copyRegionToSkin(skin, flipHorizontal(rightSide), 28, 20);
    }
    
    const rightArmPart = bodyParts.get('rightArm');
    if (rightArmPart) {
      const armData = extractRegion(imageData, rightArmPart);
      const resizedArm = new SkinConverter().resizeWithAspectRatio(armData, 4, 6);
      
      copyRegionToSkin(skin, resizedArm, 44, 20);
      if (useInpainting) {
        const backArm = inpaintBackFace(resizedArm, 4, 6, 'right arm back');
        Promise.resolve(backArm).then((ba) => copyRegionToSkin(skin, ba as ImageData, 52, 20));
      } else {
        copyRegionToSkin(skin, flipHorizontal(resizedArm), 52, 20);
      }
      
      const topArm = new SkinConverter().resizeWithAspectRatio(armData, 4, 2);
      copyRegionToSkin(skin, topArm, 44, 16);
      copyRegionToSkin(skin, topArm, 48, 16);
      
      const outerArm = new SkinConverter().resizeWithAspectRatio(armData, 2, 6);
      copyRegionToSkin(skin, outerArm, 40, 20);
      copyRegionToSkin(skin, flipHorizontal(outerArm), 48, 20);
    }
    
    const leftArmPart = bodyParts.get('leftArm');
    if (leftArmPart) {
      const armData = extractRegion(imageData, leftArmPart);
      const resizedArm = new SkinConverter().resizeWithAspectRatio(armData, 4, 6);
      
      copyRegionToSkin(skin, resizedArm, 36, 52);
      if (useInpainting) {
        const backArm = inpaintBackFace(resizedArm, 4, 6, 'left arm back');
        Promise.resolve(backArm).then((ba) => copyRegionToSkin(skin, ba as ImageData, 44, 52));
      } else {
        copyRegionToSkin(skin, flipHorizontal(resizedArm), 44, 52);
      }
      
      const topArm = new SkinConverter().resizeWithAspectRatio(armData, 4, 2);
      copyRegionToSkin(skin, topArm, 36, 48);
      copyRegionToSkin(skin, topArm, 40, 48);
      
      const innerArm = new SkinConverter().resizeWithAspectRatio(armData, 2, 6);
      copyRegionToSkin(skin, innerArm, 32, 52);
      copyRegionToSkin(skin, flipHorizontal(innerArm), 40, 52);
    }
    
    const rightLegPart = bodyParts.get('rightLeg');
    if (rightLegPart) {
      const legData = extractRegion(imageData, rightLegPart);
      const resizedLeg = new SkinConverter().resizeWithAspectRatio(legData, 4, 6);
      
      copyRegionToSkin(skin, resizedLeg, 4, 20);
      if (useInpainting) {
        const backLeg = inpaintBackFace(resizedLeg, 4, 6, 'right leg back');
        Promise.resolve(backLeg).then((bl) => copyRegionToSkin(skin, bl as ImageData, 12, 20));
      } else {
        copyRegionToSkin(skin, flipHorizontal(resizedLeg), 12, 20);
      }
      
      const topLeg = new SkinConverter().resizeWithAspectRatio(legData, 4, 2);
      copyRegionToSkin(skin, topLeg, 4, 16);
      copyRegionToSkin(skin, topLeg, 8, 16);
      
      const outerLeg = new SkinConverter().resizeWithAspectRatio(legData, 2, 6);
      copyRegionToSkin(skin, outerLeg, 0, 20);
      copyRegionToSkin(skin, flipHorizontal(outerLeg), 8, 20);
    }
    
    const leftLegPart = bodyParts.get('leftLeg');
    if (leftLegPart) {
      const legData = extractRegion(imageData, leftLegPart);
      const resizedLeg = new SkinConverter().resizeWithAspectRatio(legData, 4, 6);
      
      copyRegionToSkin(skin, resizedLeg, 20, 52);
      if (useInpainting) {
        const backLeg = inpaintBackFace(resizedLeg, 4, 6, 'left leg back');
        Promise.resolve(backLeg).then((bl) => copyRegionToSkin(skin, bl as ImageData, 28, 52));
      } else {
        copyRegionToSkin(skin, flipHorizontal(resizedLeg), 28, 52);
      }
      
      const topLeg = new SkinConverter().resizeWithAspectRatio(legData, 4, 2);
      copyRegionToSkin(skin, topLeg, 20, 48);
      copyRegionToSkin(skin, topLeg, 24, 48);
      
      const innerLeg = new SkinConverter().resizeWithAspectRatio(legData, 2, 6);
      copyRegionToSkin(skin, innerLeg, 16, 52);
      copyRegionToSkin(skin, flipHorizontal(innerLeg), 24, 52);
    }
    
    return new SkinConverter().quantizeSkinColors(skin, 64);
  }

  private resizeWithAspectRatio(sourceData: ImageData, targetWidth: number, targetHeight: number): ImageData {
    const result = new ImageData(targetWidth, targetHeight);
    const srcW = sourceData.width;
    const srcH = sourceData.height;

    for (let y = 0; y < targetHeight; y++) {
      const srcY0 = Math.floor((y / targetHeight) * srcH);
      const srcY1 = Math.floor(((y + 1) / targetHeight) * srcH);

      for (let x = 0; x < targetWidth; x++) {
        const srcX0 = Math.floor((x / targetWidth) * srcW);
        const srcX1 = Math.floor(((x + 1) / targetWidth) * srcW);

        let sumR = 0, sumG = 0, sumB = 0, sumA = 0, count = 0;

        for (let sy = srcY0; sy < srcY1; sy++) {
          for (let sx = srcX0; sx < srcX1; sx++) {
            const p = getPixel(sourceData, sx, sy);
            if (p.a > 0) {
              sumR += p.r;
              sumG += p.g;
              sumB += p.b;
              sumA += p.a;
              count++;
            }
          }
        }

        if (count > 0) {
          setPixel(result, x, y, {
            r: Math.round(sumR / count),
            g: Math.round(sumG / count),
            b: Math.round(sumB / count),
            a: Math.round(sumA / count),
          });
        }
      }
    }

    return result;
  }

  private getDefaultBodyParts(boundingBox: BoundingBox): Map<string, BoundingBox> {
    return detectBodyParts(new ImageData(1, 1), boundingBox);
  }

  private quantizeSkinColors(skinData: ImageData, levels: number): ImageData {
    const result = new ImageData(skinData.width, skinData.height);
    const step = 255 / (levels - 1);

    for (let i = 0; i < skinData.data.length; i += 4) {
      const a = skinData.data[i + 3];
      if (a < 10) continue;

      result.data[i] = Math.round(Math.round(skinData.data[i] / step) * step);
      result.data[i + 1] = Math.round(Math.round(skinData.data[i + 1] / step) * step);
      result.data[i + 2] = Math.round(Math.round(skinData.data[i + 2] / step) * step);
      result.data[i + 3] = a;
    }

    return result;
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
