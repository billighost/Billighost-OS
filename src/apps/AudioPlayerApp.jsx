import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './AudioPlayerApp.module.css';

export default function AudioPlayerApp({ playClick = () => {} }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackName, setTrackName] = useState('Billighost Ambient Synth (Procedural)');
  const [volume, setVolume] = useState(70);
  const [duration, setDuration] = useState(120);
  const [currentTime, setCurrentTime] = useState(0);

  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const synthOscsRef = useRef([]);

  // Setup Web Audio Context and procedural ambient synth generator
  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return;

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyserRef.current = analyser;

    const gain = ctx.createGain();
    gain.gain.value = volume / 100;
    gainNodeRef.current = gain;

    gain.connect(analyser);
    analyser.connect(ctx.destination);
  }, [volume]);

  // Start procedural chillwave ambient synth chords
  const startProceduralSynth = () => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    // Minor 9th chord frequencies: C3, Eb3, G3, Bb3, D4
    const freqs = [130.81, 155.56, 196.00, 233.08, 293.66];
    const oscs = [];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Gentle LFO detune
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.2 + idx * 0.1;
      lfoGain.gain.value = 2.5;
      lfo.connect(osc.detune);
      lfo.start();

      oscGain.gain.setValueAtTime(0.08 / freqs.length, ctx.currentTime);
      osc.connect(oscGain);
      oscGain.connect(gainNodeRef.current);
      osc.start();
      oscs.push(osc);
    });

    synthOscsRef.current = oscs;
    setIsPlaying(true);
  };

  const stopProceduralSynth = () => {
    synthOscsRef.current.forEach(osc => {
      try { osc.stop(); } catch {}
    });
    synthOscsRef.current = [];
    setIsPlaying(false);
  };

  const togglePlay = () => {
    playClick();
    if (isPlaying) {
      stopProceduralSynth();
    } else {
      startProceduralSynth();
    }
  };

  // Canvas visualizer render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (analyserRef.current && isPlaying) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        const barWidth = (width / bufferLength) * 1.8;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height * 0.85;

          const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
          gradient.addColorStop(0, '#34d399');
          gradient.addColorStop(0.5, '#7eb8ff');
          gradient.addColorStop(1, '#a78bfa');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
          x += barWidth;
        }
      } else {
        // Idle ambient subtle wave
        ctx.fillStyle = 'rgba(126, 184, 255, 0.15)';
        for (let i = 0; i < 24; i++) {
          const h = 4 + Math.sin(Date.now() / 400 + i * 0.5) * 3;
          ctx.fillRect(i * 12 + 10, height - h, 8, h);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  // Handle user uploaded audio file
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playClick();
    stopProceduralSynth();

    const objectUrl = URL.createObjectURL(file);
    const audioEl = new Audio(objectUrl);
    setTrackName(file.name);

    initAudio();
    const source = audioCtxRef.current.createMediaElementSource(audioEl);
    source.connect(gainNodeRef.current);

    audioEl.play();
    setIsPlaying(true);

    audioEl.onended = () => setIsPlaying(false);
  };

  const handleVolumeChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = val / 100;
    }
  };

  // Timer ticker
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentTime(t => (t >= duration ? 0 : t + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, duration]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.playerContainer}>
      {/* Visualizer Canvas Area */}
      <div className={styles.visualizerArea}>
        <canvas ref={canvasRef} width={400} height={140} className={styles.canvas} />
        <div className={styles.trackOverlay}>
          <div className={styles.trackTitle}>{trackName}</div>
          <div className={styles.trackArtist}>Billighost High-Fidelity Audio Engine</div>
        </div>
      </div>

      {/* Progress Scrubber */}
      <div className={styles.progressRow}>
        <span className={styles.timeLabel}>{formatTime(currentTime)}</span>
        <div className={styles.progressBarTrack}>
          <div
            className={styles.progressBarFill}
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
        <span className={styles.timeLabel}>{formatTime(duration)}</span>
      </div>

      {/* Playback Controls */}
      <div className={styles.controlsRow}>
        <label className={styles.uploadLabel} title="Import audio file (.mp3, .wav)">
          📁 Import
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </label>

        <div className={styles.centerControls}>
          <button className={styles.circleBtn} onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? '⏸' : '▶'}
          </button>
        </div>

        <div className={styles.volumeControl}>
          <span className={styles.volumeIcon}>🔊</span>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolumeChange}
            className={styles.volumeSlider}
          />
        </div>
      </div>
    </div>
  );
}
