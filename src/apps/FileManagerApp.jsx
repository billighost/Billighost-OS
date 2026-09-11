import { useState, useEffect, useCallback, useRef } from 'react';
import { VFS } from '../services/storage/indexedDB';
import { NotificationService } from '../services/notificationService';
import {
  ArrowUpIcon, HomeIcon, TrashIcon, RefreshIcon,
  FolderIcon, FileIcon, FileTextIcon,
  PlusIcon, DownloadIcon, UploadIcon, RecycleIcon,
} from '../components/Icons';
import styles from './FileManagerApp.module.css';

const QUICK_PLACES = [
  { name: 'Home', path: '/Users/User', icon: '🏠' },
  { name: 'Desktop', path: '/Users/User/Desktop', icon: '🖥️' },
  { name: 'Documents', path: '/Users/User/Documents', icon: '📄' },
  { name: 'Downloads', path: '/Users/User/Downloads', icon: '📥' },
  { name: 'Pictures', path: '/Users/User/Pictures', icon: '🖼️' },
  { name: 'Music', path: '/Users/User/Music', icon: '🎵' },
  { name: 'Recycle Bin', path: '/Users/User/.trash', icon: '🗑️' },
  { name: 'System Root', path: '/', icon: '💾' },
];

export default function FileManagerApp({
  initialPath = '/Users/User',
  onOpenFile,
  playClick = () => {},
  osModal = null,
}) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedPaths, setSelectedPaths] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // View & Sorting options
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list' | 'compact'
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'type' | 'size' | 'modified'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  const [searchQuery, setSearchQuery] = useState('');

  // Path Editing
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [pathInput, setPathInput] = useState(initialPath);

  // Inspector Panel & Preview
  const [showInspector, setShowInspector] = useState(true);
  const [filePreviewContent, setFilePreviewContent] = useState(null);

  // VFS Clipboard
  const [vfsClipboard, setVfsClipboard] = useState(null); // { action: 'copy' | 'cut', item }

  const fileInputRef = useRef(null);

  // Directory loader
  const refreshDirectory = useCallback(async (path) => {
    try {
      const resolved = await VFS.resolvePath(path);
      const list = await VFS.listDirectory(resolved);
      setItems(list);
      setSelectedItem(null);
      setSelectedPaths(new Set());
      setFilePreviewContent(null);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const resolved = await VFS.resolvePath(currentPath);
        const list = await VFS.listDirectory(resolved);
        if (active) {
          setItems(list);
          setSelectedItem(null);
          setSelectedPaths(new Set());
          setFilePreviewContent(null);
          setLoading(false);
        }
      } catch {
        if (active) {
          setItems([]);
          setLoading(false);
        }
      }
    })();

    const handleUpdate = () => refreshDirectory(currentPath);
    window.addEventListener('billighost:vfs-update', handleUpdate);
    return () => {
      active = false;
      window.removeEventListener('billighost:vfs-update', handleUpdate);
    };
  }, [currentPath, refreshDirectory]);

  // Load preview when selectedItem changes
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!selectedItem || selectedItem.type !== 'file') {
        if (isMounted) setFilePreviewContent(null);
        return;
      }
      try {
        const node = await VFS.getNode(selectedItem.path);
        if (isMounted && node) {
          setFilePreviewContent(node.content);
        }
      } catch {
        if (isMounted) setFilePreviewContent(null);
      }
    })();

    return () => { isMounted = false; };
  }, [selectedItem]);

  // Case-insensitive Address Bar Submit
  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    playClick();
    setIsEditingPath(false);

    try {
      const resolved = await VFS.resolvePath(pathInput.trim(), currentPath);
      const node = await VFS.getNode(resolved);
      if (node && node.type === 'dir') {
        setCurrentPath(resolved);
      } else {
        NotificationService.send({
          title: 'Directory Not Found',
          message: `Cannot locate folder "${pathInput}"`,
          type: 'error',
        });
        setPathInput(currentPath);
      }
    } catch (err) {
      NotificationService.send({
        title: 'Path Resolution Failed',
        message: err.message,
        type: 'error',
      });
      setPathInput(currentPath);
    }
  };

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

  // Breadcrumb segment click
  const handleBreadcrumbClick = (targetIndex, segments) => {
    playClick();
    if (targetIndex === -1) {
      setCurrentPath('/');
      return;
    }
    const newPath = '/' + segments.slice(0, targetIndex + 1).join('/');
    setCurrentPath(newPath);
  };

  // File & Folder Creation
  const handleCreateNewFile = async () => {
    playClick();
    let fileName = 'untitled.txt';
    if (osModal) {
      fileName = await osModal.showPrompt('Enter new file name:', 'untitled.txt', 'New File');
    }
    if (!fileName) return;
    const targetPath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;
    await VFS.writeFile(targetPath, '');
    NotificationService.send({
      title: 'File Created',
      message: `Created ${fileName}`,
      type: 'success',
    });
  };

  const handleCreateNewFolder = async () => {
    playClick();
    let folderName = 'New_Folder';
    if (osModal) {
      folderName = await osModal.showPrompt('Enter new folder name:', 'New_Folder', 'New Folder');
    }
    if (!folderName) return;
    const targetPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`;
    await VFS.createDirectory(targetPath);
    NotificationService.send({
      title: 'Folder Created',
      message: `Created ${folderName}`,
      type: 'success',
    });
  };

  // Item Renaming
  const handleRename = async (item = selectedItem) => {
    if (!item) return;
    playClick();
    let newName;
    if (osModal) {
      newName = await osModal.showPrompt('Enter new name:', item.name, 'Rename');
    }
    if (!newName || newName === item.name) return;

    try {
      const parentDir = item.parentPath || (currentPath === '/' ? '' : currentPath);
      const newPath = `${parentDir}/${newName}`;
      await VFS.renameNode(item.path, newPath);
      NotificationService.send({
        title: 'Renamed',
        message: `Renamed to ${newName}`,
        type: 'info',
      });
      setSelectedItem(null);
    } catch (err) {
      NotificationService.send({
        title: 'Rename Failed',
        message: err.message,
        type: 'error',
      });
    }
  };

  // Duplicate / Clone File
  const handleDuplicate = async (item = selectedItem) => {
    if (!item || item.type !== 'file') return;
    playClick();
    try {
      const node = await VFS.getNode(item.path);
      const extIndex = item.name.lastIndexOf('.');
      const base = extIndex !== -1 ? item.name.substring(0, extIndex) : item.name;
      const ext = extIndex !== -1 ? item.name.substring(extIndex) : '';
      const newName = `${base} (Copy)${ext}`;
      const parentDir = currentPath === '/' ? '' : currentPath;
      const targetPath = `${parentDir}/${newName}`;

      await VFS.writeFile(targetPath, node.content, node.mimeType);
      NotificationService.send({
        title: 'File Cloned',
        message: `Created ${newName}`,
        type: 'success',
      });
    } catch (err) {
      NotificationService.send({
        title: 'Clone Failed',
        message: err.message,
        type: 'error',
      });
    }
  };

  // Clipboard: Cut / Copy / Paste
  const handleCopy = (item = selectedItem) => {
    if (!item) return;
    playClick();
    setVfsClipboard({ action: 'copy', item });
    NotificationService.send({
      title: 'Copied to Clipboard',
      message: `Copied "${item.name}"`,
      type: 'info',
    });
  };

  const handleCut = (item = selectedItem) => {
    if (!item) return;
    playClick();
    setVfsClipboard({ action: 'cut', item });
    NotificationService.send({
      title: 'Cut to Clipboard',
      message: `Cut "${item.name}"`,
      type: 'info',
    });
  };

  const handlePaste = async () => {
    if (!vfsClipboard) return;
    playClick();
    try {
      const { action, item } = vfsClipboard;
      const node = await VFS.getNode(item.path);
      const parentDir = currentPath === '/' ? '' : currentPath;
      const targetPath = `${parentDir}/${item.name}`;

      if (action === 'copy') {
        await VFS.writeFile(targetPath, node.content, node.mimeType);
        NotificationService.send({
          title: 'Pasted',
          message: `Pasted "${item.name}"`,
          type: 'success',
        });
      } else if (action === 'cut') {
        await VFS.renameNode(item.path, targetPath);
        setVfsClipboard(null);
        NotificationService.send({
          title: 'Moved',
          message: `Moved "${item.name}"`,
          type: 'success',
        });
      }
    } catch (err) {
      NotificationService.send({
        title: 'Paste Failed',
        message: err.message,
        type: 'error',
      });
    }
  };

  // Deletion handling
  const handleDeleteSelected = async () => {
    if (!selectedItem && selectedPaths.size === 0) return;
    playClick();

    const targets = selectedPaths.size > 0
      ? Array.from(selectedPaths)
      : [selectedItem.path];

    if (currentPath === '/Users/User/.trash') {
      let doDelete = true;
      if (osModal) {
        doDelete = await osModal.showConfirm(
          `Permanently delete ${targets.length} item(s)?`,
          'Delete Forever'
        );
      }
      if (doDelete) {
        for (const p of targets) {
          await VFS.deleteNode(p);
        }
        NotificationService.send({
          title: 'Permanently Deleted',
          message: `Removed ${targets.length} item(s) forever`,
          type: 'warning',
        });
        setSelectedItem(null);
        setSelectedPaths(new Set());
      }
    } else {
      let doTrash = true;
      if (osModal) {
        doTrash = await osModal.showConfirm(
          `Move ${targets.length} item(s) to Recycle Bin?`,
          'Move to Trash'
        );
      }
      if (doTrash) {
        for (const p of targets) {
          await VFS.moveToTrash(p);
        }
        NotificationService.send({
          title: 'Moved to Recycle Bin',
          message: `Moved ${targets.length} item(s) to Recycle Bin`,
          type: 'info',
        });
        setSelectedItem(null);
        setSelectedPaths(new Set());
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
      NotificationService.send({
        title: 'Import Complete',
        message: `Uploaded "${file.name}" to current directory`,
        type: 'success',
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Keyboard Navigation
  const handlersRef = useRef({});
  useEffect(() => {
    handlersRef.current = {
      handleRename,
      handleDeleteSelected,
      handleCopy,
      handleCut,
      handlePaste,
      handleDuplicate,
      selectedItem,
    };
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const h = handlersRef.current;

      if (e.key === 'F2' && h.selectedItem) {
        e.preventDefault();
        h.handleRename(h.selectedItem);
      } else if (e.key === 'Delete' && h.selectedItem) {
        e.preventDefault();
        h.handleDeleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && h.selectedItem) {
        e.preventDefault();
        h.handleCopy(h.selectedItem);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x' && h.selectedItem) {
        e.preventDefault();
        h.handleCut(h.selectedItem);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        h.handlePaste();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && h.selectedItem) {
        e.preventDefault();
        h.handleDuplicate(h.selectedItem);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtering & Sorting items
  const pathSegments = currentPath.split('/').filter(Boolean);

  const filteredItems = items
    .filter(it => it.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      // Folders first
      if (a.type === 'dir' && b.type !== 'dir') return -1;
      if (a.type !== 'dir' && b.type === 'dir') return 1;

      let compareVal = 0;
      if (sortBy === 'name') {
        compareVal = a.name.localeCompare(b.name);
      } else if (sortBy === 'size') {
        compareVal = (a.size || 0) - (b.size || 0);
      } else if (sortBy === 'modified') {
        compareVal = (a.modifiedAt || 0) - (b.modifiedAt || 0);
      } else if (sortBy === 'type') {
        compareVal = (a.mimeType || '').localeCompare(b.mimeType || '');
      }
      return sortOrder === 'asc' ? compareVal : -compareVal;
    });

  return (
    <div className={styles.container} data-testid="file-manager-app">
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
            onClick={() => refreshDirectory(currentPath)}
            title="Refresh folder"
          >
            <RefreshIcon size={14} />
          </button>
        </div>

        {/* Address Bar with Interactive Breadcrumbs and Case-Insensitive Text Mode */}
        <div className={styles.addressBarWrapper}>
          {isEditingPath ? (
            <form onSubmit={handleAddressSubmit} className={styles.addressForm}>
              <input
                type="text"
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                onBlur={() => setIsEditingPath(false)}
                className={styles.addressInput}
                autoFocus
                placeholder="Enter path (e.g. desktop, /users/user/pictures)..."
              />
            </form>
          ) : (
            <div
              className={styles.breadcrumbBar}
              onClick={() => { setPathInput(currentPath); setIsEditingPath(true); }}
              title="Click to edit path directly"
            >
              <span
                className={styles.crumbSegment}
                onClick={(e) => { e.stopPropagation(); handleBreadcrumbClick(-1, pathSegments); }}
              >
                /
              </span>
              {pathSegments.map((seg, idx) => (
                <span key={`${seg}-${idx}`} className={styles.crumbGroup}>
                  <span className={styles.crumbSlash}>/</span>
                  <span
                    className={styles.crumbSegment}
                    onClick={(e) => { e.stopPropagation(); handleBreadcrumbClick(idx, pathSegments); }}
                  >
                    {seg}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Search folder..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          {searchQuery && (
            <button className={styles.clearSearchBtn} onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>

        {/* View Mode & Inspector Toggles */}
        <div className={styles.viewControls}>
          <button
            className={`${styles.iconToolBtn} ${viewMode === 'grid' ? styles.btnActive : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            ⊞
          </button>
          <button
            className={`${styles.iconToolBtn} ${viewMode === 'list' ? styles.btnActive : ''}`}
            onClick={() => setViewMode('list')}
            title="Detailed List View"
          >
            ☰
          </button>
          <button
            className={`${styles.iconToolBtn} ${showInspector ? styles.btnActive : ''}`}
            onClick={() => setShowInspector(!showInspector)}
            title="Toggle File Inspector Panel"
          >
            ℹ
          </button>
        </div>
      </div>

      {/* Action Strip (New, Copy, Paste, Delete, Import, Export) */}
      <div className={styles.actionStrip}>
        <div className={styles.actionGroup}>
          <button className={styles.actionBtn} onClick={handleCreateNewFile} title="New File">
            <FileIcon size={12} /><PlusIcon size={9} /> File
          </button>
          <button className={styles.actionBtn} onClick={handleCreateNewFolder} title="New Folder">
            <FolderIcon size={12} /><PlusIcon size={9} /> Folder
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUploadFromPC}
            style={{ display: 'none' }}
          />
          <button
            className={styles.actionBtn}
            onClick={() => fileInputRef.current?.click()}
            title="Import file from your PC to browser storage"
          >
            <DownloadIcon size={12} /> Import
          </button>
          {vfsClipboard && (
            <button className={`${styles.actionBtn} ${styles.btnHighlight}`} onClick={handlePaste} title="Paste Clipboard">
              Paste ({vfsClipboard.item.name})
            </button>
          )}
        </div>

        {selectedItem && (
          <div className={styles.actionGroup}>
            <button className={styles.actionBtn} onClick={() => handleCopy(selectedItem)} title="Copy (Ctrl+C)">
              Copy
            </button>
            <button className={styles.actionBtn} onClick={() => handleCut(selectedItem)} title="Cut (Ctrl+X)">
              Cut
            </button>
            <button className={styles.actionBtn} onClick={() => handleDuplicate(selectedItem)} title="Duplicate (Ctrl+D)">
              Duplicate
            </button>
            <button className={styles.actionBtn} onClick={() => handleRename(selectedItem)} title="Rename (F2)">
              Rename
            </button>
            {selectedItem.type === 'file' && (
              <button className={styles.actionBtn} onClick={handleExportSelected} title="Download to PC">
                <UploadIcon size={12} /> Export
              </button>
            )}
            {currentPath === '/Users/User/.trash' && (
              <button className={`${styles.actionBtn} ${styles.btnHighlight}`} onClick={handleRestoreSelected} title="Restore from Trash">
                <RecycleIcon size={12} /> Restore
              </button>
            )}
            <button className={`${styles.actionBtn} ${styles.btnDanger}`} onClick={handleDeleteSelected} title="Delete">
              <TrashIcon size={12} /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Main Studio Body: Quick Places Sidebar + Explorer View + Inspector Drawer */}
      <div className={styles.bodyLayout}>
        {/* Quick Places Sidebar */}
        <div className={styles.placesSidebar}>
          <div className={styles.sidebarSectionTitle}>Quick Access</div>
          <div className={styles.placesList}>
            {QUICK_PLACES.map(place => (
              <div
                key={place.path}
                className={`${styles.placeItem} ${currentPath === place.path ? styles.placeItemActive : ''}`}
                onClick={() => { playClick(); setCurrentPath(place.path); }}
              >
                <span className={styles.placeIcon}>{place.icon}</span>
                <span className={styles.placeName}>{place.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Explorer Content View Area */}
        <div className={styles.explorerArea} onClick={() => setSelectedItem(null)}>
          {loading ? (
            <div className={styles.loadingMsg}>Reading virtual filesystem...</div>
          ) : filteredItems.length === 0 ? (
            <div className={styles.emptyMsg}>
              {searchQuery ? `No files matching "${searchQuery}"` : 'This folder is empty. Create a file or folder above!'}
            </div>
          ) : viewMode === 'grid' ? (
            /* GRID VIEW */
            <div className={styles.itemsGrid}>
              {filteredItems.map(item => (
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
                    {item.type === 'dir' ? (
                      <FolderIcon size={28} />
                    ) : item.name.endsWith('.png') || item.name.endsWith('.jpg') ? (
                      <span style={{ fontSize: '24px' }}>🖼️</span>
                    ) : item.name.endsWith('.md') ? (
                      <FileTextIcon size={28} />
                    ) : (
                      <FileIcon size={28} />
                    )}
                  </div>
                  <div className={styles.itemName} title={item.name}>{item.name}</div>
                  <div className={styles.itemMeta}>
                    {item.type === 'dir' ? 'Folder' : `${Math.round((item.size || 0) / 1024 * 10) / 10} KB`}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* DETAILED LIST / TABLE VIEW */
            <div className={styles.listViewContainer}>
              <div className={styles.listHeaderRow}>
                <span
                  className={`${styles.colName} ${sortBy === 'name' ? styles.colSortActive : ''}`}
                  onClick={() => { setSortBy('name'); setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}
                >
                  Name {sortBy === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                </span>
                <span
                  className={`${styles.colType} ${sortBy === 'type' ? styles.colSortActive : ''}`}
                  onClick={() => { setSortBy('type'); setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}
                >
                  Type {sortBy === 'type' && (sortOrder === 'asc' ? '▲' : '▼')}
                </span>
                <span
                  className={`${styles.colSize} ${sortBy === 'size' ? styles.colSortActive : ''}`}
                  onClick={() => { setSortBy('size'); setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}
                >
                  Size {sortBy === 'size' && (sortOrder === 'asc' ? '▲' : '▼')}
                </span>
                <span
                  className={`${styles.colDate} ${sortBy === 'modified' ? styles.colSortActive : ''}`}
                  onClick={() => { setSortBy('modified'); setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}
                >
                  Modified {sortBy === 'modified' && (sortOrder === 'asc' ? '▲' : '▼')}
                </span>
              </div>
              <div className={styles.listItemsWrapper}>
                {filteredItems.map(item => (
                  <div
                    key={item.path}
                    className={`${styles.listItemRow} ${selectedItem?.path === item.path ? styles.itemSelected : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem(item);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleOpenItem(item);
                    }}
                  >
                    <span className={styles.colName}>
                      <span className={styles.listIcon}>
                        {item.type === 'dir' ? '📁' : '📄'}
                      </span>
                      {item.name}
                    </span>
                    <span className={styles.colType}>{item.type === 'dir' ? 'Folder' : (item.mimeType || 'Document')}</span>
                    <span className={styles.colSize}>{item.type === 'dir' ? '—' : `${item.size || 0} B`}</span>
                    <span className={styles.colDate}>
                      {item.modifiedAt ? new Date(item.modifiedAt).toLocaleDateString() : 'Today'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side File Inspector Drawer */}
        {showInspector && (
          <div className={styles.inspectorDrawer}>
            <div className={styles.inspectorHeader}>
              <span>Item Inspector</span>
            </div>

            {selectedItem ? (
              <div className={styles.inspectorContent}>
                <div className={styles.previewBox}>
                  {selectedItem.type === 'dir' ? (
                    <div className={styles.dirPreview}>📁 Directory Folder</div>
                  ) : typeof filePreviewContent === 'string' && filePreviewContent.startsWith('data:image/') ? (
                    <img src={filePreviewContent} alt="Preview" className={styles.imageThumbnail} />
                  ) : typeof filePreviewContent === 'string' ? (
                    <div className={styles.textSnippet}>
                      {filePreviewContent.slice(0, 240) || '(Empty file)'}
                    </div>
                  ) : (
                    <div className={styles.genericPreview}>📄 Binary Document</div>
                  )}
                </div>

                <div className={styles.metaList}>
                  <div className={styles.metaRow}>
                    <span className={styles.metaKey}>Name:</span>
                    <span className={styles.metaVal}>{selectedItem.name}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaKey}>Path:</span>
                    <span className={styles.metaValPath}>{selectedItem.path}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaKey}>Type:</span>
                    <span className={styles.metaVal}>{selectedItem.type === 'dir' ? 'Folder' : (selectedItem.mimeType || 'File')}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaKey}>Size:</span>
                    <span className={styles.metaVal}>{selectedItem.type === 'dir' ? '—' : `${selectedItem.size || 0} bytes`}</span>
                  </div>
                </div>

                <div className={styles.inspectorActions}>
                  <button className={styles.actionPrimaryBtn} onClick={() => handleOpenItem(selectedItem)}>
                    Open Item
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.emptyInspector}>
                Select any file or folder to preview contents and metadata.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span>{filteredItems.length} items</span>
          {selectedItem && (
            <span>Selected: {selectedItem.name} ({selectedItem.type === 'dir' ? 'Folder' : `${selectedItem.size} bytes`})</span>
          )}
        </div>
        <div className={styles.statusRight}>
          <span>IndexedDB VFS Storage: Online</span>
        </div>
      </div>
    </div>
  );
}
