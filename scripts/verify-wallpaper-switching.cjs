/**
 * Switching wallpapers from Settings: every live effect starts, and picking
 * a static one stops the renderer.
 */
const { chromium } = require('playwright');
const { bootToDesktop, seedProfile } = require('./harness.cjs');

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:5200/', { waitUntil: 'domcontentloaded' });
  await seedProfile(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await bootToDesktop(page);

  const probe = async () => page.evaluate(async () => {
    const c = document.querySelector('[data-live-wallpaper]');
    if (!c) return { effect: null, lit: 0 };
    await new Promise(r => setTimeout(r, 900));
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let lit = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i+1] + d[i+2] > 26) lit++;
    return { effect: c.dataset.liveWallpaper, lit };
  });

  // Drive the appearance setting directly — the picker UI is exercised by
  // the setup test; this is about the renderers themselves.
  const setWallpaper = async (id, live) => {
    await page.evaluate(({ id, live }) => {
      const cur = JSON.parse(localStorage.getItem('billighost_appearance') || '{}');
      const next = { ...cur, wallpaper: id, liveWallpaper: live, customWallpaperData: null };
      localStorage.setItem('billighost_appearance', JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('billighost:appearance-change', { detail: next }));
    }, { id, live });
    await page.waitForTimeout(1400);
  };

  for (const [id, live] of [['rain','rain'], ['aurora','aurora'], ['inkflow','inkflow'], ['circuit','circuit']]) {
    await setWallpaper(id, live);
    const r = await probe();
    const ok = r.effect === live && r.lit > 150;
    console.log(`${id.padEnd(9)} effect=${String(r.effect).padEnd(8)} litPixels=${String(r.lit).padStart(7)} ${ok ? '✓' : '✗'}`);
    await page.screenshot({ path: `scripts/shots/wallpaper-${id}.png` });
  }

  await setWallpaper('minimal', null);
  const off = await probe();
  console.log(`minimal   effect=${off.effect} ${off.effect === null ? '✓ (renderer stopped)' : '✗'}`);

  console.log('\nerrors:', errs.length ? errs.slice(0,3) : 'none');
  await b.close();
})();
