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
  FileIcon,
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
};
