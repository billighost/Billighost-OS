import { useState, useRef, useEffect, useCallback } from 'react';
import { VFS } from '../services/storage/indexedDB';
import { useBattery } from '../hooks/useBattery';
import { useNetwork } from '../hooks/useNetwork';
import { useStorageQuota } from '../hooks/useStorageQuota';
import styles from './TerminalApp.module.css';

const COMMAND_LIST = [
  'help', 'ls', 'cd', 'pwd', 'cat', 'touch', 'mkdir', 'rm',
  'neofetch', 'sysinfo', 'matrix', 'js', 'calc', 'cowsay',
  'uptime', 'whoami', 'ping', 'curl', 'theme', 'battery',
  'network', 'storage', 'date', 'echo', 'clear', 'reboot', 'lock'
];

export default function TerminalApp({ onLock, onRestart }) {
  // Multi-tab terminal sessions
  const [tabs, setTabs] = useState([
    {
      id: 'tab-1',
      title: 'bash 1',
      dir: '/Users/User',
      history: [
        { type: 'system', text: 'Billighost OS Multi-Session Shell [v1.2.0]' },
        { type: 'system', text: 'Type "help" for commands, "matrix" for cyber stream, or press Tab to autocomplete.\n' },
      ],
      cmdHistory: [],
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');

  // Active tab state helpers
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const currentDir = activeTab.dir;
  const history = activeTab.history;
  const cmdHistory = activeTab.cmdHistory;

  const [inputVal, setInputVal] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [terminalTheme, setTerminalTheme] = useState('matrix'); // 'matrix' | 'cyberpunk' | 'tokyonight' | 'monokai' | 'retro'
  const [fontSize, setFontSize] = useState('medium'); // 'small' | 'medium' | 'large'
  const [scanlines, setScanlines] = useState(false);
  const [isMatrixRunning, setIsMatrixRunning] = useState(false);

  const terminalEndRef = useRef(null);
  const inputRef = useRef(null);
  const matrixCanvasRef = useRef(null);
  const matrixAnimRef = useRef(null);

  const battery = useBattery();
  const network = useNetwork();
  const storage = useStorageQuota();

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isMatrixRunning]);

  // Matrix Rain canvas effect
  useEffect(() => {
    if (!isMatrixRunning || !matrixCanvasRef.current) return;
    const canvas = matrixCanvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    const chars = '0123456789ABCDEFﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ';
    const fontSizePx = 14;
    const cols = Math.floor(canvas.width / fontSizePx);
    const drops = Array(cols).fill(1);

    const render = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#00ff66';
      ctx.font = `${fontSizePx}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars.charAt(Math.floor(Math.random() * chars.length));
        ctx.fillText(text, i * fontSizePx, drops[i] * fontSizePx);

        if (drops[i] * fontSizePx > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      matrixAnimRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (matrixAnimRef.current) cancelAnimationFrame(matrixAnimRef.current);
    };
  }, [isMatrixRunning]);

  const updateActiveTab = useCallback((updater) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? updater(t) : t));
  }, [activeTabId]);

  const handleAddTab = () => {
    const newId = `tab-${Date.now()}`;
    const newTab = {
      id: newId,
      title: `bash ${tabs.length + 1}`,
      dir: '/Users/User',
      history: [
        { type: 'system', text: `Session ${tabs.length + 1} initialized in browser sandbox.` },
      ],
      cmdHistory: [],
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (tabId, e) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    setTabs(prev => prev.filter(t => t.id !== tabId));
    if (activeTabId === tabId) {
      const remaining = tabs.filter(t => t.id !== tabId);
      setActiveTabId(remaining[0].id);
    }
  };

  // Case-Insensitive Tab Autocompletion
  const handleTabComplete = async () => {
    const trimmed = inputVal.trimStart();
    const parts = trimmed.split(' ');

    if (parts.length === 1) {
      // Autocomplete command name
      const prefix = parts[0].toLowerCase();
      const match = COMMAND_LIST.find(cmd => cmd.startsWith(prefix));
      if (match) {
        setInputVal(match + ' ');
      }
    } else {
      // Autocomplete directory or file path case-insensitively
      const cmd = parts[0];
      const arg = parts.slice(1).join(' ');
      try {
        const lastSlash = arg.lastIndexOf('/');
        let targetDir = currentDir;
        let filePrefix = arg;

        if (lastSlash !== -1) {
          const rawDir = arg.substring(0, lastSlash) || '/';
          targetDir = await VFS.resolvePath(rawDir, currentDir);
          filePrefix = arg.substring(lastSlash + 1);
        }

        const items = await VFS.listDirectory(targetDir);
        const match = items.find(i => i.name.toLowerCase().startsWith(filePrefix.toLowerCase()));
        if (match) {
          const completedArg = lastSlash !== -1 ? `${arg.substring(0, lastSlash)}/${match.name}` : match.name;
          setInputVal(`${cmd} ${completedArg}${match.type === 'dir' ? '/' : ' '}`);
        }
      } catch {
        // ignore
      }
    }
  };

  const handleCommand = async (cmdLine) => {
    const trimmed = cmdLine.trim();
    if (!trimmed) return;

    updateActiveTab(t => ({
      ...t,
      cmdHistory: [...t.cmdHistory, trimmed]
    }));
    setHistoryIndex(-1);

    const parts = trimmed.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    const newHistory = [...history, { type: 'input', text: `user@billighost:${currentDir}$ ${trimmed}` }];

    switch (cmd) {
      case 'help':
        newHistory.push({
          type: 'output',
          text: `Available commands:
  ls [path]         - List directory contents (case-insensitive)
  cd <path>         - Change directory (case-insensitive: "cd desktop" works!)
  pwd               - Print working directory
  cat <file>        - Display file contents
  touch <file>      - Create an empty file
  mkdir <dir>       - Create a new directory
  rm <path>         - Remove a file or directory
  matrix            - Toggle digital Matrix rain animation
  js <expr>         - Evaluate JavaScript expression in sandbox
  calc <math>       - Quick arithmetic calculation (e.g. calc 24 * 18)
  cowsay <text>     - Retro ASCII cow speech
  uptime            - Show current session uptime
  whoami            - Display current user identity
  ping <host>       - Simulate network ICMP echo packets
  curl <url>        - Fetch mock or external endpoint metadata
  theme <name>      - Switch theme (matrix, cyberpunk, tokyonight, monokai, retro)
  neofetch          - Cyberpunk telemetry summary banner
  sysinfo           - Detailed real-time hardware telemetry
  storage           - Virtual filesystem & cache quota
  battery           - Real Web Battery API telemetry
  network           - Real Network Information API status
  clear             - Clear terminal screen
  echo [text]       - Print text to screen
  date              - Show current date & time
  lock              - Lock OS desktop session
  reboot            - Restart Billighost OS`,
        });
        break;

      case 'clear':
        updateActiveTab(t => ({ ...t, history: [] }));
        return;

      case 'matrix':
        setIsMatrixRunning(prev => !prev);
        newHistory.push({
          type: 'system',
          text: !isMatrixRunning ? 'Matrix rain protocol initialized. Type "matrix" to exit.' : 'Matrix rain terminated.',
        });
        break;

      case 'pwd':
        newHistory.push({ type: 'output', text: currentDir });
        break;

      case 'theme': {
        const tName = args[0]?.toLowerCase();
        if (['matrix', 'cyberpunk', 'tokyonight', 'monokai', 'retro'].includes(tName)) {
          setTerminalTheme(tName);
          newHistory.push({ type: 'output', text: `Terminal theme set to "${tName}".` });
        } else {
          newHistory.push({ type: 'error', text: 'Usage: theme <matrix | cyberpunk | tokyonight | monokai | retro>' });
        }
        break;
      }

      case 'js': {
        const code = args.join(' ');
        if (!code) {
          newHistory.push({ type: 'error', text: 'Usage: js <javascript expression>' });
        } else {
          try {
            // eslint-disable-next-line no-new-func
            const result = Function(`'use strict'; return (${code})`)();
            newHistory.push({
              type: 'output',
              text: result !== undefined ? String(result) : 'undefined',
            });
          } catch (err) {
            newHistory.push({ type: 'error', text: `JS Error: ${err.message}` });
          }
        }
        break;
      }

      case 'calc': {
        const expr = args.join(' ');
        if (!expr) {
          newHistory.push({ type: 'error', text: 'Usage: calc <expression>' });
        } else {
          try {
            const sanitized = expr.replace(/[^0-9+\-*/().^%]/g, '');
            // eslint-disable-next-line no-new-func
            const result = Function(`'use strict'; return (${sanitized})`)();
            newHistory.push({ type: 'output', text: `= ${result}` });
          } catch {
            newHistory.push({ type: 'error', text: 'calc: invalid expression' });
          }
        }
        break;
      }

      case 'cowsay': {
        const text = args.join(' ') || 'Billighost OS is elite.';
        const line = '-'.repeat(text.length + 2);
        newHistory.push({
          type: 'output',
          text: ` ${line}
< ${text} >
 ${line}
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||`,
        });
        break;
      }

      case 'uptime':
        newHistory.push({
          type: 'output',
          text: `up ${Math.round(performance.now() / 1000)} seconds, 1 user, load average: 0.24, 0.18, 0.12`,
        });
        break;

      case 'whoami':
        newHistory.push({ type: 'output', text: 'user@billighost (Root Administrator)' });
        break;

      case 'ping': {
        const host = args[0] || '127.0.0.1';
        newHistory.push({
          type: 'output',
          text: `PING ${host}: 56 data bytes
64 bytes from ${host}: icmp_seq=0 ttl=64 time=${(Math.random() * 8 + 4).toFixed(2)} ms
64 bytes from ${host}: icmp_seq=1 ttl=64 time=${(Math.random() * 8 + 4).toFixed(2)} ms
64 bytes from ${host}: icmp_seq=2 ttl=64 time=${(Math.random() * 8 + 4).toFixed(2)} ms
--- ${host} ping statistics ---
3 packets transmitted, 3 received, 0% packet loss`,
        });
        break;
      }

      case 'curl': {
        const url = args[0] || 'https://billighost.internal/api/health';
        newHistory.push({
          type: 'output',
          text: `Fetching ${url}...\nHTTP/2 200 OK\nserver: Billighost-Gateway/1.2\ncontent-type: application/json\n\n{"status":"healthy","kernel":"Browser-V8","storage":"IndexedDB-Active"}`,
        });
        break;
      }

      case 'cd': {
        const target = args[0];
        if (!target || target === '~') {
          updateActiveTab(t => ({ ...t, dir: '/Users/User' }));
        } else if (target === '..') {
          const partsArr = currentDir.split('/').filter(Boolean);
          partsArr.pop();
          const upDir = partsArr.length === 0 ? '/' : '/' + partsArr.join('/');
          updateActiveTab(t => ({ ...t, dir: upDir }));
        } else {
          // Case-insensitive resolution!
          try {
            const resolved = await VFS.resolvePath(target, currentDir);
            const node = await VFS.getNode(resolved);
            if (node && node.type === 'dir') {
              updateActiveTab(t => ({ ...t, dir: node.path }));
            } else {
              newHistory.push({ type: 'error', text: `cd: no such directory: ${target}` });
            }
          } catch {
            newHistory.push({ type: 'error', text: `cd: error opening ${target}` });
          }
        }
        break;
      }

      case 'ls': {
        const rawTarget = args[0];
        let targetDir = currentDir;
        if (rawTarget) {
          targetDir = await VFS.resolvePath(rawTarget, currentDir);
        }
        try {
          const items = await VFS.listDirectory(targetDir);
          if (items.length === 0) {
            newHistory.push({ type: 'output', text: '(empty directory)' });
          } else {
            const formatted = items
              .map(i => `${i.type === 'dir' ? '📁 ' : '📄 '} ${i.name.padEnd(24)} ${i.type === 'dir' ? '<DIR>' : (i.size + ' B')}`)
              .join('\n');
            newHistory.push({ type: 'output', text: formatted });
          }
        } catch {
          newHistory.push({ type: 'error', text: `ls: cannot access '${rawTarget || targetDir}'` });
        }
        break;
      }

      case 'cat': {
        if (!args[0]) {
          newHistory.push({ type: 'error', text: 'cat: missing file operand' });
        } else {
          try {
            const resolved = await VFS.resolvePath(args[0], currentDir);
            const content = await VFS.readFile(resolved);
            newHistory.push({ type: 'output', text: content });
          } catch (err) {
            newHistory.push({ type: 'error', text: `cat: ${err.message}` });
          }
        }
        break;
      }

      case 'touch': {
        if (!args[0]) {
          newHistory.push({ type: 'error', text: 'touch: missing file operand' });
        } else {
          try {
            const resolved = await VFS.resolvePath(args[0], currentDir);
            await VFS.writeFile(resolved, '');
            newHistory.push({ type: 'output', text: `Created file: ${resolved}` });
          } catch (err) {
            newHistory.push({ type: 'error', text: `touch: ${err.message}` });
          }
        }
        break;
      }

      case 'mkdir': {
        if (!args[0]) {
          newHistory.push({ type: 'error', text: 'mkdir: missing directory name' });
        } else {
          try {
            const resolved = await VFS.resolvePath(args[0], currentDir);
            await VFS.createDirectory(resolved);
            newHistory.push({ type: 'output', text: `Created directory: ${resolved}` });
          } catch (err) {
            newHistory.push({ type: 'error', text: `mkdir: ${err.message}` });
          }
        }
        break;
      }

      case 'rm': {
        if (!args[0]) {
          newHistory.push({ type: 'error', text: 'rm: missing operand' });
        } else {
          try {
            const resolved = await VFS.resolvePath(args[0], currentDir);
            await VFS.deleteNode(resolved);
            newHistory.push({ type: 'output', text: `Removed: ${resolved}` });
          } catch (err) {
            newHistory.push({ type: 'error', text: `rm: ${err.message}` });
          }
        }
        break;
      }

      case 'battery':
        newHistory.push({
          type: 'output',
          text: `[Battery Telemetry]
  Level: ${battery.level}%
  State: ${battery.statusText}
  Power: ${battery.charging ? 'AC Connected' : 'Battery Discharging'}
  Source: ${battery.supported ? 'Web Battery API' : 'AC Desktop Fallback'}`,
        });
        break;

      case 'network':
        newHistory.push({
          type: 'output',
          text: `[Network Telemetry]
  Online: ${network.isOnline ? 'Yes' : 'No'}
  Connection: ${network.effectiveType.toUpperCase()} (${network.type})
  Downlink: ${network.downlink} Mbps
  RTT Latency: ${network.rtt} ms`,
        });
        break;

      case 'storage':
        newHistory.push({
          type: 'output',
          text: `[Virtual Storage Quota]
  Used: ${storage.usageFormatted}
  Quota: ${storage.quotaFormatted}
  Utilization: ${storage.percentUsed}%
  Database: billighost_os_vfs (IndexedDB)`,
        });
        break;

      case 'neofetch':
      case 'sysinfo':
        newHistory.push({
          type: 'output',
          text: `
        /\\      user@billighost
       /  \\     ---------------
      / /\\ \\    OS: Billighost OS 1.2 (Web Architecture)
     / /  \\ \\   Host: Browser Sandbox (Chromium / V8)
    /_/    \\_\\  CPU: ${navigator.hardwareConcurrency || 8} Cores
                Memory: ${navigator.deviceMemory ? navigator.deviceMemory + ' GB' : 'Browser Heap'}
                Storage: ${storage.usageFormatted} / ${storage.quotaFormatted} (${storage.percentUsed}%)
                Battery: ${battery.level}% (${battery.statusText})
                Network: ${network.isOnline ? network.effectiveType.toUpperCase() + ' (' + network.downlink + ' Mbps)' : 'Offline'}
                Shell: billighost-sh 1.2`,
        });
        break;

      case 'date':
        newHistory.push({ type: 'output', text: new Date().toString() });
        break;

      case 'echo':
        newHistory.push({ type: 'output', text: args.join(' ') });
        break;

      case 'lock':
        newHistory.push({ type: 'output', text: 'Locking session...' });
        if (onLock) onLock();
        break;

      case 'reboot':
      case 'restart':
        newHistory.push({ type: 'output', text: 'Restarting system...' });
        if (onRestart) onRestart();
        break;

      default:
        newHistory.push({ type: 'error', text: `command not found: ${cmd}. Type "help" for a list of commands.` });
        break;
    }

    updateActiveTab(t => ({ ...t, history: newHistory }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCommand(inputVal);
      setInputVal('');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleTabComplete();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length > 0) {
        const nextIdx = historyIndex + 1 < cmdHistory.length ? historyIndex + 1 : historyIndex;
        setHistoryIndex(nextIdx);
        setInputVal(cmdHistory[cmdHistory.length - 1 - nextIdx] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputVal(cmdHistory[cmdHistory.length - 1 - nextIdx] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputVal('');
      }
    } else if (e.ctrlKey && e.key === 'c') {
      newHistoryEntry(`^C`);
      setInputVal('');
    }
  };

  const newHistoryEntry = (text) => {
    updateActiveTab(t => ({
      ...t,
      history: [...t.history, { type: 'system', text }]
    }));
  };

  const handleCopyOutput = () => {
    const text = history.map(h => h.text).join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div
      className={`${styles.terminalContainer} ${styles[terminalTheme]} ${styles[fontSize]} ${scanlines ? styles.scanlines : ''}`}
      onClick={() => inputRef.current?.focus()}
      data-testid="terminal-app"
    >
      {/* Session Tabs Bar */}
      <div className={styles.tabBar}>
        <div className={styles.tabList}>
          {tabs.map(t => (
            <div
              key={t.id}
              className={`${styles.tabItem} ${t.id === activeTabId ? styles.tabActive : ''}`}
              onClick={() => setActiveTabId(t.id)}
            >
              <span>{t.title}</span>
              {tabs.length > 1 && (
                <button
                  className={styles.tabCloseBtn}
                  onClick={(e) => handleCloseTab(t.id, e)}
                  title="Close session"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
          <button className={styles.addTabBtn} onClick={handleAddTab} title="New terminal session">
            +
          </button>
        </div>

        {/* Quick Toolbar */}
        <div className={styles.toolbarRight}>
          <select
            className={styles.themeSelect}
            value={terminalTheme}
            onChange={(e) => setTerminalTheme(e.target.value)}
            title="Color Scheme"
          >
            <option value="matrix">Matrix Green</option>
            <option value="cyberpunk">Cyberpunk Neon</option>
            <option value="tokyonight">Tokyo Night</option>
            <option value="monokai">Monokai Retro</option>
            <option value="retro">Amber CRT</option>
          </select>
          <select
            className={styles.themeSelect}
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value)}
            title="Font Size"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
          <button
            className={`${styles.toolBtn} ${scanlines ? styles.toolBtnActive : ''}`}
            onClick={() => setScanlines(!scanlines)}
            title="Toggle CRT Scanlines"
          >
            CRT
          </button>
          <button
            className={styles.toolBtn}
            onClick={handleCopyOutput}
            title="Copy entire buffer to clipboard"
          >
            Copy
          </button>
          <button
            className={styles.toolBtn}
            onClick={() => updateActiveTab(t => ({ ...t, history: [] }))}
            title="Clear buffer"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Terminal Viewport / Canvas Layer */}
      <div className={styles.viewport}>
        {isMatrixRunning && (
          <canvas ref={matrixCanvasRef} className={styles.matrixCanvas} />
        )}

        <div className={styles.outputArea}>
          {history.map((entry, idx) => (
            <div
              key={idx}
              className={`${styles.line} ${styles['line_' + entry.type]}`}
            >
              {entry.text}
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>

        <div className={styles.inputPromptRow}>
          <span className={styles.promptLabel}>user@billighost:{currentDir}$</span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            className={styles.termInput}
            autoFocus
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
