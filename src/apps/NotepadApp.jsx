import { useState, useEffect, useCallback } from 'react';
import { VFS } from '../services/storage/indexedDB';
import styles from './NotepadApp.module.css';

export default function NotepadApp({
  filePath: initialFilePath = null,
  initialContent = '',
  playClick = () => {},
}) {
  const [filePath, setFilePath] = useState(initialFilePath);
  const [content, setContent] = useState(initialContent);
  const [isSaved, setIsSaved] = useState(true);
  const [saveStatus, setSaveStatus] = useState(initialFilePath ? 'Saved' : 'New File');

  const loadFile = useCallback(async (path) => {
    try {
      const text = await VFS.readFile(path);
      setContent(text);
      setIsSaved(true);
      setSaveStatus('Saved');
    } catch (err) {
      setContent(`// Error loading file: ${err.message}`);
    }
  }, []);

  useEffect(() => {
    if (initialFilePath) {
      loadFile(initialFilePath);
    }
  }, [initialFilePath, loadFile]);

  const handleTextChange = (e) => {
    setContent(e.target.value);
    setIsSaved(false);
    setSaveStatus('Unsaved changes');
  };

  const handleSave = async () => {
    playClick();
    let targetPath = filePath;
    if (!targetPath) {
      targetPath = prompt('Enter path to save file:', '/Users/User/Desktop/untitled.txt');
      if (!targetPath) return;
      setFilePath(targetPath);
    }

    try {
      await VFS.writeFile(targetPath, content);
      setIsSaved(true);
      setSaveStatus('Saved');
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    }
  };

  const handleSaveAs = async () => {
    playClick();
    const newPath = prompt('Save As path:', filePath || '/Users/User/Documents/file.txt');
    if (!newPath) return;
    try {
      await VFS.writeFile(newPath, content);
      setFilePath(newPath);
      setIsSaved(true);
      setSaveStatus('Saved');
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    }
  };

  const handleNew = () => {
    playClick();
    if (!isSaved && !confirm('Discard unsaved changes?')) return;
    setFilePath(null);
    setContent('');
    setIsSaved(true);
    setSaveStatus('New File');
  };

  const lines = content.split('\n').length;
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const chars = content.length;

  return (
    <div className={styles.notepadContainer}>
      {/* Editor Menu Bar */}
      <div className={styles.menuBar}>
        <div className={styles.fileTitle}>
          <span className={styles.fileIcon}>📝</span>
          <span className={styles.filePathDisplay}>
            {filePath || 'Untitled Document'} {!isSaved && '●'}
          </span>
        </div>

        <div className={styles.menuActions}>
          <button className={styles.menuBtn} onClick={handleNew} title="New Document">
            New
          </button>
          <button className={`${styles.menuBtn} ${!isSaved ? styles.btnHighlight : ''}`} onClick={handleSave} title="Save to virtual filesystem">
            Save
          </button>
          <button className={styles.menuBtn} onClick={handleSaveAs} title="Save copy to path">
            Save As...
          </button>
        </div>
      </div>

      {/* Main Text Area */}
      <textarea
        value={content}
        onChange={handleTextChange}
        placeholder="Start typing your notes, code, or markdown here..."
        className={styles.textArea}
        spellCheck={false}
      />

      {/* Status Bar */}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span className={!isSaved ? styles.statusUnsaved : styles.statusSaved}>
            {saveStatus}
          </span>
        </div>
        <div className={styles.statusRight}>
          <span>Lines: {lines}</span>
          <span>Words: {words}</span>
          <span>Chars: {chars}</span>
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  );
}
