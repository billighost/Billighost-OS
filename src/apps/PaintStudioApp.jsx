import { useState, useRef, useEffect, useCallback } from 'react';
import { VFS } from '../services/storage/indexedDB';
import { LocalSettings } from '../services/storage/localStorage';
import { NotificationService } from '../services/notificationService';
import {
  BrushIcon, PenIcon, UndoIcon, RedoIcon, TrashIcon,
  SaveIcon, ImageIcon, DownloadIcon,
} from '../components/Icons';
import styles from './PaintStudioApp.module.css';

const PRESET_COLORS = [
  '#000000', '#ffffff', '#7eb8ff', '#a78bfa',
  '#34d399', '#fbbf24', '#ff4d6a', '#94a3b8',
  '#00f3ff', '#ff007f', '#e2e8f0', '#1e293b',
  '#f97316', '#06b6d4', '#10b981', '#8b5cf6',
  '#ec4899', '#f43f5e', '#64748b', '#3b82f6',
];

const CANVAS_PRESETS = [
  { name: 'Standard', width: 760, height: 480 },
  { name: 'Square', width: 600, height: 600 },
  { name: 'HD 16:9', width: 960, height: 540 },
  { name: 'Banner', width: 840, height: 320 },
];

const FONT_FAMILIES = [
  { name: 'Display', value: 'Inter, system-ui, sans-serif' },
  { name: 'Monospace', value: '"JetBrains Mono", monospace' },
  { name: 'Serif', value: 'Georgia, serif' },
  { name: 'Bold Impact', value: 'Impact, sans-serif' },
  { name: 'Cursive', value: 'Brush Script MT, cursive' },
];

export default function PaintStudioApp({
  playClick = () => {},
  osModal,
}) {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Dimensions
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 760, height: 480 });
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showGrid, setShowGrid] = useState(false);
  const [bgStyle, setBgStyle] = useState('white'); // 'white' | 'dark' | 'checker'

  // Tools & Properties
  // 'pencil' | 'brush' | 'airbrush' | 'highlighter' | 'eraser' | 'fill' | 'picker' | 'text' | 'line' | 'rect' | 'roundrect' | 'circle' | 'triangle' | 'star' | 'arrow'
  const [currentTool, setCurrentTool] = useState('brush');
  const [shapeMode, setShapeMode] = useState('stroke'); // 'stroke' | 'fill'
  const [currentColor, setCurrentColor] = useState('#7eb8ff');
  const [secondaryColor, setSecondaryColor] = useState('#ffffff');
  const [colorHistory, setColorHistory] = useState(['#7eb8ff', '#ffffff', '#000000', '#ff4d6a']);
  const [brushSize, setBrushSize] = useState(8);
  const [opacity, setOpacity] = useState(100);
  const [sprayDensity, setSprayDensity] = useState(25);

  // Text Tool State
  const [textInput, setTextInput] = useState('Billighost');
  const [fontSize, setFontSize] = useState(28);
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0].value);
  const [isBold, setIsBold] = useState(true);
  const [isItalic, setIsItalic] = useState(false);
  const [activeTab, setActiveTab] = useState('tools'); // 'tools' | 'shapes' | 'text' | 'filters' | 'canvas'

  // History & Undo/Redo
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);

  // Drawing Refs
  const isDrawingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const snapshotRef = useRef(null);
  const sprayIntervalRef = useRef(null);

  // Coordinates helper taking zoom into account
  const getCanvasCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasDimensions.width / rect.width;
    const scaleY = canvasDimensions.height / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  }, [canvasDimensions]);

  // Save State
  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvasDimensions.width, canvasDimensions.height);

    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(data);
    if (newHistory.length > 30) newHistory.shift();

    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, [canvasDimensions]);

  // Canvas Initializer
  const initCanvas = useCallback((width, height, background = bgStyle) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    if (background === 'dark') {
      ctx.fillStyle = '#0f111a';
    } else if (background === 'checker') {
      ctx.clearRect(0, 0, width, height);
    } else {
      ctx.fillStyle = '#ffffff';
    }

    if (background !== 'checker') {
      ctx.fillRect(0, 0, width, height);
    }

    const initialData = ctx.getImageData(0, 0, width, height);
    historyRef.current = [initialData];
    historyIndexRef.current = 0;
    setCanUndo(false);
    setCanRedo(false);
  }, [bgStyle]);

  useEffect(() => {
    initCanvas(canvasDimensions.width, canvasDimensions.height);
  }, [initCanvas, canvasDimensions.width, canvasDimensions.height]);

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

  // Remember color in history
  const selectColor = useCallback((color) => {
    playClick();
    setCurrentColor(color);
    setColorHistory(prev => {
      if (prev.includes(color)) return prev;
      return [color, ...prev.slice(0, 7)];
    });
  }, [playClick]);

  const swapColors = useCallback(() => {
    playClick();
    setCurrentColor(c => {
      const nextSecondary = c;
      setSecondaryColor(nextSecondary);
      return secondaryColor;
    });
  }, [playClick, secondaryColor]);

  // Save to VFS
  const handleSaveToVFS = useCallback(async () => {
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
  }, [playClick]);

  // Helper to draw geometric shapes
  const drawShapePreview = (ctx, type, startX, startY, curX, curY, isFill) => {
    ctx.beginPath();
    if (type === 'line') {
      ctx.moveTo(startX, startY);
      ctx.lineTo(curX, curY);
      ctx.stroke();
      return;
    }

    if (type === 'rect') {
      const w = curX - startX;
      const h = curY - startY;
      if (isFill) ctx.fillRect(startX, startY, w, h);
      else ctx.strokeRect(startX, startY, w, h);
      return;
    }

    if (type === 'roundrect') {
      const w = curX - startX;
      const h = curY - startY;
      const r = Math.min(20, Math.abs(w) / 4, Math.abs(h) / 4);
      if (ctx.roundRect) {
        ctx.roundRect(startX, startY, w, h, r);
      } else {
        ctx.rect(startX, startY, w, h);
      }
      if (isFill) ctx.fill();
      else ctx.stroke();
      return;
    }

    if (type === 'circle') {
      const rx = Math.abs(curX - startX) / 2;
      const ry = Math.abs(curY - startY) / 2;
      const cx = Math.min(startX, curX) + rx;
      const cy = Math.min(startY, curY) + ry;
      ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
      if (isFill) ctx.fill();
      else ctx.stroke();
      return;
    }

    if (type === 'triangle') {
      ctx.moveTo(startX + (curX - startX) / 2, startY);
      ctx.lineTo(curX, curY);
      ctx.lineTo(startX, curY);
      ctx.closePath();
      if (isFill) ctx.fill();
      else ctx.stroke();
      return;
    }

    if (type === 'star') {
      const cx = (startX + curX) / 2;
      const cy = (startY + curY) / 2;
      const outerR = Math.max(10, Math.abs(curX - startX) / 2);
      const innerR = outerR * 0.45;
      const points = 5;
      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      if (isFill) ctx.fill();
      else ctx.stroke();
      return;
    }

    if (type === 'arrow') {
      const headLen = Math.min(24, Math.hypot(curX - startX, curY - startY) / 3);
      const angle = Math.atan2(curY - startY, curX - startX);
      ctx.moveTo(startX, startY);
      ctx.lineTo(curX, curY);
      ctx.lineTo(curX - headLen * Math.cos(angle - Math.PI / 6), curY - headLen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(curX, curY);
      ctx.lineTo(curX - headLen * Math.cos(angle + Math.PI / 6), curY - headLen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    }
  };

  // Mouse Down handler
  const handleMouseDown = (e) => {
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Color Picker Tool
    if (currentTool === 'picker') {
      const pixel = ctx.getImageData(coords.x, coords.y, 1, 1).data;
      const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;
      selectColor(hex);
      NotificationService.send({
        title: 'Color Picked',
        message: `Sampled color ${hex.toUpperCase()}`,
        type: 'info',
      });
      return;
    }

    // Text Tool Click
    if (currentTool === 'text') {
      ctx.save();
      ctx.font = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}${fontSize}px ${fontFamily}`;
      ctx.fillStyle = currentColor;
      ctx.globalAlpha = opacity / 100;
      ctx.fillText(textInput || 'Billighost', coords.x, coords.y);
      ctx.restore();
      saveState();
      return;
    }

    // Fill tool (flood fill canvas with active color)
    if (currentTool === 'fill') {
      ctx.fillStyle = currentColor;
      ctx.fillRect(0, 0, canvasDimensions.width, canvasDimensions.height);
      saveState();
      return;
    }

    isDrawingRef.current = true;
    startPosRef.current = coords;
    snapshotRef.current = ctx.getImageData(0, 0, canvasDimensions.width, canvasDimensions.height);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentTool === 'pencil') {
      ctx.lineWidth = Math.min(3, brushSize);
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
      ctx.lineWidth = Math.max(10, brushSize * 1.5);
      ctx.strokeStyle = bgStyle === 'dark' ? '#0f111a' : '#ffffff';
      ctx.globalAlpha = 1.0;
    } else if (currentTool === 'airbrush') {
      // Setup continuous spray
      const spray = () => {
        if (!isDrawingRef.current) return;
        const radius = brushSize * 1.5;
        ctx.fillStyle = currentColor;
        ctx.globalAlpha = (opacity / 100) * 0.2;
        for (let i = 0; i < sprayDensity; i++) {
          const r = Math.random() * radius;
          const theta = Math.random() * 2 * Math.PI;
          const x = startPosRef.current.x + r * Math.cos(theta);
          const y = startPosRef.current.y + r * Math.sin(theta);
          ctx.fillRect(x, y, 1.5, 1.5);
        }
      };
      spray();
      sprayIntervalRef.current = setInterval(spray, 30);
      return;
    } else {
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = currentColor;
      ctx.fillStyle = currentColor;
      ctx.globalAlpha = opacity / 100;
    }

    if (['brush', 'pencil', 'highlighter', 'eraser'].includes(currentTool)) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  // Mouse Move handler
  const handleMouseMove = (e) => {
    if (!isDrawingRef.current) return;
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (currentTool === 'airbrush') {
      startPosRef.current = coords;
      return;
    }

    if (['brush', 'pencil', 'highlighter', 'eraser'].includes(currentTool)) {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (['line', 'rect', 'roundrect', 'circle', 'triangle', 'star', 'arrow'].includes(currentTool)) {
      ctx.putImageData(snapshotRef.current, 0, 0);
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = currentColor;
      ctx.fillStyle = currentColor;
      ctx.globalAlpha = opacity / 100;
      drawShapePreview(
        ctx,
        currentTool,
        startPosRef.current.x,
        startPosRef.current.y,
        coords.x,
        coords.y,
        shapeMode === 'fill'
      );
    }
  };

  // Mouse Up handler
  const handleMouseUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (sprayIntervalRef.current) {
      clearInterval(sprayIntervalRef.current);
      sprayIntervalRef.current = null;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.closePath();
    ctx.globalAlpha = 1.0;
    saveState();
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept when typing in text input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveToVFS();
      } else if (e.key === 'b' || e.key === 'B') {
        setCurrentTool('brush');
      } else if (e.key === 'p' || e.key === 'P') {
        setCurrentTool('pencil');
      } else if (e.key === 'e' || e.key === 'E') {
        setCurrentTool('eraser');
      } else if (e.key === 'a' || e.key === 'A') {
        setCurrentTool('airbrush');
      } else if (e.key === 'i' || e.key === 'I') {
        setCurrentTool('picker');
      } else if (e.key === 't' || e.key === 'T') {
        setCurrentTool('text');
        setActiveTab('text');
      } else if (e.key === 'x' || e.key === 'X') {
        swapColors();
      } else if (e.key === '[') {
        setBrushSize(b => Math.max(1, b - 2));
      } else if (e.key === ']') {
        setBrushSize(b => Math.min(64, b + 2));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleSaveToVFS, swapColors]);

  // Image Filters Engine
  const applyFilter = (filterType) => {
    playClick();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvasDimensions;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    if (filterType === 'grayscale') {
      for (let i = 0; i < data.length; i += 4) {
        const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = avg;
        data[i + 1] = avg;
        data[i + 2] = avg;
      }
    } else if (filterType === 'invert') {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
      }
    } else if (filterType === 'sepia') {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        data[i] = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
        data[i + 1] = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
        data[i + 2] = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
      }
    } else if (filterType === 'brightness') {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] + 30);
        data[i + 1] = Math.min(255, data[i + 1] + 30);
        data[i + 2] = Math.min(255, data[i + 2] + 30);
      }
    } else if (filterType === 'contrast') {
      const factor = (259 * (128 + 50)) / (255 * (259 - 50));
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
        data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
        data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
      }
    } else if (filterType === 'tint') {
      const c = currentColor;
      const tr = parseInt(c.slice(1, 3), 16) || 126;
      const tg = parseInt(c.slice(3, 5), 16) || 184;
      const tb = parseInt(c.slice(5, 7), 16) || 255;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = (data[i] + tr) / 2;
        data[i + 1] = (data[i + 1] + tg) / 2;
        data[i + 2] = (data[i + 2] + tb) / 2;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    saveState();
    NotificationService.send({
      title: 'Filter Applied',
      message: `Canvas transformed with ${filterType}`,
      type: 'info',
    });
  };

  // Image Import handler
  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const scale = Math.min(1, canvasDimensions.width / img.width, canvasDimensions.height / img.height);
        const nw = img.width * scale;
        const nh = img.height * scale;
        const nx = (canvasDimensions.width - nw) / 2;
        const ny = (canvasDimensions.height - nh) / 2;

        ctx.drawImage(img, nx, ny, nw, nh);
        saveState();
        NotificationService.send({
          title: 'Image Imported',
          message: `Imported ${file.name} to canvas`,
          type: 'success',
        });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Clear Canvas
  const handleClear = async () => {
    playClick();
    let confirmed = true;
    if (osModal) {
      confirmed = await osModal.showConfirm('Clear entire artwork from canvas?', 'Clear Canvas');
    }
    if (confirmed) {
      initCanvas(canvasDimensions.width, canvasDimensions.height, bgStyle);
      NotificationService.send({
        title: 'Canvas Cleared',
        message: 'Artboard reset to fresh canvas',
        type: 'info',
      });
    }
  };

  // Change Canvas Size Preset
  const handlePresetSelect = (preset) => {
    playClick();
    setCanvasDimensions({ width: preset.width, height: preset.height });
  };

  // Set as Wallpaper
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

  // Export PNG to computer
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

  // Copy to Clipboard
  const handleCopyToClipboard = async () => {
    playClick();
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        NotificationService.send({
          title: 'Copied to Clipboard',
          message: 'Canvas image copied as PNG',
          type: 'success',
        });
      });
    } catch {
      NotificationService.send({
        title: 'Copy Notice',
        message: 'Direct clipboard copy unsupported by browser',
        type: 'info',
      });
    }
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
          <div className={styles.divider} />
          <button
            className={`${styles.actionBtn} ${styles.btnDanger}`}
            onClick={handleClear}
            title="Clear Canvas"
          >
            <TrashIcon size={14} /> Clear
          </button>
        </div>

        {/* Zoom Controls */}
        <div className={styles.toolGroup}>
          <button
            className={styles.zoomBtn}
            onClick={() => setZoomLevel(z => Math.max(50, z - 25))}
            title="Zoom Out (-)"
          >
            -
          </button>
          <span className={styles.zoomLabel}>{zoomLevel}%</span>
          <button
            className={styles.zoomBtn}
            onClick={() => setZoomLevel(z => Math.min(300, z + 25))}
            title="Zoom In (+)"
          >
            +
          </button>
          <button
            className={`${styles.actionBtn} ${showGrid ? styles.btnActive : ''}`}
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle Pixel / Alignment Grid"
          >
            # Grid
          </button>
        </div>

        {/* Export / Storage Actions */}
        <div className={styles.toolGroup}>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleImportFile}
          />
          <button
            className={styles.actionBtn}
            onClick={() => fileInputRef.current?.click()}
            title="Import Image from Disk to Canvas"
          >
            Import
          </button>
          <button
            className={styles.actionBtn}
            onClick={handleCopyToClipboard}
            title="Copy Image to System Clipboard"
          >
            Copy
          </button>
          <button
            className={`${styles.actionBtn} ${styles.btnAccent}`}
            onClick={handleSaveToVFS}
            title="Save PNG to /Users/User/Pictures"
            data-testid="paint-save-vfs-btn"
          >
            <SaveIcon size={14} /> Save
          </button>
          <button
            className={styles.actionBtn}
            onClick={handleSetAsWallpaper}
            title="Set this drawing as your desktop wallpaper"
          >
            <ImageIcon size={14} /> Wallpaper
          </button>
          <button
            className={styles.actionBtn}
            onClick={handleDownload}
            title="Download PNG to PC"
          >
            <DownloadIcon size={14} /> Export
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className={styles.studioBody}>
        {/* Left Side Properties Toolbar */}
        <div className={styles.sidebar}>
          {/* Navigation Tabs */}
          <div className={styles.navTabs}>
            <button
              className={`${styles.tabBtn} ${activeTab === 'tools' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('tools')}
            >
              Draw
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'shapes' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('shapes')}
            >
              Shapes
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'text' ? styles.tabBtnActive : ''}`}
              onClick={() => { setActiveTab('text'); setCurrentTool('text'); }}
            >
              Text
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'filters' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('filters')}
            >
              FX
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'canvas' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('canvas')}
            >
              Setup
            </button>
          </div>

          {/* TAB: TOOLS */}
          {activeTab === 'tools' && (
            <div className={styles.tabContent}>
              <div className={styles.sectionTitle}>Drawing Instruments</div>
              <div className={styles.toolsGrid}>
                <button
                  className={`${styles.toolButton} ${currentTool === 'pencil' ? styles.toolButtonActive : ''}`}
                  onClick={() => { playClick(); setCurrentTool('pencil'); }}
                  title="Precision Pencil (P)"
                >
                  <PenIcon size={15} /> Pencil
                </button>
                <button
                  className={`${styles.toolButton} ${currentTool === 'brush' ? styles.toolButtonActive : ''}`}
                  onClick={() => { playClick(); setCurrentTool('brush'); }}
                  title="Smooth Paintbrush (B)"
                >
                  <BrushIcon size={15} /> Brush
                </button>
                <button
                  className={`${styles.toolButton} ${currentTool === 'airbrush' ? styles.toolButtonActive : ''}`}
                  onClick={() => { playClick(); setCurrentTool('airbrush'); }}
                  title="Particle Spray Can (A)"
                >
                  Spray
                </button>
                <button
                  className={`${styles.toolButton} ${currentTool === 'highlighter' ? styles.toolButtonActive : ''}`}
                  onClick={() => { playClick(); setCurrentTool('highlighter'); }}
                  title="Neon Highlighter"
                >
                  Highlight
                </button>
                <button
                  className={`${styles.toolButton} ${currentTool === 'eraser' ? styles.toolButtonActive : ''}`}
                  onClick={() => { playClick(); setCurrentTool('eraser'); }}
                  title="Precision Eraser (E)"
                >
                  Eraser
                </button>
                <button
                  className={`${styles.toolButton} ${currentTool === 'fill' ? styles.toolButtonActive : ''}`}
                  onClick={() => { playClick(); setCurrentTool('fill'); }}
                  title="Flood Fill Canvas"
                >
                  Fill
                </button>
                <button
                  className={`${styles.toolButton} ${currentTool === 'picker' ? styles.toolButtonActive : ''}`}
                  onClick={() => { playClick(); setCurrentTool('picker'); }}
                  title="Color Eyedropper (I)"
                >
                  Eyedropper
                </button>
              </div>

              {currentTool === 'airbrush' && (
                <div className={styles.sliderControl}>
                  <div className={styles.sliderHeader}>
                    <span>Spray Density</span>
                    <span>{sprayDensity}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    value={sprayDensity}
                    onChange={(e) => setSprayDensity(parseInt(e.target.value, 10))}
                    className={styles.rangeInput}
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB: SHAPES */}
          {activeTab === 'shapes' && (
            <div className={styles.tabContent}>
              <div className={styles.sectionTitle}>Geometric Vectors</div>
              <div className={styles.toolsGrid}>
                <button
                  className={`${styles.toolButton} ${currentTool === 'line' ? styles.toolButtonActive : ''}`}
                  onClick={() => { playClick(); setCurrentTool('line'); }}
                >
                  Line
                </button>
                <button
                  className={`${styles.toolButton} ${currentTool === 'rect' ? styles.toolButtonActive : ''}`}
                  onClick={() => { playClick(); setCurrentTool('rect'); }}
                >
                  Rect
                </button>
                <button
                  className={`${styles.toolButton} ${currentTool === 'roundrect' ? styles.toolButtonActive : ''}`}
                  onClick={() => { playClick(); setCurrentTool('roundrect'); }}
                >
                  Rounded
                </button>
                <button
                  className={`${styles.toolButton} ${currentTool === 'circle' ? styles.toolButtonActive : ''}`}
                  onClick={() => { playClick(); setCurrentTool('circle'); }}
                >
                  Circle
                </button>
                <button
                  className={`${styles.toolButton} ${currentTool === 'triangle' ? styles.toolButtonActive : ''}`}
                  onClick={() => { playClick(); setCurrentTool('triangle'); }}
                >
                  Triangle
                </button>
                <button
                  className={`${styles.toolButton} ${currentTool === 'star' ? styles.toolButtonActive : ''}`}
                  onClick={() => { playClick(); setCurrentTool('star'); }}
                >
                  Star
                </button>
                <button
                  className={`${styles.toolButton} ${currentTool === 'arrow' ? styles.toolButtonActive : ''}`}
                  onClick={() => { playClick(); setCurrentTool('arrow'); }}
                >
                  Arrow
                </button>
              </div>

              <div className={styles.shapeModeRow}>
                <button
                  className={`${styles.shapeToggleBtn} ${shapeMode === 'stroke' ? styles.shapeToggleBtnActive : ''}`}
                  onClick={() => setShapeMode('stroke')}
                >
                  Outline Stroke
                </button>
                <button
                  className={`${styles.shapeToggleBtn} ${shapeMode === 'fill' ? styles.shapeToggleBtnActive : ''}`}
                  onClick={() => setShapeMode('fill')}
                >
                  Solid Fill
                </button>
              </div>
            </div>
          )}

          {/* TAB: TEXT */}
          {activeTab === 'text' && (
            <div className={styles.tabContent}>
              <div className={styles.sectionTitle}>Typography Overlay</div>
              <div className={styles.textConfig}>
                <label className={styles.label}>Text Content</label>
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className={styles.textInputField}
                  placeholder="Enter text..."
                />

                <label className={styles.label}>Font Family</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className={styles.selectField}
                >
                  {FONT_FAMILIES.map(f => (
                    <option key={f.name} value={f.value}>{f.name}</option>
                  ))}
                </select>

                <div className={styles.sliderControl}>
                  <div className={styles.sliderHeader}>
                    <span>Font Size</span>
                    <span>{fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="96"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                    className={styles.rangeInput}
                  />
                </div>

                <div className={styles.fontStyleRow}>
                  <button
                    className={`${styles.styleBtn} ${isBold ? styles.styleBtnActive : ''}`}
                    onClick={() => setIsBold(!isBold)}
                  >
                    B
                  </button>
                  <button
                    className={`${styles.styleBtn} ${isItalic ? styles.styleBtnActive : ''}`}
                    onClick={() => setIsItalic(!isItalic)}
                  >
                    I
                  </button>
                </div>
                <div className={styles.hintText}>
                  Click anywhere on the canvas to place text.
                </div>
              </div>
            </div>
          )}

          {/* TAB: FILTERS */}
          {activeTab === 'filters' && (
            <div className={styles.tabContent}>
              <div className={styles.sectionTitle}>Canvas Transformations</div>
              <div className={styles.filtersList}>
                <button className={styles.filterBtn} onClick={() => applyFilter('grayscale')}>
                  Grayscale Monochrome
                </button>
                <button className={styles.filterBtn} onClick={() => applyFilter('invert')}>
                  Negative Invert
                </button>
                <button className={styles.filterBtn} onClick={() => applyFilter('sepia')}>
                  Vintage Sepia
                </button>
                <button className={styles.filterBtn} onClick={() => applyFilter('brightness')}>
                  Brightness Boost (+30)
                </button>
                <button className={styles.filterBtn} onClick={() => applyFilter('contrast')}>
                  High Contrast
                </button>
                <button className={styles.filterBtn} onClick={() => applyFilter('tint')}>
                  Current Color Tint
                </button>
              </div>
            </div>
          )}

          {/* TAB: CANVAS SETUP */}
          {activeTab === 'canvas' && (
            <div className={styles.tabContent}>
              <div className={styles.sectionTitle}>Artboard Dimensions</div>
              <div className={styles.presetGrid}>
                {CANVAS_PRESETS.map(p => (
                  <button
                    key={p.name}
                    className={`${styles.presetBtn} ${canvasDimensions.width === p.width && canvasDimensions.height === p.height ? styles.presetBtnActive : ''}`}
                    onClick={() => handlePresetSelect(p)}
                  >
                    <div className={styles.presetName}>{p.name}</div>
                    <div className={styles.presetDim}>{p.width} × {p.height}</div>
                  </button>
                ))}
              </div>

              <div className={styles.sectionTitle} style={{ marginTop: '12px' }}>Background Canvas Style</div>
              <div className={styles.bgOptionRow}>
                <button
                  className={`${styles.bgBtn} ${bgStyle === 'white' ? styles.bgBtnActive : ''}`}
                  onClick={() => { setBgStyle('white'); initCanvas(canvasDimensions.width, canvasDimensions.height, 'white'); }}
                >
                  White Paper
                </button>
                <button
                  className={`${styles.bgBtn} ${bgStyle === 'dark' ? styles.bgBtnActive : ''}`}
                  onClick={() => { setBgStyle('dark'); initCanvas(canvasDimensions.width, canvasDimensions.height, 'dark'); }}
                >
                  Onyx Dark
                </button>
              </div>
            </div>
          )}

          {/* Color Presets & Primary/Secondary Matrix */}
          <div className={styles.colorSection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Color Studio</span>
              <button className={styles.swapBtn} onClick={swapColors} title="Swap Primary/Secondary (X)">
                ⇄ Swap
              </button>
            </div>

            <div className={styles.dualColorRow}>
              <div className={styles.colorBoxWrapper}>
                <div
                  className={styles.colorBox}
                  style={{ background: currentColor }}
                  title="Primary Color"
                />
                <span className={styles.colorBoxLabel}>Primary</span>
              </div>
              <div className={styles.colorBoxWrapper}>
                <div
                  className={styles.colorBox}
                  style={{ background: secondaryColor }}
                  title="Secondary Color"
                />
                <span className={styles.colorBoxLabel}>Secondary</span>
              </div>
            </div>

            <div className={styles.colorPalette}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  className={`${styles.colorSwatch} ${currentColor === c ? styles.colorSwatchActive : ''}`}
                  style={{ background: c }}
                  onClick={() => selectColor(c)}
                />
              ))}
            </div>

            <div className={styles.customColorRow}>
              <input
                type="color"
                className={styles.colorInput}
                value={currentColor}
                onChange={(e) => selectColor(e.target.value)}
              />
              <span className={styles.colorHex}>{currentColor.toUpperCase()}</span>
            </div>

            {/* Recents */}
            {colorHistory.length > 0 && (
              <div className={styles.historyRow}>
                <span className={styles.historyLabel}>Recent:</span>
                <div className={styles.historySwatches}>
                  {colorHistory.map((c, i) => (
                    <button
                      key={`${c}-${i}`}
                      className={styles.historySwatch}
                      style={{ background: c }}
                      onClick={() => selectColor(c)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stroke Size & Opacity */}
          <div className={styles.sliderControl}>
            <div className={styles.sliderHeader}>
              <span>Stroke Weight</span>
              <span>{brushSize}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="64"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
              className={styles.rangeInput}
            />
          </div>

          <div className={styles.sliderControl}>
            <div className={styles.sliderHeader}>
              <span>Opacity</span>
              <span>{opacity}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              value={opacity}
              onChange={(e) => setOpacity(parseInt(e.target.value, 10))}
              className={styles.rangeInput}
            />
          </div>

          {/* Dynamic Brush Preview Dot */}
          <div className={styles.brushPreviewContainer}>
            <div
              className={styles.brushPreviewDot}
              style={{
                width: `${Math.min(46, Math.max(4, brushSize))}px`,
                height: `${Math.min(46, Math.max(4, brushSize))}px`,
                background: currentColor,
                opacity: opacity / 100,
              }}
            />
          </div>
        </div>

        {/* Canvas Center Viewport */}
        <div className={styles.canvasViewport}>
          <div
            className={`${styles.canvasWrapper} ${showGrid ? styles.canvasWithGrid : ''}`}
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'center center',
            }}
          >
            <canvas
              ref={canvasRef}
              width={canvasDimensions.width}
              height={canvasDimensions.height}
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
        <div className={styles.statusLeft}>
          <span className={styles.statusBadge}>{canvasDimensions.width} × {canvasDimensions.height} px</span>
          <span className={styles.statusBadge}>Zoom: {zoomLevel}%</span>
          <span className={styles.statusBadge}>Tool: {currentTool.toUpperCase()}</span>
        </div>
        <div className={styles.statusRight}>
          <span className={styles.statusColor}>{currentColor}</span>
          <span>Shortcuts: [B]rush, [P]encil, [E]raser, [A]irbrush, [I]nvert, [T]ext</span>
        </div>
      </div>
    </div>
  );
}
