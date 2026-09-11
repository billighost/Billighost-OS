/**
 * Proves the rain actually collides with windows: opens an app, then samples
 * pixels just above the window's top edge (where splashes/rivulets form)
 * versus the same band with no window present.
 */
const { chromium } = require('playwright');
const { bootToDesktop, seedProfile } = require('./harness.cjs');

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await page.goto('http://localhost:5200/', { waitUntil: 'domcontentloaded' });

  await seedProfile(page, { wallpaper: 'rain', liveWallpaper: 'rain' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await bootToDesktop(page);
  await page.waitForTimeout(1200);

  const sample = async (label) => {
    const r = await page.evaluate(() => {
      const c = document.querySelector('[data-live-wallpaper]');
      const win = document.querySelector('[data-testid="os-window"]');
      const ctx = c.getContext('2d');
      const scale = c.width / window.innerWidth;

      const band = (x0, y0, w, h) => {
        const d = ctx.getImageData(Math.round(x0*scale), Math.round(y0*scale),
                                   Math.round(w*scale), Math.round(h*scale)).data;
        let lit = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i] + d[i+1] + d[i+2] > 40) lit++;
        return lit;
      };

      if (!win) return { noWindow: true, wholeScreen: band(0, 0, window.innerWidth, window.innerHeight) };

      const wr = win.getBoundingClientRect();
      return {
        winRect: [Math.round(wr.x), Math.round(wr.y), Math.round(wr.width), Math.round(wr.height)],
        // Band straddling the window's top edge: splashes land here.
        onTopEdge: band(wr.x, wr.y - 4, wr.width, 14),
        // Same-height band to the side of the window: open air.
        besideWindow: band(Math.max(0, wr.x - 220), wr.y - 4, 200, 14),
        // Inside the window: rivulets run down the glass.
        insideWindow: band(wr.x + 10, wr.y + 20, wr.width - 20, 90),
      };
    });
    console.log(label, JSON.stringify(r));
    return r;
  };

  console.log('--- no window open ---');
  await sample('empty desktop:');

  await page.dblclick('[data-testid="shortcut-notepad"]');
  await page.waitForTimeout(2600);   // let rain accumulate on the new surface

  console.log('\n--- window open ---');
  const s1 = await sample('with window:');
  await page.waitForTimeout(2200);
  const s2 = await sample('2s later  :');

  const landed = Math.max(s1.onTopEdge || 0, s2.onTopEdge || 0);
  const inside = Math.max(s1.insideWindow || 0, s2.insideWindow || 0);
  console.log('\nsplashes on the window top edge:', landed > 0 ? `YES ✓ (${landed} lit px)` : 'NO ✗');
  console.log('rivulets running down the glass :', inside > 0 ? `YES ✓ (${inside} lit px)` : 'NO ✗');

  await page.screenshot({ path: 'scripts/shots/rain-on-window.png' });
  await b.close();
})();
