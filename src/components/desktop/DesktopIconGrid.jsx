import { useState, useEffect, useCallback, useRef } from 'react';
import { VFS } from '../../services/storage/indexedDB';
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
    { id: 'shortcut-pc', name: 'This PC', icon: '💻', action: () => onLaunchApp('files', 'Files', '📁', { initialPath: '/' }) },
    { id: 'shortcut-files', name: 'File Explorer', icon: '📁', action: () => onLaunchApp('files', 'Files', '📁', { initialPath: '/Users/User' }) },
    { id: 'shortcut-terminal', name: 'Terminal', icon: '⚡', action: () => onLaunchApp('terminal', 'Terminal', '⚡') },
    { id: 'shortcut-browser', name: 'Browser', icon: '🌐', action: () => onLaunchApp('browser', 'Ghost Browser', '🌐') },
    { id: 'shortcut-notepad', name: 'Notepad', icon: '📝', action: () => onLaunchApp('notepad', 'Notepad', '📝') },
    { id: 'shortcut-music', name: 'Music', icon: '🎵', action: () => onLaunchApp('media', 'Audio Player', '🎵') },
    { id: 'shortcut-gallery', name: 'Gallery', icon: '🖼️', action: () => onLaunchApp('gallery', 'Image Viewer', '🖼️') },
    { id: 'shortcut-calc', name: 'Calculator', icon: '🔢', action: () => onLaunchApp('calculator', 'Calculator', '🔢') },
    { id: 'shortcut-settings', name: 'Settings', icon: '⚙️', action: () => onLaunchApp('settings', 'Settings', '⚙️') },
  ];

  // Marquee Selection Logic
  const handleMouseDown = (e) => {
    if (e.target.closest(`.${styles.iconItem}`)) return;
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

  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenu({
      x: Math.min(window.innerWidth - 190, e.clientX),
      y: Math.min(window.innerHeight - 240, e.clientY),
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
            onDoubleClick={(e) => {
              e.stopPropagation();
              playClick();
              if (node.type === 'dir') {
                onLaunchApp('files', node.name, '📁', { initialPath: node.path });
              } else if (node.name.endsWith('.svg') || node.name.endsWith('.png') || node.name.endsWith('.jpg')) {
                onLaunchApp('gallery', node.name, '🖼️', { filePath: node.path });
              } else {
                onLaunchApp('notepad', node.name, '📝', { filePath: node.path });
              }
            }}
          >
            <div className={styles.iconGraphic}>
              {node.type === 'dir'
                ? '📁'
                : node.name.endsWith('.svg') || node.name.endsWith('.png') || node.name.endsWith('.jpg')
                ? '🖼️'
                : node.name.endsWith('.md')
                ? '📑'
                : '📄'}
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
          <button className={styles.menuItem} onClick={handleCreateFile}>
            <span>📝</span> New Text File
          </button>
          <button className={styles.menuItem} onClick={handleCreateFolder}>
            <span>📁</span> New Folder
          </button>
          <div className={styles.menuDivider} />
          <button
            className={styles.menuItem}
            onClick={() => {
              playClick();
              onLaunchApp('terminal', 'Terminal', '⚡');
              closeContextMenu();
            }}
          >
            <span>⚡</span> Open Terminal
          </button>
          <button
            className={styles.menuItem}
            onClick={() => {
              playClick();
              onLaunchApp('browser', 'Ghost Browser', '🌐');
              closeContextMenu();
            }}
          >
            <span>🌐</span> Open Browser
          </button>
          <button
            className={styles.menuItem}
            onClick={() => {
              playClick();
              onLaunchApp('settings', 'Settings', '⚙️', { activeTab: 'wallpaper' });
              closeContextMenu();
            }}
          >
            <span>🖼️</span> Personalize Wallpaper
          </button>
          <button
            className={styles.menuItem}
            onClick={() => {
              playClick();
              onLaunchApp('settings', 'Settings', '⚙️', { activeTab: 'about' });
              closeContextMenu();
            }}
          >
            <span>ℹ️</span> System Specs
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
            <span>🔄</span> Refresh
          </button>
        </div>
      )}
    </div>
  );
}
