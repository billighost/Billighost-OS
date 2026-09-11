const { chromium } = require('playwright');
const { bootToDesktop } = require('./harness.cjs');
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await page.goto('http://localhost:5200/', { waitUntil: 'domcontentloaded' });
  await bootToDesktop(page);
  await page.dblclick('[data-testid="shortcut-files"]');
  await page.waitForTimeout(900);
  const win = page.locator('[data-app="files"]').first();
  const hb = await win.locator('[data-testid="resize-handle-se"]').boundingBox();
  const g = await win.evaluate(el => { const r = el.getBoundingClientRect(); return {x:r.x,y:r.y}; });
  await page.mouse.move(hb.x + hb.width/2, hb.y + hb.height/2);
  await page.mouse.down();
  await page.mouse.move(g.x + 40, g.y + 30, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(500);

  const r = await win.evaluate(el => {
    const t = (sel) => {
      const n = el.querySelector(sel);
      if (!n) return null;
      const cs = getComputedStyle(n);
      const b = n.getBoundingClientRect();
      return { h: Math.round(b.height), scrollH: n.scrollHeight,
               canScroll: n.scrollHeight > n.clientHeight,
               overflowY: cs.overflowY, minH: cs.minHeight, maxH: cs.maxHeight };
    };
    return { explorerArea: t('[class*=explorerArea]'), itemsGrid: t('[class*=itemsGrid]'),
             bodyLayout: t('[class*=bodyLayout]'), container: t('[class*=container]') };
  });
  console.log(JSON.stringify(r, null, 2));
  await b.close();
})();
