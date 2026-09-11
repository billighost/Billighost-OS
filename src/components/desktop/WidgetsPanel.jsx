import { useState, useEffect, useMemo } from 'react';
import { useWeather } from '../../hooks/useWeather';
import { useBattery } from '../../hooks/useBattery';
import { useNetwork } from '../../hooks/useNetwork';
import { useStorageQuota } from '../../hooks/useStorageQuota';
import { LocalSettings } from '../../services/storage/localStorage';
import {
  WidgetsIcon, SunIcon, CloudIcon, GearIcon,
  SpeakerIcon, CheckIcon, PlusIcon,
} from '../Icons';
import styles from './WidgetsPanel.module.css';

const DEFAULT_NOTES = [
  { id: 'note-1', text: 'Welcome to Billighost Phase 4! Test Spotlight Search (Ctrl+Space) and multi-direction window resizing.', color: 'noteCardYellow' },
  { id: 'note-2', text: 'Draw your desktop wallpaper in Paint Studio and save directly to Pictures.', color: 'noteCardBlue' },
];

function getWorldTime(timeZone) {
  try {
    return new Intl.DateTimeFormat([], {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
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
  const network = useNetwork();
  const storage = useStorageQuota();

  const [appearance, setAppearance] = useState(() => LocalSettings.getAppearance());
  const [sound, setSound] = useState(() => LocalSettings.getSound());

  // Clock state
  const [localTime, setLocalTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const [localDate, setLocalDate] = useState(() =>
    new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
  );

  // Simulated CPU load
  const [cpuLoad, setCpuLoad] = useState(24);

  // Sticky Notes State
  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem('billighost_widgets_notes');
      return saved ? JSON.parse(saved) : DEFAULT_NOTES;
    } catch {
      return DEFAULT_NOTES;
    }
  });

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

      // Subtle dynamic fluctuation in CPU load
      setCpuLoad(prev => {
        const delta = Math.floor(Math.random() * 9) - 4;
        return Math.min(85, Math.max(12, prev + delta));
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // Persist notes
  const saveNotes = (updated) => {
    setNotes(updated);
    try {
      localStorage.setItem('billighost_widgets_notes', JSON.stringify(updated));
    } catch {
      // ignore
    }
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

  // Quick Toggles
  const handleToggleNightLight = () => {
    playClick();
    LocalSettings.setAppearance({ nightLight: !appearance.nightLight });
  };

  const handleToggleMute = () => {
    playClick();
    LocalSettings.setSound({ isMuted: !sound.isMuted });
  };

  // World Clocks
  const worldClocks = useMemo(() => [
    { city: 'London', time: getWorldTime('Europe/London') },
    { city: 'New York', time: getWorldTime('America/New_York') },
    { city: 'Tokyo', time: getWorldTime('Asia/Tokyo') },
    { city: 'San Francisco', time: getWorldTime('America/Los_Angeles') },
  ], [localTime]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose} data-testid="widgets-overlay">
      <div className={styles.panel} onClick={(e) => e.stopPropagation()} data-testid="widgets-panel">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <WidgetsIcon size={18} />
            <span>Widgets & Telemetry</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="Close Widgets">
            &times;
          </button>
        </div>

        {/* Content Stream */}
        <div className={styles.content}>
          {/* 1. Time & World Clocks Widget */}
          <div className={styles.widgetCard}>
            <div className={styles.cardHeader}>
              <span>Local System Clock</span>
              <span>LIVE</span>
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
          </div>

          {/* 2. Weather Forecast Card */}
          <div className={styles.widgetCard} data-testid="widget-weather-card">
            <div className={styles.cardHeader}>
              <span>Weather</span>
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
              <span>Conditions: {weather.label}</span>
            </div>
          </div>

          {/* 3. Hardware Telemetry Speedometers */}
          <div className={styles.widgetCard} data-testid="widget-telemetry-card">
            <div className={styles.cardHeader}>
              <span>Hardware Telemetry</span>
              <span>Sensors</span>
            </div>
            <div className={styles.gaugesGrid}>
              {/* CPU Gauge */}
              <div className={styles.gaugeItem}>
                <div className={styles.gaugeLabel}>
                  <span>CPU Load</span>
                  <span>{cpuLoad}%</span>
                </div>
                <div className={styles.gaugeTrack}>
                  <div
                    className={styles.gaugeFill}
                    style={{
                      width: `${cpuLoad}%`,
                      background: cpuLoad > 75 ? 'var(--accent-error)' : 'var(--accent-glow)',
                    }}
                  />
                </div>
              </div>

              {/* Memory RAM Gauge */}
              <div className={styles.gaugeItem}>
                <div className={styles.gaugeLabel}>
                  <span>Memory</span>
                  <span>3.8 / 8.0 GB</span>
                </div>
                <div className={styles.gaugeTrack}>
                  <div
                    className={styles.gaugeFill}
                    style={{ width: '47%', background: 'var(--accent-soft)' }}
                  />
                </div>
              </div>

              {/* Battery Gauge */}
              <div className={styles.gaugeItem}>
                <div className={styles.gaugeLabel}>
                  <span>Battery</span>
                  <span>{battery.supported ? `${battery.level}%` : 'AC Power'}</span>
                </div>
                <div className={styles.gaugeTrack}>
                  <div
                    className={styles.gaugeFill}
                    style={{
                      width: `${battery.supported ? battery.level : 100}%`,
                      background: battery.charging ? 'var(--accent-success)' : 'var(--accent-glow)',
                    }}
                  />
                </div>
              </div>

              {/* Network Speed */}
              <div className={styles.gaugeItem}>
                <div className={styles.gaugeLabel}>
                  <span>Network</span>
                  <span>{network.isOnline ? `${network.downlink} Mbps` : 'Offline'}</span>
                </div>
                <div className={styles.gaugeTrack}>
                  <div
                    className={styles.gaugeFill}
                    style={{
                      width: `${Math.min(100, (network.downlink || 5) * 10)}%`,
                      background: network.isOnline ? 'var(--accent-success)' : 'var(--accent-error)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Quick Sticky Notes */}
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

          {/* 5. Quick System Toggles */}
          <div className={styles.widgetCard}>
            <div className={styles.cardHeader}>
              <span>Quick Controls</span>
            </div>
            <div className={styles.togglesRow}>
              <button
                className={`${styles.toggleBtn} ${appearance.nightLight ? styles.toggleBtnActive : ''}`}
                onClick={handleToggleNightLight}
              >
                <SunIcon size={16} />
                <span>Night Light</span>
              </button>
              <button
                className={`${styles.toggleBtn} ${sound.isMuted ? styles.toggleBtnActive : ''}`}
                onClick={handleToggleMute}
              >
                <SpeakerIcon size={16} />
                <span>{sound.isMuted ? 'Muted' : 'Sound On'}</span>
              </button>
              <button
                className={styles.toggleBtn}
                onClick={() => {
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
