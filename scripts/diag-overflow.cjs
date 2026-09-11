const { chromium } = require('playwright');
const { bootToDesktop } = require('./harness.cjs');
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await page.goto('http://localhost:5200/', { waitUntil: 'domcontentloaded' });
  await bootToDesktop(page);
  await page.dblclick('[data-testid="shortcut-music"]');
  await page.waitForTimeout(1000);

  const win = page.locator('[data-app="media"]').first();
  const g = await win.evaluate(el => { const r = el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; });
  // shrink it
  await page.mouse.move(g.x + g.w - 5, g.y + g.h - 5);
  await page.mouse.down();
  await page.mouse.move(g.x + 350, g.y + 240, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(500);

  const rep = await win.evaluate(el => {
    const br = el.getBoundingClientRect();
    const out = [];
    el.querySelectorAll('*').forEach(n => {
      const r = n.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dx = Math.round(r.right - br.right);
      const dy = Math.round(r.bottom - br.bottom);
      if (dx > 2 || dy > 2) {
        const cs = getComputedStyle(n);
        out.push({
          tag: n.tagName, cls: (n.className||'').toString().slice(0,46),
          dx, dy, w: Math.round(r.width),
          minW: cs.minWidth, flex: cs.flex, display: cs.display,
          wrap: cs.flexWrap, parentCls: (n.parentElement?.className||'').toString().slice(0,40),
        });
      }
    });
    return out.sort((a,b)=> (b.dx+b.dy)-(a.dx+a.dy)).slice(0,8);
  });
  console.log(JSON.stringify(rep, null, 2));
  await b.close();
})();
