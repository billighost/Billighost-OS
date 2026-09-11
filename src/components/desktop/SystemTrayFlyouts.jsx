import { useState, useEffect } from 'react';
import { NotificationService } from '../../services/notificationService';
import {
  SignalIcon, BatteryFullIcon, CalendarIcon, BoltIcon,
  ExpandIcon, MoonIcon, VolumeIcon, VolumeMuteIcon, GearIcon,
} from '../Icons';
import styles from './SystemTrayFlyouts.module.css';

// 1. Network Flyout Panel
export function NetworkFlyout({ network, onClose, playClick = () => {} }) {
  const [pingResult, setPingResult] = useState(null);
  const [testingPing, setTestingPing] = useState(false);

  const handleTestPing = async () => {
    playClick();
    setTestingPing(true);
    const start = performance.now();
    try {
      await fetch('/favicon.ico?_t=' + Date.now(), { cache: 'no-store' });
      const duration = Math.round(performance.now() - start);
      setPingResult(`${duration} ms (Optimal)`);
    } catch {
      setPingResult('Timeout / Offline');
    } finally {
      setTestingPing(false);
    }
  };

  return (
    <div className={styles.flyoutContainer} onClick={(e) => e.stopPropagation()}>
      <div className={styles.flyoutHeader}>
        <div className={styles.flyoutTitle}>
          <span className={styles.iconIndicator}><SignalIcon size={16} /></span>
          Network Information
        </div>
        <button className={styles.closeBtn} onClick={onClose}>&times;</button>
      </div>

      <div className={styles.flyoutContent}>
        <div className={styles.telemetryCard}>
          <div className={styles.telemetryRow}>
            <span>Status</span>
            <span className={network.isOnline ? styles.badgeSuccess : styles.badgeError}>
              {network.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className={styles.telemetryRow}>
            <span>Connection</span>
            <span className={styles.monoValue}>{network.effectiveType.toUpperCase()} ({network.type})</span>
          </div>
          <div className={styles.telemetryRow}>
            <span>Downlink Speed</span>
            <span className={styles.monoValue}>{network.downlink} Mbps</span>
          </div>
          <div className={styles.telemetryRow}>
            <span>Round Trip Time (RTT)</span>
            <span className={styles.monoValue}>{network.rtt} ms</span>
          </div>
          <div className={styles.telemetryRow}>
            <span>Data Saver</span>
            <span className={styles.monoValue}>{network.saveData ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>

        <div className={styles.actionRow}>
          <button className={styles.actionBtn} onClick={handleTestPing} disabled={testingPing}>
            {testingPing ? 'Testing latency...' : 'Test Connection Latency'}
          </button>
          {pingResult && <div className={styles.resultText}>Latency: {pingResult}</div>}
        </div>
      </div>
    </div>
  );
}

// 2. Battery Flyout Panel
export function BatteryFlyout({ battery, onClose, playClick = () => {} }) {
  const [batterySaver, setBatterySaver] = useState(false);

  return (
    <div className={styles.flyoutContainer} onClick={(e) => e.stopPropagation()}>
      <div className={styles.flyoutHeader}>
        <div className={styles.flyoutTitle}>
          <span className={styles.iconIndicator}><BatteryFullIcon size={16} /></span>
          Power & Battery
        </div>
        <button className={styles.closeBtn} onClick={onClose}>&times;</button>
      </div>

      <div className={styles.flyoutContent}>
        <div className={styles.batteryBigGauge}>
          <div className={styles.gaugeNumber}>{battery.levelText}</div>
          <div className={styles.gaugeStatus}>{battery.statusText}</div>
          <div className={styles.batteryProgressBar}>
            <div
              className={styles.batteryProgressFill}
              style={{
                width: `${battery.barWidth}%`,
                background: battery.charging
                  ? 'var(--accent-success)'
                  : battery.tone === 'warn' || battery.tone === 'critical'
                  ? 'var(--accent-error)'
                  : 'var(--accent-glow)',
              }}
            />
          </div>
        </div>

        <div className={styles.telemetryCard}>
          <div className={styles.telemetryRow}>
            <span>Power Source</span>
            <span className={styles.monoValue}>{battery.charging ? 'AC Charger' : 'Battery'}</span>
          </div>
          <div className={styles.telemetryRow}>
            <span>Hardware Telemetry</span>
            <span className={styles.monoValue}>{battery.supported ? 'Web Battery API' : 'System AC Estimator'}</span>
          </div>
          <div className={styles.telemetryRow}>
            <span>Power Saver</span>
            <button
              className={`${styles.toggleBtn} ${batterySaver ? styles.toggleBtnActive : ''}`}
              onClick={() => {
                playClick();
                setBatterySaver(!batterySaver);
              }}
            >
              {batterySaver ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 3. Calendar & Clock Flyout
export function CalendarFlyout({ onClose, playClick = () => {} }) {
  const now = new Date();
  const [currentDate] = useState(now);
  const [timeStr, setTimeStr] = useState(() => now.toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const todayDate = currentDate.getDate();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  return (
    <div className={styles.flyoutContainer} onClick={(e) => e.stopPropagation()}>
      <div className={styles.flyoutHeader}>
        <div className={styles.flyoutTitle}>
          <span className={styles.iconIndicator}><CalendarIcon size={16} /></span>
          {monthName} {year}
        </div>
        <button className={styles.closeBtn} onClick={onClose}>&times;</button>
      </div>

      <div className={styles.flyoutContent}>
        <div className={styles.clockHeader}>
          <div className={styles.bigDigitalTime}>{timeStr}</div>
          <div className={styles.fullDateString}>
            {currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        <div className={styles.calendarGrid}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className={styles.calDayHeader}>{day}</div>
          ))}
          {days.map((day, idx) => (
            <div
              key={idx}
              className={`${styles.calCell} ${day === todayDate ? styles.calToday : ''} ${!day ? styles.calEmpty : ''}`}
            >
              {day || ''}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 4. Action Center / Control Center Flyout
export function ActionCenterFlyout({
  storage,
  soundConfig,
  onUpdateSound,
  appearance,
  onUpdateAppearance,
  onOpenSettings,
  onClose,
  playClick = () => {},
}) {
  const isFullscreen = typeof document !== 'undefined' && !!document.fullscreenElement;

  const toggleFullscreen = () => {
    playClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const toggleNightLight = () => {
    playClick();
    onUpdateAppearance({ nightLight: !appearance.nightLight });
  };

  const handleVolumeChange = (e) => {
    const val = parseInt(e.target.value, 10);
    onUpdateSound({ masterVolume: val, isMuted: val === 0 });
  };

  const toggleMute = () => {
    playClick();
    onUpdateSound({ isMuted: !soundConfig.isMuted });
  };

  return (
    <div className={styles.flyoutContainer} onClick={(e) => e.stopPropagation()}>
      <div className={styles.flyoutHeader}>
        <div className={styles.flyoutTitle}>
          <span className={styles.iconIndicator}><BoltIcon size={16} /></span>
          Control Center
        </div>
        <button className={styles.closeBtn} onClick={onClose}>&times;</button>
      </div>

      <div className={styles.flyoutContent}>
        {/* Quick Toggles Grid */}
        <div className={styles.quickGrid}>
          <button
            className={`${styles.quickTile} ${isFullscreen ? styles.quickTileActive : ''}`}
            onClick={toggleFullscreen}
          >
            <span className={styles.tileIcon}><ExpandIcon size={18} /></span>
            <span className={styles.tileLabel}>Fullscreen</span>
          </button>

          <button
            className={`${styles.quickTile} ${appearance.nightLight ? styles.quickTileActive : ''}`}
            onClick={toggleNightLight}
          >
            <span className={styles.tileIcon}><MoonIcon size={18} /></span>
            <span className={styles.tileLabel}>Night Light</span>
          </button>

          <button
            className={`${styles.quickTile} ${!soundConfig.isMuted ? styles.quickTileActive : ''}`}
            onClick={toggleMute}
          >
            <span className={styles.tileIcon}>
              {soundConfig.isMuted ? <VolumeMuteIcon size={18} /> : <VolumeIcon size={18} />}
            </span>
            <span className={styles.tileLabel}>{soundConfig.isMuted ? 'Muted' : 'Sound'}</span>
          </button>

          <button
            className={styles.quickTile}
            onClick={() => {
              playClick();
              onOpenSettings();
              onClose();
            }}
          >
            <span className={styles.tileIcon}><GearIcon size={18} /></span>
            <span className={styles.tileLabel}>Settings</span>
          </button>
        </div>

        {/* Volume Slider */}
        <div className={styles.sliderCard}>
          <div className={styles.sliderHeader}>
            <span>Master Volume</span>
            <span className={styles.monoValue}>{soundConfig.isMuted ? '0%' : `${soundConfig.masterVolume}%`}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={soundConfig.isMuted ? 0 : soundConfig.masterVolume}
            onChange={handleVolumeChange}
            className={styles.rangeInput}
          />
        </div>

        {/* Real Storage Quota */}
        <div className={styles.telemetryCard}>
          <div className={styles.telemetryRow}>
            <span>Virtual & Disk Storage</span>
            <span className={styles.monoValue}>{storage.usageFormatted} / {storage.quotaFormatted}</span>
          </div>
          <div className={styles.batteryProgressBar}>
            <div
              className={styles.batteryProgressFill}
              style={{ width: `${Math.max(2, storage.percentUsed)}%`, background: 'var(--accent-soft)' }}
            />
          </div>
          <div className={styles.telemetrySub}>
            Browser IndexedDB Quota: {storage.percentUsed}% utilized
          </div>
        </div>

        {/* Notifications Feed */}
        <div className={styles.telemetryCard}>
          <div className={styles.telemetryRow}>
            <span style={{ fontWeight: 600 }}>Notifications</span>
            <button
              className={styles.closeBtn}
              style={{ fontSize: '0.68rem', color: 'var(--accent-glow)' }}
              onClick={() => { playClick(); NotificationService.clear(); }}
            >
              Clear All
            </button>
          </div>
          <NotificationsList playClick={playClick} />
        </div>
      </div>
    </div>
  );
}

function NotificationsList({ playClick }) {
  const [items, setItems] = useState(() => NotificationService.getAll());

  useEffect(() => {
    const handleUpdate = (e) => setItems(e.detail);
    window.addEventListener('billighost:notifications-update', handleUpdate);
    return () => window.removeEventListener('billighost:notifications-update', handleUpdate);
  }, []);

  if (items.length === 0) {
    return <div style={{ fontSize: '0.72rem', color: 'var(--text-ghost)', textAlign: 'center', padding: '6px 0' }}>No notifications</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
      {items.map((n) => (
        <div
          key={n.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '4px',
            fontSize: '0.72rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
              {n.title}
            </span>
          </div>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-ghost)', marginLeft: '6px' }}>{n.timeFormatted}</span>
        </div>
      ))}
    </div>
  );
}
