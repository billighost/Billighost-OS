const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { bootToDesktop, seedProfile } = require('./harness.cjs');

const ARTIFACTS_DIR = path.resolve('C:/Users/bb201/.gemini/antigravity-ide/brain/d892c740-2efd-4a30-bc1e-d7f3a3453a8f');

async function takeShot(page, filename) {
  const p = path.join(ARTIFACTS_DIR, filename);
  try {
    await page.screenshot({ path: p, timeout: 6000, animations: 'allow' });
    console.log(`📸 Captured screenshot: ${filename}`);
  } catch (err) {
    console.warn(`Warning on ${filename}:`, err.message);
    try {
      await page.screenshot({ path: p, timeout: 3000 });
      console.log(`📸 Captured screenshot (fallback): ${filename}`);
    } catch (err2) {
      console.error(`Failed ${filename}:`, err2.message);
    }
  }
}

async function run() {
  console.log('Launching headless browser for VoidStrike 3D...');
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'msedge' });
  } catch {
    browser = await chromium.launch({
      headless: true,
      args: ['--use-gl=angle', '--enable-webgl', '--no-sandbox']
    });
  }

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('[Browser Error]:', msg.text());
    }
  });

  console.log('Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  console.log('Seeding profile and booting to desktop...');
  await seedProfile(page);
  await page.reload({ waitUntil: 'networkidle' });
  await bootToDesktop(page);

  console.log('Desktop booted successfully!');
  await page.waitForTimeout(1000);
  await takeShot(page, '08_desktop_voidstrike.png');

  // Launch VoidStrike 3D
  console.log('Launching VoidStrike 3D via desktop shortcut...');
  const voidstrikeShortcut = page.locator('text="VoidStrike 3D"').first();
  await voidstrikeShortcut.waitFor({ timeout: 10000 });
  await voidstrikeShortcut.dblclick({ delay: 60 });

  // Wait for VoidStrike 3D window to appear
  console.log('Waiting for VoidStrike 3D window and start briefing...');
  const startModalTitle = page.locator('text="VOIDSTRIKE 3D"').first();
  await startModalTitle.waitFor({ timeout: 10000 });
  await page.waitForTimeout(800);

  await takeShot(page, '09_voidstrike_start.png');

  // Click "Launch Starfighter"
  console.log('Clicking "Launch Starfighter" button...');
  const launchBtn = page.locator('text="Launch Starfighter"').first();
  await launchBtn.click();
  await page.waitForTimeout(1500);

  console.log('Capturing active 3D space flight & HUD...');
  await takeShot(page, '10_voidstrike_gameplay.png');

  // Fire Twin Plasma Cannons (Space)
  console.log('Firing twin plasma laser cannons...');
  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);

  await takeShot(page, '11_voidstrike_lasers.png');

  // Launch Homing Photon Torpedo (F)
  console.log('Launching homing photon torpedo (F)...');
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(400);

  await takeShot(page, '12_voidstrike_torpedo.png');

  // Test Small Window Responsiveness (720x440)
  console.log('Testing small window responsiveness (720x440)...');
  await page.setViewportSize({ width: 720, height: 440 });
  await page.waitForTimeout(600);

  await takeShot(page, '13_voidstrike_responsive.png');

  console.log('All VoidStrike 3D tests and screenshots completed successfully!');
  await browser.close();
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
