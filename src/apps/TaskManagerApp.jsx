import { useState, useEffect } from 'react';
import { useStorageQuota } from '../hooks/useStorageQuota';
import { useBattery } from '../hooks/useBattery';
import { PackageIcon } from '../components/Icons';
import styles from './TaskManagerApp.module.css';

export default function TaskManagerApp({
  windows = [],
  onCloseWindow = () => {},
  playClick = () => {},
}) {
  const [activeTab, setActiveTab] = useState('processes');
  const [cpuUsage, setCpuUsage] = useState(12);
  const storage = useStorageQuota();
  const battery = useBattery();

  useEffect(() => {
    // Dynamic CPU fluctuation simulation based on frame timing
    let last = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const delta = now - last;
      last = now;
      // Normal frame is ~16.6ms. If frame took longer, cpu higher
      const jitter = Math.min(95, Math.max(8, Math.round((delta / 25) * 15 + Math.random() * 10)));
      setCpuUsage(jitter);
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.taskManagerContainer}>
      <div className={styles.headerTabs}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'processes' ? styles.tabActive : ''}`}
          onClick={() => { playClick(); setActiveTab('processes'); }}
        >
          Processes ({windows.length})
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'performance' ? styles.tabActive : ''}`}
          onClick={() => { playClick(); setActiveTab('performance'); }}
        >
          Performance & Storage
        </button>
      </div>

      {activeTab === 'processes' && (
        <div className={styles.processesList}>
          <div className={styles.tableHeader}>
            <span>Process / Window</span>
            <span>Status</span>
            <span>Action</span>
          </div>

          {windows.map((win) => (
            <div key={win.id} className={styles.tableRow}>
              <div className={styles.procIdentity}>
                <span className={styles.procIcon}><PackageIcon size={14} /></span>
                <span className={styles.procName}>{win.title}</span>
              </div>
              <div className={styles.procStatus}>
                {win.isMinimized ? 'Minimized' : 'Active'}
              </div>
              <div className={styles.procAction}>
                <button
                  className={styles.killBtn}
                  onClick={() => {
                    playClick();
                    onCloseWindow(win.id);
                  }}
                >
                  End Task
                </button>
              </div>
            </div>
          ))}

          {windows.length === 0 && (
            <div className={styles.noProcMsg}>No applications currently running.</div>
          )}
        </div>
      )}

      {activeTab === 'performance' && (
        <div className={styles.perfPane}>
          <div className={styles.perfCard}>
            <div className={styles.perfTitle}>
              <span>CPU Activity</span>
              <span className={styles.monoValue}>{cpuUsage}%</span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${cpuUsage}%`, background: 'var(--accent-glow)' }}
              />
            </div>
            <div className={styles.perfSub}>
              {typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8} Logical Cores Available
            </div>
          </div>

          <div className={styles.perfCard}>
            <div className={styles.perfTitle}>
              <span>IndexedDB & Cache Storage</span>
              <span className={styles.monoValue}>{storage.usageFormatted} / {storage.quotaFormatted}</span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${Math.max(2, storage.percentUsed)}%`, background: 'var(--accent-success)' }}
              />
            </div>
            <div className={styles.perfSub}>
              Virtual File System Quota: {storage.percentUsed}% used
            </div>
          </div>

          <div className={styles.perfCard}>
            <div className={styles.perfTitle}>
              <span>Power Telemetry</span>
              <span className={styles.monoValue}>{battery.level}% ({battery.statusText})</span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${battery.level}%`, background: battery.charging ? 'var(--accent-success)' : 'var(--accent-warning)' }}
              />
            </div>
            <div className={styles.perfSub}>
              Source: {battery.supported ? 'Hardware Battery API' : 'AC Desktop Provider'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
