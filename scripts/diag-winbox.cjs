const { chromium } = require('playwright');
const { bootToDesktop } = require('./harness.cjs');
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await page.goto('http://localhost:5200/', { waitUntil: 'domcontentloaded' });
  await bootToDesktop(page);
  await page.dblclick('[data-testid="shortcut-settings"]');
  await page.waitForTimeout(900);
  const win = page.locator('[data-app="settings"]').first();

  const before = await win.evaluate(el => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const body = el.children[1];
    return { inlineStyle: el.getAttribute('style'),
             rect: [Math.round(r.width), Math.round(r.height)],
             cssH: cs.height, cssW: cs.width, display: cs.display, flexDir: cs.flexDirection,
             bodyH: Math.round(body.getBoundingClientRect().height),
             bodyScrollH: body.scrollHeight, bodyOverflow: getComputedStyle(body).overflowY };
  });
  console.log('BEFORE resize:', JSON.stringify(before, null, 2));

  const hb = await win.locator('[data-testid="resize-handle-se"]').boundingBox();
  const g = await win.evaluate(el => { const r = el.getBoundingClientRect(); return {x:r.x,y:r.y}; });
  await page.mouse.move(hb.x + hb.width/2, hb.y + hb.height/2);
  await page.mouse.down();
  await page.mouse.move(g.x + 40, g.y + 30, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(600);

  const after = await win.evaluate(el => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const body = el.children[1];
    return { inlineStyle: el.getAttribute('style'),
             rect: [Math.round(r.width), Math.round(r.height)],
             cssH: cs.height, cssW: cs.width,
             bodyH: Math.round(body.getBoundingClientRect().height),
             bodyScrollH: body.scrollHeight, bodyOverflow: getComputedStyle(body).overflowY,
             bodyFlex: getComputedStyle(body).flex, bodyMinH: getComputedStyle(body).minHeight };
  });
  console.log('AFTER resize:', JSON.stringify(after, null, 2));
  await page.screenshot({ path: 'scripts/shots/settings-resized.png' });
  await b.close();
})();
