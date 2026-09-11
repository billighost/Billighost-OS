/**
 * Billighost OS — File → App routing.
 *
 * Shared so a file opens in the same app from the desktop, File Explorer,
 * Spotlight or anywhere else. Previously each call site had its own inline
 * check, and the desktop's knew only about images — so double-clicking a
 * song there opened Notepad.
 */

export const OPEN_WITH = {
  gallery: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'bmp', 'ico'],
  video: ['mp4', 'webm', 'mkv', 'mov', 'avi', 'm4v', 'ogv'],
  media: ['mp3', 'wav', 'ogg', 'oga', 'flac', 'm4a', 'aac', 'opus', 'weba'],
  code: ['js', 'jsx', 'ts', 'tsx', 'css', 'json', 'html', 'sh', 'py', 'rs', 'go', 'yml', 'yaml', 'xml'],
};

/** App id that should open a given filename. Text and unknown → notepad. */
export function appForFile(name = '') {
  const ext = name.toLowerCase().split('.').pop();
  for (const [app, exts] of Object.entries(OPEN_WITH)) {
    if (exts.includes(ext)) return app;
  }
  return 'notepad';
}
