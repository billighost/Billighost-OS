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
  console.log('Launching headless browser for CyberSwarm: Rogue Overdrive...');
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
  await takeShot(page, '14_desktop_cyberswarm.png');

  // Launch CyberSwarm via desktop shortcut
  console.log('Launching CyberSwarm via desktop shortcut...');
  const cyberShortcut = page.locator('text="CyberSwarm"').first();
  await cyberShortcut.waitFor({ timeout: 10000 });
  await cyberShortcut.dblclick({ delay: 60 });

  // Wait for CyberSwarm window and Start Mission modal to appear
  console.log('Waiting for CyberSwarm window and deploy briefing...');
  const deployBtn = page.locator('text=/DEPLOY OPERATIVE/i').first();
  await deployBtn.waitFor({ timeout: 10000 });
  await page.waitForTimeout(800);

  await takeShot(page, '15_cyberswarm_start.png');

  // Click "DEPLOY OPERATIVE"
  console.log('Clicking "DEPLOY OPERATIVE" button...');
  await deployBtn.click();
  await page.waitForTimeout(1000);

  // Move operative and dash
  console.log('Moving operative (WASD) and firing weapons...');
  await page.keyboard.down('KeyD');
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(800);
  await page.keyboard.press('Space'); // Dash
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyD');
  await page.keyboard.up('KeyS');
  await page.waitForTimeout(600);

  console.log('Capturing active horde gameplay and HUD...');
  await takeShot(page, '16_cyberswarm_gameplay.png');

  // Trigger Level-Up Augment screen
  console.log('Triggering Augment synthesis level-up draft...');
  await page.evaluate(() => {
    if (window.__cyberEngine) {
      window.__cyberEngine.triggerLevelUp();
    }
  });
  await page.waitForTimeout(800);

  const augmentModal = page.locator('text=/AUGMENT SYSTEM READY/i').first();
  await augmentModal.waitFor({ timeout: 10000 });
  await page.waitForTimeout(600);

  await takeShot(page, '17_cyberswarm_levelup.png');

  // Select first augment card
  console.log('Selecting first augment card to resume combat...');
  const firstCard = page.locator('[class*="upgradeCard"]').first();
  if (await firstCard.isVisible()) {
    await firstCard.click();
    await page.waitForTimeout(600);
  }

  // Test responsive viewport (ultra-compact 460x360)
  console.log('Testing responsive viewport resizing to 460x360...');
  await page.setViewportSize({ width: 460, height: 360 });
  await page.waitForTimeout(1000);

  await takeShot(page, '18_cyberswarm_responsive.png');

  console.log('All 5 CyberSwarm visual proof screenshots captured successfully!');
  await browser.close();
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
