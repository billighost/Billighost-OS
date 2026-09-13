import { useState } from 'react';
import {
  FolderIcon, PenIcon, MusicNoteIcon, ImageIcon, GearIcon,
  FileTextIcon, ScrollIcon, GhostIcon, TerminalIcon,
  CalculatorIcon, GaugeIcon, FilmIcon,
  LockIcon, RefreshIcon, PowerIcon, SearchIcon,
  CodeIcon, BrushIcon, GamepadIcon, SwordIcon, RocketIcon, ZapIcon,
} from '../Icons';
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
    { id: 'subwaysurge', name: 'Subway Surge 3D', icon: <GamepadIcon size={22} />, desc: '3D High-Speed Subway Runner' },
    { id: 'aetheria', name: 'Aetheria 3D', icon: <SwordIcon size={22} />, desc: '3D Open World Action RPG' },
    { id: 'voidstrike', name: 'VoidStrike 3D', icon: <RocketIcon size={22} />, desc: '3D Starfighter Space Combat' },
    { id: 'cyberswarm', name: 'CyberSwarm', icon: <ZapIcon size={22} />, desc: '360° Bullet-Heaven Rogue Survivor' },
    { id: 'files', name: 'Files', icon: <FolderIcon size={22} />, desc: 'Virtual File System & Explorer' },
    { id: 'code', name: 'Code Studio', icon: <CodeIcon size={22} />, desc: 'Syntax-Highlighted Code Editor' },
    { id: 'paint', name: 'Paint Studio', icon: <BrushIcon size={22} />, desc: 'Canvas Art & Graphics Studio' },
    { id: 'terminal', name: 'Terminal', icon: <TerminalIcon size={22} />, desc: 'Billighost Command Shell' },
    { id: 'browser', name: 'Ghost Browser', icon: <GhostIcon size={22} />, desc: 'Private Web Browser' },
    { id: 'notepad', name: 'Notepad', icon: <PenIcon size={22} />, desc: 'Text & Markdown Editor' },
    { id: 'media', name: 'Music', icon: <MusicNoteIcon size={22} />, desc: 'Audio Player & Visualizer' },
    { id: 'video', name: 'Video Studio', icon: <FilmIcon size={22} />, desc: 'Trim, Grade & Export Video' },
    { id: 'gallery', name: 'Gallery', icon: <ImageIcon size={22} />, desc: 'Image Viewer & Editor' },
    { id: 'calculator', name: 'Calculator', icon: <CalculatorIcon size={22} />, desc: 'Standard & Scientific Calculator' },
    { id: 'settings', name: 'Settings', icon: <GearIcon size={22} />, desc: 'Personalization & Telemetry' },
    { id: 'monitor', name: 'Task Manager', icon: <GaugeIcon size={22} />, desc: 'Processes & Storage Monitor' },
  ];

  const RECENT_DOCS = [
    { name: 'Welcome.txt', path: '/Users/User/Desktop/Welcome.txt', icon: <FileTextIcon size={16} /> },
    { name: 'OS_Notes.md', path: '/Users/User/Desktop/OS_Notes.md', icon: <FileTextIcon size={16} /> },
    { name: 'Terminal_Guide.txt', path: '/Users/User/Documents/Terminal_Guide.txt', icon: <ScrollIcon size={16} /> },
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
        <span className={styles.searchIcon}><SearchIcon size={14} /></span>
        <input
          type="text"
          placeholder="Search apps, files, settings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
          autoFocus
        />
        {searchQuery && (
          <button className={styles.clearSearch} onClick={() => setSearchQuery('')}>
            <span style={{ fontSize: '0.7rem' }}>&times;</span>
          </button>
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
              onLaunchApp(app.id, app.name, null);
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
              onLaunchApp('notepad', doc.name, null, { filePath: doc.path });
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
            <LockIcon size={13} /> Lock
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
            <RefreshIcon size={13} /> Restart
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
            <PowerIcon size={13} /> Power
          </button>
        </div>
      </div>
    </div>
  );
}
