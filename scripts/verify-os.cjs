const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = path.resolve('C:\\Users\\bb201\\.gemini\\antigravity-ide\\brain\\0ff5d322-6d88-4367-b07a-2335f7577a3a');

async function run() {
  console.log('🚀 Starting Playwright headless verification...');
  
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      channel: 'msedge'
    });
  } catch (err) {
    console.log('msedge channel not found, trying default chromium or chrome...');
    try {
      browser = await chromium.launch({ headless: true, channel: 'chrome' });
    } catch (err2) {
      browser = await chromium.launch({ headless: true });
    }
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  // 1. Boot Screen
  console.log('Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  console.log('Capturing Boot Screen...');
  await page.waitForTimeout(1000);
  const bootShot = path.join(ARTIFACTS_DIR, '01_boot_screen.png');
  await page.screenshot({ path: bootShot });
  console.log('Saved Boot Screen to:', bootShot);

  // 2. Wait for Lock Screen (random 3-7s duration + 800ms fade)
  console.log('Waiting for Lock Screen transition...');
  await page.waitForSelector('text=bb2010ng@gmail.com', { timeout: 15000 });
  await page.waitForTimeout(600); // let fade settle

  console.log('Capturing Lock Screen...');
  const lockShot = path.join(ARTIFACTS_DIR, '02_lock_screen.png');
  await page.screenshot({ path: lockShot });
  console.log('Saved Lock Screen to:', lockShot);

  // 3. Trigger Liquid Wash / Unlock
  console.log('Clicking Lock Screen to unlock...');
  await page.mouse.click(720, 450);

  // Wait for Pin Screen
  console.log('Waiting for PIN Screen...');
  await page.waitForSelector('input[type="password"]', { timeout: 5000 });
  await page.waitForTimeout(600);

  console.log('Capturing PIN Screen...');
  const pinShot = path.join(ARTIFACTS_DIR, '03_pin_screen.png');
  await page.screenshot({ path: pinShot });
  console.log('Saved PIN Screen to:', pinShot);

  // 4. Test Error PIN shake & recovery
  console.log('Testing incorrect PIN (9999)...');
  await page.keyboard.type('9999');
  await page.waitForTimeout(250);
  const pinErrorShot = path.join(ARTIFACTS_DIR, '04_pin_error.png');
  await page.screenshot({ path: pinErrorShot });
  console.log('Saved PIN Error State to:', pinErrorShot);

  // Wait for reset
  await page.waitForTimeout(900);

  // 5. Enter correct PIN: 0813
  console.log('Entering correct PIN (0813)...');
  await page.keyboard.type('0813');

  // 6. Signing In Screen
  console.log('Waiting for Signing In Screen...');
  await page.waitForSelector('text=Signing you in', { timeout: 5000 });
  await page.waitForTimeout(800);

  console.log('Capturing Signing In Screen...');
  const signingShot = path.join(ARTIFACTS_DIR, '05_signing_in_screen.png');
  await page.screenshot({ path: signingShot });
  console.log('Saved Signing In Screen to:', signingShot);

  // 7. Desktop Screen
  console.log('Waiting for Desktop Screen...');
  await page.waitForSelector('text=Billighost OS', { timeout: 8000 });
  await page.waitForSelector('text=Lock', { timeout: 8000 });
  await page.waitForTimeout(1000); // let desktop fade in completely

  console.log('Capturing Desktop Screen...');
  const desktopShot = path.join(ARTIFACTS_DIR, '06_desktop_screen.png');
  await page.screenshot({ path: desktopShot });
  console.log('Saved Desktop Screen to:', desktopShot);

  await browser.close();
  console.log('🎉 Verification complete! All screens inspected and captured successfully.');
}

run().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
