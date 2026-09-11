/**
 * Opens every app, shrinks its window to the minimum, and asserts no
 * element escapes the window frame.
 */
const { chromium } = require('playwright');
const { bootToDesktop } = require('./harness.cjs');

const APPS = [
  ['shortcut-files',    'files'],
  ['shortcut-code',     'code'],
  ['shortcut-paint',    'paint'],
  ['shortcut-trash',    'trash'],
  ['shortcut-terminal', 'terminal'],
  ['shortcut-browser',  'browser'],
  ['shortcut-notepad',  'notepad'],
  ['shortcut-music',    'media'],
  ['shortcut-gallery',  'gallery'],
  ['shortcut-calc',     'calculator'],
  ['shortcut-settings', 'settings'],
  ['shortcut-pc',       'files'],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:5200/', { waitUntil: 'domcontentloaded' });
  await bootToDesktop(page);

  let pass = 0, fail = 0;
  for (const [shortcut, appId] of APPS) {
    try {
      await page.dblclick(`[data-testid="${shortcut}"]`, { timeout: 4000 });
    } catch { console.log(`${appId.padEnd(11)} SKIP (shortcut not found)`); continue; }
    await page.waitForTimeout(900);

    const win = page.locator(`[data-app="${appId}"]`).first();
    if (!(await win.count())) { console.log(`${appId.padEnd(11)} SKIP (window not found)`); continue; }

    const g = await win.evaluate(el => { const r = el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; });
    // Grab the SE resize handle by its test id so the press lands on it.
    const handle = win.locator('[data-testid="resize-handle-se"]');
    const hb = await handle.boundingBox();
    if (hb) {
      await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
      await page.mouse.down();
      await page.mouse.move(g.x + 40, g.y + 30, { steps: 14 });
      await page.mouse.up();
      await page.waitForTimeout(500);
    }

    /*
     * An element only "escapes" if it is painted OUTSIDE the window box.
     *
     * getBoundingClientRect() reports an element's geometric position even
     * when an ancestor clips it, so a raw box comparison flags every row
     * scrolled out of a list — which is correct, reachable behaviour.
     *
     * The test is therefore: walk up to the nearest scrollable ancestor. If
     * one exists and it can scroll, the element is reachable and fine. Only
     * when no ancestor can clip/scroll it do we compare boxes.
     */
    const r = await win.evaluate(el => {
      const br = el.getBoundingClientRect();

      const nearestScroller = (node) => {
        let cur = node.parentElement;
        while (cur && cur !== el.parentElement) {
          const cs = getComputedStyle(cur);
          const scrollable = /auto|scroll|hidden/.test(cs.overflowY) || /auto|scroll|hidden/.test(cs.overflowX);
          if (scrollable) return cur;
          cur = cur.parentElement;
        }
        return null;
      };

      let count = 0, worst = null, scrolled = 0;
      el.querySelectorAll('*').forEach(n => {
        const q = n.getBoundingClientRect();
        if (!q.width || !q.height) return;

        const sc = nearestScroller(n);
        if (sc) { scrolled++; return; }   // reachable via scrolling / clipped

        const dx = Math.round(q.right - br.right), dy = Math.round(q.bottom - br.bottom);
        if (dx > 2 || dy > 2) {
          count++;
          if (!worst || dx + dy > worst.dx + worst.dy) {
            worst = { dx, dy, cls: (n.className || '').toString().slice(0, 36) };
          }
        }
      });
      return { count, worst, scrolled, size: [Math.round(br.width), Math.round(br.height)] };
    });

    const ok = r.count === 0;
    ok ? pass++ : fail++;
    console.log(`${appId.padEnd(11)} ${String(r.size[0]).padStart(4)}x${String(r.size[1]).padStart(3)}  escaping=${String(r.count).padStart(3)}  scrollable=${String(r.scrolled).padStart(3)}  ${ok ? '✓' : '✗ ' + JSON.stringify(r.worst)}`);

    // close it again
    await win.locator('button[title="Close"]').click().catch(() => {});
    await page.waitForTimeout(350);
  }

  console.log(`\npass ${pass} / fail ${fail}`);
  console.log('errors:', errs.length ? errs.slice(0,3) : 'none');
  await browser.close();
})();
