import { useEffect } from 'react';
import { appIcon } from '../appIcons';
import styles from './TaskViewModal.module.css';

export default function TaskViewModal({
  windows = [],
  workspaces = [{ id: 'ws-1', name: 'Desktop 1' }],
  activeWorkspaceId = 'ws-1',
  onSelectWorkspace,
  onCreateWorkspace,
  onRemoveWorkspace,
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

  // Filter windows by active workspace
  const workspaceWindows = windows.filter(
    w => w.workspaceId === activeWorkspaceId || w.workspaceId === 'all' || !w.workspaceId
  );

  return (
    <div className={styles.taskViewOverlay} onClick={onClose}>
      {/* Workspace Switcher Bar */}
      <div className={styles.workspaceBar} onClick={(e) => e.stopPropagation()}>
        <div className={styles.workspaceList}>
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              data-testid={`workspace-tab-${ws.id}`}
              className={`${styles.workspaceTab} ${ws.id === activeWorkspaceId ? styles.workspaceTabActive : ''}`}
              onClick={() => {
                playClick();
                onSelectWorkspace(ws.id);
                onClose();
              }}
            >
              <span className={styles.wsIcon}>🖥️</span>
              <span className={styles.wsName}>{ws.name}</span>
              {workspaces.length > 1 && (
                <button
                  className={styles.removeWsBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    playClick();
                    onRemoveWorkspace(ws.id);
                  }}
                  title="Close Workspace"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {workspaces.length < 5 && (
            <button
              data-testid="add-workspace-btn"
              className={styles.addWorkspaceBtn}
              onClick={() => {
                playClick();
                onCreateWorkspace();
              }}
              title="Add New Virtual Desktop"
            >
              + New Desktop
            </button>
          )}
        </div>
      </div>

      <div className={styles.header}>
        <div className={styles.title}>
          <span className={styles.titleIcon}>⧉</span>
          Task View / Workspace Switcher
        </div>
        <div className={styles.subtitle}>
          {workspaceWindows.length} Active {workspaceWindows.length === 1 ? 'Window' : 'Windows'} on {workspaces.find(w => w.id === activeWorkspaceId)?.name || 'Desktop'} • Press ESC or click anywhere to exit
        </div>
      </div>

      <div className={styles.grid}>
        {workspaceWindows.map((win) => {
          const isActive = win.id === activeWindowId;
          return (
            <div
              key={win.id}
              data-testid={`taskview-card-${win.appId}`}
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
                  <span className={styles.cardIcon}>{appIcon(win.appId, 15)}</span>
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
                  <span className={styles.previewBigIcon}>{appIcon(win.appId, 30)}</span>
                  <span className={styles.previewAppName}>{win.appId.toUpperCase()}</span>
                  <span className={styles.previewStatus}>{win.isMinimized ? 'Minimized' : 'Running'}</span>
                </div>
              </div>
            </div>
          );
        })}

        {workspaceWindows.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🪟</div>
            <div className={styles.emptyTitle}>No Windows on this Desktop</div>
            <div className={styles.emptyDesc}>Launch apps from the desktop or Start Menu to assign them to this workspace.</div>
          </div>
        )}
      </div>
    </div>
  );
}
