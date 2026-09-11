// LocalStorage Management for Billighost OS Configurations & Preferences

export const DEFAULT_USER_PROFILE = {
  // Empty, not a fake identity. First-run setup fills these in; anything
  // hardcoded here would ship as someone else's name and address.
  name: '',
  email: '',
  avatar: null, // null means generate sleek neon geometric avatar / icon
  role: 'Administrator',
};

export const DEFAULT_APPEARANCE = {
  theme: 'cyber-dark', // 'cyber-dark' | 'deep-navy' | 'light-glass' | 'neon-synth'
  accentColor: '#7eb8ff', // default blue glow
  accentGlow: 'rgba(126, 184, 255, 0.4)',
  wallpaper: 'default', // 'default' | 'nebula' | 'cyberpunk' | 'minimal-dark' | 'custom'
  customWallpaperData: null, // base64 or object URL
  nightLight: false,
  nightLightIntensity: 30, // %
  clockFormat: '24h', // '12h' | '24h'
  showSeconds: false,
};

export const DEFAULT_SOUND_CONFIG = {
  masterVolume: 80, // 0 - 100
  isMuted: false,
  soundEffects: true,
};

export const DEFAULT_SECURITY = {
  // No default PIN: a shipped one is either a backdoor or a hint printed on
  // the lock screen. Setup requires the user to choose theirs.
  pin: '',
  autoLockMinutes: 0, // 0 = disabled
};

const STORAGE_KEYS = {
  SETUP: 'billighost_setup',
  USER_PROFILE: 'billighost_user_profile',
  APPEARANCE: 'billighost_appearance',
  SOUND: 'billighost_sound_config',
  SECURITY: 'billighost_security',
  WINDOW_STATE: 'billighost_window_state',
};

export const LocalSettings = {
  // --- First-run setup ---

  /** True once the setup wizard has been completed. */
  isSetupComplete() {
    try {
      return localStorage.getItem(STORAGE_KEYS.SETUP) === 'complete';
    } catch {
      return false;   // private mode: treat as unconfigured rather than crash
    }
  },

  markSetupComplete() {
    try {
      localStorage.setItem(STORAGE_KEYS.SETUP, 'complete');
    } catch { /* storage unavailable */ }
  },

  resetSetup() {
    try {
      localStorage.removeItem(STORAGE_KEYS.SETUP);
    } catch { /* storage unavailable */ }
  },

  // --- Profile ---
  getProfile() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return data ? { ...DEFAULT_USER_PROFILE, ...JSON.parse(data) } : { ...DEFAULT_USER_PROFILE };
    } catch {
      return { ...DEFAULT_USER_PROFILE };
    }
  },

  setProfile(updates) {
    const current = this.getProfile();
    const merged = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('billighost:profile-change', { detail: merged }));
    return merged;
  },

  resetProfile() {
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    window.dispatchEvent(new CustomEvent('billighost:profile-change', { detail: DEFAULT_USER_PROFILE }));
    return { ...DEFAULT_USER_PROFILE };
  },

  // --- Appearance / Theme / Wallpaper ---
  getAppearance() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.APPEARANCE);
      return data ? { ...DEFAULT_APPEARANCE, ...JSON.parse(data) } : { ...DEFAULT_APPEARANCE };
    } catch {
      return { ...DEFAULT_APPEARANCE };
    }
  },

  setAppearance(updates) {
    const current = this.getAppearance();
    const merged = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEYS.APPEARANCE, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('billighost:appearance-change', { detail: merged }));
    return merged;
  },

  resetAppearance() {
    localStorage.removeItem(STORAGE_KEYS.APPEARANCE);
    window.dispatchEvent(new CustomEvent('billighost:appearance-change', { detail: DEFAULT_APPEARANCE }));
    return { ...DEFAULT_APPEARANCE };
  },

  // --- Sound ---
  getSound() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SOUND);
      return data ? { ...DEFAULT_SOUND_CONFIG, ...JSON.parse(data) } : { ...DEFAULT_SOUND_CONFIG };
    } catch {
      return { ...DEFAULT_SOUND_CONFIG };
    }
  },

  setSound(updates) {
    const current = this.getSound();
    const merged = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEYS.SOUND, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('billighost:sound-change', { detail: merged }));
    return merged;
  },

  resetSound() {
    localStorage.removeItem(STORAGE_KEYS.SOUND);
    window.dispatchEvent(new CustomEvent('billighost:sound-change', { detail: DEFAULT_SOUND_CONFIG }));
    return { ...DEFAULT_SOUND_CONFIG };
  },

  // --- Security & PIN ---
  getSecurity() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SECURITY);
      return data ? { ...DEFAULT_SECURITY, ...JSON.parse(data) } : { ...DEFAULT_SECURITY };
    } catch {
      return { ...DEFAULT_SECURITY };
    }
  },

  setSecurity(updates) {
    const current = this.getSecurity();
    const merged = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEYS.SECURITY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('billighost:security-change', { detail: merged }));
    return merged;
  },

  resetSecurity() {
    localStorage.removeItem(STORAGE_KEYS.SECURITY);
    window.dispatchEvent(new CustomEvent('billighost:security-change', { detail: DEFAULT_SECURITY }));
    return { ...DEFAULT_SECURITY };
  },

  // --- Reset All Settings to Factory Default ---
  resetAll() {
    this.resetProfile();
    this.resetAppearance();
    this.resetSound();
    this.resetSecurity();
    localStorage.removeItem(STORAGE_KEYS.WINDOW_STATE);
  },

  // --- Export / Import Entire Settings Suite ---
  exportAll() {
    return {
      profile: this.getProfile(),
      appearance: this.getAppearance(),
      sound: this.getSound(),
      security: this.getSecurity(),
      exportedAt: Date.now(),
      osVersion: '1.0',
    };
  },

  importAll(backup) {
    if (!backup || typeof backup !== 'object') return false;
    if (backup.profile) this.setProfile(backup.profile);
    if (backup.appearance) this.setAppearance(backup.appearance);
    if (backup.sound) this.setSound(backup.sound);
    if (backup.security) this.setSecurity(backup.security);
    return true;
  },
};
