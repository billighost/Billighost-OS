/**
 * Aetheria 3D — Procedural Open World Web Audio Engine
 * Pure procedural audio synthesis using Web Audio API:
 * - Ambient Nature Soundscape (wind, chirps, night crickets, stream)
 * - Dynamic War Drums & Combat Music that ramps up when engaging enemies
 * - Combat Sound Effects: Sword slashes, parry clangs, magic blasts, golem stomps
 */

class AetheriaAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.ambientGain = null;
    this.battleGain = null;
    this.sfxGain = null;

    this.isMuted = false;
    this.inCombat = false;
    this.battleTimer = null;
    this.battleStep = 0;

    // Ambient nature noise nodes
    this.windNode = null;
    this.windGain = null;
    this.ambientTimer = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      this.battleGain = this.ctx.createGain();
      this.battleGain.gain.setValueAtTime(0.0, this.ctx.currentTime); // Fades in during combat
      this.battleGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.startAmbientLoop();
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
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.75, this.ctx.currentTime);
    }
  }

  setCombatState(active) {
    if (this.inCombat === active) return;
    this.inCombat = active;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    if (active) {
      // Fade in battle music, slightly duck ambient
      this.battleGain?.gain.setTargetAtTime(0.48, t, 0.4);
      this.ambientGain?.gain.setTargetAtTime(0.18, t, 0.4);
      if (!this.battleTimer) {
        this.startBattleRhythm();
      }
    } else {
      // Fade out battle music, restore ambient
      this.battleGain?.gain.setTargetAtTime(0.0, t, 1.2);
      this.ambientGain?.gain.setTargetAtTime(0.35, t, 1.2);
      setTimeout(() => {
        if (!this.inCombat) {
          this.stopBattleRhythm();
        }
      }, 1500);
    }
  }

  // --- AMBIENT SOUND GENERATOR ---

  startAmbientLoop() {
    if (!this.ctx || this.windNode) return;

    // Pink/Brown noise for gentle rustling wind
    const bufSize = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 2.5;
    }

    this.windNode = this.ctx.createBufferSource();
    this.windNode.buffer = buf;
    this.windNode.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.15, this.ctx.currentTime);

    this.windNode.connect(filter);
    filter.connect(this.windGain);
    this.windGain.connect(this.ambientGain);

    this.windNode.start();

    // Occasional procedural bird chirp or night sound
    this.ambientTimer = setInterval(() => {
      if (this.isMuted || !this.ctx || this.inCombat) return;
      if (Math.random() > 0.4) {
        this.playBirdChirp();
      }
    }, 4500);
  }

  playBirdChirp() {
    if (!this.ctx || this.isMuted) return;
    const baseFreq = 2200 + Math.random() * 1000;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, t + 0.06);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, t + 0.12);

    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.ambientGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  // --- DYNAMIC COMBAT WAR DRUMS & BASS SEQUENCER ---

  startBattleRhythm() {
    this.battleStep = 0;
    const bpm = 132;
    const stepTime = (60 / bpm) / 4 * 1000; // 16th notes

    this.battleTimer = setInterval(() => {
      if (!this.inCombat || this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const s = this.battleStep % 16;

      // 1. Deep War Drum (Taiko style) on beats 0, 3, 6, 10
      if (s === 0 || s === 3 || s === 6 || s === 10) {
        const drumOsc = this.ctx.createOscillator();
        const drumGain = this.ctx.createGain();
        drumOsc.type = 'sine';
        drumOsc.frequency.setValueAtTime(95, t);
        drumOsc.frequency.exponentialRampToValueAtTime(32, t + 0.18);
        drumGain.gain.setValueAtTime(s === 0 ? 0.45 : 0.3, t);
        drumGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        drumOsc.connect(drumGain);
        drumGain.connect(this.battleGain);
        drumOsc.start(t);
        drumOsc.stop(t + 0.23);
      }

      // 2. War Shaker / Tambourine on 8th notes
      if (s % 2 === 0) {
        const shaker = this.ctx.createBufferSource();
        const b = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.04, this.ctx.sampleRate);
        const d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.3;
        shaker.buffer = b;

        const flt = this.ctx.createBiquadFilter();
        flt.type = 'highpass';
        flt.frequency.setValueAtTime(5000, t);

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

        shaker.connect(flt);
        flt.connect(g);
        g.connect(this.battleGain);
        shaker.start(t);
      }

      // 3. Driving Tribal Bass (Sawtooth with lowpass filter)
      const bassNotes = [55, 55, 65.4, 55, 73.4, 55, 65.4, 49];
      const noteFreq = bassNotes[Math.floor(s / 2)];
      if (s % 2 === 0 && noteFreq) {
        const bassOsc = this.ctx.createOscillator();
        const bassFlt = this.ctx.createBiquadFilter();
        const bassGain = this.ctx.createGain();

        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(noteFreq, t);

        bassFlt.type = 'lowpass';
        bassFlt.frequency.setValueAtTime(380, t);
        bassFlt.Q.value = 3;

        bassGain.gain.setValueAtTime(0.18, t);
        bassGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

        bassOsc.connect(bassFlt);
        bassFlt.connect(bassGain);
        bassGain.connect(this.battleGain);
        bassOsc.start(t);
        bassOsc.stop(t + 0.13);
      }

      this.battleStep++;
    }, stepTime);
  }

  stopBattleRhythm() {
    if (this.battleTimer) {
      clearInterval(this.battleTimer);
      this.battleTimer = null;
    }
  }

  // --- COMBAT & PLAYER SOUND EFFECTS ---

  playSlash(comboStep = 1) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    const baseFreq = comboStep === 3 ? 420 : comboStep === 2 ? 340 : 280;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq * 2.2, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, t + 0.16);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950, t);
    filter.Q.value = 3;

    gain.gain.setValueAtTime(comboStep === 3 ? 0.45 : 0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.19);
  }

  playBlock() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    // Metallic shield clang (two square waves at inharmonic frequencies)
    const freqs = [840, 1180];
    const t = this.ctx.currentTime;

    freqs.forEach(f => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.9, t + 0.18);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.23);
    });
  }

  playMagicBlast() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(1400, t + 0.12);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.25);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.29);
  }

  playEnemyHit() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.14);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.17);
  }

  playGolemStomp() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(24, t + 0.55);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.62);
  }

  playChestOpen() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C Major arpeggio
    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  playLevelUp() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.07;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  playHeal() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.35);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  destroy() {
    this.stopBattleRhythm();
    if (this.ambientTimer) clearInterval(this.ambientTimer);
    if (this.windNode) {
      try { this.windNode.stop(); } catch {}
      this.windNode = null;
    }
    if (this.ctx) {
      try { this.ctx.close(); } catch {}
      this.ctx = null;
    }
  }
}

export const aetheriaAudio = new AetheriaAudioEngine();
