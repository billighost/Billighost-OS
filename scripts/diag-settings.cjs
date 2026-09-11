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
  const hb = await win.locator('[data-testid="resize-handle-se"]').boundingBox();
  const g = await win.evaluate(el => { const r = el.getBoundingClientRect(); return {x:r.x,y:r.y}; });
  await page.mouse.move(hb.x + hb.width/2, hb.y + hb.height/2);
  await page.mouse.down();
  await page.mouse.move(g.x + 40, g.y + 30, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(600);

  const r = await win.evaluate(el => {
    const walk = [];
    const mp = el.querySelector('[class*=mainPane]');
    if (mp) {
      const cs = getComputedStyle(mp);
      walk.push({ which: 'mainPane', h: Math.round(mp.getBoundingClientRect().height),
        scrollH: mp.scrollHeight, clientH: mp.clientHeight, overflowY: cs.overflowY, flex: cs.flex });
    }
    const lay = el.querySelector('[class*=settingsLayout]');
    if (lay) {
      const cs = getComputedStyle(lay);
      walk.push({ which: 'settingsLayout', h: Math.round(lay.getBoundingClientRect().height),
        scrollH: lay.scrollHeight, overflowY: cs.overflowY, display: cs.display, flex: cs.flex,
        height: cs.height });
    }
    const wb = el.parentElement;
    walk.push({ which: 'windowBody', h: Math.round(wb.getBoundingClientRect().height) });
    // Where does tabContent sit?
    const tc = el.querySelector('[class*=tabContent]');
    if (tc) {
      const tcs = getComputedStyle(tc);
      const box = tc.getBoundingClientRect();
      walk.push({ which: 'tabContent', h: Math.round(box.height), top: Math.round(box.top),
        bottom: Math.round(box.bottom), parent: (tc.parentElement.className||'').toString().slice(0,30),
        parentOverflow: getComputedStyle(tc.parentElement).overflowY });
    }
    return walk;
  });
  console.log(JSON.stringify(r, null, 2));
  await b.close();
})();
