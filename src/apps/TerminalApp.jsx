import { useState, useRef, useEffect } from 'react';
import { VFS } from '../services/storage/indexedDB';
import { useBattery } from '../hooks/useBattery';
import { useNetwork } from '../hooks/useNetwork';
import { useStorageQuota } from '../hooks/useStorageQuota';
import styles from './TerminalApp.module.css';

export default function TerminalApp({ onLock, onRestart }) {
  const [currentDir, setCurrentDir] = useState('/Users/User');
  const [history, setHistory] = useState([
    { type: 'system', text: 'Billighost OS Shell [Version 1.0.0]' },
    { type: 'system', text: 'Type "help" for a list of commands, or "neofetch" for system telemetry.\n' },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [cmdHistory, setCmdHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const terminalEndRef = useRef(null);
  const inputRef = useRef(null);

  const battery = useBattery();
  const network = useNetwork();
  const storage = useStorageQuota();

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleCommand = async (cmdLine) => {
    const trimmed = cmdLine.trim();
    if (!trimmed) return;

    setCmdHistory(prev => [...prev, trimmed]);
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
  ls [path]      - List directory contents
  cd <path>      - Change working directory
  pwd            - Print working directory
  cat <file>     - Display file contents
  touch <file>   - Create an empty file
  mkdir <dir>    - Create a new directory
  rm <path>      - Remove a file or directory
  sysinfo        - Detailed real-time hardware telemetry
  neofetch       - Cyberpunk telemetry summary banner
  storage        - Display IndexedDB & browser storage quota
  battery        - Display real Web Battery API telemetry
  network        - Display real Network Information API status
  clear          - Clear the terminal screen
  echo [text]    - Print text to terminal
  date           - Display current date and time
  help           - Show this help menu`,
        });
        break;

      case 'clear':
        setHistory([]);
        return;

      case 'pwd':
        newHistory.push({ type: 'output', text: currentDir });
        break;

      case 'cd': {
        const target = args[0];
        if (!target || target === '~') {
          setCurrentDir('/Users/User');
        } else if (target === '..') {
          const parts = currentDir.split('/').filter(Boolean);
          parts.pop();
          setCurrentDir(parts.length === 0 ? '/' : '/' + parts.join('/'));
        } else {
          let resolved = target.startsWith('/') ? target : `${currentDir === '/' ? '' : currentDir}/${target}`;
          if (resolved.endsWith('/') && resolved.length > 1) resolved = resolved.slice(0, -1);
          try {
            const node = await VFS.getNode(resolved);
            if (node && node.type === 'dir') {
              setCurrentDir(resolved);
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
        const targetDir = args[0]
          ? (args[0].startsWith('/') ? args[0] : `${currentDir === '/' ? '' : currentDir}/${args[0]}`)
          : currentDir;
        try {
          const items = await VFS.listDirectory(targetDir);
          if (items.length === 0) {
            newHistory.push({ type: 'output', text: '(empty directory)' });
          } else {
            const formatted = items
              .map(i => `${i.type === 'dir' ? '📁 ' : '📄 '} ${i.name.padEnd(20)} ${i.type === 'dir' ? '<DIR>' : (i.size + ' B')}`)
              .join('\n');
            newHistory.push({ type: 'output', text: formatted });
          }
        } catch {
          newHistory.push({ type: 'error', text: `ls: cannot access '${args[0] || targetDir}'` });
        }
        break;
      }

      case 'cat': {
        if (!args[0]) {
          newHistory.push({ type: 'error', text: 'cat: missing file operand' });
        } else {
          const filePath = args[0].startsWith('/') ? args[0] : `${currentDir === '/' ? '' : currentDir}/${args[0]}`;
          try {
            const content = await VFS.readFile(filePath);
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
          const filePath = args[0].startsWith('/') ? args[0] : `${currentDir === '/' ? '' : currentDir}/${args[0]}`;
          try {
            await VFS.writeFile(filePath, '');
            newHistory.push({ type: 'output', text: `Created file: ${filePath}` });
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
          const dirPath = args[0].startsWith('/') ? args[0] : `${currentDir === '/' ? '' : currentDir}/${args[0]}`;
          try {
            await VFS.createDirectory(dirPath);
            newHistory.push({ type: 'output', text: `Created directory: ${dirPath}` });
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
          const targetPath = args[0].startsWith('/') ? args[0] : `${currentDir === '/' ? '' : currentDir}/${args[0]}`;
          try {
            await VFS.deleteNode(targetPath);
            newHistory.push({ type: 'output', text: `Removed: ${targetPath}` });
          } catch (err) {
            newHistory.push({ type: 'error', text: `rm: ${err.message}` });
          }
        }
        break;
      }

      case 'trash': {
        if (!args[0]) {
          newHistory.push({ type: 'error', text: 'trash: missing operand' });
        } else {
          const targetPath = args[0].startsWith('/') ? args[0] : `${currentDir === '/' ? '' : currentDir}/${args[0]}`;
          try {
            await VFS.moveToTrash(targetPath);
            newHistory.push({ type: 'output', text: `Moved to Recycle Bin: ${targetPath}` });
          } catch (err) {
            newHistory.push({ type: 'error', text: `trash: ${err.message}` });
          }
        }
        break;
      }

      case 'restore': {
        if (!args[0]) {
          newHistory.push({ type: 'error', text: 'restore: missing operand' });
        } else {
          const trashPath = args[0].startsWith('/') ? args[0] : `/Users/User/.trash/${args[0]}`;
          try {
            const restored = await VFS.restoreFromTrash(trashPath);
            newHistory.push({ type: 'output', text: `Restored ${restored.name} to ${restored.parentPath}` });
          } catch (err) {
            newHistory.push({ type: 'error', text: `restore: ${err.message}` });
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
  RTT Latency: ${network.rtt} ms
  Data Saver: ${network.saveData ? 'On' : 'Off'}`,
        });
        break;

      case 'storage':
        newHistory.push({
          type: 'output',
          text: `[Virtual & Browser Storage]
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
     / /\\ \\    OS: Billighost OS 1.0 (Web Architecture)
    / /  \\ \\   Host: Browser Sandbox (Chromium / V8)
   /_/    \\_\\  CPU: ${navigator.hardwareConcurrency || 8} Logical Cores
               Memory: ${navigator.deviceMemory ? navigator.deviceMemory + ' GB' : 'Allocated in Browser'}
               Resolution: ${window.screen.width}x${window.screen.height}
               Storage: ${storage.usageFormatted} / ${storage.quotaFormatted} (${storage.percentUsed}%)
               Battery: ${battery.level}% (${battery.statusText})
               Network: ${network.isOnline ? network.effectiveType.toUpperCase() + ' (' + network.downlink + ' Mbps)' : 'Offline'}
               Shell: billighost-sh 1.0`,
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

    setHistory(newHistory);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCommand(inputVal);
      setInputVal('');
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
    }
  };

  return (
    <div className={styles.terminalContainer} onClick={() => inputRef.current?.focus()}>
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
  );
}
