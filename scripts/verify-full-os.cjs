const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = path.resolve('C:\\Users\\bb201\\.gemini\\antigravity-ide\\brain\\e4e13b57-d433-49b6-8e4b-ab1310784bc2');


async function run() {
  console.log('🚀 Starting Billighost OS Full Environment Verification...');

  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'msedge' });
  } catch {
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    permissions: ['geolocation'],
    geolocation: { latitude: 51.5074, longitude: -0.1278 }
  });

  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  // 1. Boot to Lock Screen
  console.log('Navigating to OS root http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  console.log('Waiting for Lock Screen...');
  await page.waitForSelector('text=bb2010ng@gmail.com', { timeout: 15000 });
  await page.waitForTimeout(600);

  const lockShot = path.join(ARTIFACTS_DIR, '01_real_lock_screen.png');
  await page.screenshot({ path: lockShot });
  console.log('📸 Saved Lock Screen screenshot with real telemetry:', lockShot);

  // 2. Unlock & PIN Entry
  console.log('Unlocking...');
  await page.mouse.click(720, 450);
  await page.waitForSelector('input[type="password"]', { timeout: 8000 });
  await page.waitForTimeout(800);
  await page.click('input[type="password"]');
  await page.waitForTimeout(200);
  console.log('Typing PIN (0813)...');
  await page.keyboard.type('0813');

  // 3. Wait for Signing In Screen & Desktop
  console.log('Waiting for Signing In Screen...');
  await page.waitForSelector('text=Signing you in', { timeout: 6000 });
  console.log('Waiting for Desktop environment...');
  await page.waitForSelector('button:has-text("Billighost")', { timeout: 15000 });
  await page.waitForTimeout(1000);

  const desktopShot = path.join(ARTIFACTS_DIR, '02_desktop_initial.png');
  await page.screenshot({ path: desktopShot });
  console.log('📸 Saved Desktop Initial screenshot:', desktopShot);

  // 4. Test Start Menu
  console.log('Opening Start Menu...');
  await page.click('button:has-text("Billighost")');
  await page.waitForSelector('text=Applications', { timeout: 3000 });
  await page.waitForTimeout(400);

  const startShot = path.join(ARTIFACTS_DIR, '03_start_menu.png');
  await page.screenshot({ path: startShot });
  console.log('📸 Saved Start Menu screenshot:', startShot);

  // 5. Open Settings App from Start Menu
  console.log('Opening Settings App...');
  await page.click('button:has-text("Settings")');
  await page.waitForSelector('text=User Profile & Identity', { timeout: 5000 });
  await page.waitForTimeout(600);

  const settingsProfileShot = path.join(ARTIFACTS_DIR, '04_settings_profile.png');
  await page.screenshot({ path: settingsProfileShot });
  console.log('📸 Saved Settings Profile screenshot:', settingsProfileShot);

  // 6. Test Wallpaper Tab in Settings
  console.log('Testing Wallpaper customization in Settings...');
  await page.click('button:has-text("Wallpaper")');
  await page.waitForSelector('text=Cyber Neon', { timeout: 3000 });
  await page.click('text=Cyber Neon');
  await page.waitForTimeout(500);

  const settingsWallpaperShot = path.join(ARTIFACTS_DIR, '05_settings_wallpaper.png');
  await page.screenshot({ path: settingsWallpaperShot });
  console.log('📸 Saved Settings Wallpaper selection:', settingsWallpaperShot);

  // 7. Test Theme / Appearance Tab
  console.log('Testing Theme & Accent Colors in Settings...');
  await page.click('button:has-text("Theme & Colors")');
  await page.waitForSelector('text=Accent Glow Color', { timeout: 3000 });
  await page.click('button:has-text("Emerald")');
  await page.waitForTimeout(400);

  // 8. Test System Specs / About Tab
  console.log('Testing System Specs Tab...');
  await page.click('button:has-text("System Specs")');
  await page.waitForSelector('text=Logical CPU Cores', { timeout: 3000 });
  await page.waitForTimeout(400);

  const settingsAboutShot = path.join(ARTIFACTS_DIR, '06_settings_specs.png');
  await page.screenshot({ path: settingsAboutShot });
  console.log('📸 Saved Settings Specs screenshot:', settingsAboutShot);

  // Close Settings window
  console.log('Closing Settings window...');
  await page.click('button[title="Close"]');
  await page.waitForTimeout(400);

  // 9. Open Terminal from Desktop Icon
  console.log('Launching Terminal from Desktop icon...');
  await page.dblclick('[data-testid="shortcut-terminal"]');
  await page.waitForSelector('text=Billighost OS Shell', { timeout: 8000 });
  await page.waitForTimeout(400);

  // Type neofetch in Terminal
  console.log('Executing "neofetch" in terminal...');
  await page.keyboard.type('neofetch');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);

  const terminalShot = path.join(ARTIFACTS_DIR, '07_terminal_neofetch.png');
  await page.screenshot({ path: terminalShot });
  console.log('📸 Saved Terminal Neofetch screenshot:', terminalShot);

  // 10. Open Files Explorer
  console.log('Launching Files Explorer...');
  await page.dblclick('[data-testid="shortcut-files"]');
  await page.waitForSelector('div[class*="addressBar"]', { timeout: 8000 });
  await page.waitForTimeout(500);

  const filesShot = path.join(ARTIFACTS_DIR, '08_file_manager.png');
  await page.screenshot({ path: filesShot });
  console.log('📸 Saved File Manager screenshot:', filesShot);

  // 11. Test Interactive System Tray Flyouts
  console.log('Testing Battery Flyout...');
  await page.click('button[title*="Battery:"]');
  await page.waitForSelector('text=Power & Battery', { timeout: 3000 });
  await page.waitForTimeout(400);

  const batteryFlyoutShot = path.join(ARTIFACTS_DIR, '09_battery_flyout.png');
  await page.screenshot({ path: batteryFlyoutShot });
  console.log('📸 Saved Battery Flyout screenshot:', batteryFlyoutShot);

  console.log('Testing Calendar Flyout...');
  await page.click('button[title="Open Calendar & Date"]');
  await page.waitForSelector('text=Su', { timeout: 3000 });
  await page.waitForTimeout(400);

  const calendarFlyoutShot = path.join(ARTIFACTS_DIR, '10_calendar_flyout.png');
  await page.screenshot({ path: calendarFlyoutShot });
  console.log('📸 Saved Calendar Flyout screenshot:', calendarFlyoutShot);

  console.log('Testing Action Center Control Flyout...');
  await page.click('button[title="Open Control Center"]');
  await page.waitForSelector('text=Control Center', { timeout: 3000 });
  await page.waitForTimeout(400);

  const actionCenterShot = path.join(ARTIFACTS_DIR, '11_control_center.png');
  await page.screenshot({ path: actionCenterShot });
  console.log('📸 Saved Action Center screenshot:', actionCenterShot);

  await browser.close();
  console.log('🎉 ALL TESTS PASSED! Operating System verification complete.');
}

run().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
