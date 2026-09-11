import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { VFS } from '../services/storage/indexedDB';
import { NotificationService } from '../services/notificationService';
import {
  FileTextIcon, SaveIcon, UploadIcon, SearchIcon,
} from '../components/Icons';
import styles from './CodeEditorApp.module.css';

/**
 * Lightweight syntax highlighter that converts code string into styled HTML spans
 */
function highlightCode(code, lang) {
  if (!code) return '';

  const escapeHtml = (str) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  if (lang === 'javascript' || lang === 'json' || lang === 'html') {
    const tokenRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b(?:const|let|var|function|return|if|else|for|while|import|export|from|as|default|class|extends|new|this|typeof|async|await|try|catch|throw|switch|case|break)\b)|(\b(?:true|false|null|undefined)\b)|(\b\d+(?:\.\d+)?\b)/g;

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
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.ts')) return 'javascript';
  if (filePath.endsWith('.css')) return 'css';
  if (filePath.endsWith('.json')) return 'json';
  if (filePath.endsWith('.html')) return 'html';
  if (filePath.endsWith('.md')) return 'markdown';
  return 'javascript';
}

export default function CodeEditorApp({
  filePath: initialFilePath = null,
  playClick = () => {},
  osModal,
}) {
  const [currentPath, setCurrentPath] = useState(initialFilePath);
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [language, setLanguage] = useState(() => detectLanguage(initialFilePath));
  const [theme, setTheme] = useState('themeCyberDark'); // 'themeCyberDark' | 'themeDracula' | 'themeMonokai'
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [showFind, setShowFind] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findMatchesCount, setFindMatchesCount] = useState(0);

  const textareaRef = useRef(null);
  const gutterRef = useRef(null);
  const syntaxRef = useRef(null);

  const isDirty = content !== originalContent;

  // Load file from VFS on init
  const loadFile = useCallback(async (path) => {
    try {
      const node = await VFS.getNode(path);
      if (node && node.type === 'file') {
        setCurrentPath(path);
        setContent(node.content || '');
        setOriginalContent(node.content || '');
        setLanguage(detectLanguage(path));
      }
    } catch {
      NotificationService.send({
        title: 'Editor Error',
        message: `Could not load file at ${path}`,
        type: 'error',
      });
    }
  }, []);

  useEffect(() => {
    if (initialFilePath) {
      loadFile(initialFilePath);
    } else {
      // Default sample file
      loadFile('/Users/User/Documents/system_script.js');
    }
  }, [initialFilePath, loadFile]);

  // Synchronize scroll between textarea, syntax layer, and line numbers gutter
  const handleScroll = () => {
    if (!textareaRef.current) return;
    const { scrollTop, scrollLeft } = textareaRef.current;
    if (gutterRef.current) gutterRef.current.scrollTop = scrollTop;
    if (syntaxRef.current) {
      syntaxRef.current.scrollTop = scrollTop;
      syntaxRef.current.scrollLeft = scrollLeft;
    }
  };

  // Cursor position tracking
  const updateCursorPos = () => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const textBefore = content.substring(0, pos);
    const lines = textBefore.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    setCursorPos({ line, col });
  };

  // Handle Tab key indentation & bracket auto-closing
  const handleKeyDown = (e) => {
    // Save shortcut: Ctrl+S or Cmd+S
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
      return;
    }

    // Find shortcut: Ctrl+F
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      setShowFind(prev => !prev);
      return;
    }

    // Tab key
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      setContent(newContent);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
          updateCursorPos();
        }
      }, 0);
    }
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
      setOriginalContent(content);
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
      setCurrentPath(newPath);
      setOriginalContent(content);
      setLanguage(detectLanguage(newPath));
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

  // Export File to local disk
  const handleExport = () => {
    playClick();
    if (!currentPath) return;
    VFS.exportFile(currentPath).catch(err => {
      NotificationService.send({ title: 'Export Failed', message: err.message, type: 'error' });
    });
  };

  // New File
  const handleNewFile = () => {
    playClick();
    setCurrentPath(null);
    setContent('');
    setOriginalContent('');
    setLanguage('javascript');
  };

  // Open existing VFS file
  const handleOpenPrompt = async () => {
    playClick();
    try {
      const files = await VFS.search('');
      const codeFiles = files.filter(f => f.type === 'file');
      if (codeFiles.length === 0) {
        if (osModal) await osModal.showAlert('No files found in VFS.', 'Open File');
        return;
      }
      // Simple prompt or pick first
      if (osModal) {
        const path = await osModal.showPrompt(
          `Enter path to open (e.g. ${codeFiles[0].path}):`,
          codeFiles[0].path,
          'Open File from VFS'
        );
        if (path) loadFile(path);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Find occurrences
  useEffect(() => {
    if (!findQuery.trim()) {
      setFindMatchesCount(0);
      return;
    }
    const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = content.match(regex);
    setFindMatchesCount(matches ? matches.length : 0);
  }, [findQuery, content]);

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
      {/* Action Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.leftGroup}>
          <button className={styles.toolBtn} onClick={handleNewFile} title="Create New Document">
            <FileTextIcon size={13} /> New
          </button>
          <button className={styles.toolBtn} onClick={handleOpenPrompt} title="Open File from VFS">
            <UploadIcon size={13} /> Open
          </button>
          <button className={`${styles.toolBtn} ${styles.btnPrimary}`} onClick={handleSave} title="Save to VFS (Ctrl+S)">
            <SaveIcon size={13} /> Save
          </button>
          <button className={styles.toolBtn} onClick={handleSaveAs} title="Save Copy">
            Save As
          </button>
          <button className={styles.toolBtn} onClick={handleExport} title="Download file to computer">
            Export
          </button>
          <div className={styles.fileIndicator}>
            <span>{currentPath ? currentPath.split('/').pop() : 'Untitled'}</span>
            {isDirty && <span className={styles.dirtyDot} title="Unsaved changes" />}
          </div>
        </div>

        <div className={styles.rightGroup}>
          <button
            className={`${styles.toolBtn} ${showFind ? styles.btnPrimary : ''}`}
            onClick={() => setShowFind(p => !p)}
            title="Find (Ctrl+F)"
          >
            <SearchIcon size={13} />
          </button>
          <select
            className={styles.selectInput}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            title="Programming Language Mode"
          >
            <option value="javascript">JavaScript</option>
            <option value="css">CSS</option>
            <option value="html">HTML</option>
            <option value="json">JSON</option>
            <option value="markdown">Markdown</option>
          </select>
          <select
            className={styles.selectInput}
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            title="Editor Color Theme"
          >
            <option value="themeCyberDark">Cyber Dark</option>
            <option value="themeDracula">Dracula Glass</option>
            <option value="themeMonokai">Monokai Retro</option>
          </select>
        </div>
      </div>

      {/* Find Toolbar */}
      {showFind && (
        <div className={styles.findBar}>
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
          <button className={styles.toolBtn} style={{ padding: '2px 8px' }} onClick={() => setShowFind(false)}>
            &times;
          </button>
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
            className={styles.syntaxLayer}
            dangerouslySetInnerHTML={{ __html: highlightedHtml + '\n' }}
            aria-hidden="true"
          />
          <textarea
            ref={textareaRef}
            className={styles.codeTextarea}
            value={content}
            onChange={(e) => setContent(e.target.value)}
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
      </div>

      {/* Status Bar */}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span className={styles.statusItem}>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span className={styles.statusItem}>{lineCount} lines</span>
          <span className={styles.statusItem}>{content.length} chars</span>
        </div>
        <div className={styles.statusRight}>
          <span className={styles.statusItem}>Spaces: 2</span>
          <span className={styles.statusItem}>UTF-8</span>
          <span className={styles.statusItem}>{language.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}
