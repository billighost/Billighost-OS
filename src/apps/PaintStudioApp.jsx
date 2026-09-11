import { useState, useRef, useEffect, useCallback } from 'react';
import { VFS } from '../services/storage/indexedDB';
import { LocalSettings } from '../services/storage/localStorage';
import { NotificationService } from '../services/notificationService';
import {
  BrushIcon, PenIcon, UndoIcon, RedoIcon, TrashIcon,
  SaveIcon, ImageIcon, CheckIcon,
} from '../components/Icons';
import styles from './PaintStudioApp.module.css';

const PRESET_COLORS = [
  '#000000', '#ffffff', '#7eb8ff', '#a78bfa',
  '#34d399', '#fbbf24', '#ff4d6a', '#94a3b8',
  '#00f3ff', '#ff007f', '#e2e8f0', '#1e293b',
];

const CANVAS_WIDTH = 760;
const CANVAS_HEIGHT = 480;

export default function PaintStudioApp({
  playClick = () => {},
  osModal,
}) {
  const canvasRef = useRef(null);
  const [currentTool, setCurrentTool] = useState('brush'); // 'pencil' | 'brush' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'circle' | 'fill'
  const [currentColor, setCurrentColor] = useState('#7eb8ff');
  const [brushSize, setBrushSize] = useState(6);
  const [opacity, setOpacity] = useState(100);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const isDrawingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const snapshotRef = useRef(null);

  // Initialize Canvas & Blank white background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Fill initial canvas with clean white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Save initial state
    const initialData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    historyRef.current = [initialData];
    historyIndexRef.current = 0;
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Truncate redo tree if needed
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(data);
    if (newHistory.length > 25) newHistory.shift(); // Limit to 25 history steps

    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      playClick();
      historyIndexRef.current -= 1;
      const targetState = historyRef.current[historyIndexRef.current];
      const ctx = canvasRef.current.getContext('2d');
      ctx.putImageData(targetState, 0, 0);
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(true);
    }
  }, [playClick]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      playClick();
      historyIndexRef.current += 1;
      const targetState = historyRef.current[historyIndexRef.current];
      const ctx = canvasRef.current.getContext('2d');
      ctx.putImageData(targetState, 0, 0);
      setCanUndo(true);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    }
  }, [playClick]);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e) => {
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    isDrawingRef.current = true;
    startPosRef.current = coords;

    if (currentTool === 'fill') {
      // Fill canvas with current color
      ctx.fillStyle = currentColor;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      saveState();
      isDrawingRef.current = false;
      return;
    }

    snapshotRef.current = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Setup brush styles
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentTool === 'pencil') {
      ctx.lineWidth = 2;
      ctx.strokeStyle = currentColor;
      ctx.globalAlpha = opacity / 100;
    } else if (currentTool === 'brush') {
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = currentColor;
      ctx.globalAlpha = opacity / 100;
    } else if (currentTool === 'highlighter') {
      ctx.lineWidth = Math.max(16, brushSize * 2);
      ctx.strokeStyle = currentColor;
      ctx.globalAlpha = 0.25;
    } else if (currentTool === 'eraser') {
      ctx.lineWidth = Math.max(12, brushSize * 1.5);
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 1.0;
    } else {
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = currentColor;
      ctx.fillStyle = currentColor;
      ctx.globalAlpha = opacity / 100;
    }

    if (currentTool === 'brush' || currentTool === 'pencil' || currentTool === 'highlighter' || currentTool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawingRef.current) return;
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (currentTool === 'brush' || currentTool === 'pencil' || currentTool === 'highlighter' || currentTool === 'eraser') {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (currentTool === 'line') {
      // Restore snapshot & preview line
      ctx.putImageData(snapshotRef.current, 0, 0);
      ctx.beginPath();
      ctx.moveTo(startPosRef.current.x, startPosRef.current.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (currentTool === 'rect') {
      // Restore snapshot & preview rect
      ctx.putImageData(snapshotRef.current, 0, 0);
      const w = coords.x - startPosRef.current.x;
      const h = coords.y - startPosRef.current.y;
      ctx.strokeRect(startPosRef.current.x, startPosRef.current.y, w, h);
    } else if (currentTool === 'circle') {
      // Restore snapshot & preview circle
      ctx.putImageData(snapshotRef.current, 0, 0);
      const rx = Math.abs(coords.x - startPosRef.current.x) / 2;
      const ry = Math.abs(coords.y - startPosRef.current.y) / 2;
      const cx = Math.min(startPosRef.current.x, coords.x) + rx;
      const cy = Math.min(startPosRef.current.y, coords.y) + ry;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
      ctx.stroke();
    }
  };

  const handleMouseUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const ctx = canvasRef.current.getContext('2d');
    ctx.closePath();
    ctx.globalAlpha = 1.0;
    saveState();
  };

  // Clear Canvas
  const handleClear = async () => {
    playClick();
    let confirmed = true;
    if (osModal) {
      confirmed = await osModal.showConfirm('Clear all artwork on canvas?', 'Clear Canvas');
    }
    if (confirmed) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      saveState();
      NotificationService.send({
        title: 'Canvas Cleared',
        message: 'Canvas reset to blank',
        type: 'info',
      });
    }
  };

  // Save Artwork to VFS (/Users/User/Pictures)
  const handleSaveToVFS = async () => {
    playClick();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const fileName = `Artwork_${Date.now()}.png`;
    const targetPath = `/Users/User/Pictures/${fileName}`;

    try {
      await VFS.writeFile(targetPath, dataUrl, 'image/png');
      NotificationService.send({
        title: 'Artwork Saved to Pictures',
        message: `Saved as ${fileName}`,
        type: 'success',
      });
    } catch (err) {
      NotificationService.send({
        title: 'Save Failed',
        message: err.message,
        type: 'error',
      });
    }
  };

  // Set artwork as desktop wallpaper
  const handleSetAsWallpaper = () => {
    playClick();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    LocalSettings.setAppearance({ customWallpaperData: dataUrl });
    NotificationService.send({
      title: 'Wallpaper Updated',
      message: 'Your canvas art is now your desktop wallpaper!',
      type: 'success',
    });
  };

  // Export / Download PNG to computer
  const handleDownload = () => {
    playClick();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Billighost_Art_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className={styles.container} data-testid="paint-studio-app">
      {/* Top Controls Toolbar */}
      <div className={styles.topToolbar}>
        <div className={styles.toolGroup}>
          <button
            className={styles.actionBtn}
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            data-testid="paint-undo-btn"
          >
            <UndoIcon size={14} /> Undo
          </button>
          <button
            className={styles.actionBtn}
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            data-testid="paint-redo-btn"
          >
            <RedoIcon size={14} /> Redo
          </button>
          <button
            className={`${styles.actionBtn} ${styles.btnDanger}`}
            onClick={handleClear}
            title="Clear Canvas"
          >
            <TrashIcon size={14} /> Clear
          </button>
        </div>

        <div className={styles.toolGroup}>
          <button
            className={`${styles.actionBtn} ${styles.btnAccent}`}
            onClick={handleSaveToVFS}
            title="Save PNG to /Users/User/Pictures"
            data-testid="paint-save-vfs-btn"
          >
            <SaveIcon size={14} /> Save to Pictures
          </button>
          <button
            className={styles.actionBtn}
            onClick={handleSetAsWallpaper}
            title="Set this drawing as your desktop wallpaper"
          >
            <ImageIcon size={14} /> Set as Wallpaper
          </button>
          <button
            className={styles.actionBtn}
            onClick={handleDownload}
            title="Download PNG to PC"
          >
            Export PNG
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className={styles.studioBody}>
        {/* Left Side Properties Toolbar */}
        <div className={styles.sidebar}>
          {/* Tool Selection */}
          <div>
            <div className={styles.sectionTitle}>Tools</div>
            <div className={styles.toolsGrid}>
              <button
                className={`${styles.toolButton} ${currentTool === 'pencil' ? styles.toolButtonActive : ''}`}
                onClick={() => { playClick(); setCurrentTool('pencil'); }}
                title="Pencil (Fine)"
              >
                <PenIcon size={16} /> Pencil
              </button>
              <button
                className={`${styles.toolButton} ${currentTool === 'brush' ? styles.toolButtonActive : ''}`}
                onClick={() => { playClick(); setCurrentTool('brush'); }}
                title="Smooth Brush"
              >
                <BrushIcon size={16} /> Brush
              </button>
              <button
                className={`${styles.toolButton} ${currentTool === 'highlighter' ? styles.toolButtonActive : ''}`}
                onClick={() => { playClick(); setCurrentTool('highlighter'); }}
                title="Highlighter"
              >
                Highlight
              </button>
              <button
                className={`${styles.toolButton} ${currentTool === 'eraser' ? styles.toolButtonActive : ''}`}
                onClick={() => { playClick(); setCurrentTool('eraser'); }}
                title="Eraser"
              >
                Eraser
              </button>
              <button
                className={`${styles.toolButton} ${currentTool === 'line' ? styles.toolButtonActive : ''}`}
                onClick={() => { playClick(); setCurrentTool('line'); }}
                title="Straight Line"
              >
                Line
              </button>
              <button
                className={`${styles.toolButton} ${currentTool === 'rect' ? styles.toolButtonActive : ''}`}
                onClick={() => { playClick(); setCurrentTool('rect'); }}
                title="Rectangle"
              >
                Rect
              </button>
              <button
                className={`${styles.toolButton} ${currentTool === 'circle' ? styles.toolButtonActive : ''}`}
                onClick={() => { playClick(); setCurrentTool('circle'); }}
                title="Circle"
              >
                Circle
              </button>
              <button
                className={`${styles.toolButton} ${currentTool === 'fill' ? styles.toolButtonActive : ''}`}
                onClick={() => { playClick(); setCurrentTool('fill'); }}
                title="Fill Canvas"
              >
                Fill
              </button>
            </div>
          </div>

          {/* Color Presets */}
          <div>
            <div className={styles.sectionTitle}>Colors</div>
            <div className={styles.colorPalette}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  className={`${styles.colorSwatch} ${currentColor === c ? styles.colorSwatchActive : ''}`}
                  style={{ background: c }}
                  onClick={() => { playClick(); setCurrentColor(c); }}
                />
              ))}
            </div>
            <div className={styles.customColorRow}>
              <input
                type="color"
                className={styles.colorInput}
                value={currentColor}
                onChange={(e) => setCurrentColor(e.target.value)}
              />
              <span className={styles.colorHex}>{currentColor.toUpperCase()}</span>
            </div>
          </div>

          {/* Brush Size Slider */}
          <div className={styles.sliderControl}>
            <div className={styles.sliderHeader}>
              <span>Brush Size</span>
              <span>{brushSize}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="48"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
              className={styles.rangeInput}
            />
          </div>

          {/* Opacity Slider */}
          <div className={styles.sliderControl}>
            <div className={styles.sliderHeader}>
              <span>Opacity</span>
              <span>{opacity}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={opacity}
              onChange={(e) => setOpacity(parseInt(e.target.value, 10))}
              className={styles.rangeInput}
            />
          </div>

          {/* Stroke Preview */}
          <div className={styles.brushPreviewContainer}>
            <div
              className={styles.brushPreviewDot}
              style={{
                width: `${Math.min(44, Math.max(4, brushSize))}px`,
                height: `${Math.min(44, Math.max(4, brushSize))}px`,
                background: currentColor,
                opacity: opacity / 100,
              }}
            />
          </div>
        </div>

        {/* Canvas Center Viewport */}
        <div className={styles.canvasViewport}>
          <div className={styles.canvasWrapper}>
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className={styles.drawingCanvas}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              data-testid="paint-canvas"
            />
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className={styles.statusBar}>
        <span>Canvas: {CANVAS_WIDTH} × {CANVAS_HEIGHT} px</span>
        <span>Tool: {currentTool.toUpperCase()} | Color: {currentColor}</span>
        <span>Billighost Paint Studio</span>
      </div>
    </div>
  );
}
