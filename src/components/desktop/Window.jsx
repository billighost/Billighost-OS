import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './Window.module.css';

/* Shell geometry — the taskbar owns the bottom strip of the viewport. */
const TASKBAR_H = 52;

/*
 * Minimum window sizes.
 *
 * These are floors, not arbitrary numbers: an app with a sidebar, a toolbar
 * and a content grid cannot lay out meaningfully below roughly 380x360 — the
 * content pane gets crushed to a few pixels and its children spill past the
 * frame. Stopping the resize at a size the app can actually render is how a
 * real window manager behaves, and it is honest about the limit rather than
 * silently clipping content.
 */
const MIN_W = 380;
const MIN_H = 360;

/** Usable desktop area: the viewport minus the taskbar. */
function workArea() {
  return {
    w: window.innerWidth,
    h: Math.max(MIN_H, window.innerHeight - TASKBAR_H),
  };
}

/**
 * Keeps a window fully inside the work area.
 *
 * Both size and position are clamped together: clamping position alone lets
 * a window wider than the viewport hang off the right edge, and clamping
 * size alone lets an already-offscreen window stay there.
 */
function clampToWorkArea(pos, size) {
  const area = workArea();
  const w = Math.min(Math.max(MIN_W, size.w), area.w);
  const h = Math.min(Math.max(MIN_H, size.h), area.h);
  return {
    position: {
      x: Math.round(Math.min(Math.max(0, pos.x), Math.max(0, area.w - w))),
      y: Math.round(Math.min(Math.max(0, pos.y), Math.max(0, area.h - h))),
    },
    size: { w: Math.round(w), h: Math.round(h) },
  };
}

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
      winX: win.position.x,
      winY: win.position.y,
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

        // Clamp so no part of the window can leave the work area — including
        // sliding under the taskbar, which would strand the title bar.
        const { position } = clampToWorkArea(
          { x: dragStartRef.current.winX + dx, y: dragStartRef.current.winY + dy },
          win.size
        );
        onUpdatePos(win.id, position);

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
        const { x: startX, y: startY, winX, winY, winW, winH, edge } = resizeStartRef.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const area = workArea();

        let newW = winW;
        let newH = winH;
        let newX = winX;
        let newY = winY;

        // Horizontal: east grows to the right edge, west grows to x=0.
        if (edge.includes('e')) {
          newW = Math.min(Math.max(MIN_W, winW + dx), area.w - winX);
        } else if (edge.includes('w')) {
          const maxDelta = winW - MIN_W;          // shrink limit
          const minDelta = -winX;                 // left edge limit
          const deltaW = Math.min(Math.max(dx, minDelta), maxDelta);
          newW = winW - deltaW;
          newX = winX + deltaW;
        }

        // Vertical: south stops at the taskbar, north stops at y=0.
        if (edge.includes('s')) {
          newH = Math.min(Math.max(MIN_H, winH + dy), area.h - winY);
        } else if (edge.includes('n')) {
          const maxDelta = winH - MIN_H;
          const minDelta = -winY;
          const deltaH = Math.min(Math.max(dy, minDelta), maxDelta);
          newH = winH - deltaH;
          newY = winY + deltaH;
        }

        const clamped = clampToWorkArea({ x: newX, y: newY }, { w: newW, h: newH });
        onUpdateSize(win.id, clamped.size);
        if (clamped.position.x !== winX || clamped.position.y !== winY) {
          onUpdatePos(win.id, clamped.position);
        }
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
  }, [isDragging, isResizing, onMaximize, onSnap, onSnapPreview, onUpdatePos, onUpdateSize, win.id, win.size]);

  /**
   * Reflow when the browser viewport shrinks.
   *
   * Without this, making the browser smaller leaves windows sized for the old
   * viewport — they overhang the right edge and slide under the taskbar with
   * no way to drag them back.
   */
  const reflow = useCallback(() => {
    if (win.isMaximized || win.snapState) return;   // CSS handles these
    const clamped = clampToWorkArea(win.position, win.size);
    if (clamped.size.w !== win.size.w || clamped.size.h !== win.size.h) {
      onUpdateSize(win.id, clamped.size);
    }
    if (clamped.position.x !== win.position.x || clamped.position.y !== win.position.y) {
      onUpdatePos(win.id, clamped.position);
    }
  }, [win.id, win.isMaximized, win.snapState, win.position, win.size, onUpdateSize, onUpdatePos]);

  useEffect(() => {
    window.addEventListener('resize', reflow);
    return () => window.removeEventListener('resize', reflow);
  }, [reflow]);

  // Also correct a window opened at a stale/oversized geometry.
  useEffect(() => {
    reflow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      data-testid="os-window"
      data-app={win.appId}
      className={`${styles.window} ${isActive ? styles.windowActive : ''} ${isDragging ? styles.windowDragging : ''} ${isResizing ? styles.windowResizing : ''} ${isSnapped ? styles.windowSnapped : ''}`}
      style={windowStyle}
      onMouseDown={onFocus}
    >
      {/* Title Bar */}
      <div
        className={styles.titleBar}
        data-context="window-titlebar"
        data-window-id={win.id}
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

      {/* 8-Direction Resize Handles */}
      {!isSnapped && (
        <>
          <div
            className={`${styles.resizeHandle} ${styles.handleN}`}
            onMouseDown={(e) => handleMouseDownResize(e, 'n')}
            data-testid="resize-handle-n"
            title="Resize Top"
          />
          <div
            className={`${styles.resizeHandle} ${styles.handleS}`}
            onMouseDown={(e) => handleMouseDownResize(e, 's')}
            data-testid="resize-handle-s"
            title="Resize Bottom"
          />
          <div
            className={`${styles.resizeHandle} ${styles.handleW}`}
            onMouseDown={(e) => handleMouseDownResize(e, 'w')}
            data-testid="resize-handle-w"
            title="Resize Left"
          />
          <div
            className={`${styles.resizeHandle} ${styles.handleE}`}
            onMouseDown={(e) => handleMouseDownResize(e, 'e')}
            data-testid="resize-handle-e"
            title="Resize Right"
          />
          <div
            className={`${styles.resizeHandle} ${styles.handleNW}`}
            onMouseDown={(e) => handleMouseDownResize(e, 'nw')}
            data-testid="resize-handle-nw"
            title="Resize Top-Left"
          />
          <div
            className={`${styles.resizeHandle} ${styles.handleNE}`}
            onMouseDown={(e) => handleMouseDownResize(e, 'ne')}
            data-testid="resize-handle-ne"
            title="Resize Top-Right"
          />
          <div
            className={`${styles.resizeHandle} ${styles.handleSW}`}
            onMouseDown={(e) => handleMouseDownResize(e, 'sw')}
            data-testid="resize-handle-sw"
            title="Resize Bottom-Left"
          />
          <div
            className={`${styles.resizeHandle} ${styles.handleSE}`}
            onMouseDown={(e) => handleMouseDownResize(e, 'se')}
            data-testid="resize-handle-se"
            title="Resize Bottom-Right"
          />
        </>
      )}
    </div>
  );
}
