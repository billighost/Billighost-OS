const { chromium } = require('playwright');
const { bootToDesktop, seedProfile } = require('./harness.cjs');
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await page.goto('http://localhost:5200/', { waitUntil: 'domcontentloaded' });

  const api = await page.evaluate(async () => {
    if (typeof navigator.getBattery !== 'function') return { api: 'absent' };
    const bat = await navigator.getBattery();
    return { api: 'present', level: bat.level, pct: Math.round(bat.level * 100), charging: bat.charging };
  });
  console.log('Battery API:', JSON.stringify(api));

  await seedProfile(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await bootToDesktop(page);
  await page.waitForTimeout(2000);

  const ui = await page.evaluate(() => {
    const out = {};
    const tray = [...document.querySelectorAll('[title^="Battery"]')];
    out.trayTitles = tray.map(n => n.getAttribute('title'));
    out.trayText = tray.map(n => n.textContent.trim());
    const fill = document.querySelector('[class*=batteryFill]');
    out.fillWidth = fill ? getComputedStyle(fill).width : null;
    out.fillParentWidth = fill ? getComputedStyle(fill.parentElement).width : null;
    return out;
  });
  console.log('Desktop tray:', JSON.stringify(ui, null, 2));

  // Widgets panel + flyout
  await page.click('[title="Open Control Center"]').catch(() => {});
  await page.waitForTimeout(500);
  const fly = await page.evaluate(() =>
    [...document.querySelectorAll('[class*=gaugeNumber], [class*=radialText]')].map(n => n.textContent.trim()));
  console.log('Flyout/widgets battery text:', JSON.stringify(fly));

  await b.close();
})();
