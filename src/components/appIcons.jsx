/**
 * App identity — the single source of truth for "which icon represents app X".
 *
 * Resolving the icon from `appId` rather than passing a rendered element
 * through window state keeps window records serialisable and means a newly
 * launched app needs no icon plumbing at every call site.
 *
 * The returned elements carry each icon's own hover/press animations, so a
 * window title bar, a taskbar tab and a Task View card all animate alike.
 */
import {
  FolderIcon, TerminalIcon, PenIcon, CodeIcon, BrushIcon, GhostIcon,
  ImageIcon, MusicNoteIcon, CalculatorIcon, GearIcon, TrashIcon, GaugeIcon,
  FileIcon, FilmIcon, FileAudioIcon, FileVideoIcon, FileImageIcon,
  FileCodeIcon, FileTextIcon, FileArchiveIcon, FilePdfIcon, FileSheetIcon,
  FileFontIcon,
} from './Icons';

const REGISTRY = {
  files: FolderIcon,
  terminal: TerminalIcon,
  notepad: PenIcon,
  code: CodeIcon,
  paint: BrushIcon,
  browser: GhostIcon,
  gallery: ImageIcon,
  media: MusicNoteIcon,
  calculator: CalculatorIcon,
  settings: GearIcon,
  trash: TrashIcon,
  monitor: GaugeIcon,
  video: FilmIcon,
};

/** Human-readable names, used where a title is absent. */
export const APP_NAMES = {
  files: 'File Explorer',
  terminal: 'Terminal',
  notepad: 'Notepad',
  code: 'Code Studio',
  paint: 'Paint Studio',
  browser: 'Ghost Browser',
  gallery: 'Image Viewer',
  media: 'Audio Player',
  calculator: 'Calculator',
  settings: 'Settings',
  trash: 'Recycle Bin',
  monitor: 'Task Manager',
  video: 'Video Studio',
};

/** Returns a rendered icon element for an app id. */
export function appIcon(appId, size = 15) {
  const Icon = REGISTRY[appId] || FileIcon;
  return <Icon size={size} />;
}

/** Fallback accent per app, for tinting chrome that has no screenshot. */
export const APP_ACCENTS = {
  files: '#7eb8ff',
  terminal: '#34d399',
  notepad: '#fbbf24',
  code: '#a78bfa',
  paint: '#ff4d6a',
  browser: '#7eb8ff',
  gallery: '#34d399',
  media: '#a78bfa',
  calculator: '#fbbf24',
  settings: '#7eb8ff',
  trash: '#ff4d6a',
  monitor: '#34d399',
  video: '#a78bfa',
};

/* ══════════════════════════════════════════════
   FILE TYPE ICONS
   ══════════════════════════════════════════════ */

const EXT_ICONS = {
  // audio
  mp3: FileAudioIcon, wav: FileAudioIcon, ogg: FileAudioIcon, oga: FileAudioIcon,
  flac: FileAudioIcon, m4a: FileAudioIcon, aac: FileAudioIcon, opus: FileAudioIcon,
  weba: FileAudioIcon,
  // video
  mp4: FileVideoIcon, webm: FileVideoIcon, mkv: FileVideoIcon, mov: FileVideoIcon,
  avi: FileVideoIcon, m4v: FileVideoIcon, ogv: FileVideoIcon,
  // image
  png: FileImageIcon, jpg: FileImageIcon, jpeg: FileImageIcon, gif: FileImageIcon,
  webp: FileImageIcon, avif: FileImageIcon, svg: FileImageIcon, bmp: FileImageIcon,
  ico: FileImageIcon,
  // code
  js: FileCodeIcon, jsx: FileCodeIcon, ts: FileCodeIcon, tsx: FileCodeIcon,
  css: FileCodeIcon, html: FileCodeIcon, json: FileCodeIcon, sh: FileCodeIcon,
  py: FileCodeIcon, rs: FileCodeIcon, go: FileCodeIcon, yml: FileCodeIcon,
  yaml: FileCodeIcon, xml: FileCodeIcon,
  // documents
  txt: FileTextIcon, md: FileTextIcon, log: FileTextIcon, rtf: FileTextIcon,
  pdf: FilePdfIcon,
  csv: FileSheetIcon, xlsx: FileSheetIcon, xls: FileSheetIcon,
  // archives & fonts
  zip: FileArchiveIcon, gz: FileArchiveIcon, tar: FileArchiveIcon,
  rar: FileArchiveIcon, '7z': FileArchiveIcon,
  ttf: FileFontIcon, otf: FileFontIcon, woff: FileFontIcon, woff2: FileFontIcon,
};

/**
 * Icon for a file, chosen by extension.
 *
 * Extension rather than stored MIME because the browser leaves `file.type`
 * empty for several containers (.mkv most notably), and a file created
 * inside the OS may have no MIME recorded at all.
 */
export function fileIcon(name = '', size = 18) {
  const ext = name.toLowerCase().split('.').pop();
  const Icon = EXT_ICONS[ext] || FileIcon;
  return <Icon size={size} />;
}

/** The icon component itself, when a caller needs to pass props. */
export function fileIconComponent(name = '') {
  const ext = name.toLowerCase().split('.').pop();
  return EXT_ICONS[ext] || FileIcon;
}
