/**
 * VoidStrike 3D — Procedural Web Audio Engine
 * Zero external audio assets, zero latency, pure procedural Web Audio API.
 *
 * Features:
 * - Alternating twin plasma cannon blaster bolts
 * - Homing photon torpedo launch whoosh + thruster fizz
 * - Pulsed target lock-on warning alarm (beeping cadence speeding up to lock)
 * - Layered explosive flak and capital ship destruction rumbles
 * - Dynamic continuous engine thruster roar scaling with ship velocity
 * - Resonant kinetic shield deflection clangs
 * - Deep-space synthwave ambient soundtrack
 */

class VoidStrikeAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.musicGain = null;
    this.sfxGain = null;
    this.thrusterNode = null;
    this.thrusterGain = null;
    this.lockOsc = null;
    this.lockGain = null;
    this.isMusicPlaying = false;
    this.musicTimer = null;
    this.currentSpeed = 0;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        // Master SFX Bus
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        this.sfxGain.connect(this.ctx.destination);

        // Master Music Bus
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        this.musicGain.connect(this.ctx.destination);

        // Setup Continuous Engine Thruster Noise
        this.setupThrusterAudio();
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

  updateEnginePitch(throttleRatio, isBoosting) {
    if (!this.ctx || this.isMuted || !this.thrusterFilter || !this.thrusterGain) return;
    const now = this.ctx.currentTime;
    const targetFreq = isBoosting ? 480 : 90 + throttleRatio * 220;
    const targetGain = isBoosting ? 0.35 : 0.04 + throttleRatio * 0.14;

    this.thrusterFilter.frequency.setTargetAtTime(targetFreq, now, 0.08);
    this.thrusterGain.gain.setTargetAtTime(targetGain, now, 0.08);
  }

  // --- WEAPONS SFX ---

  playLaser(isRightWing = false) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner?.();

    osc.type = 'sawtooth';
    const baseFreq = isRightWing ? 780 : 820;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.14);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    if (panner) {
      panner.pan.setValueAtTime(isRightWing ? 0.35 : -0.35, now);
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      osc.connect(gain);
      gain.connect(this.sfxGain);
    }

    osc.start(now);
    osc.stop(now + 0.15);
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
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.45);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.46);

    // High hiss
    const noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.3, this.ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.3));

    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(800, now + 0.3);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

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
    osc.frequency.setValueAtTime(isLocked ? 1320 : 880, now);

    const dur = isLocked ? 0.2 : 0.06;
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.setValueAtTime(0.12, now + dur * 0.8);
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
    const dur = isLarge ? 1.4 : 0.65;

    // Noise rumble
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isLarge ? 400 : 800, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isLarge ? 0.6 : 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);

    // Sub thump
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isLarge ? 90 : 130, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + dur * 0.6);

    oscGain.gain.setValueAtTime(isLarge ? 0.5 : 0.3, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.6);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + dur * 0.65);
  }

  playShieldHit() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.18);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  playBarrelRoll() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.25);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.5);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  playVictory() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.14;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.42);
    });
  }

  // --- AMBIENT SYNTH MUSIC ---

  startBGM() {
    if (this.isMusicPlaying) return;
    this.ensureContext();
    if (!this.ctx) return;
    this.isMusicPlaying = true;

    // Ambient space progression: D minor (D3, F3, A3, C4)
    const chords = [
      [146.83, 220.00, 261.63], // Dm7
      [130.81, 196.00, 246.94], // Cmaj
      [116.54, 174.61, 220.00], // Bbmaj
      [146.83, 220.00, 293.66], // Dm
    ];

    let chordIdx = 0;
    const playNextChord = () => {
      if (!this.isMusicPlaying || !this.ctx) return;

      const now = this.ctx.currentTime;
      const chord = chords[chordIdx];
      chordIdx = (chordIdx + 1) % chords.length;

      chord.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, now);
        filter.frequency.linearRampToValueAtTime(650, now + 2.0);
        filter.frequency.linearRampToValueAtTime(280, now + 4.0);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.045, now + 0.8);
        gain.gain.linearRampToValueAtTime(0.001, now + 4.0);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(now);
        osc.stop(now + 4.2);
      });

      this.musicTimer = setTimeout(playNextChord, 3800);
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
      this.sfxGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, now);
      this.musicGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, now);
    }
    return this.isMuted;
  }

  destroy() {
    this.stopBGM();
    if (this.thrusterNode) {
      try { this.thrusterNode.stop(); } catch {}
      this.thrusterNode = null;
    }
    if (this.ctx) {
      try { this.ctx.close(); } catch {}
      this.ctx = null;
    }
  }
}

export const voidStrikeAudio = new VoidStrikeAudioEngine();
