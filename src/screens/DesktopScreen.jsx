import { useState, useEffect, useCallback, useMemo } from 'react';
import { useBattery } from '../hooks/useBattery';
import { useNetwork } from '../hooks/useNetwork';
import { useStorageQuota } from '../hooks/useStorageQuota';
import { LocalSettings } from '../services/storage/localStorage';
import { VFS } from '../services/storage/indexedDB';

import DesktopIconGrid from '../components/desktop/DesktopIconGrid';
import Window from '../components/desktop/Window';
import StartMenu from '../components/desktop/StartMenu';
import TaskViewModal from '../components/desktop/TaskViewModal';
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
import TaskManagerApp from '../apps/TaskManagerApp';
import GhostBrowserApp from '../apps/GhostBrowserApp';
import AudioPlayerApp from '../apps/AudioPlayerApp';
import ImageViewerApp from '../apps/ImageViewerApp';
import CalculatorApp from '../apps/CalculatorApp';

import styles from './DesktopScreen.module.css';

function getFormattedTime(format = '24h') {
  const now = new Date();
  if (format === '12h') {
    return now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function DesktopScreen({ wallpaperSrc: externalWallpaper, onLock, playClick = () => {} }) {
  // --- Persistent Settings State ---
  const [profile, setProfile] = useState(() => LocalSettings.getProfile());
  const [appearance, setAppearance] = useState(() => LocalSettings.getAppearance());
  const [sound, setSound] = useState(() => LocalSettings.getSound());

  // --- Real Hardware Telemetry ---
  const battery = useBattery();
  const network = useNetwork();
  const storage = useStorageQuota();

  // --- Clock ---
  const [time, setTime] = useState(() => getFormattedTime(appearance.clockFormat));

  // --- UI Flyouts & Task View ---
  const [activeFlyout, setActiveFlyout] = useState(null); // 'start' | 'network' | 'battery' | 'calendar' | 'control' | null
  const [showTaskView, setShowTaskView] = useState(false);
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

    window.addEventListener('billighost:profile-change', handleProfile);
    window.addEventListener('billighost:appearance-change', handleAppearance);
    window.addEventListener('billighost:sound-change', handleSound);

    return () => {
      window.removeEventListener('billighost:profile-change', handleProfile);
      window.removeEventListener('billighost:appearance-change', handleAppearance);
      window.removeEventListener('billighost:sound-change', handleSound);
    };
  }, []);

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

  // Alt + Tab Keyboard Shortcut for Task View
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.altKey || e.metaKey) && (e.key === 'Tab' || e.key === 'q')) {
        e.preventDefault();
        setShowTaskView(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
            ? { ...w, isMinimized: false, zIndex: nextZIndex + 1, props: { ...w.props, ...props } }
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
        monitor: { w: 540, h: 380 },
        browser: { w: 780, h: 500 },
        media: { w: 460, h: 320 },
        gallery: { w: 640, h: 460 },
        calculator: { w: 480, h: 440 },
      };

      const size = defaultSizes[appId] || { w: 640, h: 420 };
      const newWin = {
        id: `win-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        appId,
        title,
        icon,
        props,
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
  }, [nextZIndex, playClick]);

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
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, isMinimized: true } : w))
    );
    if (activeWindowId === id) {
      setActiveWindowId(null);
    }
  }, [activeWindowId]);

  const handleMaximizeWindow = useCallback((id) => {
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

  const toggleFlyout = (flyoutName) => {
    playClick();
    setActiveFlyout(prev => (prev === flyoutName ? null : flyoutName));
  };

  const closeAllFlyouts = () => {
    setActiveFlyout(null);
  };

  // Compute wallpaper style
  const wallpaperStyle = useMemo(() => {
    if (appearance.customWallpaperData) {
      return { backgroundImage: `url("${appearance.customWallpaperData}")`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    if (appearance.wallpaperCss) {
      return { background: appearance.wallpaperCss };
    }
    return null;
  }, [appearance.customWallpaperData, appearance.wallpaperCss]);

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
        {windows.map((win) => (
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
              />
            )}
            {win.appId === 'files' && (
              <FileManagerApp
                initialPath={win.props?.initialPath || '/Users/User'}
                onOpenFile={(path, name) => {
                  if (name.endsWith('.svg') || name.endsWith('.png') || name.endsWith('.jpg')) {
                    handleLaunchApp('gallery', name, '🖼️', { filePath: path });
                  } else {
                    handleLaunchApp('notepad', name, '📝', { filePath: path });
                  }
                }}
                playClick={playClick}
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
          </Window>
        ))}
      </div>

      {/* Task View / Alt+Tab Exposé Switcher */}
      {showTaskView && (
        <TaskViewModal
          windows={windows}
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
          onOpenSettings={() => handleLaunchApp('settings', 'Settings', '⚙️')}
          onClose={closeAllFlyouts}
          playClick={playClick}
        />
      )}

      {/* Glass Taskbar */}
      <div className={styles.taskbar} onClick={(e) => e.stopPropagation()}>
        {/* Left: Start Button + Task View */}
        <div className={styles.taskbarLeft}>
          <button
            className={`${styles.startBtn} ${activeFlyout === 'start' ? styles.startBtnActive : ''}`}
            onClick={() => toggleFlyout('start')}
            title="Open Start Menu"
          >
            <span className={styles.startLogoDot} />
            Billighost
          </button>

          <button
            className={`${styles.taskViewBtn} ${showTaskView ? styles.taskViewBtnActive : ''}`}
            onClick={() => {
              playClick();
              setShowTaskView(prev => !prev);
            }}
            title="Task View (Alt+Tab)"
          >
            ⧉
          </button>
        </div>

        {/* Center: Running Applications Tabs */}
        <div className={styles.taskbarCenter}>
          {windows.map((win) => {
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
                <span className={styles.appTabIcon}>{win.icon || '📁'}</span>
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
            title={`Battery: ${battery.level}% • ${battery.statusText}`}
          >
            <div className={styles.batteryIcon}>
              <div
                className={styles.batteryFill}
                style={{
                  width: `${Math.max(10, battery.level)}%`,
                  background: battery.charging ? 'var(--accent-success)' : battery.level < 20 ? 'var(--accent-error)' : 'var(--accent-success)',
                }}
              />
            </div>
            <span>{battery.charging ? `⚡${battery.level}%` : `${battery.level}%`}</span>
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
            ⚙️
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
        </div>
      </div>
    </div>
  );
}
