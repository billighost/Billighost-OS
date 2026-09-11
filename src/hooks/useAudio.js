import { useRef, useCallback, useEffect } from 'react';
import { LocalSettings } from '../services/storage/localStorage';

/**
 * Web Audio API hook for Billighost OS — all sounds are synthesized.
 * Zero external audio files. Every sound is generated procedurally.
 * Fully responsive to user sound preferences (master volume, mute, effects toggle).
 */
export function useAudio() {
  const ctxRef = useRef(null);
  const soundConfigRef = useRef(LocalSettings.getSound());

  // Keep sound configuration reactive
  useEffect(() => {
    const handleSoundChange = (e) => {
      soundConfigRef.current = e.detail;
    };
    window.addEventListener('billighost:sound-change', handleSoundChange);
    return () => window.removeEventListener('billighost:sound-change', handleSoundChange);
  }, []);

  const getVolumeMultiplier = () => {
    const cfg = soundConfigRef.current || LocalSettings.getSound();
    if (cfg.isMuted || !cfg.soundEffects) return 0;
    const vol = typeof cfg.masterVolume === 'number' ? cfg.masterVolume : 80;
    return Math.max(0, Math.min(1, vol / 100));
  };

  const getContext = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  /** Soft click — 800Hz sine, 50ms */
  const playClick = useCallback(() => {
    try {
      const mult = getVolumeMultiplier();
      if (mult <= 0) return;
      const ctx = getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.08 * mult, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.06);
    } catch {
      /* Audio not available */
    }
  }, [getContext]);

  /** Key press — 1200Hz sine, 30ms */
  const playKeyPress = useCallback(() => {
    try {
      const mult = getVolumeMultiplier();
      if (mult <= 0) return;
      const ctx = getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.03);

      gain.gain.setValueAtTime(0.06 * mult, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      /* Audio not available */
    }
  }, [getContext]);

  /** Window Aero Snap — crisp tactile dual click */
  const playSnap = useCallback(() => {
    try {
      const mult = getVolumeMultiplier();
      if (mult <= 0) return;
      const ctx = getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(650, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1150, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.12 * mult, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      /* Audio not available */
    }
  }, [getContext]);

  /** Window Minimize — descending pitch sweep */
  const playMinimize = useCallback(() => {
    try {
      const mult = getVolumeMultiplier();
      if (mult <= 0) return;
      const ctx = getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.09 * mult, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.085);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      /* Audio not available */
    }
  }, [getContext]);

  /** Window Maximize / Restore — ascending pitch sweep */
  const playMaximize = useCallback(() => {
    try {
      const mult = getVolumeMultiplier();
      if (mult <= 0) return;
      const ctx = getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(640, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.09 * mult, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.085);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      /* Audio not available */
    }
  }, [getContext]);

  /** Notification Toast Crystal Ping — dual crystal chimes (A5 -> D6) */
  const playNotification = useCallback(() => {
    try {
      const mult = getVolumeMultiplier();
      if (mult <= 0) return;
      const ctx = getContext();
      const freqs = [880, 1174.66]; // A5, D6

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        const startTime = ctx.currentTime + idx * 0.07;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.1 * mult, startTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.3);
      });
    } catch {
      /* Audio not available */
    }
  }, [getContext]);

  /** Empty Trash — crumpled paper texture + soft chime */
  const playTrashEmpty = useCallback(() => {
    try {
      const mult = getVolumeMultiplier();
      if (mult <= 0) return;
      const ctx = getContext();

      // Bandpass noise sweep
      const bufferSize = Math.floor(ctx.sampleRate * 0.2);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.4;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.2);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.12 * mult, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      // Glass ting
      const ding = ctx.createOscillator();
      const dingGain = ctx.createGain();
      ding.type = 'sine';
      ding.frequency.setValueAtTime(1046, ctx.currentTime + 0.05);
      dingGain.gain.setValueAtTime(0, ctx.currentTime);
      dingGain.gain.setValueAtTime(0.07 * mult, ctx.currentTime + 0.05);
      dingGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);

      ding.connect(dingGain);
      dingGain.connect(ctx.destination);

      noise.start(ctx.currentTime);
      noise.stop(ctx.currentTime + 0.21);
      ding.start(ctx.currentTime + 0.05);
      ding.stop(ctx.currentTime + 0.33);
    } catch {
      /* Audio not available */
    }
  }, [getContext]);

  /** Unlock whoosh — bandpass-filtered noise sweep, 300ms */
  const playUnlock = useCallback(() => {
    try {
      const mult = getVolumeMultiplier();
      if (mult <= 0) return;
      const ctx = getContext();
      const bufferSize = ctx.sampleRate * 0.4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(200, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(4000, ctx.currentTime + 0.3);
      filter.Q.setValueAtTime(2, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12 * mult, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.06 * mult, ctx.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      source.start(ctx.currentTime);
      source.stop(ctx.currentTime + 0.4);
    } catch {
      /* Audio not available */
    }
  }, [getContext]);

  /** Error buzz — dual square wave 200Hz, 150ms */
  const playError = useCallback(() => {
    try {
      const mult = getVolumeMultiplier();
      if (mult <= 0) return;
      const ctx = getContext();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'square';
      osc1.frequency.setValueAtTime(200, ctx.currentTime);
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(207, ctx.currentTime);

      gain.gain.setValueAtTime(0.05 * mult, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.04 * mult, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.2);
      osc2.stop(ctx.currentTime + 0.2);
    } catch {
      /* Audio not available */
    }
  }, [getContext]);

  /** Sign-in chime — C5, E5, G5 ascending sine arpeggio */
  const playChime = useCallback(() => {
    try {
      const mult = getVolumeMultiplier();
      if (mult <= 0) return;
      const ctx = getContext();
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        const startTime = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.07 * mult, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.55);
      });
    } catch {
      /* Audio not available */
    }
  }, [getContext]);

  /** Boot ambient — low sine hum + filtered noise, ~4 seconds */
  const playBootAmbient = useCallback(() => {
    try {
      const mult = getVolumeMultiplier();
      if (mult <= 0) return;
      const ctx = getContext();

      /* Low sine hum */
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 4);
      oscGain.gain.setValueAtTime(0, ctx.currentTime);
      oscGain.gain.linearRampToValueAtTime(0.04 * mult, ctx.currentTime + 1.5);
      oscGain.gain.linearRampToValueAtTime(0.03 * mult, ctx.currentTime + 3);
      oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 5);
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 5.5);

      /* Filtered white noise bed */
      const bufferSize = ctx.sampleRate * 5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1);
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const lpFilter = ctx.createBiquadFilter();
      lpFilter.type = 'lowpass';
      lpFilter.frequency.setValueAtTime(400, ctx.currentTime);
      lpFilter.frequency.linearRampToValueAtTime(200, ctx.currentTime + 4);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0, ctx.currentTime);
      noiseGain.gain.linearRampToValueAtTime(0.015 * mult, ctx.currentTime + 2);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 5);

      noiseSource.connect(lpFilter);
      lpFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSource.start(ctx.currentTime);
      noiseSource.stop(ctx.currentTime + 5.5);
    } catch {
      /* Audio not available */
    }
  }, [getContext]);

  /** Success ping — soft high tone for correct PIN */
  const playSuccess = useCallback(() => {
    try {
      const mult = getVolumeMultiplier();
      if (mult <= 0) return;
      const ctx = getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.06 * mult, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      /* Audio not available */
    }
  }, [getContext]);

  // Global event listener for system sound effects
  useEffect(() => {
    const handleGlobalSound = (e) => {
      const soundType = e.detail;
      switch (soundType) {
        case 'click':
          playClick();
          break;
        case 'snap':
          playSnap();
          break;
        case 'minimize':
          playMinimize();
          break;
        case 'maximize':
          playMaximize();
          break;
        case 'notification':
          playNotification();
          break;
        case 'trash-empty':
          playTrashEmpty();
          break;
        case 'error':
          playError();
          break;
        case 'success':
          playSuccess();
          break;
        default:
          break;
      }
    };

    window.addEventListener('billighost:play-sound', handleGlobalSound);
    return () => window.removeEventListener('billighost:play-sound', handleGlobalSound);
  }, [playClick, playSnap, playMinimize, playMaximize, playNotification, playTrashEmpty, playError, playSuccess]);

  return {
    playClick,
    playKeyPress,
    playUnlock,
    playError,
    playChime,
    playBootAmbient,
    playSuccess,
    playSnap,
    playMinimize,
    playMaximize,
    playNotification,
    playTrashEmpty,
  };
}
