const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await page.goto('http://localhost:5200/', { waitUntil: 'domcontentloaded' });
  const probe = async (label) => {
    const d = await page.evaluate(() => {
      const root = document.querySelector('#root');
      const cls = [...document.querySelectorAll('#root div')].slice(0,4).map(n => (n.className||'').toString().slice(0,34));
      return {
        boot: !!document.querySelector('[data-testid="boot-screen"]'),
        bootPhase: document.querySelector('[data-testid="boot-screen"]')?.dataset.phase,
        taskbar: !!document.querySelector('[data-testid="taskbar-taskview-btn"]'),
        text: (root?.innerText || '').replace(/\s+/g,' ').slice(0, 110),
        cls,
      };
    });
    console.log(label, JSON.stringify(d));
  };
  await page.waitForTimeout(8000); await probe('8.0s');
  await page.mouse.click(700, 450); await page.waitForTimeout(1500); await probe('after click');
  await page.keyboard.press('1'); await page.keyboard.press('2');
  await page.keyboard.press('3'); await page.keyboard.press('4');
  await page.waitForTimeout(1200); await probe('after pin');
  await page.waitForTimeout(4000); await probe('after wait');
  await b.close();
})();
