const { chromium } = require('playwright');
const { bootToDesktop, seedProfile } = require('./harness.cjs');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false });
  const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5200/', { waitUntil: 'domcontentloaded' });
  await seedProfile(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await bootToDesktop(page);
  await page.waitForTimeout(2500);

  const r = await page.evaluate(async () => {
    const bat = await navigator.getBattery();
    const tray = document.querySelector('[title^="Battery"]');
    const fill = document.querySelector('[class*=batteryFill]');
    return {
      apiPct: Math.round(bat.level * 100),
      apiCharging: bat.charging,
      trayText: tray?.textContent.trim(),
      trayTitle: tray?.getAttribute('title'),
      fillWidth: fill ? getComputedStyle(fill).width : null,
      trackWidth: fill ? getComputedStyle(fill.parentElement).width : null,
    };
  });
  console.log(JSON.stringify(r, null, 2));
  console.log('\nMATCH:', r.apiPct + '%' === r.trayText ? 'YES ✓' : `NO ✗ (api ${r.apiPct}% vs tray "${r.trayText}")`);
  await page.screenshot({ path: 'scripts/shots/real-chrome-tray.png' });
  await b.close();
})();
