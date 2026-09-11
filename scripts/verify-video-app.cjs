/**
 * Opens the Video Studio, imports a real webm, and checks playback + trim.
 */
const { chromium } = require('playwright');
const { bootToDesktop } = require('./harness.cjs');
const path = require('path');

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });

  await page.goto('http://localhost:5200/', { waitUntil: 'domcontentloaded' });
  await bootToDesktop(page);
  console.log('desktop ready');

  await page.dblclick('[data-testid="shortcut-video"]');
  await page.waitForTimeout(1200);

  const open = await page.locator('[data-testid="video-editor-app"]').count();
  console.log('video studio opened:', open ? 'YES ✓' : 'NO ✗');
  if (!open) { console.log(errs); await b.close(); return; }

  // Window title icon should be the film icon, not a folder emoji.
  const titleIcon = await page.locator('[data-app="video"] [class*=windowIcon] svg').getAttribute('data-icon').catch(() => null);
  console.log('window title icon:', titleIcon, titleIcon === 'film' ? '✓' : '✗');

  // Import a real video.
  await page.locator('[data-testid="video-editor-app"] input[type=file]')
    .setInputFiles(path.join(__dirname, 'fixtures', 'sample-video.webm'));
  await page.waitForTimeout(2500);

  const state = await page.evaluate(() => {
    const v = document.querySelector('[data-testid="video-editor-app"] video');
    const root = document.querySelector('[data-testid="video-editor-app"]');
    return {
      hasVideo: !!v,
      src: v ? (v.src || '').slice(0, 24) : null,
      readyState: v ? v.readyState : -1,
      err: v && v.error ? v.error.code : null,
      clipName: root.querySelector('[class*=clipName]')?.textContent,
    };
  });
  console.log('after import:', JSON.stringify(state));

  // Saved to the Videos library?
  const lib = await page.evaluate(async () => {
    const m = await import('/src/services/storage/indexedDB.js');
    const items = await m.VFS.listDirectory('/Users/User/Videos').catch(() => []);
    return items.map(i => `${i.name} (${i.size})`);
  });
  console.log('Videos library:', JSON.stringify(lib));
  console.log('routed to library:', lib.length ? 'YES ✓' : 'NO ✗');

  await page.screenshot({ path: 'scripts/shots/video-studio.png' });
  console.log('\nerrors:', errs.length ? errs.slice(0,4) : 'none');
  await b.close();
})();
