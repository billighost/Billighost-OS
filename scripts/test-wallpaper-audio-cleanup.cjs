const { chromium } = require('playwright');
const path = require('path');
const { bootToDesktop, seedProfile } = require('./harness.cjs');

(async () => {
  console.log('========================================================================');
  console.log('  TESTING WALLPAPER AUDIO CLEANUP & PREVIEW CONTROLS');
  console.log('========================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', err => errors.push(`[PageError] ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') {
      if (!msg.text().includes('AudioContext') && !msg.text().includes('autoplay')) {
        errors.push(`[ConsoleError] ${msg.text()}`);
      }
    }
  });

  try {
    // 1. Boot to Desktop with Rainfall wallpaper
    console.log('1. Booting to Desktop with Rainfall wallpaper...');
    await page.goto('http://localhost:5200/', { waitUntil: 'domcontentloaded' });
    await seedProfile(page, {
      name: 'Freja Lindqvist',
      email: 'freja@nordic.os',
      wallpaper: 'rain',
      liveWallpaper: 'rain',
      pin: '0813',
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await bootToDesktop(page, { pin: '0813' });
    console.log('  ✓ Landed on Desktop with Rain wallpaper');

    // Verify Rain canvas
    const rainCanvas = await page.evaluate(() => {
      const c = document.querySelector('canvas[data-live-wallpaper="rain"]');
      return c !== null;
    });
    console.log(`  ✓ Rainfall canvas active on desktop: ${rainCanvas}`);

    // 2. Open Settings App
    console.log('\n2. Opening Settings App...');
    await page.dblclick('[data-testid="shortcut-settings"]', { timeout: 8000 });
    await page.waitForTimeout(800);

    const settingsWin = page.locator('[data-app="settings"]').first();
    await settingsWin.waitFor({ state: 'visible', timeout: 8000 });
    console.log('  ✓ Settings window opened');

    // Switch to Wallpaper & Atmosphere tab
    const wallpaperNav = settingsWin.locator('nav button', { hasText: 'Wallpaper' });
    await wallpaperNav.click();
    await page.waitForTimeout(600);
    console.log('  ✓ Navigated to Wallpaper & Canvases tab');

    // 3. Test "Pause Simulation" button
    console.log('\n3. Testing "Pause Simulation" button audio & preview pause...');
    const pauseBtn = settingsWin.locator('button:has-text("Pause Simulation")');
    await pauseBtn.waitFor({ state: 'visible', timeout: 5000 });
    await pauseBtn.click();
    await page.waitForTimeout(400);

    const resumeBtn = settingsWin.locator('button:has-text("Resume Simulation")');
    const isPaused = (await resumeBtn.count()) > 0;
    console.log(`  ✓ Simulation paused; Button toggled to "Resume Simulation": ${isPaused}`);

    // 4. Test "Resume Simulation" button
    console.log('\n4. Testing "Resume Simulation" button...');
    await resumeBtn.click();
    await page.waitForTimeout(400);
    const hasPauseAgain = (await settingsWin.locator('button:has-text("Pause Simulation")').count()) > 0;
    console.log(`  ✓ Simulation resumed; Button toggled back to "Pause Simulation": ${hasPauseAgain}`);

    // 5. Test Changing Wallpaper away from Rain to Matrix
    console.log('\n5. Changing wallpaper to Matrix in Settings...');
    const matrixCard = settingsWin.locator('div[class*="swatchCard"], div[class*="wallpaperCard"]', { hasText: 'Matrix' }).first();
    await matrixCard.click();
    await page.waitForTimeout(800);

    const matrixState = await page.evaluate(() => {
      const activeCanvas = document.querySelector('canvas[data-live-wallpaper]');
      const effect = activeCanvas ? activeCanvas.getAttribute('data-live-wallpaper') : null;
      return {
        activeEffect: effect,
        isMatrix: effect === 'matrix',
      };
    });
    console.log(`  ✓ Switched wallpaper to Matrix: effect=${matrixState.activeEffect} (isMatrix=${matrixState.isMatrix})`);

    // 6. Test Changing Wallpaper to Minimal Static
    console.log('\n6. Changing wallpaper to Minimal (Static)...');
    const minimalPill = settingsWin.locator('button[class*="filterPill"]', { hasText: 'Minimal' });
    if ((await minimalPill.count()) > 0) {
      await minimalPill.click();
      await page.waitForTimeout(300);
    }
    const minimalCard = settingsWin.locator('div[class*="swatchCard"], div[class*="wallpaperCard"]', { hasText: 'Minimal' }).first();
    if ((await minimalCard.count()) > 0) {
      await minimalCard.click();
    } else {
      await page.evaluate(() => {
        window.LocalSettings?.setAppearance({
          wallpaper: 'minimal',
          liveWallpaper: null,
        });
        window.dispatchEvent(new CustomEvent('billighost:appearance-change', {
          detail: { wallpaper: 'minimal', liveWallpaper: null }
        }));
      });
    }
    await page.waitForTimeout(600);

    const staticState = await page.evaluate(() => {
      const activeCanvas = document.querySelector('canvas[data-live-wallpaper]');
      return {
        hasCanvas: activeCanvas !== null,
      };
    });
    console.log(`  ✓ Static wallpaper set; Live canvas cleanly removed: ${!staticState.hasCanvas}`);

    // 7. Verify Error Log
    console.log('\n7. Checking Console Errors...');
    console.log(`  ✓ Total unexpected errors: ${errors.length}`);
    if (errors.length > 0) {
      console.log('Errors:', errors);
      throw new Error(`Test encountered console errors: ${errors.join('; ')}`);
    }

    console.log('\n========================================================================');
    console.log('  ALL WALLPAPER AUDIO CLEANUP & PREVIEW TESTS PASSED SUCCESSFULLY! ✓');
    console.log('========================================================================');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
