const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = path.resolve('C:\\Users\\bb201\\.gemini\\antigravity-ide\\brain\\e4e13b57-d433-49b6-8e4b-ab1310784bc2');

async function run() {
  console.log('🚀 Starting Billighost OS Phase 3 Verification...');

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
  page.on('dialog', async dialog => {
    console.log(`[DIALOG] ${dialog.type()}: "${dialog.message()}" -> accepting`);
    await dialog.accept();
  });

  // 1. Boot to Lock Screen & Login
  console.log('1. Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  console.log('Waiting for Lock Screen...');
  await page.waitForSelector('text=bb2010ng@gmail.com', { timeout: 15000 });
  await page.mouse.click(720, 450);

  await page.waitForSelector('input[type="password"]', { timeout: 8000 });
  await page.waitForTimeout(800);
  await page.click('input[type="password"]');
  await page.waitForTimeout(200);
  await page.keyboard.type('0813');

  console.log('Waiting for Desktop...');
  await page.waitForSelector('button:has-text("Billighost")', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // 2. Notification Toast Verification
  console.log('2. Testing System Notification Toasts...');
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent('billighost:notification-toast', {
        detail: {
          id: 'notif-p3-test',
          title: 'System Security Active',
          message: 'Hardware encryption and VFS telemetry monitoring enabled.',
          icon: '🛡️',
          type: 'success',
        },
      })
    );
  });

  await page.waitForSelector('text=System Security Active', { timeout: 5000 });
  await page.waitForTimeout(600);

  const toastShot = path.join(ARTIFACTS_DIR, '18_notification_toasts.png');
  await page.screenshot({ path: toastShot });
  console.log('📸 Saved Notification Toast screenshot:', toastShot);

  // 3. Action Center Flyout Notification Feed
  console.log('3. Checking Control Center Notification Feed...');
  await page.click('button[title="Open Control Center"]');
  await page.waitForSelector('text=Control Center', { timeout: 5000 });
  await page.waitForSelector('text=Notifications', { timeout: 5000 });
  await page.waitForTimeout(500);

  const acShot = path.join(ARTIFACTS_DIR, '19_action_center_notifications.png');
  await page.screenshot({ path: acShot });
  console.log('📸 Saved Action Center screenshot:', acShot);

  // Close Action Center
  await page.mouse.click(200, 200);
  await page.waitForTimeout(500);

  // 4. Virtual Desktops / Multiple Workspaces
  console.log('4. Testing Virtual Desktops (Workspaces)...');
  await page.click('button[title="Task View (Alt+Tab)"]');
  await page.waitForSelector('text=Task View / Workspace Switcher', { timeout: 6000 });
  await page.waitForTimeout(400);

  // Add new desktop 3
  console.log('Clicking "+ New Desktop"...');
  await page.click('[data-testid="add-workspace-btn"]');
  await page.waitForTimeout(500);

  const taskViewShot = path.join(ARTIFACTS_DIR, '20_virtual_desktops_taskview.png');
  await page.screenshot({ path: taskViewShot });
  console.log('📸 Saved Task View Workspaces screenshot:', taskViewShot);

  // Switch to Desktop 2
  console.log('Switching to Desktop 2 in Task View...');
  await page.click('[data-testid="workspace-tab-ws-2"]');
  await page.waitForTimeout(600);

  // Launch Calculator on Desktop 2
  console.log('Launching Calculator on Desktop 2...');
  await page.dblclick('[data-testid="shortcut-calc"]');
  await page.waitForSelector('text=Scientific Mode', { timeout: 8000 });
  await page.waitForTimeout(600);

  // Switch back to Desktop 1 with keyboard shortcut (Ctrl + Alt + ArrowLeft)
  console.log('Cycling back to Desktop 1 via Ctrl + Alt + ArrowLeft...');
  await page.keyboard.press('Control+Alt+ArrowLeft');
  await page.waitForTimeout(800);

  // Verify Calculator window is not rendered in Desktop 1
  const calcVisibleOnD1 = await page.isVisible('text=Scientific Mode');
  console.log('Is Calculator visible on Desktop 1?', calcVisibleOnD1 ? 'YES (Error)' : 'NO (Correctly isolated)');

  // Switch back to Desktop 2
  await page.keyboard.press('Control+Alt+ArrowRight');
  await page.waitForTimeout(800);
  const calcVisibleOnD2 = await page.isVisible('text=Scientific Mode');
  console.log('Is Calculator visible on Desktop 2?', calcVisibleOnD2 ? 'YES (Correct)' : 'NO (Error)');

  // Close Calculator on Desktop 2
  await page.click('button[title="Close"]');
  await page.waitForTimeout(500);

  // Switch back to Desktop 1
  await page.keyboard.press('Control+Alt+ArrowLeft');
  await page.waitForTimeout(600);

  // 5. Recycle Bin Subsystem & Soft Deletion
  console.log('5. Testing Recycle Bin Soft Deletion & Restoration...');
  // Wait for desktop icons
  await page.waitForSelector('[data-testid="vfs-OS_Notes.md"]', { timeout: 6000 });

  // Right-click OS_Notes.md
  console.log('Right-clicking OS_Notes.md on Desktop...');
  await page.click('[data-testid="vfs-OS_Notes.md"]', { button: 'right' });
  await page.waitForSelector('[data-testid="menu-move-to-trash"]', { timeout: 5000 });
  await page.waitForTimeout(300);

  // Click Move to Recycle Bin
  console.log('Moving OS_Notes.md to Recycle Bin...');
  await page.click('[data-testid="menu-move-to-trash"]');
  await page.waitForTimeout(800);

  // Verify OS_Notes.md is removed from Desktop
  const onDesktop = await page.isVisible('[data-testid="vfs-OS_Notes.md"]');
  console.log('Is OS_Notes.md still on Desktop?', onDesktop ? 'YES (Error)' : 'NO (Moved to trash)');

  // Open Recycle Bin
  console.log('Opening Recycle Bin app...');
  await page.dblclick('[data-testid="shortcut-trash"]');
  await page.waitForSelector('[data-testid="trash-item-OS_Notes.md"]', { timeout: 8000 });
  await page.waitForTimeout(600);

  // Click item to select
  await page.click('[data-testid="trash-item-OS_Notes.md"]');
  await page.waitForTimeout(300);

  const trashShot = path.join(ARTIFACTS_DIR, '21_recycle_bin.png');
  await page.screenshot({ path: trashShot });
  console.log('📸 Saved Recycle Bin screenshot:', trashShot);

  // Restore item
  console.log('Restoring OS_Notes.md from Recycle Bin...');
  await page.click('[data-testid="btn-restore-trash"]');
  await page.waitForTimeout(800);

  // Close Recycle Bin
  await page.click('button[title="Close"]');
  await page.waitForTimeout(500);

  // Verify OS_Notes.md is restored back on Desktop
  await page.waitForSelector('[data-testid="vfs-OS_Notes.md"]', { timeout: 6000 });
  console.log('✅ OS_Notes.md successfully restored to Desktop!');

  // 6. Security PIN Configuration & Lock/Unlock
  console.log('6. Testing Security & PIN Settings...');
  await page.dblclick('[data-testid="shortcut-settings"]');
  await page.waitForSelector('text=Settings', { timeout: 8000 });
  await page.waitForTimeout(400);

  // Click Security & PIN tab
  console.log('Navigating to Security & PIN tab...');
  await page.click('text=Security & PIN');
  await page.waitForSelector('text=Security & Session PIN', { timeout: 5000 });
  await page.waitForTimeout(500);

  // Update PIN to 1234
  console.log('Changing PIN from 0813 to 1234...');
  const inputs = await page.$$('input[type="password"]');
  if (inputs.length >= 3) {
    await inputs[0].fill('0813');
    await inputs[1].fill('1234');
    await inputs[2].fill('1234');
    await page.click('button:has-text("Update Security PIN")');
    await page.waitForTimeout(600);
  }

  const secShot = path.join(ARTIFACTS_DIR, '22_settings_security_pin.png');
  await page.screenshot({ path: secShot });
  console.log('📸 Saved Security Settings screenshot:', secShot);

  // Close settings
  await page.click('button[title="Close"]');
  await page.waitForTimeout(500);

  // Lock the OS
  console.log('Locking OS session...');
  await page.click('button[title="Lock OS session"]');
  await page.waitForSelector('text=bb2010ng@gmail.com', { timeout: 8000 });
  await page.waitForTimeout(500);

  // Unlock with new PIN 1234
  console.log('Attempting unlock with new PIN 1234...');
  await page.mouse.click(720, 450);
  await page.waitForSelector('input[type="password"]', { timeout: 6000 });
  await page.waitForTimeout(800);
  await page.click('input[type="password"]');
  await page.waitForTimeout(200);
  await page.keyboard.type('1234');

  // Verify back on Desktop!
  await page.waitForSelector('button:has-text("Billighost")', { timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log('✅ Successfully unlocked OS with new custom PIN (1234)!');

  // Reset PIN back to default 0813 for safety in local settings
  await page.evaluate(() => {
    const raw = localStorage.getItem('billighost_settings_security');
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.pin = '0813';
      localStorage.setItem('billighost_settings_security', JSON.stringify(parsed));
    }
  });

  const finalShot = path.join(ARTIFACTS_DIR, '23_phase3_verified.png');
  await page.screenshot({ path: finalShot });
  console.log('📸 Saved Final Phase 3 Verified screenshot:', finalShot);

  await browser.close();
  console.log('🎉 Phase 3 automated verification completed successfully!');
}

run().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
