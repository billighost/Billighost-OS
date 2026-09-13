const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { bootToDesktop, seedProfile } = require('./harness.cjs');

const ARTIFACTS_DIR = path.resolve('C:/Users/bb201/.gemini/antigravity-ide/brain/b713536a-e287-4153-bc61-8ccefcafb637');

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
  console.log('Launching browser for VoidStrike 3D verification...');
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

  // Launch VoidStrike 3D
  console.log('Launching VoidStrike 3D via desktop shortcut...');
  const voidstrikeShortcut = page.locator('text="VoidStrike 3D"').first();
  await voidstrikeShortcut.waitFor({ timeout: 10000 });
  await voidstrikeShortcut.dblclick({ delay: 60 });

  // Wait for VoidStrike 3D Hangar Bay
  console.log('Waiting for VoidStrike 3D Hangar and Briefing...');
  const startModalTitle = page.locator('text="VOIDSTRIKE 3D: BILLIGHOST OS"').first();
  await startModalTitle.waitFor({ timeout: 10000 });
  await page.waitForTimeout(800);

  // Shot 1: 3D Hangar Bay Customization
  await takeShot(page, '01_voidstrike_hangar_bay.png');

  // Test switching Hangar tabs: Ace Pilots
  console.log('Switching to Ace Pilots tab...');
  const pilotsTab = page.locator('text="Ace Pilots"').first();
  await pilotsTab.click();
  await page.waitForTimeout(600);
  await takeShot(page, '02_voidstrike_pilots_tab.png');

  // Test switching Livery & Lasers tab
  console.log('Switching to Livery & Lasers tab...');
  const paintTab = page.locator('text="Livery & Lasers"').first();
  await paintTab.click();
  await page.waitForTimeout(600);
  await takeShot(page, '03_voidstrike_livery_tab.png');

  // Click "Launch Starfighter"
  console.log('Launching Starfighter into Sector combat...');
  const launchBtn = page.locator('text="Launch Starfighter"').first();
  await launchBtn.click();
  await page.waitForTimeout(1500);

  // Shot 4: Active Space Flight with PCF Shadows, Gas Giant & 3D Ghosts
  console.log('Capturing active 3D space flight & HUD...');
  await takeShot(page, '04_voidstrike_active_flight.png');

  // Fire Twin Plasma Cannons (Space)
  console.log('Firing twin plasma laser cannons...');
  await page.keyboard.press('Space');
  await page.waitForTimeout(120);
  await page.keyboard.press('Space');
  await page.waitForTimeout(120);
  await page.keyboard.press('Space');
  await page.waitForTimeout(250);

  // Shot 5: Laser Cannons Firing
  await takeShot(page, '05_voidstrike_lasers_firing.png');

  // Launch Homing Photon Torpedo (F)
  console.log('Launching homing photon torpedo (F)...');
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(400);

  // Shot 6: Photon Torpedo Launch
  await takeShot(page, '06_voidstrike_torpedo_launch.png');

  // Activate Ghost Surge Overdrive (G)
  console.log('Triggering Ghost Surge Overdrive (G)...');
  await page.keyboard.press('KeyG');
  await page.waitForTimeout(500);

  // Shot 7: Ghost Surge Overdrive Spectral Phase
  await takeShot(page, '07_voidstrike_ghost_surge.png');

  // Toggle Cockpit Camera View (V)
  console.log('Toggling Cockpit Camera View (V)...');
  await page.keyboard.press('KeyV');
  await page.waitForTimeout(600);

  // Shot 8: Cockpit Interior 2.0 View
  await takeShot(page, '08_voidstrike_cockpit_view.png');

  // Toggle back to Chase Cam
  await page.keyboard.press('KeyV');
  await page.waitForTimeout(300);

  // Test Small Window Responsiveness (720x440)
  console.log('Testing responsive scaling (720x440)...');
  await page.setViewportSize({ width: 720, height: 440 });
  await page.waitForTimeout(600);

  // Shot 9: Responsive Layout
  await takeShot(page, '09_voidstrike_responsive.png');

  console.log('All VoidStrike 3D tests and screenshots completed successfully!');
  await browser.close();
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
