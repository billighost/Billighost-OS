import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { LocalSettings } from '../services/storage/localStorage';
import { NotificationService } from '../services/notificationService';
import { WALLPAPERS, getWallpaper } from '../components/wallpapers/registry';
import { RENDERERS } from '../components/wallpapers/renderers';
import { WallpaperAudio } from '../services/wallpaperAudio';
import { VFS } from '../services/storage/indexedDB';
import { CacheStorageService } from '../services/storage/cacheStorage';
import { useStorageQuota } from '../hooks/useStorageQuota';
import { useBattery } from '../hooks/useBattery';
import { useNetwork } from '../hooks/useNetwork';
import {
  UserIcon, ImageIcon, PaletteIcon, SaveIcon,
  SpeakerIcon, LockIcon, InfoIcon, BellIcon,
  UploadIcon, RefreshIcon, DownloadIcon, CheckIcon,
  SearchIcon, GridHashIcon, BatteryChargingIcon,
  VolumeIcon, GaugeIcon, TrashIcon, PlayIcon, PauseIcon,
} from '../components/Icons';

import styles from './SettingsApp.module.css';

// --- Wallpapers Catalog (Unified Registry) ---
const WALLPAPER_PRESETS = WALLPAPERS.map(w => ({
  id: w.id,
  name: w.name,
  type: w.live ? 'live' : (w.category || 'gradient'),
  live: w.live,
  css: w.css,
  description: w.description,
  category: w.category || (w.live ? 'live' : 'gradient'),
}));

const AVATAR_PRESETS = [
  { id: 'av1', label: 'Ghost', bg: 'linear-gradient(135deg, #7eb8ff, #a78bfa)' },
  { id: 'av2', label: 'Pulse', bg: 'linear-gradient(135deg, #34d399, #059669)' },
  { id: 'av3', label: 'Cosmos', bg: 'linear-gradient(135deg, #f43f5e, #be123c)' },
  { id: 'av4', label: 'Solar', bg: 'linear-gradient(135deg, #fbbf24, #d97706)' },
  { id: 'av5', label: 'Void', bg: 'linear-gradient(135deg, #818cf8, #4338ca)' },
  { id: 'av6', label: 'Glacier', bg: 'linear-gradient(135deg, #38bdf8, #0284c7)' },
];

const ACCENT_COLORS = [
  { name: 'Crimson', hex: '#ff4d6a', glow: 'rgba(255, 77, 106, 0.55)' },
  { name: 'Amber Orange', hex: '#fb923c', glow: 'rgba(251, 146, 60, 0.55)' },
  { name: 'Solar Gold', hex: '#fbbf24', glow: 'rgba(251, 191, 36, 0.55)' },
  { name: 'Emerald', hex: '#34d399', glow: 'rgba(52, 211, 153, 0.55)' },
  { name: 'Cyan Glow', hex: '#00f3ff', glow: 'rgba(0, 243, 255, 0.65)' },
  { name: 'Sapphire Blue', hex: '#3b82f6', glow: 'rgba(59, 130, 246, 0.55)' },
  { name: 'Hyper Violet', hex: '#a78bfa', glow: 'rgba(167, 139, 250, 0.55)' },
  { name: 'Neon Magenta', hex: '#f43f5e', glow: 'rgba(244, 63, 94, 0.55)' },
];


const USER_STATUS_OPTIONS = [
  { id: 'online', label: 'Online', color: '#34d399' },
  { id: 'away', label: 'Away', color: '#fbbf24' },
  { id: 'dnd', label: 'Do Not Disturb', color: '#f43f5e' },
  { id: 'stealth', label: 'Stealth Mode', color: '#94a3b8' },
];

// --- WCAG Contrast Calculator ---
function getLuminance(hex) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return 0.5;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const a = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function getContrastRatio(hex1, hex2 = '#0a0c12') {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return ((lighter + 0.05) / (darker + 0.05)).toFixed(1);
}

/**
 * Shared preview context.
 *
 * Constructing an AudioContext per preview exhausts the browser's limit
 * (Chrome allows ~6 concurrent) after a handful of clicks, at which point
 * every later preview fails silently. One lazily-created context is reused
 * instead, and closePreviewAudio() releases it on unmount.
 */
let previewCtx = null;

function getPreviewContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!previewCtx || previewCtx.state === 'closed') {
    previewCtx = new AudioCtx();
  }
  if (previewCtx.state === 'suspended') {
    previewCtx.resume().catch(() => { /* needs a user gesture */ });
  }
  return previewCtx;
}

function closePreviewAudio() {
  if (previewCtx && previewCtx.state !== 'closed') {
    previewCtx.close().catch(() => { /* already closing */ });
  }
  previewCtx = null;
}

// --- Synthesized Audio FX Engine ---
function playSynthesizedSound(type, volume = 80) {
  if (volume <= 0) return;
  try {
    const ctx = getPreviewContext();
    if (!ctx) return;
    const gain = ctx.createGain();
    gain.gain.value = (volume / 100) * 0.22;
    gain.connect(ctx.destination);
    const t = ctx.currentTime;

    if (type === 'chime') {
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t + idx * 0.07);
        oscGain.gain.setValueAtTime(0.35, t + idx * 0.07);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.07 + 0.7);
        osc.connect(oscGain);
        oscGain.connect(gain);
        osc.start(t + idx * 0.07);
        osc.stop(t + idx * 0.07 + 0.7);
      });
    } else if (type === 'click') {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.035);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.04);
    } else if (type === 'sweep') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.22);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.25);
    } else if (type === 'alert') {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.setValueAtTime(180, t + 0.1);
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.25);
    }
  } catch {
    // AudioContext blocked by browser autoplay policy
  }
}

export default function SettingsApp({ initialTab = 'appearance', playClick = () => {}, osModal = null, onLock = () => {} }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveBanner, setSaveBanner] = useState('');

  // Persistent Settings
  const [profile, setProfile] = useState(() => LocalSettings.getProfile());
  const [appearance, setAppearance] = useState(() => {
    const app = LocalSettings.getAppearance();
    return {
      glassBlur: 20,
      glassOpacity: 75,
      borderRadius: 10,
      wallpaperDim: 0,
      wallpaperBlur: 0,
      taskbarPosition: 'center',
      taskbarSize: 'standard',
      showWidgetsBtn: true,
      showTaskViewBtn: true,
      performanceProfile: 'balanced',
      themeMode: 'dark',
      brightness: 78,
      trueTone: true,
      nightShift: false,
      autoBrightness: true,
      reducedMotion: true,
      ...app,
    };
  });

  const [sound, setSound] = useState(() => {
    const s = LocalSettings.getSound();
    return {
      soundScheme: 'cyber',
      ...s,
    };
  });
  const [security, setSecurity] = useState(() => LocalSettings.getSecurity());

  // Form Inputs
  const [curPin, setCurPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [customHex, setCustomHex] = useState(appearance.accentColor || '#7eb8ff');

  // Benchmark State
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState(null);

  // References
  const avatarInputRef = useRef(null);
  const wallpaperInputRef = useRef(null);
  const restoreFileInputRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const previewRendererRef = useRef(null);

  // Wallpaper Studio State
  const [wpCategory, setWpCategory] = useState('all');
  const [previewPaused, setPreviewPaused] = useState(false);
  const [rainAudioVolume, setRainAudioVolume] = useState(() => Math.round(WallpaperAudio.getVolume() * 100));

  // System Telemetry Hooks
  const storageQuota = useStorageQuota();
  const battery = useBattery();
  const network = useNetwork();

  const showSavedMessage = useCallback((msg) => {
    setSaveBanner(msg);
    setTimeout(() => setSaveBanner(''), 2500);
  }, []);

  // Sync custom CSS properties into documentElement root
  const syncVisualTokens = useCallback((appState) => {
    if (typeof document === 'undefined') return;
    if (appState.accentColor) {
      document.documentElement.style.setProperty('--accent-glow', appState.accentColor);
    }
    if (appState.glassBlur !== undefined) {
      document.documentElement.style.setProperty('--glass-blur', `${appState.glassBlur}px`);
    }
    if (appState.glassOpacity !== undefined) {
      document.documentElement.style.setProperty('--glass-bg', `rgba(15, 17, 26, ${appState.glassOpacity / 100})`);
    }
    if (appState.borderRadius !== undefined) {
      document.documentElement.style.setProperty('--radius-md', `${appState.borderRadius}px`);
    }
  }, []);

  // Update Appearance Helper
  const updateAppearanceState = useCallback((updates) => {
    const merged = LocalSettings.setAppearance(updates);
    const full = { ...appearance, ...merged };
    setAppearance(full);
    syncVisualTokens(full);
    return full;
  }, [appearance, syncVisualTokens]);

  // Live Wallpaper Preview Canvas Animation Engine (Runs true RENDERERS)
  /* Release the shared preview AudioContext when Settings closes. */
  useEffect(() => {
    return () => closePreviewAudio();
  }, []);

  useEffect(() => {
    if (activeTab !== 'wallpaper' || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = null;
    let lastTime = 0;
    const currentWpId = appearance.wallpaper || 'default';
    const wpObj = getWallpaper(currentWpId);
    const liveEffect = appearance.customWallpaperData ? null : (appearance.liveWallpaper || wpObj?.live || null);

    let renderer = null;
    if (liveEffect && RENDERERS[liveEffect]) {
      renderer = RENDERERS[liveEffect]();
      previewRendererRef.current = renderer;
    } else {
      previewRendererRef.current = null;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(300, Math.floor(rect.width || 480));
    const h = Math.max(140, Math.floor(rect.height || 180));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (renderer) {
      renderer.resize(w, h);
    }

    // Simulated desktop obstacle window in preview
    const previewObstacles = [
      { x: Math.round(w * 0.2), y: Math.round(h * 0.24), w: Math.round(w * 0.54), h: Math.round(h * 0.48), kind: 'window' }
    ];

    const onPreviewMouseMove = (e) => {
      const b = canvas.getBoundingClientRect();
      const mx = e.clientX - b.left;
      const my = e.clientY - b.top;
      renderer?.setMouse?.(mx, my);
    };
    canvas.addEventListener('mousemove', onPreviewMouseMove, { passive: true });

    const renderLoop = (now) => {
      const dt = Math.min(48, now - (lastTime || now));
      lastTime = now;

      if (!previewPaused) {
        if (renderer) {
          renderer.step(ctx, previewObstacles, dt);

          // Draw simulated glass window over preview
          ctx.save();
          const win = previewObstacles[0];
          ctx.fillStyle = 'rgba(15, 18, 28, 0.65)';
          ctx.strokeStyle = 'rgba(126, 184, 255, 0.35)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(win.x, win.y, win.w, win.h, 8);
          } else {
            ctx.rect(win.x, win.y, win.w, win.h);
          }
          ctx.fill();
          ctx.stroke();

          // Window mini dots
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath(); ctx.arc(win.x + 12, win.y + 10, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath(); ctx.arc(win.x + 20, win.y + 10, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#34d399';
          ctx.beginPath(); ctx.arc(win.x + 28, win.y + 10, 2.5, 0, Math.PI * 2); ctx.fill();

          // Window mini content bars
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.fillRect(win.x + 12, win.y + 22, win.w - 24, 4);
          ctx.fillRect(win.x + 12, win.y + 32, (win.w - 24) * 0.65, 4);
          ctx.restore();
        } else {
          // Static wallpaper or custom photo preview
          ctx.clearRect(0, 0, w, h);
          if (appearance.customWallpaperData) {
            const img = new Image();
            img.src = appearance.customWallpaperData;
            if (img.complete) {
              ctx.drawImage(img, 0, 0, w, h);
            }
          } else {
            const grad = ctx.createLinearGradient(0, 0, w, h);
            grad.addColorStop(0, '#090b14');
            grad.addColorStop(0.5, '#121626');
            grad.addColorStop(1, '#05060a');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.font = '600 13px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(wpObj?.name || 'Curated Wallpaper', w / 2, h / 2);
          }
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      canvas.removeEventListener('mousemove', onPreviewMouseMove);
      renderer?.destroy?.();
      previewRendererRef.current = null;
    };
  }, [activeTab, appearance.wallpaper, appearance.liveWallpaper, appearance.customWallpaperData, previewPaused]);

  // Live CPU Benchmark Runner
  const handleRunBenchmark = () => {
    playClick();
    setBenchmarkRunning(true);
    setBenchmarkResult(null);

    setTimeout(() => {
      const start = performance.now();
      let acc = 1.0;
      const iterations = 2000000;
      for (let i = 0; i < iterations; i++) {
        acc = (acc * 1.000001 + Math.sin(i) * Math.cos(i)) ^ (i & 0xff);
      }
      const elapsedMs = performance.now() - start;
      const opsPerSec = Math.round((iterations / (elapsedMs / 1000)));
      const score = Math.round((opsPerSec / 10000));

      setBenchmarkResult({
        ops: opsPerSec.toLocaleString(),
        score,
        elapsed: elapsedMs.toFixed(1),
      });
      setBenchmarkRunning(false);
      showSavedMessage(`Benchmark complete: ${score} pts!`);
    }, 40);
  };

  // --- Security PIN Handlers ---
  const handleChangePin = async (e) => {
    e.preventDefault();
    playClick();
    if (curPin !== security.pin) {
      if (osModal) await osModal.showAlert('Current PIN is incorrect.', 'Security Error');
      return;
    }
    if (newPin.length !== 4 || isNaN(newPin)) {
      if (osModal) await osModal.showAlert('New PIN must be exactly 4 digits.', 'Validation Error');
      return;
    }
    if (newPin !== confirmPin) {
      if (osModal) await osModal.showAlert('New PIN and Confirm PIN do not match.', 'Validation Error');
      return;
    }
    const updated = LocalSettings.setSecurity({ pin: newPin });
    setSecurity(updated);
    setCurPin('');
    setNewPin('');
    setConfirmPin('');
    NotificationService.send({
      title: 'Security PIN Updated',
      message: 'Your OS login PIN has been updated.',
      type: 'success',
    });
    showSavedMessage('Security PIN updated successfully!');
  };

  const handleResetPin = async () => {
    playClick();
    let doReset = true;
    if (osModal) {
      doReset = await osModal.showConfirm('Reset security PIN to factory default (0813)?', 'Reset PIN');
    }
    if (doReset) {
      const reset = LocalSettings.resetSecurity();
      setSecurity(reset);
      NotificationService.send({
        title: 'Security PIN Reset',
        message: 'Login PIN reset to default (0813).',
        type: 'info',
      });
      showSavedMessage('PIN restored to default (0813)!');
    }
  };

  // --- Profile Operations ---
  const handleSaveProfile = (e) => {
    e.preventDefault();
    playClick();
    LocalSettings.setProfile(profile);
    showSavedMessage('Profile changes saved successfully!');
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const updated = LocalSettings.setProfile({ avatar: dataUrl });
      setProfile(updated);
      showSavedMessage('Profile picture uploaded!');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPresetAvatar = (preset) => {
    playClick();
    const updated = LocalSettings.setProfile({ avatar: null, avatarPreset: preset.id });
    setProfile(updated);
    showSavedMessage(`Avatar updated to ${preset.label}`);
  };

  // --- Wallpaper Operations ---
  const handleSelectWallpaper = (wp) => {
    playClick();
    updateAppearanceState({
      wallpaper: wp.id,
      customWallpaperData: null,
      wallpaperCss: wp.css,
      // Carried through so the desktop knows whether to run a renderer.
      // null clears a previously-active live effect.
      liveWallpaper: wp.live || null,
    });
    showSavedMessage(
      wp.live ? `Live wallpaper "${wp.name}" enabled` : `Wallpaper set to "${wp.name}"`
    );
  };

  const handleWallpaperUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      updateAppearanceState({
        wallpaper: 'custom',
        customWallpaperData: dataUrl,
        wallpaperCss: `url("${dataUrl}")`,
        liveWallpaper: null,   // a still image has no effect attached
      });
      showSavedMessage('Custom wallpaper applied!');
    };
    reader.readAsDataURL(file);
  };

  // --- Accent Color Selection ---
  const handleSelectAccent = (accent) => {
    playClick();
    setCustomHex(accent.hex);
    updateAppearanceState({
      accentColor: accent.hex,
      accentGlow: accent.glow,
    });
    showSavedMessage(`Accent color set to ${accent.name}`);
  };

  // --- Full System Backup & Restore ---

  const handleExportSystemImage = async () => {
    playClick();
    try {
      const allSettings = LocalSettings.exportAll();
      const allNodes = await VFS.getAllNodes();

      const backupData = {
        meta: {
          os: 'Billighost OS',
          version: '1.0',
          createdAt: new Date().toISOString(),
        },
        settings: allSettings,
        vfs: allNodes,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `billighost_backup_${Date.now().toString().slice(-6)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSavedMessage('Full OS image backup downloaded!');
    } catch {
      showSavedMessage('Failed to export system image.');
    }
  };

  const handleRestoreSystemImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const backup = JSON.parse(ev.target.result);
        if (!backup.settings || !Array.isArray(backup.vfs)) {
          if (osModal) await osModal.showAlert('Invalid backup image schema.', 'Restore Failed');
          return;
        }
        LocalSettings.importAll(backup.settings);
        await VFS.restoreAllNodes(backup.vfs);
        setProfile(LocalSettings.getProfile());
        setAppearance(LocalSettings.getAppearance());
        setSound(LocalSettings.getSound());
        setSecurity(LocalSettings.getSecurity());
        await storageQuota.refresh();
        showSavedMessage('System restored successfully from backup image!');
      } catch {
        if (osModal) await osModal.showAlert('Failed to parse backup image.', 'Restore Error');
      }
    };
    reader.readAsText(file);
  };

  // Navigation Items
  const NAV_ITEMS = useMemo(() => [
    { id: 'appearance', label: 'Appearance', icon: <PaletteIcon size={16} /> },
    { id: 'sound', label: 'Audio', icon: <SpeakerIcon size={16} /> },
    { id: 'security', label: 'Security', icon: <LockIcon size={16} /> },
    { id: 'storage', label: 'Storage', icon: <SaveIcon size={16} /> },
    { id: 'about', label: 'About', icon: <InfoIcon size={16} /> },
    { id: 'profile', label: 'User Profile & ID', icon: <UserIcon size={16} /> },
    { id: 'wallpaper', label: 'Wallpapers & FX', icon: <ImageIcon size={16} /> },
    { id: 'taskbar', label: 'Taskbar & Dock', icon: <GridHashIcon size={16} /> },
    { id: 'performance', label: 'Performance & Power', icon: <GaugeIcon size={16} /> },
    { id: 'backup', label: 'Backup & Recovery', icon: <DownloadIcon size={16} /> },
  ], []);

  const filteredNavItems = useMemo(() => {
    if (!searchQuery.trim()) return NAV_ITEMS;
    const q = searchQuery.toLowerCase();
    return NAV_ITEMS.filter(item => item.label.toLowerCase().includes(q));
  }, [NAV_ITEMS, searchQuery]);

  return (

    <div className={styles.settingsLayout}>
      <div className={styles.prismaticBorder} />
      {/* Sidebar Navigation */}
      <div className={styles.sidebar}>
        {/* macOS Style Traffic Dots */}
        <div className={styles.trafficLights}>
          <span className={`${styles.trafficDot} ${styles.dotClose}`} />
          <span className={`${styles.trafficDot} ${styles.dotMin}`} />
          <span className={`${styles.trafficDot} ${styles.dotMax}`} />
        </div>

        {/* Mini User Profile Row (Concept Mockup) */}
        <div
          className={styles.miniProfileRow}
          onClick={() => { playClick(); setActiveTab('profile'); }}
          title="Open Profile Studio"
        >
          <div className={styles.miniAvatar}>
            {profile.avatar ? (
              <img src={profile.avatar} alt="Avatar" className={styles.miniAvatarImg} />
            ) : (
              <span>{profile.name?.slice(0, 2).toUpperCase() || 'AC'}</span>
            )}
          </div>
          <div className={styles.miniProfileText}>
            <span className={styles.miniProfileName}>{profile.name || 'Alexander Croft'}</span>
            <span className={styles.miniProfileSub}>SF Pro <span className={styles.miniChevron}>▾</span></span>
          </div>
        </div>

        <div className={styles.searchContainer}>
          <div className={styles.searchBox}>
            <SearchIcon size={13} />
            <input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        <nav className={styles.navMenu}>
          {filteredNavItems.map(item => (
            <button
              key={item.id}
              className={`${styles.navItem} ${activeTab === item.id ? styles.navItemActive : ''}`}
              onClick={() => { playClick(); setActiveTab(item.id); }}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>


        <div className={styles.sidebarFooter}>
          <div className={styles.systemBadge}>
            <span>Sandbox Status</span>
            <span className={styles.systemBadgeOnline}>
              <span className={styles.onlineDot} /> Protected
            </span>
          </div>
          <div className={styles.systemBadge}>
            <span>Storage Quota</span>
            <span>{storageQuota.percentUsed}%</span>
          </div>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className={styles.mainPane}>
        {saveBanner && (
          <div className={styles.bannerSuccess}>
            <CheckIcon size={15} />
            <span>{saveBanner}</span>
          </div>
        )}

        {/* 1. PROFILE & ACCOUNT */}
        {activeTab === 'profile' && (
          <div className={styles.tabContent}>
            <div className={styles.tabHeader}>
              <h2>User Profile & Identity</h2>
              <p>Personalize your avatar, user credentials, role badge, and online activity status.</p>
            </div>

            <div className={styles.card}>
              <div className={styles.sectionTitle}><UserIcon size={16} /> Identity Avatar Studio</div>
              <div className={styles.avatarSection}>
                <div className={styles.avatarPreview}>
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="Profile" className={styles.avatarImg} />
                  ) : (
                    <div className={styles.avatarInitial}>
                      {profile.name?.slice(0, 2).toUpperCase() || 'BG'}
                    </div>
                  )}
                </div>

                <div className={styles.avatarActions}>
                  <input
                    type="file"
                    ref={avatarInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  <div className={styles.btnRow}>
                    <button className={styles.btnPrimary} onClick={() => avatarInputRef.current?.click()}>
                      <UploadIcon size={13} /> Upload Picture
                    </button>
                    <button
                      className={styles.btnSecondary}
                      onClick={() => {
                        playClick();
                        const updated = LocalSettings.setProfile({ avatar: null });
                        setProfile(updated);
                        showSavedMessage('Avatar reset to procedural icon.');
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <div className={styles.sectionSubtitle}>Preset Badges:</div>
                  <div className={styles.presetGrid}>
                    {AVATAR_PRESETS.map(p => (
                      <button
                        key={p.id}
                        className={styles.presetBtn}
                        style={{ background: p.bg }}
                        onClick={() => handleSelectPresetAvatar(p)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className={styles.card}>
              <div className={styles.sectionTitle}>Account Details & Status</div>
              <div className={styles.formGroup}>
                <label>Display Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={e => setProfile({ ...profile, name: e.target.value })}
                  className={styles.inputField}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Account Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={e => setProfile({ ...profile, email: e.target.value })}
                  className={styles.inputField}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>User Status Message</label>
                <input
                  type="text"
                  value={profile.statusMessage || ''}
                  placeholder="e.g. Exploring web OS sandbox..."
                  onChange={e => setProfile({ ...profile, statusMessage: e.target.value })}
                  className={styles.inputField}
                />
              </div>

              <div className={styles.sectionSubtitle}>Activity Indicator:</div>
              <div className={styles.statusPillGroup}>
                {USER_STATUS_OPTIONS.map(st => (
                  <button
                    key={st.id}
                    type="button"
                    className={`${styles.statusPill} ${(profile.status || 'online') === st.id ? styles.statusPillActive : ''}`}
                    onClick={() => {
                      playClick();
                      setProfile({ ...profile, status: st.id });
                    }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.color }} />
                    {st.label}
                  </button>
                ))}
              </div>

              <div className={styles.btnRow}>
                <button type="submit" className={styles.btnPrimary}>Save Profile Changes</button>
              </div>
            </form>
          </div>
        )}

        {/* 2. WALLPAPER & CANVASES */}
        {activeTab === 'wallpaper' && (
          <div className={styles.tabContent}>
            <div className={styles.tabHeader}>
              <h2>Wallpaper & Dynamic Canvases</h2>
              <p>Select living dynamic animations or high-resolution ambient gradients for your desktop.</p>
            </div>

            <div className={styles.categoryFilterRow}>
              {[
                { id: 'all', label: 'All Wallpapers' },
                { id: 'live', label: '⚡ Live 60FPS Canvases' },
                { id: 'gradient', label: '🌌 Cosmic & Gradients' },
                { id: 'minimal', label: '🌑 Minimal Focus' },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className={`${styles.filterPill} ${wpCategory === cat.id ? styles.filterPillActive : ''}`}
                  onClick={() => { playClick(); setWpCategory(cat.id); }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className={styles.card}>
              <div className={styles.sectionTitleRow}>
                <div className={styles.sectionTitle}><ImageIcon size={16} /> Live Simulation Showcase</div>
                <div className={styles.previewMeta}>
                  {appearance.liveWallpaper || getWallpaper(appearance.wallpaper)?.live ? (
                    <span className={styles.wallpaperLiveTag}>
                      <span className={styles.liveDotPulse} /> Active 60 FPS Simulation
                    </span>
                  ) : (
                    <span className={styles.wallpaperStaticTag}>Ambient Theme</span>
                  )}
                </div>
              </div>

              <div className={styles.wallpaperLivePreview}>
                <canvas ref={previewCanvasRef} className={styles.wallpaperCanvas} />
                <div className={styles.previewOverlayWatermark}>
                  <span>{appearance.customWallpaperData ? 'Custom Photo' : (getWallpaper(appearance.wallpaper)?.name || 'Billighost Atmosphere')}</span>
                </div>
              </div>

              <div className={styles.btnRow}>
                <input
                  type="file"
                  ref={wallpaperInputRef}
                  onChange={handleWallpaperUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                <button className={styles.btnPrimary} onClick={() => wallpaperInputRef.current?.click()}>
                  <UploadIcon size={14} /> Upload Custom Photo
                </button>

                {(appearance.liveWallpaper || getWallpaper(appearance.wallpaper)?.live) && (
                  <button
                    className={styles.btnSecondary}
                    onClick={() => {
                      playClick();
                      setPreviewPaused(p => !p);
                    }}
                  >
                    {previewPaused ? <PlayIcon size={14} /> : <PauseIcon size={14} />}
                    {previewPaused ? 'Resume Simulation' : 'Pause Simulation'}
                  </button>
                )}

                {(appearance.wallpaper === 'rain' || appearance.liveWallpaper === 'rain') && (
                  <button
                    className={styles.btnLightning}
                    onClick={() => {
                      playClick();
                      previewRendererRef.current?.strike?.(1.4);
                      window.dispatchEvent(new CustomEvent('billighost:lightning-strike', { detail: { intensity: 1.4 } }));
                      setTimeout(() => WallpaperAudio.playThunder(1.4), 260);
                      showSavedMessage('⚡ Lightning Strike & Thunder Triggered!');
                    }}
                    title="Trigger a realistic branching lightning bolt and rolling thunder audio"
                  >
                    ⚡ Strike Lightning & Thunder
                  </button>
                )}

                <button
                  className={styles.btnSecondary}
                  onClick={() => {
                    playClick();
                    const def = WALLPAPER_PRESETS.find(w => w.id === 'default') || WALLPAPER_PRESETS[0];
                    handleSelectWallpaper(def);
                  }}
                >
                  <RefreshIcon size={14} /> Restore Default
                </button>
              </div>
            </div>

            {/* Exclusive Atmosphere Storm Audio & Lighting Controls when Rainfall is Selected */}
            {(appearance.wallpaper === 'rain' || appearance.liveWallpaper === 'rain') && (
              <div className={styles.cardHighlight}>
                <div className={styles.sectionTitleRow}>
                  <div className={styles.sectionTitle}>
                    <SpeakerIcon size={16} /> Rainfall Atmosphere & Thunder Acoustics
                  </div>
                  <span className={styles.pillBadgeActive}>Web Audio Synthesizer</span>
                </div>
                <p className={styles.sectionDesc}>
                  Hyper-realistic synthesized rainfall with window glass rivulets, window collision splashes, and periodic branching lightning strikes with acoustic thunder.
                </p>

                <div className={styles.toggleRow}>
                  <div>
                    <div className={styles.labelTitle}>Natural Rain & Thunder Audio</div>
                    <div className={styles.labelSubtitle}>Procedural brown-noise rainbed + sub-bass thunder booms</div>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={appearance.wallpaperAudio !== false}
                      onChange={(e) => {
                        playClick();
                        const nextAudio = e.target.checked;
                        updateAppearanceState({ wallpaperAudio: nextAudio });
                        if (nextAudio) {
                          WallpaperAudio.startRain();
                        } else {
                          WallpaperAudio.stopRain();
                        }
                      }}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>

                {appearance.wallpaperAudio !== false && (
                  <div className={styles.sliderGroup}>
                    <div className={styles.sliderHeader}>
                      <span>Storm Ambience Volume</span>
                      <span className={styles.sliderValue}>{rainAudioVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={rainAudioVolume}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setRainAudioVolume(val);
                        WallpaperAudio.setVolume(val / 100);
                        updateAppearanceState({ wallpaperAudioVolume: val });
                      }}
                      className={styles.rangeInput}
                    />
                  </div>
                )}
              </div>
            )}

            <div className={styles.card}>
              <div className={styles.sectionSubtitle}>
                Select System Backdrop ({WALLPAPER_PRESETS.filter(wp => {
                  if (wpCategory === 'all') return true;
                  if (wpCategory === 'live') return wp.live;
                  if (wpCategory === 'gradient') return wp.category === 'gradient';
                  if (wpCategory === 'minimal') return wp.category === 'minimal';
                  return true;
                }).length} Available):
              </div>
              <div className={styles.wallpaperGrid}>
                {WALLPAPER_PRESETS.filter(wp => {
                  if (wpCategory === 'all') return true;
                  if (wpCategory === 'live') return wp.live;
                  if (wpCategory === 'gradient') return wp.category === 'gradient';
                  if (wpCategory === 'minimal') return wp.category === 'minimal';
                  return true;
                }).map((wp) => {
                  const isSelected = appearance.wallpaper === wp.id && !appearance.customWallpaperData;
                  return (
                    <div
                      key={wp.id}
                      className={`${styles.wallpaperCard} ${isSelected ? styles.wallpaperActive : ''}`}
                      onClick={() => handleSelectWallpaper(wp)}
                    >
                      <div className={styles.wallpaperThumb} style={{ background: wp.css }}>
                        {wp.live && (
                          <span className={styles.wallpaperDynamicBadge}>
                            <span className={styles.miniDotGreen} /> LIVE
                          </span>
                        )}
                        {isSelected && (
                          <div className={styles.wallpaperSelectedIndicator}>
                            <CheckIcon size={14} />
                          </div>
                        )}
                      </div>
                      <div className={styles.wallpaperCardInfo}>
                        <span className={styles.wallpaperName}>{wp.name}</span>
                        <span className={styles.wallpaperDesc}>{wp.description}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.sectionTitle}>Desktop Atmosphere Filters</div>
              <div className={styles.sliderGroup}>
                <div className={styles.sliderHeader}>
                  <span>Desktop Dimming / Darkness</span>
                  <span className={styles.sliderValue}>{appearance.wallpaperDim || 0}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={appearance.wallpaperDim || 0}
                  onChange={(e) => updateAppearanceState({ wallpaperDim: parseInt(e.target.value, 10) })}
                  className={styles.rangeInput}
                />
              </div>

              <div className={styles.sliderGroup}>
                <div className={styles.sliderHeader}>
                  <span>Desktop Background Blur</span>
                  <span className={styles.sliderValue}>{appearance.wallpaperBlur || 0}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={appearance.wallpaperBlur || 0}
                  onChange={(e) => updateAppearanceState({ wallpaperBlur: parseInt(e.target.value, 10) })}
                  className={styles.rangeInput}
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. APPEARANCE & NORDIC OBSIDIAN SHOWCASE */}
        {activeTab === 'appearance' && (
          <div className={styles.appearanceLayoutStage}>
            {/* Column 1: User Profile Floating Card (Directly from Mockup) */}
            <div className={styles.profileCardColumn}>
              <div className={styles.columnTitle}>User Profile</div>
              <div className={styles.profileGlassCard}>
                <div className={styles.profileUserHeader}>
                  <div className={styles.profileAvatarWrapper}>
                    {profile.avatar ? (
                      <img src={profile.avatar} alt="Profile" className={styles.cardAvatarImg} />
                    ) : (
                      <div className={styles.cardAvatarInitial}>
                        {profile.name?.slice(0, 2).toUpperCase() || 'AC'}
                      </div>
                    )}
                    <span className={styles.verifiedBadge} title="Verified Billighost Pro">✓</span>
                  </div>
                  <div className={styles.profileUserInfo}>
                    <div className={styles.profileUserName}>{profile.name || 'Alexander Croft'}</div>
                    <div className={styles.profileUserEmail}>{profile.email || 'alexander3@gmail.com'}</div>
                    <span className={styles.proPillBadge}>Billighost Pro</span>
                  </div>
                </div>

                <div className={styles.profileStorageSection}>
                  <div className={styles.storageLabelRow}>
                    <span>Storage</span>
                    <span className={styles.storageQuotaText}>
                      {storageQuota.quota ? `${(storageQuota.quota / (1024**3)).toFixed(0)} GB / ${(storageQuota.used / (1024**3)).toFixed(2)} GB` : '100 GB / 43.54 GB'}
                    </span>
                  </div>
                  <div className={styles.storageMeterTrack}>
                    <div
                      className={styles.storageMeterFill}
                      style={{ width: `${Math.max(15, storageQuota.percentUsed || 43.5)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Appearance Controls (Directly from Mockup) */}
            <div className={styles.appearanceControlsColumn}>
              {/* Header with Theme Capsule Pill */}
              <div className={styles.appearanceTopHeader}>
                <h2 className={styles.appearanceHeading}>Appearance</h2>
                <div className={styles.themeSelectorGroup}>
                  <span className={styles.themeLabel}>Theme</span>
                  <div className={styles.themeCapsulePill}>
                    {['Light', 'Dark', 'Auto'].map((m) => {
                      const lower = m.toLowerCase();
                      const isActive = (appearance.themeMode || 'dark') === lower;
                      return (
                        <button
                          key={m}
                          type="button"
                          className={`${styles.themePillBtn} ${isActive ? styles.themePillBtnActive : ''}`}
                          onClick={() => {
                            playClick();
                            updateAppearanceState({ themeMode: lower });
                          }}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Accent Color Selector: 8 radiant glowing jewels */}
              <div className={styles.sectionBlock}>
                <div className={styles.sectionHeaderTitle}>Accent Color Selector</div>
                <div className={styles.jewelGridRow}>
                  {ACCENT_COLORS.map((c) => {
                    const isSelected = appearance.accentColor?.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        className={`${styles.jewelChip} ${isSelected ? styles.jewelChipActive : ''}`}
                        style={{
                          '--jewel-color': c.hex,
                          '--halo-glow': c.glow,
                        }}
                        onClick={() => handleSelectAccent(c)}
                        title={c.name}
                        aria-label={c.name}
                      >
                        <span className={styles.jewelGleam} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wallpaper Showcase: Wide cards with Live / Static tags */}
              <div className={styles.sectionBlock}>
                <div className={styles.sectionHeaderTitle}>Wallpaper</div>
                <div className={styles.featuredWallpapersRow}>
                  {[
                    { id: 'flow', name: 'Abstract Flow', type: 'Live', isLive: true, css: 'linear-gradient(135deg, #180e29 0%, #30174e 40%, #0c3358 100%)' },
                    { id: 'aurora', name: 'Aurora Borealis', type: 'Live', isLive: true, css: 'linear-gradient(135deg, #031e21 0%, #054848 50%, #03151f 100%)' },
                    { id: 'midnight', name: 'Midnight City', type: 'Static', isLive: false, css: 'linear-gradient(180deg, #0a0d16 0%, #06111e 60%, #020408 100%)' },
                  ].map((wp) => {
                    const isCurrent = (appearance.wallpaper === wp.id) ||
                      (wp.id === 'flow' && (!appearance.wallpaper || appearance.wallpaper === 'default' || appearance.wallpaper === 'flow')) ||
                      (wp.id === 'aurora' && appearance.wallpaper === 'aurora') ||
                      (wp.id === 'midnight' && appearance.wallpaper === 'midnight');
                    return (
                      <div
                        key={wp.id}
                        className={`${styles.wideWpCard} ${isCurrent ? styles.wideWpCardActive : ''}`}
                        style={{ background: wp.css }}
                        onClick={() => {
                          playClick();
                          const registryWp = WALLPAPER_PRESETS.find(p => p.id === wp.id) || WALLPAPER_PRESETS[0];
                          handleSelectWallpaper(registryWp);
                        }}
                      >
                        <div className={styles.wpGradientOverlay} />
                        <span className={`${styles.wpBadgePill} ${wp.isLive ? styles.wpBadgeLive : styles.wpBadgeStatic}`}>
                          {wp.isLive && <span className={styles.liveDotCircle} />}
                          {wp.type}
                        </span>
                        <div className={styles.wpCardFooter}>
                          <span className={styles.wpCardTitle}>{wp.name}</span>
                          {isCurrent && (
                            <span className={styles.wpCheckmarkCircle}>
                              <CheckIcon size={12} />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Display Controls: Brightness slider & Glass switches */}
              <div className={styles.sectionBlock}>
                <div className={styles.sectionHeaderTitle}>Display</div>
                
                {/* Brightness with Glowing Cyan Track */}
                <div className={styles.displayControlRow}>
                  <span className={styles.displayRowLabel}>Brightness</span>
                  <div className={styles.sliderWithReadout}>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={appearance.brightness || 78}
                      onChange={(e) => updateAppearanceState({ brightness: parseInt(e.target.value, 10) })}
                      className={styles.cyanGlowRange}
                    />
                    <span className={styles.readoutPercentage}>{appearance.brightness || 78}%</span>
                  </div>
                </div>

                {/* Tactile iOS Glass Switches */}
                {[
                  { key: 'trueTone', label: 'True Tone', defaultVal: true },
                  { key: 'nightShift', label: 'Night Shift', defaultVal: false },
                  { key: 'autoBrightness', label: 'Auto-Brightness', defaultVal: true },
                  { key: 'reducedMotion', label: 'reduced motion', defaultVal: true },
                ].map((item) => {
                  const val = appearance[item.key] !== undefined ? appearance[item.key] : item.defaultVal;
                  return (
                    <div key={item.key} className={styles.displayToggleRow}>
                      <span className={styles.displayRowLabel}>{item.label}</span>
                      <label className={styles.glassSwitch}>
                        <input
                          type="checkbox"
                          checked={val}
                          onChange={(e) => {
                            playClick();
                            updateAppearanceState({ [item.key]: e.target.checked });
                          }}
                        />
                        <span className={styles.glassSwitchSlider} />
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 4. TASKBAR & DOCK */}
        {activeTab === 'taskbar' && (
          <div className={styles.tabContent}>
            <div className={styles.tabHeader}>
              <h2>Taskbar & System Dock</h2>
              <p>Configure taskbar dock alignment, system tray icons, and time display formats.</p>
            </div>

            <div className={styles.card}>
              <div className={styles.sectionTitle}><GridHashIcon size={16} /> Dock Layout & Alignment</div>
              <div className={styles.optionGrid}>
                <div
                  className={`${styles.optionCard} ${appearance.taskbarPosition === 'center' ? styles.optionCardActive : ''}`}
                  onClick={() => { playClick(); updateAppearanceState({ taskbarPosition: 'center' }); }}
                >
                  <span className={styles.optionTitle}>Centered Dock</span>
                  <span className={styles.optionDesc}>Symmetric modern layout with centered running apps.</span>
                </div>
                <div
                  className={`${styles.optionCard} ${appearance.taskbarPosition === 'left' ? styles.optionCardActive : ''}`}
                  onClick={() => { playClick(); updateAppearanceState({ taskbarPosition: 'left' }); }}
                >
                  <span className={styles.optionTitle}>Left Aligned</span>
                  <span className={styles.optionDesc}>Classic desktop arrangement with apps pinned to the left.</span>
                </div>
              </div>

              <div className={styles.sectionSubtitle}>Dock Height & Spacing:</div>
              <div className={styles.optionGrid}>
                {['compact', 'standard', 'spacious'].map((sz) => (
                  <div
                    key={sz}
                    className={`${styles.optionCard} ${appearance.taskbarSize === sz ? styles.optionCardActive : ''}`}
                    onClick={() => { playClick(); updateAppearanceState({ taskbarSize: sz }); }}
                  >
                    <span className={styles.optionTitle}>{sz.charAt(0).toUpperCase() + sz.slice(1)}</span>
                    <span className={styles.optionDesc}>{sz === 'compact' ? '38px slim' : sz === 'standard' ? '44px balanced' : '52px generous'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.sectionTitle}>System Tray Toggles</div>
              <div className={styles.toggleRow}>
                <div>
                  <div className={styles.labelTitle}>Show Widgets Board Shortcut</div>
                  <div className={styles.labelDesc}>Displays the Widgets button in the taskbar bottom-left.</div>
                </div>
                <input
                  type="checkbox"
                  checked={appearance.showWidgetsBtn}
                  onChange={(e) => updateAppearanceState({ showWidgetsBtn: e.target.checked })}
                  className={styles.switchCheckbox}
                />
              </div>

              <div className={styles.divider} />

              <div className={styles.toggleRow}>
                <div>
                  <div className={styles.labelTitle}>Show Task View (Desktops) Shortcut</div>
                  <div className={styles.labelDesc}>Enables the virtual desktop switcher on the taskbar.</div>
                </div>
                <input
                  type="checkbox"
                  checked={appearance.showTaskViewBtn}
                  onChange={(e) => updateAppearanceState({ showTaskViewBtn: e.target.checked })}
                  className={styles.switchCheckbox}
                />
              </div>

              <div className={styles.divider} />

              <div className={styles.toggleRow}>
                <div>
                  <div className={styles.labelTitle}>24-Hour Military Time</div>
                  <div className={styles.labelDesc}>Toggle between 12-hour (AM/PM) and 24-hour military clock.</div>
                </div>
                <input
                  type="checkbox"
                  checked={appearance.clockFormat === '24h'}
                  onChange={(e) => updateAppearanceState({ clockFormat: e.target.checked ? '24h' : '12h' })}
                  className={styles.switchCheckbox}
                />
              </div>
            </div>
          </div>
        )}

        {/* 5. PERFORMANCE & POWER */}
        {activeTab === 'performance' && (
          <div className={styles.tabContent}>
            <div className={styles.tabHeader}>
              <h2>Performance & Power Profiles</h2>
              <p>Optimize frame rendering, CPU load, and battery efficiency across apps.</p>
            </div>

            <div className={styles.card}>
              <div className={styles.sectionTitle}><GaugeIcon size={16} /> Performance Engine Profile</div>
              <div className={styles.optionGrid}>
                {[
                  { id: 'high', title: 'Max Performance', desc: 'Uncapped 60fps canvas animations & full particle dynamics.' },
                  { id: 'balanced', title: 'Balanced (Smart)', desc: 'Adaptive frame rates with intelligent idle throttling.' },
                  { id: 'saver', title: 'Battery Saver', desc: 'Reduced motion, halts background particle computations.' },
                ].map((p) => (
                  <div
                    key={p.id}
                    className={`${styles.optionCard} ${appearance.performanceProfile === p.id ? styles.optionCardActive : ''}`}
                    onClick={() => {
                      playClick();
                      updateAppearanceState({ performanceProfile: p.id });
                      showSavedMessage(`Profile switched to ${p.title}`);
                    }}
                  >
                    <span className={styles.optionTitle}>{p.title}</span>
                    <span className={styles.optionDesc}>{p.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.sectionTitle}><BatteryChargingIcon size={16} /> Battery & Power Telemetry</div>
              <div className={styles.specGrid}>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Charge Level</span>
                  <span className={styles.specValue}>{battery.levelText}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Power Source</span>
                  <span className={styles.specValue}>{battery.isCharging ? 'AC Adapter (Charging)' : 'Battery Internal'}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Battery Health</span>
                  <span className={styles.specValue} style={{ color: '#34d399' }}>99% Optimal</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Estimated Time</span>
                  <span className={styles.specValue}>{battery.isCharging ? 'Fully Charged Soon' : 'Calculating drain...'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. AUDIO & SYNTH SCHEMES */}
        {activeTab === 'sound' && (
          <div className={styles.tabContent}>
            <div className={styles.tabHeader}>
              <h2>Audio & Procedural Synth Schemes</h2>
              <p>Configure acoustic sound packs, master chime volume, and procedural synthesis feedback.</p>
            </div>

            <div className={styles.card}>
              <div className={styles.sectionTitle}><VolumeIcon size={16} /> Volume & Master Controls</div>
              <div className={styles.sliderGroup}>
                <div className={styles.sliderHeader}>
                  <span>Master Volume Level</span>
                  <span className={styles.sliderValue}>{sound.isMuted ? 'Muted (0%)' : `${sound.masterVolume}%`}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sound.isMuted ? 0 : sound.masterVolume}
                  onChange={(e) => {
                    const vol = parseInt(e.target.value, 10);
                    const updated = LocalSettings.setSound({ masterVolume: vol, isMuted: false });
                    setSound(updated);
                  }}
                  className={styles.rangeInput}
                />
              </div>

              <div className={styles.toggleRow}>
                <div>
                  <div className={styles.labelTitle}>Mute All System Sounds</div>
                  <div className={styles.labelDesc}>Silences all window triggers, alerts, and feedback chimes.</div>
                </div>
                <input
                  type="checkbox"
                  checked={sound.isMuted}
                  onChange={(e) => {
                    const updated = LocalSettings.setSound({ isMuted: e.target.checked });
                    setSound(updated);
                  }}
                  className={styles.switchCheckbox}
                />
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.sectionTitle}>Sound Feedback Schemes</div>
              <div className={styles.optionGrid}>
                {[
                  { id: 'cyber', title: 'Cyber Synth', desc: 'Futuristic crystalline harmonic chord progressions.' },
                  { id: 'wood', title: 'Acoustic Wood', desc: 'Warm organic marimba and wooden tactile feedback.' },
                  { id: 'retro', title: 'Retro 8-Bit', desc: 'Arcade chiptune square-wave square clicks.' },
                ].map((s) => (
                  <div
                    key={s.id}
                    className={`${styles.optionCard} ${sound.soundScheme === s.id ? styles.optionCardActive : ''}`}
                    onClick={() => {
                      playClick();
                      const updated = LocalSettings.setSound({ soundScheme: s.id });
                      setSound(updated);
                      playSynthesizedSound('chime', sound.masterVolume);
                    }}
                  >
                    <span className={styles.optionTitle}>{s.title}</span>
                    <span className={styles.optionDesc}>{s.desc}</span>
                  </div>
                ))}
              </div>

              <div className={styles.sectionSubtitle}>Synthesizer Trigger Test:</div>
              <div className={styles.soundTestRow}>
                <button
                  className={styles.soundTestBtn}
                  onClick={() => playSynthesizedSound('chime', sound.masterVolume)}
                >
                  <BellIcon size={13} /> Startup Chime
                </button>
                <button
                  className={styles.soundTestBtn}
                  onClick={() => playSynthesizedSound('click', sound.masterVolume)}
                >
                  <BellIcon size={13} /> UI Click
                </button>
                <button
                  className={styles.soundTestBtn}
                  onClick={() => playSynthesizedSound('sweep', sound.masterVolume)}
                >
                  <BellIcon size={13} /> Hologram Sweep
                </button>
                <button
                  className={styles.soundTestBtn}
                  onClick={() => playSynthesizedSound('alert', sound.masterVolume)}
                >
                  <BellIcon size={13} /> Alert Buzz
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 7. SECURITY & SESSION PIN */}
        {activeTab === 'security' && (
          <div className={styles.tabContent}>
            <div className={styles.tabHeader}>
              <h2>Security & Session Lock</h2>
              <p>Configure your 4-digit lock screen PIN, inactivity auto-lock timeout, and emergency triggers.</p>
            </div>

            <form onSubmit={handleChangePin} className={styles.card}>
              <div className={styles.sectionTitle}><LockIcon size={16} /> 4-Digit Login PIN</div>
              <div className={styles.formGroup}>
                <label>Current PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={curPin}
                  onChange={(e) => setCurPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter current 4 digits"
                  className={styles.inputField}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>New PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter new 4 digits"
                  className={styles.inputField}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Confirm New PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Repeat new 4 digits"
                  className={styles.inputField}
                  required
                />
              </div>

              <div className={styles.btnRow}>
                <button type="submit" className={styles.btnPrimary}>Update Security PIN</button>
                <button type="button" className={styles.btnDanger} onClick={handleResetPin}>
                  Restore Default PIN (0813)
                </button>
              </div>
            </form>

            <div className={styles.card}>
              <div className={styles.sectionTitle}>Inactivity & Privacy Policies</div>
              <div className={styles.formGroup}>
                <label>Inactivity Auto-Lock Duration</label>
                <select
                  value={security.autoLockMinutes || 0}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    const updated = LocalSettings.setSecurity({ autoLockMinutes: val });
                    setSecurity(updated);
                    showSavedMessage(val === 0 ? 'Auto-lock disabled' : `Auto-lock set to ${val} min`);
                  }}
                  className={styles.inputField}
                >
                  <option value={0}>Disabled (Never Auto-Lock)</option>
                  <option value={1}>1 Minute</option>
                  <option value={5}>5 Minutes</option>
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                </select>
              </div>

              <div className={styles.divider} />

              <div className={styles.btnRow}>
                <button
                  type="button"
                  className={styles.btnDanger}
                  onClick={() => {
                    playClick();
                    if (onLock) onLock();
                  }}
                >
                  <LockIcon size={14} /> Lock Session Immediately
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 8. STORAGE & VIRTUAL DISK */}
        {activeTab === 'storage' && (
          <div className={styles.tabContent}>
            <div className={styles.tabHeader}>
              <h2>Virtual Storage & IndexedDB Disk</h2>
              <p>POSIX virtual filesystem partition breakdown and persistent browser quota telemetry.</p>
            </div>

            <div className={styles.card}>
              <div className={styles.sectionTitle}><SaveIcon size={16} /> Storage Quota Telemetry</div>
              <div className={styles.partitionContainer}>
                <div className={styles.partitionBar}>
                  <div className={styles.partitionSegSystem} style={{ width: '18%' }} />
                  <div className={styles.partitionSegDocs} style={{ width: `${Math.max(4, storageQuota.percentUsed)}%` }} />
                  <div className={styles.partitionSegMedia} style={{ width: '12%' }} />
                  <div className={styles.partitionSegFree} style={{ width: `${100 - Math.min(95, storageQuota.percentUsed + 30)}%` }} />
                </div>
                <div className={styles.partitionLegend}>
                  <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#7eb8ff' }} /> OS Core (18%)</div>
                  <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#a78bfa' }} /> Documents & VFS ({storageQuota.percentUsed}%)</div>
                  <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#fbbf24' }} /> Media & Cache (12%)</div>
                  <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: 'rgba(255,255,255,0.2)' }} /> Available Sandbox</div>
                </div>
              </div>

              <div className={styles.specGrid} style={{ marginTop: 10 }}>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Space Utilized</span>
                  <span className={styles.specValue}>{storageQuota.usageFormatted}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Sandbox Quota</span>
                  <span className={styles.specValue}>{storageQuota.quotaFormatted}</span>
                </div>
              </div>

              <div className={styles.btnRow}>
                <button
                  className={styles.btnSecondary}
                  onClick={async () => {
                    playClick();
                    await CacheStorageService.clearCache();
                    await storageQuota.refresh();
                    showSavedMessage('Media cache cleared successfully!');
                  }}
                >
                  <RefreshIcon size={14} /> Clear Media Cache
                </button>
                <button
                  className={styles.btnSecondary}
                  onClick={async () => {
                    playClick();
                    await VFS.emptyTrash();
                    await storageQuota.refresh();
                    showSavedMessage('Recycle Bin emptied!');
                  }}
                >
                  <TrashIcon size={14} /> Empty Recycle Bin
                </button>
                <button
                  className={styles.btnDanger}
                  onClick={async () => {
                    playClick();
                    let doReset = true;
                    if (osModal) {
                      doReset = await osModal.showConfirm('WARNING: Format virtual disk and restore default seed files? Custom files in IndexedDB will be erased.', 'Format Disk');
                    }
                    if (doReset) {
                      await VFS.resetToDefaults();
                      await storageQuota.refresh();
                      showSavedMessage('Virtual File System formatted to defaults!');
                    }
                  }}
                >
                  Format Virtual Disk (Factory Reset)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 9. BACKUP & RECOVERY */}
        {activeTab === 'backup' && (
          <div className={styles.tabContent}>
            <div className={styles.tabHeader}>
              <h2>System Backup & Disaster Recovery</h2>
              <p>Export a complete JSON snapshot of all your settings, preferences, and VFS files.</p>
            </div>

            <div className={styles.card}>
              <div className={styles.sectionTitle}><DownloadIcon size={16} /> Export System Image</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Packages your current user profile, appearance themes, sound settings, security credentials, and every file inside your IndexedDB Virtual File System into an exportable backup file.
              </p>
              <div className={styles.btnRow}>
                <button className={styles.btnPrimary} onClick={handleExportSystemImage}>
                  <DownloadIcon size={14} /> Download System Image (.json)
                </button>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.sectionTitle}><UploadIcon size={16} /> Restore From System Image</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Restores your Billighost OS environment from an existing backup JSON file.
              </p>
              <input
                type="file"
                ref={restoreFileInputRef}
                onChange={handleRestoreSystemImage}
                accept=".json"
                style={{ display: 'none' }}
              />
              <div className={styles.btnRow}>
                <button className={styles.btnSecondary} onClick={() => restoreFileInputRef.current?.click()}>
                  <UploadIcon size={14} /> Choose Backup File & Restore
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 10. SYSTEM SPECS & BENCHMARK */}
        {activeTab === 'about' && (
          <div className={styles.tabContent}>
            <div className={styles.tabHeader}>
              <h2>System Specs & Live Benchmark</h2>
              <p>Detailed hardware inspection, platform telemetry, and live sandbox CPU benchmark.</p>
            </div>

            <div className={styles.card}>
              <div className={styles.sectionTitle}><GaugeIcon size={16} /> Browser Sandbox Benchmark</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Executes 2,000,000 floating-point mathematics operations and bitwise hash calculations to evaluate client JavaScript execution throughput.
              </p>
              <div className={styles.btnRow}>
                <button
                  className={styles.btnPrimary}
                  onClick={handleRunBenchmark}
                  disabled={benchmarkRunning}
                >
                  <GaugeIcon size={14} /> {benchmarkRunning ? 'Executing Stress Test...' : 'Run CPU Benchmark'}
                </button>
              </div>

              {benchmarkResult && (
                <div className={styles.benchmarkCard}>
                  <div className={styles.benchmarkDetails}>
                    <span style={{ fontWeight: 700, color: '#fff' }}>Throughput: {benchmarkResult.ops} ops/sec</span>
                    <span>Elapsed time: {benchmarkResult.elapsed} ms</span>
                  </div>
                  <div className={styles.benchmarkScore}>
                    {benchmarkResult.score} <span style={{ fontSize: '0.8rem' }}>PTS</span>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.card}>
              <div className={styles.sectionTitle}><InfoIcon size={16} /> Hardware Telemetry Breakdown</div>
              <div className={styles.specGrid}>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Operating System</span>
                  <span className={styles.specValue}>Billighost OS 1.0 (Web Kernel)</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Logical CPU Cores</span>
                  <span className={styles.specValue}>{typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8} Threads</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Device Memory</span>
                  <span className={styles.specValue}>{typeof navigator !== 'undefined' && navigator.deviceMemory ? `${navigator.deviceMemory} GB RAM` : 'Available in Sandbox'}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Display Resolution</span>
                  <span className={styles.specValue}>{typeof window !== 'undefined' ? `${window.screen.width} \u00d7 ${window.screen.height} (${window.devicePixelRatio || 1}x DPI)` : '1920 \u00d7 1080'}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Network Bandwidth</span>
                  <span className={styles.specValue}>{network.isOnline ? `${network.effectiveType.toUpperCase()} \u2022 ${network.downlink} Mbps (${network.rtt}ms)` : 'Offline'}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Battery Charge</span>
                  <span className={styles.specValue}>{battery.levelText} ({battery.statusText})</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Virtual File System</span>
                  <span className={styles.specValue}>IndexedDB (billighost_os_vfs)</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Audio Engine</span>
                  <span className={styles.specValue}>Web Audio Procedural Synth</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
