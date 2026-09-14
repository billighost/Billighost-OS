import { useState, useRef, useEffect, useCallback } from 'react';
import { NotificationService } from '../services/notificationService';
import { importFile, LIBRARY, ACCEPT, urlForPath, revokeUrl } from '../services/storage/fileImport';
import styles from './AudioPlayerApp.module.css';

const SYNTH_PRESETS = [
  {
    id: 'chillwave',
    name: 'Chillwave Dusk',
    artist: 'Procedural Ambient Engine',
    desc: 'Lush Minor 9th analog synth chords with tape drift',
    freqs: [130.81, 155.56, 196.00, 233.08, 293.66], // C3, Eb3, G3, Bb3, D4
    types: ['sine', 'triangle', 'sine', 'triangle', 'sine'],
    lfoSpeed: 0.25,
    lfoDepth: 3.5,
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Noir',
    artist: 'Dark Synth Bassline',
    desc: 'Deep pulsing sawtooth bass drone with detuned fifths',
    freqs: [87.31, 130.81, 174.61, 207.65], // F2, C3, F3, G#3
    types: ['sawtooth', 'sawtooth', 'triangle', 'sawtooth'],
    lfoSpeed: 0.8,
    lfoDepth: 6.0,
  },
  {
    id: 'lofi',
    name: 'Lo-Fi Sunset Rain',
    artist: 'Analog Electric Keys',
    desc: 'Mellow warm electric piano triad with vinyl flutter',
    freqs: [138.59, 174.61, 207.65, 261.63], // Db3, F3, Ab3, C4
    types: ['triangle', 'sine', 'triangle', 'sine'],
    lfoSpeed: 0.15,
    lfoDepth: 2.0,
  },
  {
    id: 'cosmic',
    name: 'Cosmic Meditation',
    artist: 'Deep Delta Binaural',
    desc: 'Sub-bass resonance with 4Hz binaural beat offset',
    freqs: [64.00, 68.00, 128.00, 192.00], // 64Hz & 68Hz binaural delta
    types: ['sine', 'sine', 'sine', 'sine'],
    lfoSpeed: 0.08,
    lfoDepth: 1.2,
  },
];

/**
 * Synthesises a reverb impulse response: exponentially-decaying stereo noise.
 *
 * Convolving against this yields a diffuse tail (a room) rather than the
 * discrete repeats a feedback delay line produces (an echo). The two channels
 * use independent noise so the tail has genuine stereo width.
 */
function buildImpulseResponse(ctx, seconds = 1.9, decay = 2.6) {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * seconds));
  const buffer = ctx.createBuffer(2, length, rate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const envelope = Math.pow(1 - i / length, decay);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
  }
  return buffer;
}

const VISUALIZER_MODES = [
  { id: 'spectrum', name: 'Spectrum Bars' },
  { id: 'waveform', name: 'Oscilloscope' },
  { id: 'radar', name: 'Circular Radar' },
  { id: 'particles', name: 'Sound Particles' },
];

export default function AudioPlayerApp({ playClick = () => {}, filePath = null }) {
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPresetIndex, setCurrentPresetIndex] = useState(0);
  const [trackTitle, setTrackTitle] = useState('AETHER DRIFT');
  const [trackArtist, setTrackArtist] = useState('CELESTIAL ECHO');
  const [volume, setVolume] = useState(85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isLooping, setIsLooping] = useState(true);
  const [isShuffle, setIsShuffle] = useState(false);

  // Equalizer states (-12 to +12 dB) - Matching Mockup: Bass +4dB, Mid +2dB, Treble +3dB
  const [eqBass, setEqBass] = useState(4);
  const [eqMid, setEqMid] = useState(2);
  const [eqTreble, setEqTreble] = useState(3);
  const [spatialReverb, setSpatialReverb] = useState(true);

  // Visualizer mode
  const [visualizerMode, setVisualizerMode] = useState('hifi');

  // Timers and progress - Matching Mockup: 2:38 / 5:12, 34m rem.
  const [currentTime, setCurrentTime] = useState(158); // 2:38
  const [duration, setDuration] = useState(312); // 5:12
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState(34);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState(34 * 60);

  // UI Tabs
  const [activeTab, setActiveTab] = useState('library'); // 'library' | 'synth' | 'playlists'


  // User uploaded track
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState(null);

  // Audio nodes and refs
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);
  const analyserRef = useRef(null);
  const bassFilterRef = useRef(null);
  const midFilterRef = useRef(null);
  const trebleFilterRef = useRef(null);
  const convolverRef = useRef(null);
  const wetGainRef = useRef(null);
  const dryGainRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const objectUrlRef = useRef(null);

  /*
   * Mirror of the audio parameters.
   *
   * initAudio must stay dependency-free (rebuilding the graph on a volume
   * change would restart playback), but it still needs the current values
   * when it constructs the nodes. A ref gives it those without becoming a
   * dependency.
   */
  const paramsRef = useRef({ volume: 75, isMuted: false, eqBass: 2, eqMid: 0, eqTreble: 3, spatialReverb: true });
  // Read by the file loader's `onended`, which must not re-run per toggle.
  const isLoopingRef = useRef(true);

  const audioElementRef = useRef(null);
  const synthOscsRef = useRef([]);
  const animFrameRef = useRef(null);
  const particlesRef = useRef([]);

  /**
   * Builds the audio graph once, with neutral defaults.
   *
   * Deliberately has NO state in its dependency list: a graph that is torn
   * down and rebuilt whenever the volume slider moves would restart playback.
   * Live parameter values are pushed to the nodes by the sync effect below.
   *
   *   source ─┬─ bass ─ mid ─ treble ─┬─ dryGain ─┐
   *           |                       └─ convolver ─ wetGain ─┤
   *                                                            ├─ master ─ analyser ─ dest
   */
  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return;

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.85;
    analyserRef.current = analyser;

    const masterGain = ctx.createGain();
    /*
     * Seed with the live values, not 0/neutral.
     *
     * The parameter-sync effect below only fires when its dependencies
     * CHANGE. A graph built at gain 0 therefore stayed silent until the
     * volume slider was touched — audio was playing inaudibly, which is
     * exactly the "I import a song and hear nothing until I tweak the
     * volume" symptom. Reading from refs keeps initAudio dependency-free.
     */
    masterGain.gain.value = paramsRef.current.isMuted ? 0 : paramsRef.current.volume / 100;
    gainNodeRef.current = masterGain;

    // 3-Band EQ
    const bass = ctx.createBiquadFilter();
    bass.type = 'lowshelf';
    bass.frequency.value = 250;
    bass.gain.value = paramsRef.current.eqBass;
    bassFilterRef.current = bass;

    const mid = ctx.createBiquadFilter();
    mid.type = 'peaking';
    mid.frequency.value = 1000;
    mid.Q.value = 1.0;
    mid.gain.value = paramsRef.current.eqMid;
    midFilterRef.current = mid;

    const treble = ctx.createBiquadFilter();
    treble.type = 'highshelf';
    treble.frequency.value = 3500;
    treble.gain.value = paramsRef.current.eqTreble;
    trebleFilterRef.current = treble;

    /*
     * Reverb is a convolver fed a synthesised impulse response, NOT a delay
     * line with feedback. A 0.16s delay at 0.35 feedback is audible as
     * discrete repeats — it sounds like a second copy of the track. A decaying
     * noise IR is diffuse: a room, with no distinguishable echo.
     */
    const convolver = ctx.createConvolver();
    convolver.buffer = buildImpulseResponse(ctx, 1.9, 2.6);
    convolverRef.current = convolver;

    // Parallel wet/dry so the mix is controllable and never doubles at unity.
    const dryGain = ctx.createGain();
    dryGain.gain.value = paramsRef.current.spatialReverb ? 0.88 : 1;
    dryGainRef.current = dryGain;

    const wetGain = ctx.createGain();
    wetGain.gain.value = paramsRef.current.spatialReverb ? 0.24 : 0;
    wetGainRef.current = wetGain;

    bass.connect(mid);
    mid.connect(treble);

    treble.connect(dryGain);
    dryGain.connect(masterGain);

    treble.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(masterGain);

    masterGain.connect(analyser);
    analyser.connect(ctx.destination);
  }, []);

  /* Push live parameter values onto the graph. One owner for node state. */
  useEffect(() => {
    paramsRef.current = { volume, isMuted, eqBass, eqMid, eqTreble, spatialReverb };
    isLoopingRef.current = isLooping;

    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const ramp = (param, value) => {
      param.cancelScheduledValues(now);
      param.setTargetAtTime(value, now, 0.015);
    };

    if (gainNodeRef.current) ramp(gainNodeRef.current.gain, isMuted ? 0 : volume / 100);
    if (bassFilterRef.current) ramp(bassFilterRef.current.gain, eqBass);
    if (midFilterRef.current) ramp(midFilterRef.current.gain, eqMid);
    if (trebleFilterRef.current) ramp(trebleFilterRef.current.gain, eqTreble);

    // Wet stays low: a subtle sense of space, never a second voice.
    if (wetGainRef.current) ramp(wetGainRef.current.gain, spatialReverb ? 0.24 : 0);
    if (dryGainRef.current) ramp(dryGainRef.current.gain, spatialReverb ? 0.88 : 1);
  }, [volume, isMuted, eqBass, eqMid, eqTreble, spatialReverb, isLooping]);

  // Start procedural sound generator
  const startProceduralSynth = useCallback((preset) => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    // Stop existing
    synthOscsRef.current.forEach(node => {
      try { node.stop(); } catch {}
    });
    synthOscsRef.current = [];

    const oscs = [];
    const baseTarget = bassFilterRef.current;

    preset.freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = preset.types[idx] || 'sine';
      osc.frequency.setValueAtTime(freq * playbackSpeed, ctx.currentTime);

      // Subtle LFO drift
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = preset.lfoSpeed + (idx * 0.08);
      lfoGain.gain.value = preset.lfoDepth;
      lfo.connect(osc.detune);
      lfo.start();

      oscGain.gain.setValueAtTime(0.09 / preset.freqs.length, ctx.currentTime);
      osc.connect(oscGain);
      oscGain.connect(baseTarget);
      osc.start();

      oscs.push(osc);
      oscs.push(lfo);
    });

    synthOscsRef.current = oscs;
    setTrackTitle(preset.name);
    setTrackArtist(preset.artist);
    setDuration(180);
    setIsPlaying(true);
  }, [initAudio, playbackSpeed]);

  const stopAudio = useCallback(() => {
    synthOscsRef.current.forEach(osc => {
      try { osc.stop(); } catch { /* already stopped */ }
      try { osc.disconnect(); } catch { /* already detached */ }
    });
    synthOscsRef.current = [];

    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }

    setIsPlaying(false);
  }, []);

  const togglePlay = () => {
    playClick();
    if (isPlaying) {
      stopAudio();
    } else {
      if (uploadedAudioUrl && audioElementRef.current) {
        initAudio();
        if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
        audioElementRef.current.play();
        setIsPlaying(true);
      } else {
        startProceduralSynth(SYNTH_PRESETS[currentPresetIndex]);
      }
    }
  };

  // Next / Previous Track
  const handleNextTrack = useCallback(() => {
    playClick();
    let nextIndex = (currentPresetIndex + 1) % SYNTH_PRESETS.length;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * SYNTH_PRESETS.length);
    }
    setCurrentPresetIndex(nextIndex);
    setCurrentTime(0);
    setUploadedAudioUrl(null);
    if (isPlaying) {
      startProceduralSynth(SYNTH_PRESETS[nextIndex]);
    } else {
      setTrackTitle(SYNTH_PRESETS[nextIndex].name);
      setTrackArtist(SYNTH_PRESETS[nextIndex].artist);
    }
  }, [currentPresetIndex, isShuffle, isPlaying, playClick, startProceduralSynth]);

  const handlePrevTrack = () => {
    playClick();
    const prevIndex = (currentPresetIndex - 1 + SYNTH_PRESETS.length) % SYNTH_PRESETS.length;
    setCurrentPresetIndex(prevIndex);
    setCurrentTime(0);
    setUploadedAudioUrl(null);
    if (isPlaying) {
      startProceduralSynth(SYNTH_PRESETS[prevIndex]);
    } else {
      setTrackTitle(SYNTH_PRESETS[prevIndex].name);
      setTrackArtist(SYNTH_PRESETS[prevIndex].artist);
    }
  };

  // Volume & Mute Update
  const handleVolumeChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    setIsMuted(false);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = val / 100;
    }
  };

  const toggleMute = () => {
    playClick();
    if (isMuted) {
      setIsMuted(false);
      if (gainNodeRef.current) gainNodeRef.current.gain.value = volume / 100;
    } else {
      setIsMuted(true);
      if (gainNodeRef.current) gainNodeRef.current.gain.value = 0;
    }
  };

  // EQ changes
  const handleBassChange = (val) => {
    setEqBass(val);
    if (bassFilterRef.current) bassFilterRef.current.gain.value = val;
  };
  const handleMidChange = (val) => {
    setEqMid(val);
    if (midFilterRef.current) midFilterRef.current.gain.value = val;
  };
  const handleTrebleChange = (val) => {
    setEqTreble(val);
    if (trebleFilterRef.current) trebleFilterRef.current.gain.value = val;
  };
  const resetEq = () => {
    playClick();
    handleBassChange(0);
    handleMidChange(0);
    handleTrebleChange(0);
  };

  // Spatial Reverb Toggle — the parameter-sync effect applies the wet/dry mix.
  const toggleReverb = () => {
    playClick();
    setSpatialReverb(prev => !prev);
  };

  /**
   * Import a track.
   *
   * The file is written into the VFS Music library first, so it can be
   * reopened from File Explorer later instead of disappearing when this
   * window closes.
   */
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playClick();
    e.target.value = '';
    stopAudio();

    let saved = null;
    try {
      saved = await importFile(file, { dir: LIBRARY.audio });
    } catch (err) {
      NotificationService.send({
        title: 'Import Failed',
        message: err?.message || 'Could not import that file.',
        type: 'error',
      });
      return;
    }
    window.dispatchEvent(new CustomEvent('billighost:vfs-update'));

    // Release the previous upload before replacing it, or each new file
    // leaks a blob URL and an orphaned MediaElementSource stays wired in.
    if (mediaSourceRef.current) {
      try { mediaSourceRef.current.disconnect(); } catch { /* already detached */ }
      mediaSourceRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
      audioElementRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const objectUrl = saved.url || URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setUploadedAudioUrl(objectUrl);
    setTrackTitle(file.name.replace(/\.[^/.]+$/, ''));
    setTrackArtist('Music Library');

    initAudio();
    const audioEl = new Audio(objectUrl);
    audioEl.crossOrigin = 'anonymous';
    audioElementRef.current = audioEl;
    audioEl.playbackRate = playbackSpeed;

    const source = audioCtxRef.current.createMediaElementSource(audioEl);
    mediaSourceRef.current = source;
    source.connect(bassFilterRef.current);

    audioEl.onloadedmetadata = () => {
      setDuration(Math.floor(audioEl.duration) || 180);
    };

    audioEl.ontimeupdate = () => {
      setCurrentTime(Math.floor(audioEl.currentTime));
    };

    audioEl.onended = () => {
      if (isLooping) {
        audioEl.currentTime = 0;
        audioEl.play();
      } else {
        handleNextTrack();
      }
    };

    audioEl.play();
    setIsPlaying(true);
    NotificationService.send({
      title: 'Added to Music',
      message: `${file.name} — saved to ${LIBRARY.audio}`,
      type: 'success',
    });
  };

  // Timeline seek
  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSecs = Math.floor(ratio * duration);
    setCurrentTime(targetSecs);

    if (audioElementRef.current) {
      audioElementRef.current.currentTime = targetSecs;
    }
  };

  // Playback speed change
  const handleSpeedChange = (spd) => {
    playClick();
    setPlaybackSpeed(spd);
    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = spd;
    }
    if (isPlaying && !uploadedAudioUrl) {
      startProceduralSynth(SYNTH_PRESETS[currentPresetIndex]);
    }
  };

  /**
   * Open a track handed in from File Explorer or a desktop icon.
   *
   * Without this the window opened but played nothing — the path was passed
   * and then ignored, so the app looked broken while "working".
   */
  useEffect(() => {
    if (!filePath) return;
    let cancelled = false;

    (async () => {
      try {
        const { url, node } = await urlForPath(filePath);
        if (cancelled) {
          revokeUrl(url);
          return;
        }

        stopAudio();
        if (objectUrlRef.current) revokeUrl(objectUrlRef.current);
        objectUrlRef.current = url;

        initAudio();
        const ctx = audioCtxRef.current;
        if (ctx?.state === 'suspended') ctx.resume().catch(() => {});

        // Replace any previous element/source before wiring a new one.
        if (mediaSourceRef.current) {
          try { mediaSourceRef.current.disconnect(); } catch { /* already detached */ }
          mediaSourceRef.current = null;
        }
        if (audioElementRef.current) {
          audioElementRef.current.pause();
          audioElementRef.current.src = '';
        }

        const audioEl = new Audio(url);
        audioElementRef.current = audioEl;
        audioEl.playbackRate = playbackSpeed;

        const source = ctx.createMediaElementSource(audioEl);
        mediaSourceRef.current = source;
        source.connect(bassFilterRef.current);

        audioEl.onloadedmetadata = () => {
          if (!cancelled) setDuration(Math.floor(audioEl.duration) || 180);
        };
        audioEl.ontimeupdate = () => {
          if (!cancelled) setCurrentTime(Math.floor(audioEl.currentTime));
        };
        audioEl.onended = () => {
          if (isLoopingRef.current) {
            audioEl.currentTime = 0;
            audioEl.play().catch(() => {});
          } else {
            setIsPlaying(false);
          }
        };

        setUploadedAudioUrl(url);
        setTrackTitle(node.name.replace(/\.[^/.]+$/, ''));
        setTrackArtist('Music Library');
        setCurrentTime(0);

        await audioEl.play().catch(() => {
          // Autoplay may be blocked; the transport button still works.
        });
        if (!cancelled) setIsPlaying(true);
      } catch (err) {
        NotificationService.send({
          title: 'Could not open track',
          message: err?.message || String(err),
          type: 'error',
        });
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath]);

  // Sleep Timer countdown
  useEffect(() => {
    if (!sleepTimerRemaining || sleepTimerRemaining <= 0) return;
    const interval = setInterval(() => {
      setSleepTimerRemaining(prev => {
        if (!prev || prev <= 1) {
          stopAudio();
          NotificationService.send({
            title: 'Sleep Timer Activated',
            message: 'Music playback smoothly stopped.',
            type: 'info',
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimerRemaining, stopAudio]);

  // Synthetic Timer ticker for procedural audio
  useEffect(() => {
    if (!isPlaying || uploadedAudioUrl) return;
    const timer = setInterval(() => {
      setCurrentTime(t => {
        if (t >= duration) {
          if (isLooping) return 0;
          handleNextTrack();
          return 0;
        }
        return t + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, uploadedAudioUrl, duration, isLooping, handleNextTrack]);

  // Initialize Canvas Visualizer & Particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Initialize floating particles
    if (particlesRef.current.length === 0) {
      const parts = [];
      for (let i = 0; i < 48; i++) {
        parts.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          radius: 1 + Math.random() * 3,
          hue: 180 + Math.random() * 60,
        });
      }
      particlesRef.current = parts;
    }

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      let bufferLength = 32;
      let dataArray = new Uint8Array(bufferLength);
      let timeData = new Uint8Array(bufferLength);

      if (analyserRef.current && isPlaying) {
        bufferLength = analyserRef.current.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        timeData = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        analyserRef.current.getByteTimeDomainData(timeData);
      }

      // MODE 0: DUAL HIFI (OSCILLOSCOPE + SPECTRUM BARS - MOCKUP REALIZATION)
      if (visualizerMode === 'hifi' || !visualizerMode) {
        // 1. Subtle background grid
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let gx = 0; gx < width; gx += 26) {
          ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, height); ctx.stroke();
        }
        for (let gy = 0; gy < height; gy += 22) {
          ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(width, gy); ctx.stroke();
        }

        // 2. Gradient spectrum bars rising from bottom
        const numBars = 36;
        const barWidth = width / numBars;
        for (let i = 0; i < numBars; i++) {
          const rawVal = isPlaying ? (dataArray[i % bufferLength] || 16) : (14 + Math.sin(Date.now() / 380 + i * 0.28) * 12);
          const barHeight = Math.min(height * 0.44, (rawVal / 255) * height * 0.52);
          const x = i * barWidth;

          const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
          gradient.addColorStop(0, '#00f3ff');
          gradient.addColorStop(0.5, '#7eb8ff');
          gradient.addColorStop(1, '#a78bfa');

          ctx.fillStyle = gradient;
          ctx.fillRect(x + 1, height - barHeight, barWidth - 2, barHeight);
        }

        // 3. Glowing neon cyan oscilloscope wave oscillating across
        ctx.save();
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = '#00f3ff';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let wx = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = isPlaying && timeData
            ? (timeData[i] / 128.0)
            : (1.0 + Math.sin(Date.now() / 260 + i * 0.24) * 0.22);
          const wy = (v * (height * 0.42));
          if (i === 0) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
          wx += sliceWidth;
        }
        ctx.stroke();
        ctx.restore();
      }

      // MODE 1: SPECTRUM BARS
      else if (visualizerMode === 'spectrum') {
        const barWidth = (width / bufferLength) * 2;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const rawVal = isPlaying ? dataArray[i] : (10 + Math.sin(Date.now() / 400 + i * 0.3) * 8);
          const barHeight = (rawVal / 255) * height * 0.82;

          const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
          gradient.addColorStop(0, '#00f3ff');
          gradient.addColorStop(0.5, '#7eb8ff');
          gradient.addColorStop(1, '#a78bfa');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);

          // Top peak dot
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, height - barHeight - 2, barWidth - 2, 2);

          x += barWidth;
        }
      }

      // MODE 2: OSCILLOSCOPE WAVEFORM
      else if (visualizerMode === 'waveform') {
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#00f3ff';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = isPlaying ? (dataArray[i] / 128.0) : (1.0 + Math.sin(Date.now() / 300 + i * 0.2) * 0.15);
          const y = (v * height) / 2;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);

          x += sliceWidth;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }


      // MODE 3: CIRCULAR RADAR
      else if (visualizerMode === 'radar') {
        const cx = width / 2;
        const cy = height / 2;
        const baseRadius = Math.min(cx, cy) * 0.55;

        // Concentric radar background rings
        ctx.strokeStyle = 'rgba(126, 184, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius * 0.5, 0, 2 * Math.PI);
        ctx.arc(cx, cy, baseRadius, 0, 2 * Math.PI);
        ctx.stroke();

        // Pulsing audio ring
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#7eb8ff';
        for (let i = 0; i < bufferLength; i++) {
          const angle = (i / bufferLength) * 2 * Math.PI;
          const amp = isPlaying ? (dataArray[i] / 255) * 35 : (Math.sin(Date.now() / 300 + i) * 6);
          const r = baseRadius + amp;
          const px = cx + Math.cos(angle) * r;
          const py = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // MODE 4: SOUND PARTICLES
      else if (visualizerMode === 'particles') {
        let avgAmp = 0;
        if (isPlaying) {
          for (let i = 0; i < bufferLength; i++) avgAmp += dataArray[i];
          avgAmp /= bufferLength;
        } else {
          avgAmp = 15;
        }

        const boost = avgAmp / 25;
        particlesRef.current.forEach(p => {
          p.x += p.vx * (1 + boost * 0.5);
          p.y += p.vy * (1 + boost * 0.5);

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;

          ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, ${0.4 + boost * 0.15})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius + boost * 0.8, 0, 2 * Math.PI);
          ctx.fill();
        });
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, visualizerMode]);

  /**
   * Teardown on unmount — this is what makes closing the window actually
   * stop the music.
   *
   * Web Audio nodes live on the audio rendering thread and hold a reference
   * from the AudioContext, not from React. Unmounting the component removes
   * the UI but leaves oscillators running and the context open, so the track
   * keeps playing with no window to stop it. Everything acquired here must be
   * released explicitly.
   *
   * Runs with an empty dependency list so it fires only on real unmount.
   */
  useEffect(() => {
    return () => {
      // 1. Silence oscillators and LFOs.
      synthOscsRef.current.forEach(node => {
        try { node.stop(); } catch { /* already stopped */ }
        try { node.disconnect(); } catch { /* already detached */ }
      });
      synthOscsRef.current = [];

      // 2. Stop and detach any uploaded media element.
      if (mediaSourceRef.current) {
        try { mediaSourceRef.current.disconnect(); } catch { /* already detached */ }
        mediaSourceRef.current = null;
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
        audioElementRef.current.load();
        audioElementRef.current = null;
      }

      // 3. Release the blob URL.
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      // 4. Halt the visualiser loop.
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      // 5. Close the context, freeing the audio thread and the hardware tap.
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch(() => { /* already closing */ });
      }
      audioCtxRef.current = null;
    };
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.playerContainer} data-testid="audio-player-app">
      <div className={styles.prismaticBorder} />

      {/* ── App Header Bar ── */}
      <header className={styles.appHeaderBar}>
        <div className={styles.brandStream}>
          <div className={styles.waveLogoBars}>
            <span className={styles.waveBar} style={{ height: '12px' }} />
            <span className={styles.waveBar} style={{ height: '18px' }} />
            <span className={styles.waveBar} style={{ height: '10px' }} />
            <span className={styles.waveBar} style={{ height: '15px' }} />
          </div>
          <span>SPECTRAL STREAM</span>
        </div>

        <nav className={styles.navCapsulePill} aria-label="Audio player navigation">
          {[
            { id: 'library', label: 'Library' },
            { id: 'synth', label: 'Synth' },
            { id: 'playlists', label: 'Playlists' },
          ].map(tab => (
            <button
              key={tab.id}
              className={`${styles.navPillBtn} ${activeTab === tab.id ? styles.navPillBtnActive : ''}`}
              onClick={() => { playClick(); setActiveTab(tab.id); }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className={styles.headerActions}>
          <button className={styles.headerIconBtn} title="Audio Settings">⚙</button>
          <button className={styles.headerIconBtn} title="Menu">☰</button>
        </div>
      </header>

      {/* ── Main Integrated Hi-Fi Stage (Matching Mockup) ── */}
      {activeTab === 'library' && (
        <main className={styles.hifiMainStage}>
          {/* Left: 3-Band Equalizer Floating Glass Card */}
          <section className={styles.eqCard} aria-label="3-band Equalizer">
            <div className={styles.eqTitle}>3-band Equalizer</div>
            <div className={styles.eqSlidersRow}>
              {/* Bass */}
              <div className={styles.eqFaderColumn}>
                <span className={styles.eqDbValue}>{eqBass >= 0 ? `+${eqBass}` : eqBass}dB</span>
                <div className={styles.verticalFaderTrack}>
                  <div className={styles.verticalFaderFill} style={{ height: `${((eqBass + 12) / 24) * 100}%` }} />
                  <div className={styles.faderThumb} style={{ bottom: `${Math.max(0, Math.min(88, ((eqBass + 12) / 24) * 100))}%` }} />
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    value={eqBass}
                    onChange={(e) => handleBassChange(parseInt(e.target.value, 10))}
                    className={styles.verticalFaderRange}
                    title={`Bass: ${eqBass}dB`}
                  />
                </div>
                <span className={styles.eqBandLabel}>Bass</span>
              </div>

              {/* Mid */}
              <div className={styles.eqFaderColumn}>
                <span className={styles.eqDbValue}>{eqMid >= 0 ? `+${eqMid}` : eqMid}dB</span>
                <div className={styles.verticalFaderTrack}>
                  <div className={styles.verticalFaderFill} style={{ height: `${((eqMid + 12) / 24) * 100}%` }} />
                  <div className={styles.faderThumb} style={{ bottom: `${Math.max(0, Math.min(88, ((eqMid + 12) / 24) * 100))}%` }} />
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    value={eqMid}
                    onChange={(e) => handleMidChange(parseInt(e.target.value, 10))}
                    className={styles.verticalFaderRange}
                    title={`Mid: ${eqMid}dB`}
                  />
                </div>
                <span className={styles.eqBandLabel}>Mid</span>
              </div>

              {/* Treble */}
              <div className={styles.eqFaderColumn}>
                <span className={styles.eqDbValue}>{eqTreble >= 0 ? `+${eqTreble}` : eqTreble}dB</span>
                <div className={styles.verticalFaderTrack}>
                  <div className={styles.verticalFaderFill} style={{ height: `${((eqTreble + 12) / 24) * 100}%` }} />
                  <div className={styles.faderThumb} style={{ bottom: `${Math.max(0, Math.min(88, ((eqTreble + 12) / 24) * 100))}%` }} />
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    value={eqTreble}
                    onChange={(e) => handleTrebleChange(parseInt(e.target.value, 10))}
                    className={styles.verticalFaderRange}
                    title={`Treble: ${eqTreble}dB`}
                  />
                </div>
                <span className={styles.eqBandLabel}>Treble</span>
              </div>
            </div>
          </section>

          {/* Center: Track Header, Canvas Visualizer & Seek Bar */}
          <section className={styles.centerConsoleStage}>
            <div className={styles.trackHeader}>
              <h2 className={styles.mainTrackTitle}>{trackTitle}</h2>
              <span className={styles.mainTrackArtist}>{trackArtist}</span>
            </div>

            <div className={styles.visualizerContainer}>
              <canvas ref={canvasRef} width={440} height={130} className={styles.visualizerCanvas} />
            </div>

            <div className={styles.seekBarRow}>
              <span className={styles.timeText}>{formatTime(currentTime)}</span>
              <div className={styles.seekTrack} onClick={handleSeek} title="Click to seek">
                <div className={styles.seekFill} style={{ width: `${(currentTime / Math.max(1, duration)) * 100}%` }} />
                <div className={styles.seekKnob} style={{ left: `${(currentTime / Math.max(1, duration)) * 100}%` }} />
              </div>
              <span className={`${styles.timeText} ${styles.timeTextRight}`}>/ {formatTime(duration)}</span>
            </div>
          </section>

          {/* Right: 3D Realistic Spinning Vinyl Record Disc */}
          <section className={styles.vinylStageUnit} aria-label="Turntable Disc">
            <div className={`${styles.vinylDisc} ${isPlaying ? styles.vinylSpinning : ''}`}>
              <div className={styles.vinylGleam} />
              <div className={styles.vinylCenterLabel}>
                <div className={styles.vinylSpindleHole} />
              </div>
            </div>
          </section>
        </main>
      )}

      {/* ── Secondary Vault Tab (Synth Presets) ── */}
      {activeTab === 'synth' && (
        <div className={styles.vaultTabContent}>
          {SYNTH_PRESETS.map((preset, idx) => (
            <div
              key={preset.id}
              className={`${styles.presetCard} ${currentPresetIndex === idx && !uploadedAudioUrl ? styles.presetCardActive : ''}`}
              onClick={() => {
                playClick();
                setCurrentPresetIndex(idx);
                setTrackTitle(preset.name.toUpperCase());
                setTrackArtist(preset.artist.toUpperCase());
                setUploadedAudioUrl(null);
                startProceduralSynth(preset);
                setActiveTab('library');
              }}
            >
              <div className={styles.presetCardTitle}>{preset.name}</div>
              <div className={styles.presetCardArtist}>{preset.artist}</div>
              <div className={styles.presetCardDesc}>{preset.desc}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Secondary Playlist Tab ── */}
      {activeTab === 'playlists' && (
        <div className={styles.vaultTabContent} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 460, margin: '0 auto' }}>
          <label className={styles.presetCard} style={{ textAlign: 'center', cursor: 'pointer', padding: 24 }}>
            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: 8 }}>📁</span>
            <div className={styles.presetCardTitle}>Import Audio Track</div>
            <div className={styles.presetCardDesc}>Upload an MP3, WAV, or OGG file from your computer</div>
            <input
              type="file"
              accept={ACCEPT.audio}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
          <div className={styles.presetCard} onClick={() => { setActiveTab('library'); }}>
            <div className={styles.presetCardTitle}>Current Queue</div>
            <div className={styles.presetCardArtist}>{trackTitle} — {trackArtist}</div>
          </div>
        </div>
      )}

      {/* ── Bottom Floating Transport Console (Matching Mockup) ── */}
      <footer className={styles.bottomTransportHub}>
        <div className={styles.floatingConsolePill}>
          <button
            className={`${styles.transportBtn} ${isShuffle ? styles.shuffleActive : ''}`}
            onClick={() => { playClick(); setIsShuffle(!isShuffle); }}
            title="Shuffle"
          >
            🔀
          </button>
          <button
            className={styles.transportBtn}
            onClick={handlePrevTrack}
            title="Previous Track"
          >
            ⏮
          </button>
          <button
            className={styles.bigPlayCircle}
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
            data-testid="audio-play-btn"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            className={styles.transportBtn}
            onClick={handleNextTrack}
            title="Next Track"
          >
            ⏭
          </button>
          <button
            className={`${styles.transportBtn} ${isLooping ? styles.loopActive : ''}`}
            onClick={() => { playClick(); setIsLooping(!isLooping); }}
            title="Loop"
          >
            🔁
          </button>
        </div>

        {/* Volume & Sleep Timer Controls */}
        <div className={styles.bottomRightControls}>
          <div className={styles.volumeGroup} title={`Volume: ${volume}%`}>
            <div
              className={styles.volumeTrackVertical}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                const pct = Math.max(0, Math.min(100, Math.round((1 - y / rect.height) * 100)));
                handleVolumeChange({ target: { value: pct } });
              }}
            >
              <div className={styles.volumeFillVertical} style={{ height: `${volume}%` }} />
            </div>
            <span className={styles.volumePercentText}>{volume}%</span>
          </div>

          <div
            className={styles.sleepTimerBadge}
            onClick={() => {
              playClick();
              if (sleepTimerRemaining > 0) {
                setSleepTimerRemaining(0);
              } else {
                setSleepTimerRemaining(34 * 60);
              }
            }}
            title="Sleep Timer"
          >
            <span>🕒</span>
            <span>{sleepTimerRemaining > 0 ? `${Math.ceil(sleepTimerRemaining / 60)}m rem.` : 'Off'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

