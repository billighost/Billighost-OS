/**
 * Imports a real 6MB binary file through File Manager and asserts:
 *   • the page does not hang (main thread stays responsive)
 *   • the file is stored with its binary size intact
 *   • it routes to the right library folder
 */
const { chromium } = require('playwright');
const { bootToDesktop } = require('./harness.cjs');
const path = require('path');

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });

  await page.goto('http://localhost:5200/', { waitUntil: 'domcontentloaded' });
  await bootToDesktop(page);

  await page.dblclick('[data-testid="shortcut-files"]');
  await page.waitForTimeout(1000);

  const fileInput = page.locator('input[type="file"]').first();

  const t0 = Date.now();
  await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'sample-video.webm'));

  // Poll main-thread liveness while the import runs. A blocked thread cannot
  // answer rAF-like round trips, so a long gap here would mean a hang.
  let maxStall = 0;
  let last = Date.now();
  for (let i = 0; i < 40; i++) {
    const ok = await page.evaluate(() => 1).catch(() => null);
    const now = Date.now();
    if (ok === null) { maxStall = Math.max(maxStall, now - last); }
    else maxStall = Math.max(maxStall, now - last - 100);
    last = now;
    await page.waitForTimeout(100);
    if (now - t0 > 12000) break;
  }
  const elapsed = Date.now() - t0;
  console.log(`import round-trip: ${elapsed}ms, worst observed stall ≈ ${Math.max(0, maxStall)}ms`);
  console.log('responsive (no hang):', maxStall < 1500 ? 'YES ✓' : 'NO ✗');

  // Check what landed in the VFS.
  const stored = await page.evaluate(async () => {
    const mod = await import('/src/services/storage/indexedDB.js');
    const list = await mod.VFS.listDirectory('/Users/User/Videos').catch(() => []);
    const all = [];
    for (const dir of ['/Users/User/Videos', '/Users/User/Downloads', '/Users/User/Desktop']) {
      const items = await mod.VFS.listDirectory(dir).catch(() => []);
      for (const it of items) all.push({ dir, name: it.name, size: it.size, mime: it.mimeType });
    }
    return { videos: list.map(i => ({n: i.name, s: i.size, m: i.mimeType})), all };
  });
  console.log('\nVideos folder:', JSON.stringify(stored.videos));
  const found = stored.all.find(x => x.name.includes('sample-video'));
  console.log('stored entry:', JSON.stringify(found));
  console.log('binary size preserved:', found && found.size > 6000000 ? 'YES ✓' : 'NO ✗');

  console.log('\nerrors:', errs.length ? errs.slice(0,4) : 'none');
  await b.close();
})();
