const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = path.resolve('C:\\Users\\bb201\\.gemini\\antigravity-ide\\brain\\071beb2c-1124-4fcf-861d-083505b2958f');

async function verifyAll() {
  console.log('🌟 Starting final verification for Phase 2...');

  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'msedge' });
  } catch {
    browser = await chromium.launch({ headless: true });
  }

  // ── 1. Desktop context ──
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Test Lock Screen Redesign
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForSelector('text=bb2010ng@gmail.com', { timeout: 15000 });
  await page.waitForTimeout(1000);

  const lockShot = path.join(ARTIFACTS_DIR, 'final_01_lockscreen.png');
  await page.screenshot({ path: lockShot });
  console.log('📸 Screenshot saved: final_01_lockscreen.png');

  // Unlock to desktop
  await page.mouse.click(720, 450);
  await page.waitForSelector('input[type="password"]', { timeout: 8000 });
  await page.waitForTimeout(400);
  await page.keyboard.type('0813');
  await page.waitForSelector('button:has-text("Billighost")', { timeout: 15000 });
  await page.waitForTimeout(1000);

  const desktopShot = path.join(ARTIFACTS_DIR, 'final_02_desktop.png');
  await page.screenshot({ path: desktopShot });
  console.log('📸 Screenshot saved: final_02_desktop.png');

  // Test Start Menu (Liquid Glass & SVG Icons)
  await page.click('button:has-text("Billighost")');
  await page.waitForSelector('text=Recent Documents', { timeout: 5000 });
  await page.waitForTimeout(600);

  const startShot = path.join(ARTIFACTS_DIR, 'final_03_startmenu.png');
  await page.screenshot({ path: startShot });
  console.log('📸 Screenshot saved: final_03_startmenu.png');

  // Close Start Menu
  await page.click('button:has-text("Billighost")');
  await page.waitForTimeout(300);

  // Test OS Modal Dialog via FileManager
  console.log('Testing OS Modal via FileManager new file...');
  await page.dblclick('[data-testid="shortcut-files"]');
  await page.waitForSelector('button:has-text("New File")', { timeout: 8000 });
  await page.waitForTimeout(500);

  await page.click('button:has-text("New File")');
  await page.waitForSelector('text=New File', { timeout: 5000 });
  await page.waitForTimeout(400);

  const modalShot = path.join(ARTIFACTS_DIR, 'final_04_osmodal.png');
  await page.screenshot({ path: modalShot });
  console.log('📸 Screenshot saved: final_04_osmodal.png');

  // Cancel modal
  const cancelBtn = page.locator('button:has-text("Cancel")');
  if (await cancelBtn.count() > 0) {
    await cancelBtn.click();
    await page.waitForTimeout(400);
  }

  // Test Responsive Height Scaling (Resize viewport height to 480px)
  console.log('Testing responsive height scaling at 480px height...');
  await page.setViewportSize({ width: 1024, height: 480 });
  await page.waitForTimeout(800);

  const heightShot = path.join(ARTIFACTS_DIR, 'final_05_responsive_height_480px.png');
  await page.screenshot({ path: heightShot });
  console.log('📸 Screenshot saved: final_05_responsive_height_480px.png');

  await page.close();
  await context.close();

  // ── 2. Mobile Portrait Context (Testing MobileGate) ──
  console.log('Testing MobileGate on portrait mobile viewport (375x667)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await mobilePage.waitForSelector('text=Desktop Experience Required', { timeout: 10000 });
  await mobilePage.waitForTimeout(800);

  const mobileShot = path.join(ARTIFACTS_DIR, 'final_06_mobile_gate.png');
  await mobilePage.screenshot({ path: mobileShot });
  console.log('📸 Screenshot saved: final_06_mobile_gate.png');

  await mobilePage.close();
  await mobileContext.close();

  await browser.close();
  console.log('🎉 All Phase 2 verifications passed!');
}

verifyAll().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
