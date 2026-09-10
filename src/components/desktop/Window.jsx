import { useState, useRef, useEffect } from 'react';
import styles from './Window.module.css';

export default function Window({
  window: win,
  isActive,
  onFocus,
  onClose,
  onMinimize,
  onMaximize,
  onUpdatePos,
  onUpdateSize,
  onSnap,
  onSnapPreview = () => {},
  playClick = () => {},
  children,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, winX: 0, winY: 0, wasSnapped: false });
  const resizeStartRef = useRef({ x: 0, y: 0, winW: 0, winH: 0, edge: '' });
  const currentSnapPreviewRef = useRef(null);

  // Handle Dragging
  const handleMouseDownHeader = (e) => {
    if (e.target.closest('button')) return; // ignore window control buttons
    onFocus();

    setIsDragging(true);

    let startX = win.position.x;
    let startY = win.position.y;
    let wasSnapped = false;

    // If dragged while maximized or snapped, restore original width/height
    if (win.isMaximized || win.snapState) {
      wasSnapped = true;
      const restoredW = win.restoreSize?.w || 640;
      const restoredH = win.restoreSize?.h || 420;
      startX = Math.max(0, e.clientX - restoredW / 2);
      startY = Math.max(0, e.clientY - 15);
      if (win.isMaximized) onMaximize(win.id);
      if (win.snapState && onSnap) onSnap(win.id, null);
      onUpdateSize(win.id, { w: restoredW, h: restoredH });
      onUpdatePos(win.id, { x: startX, y: startY });
    }

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      winX: startX,
      winY: startY,
      wasSnapped,
    };
  };

  // Handle Resizing
  const handleMouseDownResize = (e, edge) => {
    e.stopPropagation();
    e.preventDefault();
    onFocus();
    if (win.isMaximized || win.snapState) return;

    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      winW: win.size.w,
      winH: win.size.h,
      edge,
    };
  };

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e) => {
      if (isDragging) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        const newX = Math.max(-100, Math.min(window.innerWidth - 100, dragStartRef.current.winX + dx));
        const newY = Math.max(0, Math.min(window.innerHeight - 80, dragStartRef.current.winY + dy));
        onUpdatePos(win.id, { x: newX, y: newY });

        // Aero Snap Edge Detection
        let snapType = null;
        if (e.clientY < 12) {
          snapType = 'full';
        } else if (e.clientX < 12) {
          snapType = 'left';
        } else if (e.clientX > window.innerWidth - 12) {
          snapType = 'right';
        }

        currentSnapPreviewRef.current = snapType;
        onSnapPreview(snapType);
      } else if (isResizing) {
        const dx = e.clientX - resizeStartRef.current.x;
        const dy = e.clientY - resizeStartRef.current.y;
        const newW = Math.max(340, resizeStartRef.current.winW + dx);
        const newH = Math.max(220, resizeStartRef.current.winH + dy);
        onUpdateSize(win.id, { w: newW, h: newH });
      }
    };

    const handleMouseUp = () => {
      if (isDragging && currentSnapPreviewRef.current) {
        const snap = currentSnapPreviewRef.current;
        if (snap === 'full') {
          onMaximize(win.id);
        } else if (onSnap) {
          onSnap(win.id, snap);
        }
      }
      currentSnapPreviewRef.current = null;
      onSnapPreview(null);
      setIsDragging(false);
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, onMaximize, onSnap, onSnapPreview, onUpdatePos, onUpdateSize, win.id]);

  if (win.isMinimized) return null;

  let windowStyle;
  if (win.isMaximized) {
    windowStyle = {
      top: 0,
      left: 0,
      width: '100vw',
      height: 'calc(100vh - 52px)',
      borderRadius: 0,
      zIndex: win.zIndex,
    };
  } else if (win.snapState === 'left') {
    windowStyle = {
      top: 0,
      left: 0,
      width: '50vw',
      height: 'calc(100vh - 52px)',
      borderRadius: 0,
      zIndex: win.zIndex,
    };
  } else if (win.snapState === 'right') {
    windowStyle = {
      top: 0,
      left: '50vw',
      width: '50vw',
      height: 'calc(100vh - 52px)',
      borderRadius: 0,
      zIndex: win.zIndex,
    };
  } else {
    windowStyle = {
      top: `${win.position.y}px`,
      left: `${win.position.x}px`,
      width: `${win.size.w}px`,
      height: `${win.size.h}px`,
      zIndex: win.zIndex,
    };
  }

  const isSnapped = win.isMaximized || !!win.snapState;

  return (
    <div
      className={`${styles.window} ${isActive ? styles.windowActive : ''} ${isDragging ? styles.windowDragging : ''} ${isSnapped ? styles.windowSnapped : ''}`}
      style={windowStyle}
      onMouseDown={onFocus}
    >
      {/* Title Bar */}
      <div
        className={styles.titleBar}
        onMouseDown={handleMouseDownHeader}
        onDoubleClick={() => onMaximize(win.id)}
      >
        <div className={styles.windowIdentity}>
          <span className={styles.windowIcon}>{win.icon || '📁'}</span>
          <span className={styles.windowTitle}>{win.title}</span>
        </div>

        {/* Window Controls */}
        <div className={styles.windowControls}>
          <button
            className={`${styles.controlBtn} ${styles.btnMinimize}`}
            onClick={(e) => {
              e.stopPropagation();
              playClick();
              onMinimize(win.id);
            }}
            title="Minimize"
          >
            ─
          </button>
          <button
            className={`${styles.controlBtn} ${styles.btnMaximize}`}
            onClick={(e) => {
              e.stopPropagation();
              playClick();
              onMaximize(win.id);
            }}
            title={win.isMaximized ? 'Restore' : 'Maximize'}
          >
            {win.isMaximized ? '❐' : '□'}
          </button>
          <button
            className={`${styles.controlBtn} ${styles.btnClose}`}
            onClick={(e) => {
              e.stopPropagation();
              playClick();
              onClose(win.id);
            }}
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Window Body */}
      <div className={styles.windowBody}>
        {children}
      </div>

      {/* Resize Handle */}
      {!isSnapped && (
        <div
          className={styles.resizeHandle}
          onMouseDown={(e) => handleMouseDownResize(e, 'se')}
        />
      )}
    </div>
  );
}
