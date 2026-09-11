import { useState, useEffect, useCallback, useRef } from 'react';
import { VFS } from '../../services/storage/indexedDB';
import { NotificationService } from '../../services/notificationService';
import {
  MonitorIcon, FolderIcon, FolderOpenIcon, TrashIcon, BoltIcon, GlobeIcon,
  PenIcon, MusicNoteIcon, ImageIcon, GridHashIcon, GearIcon,
  FileIcon, FileTextIcon, UploadIcon, RefreshIcon, InfoIcon,
} from '../Icons';
import styles from './DesktopIconGrid.module.css';

export default function DesktopIconGrid({
  onLaunchApp,
  playClick = () => {},
}) {
  const [vfsFiles, setVfsFiles] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [contextMenu, setContextMenu] = useState(null);
  const [marquee, setMarquee] = useState(null); // { startX, startY, currentX, currentY }
  const gridRef = useRef(null);

  const loadDesktopFiles = useCallback(async () => {
    try {
      const files = await VFS.listDirectory('/Users/User/Desktop');
      setVfsFiles(files);
    } catch {
      setVfsFiles([]);
    }
  }, []);

  useEffect(() => {
    loadDesktopFiles();
    const handleVfsUpdate = () => loadDesktopFiles();
    window.addEventListener('billighost:vfs-update', handleVfsUpdate);
    return () => window.removeEventListener('billighost:vfs-update', handleVfsUpdate);
  }, [loadDesktopFiles]);

  const SYSTEM_SHORTCUTS = [
    { id: 'shortcut-pc', name: 'This PC', icon: <MonitorIcon size={28} />, action: () => onLaunchApp('files', 'Files', null, { initialPath: '/' }) },
    { id: 'shortcut-files', name: 'File Explorer', icon: <FolderIcon size={28} />, action: () => onLaunchApp('files', 'Files', null, { initialPath: '/Users/User' }) },
    { id: 'shortcut-trash', name: 'Recycle Bin', icon: <TrashIcon size={28} />, action: () => onLaunchApp('trash', 'Recycle Bin', null) },
    { id: 'shortcut-terminal', name: 'Terminal', icon: <BoltIcon size={28} />, action: () => onLaunchApp('terminal', 'Terminal', null) },
    { id: 'shortcut-browser', name: 'Browser', icon: <GlobeIcon size={28} />, action: () => onLaunchApp('browser', 'Ghost Browser', null) },
    { id: 'shortcut-notepad', name: 'Notepad', icon: <PenIcon size={28} />, action: () => onLaunchApp('notepad', 'Notepad', null) },
    { id: 'shortcut-music', name: 'Music', icon: <MusicNoteIcon size={28} />, action: () => onLaunchApp('media', 'Audio Player', null) },
    { id: 'shortcut-gallery', name: 'Gallery', icon: <ImageIcon size={28} />, action: () => onLaunchApp('gallery', 'Image Viewer', null) },
    { id: 'shortcut-calc', name: 'Calculator', icon: <GridHashIcon size={28} />, action: () => onLaunchApp('calculator', 'Calculator', null) },
    { id: 'shortcut-settings', name: 'Settings', icon: <GearIcon size={28} />, action: () => onLaunchApp('settings', 'Settings', null) },
  ];

  // Marquee Selection Logic
  const handleMouseDown = (e) => {
    if (e.target.closest(`.${styles.iconItem}`) || e.target.closest(`.${styles.contextMenu}`)) return;
    if (e.button !== 0) return; // only left click

    setSelectedIds(new Set());
    setContextMenu(null);

    const rect = gridRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    setMarquee({ startX, startY, currentX: startX, currentY: startY });

    const handleMouseMove = (me) => {
      const curX = me.clientX - rect.left;
      const curY = me.clientY - rect.top;
      setMarquee(prev => prev ? { ...prev, currentX: curX, currentY: curY } : null);

      // Hit-test desktop icons
      const minX = Math.min(startX, curX);
      const maxX = Math.max(startX, curX);
      const minY = Math.min(startY, curY);
      const maxY = Math.max(startY, curY);

      const items = gridRef.current.querySelectorAll(`.${styles.iconItem}`);
      const newSelected = new Set();

      items.forEach((itemEl) => {
        const itemRect = itemEl.getBoundingClientRect();
        const relativeLeft = itemRect.left - rect.left;
        const relativeTop = itemRect.top - rect.top;
        const relativeRight = relativeLeft + itemRect.width;
        const relativeBottom = relativeTop + itemRect.height;

        const overlaps = !(
          relativeRight < minX ||
          relativeLeft > maxX ||
          relativeBottom < minY ||
          relativeTop > maxY
        );

        if (overlaps) {
          const testId = itemEl.getAttribute('data-testid');
          if (testId) newSelected.add(testId);
        }
      });

      setSelectedIds(newSelected);
    };

    const handleMouseUp = () => {
      setMarquee(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    const handleKeyDown = async (e) => {
      if (e.key === 'Delete' && selectedIds.size > 0) {
        for (const testId of selectedIds) {
          if (testId.startsWith('vfs-')) {
            const fileName = testId.replace('vfs-', '');
            try {
              await VFS.moveToTrash(`/Users/User/Desktop/${fileName}`);
              NotificationService.send({
                title: 'Moved to Recycle Bin',
                message: `"${fileName}" was moved to the Recycle Bin`,
                type: 'info',
              });
            } catch (err) {
              console.error(err);
            }
          }
        }
        setSelectedIds(new Set());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds]);

  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenu({
      x: Math.min(window.innerWidth - 190, e.clientX),
      y: Math.min(window.innerHeight - 240, e.clientY),
      targetNode: null,
    });
  };

  const handleItemContextMenu = (e, node) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds(new Set([`vfs-${node.name}`]));
    setContextMenu({
      x: Math.min(window.innerWidth - 190, e.clientX),
      y: Math.min(window.innerHeight - 240, e.clientY),
      targetNode: node,
    });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleCreateFile = async () => {
    playClick();
    const fileName = `Note_${Date.now().toString().slice(-4)}.txt`;
    await VFS.writeFile(`/Users/User/Desktop/${fileName}`, 'Created via Desktop menu.\n');
    closeContextMenu();
  };

  const handleCreateFolder = async () => {
    playClick();
    const folderName = `Folder_${Date.now().toString().slice(-4)}`;
    await VFS.createDirectory(`/Users/User/Desktop/${folderName}`);
    closeContextMenu();
  };

  const handleTrashItem = async (node) => {
    playClick();
    closeContextMenu();
    try {
      await VFS.moveToTrash(node.path);
      NotificationService.send({
        title: 'Moved to Recycle Bin',
        message: `"${node.name}" was moved to the Recycle Bin`,
        type: 'info',
      });
    } catch (err) {
      console.error('Error moving to trash:', err.message);
    }
  };

  function getFileIcon(node) {
    if (node.type === 'dir') return <FolderIcon size={28} />;
    if (node.name.endsWith('.svg') || node.name.endsWith('.png') || node.name.endsWith('.jpg')) return <ImageIcon size={28} />;
    if (node.name.endsWith('.md')) return <FileTextIcon size={28} />;
    return <FileIcon size={28} />;
  }

  // Compute Marquee box styling
  let marqueeStyle = null;
  if (marquee) {
    const left = Math.min(marquee.startX, marquee.currentX);
    const top = Math.min(marquee.startY, marquee.currentY);
    const width = Math.abs(marquee.currentX - marquee.startX);
    const height = Math.abs(marquee.currentY - marquee.startY);
    marqueeStyle = { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` };
  }

  return (
    <div
      ref={gridRef}
      className={styles.gridContainer}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
    >
      {/* Marquee Bounding Box */}
      {marquee && <div className={styles.marqueeBox} style={marqueeStyle} />}

      {/* System Shortcuts */}
      {SYSTEM_SHORTCUTS.map((item) => (
        <div
          key={item.id}
          data-testid={item.id}
          className={`${styles.iconItem} ${selectedIds.has(item.id) ? styles.iconSelected : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (e.ctrlKey || e.metaKey) {
              setSelectedIds(prev => new Set(prev).add(item.id));
            } else {
              setSelectedIds(new Set([item.id]));
            }
            closeContextMenu();
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            playClick();
            item.action();
          }}
        >
          <div className={styles.iconGraphic}>{item.icon}</div>
          <span className={styles.iconLabel}>{item.name}</span>
        </div>
      ))}

      {/* Dynamic VFS Files on Desktop */}
      {vfsFiles.map((node) => {
        const testId = `vfs-${node.name}`;
        return (
          <div
            key={node.path}
            data-testid={testId}
            className={`${styles.iconItem} ${selectedIds.has(testId) ? styles.iconSelected : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (e.ctrlKey || e.metaKey) {
                setSelectedIds(prev => new Set(prev).add(testId));
              } else {
                setSelectedIds(new Set([testId]));
              }
              closeContextMenu();
            }}
            onContextMenu={(e) => handleItemContextMenu(e, node)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              playClick();
              if (node.type === 'dir') {
                onLaunchApp('files', node.name, null, { initialPath: node.path });
              } else if (node.name.endsWith('.svg') || node.name.endsWith('.png') || node.name.endsWith('.jpg')) {
                onLaunchApp('gallery', node.name, null, { filePath: node.path });
              } else {
                onLaunchApp('notepad', node.name, null, { filePath: node.path });
              }
            }}
          >
            <div className={styles.iconGraphic}>
              {getFileIcon(node)}
            </div>
            <span className={styles.iconLabel}>{node.name}</span>
          </div>
        );
      })}

      {/* Desktop Context Menu */}
      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.targetNode ? (
            <>
              <button
                className={styles.menuItem}
                onClick={() => {
                  playClick();
                  const node = contextMenu.targetNode;
                  closeContextMenu();
                  if (node.type === 'dir') {
                    onLaunchApp('files', node.name, null, { initialPath: node.path });
                  } else if (node.name.endsWith('.svg') || node.name.endsWith('.png') || node.name.endsWith('.jpg')) {
                    onLaunchApp('gallery', node.name, null, { filePath: node.path });
                  } else {
                    onLaunchApp('notepad', node.name, null, { filePath: node.path });
                  }
                }}
              >
                <FolderOpenIcon size={14} /> Open
              </button>
              <button
                className={styles.menuItem}
                data-testid="menu-move-to-trash"
                onClick={() => handleTrashItem(contextMenu.targetNode)}
              >
                <TrashIcon size={14} /> Move to Recycle Bin
              </button>
              {contextMenu.targetNode.type === 'file' && (
                <button
                  className={styles.menuItem}
                  onClick={() => {
                    playClick();
                    VFS.exportFile(contextMenu.targetNode.path);
                    closeContextMenu();
                  }}
                >
                  <UploadIcon size={14} /> Export to PC
                </button>
              )}
            </>
          ) : (
            <>
              <button className={styles.menuItem} onClick={handleCreateFile}>
                <PenIcon size={14} /> New Text File
              </button>
              <button className={styles.menuItem} onClick={handleCreateFolder}>
                <FolderIcon size={14} /> New Folder
              </button>
              <div className={styles.menuDivider} />
              <button
                className={styles.menuItem}
                onClick={() => {
                  playClick();
                  onLaunchApp('terminal', 'Terminal', null);
                  closeContextMenu();
                }}
              >
                <BoltIcon size={14} /> Open Terminal
              </button>
              <button
                className={styles.menuItem}
                onClick={() => {
                  playClick();
                  onLaunchApp('browser', 'Ghost Browser', null);
                  closeContextMenu();
                }}
              >
                <GlobeIcon size={14} /> Open Browser
              </button>
              <button
                className={styles.menuItem}
                onClick={() => {
                  playClick();
                  onLaunchApp('settings', 'Settings', null, { activeTab: 'wallpaper' });
                  closeContextMenu();
                }}
              >
                <ImageIcon size={14} /> Personalize Wallpaper
              </button>
              <button
                className={styles.menuItem}
                onClick={() => {
                  playClick();
                  onLaunchApp('settings', 'Settings', null, { activeTab: 'about' });
                  closeContextMenu();
                }}
              >
                <InfoIcon size={14} /> System Specs
              </button>
              <div className={styles.menuDivider} />
              <button
                className={styles.menuItem}
                onClick={() => {
                  playClick();
                  loadDesktopFiles();
                  closeContextMenu();
                }}
              >
                <RefreshIcon size={14} /> Refresh
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
