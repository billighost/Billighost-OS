import { useState, useEffect, useRef } from 'react';
import { LocalSettings, DEFAULT_USER_PROFILE, DEFAULT_APPEARANCE } from '../services/storage/localStorage';
import { VFS } from '../services/storage/indexedDB';
import { CacheStorageService } from '../services/storage/cacheStorage';
import { useStorageQuota } from '../hooks/useStorageQuota';
import { useBattery } from '../hooks/useBattery';
import { useNetwork } from '../hooks/useNetwork';
import styles from './SettingsApp.module.css';

const WALLPAPER_PRESETS = [
  {
    id: 'default',
    name: 'Deep Void',
    type: 'gradient',
    css: 'radial-gradient(ellipse at 30% 40%, #0d1b2a 0%, #050505 50%), radial-gradient(ellipse at 70% 60%, #1a0a2e 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, #0a1628 0%, transparent 40%)',
  },
  {
    id: 'cyber-city',
    name: 'Cyber Neon',
    type: 'gradient',
    css: 'radial-gradient(circle at 20% 20%, #2e0854 0%, #0d0221 45%, #050505 100%), radial-gradient(circle at 80% 80%, #022b3a 0%, transparent 50%)',
  },
  {
    id: 'obsidian-flow',
    name: 'Obsidian Flow',
    type: 'gradient',
    css: 'linear-gradient(135deg, #090a0f 0%, #111422 50%, #050608 100%)',
  },
  {
    id: 'quantum-aurora',
    name: 'Quantum Aurora',
    type: 'gradient',
    css: 'radial-gradient(ellipse at top left, #064e3b 0%, #022c22 30%, #020617 70%)',
  },
  {
    id: 'crimson-noir',
    name: 'Crimson Noir',
    type: 'gradient',
    css: 'radial-gradient(circle at 50% 30%, #4c0519 0%, #1f0208 40%, #050505 90%)',
  },
  {
    id: 'matrix-emerald',
    name: 'Matrix Emerald',
    type: 'gradient',
    css: 'radial-gradient(ellipse at 50% 50%, #062817 0%, #02120a 50%, #000000 100%)',
  },
];

const AVATAR_PRESETS = [
  { id: 'av1', label: '👻 Ghost', bg: 'linear-gradient(135deg, #7eb8ff, #a78bfa)' },
  { id: 'av2', label: '⚡ Pulse', bg: 'linear-gradient(135deg, #34d399, #059669)' },
  { id: 'av3', label: '🪐 Cosmos', bg: 'linear-gradient(135deg, #f43f5e, #be123c)' },
  { id: 'av4', label: '🛡️ Cyber', bg: 'linear-gradient(135deg, #fbbf24, #d97706)' },
  { id: 'av5', label: '🔮 Void', bg: 'linear-gradient(135deg, #818cf8, #4338ca)' },
  { id: 'av6', label: '💠 Quantum', bg: 'linear-gradient(135deg, #2dd4bf, #0e7490)' },
];

const ACCENT_COLORS = [
  { name: 'Cyan Glow', hex: '#7eb8ff', glow: 'rgba(126, 184, 255, 0.4)' },
  { name: 'Amethyst', hex: '#a78bfa', glow: 'rgba(167, 139, 250, 0.4)' },
  { name: 'Emerald', hex: '#34d399', glow: 'rgba(52, 211, 153, 0.4)' },
  { name: 'Amber', hex: '#fbbf24', glow: 'rgba(251, 191, 36, 0.4)' },
  { name: 'Rose', hex: '#ff4d6a', glow: 'rgba(255, 77, 106, 0.4)' },
];

export default function SettingsApp({ initialTab = 'profile', playClick = () => {} }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [profile, setProfile] = useState(() => LocalSettings.getProfile());
  const [appearance, setAppearance] = useState(() => LocalSettings.getAppearance());
  const [sound, setSound] = useState(() => LocalSettings.getSound());
  const [saveBanner, setSaveBanner] = useState('');

  const avatarInputRef = useRef(null);
  const wallpaperInputRef = useRef(null);

  const storageQuota = useStorageQuota();
  const battery = useBattery();
  const network = useNetwork();

  const showSavedMessage = (msg) => {
    setSaveBanner(msg);
    setTimeout(() => setSaveBanner(''), 2500);
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
    // Generate an SVG or CSS avatar representation
    const updated = LocalSettings.setProfile({ avatar: null, avatarPreset: preset.id });
    setProfile(updated);
    showSavedMessage(`Avatar updated to ${preset.label}`);
  };

  const handleResetProfile = () => {
    playClick();
    if (confirm('Reset profile picture and user info to factory defaults?')) {
      const reset = LocalSettings.resetProfile();
      setProfile(reset);
      showSavedMessage('Profile reset to defaults!');
    }
  };

  // --- Wallpaper Operations ---
  const handleSelectWallpaper = (wp) => {
    playClick();
    const updated = LocalSettings.setAppearance({
      wallpaper: wp.id,
      customWallpaperData: null,
      wallpaperCss: wp.css,
    });
    setAppearance(updated);
    showSavedMessage(`Wallpaper set to "${wp.name}"`);
  };

  const handleWallpaperUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      const updated = LocalSettings.setAppearance({
        wallpaper: 'custom',
        customWallpaperData: dataUrl,
        wallpaperCss: `url("${dataUrl}")`,
      });
      setAppearance(updated);
      showSavedMessage('Custom wallpaper applied!');
    };
    reader.readAsDataURL(file);
  };

  const handleResetWallpaper = () => {
    playClick();
    const updated = LocalSettings.setAppearance({
      wallpaper: 'default',
      customWallpaperData: null,
      wallpaperCss: null,
    });
    setAppearance(updated);
    showSavedMessage('Wallpaper reset to system default!');
  };

  // --- Appearance / Theme Operations ---
  const handleSelectAccent = (accent) => {
    playClick();
    const updated = LocalSettings.setAppearance({
      accentColor: accent.hex,
      accentGlow: accent.glow,
    });
    setAppearance(updated);
    document.documentElement.style.setProperty('--accent-glow', accent.hex);
    showSavedMessage(`Accent color set to ${accent.name}`);
  };

  const handleSelectTheme = (themeId) => {
    playClick();
    const updated = LocalSettings.setAppearance({ theme: themeId });
    setAppearance(updated);
    showSavedMessage(`Theme switched to ${themeId}`);
  };

  const handleResetAppearance = () => {
    playClick();
    if (confirm('Reset all appearance settings (theme, wallpaper, colors) to defaults?')) {
      const reset = LocalSettings.resetAppearance();
      setAppearance(reset);
      document.documentElement.style.setProperty('--accent-glow', DEFAULT_APPEARANCE.accentColor);
      showSavedMessage('Appearance reset to defaults!');
    }
  };

  // --- Sound Operations ---
  const handleUpdateSound = (updates) => {
    const updated = LocalSettings.setSound(updates);
    setSound(updated);
  };

  const handleResetSound = () => {
    playClick();
    const reset = LocalSettings.resetSound();
    setSound(reset);
    showSavedMessage('Sound configuration reset!');
  };

  // --- Storage / VFS Operations ---
  const handleClearCache = async () => {
    playClick();
    await CacheStorageService.clearCache();
    await storageQuota.refresh();
    showSavedMessage('Cache and media store cleared!');
  };

  const handleResetVFS = async () => {
    playClick();
    if (confirm('WARNING: Format virtual disk and restore default files? All custom documents in IndexedDB will be erased.')) {
      await VFS.resetToDefaults();
      await storageQuota.refresh();
      showSavedMessage('Virtual File System formatted to factory defaults!');
    }
  };

  return (
    <div className={styles.settingsLayout}>
      {/* Sidebar Navigation */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarLogo}>⚙️</span>
          <span>Settings</span>
        </div>

        <nav className={styles.navMenu}>
          <button
            className={`${styles.navItem} ${activeTab === 'profile' ? styles.navItemActive : ''}`}
            onClick={() => { playClick(); setActiveTab('profile'); }}
          >
            <span className={styles.navIcon}>👤</span> Profile & Account
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'wallpaper' ? styles.navItemActive : ''}`}
            onClick={() => { playClick(); setActiveTab('wallpaper'); }}
          >
            <span className={styles.navIcon}>🖼️</span> Wallpaper
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'appearance' ? styles.navItemActive : ''}`}
            onClick={() => { playClick(); setActiveTab('appearance'); }}
          >
            <span className={styles.navIcon}>🎨</span> Theme & Colors
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'storage' ? styles.navItemActive : ''}`}
            onClick={() => { playClick(); setActiveTab('storage'); }}
          >
            <span className={styles.navIcon}>💾</span> Storage & Quota
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'sound' ? styles.navItemActive : ''}`}
            onClick={() => { playClick(); setActiveTab('sound'); }}
          >
            <span className={styles.navIcon}>🔊</span> Sound & Audio
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'about' ? styles.navItemActive : ''}`}
            onClick={() => { playClick(); setActiveTab('about'); }}
          >
            <span className={styles.navIcon}>ℹ️</span> System Specs
          </button>
        </nav>
      </div>

      {/* Main Content Pane */}
      <div className={styles.mainPane}>
        {saveBanner && <div className={styles.bannerSuccess}>{saveBanner}</div>}

        {/* 1. PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className={styles.tabContent}>
            <div className={styles.tabHeader}>
              <h2>User Profile & Identity</h2>
              <p>Personalize your avatar, display name, and login credentials.</p>
            </div>

            <div className={styles.card}>
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
                  <button
                    className={styles.btnPrimary}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    Upload New Avatar
                  </button>
                  <button
                    className={styles.btnSecondary}
                    onClick={handleResetProfile}
                  >
                    Reset to Default
                  </button>
                </div>
              </div>

              <div className={styles.sectionSubtitle}>Or Pick a Preset Icon:</div>
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

            <form onSubmit={handleSaveProfile} className={styles.card}>
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

              <div className={styles.btnRow}>
                <button type="submit" className={styles.btnPrimary}>Save Profile</button>
                <button type="button" className={styles.btnDanger} onClick={handleResetProfile}>
                  Factory Reset Profile
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 2. WALLPAPER TAB */}
        {activeTab === 'wallpaper' && (
          <div className={styles.tabContent}>
            <div className={styles.tabHeader}>
              <h2>Wallpaper & Desktop Environment</h2>
              <p>Choose high-resolution built-in themes or upload your own background.</p>
            </div>

            <div className={styles.card}>
              <div className={styles.wallpaperControls}>
                <input
                  type="file"
                  ref={wallpaperInputRef}
                  onChange={handleWallpaperUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                <button
                  className={styles.btnPrimary}
                  onClick={() => wallpaperInputRef.current?.click()}
                >
                  📤 Upload Custom Wallpaper
                </button>
                <button
                  className={styles.btnSecondary}
                  onClick={handleResetWallpaper}
                >
                  🔄 Reset to Default Wallpaper
                </button>
              </div>

              <div className={styles.sectionSubtitle}>Curated Backgrounds:</div>
              <div className={styles.wallpaperGrid}>
                {WALLPAPER_PRESETS.map((wp) => (
                  <div
                    key={wp.id}
                    className={`${styles.wallpaperCard} ${appearance.wallpaper === wp.id ? styles.wallpaperActive : ''}`}
                    onClick={() => handleSelectWallpaper(wp)}
                  >
                    <div className={styles.wallpaperThumb} style={{ background: wp.css }} />
                    <span className={styles.wallpaperName}>{wp.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. APPEARANCE TAB */}
        {activeTab === 'appearance' && (
          <div className={styles.tabContent}>
            <div className={styles.tabHeader}>
              <h2>Theme & Visual Aesthetics</h2>
              <p>Customize system accent colors, dark mode variants, and night light.</p>
            </div>

            <div className={styles.card}>
              <div className={styles.sectionSubtitle}>Accent Glow Color:</div>
              <div className={styles.accentGrid}>
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    className={`${styles.accentBtn} ${appearance.accentColor === c.hex ? styles.accentActive : ''}`}
                    style={{ '--btn-color': c.hex }}
                    onClick={() => handleSelectAccent(c)}
                  >
                    <span className={styles.accentDot} style={{ background: c.hex }} />
                    {c.name}
                  </button>
                ))}
              </div>

              <div className={styles.divider} />

              <div className={styles.sectionSubtitle}>Night Light:</div>
              <div className={styles.toggleRow}>
                <div>
                  <div className={styles.labelTitle}>Reduce Blue Light</div>
                  <div className={styles.labelDesc}>Warms OS colors to reduce eye fatigue at night.</div>
                </div>
                <input
                  type="checkbox"
                  checked={appearance.nightLight}
                  onChange={(e) => {
                    const updated = LocalSettings.setAppearance({ nightLight: e.target.checked });
                    setAppearance(updated);
                  }}
                  className={styles.switchCheckbox}
                />
              </div>

              <div className={styles.divider} />

              <div className={styles.btnRow}>
                <button className={styles.btnDanger} onClick={handleResetAppearance}>
                  Reset Appearance to Defaults
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. STORAGE & DISK TAB */}
        {activeTab === 'storage' && (
          <div className={styles.tabContent}>
            <div className={styles.tabHeader}>
              <h2>Browser Virtual Storage</h2>
              <p>Real-time telemetry of IndexedDB database files and browser quota.</p>
            </div>

            <div className={styles.card}>
              <div className={styles.telemetryRow}>
                <span>Storage Utilized</span>
                <span className={styles.monoValue}>{storageQuota.usageFormatted} / {storageQuota.quotaFormatted}</span>
              </div>
              <div className={styles.batteryProgressBar}>
                <div
                  className={styles.batteryProgressFill}
                  style={{ width: `${Math.max(2, storageQuota.percentUsed)}%`, background: 'var(--accent-glow)' }}
                />
              </div>
              <div className={styles.telemetrySub}>
                {storageQuota.percentUsed}% of allocated browser sandbox used.
              </div>

              <div className={styles.divider} />

              <div className={styles.btnRow}>
                <button className={styles.btnSecondary} onClick={handleClearCache}>
                  Clear Media Cache
                </button>
                <button className={styles.btnDanger} onClick={handleResetVFS}>
                  Format Virtual Disk (Factory Reset)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. SOUND TAB */}
        {activeTab === 'sound' && (
          <div className={styles.tabContent}>
            <div className={styles.tabHeader}>
              <h2>Audio & System Sounds</h2>
              <p>Manage audio feedback, chime volume, and mute states.</p>
            </div>

            <div className={styles.card}>
              <div className={styles.formGroup}>
                <div className={styles.telemetryRow}>
                  <span>Master Volume</span>
                  <span className={styles.monoValue}>{sound.isMuted ? 'Muted (0%)' : `${sound.masterVolume}%`}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sound.isMuted ? 0 : sound.masterVolume}
                  onChange={e => handleUpdateSound({ masterVolume: parseInt(e.target.value, 10), isMuted: false })}
                  className={styles.rangeInput}
                />
              </div>

              <div className={styles.toggleRow}>
                <div>
                  <div className={styles.labelTitle}>Mute Audio</div>
                  <div className={styles.labelDesc}>Silences all system chimes and click effects.</div>
                </div>
                <input
                  type="checkbox"
                  checked={sound.isMuted}
                  onChange={e => handleUpdateSound({ isMuted: e.target.checked })}
                  className={styles.switchCheckbox}
                />
              </div>

              <div className={styles.divider} />

              <div className={styles.btnRow}>
                <button
                  className={styles.btnSecondary}
                  onClick={() => {
                    playClick();
                    showSavedMessage('Audio chime tested!');
                  }}
                >
                  🔔 Test Sound Effect
                </button>
                <button className={styles.btnDanger} onClick={handleResetSound}>
                  Reset Sound Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. SYSTEM SPECS / ABOUT TAB */}
        {activeTab === 'about' && (
          <div className={styles.tabContent}>
            <div className={styles.tabHeader}>
              <h2>System Specs & Telemetry</h2>
              <p>Live hardware inspection and browser platform capabilities.</p>
            </div>

            <div className={styles.card}>
              <div className={styles.specGrid}>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Operating System</span>
                  <span className={styles.specValue}>Billighost OS 1.0 (Web Architecture)</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Logical CPU Cores</span>
                  <span className={styles.specValue}>{typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8} Threads</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Device Memory (RAM)</span>
                  <span className={styles.specValue}>{typeof navigator !== 'undefined' && navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'Available in sandbox'}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Display Resolution</span>
                  <span className={styles.specValue}>{typeof window !== 'undefined' ? `${window.screen.width} × ${window.screen.height}` : '1920 × 1080'}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Real Battery Status</span>
                  <span className={styles.specValue}>{battery.level}% ({battery.statusText})</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Real Network Bandwidth</span>
                  <span className={styles.specValue}>{network.isOnline ? `${network.effectiveType.toUpperCase()} • ${network.downlink} Mbps (${network.rtt}ms)` : 'Offline'}</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>IndexedDB Engine</span>
                  <span className={styles.specValue}>billighost_os_vfs (POSIX Tree)</span>
                </div>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Browser Engine</span>
                  <span className={styles.specValue}>{typeof navigator !== 'undefined' ? navigator.userAgent.split(' ')[0] : 'V8 / Chromium'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
