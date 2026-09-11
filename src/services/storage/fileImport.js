/**
 * Billighost OS — File Import / Export
 *
 * One pipeline every app shares, so an imported song, image or video lands
 * in the virtual file system and can be reopened from File Explorer later
 * instead of vanishing when its window closes.
 *
 * Why this exists as a service:
 *   • Binary safety — FileReader.readAsText() on a video decodes the bytes
 *     as UTF-8 and produces a ~50-million-character string for a 50MB file,
 *     which hangs the tab. Binary types are kept as Blobs throughout.
 *   • Routing — each kind of file has a canonical home (Music, Pictures,
 *     Videos, Documents), so imports are findable afterwards.
 *   • Guard rails — a size ceiling and a clear error beat a frozen page.
 */

import { VFS } from './indexedDB';

/** Where each kind of file belongs. */
export const LIBRARY = {
  audio: '/Users/User/Music',
  video: '/Users/User/Videos',
  image: '/Users/User/Pictures',
  text: '/Users/User/Documents',
  other: '/Users/User/Downloads',
};

/*
 * IndexedDB can hold far more than this, but a single blob beyond a few
 * hundred MB makes the quota unpredictable and the UI sluggish. Refusing
 * with a message is better behaviour than appearing to hang.
 */
export const MAX_IMPORT_BYTES = 512 * 1024 * 1024;   // 512 MB

/** Accept strings for each media class, including the formats you asked for. */
export const ACCEPT = {
  audio: 'audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac,.opus,.weba',
  video: 'video/*,.mp4,.webm,.mkv,.mov,.avi,.m4v,.ogv',
  image: 'image/*,.png,.jpg,.jpeg,.gif,.webp,.avif,.svg,.bmp',
  text: '.txt,.md,.json,.js,.css,.html,.csv,.log,.sh,.yml,.yaml',
  any: '*/*',
};

/*
 * Extension → MIME, for the cases the browser leaves blank.
 *
 * Chrome reports an empty `file.type` for .mkv on most systems, so relying
 * on the browser alone would classify a Matroska video as "other" and route
 * it to Downloads as text.
 */
const EXT_MIME = {
  mkv: 'video/x-matroska',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  m4v: 'video/x-m4v',
  ogv: 'video/ogg',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/opus',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  weba: 'audio/webm',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  md: 'text/markdown',
  txt: 'text/plain',
  json: 'application/json',
  js: 'application/javascript',
  css: 'text/css',
  html: 'text/html',
  csv: 'text/csv',
};

export function extensionOf(name = '') {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

/** Best-effort MIME type, preferring the extension when the browser is silent. */
export function resolveMime(file) {
  const byExt = EXT_MIME[extensionOf(file.name)];
  if (file.type && file.type !== 'application/octet-stream') return file.type;
  return byExt || file.type || 'application/octet-stream';
}

/** Media class used for routing and for choosing an icon. */
export function classify(file) {
  const mime = resolveMime(file);
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('text/') || /json|javascript|xml|yaml/.test(mime)) return 'text';
  return 'other';
}

export function isBinaryClass(kind) {
  return kind === 'audio' || kind === 'video' || kind === 'image' || kind === 'other';
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Appends " (2)", " (3)" … so an import never silently overwrites. */
async function uniquePath(dir, name) {
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';

  for (let i = 0; i < 200; i++) {
    const candidate = i === 0 ? `${dir}/${name}` : `${dir}/${stem} (${i + 1})${ext}`;
    const existing = await VFS.getNode(candidate).catch(() => null);
    if (!existing) return candidate;
  }
  return `${dir}/${stem} (${Date.now()})${ext}`;
}

/** Creates a directory chain if any part of it is missing. */
async function ensureDir(dir) {
  const parts = dir.split('/').filter(Boolean);
  let path = '';
  for (const part of parts) {
    path += `/${part}`;
    const node = await VFS.getNode(path).catch(() => null);
    if (!node) {
      await VFS.createDirectory(path).catch(() => { /* raced or exists */ });
    }
  }
}

/**
 * Imports one File into the VFS and returns a descriptor.
 *
 * @param {File} file
 * @param {object} [opts]
 * @param {string} [opts.dir]  override the destination directory
 * @returns {Promise<{path, name, mimeType, kind, size, url}>}
 */
export async function importFile(file, opts = {}) {
  if (!file) throw new Error('No file provided');

  if (file.size > MAX_IMPORT_BYTES) {
    throw new Error(
      `"${file.name}" is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_IMPORT_BYTES)}.`
    );
  }

  const kind = classify(file);
  const mimeType = resolveMime(file);
  const dir = opts.dir || LIBRARY[kind] || LIBRARY.other;

  await ensureDir(dir);
  const path = await uniquePath(dir, file.name);

  /*
   * Binary files are stored as the Blob itself — no decoding, no giant
   * string, no main-thread stall. Text is read as text so editors can work
   * with it directly.
   */
  let content;
  if (isBinaryClass(kind) && mimeType !== 'image/svg+xml') {
    content = file.slice(0, file.size, mimeType);   // a Blob, cheaply
  } else {
    content = await file.text();
  }

  await VFS.writeFile(path, content, mimeType);

  return {
    path,
    name: file.name,
    mimeType,
    kind,
    size: file.size,
    url: content instanceof Blob ? URL.createObjectURL(content) : null,
  };
}

/** Imports several files, collecting per-file failures instead of aborting. */
export async function importFiles(fileList, opts = {}) {
  const files = Array.from(fileList || []);
  const imported = [];
  const failed = [];

  for (const file of files) {
    try {
      imported.push(await importFile(file, opts));
    } catch (err) {
      failed.push({ name: file.name, message: err?.message || String(err) });
    }
  }
  return { imported, failed };
}

/**
 * Returns a playable/displayable URL for a stored VFS file.
 *
 * Callers MUST revoke it when done (see revokeUrl) — blob URLs are held for
 * the lifetime of the document otherwise.
 */
export async function urlForPath(path) {
  const node = await VFS.getNode(path);
  if (!node) throw new Error(`Not found: ${path}`);

  if (node.content instanceof Blob) {
    return { url: URL.createObjectURL(node.content), mimeType: node.mimeType, node };
  }

  // Text content: wrap it so <img>/<video> style consumers still work.
  const blob = new Blob([node.content ?? ''], { type: node.mimeType || 'text/plain' });
  return { url: URL.createObjectURL(blob), mimeType: node.mimeType, node };
}

export function revokeUrl(url) {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

/** Saves generated content (a canvas export, a recording) into the VFS. */
export async function saveToLibrary(blob, name, kind = 'other', opts = {}) {
  const dir = opts.dir || LIBRARY[kind] || LIBRARY.other;
  await ensureDir(dir);
  const path = await uniquePath(dir, name);
  await VFS.writeFile(path, blob, blob.type || 'application/octet-stream');
  return { path, name, kind, size: blob.size, mimeType: blob.type };
}

/** Downloads a stored file to the real machine. */
export async function exportToDisk(path) {
  const { url, node } = await urlForPath(path);
  const a = document.createElement('a');
  a.href = url;
  a.download = node.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a tick to start the download before releasing the URL.
  setTimeout(() => revokeUrl(url), 1000);
}
