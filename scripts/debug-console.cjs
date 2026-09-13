const { chromium } = require('playwright');
const { bootToDesktop, seedProfile } = require('./harness.cjs');

async function debug() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--no-sandbox']
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 }
  });

  page.on('console', msg => {
    console.log(`[BROWSER ${msg.type()}]:`, msg.text());
  });
  page.on('pageerror', err => {
    console.error('[UNCAUGHT ERROR]:', err);
  });

  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await seedProfile(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await bootToDesktop(page);

  console.log('Booted to desktop. Launching Aetheria...');
  const aetheriaShortcut = page.locator('text="Aetheria 3D"').first();
  await aetheriaShortcut.dblclick({ delay: 60 });

  await page.waitForTimeout(2000);
  console.log('Clicking Embark on Adventure...');
  const embarkBtn = page.locator('text="Embark on Adventure"').first();
  if (await embarkBtn.isVisible()) {
    await embarkBtn.click();
  }

  await page.waitForTimeout(3000);
  await browser.close();
}

debug().catch(err => console.error('Debug script error:', err));
