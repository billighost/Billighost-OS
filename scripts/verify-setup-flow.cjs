/**
 * First-run setup: identity → PIN → wallpaper → finish, then unlock with the
 * PIN the user actually chose. Also checks the live wallpaper starts.
 */
const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });

  await page.goto('http://localhost:5200/', { waitUntil: 'domcontentloaded' });
  // Fresh profile.
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });

  // Boot → setup
  await page.waitForSelector('[data-testid="setup-screen"]', { timeout: 20000 });
  console.log('1. setup screen appears on first run ✓');

  // Identity
  const inputs = page.locator('[data-testid="setup-screen"] input');
  await inputs.nth(0).fill('Ama Boateng');
  await inputs.nth(1).fill('ama@billighost.dev');
  await page.waitForTimeout(250);
  await page.click('[data-testid="setup-next"]');
  await page.waitForTimeout(400);
  console.log('2. identity accepted ✓');

  // PIN — enter, then confirm
  const CHOSEN = '7241';
  const typePin = async () => {
    const boxes = page.locator('[data-testid="setup-screen"] input');
    for (let i = 0; i < 4; i++) {
      await boxes.nth(i).fill(CHOSEN[i]);
      await page.waitForTimeout(70);
    }
  };
  await typePin();
  await page.click('[data-testid="setup-next"]');
  await page.waitForTimeout(350);
  await typePin();
  await page.click('[data-testid="setup-next"]');
  await page.waitForTimeout(400);
  console.log('3. PIN set and confirmed ✓');

  // Wallpaper — pick the live rain one
  const rain = page.locator('[data-testid="setup-screen"] button', { hasText: 'Rainfall' });
  await rain.click();
  await page.waitForTimeout(300);
  await page.click('[data-testid="setup-next"]');
  await page.waitForTimeout(400);
  console.log('4. live wallpaper chosen ✓');

  // Finish
  await page.click('[data-testid="setup-finish"]');
  await page.waitForTimeout(1200);

  const stored = await page.evaluate(() => ({
    setup: localStorage.getItem('billighost_setup'),
    profile: JSON.parse(localStorage.getItem('billighost_user_profile') || '{}'),
    security: JSON.parse(localStorage.getItem('billighost_security') || '{}'),
    appearance: JSON.parse(localStorage.getItem('billighost_appearance') || '{}'),
  }));
  console.log('\nstored:', JSON.stringify({
    setup: stored.setup,
    name: stored.profile.name,
    email: stored.profile.email,
    pinSet: !!stored.security.pin,
    pinMatches: stored.security.pin === CHOSEN,
    wallpaper: stored.appearance.wallpaper,
    live: stored.appearance.liveWallpaper,
  }, null, 2));

  // Lock screen shows the real email, not a placeholder.
  await page.waitForTimeout(600);
  await page.mouse.click(700, 450);
  await page.waitForTimeout(900);
  const shown = await page.evaluate(() => document.querySelector('#root')?.innerText || '');
  console.log('\nPIN screen shows chosen email:', shown.includes('ama@billighost.dev') ? 'YES ✓' : 'NO ✗');
  console.log('PIN screen does NOT leak the PIN:', !shown.includes(CHOSEN) ? 'YES ✓' : 'NO ✗');

  // Unlock with the chosen PIN.
  const pinBoxes = page.locator('input');
  for (let i = 0; i < 4; i++) {
    await pinBoxes.nth(i).fill(CHOSEN[i]);
    await page.waitForTimeout(90);
  }
  await page.waitForSelector('[data-testid="taskbar-taskview-btn"]', { timeout: 15000 });
  console.log('unlocked with the chosen PIN: YES ✓');

  // Live wallpaper running?
  await page.waitForTimeout(1500);
  const live = await page.evaluate(() => {
    const c = document.querySelector('[data-live-wallpaper]');
    if (!c) return { present: false };
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let lit = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i+1] + d[i+2] > 24) lit++;
    return { present: true, effect: c.dataset.liveWallpaper, litPixels: lit, size: [c.width, c.height] };
  });
  console.log('\nlive wallpaper:', JSON.stringify(live));
  console.log('rain rendering:', live.present && live.litPixels > 200 ? 'YES ✓' : 'NO ✗');

  await page.screenshot({ path: 'scripts/shots/live-rain-desktop.png' });
  console.log('\nerrors:', errs.length ? errs.slice(0,4) : 'none');
  await b.close();
})();
