# Billighost Phase 1A — Foundation Services & Primitives

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure-logic services and the control-primitive library that every later phase depends on, verified in isolation — without touching a single app.

**Architecture:** Four dependency-free service modules (`sizeTiers`, `manifest`/`registry`, `appSettings`, `appearance`) tested with Node's built-in test runner, plus a 15-component control library in `src/components/ui/` exercised through a dev-only Primitives Gallery that Playwright drives. Nothing in this plan modifies an existing app, `Window.jsx`, or `DesktopScreen.jsx`, so it cannot regress the running OS.

**Tech Stack:** React 19, Vite 8, CSS Modules, `node --test` (built in, zero new deps), Playwright 1.63 (already installed).

**Spec:** `docs/superpowers/specs/2026-09-11-billighost-phase1-foundation-design.md`

## Global Constraints

- **No new runtime dependencies.** The project ships React + React DOM + two fontsource packages. Keep it that way.
- **ESM only.** `package.json` has `"type": "module"`. Unit tests are `.test.mjs`; Playwright scripts stay `.cjs` (existing convention).
- **Data modules must not import JSX.** `manifest.js` references icons by *string name* so `node --test` can import it without a build step. Icon components resolve in `appIcons.jsx`.
- **Every primitive:** keyboard-operable, `role`/`aria-*` correct, honours `--motion-scale`, sized from density tokens (`--ctl-h`, `--ui-gap`, `--ui-pad`), never a native `input[type=range|color|checkbox]` or `select`.
- **Design tokens already exist** in `src/index.css:8-95` — reuse `--accent-glow`, `--glass-*`, `--radius-*`, `--ease-*`. Do not invent a parallel palette.
- **Tier thresholds (floors, both axes must be met):** `micro` 0×0, `compact` 300×210, `regular` 540×400, `wide` 920×560. Hysteresis 12px.
- **Test commands:** `npm run test:unit` (node), `npm run dev:test` (vite on 5200), `node scripts/verify-*.cjs` (Playwright, needs 5200 up).
- **Commit after every task.** Trailer: `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

---

### Task 1: Test infrastructure + size tier logic

**Files:**
- Create: `src/app/sizeTiers.js`
- Create: `tests/unit/sizeTiers.test.mjs`
- Modify: `package.json` (scripts block)

**Interfaces:**
- Consumes: nothing
- Produces: `computeTier(w, h, prev = null) -> 'micro'|'compact'|'regular'|'wide'`, `TIER_FLOORS`, `TIER_ORDER`, `atLeast(tier, min) -> boolean`

- [ ] **Step 1: Add npm scripts**

In `package.json` `"scripts"`, add:

```json
"test:unit": "node --test tests/unit/",
"dev:test": "vite --port 5200"
```

- [ ] **Step 2: Write the failing test**

Create `tests/unit/sizeTiers.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeTier, atLeast, TIER_ORDER } from '../../src/app/sizeTiers.js';

test('tiers are ordered smallest to largest', () => {
  assert.deepEqual(TIER_ORDER, ['micro', 'compact', 'regular', 'wide']);
});

test('classifies by both axes, not just width', () => {
  assert.equal(computeTier(180, 96), 'micro');
  assert.equal(computeTier(400, 300), 'compact');
  assert.equal(computeTier(700, 500), 'regular');
  assert.equal(computeTier(1200, 700), 'wide');
});

test('a wide but very short window is not wide', () => {
  // 1200x200 has plenty of width but cannot lay out rows — height decides.
  assert.equal(computeTier(1200, 200), 'micro');
  assert.equal(computeTier(1200, 380), 'compact');
});

test('hysteresis keeps a window from thrashing on a boundary', () => {
  // Growing past the compact floor (300x210) needs +12px on both axes.
  assert.equal(computeTier(305, 215, 'micro'), 'micro');   // inside deadband
  assert.equal(computeTier(313, 223, 'micro'), 'compact'); // cleared it
  // Shrinking out of compact needs to drop 12px below the floor.
  assert.equal(computeTier(295, 205, 'compact'), 'compact'); // still inside
  assert.equal(computeTier(287, 197, 'compact'), 'micro');   // dropped out
});

test('with no previous tier there is no deadband', () => {
  assert.equal(computeTier(305, 215, null), 'compact');
});

test('atLeast compares tier rank', () => {
  assert.equal(atLeast('regular', 'compact'), true);
  assert.equal(atLeast('compact', 'regular'), false);
  assert.equal(atLeast('wide', 'wide'), true);
});

test('degenerate sizes do not throw', () => {
  assert.equal(computeTier(0, 0), 'micro');
  assert.equal(computeTier(NaN, NaN), 'micro');
});
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module '.../src/app/sizeTiers.js'`

- [ ] **Step 4: Implement**

Create `src/app/sizeTiers.js`:

```js
/**
 * Window size tiers.
 *
 * A tier is a *contract about layout*, not a breakpoint: `micro` means "one
 * job only", `wide` means "a side panel may default open". Apps switch
 * component trees on it, so it has to be stable — a window dragged to sit
 * exactly on a threshold must not flicker between two layouts, which is what
 * the hysteresis deadband is for.
 *
 * Both axes matter. A 1200x200 window has width to spare but cannot stack
 * anything, so it is `micro` — classifying on width alone is what produces
 * a "wide" layout crushed into 200px of height.
 */

/** Minimum size to *qualify* for each tier. Ordered smallest to largest. */
export const TIER_FLOORS = [
  { name: 'micro',   w: 0,   h: 0   },
  { name: 'compact', w: 300, h: 210 },
  { name: 'regular', w: 540, h: 400 },
  { name: 'wide',    w: 920, h: 560 },
];

export const TIER_ORDER = TIER_FLOORS.map(f => f.name);

/** Extra px required to cross a boundary, so a resize cannot thrash. */
export const HYSTERESIS = 12;

/**
 * @param {number} w  window width in px
 * @param {number} h  window height in px
 * @param {string|null} prev  tier reported last time, or null on first measure
 */
export function computeTier(w, h, prev = null) {
  const width = Number.isFinite(w) ? w : 0;
  const height = Number.isFinite(h) ? h : 0;
  const prevIdx = prev ? TIER_ORDER.indexOf(prev) : -1;

  for (let i = TIER_FLOORS.length - 1; i > 0; i--) {
    const floor = TIER_FLOORS[i];
    // Growing into a bigger tier must clear the floor by HYSTERESIS; shrinking
    // out of the current one must fall HYSTERESIS below it. With no previous
    // tier (first measurement) the floor applies exactly.
    let pad = 0;
    if (prevIdx !== -1) pad = i > prevIdx ? HYSTERESIS : -HYSTERESIS;
    if (width >= floor.w + pad && height >= floor.h + pad) return floor.name;
  }
  return TIER_FLOORS[0].name;
}

/** True when `tier` is at least as large as `min`. */
export function atLeast(tier, min) {
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(min);
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npm run test:unit`
Expected: PASS, 7 tests

- [ ] **Step 6: Commit**

```bash
git add package.json src/app/sizeTiers.js tests/unit/sizeTiers.test.mjs
git commit -m "feat(shell): window size tiers with hysteresis + node test runner"
```

---

### Task 2: App manifest and registry

**Files:**
- Create: `src/app/manifest.js`
- Create: `src/app/registry.js`
- Create: `tests/unit/registry.test.mjs`

**Interfaces:**
- Consumes: nothing
- Produces: `APPS` (array of app records), `getApp(id)`, `allApps()`, `desktopApps()`, `appForFile(name)`, `minSizeOf(id)`, `defaultSizeOf(id)`, `settingsSchemaOf(id)`, `UNIVERSAL_SETTINGS`

An app record:

```js
{ id, name, icon: '<string name>', accent, load: () => Promise,
  defaultSize: {w,h}, minSize: {w,h}, opens: string[], desktop: bool,
  settings: { [key]: {type,label,default,...} } }
```

- [ ] **Step 1: Write the failing test**

Create `tests/unit/registry.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APPS } from '../../src/app/manifest.js';
import {
  getApp, allApps, desktopApps, appForFile,
  minSizeOf, defaultSizeOf, settingsSchemaOf, UNIVERSAL_SETTINGS,
} from '../../src/app/registry.js';

const EXPECTED_IDS = [
  'files','terminal','notepad','code','paint','browser','gallery',
  'media','calculator','settings','trash','monitor','video',
];

test('every app in the OS has a manifest entry', () => {
  assert.deepEqual(APPS.map(a => a.id).sort(), [...EXPECTED_IDS].sort());
});

test('every record is complete and well formed', () => {
  for (const app of APPS) {
    assert.ok(app.name, `${app.id} needs a name`);
    assert.equal(typeof app.icon, 'string', `${app.id} icon must be a string name`);
    assert.match(app.accent, /^#[0-9a-f]{6}$/i, `${app.id} needs a hex accent`);
    assert.equal(typeof app.load, 'function', `${app.id} needs a lazy loader`);
    assert.ok(app.minSize.w > 0 && app.minSize.h > 0, `${app.id} minSize`);
    assert.ok(app.defaultSize.w >= app.minSize.w, `${app.id} default >= min width`);
    assert.ok(app.defaultSize.h >= app.minSize.h, `${app.id} default >= min height`);
  }
});

test('manifest imports no JSX (stays unit-testable)', () => {
  // If this module loaded a .jsx file, the import above would already have
  // thrown. Reaching here is the assertion.
  assert.ok(APPS.length > 0);
});

test('getApp returns undefined for unknown ids rather than throwing', () => {
  assert.equal(getApp('nope'), undefined);
  assert.equal(getApp('media').name, 'Audio Player');
});

test('file routing matches the behaviour fileRouting.js shipped', () => {
  assert.equal(appForFile('song.mp3'), 'media');
  assert.equal(appForFile('clip.MP4'), 'video');       // case-insensitive
  assert.equal(appForFile('photo.jpeg'), 'gallery');
  assert.equal(appForFile('main.jsx'), 'code');
  assert.equal(appForFile('notes.txt'), 'notepad');    // fallback
  assert.equal(appForFile('no-extension'), 'notepad');
  assert.equal(appForFile(''), 'notepad');
});

test('no two apps claim the same extension', () => {
  const seen = new Map();
  for (const app of APPS) {
    for (const ext of app.opens ?? []) {
      assert.equal(seen.has(ext), false, `${ext} claimed by ${seen.get(ext)} and ${app.id}`);
      seen.set(ext, app.id);
    }
  }
});

test('the audio player can shrink to a mini player', () => {
  assert.deepEqual(minSizeOf('media'), { w: 180, h: 96 });
});

test('an app needing a gutter and editor keeps a real floor', () => {
  assert.ok(minSizeOf('code').w >= 400);
});

test('unknown app falls back to a safe size, never zero', () => {
  assert.deepEqual(minSizeOf('nope'), { w: 320, h: 240 });
  assert.deepEqual(defaultSizeOf('nope'), { w: 640, h: 420 });
});

test('desktopApps is a subset of allApps', () => {
  assert.ok(desktopApps().length > 0);
  assert.ok(desktopApps().length <= allApps().length);
  assert.ok(desktopApps().every(a => a.desktop === true));
});

test('every app gets the universal settings injected', () => {
  const schema = settingsSchemaOf('calculator');
  assert.equal(schema.minimalMode.type, 'toggle');
  assert.equal(schema.minimalMode.default, false);
  assert.equal(schema.density.default, 'inherit');
  assert.ok(Object.keys(UNIVERSAL_SETTINGS).includes('minimalMode'));
});

test('an app cannot shadow a universal setting', () => {
  for (const app of APPS) {
    for (const key of Object.keys(UNIVERSAL_SETTINGS)) {
      assert.equal(key in (app.settings ?? {}), false,
        `${app.id} must not redeclare ${key}`);
    }
  }
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm run test:unit`
Expected: FAIL — cannot find `src/app/manifest.js`

- [ ] **Step 3: Write the manifest**

Create `src/app/manifest.js`:

```js
/**
 * The single description of every app in the OS.
 *
 * Before this existed, an app's identity was spread across four places:
 * icon and accent in appIcons.jsx, default size in a literal inside
 * DesktopScreen, file associations in fileRouting.js, and the component
 * itself in a 13-branch `appId ===` chain. Adding one cross-cutting feature
 * therefore meant 13 edits. Everything about an app now lives in one record.
 *
 * Deliberately free of JSX: `icon` is a *name* resolved by appIcons.jsx, so
 * this module stays importable by the unit tests with no build step.
 *
 * `minSize` is per app because the old global 380x360 floor was a workaround
 * for apps that could not adapt. An app that declares a micro layout may go
 * far smaller; one that genuinely cannot (a code editor needs a gutter plus
 * an editor) keeps a real floor.
 */

/** Settings every app gets whether it declares them or not. */
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
      view: { type: 'segmented', label: 'Default view', default: 'grid',
        options: [['grid', 'Grid'], ['list', 'List'], ['columns', 'Columns']] },
      thumbnails: { type: 'toggle', label: 'Thumbnails', default: true },
      hiddenFiles: { type: 'toggle', label: 'Show hidden files', default: false },
      inspector: { type: 'toggle', label: 'Inspector panel', default: true },
      iconScale: { type: 'number', label: 'Icon size', default: 64, min: 40, max: 128, step: 8, unit: 'px' },
    },
  },
  {
    id: 'terminal', name: 'Terminal', icon: 'terminal', accent: '#34d399',
    load: () => import('../apps/TerminalApp.jsx'),
    defaultSize: { w: 680, h: 420 }, minSize: { w: 280, h: 180 },
    desktop: true, opens: ['sh'],
    settings: {
      fontSize: { type: 'number', label: 'Font size', default: 13, min: 10, max: 22, step: 1, unit: 'px' },
      scheme: { type: 'select', label: 'Colour scheme', default: 'ghost',
        options: [['ghost', 'Ghost'], ['amber', 'Amber'], ['mono', 'Monochrome'], ['matrix', 'Matrix']] },
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
      fontSize: { type: 'number', label: 'Font size', default: 14, min: 11, max: 24, step: 1, unit: 'px' },
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
    opens: ['js', 'jsx', 'ts', 'tsx', 'css', 'json', 'html', 'py', 'rs', 'go', 'yml', 'yaml', 'xml'],
    settings: {
      theme: { type: 'select', label: 'Theme', default: 'cyberDark',
        options: [['cyberDark', 'Cyber Dark'], ['dracula', 'Dracula'], ['monokai', 'Monokai'], ['synthwave', 'Synthwave']] },
      fontSize: { type: 'number', label: 'Font size', default: 13, min: 10, max: 22, step: 1, unit: 'px' },
      indent: { type: 'segmented', label: 'Indent', default: 2,
        options: [[2, '2'], [4, '4'], [8, '8']] },
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
      homepage: { type: 'select', label: 'Homepage', default: 'about:start',
        options: [['about:start', 'Start page'], ['about:search', 'Search'], ['about:billighost', 'OS Guide']] },
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
      fit: { type: 'segmented', label: 'Default fit', default: 'contain',
        options: [['contain', 'Fit'], ['cover', 'Fill'], ['actual', '1:1']] },
      background: { type: 'segmented', label: 'Backdrop', default: 'dark',
        options: [['dark', 'Dark'], ['checker', 'Checker'], ['blur', 'Blurred']] },
      slideshowSecs: { type: 'number', label: 'Slideshow delay', default: 4, min: 1, max: 30, step: 1, unit: 's' },
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
      artStyle: { type: 'segmented', label: 'Artwork', default: 'cover',
        options: [['cover', 'Cover'], ['wave', 'Waveform'], ['none', 'None']] },
      showQueue: { type: 'toggle', label: 'Queue panel', default: true },
      showEq: { type: 'toggle', label: 'Equalizer', default: false },
      crossfade: { type: 'number', label: 'Crossfade', default: 0, min: 0, max: 12, step: 1, unit: 's' },
      normalize: { type: 'toggle', label: 'Normalise volume', default: false },
    },
  },
  {
    id: 'calculator', name: 'Calculator', icon: 'calculator', accent: '#fbbf24',
    load: () => import('../apps/CalculatorApp.jsx'),
    defaultSize: { w: 340, h: 480 }, minSize: { w: 200, h: 240 },
    desktop: true, opens: [],
    settings: {
      mode: { type: 'segmented', label: 'Mode', default: 'basic',
        options: [['basic', 'Basic'], ['scientific', 'Scientific'], ['convert', 'Convert']] },
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
      autoEmptyDays: { type: 'number', label: 'Auto-empty after', default: 0, min: 0, max: 90, step: 1, unit: 'd' },
    },
  },
  {
    id: 'monitor', name: 'Task Manager', icon: 'gauge', accent: '#34d399',
    load: () => import('../apps/TaskManagerApp.jsx'),
    defaultSize: { w: 620, h: 440 }, minSize: { w: 280, h: 220 },
    desktop: false, opens: [],
    settings: {
      refreshMs: { type: 'number', label: 'Refresh interval', default: 1000, min: 250, max: 5000, step: 250, unit: 'ms' },
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
      volume: { type: 'number', label: 'Default volume', default: 80, min: 0, max: 100, step: 5, unit: '%' },
    },
  },
];
```

- [ ] **Step 4: Write the registry**

Create `src/app/registry.js`:

```js
/**
 * Lookups over the manifest. Kept separate from the data so the data file
 * stays a flat, readable list and this file stays trivially testable.
 *
 * Absorbs the old services/fileRouting.js: one table of extensions, owned by
 * the apps that open them, so a new app cannot silently disagree with it.
 */
import { APPS, UNIVERSAL_SETTINGS } from './manifest.js';

const BY_ID = new Map(APPS.map(a => [a.id, a]));

const BY_EXT = new Map();
for (const app of APPS) {
  for (const ext of app.opens ?? []) BY_EXT.set(ext, app.id);
}

/** Size used when an app id is unknown — small but never zero. */
const FALLBACK_MIN = { w: 320, h: 240 };
const FALLBACK_DEFAULT = { w: 640, h: 420 };

export { UNIVERSAL_SETTINGS };

export function getApp(id) {
  return BY_ID.get(id);
}

export function allApps() {
  return APPS;
}

export function desktopApps() {
  return APPS.filter(a => a.desktop === true);
}

/** App id that should open a filename. Text and unknown fall to notepad. */
export function appForFile(name = '') {
  const parts = String(name).toLowerCase().split('.');
  if (parts.length < 2) return 'notepad';
  return BY_EXT.get(parts.pop()) ?? 'notepad';
}

export function minSizeOf(id) {
  return getApp(id)?.minSize ?? FALLBACK_MIN;
}

export function defaultSizeOf(id) {
  return getApp(id)?.defaultSize ?? FALLBACK_DEFAULT;
}

/** An app's own settings plus the universal ones every app receives. */
export function settingsSchemaOf(id) {
  return { ...UNIVERSAL_SETTINGS, ...(getApp(id)?.settings ?? {}) };
}
```

- [ ] **Step 5: Run tests and confirm they pass**

Run: `npm run test:unit`
Expected: PASS. If `no two apps claim the same extension` fails, the duplicate is real — fix the manifest, not the test.

- [ ] **Step 6: Commit**

```bash
git add src/app/manifest.js src/app/registry.js tests/unit/registry.test.mjs
git commit -m "feat(app): single app manifest + registry, absorbing file routing"
```

---

### Task 3: Per-app settings service

**Files:**
- Create: `src/services/appSettings.js`
- Create: `tests/unit/appSettings.test.mjs`

**Interfaces:**
- Consumes: `settingsSchemaOf(id)` from Task 2
- Produces: `createAppSettings(storage) -> {get,set,reset,getAll,importAll}`, singleton `AppSettings`, event name `billighost:app-settings-change`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/appSettings.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAppSettings, APP_SETTINGS_KEY } from '../../src/services/appSettings.js';

function fakeStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
    _dump: () => Object.fromEntries(map),
  };
}

test('unset values fall back to schema defaults', () => {
  const s = createAppSettings(fakeStorage());
  const media = s.get('media');
  assert.equal(media.showQueue, true);
  assert.equal(media.crossfade, 0);
  assert.equal(media.minimalMode, false);   // universal, injected
});

test('set persists and merges rather than replacing', () => {
  const store = fakeStorage();
  const s = createAppSettings(store);
  s.set('media', { showQueue: false });
  s.set('media', { crossfade: 4 });
  const media = s.get('media');
  assert.equal(media.showQueue, false);
  assert.equal(media.crossfade, 4);
  assert.equal(media.showEq, false);        // untouched default survives
});

test('all apps share one storage key so export and reset stay atomic', () => {
  const store = fakeStorage();
  const s = createAppSettings(store);
  s.set('media', { showQueue: false });
  s.set('code', { fontSize: 18 });
  assert.deepEqual(Object.keys(store._dump()), [APP_SETTINGS_KEY]);
});

test('reset clears one app without touching its neighbours', () => {
  const s = createAppSettings(fakeStorage());
  s.set('media', { showQueue: false });
  s.set('code', { fontSize: 18 });
  s.reset('media');
  assert.equal(s.get('media').showQueue, true);
  assert.equal(s.get('code').fontSize, 18);
});

test('corrupt JSON degrades to defaults instead of breaking the OS', () => {
  const s = createAppSettings(fakeStorage({ [APP_SETTINGS_KEY]: '{not json' }));
  assert.equal(s.get('media').showQueue, true);
});

test('a single bad value cannot stop an app opening', () => {
  const s = createAppSettings(fakeStorage({
    [APP_SETTINGS_KEY]: JSON.stringify({ media: { crossfade: 'banana', showQueue: false } }),
  }));
  const media = s.get('media');
  assert.equal(media.crossfade, 0);      // wrong type -> default
  assert.equal(media.showQueue, false);  // good value -> kept
});

test('unknown keys are preserved for forward compatibility', () => {
  const s = createAppSettings(fakeStorage({
    [APP_SETTINGS_KEY]: JSON.stringify({ media: { futureFeature: 42 } }),
  }));
  assert.equal(s.get('media').futureFeature, 42);
});

test('numbers are clamped to their declared range', () => {
  const s = createAppSettings(fakeStorage());
  s.set('media', { crossfade: 999 });
  assert.equal(s.get('media').crossfade, 12);
  s.set('media', { crossfade: -5 });
  assert.equal(s.get('media').crossfade, 0);
});

test('a select rejects values outside its options', () => {
  const s = createAppSettings(fakeStorage());
  s.set('code', { theme: 'not-a-theme' });
  assert.equal(s.get('code').theme, 'cyberDark');
});

test('a storage that throws does not take down the caller', () => {
  const hostile = {
    getItem() { throw new Error('private mode'); },
    setItem() { throw new Error('private mode'); },
    removeItem() { throw new Error('private mode'); },
  };
  const s = createAppSettings(hostile);
  assert.equal(s.get('media').showQueue, true);
  assert.doesNotThrow(() => s.set('media', { showQueue: false }));
});

test('export and import round-trip', () => {
  const s = createAppSettings(fakeStorage());
  s.set('media', { showQueue: false });
  const backup = s.getAll();
  const fresh = createAppSettings(fakeStorage());
  fresh.importAll(backup);
  assert.equal(fresh.get('media').showQueue, false);
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm run test:unit`
Expected: FAIL — cannot find `src/services/appSettings.js`

- [ ] **Step 3: Implement**

Create `src/services/appSettings.js`:

```js
/**
 * Per-app settings.
 *
 * Mirrors the shape of LocalSettings (get / set / reset + a CustomEvent)
 * because that pattern is already understood everywhere in this codebase.
 *
 * One storage key holds every app, not one key per app: Backup & Recovery
 * exports a single blob, "reset all" is one removal, and there is no way for
 * thirteen keys to drift out of sync.
 *
 * Values are validated against the manifest schema on read rather than on
 * write, so a settings blob written by a newer build — or corrupted by hand —
 * can never prevent an app from opening. Bad values fall back per key;
 * unrecognised keys are kept so a downgrade does not destroy them.
 */
import { settingsSchemaOf } from '../app/registry.js';

export const APP_SETTINGS_KEY = 'billighost_app_settings';
export const APP_SETTINGS_EVENT = 'billighost:app-settings-change';

/** localStorage when it exists and works, otherwise an in-memory stand-in. */
function defaultStorage() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.getItem(APP_SETTINGS_KEY);   // probe: throws in some private modes
      return localStorage;
    }
  } catch { /* fall through */ }
  const mem = new Map();
  return {
    getItem: k => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: k => mem.delete(k),
  };
}

/** Coerce one stored value against its schema field, or return the default. */
function coerce(field, value) {
  if (value === undefined) return field.default;
  switch (field.type) {
    case 'toggle':
      return typeof value === 'boolean' ? value : field.default;
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return field.default;
      const lo = field.min ?? -Infinity;
      const hi = field.max ?? Infinity;
      return Math.min(Math.max(value, lo), hi);
    }
    case 'select':
    case 'segmented': {
      const allowed = (field.options ?? []).map(([v]) => v);
      return allowed.includes(value) ? value : field.default;
    }
    case 'color':
      return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : field.default;
    default:
      return value;
  }
}

export function createAppSettings(storage = defaultStorage()) {
  function readAll() {
    try {
      const raw = storage.getItem(APP_SETTINGS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};   // corrupt or unavailable: behave as unconfigured
    }
  }

  function writeAll(next) {
    try {
      storage.setItem(APP_SETTINGS_KEY, JSON.stringify(next));
    } catch { /* storage unavailable: settings are session-only */ }
  }

  function emit(appId, settings) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(APP_SETTINGS_EVENT, { detail: { appId, settings } }));
  }

  return {
    get(appId) {
      const schema = settingsSchemaOf(appId);
      const stored = readAll()[appId] ?? {};
      const out = { ...stored };                    // keep unknown keys
      for (const [key, field] of Object.entries(schema)) {
        out[key] = coerce(field, stored[key]);
      }
      return out;
    },

    set(appId, patch) {
      const all = readAll();
      all[appId] = { ...(all[appId] ?? {}), ...patch };
      writeAll(all);
      const settings = this.get(appId);
      emit(appId, settings);
      return settings;
    },

    reset(appId) {
      const all = readAll();
      delete all[appId];
      writeAll(all);
      const settings = this.get(appId);
      emit(appId, settings);
      return settings;
    },

    getAll() {
      return readAll();
    },

    importAll(blob) {
      if (!blob || typeof blob !== 'object') return false;
      writeAll(blob);
      for (const appId of Object.keys(blob)) emit(appId, this.get(appId));
      return true;
    },
  };
}

export const AppSettings = createAppSettings();
```

- [ ] **Step 4: Run tests and confirm they pass**

Run: `npm run test:unit`
Expected: PASS, all suites

- [ ] **Step 5: Commit**

```bash
git add src/services/appSettings.js tests/unit/appSettings.test.mjs
git commit -m "feat(settings): per-app settings store with schema validation on read"
```

---

### Task 4: Appearance token applier

**Files:**
- Create: `src/services/appearance.js`
- Create: `tests/unit/appearance.test.mjs`
- Modify: `src/services/storage/localStorage.js` (extend `DEFAULT_APPEARANCE`)

**Interfaces:**
- Consumes: nothing
- Produces: `appearanceToTokens(appearance) -> Record<string,string>`, `applyAppearance(appearance, root)`, `DEFAULT_APPEARANCE` gains `uiDensity`, `desktopIconSize`, `radiusScale`, `animationSpeed`, `reduceMotion`, `glassBlur`, `taskbarSize`, `taskbarPosition`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/appearance.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appearanceToTokens, DENSITY, ICON_SIZES } from '../../src/services/appearance.js';

test('density drives control height and spacing', () => {
  assert.equal(appearanceToTokens({ uiDensity: 'comfortable' })['--ctl-h'], '34px');
  assert.equal(appearanceToTokens({ uiDensity: 'cozy' })['--ctl-h'], '30px');
  assert.equal(appearanceToTokens({ uiDensity: 'compact' })['--ctl-h'], '26px');
});

test('an unknown density falls back rather than emitting undefined', () => {
  const t = appearanceToTokens({ uiDensity: 'enormous' });
  assert.equal(t['--ctl-h'], DENSITY.cozy.ctlH);
});

test('desktop icon size is a token, so CSS and JS cannot disagree', () => {
  assert.equal(appearanceToTokens({ desktopIconSize: 'sm' })['--icon-cell'], '64px');
  assert.equal(appearanceToTokens({ desktopIconSize: 'xl' })['--icon-cell'], '112px');
  assert.ok(Object.keys(ICON_SIZES).includes('md'));
});

test('reduceMotion pins motion scale to zero and outranks animationSpeed', () => {
  const t = appearanceToTokens({ reduceMotion: true, animationSpeed: 1.5 });
  assert.equal(t['--motion-scale'], '0');
});

test('animationSpeed passes through when motion is allowed', () => {
  assert.equal(appearanceToTokens({ animationSpeed: 0.5 })['--motion-scale'], '0.5');
});

test('taskbar height stays a token the window manager can read', () => {
  assert.equal(appearanceToTokens({ taskbarSize: 44 })['--bh-taskbar-h'], '44px');
});

test('glass blur is clamped to a sane range', () => {
  assert.equal(appearanceToTokens({ glassBlur: 999 })['--glass-blur'], '60px');
  assert.equal(appearanceToTokens({ glassBlur: -5 })['--glass-blur'], '0px');
});

test('accent produces a whole ramp, not one flat colour', () => {
  const t = appearanceToTokens({ accentColor: '#ff4d6a' });
  assert.equal(t['--accent-glow'], '#ff4d6a');
  assert.match(t['--shadow-glow-md'], /255, ?77, ?106/);
});

test('an invalid accent does not emit broken CSS', () => {
  const t = appearanceToTokens({ accentColor: 'chartreuse' });
  assert.match(t['--accent-glow'], /^#[0-9a-f]{6}$/i);
});

test('radius scale multiplies the existing ramp', () => {
  assert.equal(appearanceToTokens({ radiusScale: 0 })['--radius-md'], '0px');
  assert.equal(appearanceToTokens({ radiusScale: 2 })['--radius-md'], '24px');
});

test('an empty appearance still yields a complete token set', () => {
  const t = appearanceToTokens({});
  for (const key of ['--ctl-h', '--ui-gap', '--ui-pad', '--icon-cell',
                     '--motion-scale', '--glass-blur', '--radius-md', '--bh-taskbar-h']) {
    assert.ok(t[key], `${key} missing`);
  }
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm run test:unit`
Expected: FAIL — cannot find `src/services/appearance.js`

- [ ] **Step 3: Implement**

Create `src/services/appearance.js`:

```js
/**
 * Appearance -> CSS custom properties.
 *
 * One function owns the translation so there is exactly one place where a
 * preference becomes a pixel. The alternative — components reading the
 * appearance object and styling themselves — is how `taskbarSize` and
 * `glassBlur` ended up as controls that changed nothing: no component was
 * listening, and nothing made that visible.
 *
 * appearanceToTokens() is pure and unit tested; applyAppearance() is the
 * thin side-effecting wrapper.
 */

export const DENSITY = {
  comfortable: { ctlH: '34px', gap: '10px', pad: '14px', font: '13px' },
  cozy:        { ctlH: '30px', gap: '8px',  pad: '11px', font: '12.5px' },
  compact:     { ctlH: '26px', gap: '6px',  pad: '8px',  font: '12px' },
};

export const ICON_SIZES = {
  sm: { cell: 64,  glyph: 26 },
  md: { cell: 80,  glyph: 32 },
  lg: { cell: 96,  glyph: 40 },
  xl: { cell: 112, glyph: 48 },
};

/** Base radius ramp, multiplied by radiusScale. */
const RADII = { sm: 8, md: 12, lg: 16, xl: 24 };

const HEX = /^#([0-9a-f]{6})$/i;
const FALLBACK_ACCENT = '#7eb8ff';

function clamp(n, lo, hi, fallback) {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : fallback;
  return Math.min(Math.max(v, lo), hi);
}

function rgbOf(hex) {
  const m = HEX.exec(hex);
  const h = m ? m[1] : FALLBACK_ACCENT.slice(1);
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function appearanceToTokens(appearance = {}) {
  const density = DENSITY[appearance.uiDensity] ?? DENSITY.cozy;
  const icons = ICON_SIZES[appearance.desktopIconSize] ?? ICON_SIZES.md;

  const accent = HEX.test(appearance.accentColor ?? '') ? appearance.accentColor : FALLBACK_ACCENT;
  const [r, g, b] = rgbOf(accent);

  const motion = appearance.reduceMotion ? 0 : clamp(appearance.animationSpeed, 0, 3, 1);
  const radiusScale = clamp(appearance.radiusScale, 0, 2, 1);
  const blur = clamp(appearance.glassBlur, 0, 60, 40);
  const taskbar = clamp(appearance.taskbarSize, 32, 72, 52);

  const tokens = {
    '--ctl-h': density.ctlH,
    '--ui-gap': density.gap,
    '--ui-pad': density.pad,
    '--ui-font': density.font,

    '--icon-cell': `${icons.cell}px`,
    '--icon-glyph': `${icons.glyph}px`,

    '--motion-scale': String(motion),
    '--glass-blur': `${blur}px`,
    '--bh-taskbar-h': `${taskbar}px`,

    '--accent-glow': accent,
    '--accent-rgb': `${r}, ${g}, ${b}`,
    '--shadow-glow-sm': `0 0 12px rgba(${r}, ${g}, ${b}, 0.15)`,
    '--shadow-glow-md': `0 0 24px rgba(${r}, ${g}, ${b}, 0.2)`,
    '--shadow-glow-lg': `0 0 48px rgba(${r}, ${g}, ${b}, 0.25)`,
  };

  for (const [name, px] of Object.entries(RADII)) {
    tokens[`--radius-${name}`] = `${Math.round(px * radiusScale)}px`;
  }

  return tokens;
}

/** Write the tokens onto an element (the document root in the running OS). */
export function applyAppearance(appearance, root) {
  const el = root ?? (typeof document !== 'undefined' ? document.documentElement : null);
  if (!el) return;
  const tokens = appearanceToTokens(appearance);
  for (const [key, value] of Object.entries(tokens)) el.style.setProperty(key, value);
  el.dataset.density = appearance?.uiDensity ?? 'cozy';
  el.dataset.taskbarPosition = appearance?.taskbarPosition ?? 'bottom';
}
```

- [ ] **Step 4: Extend the stored defaults**

In `src/services/storage/localStorage.js`, add these keys to `DEFAULT_APPEARANCE` (keep the existing ones):

```js
  // Shell metrics and motion. These were controls in Settings that wrote to
  // nothing; they are real stored preferences now, applied by
  // services/appearance.js as CSS custom properties.
  uiDensity: 'cozy',            // 'comfortable' | 'cozy' | 'compact'
  desktopIconSize: 'md',        // 'sm' | 'md' | 'lg' | 'xl'
  radiusScale: 1,               // 0 = square, 2 = very round
  animationSpeed: 1,            // 0 = off, 0.5 = fast, 1.5 = relaxed
  reduceMotion: false,
  glassBlur: 40,                // px
  taskbarSize: 52,              // px — drives --bh-taskbar-h
  taskbarPosition: 'bottom',    // 'bottom' | 'top'
  minimalModeDefault: false,    // seed value for every app's minimalMode
```

- [ ] **Step 5: Run tests and confirm they pass**

Run: `npm run test:unit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/services/appearance.js tests/unit/appearance.test.mjs src/services/storage/localStorage.js
git commit -m "feat(appearance): single token applier for density, icons, motion and glass"
```

---

### Task 5: Complete the icon set

**Files:**
- Modify: `src/components/Icons.jsx` (append, do not restructure)
- Create: `tests/unit/icons.test.mjs`

**Interfaces:**
- Consumes: the existing `makeIcon` helper in `Icons.jsx`
- Produces: 28 new named exports — `ShuffleIcon`, `RepeatIcon`, `RepeatOneIcon`, `SkipBackIcon`, `SkipForwardIcon`, `VolumeLowIcon`, `VolumeHighIcon`, `StarIcon`, `StarFilledIcon`, `BookmarkIcon`, `LinkIcon`, `IncognitoIcon`, `SortAscIcon`, `SortDescIcon`, `MoreHorizontalIcon`, `MoreVerticalIcon`, `SidebarIcon`, `PanelRightIcon`, `ChevronUpIcon`, `ChevronDownIcon`, `WindowMinimizeIcon`, `WindowMaximizeIcon`, `WindowRestoreIcon`, `GridViewIcon`, `ListViewIcon`, `ZoomInIcon`, `ZoomOutIcon`, `FlipHorizontalIcon`, `FlipVerticalIcon`, `RotateCwIcon`, `RotateCcwIcon`, `EyeIcon`, `FilterIcon`, `CloudRainIcon`, `CloudSunIcon`

- [ ] **Step 1: Read the existing helper**

Run: `sed -n '1,101p' src/components/Icons.jsx`
Note the exact `makeIcon` signature and follow it — every new icon must match the existing stroke width, `viewBox` and animation conventions so they sit together visually.

- [ ] **Step 2: Write the failing test**

Create `tests/unit/icons.test.mjs`. This reads the source as text rather than importing it, because `Icons.jsx` is JSX and cannot be imported by `node --test` without a build:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SRC = readFileSync(new URL('../../src/components/Icons.jsx', import.meta.url), 'utf8');

const REQUIRED = [
  'ShuffleIcon','RepeatIcon','RepeatOneIcon','SkipBackIcon','SkipForwardIcon',
  'VolumeLowIcon','VolumeHighIcon','StarIcon','StarFilledIcon','BookmarkIcon',
  'LinkIcon','IncognitoIcon','SortAscIcon','SortDescIcon','MoreHorizontalIcon',
  'MoreVerticalIcon','SidebarIcon','PanelRightIcon','ChevronUpIcon','ChevronDownIcon',
  'WindowMinimizeIcon','WindowMaximizeIcon','WindowRestoreIcon','GridViewIcon',
  'ListViewIcon','ZoomInIcon','ZoomOutIcon','FlipHorizontalIcon','FlipVerticalIcon',
  'RotateCwIcon','RotateCcwIcon','EyeIcon','FilterIcon','CloudRainIcon','CloudSunIcon',
];

test('every icon the migration needs is exported', () => {
  const missing = REQUIRED.filter(n => !new RegExp(`export const ${n}\\b`).test(SRC));
  assert.deepEqual(missing, [], `missing icons: ${missing.join(', ')}`);
});

test('no icon is declared twice', () => {
  const names = [...SRC.matchAll(/export const (\w+Icon)\b/g)].map(m => m[1]);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  assert.deepEqual([...new Set(dupes)], []);
});

test('the manifest only names icons that exist', async () => {
  const { APPS } = await import('../../src/app/manifest.js');
  // 'music-note' -> MusicNoteIcon
  const toComponent = name => name.split('-')
    .map(p => p[0].toUpperCase() + p.slice(1)).join('') + 'Icon';
  for (const app of APPS) {
    const comp = toComponent(app.icon);
    assert.match(SRC, new RegExp(`export const ${comp}\\b`), `${app.id} wants ${comp}`);
  }
});
```

- [ ] **Step 3: Run and confirm failure**

Run: `npm run test:unit`
Expected: FAIL listing ~35 missing icon names

- [ ] **Step 4: Append the icons**

Add each icon to the end of `src/components/Icons.jsx` using the file's existing `makeIcon` pattern. Draw them at the same 24×24 `viewBox` and stroke weight as the current set. Example of the required shape (match the file's actual helper signature you read in Step 1):

```jsx
export const ShuffleIcon = makeIcon('shuffle', (
  <>
    <path d="M16 3h5v5" />
    <path d="M4 20 21 3" />
    <path d="M21 16v5h-5" />
    <path d="m15 15 6 6" />
    <path d="M4 4l5 5" />
  </>
));
```

- [ ] **Step 5: Run tests and confirm they pass**

Run: `npm run test:unit`
Expected: PASS

- [ ] **Step 6: Verify they render**

Run: `npm run build`
Expected: build succeeds — catches malformed JSX that the text-based test cannot see.

- [ ] **Step 7: Commit**

```bash
git add src/components/Icons.jsx tests/unit/icons.test.mjs
git commit -m "feat(icons): add the 35 icons the emoji migration needs"
```

---

### Task 6: Emoji ratchet guard

**Files:**
- Create: `scripts/check-no-emoji.cjs`
- Create: `scripts/emoji-baseline.json`
- Modify: `package.json` (add `lint:emoji`)

**Interfaces:**
- Consumes: nothing
- Produces: `npm run lint:emoji` exiting non-zero when any file's emoji count exceeds its baseline

**Why a ratchet rather than a plain ban:** 99 violations exist today and are removed across Phases 1B and 1C. A guard that simply fails would be red for weeks and get ignored. A ratchet fails only on *regression*, and each migration lowers the baseline — so the number can only go down.

- [ ] **Step 1: Write the guard**

Create `scripts/check-no-emoji.cjs`:

```js
/**
 * Fails when emoji or dingbat characters appear in JSX beyond the recorded
 * baseline. Comment lines are ignored — box-drawing characters in the section
 * banners this codebase uses are intentional and not interface text.
 *
 * Run `node scripts/check-no-emoji.cjs --update` after a migration to lower
 * the baseline. The number must only ever go down.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src');
const BASELINE = path.join(__dirname, 'emoji-baseline.json');

// Pictographs, dingbats, arrows and geometric shapes used as UI glyphs.
// Box drawing (U+2500-U+257F) is deliberately excluded: comment banners.
const GLYPH = /[\u{1F300}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{25A0}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(jsx|js)$/.test(entry.name)) out.push(p);
  }
  return out;
}

function countFile(file) {
  const rel = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');
  let count = 0;
  const hits = [];
  let inBlockComment = false;

  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
    const trimmed = line.trim();
    if (inBlockComment) {
      if (trimmed.includes('*/')) inBlockComment = false;
      return;
    }
    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) inBlockComment = true;
      return;
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

    const found = line.match(GLYPH);
    if (found) {
      count += found.length;
      if (hits.length < 3) hits.push(`    L${i + 1}: ${line.trim().slice(0, 70)}`);
    }
  });

  return { rel, count, hits };
}

const results = walk(ROOT).map(countFile).filter(r => r.count > 0);
const current = Object.fromEntries(results.map(r => [r.rel, r.count]));

if (process.argv.includes('--update')) {
  fs.writeFileSync(BASELINE, JSON.stringify(current, null, 2) + '\n');
  const total = Object.values(current).reduce((a, b) => a + b, 0);
  console.log(`baseline updated: ${total} glyphs across ${results.length} files`);
  process.exit(0);
}

const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : {};
const regressions = results.filter(r => r.count > (baseline[r.rel] ?? 0));

if (regressions.length) {
  console.error('Emoji regression — use an icon from src/components/Icons.jsx:\n');
  for (const r of regressions) {
    console.error(`  ${r.rel}: ${r.count} (baseline ${baseline[r.rel] ?? 0})`);
    r.hits.forEach(h => console.error(h));
  }
  process.exit(1);
}

const total = Object.values(current).reduce((a, b) => a + b, 0);
const budget = Object.values(baseline).reduce((a, b) => a + b, 0);
console.log(`emoji check passed — ${total} glyphs remaining (budget ${budget})`);
```

- [ ] **Step 2: Record the current baseline**

Run: `node scripts/check-no-emoji.cjs --update`
Expected: prints the current total (~99 across ~20 files) and writes `scripts/emoji-baseline.json`

- [ ] **Step 3: Confirm the guard passes at baseline**

Run: `node scripts/check-no-emoji.cjs`
Expected: `emoji check passed`, exit 0

- [ ] **Step 4: Confirm the guard actually catches a regression**

```bash
node -e "const f='src/components/MobileGate.jsx';require('fs').appendFileSync(f,'\n// tripwire\nexport const T = () => <span>\u{1F600}</span>;\n')"
node scripts/check-no-emoji.cjs; echo "exit=$?"
git checkout src/components/MobileGate.jsx
```

Expected: exit=1 with `MobileGate.jsx` named. A guard never observed failing is not a guard.

- [ ] **Step 5: Add the npm script**

In `package.json` `"scripts"`: `"lint:emoji": "node scripts/check-no-emoji.cjs"`

- [ ] **Step 6: Commit**

```bash
git add scripts/check-no-emoji.cjs scripts/emoji-baseline.json package.json
git commit -m "chore: emoji ratchet guard, baselined at current violations"
```

---

### Task 7: UI foundation + Slider

**Files:**
- Create: `src/components/ui/ui.module.css`, `src/components/ui/Slider.jsx`, `src/components/ui/Slider.module.css`, `src/components/ui/index.js`
- Create: `src/dev/PrimitivesGallery.jsx`, `src/dev/PrimitivesGallery.module.css`
- Modify: `src/main.jsx` (mount the gallery when `?gallery=1`)
- Create: `scripts/verify-primitives.cjs`

**Interfaces:**
- Consumes: appearance tokens from Task 4
- Produces: `<Slider value min max step onChange orientation origin disabled label ticks />`; gallery reachable at `http://localhost:5200/?gallery=1`; every gallery item carries `data-testid="gallery-<name>"`

- [ ] **Step 1: Mount the gallery behind a query flag**

In `src/main.jsx`, render `PrimitivesGallery` instead of `App` when `new URLSearchParams(location.search).has('gallery')`. Keep it a static import — Vite tree-shakes it out of the production bundle only if you guard with `import.meta.env.DEV`, so wrap the branch in that check so the gallery never ships.

- [ ] **Step 2: Write the failing Playwright test**

Create `scripts/verify-primitives.cjs`:

```js
/**
 * Drives every control primitive in the gallery. These replace 48 native
 * controls, so the bar is the one native controls already clear: pointer
 * drag, keyboard, and correct reported values.
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));

  await page.goto('http://localhost:5200/?gallery=1', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="primitives-gallery"]', { timeout: 10000 });

  const fail = [];
  const check = (name, ok, detail = '') => {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
    if (!ok) fail.push(name);
  };

  // ── Slider: keyboard ──
  const slider = page.locator('[data-testid="gallery-slider"] [role="slider"]');
  await slider.focus();
  const before = Number(await slider.getAttribute('aria-valuenow'));
  await page.keyboard.press('ArrowRight');
  const after = Number(await slider.getAttribute('aria-valuenow'));
  check('slider responds to ArrowRight', after > before, `${before} -> ${after}`);

  await page.keyboard.press('Home');
  check('slider Home jumps to min',
    Number(await slider.getAttribute('aria-valuenow')) === Number(await slider.getAttribute('aria-valuemin')));

  await page.keyboard.press('End');
  check('slider End jumps to max',
    Number(await slider.getAttribute('aria-valuenow')) === Number(await slider.getAttribute('aria-valuemax')));

  // ── Slider: pointer drag lands near where you dropped it ──
  const box = await page.locator('[data-testid="gallery-slider"] [role="slider"]').boundingBox();
  await page.mouse.move(box.x + 4, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  const dragged = Number(await slider.getAttribute('aria-valuenow'));
  check('slider drag lands mid-track', dragged > 35 && dragged < 65, `got ${dragged}`);

  // ── Slider: a disabled control does not move ──
  const dis = page.locator('[data-testid="gallery-slider-disabled"] [role="slider"]');
  const disBefore = await dis.getAttribute('aria-valuenow');
  await dis.click({ force: true }).catch(() => {});
  check('disabled slider ignores input', (await dis.getAttribute('aria-valuenow')) === disBefore);

  // ── No native controls anywhere in the gallery ──
  const natives = await page.locator(
    'input[type=range], input[type=color], input[type=checkbox], select'
  ).count();
  check('gallery contains zero native controls', natives === 0, `found ${natives}`);

  check('no console errors', errs.length === 0, errs.join('; '));

  await browser.close();
  console.log(fail.length ? `\n${fail.length} FAILED` : '\nall passed');
  process.exit(fail.length ? 1 : 0);
})();
```

- [ ] **Step 3: Run and confirm failure**

Run: `node scripts/verify-primitives.cjs` (dev server must be up: `npm run dev:test`)
Expected: FAIL — gallery selector never appears

- [ ] **Step 4: Write shared control tokens**

Create `src/components/ui/ui.module.css` holding `:global` helpers the primitives share — focus ring, disabled state, the track/thumb geometry driven by `--ctl-h`, and a `motion` helper that multiplies durations by `var(--motion-scale, 1)`.

- [ ] **Step 5: Implement Slider**

Create `src/components/ui/Slider.jsx`. Requirements, all exercised by the test above:

- `role="slider"` with `aria-valuenow` / `aria-valuemin` / `aria-valuemax` / `aria-label`
- Pointer: `onPointerDown` + `setPointerCapture`, so a drag that leaves the track keeps tracking
- Keyboard: arrows step by `step`, PageUp/PageDown by `step * 10`, Home/End to min/max
- `origin` prop: fill is drawn from `origin` rather than from `min`, so an EQ band renders ±dB from centre
- `orientation="vertical"` for EQ columns
- `disabled` blocks pointer and keyboard and drops opacity
- Value is rounded to `step` and clamped; never emits out-of-range

- [ ] **Step 6: Build the gallery page**

Create `src/dev/PrimitivesGallery.jsx` with root `data-testid="primitives-gallery"`, rendering each primitive in a labelled cell with `data-testid="gallery-<name>"`. Include `gallery-slider`, `gallery-slider-disabled`, `gallery-slider-vertical`, `gallery-slider-origin`. Later tasks append their own cells.

- [ ] **Step 7: Run tests and confirm they pass**

Run: `node scripts/verify-primitives.cjs`
Expected: all PASS

- [ ] **Step 8: Commit**

```bash
git add src/components/ui src/dev src/main.jsx scripts/verify-primitives.cjs
git commit -m "feat(ui): Slider primitive + dev primitives gallery harness"
```

---

### Tasks 8-13: remaining primitives

Each follows the identical five-step shape as Task 7 — *append cases to `scripts/verify-primitives.cjs` first, watch them fail, implement, watch them pass, commit*. The per-task detail is the component contract and the assertions.

### Task 8: Toggle + Checkbox

**Files:** `src/components/ui/Toggle.jsx`, `Toggle.module.css`, `Checkbox.jsx`, `Checkbox.module.css`; modify `index.js`, gallery, `verify-primitives.cjs`

**Interfaces:** `<Toggle checked onChange disabled label />` (`role="switch"`), `<Checkbox checked indeterminate onChange disabled label />` (`role="checkbox"`)

**Assertions to add:** Space toggles a focused `role="switch"`; `aria-checked` flips; clicking the label toggles it; disabled ignores both; `Checkbox` reports `aria-checked="mixed"` when `indeterminate`.

**Why two components:** a Toggle is a *setting that applies immediately*; a Checkbox is *selection within a list*. They are not interchangeable, and the 13 native checkboxes in the codebase are split across both meanings.

### Task 9: Menu + Select

**Files:** `src/components/ui/Menu.jsx`, `Menu.module.css`, `Select.jsx`, `Select.module.css`; modify `index.js`, gallery, `verify-primitives.cjs`

**Interfaces:** `<Menu trigger items={[{id,label,icon,danger,onSelect,separator}]} align />`, `<Select value options onChange placeholder disabled />` (`role="combobox"` + `role="listbox"`)

**Assertions to add:** clicking the trigger opens the list; ArrowDown/ArrowUp move `aria-activedescendant`; Enter selects and closes; Escape closes without changing the value; clicking outside closes; typing a letter jumps to the first matching option; the popup is not clipped when its container has `overflow: hidden`.

**Critical detail:** the popup must portal into the **owning window element**, not `document.body`. Portalling to body escapes the window's `overflow` but also escapes its `z-index`, so a dropdown from a background window would float over a focused one. Accept an optional `portalTo` element; default to the closest `[data-testid="os-window"]` ancestor, falling back to `body` when rendered outside a window (as in the gallery).

### Task 10: Segmented + NumberField

**Files:** `src/components/ui/Segmented.jsx`, `Segmented.module.css`, `NumberField.jsx`, `NumberField.module.css`; modify `index.js`, gallery, `verify-primitives.cjs`

**Interfaces:** `<Segmented value options={[[value,label]]} onChange disabled size />` (`role="radiogroup"`), `<NumberField value min max step unit onChange disabled />`

**Assertions to add:** arrow keys move between segments and change the value; the selected segment carries `aria-checked="true"`; `NumberField` clamps typed values above max and below min; its steppers respect `step`; horizontal drag on the field scrubs the value; a non-numeric paste is rejected without the value becoming `NaN`.

### Task 11: ColorField

**Files:** `src/components/ui/ColorField.jsx`, `ColorField.module.css`; modify `index.js`, gallery, `verify-primitives.cjs`

**Interfaces:** `<ColorField value onChange swatches disabled />`

**Assertions to add:** clicking a swatch emits that hex; typing a valid hex commits on Enter; an invalid hex reverts on blur rather than emitting garbage; the current value is marked `aria-current="true"`.

**Why not `input[type=color]`:** it opens the host operating system's colour dialog, which breaks the illusion of a self-contained OS — the one place the seam is most visible.

### Task 12: IconButton + Tooltip + EmptyState + Divider

**Files:** `src/components/ui/IconButton.jsx`, `IconButton.module.css`, `Tooltip.jsx`, `Tooltip.module.css`, `EmptyState.jsx`, `EmptyState.module.css`, `Divider.jsx`; modify `index.js`, gallery, `verify-primitives.cjs`

**Interfaces:** `<IconButton icon label onClick active danger size disabled />` (label is required and becomes `aria-label`), `<Tooltip label placement delay>{child}</Tooltip>`, `<EmptyState icon title hint action />`, `<Divider vertical />`

**Assertions to add:** every `IconButton` in the gallery has a non-empty `aria-label` (this is what stops icon-only toolbars becoming unusable); `active` sets `aria-pressed="true"`; a tooltip appears on hover after the delay and on keyboard focus immediately; Escape dismisses it; tooltips never appear for disabled buttons.

### Task 13: Scroller + Sheet

**Files:** `src/components/ui/Scroller.jsx`, `Scroller.module.css`, `Sheet.jsx`, `Sheet.module.css`; modify `index.js`, gallery, `verify-primitives.cjs`

**Interfaces:** `<Scroller axis="y" fade>{children}</Scroller>`, `<Sheet open title onClose side width>{children}</Sheet>`

**Assertions to add:** a `Scroller` whose content overflows exposes a visible thumb, and the thumb is absent when content fits; `Sheet` traps focus while open; Escape closes it; focus returns to the element that opened it; the backdrop click closes it; `aria-modal="true"` and `role="dialog"` are set.

**Why `Scroller` exists:** `src/index.css:200-208` hides every scrollbar globally (`::-webkit-scrollbar { display: none }` plus `scrollbar-width: none`). That is defensible for the desktop and lock screen, but inside a file list or an editor it removes the only signal that content continues below the fold. `Scroller` reintroduces a designed 6px overlay bar that fades when idle — opt-in, so the desktop stays clean.

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| App manifest | 2 |
| Size tiers / `useAppSize` | 1 (logic) — provider is Plan 1B |
| `AppFrame` and regions | Plan 1B |
| Per-app settings store | 3 |
| `AppSettingsSheet` | Plan 1B (needs Sheet from Task 13) |
| Control primitives (all 9 kinds) | 7-13 |
| Icon migration — icons | 5 |
| Icon migration — call sites | Plan 1B/1C, ratcheted by Task 6 |
| Appearance tokens | 4 |
| Error handling: corrupt settings, storage unavailable, unknown app | 2, 3 |
| Error handling: app crash boundary | Plan 1B |
| `verify-primitives.cjs` | 7-13 |
| `check-no-emoji.cjs` | 6 |

Gaps are all deliberate and named: they need `Window`/`AppFrame`, which Plan 1B owns.

**Placeholder scan:** none. Tasks 8-13 give contracts and assertion lists rather than full source, which is a deliberate compression — the five-step cycle is stated once in Task 7 and referenced, and each task names its exact files, props and assertions. If an executor cannot proceed from that, expand the task rather than guessing.

**Type consistency:** `computeTier(w,h,prev)` (Task 1) is consumed by Plan 1B's provider. `settingsSchemaOf(id)` (Task 2) is consumed by `createAppSettings` (Task 3) — signatures match. `appearanceToTokens` returns `Record<string,string>` and `applyAppearance` consumes it (Task 4). Manifest `icon` strings are validated against `Icons.jsx` exports by Task 5's third test, which is what keeps the string indirection safe.

---

## Follow-on plans

- **1B — Shell & window system:** `SizeProvider` + `useAppSize` on top of Task 1; `Window` reads `minSizeOf()` and drops the global 380×360 floor; SVG window controls; compact title bar at `micro`; `AppFrame`/`Toolbar`/`Panel`/`StatusBar`; `AppSettingsSheet`; `AppErrorBoundary`; `DesktopScreen`'s 13-branch chain collapses to a registry lookup; Calculator and Audio Player migrated as pilots (Audio Player proves the 180×96 mini-player).
- **1C — App adoption:** the remaining 11 apps, one per task, each lowering the emoji baseline.
