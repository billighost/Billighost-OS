import { useState, useEffect, useCallback, useRef } from 'react';
import { VFS } from '../services/storage/indexedDB';
import { NotificationService } from '../services/notificationService';
import {
  TrashIcon, RecycleIcon, CloseIcon, RefreshIcon,
  FolderIcon, FileTextIcon, FileIcon,
} from '../components/Icons';
import styles from './RecycleBinApp.module.css';

export default function RecycleBinApp({ playClick = () => {}, osModal = null }) {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedPaths, setSelectedPaths] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting
  const [sortBy, setSortBy] = useState('date'); // 'name' | 'path' | 'date' | 'size'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

  // Quick look preview
  const [previewContent, setPreviewContent] = useState(null);
  const [showInspector, setShowInspector] = useState(true);

  const loadTrash = useCallback(async () => {
    setLoading(true);
    try {
      const list = await VFS.listTrash();
      setItems(list);
      setSelectedPaths(new Set());
      if (selectedItem && !list.find(i => i.path === selectedItem.path)) {
        setSelectedItem(null);
        setPreviewContent(null);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [selectedItem]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const list = await VFS.listTrash();
        if (isMounted) {
          setItems(list);
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          setItems([]);
          setLoading(false);
        }
      }
    })();

    const handleUpdate = () => loadTrash();
    window.addEventListener('billighost:vfs-update', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('billighost:vfs-update', handleUpdate);
    };
  }, [loadTrash]);

  // Load preview when item selected
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!selectedItem || selectedItem.type !== 'file') {
        if (isMounted) setPreviewContent(null);
        return;
      }
      try {
        const node = await VFS.getNode(selectedItem.path);
        if (isMounted && node) {
          setPreviewContent(node.content);
        }
      } catch {
        if (isMounted) setPreviewContent(null);
      }
    })();

    return () => { isMounted = false; };
  }, [selectedItem]);

  // Empty Trash
  const handleEmptyTrash = async () => {
    if (items.length === 0) return;
    playClick();
    let doEmpty = true;
    if (osModal) {
      doEmpty = await osModal.showConfirm(
        `Permanently delete all ${items.length} items in the Recycle Bin? This action cannot be undone.`,
        'Empty Recycle Bin'
      );
    }
    if (doEmpty) {
      await VFS.emptyTrash();
      window.dispatchEvent(new CustomEvent('billighost:play-sound', { detail: 'trash-empty' }));
      NotificationService.send({
        title: 'Recycle Bin Emptied',
        message: 'All items permanently removed from virtual storage',
        type: 'info',
      });
      setSelectedItem(null);
      setSelectedPaths(new Set());
      setPreviewContent(null);
    }
  };

  // Restore All
  const handleRestoreAll = async () => {
    if (items.length === 0) return;
    playClick();
    let doRestore = true;
    if (osModal) {
      doRestore = await osModal.showConfirm(
        `Restore all ${items.length} items to their original locations?`,
        'Restore All Items'
      );
    }
    if (doRestore) {
      let count = 0;
      for (const it of items) {
        try {
          await VFS.restoreFromTrash(it.path);
          count++;
        } catch {}
      }
      NotificationService.send({
        title: 'Items Restored',
        message: `Restored ${count} items to original folders`,
        type: 'success',
      });
      setSelectedItem(null);
      setSelectedPaths(new Set());
    }
  };

  // Restore Selected or Batch Selected
  const handleRestoreSelected = async () => {
    const targets = selectedPaths.size > 0
      ? Array.from(selectedPaths)
      : (selectedItem ? [selectedItem.path] : []);

    if (targets.length === 0) return;
    playClick();

    let count = 0;
    for (const p of targets) {
      try {
        await VFS.restoreFromTrash(p);
        count++;
      } catch {}
    }

    NotificationService.send({
      title: 'Restored',
      message: `Restored ${count} item(s) from Recycle Bin`,
      type: 'success',
    });
    setSelectedItem(null);
    setSelectedPaths(new Set());
  };

  // Delete Permanently Selected or Batch
  const handleDeletePermanently = async () => {
    const targets = selectedPaths.size > 0
      ? Array.from(selectedPaths)
      : (selectedItem ? [selectedItem.path] : []);

    if (targets.length === 0) return;
    playClick();

    let doDelete = true;
    if (osModal) {
      doDelete = await osModal.showConfirm(
        `Permanently delete ${targets.length} item(s)? They cannot be recovered.`,
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
  };

  // Multi-select toggle
  const toggleSelectPath = (path, e) => {
    e.stopPropagation();
    setSelectedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPaths.size === filteredItems.length) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(filteredItems.map(i => i.path)));
    }
  };

  // Keyboard controls
  const keyActionsRef = useRef({});
  useEffect(() => {
    keyActionsRef.current = {
      handleDeletePermanently,
      handleRestoreSelected,
      selectedItem,
    };
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const acts = keyActionsRef.current;

      if (e.key === 'Delete' && acts.selectedItem) {
        e.preventDefault();
        acts.handleDeletePermanently();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const totalSize = items.reduce((acc, cur) => acc + (cur.size || 0), 0);

  // Filter and sort items
  const filteredItems = items
    .filter(it => it.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      let compare = 0;
      if (sortBy === 'name') {
        compare = a.name.localeCompare(b.name);
      } else if (sortBy === 'path') {
        compare = (a.originalPath || '').localeCompare(b.originalPath || '');
      } else if (sortBy === 'size') {
        compare = (a.size || 0) - (b.size || 0);
      } else if (sortBy === 'date') {
        compare = (a.deletedAt || 0) - (b.deletedAt || 0);
      }
      return sortOrder === 'asc' ? compare : -compare;
    });

  const allSelected = filteredItems.length > 0 && selectedPaths.size === filteredItems.length;

  return (
    <div className={styles.container} onClick={() => setSelectedItem(null)} data-testid="recycle-bin-app">
      {/* Action Toolbar */}
      <div className={styles.toolbar} onClick={(e) => e.stopPropagation()}>
        <div className={styles.leftControls}>
          <button
            data-testid="btn-empty-trash"
            className={`${styles.toolBtn} ${styles.btnDanger}`}
            onClick={handleEmptyTrash}
            disabled={items.length === 0}
            title="Permanently remove all items"
          >
            <TrashIcon size={13} /> Empty Recycle Bin
          </button>
          <button
            className={styles.toolBtn}
            onClick={handleRestoreAll}
            disabled={items.length === 0}
            title="Restore all items to their original folders"
          >
            <RecycleIcon size={13} /> Restore All
          </button>
          <div className={styles.divider} />

          <button
            data-testid="btn-restore-trash"
            className={`${styles.toolBtn} ${styles.btnSuccess}`}
            onClick={handleRestoreSelected}
            disabled={!selectedItem && selectedPaths.size === 0}
            title="Restore selected item(s)"
          >
            <RecycleIcon size={13} /> Restore Selected
          </button>
          <button
            data-testid="btn-delete-perm"
            className={`${styles.toolBtn} ${styles.btnDanger}`}
            onClick={handleDeletePermanently}
            disabled={!selectedItem && selectedPaths.size === 0}
            title="Delete selected item(s) permanently"
          >
            <CloseIcon size={13} /> Delete
          </button>
        </div>

        <div className={styles.rightControls}>
          {/* Search Box */}
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search trash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button className={styles.clearSearchBtn} onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>

          <button
            className={`${styles.toolBtn} ${showInspector ? styles.btnActive : ''}`}
            onClick={() => setShowInspector(!showInspector)}
            title="Toggle File Inspector"
          >
            ℹ Inspector
          </button>

          <button
            className={styles.toolBtn}
            onClick={() => { playClick(); loadTrash(); }}
            title="Refresh Recycle Bin"
          >
            <RefreshIcon size={13} />
          </button>
        </div>
      </div>

      {/* Main Studio Body: List Area + Inspector Drawer */}
      <div className={styles.mainStudioBody}>
        <div className={styles.itemsArea}>
          {loading ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyTitle}>Scanning Recycle Bin...</div>
            </div>
          ) : items.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><TrashIcon size={48} color="var(--text-ghost)" /></div>
              <div className={styles.emptyTitle}>Recycle Bin is Clean</div>
              <div className={styles.emptySubtitle}>
                Deleted files and folders from your Desktop and File Explorer will be safely kept here until emptied.
              </div>
            </div>
          ) : (
            <>
              {/* Table Column Headers */}
              <div className={styles.tableHeader}>
                <span className={styles.colCheck}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    title="Select / Deselect All"
                  />
                </span>
                <span
                  className={`${styles.colName} ${sortBy === 'name' ? styles.colActive : ''}`}
                  onClick={() => { setSortBy('name'); setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}
                >
                  Name {sortBy === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                </span>
                <span
                  className={`${styles.colLocation} ${sortBy === 'path' ? styles.colActive : ''}`}
                  onClick={() => { setSortBy('path'); setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}
                >
                  Original Location {sortBy === 'path' && (sortOrder === 'asc' ? '▲' : '▼')}
                </span>
                <span
                  className={`${styles.colDate} ${sortBy === 'date' ? styles.colActive : ''}`}
                  onClick={() => { setSortBy('date'); setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}
                >
                  Date Deleted {sortBy === 'date' && (sortOrder === 'asc' ? '▲' : '▼')}
                </span>
                <span
                  className={`${styles.colSize} ${sortBy === 'size' ? styles.colActive : ''}`}
                  onClick={() => { setSortBy('size'); setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}
                >
                  Size {sortBy === 'size' && (sortOrder === 'asc' ? '▲' : '▼')}
                </span>
              </div>

              {/* Items List */}
              <div className={styles.itemsList}>
                {filteredItems.map((item) => {
                  const isSelected = selectedItem?.path === item.path || selectedPaths.has(item.path);
                  const formattedDate = item.deletedAt
                    ? new Date(item.deletedAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Earlier';

                  return (
                    <div
                      key={item.path}
                      data-testid={`trash-item-${item.name}`}
                      className={`${styles.itemRow} ${isSelected ? styles.itemSelected : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(item);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleRestoreSelected();
                      }}
                    >
                      <div className={styles.colCheck} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedPaths.has(item.path)}
                          onChange={(e) => toggleSelectPath(item.path, e)}
                        />
                      </div>

                      <div className={styles.colName}>
                        <span className={styles.itemIcon}>
                          {item.type === 'dir' ? (
                            <FolderIcon size={16} />
                          ) : item.name.endsWith('.md') ? (
                            <FileTextIcon size={16} />
                          ) : item.name.endsWith('.png') || item.name.endsWith('.jpg') ? (
                            <span>🖼️</span>
                          ) : (
                            <FileIcon size={16} />
                          )}
                        </span>
                        <span className={styles.itemNameText}>{item.name}</span>
                      </div>

                      <div className={styles.colLocation} title={item.originalPath || 'Desktop'}>
                        {item.originalPath || item.originalParent || '/Users/User/Desktop'}
                      </div>

                      <div className={styles.colDate}>{formattedDate}</div>

                      <div className={styles.colSize}>
                        {item.type === 'dir' ? 'Folder' : `${Math.round((item.size || 0) / 1024 * 10) / 10} KB`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Right Side File Inspector Drawer */}
        {showInspector && (
          <div className={styles.inspectorDrawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.inspectorHeader}>
              <span>Trash Item Inspector</span>
            </div>

            {selectedItem ? (
              <div className={styles.inspectorContent}>
                <div className={styles.previewBox}>
                  {selectedItem.type === 'dir' ? (
                    <div className={styles.dirPreview}>📁 Directory Folder</div>
                  ) : typeof previewContent === 'string' && previewContent.startsWith('data:image/') ? (
                    <img src={previewContent} alt="Preview" className={styles.imageThumbnail} />
                  ) : typeof previewContent === 'string' ? (
                    <div className={styles.textSnippet}>
                      {previewContent.slice(0, 240) || '(Empty file)'}
                    </div>
                  ) : (
                    <div className={styles.genericPreview}>📄 Document Archive</div>
                  )}
                </div>

                <div className={styles.metaList}>
                  <div className={styles.metaRow}>
                    <span className={styles.metaKey}>Name:</span>
                    <span className={styles.metaVal}>{selectedItem.name}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaKey}>Original Path:</span>
                    <span className={styles.metaValPath}>{selectedItem.originalPath || selectedItem.originalParent || 'Unknown'}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaKey}>Size:</span>
                    <span className={styles.metaVal}>{selectedItem.type === 'dir' ? 'Folder' : `${selectedItem.size || 0} bytes`}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaKey}>Date Deleted:</span>
                    <span className={styles.metaVal}>
                      {selectedItem.deletedAt ? new Date(selectedItem.deletedAt).toLocaleTimeString() : 'Earlier'}
                    </span>
                  </div>
                </div>

                <div className={styles.inspectorActions}>
                  <button className={styles.actionRestoreBtn} onClick={handleRestoreSelected}>
                    Restore to Original Folder
                  </button>
                  <button className={styles.actionDeleteBtn} onClick={handleDeletePermanently}>
                    Delete Forever
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.emptyInspector}>
                Select an item in the trash to preview its contents and original location.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className={styles.statusBar} onClick={(e) => e.stopPropagation()}>
        <div className={styles.statusLeft}>
          <span>{items.length} {items.length === 1 ? 'item' : 'items'} in Recycle Bin</span>
          {selectedPaths.size > 0 && (
            <span className={styles.selectedBadge}>{selectedPaths.size} selected</span>
          )}
        </div>
        <div className={styles.statusRight}>
          <span>
            {selectedItem
              ? `Selected: ${selectedItem.name} (${selectedItem.type === 'dir' ? 'Folder' : `${selectedItem.size || 0} bytes`})`
              : `Total size: ${Math.round((totalSize / 1024) * 10) / 10} KB`}
          </span>
        </div>
      </div>
    </div>
  );
}
