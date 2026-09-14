/**
 * The single description of every app in the OS.
 *
 * Before this existed, an app's identity was spread across four places: icon
 * and accent in appIcons.jsx, default size in a literal inside DesktopScreen,
 * file associations in fileRouting.js, and the component itself in a
 * 13-branch `appId ===` chain. Adding one cross-cutting feature therefore
 * meant thirteen edits, which is why per-app settings, minimal mode and
 * per-app sizing did not exist. Everything about an app now lives in one
 * record.
 *
 * Deliberately free of JSX: `icon` is a *name* resolved by appIcons.jsx, so
 * this module stays importable by the unit tests with no build step. The
 * moment this file imports a component, it stops being testable.
 *
 * `minSize` is per app because the old global 380x360 floor in Window.jsx was
 * a workaround for apps that could not adapt. An app that declares a micro
 * layout may go far smaller — the Audio Player becomes a 180x96 mini player —
 * while one that genuinely cannot (a code editor needs a gutter plus an
 * editor pane) keeps a real floor.
 */

/** Settings every app receives whether it declares them or not. */
export const UNIVERSAL_SETTINGS = {
  minimalMode: {
    type: 'toggle', label: 'Minimal mode', default: false,
    hint: 'Hide the toolbar, side panel and status bar.',
  },
  density: {
    type: 'segmented', label: 'Density', default: 'inherit',
    options: [
      ['inherit', 'System'], ['comfortable', 'Roomy'],
      ['cozy', 'Cozy'], ['compact', 'Tight'],
    ],
  },
};

export const APPS = [
  {
    id: 'files', name: 'File Explorer', icon: 'folder', accent: '#7eb8ff',
    load: () => import('../apps/FileManagerApp.jsx'),
    defaultSize: { w: 760, h: 500 }, minSize: { w: 320, h: 240 },
    desktop: true, opens: [],
    settings: {
      view: {
        type: 'segmented', label: 'Default view', default: 'grid',
        options: [['grid', 'Grid'], ['list', 'List'], ['columns', 'Columns']],
      },
      thumbnails: { type: 'toggle', label: 'Thumbnails', default: true },
      hiddenFiles: { type: 'toggle', label: 'Show hidden files', default: false },
      inspector: { type: 'toggle', label: 'Inspector panel', default: true },
      iconScale: {
        type: 'number', label: 'Icon size', default: 64,
        min: 40, max: 128, step: 8, unit: 'px',
      },
    },
  },
  {
    id: 'terminal', name: 'Terminal', icon: 'terminal', accent: '#34d399',
    load: () => import('../apps/TerminalApp.jsx'),
    defaultSize: { w: 680, h: 420 }, minSize: { w: 280, h: 180 },
    desktop: true, opens: [],
    settings: {
      fontSize: {
        type: 'number', label: 'Font size', default: 13,
        min: 10, max: 22, step: 1, unit: 'px',
      },
      scheme: {
        type: 'select', label: 'Colour scheme', default: 'ghost',
        options: [['ghost', 'Ghost'], ['amber', 'Amber'], ['mono', 'Monochrome'], ['matrix', 'Matrix']],
      },
      cursorBlink: { type: 'toggle', label: 'Blink cursor', default: true },
      bell: { type: 'toggle', label: 'Audible bell', default: false },
    },
  },
  {
    id: 'notepad', name: 'Notepad', icon: 'pen', accent: '#fbbf24',
    load: () => import('../apps/NotepadApp.jsx'),
    defaultSize: { w: 620, h: 460 }, minSize: { w: 260, h: 200 },
    desktop: true, opens: ['txt', 'md', 'log', 'rtf'],
    settings: {
      fontSize: {
        type: 'number', label: 'Font size', default: 14,
        min: 11, max: 24, step: 1, unit: 'px',
      },
      wrap: { type: 'toggle', label: 'Wrap lines', default: true },
      spellcheck: { type: 'toggle', label: 'Spell check', default: false },
      autosave: { type: 'toggle', label: 'Autosave', default: true },
    },
  },
  {
    id: 'code', name: 'Code Studio', icon: 'code', accent: '#a78bfa',
    load: () => import('../apps/CodeEditorApp.jsx'),
    defaultSize: { w: 900, h: 580 }, minSize: { w: 420, h: 300 },
    desktop: true,
    opens: ['js', 'jsx', 'ts', 'tsx', 'css', 'json', 'html', 'sh', 'py', 'rs', 'go', 'yml', 'yaml', 'xml'],
    settings: {
      theme: {
        type: 'select', label: 'Theme', default: 'cyberDark',
        options: [['cyberDark', 'Cyber Dark'], ['dracula', 'Dracula'], ['monokai', 'Monokai'], ['synthwave', 'Synthwave']],
      },
      fontSize: {
        type: 'number', label: 'Font size', default: 13,
        min: 10, max: 22, step: 1, unit: 'px',
      },
      indent: {
        type: 'segmented', label: 'Indent', default: 2,
        options: [[2, '2'], [4, '4'], [8, '8']],
      },
      wordWrap: { type: 'toggle', label: 'Word wrap', default: false },
      minimap: { type: 'toggle', label: 'Minimap', default: true },
      lineNumbers: { type: 'toggle', label: 'Line numbers', default: true },
      sidebar: { type: 'toggle', label: 'File tree', default: true },
    },
  },
  {
    id: 'paint', name: 'Paint Studio', icon: 'brush', accent: '#ff4d6a',
    load: () => import('../apps/PaintStudioApp.jsx'),
    defaultSize: { w: 900, h: 600 }, minSize: { w: 420, h: 320 },
    desktop: true, opens: [],
    settings: {
      canvasBg: { type: 'color', label: 'Canvas colour', default: '#0a0a0f' },
      smoothing: { type: 'toggle', label: 'Smooth strokes', default: true },
      pressure: { type: 'toggle', label: 'Pressure sensitivity', default: true },
      gridOverlay: { type: 'toggle', label: 'Grid overlay', default: false },
    },
  },
  {
    id: 'browser', name: 'Ghost Browser', icon: 'ghost', accent: '#7eb8ff',
    load: () => import('../apps/GhostBrowserApp.jsx'),
    defaultSize: { w: 900, h: 600 }, minSize: { w: 360, h: 280 },
    desktop: true, opens: ['htm'],
    settings: {
      homepage: {
        type: 'select', label: 'Homepage', default: 'about:start',
        options: [['about:start', 'Start page'], ['about:search', 'Search'], ['about:billighost', 'OS Guide']],
      },
      bookmarksBar: { type: 'toggle', label: 'Bookmarks bar', default: true },
      blockTrackers: { type: 'toggle', label: 'Block trackers', default: true },
    },
  },
  {
    id: 'gallery', name: 'Image Viewer', icon: 'image', accent: '#34d399',
    load: () => import('../apps/ImageViewerApp.jsx'),
    defaultSize: { w: 720, h: 520 }, minSize: { w: 220, h: 160 },
    desktop: true,
    opens: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'bmp', 'ico'],
    settings: {
      fit: {
        type: 'segmented', label: 'Default fit', default: 'contain',
        options: [['contain', 'Fit'], ['cover', 'Fill'], ['actual', '1:1']],
      },
      background: {
        type: 'segmented', label: 'Backdrop', default: 'dark',
        options: [['dark', 'Dark'], ['checker', 'Checker'], ['blur', 'Blurred']],
      },
      slideshowSecs: {
        type: 'number', label: 'Slideshow delay', default: 4,
        min: 1, max: 30, step: 1, unit: 's',
      },
      filmstrip: { type: 'toggle', label: 'Filmstrip', default: true },
    },
  },
  {
    id: 'media', name: 'Audio Player', icon: 'music-note', accent: '#a78bfa',
    load: () => import('../apps/AudioPlayerApp.jsx'),
    defaultSize: { w: 460, h: 340 }, minSize: { w: 180, h: 96 },
    desktop: true,
    opens: ['mp3', 'wav', 'ogg', 'oga', 'flac', 'm4a', 'aac', 'opus', 'weba'],
    settings: {
      artStyle: {
        type: 'segmented', label: 'Artwork', default: 'cover',
        options: [['cover', 'Cover'], ['wave', 'Waveform'], ['none', 'None']],
      },
      showQueue: { type: 'toggle', label: 'Queue panel', default: true },
      showEq: { type: 'toggle', label: 'Equalizer', default: false },
      crossfade: {
        type: 'number', label: 'Crossfade', default: 0,
        min: 0, max: 12, step: 1, unit: 's',
      },
      normalize: { type: 'toggle', label: 'Normalise volume', default: false },
    },
  },
  {
    id: 'calculator', name: 'Calculator', icon: 'calculator', accent: '#fbbf24',
    load: () => import('../apps/CalculatorApp.jsx'),
    defaultSize: { w: 340, h: 480 }, minSize: { w: 200, h: 240 },
    desktop: true, opens: [],
    settings: {
      mode: {
        type: 'segmented', label: 'Mode', default: 'basic',
        options: [['basic', 'Basic'], ['scientific', 'Scientific'], ['convert', 'Convert']],
      },
      thousands: { type: 'toggle', label: 'Thousands separators', default: true },
      keepTape: { type: 'toggle', label: 'Keep tape history', default: true },
    },
  },
  {
    id: 'settings', name: 'Settings', icon: 'gear', accent: '#7eb8ff',
    load: () => import('../apps/SettingsApp.jsx'),
    defaultSize: { w: 860, h: 580 }, minSize: { w: 360, h: 300 },
    desktop: false, opens: [],
    settings: {},
  },
  {
    id: 'trash', name: 'Recycle Bin', icon: 'trash', accent: '#ff4d6a',
    load: () => import('../apps/RecycleBinApp.jsx'),
    defaultSize: { w: 720, h: 460 }, minSize: { w: 320, h: 240 },
    desktop: true, opens: [],
    settings: {
      confirmDelete: { type: 'toggle', label: 'Confirm permanent delete', default: true },
      autoEmptyDays: {
        type: 'number', label: 'Auto-empty after', default: 0,
        min: 0, max: 90, step: 1, unit: 'd',
      },
    },
  },
  {
    id: 'monitor', name: 'Task Manager', icon: 'gauge', accent: '#34d399',
    load: () => import('../apps/TaskManagerApp.jsx'),
    defaultSize: { w: 620, h: 440 }, minSize: { w: 280, h: 220 },
    desktop: false, opens: [],
    settings: {
      refreshMs: {
        type: 'number', label: 'Refresh interval', default: 1000,
        min: 250, max: 5000, step: 250, unit: 'ms',
      },
      graphs: { type: 'toggle', label: 'Show graphs', default: true },
    },
  },
  {
    id: 'video', name: 'Video Studio', icon: 'film', accent: '#a78bfa',
    load: () => import('../apps/VideoEditorApp.jsx'),
    defaultSize: { w: 960, h: 620 }, minSize: { w: 260, h: 150 },
    desktop: true,
    opens: ['mp4', 'webm', 'mkv', 'mov', 'avi', 'm4v', 'ogv'],
    settings: {
      autoplay: { type: 'toggle', label: 'Autoplay on open', default: true },
      loop: { type: 'toggle', label: 'Loop', default: false },
      timeline: { type: 'toggle', label: 'Timeline panel', default: true },
      volume: {
        type: 'number', label: 'Default volume', default: 80,
        min: 0, max: 100, step: 5, unit: '%',
      },
    },
  },
];
