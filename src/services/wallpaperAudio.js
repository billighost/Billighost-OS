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
let rainSource = null;
let patterInterval = null;
let isPlayingRain = false;
let userVolume = 0.65; // default wallpaper ambience balance

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
    if (rainGain && audioCtx) {
      const targetGain = userVolume * 0.28 * getMasterMultiplier();
      rainGain.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.1);
    }
  },

  getVolume() {
    return userVolume;
  },

  isRainPlaying() {
    return isPlayingRain;
  },

  /** Start ambient steady rain soundbed */
  startRain() {
    if (isPlayingRain) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const masterMult = getMasterMultiplier();
      if (masterMult <= 0) return;

      const rainBuf = createRainNoiseBuffer(ctx);
      rainSource = ctx.createBufferSource();
      rainSource.buffer = rainBuf;
      rainSource.loop = true;

      // Low-pass filter for soothing rain texture
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(1150, ctx.currentTime);

      // Subtle LFO for organic wind modulation
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(0.16, ctx.currentTime);
      lfoGain.gain.setValueAtTime(180, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(lowpass.frequency);
      lfo.start();

      rainGain = ctx.createGain();
      rainGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      const targetGain = userVolume * 0.28 * masterMult;
      rainGain.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + 1.2);

      rainSource.connect(lowpass);
      lowpass.connect(rainGain);
      rainGain.connect(ctx.destination);

      rainSource.start();
      isPlayingRain = true;

      // Scatter subtle droplet clicks
      if (patterInterval) clearInterval(patterInterval);
      patterInterval = setInterval(() => {
        if (!isPlayingRain || !audioCtx) return;
        if (Math.random() < 0.75) {
          playDroplet(audioCtx, rainGain);
        }
      }, 95);
    } catch {
      // Audio autoplay policy or blocked
    }
  },

  /** Stop ambient steady rain */
  stopRain() {
    if (!isPlayingRain) return;
    try {
      if (patterInterval) {
        clearInterval(patterInterval);
        patterInterval = null;
      }
      if (rainGain && audioCtx) {
        rainGain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
        setTimeout(() => {
          try {
            rainSource?.stop();
            rainSource?.disconnect();
            rainSource = null;
          } catch {}
        }, 700);
      }
    } catch {}
    isPlayingRain = false;
  },

  /**
   * Synthesize a deep rolling thunder strike
   * @param {number} intensity - 0.5 to 1.5
   */
  playThunder(intensity = 1.0) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const masterMult = getMasterMultiplier();
      if (masterMult <= 0) return;

      const t = ctx.currentTime;
      const thunderGain = ctx.createGain();
      const finalVol = Math.min(1.0, userVolume * 0.42 * masterMult * intensity);
      thunderGain.gain.setValueAtTime(finalVol, t);
      thunderGain.connect(ctx.destination);

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
    } catch {
      // AudioContext blocked
    }
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
