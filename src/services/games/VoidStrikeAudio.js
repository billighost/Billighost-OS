/**
 * VoidStrike 3D — Procedural Web Audio Engine 2.0 (Billighost OS Edition)
 * Zero external audio assets, zero latency, pure procedural Web Audio API.
 *
 * Features:
 * - Alternating twin plasma cannon blaster bolts with stereo panning
 * - Homing photon torpedo launch whoosh + thruster fizz
 * - Pulsed target lock-on warning alarm (beeping cadence speeding up to lock)
 * - Layered explosive flak and capital ship destruction rumbles
 * - Dynamic continuous engine thruster roar scaling with ship velocity & afterburner
 * - Resonant kinetic shield deflection clangs & hex ripple hum
 * - 3D Billighost Spectral Ghost SFX: ethereal phantom hum, Ghost Surge overdrive, token chimes
 * - Close-Call Near-Miss supersonic whoosh
 * - Dynamic Combo Streak fanfares (x2, x3, x4, x5)
 * - Multi-layer procedural synthwave soundtrack with dynamic combat & boss escalation
 */

class VoidStrikeAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.musicGain = null;
    this.sfxGain = null;
    this.thrusterNode = null;
    this.thrusterGain = null;
    this.thrusterFilter = null;
    this.spectralHumNode = null;
    this.spectralHumGain = null;
    this.isMusicPlaying = false;
    this.musicTimer = null;
    this.combatIntensity = 0; // 0: Cruise, 1: Combat, 2: Boss
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        // Master SFX Bus
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
        this.sfxGain.connect(this.ctx.destination);

        // Master Music Bus
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        this.musicGain.connect(this.ctx.destination);

        // Setup Continuous Engine Thruster Noise
        this.setupThrusterAudio();
        // Setup Continuous Spectral Ghost Surge Hum
        this.setupSpectralHumAudio();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setupThrusterAudio() {
    if (!this.ctx) return;

    // Filtered pink-ish noise buffer for continuous engine hum
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2) * 0.2;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    this.thrusterFilter = this.ctx.createBiquadFilter();
    this.thrusterFilter.type = 'lowpass';
    this.thrusterFilter.frequency.setValueAtTime(120, this.ctx.currentTime);

    this.thrusterGain = this.ctx.createGain();
    this.thrusterGain.gain.setValueAtTime(0.01, this.ctx.currentTime);

    noise.connect(this.thrusterFilter);
    this.thrusterFilter.connect(this.thrusterGain);
    this.thrusterGain.connect(this.sfxGain);

    noise.start();
    this.thrusterNode = noise;
  }

  setupSpectralHumAudio() {
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    this.spectralHumGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(432, this.ctx.currentTime);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(864, this.ctx.currentTime);
    filter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    this.spectralHumGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    osc.connect(filter);
    filter.connect(this.spectralHumGain);
    this.spectralHumGain.connect(this.sfxGain);

    osc.start();
    this.spectralHumNode = osc;
  }

  setSpectralHumActive(active) {
    if (!this.ctx || !this.spectralHumGain) return;
    const now = this.ctx.currentTime;
    const targetGain = active ? 0.22 : 0.0001;
    this.spectralHumGain.gain.setTargetAtTime(targetGain, now, 0.1);
  }

  updateEnginePitch(throttleRatio, isBoosting) {
    if (!this.ctx || this.isMuted || !this.thrusterFilter || !this.thrusterGain) return;
    const now = this.ctx.currentTime;
    const targetFreq = isBoosting ? 520 : 95 + throttleRatio * 240;
    const targetGain = isBoosting ? 0.38 : 0.04 + throttleRatio * 0.16;

    this.thrusterFilter.frequency.setTargetAtTime(targetFreq, now, 0.08);
    this.thrusterGain.gain.setTargetAtTime(targetGain, now, 0.08);
  }

  setCombatIntensity(level) {
    // 0: Cruise, 1: Combat, 2: Boss
    this.combatIntensity = level;
  }

  // --- WEAPONS SFX ---

  playLaser(isRightWing = false, laserColor = 0x38bdf8) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    osc.type = 'sawtooth';
    const baseFreq = isRightWing ? 780 : 830;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(105, now + 0.13);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    if (panner) {
      panner.pan.setValueAtTime(isRightWing ? 0.4 : -0.4, now);
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      osc.connect(gain);
      gain.connect(this.sfxGain);
    }

    osc.start(now);
    osc.stop(now + 0.14);
  }

  playTorpedoLaunch() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Sub-bass whoosh
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.48);

    gain.gain.setValueAtTime(0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.49);

    // High rocket ignition fizz
    const noiseBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.35), this.ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.3));

    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2600, now);
    filter.frequency.exponentialRampToValueAtTime(750, now + 0.35);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    noiseSrc.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noiseSrc.start(now);
  }

  playLockOnTone(isLocked = false) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(isLocked ? 1480 : 920, now);

    const dur = isLocked ? 0.22 : 0.055;
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.setValueAtTime(0.14, now + dur * 0.8);
    gain.gain.linearRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + dur);
  }

  // --- IMPACT & EXPLOSIONS ---

  playExplosion(isLarge = false) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const dur = isLarge ? 1.6 : 0.7;

    // Noise rumble
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isLarge ? 380 : 850, now);
    filter.frequency.exponentialRampToValueAtTime(50, now + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isLarge ? 0.65 : 0.38, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);

    // Sub thump
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isLarge ? 85 : 125, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + dur * 0.65);

    oscGain.gain.setValueAtTime(isLarge ? 0.55 : 0.32, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.65);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + dur * 0.7);
  }

  playShieldHit() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1050, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.2);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  playBarrelRoll() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.28);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.55);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.56);
  }

  // --- BILLIGHOST SPECTRAL GHOST SFX ---

  playGhostSpawn() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.3);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.6);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.62);
  }

  playGhostSurgeActivate() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Rising ethereal chord
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq * 0.5, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.6);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.95);
    });

    this.setSpectralHumActive(true);
  }

  playGhostTokenPickup() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.18);
    osc2.frequency.setValueAtTime(1320, now);
    osc2.frequency.exponentialRampToValueAtTime(2640, now + 0.18);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.21);
    osc2.stop(now + 0.21);
  }

  playGhostOrbFire() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1100, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.12);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  // --- POLISH: NEAR MISS & COMBOS ---

  playNearMiss() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.22);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  playComboStreak(multiplier = 2) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const baseFreq = 520 + multiplier * 90;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.22);

    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  playVictory() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
    notes.forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.13;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.48);
    });
  }

  // --- PROCEDURAL SYNTHWAVE BGM 2.0 ---

  startBGM() {
    if (this.isMusicPlaying) return;
    this.ensureContext();
    if (!this.ctx) return;
    this.isMusicPlaying = true;

    // Ambient space progressions: D minor, Bb major, F major, C major
    const chords = [
      [146.83, 220.00, 261.63], // Dm7
      [116.54, 174.61, 220.00], // Bbmaj
      [174.61, 220.00, 261.63], // Fmaj
      [130.81, 196.00, 246.94], // Cmaj
    ];

    let chordIdx = 0;
    const playNextChord = () => {
      if (!this.isMusicPlaying || !this.ctx) return;

      const now = this.ctx.currentTime;
      const chord = chords[chordIdx];
      chordIdx = (chordIdx + 1) % chords.length;

      // 1. Warm lush pad layer
      chord.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        const cutoff = this.combatIntensity === 2 ? 650 : this.combatIntensity === 1 ? 480 : 320;
        filter.frequency.setValueAtTime(cutoff, now);
        filter.frequency.linearRampToValueAtTime(cutoff * 1.6, now + 1.8);
        filter.frequency.linearRampToValueAtTime(cutoff, now + 3.8);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.7);
        gain.gain.linearRampToValueAtTime(0.001, now + 3.8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(now);
        osc.stop(now + 4.0);
      });

      // 2. Dynamic Combat Pulse Bassline (Active during combat & boss)
      if (this.combatIntensity > 0) {
        const rootFreq = chord[0] * 0.5;
        for (let step = 0; step < 4; step++) {
          const stepTime = now + step * 0.9;
          const bassOsc = this.ctx.createOscillator();
          const bassFilter = this.ctx.createBiquadFilter();
          const bassGain = this.ctx.createGain();

          bassOsc.type = 'square';
          bassOsc.frequency.setValueAtTime(rootFreq, stepTime);

          bassFilter.type = 'lowpass';
          bassFilter.frequency.setValueAtTime(220, stepTime);
          bassFilter.exponentialRampToValueAtTime(80, stepTime + 0.4);

          bassGain.gain.setValueAtTime(0.045, stepTime);
          bassGain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.45);

          bassOsc.connect(bassFilter);
          bassFilter.connect(bassGain);
          bassGain.connect(this.musicGain);

          bassOsc.start(stepTime);
          bassOsc.stop(stepTime + 0.48);
        }
      }

      this.musicTimer = setTimeout(playNextChord, 3600);
    };

    playNextChord();
  }

  stopBGM() {
    this.isMusicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.sfxGain && this.musicGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.sfxGain.gain.setValueAtTime(this.isMuted ? 0 : 0.75, now);
      this.musicGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, now);
    }
    return this.isMuted;
  }

  destroy() {
    this.stopBGM();
    this.setSpectralHumActive(false);
    if (this.thrusterNode) {
      try { this.thrusterNode.stop(); } catch {}
      this.thrusterNode = null;
    }
    if (this.spectralHumNode) {
      try { this.spectralHumNode.stop(); } catch {}
      this.spectralHumNode = null;
    }
    if (this.ctx) {
      try { this.ctx.close(); } catch {}
      this.ctx = null;
    }
  }
}

export const voidStrikeAudio = new VoidStrikeAudioEngine();
