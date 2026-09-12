import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useBattery } from '../hooks/useBattery';
import { useNetwork } from '../hooks/useNetwork';
import { useWeather } from '../hooks/useWeather';
import { useStorageQuota } from '../hooks/useStorageQuota';
import { useOSModal } from '../hooks/useOSModal';
import { LocalSettings } from '../services/storage/localStorage';
import { VFS } from '../services/storage/indexedDB';
import { NotificationService } from '../services/notificationService';

import DesktopIconGrid from '../components/desktop/DesktopIconGrid';
import Window from '../components/desktop/Window';
import StartMenu from '../components/desktop/StartMenu';
import TaskViewModal from '../components/desktop/TaskViewModal';
import NotificationToasts from '../components/desktop/NotificationToasts';
import OSModal from '../components/desktop/OSModal';
import SpotlightSearchModal from '../components/desktop/SpotlightSearchModal';
import WidgetsPanel from '../components/desktop/WidgetsPanel';
import GlobalContextMenu from '../components/desktop/GlobalContextMenu';
import LiveWallpaper from '../components/wallpapers/LiveWallpaper';
import { getWallpaper } from '../components/wallpapers/registry';
import {
  NetworkFlyout,
  BatteryFlyout,
  CalendarFlyout,
  ActionCenterFlyout,
} from '../components/desktop/SystemTrayFlyouts';

import SettingsApp from '../apps/SettingsApp';
import FileManagerApp from '../apps/FileManagerApp';
import TerminalApp from '../apps/TerminalApp';
import NotepadApp from '../apps/NotepadApp';
import CodeEditorApp from '../apps/CodeEditorApp';
import PaintStudioApp from '../apps/PaintStudioApp';
import TaskManagerApp from '../apps/TaskManagerApp';
import GhostBrowserApp from '../apps/GhostBrowserApp';
import AudioPlayerApp from '../apps/AudioPlayerApp';
import ImageViewerApp from '../apps/ImageViewerApp';
import CalculatorApp from '../apps/CalculatorApp';
import RecycleBinApp from '../apps/RecycleBinApp';
import VideoEditorApp from '../apps/VideoEditorApp';
import SubwaySurgeApp from '../apps/SubwaySurgeApp';
import Aetheria3DApp from '../apps/Aetheria3DApp';
import VoidStrikeApp from '../apps/VoidStrikeApp';

import {
  GearIcon, WindowsIcon, FolderIcon, ImageIcon, PenIcon,
  CodeIcon, BrushIcon, SearchIcon, WidgetsIcon, TerminalIcon,
  CalculatorIcon, GhostIcon, MusicNoteIcon, TrashIcon, GaugeIcon,
  FileIcon, FilmIcon, GamepadIcon, SwordIcon, RocketIcon,
} from '../components/Icons';

import { appForFile } from '../services/fileRouting';
import styles from './DesktopScreen.module.css';

function getFormattedTime(format = '24h') {
  const now = new Date();
  if (format === '12h') {
    return now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** SVG icon component for app tabs in the taskbar */
function AppTabSvgIcon({ appId }) {
  const iconMap = {
    settings: <GearIcon size={14} />,
    files: <FolderIcon size={14} />,
    terminal: <TerminalIcon size={14} />,
    notepad: <PenIcon size={14} />,
    code: <CodeIcon size={14} />,
    paint: <BrushIcon size={14} />,
    browser: <GhostIcon size={14} />,
    gallery: <ImageIcon size={14} />,
    media: <MusicNoteIcon size={14} />,
    calculator: <CalculatorIcon size={14} />,
    trash: <TrashIcon size={14} />,
    monitor: <GaugeIcon size={14} />,
    video: <FilmIcon size={14} />,
    subwaysurge: <GamepadIcon size={14} />,
    aetheria: <SwordIcon size={14} />,
    voidstrike: <RocketIcon size={14} />,
  };
  return iconMap[appId] || <FileIcon size={14} />;
}

/** Icon per app, for window titles and Task View cards. */
export function AppIcon({ appId, size = 15 }) {
  const map = {
    settings: <GearIcon size={size} />,
    files: <FolderIcon size={size} />,
    terminal: <TerminalIcon size={size} />,
    notepad: <PenIcon size={size} />,
    code: <CodeIcon size={size} />,
    paint: <BrushIcon size={size} />,
    browser: <GhostIcon size={size} />,
    gallery: <ImageIcon size={size} />,
    media: <MusicNoteIcon size={size} />,
    calculator: <CalculatorIcon size={size} />,
    trash: <TrashIcon size={size} />,
    monitor: <GaugeIcon size={size} />,
    video: <FilmIcon size={size} />,
    subwaysurge: <GamepadIcon size={size} />,
    aetheria: <SwordIcon size={size} />,
    voidstrike: <RocketIcon size={size} />,
  };
  return map[appId] || <FileIcon size={size} />;
}

export default function DesktopScreen({ wallpaperSrc: externalWallpaper, onLock, playClick = () => {} }) {
  // --- Persistent Settings State ---
  const [profile, setProfile] = useState(() => LocalSettings.getProfile());
  const [appearance, setAppearance] = useState(() => LocalSettings.getAppearance());
  const [sound, setSound] = useState(() => LocalSettings.getSound());
  const [security, setSecurity] = useState(() => LocalSettings.getSecurity());

  // --- OS Modal System ---
  const osModal = useOSModal();

  // --- Virtual Desktops / Workspaces ---
  const [workspaces, setWorkspaces] = useState([
    { id: 'ws-1', name: 'Desktop 1' },
    { id: 'ws-2', name: 'Desktop 2' },
  ]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('ws-1');
  const lastActivityRef = useRef(0);

  // --- Real Hardware Telemetry ---
  const battery = useBattery();
  const network = useNetwork();
  const storage = useStorageQuota();
  const weather = useWeather();

  // --- Clock ---
  const [time, setTime] = useState(() => getFormattedTime(appearance.clockFormat));

  // --- UI Flyouts, Overlays & Task View ---
  const [activeFlyout, setActiveFlyout] = useState(null); // 'start' | 'network' | 'battery' | 'calendar' | 'control' | null
  const [showTaskView, setShowTaskView] = useState(false);
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [showWidgets, setShowWidgets] = useState(false);
  const [snapPreview, setSnapPreview] = useState(null); // 'full' | 'left' | 'right' | null

  // --- Window Manager State ---
  const [windows, setWindows] = useState([]);
  const [activeWindowId, setActiveWindowId] = useState(null);
  const [nextZIndex, setNextZIndex] = useState(10);

  // Initialize VFS on boot
  useEffect(() => {
    VFS.init().catch(err => console.error('VFS Init error:', err));
  }, []);

  // Listen for settings changes across windows/apps
  useEffect(() => {
    const handleProfile = (e) => setProfile(e.detail);
    const handleAppearance = (e) => setAppearance(e.detail);
    const handleSound = (e) => setSound(e.detail);
    const handleSecurity = (e) => setSecurity(e.detail);

    window.addEventListener('billighost:profile-change', handleProfile);
    window.addEventListener('billighost:appearance-change', handleAppearance);
    window.addEventListener('billighost:sound-change', handleSound);
    window.addEventListener('billighost:security-change', handleSecurity);

    return () => {
      window.removeEventListener('billighost:profile-change', handleProfile);
      window.removeEventListener('billighost:appearance-change', handleAppearance);
      window.removeEventListener('billighost:sound-change', handleSound);
      window.removeEventListener('billighost:security-change', handleSecurity);
    };
  }, []);

  // Idle Auto-Lock Detection
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('mousedown', updateActivity);
    window.addEventListener('touchstart', updateActivity);

    const checkInterval = setInterval(() => {
      const timeoutMinutes = security?.autoLockMinutes || 0;
      if (timeoutMinutes > 0) {
        const elapsedMs = Date.now() - lastActivityRef.current;
        if (elapsedMs >= timeoutMinutes * 60 * 1000) {
          if (onLock) {
            onLock();
            NotificationService.send({
              title: 'Session Auto-Locked',
              message: `Inactivity timeout of ${timeoutMinutes} min reached`,
              type: 'info',
            });
          }
        }
      }
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('mousedown', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      clearInterval(checkInterval);
    };
  }, [security?.autoLockMinutes, onLock]);

  // Network Telemetry Notifications
  const prevOnlineRef = useRef(network.isOnline);
  useEffect(() => {
    if (prevOnlineRef.current !== network.isOnline) {
      if (network.isOnline) {
        NotificationService.send({
          title: 'Network Connected',
          message: `Connected via ${network.effectiveType.toUpperCase()} (${network.downlink} Mbps)`,
          type: 'success',
        });
      } else {
        NotificationService.send({
          title: 'Network Disconnected',
          message: 'System is now in offline mode',
          type: 'warning',
        });
      }
      prevOnlineRef.current = network.isOnline;
    }
  }, [network.isOnline, network.effectiveType, network.downlink]);

  // Virtual Desktops Switcher Handlers
  const handleSelectWorkspace = useCallback((wsId) => {
    setActiveWorkspaceId(wsId);
    const ws = workspaces.find(w => w.id === wsId);
    if (ws) {
      NotificationService.send({
        title: 'Virtual Desktop',
        message: `Switched to ${ws.name}`,
        type: 'info',
      });
    }
  }, [workspaces]);

  const handleCreateWorkspace = useCallback(() => {
    if (workspaces.length >= 5) return;
    const newId = `ws-${Date.now()}`;
    const newName = `Desktop ${workspaces.length + 1}`;
    const newWs = { id: newId, name: newName };
    setWorkspaces(prev => [...prev, newWs]);
    setActiveWorkspaceId(newId);
    NotificationService.send({
      title: 'New Desktop',
      message: `${newName} created and active`,
      type: 'success',
    });
  }, [workspaces.length]);

  const handleRemoveWorkspace = useCallback((wsId) => {
    if (workspaces.length <= 1) return;
    const targetWs = workspaces.find(w => w.id === wsId);
    setWorkspaces(prev => prev.filter(w => w.id !== wsId));
    setWindows(prev => prev.map(w => w.workspaceId === wsId ? { ...w, workspaceId: 'ws-1' } : w));
    if (activeWorkspaceId === wsId) {
      setActiveWorkspaceId('ws-1');
    }
    NotificationService.send({
      title: 'Desktop Removed',
      message: `Closed ${targetWs?.name || 'desktop'}. Windows moved to Desktop 1.`,
      type: 'info',
    });
  }, [workspaces, activeWorkspaceId]);

  // Clock interval
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(getFormattedTime(appearance.clockFormat));
    }, 1000);
    return () => clearInterval(timer);
  }, [appearance.clockFormat]);

  // Apply accent color to document root
  useEffect(() => {
    if (appearance.accentColor) {
      document.documentElement.style.setProperty('--accent-glow', appearance.accentColor);
    }
  }, [appearance.accentColor]);

  // Keyboard Shortcuts: Alt+Tab (Task View), Ctrl+Alt+Arrows (Workspace), Ctrl+Space (Spotlight), Alt+W (Widgets)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Spotlight Search: Ctrl+Space, Cmd+Space, or Alt+Space
      if ((e.ctrlKey || e.metaKey || e.altKey) && e.code === 'Space') {
        e.preventDefault();
        setShowSpotlight(prev => !prev);
        return;
      }

      // Widgets Board: Alt+W
      if (e.altKey && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        setShowWidgets(prev => !prev);
        return;
      }

      // Task View / Exposé
      if ((e.altKey || e.metaKey) && (e.key === 'Tab' || e.key === 'q')) {
        e.preventDefault();
        setShowTaskView(prev => !prev);
        return;
      }

      // Virtual Desktops Switcher
      if (e.ctrlKey && e.altKey) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          const currentIndex = workspaces.findIndex(w => w.id === activeWorkspaceId);
          const nextIndex = (currentIndex + 1) % workspaces.length;
          handleSelectWorkspace(workspaces[nextIndex].id);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const currentIndex = workspaces.findIndex(w => w.id === activeWorkspaceId);
          const prevIndex = (currentIndex - 1 + workspaces.length) % workspaces.length;
          handleSelectWorkspace(workspaces[prevIndex].id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [workspaces, activeWorkspaceId, handleSelectWorkspace]);

  // --- Window Actions ---
  const handleLaunchApp = useCallback((appId, title, icon, props = {}) => {
    playClick();
    setWindows(prev => {
      // Check if window already open and just focus/unminimize
      const existing = prev.find(w => w.appId === appId && (!props.filePath || w.props?.filePath === props.filePath));
      if (existing) {
        setActiveWindowId(existing.id);
        return prev.map(w =>
          w.id === existing.id
            ? { ...w, workspaceId: activeWorkspaceId, isMinimized: false, zIndex: nextZIndex + 1, props: { ...w.props, ...props } }
            : w
        );
      }

      // Stagger window positions nicely
      const offset = (prev.length % 5) * 28;
      const initialPos = {
        x: Math.min(window.innerWidth - 680, 100 + offset),
        y: Math.min(window.innerHeight - 520, 60 + offset),
      };

      const defaultSizes = {
        settings: { w: 740, h: 480 },
        files: { w: 680, h: 440 },
        terminal: { w: 640, h: 400 },
        notepad: { w: 600, h: 420 },
        code: { w: 780, h: 500 },
        paint: { w: 840, h: 540 },
        monitor: { w: 540, h: 380 },
        browser: { w: 780, h: 500 },
        media: { w: 460, h: 320 },
        gallery: { w: 640, h: 460 },
        calculator: { w: 480, h: 440 },
        trash: { w: 680, h: 440 },
        video: { w: 900, h: 600 },
        subwaysurge: { w: 860, h: 580 },
        aetheria: { w: 920, h: 620 },
        voidstrike: { w: 940, h: 620 },
      };

      const size = defaultSizes[appId] || { w: 640, h: 420 };
      const newWin = {
        id: `win-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        appId,
        title,
        icon, // now null for SVG — Window component handles icon rendering
        props,
        workspaceId: activeWorkspaceId,
        isMinimized: false,
        isMaximized: false,
        snapState: null,
        restoreSize: size,
        position: initialPos,
        size,
        zIndex: nextZIndex + 1,
      };

      setNextZIndex(z => z + 1);
      setActiveWindowId(newWin.id);
      return [...prev, newWin];
    });
  }, [nextZIndex, playClick, activeWorkspaceId]);

  const handleFocusWindow = useCallback((id) => {
    setActiveWindowId(id);
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, isMinimized: false, zIndex: nextZIndex + 1 } : w))
    );
    setNextZIndex(z => z + 1);
  }, [nextZIndex]);

  const handleCloseWindow = useCallback((id) => {
    playClick();
    setWindows(prev => prev.filter(w => w.id !== id));
    if (activeWindowId === id) {
      setActiveWindowId(null);
    }
  }, [activeWindowId, playClick]);

  const handleMinimizeWindow = useCallback((id) => {
    window.dispatchEvent(new CustomEvent('billighost:play-sound', { detail: 'minimize' }));
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, isMinimized: true } : w))
    );
    if (activeWindowId === id) {
      setActiveWindowId(null);
    }
  }, [activeWindowId]);

  const handleMaximizeWindow = useCallback((id) => {
    window.dispatchEvent(new CustomEvent('billighost:play-sound', { detail: 'maximize' }));
    setWindows(prev =>
      prev.map(w => {
        if (w.id !== id) return w;
        return {
          ...w,
          isMaximized: !w.isMaximized,
          snapState: null,
          restoreSize: w.isMaximized ? w.restoreSize : w.size,
        };
      })
    );
  }, []);

  const handleSnap = useCallback((id, snapType) => {
    window.dispatchEvent(new CustomEvent('billighost:play-sound', { detail: 'snap' }));
    setWindows(prev =>
      prev.map(w => {
        if (w.id !== id) return w;
        return {
          ...w,
          snapState: snapType,
          isMaximized: false,
          restoreSize: w.snapState ? w.restoreSize : w.size,
        };
      })
    );
  }, []);

  const handleUpdatePos = useCallback((id, pos) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, position: pos } : w))
    );
  }, []);

  const handleUpdateSize = useCallback((id, size) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, size, restoreSize: size } : w))
    );
  }, []);

  // --- Global Context Menu & Taskbar State ---
  const [globalContextMenu, setGlobalContextMenu] = useState(null);
  const [taskbarLocked, setTaskbarLocked] = useState(true);

  const toggleFlyout = (flyoutName) => {
    playClick();
    setGlobalContextMenu(null);
    setActiveFlyout(prev => (prev === flyoutName ? null : flyoutName));
  };

  const closeAllFlyouts = () => {
    setActiveFlyout(null);
    setGlobalContextMenu(null);
  };

  // Universal contextmenu interceptor across entire OS
  useEffect(() => {
    const handleUniversalContextMenu = (e) => {
      e.preventDefault(); // SUPPRESS BROWSER DEFAULT CLICK EVERYWHERE!
      setActiveFlyout(null);

      const taskbarEl = e.target.closest(`.${styles.taskbar}`);
      const windowHeaderEl = e.target.closest('[data-context="window-titlebar"]');

      if (taskbarEl) {
        setGlobalContextMenu({
          x: e.clientX,
          y: e.clientY,
          type: 'taskbar',
          taskbarLocked,
        });
      } else if (windowHeaderEl) {
        const winId = windowHeaderEl.getAttribute('data-window-id');
        const win = windows.find(w => w.id === winId);
        setGlobalContextMenu({
          x: e.clientX,
          y: e.clientY,
          type: 'window',
          targetWindow: win,
        });
      } else {
        setGlobalContextMenu({
          x: e.clientX,
          y: e.clientY,
          type: 'desktop',
        });
      }
    };

    window.addEventListener('contextmenu', handleUniversalContextMenu);
    return () => window.removeEventListener('contextmenu', handleUniversalContextMenu);
  }, [windows, taskbarLocked]);

  const handleGlobalContextAction = useCallback(async (actionId, payload = {}) => {
    playClick();
    switch (actionId) {
      case 'open_task_manager':
        handleLaunchApp('monitor', 'Task Manager', null);
        break;
      case 'show_desktop':
        setWindows(prev => prev.map(w => ({ ...w, isMinimized: true })));
        break;
      case 'restore_all_windows':
        setWindows(prev => prev.map(w => ({ ...w, isMinimized: false })));
        break;
      case 'cascade_windows':
        setWindows(prev =>
          prev.map((w, idx) => ({
            ...w,
            isMinimized: false,
            isMaximized: false,
            snapState: null,
            position: {
              x: Math.min(window.innerWidth - 480, 50 + (idx % 8) * 36),
              y: Math.min(window.innerHeight - 360, 40 + (idx % 8) * 36),
            },
            zIndex: nextZIndex + idx + 1,
          }))
        );
        setNextZIndex(z => z + windows.length + 1);
        break;
      case 'tile_windows_horiz': {
        const openWins = windows.filter(w => !w.isMinimized);
        const count = openWins.length || 1;
        const tileW = Math.max(300, Math.floor((window.innerWidth - 40) / count));
        setWindows(prev =>
          prev.map((w) => {
            const openIdx = openWins.findIndex(ow => ow.id === w.id);
            if (openIdx === -1) return w;
            return {
              ...w,
              isMinimized: false,
              isMaximized: false,
              snapState: null,
              position: { x: 20 + openIdx * tileW, y: 40 },
              size: { w: tileW - 10, h: window.innerHeight - 90 },
            };
          })
        );
        break;
      }
      case 'tile_windows_vert': {
        const openWins = windows.filter(w => !w.isMinimized);
        const count = openWins.length || 1;
        const tileH = Math.max(200, Math.floor((window.innerHeight - 90) / count));
        setWindows(prev =>
          prev.map((w) => {
            const openIdx = openWins.findIndex(ow => ow.id === w.id);
            if (openIdx === -1) return w;
            return {
              ...w,
              isMinimized: false,
              isMaximized: false,
              snapState: null,
              position: { x: 30, y: 40 + openIdx * tileH },
              size: { w: window.innerWidth - 60, h: tileH - 10 },
            };
          })
        );
        break;
      }
      case 'close_all_windows':
        setWindows([]);
        break;
      case 'toggle_widgets':
        setShowWidgets(prev => !prev);
        break;
      case 'toggle_task_view':
        setShowTaskView(prev => !prev);
        break;
      case 'toggle_taskbar_lock':
        setTaskbarLocked(prev => !prev);
        break;
      case 'open_settings_taskbar':
        handleLaunchApp('settings', 'Settings', null, { activeTab: 'appearance' });
        break;
      case 'open_settings':
        handleLaunchApp('settings', 'Settings', null);
        break;
      case 'open_terminal_here':
        handleLaunchApp('terminal', 'Terminal', null);
        break;
      case 'open_spotlight':
        setShowSpotlight(true);
        break;
      case 'desktop_change_wallpaper':
        handleLaunchApp('settings', 'Settings', null, { activeTab: 'appearance' });
        break;
      case 'desktop_new_file': {
        const fileName = `Document_${Date.now().toString().slice(-4)}.txt`;
        await VFS.writeFile(`/Users/User/Desktop/${fileName}`, 'Created from Desktop context menu.\n');
        break;
      }
      case 'desktop_new_folder': {
        const folderName = `Folder_${Date.now().toString().slice(-4)}`;
        await VFS.createDirectory(`/Users/User/Desktop/${folderName}`);
        break;
      }
      case 'desktop_refresh':
        window.dispatchEvent(new CustomEvent('billighost:vfs-update'));
        break;
      case 'toggle_fullscreen':
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
        break;
      case 'window_minimize':
        if (payload.windowId) handleMinimizeWindow(payload.windowId);
        break;
      case 'window_maximize':
        if (payload.windowId) handleMaximizeWindow(payload.windowId);
        break;
      case 'window_snap_left':
        if (payload.windowId) handleSnap(payload.windowId, 'left');
        break;
      case 'window_snap_right':
        if (payload.windowId) handleSnap(payload.windowId, 'right');
        break;
      case 'window_center':
        if (payload.windowId) {
          const win = windows.find(w => w.id === payload.windowId);
          if (win) {
            const w = win.size?.w || 640;
            const h = win.size?.h || 420;
            handleUpdatePos(payload.windowId, {
              x: Math.max(20, Math.floor((window.innerWidth - w) / 2)),
              y: Math.max(40, Math.floor((window.innerHeight - h) / 2)),
            });
          }
        }
        break;
      case 'window_close':
        if (payload.windowId) handleCloseWindow(payload.windowId);
        break;
      default:
        break;
    }
  }, [handleLaunchApp, handleMinimizeWindow, handleMaximizeWindow, handleSnap, handleCloseWindow, handleUpdatePos, nextZIndex, playClick, windows]);

  // Compute wallpaper style
  const wallpaperStyle = useMemo(() => {
    if (appearance.customWallpaperData) {
      return { backgroundImage: `url("${appearance.customWallpaperData}")`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    if (appearance.wallpaperCss) {
      return { background: appearance.wallpaperCss };
    }
    // Fall back to the registry, so a wallpaper chosen by id still renders
    // even if its CSS was never copied into settings.
    const fromRegistry = getWallpaper(appearance.wallpaper);
    if (fromRegistry?.css) {
      return { background: fromRegistry.css };
    }
    return null;
  }, [appearance.customWallpaperData, appearance.wallpaperCss, appearance.wallpaper]);

  /*
   * Which live effect is running, if any.
   *
   * A custom uploaded image has no effect attached, and an explicitly stored
   * liveWallpaper wins over the id lookup so an older saved setting still
   * resolves correctly.
   */
  const liveEffect = useMemo(() => {
    if (appearance.customWallpaperData) return null;
    if (appearance.liveWallpaper) return appearance.liveWallpaper;
    return getWallpaper(appearance.wallpaper)?.live || null;
  }, [appearance.customWallpaperData, appearance.liveWallpaper, appearance.wallpaper]);

  // Filter windows by active virtual desktop workspace
  const visibleWindows = useMemo(() => {
    return windows.filter(
      w => !w.workspaceId || w.workspaceId === activeWorkspaceId || w.workspaceId === 'all'
    );
  }, [windows, activeWorkspaceId]);

  return (
    <div className={styles.container} onClick={closeAllFlyouts}>
      {/* Night Light Screen Filter */}
      {appearance.nightLight && <div className={styles.nightLightOverlay} />}

      {/* Wallpaper Layer */}
      {wallpaperStyle ? (
        <div className={styles.wallpaper} style={wallpaperStyle} />
      ) : externalWallpaper ? (
        <img src={externalWallpaper} alt="" className={styles.wallpaper} draggable={false} />
      ) : (
        <div className={styles.wallpaperFallback} />
      )}

      {/*
        Live effect, above the static backdrop and below every UI layer.
        It measures window and icon rects itself, which is how rain lands on
        open windows rather than behind them.
      */}
      <LiveWallpaper effect={liveEffect} />

      {/* Snap Preview Ghost Outlines */}
      {snapPreview === 'full' && <div className={styles.snapPreviewFull} />}
      {snapPreview === 'left' && <div className={styles.snapPreviewLeft} />}
      {snapPreview === 'right' && <div className={styles.snapPreviewRight} />}

      {/* Desktop Workspace & Icon Grid */}
      <div className={styles.desktopArea}>
        <DesktopIconGrid
          onLaunchApp={handleLaunchApp}
          playClick={playClick}
        />

        {/* Floating Windows Manager */}
        {visibleWindows.map((win) => (
          <Window
            key={win.id}
            window={win}
            isActive={activeWindowId === win.id}
            onFocus={() => handleFocusWindow(win.id)}
            onClose={() => handleCloseWindow(win.id)}
            onMinimize={() => handleMinimizeWindow(win.id)}
            onMaximize={() => handleMaximizeWindow(win.id)}
            onSnap={handleSnap}
            onSnapPreview={setSnapPreview}
            onUpdatePos={handleUpdatePos}
            onUpdateSize={handleUpdateSize}
            playClick={playClick}
          >
            {win.appId === 'settings' && (
              <SettingsApp
                initialTab={win.props?.activeTab || 'profile'}
                playClick={playClick}
                osModal={osModal}
                onLock={onLock}
              />
            )}
            {win.appId === 'files' && (
              <FileManagerApp
                initialPath={win.props?.initialPath || '/Users/User'}
                onOpenFile={(path, name) => handleLaunchApp(
                  appForFile(name), name, null, { filePath: path }
                )}
                playClick={playClick}
                osModal={osModal}
              />
            )}
            {win.appId === 'terminal' && (
              <TerminalApp
                onLock={onLock}
                onRestart={() => window.location.reload()}
              />
            )}
            {win.appId === 'notepad' && (
              <NotepadApp
                filePath={win.props?.filePath || null}
                playClick={playClick}
                osModal={osModal}
              />
            )}
            {win.appId === 'code' && (
              <CodeEditorApp
                filePath={win.props?.filePath || null}
                playClick={playClick}
                osModal={osModal}
              />
            )}
            {win.appId === 'paint' && (
              <PaintStudioApp
                playClick={playClick}
                osModal={osModal}
              />
            )}
            {win.appId === 'monitor' && (
              <TaskManagerApp
                windows={windows}
                onCloseWindow={handleCloseWindow}
                playClick={playClick}
              />
            )}
            {win.appId === 'browser' && (
              <GhostBrowserApp
                playClick={playClick}
              />
            )}
            {win.appId === 'media' && (
              <AudioPlayerApp
                filePath={win.props?.filePath || null}
                playClick={playClick}
              />
            )}
            {win.appId === 'gallery' && (
              <ImageViewerApp
                filePath={win.props?.filePath || null}
                playClick={playClick}
              />
            )}
            {win.appId === 'calculator' && (
              <CalculatorApp
                playClick={playClick}
              />
            )}
            {win.appId === 'trash' && (
              <RecycleBinApp
                playClick={playClick}
                osModal={osModal}
              />
            )}
            {win.appId === 'video' && (
              <VideoEditorApp
                filePath={win.props?.filePath || null}
                playClick={playClick}
                osModal={osModal}
              />
            )}
            {win.appId === 'subwaysurge' && (
              <SubwaySurgeApp
                playClick={playClick}
              />
            )}
            {win.appId === 'aetheria' && (
              <Aetheria3DApp
                playClick={playClick}
              />
            )}
            {win.appId === 'voidstrike' && (
              <VoidStrikeApp
                playClick={playClick}
              />
            )}
          </Window>
        ))}
      </div>

      {/* Real-time Notification Toasts */}
      <NotificationToasts playClick={playClick} />

      {/* OS Modal Dialogs */}
      <OSModal {...osModal.modalProps} />

      {/* Universal Spotlight Search Modal */}
      <SpotlightSearchModal
        isOpen={showSpotlight}
        onClose={() => setShowSpotlight(false)}
        onLaunchApp={handleLaunchApp}
        playClick={playClick}
      />

      {/* Widgets Board Side Panel */}
      <WidgetsPanel
        isOpen={showWidgets}
        onClose={() => setShowWidgets(false)}
        onOpenSettings={() => handleLaunchApp('settings', 'Settings', null)}
        playClick={playClick}
      />

      {/* Task View / Alt+Tab Exposé Switcher */}
      {showTaskView && (
        <TaskViewModal
          windows={windows}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onSelectWorkspace={handleSelectWorkspace}
          onCreateWorkspace={handleCreateWorkspace}
          onRemoveWorkspace={handleRemoveWorkspace}
          activeWindowId={activeWindowId}
          onSelectWindow={handleFocusWindow}
          onCloseWindow={handleCloseWindow}
          onClose={() => setShowTaskView(false)}
          playClick={playClick}
        />
      )}

      {/* Flyout Panels */}
      {activeFlyout === 'start' && (
        <StartMenu
          profile={profile}
          onLaunchApp={handleLaunchApp}
          onLock={onLock}
          onRestart={() => window.location.reload()}
          onShutdown={() => window.location.reload()}
          onClose={closeAllFlyouts}
          playClick={playClick}
        />
      )}

      {activeFlyout === 'network' && (
        <NetworkFlyout
          network={network}
          onClose={closeAllFlyouts}
          playClick={playClick}
        />
      )}

      {activeFlyout === 'battery' && (
        <BatteryFlyout
          battery={battery}
          onClose={closeAllFlyouts}
          playClick={playClick}
        />
      )}

      {activeFlyout === 'calendar' && (
        <CalendarFlyout
          onClose={closeAllFlyouts}
          playClick={playClick}
        />
      )}

      {activeFlyout === 'control' && (
        <ActionCenterFlyout
          storage={storage}
          soundConfig={sound}
          onUpdateSound={LocalSettings.setSound.bind(LocalSettings)}
          appearance={appearance}
          onUpdateAppearance={LocalSettings.setAppearance.bind(LocalSettings)}
          onOpenSettings={() => handleLaunchApp('settings', 'Settings', null)}
          onClose={closeAllFlyouts}
          playClick={playClick}
        />
      )}

      {/* Glass Taskbar */}
      <div className={styles.taskbar} data-taskbar onClick={(e) => e.stopPropagation()}>
        {/* Left: Start Button + Spotlight + Widgets + Task View */}
        <div className={styles.taskbarLeft}>
          <button
            className={`${styles.startBtn} ${activeFlyout === 'start' ? styles.startBtnActive : ''}`}
            onClick={() => toggleFlyout('start')}
            title="Open Start Menu"
            data-testid="start-menu-btn"
          >
            <span className={styles.startLogoDot} />
            Billighost
          </button>

          <button
            className={`${styles.spotlightBtn} ${showSpotlight ? styles.spotlightBtnActive : ''}`}
            onClick={() => {
              playClick();
              setShowSpotlight(prev => !prev);
            }}
            title="Spotlight Search (Ctrl+Space)"
            data-testid="taskbar-spotlight-btn"
          >
            <SearchIcon size={16} />
          </button>

          <button
            className={`${styles.widgetTaskbarBtn} ${showWidgets ? styles.widgetTaskbarBtnActive : ''}`}
            onClick={() => {
              playClick();
              setShowWidgets(prev => !prev);
            }}
            title="Widgets Board (Alt+W)"
            data-testid="taskbar-widgets-btn"
          >
            <WidgetsIcon size={16} />
            <span>{weather.tempText || '21°C'}</span>
          </button>

          <button
            className={`${styles.taskViewBtn} ${showTaskView ? styles.taskViewBtnActive : ''}`}
            onClick={() => {
              playClick();
              setShowTaskView(prev => !prev);
            }}
            title="Task View (Alt+Tab)"
            data-testid="taskbar-taskview-btn"
          >
            <WindowsIcon size={16} />
          </button>
        </div>

        {/* Center: Running Applications Tabs (Filtered by active workspace) */}
        <div className={styles.taskbarCenter}>
          {visibleWindows.map((win) => {
            const isActive = activeWindowId === win.id && !win.isMinimized;
            return (
              <button
                key={win.id}
                className={`${styles.appTab} ${isActive ? styles.appTabActive : ''}`}
                onClick={() => {
                  playClick();
                  if (win.isMinimized) {
                    handleFocusWindow(win.id);
                  } else if (isActive) {
                    handleMinimizeWindow(win.id);
                  } else {
                    handleFocusWindow(win.id);
                  }
                }}
                title={win.title}
              >
                <span className={styles.appTabIcon}>
                  <AppTabSvgIcon appId={win.appId} />
                </span>
                <span className={styles.appTabTitle}>{win.title}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Interactive System Tray */}
        <div className={styles.taskbarRight}>
          {/* Real Network Icon & Status */}
          <button
            className={`${styles.trayBtn} ${activeFlyout === 'network' ? styles.trayBtnActive : ''}`}
            onClick={() => toggleFlyout('network')}
            title={`Network: ${network.isOnline ? network.effectiveType.toUpperCase() : 'Offline'} (${network.downlink} Mbps)`}
          >
            <div className={styles.wifiIcon}>
              <div className={styles.wifiDot} />
              <span className={styles.wifiRing1} />
              {network.isOnline && <span className={styles.wifiRing2} />}
            </div>
            <span>{network.isOnline ? network.effectiveType.toUpperCase() : 'Off'}</span>
          </button>

          {/* Real Battery Icon & Status */}
          <button
            className={`${styles.trayBtn} ${activeFlyout === 'battery' ? styles.trayBtnActive : ''}`}
            onClick={() => toggleFlyout('battery')}
            title={`Battery: ${battery.levelText} \u2022 ${battery.statusText}`}
          >
            <div className={styles.batteryIcon}>
              <div
                className={styles.batteryFill}
                style={{
                  width: `${battery.barWidth}%`,
                  background: battery.tone === 'critical' ? 'var(--accent-error)'
                    : battery.tone === 'warn' ? 'var(--accent-warning)'
                    : 'var(--accent-success)',
                }}
              />
            </div>
            <span>{battery.levelText}</span>
          </button>

          {/* Real Local Clock & Date */}
          <button
            className={`${styles.trayBtn} ${activeFlyout === 'calendar' ? styles.trayBtnActive : ''}`}
            onClick={() => toggleFlyout('calendar')}
            title="Open Calendar & Date"
          >
            <span className={styles.trayClock}>{time}</span>
          </button>

          {/* Control Center Quick Button */}
          <button
            className={`${styles.actionCenterBtn} ${activeFlyout === 'control' ? styles.trayBtnActive : ''}`}
            onClick={() => toggleFlyout('control')}
            title="Open Control Center"
          >
            <GearIcon size={16} />
          </button>

          {/* Lock Button */}
          <button
            className={styles.lockBtn}
            onClick={() => {
              playClick();
              if (onLock) onLock();
            }}
            title="Lock OS session"
          >
            Lock
          </button>

          {/* Far Right Peek: Show Desktop */}
          <button
            className={styles.showDesktopPeekBtn}
            onClick={() => {
              playClick();
              const anyOpen = windows.some(w => !w.isMinimized);
              setWindows(prev => prev.map(w => ({ ...w, isMinimized: anyOpen })));
            }}
            title="Show Desktop (Peek)"
            data-testid="show-desktop-peek"
          />
        </div>
      </div>

      {/* Global Universal Context Menu */}
      <GlobalContextMenu
        menu={globalContextMenu}
        onClose={() => setGlobalContextMenu(null)}
        onAction={handleGlobalContextAction}
        playClick={playClick}
      />
    </div>
  );
}

