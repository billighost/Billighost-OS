/**
 * Verifies the staged boot sequence: logo → fade → entanglement weave → lock screen.
 * Captures one frame per phase into scripts/shots/.
 */
const { chromium } = require('playwright');
const path = require('path');

const URL = process.env.BH_URL || 'http://localhost:5200/';
const OUT = path.join(__dirname, 'shots');

(async () => {
  const browser = await chromium.launch();
  // Headless Chromium reports prefers-reduced-motion: reduce by default,
  // which would silently exercise the fallback path instead of the weave.
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'no-preference',
  });

  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

  await page.goto(URL, { waitUntil: 'domcontentloaded' });

  const marks = [
    { t: 700,  name: '01-logo-drawing' },
    { t: 1600, name: '02-logo-complete' },
    { t: 2350, name: '03-logo-fading' },
    { t: 3100, name: '04-weave-spawn' },
    { t: 4300, name: '05-weave-braid' },
    { t: 5500, name: '06-weave-braid-late' },
    { t: 6450, name: '07-weave-unravel' },
    { t: 7600, name: '08-lockscreen' },
  ];

  let prev = 0;
  for (const m of marks) {
    await page.waitForTimeout(m.t - prev);
    prev = m.t;
    const phase = await page.getAttribute('[data-testid="boot-screen"]', 'data-phase').catch(() => 'gone');
    await page.screenshot({ path: path.join(OUT, m.name + '.png') });
    console.log(`shot ${m.name.padEnd(22)} boot-phase=${phase}`);
  }

  const onLock = await page.locator('text=Tap anywhere').count();
  console.log('\nlock screen reached:', onLock > 0 ? 'YES' : 'NO');
  console.log('console errors:', errors.length ? '\n  ' + errors.join('\n  ') : 'none');

  await browser.close();
})();
