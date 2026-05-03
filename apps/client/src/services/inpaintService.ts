import { invoke } from '@tauri-apps/api/core';
import { logger } from '@/utils/logger';

const REPLICATE_API_TOKEN = '';

export interface InpaintResult {
  imageBase64: string;
}

function rgbaToRgbDataUrl(imageData: ImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

function imageDataToBase64(imageData: ImageData): string {
  const dataUrl = rgbaToRgbDataUrl(imageData);
  return dataUrl.split(',')[1];
}

async function callReplicateInpaint(
  imageBase64: string,
  maskBase64: string,
  prompt: string
): Promise<string | null> {
  try {
    const body = JSON.stringify({
      version: 'c11bac58203367aaa68a3b1fc5b57a2b626b54b80e0e4b3874df8c910e3a8bab',
      input: {
        image: `data:image/png;base64,${imageBase64}`,
        mask: `data:image/png;base64,${maskBase64}`,
        prompt,
        negative_prompt: 'blurry, distorted, text, watermark',
        num_inference_steps: 20,
        guidance_scale: 7.5,
      },
    });

    const responseText = await invoke<string>('http_post', {
      url: 'https://api.replicate.com/v1/predictions',
      body,
      token: REPLICATE_API_TOKEN,
    });

    const prediction = JSON.parse(responseText);
    logger.info('Replicate prediction created', { id: prediction.id });

    let resultUrl: string | null = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const statusText = await invoke<string>('http_get', {
        url: `https://api.replicate.com/v1/predictions/${prediction.id}`,
        token: REPLICATE_API_TOKEN,
      });
      const status = JSON.parse(statusText);
      if (status.status === 'succeeded') {
        resultUrl = status.output?.[0] || status.output;
        break;
      }
      if (status.status === 'failed') {
        logger.error('Replicate prediction failed', { error: status.error });
        return null;
      }
    }

    if (!resultUrl) return null;

    const imgBase64 = await invoke<string>('http_download_bytes', { url: resultUrl });
    return imgBase64;
  } catch (err) {
    logger.error('Replicate inpainting error', err);
    return null;
  }
}

function createMaskForBackFace(frontData: ImageData, targetW: number, targetH: number): string {
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = targetW;
  maskCanvas.height = targetH;
  const maskCtx = maskCanvas.getContext('2d')!;

  maskCtx.fillStyle = '#ffffff';
  maskCtx.fillRect(0, 0, targetW, targetH);

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = frontData.width;
  tempCanvas.height = frontData.height;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.putImageData(frontData, 0, 0);

  maskCtx.fillStyle = '#000000';
  maskCtx.fillRect(1, 1, targetW - 2, targetH - 2);

  return maskCanvas.toDataURL('image/png').split(',')[1];
}

function createColorFillBackFace(
  frontData: ImageData,
  targetW: number,
  targetH: number
): ImageData {
  const result = new ImageData(targetW, targetH);
  const srcW = frontData.width;
  const srcH = frontData.height;

  let sumR = 0, sumG = 0, sumB = 0, count = 0;
  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < srcW; x++) {
      const i = (y * srcW + x) * 4;
      const a = frontData.data[i + 3];
      if (a > 10) {
        sumR += frontData.data[i];
        sumG += frontData.data[i + 1];
        sumB += frontData.data[i + 2];
        count++;
      }
    }
  }

  const avgR = count > 0 ? Math.round(sumR / count) : 128;
  const avgG = count > 0 ? Math.round(sumG / count) : 128;
  const avgB = count > 0 ? Math.round(sumB / count) : 128;

  for (let i = 0; i < result.data.length; i += 4) {
    result.data[i] = avgR;
    result.data[i + 1] = avgG;
    result.data[i + 2] = avgB;
    result.data[i + 3] = 255;
  }

  return result;
}

export async function inpaintBackFace(
  frontData: ImageData,
  targetW: number,
  targetH: number,
  partName: string
): Promise<ImageData> {
  if (!REPLICATE_API_TOKEN) {
    logger.info('No Replicate token, using color fill fallback', { partName });
    return createColorFillBackFace(frontData, targetW, targetH);
  }

  try {
    const frontBase64 = imageDataToBase64(frontData);
    const scaledFront = scaleImageData(frontData, targetW, targetH);
    const scaledBase64 = imageDataToBase64(scaledFront);
    const maskBase64 = createMaskForBackFace(scaledFront, targetW, targetH);

    const prompt = `minecraft skin texture, ${partName}, pixel art style, solid colors, flat shading`;

    const resultBase64 = await callReplicateInpaint(scaledBase64, maskBase64, prompt);

    if (resultBase64) {
      const resultData = base64ToImageData(resultBase64, targetW, targetH);
      if (resultData) return resultData;
    }
  } catch (err) {
    logger.error('Inpainting failed, using fallback', err);
  }

  return createColorFillBackFace(frontData, targetW, targetH);
}

export async function inpaintSideFace(
  frontData: ImageData,
  targetW: number,
  targetH: number,
  _partName: string
): Promise<ImageData> {
  return createColorFillBackFace(frontData, targetW, targetH);
}

function scaleImageData(src: ImageData, tw: number, th: number): ImageData {
  const result = new ImageData(tw, th);
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const sx = Math.floor((x / tw) * src.width);
      const sy = Math.floor((y / th) * src.height);
      const si = (sy * src.width + sx) * 4;
      const di = (y * tw + x) * 4;
      result.data[di] = src.data[si];
      result.data[di + 1] = src.data[si + 1];
      result.data[di + 2] = src.data[si + 2];
      result.data[di + 3] = src.data[si + 3];
    }
  }
  return result;
}

function base64ToImageData(base64: string, w: number, h: number): ImageData | null {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(ctx.getImageData(0, 0, w, h));
    };
    img.onerror = () => resolve(null);
    img.src = `data:image/png;base64,${base64}`;
  }) as unknown as ImageData | null;
}

export function setReplicateToken(token: string): void {
  (inpaintService as Record<string, unknown>).token = token;
}

export const inpaintService = {
  inpaintBackFace,
  inpaintSideFace,
  setReplicateToken,
};

export default inpaintService;
