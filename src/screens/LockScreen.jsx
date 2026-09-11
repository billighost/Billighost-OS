import { useState, useEffect, useCallback } from 'react';
import { useBattery } from '../hooks/useBattery';
import { useNetwork } from '../hooks/useNetwork';
import { useWeather } from '../hooks/useWeather';
import { LocalSettings } from '../services/storage/localStorage';
import styles from './LockScreen.module.css';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatTime(date) {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function formatDate(date) {
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export default function LockScreen({ onUnlock, playUnlock, playClick, wallpaperSrc }) {
  const [time, setTime] = useState(formatTime(new Date()));
  const [date] = useState(formatDate(new Date()));
  const [washing, setWashing] = useState(false);
  const [tapPos, setTapPos] = useState({ x: 50, y: 50 });
  const [showMask, setShowMask] = useState(false);
  const [profile, setProfile] = useState(() => LocalSettings.getProfile());

  const battery = useBattery();
  const network = useNetwork();
  const weather = useWeather();

  /* Listen for profile updates */
  useEffect(() => {
    const handleProfile = (e) => setProfile(e.detail);
    window.addEventListener('billighost:profile-change', handleProfile);
    return () => window.removeEventListener('billighost:profile-change', handleProfile);
  }, []);

  /* Live clock */
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(formatTime(new Date()));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleUnlock = useCallback((e) => {
    if (washing) return;

    /* Calculate tap position as percentage */
    const x = e?.clientX ? (e.clientX / window.innerWidth) * 100 : 50;
    const y = e?.clientY ? (e.clientY / window.innerHeight) * 100 : 50;
    setTapPos({ x, y });

    playClick();
    setShowMask(true);
    setWashing(true);

    setTimeout(() => {
      playUnlock();
    }, 100);

    setTimeout(() => {
      onUnlock();
    }, 700);
  }, [washing, onUnlock, playUnlock, playClick]);

  /* Listen for keypress */
  useEffect(() => {
    const handleKey = (e) => {
      e.preventDefault();
      handleUnlock();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleUnlock]);

  return (
    <div
      className={styles.container}
      onClick={handleUnlock}
    >
      {/* Wallpaper */}
      {wallpaperSrc ? (
        <img src={wallpaperSrc} alt="" className={styles.wallpaper} draggable={false} />
      ) : (
        <div className={styles.wallpaperFallback} />
      )}

      {/* Circle wipe mask */}
      <div
        className={`${styles.circleMask} ${showMask ? styles.circleMaskActive : ''}`}
        style={{
          '--tap-x': `${tapPos.x}%`,
          '--tap-y': `${tapPos.y}%`,
        }}
      />

      {/* Full-screen transparent overlay — no card */}
      <div className={`${styles.overlay} ${washing ? styles.overlayWashing : ''}`}>
        {/* Top-left: Time & Date */}
        <div className={styles.topLeft}>
          <span className={styles.time}>{time}</span>
          <span className={styles.date}>{date}</span>
        </div>

        {/* Bottom-left: Status indicators */}
        <div className={styles.bottomLeft}>
          {/* Battery */}
          <div className={styles.statusChip} title={`Battery: ${battery.levelText} (${battery.statusText})`}>
            <div className={styles.batteryIcon}>
              <div
                className={styles.batteryFill}
                style={{
                  width: `${battery.barWidth}%`,
                  background: battery.tone === 'critical' ? 'var(--accent-error)'
                    : battery.tone === 'warn' ? 'var(--accent-warning)'
                    : 'var(--accent-success)'
                }}
              />
            </div>
            <span>{battery.levelText}</span>
          </div>

          {/* Network */}
          <div
            className={styles.statusChip}
            title={network.isOnline ? `Network: ${network.effectiveType.toUpperCase()} (${network.downlink} Mbps)` : 'Network: Offline'}
          >
            <div className={styles.wifiIcon}>
              <div className={styles.wifiArc1} />
              <div className={styles.wifiArc2} />
              {network.isOnline && <div className={styles.wifiArc3} />}
            </div>
            <span>{network.isOnline ? (network.effectiveType ? network.effectiveType.toUpperCase() : 'Online') : 'Offline'}</span>
          </div>

          {/* Weather */}
          <div className={styles.statusChip} title={`${weather.city} \u2022 ${weather.label}`}>
            <div className={styles.weatherIcon}>
              <div className={styles.weatherSun} />
              <div className={styles.weatherCloud} />
            </div>
            <span>{weather.tempText}</span>
          </div>
        </div>

        {/* Bottom-right: User identity */}
        <div className={styles.bottomRight}>
          <span className={styles.email}>{profile.email || 'bb2010ng@gmail.com'}</span>
        </div>

        {/* Bottom-center: Prompt */}
        <div className={styles.bottomCenter}>
          <span className={styles.prompt}>Tap anywhere or press any key</span>
        </div>
      </div>
    </div>
  );
}
