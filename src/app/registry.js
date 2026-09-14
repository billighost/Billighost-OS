/**
 * Lookups over the manifest. Kept separate from the data so the data file
 * stays a flat readable list and this file stays trivially testable.
 *
 * Absorbs the old services/fileRouting.js: one table of extensions, derived
 * from the apps that declare they open them, so a newly added app cannot
 * silently disagree with a separate routing table.
 */
import { APPS, UNIVERSAL_SETTINGS } from './manifest.js';

const BY_ID = new Map(APPS.map(a => [a.id, a]));

const BY_EXT = new Map();
for (const app of APPS) {
  for (const ext of app.opens ?? []) BY_EXT.set(ext, app.id);
}

/*
 * Sizes used when an app id is unknown. Small, but never zero: a window that
 * cannot be grabbed is worse than one that is merely wrong.
 */
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
