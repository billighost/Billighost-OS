# Billighost OS — Phase 1: Interface Foundation

**Date:** 2026-09-11
**Status:** Approved (design direction endorsed by user; user delegated all subsequent decisions)
**Phase:** 1 of 4

---

## Problem

The OS works but does not feel designed. A concrete audit of `src/` found:

| Defect | Measured |
|---|---|
| Emoji used as interface icons | 99 sites across 20 files, including the window controls themselves |
| Native browser form controls | 48 (`22 range`, `11 select`, `13 checkbox`, `2 color`) across 12 files |
| Settings controls that change nothing | `taskbarPosition`, `taskbarSize`, `glassBlur`, `soundScheme` never leave `SettingsApp`; `showSeconds` is stored but never read |
| Settings the user wants that do not exist | `iconSize`, `density`, `animationSpeed`, `reduceMotion`, `performanceMode` |
| Apps aware of their own size | 0 of 13 |
| Central description of an app | None — `DesktopScreen.jsx` mounts apps via a 13-branch `appId ===` chain with an inline `defaultSizes` map |

Three root causes produce all of it:

1. **No app manifest.** Nothing describes an app in one place, so every cross-cutting feature must be hand-wired 13 times. This is why per-app settings, minimal mode and per-app sizing do not exist — not because they are hard, but because there is nowhere to put them.
2. **No shared control layer.** Each app reaches for `<input type="range">` because there is no `Slider`. Inconsistency is the default outcome.
3. **Apps cannot perceive their own size.** `Window.jsx:29` pins `MIN_W = 380 / MIN_H = 360` globally, with a comment correctly noting apps "cannot lay out meaningfully" below that. The floor is a workaround for apps that do not adapt.

Phase 1 removes these three causes. It ships no redesigned app — it ships the machinery that makes 13 app redesigns tractable and consistent.

## Goals

- One manifest describing every app.
- Apps that know their own size and restructure at four tiers, down to a 180×96 mini-player.
- A control primitive for every native control currently in use.
- Zero emoji in the interface.
- Per-app settings, persisted, with a universal **minimal mode**.
- Appearance tokens (density, icon size, radius, motion, glass) applied from one place.

## Non-goals

- Redesigning app internals (Phase 3). Apps are *migrated* to the shell in Phase 1 only far enough to keep working.
- Settings UI rebuild (Phase 2). Phase 1 builds the token applier; Phase 2 builds the controls that drive it.
- The Code Studio folder sidebar and File Explorer thumbnails (Phase 3).
- Wallpaper overhaul (Phase 2).

---

## Design direction

**Toolbelt skeleton, content-first policy.** One shell layout — toolbar, content, optional side panel, status bar — with a strict rule about what earns a place in it. Simple apps leave the toolbar and panel empty and read as pure content. Complex apps fill them. Minimal mode hides toolbar, panel and status bar, collapsing any app toward pure content.

This matters because it makes minimal mode *structural* rather than cosmetic: there is one thing to hide, defined identically in all 13 apps.

The rule for what may occupy chrome:

- **Toolbar** — actions used in a majority of sessions, icon-only, grouped, max ~7 before an overflow menu.
- **Panel** — one collapsible secondary surface per app (queue, layers, file tree, metadata). Never two.
- **Status bar** — passive state only. Never a control.
- **Sheet** — everything else, including per-app settings. Reached from the toolbar overflow or the title-bar context menu.
- **Banned** — decorative skeuomorphism (the turntable, the VU meters), explanatory captions, duplicated affordances, tab bars used as top-level navigation inside a window.

---

## Architecture

```
src/
  app/
    manifest.js              app records: identity, sizing, settings schema, component
    registry.js              lookup helpers + file-type routing (absorbs fileRouting.js)
  components/
    ui/                      control primitives — the only place native controls exist
      Slider, Select, Toggle, Segmented, NumberField, ColorField,
      Checkbox, IconButton, Menu, Sheet, Field, Tooltip, EmptyState,
      Scroller, Divider, index.js
    shell/
      AppFrame.jsx           toolbar / content / panel / status regions + sheet host
      AppToolbar.jsx         overflow collapsing
      AppPanel.jsx           collapsible side surface
      AppStatusBar.jsx
      AppSettingsSheet.jsx   renders a settings schema into primitives
      SizeContext.jsx        tier provider + useAppSize(); observer lives in Window
  services/
    appSettings.js           per-app persistence
    appearance.js            appearance state -> CSS custom properties
```

### 1. App manifest — `src/app/manifest.js`

One record per app. Replaces `appIcons.jsx`'s three parallel maps, `DesktopScreen`'s `defaultSizes`, the 13-branch mount chain, and `fileRouting.js`'s table.

```js
{
  id: 'media',
  name: 'Audio Player',
  Icon: MusicNoteIcon,
  accent: '#a78bfa',
  load: () => import('../apps/AudioPlayerApp.jsx'),
  defaultSize: { w: 460, h: 340 },
  minSize:     { w: 180, h: 96 },     // per-app; replaces the global floor
  opens:       ['mp3','wav','ogg','flac','m4a','aac','opus'],
  desktop:     true,                   // gets a desktop shortcut
  settings: {
    showQueue:   { type:'toggle',    label:'Show queue',    default:true  },
    showEq:      { type:'toggle',    label:'Equalizer',     default:false },
    crossfade:   { type:'number',    label:'Crossfade',     default:0, min:0, max:12, unit:'s' },
    artStyle:    { type:'segmented', label:'Artwork',       default:'cover',
                   options:[['cover','Cover'],['wave','Waveform'],['none','None']] },
  },
}
```

`minSize` per app is the load-bearing change. Audio Player drops to 180×96; Code Studio stays at 420×300 because a gutter plus an editor genuinely cannot render smaller. `Window.jsx` reads the manifest instead of using constants.

Every app additionally receives two injected settings it does not declare: `minimalMode` (bool) and `density` (`comfortable | cozy | compact`, defaulting to *inherit* from the OS).

### 2. Size awareness — `SizeContext.jsx`

**Ownership:** `Window` measures, `AppFrame` consumes. A single `ResizeObserver` lives in
`Window`, because two consumers need the tier and only one of them is inside the app —
the title bar must compact at `micro`, and `Window` owns the title bar. `Window` sets
`data-tier` on its own root and provides the value through `SizeProvider`; `AppFrame` and
apps read it with `useAppSize()`. There is exactly one observer and one source of truth per
window. Apps are never mounted outside a `Window` (the desktop, taskbar and widgets are not
apps), so a default context value of tier `regular` covers isolated rendering in tests.

It publishes size to both CSS and JS:

```js
{ w, h, tier, narrow, short, minimal, density }
```

Tiers are computed from **both** axes, because the mini-player case is driven by height as much as width:

| Tier | Condition | Contract |
|---|---|---|
| `micro` | `w < 300 \|\| h < 210` | One job only. Toolbar, panel and status bar are force-hidden. Title bar compacts to 22px with icon + close. |
| `compact` | `w < 540 \|\| h < 400` | Primary actions only; overflow absorbs the rest. Panel force-closed. |
| `regular` | `w < 920` | Full toolbar. Panel opens on request. |
| `wide` | otherwise | Panel may default open. |

Published two ways, deliberately:

- **`data-tier` / `data-minimal` / `data-density` attributes** on the app root, so CSS restyles with no re-render: `[data-tier="micro"] .transport { gap: 4px }`.
- **React context** via `useAppSize()`, so an app can *swap component trees* — return `<MiniPlayer/>` instead of `<Player/>`. Container queries cannot do this, which is why we observe in JS rather than relying on `@container` alone.

Tier changes are hysteretic: a 12px deadband on each threshold prevents a window dragged exactly on a boundary from thrashing between layouts.

### 3. `AppFrame`

```jsx
<AppFrame
  appId="media"
  toolbar={<AppToolbar primary={[...]} overflow={[...]} />}
  panel={{ title:'Queue', content:<Queue/>, defaultOpen:'wide' }}
  status={<>…</>}
>
  {content}
</AppFrame>
```

Responsibilities: mount `SizeContext`; apply density and minimal-mode attributes; force-hide regions per tier; host the sheet layer; own the per-app settings sheet; render the app's scroll container. Apps never position their own chrome.

### 4. Per-app settings — `src/services/appSettings.js`

Follows the existing `LocalSettings` shape exactly (get / set / reset + a `CustomEvent`), because that pattern already works and is understood across the codebase.

```js
AppSettings.get(appId)            // schema defaults merged with stored values
AppSettings.set(appId, patch)     // persists, emits billighost:app-settings-change
AppSettings.reset(appId)
AppSettings.getAll() / importAll(...)   // so Backup & Recovery keeps working
```

Storage key `billighost_app_settings` holding `{ [appId]: {...} }` — one key rather than 13, so export/import and reset stay atomic.

Hook: `useAppSettings(appId)` → `[settings, patch, reset]`, subscribed to the event so two windows of the same app stay in sync.

`AppSettingsSheet` renders the schema generically — a manifest gains a setting and the UI appears with no extra code. This is what makes "every app is configurable" affordable rather than 13 bespoke panels.

### 5. Control primitives — `src/components/ui/`

Replacements, in one-to-one correspondence with what is being removed:

| Native usage | Primitive | Notes |
|---|---|---|
| `input[type=range]` ×22 | `Slider` | pointer + keyboard + wheel, horizontal and vertical, optional ticks, fill from a `origin` (so EQ renders ±dB from centre) |
| `select` ×11 | `Select` (long lists) / `Segmented` (≤4 options) | `Select` portals its menu so it escapes `overflow:hidden` window bodies |
| `input[type=checkbox]` ×13 | `Toggle` (settings) / `Checkbox` (list selection) | distinct roles, distinct components |
| `input[type=color]` ×2 | `ColorField` | curated swatches + hex entry; the native picker is an OS dialog that breaks the illusion |
| — | `NumberField` | stepper with drag-to-scrub |
| — | `IconButton` | the single toolbar button, with tooltip and active state |
| — | `Menu` | overflow and context menus, portalled, keyboard navigable |
| — | `Sheet` | slide-over surface for settings and secondary flows |
| — | `Scroller` | scroll container with a custom thin scrollbar |

**`Scroller` exists because `index.css:200-208` hides every scrollbar globally.** That is fine for the desktop and defensible for a lock screen, but in a file list or a code editor it removes the only cue that content continues below. Scrollbars return, as a designed 6px overlay bar that fades when idle.

Every primitive is uncontrolled-capable, keyboard-complete, respects `prefers-reduced-motion` and the `--motion-scale` token, and takes sizing from density tokens rather than fixed pixels.

### 6. Icon migration

`Icons.jsx` already exports 85 SVG icons and `appIcons.jsx` is already a registry — the emoji persist only because call sites were never migrated. Work is therefore: add the ~28 missing icons (shuffle, repeat, repeat-one, skip-back/forward, volume-low/high/mute, star, bookmark, link, incognito, sort-asc/desc, more-horizontal, sidebar-left/right, chevron-up/down, window minimize/maximize/restore/close, grid/list view, zoom-in/out, flip-h/v, rotate-cw/ccw, eye, filter, cloud-rain, cloud-sun), then convert all 99 sites.

Window controls (`Window.jsx:340-362`) move from `─ □ ❐ ✕` to real icons. A lint guard (`scripts/check-no-emoji.cjs`) fails the build if an emoji codepoint reappears in JSX outside a comment, so this does not regress.

### 7. Appearance tokens — `src/services/appearance.js`

One `applyAppearance(appearance)` writes CSS custom properties onto `documentElement`, called at boot and on `billighost:appearance-change`:

| Setting | Token | Effect |
|---|---|---|
| `density` | `--ui-pad`, `--ui-gap`, `--ctl-h` | control height 34 / 30 / 26px |
| `desktopIconSize` | `--icon-cell`, `--icon-glyph` | 64 / 80 / 96 / 112px cells |
| `radiusScale` | `--radius-*` | multiplier on the existing radius ramp |
| `animationSpeed` | `--motion-scale` | 0 = off, 0.5 = fast, 1 = normal, 1.5 = relaxed |
| `reduceMotion` | `--motion-scale: 0` | also honours the OS media query |
| `glassBlur` | `--glass-blur` | 0–60px |
| `accentColor` | `--accent-glow`, `--accent-soft`, `--shadow-glow-*` | derived ramp, not one flat value |
| `taskbarSize` | `--bh-taskbar-h` | already a token; finally driven |

Phase 1 builds the applier and defaults. Phase 2 builds the Settings controls that write them. Splitting it this way means the shell can depend on density tokens immediately.

---

## Migration strategy

Apps are moved onto the shell without redesigning them, in one mechanical pass: wrap the existing render in `<AppFrame>`, move existing toolbar buttons into `toolbar`, swap native controls for primitives, replace emoji with icons, declare a manifest entry. Behaviour is preserved. Phase 3 then redesigns each app's interior against a shell that already works.

Order: Calculator (smallest, proves the shell) → Audio Player (proves `micro` and the mini-player) → Notepad → Image Viewer → Files → Terminal → Code → Paint → Video → Browser → Task Manager → Recycle Bin → Settings.

`DesktopScreen`'s 13-branch chain collapses to:

```jsx
const App = registry.component(win.appId);
<Suspense fallback={<AppLoading/>}><App {...appProps(win)} /></Suspense>
```

---

## Error handling

- **Missing manifest entry** — `registry.component()` returns a diagnostic placeholder naming the unknown id, rather than a blank window.
- **App crash** — each app mounts inside an `AppErrorBoundary` scoped to the window: one broken app shows a recoverable error card with a Reload action; the OS survives. Currently a throw takes down the whole desktop.
- **Corrupt settings** — `AppSettings.get` falls back to schema defaults per key, so one bad value cannot prevent an app opening. Unknown keys are preserved (forward compatibility), unknown *types* are ignored by the sheet renderer.
- **Storage unavailable** — mirrors `LocalSettings`: every access is `try/catch`, failures degrade to in-memory defaults. Private-window browsing must not break the OS.
- **Sub-minimum size** — `Window` clamps to the manifest `minSize`; an app with no entry falls back to 320×240.

## Testing

Playwright, following the existing `scripts/verify-*.cjs` convention (`seedProfile` → reload → `bootToDesktop`, per the established harness):

| Script | Asserts |
|---|---|
| `verify-no-emoji.cjs` | zero emoji codepoints in rendered DOM text across every app |
| `verify-no-native-controls.cjs` | zero `input[type=range\|color\|checkbox]` and `select` in the DOM with every app open |
| `verify-size-tiers.cjs` | resizing a window drives `data-tier` through wide→regular→compact→micro, and the mini-player renders at 180×96 |
| `verify-app-settings.cjs` | a per-app setting persists across close/reopen and across reload; reset restores defaults |
| `verify-minimal-mode.cjs` | minimal mode hides toolbar/panel/status and the app stays operable |
| `verify-primitives.cjs` | each primitive is keyboard-operable and reports correct values |
| `verify-appearance-tokens.cjs` | changing density/icon size/motion changes computed CSS values |
| `check-no-emoji.cjs` | static source guard (not Playwright) |

Existing scripts must continue to pass unchanged — notably `verify-window-constraints`, `verify-state-persistence` and `verify-all-apps-constrained`. `verify-window-constraints` hardcodes `TASKBAR_H = 52` and assumes the global 380×360 floor; it is updated to read the manifest, not deleted.

Tests run against `vite --port 5200`.

## Risks

- **Per-app `minSize` weakens an existing guarantee.** `verify-all-apps-constrained` currently proves no app overflows its window. Lowering the floor to 180×96 makes overflow newly possible. Mitigation: the floor only drops for apps that have declared a `micro` layout, and `verify-size-tiers` asserts no overflow at each app's declared minimum.
- **48 control replacements is where regressions hide.** Mitigation: primitives ship and are tested before any migration; migration is mechanical and one app per commit.
- **Portalled menus and window stacking.** `Select` and `Menu` portal to `body` and must respect window `zIndex`. Mitigation: portal into the window element rather than `body`, with `overflow` handled by the frame.

---

## Phase roadmap

| Phase | Scope |
|---|---|
| **1** | This document — manifest, shell, size tiers, primitives, icons, per-app settings, minimal mode, appearance tokens |
| **2** | Settings app rebuilt on primitives; every control wired; new controls (icon size, density, motion, glass, taskbar position/size); desktop and taskbar honour them; wallpaper overhaul incl. new live renderers |
| **3** | All 13 app interiors redesigned; Code Studio folder sidebar + language support; File Explorer thumbnails and previews; per-app `micro` layouts |
| **4** | Motion pass, empty states, keyboard map, command palette, full Playwright sweep across breakpoints |
