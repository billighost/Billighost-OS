import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { VFS } from '../services/storage/indexedDB';
import { NotificationService } from '../services/notificationService';
import {
  FileTextIcon, SaveIcon, SearchIcon,
} from '../components/Icons';
import styles from './CodeEditorApp.module.css';

/**
 * Enhanced syntax highlighter for JavaScript, TypeScript, Python, HTML, CSS, JSON, SQL, Markdown
 */
function highlightCode(code, lang) {
  if (!code) return '';

  const escapeHtml = (str) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  if (lang === 'javascript' || lang === 'typescript' || lang === 'json' || lang === 'html') {
    const tokenRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b(?:const|let|var|function|return|if|else|for|while|import|export|from|as|default|class|extends|new|this|typeof|async|await|try|catch|throw|switch|case|break|interface|type)\b)|(\b(?:true|false|null|undefined)\b)|(\b\d+(?:\.\d+)?\b)/g;

    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(code)) !== null) {
      result += escapeHtml(code.slice(lastIndex, match.index));
      lastIndex = tokenRegex.lastIndex;

      const [full, comment, string, keyword, bool, number] = match;
      if (comment) {
        result += `<span class="token-comment">${escapeHtml(comment)}</span>`;
      } else if (string) {
        result += `<span class="token-string">${escapeHtml(string)}</span>`;
      } else if (keyword) {
        result += `<span class="token-keyword">${escapeHtml(keyword)}</span>`;
      } else if (bool) {
        result += `<span class="token-boolean">${escapeHtml(bool)}</span>`;
      } else if (number) {
        result += `<span class="token-number">${escapeHtml(number)}</span>`;
      } else {
        result += escapeHtml(full);
      }
    }
    result += escapeHtml(code.slice(lastIndex));
    return result;
  }

  if (lang === 'python') {
    const tokenRegex = /(#[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b(?:def|class|return|if|elif|else|for|while|import|from|as|try|except|finally|with|pass|break|continue|lambda|yield|self)\b)|(\b(?:True|False|None)\b)|(\b\d+(?:\.\d+)?\b)/g;

    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(code)) !== null) {
      result += escapeHtml(code.slice(lastIndex, match.index));
      lastIndex = tokenRegex.lastIndex;

      const [full, comment, string, keyword, bool, number] = match;
      if (comment) {
        result += `<span class="token-comment">${escapeHtml(comment)}</span>`;
      } else if (string) {
        result += `<span class="token-string">${escapeHtml(string)}</span>`;
      } else if (keyword) {
        result += `<span class="token-keyword">${escapeHtml(keyword)}</span>`;
      } else if (bool) {
        result += `<span class="token-boolean">${escapeHtml(bool)}</span>`;
      } else if (number) {
        result += `<span class="token-number">${escapeHtml(number)}</span>`;
      } else {
        result += escapeHtml(full);
      }
    }
    result += escapeHtml(code.slice(lastIndex));
    return result;
  }

  if (lang === 'css') {
    const tokenRegex = /(\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|([a-zA-Z-]+(?=\s*:))|(\b\d+(?:px|rem|em|%|vh|vw|ms|s)?\b)|(\b(?:var|calc|rgba?|hsl|linear-gradient|important)\b)/g;

    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(code)) !== null) {
      result += escapeHtml(code.slice(lastIndex, match.index));
      lastIndex = tokenRegex.lastIndex;

      const [full, comment, string, property, number, keyword] = match;
      if (comment) {
        result += `<span class="token-comment">${escapeHtml(comment)}</span>`;
      } else if (string) {
        result += `<span class="token-string">${escapeHtml(string)}</span>`;
      } else if (property) {
        result += `<span class="token-property">${escapeHtml(property)}</span>`;
      } else if (number) {
        result += `<span class="token-number">${escapeHtml(number)}</span>`;
      } else if (keyword) {
        result += `<span class="token-keyword">${escapeHtml(keyword)}</span>`;
      } else {
        result += escapeHtml(full);
      }
    }
    result += escapeHtml(code.slice(lastIndex));
    return result;
  }

  if (lang === 'sql') {
    const tokenRegex = /(--[^\n]*)|('(?:\\.|[^'\\])*')|(\b(?:SELECT|FROM|WHERE|INSERT|INTO|UPDATE|DELETE|JOIN|LEFT|RIGHT|INNER|GROUP|BY|ORDER|HAVING|LIMIT|CREATE|TABLE|DROP|ALTER)\b)/gi;

    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(code)) !== null) {
      result += escapeHtml(code.slice(lastIndex, match.index));
      lastIndex = tokenRegex.lastIndex;

      const [full, comment, string, keyword] = match;
      if (comment) {
        result += `<span class="token-comment">${escapeHtml(comment)}</span>`;
      } else if (string) {
        result += `<span class="token-string">${escapeHtml(string)}</span>`;
      } else if (keyword) {
        result += `<span class="token-keyword">${escapeHtml(keyword)}</span>`;
      } else {
        result += escapeHtml(full);
      }
    }
    result += escapeHtml(code.slice(lastIndex));
    return result;
  }

  if (lang === 'markdown') {
    const tokenRegex = /(^#{1,6}\s+[^\n]+)|(\*\*[^*]+?\*\*)|(`[^`]+?`)/gm;
    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(code)) !== null) {
      result += escapeHtml(code.slice(lastIndex, match.index));
      lastIndex = tokenRegex.lastIndex;

      const [full, heading, bold, inlineCode] = match;
      if (heading) {
        result += `<span class="token-keyword">${escapeHtml(heading)}</span>`;
      } else if (bold) {
        result += `<span class="token-property">${escapeHtml(bold)}</span>`;
      } else if (inlineCode) {
        result += `<span class="token-string">${escapeHtml(inlineCode)}</span>`;
      } else {
        result += escapeHtml(full);
      }
    }
    result += escapeHtml(code.slice(lastIndex));
    return result;
  }

  return escapeHtml(code);
}

function detectLanguage(filePath) {
  if (!filePath) return 'javascript';
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) return 'javascript';
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) return 'typescript';
  if (filePath.endsWith('.py')) return 'python';
  if (filePath.endsWith('.css')) return 'css';
  if (filePath.endsWith('.json')) return 'json';
  if (filePath.endsWith('.html')) return 'html';
  if (filePath.endsWith('.sql')) return 'sql';
  if (filePath.endsWith('.md')) return 'markdown';
  return 'javascript';
}

export default function CodeEditorApp({
  filePath: initialFilePath = null,
  playClick = () => {},
  osModal,
}) {
  // 1. Multi-file tabs
  const [tabs, setTabs] = useState([
    {
      id: 'tab-1',
      path: initialFilePath || '/Users/User/Documents/system_script.js',
      content: '',
      originalContent: '',
      language: detectLanguage(initialFilePath || '/Users/User/Documents/system_script.js'),
    },
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const currentPath = activeTab.path;
  const content = activeTab.content;
  const language = activeTab.language;

  // Editor configuration
  const [theme, setTheme] = useState('themeCyberDark'); // 'themeCyberDark' | 'themeDracula' | 'themeMonokai' | 'themeSynthwave'
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [indentSize, setIndentSize] = useState(2);
  const [wordWrap, setWordWrap] = useState(false);

  // 2. Find and Replace state
  const [showFind, setShowFind] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);

  const findMatchesCount = useMemo(() => {
    if (!findQuery.trim()) return 0;
    try {
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      const matches = content.match(regex);
      return matches ? matches.length : 0;
    } catch {
      return 0;
    }
  }, [findQuery, content, caseSensitive]);

  // 3. Interactive Code Runner Output Console
  const [showConsole, setShowConsole] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);

  const textareaRef = useRef(null);
  const gutterRef = useRef(null);
  const syntaxRef = useRef(null);

  const updateActiveTab = useCallback((updater) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? updater(t) : t));
  }, [activeTabId]);

  // Load file from VFS
  const loadFileIntoActiveTab = useCallback(async (path) => {
    try {
      const resolved = await VFS.resolvePath(path);
      const node = await VFS.getNode(resolved);
      if (node && node.type === 'file') {
        updateActiveTab(t => ({
          ...t,
          path: node.path,
          content: node.content || '',
          originalContent: node.content || '',
          language: detectLanguage(node.path),
        }));
      }
    } catch {
      NotificationService.send({
        title: 'Editor Error',
        message: `Could not load file at ${path}`,
        type: 'error',
      });
    }
  }, [updateActiveTab]);

  useEffect(() => {
    const target = initialFilePath || '/Users/User/Documents/system_script.js';
    const timer = setTimeout(() => {
      loadFileIntoActiveTab(target);
    }, 0);
    return () => clearTimeout(timer);
  }, [initialFilePath, loadFileIntoActiveTab]);

  // Synchronize scroll between textarea, syntax layer, and gutter
  const handleScroll = () => {
    if (!textareaRef.current) return;
    const { scrollTop, scrollLeft } = textareaRef.current;
    if (gutterRef.current) gutterRef.current.scrollTop = scrollTop;
    if (syntaxRef.current) {
      syntaxRef.current.scrollTop = scrollTop;
      syntaxRef.current.scrollLeft = scrollLeft;
    }
  };

  const updateCursorPos = () => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const textBefore = content.substring(0, pos);
    const lines = textBefore.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    setCursorPos({ line, col });
  };

  // Smart Typing Assistance (Auto-close brackets, auto-indent)
  const handleKeyDown = (e) => {
    // Save shortcut: Ctrl+S or Cmd+S
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
      return;
    }

    // Run shortcut: Ctrl+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunCode();
      return;
    }

    // Find shortcut: Ctrl+F
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      setShowFind(prev => !prev);
      return;
    }

    // Tab key Indent
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const indentStr = ' '.repeat(indentSize);
      const newContent = content.substring(0, start) + indentStr + content.substring(end);
      updateActiveTab(t => ({ ...t, content: newContent }));
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + indentSize;
          updateCursorPos();
        }
      }, 0);
      return;
    }

    // Auto-close brackets and quotes
    const pairs = { '(': ')', '{': '}', '[': ']', '"': '"', "'": "'", '`': '`' };
    if (pairs[e.key]) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newContent = content.substring(0, start) + e.key + pairs[e.key] + content.substring(end);
      e.preventDefault();
      updateActiveTab(t => ({ ...t, content: newContent }));
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1;
          updateCursorPos();
        }
      }, 0);
    }
  };

  // 4. Code Execution & Script Runner
  const handleRunCode = () => {
    playClick();
    setShowConsole(true);
    const logs = [];

    const customConsole = {
      log: (...args) => logs.push({ type: 'log', text: args.map(String).join(' ') }),
      warn: (...args) => logs.push({ type: 'warn', text: args.map(String).join(' ') }),
      error: (...args) => logs.push({ type: 'error', text: args.map(String).join(' ') }),
      info: (...args) => logs.push({ type: 'info', text: args.map(String).join(' ') }),
    };

    try {
      // Execute within sandbox function passing custom console
      const runFn = new Function('console', `'use strict'; ${content}`);
      const returnVal = runFn(customConsole);
      if (returnVal !== undefined) {
        logs.push({ type: 'return', text: `=> ${JSON.stringify(returnVal)}` });
      }
      if (logs.length === 0) {
        logs.push({ type: 'info', text: 'Script executed successfully with zero output.' });
      }
    } catch (err) {
      logs.push({ type: 'error', text: `${err.name}: ${err.message}` });
    }

    setConsoleLogs(logs);
  };

  // 5. Code Formatter / Prettifier
  const handleFormatCode = () => {
    playClick();
    try {
      if (language === 'json') {
        const parsed = JSON.parse(content);
        const formatted = JSON.stringify(parsed, null, indentSize);
        updateActiveTab(t => ({ ...t, content: formatted }));
        NotificationService.send({ title: 'Code Formatter', message: 'Formatted JSON cleanly', type: 'success' });
      } else {
        // Smart indentation based on braces
        const lines = content.split('\n');
        let currentIndent = 0;
        const formattedLines = lines.map(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
            currentIndent = Math.max(0, currentIndent - 1);
          }
          const indented = ' '.repeat(currentIndent * indentSize) + trimmed;
          if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(')) {
            currentIndent++;
          }
          return indented;
        });
        updateActiveTab(t => ({ ...t, content: formattedLines.join('\n') }));
        NotificationService.send({ title: 'Code Formatter', message: 'Indentation standardized', type: 'success' });
      }
    } catch (err) {
      NotificationService.send({ title: 'Format Failed', message: err.message, type: 'error' });
    }
  };



  const handleReplaceOne = () => {
    playClick();
    if (!findQuery) return;
    const flags = caseSensitive ? '' : 'i';
    const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    const newContent = content.replace(regex, replaceQuery);
    updateActiveTab(t => ({ ...t, content: newContent }));
  };

  const handleReplaceAll = () => {
    playClick();
    if (!findQuery) return;
    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    const newContent = content.replace(regex, replaceQuery);
    updateActiveTab(t => ({ ...t, content: newContent }));
  };

  // Save File
  const handleSave = async () => {
    playClick();
    if (!currentPath) {
      handleSaveAs();
      return;
    }

    try {
      const mime = language === 'javascript' ? 'application/javascript'
        : language === 'css' ? 'text/css'
        : language === 'json' ? 'application/json'
        : 'text/plain';

      await VFS.writeFile(currentPath, content, mime);
      updateActiveTab(t => ({ ...t, originalContent: content }));
      NotificationService.send({
        title: 'File Saved',
        message: `Saved ${currentPath}`,
        type: 'success',
      });
    } catch (err) {
      NotificationService.send({
        title: 'Save Failed',
        message: err.message,
        type: 'error',
      });
    }
  };

  // Save As File
  const handleSaveAs = async () => {
    playClick();
    let defaultName = currentPath ? currentPath.split('/').pop() : 'untitled.js';
    let newPath = '';
    if (osModal) {
      const name = await osModal.showPrompt('Enter new file name:', defaultName, 'Save As');
      if (!name) return;
      newPath = `/Users/User/Documents/${name}`;
    } else {
      newPath = `/Users/User/Documents/${defaultName}`;
    }

    try {
      await VFS.writeFile(newPath, content);
      updateActiveTab(t => ({
        ...t,
        path: newPath,
        originalContent: content,
        language: detectLanguage(newPath),
      }));
      NotificationService.send({
        title: 'File Created',
        message: `Saved as ${newPath}`,
        type: 'success',
      });
    } catch (err) {
      NotificationService.send({
        title: 'Error',
        message: err.message,
        type: 'error',
      });
    }
  };

  // Tab management
  const handleAddTab = () => {
    playClick();
    const newId = `tab-${Date.now()}`;
    const newTab = {
      id: newId,
      path: null,
      content: '// New JavaScript File\n',
      originalContent: '// New JavaScript File\n',
      language: 'javascript',
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

  // Total lines
  const lineCount = useMemo(() => {
    return Math.max(1, content.split('\n').length);
  }, [content]);

  // Highlighted HTML output
  const highlightedHtml = useMemo(() => {
    return highlightCode(content, language);
  }, [content, language]);

  return (
    <div className={`${styles.container} ${styles[theme]}`} data-testid="code-editor-app">
      {/* Tab bar */}
      <div className={styles.tabBar}>
        <div className={styles.tabList}>
          {tabs.map(t => {
            const tabName = t.path ? t.path.split('/').pop() : 'Untitled';
            const isTabDirty = t.content !== t.originalContent;
            return (
              <div
                key={t.id}
                className={`${styles.tabItem} ${t.id === activeTabId ? styles.tabActive : ''}`}
                onClick={() => setActiveTabId(t.id)}
              >
                <span>{tabName}</span>
                {isTabDirty && <span className={styles.dirtyDot} title="Unsaved changes" />}
                {tabs.length > 1 && (
                  <button
                    className={styles.tabCloseBtn}
                    onClick={(e) => handleCloseTab(t.id, e)}
                  >
                    &times;
                  </button>
                )}
              </div>
            );
          })}
          <button className={styles.addTabBtn} onClick={handleAddTab} title="New Editor Tab">
            +
          </button>
        </div>

        <div className={styles.tabBarRight}>
          <button
            className={`${styles.runBtn} ${styles.btnPrimary}`}
            onClick={handleRunCode}
            title="Execute Code (Ctrl+Enter)"
          >
            ▶ Run
          </button>
          <button
            className={styles.toolBtn}
            onClick={handleFormatCode}
            title="Format Code (Beautify)"
          >
            Format
          </button>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.leftGroup}>
          <button className={styles.toolBtn} onClick={handleAddTab} title="Create New Tab">
            <FileTextIcon size={13} /> New
          </button>
          <button className={`${styles.toolBtn} ${styles.btnPrimary}`} onClick={handleSave} title="Save to VFS (Ctrl+S)">
            <SaveIcon size={13} /> Save
          </button>
          <button className={styles.toolBtn} onClick={handleSaveAs} title="Save Copy">
            Save As
          </button>
          <button className={styles.toolBtn} onClick={() => setShowConsole(!showConsole)} title="Toggle Console Drawer">
            Console {consoleLogs.length > 0 && `(${consoleLogs.length})`}
          </button>
        </div>

        <div className={styles.rightGroup}>
          <button
            className={`${styles.toolBtn} ${showFind ? styles.btnPrimary : ''}`}
            onClick={() => setShowFind(p => !p)}
            title="Find & Replace (Ctrl+F)"
          >
            <SearchIcon size={13} /> Find
          </button>
          <select
            className={styles.selectInput}
            value={language}
            onChange={(e) => updateActiveTab(t => ({ ...t, language: e.target.value }))}
            title="Programming Language Mode"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="css">CSS</option>
            <option value="html">HTML</option>
            <option value="json">JSON</option>
            <option value="sql">SQL</option>
            <option value="markdown">Markdown</option>
          </select>
          <select
            className={styles.selectInput}
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            title="Editor Theme"
          >
            <option value="themeCyberDark">Cyber Dark</option>
            <option value="themeDracula">Dracula Glass</option>
            <option value="themeMonokai">Monokai Retro</option>
            <option value="themeSynthwave">SynthWave 84</option>
          </select>
        </div>
      </div>

      {/* Find & Replace Drawer */}
      {showFind && (
        <div className={styles.findBar}>
          <div className={styles.findRow}>
            <SearchIcon size={13} />
            <input
              type="text"
              className={styles.findInput}
              placeholder="Find in file..."
              value={findQuery}
              onChange={(e) => setFindQuery(e.target.value)}
              autoFocus
            />
            <span className={styles.matchBadge}>
              {findQuery ? `${findMatchesCount} matches` : 'Type to search'}
            </span>
            <label className={styles.caseOption}>
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
              />
              Aa
            </label>
            <button className={styles.toolBtn} style={{ padding: '2px 8px' }} onClick={() => setShowFind(false)}>
              &times;
            </button>
          </div>
          <div className={styles.replaceRow}>
            <input
              type="text"
              className={styles.findInput}
              placeholder="Replace with..."
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
            />
            <button className={styles.toolBtn} onClick={handleReplaceOne}>Replace</button>
            <button className={styles.toolBtn} onClick={handleReplaceAll}>Replace All</button>
          </div>
        </div>
      )}

      {/* Editor Workspace */}
      <div className={styles.editorWorkspace}>
        {/* Line Numbers Gutter */}
        <div ref={gutterRef} className={styles.gutter}>
          {Array.from({ length: lineCount }, (_, i) => (
            <span key={i} className={styles.lineNumber}>
              {i + 1}
            </span>
          ))}
        </div>

        {/* Text and Syntax Stack */}
        <div className={styles.editorAreaWrapper}>
          <pre
            ref={syntaxRef}
            className={`${styles.syntaxLayer} ${wordWrap ? styles.wrapLines : ''}`}
            dangerouslySetInnerHTML={{ __html: highlightedHtml + '\n' }}
            aria-hidden="true"
          />
          <textarea
            ref={textareaRef}
            className={`${styles.codeTextarea} ${wordWrap ? styles.wrapLines : ''}`}
            value={content}
            onChange={(e) => updateActiveTab(t => ({ ...t, content: e.target.value }))}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            onKeyUp={updateCursorPos}
            onClick={updateCursorPos}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            data-testid="code-editor-textarea"
          />
        </div>

        {/* Minimap preview bar */}
        <div className={styles.minimap}>
          <div className={styles.minimapContent}>
            {content.slice(0, 1500)}
          </div>
        </div>
      </div>

      {/* Interactive Script Runner Output Drawer */}
      {showConsole && (
        <div className={styles.consoleDrawer}>
          <div className={styles.consoleHeader}>
            <span>Output Console</span>
            <div className={styles.consoleActions}>
              <button className={styles.toolBtn} onClick={() => setConsoleLogs([])}>Clear</button>
              <button className={styles.toolBtn} onClick={() => setShowConsole(false)}>&times;</button>
            </div>
          </div>
          <div className={styles.consoleBody}>
            {consoleLogs.length === 0 ? (
              <div className={styles.emptyConsole}>Press "Run" to execute JavaScript code.</div>
            ) : (
              consoleLogs.map((l, i) => (
                <div key={i} className={`${styles.consoleLine} ${styles['console_' + l.type]}`}>
                  {l.text}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span className={styles.statusItem}>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span className={styles.statusItem}>{lineCount} lines</span>
          <span className={styles.statusItem}>{content.length} chars</span>
        </div>
        <div className={styles.statusRight}>
          <button
            className={styles.statusBtn}
            onClick={() => setIndentSize(s => s === 2 ? 4 : 2)}
          >
            Spaces: {indentSize}
          </button>
          <button
            className={styles.statusBtn}
            onClick={() => setWordWrap(!wordWrap)}
          >
            Wrap: {wordWrap ? 'On' : 'Off'}
          </button>
          <span className={styles.statusItem}>UTF-8</span>
          <span className={styles.statusItem}>{language.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}
