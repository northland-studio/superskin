import { useState, useRef, useCallback } from 'react';
import { BoundingBox } from '@/utils/imageProcessor';
import { detectPose, getBodyPartsFromKeypoints } from '@/utils/poseDetector';
import { logger } from '@/utils/logger';
import styles from './BodyPartSelector.module.css';

export interface BodyPartEntry {
  name: string;
  label: string;
  box: BoundingBox | null;
}

const PART_DEFS: { name: string; label: string }[] = [
  { name: 'head', label: '头部' },
  { name: 'body', label: '身体' },
  { name: 'leftArm', label: '左臂' },
  { name: 'rightArm', label: '右臂' },
  { name: 'leftLeg', label: '左腿' },
  { name: 'rightLeg', label: '右腿' },
];

interface BodyPartSelectorProps {
  imageSrc: string;
  onConfirm: (parts: Map<string, BoundingBox>) => void;
  onAutoDetect?: (parts: Map<string, BoundingBox>) => void;
}

export function BodyPartSelector({ imageSrc, onConfirm }: BodyPartSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageSize, setImageSize] = useState({ w: 1, h: 1 });
  const [parts, setParts] = useState<BodyPartEntry[]>(
    PART_DEFS.map((p) => ({ ...p, box: null }))
  );
  const [activePart, setActivePart] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState<string | null>(null);

  const getImageCoords = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const img = imgRef.current;
    if (!img) return { x: 0, y: 0 };
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getImageCoords(e);
    setStartPos(coords);
    setDrawing(true);
  }, [getImageCoords]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawing || !startPos) return;
    const coords = getImageCoords(e);
    setParts((prev) => {
      const next = [...prev];
      next[activePart] = {
        ...next[activePart],
        box: {
          x: Math.min(startPos.x, coords.x),
          y: Math.min(startPos.y, coords.y),
          width: Math.abs(coords.x - startPos.x),
          height: Math.abs(coords.y - startPos.y),
        },
      };
      return next;
    });
  }, [drawing, startPos, activePart, getImageCoords]);

  const handleMouseUp = useCallback(() => {
    setDrawing(false);
    setStartPos(null);
  }, []);

  const handleAutoDetect = useCallback(async () => {
    setAutoDetecting(true);
    setDetectMsg(null);
    try {
      const img = imgRef.current;
      if (!img) return;

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const poseResult = await detectPose(imageData);
      if (poseResult) {
        const aiParts = getBodyPartsFromKeypoints(poseResult.keypoints, imageData);
        if (aiParts.size > 0) {
          setParts((prev) =>
            prev.map((p) => {
              const box = aiParts.get(p.name) || null;
              return { ...p, box };
            })
          );
          const found = aiParts.size;
          const missing = PART_DEFS.filter((pd) => !aiParts.has(pd.name)).map((pd) => pd.label);
          if (missing.length > 0) {
            setDetectMsg(`AI检测到 ${found}/6 个部位，未检测到: ${missing.join('、')}，请手动补全`);
          } else {
            setDetectMsg(`AI检测完成，已识别全部 ${found} 个部位`);
          }
          logger.info('Auto detection completed', { partsFound: aiParts.size });
        } else {
          setDetectMsg('AI未检测到有效人体姿态，请手动框选');
        }
      } else {
        setDetectMsg('AI模型加载失败或未检测到人物，请手动框选');
      }
    } catch (err) {
      logger.error('Auto detect failed', err);
      setDetectMsg('AI检测出错，请手动框选');
    } finally {
      setAutoDetecting(false);
    }
  }, []);

  const allDone = parts.every((p) => p.box !== null);

  const handleConfirm = useCallback(() => {
    const map = new Map<string, BoundingBox>();
    for (const part of parts) {
      if (part.box) {
        map.set(part.name, part.box);
      }
    }
    onConfirm(map);
  }, [parts, onConfirm]);

  const displayWidth = (parts: BodyPartEntry[]) => {
    return parts.map((p, i) => {
      const isActive = i === activePart;
      const hasBox = p.box !== null;
      if (!p.box) return null;
      return (
        <g key={p.name}>
          <rect
            x={p.box.x}
            y={p.box.y}
            width={p.box.width}
            height={p.box.height}
            className={`${styles.rect} ${isActive ? styles.rectActive : styles.rectInactive}`}
          />
          <text
            x={p.box.x + 4}
            y={p.box.y + 16}
            className={styles.label}
          >
            {p.label}
          </text>
        </g>
      );
    });
  };

  return (
    <div>
      <div
        ref={containerRef}
        className={styles.container}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          ref={imgRef}
          src={imageSrc}
          className={styles.image}
          draggable={false}
          onLoad={() => {
            if (imgRef.current) {
              setImageSize({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
            }
          }}
        />
        <svg className={styles.svg} viewBox={`0 0 ${imageSize.w} ${imageSize.h}`}>
          {displayWidth(parts)}
        </svg>
      </div>
      <div className={styles.controls}>
        {parts.map((p, i) => (
          <button
            key={p.name}
            className={`${styles.partBtn} ${i === activePart ? styles.partBtnActive : ''} ${p.box ? styles.partBtnDone : ''}`}
            onClick={() => setActivePart(i)}
          >
            {p.label}{p.box ? ' ✓' : ''}
          </button>
        ))}
        <button
          className={styles.autoBtn}
          onClick={handleAutoDetect}
          disabled={autoDetecting}
        >
          {autoDetecting ? '检测中...' : 'AI自动检测'}
        </button>
        <button
          className={styles.confirmBtn}
          disabled={!allDone}
          onClick={handleConfirm}
        >
          确认生成皮肤
        </button>
      </div>
      <div className={styles.hint}>
        点击上方标签切换部位 → 在图片上拖拽框选 → 全部标完后确认生成
      </div>
      {detectMsg && <div className={styles.detectMsg}>{detectMsg}</div>}
    </div>
  );
}

export default BodyPartSelector;
