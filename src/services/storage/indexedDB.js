// Virtual File System (VFS) backed by browser IndexedDB

const DB_NAME = 'billighost_os_vfs';
const DB_VERSION = 1;
const STORE_NODES = 'vfs_nodes';

let dbInstancePromise = null;

function openDB() {
  if (dbInstancePromise) return dbInstancePromise;

  dbInstancePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NODES)) {
        const store = db.createObjectStore(STORE_NODES, { keyPath: 'path' });
        store.createIndex('parentPath', 'parentPath', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    };

    request.onsuccess = (e) => {
      resolve(e.target.result);
    };

    request.onerror = (e) => {
      reject(e.target.error);
    };
  });

  return dbInstancePromise;
}

const DEFAULT_DIRS = [
  '/',
  '/Users',
  '/Users/User',
  '/Users/User/Desktop',
  '/Users/User/Documents',
  '/Users/User/Downloads',
  '/Users/User/Pictures',
  '/Users/User/Music',
];

const DEFAULT_FILES = [
  {
    path: '/Users/User/Desktop/Welcome.txt',
    name: 'Welcome.txt',
    parentPath: '/Users/User/Desktop',
    type: 'file',
    content: `Welcome to Billighost OS!\n\nThis operating system runs entirely inside your browser using modern Web APIs:\n- Virtual File System backed by IndexedDB\n- Real System Telemetry (Live Battery API, Network Info, Weather)\n- Local persistent settings & Cache Storage\n\nFeel free to create files, write notes, run terminal commands, and customize your OS in Settings!`,
    mimeType: 'text/plain',
  },
  {
    path: '/Users/User/Desktop/OS_Notes.md',
    name: 'OS_Notes.md',
    parentPath: '/Users/User/Desktop',
    type: 'file',
    content: `# Billighost OS — Release Notes\n\n### System Specs\n- Kernel: Web Browser Sandbox\n- Storage: IndexedDB VFS + LocalStorage\n- Window Manager: Billighost Multi-Window Engine with Aero Snap\n- Sound Engine: Web Audio API\n\nEnjoy pair programming and testing the system!`,
    mimeType: 'text/markdown',
  },
  {
    path: '/Users/User/Documents/Terminal_Guide.txt',
    name: 'Terminal_Guide.txt',
    parentPath: '/Users/User/Documents',
    type: 'file',
    content: `Available Terminal Commands:\n- ls [path]       : List contents of directory\n- cd [path]       : Change directory\n- pwd             : Print working directory\n- cat <file>      : Display file contents\n- touch <file>    : Create an empty file\n- mkdir <folder>  : Create a folder\n- rm <path>       : Delete a file or directory\n- sysinfo         : Real hardware telemetry breakdown\n- neofetch        : Cyberpunk OS telemetry banner\n- storage         : Inspect IndexedDB usage\n- clear           : Clear terminal screen\n- help            : List available commands`,
    mimeType: 'text/plain',
  },
  {
    path: '/Users/User/Pictures/Neon_Wallpaper.svg',
    name: 'Neon_Wallpaper.svg',
    parentPath: '/Users/User/Pictures',
    type: 'file',
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><defs><radialGradient id="g" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#1e1b4b"/><stop offset="50%" stop-color="#0f172a"/><stop offset="100%" stop-color="#050505"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="400" cy="250" r="120" fill="none" stroke="#7eb8ff" stroke-width="3" stroke-dasharray="8 8"/><text x="400" y="255" fill="#e2e8f0" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">BILLIGHOST OS</text><text x="400" y="285" fill="#94a3b8" font-family="sans-serif" font-size="14" text-anchor="middle">High-Definition Image Preview</text></svg>`,
    mimeType: 'image/svg+xml',
  },
  {
    path: '/Users/User/Music/Ambient_Track.txt',
    name: 'Ambient_Track.txt',
    parentPath: '/Users/User/Music',
    type: 'file',
    content: `Track: Billighost Ambient Synth (Procedural)\nGenre: Cyberpunk Chillwave\nEngine: Web Audio Oscillator Synthesizer`,
    mimeType: 'text/plain',
  },
];

export const VFS = {
  async init() {
    const db = await openDB();
    const count = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NODES, 'readonly');
      const store = tx.objectStore(STORE_NODES);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });

    if (count === 0) {
      await this.seedDefaults();
    }
  },

  async seedDefaults() {
    const db = await openDB();
    const tx = db.transaction(STORE_NODES, 'readwrite');
    const store = tx.objectStore(STORE_NODES);

    const now = Date.now();

    for (const dir of DEFAULT_DIRS) {
      const parts = dir.split('/').filter(Boolean);
      const name = parts[parts.length - 1] || '/';
      const parentParts = parts.slice(0, -1);
      const parentPath = dir === '/' ? null : '/' + parentParts.join('/');

      store.put({
        path: dir,
        name,
        parentPath,
        type: 'dir',
        content: null,
        size: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const file of DEFAULT_FILES) {
      store.put({
        ...file,
        size: new Blob([file.content]).size,
        createdAt: now,
        updatedAt: now,
      });
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        window.dispatchEvent(new CustomEvent('billighost:vfs-update'));
        resolve(true);
      };
      tx.onerror = () => reject(tx.error);
    });
  },

  async listDirectory(dirPath = '/Users/User/Desktop') {
    const db = await openDB();
    const cleanPath = dirPath.length > 1 && dirPath.endsWith('/') ? dirPath.slice(0, -1) : dirPath;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NODES, 'readonly');
      const store = tx.objectStore(STORE_NODES);
      const index = store.index('parentPath');
      const req = index.getAll(cleanPath);

      req.onsuccess = () => {
        resolve(req.result || []);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async getNode(path) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NODES, 'readonly');
      const store = tx.objectStore(STORE_NODES);
      const req = store.get(path);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async readFile(path) {
    const node = await this.getNode(path);
    if (!node) throw new Error(`File not found: ${path}`);
    if (node.type !== 'file') throw new Error(`Path is a directory: ${path}`);
    return node.content;
  },

  async writeFile(path, content, mimeType = 'text/plain') {
    const db = await openDB();
    const parts = path.split('/').filter(Boolean);
    const name = parts[parts.length - 1];
    const parentPath = '/' + parts.slice(0, -1).join('/');
    const now = Date.now();
    const size = new Blob([content]).size;

    const existing = await this.getNode(path);

    const node = {
      path,
      name,
      parentPath: parentPath || '/',
      type: 'file',
      content,
      mimeType,
      size,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NODES, 'readwrite');
      const store = tx.objectStore(STORE_NODES);
      const req = store.put(node);
      req.onsuccess = () => {
        window.dispatchEvent(new CustomEvent('billighost:vfs-update', { detail: { path, action: 'write' } }));
        resolve(node);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async createDirectory(path) {
    const db = await openDB();
    const cleanPath = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
    const parts = cleanPath.split('/').filter(Boolean);
    const name = parts[parts.length - 1];
    const parentPath = '/' + parts.slice(0, -1).join('/');
    const now = Date.now();

    const node = {
      path: cleanPath,
      name,
      parentPath: parentPath || '/',
      type: 'dir',
      content: null,
      size: 0,
      createdAt: now,
      updatedAt: now,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NODES, 'readwrite');
      const store = tx.objectStore(STORE_NODES);
      const req = store.put(node);
      req.onsuccess = () => {
        window.dispatchEvent(new CustomEvent('billighost:vfs-update', { detail: { path: cleanPath, action: 'mkdir' } }));
        resolve(node);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async deleteNode(path) {
    const db = await openDB();
    const cleanPath = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;

    // Get all children recursively if directory
    const allNodes = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NODES, 'readonly');
      const store = tx.objectStore(STORE_NODES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    const pathsToDelete = [cleanPath];
    for (const node of allNodes) {
      if (node.path.startsWith(cleanPath + '/')) {
        pathsToDelete.push(node.path);
      }
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NODES, 'readwrite');
      const store = tx.objectStore(STORE_NODES);

      pathsToDelete.forEach(p => store.delete(p));

      tx.oncomplete = () => {
        window.dispatchEvent(new CustomEvent('billighost:vfs-update', { detail: { path: cleanPath, action: 'delete' } }));
        resolve(true);
      };
      tx.onerror = () => reject(tx.error);
    });
  },

  async renameNode(oldPath, newPath) {
    const node = await this.getNode(oldPath);
    if (!node) throw new Error(`Node not found: ${oldPath}`);

    const parts = newPath.split('/').filter(Boolean);
    const newName = parts[parts.length - 1];
    const newParent = '/' + parts.slice(0, -1).join('/');

    await this.deleteNode(oldPath);

    const updatedNode = {
      ...node,
      path: newPath,
      name: newName,
      parentPath: newParent || '/',
      updatedAt: Date.now(),
    };

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NODES, 'readwrite');
      const store = tx.objectStore(STORE_NODES);
      store.put(updatedNode);
      tx.oncomplete = () => {
        window.dispatchEvent(new CustomEvent('billighost:vfs-update', { detail: { oldPath, newPath, action: 'rename' } }));
        resolve(updatedNode);
      };
      tx.onerror = () => reject(tx.error);
    });
  },

  async exportFile(path) {
    const node = await this.getNode(path);
    if (!node || node.type !== 'file') throw new Error('File cannot be exported');

    const blob = new Blob([node.content], { type: node.mimeType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = node.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async resetToDefaults() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NODES, 'readwrite');
      const store = tx.objectStore(STORE_NODES);
      const req = store.clear();
      req.onsuccess = async () => {
        await this.seedDefaults();
        resolve(true);
      };
      req.onerror = () => reject(req.error);
    });
  },
};
