import { useState } from 'react';
import styles from './StartMenu.module.css';

export default function StartMenu({
  profile,
  onLaunchApp,
  onLock,
  onRestart,
  onShutdown,
  onClose,
  playClick = () => {},
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const APPS = [
    { id: 'files', name: 'Files', icon: '📁', desc: 'Virtual File System & Explorer' },
    { id: 'terminal', name: 'Terminal', icon: '⚡', desc: 'Billighost Command Shell' },
    { id: 'browser', name: 'Browser', icon: '🌐', desc: 'Ghost Web Browser' },
    { id: 'notepad', name: 'Notepad', icon: '📝', desc: 'Text & Markdown Editor' },
    { id: 'media', name: 'Music', icon: '🎵', desc: 'Audio Player & Visualizer' },
    { id: 'gallery', name: 'Gallery', icon: '🖼️', desc: 'Image Viewer' },
    { id: 'calculator', name: 'Calculator', icon: '🔢', desc: 'Standard & Scientific Calculator' },
    { id: 'settings', name: 'Settings', icon: '⚙️', desc: 'Personalization & Telemetry' },
    { id: 'monitor', name: 'Task Manager', icon: '📊', desc: 'Processes & Storage Monitor' },
  ];

  const RECENT_DOCS = [
    { name: 'Welcome.txt', path: '/Users/User/Desktop/Welcome.txt', icon: '📄' },
    { name: 'OS_Notes.md', path: '/Users/User/Desktop/OS_Notes.md', icon: '📑' },
    { name: 'Terminal_Guide.txt', path: '/Users/User/Documents/Terminal_Guide.txt', icon: '📜' },
  ];

  const filteredApps = APPS.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.startMenuContainer} onClick={(e) => e.stopPropagation()}>
      {/* Profile Header */}
      <div className={styles.profileHeader}>
        <div className={styles.avatar}>
          {profile.avatar ? (
            <img src={profile.avatar} alt="avatar" className={styles.avatarImg} />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {profile.name?.slice(0, 2).toUpperCase() || 'BG'}
            </div>
          )}
        </div>
        <div className={styles.profileInfo}>
          <div className={styles.profileName}>{profile.name || 'Billighost User'}</div>
          <div className={styles.profileEmail}>{profile.email || 'bb2010ng@gmail.com'}</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className={styles.searchWrapper}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          type="text"
          placeholder="Search apps, files, settings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
          autoFocus
        />
        {searchQuery && (
          <button className={styles.clearSearch} onClick={() => setSearchQuery('')}>✕</button>
        )}
      </div>

      {/* Pinned Apps Grid */}
      <div className={styles.sectionTitle}>Applications</div>
      <div className={styles.appsGrid}>
        {filteredApps.map((app) => (
          <button
            key={app.id}
            className={styles.appCard}
            onClick={() => {
              playClick();
              onLaunchApp(app.id, app.name, app.icon);
              onClose();
            }}
          >
            <span className={styles.appIcon}>{app.icon}</span>
            <span className={styles.appName}>{app.name}</span>
          </button>
        ))}
        {filteredApps.length === 0 && (
          <div className={styles.noResults}>No applications matching &quot;{searchQuery}&quot;</div>
        )}
      </div>

      {/* Quick Documents */}
      <div className={styles.sectionTitle}>Recent Documents</div>
      <div className={styles.recentList}>
        {RECENT_DOCS.map((doc) => (
          <button
            key={doc.path}
            className={styles.recentItem}
            onClick={() => {
              playClick();
              onLaunchApp('notepad', doc.name, '📝', { filePath: doc.path });
              onClose();
            }}
          >
            <span className={styles.recentIcon}>{doc.icon}</span>
            <span className={styles.recentName}>{doc.name}</span>
          </button>
        ))}
      </div>

      {/* Bottom Power Actions */}
      <div className={styles.bottomBar}>
        <div className={styles.systemStatusTag}>Billighost OS 1.0</div>
        <div className={styles.powerButtons}>
          <button
            className={styles.powerBtn}
            onClick={() => {
              playClick();
              onLock();
              onClose();
            }}
            title="Lock session"
          >
            🔒 Lock
          </button>
          <button
            className={styles.powerBtn}
            onClick={() => {
              playClick();
              onRestart();
              onClose();
            }}
            title="Restart OS"
          >
            🔄 Restart
          </button>
          <button
            className={`${styles.powerBtn} ${styles.powerBtnDanger}`}
            onClick={() => {
              playClick();
              onShutdown();
              onClose();
            }}
            title="Power off to boot screen"
          >
            ⏻ Power
          </button>
        </div>
      </div>
    </div>
  );
}
