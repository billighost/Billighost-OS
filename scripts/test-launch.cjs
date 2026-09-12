const { chromium } = require('playwright');
const { bootToDesktop, seedProfile } = require('./harness.cjs');

async function testLaunch() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  page.on('console', msg => console.log(`[Console ${msg.type()}]:`, msg.text()));
  page.on('pageerror', err => console.error('[Page Error!]:', err));

  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await seedProfile(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await bootToDesktop(page);

  console.log('Booted to desktop. Attempting to click shortcut...');
  const shortcut = page.locator('[data-testid="shortcut-subwaysurge"]');
  await shortcut.dblclick();

  await page.waitForTimeout(3000);

  const windowCount = await page.locator('[data-app="subwaysurge"]').count();
  console.log('Subway Surge window count:', windowCount);

  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 300));
  console.log('Body text sample:', bodyText);

  await browser.close();
}

testLaunch().catch(console.error);
