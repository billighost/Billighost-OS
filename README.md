# Billighost OS

**A full desktop operating system running in your browser.** Boot screen, windows, a start menu, file manager, terminal, a code editor, a paint studio and a video editor, all built from scratch in React with no UI kit.

**[Live demo → billighost-os.vercel.app](https://billighost-os.vercel.app/)** (best on a desktop screen)

---

## What's inside

**Desktop shell**
- Boot sequence with a canvas entanglement animation
- Draggable, resizable windows with a window manager and Task View
- Start menu, Spotlight-style search, widgets panel and system tray flyouts
- Global right-click context menu and notification toasts
- Live animated wallpapers and a liquid-glass visual theme
- System hooks for battery, network status, audio and storage quota

**Built-in apps**

| Productivity and tools | Creative | Also included |
|---|---|---|
| File Manager, Recycle Bin | Paint Studio | Aetheria 3D |
| Notepad, Code Editor | Video Editor | Cyber Swarm |
| Terminal, Task Manager | Audio Player, Image Viewer | Subway Surge |
| Calculator, Settings | Ghost Browser | Void Strike |

---

## How it's built

The interesting part is that **every app is declared in one manifest** (`src/app/manifest.js`) and nothing else needs editing to add one. The manifest holds each app's id, icon, default and minimum window size, the file extensions it opens, and its settings schema.

`src/app/registry.js` derives everything else from that single source:

- **File associations** are built from each app's declared extensions, so double-clicking a `.png` opens the Image Viewer and unknown types fall back to Notepad. A new app can't silently disagree with a separate routing table.
- **Window sizing** comes from per-app tiers, with safe fallbacks so a window is never created too small to grab.
- **Settings** merge each app's own schema with a universal set every app receives.

### Stack

- React 19 with CSS Modules
- Vite
- Three.js for 3D and live wallpapers
- Oxlint for linting
- Node's built-in test runner for unit tests, and Playwright for browser checks

---

## Run it locally

```bash
git clone https://github.com/billighost/Billighost-OS.git
cd Billighost-OS
npm install
npm run dev          # start the dev server
```

| Command | What it does |
|---|---|
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Lint with Oxlint |
| `npm run test:unit` | Run unit tests |

---

## Status

Actively developed. New apps and shell features are added regularly.

Built by [Bilal Bello](https://github.com/billighost).
