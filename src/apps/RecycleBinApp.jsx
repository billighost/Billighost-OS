import { useState, useEffect, useCallback } from 'react';
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
  const [loading, setLoading] = useState(true);

  const loadTrash = useCallback(async () => {
    setLoading(true);
    try {
      const list = await VFS.listTrash();
      setItems(list);
      if (selectedItem && !list.find(i => i.path === selectedItem.path)) {
        setSelectedItem(null);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [selectedItem]);

  useEffect(() => {
    loadTrash();
    const handleUpdate = () => loadTrash();
    window.addEventListener('billighost:vfs-update', handleUpdate);
    return () => window.removeEventListener('billighost:vfs-update', handleUpdate);
  }, [loadTrash]);

  const handleEmptyTrash = async () => {
    if (items.length === 0) return;
    playClick();
    let doEmpty = true;
    if (osModal) {
      doEmpty = await osModal.showConfirm('Permanently delete all items in the Recycle Bin? This action cannot be undone.', 'Empty Recycle Bin');
    }
    if (doEmpty) {
      await VFS.emptyTrash();
      NotificationService.send({
        title: 'Recycle Bin Emptied',
        message: 'All items permanently removed from disk',
        type: 'info',
      });
      setSelectedItem(null);
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

  const handleDeletePermanently = async () => {
    if (!selectedItem) return;
    playClick();
    let doDelete = true;
    if (osModal) {
      doDelete = await osModal.showConfirm(`Permanently delete "${selectedItem.name}"?`, 'Delete Forever');
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
  };

  const totalSize = items.reduce((acc, cur) => acc + (cur.size || 0), 0);

  return (
    <div className={styles.container} onClick={() => setSelectedItem(null)}>
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
            data-testid="btn-restore-trash"
            className={`${styles.toolBtn} ${styles.btnSuccess}`}
            onClick={handleRestoreSelected}
            disabled={!selectedItem}
            title="Restore selected item to original folder"
          >
            <RecycleIcon size={13} /> Restore Selected
          </button>
          <button
            data-testid="btn-delete-perm"
            className={`${styles.toolBtn} ${styles.btnDanger}`}
            onClick={handleDeletePermanently}
            disabled={!selectedItem}
            title="Delete selected item permanently"
          >
            <CloseIcon size={13} /> Delete
          </button>
        </div>

        <div className={styles.actionControls}>
          <button
            className={styles.toolBtn}
            onClick={() => { playClick(); loadTrash(); }}
            title="Refresh Recycle Bin"
          >
            <RefreshIcon size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Main Items Area */}
      <div className={styles.itemsArea}>
        {loading ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>Scanning Recycle Bin...</div>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><TrashIcon size={48} color="var(--text-ghost)" /></div>
            <div className={styles.emptyTitle}>Recycle Bin is Empty</div>
            <div className={styles.emptySubtitle}>
              Deleted files and folders from your Desktop and File Explorer will be safely kept here until emptied.
            </div>
          </div>
        ) : (
          <>
            <div className={styles.tableHeader}>
              <span>Name</span>
              <span>Original Location</span>
              <span>Date Deleted</span>
              <span>Size</span>
            </div>

            <div className={styles.itemsList}>
              {items.map((item) => {
                const isSelected = selectedItem?.path === item.path;
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
                    <div className={styles.itemNameCol}>
                      <span className={styles.itemIcon}>
                        {item.type === 'dir' ? <FolderIcon size={16} /> : item.name.endsWith('.md') ? <FileTextIcon size={16} /> : <FileIcon size={16} />}
                      </span>
                      <span>{item.name}</span>
                    </div>

                    <div className={styles.itemPathCol} title={item.originalPath || 'Desktop'}>
                      {item.originalPath || item.originalParent || '/Users/User/Desktop'}
                    </div>

                    <div className={styles.itemDateCol}>{formattedDate}</div>

                    <div className={styles.itemSizeCol}>
                      {item.type === 'dir' ? 'Folder' : `${Math.round((item.size || 0) / 1024 * 10) / 10} KB`}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Status Bar */}
      <div className={styles.statusBar} onClick={(e) => e.stopPropagation()}>
        <span>{items.length} {items.length === 1 ? 'item' : 'items'} in Trash</span>
        <span>
          {selectedItem
            ? `Selected: ${selectedItem.name} (${selectedItem.type === 'dir' ? 'Folder' : `${selectedItem.size || 0} bytes`})`
            : `Total size: ${Math.round((totalSize / 1024) * 10) / 10} KB`}
        </span>
      </div>
    </div>
  );
}
