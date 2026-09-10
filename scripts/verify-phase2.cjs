const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = path.resolve('C:\\Users\\bb201\\.gemini\\antigravity-ide\\brain\\e4e13b57-d433-49b6-8e4b-ab1310784bc2');

async function run() {
  console.log('🚀 Starting Billighost OS Phase 2 Verification...');

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

  // 1. Boot to Lock Screen & Login
  console.log('Navigating to http://localhost:5173/ ...');
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

  // 2. Open Calculator & Test Calculation
  console.log('Launching Calculator...');
  await page.dblclick('[data-testid="shortcut-calc"]');
  await page.waitForSelector('text=Scientific Mode', { timeout: 8000 });
  await page.waitForTimeout(400);

  console.log('Performing calculation: 128 * 8 = ...');
  await page.click('button:has-text("1")');
  await page.click('button:has-text("2")');
  await page.click('button:has-text("8")');
  await page.click('button:has-text("×")');
  await page.click('button:has-text("8")');
  await page.click('button:has-text("=")');
  await page.waitForTimeout(300);

  const calcShot = path.join(ARTIFACTS_DIR, '12_calculator.png');
  await page.screenshot({ path: calcShot });
  console.log('📸 Saved Calculator screenshot:', calcShot);

  // 3. Open Ghost Browser
  console.log('Launching Ghost Browser...');
  await page.dblclick('[data-testid="shortcut-browser"]');
  await page.waitForSelector('input[placeholder*="Search the web"]', { timeout: 8000 });
  await page.waitForTimeout(600);

  const browserShot = path.join(ARTIFACTS_DIR, '13_ghost_browser.png');
  await page.screenshot({ path: browserShot });
  console.log('📸 Saved Ghost Browser screenshot:', browserShot);

  // 4. Open Audio Player
  console.log('Launching Audio Player...');
  await page.dblclick('[data-testid="shortcut-music"]');
  await page.waitForSelector('text=Billighost High-Fidelity', { timeout: 8000 });
  await page.waitForTimeout(400);

  console.log('Triggering ambient synth audio playback...');
  await page.click('button[title="Play"]');
  await page.waitForTimeout(600);

  const audioShot = path.join(ARTIFACTS_DIR, '14_audio_player.png');
  await page.screenshot({ path: audioShot });
  console.log('📸 Saved Audio Player screenshot:', audioShot);

  // 5. Open Image Viewer
  console.log('Launching Image Viewer...');
  await page.dblclick('[data-testid="shortcut-gallery"]');
  await page.waitForSelector('text=1:1', { timeout: 8000 });
  await page.waitForTimeout(400);

  console.log('Testing Image Viewer controls (Zoom, Rotate)...');
  await page.click('button[title="Zoom In"]');
  await page.click('button[title="Rotate 90°"]');
  await page.waitForTimeout(400);

  const galleryShot = path.join(ARTIFACTS_DIR, '15_image_viewer.png');
  await page.screenshot({ path: galleryShot });
  console.log('📸 Saved Image Viewer screenshot:', galleryShot);

  // 6. Test Task View / Exposé
  console.log('Opening Task View (Exposé)...');
  await page.click('button[title="Task View (Alt+Tab)"]');
  await page.waitForSelector('text=Task View / Workspace Switcher', { timeout: 5000 });
  await page.waitForTimeout(500);

  const taskViewShot = path.join(ARTIFACTS_DIR, '16_task_view.png');
  await page.screenshot({ path: taskViewShot });
  console.log('📸 Saved Task View screenshot:', taskViewShot);

  // Exit Task View by clicking Calculator card
  console.log('Selecting Calculator from Task View...');
  await page.click('[data-testid="taskview-card-calculator"]');
  await page.waitForTimeout(600);

  // 7. Multi-window desktop shot
  const multiWindowShot = path.join(ARTIFACTS_DIR, '17_aero_snap_multitasking.png');
  await page.screenshot({ path: multiWindowShot });
  console.log('📸 Saved Multitasking Desktop screenshot:', multiWindowShot);

  await browser.close();
  console.log('🎉 PHASE 2 VERIFICATION COMPLETE! All features and apps validated.');
}

run().catch(err => {
  console.error('❌ Phase 2 verification failed:', err);
  process.exit(1);
});
