/**
 * Verifies windows and their app content stay inside the work area:
 *   1. a window cannot be dragged outside the viewport / under the taskbar
 *   2. resizing the window shrinks the app content with it (no overflow)
 *   3. shrinking the BROWSER reflows windows back inside
 */
const { chromium } = require('playwright');
const { bootToDesktop, seedProfile } = require('./harness.cjs');

const TASKBAR_H = 52;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));

  await page.goto('http://localhost:5200/', { waitUntil: 'domcontentloaded' });
  await seedProfile(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await bootToDesktop(page);
  console.log('desktop ready\n');

  // Open a content-heavy app.
  await page.dblclick('[data-testid="shortcut-music"]');
  await page.waitForTimeout(1200);

  const win = page.locator('[data-app="media"]').first();
  const geo = async () => win.evaluate(el => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });

  // ── 1. Drag hard toward the bottom-left, past the edges ──
  const start = await geo();
  await page.mouse.move(start.x + 120, start.y + 18);
  await page.mouse.down();
  await page.mouse.move(-500, 2000, { steps: 12 });   // way outside
  await page.mouse.up();
  await page.waitForTimeout([400][0]);

  const dragged = await geo();
  const vp = page.viewportSize();
  const insideAfterDrag =
    dragged.x >= -1 && dragged.y >= -1 &&
    dragged.x + dragged.w <= vp.width + 1 &&
    dragged.y + dragged.h <= vp.height - TASKBAR_H + 1;
  console.log('1. drag outside viewport');
  console.log('   result:', JSON.stringify(dragged), 'viewport', vp.width + 'x' + vp.height);
  console.log('   contained:', insideAfterDrag ? 'YES ✓' : 'NO ✗');

  // ── 2. Resize small, check app content does not overflow ──
  // Put it somewhere predictable first, then drag the SE handle inward.
  await page.mouse.move(dragged.x + 120, dragged.y + 18);
  await page.mouse.down();
  await page.mouse.move(300, 120, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);

  const before = await geo();
  await page.mouse.move(before.x + before.w - 5, before.y + before.h - 5);
  await page.mouse.down();
  await page.mouse.move(before.x + 360, before.y + 240, { steps: 14 });
  await page.mouse.up();
  await page.waitForTimeout(500);

  const resized = await geo();
  const overflow = await win.evaluate(el => {
    const body = el.querySelector('div:nth-child(2)') || el;
    const br = el.getBoundingClientRect();
    let worst = null;
    let count = 0;
    el.querySelectorAll('*').forEach(n => {
      const r = n.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const dx = Math.round(r.right - br.right);
      const dy = Math.round(r.bottom - br.bottom);
      if (dx > 2 || dy > 2) {
        count++;
        if (!worst || dx + dy > worst.dx + worst.dy) {
          worst = { dx, dy, cls: (n.className || '').toString().slice(0, 42), tag: n.tagName };
        }
      }
    });
    return { count, worst, scrollOverflow: el.scrollWidth - el.clientWidth };
  });
  console.log('\n2. resize to minimum');
  console.log('   window now:', JSON.stringify(resized));
  console.log('   elements overflowing frame:', overflow.count, overflow.count === 0 ? '✓' : '✗');
  if (overflow.worst) console.log('   worst:', JSON.stringify(overflow.worst));

  // ── 3. Shrink the browser; windows must reflow ──
  await page.setViewportSize({ width: 820, height: 560 });
  await page.waitForTimeout(700);
  const afterVpShrink = await geo();
  const vp2 = page.viewportSize();
  const reflowed =
    afterVpShrink.x + afterVpShrink.w <= vp2.width + 1 &&
    afterVpShrink.y + afterVpShrink.h <= vp2.height - TASKBAR_H + 1;
  console.log('\n3. shrink browser to 820x560');
  console.log('   window now:', JSON.stringify(afterVpShrink));
  console.log('   reflowed inside:', reflowed ? 'YES ✓' : 'NO ✗');

  await page.screenshot({ path: 'scripts/shots/constraint-small-viewport.png' });
  console.log('\nerrors:', errs.length ? errs : 'none');
  await browser.close();
})();
