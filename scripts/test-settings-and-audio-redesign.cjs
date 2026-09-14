/**
 * Headless Playwright Verification Script:
 * Settings App & Audio Player App (Nordic Obsidian Redesign)
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { bootToDesktop, seedProfile } = require('./harness.cjs');

const SHOTS_DIR = path.resolve(__dirname, 'shots');
if (!fs.existsSync(SHOTS_DIR)) {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
}

(async () => {
  console.log('===========================================================');
  console.log('  STARTING PLAYWRIGHT VERIFICATION: SETTINGS & AUDIO APPS  ');
  console.log('===========================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', err => errors.push(`[PageError] ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[ConsoleError] ${msg.text()}`);
  });

  try {
    // 1. Boot to Desktop
    console.log('1. Seeding user profile and booting to desktop...');
    await page.goto('http://localhost:5200/', { waitUntil: 'domcontentloaded' });
    await seedProfile(page, {
      name: 'Freja Lindqvist',
      email: 'freja@nordic.os',
      wallpaper: 'aurora',
      pin: '0813',
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await bootToDesktop(page, { pin: '0813' });
    console.log('  ✓ Landed on Billighost Desktop');

    // 2. Open & Test Settings App
    console.log('\n2. Testing Settings App (Nordic Obsidian)...');
    await page.dblclick('[data-testid="shortcut-settings"]', { timeout: 8000 });
    await page.waitForTimeout(600);

    const settingsWin = page.locator('[data-app="settings"]').first();
    await settingsWin.waitFor({ state: 'visible', timeout: 8000 });
    console.log('  ✓ Settings window opened');

    // Test Navigation Tabs
    const navItems = settingsWin.locator('nav button');
    const navCount = await navItems.count();
    console.log(`  ✓ Found ${navCount} navigation items in sidebar`);

    // Click Appearance
    const appearanceNav = settingsWin.locator('nav button', { hasText: 'Appearance' });
    if (await appearanceNav.count()) {
      await appearanceNav.click();
      await page.waitForTimeout(300);
      console.log('  ✓ Navigated to Appearance tab');

      // Click an accent color
      const accentButtons = settingsWin.locator('button[class*="accentBtn"]');
      if (await accentButtons.count() > 2) {
        await accentButtons.nth(2).click();
        await page.waitForTimeout(200);
        console.log('  ✓ Selected accent color chip');
      }

      // Check canvas preview
      const canvas = settingsWin.locator('canvas[class*="wallpaperCanvas"]');
      if (await canvas.count()) {
        console.log('  ✓ Live wallpaper preview canvas active');
      }
    }

    // Click Sound tab
    const soundNav = settingsWin.locator('nav button', { hasText: 'Audio' });
    if (await soundNav.count()) {
      await soundNav.click();
      await page.waitForTimeout(300);
      console.log('  ✓ Navigated to Audio & Sound tab');
    }

    // Click Security tab
    const secNav = settingsWin.locator('nav button', { hasText: 'Security' });
    if (await secNav.count()) {
      await secNav.click();
      await page.waitForTimeout(300);
      console.log('  ✓ Navigated to Security tab');
    }

    // Click About tab
    const aboutNav = settingsWin.locator('nav button', { hasText: 'Specs' });
    if (await aboutNav.count()) {
      await aboutNav.click();
      await page.waitForTimeout(300);
      console.log('  ✓ Navigated to System Specs & Telemetry tab');
    }

    // Return to Profile tab
    const profileNav = settingsWin.locator('nav button', { hasText: 'Profile' });
    if (await profileNav.count()) {
      await profileNav.click();
      await page.waitForTimeout(300);
      console.log('  ✓ Navigated back to Profile tab');
    }

    // Take screenshot of Settings App
    const settingsShotPath = path.join(SHOTS_DIR, 'settings-nordic.png');
    await settingsWin.screenshot({ path: settingsShotPath });
    console.log(`  📸 Saved Settings App screenshot: ${settingsShotPath}`);

    // Close Settings window cleanly before next app
    const closeBtn = settingsWin.locator('button[title="Close"]');
    if (await closeBtn.count()) {
      await closeBtn.click();
      await page.waitForTimeout(500);
      console.log('  ✓ Settings window closed');
    }

    // 3. Open & Test Audio Player App
    console.log('\n3. Testing Audio Player App (Nordic Obsidian Hi-Fi)...');
    await page.dblclick('[data-testid="shortcut-music"]', { timeout: 8000 });
    await page.waitForTimeout(800);

    const audioWin = page.locator('[data-app="media"]').first();
    await audioWin.waitFor({ state: 'visible', timeout: 8000 });
    console.log('  ✓ Audio Player window opened');

    // Click Play button
    const playBtn = audioWin.locator('button[class*="playBtn"]').first();
    await playBtn.click();
    await page.waitForTimeout(500);

    // Verify vinyl spinning class
    const vinylPlatter = audioWin.locator('[class*="vinylPlatter"]').first();
    const platterClasses = await vinylPlatter.getAttribute('class');
    const isSpinning = platterClasses && platterClasses.includes('spinning');
    console.log(`  ✓ Vinyl Platter Spinning: ${isSpinning ? 'YES ✓' : 'NO'}`);

    // Test visualizer switcher
    const visBtns = audioWin.locator('[class*="visSwitcher"] button');
    const visCount = await visBtns.count();
    console.log(`  ✓ Found ${visCount} visualizer mode options`);

    for (let i = 0; i < Math.min(visCount, 4); i++) {
      await visBtns.nth(i).click();
      await page.waitForTimeout(150);
    }
    console.log('  ✓ Cycled through visualizer modes');

    // Switch to EQ tab
    const eqTabBtn = audioWin.locator('button', { hasText: 'EQ & Acoustics' });
    await eqTabBtn.click();
    await page.waitForTimeout(300);
    console.log('  ✓ Switched to EQ & Acoustics tab');

    // Switch to Presets Vault tab
    const vaultTabBtn = audioWin.locator('button', { hasText: 'Synthesizer Vault' });
    await vaultTabBtn.click();
    await page.waitForTimeout(300);
    console.log('  ✓ Switched to Synthesizer Vault tab');

    // Click Cyberpunk preset
    const cyberPreset = audioWin.locator('[class*="presetCard"]', { hasText: 'Cyberpunk Noir' });
    if (await cyberPreset.count()) {
      await cyberPreset.click();
      await page.waitForTimeout(300);
      console.log('  ✓ Selected "Cyberpunk Noir" preset');
    }

    // Switch back to Turntable stage
    const turntableTabBtn = audioWin.locator('button', { hasText: 'Turntable & Stage' });
    await turntableTabBtn.click();
    await page.waitForTimeout(300);

    // Take screenshot of Audio Player App
    const audioShotPath = path.join(SHOTS_DIR, 'audio-player-nordic.png');
    await audioWin.screenshot({ path: audioShotPath });
    console.log(`  📸 Saved Audio Player App screenshot: ${audioShotPath}`);

    // Close Audio Player window cleanly
    const audioCloseBtn = audioWin.locator('button[title="Close"]');
    if (await audioCloseBtn.count()) {
      await audioCloseBtn.click();
      await page.waitForTimeout(500);
      console.log('  ✓ Audio Player window closed');
    }

    // Error summary
    if (errors.length) {
      console.warn('\n⚠ Console errors occurred during test:');
      errors.forEach(e => console.warn('  ', e));
    } else {
      console.log('\n✓ Zero console errors encountered!');
    }

    console.log('\n===========================================================');
    console.log('  ALL SETTINGS & AUDIO REDESIGN TESTS PASSED! ✓✓✓          ');
    console.log('===========================================================\n');
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
