/**
 * Subway Surge 3D — Procedural Web Audio Engine
 * Pure procedural audio synthesis using Web Audio API:
 * - Dynamic 128 BPM Synthwave rhythm & bassline
 * - Arpeggiated coin collection chimes
 * - Atmospheric whoosh, grind, thrusters, and crash impacts
 */

class SubwaySurgeAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;

    this.isMuted = false;
    this.isPlayingMusic = false;
    this.musicTimer = null;
    this.step = 0;
    this.streakCounter = 0;
    this.lastStreakTime = 0;

    // Jetpack & Hoverboard continuous loops
    this.jetpackOsc = null;
    this.jetpackGain = null;
    this.hoverboardOsc = null;
    this.hoverboardGain = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);
    } catch {
      // AudioContext unavailable
    }
  }

  ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.7, this.ctx.currentTime);
    }
    if (muted) {
      this.stopContinuousLoops();
    }
  }

  setVolume(vol) {
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }

  // --- SOUND EFFECTS ---

  playCoin() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = Date.now();
    if (now - this.lastStreakTime > 1200) {
      this.streakCounter = 0;
    }
    this.lastStreakTime = now;
    this.streakCounter = Math.min(this.streakCounter + 1, 16);

    const baseFreq = 880; // A5
    const pentatonicRatios = [1, 1.125, 1.25, 1.5, 1.667, 2, 2.25, 2.5, 3];
    const ratio = pentatonicRatios[(this.streakCounter - 1) % pentatonicRatios.length];
    const freq = baseFreq * ratio;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.13);
  }

  playJump() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(540, this.ctx.currentTime + 0.16);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);
    filter.Q.value = 2.5;

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.23);
  }

  playSlide() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    // Filtered noise sweep
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.24);
    filter.Q.value = 3;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start();
  }

  playPowerupGet() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime + idx * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.22);
    });
  }

  playCrash() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    // Sub thump
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.46);

    // Noise burst
    const bufferSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.35);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start();
  }

  playShieldBreak() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(700, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.31);
  }

  // --- CONTINUOUS POWER-UP LOOPS ---

  startJetpackLoop() {
    if (this.isMuted || this.jetpackOsc) return;
    this.ensureContext();
    if (!this.ctx) return;

    this.jetpackOsc = this.ctx.createOscillator();
    this.jetpackOsc.type = 'sawtooth';
    this.jetpackOsc.frequency.setValueAtTime(90, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, this.ctx.currentTime);

    this.jetpackGain = this.ctx.createGain();
    this.jetpackGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

    this.jetpackOsc.connect(filter);
    filter.connect(this.jetpackGain);
    this.jetpackGain.connect(this.sfxGain);

    this.jetpackOsc.start();
  }

  stopJetpackLoop() {
    if (this.jetpackOsc) {
      try {
        this.jetpackGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
        setTimeout(() => {
          this.jetpackOsc?.stop();
          this.jetpackOsc?.disconnect();
          this.jetpackOsc = null;
          this.jetpackGain = null;
        }, 80);
      } catch {
        this.jetpackOsc = null;
      }
    }
  }

  startHoverboardLoop() {
    if (this.isMuted || this.hoverboardOsc) return;
    this.ensureContext();
    if (!this.ctx) return;

    this.hoverboardOsc = this.ctx.createOscillator();
    this.hoverboardOsc.type = 'sine';
    this.hoverboardOsc.frequency.setValueAtTime(220, this.ctx.currentTime);

    this.hoverboardGain = this.ctx.createGain();
    this.hoverboardGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    this.hoverboardOsc.connect(this.hoverboardGain);
    this.hoverboardGain.connect(this.sfxGain);

    this.hoverboardOsc.start();
  }

  stopHoverboardLoop() {
    if (this.hoverboardOsc) {
      try {
        this.hoverboardGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
        setTimeout(() => {
          this.hoverboardOsc?.stop();
          this.hoverboardOsc?.disconnect();
          this.hoverboardOsc = null;
          this.hoverboardGain = null;
        }, 80);
      } catch {
        this.hoverboardOsc = null;
      }
    }
  }

  stopContinuousLoops() {
    this.stopJetpackLoop();
    this.stopHoverboardLoop();
  }

  // --- SYNTHWAVE MUSIC SEQUENCER ---

  startMusic() {
    if (this.isPlayingMusic) return;
    this.ensureContext();
    if (!this.ctx) return;

    this.isPlayingMusic = true;
    this.step = 0;

    const bpm = 126;
    const stepInterval = (60 / bpm) / 4 * 1000; // 16th notes

    const bassNotes = [
      55, 55, 55, 55, 65.41, 65.41, 73.42, 73.42,
      49, 49, 49, 49, 58.27, 58.27, 65.41, 65.41,
    ];

    const leadMelody = [
      440, 0, 523.25, 0, 587.33, 0, 659.25, 0,
      587.33, 0, 523.25, 0, 440, 0, 392, 0,
    ];

    this.musicTimer = setInterval(() => {
      if (!this.isPlayingMusic || this.isMuted || !this.ctx) return;

      const currentStep = this.step % 16;
      const t = this.ctx.currentTime;

      // 1. Kick on 0, 4, 8, 12 (4-on-the-floor)
      if (currentStep % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(140, t);
        kickOsc.frequency.exponentialRampToValueAtTime(36, t + 0.09);
        kickGain.gain.setValueAtTime(0.35, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        kickOsc.connect(kickGain);
        kickGain.connect(this.musicGain);
        kickOsc.start(t);
        kickOsc.stop(t + 0.13);
      }

      // 2. Snare on 4 and 12
      if (currentStep === 4 || currentStep === 12) {
        const snareNoise = this.ctx.createBufferSource();
        const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.15, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        snareNoise.buffer = buf;

        const snareFilter = this.ctx.createBiquadFilter();
        snareFilter.type = 'highpass';
        snareFilter.frequency.setValueAtTime(1200, t);

        const snareGain = this.ctx.createGain();
        snareGain.gain.setValueAtTime(0.18, t);
        snareGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

        snareNoise.connect(snareFilter);
        snareFilter.connect(snareGain);
        snareGain.connect(this.musicGain);
        snareNoise.start(t);
      }

      // 3. Hi-hat on offbeats (2, 6, 10, 14)
      if (currentStep % 2 !== 0) {
        const hat = this.ctx.createBufferSource();
        const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.05, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
        hat.buffer = buf;

        const hatFilter = this.ctx.createBiquadFilter();
        hatFilter.type = 'highpass';
        hatFilter.frequency.setValueAtTime(7000, t);

        const hatGain = this.ctx.createGain();
        hatGain.gain.setValueAtTime(0.06, t);
        hatGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

        hat.connect(hatFilter);
        hatFilter.connect(hatGain);
        hatGain.connect(this.musicGain);
        hat.start(t);
      }

      // 4. Synth Rolling Bassline (every 16th note)
      const bassFreq = bassNotes[currentStep];
      if (bassFreq) {
        const bassOsc = this.ctx.createOscillator();
        const bassFilter = this.ctx.createBiquadFilter();
        const bassGain = this.ctx.createGain();

        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(bassFreq, t);

        bassFilter.type = 'lowpass';
        bassFilter.frequency.setValueAtTime(450, t);
        bassFilter.Q.value = 4;

        bassGain.gain.setValueAtTime(0.14, t);
        bassGain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);

        bassOsc.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(this.musicGain);

        bassOsc.start(t);
        bassOsc.stop(t + 0.1);
      }

      // 5. Synth Lead Arpeggio
      const leadFreq = leadMelody[currentStep];
      if (leadFreq && (this.step % 32 >= 16)) { // enters every other bar
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();

        leadOsc.type = 'square';
        leadOsc.frequency.setValueAtTime(leadFreq, t);

        leadGain.gain.setValueAtTime(0.05, t);
        leadGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        leadOsc.connect(leadGain);
        leadGain.connect(this.musicGain);

        leadOsc.start(t);
        leadOsc.stop(t + 0.13);
      }

      this.step++;
    }, stepInterval);
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  destroy() {
    this.stopMusic();
    this.stopContinuousLoops();
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {}
      this.ctx = null;
    }
  }
}

export const subwayAudio = new SubwaySurgeAudioEngine();
