const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = path.resolve('C:\\Users\\bb201\\.gemini\\antigravity-ide\\brain\\071beb2c-1124-4fcf-861d-083505b2958f');

async function testDuckDuckGo() {
  console.log('🚀 Testing DuckDuckGo search in Ghost Browser via Playwright...');

  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'msedge' });
  } catch {
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  page.on('console', msg => console.log('[PAGE CONSOLE]', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('[PAGE ERROR]', err.message));

  // 1. Go to OS
  console.log('Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // 2. Unlock lock screen
  console.log('Unlocking screen...');
  await page.waitForSelector('text=bb2010ng@gmail.com', { timeout: 15000 });
  await page.mouse.click(720, 450);

  await page.waitForSelector('input[type="password"]', { timeout: 8000 });
  await page.waitForTimeout(500);
  await page.click('input[type="password"]');
  await page.keyboard.type('0813');

  // 3. Wait for desktop
  console.log('Waiting for Desktop...');
  await page.waitForSelector('button:has-text("Billighost")', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // 4. Launch Ghost Browser
  console.log('Launching Ghost Browser...');
  await page.dblclick('[data-testid="shortcut-browser"]');
  await page.waitForSelector('input[placeholder*="Search the web"]', { timeout: 8000 });
  await page.waitForTimeout(1000);

  const initShot = path.join(ARTIFACTS_DIR, 'ddg_01_browser_open.png');
  await page.screenshot({ path: initShot });
  console.log('📸 Screenshot 1 saved (browser opened):', initShot);

  // 5. Test 1: Click DuckDuckGo Bookmark
  console.log('Clicking DuckDuckGo bookmark button...');
  const ddgBookmark = page.locator('button:has-text("DuckDuckGo")');
  await ddgBookmark.click();
  await page.waitForTimeout(3000);

  const bookmarkShot = path.join(ARTIFACTS_DIR, 'ddg_02_after_bookmark_click.png');
  await page.screenshot({ path: bookmarkShot });
  console.log('📸 Screenshot 2 saved (DuckDuckGo bookmark clicked):', bookmarkShot);

  // 6. Test 2: Search for "dog" via Omnibox
  console.log('Typing "dog" into omnibox and submitting...');
  const omnibox = page.locator('input[placeholder*="Search the web"]');
  await omnibox.fill('dog');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(4000);

  const searchShot = path.join(ARTIFACTS_DIR, 'ddg_03_search_dog.png');
  await page.screenshot({ path: searchShot });
  console.log('📸 Screenshot 3 saved (Search for dog):', searchShot);

  // 7. Wait 5 more seconds to see if load error or iframe timeout triggers
  console.log('Waiting for iframe load or error detection...');
  await page.waitForTimeout(5000);

  const finalShot = path.join(ARTIFACTS_DIR, 'ddg_04_final_state.png');
  await page.screenshot({ path: finalShot });
  console.log('📸 Screenshot 4 saved (Final state):', finalShot);

  // 8. Check iframe contents / properties
  const iframeHandle = await page.$('iframe[title="Ghost Browser Frame"]');
  if (iframeHandle) {
    const src = await iframeHandle.getAttribute('src');
    console.log('Iframe src is currently:', src);
    try {
      const contentFrame = await iframeHandle.contentFrame();
      if (contentFrame) {
        const frameUrl = contentFrame.url();
        console.log('Iframe content frame url:', frameUrl);
        const title = await contentFrame.title().catch(() => 'access restricted');
        console.log('Iframe content title:', title);
      } else {
        console.log('Iframe contentFrame is null or cross-origin restricted');
      }
    } catch (e) {
      console.log('Cross-origin frame inspection error (expected for external sites):', e.message);
    }
  } else {
    console.log('No iframe found, checking for error container or internal doc...');
    const hasError = await page.$('text=Page Could Not Load');
    console.log('Page Could Not Load banner visible:', !!hasError);
  }

  await browser.close();
  console.log('✅ DuckDuckGo test completed.');
}

testDuckDuckGo().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
