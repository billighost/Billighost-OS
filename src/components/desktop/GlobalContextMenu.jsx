import { useEffect, useRef } from 'react';
import {
  GearIcon, WindowsIcon, FolderIcon, FileTextIcon, BoltIcon,
  SearchIcon, WidgetsIcon, RefreshIcon, CheckIcon,
  CloseIcon,
} from '../Icons';
import styles from './GlobalContextMenu.module.css';

export default function GlobalContextMenu({
  menu,
  onClose,
  onAction,
  playClick = () => {},
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!menu) return null;

  const handleItemClick = (actionId, payload = {}) => {
    playClick();
    onAction(actionId, payload);
    onClose();
  };

  // Adjust coordinates to prevent overflow off screen
  const menuWidth = 230;
  const menuHeight = 320;
  const adjustedX = Math.max(10, Math.min(window.innerWidth - menuWidth - 10, menu.x));
  const adjustedY = Math.max(10, Math.min(window.innerHeight - menuHeight - 10, menu.y));

  return (
    <div
      ref={menuRef}
      className={styles.menuContainer}
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      onClick={(e) => e.stopPropagation()}
      data-testid="global-context-menu"
    >
      {/* 1. TASKBAR CONTEXT MENU */}
      {menu.type === 'taskbar' && (
        <div className={styles.menuSection}>
          <div className={styles.sectionHeader}>Taskbar System</div>

          <button
            className={styles.menuItem}
            onClick={() => handleItemClick('open_task_manager')}
            data-testid="ctx-task-manager"
          >
            <span className={styles.itemIcon}><BoltIcon size={14} /></span>
            <span className={styles.itemLabel}>Task Manager</span>
            <span className={styles.itemShortcut}>Ctrl+Shift+Esc</span>
          </button>

          <div className={styles.divider} />

          <button
            className={styles.menuItem}
            onClick={() => handleItemClick('show_desktop')}
            data-testid="ctx-show-desktop"
          >
            <span className={styles.itemIcon}><WindowsIcon size={14} /></span>
            <span className={styles.itemLabel}>Show Desktop</span>
            <span className={styles.itemShortcut}>Win+D</span>
          </button>

          <button
            className={styles.menuItem}
            onClick={() => handleItemClick('restore_all_windows')}
            data-testid="ctx-restore-all"
          >
            <span className={styles.itemIcon}><WindowsIcon size={14} /></span>
            <span className={styles.itemLabel}>Restore All Windows</span>
          </button>

          <button
            className={styles.menuItem}
            onClick={() => handleItemClick('cascade_windows')}
            data-testid="ctx-cascade-windows"
          >
            <span className={styles.itemIcon}>📐</span>
            <span className={styles.itemLabel}>Cascade Windows</span>
          </button>

          <button
            className={styles.menuItem}
            onClick={() => handleItemClick('tile_windows_horiz')}
            data-testid="ctx-tile-horiz"
          >
            <span className={styles.itemIcon}>⬒</span>
            <span className={styles.itemLabel}>Tile Horizontally</span>
          </button>

          <button
            className={styles.menuItem}
            onClick={() => handleItemClick('tile_windows_vert')}
            data-testid="ctx-tile-vert"
          >
            <span className={styles.itemIcon}>⬓</span>
            <span className={styles.itemLabel}>Tile Vertically</span>
          </button>

          <button
            className={`${styles.menuItem} ${styles.itemDanger}`}
            onClick={() => handleItemClick('close_all_windows')}
            data-testid="ctx-close-all"
          >
            <span className={styles.itemIcon}><CloseIcon size={14} /></span>
            <span className={styles.itemLabel}>Close All Windows</span>
          </button>

          <div className={styles.divider} />

          <button
            className={styles.menuItem}
            onClick={() => handleItemClick('toggle_widgets')}
            data-testid="ctx-toggle-widgets"
          >
            <span className={styles.itemIcon}><WidgetsIcon size={14} /></span>
            <span className={styles.itemLabel}>Toggle Widgets Board</span>
            <span className={styles.itemShortcut}>Alt+W</span>
          </button>

          <button
            className={styles.menuItem}
            onClick={() => handleItemClick('toggle_task_view')}
            data-testid="ctx-task-view"
          >
            <span className={styles.itemIcon}><WindowsIcon size={14} /></span>
            <span className={styles.itemLabel}>Task View (Exposé)</span>
            <span className={styles.itemShortcut}>Alt+Tab</span>
          </button>

          <button
            className={styles.menuItem}
            onClick={() => handleItemClick('toggle_taskbar_lock')}
            data-testid="ctx-lock-taskbar"
          >
            <span className={styles.itemIcon}>{menu.taskbarLocked ? <CheckIcon size={14} /> : null}</span>
            <span className={styles.itemLabel}>Lock the Taskbar</span>
          </button>

          <div className={styles.divider} />

          <button
            className={styles.menuItem}
            onClick={() => handleItemClick('open_settings_taskbar')}
            data-testid="ctx-taskbar-settings"
          >
            <span className={styles.itemIcon}><GearIcon size={14} /></span>
            <span className={styles.itemLabel}>Taskbar Settings</span>
          </button>
        </div>
      )}

      {/* 2. WINDOW TITLEBAR CONTEXT MENU */}
      {menu.type === 'window' && (
        <div className={styles.menuSection}>
          <div className={styles.sectionHeader}>{menu.targetWindow?.title || 'Window Options'}</div>

          <button
            className={styles.menuItem}
            onClick={() => handleItemClick('window_minimize', { windowId: menu.targetWindow?.id })}
          >
            <span className={styles.itemIcon}>🗕</span>
            <span className={styles.itemLabel}>Minimize</span>
          </button>

          <button
            className={styles.menuItem}
            onClick={() => handleItemClick('window_maximize', { windowId: menu.targetWindow?.id })}
          >
            <span className={styles.itemIcon}>🗖</span>
            <span className={styles.itemLabel}>{menu.targetWindow?.isMaximized ? 'Restore' : 'Maximize'}</span>
          </button>

          <div className={styles.divider} />

          <button
            className={styles.menuItem}
            onClick={() => handleItemClick('window_snap_left', { windowId: menu.targetWindow?.id })}
          >
            <span className={styles.itemIcon}>◧</span>
            <span className={styles.itemLabel}>Snap Left</span>
          </button>

          <button
            className={styles.menuItem}
            onClick={() => handleItemClick('window_snap_right', { windowId: menu.targetWindow?.id })}
          >
            <span className={styles.itemIcon}>◨</span>
            <span className={styles.itemLabel}>Snap Right</span>
          </button>

          <button
            className={styles.menuItem}
            onClick={() => handleItemClick('window_center', { windowId: menu.targetWindow?.id })}
          >
            <span className={styles.itemIcon}>✛</span>
            <span className={styles.itemLabel}>Center on Screen</span>
          </button>

          <div className={styles.divider} />

          <button
            className={`${styles.menuItem} ${styles.itemDanger}`}
            onClick={() => handleItemClick('window_close', { windowId: menu.targetWindow?.id })}
          >
            <span className={styles.itemIcon}><CloseIcon size={14} /></span>
            <span className={styles.itemLabel}>Close</span>
            <span className={styles.itemShortcut}>Alt+F4</span>
          </button>
        </div>
      )}

      {/* 3. DESKTOP / GENERAL CONTEXT MENU */}
      {(menu.type === 'desktop' || menu.type === 'general') && (
        <div className={styles.menuSection}>
          <div className={styles.sectionHeader}>Billighost OS</div>

          <button
            className={styles.menuItem}
            onClick={() => handleItemClick('desktop_new_file')}
            data-testid="ctx-new-file"
          >
            <span className={styles.itemIcon}><FileTextIcon size={14} /></span>
            <span className={styles.itemLabel}>New Text Document</span>
          </button>

          <button
            className={styles.menuItem}
            onClick={() => handleItemClick('desktop_new_folder')}
            data-testid="ctx-new-folder"
          >
            <span className={styles.itemIcon}><FolderIcon size={14} /></span>
            <span className={styles.itemLabel}>New Folder</span>
          </button>

          <div className={styles.divider} />

          <button
            className={styles.menuItem}
            onClick={() => handleItemClick('open_terminal_here')}
            data-testid="ctx-open-terminal"
          >
            <span className={styles.itemIcon}><BoltIcon size={14} /></span>
            <span className={styles.itemLabel}>Open Terminal Here</span>
          </button>

          <button
            className={styles.menuItem}
            onClick={() => handleItemClick('open_spotlight')}
            data-testid="ctx-open-spotlight"
          >
            <span className={styles.itemIcon}><SearchIcon size={14} /></span>
            <span className={styles.itemLabel}>Spotlight Search</span>
            <span className={styles.itemShortcut}>Ctrl+Space</span>
          </button>

          <button
            className={styles.menuItem}
            onClick={() => handleItemClick('desktop_refresh')}
            data-testid="ctx-refresh"
          >
            <span className={styles.itemIcon}><RefreshIcon size={14} /></span>
            <span className={styles.itemLabel}>Refresh Desktop</span>
            <span className={styles.itemShortcut}>F5</span>
          </button>

          <div className={styles.divider} />

          <button
            className={styles.menuItem}
            onClick={() => handleItemClick('desktop_change_wallpaper')}
            data-testid="ctx-change-wallpaper"
          >
            <span className={styles.itemIcon}>🖼️</span>
            <span className={styles.itemLabel}>Change Wallpaper</span>
          </button>

          <button
            className={styles.menuItem}
            onClick={() => handleItemClick('open_settings')}
            data-testid="ctx-open-settings"
          >
            <span className={styles.itemIcon}><GearIcon size={14} /></span>
            <span className={styles.itemLabel}>Personalize & Settings</span>
          </button>

          <button
            className={styles.menuItem}
            onClick={() => handleItemClick('toggle_fullscreen')}
            data-testid="ctx-fullscreen"
          >
            <span className={styles.itemIcon}>⛶</span>
            <span className={styles.itemLabel}>Toggle Fullscreen</span>
            <span className={styles.itemShortcut}>F11</span>
          </button>

          <div className={styles.divider} />

          <button
            className={styles.menuItem}
            onClick={() => handleItemClick('open_task_manager')}
            data-testid="ctx-task-manager-general"
          >
            <span className={styles.itemIcon}><BoltIcon size={14} /></span>
            <span className={styles.itemLabel}>Task Manager</span>
          </button>
        </div>
      )}
    </div>
  );
}
