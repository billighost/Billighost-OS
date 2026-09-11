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
  await page.mouse.move(g.x + 150, g.y + 120, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(500);

  const chain = await win.evaluate(el => {
    const br = el.getBoundingClientRect();
    // Find the deepest overflowing element, then walk up its ancestry.
    let worst = null;
    el.querySelectorAll('*').forEach(n => {
      const r = n.getBoundingClientRect();
      if (!r.height) return;
      const dy = r.bottom - br.bottom;
      if (dy > 5 && (!worst || dy > worst.dy)) worst = { n, dy: Math.round(dy) };
    });
    if (!worst) return 'no overflow';
    const out = [];
    let cur = worst.n;
    while (cur && cur !== el.parentElement) {
      const cs = getComputedStyle(cur);
      out.push({
        tag: cur.tagName,
        cls: (cur.className||'').toString().slice(0,40),
        flex: cs.flex, minH: cs.minHeight, oh: cs.overflowY,
        h: Math.round(cur.getBoundingClientRect().height),
        scrollH: cur.scrollHeight,
      });
      cur = cur.parentElement;
    }
    return out;
  });
  console.log(JSON.stringify(chain, null, 2));
  await b.close();
})();
