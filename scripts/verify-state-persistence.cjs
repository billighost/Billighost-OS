/**
 * Verifies minimize no longer destroys app state or playback:
 *   1. audio keeps playing while minimized, and the context stays open
 *   2. app-local state survives minimize → restore
 *   3. window size survives minimize → restore
 *   4. maximized windows actually reach the taskbar (no dead gap)
 */
const { chromium } = require('playwright');
const { bootToDesktop, seedProfile } = require('./harness.cjs');

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));

  await page.addInitScript(() => {
    window.__ctx = { created: 0, closed: 0 };
    const N = window.AudioContext;
    class T extends N {
      constructor(...a) { super(...a); window.__ctx.created++; window.__ctx.last = this; }
      close() { window.__ctx.closed++; return super.close(); }
    }
    window.AudioContext = T;
  });

  await page.goto('http://localhost:5200/', { waitUntil: 'domcontentloaded' });
  await seedProfile(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await bootToDesktop(page);

  // ── 1 & 2: audio + state across minimize ──
  await page.dblclick('[data-testid="shortcut-music"]');
  await page.waitForTimeout(1200);
  const win = page.locator('[data-app="media"]').first();

  // Change a setting so we can tell if state survived: switch the tab.
  await win.locator('button', { hasText: 'EQ & Acoustics' }).click().catch(() => {});
  await page.waitForTimeout(400);
  const tabBefore = await win.evaluate(el => {
    const active = el.querySelector('[class*=navBtnActive]');
    return active ? active.textContent.trim() : null;
  });

  // Resize so we can tell if geometry survived.
  const g0 = await win.evaluate(el => { const r = el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; });
  const hb = await win.locator('[data-testid="resize-handle-se"]').boundingBox();
  await page.mouse.move(hb.x + hb.width/2, hb.y + hb.height/2);
  await page.mouse.down();
  await page.mouse.move(g0.x + 820, g0.y + 560, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const sizeBefore = await win.evaluate(el => { const r = el.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });

  const ctxBefore = await page.evaluate(() => ({ ...window.__ctx, state: window.__ctx.last?.state }));

  // Minimize via the window control.
  await win.locator('button[title="Minimize"]').click();
  await page.waitForTimeout(900);

  const whileMin = await page.evaluate(() => ({ created: window.__ctx.created, closed: window.__ctx.closed, state: window.__ctx.last?.state }));
  const stillMounted = await page.locator('[data-app="media"]').count();
  console.log('1. minimize');
  console.log('   window still in DOM (state preserved):', stillMounted > 0 ? 'YES ✓' : 'NO ✗ (unmounted)');
  console.log('   AudioContext closed while minimized:', whileMin.closed > ctxBefore.closed ? 'YES ✗' : 'NO ✓');
  console.log('   AudioContext state:', whileMin.state);

  // Restore from the taskbar.
  await page.locator('button[title="Audio Player"]').first().click().catch(async () => {
    await page.locator('[class*=appTab]').first().click();
  });
  await page.waitForTimeout(700);

  const tabAfter = await win.evaluate(el => {
    const active = el.querySelector('[class*=navBtnActive]');
    return active ? active.textContent.trim() : null;
  });
  const sizeAfter = await win.evaluate(el => { const r = el.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });

  console.log('\n2. restore');
  console.log(`   tab  before="${tabBefore}" after="${tabAfter}"`, tabBefore === tabAfter ? '✓' : '✗');
  console.log(`   size before=${sizeBefore.join('x')} after=${sizeAfter.join('x')}`,
              sizeBefore.join() === sizeAfter.join() ? '✓' : '✗');

  // ── 4: maximize must reach the taskbar ──
  await win.locator('button[title="Maximize"]').click();
  await page.waitForTimeout(600);
  const gap = await page.evaluate(() => {
    const w = document.querySelector('[data-app="media"]');
    const bar = document.querySelector('[class*=taskbar]');
    const wr = w.getBoundingClientRect(), br = bar.getBoundingClientRect();
    return { winBottom: Math.round(wr.bottom), barTop: Math.round(br.top), gap: Math.round(br.top - wr.bottom),
             barH: Math.round(br.height) };
  });
  console.log('\n3. maximize');
  console.log('   ', JSON.stringify(gap));
  console.log('   flush against taskbar:', Math.abs(gap.gap) <= 1 ? 'YES ✓' : `NO ✗ (${gap.gap}px gap)`);

  console.log('\nerrors:', errs.length ? errs.slice(0,3) : 'none');
  await b.close();
})();
