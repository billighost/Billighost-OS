import { useState, useEffect, useMemo, useRef } from 'react';
import { useWeather } from '../../hooks/useWeather';
import { useBattery } from '../../hooks/useBattery';
import { useStorageQuota } from '../../hooks/useStorageQuota';
import { LocalSettings } from '../../services/storage/localStorage';
import {
  WidgetsIcon, SunIcon, GearIcon,
  SpeakerIcon, CheckIcon, PlusIcon,
} from '../Icons';
import styles from './WidgetsPanel.module.css';

const DEFAULT_NOTES = [
  { id: 'note-1', text: 'Welcome to Billighost! Right-click anywhere for OS context menus.', color: 'noteCardYellow' },
  { id: 'note-2', text: 'Draw wallpapers in Paint Studio and save directly to Pictures.', color: 'noteCardBlue' },
];

const INITIAL_TASKS = [
  { id: 't-1', text: 'Review Billighost OS telemetry', done: true },
  { id: 't-2', text: 'Explore Code Editor script runner', done: false },
  { id: 't-3', text: 'Test custom taskbar right-click menu', done: false },
];

function getWorldTime(timeZone, offsetHours = 0) {
  try {
    const d = new Date(Date.now() + offsetHours * 3600000);
    return new Intl.DateTimeFormat([], {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return '--:--';
  }
}

export default function WidgetsPanel({
  isOpen,
  onClose,
  onOpenSettings,
  playClick = () => {},
}) {
  const weather = useWeather();
  const battery = useBattery();
  const storage = useStorageQuota();

  const [appearance, setAppearance] = useState(() => LocalSettings.getAppearance());
  const [sound, setSound] = useState(() => LocalSettings.getSound());

  // Real-time Local Clock
  const [localTime, setLocalTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const [localDate, setLocalDate] = useState(() =>
    new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
  );

  // Hardware Telemetry Dynamic Fluctuations
  const [cpuLoad, setCpuLoad] = useState(24);
  const [memUsage, setMemUsage] = useState(3.8);

  // 1. World Clock Slider Offset
  const [timeOffsetHours, setTimeOffsetHours] = useState(0);

  // 2. Crypto & Stock Ticker State
  const [tickers, setTickers] = useState([
    { symbol: 'BTC', name: 'Bitcoin', price: 64280, change: '+3.42%', up: true, points: [40, 45, 42, 52, 58, 64] },
    { symbol: 'ETH', name: 'Ethereum', price: 3490, change: '+1.85%', up: true, points: [30, 32, 28, 33, 34, 35] },
    { symbol: 'SOL', name: 'Solana', price: 154.2, change: '-0.95%', up: false, points: [55, 52, 50, 48, 51, 49] },
    { symbol: 'S&P', name: 'S&P 500', price: 5620, change: '+0.64%', up: true, points: [20, 22, 23, 22, 25, 26] },
  ]);

  // 3. Mini Focus Pomodoro Timer
  const [pomoSeconds, setPomoSeconds] = useState(25 * 60);
  const [pomoActive, setPomoActive] = useState(false);
  const [pomoMode, setPomoMode] = useState('focus'); // 'focus' | 'break'

  // 4. Daily Tasks Checklist
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('billighost_widgets_tasks');
      return saved ? JSON.parse(saved) : INITIAL_TASKS;
    } catch {
      return INITIAL_TASKS;
    }
  });
  const [newTaskInput, setNewTaskInput] = useState('');

  // 5. Sticky Notes State
  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem('billighost_widgets_notes');
      return saved ? JSON.parse(saved) : DEFAULT_NOTES;
    } catch {
      return DEFAULT_NOTES;
    }
  });

  // 6. Mini Audio Player Controller State
  const [miniAudioPlaying, setMiniAudioPlaying] = useState(false);
  const [miniAudioVol, setMiniAudioVol] = useState(75);
  const synthOscRef = useRef([]);
  const audioCtxRef = useRef(null);

  // Sync settings listeners
  useEffect(() => {
    const handleApp = (e) => setAppearance(e.detail);
    const handleSnd = (e) => setSound(e.detail);
    window.addEventListener('billighost:appearance-change', handleApp);
    window.addEventListener('billighost:sound-change', handleSnd);
    return () => {
      window.removeEventListener('billighost:appearance-change', handleApp);
      window.removeEventListener('billighost:sound-change', handleSnd);
    };
  }, []);

  // Clocks & CPU load interval
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setLocalTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setLocalDate(new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }));

      // Subtle dynamic fluctuation in CPU & memory load
      setCpuLoad(prev => {
        const delta = Math.floor(Math.random() * 9) - 4;
        return Math.min(85, Math.max(12, prev + delta));
      });
      setMemUsage(prev => {
        const delta = (Math.random() * 0.1 - 0.05);
        return Math.min(7.2, Math.max(2.4, Math.round((prev + delta) * 10) / 10));
      });

      // Ticker subtle fluctuation
      setTickers(prev =>
        prev.map(t => {
          const jitter = (Math.random() * 0.4 - 0.2) * (t.price * 0.002);
          const newPrice = Math.round((t.price + jitter) * 100) / 100;
          return { ...t, price: newPrice };
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // Pomodoro countdown ticker
  useEffect(() => {
    if (!pomoActive) return;
    const interval = setInterval(() => {
      setPomoSeconds(s => {
        if (s <= 1) {
          setPomoActive(false);
          window.dispatchEvent(new CustomEvent('billighost:play-sound', { detail: 'chime' }));
          return pomoMode === 'focus' ? 5 * 60 : 25 * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pomoActive, pomoMode]);

  // Mini Synth Audio Engine
  const toggleMiniSynth = () => {
    playClick();
    if (miniAudioPlaying) {
      synthOscRef.current.forEach(osc => {
        try { osc.stop(); } catch { /* already stopped */ }
        try { osc.disconnect(); } catch { /* already detached */ }
      });
      synthOscRef.current = [];
      setMiniAudioPlaying(false);
    } else {
      try {
        // Reuse the context: a new one per toggle hits the browser's
        // concurrent-context cap and later toggles fail silently.
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const gain = ctx.createGain();
        gain.gain.value = (miniAudioVol / 100) * 0.08;
        gain.connect(ctx.destination);

        const freqs = [130.81, 196.00, 246.94, 293.66]; // Chill Cmaj9
        const oscs = freqs.map((freq) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq;
          osc.connect(gain);
          osc.start();
          return osc;
        });
        synthOscRef.current = oscs;
        setMiniAudioPlaying(true);
      } catch (err) {
        console.error('Mini audio error:', err);
      }
    }
  };

  // Clean up audio on unmount — oscillators AND the context, or the mini
  // synth keeps playing after the panel is dismissed.
  useEffect(() => {
    return () => {
      synthOscRef.current.forEach(osc => {
        try { osc.stop(); } catch { /* already stopped */ }
        try { osc.disconnect(); } catch { /* already detached */ }
      });
      synthOscRef.current = [];

      const ctx = audioCtxRef.current;
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch(() => { /* already closing */ });
      }
      audioCtxRef.current = null;
    };
  }, []);

  // Notes persistence
  const saveNotes = (updated) => {
    setNotes(updated);
    try {
      localStorage.setItem('billighost_widgets_notes', JSON.stringify(updated));
    } catch {}
  };

  const handleAddNote = () => {
    playClick();
    const colors = ['noteCardYellow', 'noteCardBlue', 'noteCardPink', 'noteCardGreen'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newNote = {
      id: `note-${Date.now()}`,
      text: '',
      color: randomColor,
    };
    saveNotes([newNote, ...notes]);
  };

  const handleUpdateNoteText = (id, text) => {
    const updated = notes.map(n => n.id === id ? { ...n, text } : n);
    saveNotes(updated);
  };

  const handleUpdateNoteColor = (id, color) => {
    playClick();
    const updated = notes.map(n => n.id === id ? { ...n, color } : n);
    saveNotes(updated);
  };

  const handleDeleteNote = (id) => {
    playClick();
    const updated = notes.filter(n => n.id !== id);
    saveNotes(updated);
  };

  // Tasks persistence
  const saveTasks = (updated) => {
    setTasks(updated);
    try {
      localStorage.setItem('billighost_widgets_tasks', JSON.stringify(updated));
    } catch {}
  };

  const handleToggleTask = (id) => {
    playClick();
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    saveTasks(updated);
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    playClick();
    const newTask = {
      id: `task-${Date.now()}`,
      text: newTaskInput.trim(),
      done: false,
    };
    saveTasks([...tasks, newTask]);
    setNewTaskInput('');
  };

  const handleDeleteTask = (id) => {
    playClick();
    const updated = tasks.filter(t => t.id !== id);
    saveTasks(updated);
  };

  // World Clocks with offset
  const worldClocks = useMemo(() => {
    void localTime;
    return [
      { city: 'London', time: getWorldTime('Europe/London', timeOffsetHours) },
      { city: 'New York', time: getWorldTime('America/New_York', timeOffsetHours) },
      { city: 'Tokyo', time: getWorldTime('Asia/Tokyo', timeOffsetHours) },
      { city: 'San Francisco', time: getWorldTime('America/Los_Angeles', timeOffsetHours) },
    ];
  }, [timeOffsetHours, localTime]);

  const formatPomoTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const completedTasksCount = tasks.filter(t => t.done).length;

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose} data-testid="widgets-overlay">
      <div className={styles.panel} onClick={(e) => e.stopPropagation()} data-testid="widgets-panel">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <WidgetsIcon size={18} />
            <span>Widgets & Telemetry Hub</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="Close Widgets">
            &times;
          </button>
        </div>

        {/* Content Stream */}
        <div className={styles.content}>
          {/* 1. Time & World Clocks Widget with Interactive Offset Slider */}
          <div className={styles.widgetCard}>
            <div className={styles.cardHeader}>
              <span>Local System Clock</span>
              <span className={styles.liveBadge}>LIVE</span>
            </div>
            <div>
              <div className={styles.clockTime}>{localTime}</div>
              <div className={styles.clockDate}>{localDate}</div>
            </div>

            <div className={styles.worldClocksGrid}>
              {worldClocks.map(wc => (
                <div key={wc.city} className={styles.worldClockItem}>
                  <span className={styles.worldCity}>{wc.city}</span>
                  <span className={styles.worldHour}>{wc.time}</span>
                </div>
              ))}
            </div>

            {/* Interactive World Time Preview Slider */}
            <div className={styles.timeOffsetContainer}>
              <div className={styles.offsetHeader}>
                <span>Timezone Offset Scrub:</span>
                <span className={styles.offsetValue}>{timeOffsetHours >= 0 ? `+${timeOffsetHours}h` : `${timeOffsetHours}h`}</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                value={timeOffsetHours}
                onChange={(e) => setTimeOffsetHours(parseInt(e.target.value, 10))}
                className={styles.offsetSlider}
              />
            </div>
          </div>

          {/* 2. Live Market & Crypto Ticker Widget */}
          <div className={styles.widgetCard} data-testid="widget-ticker-card">
            <div className={styles.cardHeader}>
              <span>Live Markets & Crypto</span>
              <span className={styles.liveBadge}>STREAM</span>
            </div>
            <div className={styles.tickerList}>
              {tickers.map(t => (
                <div key={t.symbol} className={styles.tickerRow}>
                  <div className={styles.tickerLeft}>
                    <span className={styles.tickerSymbol}>{t.symbol}</span>
                    <span className={styles.tickerName}>{t.name}</span>
                  </div>
                  {/* Sparkline mini-svg */}
                  <svg className={styles.sparkline} width="60" height="20" viewBox="0 0 60 20">
                    <polyline
                      fill="none"
                      stroke={t.up ? 'var(--accent-success, #34d399)' : 'var(--accent-error, #ff4d6a)'}
                      strokeWidth="2"
                      points={t.points.map((p, i) => `${i * 12},${20 - (p / 70) * 18}`).join(' ')}
                    />
                  </svg>
                  <div className={styles.tickerRight}>
                    <span className={styles.tickerPrice}>${t.price.toLocaleString()}</span>
                    <span className={`${styles.tickerChange} ${t.up ? styles.tickerUp : styles.tickerDown}`}>
                      {t.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Pomodoro Focus Timer Widget */}
          <div className={styles.widgetCard} data-testid="widget-pomodoro">
            <div className={styles.cardHeader}>
              <span>Focus Pomodoro</span>
              <span>{pomoMode.toUpperCase()}</span>
            </div>
            <div className={styles.pomoContainer}>
              <div className={styles.pomoTimeDisplay}>{formatPomoTime(pomoSeconds)}</div>
              <div className={styles.pomoButtons}>
                <button
                  className={`${styles.pomoBtn} ${pomoActive ? styles.pomoBtnPause : styles.pomoBtnStart}`}
                  onClick={() => { playClick(); setPomoActive(!pomoActive); }}
                >
                  {pomoActive ? 'Pause' : 'Start Focus'}
                </button>
                <button
                  className={styles.pomoBtnSecondary}
                  onClick={() => {
                    playClick();
                    setPomoActive(false);
                    setPomoSeconds(pomoMode === 'focus' ? 25 * 60 : 5 * 60);
                  }}
                >
                  Reset
                </button>
                <button
                  className={styles.pomoBtnSecondary}
                  onClick={() => {
                    playClick();
                    const nextMode = pomoMode === 'focus' ? 'break' : 'focus';
                    setPomoMode(nextMode);
                    setPomoActive(false);
                    setPomoSeconds(nextMode === 'focus' ? 25 * 60 : 5 * 60);
                  }}
                >
                  {pomoMode === 'focus' ? 'Break' : 'Focus'}
                </button>
              </div>
            </div>
          </div>

          {/* 4. Hardware Telemetry Circular Radial Gauges */}
          <div className={styles.widgetCard} data-testid="widget-telemetry-card">
            <div className={styles.cardHeader}>
              <span>System Telemetry</span>
              <span>Sensors</span>
            </div>
            <div className={styles.gaugesGrid}>
              {/* CPU Gauge */}
              <div className={styles.radialGaugeItem}>
                <svg className={styles.radialSvg} viewBox="0 0 36 36">
                  <path
                    className={styles.radialTrack}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={styles.radialFill}
                    strokeDasharray={`${cpuLoad}, 100`}
                    style={{ stroke: cpuLoad > 75 ? 'var(--accent-error, #ff4d6a)' : 'var(--accent-glow, #7eb8ff)' }}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <text x="18" y="20.35" className={styles.radialText}>{cpuLoad}%</text>
                </svg>
                <span className={styles.radialLabel}>CPU Load</span>
              </div>

              {/* Memory RAM Gauge */}
              <div className={styles.radialGaugeItem}>
                <svg className={styles.radialSvg} viewBox="0 0 36 36">
                  <path
                    className={styles.radialTrack}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={styles.radialFill}
                    strokeDasharray={`${Math.round((memUsage / 8) * 100)}, 100`}
                    style={{ stroke: '#a78bfa' }}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <text x="18" y="20.35" className={styles.radialText}>{memUsage}G</text>
                </svg>
                <span className={styles.radialLabel}>Memory</span>
              </div>

              {/* Battery Gauge */}
              <div className={styles.radialGaugeItem}>
                <svg className={styles.radialSvg} viewBox="0 0 36 36">
                  <path
                    className={styles.radialTrack}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={styles.radialFill}
                    strokeDasharray={`${battery.supported ? battery.level : 100}, 100`}
                    style={{ stroke: battery.charging ? 'var(--accent-success, #34d399)' : 'var(--accent-glow, #7eb8ff)' }}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <text x="18" y="20.35" className={styles.radialText}>{battery.supported ? `${battery.level}%` : 'AC'}</text>
                </svg>
                <span className={styles.radialLabel}>Battery</span>
              </div>

              {/* Storage Quota Gauge */}
              <div className={styles.radialGaugeItem}>
                <svg className={styles.radialSvg} viewBox="0 0 36 36">
                  <path
                    className={styles.radialTrack}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={styles.radialFill}
                    strokeDasharray={`${Math.max(4, storage.percentUsed)}, 100`}
                    style={{ stroke: '#fbbf24' }}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <text x="18" y="20.35" className={styles.radialText}>{storage.percentUsed}%</text>
                </svg>
                <span className={styles.radialLabel}>VFS Disk</span>
              </div>
            </div>
          </div>

          {/* 5. Mini Ambient Audio Controller */}
          <div className={styles.widgetCard} data-testid="widget-mini-audio">
            <div className={styles.cardHeader}>
              <span>Ambient Sound Station</span>
              <span className={styles.liveBadge}>{miniAudioPlaying ? 'PLAYING' : 'READY'}</span>
            </div>
            <div className={styles.audioWidgetBody}>
              <button
                className={`${styles.audioPlayBtn} ${miniAudioPlaying ? styles.audioPlaying : ''}`}
                onClick={toggleMiniSynth}
                title={miniAudioPlaying ? 'Pause Ambient Synth' : 'Play Ambient Synth'}
              >
                {miniAudioPlaying ? '⏸' : '▶'}
              </button>
              <div className={styles.audioMeta}>
                <div className={styles.audioTitle}>Chillwave Harmonic Cmaj9</div>
                <div className={styles.audioSub}>Procedural Web Audio Generator</div>
              </div>
            </div>
            <div className={styles.audioVolRow}>
              <span>Volume</span>
              <input
                type="range"
                min="0"
                max="100"
                value={miniAudioVol}
                onChange={(e) => setMiniAudioVol(parseInt(e.target.value, 10))}
                className={styles.volSlider}
              />
              <span>{miniAudioVol}%</span>
            </div>
          </div>

          {/* 6. Weather & Multi-Day Forecast Strip */}
          <div className={styles.widgetCard} data-testid="widget-weather-card">
            <div className={styles.cardHeader}>
              <span>Atmospheric Weather</span>
              <span>{weather.city || 'Live Location'}</span>
            </div>
            <div className={styles.weatherMain}>
              <div>
                <div className={styles.weatherTemp}>{weather.tempText || '21°C'}</div>
                <div className={styles.weatherCity}>{weather.city}</div>
                <div className={styles.weatherCondition}>{weather.label || 'Clear Sky'}</div>
              </div>
              <div className={styles.weatherIcon}>
                {weather.condition === 'clear' ? '☀️' : weather.condition === 'rain' ? '🌧️' : '⛅'}
              </div>
            </div>
            <div className={styles.weatherDetails}>
              <span>Humidity: {weather.humidity !== null ? `${weather.humidity}%` : '54%'}</span>
              <span>Wind: {weather.windSpeed !== null ? `${weather.windSpeed} km/h` : '12 km/h'}</span>
              <span>Air Quality: Optimal</span>
            </div>

            {/* 3-Day Forecast Strip */}
            <div className={styles.forecastRow}>
              <div className={styles.forecastItem}>
                <span className={styles.forecastDay}>Today</span>
                <span className={styles.forecastIcon}>☀️</span>
                <span className={styles.forecastTemp}>22° / 14°</span>
              </div>
              <div className={styles.forecastItem}>
                <span className={styles.forecastDay}>Tomorrow</span>
                <span className={styles.forecastIcon}>⛅</span>
                <span className={styles.forecastTemp}>20° / 13°</span>
              </div>
              <div className={styles.forecastItem}>
                <span className={styles.forecastDay}>Weekend</span>
                <span className={styles.forecastIcon}>🌧️</span>
                <span className={styles.forecastTemp}>18° / 11°</span>
              </div>
            </div>
          </div>

          {/* 7. Daily Agenda & Quick Task Checklist */}
          <div className={styles.widgetCard} data-testid="widget-tasks">
            <div className={styles.cardHeader}>
              <span>Daily Tasks & Agenda</span>
              <span>{completedTasksCount} / {tasks.length} Done</span>
            </div>

            <div className={styles.taskProgressBar}>
              <div
                className={styles.taskProgressFill}
                style={{ width: `${tasks.length ? (completedTasksCount / tasks.length) * 100 : 0}%` }}
              />
            </div>

            <div className={styles.taskList}>
              {tasks.map(t => (
                <div key={t.id} className={styles.taskItem}>
                  <button
                    className={`${styles.taskCheck} ${t.done ? styles.taskChecked : ''}`}
                    onClick={() => handleToggleTask(t.id)}
                  >
                    {t.done && <CheckIcon size={12} />}
                  </button>
                  <span className={`${styles.taskText} ${t.done ? styles.taskTextDone : ''}`}>
                    {t.text}
                  </span>
                  <button
                    className={styles.taskDeleteBtn}
                    onClick={() => handleDeleteTask(t.id)}
                    title="Remove task"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddTask} className={styles.taskAddRow}>
              <input
                type="text"
                value={newTaskInput}
                onChange={(e) => setNewTaskInput(e.target.value)}
                placeholder="Add a new task..."
                className={styles.taskInput}
              />
              <button type="submit" className={styles.taskAddBtn}>
                <PlusIcon size={12} />
              </button>
            </form>
          </div>

          {/* 8. Quick Sticky Notes */}
          <div className={styles.widgetCard} data-testid="widget-sticky-notes">
            <div className={styles.notesHeader}>
              <div className={styles.cardHeader} style={{ padding: 0 }}>
                <span>Quick Scratchpad</span>
              </div>
              <button className={styles.addNoteBtn} onClick={handleAddNote} title="Add sticky note">
                <PlusIcon size={12} /> Note
              </button>
            </div>
            <div className={styles.notesList}>
              {notes.map(note => (
                <div key={note.id} className={`${styles.noteCard} ${styles[note.color]}`}>
                  <textarea
                    className={styles.noteTextarea}
                    value={note.text}
                    onChange={(e) => handleUpdateNoteText(note.id, e.target.value)}
                    placeholder="Type quick thought or note..."
                  />
                  <div className={styles.noteFooter}>
                    <div className={styles.noteColorDots}>
                      {['noteCardYellow', 'noteCardBlue', 'noteCardPink', 'noteCardGreen'].map(col => (
                        <span
                          key={col}
                          className={styles.noteColorDot}
                          style={{
                            background: col === 'noteCardYellow' ? '#fde047' : col === 'noteCardBlue' ? '#7dd3fc' : col === 'noteCardPink' ? '#f472b6' : '#86efac',
                          }}
                          onClick={() => handleUpdateNoteColor(note.id, col)}
                        />
                      ))}
                    </div>
                    <button
                      className={styles.deleteNoteBtn}
                      onClick={() => handleDeleteNote(note.id)}
                      title="Delete note"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 9. Quick System Action Dock */}
          <div className={styles.widgetCard}>
            <div className={styles.cardHeader}>
              <span>Quick Action Dock</span>
            </div>
            <div className={styles.togglesRow}>
              <button
                className={`${styles.toggleBtn} ${appearance.nightLight ? styles.toggleBtnActive : ''}`}
                onClick={() => {
                  playClick();
                  LocalSettings.setAppearance({ nightLight: !appearance.nightLight });
                }}
              >
                <SunIcon size={16} />
                <span>Night Light</span>
              </button>
              <button
                className={`${styles.toggleBtn} ${sound.isMuted ? styles.toggleBtnActive : ''}`}
                onClick={() => {
                  playClick();
                  LocalSettings.setSound({ isMuted: !sound.isMuted });
                }}
              >
                <SpeakerIcon size={16} />
                <span>{sound.isMuted ? 'Muted' : 'Sound On'}</span>
              </button>
              <button
                className={styles.toggleBtn}
                onClick={() => {
                  playClick();
                  onClose();
                  if (onOpenSettings) onOpenSettings();
                }}
              >
                <GearIcon size={16} />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
