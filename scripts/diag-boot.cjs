const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await page.goto('http://localhost:5200/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  const d = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const boot = q('[data-testid="boot-screen"]');
    const stage = boot && boot.firstElementChild;
    const svg = q('[data-testid="boot-screen"] svg');
    const letters = document.querySelectorAll('[data-testid="boot-screen"] span');
    const info = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName, cls: el.className && el.className.toString().slice(0, 60),
        opacity: cs.opacity, display: cs.display, visibility: cs.visibility,
        animation: cs.animationName, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      };
    };
    return {
      bodyChildren: document.body.innerHTML.length,
      rootHTML: (q('#root') || {}).innerHTML ? q('#root').innerHTML.slice(0, 300) : 'EMPTY',
      boot: info(boot), stage: info(stage), svg: info(svg),
      letterCount: letters.length,
      firstLetter: info(letters[0]),
    };
  });
  console.log(JSON.stringify(d, null, 2));
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();
