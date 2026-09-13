const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { bootToDesktop, seedProfile } = require('./harness.cjs');

const ARTIFACTS_DIR = path.resolve('C:/Users/bb201/.gemini/antigravity-ide/brain/e2c1e766-140b-4be7-bc39-c47014282541');

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
  console.log('Launching headless browser with WebGL...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--no-sandbox']
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });

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
  console.log('Waiting for Aetheria 3D start modal...');
  const startModalTitle = page.locator('text="AETHERIA 3D"').first();
  await startModalTitle.waitFor({ timeout: 10000 });
  await page.waitForTimeout(800);

  await takeShot(page, '02_start_screen.png');

  // Open Hero & Mount Studio Customizer
  console.log('Opening Hero & Mount Studio Customizer...');
  const customizeBtn = page.locator('text="Customize Hero & Mount"').first();
  if (await customizeBtn.isVisible()) {
    await customizeBtn.click();
    await page.waitForTimeout(800);
    await takeShot(page, '03_hero_customizer.png');

    // Click "Shadow Rogue"
    const rogueBtn = page.locator('text="Shadow Rogue"').first();
    if (await rogueBtn.isVisible()) {
      await rogueBtn.click();
      await page.waitForTimeout(300);
    }

    // Click "Spectral" steed breed
    const spectralSteed = page.locator('text="Spectral"').first();
    if (await spectralSteed.isVisible()) {
      await spectralSteed.click();
      await page.waitForTimeout(300);
    }

    // Return to start screen
    const returnBtn = page.locator('text="Return to Adventure"').first();
    if (await returnBtn.isVisible()) {
      await returnBtn.click();
      await page.waitForTimeout(600);
    }
  }

  // Embark on Adventure
  console.log('Embarking on Adventure...');
  const embarkBtn = page.locator('text="Embark on Adventure"').first();
  if (await embarkBtn.isVisible()) {
    await embarkBtn.click();
    await page.waitForTimeout(1500);
  }

  console.log('Capturing active 3D gameplay with Shadow Rogue...');
  await takeShot(page, '04_gameplay_rogue.png');

  // Test Mount Steed (H)
  console.log('Testing Mount Steed (H)...');
  await page.keyboard.press('KeyH');
  await page.waitForTimeout(1000);

  // Gallop forward on steed: Hold 'W' for 1200ms
  console.log('Galloping forward on mount...');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1200);
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(600);

  await takeShot(page, '05_steed_galloping.png');

  // Test Jump on mount (Spacebar)
  console.log('Testing gallop-jump (Spacebar)...');
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  await takeShot(page, '06_steed_jump.png');
  await page.waitForTimeout(600);

  // Dismount (H)
  console.log('Dismounting steed (H)...');
  await page.keyboard.press('KeyH');
  await page.waitForTimeout(600);

  // Test 3-Hit Combo Strike (J)
  console.log('Testing 3-hit combo strike (J)...');
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(250);
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(250);
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(350);

  await takeShot(page, '07_combat_combo.png');

  // Test Arcane Magic Bolt (E)
  console.log('Testing magic bolt (E)...');
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(400);

  // Test Target Lock-On (Tab)
  console.log('Testing Target Lock-On (Tab)...');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(500);
  await takeShot(page, '08_target_lock.png');

  // Test Small Window Responsiveness
  console.log('Testing small window responsiveness (740x460)...');
  await page.setViewportSize({ width: 740, height: 460 });
  await page.waitForTimeout(800);

  await takeShot(page, '09_small_responsive.png');

  console.log('All tests and screenshots completed successfully!');
  await browser.close();
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
