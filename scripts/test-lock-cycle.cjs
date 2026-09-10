const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = path.resolve('C:\\Users\\bb201\\.gemini\\antigravity-ide\\brain\\0ff5d322-6d88-4367-b07a-2335f7577a3a');

async function run() {
  console.log('Testing Lock button on Desktop...');
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:5173/');

  // Wait for lock screen
  await page.waitForSelector('text=bb2010ng@gmail.com', { timeout: 15000 });
  await page.mouse.click(720, 450);

  // Enter PIN
  await page.waitForSelector('input[type="password"]', { timeout: 5000 });
  await page.keyboard.type('0813');

  // Wait for desktop
  await page.waitForSelector('text=Lock', { timeout: 10000 });
  await page.waitForTimeout(500);

  // Click Lock
  console.log('Clicking Lock button in taskbar...');
  await page.click('text=Lock');

  // Verify we are back on Lock Screen
  await page.waitForSelector('text=bb2010ng@gmail.com', { timeout: 5000 });
  console.log('✅ Successfully returned to Lock Screen!');

  await browser.close();
}

run().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
