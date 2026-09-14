import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APPS } from '../../src/app/manifest.js';
import {
  getApp, allApps, desktopApps, appForFile,
  minSizeOf, defaultSizeOf, settingsSchemaOf, UNIVERSAL_SETTINGS,
} from '../../src/app/registry.js';

const EXPECTED_IDS = [
  'files', 'terminal', 'notepad', 'code', 'paint', 'browser', 'gallery',
  'media', 'calculator', 'settings', 'trash', 'monitor', 'video',
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
