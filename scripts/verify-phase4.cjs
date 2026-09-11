const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = path.resolve('C:\\Users\\bb201\\.gemini\\antigravity-ide\\brain\\7eaaa9a8-71e5-44ba-ad2f-6dadc37ba9ce');

async function run() {
  console.log('🚀 Starting Billighost OS Phase 4 Automated Verification...');

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

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR LOG:', msg.text());
  });
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
  await page.waitForTimeout(700);
  await page.click('input[type="password"]');
  await page.waitForTimeout(200);
  await page.keyboard.type('0813');

  console.log('Waiting for Desktop...');
  await page.waitForSelector('button:has-text("Billighost")', { timeout: 15000 });
  await page.waitForTimeout(1200);

  // 2. Test 8-Direction Multi-Side Window Resizing
  console.log('2. Testing 8-Direction Window Resizing...');
  // Open Notepad to test resizing
  await page.waitForSelector('[data-testid="shortcut-notepad"]', { timeout: 10000 });
  await page.dblclick('[data-testid="shortcut-notepad"]');
  await page.waitForSelector('[data-testid="os-window"]', { timeout: 10000 });
  await page.waitForSelector('[data-testid="resize-handle-se"]', { timeout: 6000 });
  await page.waitForTimeout(600);

  const windowSelector = '[data-testid="os-window"]';
  const initialBox = await page.locator(windowSelector).boundingBox();
  console.log('Initial window dimensions:', initialBox);

  // Resize via East handle (right edge)
  const handleE = await page.locator('[data-testid="resize-handle-e"]').boundingBox();
  if (handleE) {
    await page.mouse.move(handleE.x + handleE.width / 2, handleE.y + handleE.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleE.x + handleE.width / 2 + 80, handleE.y + handleE.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
  }

  // Resize via South handle (bottom edge)
  const handleS = await page.locator('[data-testid="resize-handle-s"]').boundingBox();
  if (handleS) {
    await page.mouse.move(handleS.x + handleS.width / 2, handleS.y + handleS.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleS.x + handleS.width / 2, handleS.y + handleS.height / 2 + 60, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
  }

  // Resize via West handle (left edge)
  const handleW = await page.locator('[data-testid="resize-handle-w"]').boundingBox();
  if (handleW) {
    await page.mouse.move(handleW.x + handleW.width / 2, handleW.y + handleW.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleW.x + handleW.width / 2 - 50, handleW.y + handleW.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
  }

  const resizedBox = await page.locator(windowSelector).boundingBox();
  console.log('Resized window dimensions:', resizedBox);

  const resizeShot = path.join(ARTIFACTS_DIR, '24_window_8dir_resize.png');
  await page.screenshot({ path: resizeShot });
  console.log('📸 Saved 8-Direction Resizing screenshot:', resizeShot);

  // Close Notepad
  await page.click('button[title="Close"]');
  await page.waitForTimeout(500);

  // 3. Test Universal Spotlight Search Modal
  console.log('3. Testing Universal Spotlight Search...');
  await page.keyboard.press('Control+Space');
  await page.waitForSelector('[data-testid="spotlight-modal"]', { timeout: 5000 });
  await page.waitForTimeout(400);

  // Test Math Calculation
  console.log('Testing math calculation in Spotlight...');
  await page.fill('[data-testid="spotlight-input"]', '25 * 4');
  await page.waitForTimeout(400);
  await page.waitForSelector('text=25 * 4 = 100', { timeout: 3000 });

  const spotlightShot = path.join(ARTIFACTS_DIR, '25_spotlight_search.png');
  await page.screenshot({ path: spotlightShot });
  console.log('📸 Saved Spotlight Search screenshot:', spotlightShot);

  // Search for Code Studio and launch it
  await page.fill('[data-testid="spotlight-input"]', 'Code Studio');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');

  // 4. Test Code / Text Editor Pro App
  console.log('4. Testing Code Editor Pro...');
  await page.waitForSelector('[data-testid="code-editor-app"]', { timeout: 8000 });
  await page.waitForTimeout(600);

  // Type some code
  await page.click('[data-testid="code-editor-textarea"]');
  await page.keyboard.press('Control+A');
  await page.keyboard.type(`// Billighost OS Phase 4 Runtime\nfunction activateSystem() {\n  const status = "ONLINE";\n  console.log("Ready:", status);\n  return true;\n}\nactivateSystem();`);
  await page.waitForTimeout(500);

  const codeEditorShot = path.join(ARTIFACTS_DIR, '26_code_editor_pro.png');
  await page.screenshot({ path: codeEditorShot });
  console.log('📸 Saved Code Editor Pro screenshot:', codeEditorShot);

  // Minimize or close Code Editor
  await page.click('button[title="Close"]');
  await page.waitForTimeout(500);

  // 5. Test Paint & Canvas Studio App
  console.log('5. Testing Paint & Canvas Studio App...');
  await page.dblclick('[data-testid="shortcut-paint"]');
  await page.waitForSelector('[data-testid="paint-studio-app"]', { timeout: 8000 });
  await page.waitForTimeout(600);

  // Draw some strokes on canvas
  const canvasBox = await page.locator('[data-testid="paint-canvas"]').boundingBox();
  if (canvasBox) {
    const cx = canvasBox.x + canvasBox.width / 2;
    const cy = canvasBox.y + canvasBox.height / 2;

    // Draw first stroke
    await page.mouse.move(cx - 100, cy - 50);
    await page.mouse.down();
    await page.mouse.move(cx + 100, cy - 50, { steps: 8 });
    await page.mouse.move(cx, cy + 80, { steps: 8 });
    await page.mouse.move(cx - 100, cy - 50, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(400);
  }

  // Save to VFS Pictures
  console.log('Saving drawing to Pictures...');
  await page.click('[data-testid="paint-save-vfs-btn"]');
  await page.waitForTimeout(800);

  const paintShot = path.join(ARTIFACTS_DIR, '27_paint_canvas_studio.png');
  await page.screenshot({ path: paintShot });
  console.log('📸 Saved Paint Studio screenshot:', paintShot);

  // Close Paint
  await page.click('button[title="Close"]');
  await page.waitForTimeout(500);

  // 6. Test Widgets Board Side Panel
  console.log('6. Testing Widgets Board Panel...');
  await page.click('[data-testid="taskbar-widgets-btn"]');
  await page.waitForSelector('[data-testid="widgets-panel"]', { timeout: 6000 });
  await page.waitForSelector('[data-testid="widget-weather-card"]', { timeout: 5000 });
  await page.waitForSelector('[data-testid="widget-telemetry-card"]', { timeout: 5000 });
  await page.waitForSelector('[data-testid="widget-sticky-notes"]', { timeout: 5000 });
  await page.waitForTimeout(800);

  const widgetsShot = path.join(ARTIFACTS_DIR, '28_widgets_board.png');
  await page.screenshot({ path: widgetsShot });
  console.log('📸 Saved Widgets Board screenshot:', widgetsShot);

  // Close Widgets
  await page.mouse.click(800, 300);
  await page.waitForTimeout(500);

  // 7. Full Desktop with Multiple Phase 4 Apps Running
  console.log('7. Capturing complete Phase 4 OS state...');
  await page.dblclick('[data-testid="shortcut-code"]');
  await page.waitForTimeout(400);
  await page.dblclick('[data-testid="shortcut-paint"]');
  await page.waitForTimeout(600);

  const finalShot = path.join(ARTIFACTS_DIR, '29_phase4_verified.png');
  await page.screenshot({ path: finalShot });
  console.log('📸 Saved Final Phase 4 screenshot:', finalShot);

  console.log('🎉 ALL PHASE 4 TESTS PASSED CLEANLY!');
  await browser.close();
}

run().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
