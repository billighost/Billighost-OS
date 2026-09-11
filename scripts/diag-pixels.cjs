const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await page.goto('http://localhost:5200/', { waitUntil: 'domcontentloaded' });

  for (const t of [1700, 2600, 3400, 4600]) {
    await page.waitForTimeout(t === 1700 ? 1700 : 800);
    const stats = await page.evaluate(async () => {
      // Rasterise what's on screen via the real canvas if present,
      // else report the brightest pixel region of the SVG bbox.
      const el = document.querySelector('[data-testid="boot-screen"] svg.bh-icon, [data-testid="boot-screen"] svg');
      const cv = document.querySelector('canvas');
      const out = { hasCanvas: !!cv, phase: document.querySelector('[data-testid="boot-screen"]')?.dataset.phase };
      if (cv) {
        const ctx = cv.getContext('2d');
        const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
        let max = 0, lit = 0;
        for (let i = 0; i < d.length; i += 4) {
          const v = d[i] + d[i+1] + d[i+2];
          if (v > max) max = v;
          if (v > 30) lit++;
        }
        out.canvasMaxBrightness = max;
        out.canvasLitPixels = lit;
        out.canvasSize = [cv.width, cv.height];
      }
      if (el) {
        const cs = getComputedStyle(el);
        out.svgOpacity = cs.opacity;
        const contour = el.querySelector('.gmContour, [class*=gmContour]');
        if (contour) {
          const ccs = getComputedStyle(contour);
          out.contour = { stroke: ccs.stroke, dashoffset: ccs.strokeDashoffset, opacity: ccs.opacity, width: ccs.strokeWidth };
        } else {
          out.contour = 'NOT FOUND — CSS module class did not match';
          out.svgChildClasses = [...el.querySelectorAll('*')].map(n => n.getAttribute('class')).filter(Boolean).slice(0,8);
        }
      }
      return out;
    });
    console.log(t + 'ms:', JSON.stringify(stats));
  }
  await b.close();
})();
