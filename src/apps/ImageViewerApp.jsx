import { useState, useRef, useEffect } from 'react';
import { VFS } from '../services/storage/indexedDB';
import styles from './ImageViewerApp.module.css';

const DEFAULT_SAMPLE_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'%3E%3Cdefs%3E%3CradialGradient id='g' cx='50%25' cy='50%25' r='70%25'%3E%3Cstop offset='0%25' stop-color='%231e1b4b'/%3E%3Cstop offset='50%25' stop-color='%230f172a'/%3E%3Cstop offset='100%25' stop-color='%23050505'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3Ccircle cx='400' cy='250' r='120' fill='none' stroke='%237eb8ff' stroke-width='3' stroke-dasharray='8 8'/%3E%3Ctext x='400' y='255' fill='%23e2e8f0' font-family='sans-serif' font-size='22' font-weight='bold' text-anchor='middle'%3EBILLIGHOST OS%3C/text%3E%3Ctext x='400' y='285' fill='%2394a3b8' font-family='sans-serif' font-size='14' text-anchor='middle'%3EHigh-Definition Image Preview%3C/text%3E%3C/svg%3E";

export default function ImageViewerApp({
  filePath = null,
  playClick = () => {},
}) {
  const [imageSrc, setImageSrc] = useState(DEFAULT_SAMPLE_IMG);
  const [fileName, setFileName] = useState('Sample_Wallpaper.svg');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [dimensions, setDimensions] = useState({ w: 800, h: 500 });
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (filePath) {
      VFS.readFile(filePath)
        .then((content) => {
          setImageSrc(content);
          setFileName(filePath.split('/').pop());
        })
        .catch(() => {});
    }
  }, [filePath]);

  const handleZoomIn = () => {
    playClick();
    setZoom(z => Math.min(4, Math.round((z + 0.25) * 100) / 100));
  };

  const handleZoomOut = () => {
    playClick();
    setZoom(z => Math.max(0.25, Math.round((z - 0.25) * 100) / 100));
  };

  const handleResetZoom = () => {
    playClick();
    setZoom(1);
    setRotation(0);
    setIsFlipped(false);
  };

  const handleRotateRight = () => {
    playClick();
    setRotation(r => (r + 90) % 360);
  };

  const handleFlip = () => {
    playClick();
    setIsFlipped(f => !f);
  };

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playClick();
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageSrc(ev.target.result);
      setFileName(file.name);
      handleResetZoom();
    };
    reader.readAsDataURL(file);
  };

  const handleImageLoaded = (e) => {
    setDimensions({
      w: e.target.naturalWidth || 800,
      h: e.target.naturalHeight || 500,
    });
  };

  return (
    <div className={styles.viewerContainer}>
      {/* Top Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.fileInfo}>
          <span className={styles.fileIcon}>🖼️</span>
          <span className={styles.fileName}>{fileName}</span>
          <span className={styles.dimensionsBadge}>{dimensions.w} × {dimensions.h}</span>
        </div>

        <div className={styles.toolActions}>
          <button className={styles.toolBtn} onClick={handleZoomOut} title="Zoom Out">🔍−</button>
          <span className={styles.zoomBadge}>{Math.round(zoom * 100)}%</span>
          <button className={styles.toolBtn} onClick={handleZoomIn} title="Zoom In">🔍+</button>
          <button className={styles.toolBtn} onClick={handleResetZoom} title="Reset Zoom & Transform">1:1</button>
          <button className={styles.toolBtn} onClick={handleRotateRight} title="Rotate 90°">↻</button>
          <button className={styles.toolBtn} onClick={handleFlip} title="Flip Horizontal">⇄</button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <button className={styles.toolBtn} onClick={() => fileInputRef.current?.click()} title="Open Image from PC">
            📂 Open...
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className={styles.viewport}>
        <div
          className={styles.imageStage}
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg) scaleX(${isFlipped ? -1 : 1})`,
          }}
        >
          <img
            src={imageSrc}
            alt={fileName}
            className={styles.mainImage}
            onLoad={handleImageLoaded}
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
