const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { bootToDesktop, seedProfile } = require('./harness.cjs');

const ARTIFACTS_DIR = path.resolve('C:/Users/bb201/.gemini/antigravity-ide/brain/60bdafe1-4ab6-487d-9265-84b95d57a52d');

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
  console.log('🚀 Launching headless Playwright test for Subway Surge 3D...');
  const browser = await chromium.launch({ headless: true });
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
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

  console.log('Seeding profile and booting to desktop...');
  await seedProfile(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await bootToDesktop(page);

  console.log('Desktop booted! Capturing desktop view...');
  await page.waitForTimeout(1000);
  await takeShot(page, '00_desktop.png');

  // Launch Subway Surge 3D via desktop shortcut dispatchEvent
  console.log('Launching Subway Surge 3D via desktop shortcut...');
  const shortcut = page.locator('[data-testid="shortcut-subwaysurge"]');
  await shortcut.waitFor({ timeout: 8000 });
  await shortcut.dispatchEvent('dblclick');
  await page.waitForTimeout(1000);

  // If window didn't open yet, launch via Start Menu
  let win = page.locator('[data-app="subwaysurge"]').first();
  if (!(await win.count()) || !(await win.isVisible())) {
    console.log('Launching via Start Menu [data-testid="start-menu-btn"]...');
    const startBtn = page.locator('[data-testid="start-menu-btn"]');
    await startBtn.click();
    await page.waitForTimeout(500);
    const startItem = page.locator('button:has-text("Subway Surge 3D")').first();
    await startItem.click();
    await page.waitForTimeout(1200);
  }

  win = page.locator('[data-app="subwaysurge"]').first();
  await win.waitFor({ timeout: 10000 });
  console.log('Subway Surge 3D window is open!');
  await page.waitForTimeout(800);

  // 1. Start Screen Verification
  console.log('1. Verifying Start Screen layout and typography...');
  await takeShot(page, '01_subway_start_screen.png');

  // 2. Open Locker & Verify 3D Turntable
  console.log('2. Opening Locker & Upgrades...');
  const lockerBtn = win.locator('text="Locker & Upgrades"').first();
  await lockerBtn.click();
  await page.waitForTimeout(1200);

  console.log('Verifying 3D Turntable and Characters in Locker...');
  await takeShot(page, '02_locker_turntable_dash.png');

  // Select Billi (Spectral Ghost Runner)
  console.log('Selecting Billi (Spectral Master)...');
  const billiCard = win.locator('text="Billi (Spectral Master)"').first();
  if (await billiCard.isVisible()) {
    await billiCard.click();
    await page.waitForTimeout(800);
    await takeShot(page, '03_locker_turntable_billi.png');
  }

  // Switch to Hoverboards tab
  console.log('Switching to Hoverboards tab in Locker...');
  const boardsTab = win.locator('text="Hoverboards"').first();
  await boardsTab.click();
  await page.waitForTimeout(800);
  await takeShot(page, '04_locker_boards.png');

  // Return to Menu
  console.log('Returning to main start menu...');
  const backBtn = win.locator('text="Back to Menu"').first();
  await backBtn.click();
  await page.waitForTimeout(600);

  // 3. Launch Run & Verify 3D Gameplay
  console.log('3. Launching Active Run...');
  const launchBtn = win.locator('text="Launch Run"').first();
  await launchBtn.click();
  await page.waitForTimeout(2000);

  console.log('Capturing active 3D gameplay with Billighost theme, track, and ghost chaser...');
  await takeShot(page, '05_gameplay_active.png');

  // Test Controls (ArrowLeft, ArrowRight, ArrowUp, ArrowDown, KeyB)
  console.log('Testing lane dodge Left (ArrowLeft)...');
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(400);

  console.log('Testing Jump (ArrowUp)...');
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(400);

  console.log('Testing Slide (ArrowDown)...');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(400);

  console.log('Testing Hoverboard Summon (KeyB)...');
  await page.keyboard.press('KeyB');
  await page.waitForTimeout(800);
  await takeShot(page, '06_gameplay_hoverboard_active.png');

  // 4. Test Pause Screen with Volume Sliders
  console.log('4. Testing Pause Screen (Escape)...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  await takeShot(page, '07_pause_screen.png');

  console.log('Resuming run...');
  const resumeBtn = win.locator('text="Resume Run"').first();
  await resumeBtn.click();
  await page.waitForTimeout(1000);

  // 5. Test Responsiveness across Different Screen Sizes
  console.log('5. Testing Responsive Layouts across Screen Sizes...');

  // Viewport A: Compact Square / Mini-window (540x480)
  console.log('Testing Compact Mini-window (540x480)...');
  await page.setViewportSize({ width: 540, height: 480 });
  await page.waitForTimeout(600);
  await takeShot(page, '08_responsive_540x480.png');

  // Viewport B: Mobile Portrait (400x720)
  console.log('Testing Mobile Portrait (400x720)...');
  await page.setViewportSize({ width: 400, height: 720 });
  await page.waitForTimeout(600);
  await takeShot(page, '09_responsive_mobile_400x720.png');

  // Viewport C: Ultrawide (1600x640)
  console.log('Testing Ultrawide (1600x640)...');
  await page.setViewportSize({ width: 1600, height: 640 });
  await page.waitForTimeout(600);
  await takeShot(page, '10_responsive_ultrawide_1600x640.png');

  // Restore Desktop Viewport
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(500);

  console.log('✅ Headless Playwright verification completed successfully!');
  await browser.close();
}

run().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
