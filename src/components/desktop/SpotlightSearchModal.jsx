import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { VFS } from '../../services/storage/indexedDB';
import {
  SearchIcon, FolderIcon, FileIcon, FileTextIcon, BoltIcon, GlobeIcon,
  PenIcon, MusicNoteIcon, ImageIcon, GridHashIcon, GearIcon,
  ChartBarIcon, TrashIcon, CodeIcon, BrushIcon, CheckIcon,
} from '../Icons';
import styles from './SpotlightSearchModal.module.css';

/**
 * Safely evaluates simple math expressions like "25 * 4", "sqrt(144)", "15% of 800"
 */
function evaluateMath(expression) {
  try {
    let expr = expression.trim().toLowerCase();
    // Support "X% of Y"
    const percentMatch = expr.match(/^(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)$/);
    if (percentMatch) {
      const p = parseFloat(percentMatch[1]);
      const total = parseFloat(percentMatch[2]);
      return (p / 100) * total;
    }

    // Only allow safe math tokens
    if (!/^[0-9+\-*/^().\s%]|sqrt|sin|cos|tan|pi|abs|log$/i.test(expr)) {
      return null;
    }

    // Replace math functions with Math object methods
    expr = expr
      .replace(/\bpi\b/g, `${Math.PI}`)
      .replace(/\bsqrt\(([^)]+)\)/g, 'Math.sqrt($1)')
      .replace(/\bsin\(([^)]+)\)/g, 'Math.sin($1)')
      .replace(/\bcos\(([^)]+)\)/g, 'Math.cos($1)')
      .replace(/\btan\(([^)]+)\)/g, 'Math.tan($1)')
      .replace(/\blog\(([^)]+)\)/g, 'Math.log10($1)')
      .replace(/\babs\(([^)]+)\)/g, 'Math.abs($1)')
      .replace(/\^/g, '**');

    // Safe mathematical function evaluator without access to globals
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expr});`)();
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return Math.round(result * 1000000) / 1000000;
    }
    return null;
  } catch {
    return null;
  }
}

export default function SpotlightSearchModal({
  isOpen,
  onClose,
  onLaunchApp,
  playClick = () => {},
}) {
  const [query, setQuery] = useState('');
  const [vfsResults, setVfsResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedCalc, setCopiedCalc] = useState(false);
  const inputRef = useRef(null);

  // Focus on mount or open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Search VFS nodes with debouncing
  useEffect(() => {
    if (!query.trim()) {
      setVfsResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const matches = await VFS.search(query);
        setVfsResults(matches.slice(0, 8)); // Top 8 VFS matches
      } catch {
        setVfsResults([]);
      }
    }, 120);

    return () => clearTimeout(timeout);
  }, [query]);

  // System Applications Registry
  const ALL_APPS = useMemo(() => [
    { id: 'files', name: 'Files', desc: 'Browse Virtual File System', icon: <FolderIcon size={18} /> },
    { id: 'code', name: 'Code Studio', desc: 'Pro Syntax-Highlighted Code Editor', icon: <CodeIcon size={18} /> },
    { id: 'paint', name: 'Paint Studio', desc: 'Drawing & Canvas Art Studio', icon: <BrushIcon size={18} /> },
    { id: 'terminal', name: 'Terminal', desc: 'Command-Line Shell', icon: <BoltIcon size={18} /> },
    { id: 'browser', name: 'Ghost Browser', desc: 'Web Browser & Search', icon: <GlobeIcon size={18} /> },
    { id: 'notepad', name: 'Notepad', desc: 'Text & Markdown Editor', icon: <PenIcon size={18} /> },
    { id: 'media', name: 'Music', desc: 'Web Audio Synth & Visualizer', icon: <MusicNoteIcon size={18} /> },
    { id: 'gallery', name: 'Gallery', desc: 'Image Viewer', icon: <ImageIcon size={18} /> },
    { id: 'calculator', name: 'Calculator', desc: 'Arithmetic & Scientific Calculator', icon: <GridHashIcon size={18} /> },
    { id: 'settings', name: 'Settings', desc: 'Appearance, Wallpapers & Security', icon: <GearIcon size={18} /> },
    { id: 'monitor', name: 'Task Manager', desc: 'System Telemetry & Processes', icon: <ChartBarIcon size={18} /> },
    { id: 'trash', name: 'Recycle Bin', desc: 'Deleted Files & Restoration', icon: <TrashIcon size={18} /> },
  ], []);

  // System Settings Quick Shortcuts
  const SETTINGS_SHORTCUTS = useMemo(() => [
    { title: 'Personalize Wallpaper & Themes', desc: 'Configure themes, glow & custom wallpapers', tab: 'appearance' },
    { title: 'Security & PIN Settings', desc: 'Change lock PIN or auto-lock timeout', tab: 'security' },
    { title: 'Audio & Sound Effects', desc: 'Master volume, muting and system sounds', tab: 'sound' },
    { title: 'Storage Quota & VFS', desc: 'Inspect IndexedDB storage and capacity', tab: 'storage' },
    { title: 'User Profile & Identity', desc: 'Configure user name, email & avatar', tab: 'profile' },
  ], []);

  // Compute math result if applicable
  const mathResult = useMemo(() => {
    if (!query.trim() || query.trim().length < 2) return null;
    return evaluateMath(query);
  }, [query]);

  // Aggregate results
  const items = useMemo(() => {
    const list = [];
    const q = query.trim().toLowerCase();

    // 1. Math Calculation Result
    if (mathResult !== null) {
      list.push({
        id: 'calc-result',
        category: 'Calculation',
        title: `${query} = ${mathResult}`,
        desc: 'Click or press Enter to copy result',
        icon: <GridHashIcon size={18} />,
        badge: 'Math',
        action: () => {
          navigator.clipboard.writeText(`${mathResult}`);
          setCopiedCalc(true);
          setTimeout(() => setCopiedCalc(false), 1500);
        },
      });
    }

    // 2. Filtered Apps
    const matchingApps = ALL_APPS.filter(app =>
      !q || app.name.toLowerCase().includes(q) || app.desc.toLowerCase().includes(q)
    );
    matchingApps.forEach(app => {
      list.push({
        id: `app-${app.id}`,
        category: 'Applications',
        title: app.name,
        desc: app.desc,
        icon: app.icon,
        badge: 'App',
        action: () => {
          onLaunchApp(app.id, app.name, null);
          onClose();
        },
      });
    });

    // 3. VFS Files Results
    if (vfsResults.length > 0) {
      vfsResults.forEach(file => {
        let icon = <FileIcon size={18} />;
        if (file.name.endsWith('.js') || file.name.endsWith('.css') || file.name.endsWith('.json')) {
          icon = <CodeIcon size={18} />;
        } else if (file.name.endsWith('.svg') || file.name.endsWith('.png') || file.name.endsWith('.jpg')) {
          icon = <ImageIcon size={18} />;
        } else if (file.name.endsWith('.md')) {
          icon = <FileTextIcon size={18} />;
        }

        list.push({
          id: `vfs-${file.path}`,
          category: 'Files & Documents',
          title: file.name,
          desc: file.path,
          icon,
          badge: file.type === 'dir' ? 'Folder' : 'File',
          action: () => {
            if (file.name.endsWith('.svg') || file.name.endsWith('.png') || file.name.endsWith('.jpg')) {
              onLaunchApp('gallery', file.name, null, { filePath: file.path });
            } else if (file.name.endsWith('.js') || file.name.endsWith('.css') || file.name.endsWith('.json') || file.name.endsWith('.html')) {
              onLaunchApp('code', file.name, null, { filePath: file.path });
            } else {
              onLaunchApp('notepad', file.name, null, { filePath: file.path });
            }
            onClose();
          },
        });
      });
    }

    // 4. Settings Shortcuts
    const matchingSettings = SETTINGS_SHORTCUTS.filter(s =>
      !q || s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q)
    );
    matchingSettings.forEach(setting => {
      list.push({
        id: `setting-${setting.tab}`,
        category: 'Settings',
        title: setting.title,
        desc: setting.desc,
        icon: <GearIcon size={18} />,
        badge: 'Setting',
        action: () => {
          onLaunchApp('settings', 'Settings', null, { activeTab: setting.tab });
          onClose();
        },
      });
    });

    // 5. Fallback Web Search Shortcut
    if (q) {
      list.push({
        id: 'web-search',
        category: 'Web',
        title: `Search DuckDuckGo for "${query}"`,
        desc: 'Opens web results in Ghost Browser',
        icon: <GlobeIcon size={18} />,
        badge: 'Web',
        action: () => {
          onLaunchApp('browser', 'Ghost Browser', null, { initialQuery: query });
          onClose();
        },
      });
    }

    return list;
  }, [query, mathResult, ALL_APPS, vfsResults, SETTINGS_SHORTCUTS, onLaunchApp, onClose]);

  // Reset index when results list updates
  useEffect(() => {
    setSelectedIndex(0);
  }, [items.length]);

  const executeItem = useCallback((item) => {
    playClick();
    if (item?.action) {
      item.action();
    }
  }, [playClick]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, items.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + items.length) % Math.max(1, items.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIndex]) {
        executeItem(items[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  let lastCategory = null;

  return (
    <div className={styles.overlay} onClick={onClose} data-testid="spotlight-overlay">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} data-testid="spotlight-modal">
        {/* Search Header */}
        <div className={styles.searchHeader}>
          <span className={styles.searchIconWrapper}>
            <SearchIcon size={20} />
          </span>
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Search apps, files, settings, or calculate (e.g. 24 * 7)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            data-testid="spotlight-input"
          />
          {query && (
            <button className={styles.clearBtn} onClick={() => setQuery('')} title="Clear search">
              &times;
            </button>
          )}
          <span className={styles.escHint}>ESC</span>
        </div>

        {/* Results Stream */}
        <div className={styles.resultsList} data-testid="spotlight-results">
          {items.map((item, index) => {
            const showCategory = item.category !== lastCategory;
            lastCategory = item.category;

            return (
              <div key={item.id}>
                {showCategory && (
                  <div className={styles.resultCategory}>{item.category}</div>
                )}
                <div
                  className={`${styles.resultItem} ${index === selectedIndex ? styles.resultItemActive : ''}`}
                  onClick={() => executeItem(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  data-testid={`spotlight-item-${index}`}
                >
                  <div className={`${styles.resultIcon} ${item.badge === 'Math' ? styles.calcIcon : ''}`}>
                    {item.badge === 'Math' && copiedCalc ? <CheckIcon size={16} /> : item.icon}
                  </div>
                  <div className={styles.resultContent}>
                    <div className={styles.resultTitle}>{item.title}</div>
                    <div className={styles.resultDesc}>{item.desc}</div>
                  </div>
                  <span className={styles.resultBadge}>{item.badge}</span>
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <div className={styles.noResults}>No matches found for &quot;{query}&quot;</div>
          )}
        </div>

        {/* Footer info bar */}
        <div className={styles.footerBar}>
          <div className={styles.shortcutsHint}>
            <span className={styles.shortcutItem}><kbd className={styles.kbd}>↑</kbd><kbd className={styles.kbd}>↓</kbd> Navigate</span>
            <span className={styles.shortcutItem}><kbd className={styles.kbd}>↵</kbd> Open</span>
            <span className={styles.shortcutItem}><kbd className={styles.kbd}>esc</kbd> Dismiss</span>
          </div>
          <span>Billighost Universal Spotlight</span>
        </div>
      </div>
    </div>
  );
}
