import { useState, useRef, useEffect, useCallback } from 'react';
import { Color } from '@/utils/colorUtils';
import { SKIN_WIDTH, SKIN_HEIGHT } from '@/utils/skinTemplate';
import styles from './PixelEditor.module.css';

export interface Tool {
  id: string;
  name: string;
  cursor: string;
}

export const TOOLS: Tool[] = [
  { id: 'pencil', name: '画笔', cursor: 'crosshair' },
  { id: 'eraser', name: '橡皮擦', cursor: 'crosshair' },
  { id: 'fill', name: '填充', cursor: 'crosshair' },
  { id: 'picker', name: '取色器', cursor: 'crosshair' },
];

interface PixelEditorProps {
  initialImageData?: ImageData;
  onImageChange?: (imageData: ImageData) => void;
  width?: number;
  height?: number;
}

export function PixelEditor({
  initialImageData,
  onImageChange,
  width = 512,
  height = 512,
}: PixelEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [currentTool, setCurrentTool] = useState<string>('pencil');
  const [currentColor, setCurrentColor] = useState<Color>({ r: 0, g: 0, b: 0, a: 255 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);

  const pixelSize = Math.floor(Math.min(width, height) / SKIN_WIDTH);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = SKIN_WIDTH * pixelSize;
    canvas.height = SKIN_HEIGHT * pixelSize;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    if (initialImageData) {
      setImageData(initialImageData);
      drawCanvas(ctx, initialImageData);
    } else {
      const emptyData = new ImageData(SKIN_WIDTH, SKIN_HEIGHT);
      setImageData(emptyData);
      drawCanvas(ctx, emptyData);
      saveToHistory(emptyData);
    }
  }, [initialImageData, pixelSize]);

  const drawCanvas = useCallback((ctx: CanvasRenderingContext2D, data: ImageData) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = SKIN_WIDTH;
    tempCanvas.height = SKIN_HEIGHT;
    tempCanvas.getContext('2d')!.putImageData(data, 0, 0);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, SKIN_WIDTH * pixelSize, SKIN_HEIGHT * pixelSize);

    if (showGrid) {
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
      ctx.lineWidth = 1;

      for (let x = 0; x <= SKIN_WIDTH; x++) {
        ctx.beginPath();
        ctx.moveTo(x * pixelSize, 0);
        ctx.lineTo(x * pixelSize, SKIN_HEIGHT * pixelSize);
        ctx.stroke();
      }

      for (let y = 0; y <= SKIN_HEIGHT; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * pixelSize);
        ctx.lineTo(SKIN_WIDTH * pixelSize, y * pixelSize);
        ctx.stroke();
      }
    }
  }, [pixelSize, showGrid]);

  const saveToHistory = useCallback((data: ImageData) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(data);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const getPixelCoords = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / pixelSize);
    const y = Math.floor((e.clientY - rect.top) / pixelSize);
    return { x: Math.max(0, Math.min(SKIN_WIDTH - 1, x)), y: Math.max(0, Math.min(SKIN_HEIGHT - 1, y)) };
  };

  const setPixel = useCallback((data: ImageData, x: number, y: number, color: Color) => {
    const index = (y * SKIN_WIDTH + x) * 4;
    data.data[index] = color.r;
    data.data[index + 1] = color.g;
    data.data[index + 2] = color.b;
    data.data[index + 3] = color.a;
  }, []);

  const getPixel = useCallback((data: ImageData, x: number, y: number): Color => {
    const index = (y * SKIN_WIDTH + x) * 4;
    return {
      r: data.data[index],
      g: data.data[index + 1],
      b: data.data[index + 2],
      a: data.data[index + 3],
    };
  }, []);

  const floodFill = useCallback((data: ImageData, startX: number, startY: number, fillColor: Color) => {
    const targetColor = getPixel(data, startX, startY);
    if (targetColor.r === fillColor.r && targetColor.g === fillColor.g && 
        targetColor.b === fillColor.b && targetColor.a === fillColor.a) {
      return;
    }

    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      if (x < 0 || x >= SKIN_WIDTH || y < 0 || y >= SKIN_HEIGHT) continue;

      const currentColor = getPixel(data, x, y);
      if (currentColor.r !== targetColor.r || currentColor.g !== targetColor.g ||
          currentColor.b !== targetColor.b || currentColor.a !== targetColor.a) {
        continue;
      }

      visited.add(key);
      setPixel(data, x, y, fillColor);

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }, [getPixel, setPixel]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageData) return;

    const { x, y } = getPixelCoords(e);
    const newData = new ImageData(SKIN_WIDTH, SKIN_HEIGHT);
    newData.data.set(imageData.data);

    switch (currentTool) {
      case 'pencil':
        setPixel(newData, x, y, currentColor);
        break;
      case 'eraser':
        setPixel(newData, x, y, { r: 0, g: 0, b: 0, a: 0 });
        break;
      case 'fill':
        floodFill(newData, x, y, currentColor);
        break;
      case 'picker':
        const pickedColor = getPixel(imageData, x, y);
        setCurrentColor(pickedColor);
        return;
    }

    setImageData(newData);
    const ctx = canvasRef.current!.getContext('2d')!;
    drawCanvas(ctx, newData);
    setIsDrawing(true);
  }, [imageData, currentTool, currentColor, setPixel, floodFill, getPixel, drawCanvas, pixelSize]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !imageData || currentTool === 'fill' || currentTool === 'picker') return;

    const { x, y } = getPixelCoords(e);
    const newData = new ImageData(SKIN_WIDTH, SKIN_HEIGHT);
    newData.data.set(imageData.data);

    if (currentTool === 'pencil') {
      setPixel(newData, x, y, currentColor);
    } else if (currentTool === 'eraser') {
      setPixel(newData, x, y, { r: 0, g: 0, b: 0, a: 0 });
    }

    setImageData(newData);
    const ctx = canvasRef.current!.getContext('2d')!;
    drawCanvas(ctx, newData);
  }, [isDrawing, imageData, currentTool, currentColor, setPixel, drawCanvas, pixelSize]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing && imageData) {
      saveToHistory(imageData);
      onImageChange?.(imageData);
    }
    setIsDrawing(false);
  }, [isDrawing, imageData, saveToHistory, onImageChange]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const data = history[newIndex];
      setImageData(data);
      const ctx = canvasRef.current!.getContext('2d')!;
      drawCanvas(ctx, data);
      onImageChange?.(data);
    }
  }, [historyIndex, history, drawCanvas, onImageChange]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const data = history[newIndex];
      setImageData(data);
      const ctx = canvasRef.current!.getContext('2d')!;
      drawCanvas(ctx, data);
      onImageChange?.(data);
    }
  }, [historyIndex, history, drawCanvas, onImageChange]);

  const clear = useCallback(() => {
    const emptyData = new ImageData(SKIN_WIDTH, SKIN_HEIGHT);
    setImageData(emptyData);
    const ctx = canvasRef.current!.getContext('2d')!;
    drawCanvas(ctx, emptyData);
    saveToHistory(emptyData);
    onImageChange?.(emptyData);
  }, [drawCanvas, saveToHistory, onImageChange]);

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar}>
        <div className={styles.tools}>
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              className={`${styles.toolButton} ${currentTool === tool.id ? styles.active : ''}`}
              onClick={() => setCurrentTool(tool.id)}
              title={tool.name}
            >
              {tool.name}
            </button>
          ))}
        </div>

        <div className={styles.colorPicker}>
          <input
            type="color"
            value={`#${currentColor.r.toString(16).padStart(2, '0')}${currentColor.g.toString(16).padStart(2, '0')}${currentColor.b.toString(16).padStart(2, '0')}`}
            onChange={(e) => {
              const hex = e.target.value.slice(1);
              setCurrentColor({
                r: parseInt(hex.slice(0, 2), 16),
                g: parseInt(hex.slice(2, 4), 16),
                b: parseInt(hex.slice(4, 6), 16),
                a: 255,
              });
            }}
          />
          <div
            className={styles.colorPreview}
            style={{ backgroundColor: `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${currentColor.a / 255})` }}
          />
        </div>

        <div className={styles.actions}>
          <button onClick={undo} disabled={historyIndex <= 0}>撤销</button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1}>重做</button>
          <button onClick={clear}>清空</button>
          <button onClick={() => setShowGrid(!showGrid)}>
            {showGrid ? '隐藏网格' : '显示网格'}
          </button>
        </div>

        <div className={styles.zoom}>
          <button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>-</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(3, zoom + 0.25))}>+</button>
        </div>
      </div>

      <div className={styles.canvasContainer} style={{ transform: `scale(${zoom})` }}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
    </div>
  );
}

export default PixelEditor;
