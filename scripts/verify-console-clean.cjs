/**
 * Boots the OS and reports every console warning/error, to confirm the
 * reported issues are gone.
 */
const { chromium } = require('playwright');
const { bootToDesktop } = require('./harness.cjs');

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  const msgs = [];
  page.on('console', m => {
    if (['error', 'warning'].includes(m.type())) msgs.push(`[${m.type()}] ${m.text()}`);
  });
  page.on('pageerror', e => msgs.push('PAGEERROR: ' + e.message));

  await page.goto('http://localhost:5200/', { waitUntil: 'domcontentloaded' });
  await bootToDesktop(page);
  await page.waitForTimeout(2500);

  // Exercise the paths that used to warn. Close each window first so the
  // next desktop icon is not covered by the one already open.
  for (const id of ['shortcut-files', 'shortcut-gallery', 'shortcut-music']) {
    await page.dblclick(`[data-testid="${id}"]`).catch(() => {});
    await page.waitForTimeout(1100);
    await page.locator('button[title="Close"]').last().click().catch(() => {});
    await page.waitForTimeout(450);
  }

  const interesting = msgs.filter(m =>
    !/DevTools|Download the React|\[vite\]/.test(m));

  console.log('--- console output ---');
  if (!interesting.length) console.log('(clean)');
  interesting.forEach(m => console.log(' ', m.slice(0, 160)));

  const checks = {
    'AudioContext autoplay': /AudioContext was not allowed/,
    'password field form': /Password field is not contained/,
    'multiple forms': /Multiple forms should be contained/,
    'geolocation gesture': /Only request geolocation/,
    'content.split crash': /content\.split is not a function/,
    'svg 404': /Failed to load resource.*404/,
  };
  console.log('\n--- reported issues ---');
  for (const [name, re] of Object.entries(checks)) {
    const hit = msgs.some(m => re.test(m));
    console.log(`  ${name.padEnd(24)} ${hit ? 'STILL PRESENT ✗' : 'gone ✓'}`);
  }
  await b.close();
})();
