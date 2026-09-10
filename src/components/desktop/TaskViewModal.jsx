import { useEffect } from 'react';
import styles from './TaskViewModal.module.css';

export default function TaskViewModal({
  windows = [],
  activeWindowId,
  onSelectWindow,
  onCloseWindow,
  onClose,
  playClick = () => {},
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className={styles.taskViewOverlay} onClick={onClose}>
      <div className={styles.header}>
        <div className={styles.title}>
          <span className={styles.titleIcon}>⧉</span>
          Task View / Workspace Switcher
        </div>
        <div className={styles.subtitle}>
          {windows.length} Active {windows.length === 1 ? 'Window' : 'Windows'} • Press ESC or click anywhere to exit
        </div>
      </div>

      <div className={styles.grid}>
        {windows.map((win) => {
          const isActive = win.id === activeWindowId;
          return (
            <div
              key={win.id}
              className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                playClick();
                onSelectWindow(win.id);
                onClose();
              }}
            >
              <div className={styles.cardHeader}>
                <div className={styles.cardIdentity}>
                  <span className={styles.cardIcon}>{win.icon || '📁'}</span>
                  <span className={styles.cardTitle}>{win.title}</span>
                </div>
                <button
                  className={styles.closeBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    playClick();
                    onCloseWindow(win.id);
                  }}
                  title="Close Window"
                >
                  ✕
                </button>
              </div>

              <div className={styles.cardPreview}>
                <div className={styles.previewPlaceholder}>
                  <span className={styles.previewBigIcon}>{win.icon || '📁'}</span>
                  <span className={styles.previewAppName}>{win.appId.toUpperCase()}</span>
                  <span className={styles.previewStatus}>{win.isMinimized ? 'Minimized' : 'Running'}</span>
                </div>
              </div>
            </div>
          );
        })}

        {windows.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🪟</div>
            <div className={styles.emptyTitle}>No Windows Currently Open</div>
            <div className={styles.emptyDesc}>Launch apps from the desktop or Start Menu to see them here.</div>
          </div>
        )}
      </div>
    </div>
  );
}
