import { useState, useRef, useEffect, useCallback } from 'react';
import { VFS } from '../services/storage/indexedDB';
import { urlForPath, revokeUrl, importFile, LIBRARY, ACCEPT } from '../services/storage/fileImport';
import { LocalSettings } from '../services/storage/localStorage';
import { NotificationService } from '../services/notificationService';
import { ImageIcon } from '../components/Icons';
import styles from './ImageViewerApp.module.css';

export default function ImageViewerApp({
  filePath = null,
  playClick = () => {},
}) {
  // No bundled sample imagery: the studio opens empty and shows an import
  // prompt, so nothing appears in the gallery that is not a real file.
  const [imageSrc, setImageSrc] = useState(null);
  const [fileName, setFileName] = useState('');
  const [galleryItems, setGalleryItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Transform states
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFlippedH, setIsFlippedH] = useState(false);
  const [isFlippedV, setIsFlippedV] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Dimensions & Metadata
  const [dimensions, setDimensions] = useState({ w: 800, h: 500 });
  const [fileSize, setFileSize] = useState(12800); // in bytes

  // Panel Toggles
  const [activePanel, setActivePanel] = useState(null); // 'adjust' | 'crop' | 'info' | null
  const [showFilmstrip, setShowFilmstrip] = useState(true);
  const [isSlideshow, setIsSlideshow] = useState(false);
  const slideshowInterval = 4; // seconds

  // Image Adjustments
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);
  const [grayscale, setGrayscale] = useState(0);
  const [sepia, setSepia] = useState(0);
  const [invert, setInvert] = useState(false);
  const [blurVal, setBlurVal] = useState(0);

  // Crop State
  const [cropAspect, setCropAspect] = useState('free'); // 'free' | '1:1' | '16:9' | '4:3'

  const fileInputRef = useRef(null);
  // Tracks the object URL currently shown, so it can be revoked on replace.
  const urlRef = useRef(null);
  const imageElementRef = useRef(null);

  // Load initial image or folder items from VFS
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (filePath) {
        try {
          /*
           * Always go through a blob URL.
           *
           * Raw SVG markup passed straight to `src` is parsed as a relative
           * URL, so the browser requested "…<svg xmlns=…>" as a path and got
           * a 404. urlForPath() wraps whatever is stored — Blob or string —
           * in an object URL that <img> can actually load.
           */
          const { url } = await urlForPath(filePath);
          if (isMounted) {
            if (urlRef.current) revokeUrl(urlRef.current);
            urlRef.current = url;
            setImageSrc(url);
            setFileName(filePath.split('/').pop());
          } else {
            revokeUrl(url);
          }
        } catch (err) {
          if (isMounted) {
            NotificationService.send({
              title: 'Could not open image',
              message: err?.message || String(err),
              type: 'error',
            });
          }
        }
      }

      // Filmstrip is built from the real Pictures folder only.
      try {
        const pics = await VFS.listDirectory('/Users/User/Pictures');
        const imgFiles = pics.filter(p => /\.(png|jpg|jpeg|webp|svg|gif|avif|bmp)$/i.test(p.name));
        if (isMounted && imgFiles.length > 0) {
          const loaded = await Promise.all(
            imgFiles.slice(0, 24).map(async (file) => {
              const { url } = await urlForPath(file.path);
              return { name: file.name, src: url, path: file.path };
            })
          );
          if (isMounted) setGalleryItems(loaded);
        }
      } catch { /* Pictures may not exist yet */ }
    })();

    return () => { isMounted = false; };
  }, [filePath]);

  // Zoom helpers
  const handleZoomIn = () => {
    playClick();
    setZoom(z => Math.min(5, Math.round((z + 0.25) * 100) / 100));
  };

  const handleZoomOut = () => {
    playClick();
    setZoom(z => Math.max(0.1, Math.round((z - 0.25) * 100) / 100));
  };

  const handleResetZoom = () => {
    playClick();
    setZoom(1);
    setRotation(0);
    setIsFlippedH(false);
    setIsFlippedV(false);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleFitToScreen = () => {
    playClick();
    setZoom(0.85);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleRotateRight = () => {
    playClick();
    setRotation(r => (r + 90) % 360);
  };

  const handleRotateLeft = () => {
    playClick();
    setRotation(r => (r - 90 + 360) % 360);
  };

  const handleFlipH = () => {
    playClick();
    setIsFlippedH(f => !f);
  };

  const handleFlipV = () => {
    playClick();
    setIsFlippedV(f => !f);
  };

  // Drag & Pan support
  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset Filters
  const handleResetFilters = () => {
    playClick();
    setBrightness(100);
    setContrast(100);
    setSaturate(100);
    setGrayscale(0);
    setSepia(0);
    setInvert(false);
    setBlurVal(0);
  };

  // Set as Desktop Wallpaper
  const handleSetAsWallpaper = () => {
    playClick();
    LocalSettings.setAppearance({ customWallpaperData: imageSrc });
    NotificationService.send({
      title: 'Wallpaper Updated',
      message: `"${fileName}" is now your desktop background`,
      type: 'success',
    });
  };

  // Bake filters to new canvas and export/save
  const renderProcessedCanvas = useCallback(() => {
    const img = imageElementRef.current;
    if (!img) return null;

    const canvas = document.createElement('canvas');
    canvas.width = dimensions.w;
    canvas.height = dimensions.h;
    const ctx = canvas.getContext('2d');

    // Build filter string
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) grayscale(${grayscale}%) sepia(${sepia}%) ${invert ? 'invert(100%)' : ''} blur(${blurVal}px)`;

    // Apply rotation/flip
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(isFlippedH ? -1 : 1, isFlippedV ? -1 : 1);
    ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    ctx.restore();

    return canvas;
  }, [dimensions, brightness, contrast, saturate, grayscale, sepia, invert, blurVal, rotation, isFlippedH, isFlippedV]);

  // Save modified to VFS
  const handleSaveToVFS = async () => {
    playClick();
    const canvas = renderProcessedCanvas();
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const newName = `Edited_${Date.now()}.png`;
    const targetPath = `/Users/User/Pictures/${newName}`;

    try {
      await VFS.writeFile(targetPath, dataUrl, 'image/png');
      setImageSrc(dataUrl);
      setFileName(newName);
      handleResetFilters();
      NotificationService.send({
        title: 'Image Saved',
        message: `Saved to Pictures as ${newName}`,
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

  // Download image
  const handleDownload = () => {
    playClick();
    const canvas = renderProcessedCanvas();
    const dataUrl = canvas ? canvas.toDataURL('image/png') : imageSrc;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Billighost_${fileName.replace(/\.[^/.]+$/, '')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Crop Action
  const handleApplyCrop = () => {
    playClick();
    const img = imageElementRef.current;
    if (!img) return;

    let targetW = dimensions.w;
    let targetH = dimensions.h;

    if (cropAspect === '1:1') {
      const minDim = Math.min(dimensions.w, dimensions.h);
      targetW = minDim;
      targetH = minDim;
    } else if (cropAspect === '16:9') {
      targetW = dimensions.w;
      targetH = Math.round((dimensions.w * 9) / 16);
    } else if (cropAspect === '4:3') {
      targetW = dimensions.w;
      targetH = Math.round((dimensions.w * 3) / 4);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');

    const sx = Math.max(0, (dimensions.w - targetW) / 2);
    const sy = Math.max(0, (dimensions.h - targetH) / 2);

    ctx.drawImage(img, sx, sy, targetW, targetH, 0, 0, targetW, targetH);
    const croppedUrl = canvas.toDataURL('image/png');
    setImageSrc(croppedUrl);
    setDimensions({ w: targetW, h: targetH });
    setActivePanel(null);
    NotificationService.send({
      title: 'Crop Applied',
      message: `Aspect ratio cropped to ${targetW} × ${targetH}`,
      type: 'info',
    });
  };

  // Navigate Gallery
  const handleSelectGalleryItem = useCallback((item, idx) => {
    playClick();
    setImageSrc(item.src);
    setFileName(item.name);
    setCurrentIndex(idx);
    setZoom(1);
    setRotation(0);
    setIsFlippedH(false);
    setIsFlippedV(false);
    setPanOffset({ x: 0, y: 0 });
    setBrightness(100);
    setContrast(100);
    setSaturate(100);
    setGrayscale(0);
    setSepia(0);
    setInvert(false);
    setBlurVal(0);
  }, [playClick]);

  const handleNextPhoto = useCallback(() => {
    playClick();
    if (galleryItems.length === 0) return;
    const nextIdx = (currentIndex + 1) % galleryItems.length;
    handleSelectGalleryItem(galleryItems[nextIdx], nextIdx);
  }, [currentIndex, galleryItems, playClick, handleSelectGalleryItem]);

  const handlePrevPhoto = useCallback(() => {
    playClick();
    if (galleryItems.length === 0) return;
    const prevIdx = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
    handleSelectGalleryItem(galleryItems[prevIdx], prevIdx);
  }, [currentIndex, galleryItems, playClick, handleSelectGalleryItem]);

  // Slideshow auto-advance
  useEffect(() => {
    if (!isSlideshow) return;
    const interval = setInterval(() => {
      handleNextPhoto();
    }, slideshowInterval * 1000);
    return () => clearInterval(interval);
  }, [isSlideshow, slideshowInterval, handleNextPhoto]);

  // Upload local file
  /**
   * Import a picture.
   *
   * Saved into the Pictures library first, so it can be reopened from File
   * Explorer later rather than living only in this window's memory.
   */
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playClick();
    e.target.value = '';

    try {
      const saved = await importFile(file, { dir: LIBRARY.image });
      window.dispatchEvent(new CustomEvent('billighost:vfs-update'));

      if (urlRef.current) revokeUrl(urlRef.current);
      const url = saved.url || URL.createObjectURL(file);
      urlRef.current = url;

      setImageSrc(url);
      setFileName(saved.name);
      setFileSize(saved.size);
      handleResetZoom();
      handleResetFilters();

      NotificationService.send({
        title: 'Added to Pictures',
        message: `${saved.name} — saved to ${LIBRARY.image}`,
        type: 'success',
      });
    } catch (err) {
      NotificationService.send({
        title: 'Import Failed',
        message: err?.message || String(err),
        type: 'error',
      });
    }
  };

  const handleImageLoaded = (e) => {
    const w = e.target.naturalWidth || 800;
    const h = e.target.naturalHeight || 500;
    setDimensions({ w, h });
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextPhoto();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevPhoto();
      } else if (e.key === '+' || e.key === '=') {
        setZoom(z => Math.min(5, Math.round((z + 0.25) * 100) / 100));
      } else if (e.key === '-') {
        setZoom(z => Math.max(0.1, Math.round((z - 0.25) * 100) / 100));
      } else if (e.key === '0') {
        setZoom(1);
        setRotation(0);
        setIsFlippedH(false);
        setIsFlippedV(false);
        setPanOffset({ x: 0, y: 0 });
      } else if (e.key.toLowerCase() === 'r') {
        setRotation(r => (r + 90) % 360);
      } else if (e.key.toLowerCase() === 'f') {
        setIsSlideshow(s => !s);
      } else if (e.key.toLowerCase() === 'w') {
        LocalSettings.setAppearance({ customWallpaperData: imageSrc });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextPhoto, handlePrevPhoto, imageSrc]);

  const cssFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) grayscale(${grayscale}%) sepia(${sepia}%) ${invert ? 'invert(100%)' : ''} blur(${blurVal}px)`;

  return (
    <div className={styles.viewerContainer} data-testid="image-viewer-app">
      {/* Top Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.fileInfo}>
          <span className={styles.fileIcon}>🖼️</span>
          <span className={styles.fileName}>{fileName}</span>
          <span className={styles.dimensionsBadge}>{dimensions.w} × {dimensions.h} px</span>
        </div>

        {/* View & Navigation Actions */}
        <div className={styles.toolActions}>
          <button className={styles.toolBtn} onClick={handlePrevPhoto} title="Previous Image (←)">
            ◀
          </button>
          <button className={styles.toolBtn} onClick={handleNextPhoto} title="Next Image (→)">
            ▶
          </button>
          <div className={styles.divider} />

          <button className={styles.toolBtn} onClick={handleZoomOut} title="Zoom Out (-)">−</button>
          <span className={styles.zoomBadge}>{Math.round(zoom * 100)}%</span>
          <button className={styles.toolBtn} onClick={handleZoomIn} title="Zoom In (+)">+</button>
          <button className={styles.toolBtn} onClick={handleResetZoom} title="Reset 1:1 (0)">1:1</button>
          <button className={styles.toolBtn} onClick={handleFitToScreen} title="Fit to Screen">Fit</button>
          <div className={styles.divider} />

          <button className={styles.toolBtn} onClick={handleRotateLeft} title="Rotate 90° CCW">↺</button>
          <button className={styles.toolBtn} onClick={handleRotateRight} title="Rotate 90° CW (R)">↻</button>
          <button className={styles.toolBtn} onClick={handleFlipH} title="Flip Horizontal">⇄</button>
          <button className={styles.toolBtn} onClick={handleFlipV} title="Flip Vertical">⇅</button>
          <div className={styles.divider} />

          {/* Feature Drawers Toggles */}
          <button
            className={`${styles.toolBtn} ${activePanel === 'adjust' ? styles.btnActive : ''}`}
            onClick={() => { playClick(); setActivePanel(p => p === 'adjust' ? null : 'adjust'); }}
            title="Image Color Adjustments"
          >
            Adjust
          </button>
          <button
            className={`${styles.toolBtn} ${activePanel === 'crop' ? styles.btnActive : ''}`}
            onClick={() => { playClick(); setActivePanel(p => p === 'crop' ? null : 'crop'); }}
            title="Aspect Ratio Crop"
          >
            Crop
          </button>
          <button
            className={`${styles.toolBtn} ${activePanel === 'info' ? styles.btnActive : ''}`}
            onClick={() => { playClick(); setActivePanel(p => p === 'info' ? null : 'info'); }}
            title="EXIF & Metadata"
          >
            Info
          </button>

          <button
            className={`${styles.toolBtn} ${isSlideshow ? styles.btnActive : ''}`}
            onClick={() => { playClick(); setIsSlideshow(!isSlideshow); }}
            title="Slideshow Presentation Mode (F)"
          >
            {isSlideshow ? '⏸ Stop' : '▶ Slideshow'}
          </button>

          <div className={styles.divider} />

          {/* Storage & Export actions */}
          <button className={styles.toolBtn} onClick={handleSetAsWallpaper} title="Set as Desktop Wallpaper (W)">
            Wallpaper
          </button>
          <button className={`${styles.toolBtn} ${styles.btnAccent}`} onClick={handleSaveToVFS} title="Save to Pictures">
            Save
          </button>
          <button className={styles.toolBtn} onClick={handleDownload} title="Download PNG to PC">
            Export
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            accept={ACCEPT.image}
            style={{ display: 'none' }}
          />
          <button className={styles.toolBtn} onClick={() => fileInputRef.current?.click()} title="Open Image from PC">
            Open...
          </button>
        </div>
      </div>

      {/* Main Studio Body: Viewport + Side Panel Drawers */}
      <div className={styles.mainStudioBody}>
        {/* Main Viewport */}
        <div
          className={styles.viewport}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        >
          {imageSrc ? (
            <div
              className={styles.imageStage}
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom}) rotate(${rotation}deg) scaleX(${isFlippedH ? -1 : 1}) scaleY(${isFlippedV ? -1 : 1})`,
              }}
            >
              <img
                ref={imageElementRef}
                src={imageSrc}
                alt={fileName}
                className={styles.mainImage}
                style={{ filter: cssFilter }}
                onLoad={handleImageLoaded}
                draggable={false}
              />
            </div>
          ) : (
            /* Empty state — `<img src={null}>` would request the page URL. */
            <div className={styles.emptyStudio}>
              <ImageIcon size={44} />
              <span className={styles.emptyTitle}>No image open</span>
              <span className={styles.emptyDesc}>
                Import a picture, or open one from your Pictures folder.
              </span>
              <button
                className={styles.emptyAction}
                onClick={() => { playClick(); fileInputRef.current?.click(); }}
              >
                Import Image
              </button>
            </div>
          )}
        </div>

        {/* SIDE PANEL 1: COLOR ADJUSTMENTS */}
        {activePanel === 'adjust' && (
          <div className={styles.sideDrawer}>
            <div className={styles.drawerHeader}>
              <span>Color Adjustments</span>
              <button className={styles.resetBtn} onClick={handleResetFilters}>Reset</button>
            </div>
            <div className={styles.drawerContent}>
              <div className={styles.sliderControl}>
                <div className={styles.sliderHeader}>
                  <span>Brightness</span>
                  <span>{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="200"
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                  className={styles.rangeInput}
                />
              </div>

              <div className={styles.sliderControl}>
                <div className={styles.sliderHeader}>
                  <span>Contrast</span>
                  <span>{contrast}%</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="200"
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                  className={styles.rangeInput}
                />
              </div>

              <div className={styles.sliderControl}>
                <div className={styles.sliderHeader}>
                  <span>Saturation</span>
                  <span>{saturate}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="250"
                  value={saturate}
                  onChange={(e) => setSaturate(parseInt(e.target.value, 10))}
                  className={styles.rangeInput}
                />
              </div>

              <div className={styles.sliderControl}>
                <div className={styles.sliderHeader}>
                  <span>Sepia</span>
                  <span>{sepia}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sepia}
                  onChange={(e) => setSepia(parseInt(e.target.value, 10))}
                  className={styles.rangeInput}
                />
              </div>

              <div className={styles.sliderControl}>
                <div className={styles.sliderHeader}>
                  <span>Grayscale</span>
                  <span>{grayscale}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={grayscale}
                  onChange={(e) => setGrayscale(parseInt(e.target.value, 10))}
                  className={styles.rangeInput}
                />
              </div>

              <div className={styles.sliderControl}>
                <div className={styles.sliderHeader}>
                  <span>Blur</span>
                  <span>{blurVal}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="16"
                  value={blurVal}
                  onChange={(e) => setBlurVal(parseInt(e.target.value, 10))}
                  className={styles.rangeInput}
                />
              </div>

              <button
                className={`${styles.drawerActionBtn} ${invert ? styles.btnActive : ''}`}
                onClick={() => setInvert(!invert)}
              >
                {invert ? 'Invert Negative: ON' : 'Invert Negative: OFF'}
              </button>
            </div>
          </div>
        )}

        {/* SIDE PANEL 2: CROP STUDIO */}
        {activePanel === 'crop' && (
          <div className={styles.sideDrawer}>
            <div className={styles.drawerHeader}>
              <span>Aspect Ratio Crop</span>
            </div>
            <div className={styles.drawerContent}>
              <div className={styles.cropOptions}>
                <button
                  className={`${styles.cropBtn} ${cropAspect === 'free' ? styles.cropBtnActive : ''}`}
                  onClick={() => setCropAspect('free')}
                >
                  Original Canvas
                </button>
                <button
                  className={`${styles.cropBtn} ${cropAspect === '1:1' ? styles.cropBtnActive : ''}`}
                  onClick={() => setCropAspect('1:1')}
                >
                  1:1 Square (Avatar)
                </button>
                <button
                  className={`${styles.cropBtn} ${cropAspect === '16:9' ? styles.cropBtnActive : ''}`}
                  onClick={() => setCropAspect('16:9')}
                >
                  16:9 Widescreen
                </button>
                <button
                  className={`${styles.cropBtn} ${cropAspect === '4:3' ? styles.cropBtnActive : ''}`}
                  onClick={() => setCropAspect('4:3')}
                >
                  4:3 Standard Photo
                </button>
              </div>
              <button className={styles.applyCropBtn} onClick={handleApplyCrop}>
                Apply Crop to Image
              </button>
            </div>
          </div>
        )}

        {/* SIDE PANEL 3: METADATA & EXIF */}
        {activePanel === 'info' && (
          <div className={styles.sideDrawer}>
            <div className={styles.drawerHeader}>
              <span>File Inspector</span>
            </div>
            <div className={styles.drawerContent}>
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Filename:</span>
                <span className={styles.metaVal}>{fileName}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Resolution:</span>
                <span className={styles.metaVal}>{dimensions.w} × {dimensions.h} px</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Megapixels:</span>
                <span className={styles.metaVal}>{((dimensions.w * dimensions.h) / 1000000).toFixed(2)} MP</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Aspect Ratio:</span>
                <span className={styles.metaVal}>{(dimensions.w / dimensions.h).toFixed(2)}:1</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Estimated Size:</span>
                <span className={styles.metaVal}>{Math.round(fileSize / 1024)} KB</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Color Space:</span>
                <span className={styles.metaVal}>sRGB 24-bit</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Filmstrip Carousel */}
      {showFilmstrip && (
        <div className={styles.filmstripContainer}>
          <div className={styles.filmstripTrack}>
            {galleryItems.map((item, idx) => (
              <div
                key={`${item.name}-${idx}`}
                className={`${styles.filmstripThumb} ${currentIndex === idx ? styles.filmstripThumbActive : ''}`}
                onClick={() => handleSelectGalleryItem(item, idx)}
                title={item.name}
              >
                <img src={item.src} alt={item.name} className={styles.thumbImage} />
                <span className={styles.thumbLabel}>{item.name}</span>
              </div>
            ))}
          </div>
          <button
            className={styles.toggleFilmstripBtn}
            onClick={() => setShowFilmstrip(false)}
            title="Hide filmstrip"
          >
            ✕
          </button>
        </div>
      )}

      {/* Status Bar */}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span>{currentIndex + 1} of {galleryItems.length} images</span>
          <span>Zoom: {Math.round(zoom * 100)}%</span>
          <span>Rotation: {rotation}°</span>
        </div>
        <div className={styles.statusRight}>
          {!showFilmstrip && (
            <button className={styles.linkBtn} onClick={() => setShowFilmstrip(true)}>
              Show Filmstrip
            </button>
          )}
          <span>Shortcuts: [←/→] Navigate, [R]otate, [W]allpaper, [F]ullscreen</span>
        </div>
      </div>
    </div>
  );
}
