import { useState, useEffect, useCallback, useRef } from 'react';
import { VFS } from '../services/storage/indexedDB';
import { NotificationService } from '../services/notificationService';
import {
  ArrowUpIcon, HomeIcon, TrashIcon, RefreshIcon,
  FolderIcon, FileIcon, FileTextIcon,
  PlusIcon, DownloadIcon, UploadIcon, RecycleIcon,
} from '../components/Icons';
import styles from './FileManagerApp.module.css';

export default function FileManagerApp({
  initialPath = '/Users/User',
  onOpenFile,
  playClick = () => {},
  osModal = null,
}) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  const loadDirectory = useCallback(async (path) => {
    setLoading(true);
    try {
      const list = await VFS.listDirectory(path);
      setItems(list);
      setSelectedItem(null);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDirectory(currentPath);
    const handleUpdate = () => loadDirectory(currentPath);
    window.addEventListener('billighost:vfs-update', handleUpdate);
    return () => window.removeEventListener('billighost:vfs-update', handleUpdate);
  }, [currentPath, loadDirectory]);

  const handleNavigateUp = () => {
    playClick();
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const upPath = parts.length === 0 ? '/' : '/' + parts.join('/');
    setCurrentPath(upPath);
  };

  const handleOpenItem = (item) => {
    playClick();
    if (item.type === 'dir') {
      setCurrentPath(item.path);
    } else {
      if (onOpenFile) {
        onOpenFile(item.path, item.name);
      }
    }
  };

  const handleCreateNewFile = async () => {
    playClick();
    let fileName;
    if (osModal) {
      fileName = await osModal.showPrompt('Enter new file name:', 'untitled.txt', 'New File');
    } else {
      fileName = 'untitled.txt';
    }
    if (!fileName) return;
    const targetPath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;
    await VFS.writeFile(targetPath, '');
  };

  const handleCreateNewFolder = async () => {
    playClick();
    let folderName;
    if (osModal) {
      folderName = await osModal.showPrompt('Enter new folder name:', 'New_Folder', 'New Folder');
    } else {
      folderName = 'New_Folder';
    }
    if (!folderName) return;
    const targetPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`;
    await VFS.createDirectory(targetPath);
  };

  const handleDeleteSelected = async () => {
    if (!selectedItem) return;
    playClick();
    if (currentPath === '/Users/User/.trash') {
      let doDelete = true;
      if (osModal) {
        doDelete = await osModal.showConfirm(`Permanently delete ${selectedItem.name}?`, 'Delete Forever');
      }
      if (doDelete) {
        await VFS.deleteNode(selectedItem.path);
        NotificationService.send({
          title: 'Permanently Deleted',
          message: `Removed "${selectedItem.name}" forever`,
          type: 'warning',
        });
        setSelectedItem(null);
      }
    } else {
      let doTrash = true;
      if (osModal) {
        doTrash = await osModal.showConfirm(`Move ${selectedItem.name} to Recycle Bin?`, 'Move to Trash');
      }
      if (doTrash) {
        await VFS.moveToTrash(selectedItem.path);
        NotificationService.send({
          title: 'Moved to Recycle Bin',
          message: `"${selectedItem.name}" was moved to the Recycle Bin`,
          type: 'info',
        });
        setSelectedItem(null);
      }
    }
  };

  const handleRestoreSelected = async () => {
    if (!selectedItem) return;
    playClick();
    try {
      const restored = await VFS.restoreFromTrash(selectedItem.path);
      NotificationService.send({
        title: 'Item Restored',
        message: `Restored "${restored.name}" to ${restored.parentPath}`,
        type: 'success',
      });
      setSelectedItem(null);
    } catch (err) {
      if (osModal) {
        await osModal.showAlert(`Could not restore: ${err.message}`, 'Error');
      }
    }
  };

  const handleExportSelected = async () => {
    if (!selectedItem || selectedItem.type !== 'file') return;
    playClick();
    await VFS.exportFile(selectedItem.path);
  };

  const handleUploadFromPC = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playClick();
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const content = ev.target.result;
      const targetPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
      await VFS.writeFile(targetPath, content, file.type || 'text/plain');
    };
    reader.readAsText(file);
  };

  return (
    <div className={styles.container}>
      {/* Top Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.navControls}>
          <button
            className={styles.toolBtn}
            onClick={handleNavigateUp}
            disabled={currentPath === '/'}
            title="Up one folder"
          >
            <ArrowUpIcon size={14} />
          </button>
          <button
            className={styles.toolBtn}
            onClick={() => { playClick(); setCurrentPath('/Users/User'); }}
            title="Go to Home"
          >
            <HomeIcon size={14} />
          </button>
          <button
            className={styles.toolBtn}
            onClick={() => { playClick(); setCurrentPath('/Users/User/.trash'); }}
            title="Go to Recycle Bin"
          >
            <TrashIcon size={14} />
          </button>
          <button
            className={styles.toolBtn}
            onClick={() => loadDirectory(currentPath)}
            title="Refresh folder"
          >
            <RefreshIcon size={14} />
          </button>
        </div>

        {/* Address Bar */}
        <div className={styles.addressBar}>
          <span className={styles.addressIcon}>
            {currentPath === '/Users/User/.trash' ? <TrashIcon size={13} /> : <FolderIcon size={13} />}
          </span>
          <span className={styles.addressText}>{currentPath}</span>
        </div>

        <div className={styles.actionControls}>
          <button className={styles.toolBtn} onClick={handleCreateNewFile} title="New File">
            <FileIcon size={13} /><PlusIcon size={10} />
          </button>
          <button className={styles.toolBtn} onClick={handleCreateNewFolder} title="New Folder">
            <FolderIcon size={13} /><PlusIcon size={10} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUploadFromPC}
            style={{ display: 'none' }}
          />
          <button
            className={styles.toolBtn}
            onClick={() => fileInputRef.current?.click()}
            title="Import file from your PC to browser storage"
          >
            <DownloadIcon size={13} /> Import
          </button>
          {selectedItem && currentPath === '/Users/User/.trash' && (
            <button
              className={styles.toolBtn}
              onClick={handleRestoreSelected}
              title="Restore to original folder"
            >
              <RecycleIcon size={13} /> Restore
            </button>
          )}
          {selectedItem && selectedItem.type === 'file' && (
            <button className={styles.toolBtn} onClick={handleExportSelected} title="Download to PC">
              <UploadIcon size={13} /> Export
            </button>
          )}
          {selectedItem && (
            <button className={`${styles.toolBtn} ${styles.btnDanger}`} onClick={handleDeleteSelected} title="Delete">
              <TrashIcon size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      <div
        className={styles.itemsGrid}
        onClick={() => setSelectedItem(null)}
      >
        {loading ? (
          <div className={styles.loadingMsg}>Reading virtual directory...</div>
        ) : items.length === 0 ? (
          <div className={styles.emptyMsg}>This folder is empty. Create a file or folder above!</div>
        ) : (
          items.map((item) => (
            <div
              key={item.path}
              className={`${styles.itemCard} ${selectedItem?.path === item.path ? styles.itemSelected : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedItem(item);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                handleOpenItem(item);
              }}
            >
              <div className={styles.itemIcon}>
                {item.type === 'dir' ? <FolderIcon size={24} /> : item.name.endsWith('.md') ? <FileTextIcon size={24} /> : <FileIcon size={24} />}
              </div>
              <div className={styles.itemName} title={item.name}>{item.name}</div>
              <div className={styles.itemMeta}>
                {item.type === 'dir' ? 'Folder' : `${Math.round((item.size || 0) / 1024 * 10) / 10} KB`}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Status Bar */}
      <div className={styles.statusBar}>
        <span>{items.length} items</span>
        {selectedItem && <span>Selected: {selectedItem.name} ({selectedItem.type === 'dir' ? 'Folder' : `${selectedItem.size} bytes`})</span>}
      </div>
    </div>
  );
}
