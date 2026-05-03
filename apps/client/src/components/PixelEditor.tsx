import { useState, useRef, useEffect, useCallback } from 'react';
import { Color } from '@/utils/colorUtils';
import { SKIN_WIDTH, SKIN_HEIGHT } from '@/utils/skinTemplate';
import styles from './PixelEditor.module.css';

export interface Tool {
  id: string;
  name: string;
  cursor: string;
  shortcut?: string;
}

export const TOOLS: Tool[] = [
  { id: 'pencil', name: '画笔', cursor: 'crosshair', shortcut: 'B' },
  { id: 'eraser', name: '橡皮擦', cursor: 'crosshair', shortcut: 'E' },
  { id: 'fill', name: '油漆桶', cursor: 'crosshair', shortcut: 'G' },
  { id: 'picker', name: '取色器', cursor: 'crosshair', shortcut: 'I' },
  { id: 'select', name: '框选', cursor: 'crosshair', shortcut: 'M' },
];

interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [currentTool, setCurrentTool] = useState<string>('pencil');
  const [currentColor, setCurrentColor] = useState<Color>({ r: 0, g: 0, b: 0, a: 255 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);

  const [selection, setSelection] = useState<Selection | null>(null);
  const [selectStart, setSelectStart] = useState<{ x: number; y: number } | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [clipboard, setClipboard] = useState<ImageData | null>(null);
  const [previewSel, setPreviewSel] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

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

  useEffect(() => {
    const ov = overlayRef.current;
    if (!ov) return;
    ov.width = SKIN_WIDTH * pixelSize;
    ov.height = SKIN_HEIGHT * pixelSize;

    const ctx = ov.getContext('2d')!;
    ctx.clearRect(0, 0, ov.width, ov.height);

    if (selection) {
      ctx.strokeStyle = '#40a9ff';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(
        selection.x * pixelSize + 0.5,
        selection.y * pixelSize + 0.5,
        selection.width * pixelSize - 1,
        selection.height * pixelSize - 1
      );
      ctx.setLineDash([]);
    }

    if (previewSel) {
      ctx.strokeStyle = '#ff7875';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.strokeRect(
        previewSel.x * pixelSize + 0.5,
        previewSel.y * pixelSize + 0.5,
        previewSel.w * pixelSize - 1,
        previewSel.h * pixelSize - 1
      );
      ctx.setLineDash([]);
    }
  }, [selection, previewSel, pixelSize]);

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

  const copySelection = useCallback(() => {
    if (!selection || !imageData) return;
    const w = selection.width;
    const h = selection.height;
    const copy = new ImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const si = ((selection.y + y) * SKIN_WIDTH + (selection.x + x)) * 4;
        const di = (y * w + x) * 4;
        copy.data[di] = imageData.data[si];
        copy.data[di + 1] = imageData.data[si + 1];
        copy.data[di + 2] = imageData.data[si + 2];
        copy.data[di + 3] = imageData.data[si + 3];
      }
    }
    setClipboard(copy);
    setPreviewSel({ x: selection.x, y: selection.y, w, h });
  }, [selection, imageData]);

  const cutSelection = useCallback(() => {
    if (!selection || !imageData) return;
    copySelection();
    const newData = new ImageData(SKIN_WIDTH, SKIN_HEIGHT);
    newData.data.set(imageData.data);
    for (let y = 0; y < selection.height; y++) {
      for (let x = 0; x < selection.width; x++) {
        setPixel(newData, selection.x + x, selection.y + y, { r: 0, g: 0, b: 0, a: 0 });
      }
    }
    setImageData(newData);
    const ctx = canvasRef.current!.getContext('2d')!;
    drawCanvas(ctx, newData);
    saveToHistory(newData);
    onImageChange?.(newData);
  }, [selection, imageData, copySelection, setPixel, drawCanvas, saveToHistory, onImageChange]);

  const pasteSelection = useCallback(() => {
    if (!clipboard || !imageData) return;
    const newData = new ImageData(SKIN_WIDTH, SKIN_HEIGHT);
    newData.data.set(imageData.data);
    const px = selection?.x ?? 0;
    const py = selection?.y ?? 0;
    const cw = Math.min(clipboard.width, SKIN_WIDTH - px);
    const ch = Math.min(clipboard.height, SKIN_HEIGHT - py);
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const si = (y * clipboard.width + x) * 4;
        const a = clipboard.data[si + 3];
        if (a > 0) {
          const di = ((py + y) * SKIN_WIDTH + (px + x)) * 4;
          newData.data[di] = clipboard.data[si];
          newData.data[di + 1] = clipboard.data[si + 1];
          newData.data[di + 2] = clipboard.data[si + 2];
          newData.data[di + 3] = clipboard.data[si + 3];
        }
      }
    }
    setImageData(newData);
    const ctx = canvasRef.current!.getContext('2d')!;
    drawCanvas(ctx, newData);
    saveToHistory(newData);
    onImageChange?.(newData);
    setSelection({ x: px, y: py, width: cw, height: ch });
  }, [clipboard, imageData, selection, drawCanvas, saveToHistory, onImageChange]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      copySelection();
    } else if (e.ctrlKey && e.key === 'x') {
      e.preventDefault();
      cutSelection();
    } else if (e.ctrlKey && e.key === 'v') {
      e.preventDefault();
      pasteSelection();
    } else if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      undo();
    } else if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      redo();
    }
  }, [copySelection, cutSelection, pasteSelection]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageData) return;

    const { x, y } = getPixelCoords(e);

    if (currentTool === 'select') {
      setSelectStart({ x, y });
      setSelecting(true);
      setSelection(null);
      return;
    }

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
    const { x, y } = getPixelCoords(e);

    if (selecting && selectStart) {
      const sx = Math.min(selectStart.x, x);
      const sy = Math.min(selectStart.y, y);
      const sw = Math.abs(x - selectStart.x) + 1;
      const sh = Math.abs(y - selectStart.y) + 1;
      setPreviewSel({ x: sx, y: sy, w: sw, h: sh });
      return;
    }

    if (!isDrawing || !imageData || currentTool === 'fill' || currentTool === 'picker' || currentTool === 'select') return;

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
  }, [isDrawing, imageData, currentTool, currentColor, setPixel, drawCanvas, pixelSize, selecting, selectStart]);

  const handleMouseUp = useCallback(() => {
    if (selecting && selectStart && previewSel) {
      setSelection({ x: previewSel.x, y: previewSel.y, width: previewSel.w, height: previewSel.h });
      setSelecting(false);
      setSelectStart(null);
      setPreviewSel(null);
      return;
    }

    if (isDrawing && imageData) {
      saveToHistory(imageData);
      onImageChange?.(imageData);
    }
    setIsDrawing(false);
  }, [isDrawing, imageData, saveToHistory, onImageChange, selecting, selectStart, previewSel]);

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
    setSelection(null);
    setClipboard(null);
  }, [drawCanvas, saveToHistory, onImageChange]);

  const deselect = useCallback(() => {
    setSelection(null);
    setPreviewSel(null);
  }, []);

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar}>
        <div className={styles.tools}>
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              className={`${styles.toolButton} ${currentTool === tool.id ? styles.active : ''}`}
              onClick={() => setCurrentTool(tool.id)}
              title={`${tool.name}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
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
          <button onClick={undo} disabled={historyIndex <= 0} title="Ctrl+Z">撤销</button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} title="Ctrl+Y">重做</button>
          <button onClick={clear}>清空</button>
          <button onClick={() => setShowGrid(!showGrid)}>
            {showGrid ? '隐藏网格' : '显示网格'}
          </button>
          {selection && (
            <>
              <button onClick={deselect}>取消选择</button>
              <button onClick={copySelection}>复制</button>
              <button onClick={cutSelection}>剪切</button>
            </>
          )}
          {clipboard && <button onClick={pasteSelection}>粘贴</button>}
        </div>

        <div className={styles.zoom}>
          <button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>-</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(3, zoom + 0.25))}>+</button>
        </div>
      </div>

      <div className={styles.canvasWrap} style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
        <div className={styles.canvasStack}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          <canvas
            ref={overlayRef}
            className={styles.overlay}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
      </div>
    </div>
  );
}

export default PixelEditor;
