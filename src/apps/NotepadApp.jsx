import { useState, useEffect, useRef } from 'react';
import { VFS } from '../services/storage/indexedDB';
import { NotificationService } from '../services/notificationService';
import { PenIcon, SaveIcon, FileTextIcon } from '../components/Icons';
import styles from './NotepadApp.module.css';

const FONT_OPTIONS = [
  { name: 'Monospace', value: '"JetBrains Mono", Consolas, monospace' },
  { name: 'Sans-Serif', value: 'Inter, system-ui, sans-serif' },
  { name: 'Serif (Editorial)', value: 'Georgia, "Times New Roman", serif' },
];

export default function NotepadApp({
  filePath: initialFilePath = null,
  initialContent = '',
  playClick = () => {},
  osModal = null,
}) {
  const [filePath, setFilePath] = useState(initialFilePath);
  const [content, setContent] = useState(initialContent);
  const [isSaved, setIsSaved] = useState(true);
  const [saveStatus, setSaveStatus] = useState(initialFilePath ? 'Saved' : 'New Document');

  // View modes: 'edit' | 'split' | 'preview'
  const [viewMode, setViewMode] = useState('edit');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);

  // Typography
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].value);
  const [fontSize, setFontSize] = useState(14);

  // Find and replace
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);

  // Auto-save draft
  const [autoSave, setAutoSave] = useState(true);
  const textAreaRef = useRef(null);


  useEffect(() => {
    let isMounted = true;
    if (initialFilePath) {
      VFS.readFile(initialFilePath)
        .then((text) => {
          if (isMounted) {
            setContent(text);
            setIsSaved(true);
            setSaveStatus('Saved');
          }
        })
        .catch((err) => {
          if (isMounted) {
            setContent(`// Error loading file: ${err.message}`);
          }
        });
    }
    return () => { isMounted = false; };
  }, [initialFilePath]);

  // Auto-save timer
  useEffect(() => {
    if (!autoSave || isSaved || !filePath) return;
    const timer = setTimeout(async () => {
      try {
        await VFS.writeFile(filePath, content);
        setIsSaved(true);
        setSaveStatus('Auto-saved');
      } catch {}
    }, 2000);
    return () => clearTimeout(timer);
  }, [content, isSaved, filePath, autoSave]);

  const handleTextChange = (e) => {
    setContent(e.target.value);
    setIsSaved(false);
    setSaveStatus('Unsaved changes');
  };

  // Tab key indents spaces
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textAreaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = content;
      const next = val.substring(0, start) + '  ' + val.substring(end);
      setContent(next);
      setIsSaved(false);
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      }, 0);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (e.shiftKey) handleSaveAs();
      else handleSave();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      setShowFindReplace(p => !p);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      setViewMode(v => v === 'preview' ? 'edit' : (v === 'edit' ? 'split' : 'preview'));
    }
  };

  const handleSave = async () => {
    playClick();
    let targetPath = filePath;
    if (!targetPath) {
      if (osModal) {
        targetPath = await osModal.showPrompt('Enter path to save file:', '/Users/User/Documents/untitled.txt', 'Save File');
      } else {
        targetPath = '/Users/User/Documents/untitled.txt';
      }
      if (!targetPath) return;
      setFilePath(targetPath);
    }

    try {
      await VFS.writeFile(targetPath, content);
      setIsSaved(true);
      setSaveStatus('Saved');
      NotificationService.send({
        title: 'File Saved',
        message: `Saved ${targetPath.split('/').pop()}`,
        type: 'success',
      });
    } catch (err) {
      if (osModal) {
        await osModal.showAlert(`Save failed: ${err.message}`, 'Error');
      }
    }
  };

  const handleSaveAs = async () => {
    playClick();
    let newPath;
    if (osModal) {
      newPath = await osModal.showPrompt('Save As path:', filePath || '/Users/User/Documents/file.txt', 'Save As');
    } else {
      newPath = filePath || '/Users/User/Documents/file.txt';
    }
    if (!newPath) return;
    try {
      await VFS.writeFile(newPath, content);
      setFilePath(newPath);
      setIsSaved(true);
      setSaveStatus('Saved');
      NotificationService.send({
        title: 'Saved As New File',
        message: `Saved ${newPath.split('/').pop()}`,
        type: 'success',
      });
    } catch (err) {
      if (osModal) {
        await osModal.showAlert(`Save failed: ${err.message}`, 'Error');
      }
    }
  };

  const handleNew = async () => {
    playClick();
    if (!isSaved) {
      if (osModal) {
        const discard = await osModal.showConfirm('Discard unsaved changes?', 'New Document');
        if (!discard) return;
      }
    }
    setFilePath(null);
    setContent('');
    setIsSaved(true);
    setSaveStatus('New Document');
  };

  // Find & Replace actions
  const handleReplaceOne = () => {
    playClick();
    if (!findQuery) return;
    const regex = new RegExp(findQuery, isCaseSensitive ? 'm' : 'im');
    setContent(c => c.replace(regex, replaceQuery));
    setIsSaved(false);
  };

  const handleReplaceAll = () => {
    playClick();
    if (!findQuery) return;
    const regex = new RegExp(findQuery, isCaseSensitive ? 'gm' : 'gim');
    setContent(c => c.replaceAll(regex, replaceQuery));
    setIsSaved(false);
  };

  // Text Transform helpers
  const transformText = (type) => {
    playClick();
    const ta = textAreaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.substring(start, end) || content;

    let transformed = selected;
    if (type === 'upper') transformed = selected.toUpperCase();
    else if (type === 'lower') transformed = selected.toLowerCase();
    else if (type === 'title') transformed = selected.replace(/\b\w/g, c => c.toUpperCase());
    else if (type === 'trim') transformed = selected.split('\n').map(l => l.trimEnd()).join('\n');

    if (start !== end) {
      setContent(c => c.substring(0, start) + transformed + c.substring(end));
    } else {
      setContent(transformed);
    }
    setIsSaved(false);
  };

  // Download / Export to computer
  const handleExport = () => {
    playClick();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath ? filePath.split('/').pop() : 'Document.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Stats calculation
  const lines = content.split('\n');
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const chars = content.length;
  const readingTimeMins = Math.max(1, Math.round(words / 200));

  // Basic Markdown Renderer
  const renderMarkdown = (text) => {
    const rawLines = text.split('\n');
    return rawLines.map((line, idx) => {
      if (line.startsWith('# ')) return <h1 key={idx} className={styles.mdH1}>{line.slice(2)}</h1>;
      if (line.startsWith('## ')) return <h2 key={idx} className={styles.mdH2}>{line.slice(3)}</h2>;
      if (line.startsWith('### ')) return <h3 key={idx} className={styles.mdH3}>{line.slice(4)}</h3>;
      if (line.startsWith('> ')) return <blockquote key={idx} className={styles.mdQuote}>{line.slice(2)}</blockquote>;
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={idx} className={styles.mdLi}>{line.slice(2)}</li>;
      }
      if (line.startsWith('```')) {
        return <pre key={idx} className={styles.mdCodeBlock}>{line.slice(3)}</pre>;
      }
      if (!line.trim()) return <div key={idx} className={styles.mdEmptyLine} />;
      return <p key={idx} className={styles.mdP}>{line}</p>;
    });
  };

  return (
    <div className={styles.notepadContainer} data-testid="notepad-app">
      {/* Top Menu Bar */}
      <div className={styles.menuBar}>
        <div className={styles.fileTitle}>
          <span className={styles.fileIcon}><PenIcon size={14} /></span>
          <span className={styles.filePathDisplay}>
            {filePath ? filePath.split('/').pop() : 'Untitled Document'} {!isSaved && '●'}
          </span>
        </div>

        {/* View Mode Switcher */}
        <div className={styles.modeTabs}>
          <button
            className={`${styles.modeBtn} ${viewMode === 'edit' ? styles.modeBtnActive : ''}`}
            onClick={() => { playClick(); setViewMode('edit'); }}
          >
            Edit
          </button>
          <button
            className={`${styles.modeBtn} ${viewMode === 'split' ? styles.modeBtnActive : ''}`}
            onClick={() => { playClick(); setViewMode('split'); }}
          >
            Split
          </button>
          <button
            className={`${styles.modeBtn} ${viewMode === 'preview' ? styles.modeBtnActive : ''}`}
            onClick={() => { playClick(); setViewMode('preview'); }}
          >
            <FileTextIcon size={12} /> Preview
          </button>
        </div>

        {/* Action Buttons */}
        <div className={styles.menuActions}>
          <button
            className={`${styles.menuBtn} ${showFindReplace ? styles.btnActive : ''}`}
            onClick={() => setShowFindReplace(!showFindReplace)}
            title="Find & Replace (Ctrl+F)"
          >
            Find
          </button>
          <button className={styles.menuBtn} onClick={handleNew} title="New Document (Ctrl+N)">
            New
          </button>
          <button
            className={`${styles.menuBtn} ${!isSaved ? styles.btnHighlight : ''}`}
            onClick={handleSave}
            title="Save (Ctrl+S)"
          >
            <SaveIcon size={12} /> Save
          </button>
          <button className={styles.menuBtn} onClick={handleSaveAs} title="Save Copy As">
            Save As...
          </button>
          <button className={styles.menuBtn} onClick={handleExport} title="Export to PC">
            Export
          </button>
        </div>
      </div>

      {/* Find & Replace Drawer */}
      {showFindReplace && (
        <div className={styles.findReplaceDrawer}>
          <div className={styles.findRow}>
            <input
              type="text"
              placeholder="Find..."
              value={findQuery}
              onChange={(e) => setFindQuery(e.target.value)}
              className={styles.findInput}
            />
            <input
              type="text"
              placeholder="Replace with..."
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              className={styles.findInput}
            />
            <button
              className={`${styles.drawerBtn} ${isCaseSensitive ? styles.btnActive : ''}`}
              onClick={() => setIsCaseSensitive(!isCaseSensitive)}
              title="Match Case"
            >
              Aa
            </button>
            <button className={styles.drawerBtn} onClick={handleReplaceOne}>Replace</button>
            <button className={styles.drawerBtn} onClick={handleReplaceAll}>Replace All</button>
            <button className={styles.closeDrawerBtn} onClick={() => setShowFindReplace(false)}>✕</button>
          </div>
        </div>
      )}

      {/* Typography & Layout Sub-bar */}
      <div className={styles.subBar}>
        <div className={styles.subLeft}>
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className={styles.fontSelect}
          >
            {FONT_OPTIONS.map(f => (
              <option key={f.name} value={f.value}>{f.name}</option>
            ))}
          </select>

          <div className={styles.sizeControl}>
            <button className={styles.sizeBtn} onClick={() => setFontSize(s => Math.max(10, s - 1))}>−</button>
            <span className={styles.sizeBadge}>{fontSize}px</span>
            <button className={styles.sizeBtn} onClick={() => setFontSize(s => Math.min(32, s + 1))}>+</button>
          </div>

          <button
            className={`${styles.toggleBtn} ${showLineNumbers ? styles.btnActive : ''}`}
            onClick={() => setShowLineNumbers(!showLineNumbers)}
          >
            # Numbers
          </button>
          <button
            className={`${styles.toggleBtn} ${wordWrap ? styles.btnActive : ''}`}
            onClick={() => setWordWrap(!wordWrap)}
          >
            Wrap
          </button>
        </div>

        <div className={styles.subRight}>
          <button className={styles.transformBtn} onClick={() => transformText('upper')}>UPPER</button>
          <button className={styles.transformBtn} onClick={() => transformText('lower')}>lower</button>
          <button className={styles.transformBtn} onClick={() => transformText('title')}>Title</button>
          <button className={styles.transformBtn} onClick={() => transformText('trim')}>Trim</button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className={styles.editorWorkspace}>
        {/* EDIT PANE */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={styles.editorPane}>
            {showLineNumbers && (
              <div className={styles.lineGutter}>
                {lines.map((_, i) => (
                  <div key={i} className={styles.lineNumber}>{i + 1}</div>
                ))}
              </div>
            )}
            <textarea
              ref={textAreaRef}
              value={content}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Start writing your thoughts, notes, documentation, or code..."
              className={styles.textArea}
              style={{
                fontFamily,
                fontSize: `${fontSize}px`,
                whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
              }}
              spellCheck={false}
            />
          </div>
        )}

        {/* PREVIEW PANE */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={styles.previewPane}>
            <div className={styles.previewContent}>
              {content.trim() ? renderMarkdown(content) : (
                <div className={styles.emptyPreview}>Markdown preview will appear here as you type...</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span className={!isSaved ? styles.statusUnsaved : styles.statusSaved}>
            {saveStatus}
          </span>
          <button
            className={styles.autoSaveToggle}
            onClick={() => setAutoSave(!autoSave)}
            title="Toggle automatic draft saving"
          >
            Auto-save: {autoSave ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className={styles.statusRight}>
          <span>Lines: {lines.length}</span>
          <span>Words: {words}</span>
          <span>Chars: {chars}</span>
          <span>~{readingTimeMins} min read</span>
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  );
}
