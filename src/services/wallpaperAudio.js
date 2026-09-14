/**
 * Billighost OS — Wallpaper Web Audio Ambience Engine
 *
 * Fully synthesized procedural soundscapes:
 * 1. Gentle steady rain bed (pink noise with gentle organic wind modulation)
 * 2. Randomized micro droplet patter on surfaces
 * 3. Deep rolling thunder rumbles synchronized with lightning strikes
 *
 * Zero external audio files. Pure Web Audio API.
 * Reactive to OS sound preferences (master volume, mute, effects toggle).
 */

import { LocalSettings } from './storage/localStorage';

let audioCtx = null;
let rainGain = null;
let rainLowpass = null;
let rainSource = null;
let rainLfo = null;
let rainLfoGain = null;
let patterInterval = null;
let isPlayingRain = false;
let userVolume = 0.65; // default wallpaper ambience balance
const pendingThunderTimeouts = new Set();
const activeThunderNodes = new Set();

function getAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function getMasterMultiplier() {
  const cfg = LocalSettings.getSound();
  if (cfg.isMuted || !cfg.soundEffects) return 0;
  const vol = typeof cfg.masterVolume === 'number' ? cfg.masterVolume : 80;
  return Math.max(0, Math.min(1, vol / 100));
}

/**
 * Creates a 4-second seamless looped brown/pink noise buffer
 */
function createRainNoiseBuffer(ctx) {
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  let b0L = 0, b1L = 0, b2L = 0;
  let b0R = 0, b1R = 0, b2R = 0;

  for (let i = 0; i < bufferSize; i++) {
    const whiteL = Math.random() * 2 - 1;
    const whiteR = Math.random() * 2 - 1;

    // Pink-noise approximation (Paul Kellet's filter)
    b0L = 0.99886 * b0L + whiteL * 0.0555179;
    b1L = 0.99332 * b1L + whiteL * 0.0750759;
    b2L = 0.96900 * b2L + whiteL * 0.1538520;
    left[i] = (b0L + b1L + b2L + whiteL * 0.08) * 0.45;

    b0R = 0.99886 * b0R + whiteR * 0.0555179;
    b1R = 0.99332 * b1R + whiteR * 0.0750759;
    b2R = 0.96900 * b2R + whiteR * 0.1538520;
    right[i] = (b0R + b1R + b2R + whiteR * 0.08) * 0.45;
  }

  return buffer;
}

/**
 * Procedural tiny droplet blip
 */
function playDroplet(ctx, masterGain) {
  if (!masterGain || !isPlayingRain) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    const t = ctx.currentTime;
    const baseFreq = 2400 + Math.random() * 1600;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.45, t + 0.018);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(baseFreq * 0.8, t);
    filter.Q.setValueAtTime(3.5, t);

    const dropletVol = (0.015 + Math.random() * 0.035);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(dropletVol, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.025);
  } catch {
    // best-effort
  }
}

export const WallpaperAudio = {
  /** Set relative wallpaper sound volume (0 to 1) */
  setVolume(vol) {
    userVolume = Math.max(0, Math.min(1, vol));
    if (rainGain && audioCtx && audioCtx.state !== 'closed') {
      try {
        const targetGain = userVolume * 0.28 * getMasterMultiplier();
        rainGain.gain.cancelScheduledValues(audioCtx.currentTime);
        rainGain.gain.setValueAtTime(rainGain.gain.value, audioCtx.currentTime);
        rainGain.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.08);
      } catch {}
    }
  },

  getVolume() {
    return userVolume;
  },

  isRainPlaying() {
    return isPlayingRain;
  },

  /** Schedule a thunder strike with tracked timeout for easy cancellation */
  scheduleThunder(delayMs, intensity = 1.0) {
    const tid = setTimeout(() => {
      pendingThunderTimeouts.delete(tid);
      WallpaperAudio.playThunder(intensity);
    }, delayMs);
    pendingThunderTimeouts.add(tid);
    return tid;
  },

  /** Cancel all queued thunder strikes */
  cancelPendingThunder() {
    pendingThunderTimeouts.forEach(tid => clearTimeout(tid));
    pendingThunderTimeouts.clear();
  },

  /** Start ambient steady rain soundbed */
  startRain() {
    if (isPlayingRain && rainSource) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const masterMult = getMasterMultiplier();
      if (masterMult <= 0) return;

      // Clean any stale audio nodes first
      WallpaperAudio.stopRain(true);

      const rainBuf = createRainNoiseBuffer(ctx);
      rainSource = ctx.createBufferSource();
      rainSource.buffer = rainBuf;
      rainSource.loop = true;

      // Low-pass filter for soothing rain texture
      rainLowpass = ctx.createBiquadFilter();
      rainLowpass.type = 'lowpass';
      rainLowpass.frequency.setValueAtTime(1150, ctx.currentTime);

      // Subtle LFO for organic wind modulation
      rainLfo = ctx.createOscillator();
      rainLfoGain = ctx.createGain();
      rainLfo.frequency.setValueAtTime(0.16, ctx.currentTime);
      rainLfoGain.gain.setValueAtTime(180, ctx.currentTime);
      rainLfo.connect(rainLfoGain);
      rainLfoGain.connect(rainLowpass.frequency);
      rainLfo.start();

      rainGain = ctx.createGain();
      rainGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      const targetGain = userVolume * 0.28 * masterMult;
      rainGain.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + 0.8);

      rainSource.connect(rainLowpass);
      rainLowpass.connect(rainGain);
      rainGain.connect(ctx.destination);

      rainSource.start();
      isPlayingRain = true;

      // Scatter subtle droplet clicks
      if (patterInterval) clearInterval(patterInterval);
      patterInterval = setInterval(() => {
        if (!isPlayingRain || !audioCtx || !rainGain) return;
        if (Math.random() < 0.75) {
          playDroplet(audioCtx, rainGain);
        }
      }, 95);
    } catch {
      // Audio autoplay policy or blocked
      isPlayingRain = false;
    }
  },

  /** Stop ambient steady rain immediately or with a smooth decay */
  stopRain(immediate = true) {
    isPlayingRain = false;

    // 1. Clear droplet timer immediately
    if (patterInterval) {
      clearInterval(patterInterval);
      patterInterval = null;
    }

    // 2. Clear any pending thunder strikes
    WallpaperAudio.cancelPendingThunder();

    const currGain = rainGain;
    const currSource = rainSource;
    const currLfo = rainLfo;
    const currLfoGain = rainLfoGain;
    const currLowpass = rainLowpass;

    rainGain = null;
    rainSource = null;
    rainLfo = null;
    rainLfoGain = null;
    rainLowpass = null;

    if (currGain && audioCtx && audioCtx.state !== 'closed') {
      try {
        currGain.gain.cancelScheduledValues(audioCtx.currentTime);
        currGain.gain.setValueAtTime(currGain.gain.value, audioCtx.currentTime);
        if (immediate) {
          currGain.gain.setValueAtTime(0.00001, audioCtx.currentTime);
        } else {
          currGain.gain.linearRampToValueAtTime(0.00001, audioCtx.currentTime + 0.08);
        }
      } catch {}
    }

    const teardownNodes = () => {
      try {
        currSource?.stop();
        currSource?.disconnect();
      } catch {}
      try {
        currLfo?.stop();
        currLfo?.disconnect();
      } catch {}
      try {
        currLfoGain?.disconnect();
      } catch {}
      try {
        currLowpass?.disconnect();
      } catch {}
      try {
        currGain?.disconnect();
      } catch {}
    };

    if (immediate) {
      teardownNodes();
    } else {
      setTimeout(teardownNodes, 90);
    }
  },

  /**
   * Synthesize a deep rolling thunder strike
   * @param {number} intensity - 0.5 to 1.5
   */
  playThunder(intensity = 1.0) {
    try {
      const ctx = getAudioContext();
      if (!ctx || ctx.state === 'closed') return;

      const masterMult = getMasterMultiplier();
      if (masterMult <= 0) return;

      const t = ctx.currentTime;
      const thunderGain = ctx.createGain();
      const finalVol = Math.min(1.0, userVolume * 0.42 * masterMult * intensity);
      thunderGain.gain.setValueAtTime(finalVol, t);
      thunderGain.connect(ctx.destination);

      activeThunderNodes.add(thunderGain);

      // 1. Sub-bass boom oscillator
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(75, t);
      subOsc.frequency.exponentialRampToValueAtTime(32, t + 1.4);

      subGain.gain.setValueAtTime(0.0001, t);
      subGain.gain.linearRampToValueAtTime(0.65, t + 0.04);
      subGain.gain.exponentialRampToValueAtTime(0.12, t + 0.8);
      subGain.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);

      subOsc.connect(subGain);
      subGain.connect(thunderGain);
      subOsc.start(t);
      subOsc.stop(t + 2.5);

      // 2. Filtered rolling noise rumble
      const noiseDur = 2.8;
      const noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * noiseDur), ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(140, t);
      filter.frequency.exponentialRampToValueAtTime(58, t + 2.2);
      filter.Q.setValueAtTime(3.2, t);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, t);
      noiseGain.gain.linearRampToValueAtTime(0.48, t + 0.06);
      noiseGain.gain.exponentialRampToValueAtTime(0.24, t + 0.6);
      // secondary swell
      noiseGain.gain.linearRampToValueAtTime(0.28, t + 1.1);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + noiseDur);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(thunderGain);

      noise.start(t);
      noise.stop(t + noiseDur);

      // Cleanup thunder gain node after noise finishes
      setTimeout(() => {
        try {
          thunderGain.disconnect();
        } catch {}
        activeThunderNodes.delete(thunderGain);
      }, (noiseDur + 0.2) * 1000);
    } catch {
      // AudioContext blocked
    }
  },

  /** Full immediate silence of all rain and thunder nodes */
  stopAll() {
    WallpaperAudio.stopRain(true);
    WallpaperAudio.cancelPendingThunder();
    activeThunderNodes.forEach(node => {
      try {
        if (audioCtx && audioCtx.state !== 'closed') {
          node.gain.cancelScheduledValues(audioCtx.currentTime);
          node.gain.setValueAtTime(0.00001, audioCtx.currentTime);
        }
        node.disconnect();
      } catch {}
    });
    activeThunderNodes.clear();
  },
};

// Listen to OS-wide sound changes
if (typeof window !== 'undefined') {
  window.addEventListener('billighost:sound-change', () => {
    if (isPlayingRain) {
      WallpaperAudio.setVolume(userVolume);
    }
  });

  // Suspend when tab hidden, resume when visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (isPlayingRain) {
        WallpaperAudio.stopRain();
      }
    }
  });
}
