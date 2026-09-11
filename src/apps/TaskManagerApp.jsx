import { useState, useEffect, useRef } from 'react';
import { useStorageQuota } from '../hooks/useStorageQuota';
import { useBattery } from '../hooks/useBattery';
import { PackageIcon, RefreshCwIcon, TrashIcon } from '../components/Icons';
import styles from './TaskManagerApp.module.css';

export default function TaskManagerApp({
  windows = [],
  onCloseWindow = () => {},
  onFocusWindow = () => {},
  playClick = () => {},
}) {
  const [activeTab, setActiveTab] = useState('processes'); // 'processes' | 'performance' | 'diagnostics'
  const [cpuUsage, setCpuUsage] = useState(14);
  const [cpuHistory, setCpuHistory] = useState([12, 15, 14, 18, 16, 22, 19, 14, 15, 16]);
  const [memUsage, setMemUsage] = useState(48); // MB
  const [memHistory, setMemHistory] = useState([45, 46, 46, 47, 48, 48, 49, 48]);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'minimized'

  // Benchmark tool state
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchScore, setBenchScore] = useState(null);

  const cpuCanvasRef = useRef(null);
  const memCanvasRef = useRef(null);

  const storage = useStorageQuota();
  const battery = useBattery();

  // Real-time telemetry simulation loop
  useEffect(() => {
    let lastTime = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;

      // Calculate CPU jitter from frame delta
      const jitter = Math.min(96, Math.max(6, Math.round((delta / 20) * 12 + Math.random() * 8)));
      setCpuUsage(jitter);
      setCpuHistory(prev => [...prev.slice(-29), jitter]);

      // Memory estimation
      const perfMem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / (1024 * 1024)) : (48 + Math.round(Math.sin(now / 5000) * 8));
      setMemUsage(perfMem);
      setMemHistory(prev => [...prev.slice(-29), perfMem]);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Render CPU sparkline canvas
  useEffect(() => {
    if (activeTab !== 'performance') return;
    const canvas = cpuCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Sparkline path
    if (cpuHistory.length > 1) {
      ctx.beginPath();
      const step = w / (cpuHistory.length - 1);
      cpuHistory.forEach((val, i) => {
        const x = i * step;
        const y = h - (val / 100) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Area gradient fill below curve
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(0, 243, 255, 0.25)');
      grad.addColorStop(1, 'rgba(0, 243, 255, 0.0)');
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }, [activeTab, cpuHistory]);

  // Render Memory sparkline canvas
  useEffect(() => {
    if (activeTab !== 'performance') return;
    const canvas = memCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Sparkline path
    if (memHistory.length > 1) {
      ctx.beginPath();
      const step = w / (memHistory.length - 1);
      const maxMem = 120;
      memHistory.forEach((val, i) => {
        const x = i * step;
        const y = h - (val / maxMem) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#a78bfa';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(167, 139, 250, 0.25)');
      grad.addColorStop(1, 'rgba(167, 139, 250, 0.0)');
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }, [activeTab, memHistory]);

  // Run CPU benchmark stress test
  const runBenchmark = () => {
    playClick();
    setIsBenchmarking(true);
    setBenchScore(null);

    setTimeout(() => {
      const start = performance.now();
      let primes = 0;
      for (let i = 2; i < 250000; i++) {
        let isP = true;
        for (let d = 2; d * d <= i; d++) {
          if (i % d === 0) { isP = false; break; }
        }
        if (isP) primes++;
      }
      const duration = performance.now() - start;
      const score = Math.round(100000 / duration);
      setBenchScore(score);
      setIsBenchmarking(false);
    }, 100);
  };

  // Close all minimized
  const handleCloseMinimized = () => {
    playClick();
    windows.filter(w => w.isMinimized).forEach(w => onCloseWindow(w.id));
  };

  // Filtered windows
  const filteredWindows = windows.filter(w => {
    const matchesSearch = w.title.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all'
      ? true
      : statusFilter === 'minimized' ? w.isMinimized : !w.isMinimized;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className={styles.taskManagerContainer} data-testid="task-manager-app">
      {/* Navigation Header */}
      <div className={styles.headerTabs}>
        <div className={styles.tabsGroup}>
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
            Performance & Graphs
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'diagnostics' ? styles.tabActive : ''}`}
            onClick={() => { playClick(); setActiveTab('diagnostics'); }}
          >
            Diagnostics & Hardware
          </button>
        </div>

        {/* Global summary badge */}
        <div className={styles.headerTelemetry}>
          <span className={styles.telemetryPill}>CPU: {cpuUsage}%</span>
          <span className={styles.telemetryPill}>RAM: {memUsage} MB</span>
        </div>
      </div>

      {/* TAB 1: PROCESSES */}
      {activeTab === 'processes' && (
        <div className={styles.processesPane}>
          {/* Filter & Action Strip */}
          <div className={styles.filterStrip}>
            <input
              type="text"
              placeholder="Filter processes..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className={styles.filterInput}
            />

            <div className={styles.statusFilters}>
              <button
                className={`${styles.filterBtn} ${statusFilter === 'all' ? styles.filterBtnActive : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                All
              </button>
              <button
                className={`${styles.filterBtn} ${statusFilter === 'active' ? styles.filterBtnActive : ''}`}
                onClick={() => setStatusFilter('active')}
              >
                Active
              </button>
              <button
                className={`${styles.filterBtn} ${statusFilter === 'minimized' ? styles.filterBtnActive : ''}`}
                onClick={() => setStatusFilter('minimized')}
              >
                Minimized
              </button>
            </div>

            {windows.some(w => w.isMinimized) && (
              <button className={styles.closeAllBtn} onClick={handleCloseMinimized}>
                <TrashIcon size={12} /> Close Minimized
              </button>
            )}
          </div>

          <div className={styles.tableHeader}>
            <span>Process / Window Title</span>
            <span>PID</span>
            <span>State</span>
            <span>Est. CPU</span>
            <span>Est. Memory</span>
            <span>Actions</span>
          </div>

          <div className={styles.processesList}>
            {filteredWindows.map((win, idx) => (
              <div key={win.id} className={styles.tableRow}>
                <div className={styles.procIdentity}>
                  <span className={styles.procIcon}><PackageIcon size={14} /></span>
                  <span className={styles.procName} title={win.title}>{win.title}</span>
                </div>
                <div className={styles.procPid}>#{1000 + idx * 12}</div>
                <div className={styles.procStatus}>
                  <span className={win.isMinimized ? styles.badgeMinimized : styles.badgeActive}>
                    {win.isMinimized ? 'Minimized' : 'Running'}
                  </span>
                </div>
                <div className={styles.procMetric}>{win.isMinimized ? '0.2%' : `${Math.round(cpuUsage / Math.max(1, windows.length))}%`}</div>
                <div className={styles.procMetric}>{win.isMinimized ? '8.4 MB' : `${Math.round(memUsage / Math.max(1, windows.length))} MB`}</div>
                <div className={styles.procActions}>
                  <button
                    className={styles.focusBtn}
                    onClick={() => { playClick(); onFocusWindow(win.id); }}
                    title="Bring to Front"
                  >
                    Focus
                  </button>
                  <button
                    className={styles.killBtn}
                    onClick={() => { playClick(); onCloseWindow(win.id); }}
                    title="End Process"
                  >
                    End Task
                  </button>
                </div>
              </div>
            ))}

            {filteredWindows.length === 0 && (
              <div className={styles.noProcMsg}>
                {searchFilter ? `No processes matching "${searchFilter}"` : 'No applications currently open.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PERFORMANCE & GRAPHS */}
      {activeTab === 'performance' && (
        <div className={styles.perfPane}>
          {/* Top Graphs Grid */}
          <div className={styles.graphsGrid}>
            {/* CPU SPARKLINE */}
            <div className={styles.graphCard}>
              <div className={styles.cardHeader}>
                <div>
                  <div className={styles.cardTitle}>CPU Utilization Graph</div>
                  <div className={styles.cardSubtitle}>{typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8} Logical Threads</div>
                </div>
                <span className={styles.liveValueGlow}>{cpuUsage}%</span>
              </div>
              <div className={styles.canvasContainer}>
                <canvas ref={cpuCanvasRef} width={340} height={110} className={styles.sparkCanvas} />
              </div>
            </div>

            {/* MEMORY SPARKLINE */}
            <div className={styles.graphCard}>
              <div className={styles.cardHeader}>
                <div>
                  <div className={styles.cardTitle}>JavaScript Heap Memory</div>
                  <div className={styles.cardSubtitle}>Active OS Garbage Collector</div>
                </div>
                <span className={styles.liveValuePurple}>{memUsage} MB</span>
              </div>
              <div className={styles.canvasContainer}>
                <canvas ref={memCanvasRef} width={340} height={110} className={styles.sparkCanvas} />
              </div>
            </div>
          </div>

          {/* Detailed Resource Cards */}
          <div className={styles.detailsGrid}>
            {/* Storage Quota */}
            <div className={styles.detailCard}>
              <div className={styles.detailTitle}>
                <span>Virtual Storage (IndexedDB)</span>
                <span className={styles.monoValue}>{storage.usageFormatted} / {storage.quotaFormatted}</span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${Math.max(2, storage.percentUsed)}%`, background: '#34d399' }}
                />
              </div>
              <div className={styles.perfSub}>
                Virtual filesystem usage: {storage.percentUsed}%
              </div>
            </div>

            {/* Battery / Power */}
            <div className={styles.detailCard}>
              <div className={styles.detailTitle}>
                <span>System Power Architecture</span>
                <span className={styles.monoValue}>{battery.level}% ({battery.statusText})</span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${battery.level}%`, background: battery.charging ? '#34d399' : '#fbbf24' }}
                />
              </div>
              <div className={styles.perfSub}>
                Source: {battery.supported ? 'Hardware Battery Controller' : 'AC Desktop Provider'}
              </div>
            </div>
          </div>

          {/* Benchmark Tool */}
          <div className={styles.benchCard}>
            <div className={styles.benchInfo}>
              <div className={styles.benchTitle}>CPU Stress Test & Multi-core Benchmark</div>
              <div className={styles.benchDesc}>Computes 250,000 prime numbers to evaluate frame lag and threading throughput.</div>
            </div>
            <div className={styles.benchActions}>
              {benchScore && <span className={styles.benchResultBadge}>Score: {benchScore} pts</span>}
              <button
                className={styles.benchBtn}
                onClick={runBenchmark}
                disabled={isBenchmarking}
              >
                {isBenchmarking ? 'Computing...' : 'Run Benchmark'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DIAGNOSTICS */}
      {activeTab === 'diagnostics' && (
        <div className={styles.diagPane}>
          <div className={styles.diagHeader}>
            <div className={styles.diagTitle}>System Environment & Hardware Diagnostics</div>
            <button className={styles.refreshDiagBtn} onClick={() => playClick()}>
              <RefreshCwIcon size={12} /> Scan
            </button>
          </div>

          <div className={styles.diagGrid}>
            <div className={styles.diagItem}>
              <span className={styles.diagKey}>Platform Architecture:</span>
              <span className={styles.diagVal}>{typeof navigator !== 'undefined' ? navigator.platform || 'Win32' : 'x86_64'}</span>
            </div>
            <div className={styles.diagItem}>
              <span className={styles.diagKey}>CPU Cores:</span>
              <span className={styles.diagVal}>{typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8} Threads</span>
            </div>
            <div className={styles.diagItem}>
              <span className={styles.diagKey}>Display Resolution:</span>
              <span className={styles.diagVal}>{window.innerWidth} × {window.innerHeight} (Scale: {window.devicePixelRatio}x)</span>
            </div>
            <div className={styles.diagItem}>
              <span className={styles.diagKey}>Network State:</span>
              <span className={styles.diagVal}>{navigator.onLine ? 'Connected (Online)' : 'Offline'}</span>
            </div>
            <div className={styles.diagItem}>
              <span className={styles.diagKey}>Browser Host:</span>
              <span className={styles.diagVal}>{typeof navigator !== 'undefined' ? navigator.vendor || 'Chromium' : 'Chromium'}</span>
            </div>
            <div className={styles.diagItem}>
              <span className={styles.diagKey}>Web Audio Engine:</span>
              <span className={styles.diagVal}>Operational (44.1kHz Stereo)</span>
            </div>
            <div className={styles.diagItem}>
              <span className={styles.diagKey}>Local Storage Engine:</span>
              <span className={styles.diagVal}>IndexedDB + localStorage (Active)</span>
            </div>
            <div className={styles.diagItem}>
              <span className={styles.diagKey}>Billighost Kernel:</span>
              <span className={styles.diagVal}>v3.2 Enterprise Edition</span>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className={styles.statusBar}>
        <span>Open Applications: {windows.length}</span>
        <span>Telemetry Refresh: 1000ms</span>
        <span>Billighost Diagnostics Engine</span>
      </div>
    </div>
  );
}
