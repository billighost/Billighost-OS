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
      // Fallback without waiting for fonts
      await page.screenshot({ path: p, timeout: 3000 });
      console.log(`📸 Captured screenshot (fallback): ${filename}`);
    } catch (err2) {
      console.error(`Failed ${filename}:`, err2.message);
    }
  }
}

async function run() {
  console.log('Launching headless browser...');
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
  await takeShot(page, '01_desktop.png');

  // Launch Aetheria 3D
  console.log('Launching Aetheria 3D via desktop shortcut...');
  const aetheriaShortcut = page.locator('text="Aetheria 3D"').first();
  await aetheriaShortcut.waitFor({ timeout: 10000 });
  await aetheriaShortcut.dblclick({ delay: 60 });

  // Wait for Aetheria 3D window to appear
  console.log('Waiting for Aetheria 3D window...');
  const startModalTitle = page.locator('text="AETHERIA 3D"').first();
  await startModalTitle.waitFor({ timeout: 10000 });
  await page.waitForTimeout(800);

  await takeShot(page, '02_start_screen.png');

  // Click "Embark on Adventure"
  console.log('Clicking "Embark on Adventure" button...');
  const embarkBtn = page.locator('text="Embark on Adventure"').first();
  await embarkBtn.click();
  await page.waitForTimeout(1500);

  console.log('Capturing active 3D gameplay...');
  await takeShot(page, '03_gameplay.png');

  // Test forward movement: Hold 'W' for 800ms
  console.log('Testing forward movement with KeyW...');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(800);
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(500);

  await takeShot(page, '04_moved_forward.png');

  // Test 3-Hit Combo Sword Attack (J)
  console.log('Testing 3-hit combo sword attack...');
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(250);
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(250);
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(400);

  await takeShot(page, '05_combat_combo.png');

  // Test Arcane Magic Bolt (E)
  console.log('Testing arcane magic bolt (E)...');
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(400);

  await takeShot(page, '06_magic_bolt.png');

  // Test Small Window Responsiveness
  console.log('Testing small window responsiveness (720x440)...');
  await page.setViewportSize({ width: 720, height: 440 });
  await page.waitForTimeout(600);

  await takeShot(page, '07_small_responsive.png');

  console.log('All tests and screenshots completed successfully!');
  await browser.close();
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
