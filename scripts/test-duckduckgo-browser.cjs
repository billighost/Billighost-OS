const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = path.resolve('C:\\Users\\bb201\\.gemini\\antigravity-ide\\brain\\071beb2c-1124-4fcf-861d-083505b2958f');

async function testBrowserSearch() {
  console.log('🚀 Testing Ghost Browser search and DuckDuckGo in Playwright...');

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
  await page.waitForTimeout(1500);

  // 5. Test Search: Type "dog" into omnibox and submit
  console.log('Searching for "dog" in omnibox...');
  const omnibox = page.locator('input[placeholder*="Search the web"]');
  await omnibox.fill('dog');
  await page.keyboard.press('Enter');
  
  // Wait for search results
  console.log('Waiting for live search results from DuckDuckGo & Wikipedia...');
  await page.waitForSelector('text=Search results for: "dog"', { timeout: 10000 });
  await page.waitForTimeout(2500);

  const searchShot = path.join(ARTIFACTS_DIR, 'ghost_search_dog_results.png');
  await page.screenshot({ path: searchShot });
  console.log('📸 Screenshot saved: ghost_search_dog_results.png');

  // 6. Click on a search result (e.g. Dog)
  console.log('Clicking first search result to open in Wikipedia iframe...');
  const firstResult = page.locator('.resultCard', { hasText: 'Dog' }).first();
  if (await firstResult.count() > 0) {
    await firstResult.click();
    await page.waitForTimeout(3500);
    const wikiShot = path.join(ARTIFACTS_DIR, 'ghost_wiki_dog_page.png');
    await page.screenshot({ path: wikiShot });
    console.log('📸 Screenshot saved: ghost_wiki_dog_page.png');
  }

  // 7. Click Ghost Search bookmark to return to search
  console.log('Clicking Ghost Search bookmark...');
  const searchBookmark = page.locator('button:has-text("Ghost Search")');
  await searchBookmark.click();
  await page.waitForTimeout(1500);

  // Search for another query "space exploration"
  console.log('Searching for "space exploration"...');
  await omnibox.fill('space exploration');
  await page.keyboard.press('Enter');
  await page.waitForSelector('text=Search results for: "space exploration"', { timeout: 10000 });
  await page.waitForTimeout(2000);

  const spaceShot = path.join(ARTIFACTS_DIR, 'ghost_search_space.png');
  await page.screenshot({ path: spaceShot });
  console.log('📸 Screenshot saved: ghost_search_space.png');

  await browser.close();
  console.log('✅ Playwright search test completed successfully!');
}

testBrowserSearch().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
