const { chromium } = require('playwright');
const { bootToDesktop, seedProfile } = require('./harness.cjs');

async function check() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await seedProfile(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await bootToDesktop(page);

  const testIds = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[data-testid]')).map(el => ({
      tag: el.tagName,
      testid: el.getAttribute('data-testid'),
      text: el.innerText ? el.innerText.trim().slice(0, 30) : ''
    }));
  });
  console.log('Found testids:', JSON.stringify(testIds, null, 2));

  // Let's also check all buttons in taskbar
  const taskbarBtns = await page.evaluate(() => {
    const bar = document.querySelector('[data-taskbar]');
    if (!bar) return 'No taskbar found!';
    return Array.from(bar.querySelectorAll('button')).map(b => ({
      text: b.innerText,
      testid: b.getAttribute('data-testid'),
      className: b.className
    }));
  });
  console.log('Taskbar buttons:', JSON.stringify(taskbarBtns, null, 2));

  await browser.close();
}

check().catch(console.error);
