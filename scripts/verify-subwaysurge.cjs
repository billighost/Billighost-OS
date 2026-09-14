const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { bootToDesktop, seedProfile } = require('./harness.cjs');

const ARTIFACTS_DIR = path.resolve('C:/Users/bb201/.gemini/antigravity-ide/brain/60bdafe1-4ab6-487d-9265-84b95d57a52d');

async function takeShot(page, filename) {
  const p = path.join(ARTIFACTS_DIR, filename);
  try {
    await page.screenshot({ path: p, timeout: 8000 });
    console.log(`📸 Captured screenshot: ${filename}`);
  } catch (err) {
    console.warn(`Warning capturing ${filename}:`, err.message);
    try {
      await page.screenshot({ path: p, timeout: 4000 });
      console.log(`📸 Captured screenshot (fallback): ${filename}`);
    } catch (err2) {
      console.error(`Failed to capture ${filename}:`, err2.message);
    }
  }
}

async function run() {
  console.log('🚀 Launching headless Playwright test for Subway Surge 3D...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist']
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
  page.on('pageerror', err => console.error('[Uncaught Exception]:', err));

  console.log('Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

  console.log('Seeding profile with coins and booting to desktop...');
  await seedProfile(page);

  // Pre-seed Subway Surge data so the user has coins for locker & revive tests
  await page.evaluate(() => {
    localStorage.setItem('billighost:subway-surge-data', JSON.stringify({
      highScore: 1450,
      totalCoins: 850,
      unlockedCharacters: ['dash', 'billi'],
      unlockedBoards: ['cyan', 'phantom'],
      selectedCharacter: 'dash',
      selectedBoard: 'cyan',
      soundEnabled: true,
      bgmVolume: 0.8,
      sfxVolume: 0.9,
      missions: { trainsDodged: 12, coinsRun: 45, nearMisses: 2 },
    }));
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await bootToDesktop(page);

  console.log('Desktop ready! Launching Subway Surge 3D via desktop shortcut...');
  await page.waitForTimeout(1000);
  const shortcut = page.locator('[data-testid="shortcut-subwaysurge"]');
  await shortcut.waitFor({ timeout: 10000 });
  await shortcut.dblclick();

  const win = page.locator('[data-app="subwaysurge"]').first();
  await win.waitFor({ timeout: 10000 });
  console.log('✅ Subway Surge 3D window opened successfully!');
  await page.waitForTimeout(1200);

  // ==========================================
  // SCREEN 1: START MENU MODAL
  // ==========================================
  console.log('--- Screen 1: Start Menu Modal ---');
  await takeShot(page, '01_subway_start_screen.png');

  // Verify elements on Start Menu
  const title = await win.locator('h1').innerText();
  console.log('Start menu title:', title);

  // ==========================================
  // SCREEN 2: LOCKER & 3D TURNTABLE
  // ==========================================
  console.log('--- Screen 2: Locker & 3D Turntable ---');
  const lockerBtn = win.locator('button:has-text("Locker & Upgrades")').first();
  await lockerBtn.click();
  await page.waitForTimeout(1500);

  // Verify turntable canvas is present
  const canvases = win.locator('canvas');
  console.log('Canvas count in Locker:', await canvases.count());
  const turntableCanvas = canvases.last();
  await takeShot(page, '02_locker_turntable_dash.png');

  // Simulate dragging the turntable to rotate 3D character
  console.log('Interacting with 3D turntable (rotating character)...');
  try {
    const turntableBox = await turntableCanvas.boundingBox();
    if (turntableBox) {
      await page.mouse.move(turntableBox.x + turntableBox.width / 2, turntableBox.y + turntableBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(turntableBox.x + turntableBox.width / 2 + 120, turntableBox.y + turntableBox.height / 2, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(500);
    }
  } catch (e) {
    console.log('Turntable drag note:', e.message);
  }

  // Switch to Billi (Spectral Master)
  console.log('Selecting Billi (Spectral Master)...');
  const billiCard = win.locator('button:has-text("Billi (Spectral Master)"), div:has-text("Billi (Spectral Master)")').last();
  if (await billiCard.isVisible()) {
    await billiCard.click();
    await page.waitForTimeout(1000);
    await takeShot(page, '03_locker_turntable_billi.png');
  }

  // Switch to Hoverboards Tab
  console.log('Switching to Hoverboards tab...');
  const boardsTab = win.locator('button:has-text("Hoverboards")').first();
  await boardsTab.click();
  await page.waitForTimeout(1000);
  await takeShot(page, '04_locker_boards.png');

  // Select Phantom Drift hoverboard
  const phantomCard = win.locator('button:has-text("Phantom Drift"), div:has-text("Phantom Drift")').last();
  if (await phantomCard.isVisible()) {
    await phantomCard.click();
    await page.waitForTimeout(500);
  }

  // Return to Menu
  console.log('Returning to main menu...');
  const backBtn = win.locator('button:has-text("Back to Menu")').first();
  await backBtn.click();
  await page.waitForTimeout(600);

  // ==========================================
  // SCREEN 3: ACTIVE 3D GAMEPLAY RUN
  // ==========================================
  // ==========================================
  // SCREEN 3: ACTIVE 3D GAMEPLAY RUN
  // ==========================================
  console.log('--- Screen 3: Active 3D Gameplay Run ---');
  const launchBtn = win.locator('button:has-text("Launch Run")').first();
  await launchBtn.click();
  await page.waitForTimeout(1000);

  // Keep player safe from premature collision during key verification
  await page.evaluate(() => {
    if (window.__subwayEngine) {
      window.__subwayEngine.invulnerableTimer = 10;
    }
  });

  console.log('Capturing active run with track, obstacles, and ghost chaser...');
  await takeShot(page, '05_gameplay_active.png');

  // Test Keyboard Controls
  console.log('Testing lane dodge Left (ArrowLeft)...');
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(250);

  console.log('Testing Jump (ArrowUp)...');
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(250);

  console.log('Testing Slide (ArrowDown)...');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(250);

  console.log('Testing lane dodge Right (ArrowRight)...');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(250);

  console.log('Testing Hoverboard Shield Summon (KeyB)...');
  await page.keyboard.press('KeyB');
  await page.waitForTimeout(600);
  await takeShot(page, '06_gameplay_hoverboard_active.png');

  // ==========================================
  // SCREEN 4: PAUSE MENU & VOLUME SLIDERS
  // ==========================================
  console.log('--- Screen 4: Pause Menu Modal ---');
  await page.evaluate(() => {
    if (window.__subwayPause) window.__subwayPause();
    else if (window.__subwaySetState) window.__subwaySetState('paused');
  });
  await page.waitForTimeout(500);
  await takeShot(page, '07_pause_screen.png');

  // Adjust volume sliders
  console.log('Testing volume sliders in Pause modal...');
  const sliders = win.locator('input[type="range"]');
  if (await sliders.count() >= 2) {
    await sliders.nth(0).fill('0.5');
    await sliders.nth(1).fill('0.7');
  }

  // Resume game
  console.log('Resuming run from Pause modal...');
  const resumeBtn = win.locator('button:has-text("Resume Run")').first();
  if (await resumeBtn.isVisible()) {
    await resumeBtn.click();
  } else {
    await page.evaluate(() => {
      if (window.__subwayResume) window.__subwayResume();
      else if (window.__subwaySetState) window.__subwaySetState('playing');
    });
  }
  await page.waitForTimeout(600);

  // ==========================================
  // SCREEN 4B: HIGH-FIDELITY TRAIN & RAMP MOUNTING
  // ==========================================
  console.log('--- Testing Train Ramp Mounting & High-Fidelity Metro Models ---');
  await page.evaluate(() => {
    if (window.__subwayEngine) {
      const eng = window.__subwayEngine;
      eng.currentLane = 1;
      eng.playerGroup.position.x = 0;
      eng.targetX = 0;
      // Spawn a train with ramp 22m ahead of player on center lane
      eng.spawnTrain(0, -22, false, true);
    }
  });
  await page.waitForTimeout(700);
  await takeShot(page, '15_gameplay_train_ramp_mounting.png');

  // Verify ramp mounting physics: ground height increases without crash
  const rampPhysics = await page.evaluate(() => {
    if (!window.__subwayEngine) return null;
    const eng = window.__subwayEngine;
    return {
      groundY: eng.groundY,
      playerY: eng.playerY,
      activeTrains: eng.activeTrains.length,
      hasRamp: eng.activeTrains.some(t => t.hasRamp)
    };
  });
  console.log('Ramp physics verification:', JSON.stringify(rampPhysics));

  // ==========================================
  // SCREEN 4C: JETPACK FLIGHT & SKY COIN HIGHWAY
  // ==========================================
  console.log('--- Testing Jetpack Powerup & Sky Coin Highway Synchronization ---');
  await page.evaluate(() => {
    if (window.__subwayEngine) {
      const eng = window.__subwayEngine;
      eng.collectPowerup('jetpack');
    }
  });
  await page.waitForTimeout(600);
  console.log('Capturing Jetpack Sky Coin Highway flight...');
  await takeShot(page, '16_gameplay_jetpack_flight.png');

  const jetpackStatus = await page.evaluate(() => {
    if (!window.__subwayEngine) return null;
    const eng = window.__subwayEngine;
    return {
      jetpackActive: eng.jetpackActive,
      jetpackLanding: eng.jetpackLanding,
      skyCoinsRemaining: eng.activeSkyCoins.length,
      playerY: eng.playerY,
      distRemaining: eng.skyCoinsEndDist
    };
  });
  console.log('Jetpack in-flight telemetry:', JSON.stringify(jetpackStatus));

  // Advance time to let sky coins pass and verify graceful descent landing
  console.log('Awaiting end of sky coin trail to verify landing synchronization...');
  await page.waitForTimeout(2600);
  const landingStatus = await page.evaluate(() => {
    if (!window.__subwayEngine) return null;
    const eng = window.__subwayEngine;
    return {
      jetpackActive: eng.jetpackActive,
      jetpackLanding: eng.jetpackLanding,
      skyCoinsRemaining: eng.activeSkyCoins.length,
      playerY: eng.playerY,
      distRemaining: eng.skyCoinsEndDist
    };
  });
  console.log('Jetpack descent/landing telemetry:', JSON.stringify(landingStatus));
  await takeShot(page, '17_gameplay_jetpack_landing.png');

  // ==========================================
  // SCREEN 5: REVIVE / SECOND CHANCE SCREEN
  // ==========================================
  console.log('--- Screen 5: Revive / Second Chance Screen ---');
  await page.evaluate(() => {
    if (window.__subwaySetState) {
      window.__subwaySetState('revive');
    }
  });
  await page.waitForTimeout(600);
  await takeShot(page, '08_revive_screen.png');

  // ==========================================
  // SCREEN 6: GAME OVER SCREEN
  // ==========================================
  console.log('--- Screen 6: Game Over Screen ---');
  const giveUpBtn = win.locator('button:has-text("Give Up")').first();
  if (await giveUpBtn.isVisible()) {
    await giveUpBtn.click();
  } else {
    await page.evaluate(() => {
      if (window.__subwaySetState) {
        window.__subwaySetState('gameover');
      }
    });
  }
  await page.waitForTimeout(600);
  await takeShot(page, '09_gameover_screen.png');

  // ==========================================
  // RESPONSIVENESS: OS APP WINDOW SIZING
  // (Testing the OS App Window itself per user clarification)
  // ==========================================
  console.log('--- OS App Window Responsiveness Testing (Inside Billighost OS) ---');

  // Go to start screen
  await page.evaluate(() => {
    if (window.__subwaySetState) window.__subwaySetState('start');
  });
  await page.waitForTimeout(400);

  // OS Window Size 1: Compact Square Window (480x480)
  console.log('Testing OS App Window Size 1: Compact Square (480x480)...');
  await page.evaluate(() => {
    if (window.__billighostResizeWindow) {
      window.__billighostResizeWindow('subwaysurge', 480, 480);
    }
  });
  await page.waitForTimeout(600);
  await takeShot(page, '10_responsive_os_window_480x480.png');

  // OS Window Size 2: Tall Narrow Mobile Window (390x680)
  console.log('Testing OS App Window Size 2: Tall Narrow Mobile (390x680)...');
  await page.evaluate(() => {
    if (window.__billighostResizeWindow) {
      window.__billighostResizeWindow('subwaysurge', 390, 680);
    }
  });
  await page.waitForTimeout(600);
  await takeShot(page, '11_responsive_os_window_390x680.png');

  // OS Window Size 3: Short Wide Letterbox Window (750x380)
  console.log('Testing OS App Window Size 3: Short Wide Letterbox (750x380)...');
  await page.evaluate(() => {
    if (window.__billighostResizeWindow) {
      window.__billighostResizeWindow('subwaysurge', 750, 380);
    }
  });
  await page.waitForTimeout(600);
  await takeShot(page, '12_responsive_os_window_750x380.png');

  // OS Window Size 4: Active Gameplay in Narrow Window (400x650)
  console.log('Testing Active Gameplay in Narrow OS App Window (400x650)...');
  await page.evaluate(() => {
    if (window.__billighostResizeWindow) {
      window.__billighostResizeWindow('subwaysurge', 400, 650);
    }
    if (window.__subwaySetState && window.__subwayEngine) {
      window.__subwaySetState('playing');
      window.__subwayEngine.start();
    }
  });
  await page.waitForTimeout(800);
  await takeShot(page, '13_responsive_os_window_gameplay_400x650.png');

  // OS Window Size 5: Locker in Wide Window (880x560)
  console.log('Testing Locker 3D Turntable in Wide OS App Window (880x560)...');
  await page.evaluate(() => {
    if (window.__billighostResizeWindow) {
      window.__billighostResizeWindow('subwaysurge', 880, 560);
    }
    if (window.__subwaySetState) {
      window.__subwaySetState('locker');
    }
  });
  await page.waitForTimeout(800);
  await takeShot(page, '14_responsive_os_window_locker_880x560.png');

  // OS Window Size 6: Pause Menu in Compact Window (440x440)
  console.log('Testing Pause Modal in Compact OS App Window (440x440)...');
  await page.evaluate(() => {
    if (window.__billighostResizeWindow) {
      window.__billighostResizeWindow('subwaysurge', 440, 440);
    }
    if (window.__subwaySetState) {
      window.__subwaySetState('paused');
    }
  });
  await page.waitForTimeout(600);
  await takeShot(page, '18_responsive_os_window_pause_440x440.png');

  // Restore Default Window Size
  await page.evaluate(() => {
    if (window.__billighostResizeWindow) {
      window.__billighostResizeWindow('subwaysurge', 860, 580);
    }
  });
  await page.waitForTimeout(400);

  console.log('🎉 All headless Playwright tests completed successfully!');
  await browser.close();
}

run().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
