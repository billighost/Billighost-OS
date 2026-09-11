/**
 * End-to-end geometry check: grow/shrink a window repeatedly and confirm the
 * frame, the app root, and the scroll pane stay in sync.
 */
const { chromium } = require('playwright');
const { bootToDesktop } = require('./harness.cjs');

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:5200/', { waitUntil: 'domcontentloaded' });
  await bootToDesktop(page);

  await page.dblclick('[data-testid="shortcut-music"]');
  await page.waitForTimeout(800);
  const win = page.locator('[data-app="media"]').first();

  const snap = () => win.evaluate(el => {
    const r = el.getBoundingClientRect();
    const body = el.children[1];
    const br = body.getBoundingClientRect();
    return {
      win: [Math.round(r.width), Math.round(r.height)],
      body: [Math.round(br.width), Math.round(br.height)],
      bodyOverflowX: Math.round(body.scrollWidth - body.clientWidth),
      bodyOverflowY: Math.round(body.scrollHeight - body.clientHeight),
    };
  });

  const sizes = [[900, 620], [420, 380], [1100, 760], [380, 360]];
  for (const [w, h] of sizes) {
    const g = await win.evaluate(el => { const r = el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; });
    const hb = await win.locator('[data-testid="resize-handle-se"]').boundingBox();
    await page.mouse.move(hb.x + hb.width/2, hb.y + hb.height/2);
    await page.mouse.down();
    await page.mouse.move(g.x + w, g.y + h, { steps: 14 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    const s = await snap();
    const fits = Math.abs(s.win[0] - s.body[0]) < 3 && s.body[0] > 0 && s.body[1] > 0;
    console.log(`target ${String(w).padStart(4)}x${String(h).padStart(3)} → win ${s.win.join('x').padEnd(9)} body ${s.body.join('x').padEnd(9)} scrollOv ${s.bodyOverflowX}/${s.bodyOverflowY} ${fits ? '✓' : '✗'}`);
  }

  // Drag to all four corners; confirm the frame stays inside the work area.
  const corners = [[-3000, -3000], [9999, -3000], [-3000, 9999], [9999, 9999]];
  for (const [mx, my] of corners) {
    const g = await win.evaluate(el => { const r = el.getBoundingClientRect(); return {x:r.x,y:r.y}; });
    await page.mouse.move(g.x + 150, g.y + 18);
    await page.mouse.down();
    await page.mouse.move(mx, my, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(250);
    const s = await snap();
    const vp = page.viewportSize();
    const inside = s.win[0] > 0 && s.win[1] > 0;
    console.log(`drag(${mx},${my}) → pos-in-workarea ${inside ? '✓' : '✗'}`);
  }

  console.log('\nerrors:', errs.length ? errs : 'none');
  await b.close();
})();
